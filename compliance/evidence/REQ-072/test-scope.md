# REQ-072 — Test scope

## In scope (this PR)

### E2E specs

- `e2e/realtime/order-status-broadcast.spec.ts` — 3 tests pinning the `order-status-update` event broadcast contract to the `order-${orderId}` room.

### Helpers

- `e2e/helpers/socket-listener.ts` — reusable `socket.io-client` wrapper (`connectClient`, `joinOrderRoom`, `waitForEvent`, `disconnectAll`, `triggerInternalEmit`). New infrastructure for any future Socket.IO E2E.

## SRS items covered

| SRS ID                              | Covered by                     | Status                              |
| ----------------------------------- | ------------------------------ | ----------------------------------- |
| REQ-RT-001 (order status broadcast) | order-status-broadcast.spec.ts | **Yes — transport contract pinned** |

## Out of scope (deferred to follow-up cycles within #295)

| Item                                                                     | Why deferred                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **REQ-RT-002 — `kitchen:new-order` broadcast pin**                       | UAT's `/api/internal/socket/emit` endpoint has no `new-order` case. `emitNewOrder` is only called from server actions in `app/actions/order/order-actions.ts:160` + `app/actions/payment/payment-actions.ts:244`. V2 path is either (a) add a `new-order` switch case to the internal-emit route handler (4-line production change), or (b) extend REQ-069's webhook helpers to trigger the payment-confirms-order pathway end-to-end. Both are valid; chose pure-test V1 to keep this PR strictly test-only + LOW risk. |
| **Browser-context full-chain E2E**                                       | Admin dashboard page in browser A → kitchen-display page in browser B → DOM updates assert after broadcast. Heavier multi-context Playwright pattern. V1 pins transport via Node-level socket clients (cheaper, more deterministic, equally regression-detecting at the transport layer).                                                                                                                                                                                                                                |
| **`order:created` broadcast pin** (`orders` + `kitchen-display` rooms)   | Same internal-emit endpoint already supports `order-created` case. Short addition once the spec lands. V2.                                                                                                                                                                                                                                                                                                                                                                                                               |
| **`order:updated` broadcast pin** (`orders` + `kitchen-display` rooms)   | Same. V2.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| **`order:cancelled` broadcast pin** (`orders` + `kitchen-display` rooms) | Same. V2.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| **`batch-update` broadcast pin** (`kitchen` room)                        | Same. V2.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |

These ship in a follow-up REQ within sub-issue #295.

## Out of scope (umbrella tracker — not this sub-issue)

These belong to other sub-issues of [#291](https://github.com/metasession-dev/wawagardenbar-app/issues/291):

- Customer-PIN-flow E2E → sub-issue [#292](https://github.com/metasession-dev/wawagardenbar-app/issues/292) (blocked on PIN-flow auth).
- Payments + webhooks E2E → sub-issue [#294](https://github.com/metasession-dev/wawagardenbar-app/issues/294) (REQ-069 MERGED).
- Rewards & loyalty pipeline → sub-issue [#293](https://github.com/metasession-dev/wawagardenbar-app/issues/293) (REQ-070 MERGED).
- Public API authenticated contracts → sub-issue [#297](https://github.com/metasession-dev/wawagardenbar-app/issues/297) (REQ-071 MERGED).
- Admin destructive ops → sub-issue [#296](https://github.com/metasession-dev/wawagardenbar-app/issues/296).

## Manual UAT — none required

Spec runs end-to-end against live UAT's Socket.IO infrastructure. No human-driven manual validation step needed.
