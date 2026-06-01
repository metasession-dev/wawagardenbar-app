# REQ-055 — AI use note

**Date:** 2026-06-01
**Tool:** Claude Code (Opus 4.7) via project orchestrator.

## What the AI did

- Surveyed REQ-054's `logAttempt` v1 observability + the existing `app/api/webhooks/whatsapp/route.ts` (which already verifies Meta's `x-hub-signature-256` and dispatches to `WhatsAppService.handleWebhook`). Discovered the webhook route + signature verification + GET-handshake were all pre-existing — REQ-055's scope shrank to the persistence layer + two small wire-ups.
- Authored `compliance/plans/REQ-055/implementation-plan.md` with ACs, technical approach, STRIDE table, threat model (monotonic-status gate, replay protection, event-ordering race), rollback. Presented for plan review per `feedback_sdlc_impl_plan_review` LOW-MEDIUM-risk gate; the operator approved as planned.
- After plan approval: wrote three TDD red baselines —
  - `__tests__/models/notification-log-model.test.ts` (6 cases) — schema defaults, validators, enums, guest path
  - `__tests__/services/notification-log-service.test.ts` (10 cases) — `recordAttempt` happy/error paths, `updateStatus` happy path + monotonic gate at every transition + terminal-state preservation
  - `__tests__/services/notification-service.log-integration.test.ts` (3 cases) — REQ-054→REQ-055 wire-up + rejection-doesn't-break-send-path
- 16/16 red confirmed → implemented `models/notification-log-model.ts` (Mongoose schema + indexes + `NOTIFICATION_LOG_STATUS_ORDER` lifecycle map) and `services/notification-log-service.ts` (`recordAttempt` + `updateStatus` with the monotonic filter).
- One iteration: the service test mock was missing the `NOTIFICATION_LOG_STATUS_ORDER` named export from the model module; service threw on the missing import, error swallowed, test saw `false`. Added the constant to the mock; all 19 tests passed.
- Added the `messageId` field to REQ-054's `NotificationAttempt` interface, captured Meta's `wamid` on the WhatsApp branch, and routed it through `logAttempt`'s call to `recordAttempt`. Existing `logAttempt` console.log line retained — REQ-055 augments, doesn't replace, the v1 observability.
- Wired the existing `lib/whatsapp.ts:handleWebhook` status-event branch to call `NotificationLogService.updateStatus`. Used a lazy import (`await import(...)`) inside the loop to avoid the lib→services→lib circular that a top-of-file import would create.
- Ran the full gate set: `tsc --noEmit` clean, full vitest 936 / 4 skip / 0 fail (+19 new), eslint scoped (0 errors; 8 intentional `no-console` warnings carried over from REQ-054), semgrep 0 findings on 4 files, npm audit 0 high/critical.
- Wrote this evidence pack + the release ticket.
- Updated `compliance/RTM.md` with the REQ-055 row.

## What the human did

- Reviewed and approved the implementation plan ("Proceed as planned (Recommended)").
- Earlier in the session: clarified the E2E policy to "delivery = #117 close" (PR #224), which REQ-055 honours by not dispatching any E2E.
- Will review the integration PR + the release PR, then exercise the portal UAT four-eyes step and Production approval.

## Risk-tier compliance

- LOW-MEDIUM risk → plan-approval offered + granted before any code was written (matches `feedback_sdlc_impl_plan_review`).
- Tests written before implementation (matches `feedback_tests_before_push`).
- All gates run locally before push.
- Single bundled PR per `feedback_single_pr_default`.
- E2E policy honoured per `project_e2e_targeted_until_117` — no full regression dispatched; unit + integration boundary is load-bearing.
- Persistence error-swallowing pattern protects the send path per the explicit AC6 design.
