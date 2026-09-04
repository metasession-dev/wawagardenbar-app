# Security Evidence Summary — REQ-101

**Date:** 2026-09-04

| Control                                       | Result | Evidence                                                                                                                                                                                                                                     |
| --------------------------------------------- | ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| SAST                                          | PASS   | `npx tsc --noEmit` — 0 errors; `npx eslint services/financial-report-service.ts __tests__/services/financial-report-service.*.test.ts` — 0 errors; CI Quality Gates on the integration PR also runs semgrep                                  |
| Dependency audit                              | PASS   | No new dependencies introduced by this REQ; branch inherits the clean dependency-audit state from `develop` (PR #690 resolved newly-disclosed `fast-uri`/`browserslist` advisories + a CI npm-version bug)                                   |
| RBAC — no change to authorization surface     | PASS   | `aggregateItemsIntoCategories()` / `generateMainCategoryReport()` are read-only reporting helpers; this REQ changes only the internal aggregation-map key and display-name derivation, not any caller's existing admin/staff permission gate |
| Query construction — no injection surface     | PASS   | No query shape changed — the fix is purely in-memory `Map` accumulation logic over already-fetched order documents; no new user-controlled input reaches any database query                                                                  |
| No new secrets, credentials, or external deps | PASS   | None — single-file aggregation-key fix                                                                                                                                                                                                       |

## Data handling

No new personal-data field, category, or purpose is introduced (see implementation plan §6). The fields involved (`price`, `quantity`, `subtotal`, `costPerUnit`, `portionSize`) are order/menu financial and product-configuration figures, not personal data. No data subject-identifying field is read, stored, or transmitted differently by this REQ.

## Post-deploy controls

- No migration required — no schema change, no new field written or read that wasn't already read before (`portionSize` already exists on `orderItemSchema`).
- Reversible via `git revert` — no data-write path is touched by this REQ, so rollback has no data implications.
- No new secrets, credentials, or external dependencies.
