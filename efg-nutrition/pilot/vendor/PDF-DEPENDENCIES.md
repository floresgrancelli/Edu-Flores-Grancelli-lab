# Local PDF dependencies

The shared renderer uses only versioned local assets. Rendering does not fetch a CDN, upload report content, or contact a PDF service. Load the renderer dynamically when opening a PDF; the separate version module is lightweight.

## jsPDF 4.2.1

Official upstream: https://github.com/parallax/jsPDF
Release: https://github.com/parallax/jsPDF/releases/tag/v4.2.1
Pinned commit: `4562ce8aa35bd5ecd98cd5e262e3da2af96476f6`
Source: https://raw.githubusercontent.com/parallax/jsPDF/4562ce8aa35bd5ecd98cd5e262e3da2af96476f6/dist/jspdf.umd.min.js
Local SHA-256: `0f6fe797a6df06bd8cab2a0c4d034ae1ca1b4ea8e20f06e1444862444d4bade2`

The official UMD bundle is vendored, with its license header preserved. Its generated header says CommitID 00000000; the provenance is the pinned source commit above, not that placeholder. MIT license copied to jsPDF-LICENSE.txt. No html/canvas rendering APIs or optional external dependencies are used.

## DejaVu Sans 2.37

Official project: https://dejavu-fonts.github.io/
Regular and bold TTFs copied from the installed DejaVu 2.37 distribution, encoded as base64 exports in dejavu-sans-2.37.js. Font coverage is the intersection of the two fonts’ Unicode cmaps. Original regular TTF SHA-256: `57f73e11f51999432bf7ab22ce55b6f945d5eca1bf824404cfa9ec2e3718c84e`. Original bold TTF SHA-256: `a4c5bc453ca281d90ea079e596da7ae0dfeb5777497c29ec254e76d97ff6f890`.
Local module SHA-256: `f0a0bf6bfeb9b74b228824002781ff4107cf4691fe67e87a5ea583b38c7a79a9`.
Upstream font license is included as DejaVu-LICENSE.txt. The PDFs embed subsets of both fonts and ToUnicode mappings.

## Immutable document version

`ncc-luxury-period-pdf-v1` identifies this layout, dependency and font set. Keep this implementation available for its stored snapshots when introducing later versions. Do not silently change its typography, content, formatting, fonts or library. Unknown explicit versions fail closed. Legacy snapshots without a version can be converted to the current PDF, but the UI must identify that as a new conversion, not the historical PDF originally received.

The renderer fixes PDF creation metadata and file ID to avoid timestamp/random byte changes. Byte determinism is tested in Node for repeated identical snapshots; browser-engine parity and mobile viewer behavior still require browser QA.
