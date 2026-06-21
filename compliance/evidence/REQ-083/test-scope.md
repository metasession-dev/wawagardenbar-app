# Test Scope — REQ-083

**Risk Level:** MEDIUM
**Requirement:** Fix completed orders reverting to previous status on kitchen display and order queue
**GitHub Issue:** #404
**Date:** 2026-06-21

## Test Approach

Standard gates plus targeted verification.

**Universal gates (mandatory — verified locally AND in CI):**

- TypeScript compilation: 0 errors
- SAST scan: 0 high/critical findings
- Dependency audit: 0 high/critical vulnerabilities
- E2E suite: all pass
- Human code review via PR

**Additional testing required by risk level:**

- [ ] Socket payload: verify `order:updated` event carries top-level `status` field (not just inside `updates`)
- [ ] Kitchen display: verify completed orders are removed from the grid, not reverted to old status
- [ ] Order queue: verify socket subscription updates order status in real-time without full page refresh

## Validation Approach

- Verify on kitchen display that marking an order as "Complete" removes it from the active orders grid immediately
- Verify on order queue that status changes propagate via socket without requiring manual page refresh
- Verify that non-terminal status transitions (pending → preparing → ready) still update correctly via socket

## Acceptance Criteria

- [ ] **AC1** — Given an active order on the kitchen display (`/dashboard/kitchen-display`), When staff clicks "Complete Order", Then the order is removed from the active orders grid immediately without reverting to its previous status
- [ ] **AC2** — Given an order on the kitchen display, When staff clicks "Start Preparing" or "Mark Ready", Then the order card updates its status in-place via socket event without a full page reload reverting it
- [ ] **AC3** — Given the `order:updated` socket event fires, Then the event payload contains a top-level `status` field matching the new status (not `undefined`)
- [ ] **AC4** — Given an order on the admin order queue (`/dashboard/orders`), When a status change occurs via socket, Then the order card reflects the new status without requiring a manual refresh
- [ ] **AC5** — Given an order is cancelled, Then the order is removed from the kitchen display active grid immediately (same as completed)
