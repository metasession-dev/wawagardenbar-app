# REQ-072 — AI prompts captured

## Cycle entry

Operator: "proceed #301 merged"

Context: PR #301 (REQ-071, sub-issue #297) had merged to develop. Established umbrella-#291 pattern: after each sub-issue V1 ships, pick up the next in priority order. Operator did not specify which sub-issue → assistant chose between the remaining unblocked options (#295 Socket.IO vs #296 admin destructive ops).

## Pickup decision

Assistant chose **#295** with this rationale:

- Smallest scoped sub-issue (2 SRS items vs #296's 7).
- LOW risk (pure test addition vs #296's MEDIUM, since destructive-op specs touch destructive flows).
- Fills a high-leverage regression gap: Socket.IO broadcasts have zero E2E coverage today; a broken socket is invisible at DB/API layer but immediately visible operationally.
- Multi-context infrastructure is reusable for any future real-time test.

## In-cycle scope decisions

**Decision 1**: Defer REQ-RT-002 (`kitchen:new-order` broadcast) from V1.

Reason: The internal-emit endpoint's switch table has no `new-order` case. `emitNewOrder` is only callable from server actions (`order-actions.ts:160` + `payment-actions.ts:244`). To trigger it from a spec we'd need either:

- (a) Add a `new-order` case to `app/api/internal/socket/emit/route.ts` — production code change. Crosses the "test-only" line.
- (b) Drive the full payment-webhook flow that ends in `emitNewOrder` — extends REQ-069's webhook helpers, but couples two different sub-issues + concerns.

Chose pure-test V1 → ship REQ-RT-001 only, defer REQ-RT-002 to a follow-up that picks one of the two paths above.

**Decision 2**: Use the internal-emit endpoint to drive `emitOrderStatusUpdate` directly instead of going through a real Order document + admin action.

Reason: The internal-emit endpoint already supports `order-status-update`. Using it skips admin auth, skips real Order seed, skips business-action complexity. The trade-off — V1 pins the **transport contract** (event name + payload shape + room scoping) but does **not** pin "business action → broadcast" linkage. That's an explicit deferred item, documented in `test-scope.md` and `test-execution-summary.md` § "What this run does NOT prove".

**Decision 3**: Live run uncovered UAT's `INTERNAL_API_SECRET = "your-secret-key-here"` (the placeholder).

Reason for honest disclosure rather than silent fix: this is a **pre-existing production hardening gap unrelated to REQ-072**. The spec works regardless. Surfaced openly in `security-summary.md` § "Finding" so the operator can decide whether to rotate as a follow-up.

## Decisions NOT made by AI

- Pickup of #295 vs #296: assistant proposed; operator's "proceed" was the trigger but the choice between sub-issues was the assistant's call (announced in advance, in keeping with the umbrella V1 pattern).
- Whether to expand the internal-emit endpoint to cover `new-order` (REQ-RT-002): deferred to operator.
- Whether to rotate UAT's `INTERNAL_API_SECRET`: deferred to operator.

## AI tool

- **Tool:** Claude Opus 4.7 via Claude Code (CLI).
- **Scope:** spec authoring + helper + 6-doc evidence pack + release ticket + RTM row + implementation plan.
- **Verification:** live E2E run against UAT (6/6 pass, 10.2s); tsc 0 errors; vitest 1129 pass.
