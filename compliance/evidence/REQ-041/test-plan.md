# Test Plan — REQ-041

**Requirement:** REQ-041 — Harden `xlsx` dependency (close R-002)
**Risk Level:** MEDIUM
**GitHub Issue:** [#119](https://github.com/metasession-dev/wawagardenbar-app/issues/119)
**Date:** 2026-05-24

## Tests to Add / Update / Remove

None — dependency-only change. The existing Playwright e2e suite is the
regression coverage; the `xlsx` API is unchanged across the upgrade.

## Regression coverage

| Concern | How it's covered |
| --- | --- |
| Report export (write path) still produces a valid spreadsheet | Existing Playwright e2e exercising the reports export, run in CI |
| Expense import (read/parse path, the patched surface) still parses | Existing Playwright e2e exercising the expense import flow, run in CI |
| No framework/API breakage from the `xlsx` swap | `npm run build` gate |
| The high CVEs are gone | `npm audit --audit-level=high` gate (now strict — see security-summary.md) |

(The affected modules are `lib/report-export.ts` and `app/actions/expenses/csv-import-actions.ts`; the public `xlsx` API used by both is identical between 0.18.5 and 0.20.3.)

## Entry / Exit Criteria

- **Entry:** R-002 open; `xlsx@^0.18.5` flagged high by `npm audit`.
- **Exit:** `npm audit --audit-level=high` exits 0; build + full e2e green in CI on the upgraded dependency; `xlsx` removed from `accepted_dep_risks`; R-002 closed.

## CI

Full Playwright suite + the (now strict) dependency-audit gate run in
`.github/workflows/ci.yml` on the develop push, against the MongoDB service —
identical setup to the onboarding CI.
