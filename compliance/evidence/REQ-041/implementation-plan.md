# Implementation Plan — REQ-041

**Requirement:** REQ-041 — Harden `xlsx` dependency (close R-002)
**Risk Level:** MEDIUM (security-relevant dependency on the upload/parse path; changes the dependency source)
**GitHub Issue:** [#119](https://github.com/metasession-dev/wawagardenbar-app/issues/119)
**Date:** 2026-05-24

## Objective

Close the one accepted high advisory (R-002): `xlsx` (SheetJS) prototype
pollution (CVE-2023-30533) + ReDoS (CVE-2024-22363), reachable via the expense
import parser, so the dependency-audit gate can return to fully strict.

## Approach

1. **Pin `xlsx` to the patched SheetJS CDN build** — `0.20.3` (≥ 0.19.3 and
   ≥ 0.20.2, fixing both CVEs). SheetJS publishes patches only to its CDN, so
   `package.json` references the tarball
   (`https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz`); `package-lock.json`
   refreshed. Public API unchanged → no source changes.
2. **Return the audit gate to strict** — clear `xlsx` from `sdlc-config.json`
   `accepted_dep_risks` (→ `""`) and regenerate `ci.yml` via `devaudit update`.
3. **Close R-002** in `compliance/risk-register.md`; add the REQ-041 RTM row.

## Why CDN-pin over replacing `xlsx`

The CDN build is SheetJS's official patched distribution and is API-compatible,
so it's a one-line dependency change with no application rewrite — the minimal,
lowest-risk fix. Replacing `xlsx` with another library (e.g. `exceljs`) was
considered but would require rewriting both the export and import code for no
additional security benefit.

## Verification

- `npm audit --audit-level=high` → exit 0 (xlsx no longer flagged at any level).
- `npm run build` → success.
- Full Playwright e2e (export + import paths) → green in CI on the MongoDB-backed runner.

## Rollback

Dependency-only. Revert the commit (restores `package.json` + lockfile +
`accepted_dep_risks="xlsx"`) to return to the prior state. No data/schema change.

## Residual

7 moderate advisories (pre-existing transitive) remain, below the
`--audit-level=high` gate — untouched, no new accepted high/critical, so R-002
closes without a successor.
