# REQ-059 — AI use note

**Date:** 2026-06-02
**Tool:** Claude Code (Opus 4.7) via project orchestrator.

## What the AI did

- **Pre-implementation survey** — read the existing `services/instagram-service.ts` carefully (the naive `hasProcessedPost` description-regex check at line 209-222, the `markPostAsProcessed` stub at line 224-233, the inline dedup-and-award block at line 130-148 inside `processRule`) and `lib/scheduled-jobs.ts` (REQ-058 hooks the tick). Confirmed the new ledger had to slot into `processRule`'s loop without breaking the mock-mode dev path (`mock_hashtag_id` + synthetic post).
- **Authored** `compliance/plans/REQ-059/implementation-plan.md` with 7 ACs, technical approach (model + service swap + tests), STRIDE table including a real partial-failure edge case (`updateMany` fails after award succeeds → double-award on next tick), threat model, rollback. Presented for plan approval per `feedback_sdlc_impl_plan_review` MEDIUM-risk gate.
- **TDD red baselines** — wrote 6 model cases + 10 service cases before touching production code. The model cases use `validateSync()` (no middleware involved). The service cases needed a new public-static `processQualifyingPost` method on `InstagramService` so the per-post ledger decision is directly testable without mocking the Graph API path. Also monkey-patched `InstagramService.hasProcessedPost` on the static class at test setup so the AC3 fallback path could be triggered without needing to mock `PointsTransactionModel`.
- **Implementation**:
  - `models/instagram-post-credit-model.ts`: Mongoose model with unique `postId`, compound `(userId, ruleId, postedAt)` index, `pending`/`awarded` enum, `awardedAt: null` default.
  - `services/instagram-service.ts`: extracted `processQualifyingPost` as a public static method returning an action-tag union type (`'skipped_already_seen' | 'inserted_legacy_fallback' | 'inserted_pending' | 'awarded' | 'award_failed'`). `processRule` simplified to delegate per-post via a single call. `hasProcessedPost` promoted from `private` to `public` (it's now the AC3 fallback that the new method calls). `markPostAsProcessed` stub removed entirely.
- **Gates** — full vitest 1007 / 4 skip / 0 fail (+16 from REQ-058 baseline of 991); tsc 0 errors; eslint 0 errors on 4 changed files (6 intentional `no-console` warnings on existing v1 observability lines); semgrep ERROR-severity 0 findings on 2 source files; npm audit 0 high/critical.
- **Commit + push + PR #245** — `feat(rewards): instagram post-credit ledger + sliding-window award trigger [REQ-059]`. No commit-msg hook issues.
- **Phase 3 evidence pack assembled BEFORE the release PR** per `feedback_phase3_release_ticket_mandatory` (third cycle now applying this lesson — REQ-057, REQ-058, REQ-059).
- **Updated** `compliance/RTM.md` with the REQ-059 row.

## What the human did

- Asked for IG-4 as REQ-059 after I flagged that IG-7 (their initial pick) depended on IG-4's ledger.
- **Approved the plan** at the MEDIUM-risk gate ("Approve as scoped (Recommended)"). Explicitly chose the AC3 legacy-fallback approach over a clean-break or eager backfill — the trade-off is a `hasProcessedPost` retire later, but no migration script today.
- Merged the integration PR #245.
- Will perform Phase 4 portal UAT approval + Phase 5 Production approval after CI green on develop.

## Risk-tier compliance

- MEDIUM risk → plan-approval offered + granted before any code was written (matches `feedback_sdlc_impl_plan_review`).
- Tests written before implementation per `feedback_tests_before_push` (16 red cases confirmed locally before commit).
- All gates run locally before push per `feedback_wait_for_ci`.
- Single bundled PR per `feedback_single_pr_default` (production + RTM + plan + tests in PR #245; evidence pack in PR #246 per Phase 3 sequencing).
- E2E policy honoured per `project_e2e_targeted_until_117` — no full regression dispatched; unit boundary is load-bearing.
- Phase 3 evidence pack lands BEFORE release PR per `feedback_phase3_release_ticket_mandatory`.
- No `--no-verify`. PR titles use `[REQ-XXX]` brackets per `feedback_pr_title_req_brackets`.

## REQ-058 → REQ-059 cycle hygiene

This is the third consecutive clean cycle (REQ-057 + REQ-058 + REQ-059). Carry-forwards:

- Phase 3 BEFORE release PR (third time applied).
- Clean `[REQ-XXX]` attribution (third time clean step-3 resolution).
- Vitest CVE bump (REQ-056 carry-forward) still holding — no dep churn.
- Mongoose `validateSync()` gotcha (REQ-057 carry-forward) — not applicable here, but the model tests use `validateSync()` because there's no `pre('validate')` middleware on `InstagramPostCredit`.
- DevAudit upstream fixes (#95 RTM-driven attribution, #96 upload-on-failure, #93 multi-scope CC_REGEX) — landed in 0.1.29 sync (PR #235); not exercised because gates passed cleanly.

## Decision points worth recording

- **Public-static `processQualifyingPost`** — extracted from `processRule` so it's directly testable. Alternative: keep inline, mock the full `processRule` machinery in tests — would require mocking `getHashtagId`, `getRecentMedia`, `RewardRuleModel.find`, etc. The extracted method gives a clean per-post test surface.
- **Action-tag union type** — `'skipped_already_seen' | 'inserted_legacy_fallback' | 'inserted_pending' | 'awarded' | 'award_failed'`. Tests assert on the action tag rather than on internal call counts alone; the tag is the public contract of the method.
- **AC3 legacy fallback inserts as `awarded` not `pending`** — preserves the invariant that "ledger awarded credits never cause re-award" via the `status: 'pending'` filter in `updateMany`. If we inserted as `pending`, the next window-count would include the legacy post and could trigger a duplicate award. `awarded` + `awardedAt = new Date()` is the right semantic.
- **Best-effort award + flip** — acknowledged in STRIDE that if `updateMany` fails after `awardSocialPoints` succeeds, the customer could double-award on next tick. Mitigation is operational (monitor row counts per window) rather than a Mongo transaction wrap. A future REQ can add the transaction; not load-bearing for v1 given how rarely `updateMany` on an indexed query fails.
- **`hasProcessedPost` promoted to public** — needed because `processQualifyingPost` calls it from the same class but with monkey-patched mock in tests. Cleaner alternative: extract `hasProcessedPost` to a standalone module so it can be mocked at the import boundary. Out-of-scope for v1; works fine as-is.
