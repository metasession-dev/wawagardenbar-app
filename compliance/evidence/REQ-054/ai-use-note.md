# REQ-054 — AI use note

**Date:** 2026-06-01
**Tool:** Claude Code (Opus 4.7) via project orchestrator.

## What the AI did

- Read #117 WA-2 + audited the current send-path landscape (`sendOrderConfirmationEmail` callsite at `app/actions/communication/communication-actions.ts:80`; existing `WhatsAppService`/`SMSService` helpers; consent fields shipped in REQ-053).
- Authored `compliance/plans/REQ-054/implementation-plan.md` with ACs, technical approach, STRIDE table, rollback, scope-out list. Presented for plan review per `feedback_sdlc_impl_plan_review` MEDIUM-risk gate; the operator approved as planned.
- After plan approval: wrote `__tests__/lib/notification-templates.test.ts` (6 cases) and `__tests__/services/notification-service.test.ts` (10 cases) as the TDD red baseline → confirmed red → implemented `lib/notification-templates.ts` and `services/notification-service.ts` → 1 mock-shape bug in the test surfaced (chainable `.lean()` thenable needed) → fixed mock → confirmed all 16 green.
- Refactored the single direct-email site in `app/actions/communication/communication-actions.ts:80` to call `NotificationService.send` with the order-confirmation template, passing the existing email send as the fallback closure.
- Ran the full gate set: `tsc --noEmit` clean, full vitest 917 / 4 skip / 0 fail (+16 new), eslint scoped (0 errors; 1 intentional console-statement warning for v1 observability), semgrep 0 findings, npm audit 0 high/critical.
- Wrote this evidence pack + the release ticket.
- Updated `compliance/RTM.md` with the REQ-054 row.

## What the human did

- Reviewed and approved the implementation plan ("Proceed as planned (Recommended)").
- Will review the integration PR + the release PR, then exercise the portal UAT four-eyes step and Production approval.

## Risk-tier compliance

- MEDIUM-risk change → plan-approval offered + granted before any code was written (matches `feedback_sdlc_impl_plan_review`).
- Tests written before implementation (matches `feedback_tests_before_push`).
- All gates run locally before push (matches `feedback_wait_for_ci` intent).
- Single bundled PR per `feedback_single_pr_default`.
- E2E gate honoured the `project_e2e_targeted_until_117` policy — no full regression dispatched; unit boundary is load-bearing for this REQ.
