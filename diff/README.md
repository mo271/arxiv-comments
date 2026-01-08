# arXiv Diff Tool

This tool allows users to compare the LaTeX source code of two different versions of an arXiv paper.

## Usage

1.  Enter the arXiv ID (e.g., `1706.03762`).
2.  Enter the two version numbers you want to compare (e.g., `1` and `2`).
3.  Click "Compare".

## How it works

1.  It fetches the source packages (`.tar.gz` or `.gz`) for both specified versions from `arxiv.org`.
2.  It decompresses the sources in the browser using `fflate`.
3.  It extracts the text files (`.tex`, `.bib`, etc.).
4.  It computes the diff using `jsdiff`.
5.  It renders the diff using `diff2html`.

## Notes

-   This tool runs entirely in the browser (client-side).
-   It requires the browser to be able to fetch resources from `arxiv.org`. Since `arxiv.org` does not strictly enable CORS for all resources, this might require a CORS proxy or might fail in some network environments if run locally without a proxy.
-   However, `arxiv.org` generally allows fetching PDFs and sources for e-print usage, so it often works.

## Dependencies

-   [fflate](https://github.com/101arrowz/fflate) for decompression.
-   [jsdiff](https://github.com/kpdecker/jsdiff) for computing diffs.
-   [Diff2Html](https://diff2html.xyz/) for rendering diffs.
