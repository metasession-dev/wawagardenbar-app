# REQ-056 — AI use note

**Date:** 2026-06-01
**Tool:** Claude Code (Opus 4.7) via project orchestrator.

## What the AI did

- Surveyed REQ-055's status-branch wire-up in `lib/whatsapp.ts:handleWebhook` and the inbound-branch TODO that REQ-055 deliberately left for REQ-056. Confirmed the webhook route at `app/api/webhooks/whatsapp/route.ts` + signature verification + GET-handshake are pre-existing — REQ-056's scope is the inbound-branch payload routing, not the webhook surface itself.
- Authored `compliance/plans/REQ-056/implementation-plan.md` with 8 ACs, technical approach (state classifier, intent classifier, router matrix, IncomingMessage audit model, free-form text-send method on WhatsAppService, lazy-import wiring), STRIDE table, threat model (STOP regex strictness, NoSQL injection, auto-create-then-opt-out race, persistence-down posture), rollback. Risk classification: MEDIUM-HIGH (customer-facing surface, compliance-sensitive STOP, auto-modifies + auto-creates User records). Presented for plan review per `feedback_sdlc_impl_plan_review` MEDIUM/HIGH-risk gate; operator approved as scoped.
- After plan approval: wrote four TDD red baselines —
  - `__tests__/models/incoming-message-model.test.ts` (5 cases) — schema defaults, validators, enums on `classifiedState` + `classifiedIntent`, guest `userId: null` accepted.
  - `__tests__/services/whatsapp-inbound-service.classify.test.ts` (13 cases) — state classifier covering all 4 states + deleted-account exclusion; intent classifier covering STOP regex variants, `"💬 Chat with Staff"` text body + Meta `interactive.button_reply` payload + the support-text fallback.
  - `__tests__/services/whatsapp-inbound-service.routing.test.ts` (10 cases) — full state × intent matrix at significant cells, STOP compliance (`UserModel.updateOne` clears both whatsapp flags), AC6 auto-create payload, AC7 safety (`IncomingMessage.create` rejection swallowed, `NotificationService.send` rejection swallowed).
  - `__tests__/lib/whatsapp.inbound-integration.test.ts` (2 cases) — inbound-payload delegates to `WhatsAppInboundService.handle` once per message; status-payload doesn't call inbound (REQ-055 path stays untouched).
- 30/30 red confirmed → implemented `models/incoming-message-model.ts` (Mongoose schema + 3 indexes + unique `messageId` for Meta-retry dedup), `lib/whatsapp-inbound-templates.ts` (state → template name lookup), `services/whatsapp-inbound-service.ts` (classifiers + `handle()` orchestrator), and the `sendTextMessage` method on `WhatsAppService` for the 24h-window free-form STOP confirmation.
- One iteration during TDD: the `MetaInboundMessage` payload type wasn't exported, so the routing test helpers couldn't type-check. Exported the interface from the service; helpers typed cleanly; full suite green.
- Ran the full gate set: `tsc --noEmit` clean, full vitest 966 / 4 skip / 0 fail (+30 new), eslint scoped (0 errors; 6 intentional `no-console` warnings on `lib/whatsapp.ts` v1 observability), semgrep ERROR-severity 0 findings on 4 files, npm audit 0 high/critical (after the unrelated PR #230 vitest GHSA bump).
- Phase 3 evidence pack assembled belatedly (this commit): test-scope, test-plan, test-execution-summary, security-summary, ai-prompts, ai-use-note, implementation-plan copy, RELEASE-TICKET-REQ-056.md in pending-releases/. The operator caught that the release ticket was missing on the portal after the release PR opened — corrected within the same session.
- Updated `compliance/RTM.md` with the REQ-056 row.

## What the human did

- Reviewed and approved the implementation plan ("Approve as scoped").
- Merged the integration PR #229 → develop.
- Merged the vitest CVE bump PR #230 (unrelated dep-audit failure surfaced on REQ-056's CI; npm advisory db published the critical between REQ-055's CI and REQ-056's).
- Merged the attribution PR #231 — same pattern as PR #163 (REQ-048).
- Caught the missing Phase 3 release ticket on the portal; surfaced "Release ticket not yet uploaded — wait for the developer to complete SDLC step 3."
- Authorised filing two upstream issues that emerged from the cycle:
  - [DevAudit-Installer #95](https://github.com/metasession-dev/DevAudit-Installer/issues/95) — resolver step-4-bis (scan RTM.md for IN PROGRESS rows).
  - [DevAudit-Installer #96](https://github.com/metasession-dev/DevAudit-Installer/issues/96) — ci.yml upload-evidence-on-failure-too.
- Will perform Phase 4 portal UAT approval + Phase 5 Production approval after CI green on develop after this evidence pack lands.

## Risk-tier compliance

- MEDIUM-HIGH risk → plan-approval offered + granted before any code was written (matches `feedback_sdlc_impl_plan_review`).
- Tests written before implementation (matches `feedback_tests_before_push`).
- All gates run locally before push (`feedback_wait_for_ci`).
- Single bundled PR for the implementation per `feedback_single_pr_default`; chore + attribution + evidence-pack PRs are housekeeping follow-ups, each justified by a hard sequencing reason (CVE blocker, attribution-window expired, Phase 3 omission).
- E2E policy honoured per `project_e2e_targeted_until_117` — no full regression dispatched; unit + integration boundary is load-bearing.
- STOP compliance treated as Meta WABA hard policy requirement, not a UX nicety — clears both consent flags regardless of state, confirms free-form within 24h window.
- No `--no-verify`, no `--delete-branch` on the release PR (per `feedback_no_delete_develop_on_release_merge`).
