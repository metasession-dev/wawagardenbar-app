# Implementation Plan — REQ-083

**Requirement:** REQ-083
**GitHub Issue:** #404
**Risk Level:** MEDIUM
**Date:** 2026-06-21

## Approach

Fix two compounding bugs that cause completed orders to revert to their previous status on the kitchen display and order queue:

1. **Socket payload bug:** `emitOrderUpdatedEvent` in `socket-emit-helper.ts` puts `status` inside `updates` but never at the top level, so the socket broadcast carries `status: undefined`.
2. **Router refresh race:** `kitchen-order-grid.tsx` calls `updateOrder(orderId, { status: undefined })` corrupting the zustand store, then `router.refresh()` races MongoDB — if the read happens before the write is visible, the order reverts to its old status.

Fix 1 propagates `status` to the top level of the socket payload. Fix 2 handles terminal statuses (`completed`/`cancelled`) by removing the order from the store directly instead of calling `router.refresh()`.

## Files to Modify

- `lib/socket-emit-helper.ts` — Add top-level `status` field to `emitOrderUpdatedEvent` payload so consumers don't need to dig into `updates.status`
- `components/features/kitchen/kitchen-order-grid.tsx` — Handle terminal statuses by removing order from store instead of `updateOrder` + `router.refresh()`; use `data.updates?.status` as fallback for non-terminal updates
- `components/features/admin/order-queue.tsx` — Add socket subscription via `subscribeToOrders` so the admin orders page gets real-time updates (currently only refreshes via `router.refresh()` from `OrderCard`)

## Architecture Decisions

- No ADR needed — bug fix reusing existing socket infrastructure, no new dependencies, no schema changes

## Dependencies

- None

## Risks / Considerations

- @risk-deferred — minimal change to socket payload format; existing consumers that read `data.updates.status` continue to work; new top-level `status` is additive

## Post-Deploy Actions

- None — no data migration needed; the DB was always correct, only the UI was affected
