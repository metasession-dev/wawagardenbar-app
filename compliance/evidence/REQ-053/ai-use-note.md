# REQ-053 — AI use note

**Date:** 2026-05-31
**Tool:** Claude Code (Opus 4.7) via project orchestrator.

## What the AI did

- Read #117 to identify the recommended next item (WA-4) and mapped the existing surface: `IPreferences.communicationPreferences`, `models/user-model.ts:preferencesSchema`, `lib/whatsapp.ts`, `preferences-tab.tsx`, the three `verify-*-pin.ts` actions, and the login-form flow.
- Authored the implementation plan (`compliance/plans/REQ-053/implementation-plan.md`) with full ACs, technical approach, STRIDE table, dependencies, rollback, and test scope. Presented for plan review per `feedback_sdlc_impl_plan_review` MEDIUM-risk gate.
- After plan approval: wrote `__tests__/models/user-model.preferences.test.ts` (4 cases) as the TDD red baseline → confirmed red → implemented the schema + interface change → confirmed green.
- Wrote `__tests__/actions/auth/verify-pin-opt-in.test.ts` (4 cases) → confirmed red → implemented the verify-pin changes → confirmed green.
- Mirrored the same gated `user.set` write in `verify-whatsapp-pin.ts` and `verify-email-pin.ts`.
- Added `isNewUser` to `send-email-pin.ts` (gap relative to send-pin / send-whatsapp-pin which already had it).
- Extended `preferences-tab.tsx` zod schema + form defaults + two new Switches; extended the server-side zod schema in `profile-actions.ts` with optional fields + a normalisation step.
- Threaded `isNewUser` from the send-pin responses through to render the PIN-entry Checkbox in `login-form.tsx` only for new users; passed the `optIn` payload through to the three verify-pin actions.
- Ran the full gate set: `tsc --noEmit` (clean), full vitest (901/4/0), eslint scoped (0 errors), semgrep (0 findings), npm audit (0 high/critical).
- Wrote this evidence pack + the release ticket.
- Updated `compliance/RTM.md` with the REQ-053 row.

## What the human did

- Reviewed and approved the implementation plan ("Yes — proceed with REQ-053 as planned").
- Will review the integration PR, the release PR, and perform the portal UAT four-eyes step + Production approval.

## Risk-tier compliance

- MEDIUM-risk change → plan-approval offered + granted before any code was written (matches `feedback_sdlc_impl_plan_review`).
- Tests written before each implementation step (matches `feedback_tests_before_push`).
- All gates run locally before push (matches `feedback_wait_for_ci` intent).
- Single bundled PR per `feedback_single_pr_default` (no separate test/impl PRs).
