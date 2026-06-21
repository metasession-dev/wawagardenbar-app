# Test Plan — REQ-083

**Requirement:** REQ-083
**Risk Level:** MEDIUM
**GitHub Issue:** #404
**Date:** 2026-06-21

## Tests to Add

- [ ] `e2e/realtime/order-status-revert.spec.ts` — Verify completed orders don't revert on kitchen display; verify `order:updated` socket payload has top-level `status` field

## Tests to Update

- [ ] `e2e/realtime/order-status-broadcast.spec.ts` — Add assertion for top-level `status` field in `order:updated` event payload (currently only checks `order-status-update` event)

## Tests to Remove

- None

## Functional Test Mapping

| Acceptance Criterion                            | Test File                                | Test Name                                       |
| ----------------------------------------------- | ---------------------------------------- | ----------------------------------------------- |
| AC1 — completed order removed from kitchen grid | e2e/realtime/order-status-revert.spec.ts | completed order removed from kitchen display    |
| AC2 — non-terminal status updates in-place      | e2e/realtime/order-status-revert.spec.ts | preparing status updates without revert         |
| AC3 — socket payload has top-level status       | e2e/realtime/order-status-revert.spec.ts | order-updated payload contains top-level status |
| AC4 — order queue socket subscription           | e2e/realtime/order-status-revert.spec.ts | order queue receives socket status update       |
| AC5 — cancelled order removed from kitchen grid | e2e/realtime/order-status-revert.spec.ts | cancelled order removed from kitchen display    |

## Non-Functional Tests (MEDIUM)

- [ ] Security: No new endpoints or auth changes — N/A
- [ ] Performance: Socket payload size unchanged (one additional field) — N/A
- [ ] Accessibility: No UI structure changes — N/A

## Test Data Requirements

- Existing E2E seed data sufficient (uses seeded admin user + test orders)
