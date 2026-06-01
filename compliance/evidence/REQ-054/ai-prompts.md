# REQ-054 — AI prompts log

**Date:** 2026-06-01

## Session prompts (user → AI)

1. `pick up WA-4 as REQ-053` (prior session, established the consent fields REQ-054 reads).

2. `yes` (in response to "Want me to plan it as REQ-054?")
   - Triggered the SDLC implementation cycle for WA-2 as a new tracked requirement REQ-054.

3. _(AI surfaced workflow decision + implementation plan with ACs, technical approach, STRIDE.)_

4. `Proceed as planned (Recommended)`
   - Plan approval at the MEDIUM-risk gate. AI proceeded with TDD-first implementation.

## Internal AI prompts (orchestrator → sub-skills)

No sub-skills were invoked for REQ-054. The work is server-side only (new service + template map + one caller refactor); no E2E author work added (the orchestrator surface is unit-boundary-covered; no incremental e2e signal for the WA-disabled / template-unapproved fallback path which matches today's UX). `sdlc-implementer` ran end-to-end; `e2e-test-engineer` was not invoked.

## Decision points

- **Per-channel closure shape vs single payload object** — Chose per-channel closures (`email: () => Promise<void>`, `sms: () => Promise<{ success }>`) over a single normalised payload because each channel today has a different content shape and consolidating would require a separate cross-channel ViewModel pass. The closure-presence-is-the-gate convention keeps each caller's content authoring local to where it makes sense.
- **`opts.category` override** — Kept as a power-caller affordance with a documented Tampering note (could be misused to bypass marketing consent). Default is the static `TEMPLATE_CATEGORIES` map; tests cover both paths. No in-tree caller uses the override in v1.
- **v1 logging is `console.log` only** — Persistent `NotificationLog` model deferred to WA-5. The structured `event: 'notification.attempt'` line is greppable in the meantime.
- **Caller refactor scope minimal** — Only swapped the one direct-email site in `communication-actions.ts:80`. Other senders (verification-PIN, support emails, rewards emails) stay on direct channel paths; will adopt NotificationService naturally when their content paths are next touched.
- **Mongoose `.lean()` chainable mock** — Test mock pattern follows the existing convention in `tab-service.tip.test.ts` (returned object is both chainable and thenable). One iteration was needed to fix this after the first test pass.

## Audit cross-refs

- Parent backlog: #117 (`WA-2`).
- Direct dependency: REQ-053 (`whatsappTransactional` / `whatsappMarketing` schema fields).
- Will be consumed by: WA-5 (persistent log), WA-6 (WhatsApp-aware receipt), P0 #5 (communication preferences enforced).
- Project memory honoured: `feedback_sdlc_impl_plan_review`, `feedback_tests_before_push`, `feedback_single_pr_default`, `feedback_grep_before_migration`, `project_e2e_targeted_until_117`.
