# Test plan — REQ-088

## AC coverage mapping

| AC   | Test file                                              | Test type | Coverage                                                                                   |
| ---- | ------------------------------------------------------ | --------- | ------------------------------------------------------------------------------------------ |
| AC1  | `e2e/invariants/inventory-deduction-checkout.spec.ts`  | E2E       | Kitchen-display completion decrements inventory + creates stockmovement                    |
| AC2  | `e2e/invariants/points-award-completion.spec.ts`       | E2E       | Webhook payment confirmation creates PointsTransaction earned row                          |
| AC3  | `e2e/invariants/cancel-reversal.spec.ts`               | E2E       | Cancel of completed order restores inventory + creates adjusted PointsTransaction          |
| AC4  | `e2e/invariants/tab-close-multi-deduction.spec.ts`     | E2E       | Tab with multiple completed orders — each has inventoryDeducted + earned PointsTransaction |
| AC5  | `e2e/invariants/webhook-idempotency-invariant.spec.ts` | E2E       | Replay of same webhook event produces no duplicate side-effects                            |
| AC6  | `e2e/invariants/notification-log-invariant.spec.ts`    | E2E       | Notification send creates NotificationLog row                                              |
| AC7  | `e2e/invariants/reward-grant-invariant.spec.ts`        | E2E       | Manual reward grant creates Reward + PointsTransaction rows                                |
| AC8  | `e2e/invariants/silent-path-alarm-layer.spec.ts`       | E2E       | Cancel with side-effect failure writes IncidentEvent row                                   |
| AC9  | `__tests__/lib/scheduled-jobs.test.ts`                 | Unit      | Daily incident summary cron registers + fires                                              |
| AC10 | `@srs-deferred`                                        | —         | Already covered by REQ-066 reconciliation cron                                             |
| AC11 | `e2e/invariants/*.spec.ts` (all 8 files)               | E2E       | All invariant specs pass in CI regression tier                                             |

## Unit test files

| File                                                  | Tests | Covers                                                                 |
| ----------------------------------------------------- | ----- | ---------------------------------------------------------------------- |
| `__tests__/services/notification-log-service.test.ts` | 10    | NotificationLogService recordAttempt/updateStatus + IncidentEvent mock |
| `__tests__/lib/scheduled-jobs.test.ts`                | 11    | Scheduled jobs including daily incident summary cron                   |

## E2E helper files

| File                        | Purpose                                                                                                                                                |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `e2e/invariants/helpers.ts` | Shared helpers — MongoDB connection, stock computation, status polling, kitchen-display UI setup, button clicking, idempotency key generation, cleanup |
