# Report preview and charts R11c candidate (2026-11-06)

Base: production commit `3611949b2a1ac866bd342a05187251616d7f08ad`, tree `85308d073d111e66f8081cafa874d0c850bdda30`.
Status at author handoff: local candidate only. No production write, deployment, merge, database change, real-account session or live RLS certification. Browser CI is prepared, not claimed passed here.

## The two reported failures

1. The mobile screenshot is the weekly Luxury Pro route, not the period report. Its exact `printLuxuryReport` handler only marked HTML and called `window.print()`. It did not create or open a PDF. The screenshot shows an already-shared report, so opening must be read-only and use stored history.
2. The period screen returned its role-only fallback before rendering date inputs. The parent reports screen allowed an admin using their own test coach organization, while period panel/context/generation/client accepted only literal `coach`.

Both screenshots were inspected as image pixels locally. No real names, records or screenshot files were added to this candidate or test artifacts.

## Candidate behavior

- Weekly and period: one tap synchronously opens an in-app dialog, then creates a real PDF from the final serialized snapshot. PDF.js draws those actual bytes page by page. No popup, native print dialog or native PDF iframe is needed.
- Page navigation, zoom, accessible text extracted from each PDF page, download, return/edit and close are provided. The real PDF must finish rendering all pages and the coach must check the review box before the send button becomes available inside that dialog. No duplicate browser confirmation prompt.
- Review is bound to the recipient, current session/role/org/epoch, immutable snapshot and source state. Edits, navigation and logout invalidate the review; blob URLs and workers are released. Pending sends remain locked.
- The exact versioned JSON reviewed is inserted. The student recreates the same PDF bytes with the retained weekly renderer version. Unknown versions fail closed. Existing shared reports cannot be edited or resent. Stored row week and JSON week must agree.
- Old JSON without a renderer version is explicitly identified as a new PDF conversion. Plaintext history is converted only from its stored text; no current diary data is substituted. Invalid historical dates fail explicitly.
- Uncertain weekly delivery retains the exact attempt in RAM. Reopening keeps that PDF. Retry performs exact readback first; commit plus lost response does not cause a second INSERT. Explicit server rejection differs from transport exceptions, and an earlier unknown result stays unknown after a later rejection. Scope is checked after readback before any retry INSERT. Conflicting history is never overwritten.
- Period: one context/capability now drives dates, generation, preview and publication. The newly admitted UI case is only an active admin whose authenticated profile owns an enabled test organization, with an active student in that organization and matching consent. General admins, other owners/organizations, inactive profiles/students and missing/revoked consent stay blocked. The role is not rewritten to `coach`.
- Existing published period PDF v1 and its parser/font/generator dependencies remain byte-for-byte unchanged. The dispatcher selects v1 for missing or explicit v1 versions; new period snapshots use v2 while keeping the backend kind efg_luxury_period_v1. No SQL, RLS, grants, flags, CSP, security or permissions changes.

## Permission provenance (source evidence, not a new live inspection)

