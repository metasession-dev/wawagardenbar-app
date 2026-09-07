# Security Evidence Summary — REQ-102

**Date:** 2026-09-04

| Control                                       | Result | Evidence                                                                                                                                                                                                                                     |
| --------------------------------------------- | ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| SAST                                          | PASS   | `npx tsc --noEmit` — 0 errors; `npm run lint` — 0 errors; `semgrep scan --config auto app/ lib/ --severity ERROR --severity WARNING` — 202 rules, 269 files, 0 findings                                                                      |
| Dependency audit                              | PASS   | No new dependencies introduced by this REQ (`git diff develop --stat -- package.json package-lock.json` is empty); the 13 pre-existing advisories in the tree are unrelated to this REQ's diff                                               |
| RBAC — reused, not weakened                   | PASS   | The new bulk "Edit All" price-write path (`updateMenuItemRowAction`) reuses the exact same `super-admin`-only gate as the existing single-item `updateMenuItemPriceAction` (see R-026) — no new, weaker authorization surface introduced     |
| Audit trail — no bypass                       | PASS   | Every price change, bulk or single-item, writes a `MenuItemPriceHistory` snapshot row via the same `PriceHistoryService.updatePrice()` call path (see R-026 mitigation) — a full menu-wide bulk edit is fully reconstructable after the fact |
| Query construction — no injection surface     | PASS   | No new user-controlled string reaches a database query differently; all new price/window fields are numeric or enum-constrained booleans/strings validated server-side before use                                                            |
| No new secrets, credentials, or external deps | PASS   | None — schema/service/UI changes only                                                                                                                                                                                                        |

## Data handling

No new personal-data field, category, or purpose is introduced (see implementation plan §6). The new fields (`showPrice`, `happyHourPrice`, `showPriceWindow`, `happyHourWindow`) are pricing and scheduling configuration, not personal data. No data-subject-identifying field is read, stored, or transmitted differently by this REQ.

## Financial-calculation correctness (HIGH risk driver)

This REQ's HIGH risk classification is driven by "core revenue capability" (per `Test_Policy.md` §Risk-Based Testing), not a security-surface signal — the risk is that a bug in the time-window precedence logic charges the wrong price at the point of sale. Mitigating controls, all verified in this cycle:

- Precedence centralized in one function, `SettingsService.resolveActivePriceField()` (ADR-004) — unit-tested against all four window-state combinations (`__tests__/services/settings-service.price-windows.test.ts`).
- Order-line reconciliation tested against happy-hour-wins-over-show, show-only, neither-active, and override-always-wins scenarios (`__tests__/lib/order-line-totals.price-windows.test.ts`).
- End-to-end proof that the public menu display and the actual charged price agree (`e2e/customer/menu-price-window-display.spec.ts`).

## Post-deploy controls

- Migration required: `scripts/migrate-show-happy-hour-prices.ts` backfills `showPrice`/`happyHourPrice` on existing `MenuItem` documents before the schema-required constraint is relied upon by any read path (R-025). Must run against dev/UAT/prod before or immediately after this REQ's code ships to each environment.
- Reversible via `git revert` of the code changes — the migration-backfilled fields remain in the database after a code rollback (harmless, unused by reverted code); no destructive migration is needed to roll back (see implementation plan §8).
- No new secrets, credentials, or external dependencies.
