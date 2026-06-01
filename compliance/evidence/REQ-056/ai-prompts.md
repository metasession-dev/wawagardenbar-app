# REQ-056 — AI prompts log

**Date:** 2026-06-01

## Session prompts (user → AI)

1. `plan WA-3 as REQ-056`
   - AI surfaced the implementation plan with 8 ACs (model, state classifier, intent classifier, routing matrix, STOP compliance, auto-create User, safety try/catch, handleWebhook wire-up), STRIDE table, threat model, rollback. Risk: MEDIUM-HIGH. Plan approval requested per `feedback_sdlc_impl_plan_review`.

2. `Approve as scoped`
   - Plan approval at the MEDIUM-HIGH-risk gate. AI proceeded with TDD-first implementation.

3. _(operator merged PR #229 → develop; AI observed CI failure on Dependency Audit gate from a vitest GHSA CVE published in npm advisory DB between REQ-055's CI and REQ-056's.)_

4. _(operator merged PR #230 vitest 4.1 bump; CI passed but attributed to v2026.06.01 because chore commit had no `[REQ-056]` tag.)_

5. `#231 merged`
   - Confirmation that the attribution PR landed; CI ran with `--release REQ-056`, evidence uploaded to portal under REQ-056.

6. `file a follow-up DevAudit-Installer issue`
   - AI filed DevAudit-Installer #95 (resolver step-4-bis — scan RTM.md for IN PROGRESS rows as zero-ceremony attribution fallback).

7. `file the second issue too` (Upload Evidence on Quality Gates failure)
   - AI filed DevAudit-Installer #96 (ci.yml: upload-evidence on failure with status=failed).

8. `yes` (open the release PR)
   - AI opened release PR #232 develop → main with `[REQ-056]` title.

9. `Release ticket not yet uploaded. Wait for the developer to complete SDLC step 3 (compile-evidence) — the next CI run after compliance/pending-releases/RELEASE-TICKET-REQ-XXX.md is pushed to develop will produce a reviewable release.`
   - Operator caught the missing Phase 3 release ticket. AI re-read `SDLC/3-compile-evidence.md` step 8/9, surveyed REQ-055's evidence pack as the template, and assembled the full Phase 3 bundle (release ticket + 7 evidence markdowns).

## Internal AI prompts (orchestrator → sub-skills)

No sub-skills were invoked for REQ-056. The work is server-side webhook routing + a new audit-log model + thin wire-ups; no e2e author work needed (per the `project_e2e_targeted_until_117` policy AND per the scope justification — orchestrator unit boundary covers the surface). `sdlc-implementer` ran end-to-end; `e2e-test-engineer` was not invoked.

## Decision points

- **Auto-create User on `new` state** — mirrors `app/actions/auth/send-pin.ts` pattern. Alternative: log the inbound but DON'T create a User row until the customer explicitly signs up. Chosen because the consent-gate downstream (REQ-054's `NotificationService.send`) needs a User to read `whatsappTransactional` from; without auto-create, the welcome template send would fail with no user. Auto-create + `phoneVerified: false` keeps the door open for the customer to later complete signup via PIN flow.
- **STOP regex strictness** — `^\s*(stop|unsubscribe|opt[-\s]?out)\s*$` is whole-message match, no partial matches. Trade-off: false negatives on "please stop the messages" — those route to `support_text` (staff queue) where a human can apply the opt-out. False positives are zero. Conservative is correct here: accidentally opting people out is worse than missing chatty STOPs.
- **Free-form text-send method on WhatsAppService** — Meta's 24h customer-service window allows free-form replies (no template approval needed) inside the window opened by an inbound. Adding `sendTextMessage` to `WhatsAppService` keeps the channel boundary unified. Alternative was a separate `WhatsAppFreeFormService` class — rejected as needless abstraction.
- **Lazy import in `handleWebhook` inbound branch** — same pattern REQ-055 used for the status branch. Avoids the lib→services→lib circular that a top-of-file import would create (`lib/whatsapp` imports `services/whatsapp-inbound-service` which imports `services/notification-service` which imports `lib/whatsapp` via `WhatsAppService.sendMessage`).
- **IncomingMessage persists body content** — different posture from REQ-055's NotificationLog which is metadata-only. Justified because the router needs to log what was said for STOP audit + support-queue items. Flagged in `security-summary.md` as the TTL/redaction concern for a future REQ.
- **Routing matrix `active + chat_with_staff → queued_for_staff`** — doesn't send a template. Active customers expect a human response, not an auto-reply. The `actionTaken: 'queued_for_staff'` row is the placeholder until a real SupportTicket model (P3 #17) lands.
- **Welcome templates fire through `NotificationService.send`** — gated by REQ-053's `whatsappTransactional` consent (default true) and falls through to email when Meta restriction blocks template sends. The IncomingMessage row records `actionTaken: 'sent_welcome_new_user'` based on intent, not delivery — accepted for v1 because tracking actual delivery requires Meta's status-event webhook flow (REQ-055) reconciling against this row, which is a future REQ.
- **`MetaInboundMessage` exported as a public interface** — required for test helpers to type-check. Internal interfaces remain internal (e.g. `ClassifyResult`).
- **Audit-trail Phase 3 catch** — Phase 3 step 8/9 (release ticket in `compliance/pending-releases/` + 7 evidence markdowns) was originally skipped; AI jumped from Phase 2 (implement+test) directly to Phase 4 (open release PR). Operator caught the gap on the portal — the release ticket was missing, so the release wasn't reviewable. Corrected by this evidence-pack PR.

## Audit cross-refs

- Parent backlog: #117 (`WA-3`).
- Direct dependencies: REQ-053 (consent fields on User), REQ-054 (`NotificationService.send` for welcome templates), REQ-055 (lazy-import pattern + `handleWebhook` status-branch precedent).
- Cross-reference: existing `app/api/webhooks/whatsapp/route.ts` (untouched by REQ-056; verified by reading) provides the signature-verification surface.
- Cycle artefacts: PR #229 (integration), PR #230 (unrelated vitest CVE bump), PR #231 (re-attribution), PR #232 (release develop → main).
- Upstream follow-ups filed this cycle: DevAudit-Installer #95 (resolver step-4-bis), DevAudit-Installer #96 (ci.yml upload-on-failure).
- Project memory honoured: `feedback_sdlc_impl_plan_review`, `feedback_tests_before_push`, `feedback_wait_for_ci`, `feedback_single_pr_default`, `project_e2e_targeted_until_117`, `feedback_no_delete_develop_on_release_merge`, `feedback_pr_title_req_brackets`.
- Unblocks future work: full SupportTicket model + admin queue UI (P3 #17), order-cancellation intent, balance-inquiry intent, TTL/retention policy for IncomingMessage.
