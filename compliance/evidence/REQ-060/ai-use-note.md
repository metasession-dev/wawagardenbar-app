# REQ-060 — AI use note

**Date:** 2026-06-02
**Tool:** Claude Code (Opus 4.7) via project orchestrator.

## What the AI did

- **Pre-implementation survey** — read the existing `app/(customer)/profile/rewards/page.tsx` (the existing `Promise.all` block at line 29; the statistics-cards section; the page's overall layout); the existing `services/instagram-service.ts` (REQ-059's `processQualifyingPost` + the `RewardRuleModel`/`InstagramPostCreditModel` imports already in place); the existing `components/ui/progress.tsx` (shadcn `Progress` — client component, but safe to embed inside a server component as a client island). Confirmed all dependencies were in place.
- **Authored** `compliance/plans/REQ-060/implementation-plan.md` with 7 ACs, STRIDE assessment, rollback. LOW risk → no formal plan-approval gate per `feedback_sdlc_impl_plan_review`.
- **TDD red baselines** — wrote 7 cases (one extra over the planned 6 — `rules-exist-but-none-currently-active`, exercising the `isCurrentlyActive()` filter explicitly). Used a `makeRule()` factory + `withExec()` helper to compose the mocked `.find().exec()` chain cleanly.
- **Implementation**:
  - Added `UserCampaignProgress` interface export at the top of `services/instagram-service.ts` (mirrors the REQ-059 `ProcessQualifyingPostArgs` / `ProcessQualifyingPostAction` exports — consistent module shape).
  - Added `static async getActiveCampaignsForUser(userId)` method on `InstagramService`. Outer try/catch returns `[]` on DB failure (defensive read-side pattern). Inner loop iterates rules, counts pending credits per rule, builds the result array.
  - Created `components/features/rewards/instagram-campaign-card.tsx` as a server component (no `'use client'`). Renders `null` on empty array; iterates campaigns otherwise. Uses shadcn `<Progress>` for the visual bar.
  - Wired into `app/(customer)/profile/rewards/page.tsx`: added two imports, extended the `Promise.all` with the aggregator call, rendered the card after the header and before the statistics block.
- **Gates** — full vitest 1014 / 4 skip / 0 fail (+7 from REQ-059 baseline of 1007); tsc 0 errors; eslint 0 errors on 4 changed files (6 carry-forward `no-console` warnings on pre-existing v1 observability lines in `services/instagram-service.ts`); semgrep ERROR-severity 0 findings on 2 source files; npm audit 0 high/critical.
- **Commit + push + PR #250** — `feat(rewards): instagram campaign progress card on customer rewards page [REQ-060]`. No commit-msg hook issues.
- **Phase 3 evidence pack assembled BEFORE the release PR** per `feedback_phase3_release_ticket_mandatory` — fourth consecutive cycle applying this lesson (REQ-057 → REQ-058 → REQ-059 → REQ-060).
- **Updated** `compliance/RTM.md` with the REQ-060 row.

## What the human did

- Asked for IG-7 as REQ-060 after REQ-059 closed cleanly. (The IG-7 → IG-4 → IG-7 ordering was: initial pick "IG-7 as REQ-059" → AI flagged the IG-4 dependency → re-scoped to "IG-4 as REQ-059" → now back to IG-7 as REQ-060 with the ledger in place.)
- Merged the integration PR #250.
- Will perform Phase 4 portal UAT approval + Phase 5 Production approval.

## Risk-tier compliance

- LOW risk → no formal plan-approval gate per `feedback_sdlc_impl_plan_review`; plan presented for context anyway.
- Tests written before implementation per `feedback_tests_before_push` (7 red cases confirmed locally before commit).
- All gates run locally before push per `feedback_wait_for_ci`.
- Single bundled PR per `feedback_single_pr_default` (production + RTM + plan + tests in PR #250; evidence pack in PR #251 per Phase 3 sequencing).
- E2E policy honoured per `project_e2e_targeted_until_117` — no full regression dispatched; unit + manual-UAT boundary is load-bearing.
- Phase 3 evidence pack lands BEFORE release PR per `feedback_phase3_release_ticket_mandatory`.
- No `--no-verify`. PR titles use `[REQ-XXX]` brackets per `feedback_pr_title_req_brackets`.

## Cycle hygiene — fourth consecutive clean cycle

The REQ-057 → REQ-058 → REQ-059 → REQ-060 chain has been the cleanest stretch of the project:

- Phase 3 BEFORE release PR — applied every time.
- Clean `[REQ-XXX]` step-3 attribution — zero re-attribution PRs needed.
- No CVE blocks — the REQ-056 vitest bump is still holding.
- No commit-msg case violations after the REQ-057 "uppercase IG" fix.
- Mongoose `validateSync()` gotcha (REQ-057) hasn't recurred because subsequent cycles either don't use pre-validate middleware or know to use `.validate()` async.

## Decision points worth recording

- **Server component with embedded client island** — `<InstagramCampaignCard>` is a server component but imports shadcn `<Progress>` which is a client component. Next.js handles this transparently; the card itself doesn't need `'use client'` because the only client-needed feature is the Progress bar's animation, which is naturally a client island.
- **Silent empty state** — `if (campaigns.length === 0) return null;` rather than showing "no active campaigns". Customers without an active IG campaign should see no IG-related clutter at all. The "Types of Rewards Available" card below already has its own empty state for when there are zero rules of any kind.
- **`UserCampaignProgress` shape includes `pointsAwarded` despite the customer not yet earning anything** — the campaign config IS the value proposition ("Earn 100 points") so it must surface even at progress 0.
- **`Promise.all` ordering** — added the aggregator as the 7th element, preserving the destructure order of the original 6 + 1 new at the end. Existing array indices unaffected.
- **No component test** — server-component RTL + Next 16 is non-trivial and the JSX has one conditional branch (`campaigns.length === 0`). Manual UAT covers it; the LOAD-bearing test is the service aggregator. Documented in `test-scope.md`'s out-of-scope.
- **Defensive aggregator returning `[]` on DB failure** — explicit AC6. Without it a Mongo glitch during page load would 500 the entire rewards page, not just the IG card. Same defensive read-side pattern other services use for non-critical features.
