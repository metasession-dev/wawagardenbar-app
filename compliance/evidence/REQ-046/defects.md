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

## D3 — Blank cadence fields rejected; toast names only `socialConfig`

**Reported by:** maintainer, UAT smoke (2026-05-25)
**Symptom:** On `/dashboard/rewards/rules/new`, saving a `social_instagram` rule with the **Cadence (optional)** fields left blank fails with a red toast: *"Couldn't save: form has errors — Check the 'socialConfig' field."* The Cadence subsection's own help text tells operators to leave the fields blank for legacy one-award-per-post behaviour, so the rule is unsaveable by following the on-screen guidance.

**Root cause:** An empty number `<input>` submits `""` (not `undefined`). `z.coerce.number()` coerces `""` → `0` (`Number("") === 0`), so the original `postsRequired`/`windowDays` definition `z.coerce.number().int().min(1).optional()` fails `.min(1)` on the `0` — the `.optional()` branch only engages for `undefined`, never `""`. Confirmed empirically (`safeParse` of a blank-cadence social rule fails on `postsRequired` and `windowDays`). Separately, the D1 `onInvalid` toast read `Object.keys(validationErrors)[0]`, which for a nested error is the parent key `socialConfig`, hiding the real sub-field.

**Fix (this PR):**
- Added an `optionalCount` preprocessor in `reward-rule-form.tsx` that maps `"" | null | undefined → undefined` before `z.coerce.number().int().min(1).optional()`, and used it for `postsRequired` + `windowDays`. Blank now parses as omitted (not `0`); genuinely invalid values (`0`, negative, non-integer) are still rejected.
- Replaced the toast's top-level key lookup with a recursive `firstErrorPath()` helper that returns the dotted leaf path (e.g. `socialConfig.postsRequired`).
- Exported `formSchema` + `firstErrorPath` and added `__tests__/components/reward-rule-form-schema.test.ts` (7 cases): blank cadence parses + is omitted; valid `3/7` coerces to numbers; `0` and `2.5` rejected; nested-error path resolution.

**Severity:** MEDIUM (blocks the headline REQ-046 cadence feature when used as documented; no data loss). Client-side only — server schema already accepts `undefined` for the optional fields.

---

## D4 — `socialConfig.periodType` not persisted; blank-cadence save still blocked

**Reported by:** maintainer, UAT verification of the D3 fix (2026-05-25)
**Symptom:** On `/dashboard/rewards/rules/new`, saving a `social_instagram` rule with the Cadence fields left blank (the D3 scenario) still fails with a red toast: *"Couldn't save: form has errors — Check the 'socialConfig.periodType' field."* The D3 fix correctly unblocked the cadence count fields and the nested-path toast works, but a different field — Period Type — now surfaces as the blocker.

**Root cause:** The Period Type `<Select>` renders its value as `watch('socialConfig.periodType') || 'weekly'`, so the UI always *shows* "Weekly", but that fallback is display-only — it is never written into react-hook-form state. On a fresh rule an operator who accepts the shown default (never opens the select) submits `periodType: undefined`, which fails the required `z.enum(['weekly','monthly','campaign_duration'])`. This is the same class as D1 (`platform` shown but not in form state); D3's documented verification masked it by instructing the tester to set periodType manually. `periodType` is genuinely required per `ISocialRewardConfig` (it scopes the `maxPostsPerPeriod` repeat-award cap), so it must be persisted, not made optional.

**Fix (this PR):**
- Changed the schema field to `z.enum([...]).default('weekly')` in `reward-rule-form.tsx`, so the displayed default is the value persisted on submit (zodResolver applies it) while an edited rule still loads its stored value first.
- Added a `periodType default (REQ-046 D4)` describe block to `__tests__/components/reward-rule-form-schema.test.ts` (3 cases): undefined → defaults to `weekly`; an explicit `monthly` is preserved (no clobber on edit); an invalid value is still rejected.

**Severity:** MEDIUM (blocks the same blank-cadence flow D3 targeted; no data loss). Client-side only.

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
9. **D3:** Set `triggerType: social_instagram`, fill the required fields, **leave all three Cadence fields blank**, click **Save**. Expect success (rule created with no cadence). Negative: enter `postsRequired: 0` → toast reads *"Check the 'socialConfig.postsRequired' field"* (nested path), not just `socialConfig`.
10. **D4:** Repeat step 9 but **do not open the Period Type select** (accept the shown "Weekly"). Click **Save**. Expect success — the rule persists with `periodType: weekly`. Before the fix this failed with *"Check the 'socialConfig.periodType' field"*.

## Suite at fix-PR push

- D1/D2 PR (#127): `npx vitest run` → 816 pass / 4 skipped (was 813; +3 on the action)
- D3 PR (#131): `npx tsc --noEmit` → clean; `npx vitest run` → 828 pass / 4 skipped (+7 new in `__tests__/components/reward-rule-form-schema.test.ts`)
- D4 PR (this branch): +3 cases in `__tests__/components/reward-rule-form-schema.test.ts` (periodType default); CI is the verification source (no local node_modules).