- [Existing period insert policy](https://github.com/floresgrancelli/Edu-Flores-Grancelli-lab/blob/3611949b2a1ac866bd342a05187251616d7f08ad/efg-nutrition/migrations/20261104_period_reports_candidate.sql): `coach_id = auth.uid()` and `efg_private.coach_has_student(student_id)`.
- [Authorization helper snapshot](https://github.com/floresgrancelli/Edu-Flores-Grancelli-lab/blob/3611949b2a1ac866bd342a05187251616d7f08ad/efg-nutrition/docs/p30d-closure/authorization-helpers-snapshot.sql): active coach OR active admin in own test org; active student, matching organization/consent, enabled organization state. The server remains authoritative.
- [Existing weekly unique key](https://github.com/floresgrancelli/Edu-Flores-Grancelli-lab/blob/3611949b2a1ac866bd342a05187251616d7f08ad/efg-nutrition/migrations/etapas12_informes_semanales.sql): `UNIQUE(student_id, week_ending)`. No migration is added or executed.

## Local verification

`local-test-results.json` records 24 passing local commands, including 5 asset/PWA subtests and 2 browser-fixture syntax/source-extraction checks. The screenshot-action regression failed on the old weekly handler because it invoked `window.print`; the period access regression failed on the old panel because the authorized synthetic admin received no date controls. Both pass after the fix.

Actual PDF bytes are decoded and rasterized with the vendored PDF.js plus native Node canvas, and also inspected with Poppler. The chart fixture has 5 weekly pages, 12 pages for 90 days and 5 for a single day. Four series, complete range, missing-day breaks, real zeroes, partial/closed points, historical step targets, changing/conflicting targets, missing historical metadata, malformed extensions, size boundaries and source-proof scope are covered. Normal/long weekly text and chart pages were visually inspected; the reviewer also inspected all six 90-day chart pages. This is real PDF pixel verification, not browser or device certification.

The actual shared viewer controller and actual period handlers run with deterministic DOM/decode substitutes for interruption tests: synchronous open, all-pages review, initial PDF error/internal retry/success, edits, close, pending send locks, late responses, uncertain result/retry, read-only history, blob cleanup and exact coach/student bytes. The original v1 output is compared before and after generating v2 in the same process.

The installed local Chromium could not start: OS socket creation returned `Operation not permitted`, including a permitted retry. No local Chromium/WebKit UI success is claimed.

## CI coverage prepared

`.github/workflows/efg-report-preview-qa.yml` runs contracts and Chromium/WebKit at 390 and 1280 CSS pixels. It includes:

1. Exact weekly handlers plus real PDF.js pages, touch opening during delayed generation, close/reopen, zoom, review gate, failure/retry, shared history, student byte equality, resource cleanup and no external requests.
2. The existing full application `premium-visual-smoke.mjs` harness with `EFG_QA_WEEKLY_REPORT=1`, now using real PDF review instead of intercepted print. It exercises the actual app DOM/navbar, weekly history and publication, and admin-test period dates/review/publication with synthetic transport. The harness was recovered unmodified from the pinned base; its source is not replaced by this patch.
3. Period browser regression now exercises actual PDF.js pages, download, all-pages review, graph text, close/edit/retry and exact student bytes. Negative actor/organization/consent matrices remain in the Node suite.

All browser transports are RAM fixtures. These tests do not prove live database policy parity, physical iPhone/Android behavior, native PDF printing, or a production release. Review CI results and screenshots for the exact candidate head before a release decision.

PDF.js provenance, exact hashes, licenses, size and same-origin resource policy are documented in `pilot/vendor/PDF-DEPENDENCIES.md`.

## Asset integration preflight correction (R11b)

The first local handoff retained the R10 candidate manifest while the entry and period-history module used R11 URLs. The remote writer caught this before creating any branch or PR. This revision updates the exact manifest and reviewed pins; it does not relax release/feature-flag checks.

The manifest pins the version for each module target. Unchanged modules retain their R10 identity so the published period PDF renderer and dependencies remain byte-for-byte unchanged. Changed/new entry, history, weekly modules and PDF.js modules/worker use R11. Every local edge is checked against the target's exact pinned URL and hash; a stale history URL has a negative test. The same-origin worker URL and new viewer CSS are explicitly tracked. R11b checked all 112 module assets and 26 stylesheets; the R11c graph is described below. Release build `ncc-pilot-3a40474052be` and feature flags remain unchanged.

Only asset URL integration and guards changed after the functional freeze. Approved-release, PWA entry identity and complete graph/resource checks passed locally; functional suites were not needlessly repeated. The rendered PDF fixture bytes were compared across the original and R11b copies and remain identical.

## New requested charts and food-frequency correction (R11c)

The third reference screenshot was inspected locally. Its source is `coachTrendChart` with four series: calories, protein, carbohydrate and fat. New weekly and period-v2 PDFs include vector line/point charts for all four. Filled points mean the saved chronological day is closed; hollow points mean partial. Neither label claims meal completeness. Missing days are not zeroes and are never joined. The y-axis scales to the saved data and available goals, with dates and units. Thirty-day panels preserve every day of a maximum90-day report. Goals use a dashed step, not an invented gradual change.

`trendGoals` version1 is a compact run-length extension: range plus rows `[offset,k,p,c,f]`. It stores only target changes because saved `days` already contain intake and day state. `rows:null` means the complete historical goal window was not verified. A missing extension on an older snapshot means goals were not preserved. Neither case backfills from today's goals or averages. The renderer validates version/range/row shape/order/bounds and finite metrics; unknown renderer/extension versions fail explicitly.

A bounded read retrieves every tie at the latest baseline date plus all changes in the window. Context is checked before/after each await and page. One normalized timeline feeds both the summary/conclusion builder and graph extension; same-date revisions resolve by verified approval time, and conflicts become null tombstones rather than silently falling back. The weekly latest20 UI cache is not treated as complete history. Its separate proof binds actor/org/student/auth epoch/range and is cleared on logout/student switch; read failure yields no verified goal comparison. No real user records were consulted for these tests.

The weekly8000-character and period64000-character limits are unchanged. Over-limit snapshots are rejected whole before sharing, never truncated. The backend kind/uniqueness contract is unchanged and historical rows are not replaced. Period v1 and its old dependencies are unchanged bytes; charts apply to new v2 documents, not retroactively to historical v1 PDFs.

Both PDFs retain the top5 food block. Its metric is distinct recorded days in the report range, not grams or portions, now stated explicitly. A wrapper for new snapshots distinguishes legacy generic `custom-recipe` items by normalized saved name, while retaining specific recipe IDs. Repeats within the same date count once; skipped meals, out-of-range dates and sports are excluded. Generic recipes with identical normalized names cannot be distinguished because those old diary items carry no specific recipe ID. Existing `topFoods` snapshots are not recomputed.

The shared viewer now also handles period v1/v2 without a native PDF iframe. The existing period publisher, idempotent request ID and uncertain-result behavior remain in place. Error recovery retains the exact snapshot; an internal PDF retry must finish rendering and reviewing every page before publishing.

R11c pins117 module files, the worker resource and26 stylesheets over the production base graph. The strict per-target URL/hash guards and their negatives remain; immutable period pins now explicitly cover v1 renderer, both legacy model parsers, jsPDF and embedded font. Dispatcher and version-selector changes are explicit versioned assets. Release build, all feature flags, CSP and permissions remain unchanged. Prior R11/R11b freezes are preserved separately; this candidate supersedes them for the requested draft PR/CI only.
