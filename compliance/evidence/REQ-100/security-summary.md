# Security Evidence Summary — REQ-100

**Date:** 2026-08-27

| Control                                       | Result | Evidence                                                                                                                                                                                                                                                                            |
| --------------------------------------------- | ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| SAST                                          | PASS   | `npx tsc --noEmit` — 0 errors; `npx eslint services/financial-report-service.ts __tests__/services/financial-report-service.main-category.test.ts` — 0 errors; CI Quality Gates on PR #678 also ran semgrep, passed                                                                 |
| Dependency audit                              | PASS   | No new dependencies introduced by this REQ; `npm audit --audit-level=high` shows only pre-existing accepted exceptions (`compliance/security/accepted-vulnerabilities.json`, renewed 2026-08-26 to 2026-09-25)                                                                      |
| RBAC — no change to authorization surface     | PASS   | `generateMainCategoryReport()` is a read-only reporting function; this REQ changes only its internal aggregation arithmetic, not the caller's existing admin/staff `mainCategoryReportAccess` permission gate (`lib/permissions.ts:getAllowedMainCategoriesForReports`, unmodified) |
| Query construction — no injection surface     | PASS   | No query shape changed — the fix is purely in-memory `Map` accumulation logic over already-fetched order documents; no new user-controlled input reaches any database query                                                                                                         |
| No new secrets, credentials, or external deps | PASS   | None — single-file arithmetic fix                                                                                                                                                                                                                                                   |

## Data handling

No new personal-data field, category, or purpose is introduced (see implementation plan §5). The fields involved (`price`, `quantity`, `subtotal`, `costPerUnit`) are order/menu financial figures, not personal data. No data subject-identifying field is read, stored, or transmitted differently by this REQ.

## Post-deploy controls

- No migration required — no schema change, no new field written or read that wasn't already read before.
- Reversible via `git revert` — no data-write path is touched by this REQ, so rollback has no data implications.
- No new secrets, credentials, or external dependencies.
