# Real Auth/PostgREST browser DEMO variant

Separate candidate harness. The existing `professional-browser-api` RAM HTTP fixture and its historical result remain unchanged. This variant reuses its five scenarios: persisted message with lost response; absent receipt; revoked professional membership; uncertain alias; uncertain markRead.

Browser traffic goes directly to **local Supabase Kong** at loopback, forwarding to real ephemeral Auth/PostgREST. No custom proxy or RAM API is used. The backend owns an independently authored public DEMO schema, setup, database observations and cleanup. This is not private R5.3, production or hosted parity, CDN/esm.sh verification, a complete app, or release readiness. Candidate module bytes and their synthetic opt-in guards are unchanged.

## Files and ownership

- This directory owns the browser entry, asset server and runner only.
- `../professional-browser-api` supplies unchanged policy, loss wrapper, dependency verification, bundle builder and HTML.
- `../professional-real-api/backend.mjs` supplies `startRealApi({allowedOrigin})` and owns Auth/PostgREST/schema/control. `EFG_LOCAL_STATUS_ENV` remains exclusively in Node; its contents never reach the browser. The browser directory has no SQL or admin routes.
- The integrator owns the workflow and publishing. No workflow is changed by this directory.

## Backend contract

`startRealApi` returns `{origin, fixture, snapshot, verifyAuthSession, makeReceiptAbsent, revokeProfessionalAccess, close}`. All operations may be async. `fixture` has `anonKey,email,password,userId,studentId,organizationId`. Email must end in `@example.invalid`. Only synthetic, disposable demo credentials may be passed into the browser; never log them.

The three controls retain the argument shapes in the RAM fixture, but must act on the real ephemeral services: `verifyAuthSession({userId,sessionId})`, `makeReceiptAbsent({operationId})`, `revokeProfessionalAccess({organizationId})`. No controls are reachable from browser HTTP. `snapshot({operationId=null,readIds=[]})` returns the existing sanitized schema: profile/alias hashes, message digest and identity, row counts, original insertion count, inbound unread IDs, updated reserved IDs, and optionally `sqlEffects` trigger counts. HTTP counters and CORS are deliberately absent from SQL observations. Database state must come from actual database observations, not mirrored RAM. The passive CDP observer separately counts mutation requests and observes exact receipt queries followed by successful completed responses. Preflight evidence requires actual OPTIONS requests, successful responses and loading completion. Wildcard and exact-origin CORS responses are reported separately; Kong wildcard CORS is not claimed as exact-origin enforcement. The original insertion count survives deliberate receipt deletion.

## Run and limits

Offline:

    node --test efg-nutrition/tests/professional-browser-real-api/contract.test.mjs

These tests validate source contracts and fail-closed guards, **not** real service/browser behavior.

Future authorized CI entry:

    NCC_REAL_BROWSER_API=1 NCC_BROWSER=system-chrome node efg-nutrition/tests/professional-browser-real-api/run.mjs

Requires Linux, `GITHUB_ACTIONS=true`, a valid `GITHUB_SHA`, prepared backend, and the same existing `NCC_BRIDGE_NODE_MODULES` / `NCC_BRIDGE_BUILD_DIR` inputs as the RAM harness. Use the existing SDK bundle builder and dependency pins. Backend-specific setup flags belong to backend documentation. No dependencies are installed by this runner.

The browser is pinned to the same installed official Chrome package/version/hash and Playwright version. It launches once with sandbox enabled and has no alternate target or fallback. No security settings are changed. Two browser-visible loopback origins are separately allocated: static assets and local Supabase Kong. Real Auth/PostgREST sit behind Kong. CSP, exact SDK native fetch restrictions (`redirect:error`, `credentials:omit`) and strict route allowlists remain in place. No HTTP routing/interception is installed; Playwright and CDP HTTP observers are passive. CDP sessions are attached before each page navigation, with per-session request identity to avoid collisions. WebSockets are rejected. Cookies, auth persistence, service workers and downloads are not permitted.

No local/cloud listener, container, Auth/PostgREST, installed SDK or browser was started while preparing this variant. No runtime success is claimed until the final integrated commit's authorized CI executes all five cases. Reports emit only approved metadata and fixed failure codes, never credentials, JWTs, headers, bodies or raw exception text.
