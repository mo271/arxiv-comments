# arXiv Comment Extractor

This repository contains the source code for [firsching.ch/arxiv-comments/](https://firsching.ch/arxiv-comments/), a simple web tool designed to extract all commented-out lines from LaTeX source files of papers hosted on arXiv.org.

The tool only uses publicly available data from arXiv.org.

## Basic Usage

1. Enter an arXiv link or paper ID in the input field (e.g., `https://arxiv.org/abs/1706.03762` or `1706.03762`).
2. Click "Get Comments".
3. The tool will download the LaTeX source of the paper (if available) and extract any lines that are commented out.
4. If the source is not available (e.g., the paper is provided only as a PDF), an error message will be displayed.

## Data Source

This tool solely uses the data available from [arXiv.org](https://arxiv.org/), specifically from papers that have made their LaTeX source available for download. It does **not** access any data outside of what is publicly accessible on arXiv.org.

## Removing Comments

If you want to make sure that comments in your LaTeX source are not exposed when submitting to arXiv, we recommend using one of the following tools to clean your LaTeX code:

- [arxiv-latex-cleaner](https://github.com/google-research/arxiv-latex-cleaner): A tool created by Google Research to help remove annotations, comments, and unnecessary files from LaTeX projects before submission to arXiv.
- [latexpand](https://www.ctan.org/pkg/latexpand): A CTAN package that can merge multi-file LaTeX projects into a single file and can remove comments. [Here is a helpful guide on how to use latexpand](https://tex.stackexchange.com/a/271460/80247).

By using these tools, you can ensure your LaTeX comments are not included in your submitted arXiv paper.


## Contributions

Contributions to this project are welcome! Feel free to submit a pull request or open an issue if you have any ideas for improvements or new features.

### Attribution
The share icon <img src="assets/share.svg" alt="share icon" width="16" height="16" /> used in this project is sourced from [SVG Repo](https://www.svgrepo.com).
