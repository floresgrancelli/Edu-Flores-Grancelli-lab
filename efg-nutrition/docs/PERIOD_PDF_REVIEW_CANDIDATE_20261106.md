# Real PDF review candidate

Scope: period Luxury Pro reports only. No production deployment, database/schema, permissions or RLS changes. Weekly reports retain their existing print workflow.

## Workflow

Generate the period report, edit the conclusion/note, then choose **Revisar PDF y enviar**. This opens a locally generated PDF, with separate open/download alternatives. The coach explicitly confirms reviewing the PDF and recipient, then shares from that dialog. Returning to edit, changing the text/dates/student or leaving the view revokes review and releases its local Blob URL. The accessible HTML draft remains labeled separately; it is not passed off as PDF.

Sharing persists the exact approved JSON snapshot used to generate the PDF, including `pdfRendererVersion`. The student chooses **Abrir PDF** from the shared period history and generates the same bytes from that saved snapshot and version. Tests compare the actual reviewed PDF bytes with the student history PDF bytes after the real client serialization/readback contract. Existing duplicate-click, request-ID, definitive rejection and historically uncertain retry handling remain active.

No PDF file is stored on a new service. This architecture keeps JSON persistence and regenerates PDFs deterministically on the device. `period-report-pdf.js` dispatches to the immutable `period-report-pdf-v1.js`; preserve that renderer and pinned fonts when adding future versions. An unknown version fails visibly, never silently substitutes a different document. Reports predating versioning can be explicitly converted to the current PDF layout and are labeled as a new conversion, not a preserved historical PDF.

## Dependencies and privacy

jsPDF 4.2.1 comes from a pinned official GitHub commit. DejaVu Sans 2.37 regular/bold are embedded locally; licenses, source and hashes are in pilot/vendor/PDF-DEPENDENCIES.md. The approximately 2.4 MB generator/font bundle is loaded only when opening PDF review. No CDN, remote font service or transmission for generation is required. The ordinary explicit share action continues using the existing protected report persistence client.

PDF output preserves Spanish characters, line breaks, complete long conclusion/note, evidence text and all 1–90 daily rows. Unsupported characters and values too wide for safe layout fail explicitly instead of disappearing or clipping. The PDF is not tagged for accessibility; retain the separate accessible HTML view.

## Verification

Passed locally with fictional data:
- `node efg-nutrition/tests/period-report-ui.mjs`: real handlers/client plus mocked DOM/storage, real-PDF preview-to-history byte identity, explicit review, edit/close invalidation, stale/repeated PDF preparation, tampering, error recovery and historical uncertain retries.
- `node efg-nutrition/tests/period-report-pdf.mjs`: real PDF bytes, determinism, approval/version checks, unsupported-glyph rejection, 10-day and 90-day stress fixtures.
- `python efg-nutrition/tests/verify-period-pdf.py`: complete content/dates, embedded Unicode fonts, no page-edge clipping or PDF JavaScript.
- `node efg-nutrition/tests/period-report.mjs`: existing period and draft regressions.
- Node syntax checks for affected JavaScript.

The 10-day fictional sample is 3 pages; the 90-day long-text sample is 7 pages. Poppler renders were inspected. This verifies the PDF artifact, not browser/mobile behavior.

Not run: real browser/mobile PDF embedding, focus behavior, actual download/open UI, and backend/RLS integration. Browser execution was already blocked; no bypass was attempted. A device that cannot embed the PDF must use the explicit open/download alternative. No live student information was used.
