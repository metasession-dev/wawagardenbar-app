# REQ-057 — AI use note

**Date:** 2026-06-01
**Tool:** Claude Code (Opus 4.7) via project orchestrator.

## What the AI did

- **Pre-implementation survey** — surveyed `interfaces/reward.interface.ts`, `models/reward-rule-model.ts`, the existing IG-related test file `__tests__/services/reward-rule-cadence-schema.test.ts`, `app/actions/profile/profile-actions.ts`, and `components/features/profile/personal-info-tab.tsx` to map what already exists vs. what IG-1/IG-2 actually requires. **Discovery:** most of the surface is already implemented — `ISocialRewardConfig` already has `postsRequired` / `windowDays` / `pointsAwarded` / `requireMention` / `hashtag`; the IG handle input + adornment already exists; the leading-`@` strip already exists at the action layer. Scope shrunk from a guessed M-size to an actual S-size LOW-risk polish.
- **Authored** `compliance/plans/REQ-057/implementation-plan.md` with 6 ACs (defaults, paired-validity hook, regex, transform consolidation, copy update, tests-first), technical approach with diffs, STRIDE table, rollback. Presented for operator sanity-check; LOW risk so no formal plan-approval gate per `feedback_sdlc_impl_plan_review`, but called out two scope-shrink decisions (keep `hashtag` name; reuse `startDate`/`endDate` instead of new `campaignStart`/`campaignEnd` fields).
- **TDD red baselines** — wrote 7 new schema cases + 16 new zod cases before touching production code. Initial paired-validity tests used `validateSync()` and failed; **mongoose gotcha discovered**: `validateSync()` skips `pre('validate')` middleware. Converted to async `.validate()`; tests green.
- **Implementation**:
  - `models/reward-rule-model.ts`: added schema defaults `postsRequired: 3` / `windowDays: 7`; added `rewardRuleSchema.pre('validate', ...)` paired-validity hook.
  - `app/actions/profile/profile-actions.ts`: exported new `instagramHandleSchema` zod pipe (transform strip-`@`-and-trim + refine IG-character-set); replaced inline schema reference; removed manual `cleanHandle = handle.startsWith('@') ? handle.substring(1) : handle` block (now done by the zod transform).
  - `components/features/profile/personal-info-tab.tsx`: imported `instagramHandleSchema` from the action module; replaced the local `.max(30)` validator with the shared pipe; updated explainer copy from "Add your Instagram handle to participate in social rewards!" to "Required to earn points on Instagram tagging campaigns — we use this to match your tags to your account."
- **Gates** — full vitest 989 pass / 4 skip / 0 fail (+19 from REQ-056 baseline); tsc 0 errors; eslint 0 errors on 5 changed files; semgrep ERROR-severity 0 findings on 3 source files; npm audit 0 high/critical.
- **Commit + push + PR #236** — `feat(rewards,profile): instagram cadence defaults + handle validation [REQ-057]`. First commit attempt rejected by commit-msg hook (uppercase "IG" in subject); fixed by lowercasing.
- **Phase 3 evidence pack assembled BEFORE the release PR this cycle**, per the new `feedback_phase3_release_ticket_mandatory` memory saved at the end of REQ-056. This is the explicit fix for REQ-056's order-of-operations bug (release PR opened before release ticket existed → portal couldn't make the release reviewable).
- **Updated** `compliance/RTM.md` with the REQ-057 row.

## What the human did

- Asked for IG-1+IG-2 as REQ-057 ("go this PR before proceeding" referring to PR #235 — the DevAudit 0.1.29 sync that landed the upstream fixes I filed in REQ-056 cycle's #95 + #96; then "yes" to merge #235 + start REQ-057).
- Reviewed and acknowledged the scope-shrink discovery (no objection to keeping `hashtag` name, reusing top-level dates).
- Merged PR #235 (devaudit 0.1.29 sync) and PR #236 (REQ-057 integration).
- Will perform Phase 4 portal UAT approval + Phase 5 Production approval after CI green on develop.

## Risk-tier compliance

- LOW risk → no formal plan-approval gate required per `feedback_sdlc_impl_plan_review`; scope-shrink + plan presented for sanity-check anyway.
- Tests written before implementation per `feedback_tests_before_push` (red baseline confirmed locally before commit).
- All gates run locally before push per `feedback_wait_for_ci`.
- Single bundled PR per `feedback_single_pr_default` (production code + RTM + plan + tests in PR #236; evidence pack split into PR #237 [this one] per Phase 3 sequencing).
- E2E policy honoured per `project_e2e_targeted_until_117` — no full regression dispatched; unit boundary is load-bearing.
- Phase 3 evidence pack lands BEFORE release PR per the new `feedback_phase3_release_ticket_mandatory` memory.
- No `--no-verify`. PR titles use `[REQ-XXX]` brackets per `feedback_pr_title_req_brackets`.

## REQ-056 → REQ-057 lessons-learned applied

| REQ-056 issue                                                                                                              | REQ-057 prevention                                                                                                                                                                                                                             |
| -------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Phase 3 release ticket missing on portal → release PR blocked → Phase 3 catch-up PR needed                                 | Phase 3 evidence pack landed BEFORE release PR this cycle (this PR #237 lands first)                                                                                                                                                           |
| Vitest CVE published mid-cycle → CI dep-audit failed → upload-evidence skipped → "Missing gates" on portal                 | Pre-emptively bumped to vitest 4.1.x in PR #230; no new CVEs surfaced this cycle. DevAudit-Installer #96 (upload-on-failure) landed in v0.1.29 sync PR #235, so even if it had surfaced, evidence would have uploaded with `gateStatus=failed` |
| Chore commit (vitest bump) between integration + release PRs → attribution flipped to bare-date → re-attribution PR needed | DevAudit-Installer #95 (RTM step-4-bis) landed in v0.1.29 — derive-release-version.sh now scans RTM for IN PROGRESS rows as fallback. REQ-057 is the only IN PROGRESS row, so even an unrelated chore commit would attribute correctly         |
