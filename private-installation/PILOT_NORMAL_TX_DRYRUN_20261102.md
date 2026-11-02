# Pilot normal cutover dry run — local, disposable, nonclinical
This is a separate QA challenge to the **exact** four-file operator bundle on PR43. It runs the same generated SQL against a verified local PG17 schema shaped from observed metadata, then replaces only terminal COMMIT with ROLLBACK. An intentional final-step exception independently checks rollback. The original six-migration health/guide-binding fixture is unchanged.

**Scope:** no storage, real user data, production SQL writes, hosted project, new paid service, clinical schema, or release flag activation. Successful dryrun is necessary but not sufficient for GO (backup and genuine pilot texts/source review remain pending).

QA branch opt-in via commit message `[pilot-tx-dryrun]`, using existing incremental-install-local job. PR43 SHA `ec66fbd7448142c32ae0443ee080c2d69f5d3b93` stays frozen. Compare output sanitized `pilot-normal-tx-dryrun.json`; do not declare success before checking the artifact and job result.