# Test plan — REQ-103

Extracted from `compliance/plans/REQ-103/implementation-plan.md` §9 (Verification). Risk class: **HIGH** — unit + integration + e2e for every user-visible path + at least one negative/abuse test per `Test_Policy.md`.

| Test file (actual)                                             | Type | AC coverage    | Notes                                                                                                                                                  |
| -------------------------------------------------------------- | ---- | -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `__tests__/lib/auth-middleware.has-session-permission.test.ts` | Unit | AC1–AC6 (gate) | New `hasSessionPermission` helper: super-admin bypass, permission-true pass, permission-false/missing reject, no-session reject. 6 tests, all passing. |
| `__tests__/actions/admin/menu-actions.edit-all-row.test.ts`    | Unit | AC1, AC2, AC5  | Existing file, extended with 4 new cases (menuManagement-permitted admin non-price/price save, no-permission rejection, super-admin regression).       |
| `__tests__/actions/admin/price-management-actions.test.ts`     | Unit | AC4, AC5       | New file — 4 tests (unauthenticated, no-permission rejection, menuManagement-permitted save, super-admin regression).                                  |
| `__tests__/actions/admin/pricing-windows-action.test.ts`       | Unit | AC3, AC5, AC6  | New file — 5 tests, including the no-passthrough-of-arbitrary-fields assertion (AC6).                                                                  |
| `e2e/admin/menu-edit-all.spec.ts`                              | E2E  | AC1, AC2, AC5  | Existing file, extended: new `adminTest` describe (AC1/AC2, `.auth/admin.json`) + new top-level `csrTest` (AC5, `.auth/csr.json`).                     |
| `e2e/admin/pricing-windows.spec.ts`                            | E2E  | AC3, AC5       | Existing file, extended: new `adminTest` (AC3) + new top-level `csrTest` (AC5), same fixtures as above.                                                |

**Reconciliation (Phase 2 step 4b, devaudit-installer#241):** all predicted paths matched actual file locations — no drift. `price-management-actions.test.ts` and `pricing-windows-action.test.ts` were new files as predicted (no prior test file existed for either action). All 24 unit tests pass; full unit suite (1436 tests) shows no regressions.
