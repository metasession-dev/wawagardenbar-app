# REQ-072 — AI use note

## What the AI did

- Read the SRS entries for REQ-RT-001 + REQ-RT-002 + audited the production Socket.IO infrastructure (`lib/socket-server.ts`, `lib/socket-client.ts`, `lib/socket-emit-helper.ts`, `app/api/internal/socket/emit/route.ts`).
- Mapped each server-side emit function to its triggered event name, room target, and payload shape.
- Identified that REQ-RT-001's `emitOrderStatusUpdate` is reachable today via the internal-emit endpoint, while REQ-RT-002's `emitNewOrder` is not (no switch case). Made the V1 scope decision (REQ-RT-001 only, REQ-RT-002 deferred).
- Authored the `socket-listener` helper as a reusable wrapper.
- Authored 3 contract tests in the spec file (AC1 + AC2 happy-path, AC3 room isolation, AC2 extended).
- Iterated the spec's skip logic after recognising that the placeholder secret is actually valid against any server with a matching placeholder.
- Ran the spec live against UAT and recorded results in `test-execution-summary.md`.
- Authored the 6-doc evidence pack + release ticket + implementation plan + RTM row.

## Honest framing of limitations

**V1 pins transport, not the business chain.** The spec triggers the broadcast via UAT's internal-emit endpoint with the shared secret — this exercises `emitOrderStatusUpdate` directly. It does NOT test the linkage "admin updates order status → server action → emit-helper POST → internal-emit handler → broadcast". The full chain is covered by:

- Unit/integration tests on the action layer (already exist).
- This spec on the broadcast layer (newly pinned).

Plus the implicit gap: the bridge between them (action → POST → handler) is not pinned by THIS spec. A regression in `app/actions/admin/order-management-actions.ts:updateOrderStatusAction` that stopped calling `emitOrderStatusUpdateEvent` would not be caught by REQ-072. That's an explicit deferred item — a "real business action → broadcast" V2 spec.

**No browser-context DOM assertion.** The spec verifies events arrive at a Node-level socket client. It does NOT verify that the admin orders dashboard or kitchen display components actually re-render in response. A browser-context full-chain test would assert that; deferred to V2.

**UAT secret finding surfaced openly.** The live run uncovered that UAT's `INTERNAL_API_SECRET` is the documented placeholder. This is **not a REQ-072 regression** but is a pre-existing gap that the spec's execution made visible. Documented in `security-summary.md` § "Finding" with suggested remediation. Operator decides whether to rotate.

## What the operator validated

- Approved the umbrella + sub-issue grouping in advance (umbrella #291 cycle).
- Triggered this cycle with "proceed #301 merged" — implicit go-ahead to pick up the next sub-issue.
- Will validate at PR review + portal UAT review.

## Reproducibility

The spec runs deterministically against any environment with a matching `INTERNAL_API_SECRET`:

```bash
BASE_URL=https://wawagardenbar-app-uat.up.railway.app \
  INTERNAL_API_SECRET=<matching-value> \
  npx playwright test e2e/realtime/order-status-broadcast.spec.ts --project=regression
```

No real Order document state needed (synthetic orderIds). No teardown beyond socket disconnect.
