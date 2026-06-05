# REQ-070 — AI prompts (Phase 3 evidence)

## Cycle-opening prompt

Following the REQ-069 close-out (umbrella [#291](https://github.com/metasession-dev/wawagardenbar-app/issues/291) cycle 1 ship), the operator said:

> "proceed"

The agent interpreted this as: continue with the umbrella's recommended next pickup. The umbrella explicitly recommends sub-issue [#293](https://github.com/metasession-dev/wawagardenbar-app/issues/293) (rewards & loyalty pipeline) as the next-highest-value cycle after #294 because it pins REQ-048's backstop — the same value-pattern that delivered REQ-069's headline (pinning REQ-049's idempotency contract).

## Scope decisions during implementation

The agent explored the rewards subsystem and identified three sub-decisions:

1. **Service-layer call vs UI-driven E2E** — the admin UI cancel button gates on `paymentStatus !== 'paid'`, which excludes orders that have actually earned points (points are earned at payment confirmation). The customer-facing `cancelOrderAction` would work but requires a customer session. The pragmatic path: call `OrderService.cancelOrder` directly from the Playwright runner against live UAT Mongo, mirroring what the action layer does.

2. **Dynamic-import limitation** — `OrderService.cancelOrder` uses `await import('./points-service')` inside its try/catch. These dynamic imports don't transpile in the Playwright runner. The agent caught this with a diagnostic run that showed `User.loyaltyPoints` unchanged after `cancelOrder` returned. Fix: import `PointsService` + `RewardsService` statically + call them directly after `cancelOrder` returns. Documented in `test-execution-summary.md` § Dynamic-import limitation.

3. **V1 scope** — sub-issue #293's GitHub body proposes 7 specs. V1 ships 1 spec covering both legs of REQ-048's cancel-reversal in one cancel transition. Remaining 6 specs (tab eligibility, tab close applies, admin reward CRUD ×3, issued-rewards list, templates editor) deferred to follow-up cycles tracked on #293's checklist. Matches the V1 pattern from REQ-069.

## AI-generated artefacts in this cycle

- `e2e/rewards/order-cancel-reverses-points.spec.ts` — single spec covering AC1 + AC2 in one cancel transition.
- `compliance/plans/REQ-070/implementation-plan.md` — plan with ACs, risk, security, dynamic-import caveat.
- `compliance/evidence/REQ-070/{test-plan,test-scope,test-execution-summary,security-summary,ai-prompts,ai-use-note}.md` — 6-doc evidence pack.
- `compliance/pending-releases/RELEASE-TICKET-REQ-070.md` — release ticket.
- `compliance/RTM.md` REQ-070 row (IN PROGRESS).

PR title uses the `[REQ-070]` bracket form per `feedback_pr_title_req_brackets`.
