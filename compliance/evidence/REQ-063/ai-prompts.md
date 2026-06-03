# REQ-063 — AI prompts (Phase 3 evidence)

Operator-issued prompts captured for the AI-assisted portion of this requirement. Full conversation transcript is retained out-of-band per the project's AI logging policy.

## Cycle-opening prompt (operator)

> "implement bundle B, C and D"

(Context: a 3-bundle plan had just been presented inline summarising Bundle B = REQ-063 comms hardening, Bundle C = REQ-064 support ticket queue, Bundle D = REQ-065 data export + cookies. The operator authorised all three in sequence.)

## Phase 0 — scope refinement question raised by the agent

The agent flagged that REQ-053 had already shipped most of WA-4 — the only remaining gap was the PIN-entry single-checkbox collapse and the missing `emailMarketing` split. Operator confirmed the narrowed scope.

## Decision points the operator owned this cycle

1. **Audit-trail shape:** single `communicationPreferencesUpdatedAt` timestamp (selected) vs append-only `consentEvents` log. Operator picked the lighter shape — sufficient for GDPR explicit-consent posture without per-write event-log overhead.
2. **Bundle C dependency:** wire REQ-056's IncomingMessage `support_text` intent → SupportTicket auto-create in the same PR as REQ-064 (selected) vs defer to a follow-up REQ. Operator picked same-PR to close the WhatsApp-to-staff loop in one shot.
3. **Bundle D scope:** informational cookie banner (selected) vs strict GDPR consent UI. The app currently has no analytics scripts; informational + forward-compatible was the right size.
4. **Existing-user backfill policy:** users whose `whatsappMarketing` was set to `true` by REQ-053's collapsed checkbox are LEFT ALONE. Operator approved at plan time — flipping them now would feel hostile.

## Phase boundary prompts (operator)

> "#266 merged"

(Confirmed the integration PR landed on develop. The agent then watched develop CI, verified green, and proceeded with this Phase 3 evidence pack PR.)

## AI-generated artefacts in this cycle

- `compliance/plans/REQ-063/implementation-plan.md`
- `compliance/evidence/REQ-063/{test-plan,test-scope,test-execution-summary,security-summary,ai-prompts,ai-use-note,implementation-plan}.md`
- `compliance/pending-releases/RELEASE-TICKET-REQ-063.md`
- Schema + verify-pin + NotificationService + UI changes in PR #266
- 8 new vitest cases + REQ-053/054 test fixture updates

The agent did not author commit messages or PR descriptions independently of the operator's tracked-work conventions; titles use the `[REQ-063]` bracket form per `feedback_pr_title_req_brackets`.
