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

## Post-deploy operator-reported defect (AC8 added)

After REQ-066 #281 + #282 merged to develop and UAT was healthy, the operator manually tested a Desperados completion via kitchen-display and reported: "I completed an order of despirados an imported beer then set it to completed in the kitchen display but the inventory count was not reduced".

Investigation steps surfaced the actual #277 root cause:

1. Agent first checked the order via Mongo — confirmed `inventoryDeducted: true`, stockmovement written with `qty: -1`, audit log shows `order.update completed`. Everything looked correct at the chokepoint level.
2. Agent re-read `applyOrderStockDelta` — found it always targeted `locations[0]`. For Desperados, `locations[0]` (store) is at 0; `Math.max(0, 0 + -1) = 0` silently clamps. The post-save hook then recomputes the aggregate as the sum of locations — unchanged.
3. **Agent caught itself**: the 3 rounds of root-cause refinement had narrowed in on the chokepoint layer but never asked the operator's literal observation "stockmovements are written but inventory doesn't change" — the tell that pointed at `applyOrderStockDelta`, not the chokepoint.

Two follow-up prompts:

- "why was this bug not caught by the e2e" — answer: AC7a/AC7b seeded Gulder (locations[0]=13, has stock), so the bug shape never reproduced. AC8 explicitly force-mutates the Desperados-shape (locations[0]=0) to pin the routing.
- "im still not clear on the flow you are suggesting here between the inventory locations and where order completions are taken from?" — agent explained the routing options (dedicated sale-point location vs first non-empty vs last non-empty) and the operator chose "Dedicated sale-point location" via AskUserQuestion. Subsequent investigation found `defaultSalesLocation` already on the Inventory schema (line 61) but never wired into deduction routing; the field had been bulk-set to `'store'` by a legacy migration (`migrate-location-tracking.ts`).
- "i was expecting a larger set of screenshots but there were only 4 or so, dont we have an extensive set of regression tests and feature tests screenshots" — surfaced a project-wide policy gap: screenshot density should scale with spec role (feature-mode dense, regression-mode sparse). Filed [DevAudit-Installer #113](https://github.com/metasession-dev/DevAudit-Installer/issues/113) + [#114](https://github.com/metasession-dev/DevAudit-Installer/issues/114).
- "approve, start tdd red baseline" — TDD red baseline written (5 failing routing tests + 11 failing backfill-helper tests across 3 files), then green phase implemented.

## AI-generated artefacts in this cycle

- `compliance/plans/REQ-066/implementation-plan.md` (rewritten 3x as the operator refined the frame; AC7 split into AC7a/AC7b)
- `compliance/evidence/REQ-066/{implementation-plan,test-plan,test-scope,test-execution-summary,security-summary,ai-prompts,ai-use-note}.md`
- `compliance/pending-releases/RELEASE-TICKET-REQ-066.md`
- New `IncidentEventModel` + `IncidentEventService` + `OrderService.completeOrder` + `InventoryService.reconcileMissedDeductions` + `OrderService.scanStalePaidOrders`
- `/dashboard/incidents` layout + page
- Removal of 6 premature deduction sites + 1 dead duplicate completion file
- 23 new vitest cases + 3 updated
- 3 new Playwright specs — all pass live against UAT (1.5 min wall-clock with the AC8 addition)
- AC8 (post-deploy operator-reported defect): `applyOrderStockDelta` rewrite + `lib/sale-point-location-backfill.ts` pure helper + `scripts/backfill-sale-point-location.ts` one-shot idempotent backfill (ran against UAT 2026-06-04, 37/39 rows touched)
- Two upstream issues filed against `metasession-dev/DevAudit-Installer` ([#113](https://github.com/metasession-dev/DevAudit-Installer/issues/113) + [#114](https://github.com/metasession-dev/DevAudit-Installer/issues/114)) for the screenshot-density policy gap
- GitHub Issue #280 (regression-pack invariant coverage gap pattern catalog)
- Comment thread on #277 documenting the three rounds of root-cause refinement

The agent did not author commit messages or PR descriptions independently of the operator's tracked-work conventions; titles use the `[REQ-066]` bracket form per `feedback_pr_title_req_brackets`.
