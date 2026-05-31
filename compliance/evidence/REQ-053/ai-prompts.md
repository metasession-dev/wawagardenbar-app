# REQ-053 — AI prompts log

**Date:** 2026-05-31

## Session prompts (user → AI)

1. `whats next on #117`
   - AI surveyed #117 backlog, identified completed items (P0 #1–4 + #6, all RELEASED via REQ-048/049/050 + recent commit), surfaced WA-1 + WA-4 as the recommended first cut.

2. `pick up WA-4 as REQ-053`
   - Triggered the SDLC implementation cycle for WA-4 as a new tracked requirement REQ-053.

3. _(AI surfaced workflow decision + implementation plan with ACs, technical approach, STRIDE.)_

4. `Proceed as planned (Recommended)`
   - Plan approval at the MEDIUM-risk gate. AI proceeded with TDD-first implementation.

## Internal AI prompts (orchestrator → sub-skills)

No sub-skills were invoked for REQ-053. The work is server-action + UI-only, no E2E author work was added in this cycle (the e2e spec was scoped + deferred per `e2e_regression_suite` memory's provider-mock blocker). `sdlc-implementer` ran end-to-end; `e2e-test-engineer` was not invoked.

## Decision points

- **Two booleans vs one** — Chose two separate fields (`whatsappTransactional` + `whatsappMarketing`) over a single `whatsapp` boolean. Rationale: matches WA-2's likely template-level taxonomy (transactional templates vs marketing templates), avoids a second migration when WA-2 needs the split. Approved by the user at plan review.
- **First-verify gate** — Initially considered `!user.phoneVerified` (per channel); tightened to `!user.phoneVerified && !user.emailVerified` so a returning user verifying a _different_ channel doesn't have their existing prefs overwritten by a stale payload. Documented in `verify-pin.ts` comments.
- **`user.set` vs nested mutation** — Used Mongoose's `doc.set('a.b.c', value)` to avoid TS narrowing issues with possibly-undefined nested optional fields while still marking the path dirty for the next save.
- **Zod optional during rollout** — Server-side `preferencesSchema` accepts the two new fields as optional so older client builds keep validating. The action's normalisation layer defaults missing fields to `true` / `false` before persisting. This can be tightened to required once all clients ship the new build.

## Audit cross-refs

- Parent backlog: #117 (`WA-4`).
- Unblocks: WA-2 (NotificationService) + P0 #5 (communication preferences enforced on outbound).
- Sibling fix to: WA-1 (Meta template submission) — orchestrated by the user.
- Project memory honoured: `feedback_sdlc_impl_plan_review` (plan before code), `feedback_tests_before_push` (TDD red before green), `feedback_single_pr_default` (one bundled PR), `feedback_grep_before_migration` (mapped surface before edits).
