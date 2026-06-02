# REQ-060 — Customer-facing Instagram campaign progress card

**Requirement ID:** REQ-060
**Risk Level:** LOW
**GitHub Issue:** [#117 IG-7](https://github.com/metasession-dev/wawagardenbar-app/issues/117)
**Date:** 2026-06-02

## Context

REQ-059 introduced `InstagramPostCredit` as the canonical ledger for IG-campaign cadence: one row per `(userId, ruleId, postId)`, status `pending` until the sliding-window threshold is reached, then `awarded`. The scheduler ticks `processInstagramRewards` hourly (REQ-058), so the ledger now reflects real customer activity.

What's still missing — and what IG-7 closes — is the customer-facing surface. Today a customer who's tagged the bar 2 of 3 times in a 7-day window has no way to see their progress; they only see the points eventually credited to their account. IG-7 adds a card on `/profile/rewards` that reads from the ledger and renders "Tag @wawagardenbar 3 times this week to earn 100 points. Your progress: 1/3."

## Acceptance criteria

1. **AC1 — `InstagramService.getActiveCampaignsForUser(userId)` aggregator** — new public-static method returns `Array<UserCampaignProgress>` where:

   ```ts
   interface UserCampaignProgress {
     ruleId: string;
     ruleName: string;
     hashtag: string;
     postsRequired: number;
     windowDays: number;
     pointsAwarded: number;
     currentProgress: number; // count of pending credits in window
   }
   ```

   Per call: loads active social_instagram rules (`isActive: true, triggerType: 'social_instagram'`); filters to currently-active (start/end date / `campaignDates` array check via `isCurrentlyActive()`); for each surviving rule, counts the user's `pending` `InstagramPostCredit` rows where `postedAt >= now - windowDays`. Returns `[]` when no active campaigns.

2. **AC2 — Pending-only progress** — `currentProgress` counts only `status: 'pending'` credits. Already-awarded credits (the customer already collected a reward for that batch) don't appear in the toward-next-award count. Same invariant REQ-059's window-count uses.

3. **AC3 — Sliding-window filter** — credits older than `now - windowDays * 24 * 60 * 60 * 1000` don't count. Posts from before the window naturally roll out as time advances.

4. **AC4 — `InstagramCampaignCard` server component** — `components/features/rewards/instagram-campaign-card.tsx` accepts `campaigns: UserCampaignProgress[]`. When `campaigns.length === 0`: renders `null` (silent empty state — no clutter for customers without active campaigns). When non-empty: renders one block per campaign with:
   - `<CardTitle>` "Earn {pointsAwarded} points on Instagram"
   - Subtext: "Tag {hashtag-display} {postsRequired} times in {windowDays} days"
   - `<Progress value={(currentProgress / postsRequired) * 100}>` (shadcn `Progress` component, already in repo)
   - Counter: "Your progress: {currentProgress}/{postsRequired}"

5. **AC5 — Customer rewards page integration** — `app/(customer)/profile/rewards/page.tsx`: adds `InstagramService.getActiveCampaignsForUser(session.userId)` to the existing `Promise.all` block (line ~31). Renders `<InstagramCampaignCard campaigns={igCampaigns} />` near the top of the page, after the statistics cards block but before the tabs.

6. **AC6 — `getActiveCampaignsForUser` failure mode** — if the DB lookup fails, the method `console.error`s and returns `[]`. The customer page should never crash because the IG aggregator went wrong (matches the project's defensive read-side pattern for non-critical features).

7. **AC7 — Tests** — service aggregation cases per AC6 in test scope below.

## Technical approach

### 1. `services/instagram-service.ts` (~50 LOC added)

Add at the bottom of the class:

```ts
export interface UserCampaignProgress {
  ruleId: string;
  ruleName: string;
  hashtag: string;
  postsRequired: number;
  windowDays: number;
  pointsAwarded: number;
  currentProgress: number;
}

// inside InstagramService:
static async getActiveCampaignsForUser(
  userId: string
): Promise<UserCampaignProgress[]> {
  try {
    const rules = await RewardRuleModel.find({
      isActive: true,
      triggerType: 'social_instagram',
      'socialConfig.platform': 'instagram',
    }).exec();

    const activeRules = rules.filter((r) =>
      (r as { isCurrentlyActive?: () => boolean }).isCurrentlyActive?.()
    );
    if (activeRules.length === 0) return [];

    const results: UserCampaignProgress[] = [];
    for (const rule of activeRules) {
      const sc = rule.socialConfig;
      if (!sc) continue;
      const postsRequired = sc.postsRequired ?? 3;
      const windowDays = sc.windowDays ?? 7;
      const pointsAwarded = sc.pointsAwarded ?? 0;
      const windowStart = new Date(Date.now() - windowDays * DAY_MS);

      const pending = await InstagramPostCreditModel.countDocuments({
        userId,
        ruleId: rule._id,
        status: 'pending',
        postedAt: { $gte: windowStart },
      });

      results.push({
        ruleId: (rule._id as Types.ObjectId).toString(),
        ruleName: rule.name,
        hashtag: sc.hashtag ?? '',
        postsRequired,
        windowDays,
        pointsAwarded,
        currentProgress: pending,
      });
    }
    return results;
  } catch (error) {
    console.error(
      '[InstagramService] getActiveCampaignsForUser failed:',
      error
    );
    return [];
  }
}
```

### 2. `components/features/rewards/instagram-campaign-card.tsx` (new, ~70 LOC)

Server component (no `'use client'`). Imports `Card`, `CardContent`, `CardHeader`, `CardTitle`, `Progress` from shadcn. Renders nothing on empty array; otherwise iterates campaigns.

### 3. `app/(customer)/profile/rewards/page.tsx` (~5 LOC change)

Add the aggregator to the `Promise.all`; render the card after the statistics block.

### 4. No env vars, no new packages, no DB migration

shadcn `Progress` is already in repo from prior REQ work (verify before writing).

## Tests (TDD — written before implementation)

### `__tests__/services/instagram-service.campaigns.test.ts` (~6 cases)

- AC1 — no active rules → returns `[]`.
- AC1 — one active rule with 0 user pending → returns `[{ currentProgress: 0 }]`.
- AC2 — one active rule with 2 user pending in window → returns `[{ currentProgress: 2 }]`.
- AC3 — credits older than `windowDays` are excluded by the query filter (assert on filter shape).
- AC1 — multiple active rules → returns array with one entry per rule.
- AC6 — DB query rejects → method returns `[]` and `console.error` called.

## Dependencies

- REQ-057 — `socialConfig.postsRequired` / `windowDays` defaults ✅
- REQ-058 — scheduler ticks the processor so credits accumulate ✅
- REQ-059 — `InstagramPostCredit` model with pending/awarded state ✅
- Existing `RewardRule.isCurrentlyActive()` instance method ✅
- Existing shadcn `Progress` component (`components/ui/progress.tsx`) — to be verified
- No new packages, no env vars, no DB migration

## Security considerations

### STRIDE

| Cat   | Risk introduced? | Rationale / mitigation                                                                                                                                                                                                                    |
| ----- | ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **S** | No               | Aggregator scoped by session.userId at the page layer; service uses the passed userId in the filter                                                                                                                                       |
| **T** | No               | Read-only query; no write path                                                                                                                                                                                                            |
| **R** | No               | No state change                                                                                                                                                                                                                           |
| **I** | Low              | Exposes the customer's own progress count + the public campaign config (hashtag, postsRequired, pointsAwarded). No cross-user data leakage by construction (filter is `userId: <session.userId>`)                                         |
| **D** | Low              | Per page-load: 1 RewardRule query (indexed by isActive + triggerType) + N countDocuments where N = active campaigns (typically 1–2). Compound index `(userId, ruleId, postedAt: -1)` from REQ-059 makes each countDocuments an index scan |
| **E** | No               | No role/permission change                                                                                                                                                                                                                 |

### Privacy / regulatory

- No new PII collected. Progress count is the customer's own data.

### Four-eyes attestation

- **Submitter:** Claude Code (AI tool) via project orchestrator.
- **Reviewer:** ostendo-io (solo-operator dual-actor interpretation per DevAudit-Installer issue #89 gap 10).

## Rollback plan

`git revert <merge-sha>`. The card disappears from `/profile/rewards`. The unused service method remains in the revert window as dead code (harmless). No data migration to roll back.

## Test scope

| Gate                            | Expected                                                               |
| ------------------------------- | ---------------------------------------------------------------------- |
| `npx tsc --noEmit`              | exit 0                                                                 |
| `npx vitest run`                | 0 failures; +~6 new cases                                              |
| `npx eslint <changed>`          | 0 errors                                                               |
| `semgrep scan --severity=ERROR` | 0 new findings                                                         |
| `npm audit --audit-level=high`  | 0 high/critical                                                        |
| E2E focused                     | n/a — read-only customer surface; per `project_e2e_targeted_until_117` |

## Plan deviation log

(populated during implementation if anything diverges from the above)
