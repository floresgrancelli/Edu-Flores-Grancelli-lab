# P2 fail-closed QA correction · 02/11/2026
The isolated incremental-install run 41470437101 failed because the legacy test expected the USDA roasted-breast source FDC171477 to normalize under the **generic cooked chicken** ID. The import guard intentionally rejects that mapping. This is a stale synthetic test assumption, not an authorization to loosen food matching.

This revision keeps `chicken` blocked, adds a composition-only source identity `chicken_breast_roasted` **without adding it to the PWA food catalog**, and updates the isolated nine-source test to use that precise identity. All outputs remain publishable:false. No hosted SQL, user files, data, clinical flags, or production changes.

Run the existing disposable `incremental-install-local` workflow again, with the same strict source-lock package and local GoTrue/PG17 environment. Verify a PASS before drawing any conclusions. This note is not a test result.

PR43 release candidate stays frozen at 66be67df1bca5226e99999872ff6e88c747801fe. The corrected source QA branch does NOT update that release candidate automatically.