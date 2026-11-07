# Concurrent workspace model: isolated tests, not a release

This test is a newly authored, deliberately small model of workspace authorization,
quota, receipts and transaction ordering. It does **not** import, reconstruct or
publish a captured database schema or the private R5 proposal. All rows are invented;
all addresses end in `@example.invalid`. The feature stays OFF.

## Provenance and boundaries

- `dual-workspace-concurrency-model.sql` and `dual-workspace-concurrency.mjs` are new
  test-only files authored from behavioral requirements, not copied application SQL.
- The existing public `ncc-dual-workspace-fullapp-qa.yml` at commit
  `d48c7e10454d45e2bbc98e4882a44c9f3c638670` is extended with one isolated job and
  exact source allowlist entries. Existing browser jobs remain unchanged.
- The model has no application RPC, hosted data, credentials, authentication,
  signed JWT, PostgREST, RLS, production ACL or current-schema parity assertion.
  Passing a synthetic actor integer is not real authentication.
- `model.compat()` is only an alias for this model's mutation function. It tests a
  second entrypoint to the same gate, **not** an independent legacy implementation.
- Personal/mentor values are stored in a separate synthetic table and checked for
  unchanged bytes. That establishes model non-interference, not real personal
  identity, health-data or mentor authorization coverage.
- Claim identity and confirmed email are intentionally outside this model. Tests
  cover reservation conversion, ordering and the final-target guard only.

## Twelve groups, with bounded claims

1. Revocation commits before invite, through direct and alias entrypoints.
2. Invite commits before revocation; subsequent claim is denied.
3. Claim and revocation in both orders; occupied seats do not double count a reservation.
4. Activation/deactivation and revocation in both orders; reactivation does not restore consent.
5. Pending-invitation cancellation/deletion versus workspace revocation; consumed history survives.
6. Terms and revocation, including denial of a historical replay after revocation.
7. Two requests for the last seat, including the same synthetic address.
8. Concurrent identical idempotency keys and conflicting payloads.
9. A deliberately reversed request/workspace lock order must produce `40P01` in a
   negative control. The model's uniform request-first order must instead serialize
   administrative and coach requests and return a normal idempotency conflict.
10. A fixture-only pause inserts a target between initial and final claim selections.
    The final guard must deny with `40001`; removing it in the negative model admits
    the target, then the transaction is rolled back.
11. Seeded owner/capability inconsistency while a request waits must deny after the wait.
12. Snapshot visibility, `REPEATABLE READ` serialization behavior, unrelated model
    workspace behavior and unchanged personal model values.

These are twelve **model groups**, not twelve certified production/R5 scenarios.
The negative deadlock executes the same abstract two-lock cycle, not private SQL.
The safe strategy acquires a request mutex before optional address, workspace and
child locks, then checks current authorization **before** returning an old receipt.
This does not promise deadlock freedom across arbitrary multi-operation transactions
or across any unmodeled application route, including workspace creation and real
authentication/bootstrap operations.

## Execution and evidence

The CI job uses PostgreSQL binaries already present in the standard Ubuntu runner.
If absent, it fails explicitly; there is no installation fallback. It creates a fresh
`ncc_synthetic` cluster in runner temporary storage, listens only on a private Unix
socket, and starts three independent `psql` sessions. No TCP or hosted service is used.
The cluster has no password or persistent credential and is stopped in cleanup.

Ordering is established by observing `pg_blocking_pids`, ungranted `pg_locks` and
`pg_stat_activity`, with deadlines. Poll delays are not the proof of ordering.
Expected errors are captured as SQLSTATE; a timeout is a failure, never a pass.
Snapshots include every model table. Negative controls and denied mutations roll
back; setup and unexpected SQL errors stop the test.

Only `artifacts/ncc-concurrency/result.json` is uploaded. It records the commit,
PostgreSQL version, model hash, connection PIDs, observed waits and group results.
Database directories, startup logs, table dumps and private inputs are not artifacts.
No application runtime, flags or assets are changed by this test.

Local preparation validated JavaScript/YAML syntax and SQL parsing plus sequential
model behavior in the existing PGlite dependency. The local check substitutes only
PGlite's database-name guard in memory. It is **not** a multisesion execution. The
actual PostgreSQL result must be read from CI for the final commit before claiming a
pass. Even a complete pass cannot authorize release or certify private R5 compatibility.
