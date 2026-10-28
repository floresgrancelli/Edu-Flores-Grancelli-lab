# EFG Nutrition Pro — security audit checkpoint (2026-10-28)

## Scope and evidence
Production app: https://efg-nutrition.onrender.com/pilot/. GitHub production branch `efg-nutrition-app`; Supabase project `cyjvddhimbsfipjfctsl`. No secret keys or account identifiers should be copied into this public repository.

**Status labels:** verified live; verified with read-only SQL impersonation; verified static; outstanding. This checkpoint is **not** a penetration-test certificate.

### Verified using read-only transactions (28 October)
- `authenticated` student A, impersonated by `request.jwt.claim.sub`, sees own diary (3 rows) but zero diary/goal/weight/payment rows belonging to a distinct student B.
- Authenticated student B sees own diary (2 rows), but zero tested rows belonging to student A.
- The administrative test-coach identity can access the consented students of its test organization as intended.
- A nonexistent authenticated identity sees no nutrition/payments rows in the tested queries.
- Anonymous SELECT of daily logs is refused at table privilege level.
- Important limitation: the project had one test organization, one admin/test coach and three students. A genuine Coach A vs Coach B test requires a segregated staging fixture with two organizations, not production users.

### Fixed in production database
- Migration in Supabase: `20261028113459_harden_efg_authenticated_privileges_20261028`.
- Removed `TRUNCATE`, `TRIGGER` and `REFERENCES` privileges from `authenticated` on 15 EFG tables. Verified with `has_table_privilege` that **zero** of the 17 public EFG tables still grant these three privileges to `authenticated`.
- Preserved table DML/RLS policies, identities, plans and payments. Application deployment unchanged.

### Existing safeguards observed
- RLS enabled on all 17 EFG public tables.
- Diary read: self or `efg_private.coach_has_student`, which checks coach identity, organization status, active student and consent acceptance.
- Nutrition goals: student/authorized coach SELECT; insert restricted to the authorized coach and correct approver.
- Payments: read only by payer/recipient; approval RPC restricts reviewer to recipient and pending status.
- Receipt bucket is private, size limit 5 MiB; ownership enforced on upload and sender/recipient permissions on read.
- Public client uses Supabase publishable key (which is intended to be public), not a service-role key.

### Outstanding security work, ordered
1. **Critical: GitHub production branch unprotected.** GitHub branch metadata `protected=false`; no rulesets returned. Require pull request, PR checks and disallow force-push/deletion. Branch rules must be enabled via repository Settings; the connector does not expose a branch-protection write action.
2. **High: cross-coach and revoked-consent adversarial E2E.** Create isolated staging credentials for Coach A, Coach B, Student A/B; validate read, write, and signed receipt access across organizations and revoked consent. Never use real users for adversarial fixtures.
3. **High: audit 14 authenticated-callable SECURITY DEFINER RPCs** function by function. They use pinned `search_path` and inspected examples check role/owner; remaining negative-call tests are required before narrowing EXECUTE rights.
4. **High: owner-account MFA and session review** across GitHub, Render, Supabase and primary email. Check OTP rate limits, abuse protection, and login event logs. Supabase currently warns that leaked-password protection is disabled; verify if password login is actually enabled.
5. **High: verified backups and restore drills**, recovery point/restore time targets and data retention. Do not mistake hosting uptime for a tested backup.
6. **Medium: upload abuse, stale signed URLs and orphaned receipt cleanup.** Preserve 5 MiB cap and enforce content/MIME checks.
7. **Medium: dependency/header review and alerts** for login anomalies, failed RPC calls and deployment failures.

### Testing/CI
Security static guardrail and full existing visual/unit tests run on pull requests targeting `efg-nutrition-app`. **This alone does not block merges** until GitHub branch protection/rules require these checks.

References:
- https://supabase.com/docs/guides/database/postgres/row-level-security
- https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable
- https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches
