// Helper: Clean arXiv ID (borrowed from root main.js)
function cleanArxivId(input) {
    input = input.trim();
    if (input.toLowerCase().startsWith('arxiv:')) {
        input = input.slice(6).trim();
    }
    if (input.startsWith('https://arxiv.org/')) {
        const parts = input.split('/');
        input = parts[parts.length - 1];
    }
    // Remove version suffix if present (e.g., v1)
    const versionMatch = input.match(/v\d+$/);
    if (versionMatch) {
        input = input.substring(0, input.length - versionMatch[0].length);
    }
    return input;
}

// Helper: Parse TAR (borrowed from root main.js)
function parseTar(tarData) {
    const files = {};
    let offset = 0;
    while (offset < tarData.length) {
        const header = tarData.slice(offset, offset + 512);
        if (header.every(byte => byte === 0)) break;

        const name = new TextDecoder().decode(tarData.slice(offset, offset + 100)).replace(/\0/g, '').trim();
        const sizeField = new TextDecoder().decode(tarData.slice(offset + 124, offset + 136)).replace(/\0/g, '').trim();
        const size = parseInt(sizeField, 8);

        if (name && size > 0) {
            const contentStart = offset + 512;
            const contentEnd = contentStart + size;
            files[name] = tarData.slice(contentStart, contentEnd);
            offset = contentEnd + (512 - (size % 512 || 512));
        } else {
            offset += 512;
        }
    }
    return files;
}

// Helper: Get original GZIP filename (borrowed from root main.js)
function getOriginalGzipFileName(buffer) {
    const GZIP_FLG_FNAME = 0x08;
    let offset = 10;
    const flg = buffer[3];
    if (flg & GZIP_FLG_FNAME) {
        let fileName = '';
        while (buffer[offset] !== 0) {
            fileName += String.fromCharCode(buffer[offset]);
            offset++;
        }
        return fileName;
    }
    return null;
}

// Fetch and process a specific version of the paper
async function fetchPaperSource(arxivId, version) {
    const url = `https://arxiv.org/src/${arxivId}v${version}`;
    console.log(`Fetching ${url}...`);
    
    try {
        const response = await fetch(url);
        if (!response.ok) {
             throw new Error(`Failed to fetch version ${version} (Status: ${response.status})`);
        }

        const arrayBuffer = await response.arrayBuffer();
        const contentType = response.headers.get('Content-Type') || '';
        
        // Return object: { filename: content_string, ... }
        const fileMap = {};

        // Most arXiv sources are gzipped tars or single gzipped files
        // We can try to detect based on magic numbers or content-type
        // But arXiv usually sends application/x-eprint-tar or application/x-eprint or application/gzip
        
        // Let's assume it's likely GZIP (common for source downloads)
        // If it's a PDF, we can't diff it easily.
        
        if (contentType === 'application/pdf') {
             throw new Error(`Version ${version} source is a PDF, cannot diff LaTeX.`);
        }

        // Attempt to gunzip
        let decompressed;
        let isGzip = false;
        try {
            decompressed = fflate.gunzipSync(new Uint8Array(arrayBuffer));
            isGzip = true;
        } catch (e) {
            // Not a gzip file, maybe plain text or zip?
            console.warn(`Version ${version}: gunzip failed, assuming plain text or zip.`);
        }

        if (isGzip) {
            // Check for TAR (ustar magic)
            // USTAR header at offset 257
            const magic = new TextDecoder().decode(decompressed.slice(257, 262));
            if (magic === 'ustar') {
                const tarData = parseTar(decompressed);
                for (const name in tarData) {
                    // Only keep text files (tex, bib, sty, cls, txt, etc.)
                    // Simple heuristic: if we can decode it as UTF-8 without too many weird chars?
                    // Or just stick to extensions.
                    if (name.match(/\.(tex|bib|sty|cls|bbl|txt|md)$/i) || !name.includes('.')) {
                        try {
                            fileMap[name] = new TextDecoder('utf-8', {fatal: false}).decode(tarData[name]);
                        } catch (err) {
                            console.warn(`Could not decode ${name} as text.`);
                        }
                    }
                }
            } else {
                // Single file
                const originalName = getOriginalGzipFileName(new Uint8Array(arrayBuffer)) || `source_v${version}.tex`;
                fileMap[originalName] = new TextDecoder().decode(decompressed);
            }
        } else {
             // Maybe it's a ZIP?
            try {
                const zipData = fflate.unzipSync(new Uint8Array(arrayBuffer));
                for (let fileName in zipData) {
                     if (fileName.match(/\.(tex|bib|sty|cls|bbl|txt|md)$/i)) {
                        fileMap[fileName] = new TextDecoder().decode(zipData[fileName]);
                     }
                }
                if (Object.keys(fileMap).length > 0) return fileMap;
            } catch (e) {
                // Not a zip
            }

            // Assume plain text
            fileMap[`source_v${version}.tex`] = new TextDecoder().decode(arrayBuffer);
        }
        
        return fileMap;

    } catch (error) {
        throw error;
    }
}

