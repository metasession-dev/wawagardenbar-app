# REQ-072 — Test plan

**Requirement ID:** REQ-072
**Risk:** LOW (pure test addition; no production code change)
**Related issue:** [#295](https://github.com/metasession-dev/wawagardenbar-app/issues/295) (sub-issue of umbrella [#291](https://github.com/metasession-dev/wawagardenbar-app/issues/291))
**Date:** 2026-06-05

## Acceptance criteria → tests

| AC  | Statement                                                                                                                                                                | Test                                                   |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------ |
| AC1 | A Node-level `socket.io-client` joined to `order-${orderId}` room receives an `order-status-update` event with the new status payload within 5s of server-side emission. | `e2e/realtime/order-status-broadcast.spec.ts` — test 1 |
| AC2 | Asserted payload shape: `{ orderId, status, timestamp, estimatedWaitTime?, note? }` per `lib/socket-server.ts:108` `emitOrderStatusUpdate`.                              | same spec — tests 1 + 3                                |
| AC3 | Room isolation — client joined to a DIFFERENT `order-*` room does NOT receive the event (verified via 1.5s no-arrival window).                                           | same spec — test 2                                     |

## Event + room contract under test

| Event name            | Room               | Payload shape                                                                                             |
| --------------------- | ------------------ | --------------------------------------------------------------------------------------------------------- |
| `order-status-update` | `order-${orderId}` | `{ orderId: string, status: string, estimatedWaitTime?: number, note?: string, timestamp: string (ISO) }` |

## Test environment

E2E only. Playwright via the existing `regression` project (depends on `auth-setup`). Spec uses no browser pages — Node-level `socket.io-client` only:

- New helper `e2e/helpers/socket-listener.ts` — `connectClient(url, timeoutMs)`, `joinOrderRoom(socket, orderId)`, `waitForEvent(socket, eventName, timeoutMs)`, `disconnectAll(sockets)`, `triggerInternalEmit(baseUrl, secret, event, data)`.
- Trigger: UAT's `/api/internal/socket/emit` endpoint, secret-gated by `INTERNAL_API_SECRET`. The endpoint's existing `order-status-update` case calls `emitOrderStatusUpdate` server-side.
- Synthetic `orderId` strings (e.g. `e2e-req072-${Date.now()}-a`) — `emitOrderStatusUpdate` broadcasts based on the supplied id without DB lookup, so no real Order document is required.
- Configured `describe.configure({ mode: 'serial' })` to keep socket connection ordering deterministic.

## Quality gates

| Gate                           | Expected   | Actual (2026-06-05)                               |
| ------------------------------ | ---------- | ------------------------------------------------- |
| `npx tsc --noEmit`             | exit 0     | exit 0                                            |
| `npx vitest run` (full)        | 0 failures | 1129 pass / 4 skip / 0 fail (unchanged)           |
| Focused E2E REQ-072 (UAT)      | 0 failures | 6 passed (3 auth-setup + 3 contract tests), 10.2s |
| E2E full regression pack (UAT) | green      | _CI run on push_                                  |

## Out of scope (this PR)

Tracked on sub-issue [#295](https://github.com/metasession-dev/wawagardenbar-app/issues/295)'s checklist:

- **REQ-RT-002** — `kitchen:new-order` broadcast pin. UAT's internal-emit endpoint has no `new-order` case (`emitNewOrder` only called from server actions in `app/actions/order/order-actions.ts:160` + `app/actions/payment/payment-actions.ts:244`). Requires either a small production-code addition (extra switch case in the route handler) or a full payment-webhook-triggered E2E (extending REQ-069's webhook helpers).
- Browser-context full-chain test (admin dashboard page → kitchen-display page → DOM updates assert). Heavier multi-context Playwright pattern.
- `order:created` / `order:updated` / `order:cancelled` broadcasts on `orders` + `kitchen-display` rooms. Short additions once the helper exists.
