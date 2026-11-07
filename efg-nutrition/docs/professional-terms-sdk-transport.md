> Continuity update: see [release completion and current blockers](professional-terms-completion-20261107.md). This document retains its handoff proposal scope; private v2 implementation and local evidence now exist, with no hosted exposure or enablement.

# SDK transport candidate: OFF, not integrated

This small additive seam prepares the coordinated v2 contract for a future HTTPS SDK caller. The v2 backend is still **UNIMPLEMENTED**, its professional binding **UNBOUND**, and no endpoint was contacted. No real SDK is installed or configured. No pilot/PWA entry, release adapter, synthetic fixture, flag, permission, alias or production configuration changes.

`createProfessionalTermsSdkTransport({sdk, config, enabled})` defaults OFF. A future caller must explicitly provide `enabled:true` and `{explicitReleaseConfiguration:true,backendOrigin:'<exact approved HTTPS origin>'}`. Configuration values are captured once at construction only when explicitly enabled; OFF does not read config getters. Origins must be primitive strings, never mutable URL objects or coerced values. Every boundary checks the SDK origin against that anchor; local/IP/`.invalid` endpoints and origin/path drift fail closed. The fixture retains its separate `.invalid` guard and cannot consume this transport.

The transport lazily uses the unchanged release adapter's read-only `bootstrap()` to authenticate identity, preserve the existing profile, and obtain server-owned contexts. It supplies an inert journal because bootstrap needs no storage. It adds its own auth invalidation observer, which clears selection without making auth requests. OFF makes no SDK, observer or storage access. `dispose()` unsubscribes both read/transport observers and is terminal.

First call `selectOrganization(uuid)`. The workspace must be an active/trial context owned by the authenticated actor, not the actor's original student workspace or a managed-only account. `legal_ready:false` is allowed here because this seam is for initial acceptance; it grants no clinical access or role change. Identity/session and ownership are checked before and after each RPC.

Only these exact signatures are forwarded by `rpc(name,args)`:

- `ncc_pilot_workspace_legal_bundle_v2({p_org})`
- `ncc_pilot_workspace_accept_terms_v2({p_org,p_expected_binding_sha256,p_request_id})`
- `ncc_pilot_workspace_receipt_v1({p_request_id})`, only as the existing receipt reader for a v2 envelope.

Unknown operations, extra arguments, foreign organizations, invalid UUIDs/hashes, v1 acceptance and personal legal acceptance are rejected. The response's actor/organization/version attribution is checked. Accept results and v2 receipt payloads are checked exactly. A missing receipt remains null, never success. The bundle check is intentionally only the outer attribution/shape: a future caller must verify full document schemas, RFC3339 timestamps, exact body SHA and binding canon before displaying or accepting anything. This transport alone does not establish current legal readiness.

SDK failures are thrown with `code`, `serverMessage` and `outcome`. The coordinated stable error pairs remain distinguishable: 55000/UNBOUND, 22023/BINDING_CHANGED, 22023/REQUEST_INVALID, 22023/Idempotency conflict and 55P03/BUSY. `serverMessage` is the exact allowlisted wire message (with its NCC prefix), or null for other messages. No arbitrary server text, details or hints are forwarded. Every error after mutation dispatch keeps `outcome:'uncertain'`, regardless of classification; classification does not unlock a lane or authorize retry.

There are no retries. Before a mutation dispatch, an instance-local ledger records its request UUID and locks its actor/organization lane. The request UUID cannot be reused in that instance. A failed, lost or stale result leaves the lane locked, including for a new UUID, across invalidate/reselection. Reading a receipt does not unlock it. A successful attributed response releases the lane but retains the UUID tombstone.

This instance-local defense is **not a durable acceptance flow**. A new instance has no prior ledger. Before any future use, the caller must integrate the durable metadata journal, explicit UI selections, canonical document verification, receipt reconciliation and current-binding validation; it must preserve uncertainty across reload/device boundaries. Nothing in this patch wires or enables that integration. The backend must independently implement authenticated scope, idempotency and atomic expected-binding CAS. No fallback or client pre/post check substitutes for those server requirements.

Focused SDK-double tests:

`node --test efg-nutrition/tests/professional-terms-sdk-transport.test.mjs`

The tests use plain in-memory SDK doubles and Node built-ins. They perform no fetch, sockets, real SDK calls, package installation or backend operation. They cover OFF no-access, captured origin, initial legal-ready=false ownership, exact signatures, identity/session changes, concurrent request reuse, lost replies, immutable input, attribution, receipt compatibility and disposal.

NOT_RUN: real HTTPS/SDK authentication, implemented backend/API/SQL/RLS/CAS, browser rendering/storage, integration into the durable flow, repository aggregate suite. The original 14-file acceptance freeze is unchanged.
