# Public synthetic model with real local services

This directory supplies the backend for exactly five existing browser scenarios:
persisted message after a consumed/lost response, absent message receipt,
professional-access revocation, uncertain alias, and uncertain `read_at`.

The browser uses the official Supabase JavaScript SDK and talks directly to the
local Supabase API gateway. Auth issues real session tokens, PostgREST validates
requests, and PostgreSQL executes the new model below. There is no Node gateway,
HTTP interception, fabricated OPTIONS response, custom JWT issuer, SDK-shaped
substitute, or browser-accessible admin route.

**The schema and records are entirely synthetic. This is not R5.3, a hosted
migration, production RLS equivalence, or evidence that the full pilot app works.**
All application APIs and policies in `schema.synthetic.sql` were written for this
small independent model, from public DTOs. No prior installation SQL is imported.

## Sources and scope

Public candidate inputs were read from commit
`dd5855d955ac59da3093288b5ee10cb85a07f62f` in
`floresgrancelli/Edu-Flores-Grancelli-lab`:

- `efg-nutrition/pilot/professional-screens-transport.mjs`
- `efg-nutrition/pilot/professional-screens-candidate.mjs`
- `efg-nutrition/pilot/professional-mutation-journal.mjs`
- Existing public `professional-browser-api` DTO/fixture contracts.

The local guard, fixed psql connection, and literal-escaping pattern follow the
public `tests/helpers/coach119-local.mjs`. That helper, its custom `asClient`, its
SQL, and its test suite are **not** imported or executed.

The original profile remains `role = 'student'`, linked to a separate personal
organization. Contexts and roster come from authenticated SQL RPCs. The client's
message UUID is the message primary key. A private SQL trigger creates one demo
notification and an insertion ledger entry; the insertion ledger survives the
absent-receipt control. This demonstrates this model only.

## CI entrypoints

Prerequisites are the existing pinned Supabase CLI **2.84.2**, Docker, Node 22 and
psql. Browser/SDK installation remains the existing browser harness's job.
No file in this directory installs a dependency. Importing a module is inert.

Set these values in the existing disposable GitHub Actions job:

```sh
NCC_REAL_BROWSER_API=1
NCC_REAL_STACK_ID=ncc-professional-real-${GITHUB_RUN_ID}-${GITHUB_RUN_ATTEMPT}
NCC_REAL_STACK_DIR=${RUNNER_TEMP}/${NCC_REAL_STACK_ID}
NCC_REAL_STACK_NETWORK=${NCC_REAL_STACK_ID}-network
EFG_LOCAL_STATUS_ENV=${RUNNER_TEMP}/${NCC_REAL_STACK_ID}-status.env
```

Run from the checkout root, once:

```sh
node efg-nutrition/tests/professional-real-api/lifecycle.mjs start
node efg-nutrition/tests/professional-real-api/setup.mjs
node efg-nutrition/tests/professional-browser-real-api/run.mjs
```

The workflow must always run this last command, and treat its failure as failure:

```sh
node efg-nutrition/tests/professional-real-api/lifecycle.mjs stop
```

Start gets a 10-minute internal deadline; stop gets 120 seconds. The containing
steps must leave margin, such as 14 and 5 minutes. The lifecycle discovers the
pinned CLI flags using `--help`, creates a new owned project and a new labelled
Docker network, starts with `--network-id`, and writes CLI status only to a
user-owned mode-0600 temporary file. CLI startup output is never printed or saved.
No remote project link, migration, deployment, CI secret, cache, artifact upload,
daemon setting, existing-network change, sandbox change, or TLS bypass is used.

