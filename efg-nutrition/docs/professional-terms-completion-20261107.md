# Double role: recovered handoff and release candidate, OFF

Status: **NOT READY FOR HOSTED ENABLEMENT**. PR remains draft. No merge, deployment, real-account change, permission change or new paid resource is authorized or performed.

Continuity: «Buscá en mi Space el archivo NCC-Work-handoff-professional-terms-OFF-20261107.zip; contiene el trabajo de interfaz preparado y sus pruebas». The parallel task was stopped by the owner. All 17 additions were recovered against HEAD `166a03a51c10e82ed0a0d9bea9557b726ec5da25`, verified against both handoff SHA manifests, then integrated. Original copies/manifests remain in the private evidence package. Imported runtime edges now have explicit asset pins.

## Implemented candidate

- Existing application entry for an independent professional panel, default OFF with a null release-backend binding. No new sign-in provider, profile promotion or student-organization rewrite. OFF adds no professional RPC, panel, IndexedDB use or observer.
- Student/personal return; original profile and organization cross-check; hidden/inert personal content while professional; legacy handlers blocked outside the professional panel; logout remains available. Unsaved personal edits and message drafts block switching.
- Separate explicit professional acceptance of the exact inline terms/privacy text; SHA verification, separate checkboxes, actor/org binding, durable UUID reservation and receipt readback. No student acceptance reuse or v1 acceptance fallback. Uncertain requests survive reload and are never automatically resent.
- Admin creation/cupo changes and coach invitations use server-authorized RPCs and the existing release journal, server mutex and receipt store. Admin actions are unavailable to a student-coach. Pending invitations occupy seats. The client does not increase its own quota.
- Basic authorized roster, professional conversation, durable pending-message discovery/readback and read-only payment alias. Shared recipes remain supported by the release adapter but have no new recipe presentation in this panel.
- Private v2 definitions implement bundle and acceptance CAS, actor/request mutex, organization lock, SHARE NOWAIT catalogue lock and fresh post-lock document reads. Current v2 receipt and capability are required for release legal readiness. v1 history cannot satisfy that gate. The previously prepared v1 release delta is superseded for the v2 acceptance path, not silently asserted as tested.
- Private installation definitions for an ABSENT backend compose the frozen R52/R53 dependency bodies with the new v2 code. Real-identity/document binding and permission exposure remain unresolved. Production review/reversal files contain unconditional STOP guards and ROLLBACK.

## Evidence and precise scope

- Handoff evidence retained: 35 frontend/journal/fixture checks and 13 SDK-seam checks, originally passed before this task. That evidence is not browser/backend certification.
- Changed release adapter/journal and SDK seam regression plus new acceptance flow: 52/52 Node checks passed. New workspace mutations: 10/10 checks passed. Asset identity: 4/4 passed. A single aggregate Node integration run then passed 400/400 contracts after the import/asset integration changed. CI must validate its own exact HEAD; these are local results, not a claim that hosted workflows passed.
- Chromium 153 at 390 and 1280 px: exact inline text and two checks; lost result; native IndexedDB/reload/readback without resend; personal return; preserved original student identity; admin quota receipt; logout clearing; no horizontal overflow, page errors or external requests. This UI fixture uses a **synthetic SDK**, not real hosted Auth/PostgREST.
- Modified full application, release OFF: student login rendered, no uncaught browser errors, no release panel and zero `ncc_*` RPCs.
- New private SQL ran on PostgreSQL 17.5 embedded in PGlite using the full captured canonical 14-table DDL/constraints/triggers and synthetic Auth bridge. This tests the new installation/acceptance/cupo logic; it is **not independent-connection lock/concurrency evidence**, GoTrue, PostgREST or hosted parity. 24 SQL checks passed, including unchanged profile, personal consent, goal history and plan access.
- Previously approved real-browser/SDK/IndexedDB/Auth/PostgREST/PostgreSQL DEMO 5/5 is retained at `166a03a5`. Its runtime inputs were not changed or rerun. CI selects changed checks explicitly; no new release-backend result is inferred from that DEMO.

## Remaining release blockers

1. **Native independent-connection execution of the new private SQL**, including CAS/publication contention, seat contention, revocation and transaction rollback, followed by the actual release UI/SDK/API path. The Work environment ran embedded SQL and real Chromium; it did not provide that native private stack. Do not substitute the old DEMO 5/5 result.
2. **Professional document scope decision.** Read-only server metadata confirms only the existing participant notices are current and the catalogue allows one current document per kind. Do not publish another current pair, replace participant notices, infer professional scope, or fabricate a coach's acceptance. The owner must review whether the current notices cover the professional use; otherwise a scoped-document change and its effect on existing students must be prepared before publication. Real document IDs/hashes/identity bindings remain UNBOUND.
3. **Complete coach tools in the release panel.** The new panel does not yet route the existing health-intake, calculator, Dieta Guía, report and payment workflows through a verified independent professional context. Do not substitute the student's personal state or claim full coach-function parity from roster/messages alone. Alias writing also remains read-only pending an org-bound server contract.
4. **Explicit backend/permission and deployment approvals**, after the technical blockers above are closed. No real workspace/cupo has been granted to Carla. Existing student accounts require no new Auth account for this dual capability. New standalone coach sign-up/claim is outside this panel's completed path.

## Safe activation sequence and reversal

Keep all runtime flags OFF. Resolve the blockers above with fictitious records first. Refresh the exact backend metadata/before-images and protected-data evidence; serialize installation against other DDL/writers; bind reviewed documents and explicit pilot identities; review exact function/policy/ACL differences. Obtain owner approval for that concrete migration/permission step. Run transactional pre/postflight and abort on drift. Only after separately approved publication should a validated existing account receive its independent workspace and reviewed quota; the coach herself must accept the displayed professional documents.

Before commit, any installation failure must ROLLBACK. After commit and before activity, a guarded reversal requires exact durable before-images and proof of no managed activity. After activity or uncertainty, keep the UI OFF, preserve workspace markers/receipts/journals/student history, and prepare a forward repair. Never drop managed tables, restore old consent or replay an uncertain write to reverse an installation. Closing the UI alone does not revoke backend permissions.
