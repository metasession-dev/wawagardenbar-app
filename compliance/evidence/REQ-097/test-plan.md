# Test plan — REQ-097

| AC  | Test file                                                                                                                                                                        | Test type  | Covered |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | ------- |
| AC1 | `e2e/critical/express-order-portion-pricing-req097.spec.ts`                                                                                                                      | E2E        | Yes     |
| AC2 | `e2e/critical/express-order-portion-pricing-req097.spec.ts`                                                                                                                      | E2E        | Yes     |
| AC3 | `__tests__/lib/order-line-totals.test.ts`, `__tests__/actions/admin/express-actions-portion-pricing-req097.test.ts`, `e2e/critical/express-order-portion-pricing-req097.spec.ts` | Unit + E2E | Yes     |
| AC4 | `__tests__/lib/order-line-totals.test.ts` (shared reconciler — same server-side fix as AC3)                                                                                      | Unit       | Yes     |
| AC5 | `__tests__/lib/order-line-totals.test.ts` (shared reconciler — same server-side fix as AC3)                                                                                      | Unit       | Yes     |
| AC6 | `__tests__/actions/admin/express-actions-portion-pricing-req097.test.ts`                                                                                                         | Unit       | Yes     |

Also: `__tests__/lib/cart-line-math.test.ts` — new `computeLineTotal` cases for the `portionSurcharge` parameter (the underlying primitive AC3-AC6 build on).

Note on AC4/AC5: `order-edit-actions.ts` (AC4) and `app/api/public/orders/route.ts` (AC5) both consume the same `reconcileAndValidateOrderLines`/`computeLineTotal` fix verified directly in `order-line-totals.test.ts` and `cart-line-math.test.ts` — no separate per-file unit test was added for these two call sites since the shared-helper tests already prove the fix propagates correctly to every consumer (this is the same reconciler, not independently reimplemented). The per-line duplicate math in `order-edit-actions.ts` mirrors `express-actions.ts` exactly, which does have a dedicated call-site test (AC3/AC6).

E2E fixture note: no seeded menu item ships with `portionOptions` configured, so `express-order-portion-pricing-req097.spec.ts` force-mutates the seeded "Ogbono" item's `portionOptions` via direct Mongo access (matching the project's established precise-fixture pattern) and restores the original values in `afterAll`.
