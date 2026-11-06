# R12: return after sharing and a personal coach-to-student report

Base: `efg-nutrition-app`, commit `ba0b9281bad1a83a765bc5c37b384ace24a11dd5`, tree `986276b6bd999078f7f13b2ecb75c2f4f5579fac`. Checked through the GitHub connector before local editing. Work is isolated from R11e. No remote writes, branch/PR creation, merge, deployment, SQL, permissions, flags, settings or real-account operations are included.

The requested tone and signature example were approved with “Me gusta” and “Así se transforma en algo más personal Coach-alumno”. This approves the local editorial direction, not publication.

## Return to the source

- Weekly and period reports close the PDF review only after the existing delivery client confirms success. Explicit failure, conflict, unknown outcome and pending reconciliation do not trigger a return.
- Return requires the same active review, open dialog and still-owned source tab, actor/student/organization/auth epoch and source host. A newer page or PDF cannot be closed by a late response. Weekly guards both the write/readback await and the later history-refresh await.
- The return predicate is separate from editable snapshot validity: saving a report legitimately invalidates the unsent draft predicate. That must not prevent the successful, explicitly confirmed return.
- Focus returns without scrolling to the surviving opener (or the new weekly read-only action), then the captured source scroll is restored. No browser history/back navigation is used. The PDF was an overlay on that source, not a separate route.
- Weekly success refreshes only its report and history sections, not the whole application. The current tab, unrelated period draft and other sections remain in place. A confirmed INSERT plus failed optional history refresh still returns with the existing warning that no resend is needed.
- Period success keeps the confirmed serialized snapshot, shows its success status on the source, and changes the opener to “Abrir PDF del informe compartido”. Reopening is read-only and uses that exact snapshot.
- Explicit review of every PDF page and recipient, immutable snapshot, same-ID reconciliation, duplicate prevention and historical protection remain in place.

## New reports speak directly from the coach

- New models carry `coachVoiceVersion: "coach-direct-v1"`. New HTML uses “Mi devolución para vos”, “Lo que te propongo…” and “En qué me baso para esta devolución”. Advice uses “Contame”, “Conversemos”, “Revisemos juntos” and “Te propongo”, with no automatic EFG branding in the document.
- Metadata author and visible byline use the authenticated owner profile's nickname/full_name, only when its user ID and organization's coach ID match the session. An admin must own a test organization. Missing/unverifiable names produce “Tu coach”, never an inferred person, student name, email or organization name.
- The exact old system fallback `Entrenador EFG` was verified in the published weekly builder and is no longer treated as a person's name. This is not a substring filter: legitimate/manual names such as “Ana EFG” stay literal.
- The review UI warns when no verified name is available, or when EFG appears in user-controlled visible fields. It neither silently rewrites manual text nor adds a publication block. Historical text is never modernized.
- The draft's suggested status and required review remain honest in the coach UI. The PDF does not claim manual authorship, prior clinical review or that it has already been sent. Data limitations, scientific references, non-diagnostic thresholds, missing-data warnings and the medical/nutritional disclaimer remain.
- Numeric calculations, goals, denominator/coverage rules, thresholds, food-frequency data and charts are unchanged. New copy is limited to new reports.

## Historical and asset identity

New PDF renderers are weekly v2 and period v3. Weekly missing-version dispatch is explicitly literal v1, not the advancing current constant. Period retains v1 for missing version and explicit v1/v2 dispatch. New HTML has its own dispatch; absence of the voice marker retains the original historical HTML.

The original weekly/period model-renderer modules, weekly PDF v1, period PDF v1/v2, plaintext converter, chart/snapshot modules and font/vendor remain byte-identical. Old snapshot fields and backend `efg_*` kinds, tables, unique keys, limits (weekly 8000 / period 64000) and permissions are unchanged. An uncertain pre-R12 snapshot retains its exact old voice, signature and version across reopening and reconciliation.

Minimum cache-safe proposal: keep release handshake build `ncc-pilot-3a40474052be`, use asset identity `ncc-report-share-return-r12-20261106` only for changed/new modules and the entry, and retain each unchanged module/CSS/worker URL and hash. The manifest has 123 modules, 26 unchanged CSS resources, same-origin PDF worker and 10 additional frozen report dependency pins. All local import edges are checked against their target's exact identity. No blanket cache rewrite or historical asset mutation is needed.

## Evidence and limits

The supplied mobile screenshot was materialized through the supported file route and inspected as pixels: it shows the last period-PDF page, the checked review box and a disabled “Compartido” action while the preview remains open. No image, private record, real name or extracted measurement from it is in this repository or fixtures.

`local-test-results.json` records 29 passing final commands, zero failures, and the final aggregate and distinguishes actual synthetic execution from browser-fixture syntax. The new `report-coach-voice.mjs` compares new/old numerical output, exercises advice branches and author/fallback/manual-text cases, verifies historical HTML and deterministic PDF bytes, and produces five synthetic PDF variants with actual Node PDF.js pixels. Output is under `artifacts/report-share-return-r12/`, not a live application screenshot.

Prepared browser journeys cover the focused weekly/period handlers and the full application at mobile/desktop sizes, including automatic dialog dismissal, exact source tab/focus/scroll, independent draft preservation and read-only reopen. Local Chromium was not retried: its known OS socket EPERM remains a blocker. Browser suites and CI for this candidate have not run. Physical iPhone/Android and the live backend/RLS are not certified. Future publication requires a separate decision after exact-head CI and visual review.

### Initial failures reconciled

The first aggregate had 27 passes and two failures, not a clean pass. Both were extracted-source fixture integration gaps: period-report-ui still imported the legacy model for the new v3 PDF; period-report omitted the actual author-name helper from its VM. Their exact errors and fixes are retained in `qa-reconciliation.json`. No runtime guard or assertion was removed. The full 29-command aggregate was rerun on the final source and passed.
