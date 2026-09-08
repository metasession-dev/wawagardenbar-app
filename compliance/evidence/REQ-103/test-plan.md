# Test plan — REQ-103

Extracted from `compliance/plans/REQ-103/implementation-plan.md` §9 (Verification). Risk class: **HIGH** — unit + integration + e2e for every user-visible path + at least one negative/abuse test per `Test_Policy.md`.

| Test file (predicted)                                          | Type | AC coverage    | Notes                                                                                                                            |
| -------------------------------------------------------------- | ---- | -------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `__tests__/lib/auth-middleware.has-session-permission.test.ts` | Unit | AC1–AC6 (gate) | New `hasSessionPermission` helper: super-admin bypass, permission-true pass, permission-false/missing reject, no-session reject. |
| `__tests__/actions/admin/menu-actions.edit-all-row.test.ts`    | Unit | AC1, AC2, AC5  | Existing file — extend with menuManagement-permitted-admin and no-permission-admin cases.                                        |
| `__tests__/actions/admin/price-management-actions.test.ts`     | Unit | AC4, AC5       | New file (or extend if one already covers this action) — same coverage as menu-actions for the single-item form.                 |
| `__tests__/actions/admin/pricing-windows-action.test.ts`       | Unit | AC3, AC5, AC6  | New file — covers the new `updatePricingWindowsAction`, including the no-passthrough-of-arbitrary-fields assertion (AC6).        |
| `e2e/admin/menu-edit-all.spec.ts`                              | E2E  | AC1, AC2, AC5  | Existing file — extend with a `menuManagement`-only admin fixture case + a negative case for an admin lacking the permission.    |
| `e2e/admin/pricing-windows.spec.ts`                            | E2E  | AC3, AC5       | Existing file — extend with the same fixture cases.                                                                              |

**Reconciliation note:** file paths above are predictions from Stage 1 planning. Per `sdlc-implementer` Phase 2 step 4b, this file will be reconciled against actual file paths after tests are written (tests may land in existing files rather than new ones).
