# REQ-046 — Defects Log

**Requirement:** REQ-046 — IG-1 cadence schema + IG-6 admin form fields
**Date:** 2026-05-25

## D1 — `socialConfig.platform` not populated on a fresh `social_instagram` rule

**Reported by:** maintainer, UAT smoke
**Symptom:** Click **Save** on a new `social_instagram` rule (all required fields including the new cadence fields filled). Nothing happens — no toast, no redirect, no rule created.

**Root cause:** `<input type="hidden" {...register('socialConfig.platform')} value="instagram" />` doesn't reliably push the value into react-hook-form state for a fresh rule. `defaultValues.socialConfig` is `undefined` (no `initialData` on the New Rule page), and hidden inputs don't fire change events to sync the DOM `value` attribute back into form state. At submit time `socialConfig.platform` is `undefined`, which fails the form-level Zod check `z.enum(['instagram'])`. react-hook-form's `handleSubmit(onValid)` silently aborts on validation failure — there was no `onInvalid` toast — so the user saw a no-op.

**Fix (this PR):**
- Added a `useEffect` in `reward-rule-form.tsx` that calls `setValue('socialConfig.platform', 'instagram')` whenever `triggerType` becomes `social_instagram`. Mirrors the existing useEffect that forces `rewardType` to `loyalty-points` for the same trigger.
- Added an `onInvalid` callback on `handleSubmit` that surfaces the first failing field via a toast, so future client-side validation failures are visible instead of silent.

**Severity:** MEDIUM (blocked the feature end-to-end on UAT; no data loss).

---

## D2 — Server-side `rewardRuleSchema` silently strips `triggerType` and `socialConfig`

**Reported by:** maintainer, UAT smoke (uncovered while diagnosing D1)
**Symptom:** Even if D1 hadn't existed, a submitted `social_instagram` rule would have been persisted as `triggerType: 'transaction'` with no `socialConfig` — the server's Zod schema (`app/actions/admin/reward-rules-actions.ts`) didn't declare those fields, so they were silently stripped per Zod's default object behaviour. Pre-existing — affected `createRewardRuleAction` AND `updateRewardRuleAction`. Means the admin form has never successfully created a social rule.

**Root cause:** The server-side `rewardRuleSchema` (and the `baseSchema` inside the update action) were authored before `triggerType` / `socialConfig` were introduced on the model. Both schemas use plain `z.object({...})` which strips unknown keys by default.

**Fix (this PR):**
- Extended `rewardRuleSchema` in `createRewardRuleAction` with `triggerType`, `socialConfig` (incl. the new cadence fields per REQ-046), and `campaignDates`.
- Same extension applied to `baseSchema` inside `updateRewardRuleAction`.
- 3 new vitest cases in `__tests__/actions/admin/reward-rules-actions.social-instagram.test.ts` regression-test the create + update paths — they assert `socialConfig.postsRequired` / `windowDays` / `requireMention` reach the service layer.

**Severity:** MEDIUM (root cause behind the feature being undeliverable; pre-existing but exposed by REQ-046 UAT).

---

## Verification on UAT after the fix lands

1. Log in as super-admin → `/dashboard/rewards/rules/new`.
2. Set `triggerType: social_instagram`. Fill hashtag, minViews, maxPostsPerPeriod, periodType, pointsAwarded.
3. Fill Cadence: `postsRequired: 3`, `windowDays: 7`, leave `requireMention` on.
4. Click **Save**. Expect: success toast + redirect to `/dashboard/rewards/rules`.
5. Re-open the rule from the list. The three cadence fields persist (3, 7, on).
6. Edit, change postsRequired to 5, save, re-open. Persistence verified.
7. Create a `triggerType: transaction` rule (no socialConfig). Save succeeds (regression).
8. Negative case: try saving a `social_instagram` rule with hashtag blank. Expect a visible "Couldn't save: form has errors" toast (D1 surfacing fix), not silent no-op.

## Suite at fix-PR push

- `npx tsc --noEmit` → clean
- `npx vitest run` → 816 pass / 4 skipped (was 813; +3 new on the action)