async function performDiff() {
    const idInput = document.getElementById('arxivId').value;
    const v1Input = document.getElementById('version1').value;
    const v2Input = document.getElementById('version2').value;
    const statusDiv = document.getElementById('statusMessage');
    const sourceLinksDiv = document.getElementById('sourceLinks');
    const diffContainer = document.getElementById('diffContainer');

    statusDiv.textContent = '';
    sourceLinksDiv.innerHTML = '';
    diffContainer.innerHTML = '';

    if (!idInput || !v1Input || !v2Input) {
        statusDiv.textContent = 'Please enter ID and both version numbers.';
        return;
    }

    const arxivId = cleanArxivId(idInput);
    
    // Update URL
    const newUrl = `${window.location.pathname}?id=${arxivId}&old=${v1Input}&new=${v2Input}`;
    history.pushState(null, '', newUrl);

    statusDiv.innerHTML = `Fetching versions ${v1Input} and ${v2Input}... <div id="loadingSpinner"></div>`;

    try {
        let [source1, source2] = await Promise.all([
            fetchPaperSource(arxivId, v1Input),
            fetchPaperSource(arxivId, v2Input)
        ]);

        statusDiv.textContent = 'Generating diff...';

        // Heuristic: If both have exactly one file, compare them regardless of name
        // This handles cases where v1 is "paper.tex" and v2 is "main.tex" or "1234.5678.tex"
        const keys1 = Object.keys(source1);
        const keys2 = Object.keys(source2);

        if (keys1.length === 1 && keys2.length === 1 && keys1[0] !== keys2[0]) {
            console.log(`Renaming single files to common name for diffing: ${keys1[0]} -> ${keys2[0]}`);
            // We use the name from v2 so the header looks like the "new" file
            const commonName = keys2[0]; 
            source1 = { [commonName]: source1[keys1[0]] };
            // source2 is already correct
        }

        // Gather all filenames
        const allFiles = new Set([...Object.keys(source1), ...Object.keys(source2)]);
        const sortedFiles = Array.from(allFiles).sort();
        
        let diffHtml = '';
        let hasChanges = false;

        for (const fileName of sortedFiles) {
            const content1 = source1[fileName] || ''; // Empty if new file
            const content2 = source2[fileName] || ''; // Empty if deleted file

            if (content1 === content2) continue; // Skip unchanged files

            hasChanges = true;
            
            // Create patch
            // fileName, fileName, oldStr, newStr, oldHeader, newHeader
            const patch = Diff.createTwoFilesPatch(
                fileName, 
                fileName, 
                content1, 
                content2, 
                `v${v1Input}`, 
                `v${v2Input}`
            );

            // Render patch
            const diffJson = Diff2Html.parse(patch);
            const fileHtml = Diff2Html.html(diffJson, {
                drawFileList: false,
                matching: 'lines',
                outputFormat: 'side-by-side' // or 'line-by-line'
            });
            
            diffHtml += fileHtml;
        }

        if (!hasChanges) {
            diffContainer.innerHTML = '<p>No text changes found in .tex/.bib/.sty files.</p>';
        } else {
            diffContainer.innerHTML = diffHtml;
        }
        
        statusDiv.textContent = `Comparison complete: ${arxivId} (v${v1Input} -> v${v2Input})`;

        // Add source links
        const v1Url = `https://arxiv.org/src/${arxivId}v${v1Input}`;
        const v2Url = `https://arxiv.org/src/${arxivId}v${v2Input}`;
        sourceLinksDiv.innerHTML = `
            <p>
                Download source: 
                <a href="${v1Url}" target="_blank">v${v1Input}</a> | 
                <a href="${v2Url}" target="_blank">v${v2Input}</a>
            </p>
        `;

    } catch (error) {
        console.error(error);
        statusDiv.innerHTML = `<span style="color:red">Error: ${error.message}</span>`;
        if (error.message.includes('Failed to fetch')) {
             statusDiv.innerHTML += '<br><small>Note: This tool requires CORS access to arXiv, or a proxy. If running locally without a proxy, it might fail.</small>';
        }
    }
}

document.getElementById('compareBtn').addEventListener('click', performDiff);

// Handle URL params
window.onload = function() {
    const urlParams = new URLSearchParams(window.location.search);
    const id = urlParams.get('id');
    const v1 = urlParams.get('old');
    const v2 = urlParams.get('new');

    if (id) document.getElementById('arxivId').value = id;
    if (v1) document.getElementById('version1').value = v1;
    if (v2) document.getElementById('version2').value = v2;

    if (id && v1 && v2) {
        performDiff();
    }
};
