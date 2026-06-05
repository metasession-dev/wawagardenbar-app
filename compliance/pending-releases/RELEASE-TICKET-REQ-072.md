# Release Ticket: REQ-072 — Real-time Socket.IO broadcast E2E coverage (sub-issue #295)

**Status:** DRAFT
**Date:** 2026-06-05
**Requirement ID:** REQ-072
**Risk Level:** LOW
**GitHub Issue:** [#295](https://github.com/metasession-dev/wawagardenbar-app/issues/295) (sub-issue of umbrella [#291](https://github.com/metasession-dev/wawagardenbar-app/issues/291))
**Integration PR:** (this PR — to be opened against develop)
**Release PR:** (bundled with REQ-069/REQ-070/REQ-071 or follow-up; pure test addition, low urgency)
**Sign-off (dual-actor):** Pending portal UAT + Production approval.

---

## Summary

Fourth cycle of umbrella tracker [#291](https://github.com/metasession-dev/wawagardenbar-app/issues/291) (SRS → E2E regression-pack coverage closure). **Pins REQ-RT-001's transport contract in the regression pack for the first time** — Socket.IO broadcasts previously had **zero E2E coverage**. A broken socket means stale displays — invisible at the database / API layer, visible only as "the display didn't refresh."

- **AC1 — Subscribed client receives event.** A Node-level `socket.io-client` joined to `order-${orderId}` room receives an `order-status-update` event with the new status payload within 5 seconds of server-side emission.
- **AC2 — Payload shape.** The event payload matches `lib/socket-server.ts:108` `emitOrderStatusUpdate`'s contract: `{ orderId, status, estimatedWaitTime?, note?, timestamp }`.
- **AC3 — Room isolation.** A client joined to a DIFFERENT `order-*` room does NOT receive the event.

## AI Involvement

- **AI Tool Used:** Claude Opus 4.7 via Claude Code (CLI).
- **AI-Generated Changes:** One E2E spec (3 tests) + reusable `socket-listener` helper + 6-doc evidence pack + release ticket + RTM row + implementation plan.
- **Operator action this cycle:** approved umbrella + sub-issue grouping in advance; triggered cycle with "proceed #301 merged".

## Implementation Details

**Files Added:**

- `e2e/realtime/order-status-broadcast.spec.ts` — 3 tests covering AC1+AC2 happy-path, AC3 room isolation, AC2 extended payload.
- `e2e/helpers/socket-listener.ts` — reusable `connectClient` + `joinOrderRoom` + `waitForEvent` + `disconnectAll` + `triggerInternalEmit` helpers.
- `compliance/plans/REQ-072/implementation-plan.md`.
- `compliance/evidence/REQ-072/{test-plan,test-scope,test-execution-summary,security-summary,ai-prompts,ai-use-note}.md` — 6-doc evidence pack.

**Files Modified:**

- `compliance/RTM.md` — REQ-072 IN PROGRESS row added.

**Schema changes:** None. **New packages:** None (`socket.io-client` already in `package.json`). **Env vars:** None new (uses existing `INTERNAL_API_SECRET`). **Pure test addition.**

## Test Plan & Evidence

See `compliance/evidence/REQ-072/test-plan.md` and `test-execution-summary.md`.

- Vitest: 1129 pass / 4 skip / 0 fail (unchanged).
- TypeScript: 0 errors.
- E2E focused REQ-072 (UAT): **6 passed** (3 auth-setup + 3 contract tests), 10.2s wall-clock.

## Security & Compliance

See `security-summary.md`. Headline: no production code change; test-only; uses an existing internal-only endpoint with the existing shared-secret gate; synthetic orderIds only (no real Order data touched).

**Honest disclosure surfaced**: live run revealed UAT's `INTERNAL_API_SECRET` is the documented placeholder `your-secret-key-here`. This is a **pre-existing production-hardening gap unrelated to REQ-072**. Documented in `security-summary.md` § "Finding" with suggested remediation. Operator decides whether to rotate.

## Rollback Plan

Revert the integration PR. The new spec file + helper are pure additions; reverting leaves no orphan production behavior.

## Deferred to follow-up cycles within #295

| Item                                                                                             | Why                                            |
| ------------------------------------------------------------------------------------------------ | ---------------------------------------------- |
| REQ-RT-002 — `kitchen:new-order` broadcast pin                                                   | Internal-emit endpoint has no `new-order` case |
| Browser-context full-chain test (admin page → kitchen page → DOM update)                         | Heavier multi-context Playwright pattern       |
| `order:created` / `order:updated` / `order:cancelled` broadcasts on `orders` + `kitchen-display` | Short additions once helper exists             |
| `batch-update` broadcast on `kitchen` room                                                       | Same                                           |
| Business-action → broadcast linkage (real admin action triggers emit)                            | Requires admin auth + real Order seed          |

Tracked on sub-issue [#295](https://github.com/metasession-dev/wawagardenbar-app/issues/295)'s checklist.

## Quality Gates

| Gate                           | Expected   | Actual (2026-06-05)                               |
| ------------------------------ | ---------- | ------------------------------------------------- |
| `npx tsc --noEmit`             | exit 0     | exit 0                                            |
| `npx vitest run` (full)        | 0 failures | 1129 pass / 4 skip / 0 fail                       |
| E2E focused REQ-072 (UAT)      | 0 failures | 6 passed (3 auth-setup + 3 contract tests), 10.2s |
| E2E full regression pack (UAT) | green      | _to be run at evidence-pack push time_            |

## Stage Approvals

- [x] Stage 1 — Plan (`compliance/plans/REQ-072/implementation-plan.md`)
- [x] Stage 2 — Implement & test (1 spec; 3 tests live-passing against UAT)
- [x] Stage 3 — Compile evidence (this evidence pack)
- [ ] Stage 4 — Submit for UAT review (release PR)
- [ ] Stage 5 — UAT review + production deployment + close-out

## Notes

- Fourth cycle of umbrella [#291](https://github.com/metasession-dev/wawagardenbar-app/issues/291).
- 3 tests pinning REQ-RT-001's transport contract — the room-targeting + payload-shape correctness for `order-status-update`. A future regression where this event's name, payload shape, or room scoping drifts will fail the spec immediately.
- Zero production code change. Risk class LOW (pure test addition + read-only against UAT data).