The new network uses
`com.docker.network.bridge.host_binding_ipv4=127.0.0.1`, as documented in the
[official local-development guide](https://supabase.com/docs/guides/local-development).
The pinned CLI's [start source](https://github.com/supabase/cli/blob/v2.84.2/internal/start/start.go)
and [database startup source](https://github.com/supabase/cli/blob/v2.84.2/internal/db/start/start.go)
specify `HostPort` without forcing `HostIp` in the inspected published bindings.
This is source evidence, not a substitute for runtime inspection.

Before reading keys or connecting to Auth/SQL, runtime inspection verifies every
owned container's project label, network, running state, and published `HostIp`.
Wildcard or non-loopback bindings fail closed. API and database ports must belong
to the owned gateway and database containers. Only the four service image tags,
CLI version, PostgreSQL server version, and boolean/count evidence are returned;
container environments are not read. PostgreSQL 17 is required. No assumed Auth
or PostgREST version is inferred from the CLI version; their actual images are
reported by lifecycle/setup.

Failures report only a fixed stage/code and, for psql failures when available,
the five-character SQLSTATE. SQL text, stderr, response bodies and credentials
are never included in those diagnostics.

Setup rejects an existing application schema or any existing Auth users. The
Node backend creates fresh `example.invalid` users through the local GoTrue admin
API, with synthetic runtime passwords. No user token is minted by this code.
The demo skips email verification; SMTP/OTP delivery is not tested.

Cleanup calls `stop --no-backup`, verifies no containers or volumes with this
project label remain, removes only the owned empty network, and removes only this
run's stack directory and status file. An incomplete cleanup exits nonzero and
retains the ownership marker for a final bounded cleanup attempt. It never prunes
unrelated containers, volumes, networks, or images.

## Node/browser contract

Import `startRealApi` from `../professional-real-api/backend.mjs`:

```js
const api = await startRealApi({allowedOrigin: assets.origin});
// api.origin is the real local API gateway, http://127.0.0.1:54321.
// Browser-safe runtime-only fixture:
api.fixture; // {anonKey, email, password, userId, studentId, organizationId}
await api.verifyAuthSession({userId, sessionId});
const state = await api.snapshot({operationId: null, readIds: []});
await api.makeReceiptAbsent({operationId});
await api.revokeProfessionalAccess({organizationId});
await api.close();
```

The browser receives only the explicitly enumerated fixture. Never serialize the
runtime object, CLI status, an admin key, signing secret, DB URL, SQL adapter, or
service credentials to the browser or logs. Credentials and tokens must not enter
IndexedDB, artifacts, screenshots, or diagnostic output. `verifyAuthSession`
checks the actual row in `auth.sessions`; no Auth table is seeded manually.

`snapshot()` contains only SQL-derived evidence:

- `originalProfileHash`, `aliasHash`
- `messageInsertCount`, `messageRowsForOperation`, `notificationRowsForOperation`
- `messageDigest`, `messageIdentity`
- `inboundUnreadIds`, `reservedReadIdsUpdated`
- `sqlEffects: {sendMessage, setAlias, markRead}`

`sqlEffects` counts **trigger row effects**, not requests or attempted writes.
`markRead` is the number of rows changed. HTTP dispatches, exact receipt GETs,
OPTIONS and CORS acceptance must be independently observed by the browser runner
using passive CDP, without retaining headers, bodies, or tokens. The backend does
not return `cors`, `receiptReads`, or `mutationDispatches`. This keeps HTTP
observation separate from durable SQL evidence. CORS is the local gateway's real
CORS, not a claim about hosted Supabase.

`close()` removes only the current synthetic case's records/users. The workflow
owns the stack lifetime across all five cases, always attempts final teardown,
and fails if verification is incomplete. Hard cancellation or runner loss cannot
guarantee that cleanup code gets to execute.

## Offline checks and remaining verification

```sh
node --test efg-nutrition/tests/professional-real-api/contract.test.mjs
```

Eight focused offline tests cover CI/target guards, local-key parsing, actual
binding-evidence rejection, command planning, mocked filesystem/subprocess
lifecycle and cleanup failures, SQL-snapshot mapping, and source contracts.
Mocks do not launch processes, servers, Docker, Auth, PostgREST or PostgreSQL.
They do not validate SQL syntax or execute RLS.

Only the one joint CI run can establish actual stack startup and bindings, schema
application, local JWT validation, SDK requests and native CORS, effective RLS,
database mutations and receipts, browser/IndexedDB recovery, and final teardown.
Until that run succeeds, those claims remain **not run**. This model does not
validate private/hosted schemas, production permissions, notifications outside the
demo table, recipes, the release adapter, device-native behavior, full-app UI,
browser crash/eviction, or simultaneous cross-tab races.
