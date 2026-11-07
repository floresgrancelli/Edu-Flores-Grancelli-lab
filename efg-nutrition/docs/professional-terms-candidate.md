> Continuity update: see [release completion and current blockers](professional-terms-completion-20261107.md). This document retains its handoff proposal scope; private v2 implementation and local evidence now exist, with no hosted exposure or enablement.

# Professional acceptance candidate: OFF / UNBOUND

Public base: `166a03a51c10e82ed0a0d9bea9557b726ec5da25`. This additive candidate does not change an existing release adapter, synthetic guard, v1 RPC, pilot entry, PWA, alias, workflow, deployment, permission, or data source. No real accounts, legal publications or acceptance records were queried or modified.

## Two strictly separate surfaces

- `professional-terms-candidate.mjs` and `professional-terms-panel.mjs`: the real-candidate surface stays OFF by default and permanently UNBOUND. An explicit preview can only show unavailable. There is no SDK, transport, journal, checkbox or executable acceptance path. Existing participation notices are not relabeled as a professional contract, and student acceptance is never reused.
- `professional-terms-fixture-flow.mjs` and `professional-terms-fixture-panel.mjs`: a separate OFF-by-default synthetic preview of the coordinated proposal `ncc-professional-legal-v2-proposal-1`. It requires an explicit fixture opt-in, a marked fixture transport at the exact `.invalid` sentinel origin, and an active synthetic context. It has no SDK or network implementation. It is not mounted or imported by the pilot/PWA/real panel. A future hosted adapter must be independently implemented and reviewed; changing a flag is not that implementation.

The public proposal is preserved in `professional-terms-v2-contract.md` and its exact fictional vector in `../tests/professional-terms-v2-fixture-vector.json`. The proposed backend RPCs do not exist and permissions are not available. The fixture cannot prove SQL authorization, transactional CAS, locking, latency or hosted availability.

## Fixture protocol implemented

1. Read the proposed bundle and verify actor, organization, professional scope, complete terms/privacy pair, distinct UUIDs, publication timestamps, exact body SHA-256, and reproducible binding SHA-256.
2. Display the verified bodies inline as text, with two separate unchecked boxes. Body and version bytes are never trimmed, normalized to NFC, or interpreted as HTML. Optional URLs are not rendered or followed. Defensive client size limits are 200,000 JavaScript code units per body and 1,024 UTF-8 bytes per nonempty version.
3. An explicit click reserves a durable metadata claim before calling v2 with exactly the organization, displayed binding hash, and new request UUID. No silent bundle refresh changes the expected hash before CAS. The fixture models compare-and-set before replay. Real transaction behavior is NOT_RUN.
4. Verify the direct result and the exact receipt envelope. For new v2 calls the payload has exactly two keys: `p_org`, `p_expected_binding_sha256`. Existing v1 payloads with `p_org`, `p_terms_version`, `p_privacy_version` remain untouched and cannot prove a v2 acceptance. No v1 or personal legal endpoint fallback exists.
5. Reconcile an uncertain request by reading its receipt only. Verify actor, organization, request UUID, operation, exact payload, and binding. A receipt proves a historical result. The flow rereads and verifies the current complete bundle before reporting current acceptance. New versions clear both checks and require a new explicit acceptance.
6. Close, dispose and context invalidation clear volatile bodies and selections. A late response cannot restore a dismissed panel. The fixture host must call panel `revalidate()` on context/navigation changes; the synthetic flow also validates its supplied context at every asynchronous boundary. This is not a substitute for a future real SDK auth observer and server authorization.

## Durable journal and conservative failures

`professional-terms-journal.mjs` uses strict-durability IndexedDB transactions. A stable backend/actor/organization lane and permanent request-UUID ledger survive reload and session changes. Only scope IDs, claim/request IDs, operation, versions, hashes and uncertain/confirmed state are stored. No bodies, checkbox text, tokens, session IDs, email, profile, or medical information is persisted. Storage is created lazily after the fixture gates; OFF does not even read the global IndexedDB getter.

An uncertain lane blocks new requests, even for another binding. An already confirmed binding cannot be sent again. Settlement compares the entire claim and its matching ledger. Corruption, unavailable storage, weak durability and unknown schemas fail closed. There is no expiry, delete, unlock, or mutation-retry API.

After a lost response or a failure following reservation, only exact readback can settle the operation. A missing receipt is not proof of rollback. Even a reported CAS mismatch keeps the lane conservatively uncertain; the fresh complete pair is displayed with cleared, disabled checkboxes. Manual review remains necessary if no attributable receipt exists. This candidate does not implement a special rejection receipt or safe reset protocol, so it deliberately blocks rather than reusing a request or silently resending. BUSY/deadlock/timeout/schema-cache failures also never trigger retries.

Browser-local storage does not cover another browser/device, deleted storage or server authorization. PostgreSQL idempotency and CAS remain server responsibilities.

## Existing participant notices: evidence, not professional approval

The source documents were verified at the public base commit. Their preparer normalizes CRLF to LF and applies `trim()` before SHA-256. Those source-preparation rules must not be applied again to server-returned body bytes.

- [Participation proposal](https://github.com/floresgrancelli/Edu-Flores-Grancelli-lab/blob/166a03a51c10e82ed0a0d9bea9557b726ec5da25/efg-nutrition/docs/NCC_PILOTO_CONDICIONES_SIMPLES_PROPUESTA_20261102.txt): version `pilot_20261102_v1`, normalized SHA-256 `54c4d8ecd5662e90d20be1b4156249e9a567fd31666265c97138f048e1893af3`, Git blob `8f77d3c316b158a218befde33efaa8c90f0cb665`.
- [Privacy proposal](https://github.com/floresgrancelli/Edu-Flores-Grancelli-lab/blob/166a03a51c10e82ed0a0d9bea9557b726ec5da25/efg-nutrition/docs/NCC_PILOTO_PRIVACIDAD_SIMPLE_PROPUESTA_20261102.txt): same version, normalized SHA-256 `a66e85435f9e8aaa5469785b85ba61e2b3790bb34d8b978f04d1dfe27289adb6`, Git blob `3aa1d7c721b31db14c6578f47c74c29ea2630e35`.

Both normalized hashes were recomputed from verified public-source copies during this preparation. No document UUID, hosted publication timestamp, professional audience approval or current hosted status is inferred. No legal body is copied into the candidate. Only clearly fictional test text is used in tests.

## Focused verification and NOT_RUN

Run from the repository root:

`node --test efg-nutrition/tests/professional-terms-*.test.mjs`

The suite covers OFF zero-access, UNBOUND, SHA/canon including the exact composed/decomposed Unicode backend vector, malformed documents, CAS races, v1/foreign receipt rejection, lost responses, reload, permanent UUID reuse prevention, journal corruption/concurrency, repeated clicks, close during flight, invalidated context, and semantic DOM behavior. Tests use Node built-ins, an in-memory transport and asynchronous DOM/IndexedDB doubles. No sockets, package installation or external service is needed.

NOT_RUN: real browser visual/accessibility/Back-Forward QA; native IndexedDB crash/quota behavior in Chromium/WebKit; PostgreSQL/API/row-level security/CAS/locks; real HTTPS SDK and authentication integration; aggregate repository suite. Focused tests are not a release or production-readiness claim.
