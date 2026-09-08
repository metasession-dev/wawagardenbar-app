# Security Evidence Summary — REQ-103

**Date:** 2026-09-08

| Control                                       | Result                            | Evidence                                                                                                                                                                                                                                                                                  |
| --------------------------------------------- | --------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| SAST (type/lint)                              | PASS                              | `npx tsc --noEmit` — 0 errors; `npm run lint` — 0 errors on changed files                                                                                                                                                                                                                 |
| SAST (semgrep)                                | Not run locally                   | `semgrep` is not installed in this local dev environment (CI-provisioned via a Python venv in `ci.yml`); relies on CI's Quality Gates on the integration PR for this scan                                                                                                                 |
| Dependency audit                              | PASS (pre-existing findings only) | No new dependencies introduced by this REQ (`git diff develop --stat -- package.json package-lock.json` is empty); the 13 pre-existing advisories in the tree (eslint-plugin-react/glob/minimatch, dompurify via jspdf, fflate, postcss-selector-parser) are unrelated to this REQ's diff |
| RBAC — corrected, not weakened                | PASS                              | All three save actions now check `hasSessionPermission(session, 'menuManagement')` — a single shared helper, unit-tested directly (6 tests) and reused verbatim across all three call sites, replacing three independent inline role checks                                               |
| RBAC — negative case (over-widening guard)    | PASS                              | AC5: an admin session without `menuManagement` is rejected on all three save paths, proven at both the unit level (action-gate) and the e2e level (page-level `routePermissions` gate, unchanged and re-verified)                                                                         |
| New action's field surface — no passthrough   | PASS                              | AC6: `updatePricingWindowsAction`'s typed parameter list (`{ showPriceWindow, happyHourWindow }`) means no other `Settings` field can reach `SettingsService.updateSettings` through this path; asserted directly by a unit test                                                          |
| Audit trail — no bypass                       | PASS                              | Price-history-writing behaviour (`PriceHistoryService.updatePrice`) is unchanged by this REQ — only the authorization gate ahead of it moved from role-based to permission-based                                                                                                          |
| Query construction — no injection surface     | PASS                              | No new user-controlled string reaches a database query; the new action's inputs are structurally typed (booleans + time strings), not raw passthrough                                                                                                                                     |
| No new secrets, credentials, or external deps | PASS                              | None — permission-check + one new server action only                                                                                                                                                                                                                                      |

## Data handling

No new personal-data field, category, or purpose is introduced. This REQ changes an authorization check on existing menu/pricing save actions; no new personal-data field is read, written, or exposed.

## Authorization-gate correctness (HIGH risk driver)

This REQ's HIGH risk classification is driven by the authorization/RBAC surface + pricing (revenue-adjacent) touch points, per `Test_Policy.md` §Risk-Based Testing — the risk is that a fix intended to _grant_ the correct access instead over-widens or under-widens it. Mitigating controls, all verified in this cycle:

- Single shared `hasSessionPermission()` gate reused across all three call sites — one place to get right, one place to unit-test directly (`__tests__/lib/auth-middleware.has-session-permission.test.ts`).
- Explicit positive AND negative acceptance criteria (AC1–AC4 positive, AC5 negative) — both proven by tests, not assumed.
- `app/api/settings/route.ts` PUT deliberately left untouched (still `super-admin`-only) — removes an entire class of over-widening risk from this REQ's scope by not loosening the generic settings endpoint wholesale (the issue's own proposed resolution explicitly rejected that approach).
- Risk register entries R-028 (new) and R-026 (updated) document the actor-pool change and its residual rating.

## Post-deploy controls

- No migration required — no new persisted fields; `showPriceWindow`/`happyHourWindow` already exist in the `Settings` schema.
- Reversible via `git revert` of the code changes — no data implications (see implementation plan §8).
- No new secrets, credentials, or external dependencies.
