/\*\*

- @requirement REQ-088 — Invariant test class + silent-path alarm layer
-
- Test scope: verifies that load-bearing side-effects (inventory deduction,
- points award, webhook idempotency, notification delivery, reward grant)
- are persisted correctly and that silent failures are recorded as
- IncidentEvent rows instead of swallowed by console.error.
-
- Test tiers:
- - Unit (vitest): IncidentEventService new kinds, daily summary cron,
-     catch-site refactoring assertions
- - E2E (Playwright): 7 invariant specs under e2e/invariants/
-
- Acceptance criteria coverage:
- AC1 — order-inventory-invariant.spec.ts
- AC2 — order-points-invariant.spec.ts
- AC3 — order-cancel-reversal-invariant.spec.ts
- AC4 — tab-close-multi-deduction-invariant.spec.ts
- AC5 — webhook-idempotency-invariant.spec.ts
- AC6 — notification-log-invariant.spec.ts
- AC7 — reward-grant-invariant.spec.ts
- AC8 — unit tests for catch-site refactoring (IncidentEventService.recordIncident called)
- AC9 — unit tests for runDailyIncidentSummaryJob
- AC10 — already covered by REQ-066 reconciliation cron specs
- AC11 — all 7 invariant specs pass in CI regression tier
  \*/

## Unit test scope

### New tests

1. `__tests__/services/incident-event-service.test.ts` — extend with:
   - `recordIncident` accepts new kinds: `points_award_failed`, `notification_delivery_failed`, `reward_grant_failed`, `webhook_replay_mismatch`
   - `dedupRecent` works with new kinds
   - `getUnresolvedSummary` returns count + grouped breakdown by kind
   - `getUnresolvedSummary` returns empty when no unresolved incidents

2. `__tests__/lib/scheduled-jobs.incident-summary.test.ts` — new file:
   - `runDailyIncidentSummaryJob` calls `getUnresolvedSummary`
   - Sends WhatsApp/email via NotificationService when unresolved count > 0
   - No-op when unresolved count === 0
   - Error in send path does not crash the job

3. `__tests__/services/order-service.alarm-layer.test.ts` — new file:
   - `cancelOrder` inventory restoration failure → IncidentEvent written with kind `inventory_deduction_failed`
   - `cancelOrder` points reversal failure → IncidentEvent written with kind `points_award_failed`
   - `completeOrder` reward calculation failure → IncidentEvent written with kind `reward_grant_failed`

### Updated tests

4. `__tests__/services/order-service.cancel-reversal.test.ts` — update:
   - Replace `console.error` spy assertions with `IncidentEventService.recordIncident` mock assertions
   - Test "does not abort the cancel when reversal throws" now asserts IncidentEvent is written

## E2E test scope

### New specs under `e2e/invariants/`

Each spec follows the pattern: DB seed → action (UI or API) → DB read-back → delta assertion.

1. `order-inventory-invariant.spec.ts` (AC1)
   - Seed: trackInventory menu item with known stock
   - Action: customer checkout via UI (or API for admin express path)
   - Assert: inventory decremented by ordered qty, stockmovement row exists

2. `order-points-invariant.spec.ts` (AC2)
   - Seed: user with known points balance + completed order with userId
   - Action: complete order via kitchen-display
   - Assert: PointsTransaction row with type='earned' exists for orderId

3. `order-cancel-reversal-invariant.spec.ts` (AC3)
   - Seed: completed + inventoryDeducted order with userId
   - Action: cancel order via API
   - Assert: inventory restored, PointsTransaction with type='adjusted' exists

4. `tab-close-multi-deduction-invariant.spec.ts` (AC4)
   - Seed: tab with N paid orders, each with trackInventory items
   - Action: close tab (markTabPaid)
   - Assert: each order has inventoryDeducted=true, each has PointsTransaction earned row

5. `webhook-idempotency-invariant.spec.ts` (AC5)
   - Seed: order with paymentReference, processed webhook event
   - Action: replay same webhook event
   - Assert: no duplicate stockmovement, no duplicate PointsTransaction, response 200

6. `notification-log-invariant.spec.ts` (AC6)
   - Seed: user with phone + email
   - Action: trigger notification send (e.g. order confirmation)
   - Assert: NotificationLog row exists with success=true or false+failureReason

7. `reward-grant-invariant.spec.ts` (AC7)
   - Seed: user + admin session
   - Action: admin grants manual reward via dashboard
   - Assert: Reward row exists + PointsTransaction row exists for user

### E2E test tags

All invariant specs tagged with `@invariant` + `@regression` for CI routing.

## Gate criteria

- `npx tsc --noEmit` — 0 errors
- `npx vitest run` — all unit tests pass (existing + new)
- `npx playwright test e2e/invariants/` — all 7 invariant specs pass
- `semgrep scan --config auto app/ lib/ services/ models/` — 0 new findings above baseline
- `npm audit --audit-level=high` — 0 unaccepted vulnerabilities
