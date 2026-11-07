# Release adapter candidate: OFF, not integrated

This is a separate candidate, not an activation path for the synthetic pilot. No existing bootstrap, transport, screen, PWA or synthetic guard is changed or imported. No credentials, real endpoint, account creation, OTP, claim, SQL migration, role mutation, production connection or deployment is included.

## Public API

`createProfessionalReleaseAdapter({sdk, config, enabled, journal?, crypto?})` exports a controller. `PROFESSIONAL_RELEASE_ENABLED` is false. Future callers must explicitly opt in and supply `config: { explicitReleaseConfiguration: true, backendOrigin: '<exact HTTPS SDK backend origin>' }`. The supplied SDK must already be configured and authenticated by the application's approved authentication flow. The configuration anchor is captured at construction; every boundary checks the SDK origin against that anchor. No location/user metadata inference. Tests use only `https://ncc.example.com` and an in-memory SDK; they never access that host.

- `bootstrap()` reads and returns `{who, profile, contexts, own}`. `profile` is the existing server row, unmodified, not constructed from `student_context`. The method does not create missing profiles.
- `selectOrganization(uuid)` explicitly selects an owned, active/trial, legal-ready professional context, independent of the existing profile role. `managed_coaches` never grants clinical access; `is_test` is not an authorization factor.
- `perform('workspace')` reads alias/organization and server-authorized roster.
- `perform('recipes', {p_student})` preserves the existing recipe RPC signature. Only row identity/workspace contract is checked here; a future presentation layer must validate recipe ingredient/totals schemas before rendering clinical content.
- `perform('messages', {student_id})` reads the exact coach/student pair, max 200 rows.
- `perform('sendMessage', {id, student_id, body})` requires a caller-generated UUID and trimmed body, max 2000 Unicode code points. Sender and coach always come from the verified identity, never input.
- `perform('markRead', {student_id, ids})` updates only unread messages sent by that student in the verified pair.
- `perform('pendingMutations', {student_id})` discovers pending send/read-marker reservations after reload without requiring the caller to retain a message UUID. It reads only the selected student's two lanes, validates the complete scope/claim, and reauthorizes identity/workspace/roster before and after reading. It returns only `{operation, id, state: 'uncertain'}` entries (empty `id` for markRead), never confirmed records, payloads, tokens or sessions. Use the returned sendMessage `id` with reconcileMessage; markRead remains blocked pending manual review. Corrupt/unavailable storage fails closed, and this read API cannot unlock or settle anything.
- `perform('reconcileMessage', {id, student_id})` reads the exact UUID/pair/sender and verifies SHA-256 against the durable reservation. No automatic resend. Missing/mismatched readback returns `outcome: 'uncertain'`, preserving the original reservation.
- `perform('setAlias', ...)` always rejects `ALIAS_RELEASE_READ_ONLY` before reservation or any RPC. Alias is read-only until a separate server contract binds `p_org` atomically and provides an attributable receipt. UNIQUE(coach_id), a single context and pre/post checks are not CAS.
- `invalidate()` discards volatile selection; `dispose()` also unsubscribes the auth observer and is terminal. The adapter subscribes to `sdk.auth.onAuthStateChange` itself when explicitly enabled, requiring that API. The callback only invalidates local state and does not initiate auth requests. Every identity check also compares getSession before/after getUser(token), so delayed callbacks are not sufficient authorization. Parsed JWT session_id only binds the session; it never substitutes for getUser or authenticated server RPC authorization. Never queries auth.sessions.

All operations reauthorize before and after work. Epochs/navigation are only local invalidation. Failures after durable reservation remain conservatively uncertain, including a crash or rejection before actual dispatch. That may require manual review rather than duplicate mutations. No alias/read_at readback clears uncertainty based on current value.

## Durable journal

Default storage is IndexedDB `ncc-professional-release-journal-v1`. Strict-durability readwrite transactions reserve a lane before writes; a message UUID ledger remains permanently to prevent A → B → A reuse. Lanes are stable across login/reload, based on backend origin + UID + organization + operation + student. Session IDs/epochs are never persisted or used as namespace isolation. Metadata consists only of scope IDs, operation, random claim ID, UUID, SHA-256 digest and uncertain/confirmed state. No body, alias, email, token or profile is stored. Settlement compares the full claim, including claim ID, not digest alone. Storage missing/blocked/failing, unsupported strict durability, unknown schema or malformed records fail closed. Late open success after rejection closes the database, and version changes close the live connection. There is no expiry, unlock or automatic retry API.

The journal is a browser-local safety mechanism, not a server idempotency or authorization boundary. Clearing browser storage, separate devices/browser profiles and server races are outside its guarantee. Real-browser IndexedDB concurrency/crash/quota tests remain necessary. The test implementation is a small asynchronous IndexedDB double, not Chromium/WebKit coverage.

## Explicit missing integration and release blockers

No import or mount is added to the pilot/PWA. Future work must create a reviewed release-specific entry point, supply an exact approved HTTPS SDK backend, wire the returned profile/context to a release screen controller, handle invalidation and uncertain receipts in UI, dispose on teardown, and perform browser QA. Do not enable synthetic modules or pass syntheticEnvironment to reuse them.

The currently inspected private backend R5.2/R5.3 is deliberately synthetic (.invalid/test organizations/fictitious legal versions). It is not a real-account release backend. A separate backend implementation and reviewed genuine legal acceptance contracts must exist before any hosted use. Client legal_ready checks do not replace real legal acceptance. This adapter is not a claim that the backend is ready, nor permission to turn any hosted flags ON.

Offline tests: `node --test efg-nutrition/tests/professional-release-adapter.test.mjs`. No sockets, backend contact, browser, secrets or new dependencies required. This focused suite does not replace repository aggregate CI, browser QA or an independent release/security review.
