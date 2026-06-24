# Test Plan — REQ-083

**Requirement:** REQ-083
**Risk Level:** MEDIUM
**GitHub Issue:** #404
**Date:** 2026-06-21

## Tests to Add

- [x] `e2e/realtime/order-status-revert.spec.ts` — Socket-level: verify `order:updated` payload has top-level `status` field for orders + kitchen-display rooms
- [x] `e2e/realtime/order-status-revert-ui.spec.ts` — Browser-level: verify completed orders removed from kitchen grid (with evidenceShot); verify non-terminal status updates in-place

## Tests to Update

- [ ] `e2e/realtime/order-status-broadcast.spec.ts` — Add assertion for top-level `status` field in `order:updated` event payload (currently only checks `order-status-update` event)

## Tests to Remove

- None

## Functional Test Mapping

| Acceptance Criterion                            | Test File                                   | Test Name                                                                  |
| ----------------------------------------------- | ------------------------------------------- | -------------------------------------------------------------------------- |
| AC1 — completed order removed from kitchen grid | e2e/realtime/order-status-revert-ui.spec.ts | AC1 — completed order is removed from kitchen grid immediately (no revert) |
| AC2 — non-terminal status updates in-place      | e2e/realtime/order-status-revert-ui.spec.ts | AC2 — preparing status updates in-place on kitchen card (no revert)        |
| AC3 — socket payload has top-level status       | e2e/realtime/order-status-revert.spec.ts    | AC3: orders room receives order:updated with top-level status field        |
| AC4 — order queue socket subscription           | e2e/realtime/order-status-revert.spec.ts    | AC3 (orders room subscription covers queue)                                |
| AC5 — cancelled order removed from kitchen grid | e2e/realtime/order-status-revert.spec.ts    | AC5: kitchen-display room receives order:updated with cancelled status     |

## Non-Functional Tests (MEDIUM)

- [ ] Security: No new endpoints or auth changes — N/A
- [ ] Performance: Socket payload size unchanged (one additional field) — N/A
- [ ] Accessibility: No UI structure changes — N/A

## Test Data Requirements

- Existing E2E seed data sufficient (uses seeded admin user + test orders)
