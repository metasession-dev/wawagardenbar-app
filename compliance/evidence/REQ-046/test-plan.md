# Test Plan — REQ-046

**Requirement:** REQ-046 — IG-1 cadence schema + IG-6 admin form fields
**Risk Level:** LOW
**Date:** 2026-05-25

## Test approach

Two layers:

1. **Unit (vitest)** — introspect the Mongoose schema directly to assert the new fields are registered with the expected types and validators. No DB needed; no behaviour-level test possible because no code reads the fields yet.
2. **Manual UAT** — open the admin rewards form, create + edit + re-open a rule, verify the cadence inputs save and rehydrate correctly. Verify legacy fields and transaction-trigger rules are unaffected.

## Unit test cases (`__tests__/services/reward-rule-cadence-schema.test.ts`)

| #   | Case                              | Assertion                                                                                                            |
| --- | --------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| 1   | `postsRequired` registered        | `RewardRuleModel.schema.path('socialConfig.postsRequired')` is defined, `instance === 'Number'`, `options.min === 1` |
| 2   | `windowDays` registered           | Same shape as #1 for `windowDays`                                                                                    |
| 3   | `requireMention` registered       | Path defined, `instance === 'Boolean'`, `options.default === true`                                                   |
| 4   | Legacy fields intact (regression) | All of `hashtag`, `minViews`, `maxPostsPerPeriod`, `periodType`, `pointsAwarded` remain present                      |

## Manual UAT script

1. Log in as super-admin on `https://wawagardenbar-app-uat.up.railway.app/dashboard/rewards`.
2. Click "Create rule" → set `triggerType: social_instagram` → fill the existing fields (hashtag, points, etc.) → scroll to the new **Cadence (optional)** subsection.
3. Set `Posts required: 3`, `Window (days): 7`, leave `Require @mention` on. Save.
4. Re-open the rule from the list. The three new fields must persist (`3`, `7`, mention-on).
5. Edit the rule, change `Posts required` to `5`, save, re-open. Persistence verified.
6. Create a second rule with `triggerType: transaction` (no socialConfig). Save. No Instagram card should render. Save succeeds. Regression check.
7. Edit a pre-existing social rule (one that pre-dates REQ-046). The new cadence inputs render but are blank. Save without changing them. The legacy fields persist unchanged. Regression check.

## Gates

- `npx tsc --noEmit` → 0 errors.
- `npx vitest run __tests__/services/reward-rule-cadence-schema.test.ts` → 4/4 green.
- Full suite (`npx vitest run`) → 813 pass / 4 skipped (delta: +4 from 809 baseline).
- CI on PR #124 (Quality Gates + Railway UAT build) → green.

## Pass criteria

- All vitest cases green.
- Manual UAT steps 4, 5, 6, 7 all succeed.
- No new tsc errors and no regressions in the full vitest suite.
