# REQ-064 — AI prompts (Phase 3 evidence)

Operator-issued prompts captured for the AI-assisted portion of this requirement. Full conversation transcript is retained out-of-band per the project's AI logging policy.

## Cycle-opening prompt (operator)

> "implement bundle B, C and D"

Followed by a 3-question scoping dialog where the operator chose:

> "REQ-064 support ticket — should the WhatsApp inbound router (REQ-056) auto-create tickets for `support_text` intent in the same PR, or defer to a follow-up REQ?" → **Wire it in same PR (recommended)**

That decision is what produced the REQ-056 inbound bridge code that REQ-064 wires up.

## E2E coverage prompt (operator)

> "add E2E coverage for all three"

…paired with the follow-up clarification:

> "is there a difference between new e2e tests and the tests from the regression packs?"

…which led to an exchange about the metadata-tag model used by the evidence helper (origin: `feature` vs `regression` per-capture, derived from `process.env.E2E_NEW_SPECS` rather than file-pack separation). The operator then corrected the agent's first answer (which had under-stated the distinction) with the more precise mental model.

## Phase boundary prompts (operator)

> "#270 merged"

(Confirmed integration PR landed on develop. Agent then watched develop CI, verified green via runs 26901043060 / 26901043224 / 26901043108, and proceeded with this Phase 3 evidence pack PR.)

## Decision points the operator owned this cycle

1. **REQ-056 → REQ-064 bridge in same PR vs follow-up.** Operator picked same-PR; that's the action arm that now sits in `WhatsAppInboundService.handle`.
2. **Adding E2E mid-cycle.** Operator opted in to E2E coverage over the standing `project_e2e_targeted_until_117` policy's default of "wait for full regression at #117 close." Result: 5 new specs (3 fixme'd for REQ-063 + 2 live for REQ-064 + 1 RBAC smoke for REQ-064).
3. **Regression-pack handoff semantics.** Operator corrected the agent's initial framing and the agent updated its mental model to the per-capture metadata tag (`feature` / `regression`).

## AI-generated artefacts in this cycle

- `compliance/plans/REQ-064/implementation-plan.md`
- `compliance/evidence/REQ-064/{test-plan,test-scope,test-execution-summary,security-summary,ai-prompts,ai-use-note,implementation-plan}.md`
- `compliance/pending-releases/RELEASE-TICKET-REQ-064.md`
- `models/support-ticket-model.ts` + `services/support-ticket-service.ts` + `app/dashboard/support/{layout,page,[ticketId]/page}.tsx` + `app/actions/dashboard/support-actions.ts` + `components/features/dashboard/support/reply-thread.tsx`
- `submitSupportTicketAction` rewrite + `WhatsAppInboundService.handle` bridge
- 12 new vitest cases + 1 updated REQ-056 routing test
- 5 new Playwright specs (`e2e/smoke/consent-split-*.spec.ts` ×2, `e2e/smoke/support-queue-rbac.spec.ts`, `e2e/support-ticket-staff-flow.spec.ts`, `e2e/support-ticket-whatsapp-inbound.spec.ts`)

The agent did not author commit messages or PR descriptions independently of the operator's tracked-work conventions; titles use the `[REQ-064]` bracket form per `feedback_pr_title_req_brackets`.
