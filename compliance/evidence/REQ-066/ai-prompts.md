# REQ-066 — AI prompts (Phase 3 evidence)

Operator-issued prompts captured for the AI-assisted portion of this requirement. Full conversation transcript is retained out-of-band per the project's AI logging policy.

## Cycle-opening defect report (operator)

> "there is an issue, items being sold are not deducted from inventory count. will this bug be caught in the regression pack?"

This kicked off the investigation. The agent's first-pass framing pointed at `OrderService.createOrder:205-218`'s catch-and-swallow; the operator pushed back twice with corrections.

## Root-cause refinement — operator's three corrections

1. **First correction:** "but why would #277 have occurred if there was no contention. it is a simple create an order which should result in inventory numbers reducing .. the audit log shows it"
   - Agent re-investigated and found the customer checkout path (`payment-actions.ts:createOrder`) bypassed `OrderService.createOrder` entirely. Reframed: deduction was deferred to payment-webhook handlers; cash payments would never deduct.

2. **Second correction:** "i thought items get deducted after its set to completed in the kitchen display"
   - Agent re-investigated and found `order-management-actions.ts:333` is the canonical deduction site. Reframed: deduction is intended at kitchen-completion; the bug presents when paid orders never reach `completed` status. Six premature call sites exist that should be removed.

3. **Third correction:** "i dont want anything bypassing the kitchen display, i dont want cron jobs doing that either."
   - Agent removed the original AC2 "auto-complete cron" pass; reframed the reconciliation cron as retry-only + the stale-paid-orders scan as visibility-only. NEVER mutates Order.status.

## Operator-driven plan expansion mid-cycle

> "i want the e2e tests to include confirmation of what happens to the inventory when we go through order prepping to complete for the orders page and not just from the kitchen display"

Original AC7 covered only the kitchen-display path. Operator flagged the orders-page UI as a separate surface that needs its own coverage. AC7 was split into AC7a (kitchen-display) + AC7b (orders-page). Plan + RTM were updated to reflect this.

## Decision points the operator owned this cycle

1. **Deduction trigger semantics:** kitchen-display `completed` is the canonical site (over payment-confirmed or hybrid reserve-then-deduct shapes).
2. **No auto-completion:** rejected the original Pass A of the reconciliation cron.
3. **Tab orders flow through kitchen-display individually:** confirmed the strongest invariant — TabService deduction sites can be removed alongside the others.
4. **Operator approved the third-iteration plan.** Plan-pause discipline observed per `feedback_sdlc_impl_plan_review` (HIGH-risk financial-touching).
5. **Process-lesson save:** operator approved adding `feedback_wait_for_release_confirmation` memory (from the REQ-065 close-out cycle's process gap).

## Cycle continuity prompts (operator)

- "#281 was already merging before you made this change" — surfaced that the AC7 plan-expansion commit didn't make it into the integration PR. Agent rolled the expansion forward into the evidence pack PR.
- "write the 7 evidence-pack markdowns and open the PR" — evidence pack authored.
- "i need this resolved before merging" — operator rejected the agent's initial `test.fixme` deferral of AC7a/AC7b and required live-passing specs before the evidence-pack PR could merge. Agent dug back in, found the location-aware stock bug in the seed/cleanup helpers, and got both specs green against UAT.

## AI-generated artefacts in this cycle

- `compliance/plans/REQ-066/implementation-plan.md` (rewritten 3x as the operator refined the frame; AC7 split into AC7a/AC7b)
- `compliance/evidence/REQ-066/{implementation-plan,test-plan,test-scope,test-execution-summary,security-summary,ai-prompts,ai-use-note}.md`
- `compliance/pending-releases/RELEASE-TICKET-REQ-066.md`
- New `IncidentEventModel` + `IncidentEventService` + `OrderService.completeOrder` + `InventoryService.reconcileMissedDeductions` + `OrderService.scanStalePaidOrders`
- `/dashboard/incidents` layout + page
- Removal of 6 premature deduction sites + 1 dead duplicate completion file
- 23 new vitest cases + 3 updated
- 2 new Playwright specs — both pass live against UAT (1.1 min wall-clock) after operator pushback drove the location-aware-cleanup fix
- GitHub Issue #280 (regression-pack invariant coverage gap pattern catalog)
- Comment thread on #277 documenting the three rounds of root-cause refinement

The agent did not author commit messages or PR descriptions independently of the operator's tracked-work conventions; titles use the `[REQ-066]` bracket form per `feedback_pr_title_req_brackets`.
