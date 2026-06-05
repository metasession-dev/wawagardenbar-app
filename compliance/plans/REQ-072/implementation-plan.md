# REQ-072 — Implementation plan

**Requirement ID:** REQ-072
**Risk:** LOW (pure test addition — no production code change in this PR)
**Related issue:** [#295](https://github.com/metasession-dev/wawagardenbar-app/issues/295) (sub-issue of umbrella [#291](https://github.com/metasession-dev/wawagardenbar-app/issues/291))
**Date:** 2026-06-05

## Context

Sub-issue #295 of umbrella tracker #291 (SRS → E2E regression-pack coverage closure). Real-time Socket.IO broadcasts have **zero E2E coverage** today — a broken socket means stale displays, invisible at the database / API layer, visible only as "the kitchen display didn't refresh."

SRS items in scope:

| SRS ID     | Behavior                                                                                                                               |
| ---------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| REQ-RT-001 | Client joined to `order-${orderId}` room receives `order-status-update` event when server-side status changes                          |
| REQ-RT-002 | Subscriber on `kitchen-display` room receives `kitchen:new-order` event when a new order is created (typically after payment confirms) |

## Acceptance criteria

- **AC1** — A Node-level `socket.io-client` connected to UAT, having joined the `order-${orderId}` room (via `socket.emit('join-order', orderId)`), receives an `order-status-update` event with the new status within 5 seconds of the server-side emission.
- **AC2** — Asserted payload shape: `{ orderId: string, status: string, timestamp: string, ... }` (matches `lib/socket-server.ts:108` `emitOrderStatusUpdate`).
- **AC3** — A separate non-subscribed client connected to a different order's room does **not** receive the event (room isolation).

## Technical approach

### Helper — `e2e/helpers/socket-listener.ts`

Thin wrapper around `socket.io-client`:

- `connectClient(url): Promise<Socket>` — connect with the same options the production client uses (path `/api/socket`, websocket + polling transports), wait for the `connect` event before returning.
- `subscribeToOrder(socket, orderId): Promise<void>` — emit `join-order` with the orderId, await ack-equivalent (next tick).
- `waitForEvent(socket, eventName, timeoutMs): Promise<any>` — register a one-shot listener; reject after `timeoutMs` with a clear message.
- `disconnectAll(sockets)` — clean teardown so the spec leaves zero open connections.

### Trigger — internal-emit endpoint

UAT's `/api/internal/socket/emit` endpoint (gated by `INTERNAL_API_SECRET`) already supports an `order-status-update` case that calls `emitOrderStatusUpdate` server-side. The spec POSTs to this endpoint with the secret to fire the broadcast deterministically. This bypasses business-action complexity (no admin auth, no real order needed) and pins the transport contract directly.

Secret source: `process.env.INTERNAL_API_SECRET` — operator sets the UAT value in their local `.env.local`. If unset / placeholder, the spec `test.skip()`s with a clear message naming the missing var.

### Spec — `e2e/realtime/order-status-broadcast.spec.ts`

```
test.beforeAll: read INTERNAL_API_SECRET; skip if missing.
test.afterAll: disconnect all sockets.

AC1 + AC2: clientA joins room order-{orderId1}.
           POST /api/internal/socket/emit { event: 'order-status-update', data: { orderId: orderId1, status: 'in-progress', note: 'e2e' } }.
           waitForEvent(clientA, 'order-status-update', 5000) resolves with { orderId: orderId1, status: 'in-progress', ... }.

AC3 — room isolation: clientB joins room order-{orderId2} (different id).
       POST internal-emit for orderId1.
       waitForEvent(clientB, 'order-status-update', 1500) rejects (timeout).
```

`orderId1` + `orderId2` are synthetic strings (e.g. `e2e-req072-${Date.now()}-a`) — no real Order document is required because `emitOrderStatusUpdate` broadcasts based on the supplied id without DB lookup.

Configured `describe.configure({ mode: 'serial' })` to keep the small UAT socket load deterministic.

## Out of scope (deferred to follow-up cycles within #295)

| Item                                                                                                 | Why deferred                                                                                                                                                                                                                                                                                                                     |
| ---------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| REQ-RT-002 — `kitchen:new-order` broadcast pin                                                       | UAT's internal-emit endpoint has no `new-order` case (`emitNewOrder` is only called from server actions). Requires either a small production-code addition (extra switch case in `app/api/internal/socket/emit/route.ts`) or a full payment-webhook-triggered E2E. Both are valid V2 paths; chose pure-test V1 to keep risk LOW. |
| Browser-context full-chain (admin dashboard page → kitchen-display page → DOM updates)               | Heavier multi-context Playwright pattern. V1 pins the transport; V2 can add UI-level integration.                                                                                                                                                                                                                                |
| `order:created`, `order:updated`, `order:cancelled` broadcasts on `orders` + `kitchen-display` rooms | Similar contract; once the listener helper exists they are short additions.                                                                                                                                                                                                                                                      |

## Security considerations

- The spec reads `INTERNAL_API_SECRET` from the local environment and sends it in the `x-internal-auth` header. Same exposure surface as any local-dev usage of the same secret. Never logged, never persisted.
- The UAT internal endpoint is gated by the same secret — the spec is exercising the production gate, not bypassing it.
- Synthetic `orderId` strings mean no real customer data is touched. Read-only against UAT.
- No new production code shipped. STRIDE pass: no new attack surface.

## Dependencies

- `socket.io-client` (already in `package.json` — used by `lib/socket-client.ts`).
- `@playwright/test` (already in regression project).
- `INTERNAL_API_SECRET` — operator-set in local env (UAT value). `playwright.config.ts` already loads `.env.local` via `dotenv`.

## Test scope

See `compliance/evidence/REQ-072/test-scope.md` for the full breakdown.

## Quality gates

| Gate                       | Expected                                       |
| -------------------------- | ---------------------------------------------- |
| `npx tsc --noEmit`         | exit 0                                         |
| `npx vitest run` (full)    | 0 failures (unchanged — zero unit tests added) |
| Focused E2E (UAT)          | 0 failures                                     |
| Full regression pack (UAT) | green                                          |

## Stage plan

- [x] Stage 1 — Plan (this doc)
- [ ] Stage 2 — Implement helper + spec; live-pass against UAT
- [ ] Stage 3 — Compile evidence (6-doc pack + release ticket)
- [ ] Stage 4 — Submit for UAT review (PR open)
- [ ] Stage 5 — Merge + close-out
