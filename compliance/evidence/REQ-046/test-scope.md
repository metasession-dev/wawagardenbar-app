# Test Scope — REQ-046

**Requirement:** REQ-046 — IG-1 cadence schema + IG-6 admin form fields
**Risk Level:** LOW
**GitHub Issue:** [#117](https://github.com/metasession-dev/wawagardenbar-app/issues/117) (IG band, items IG-1 + IG-6)
**Implementation PR:** [#124](https://github.com/metasession-dev/wawagardenbar-app/pull/124)
**Date:** 2026-05-25

## What changed

First slice of the IG band on issue #117. Pure **additive schema + UI** — no runtime behaviour change yet. Three new optional fields on `ISocialRewardConfig` describing a cadence-based award model ("N qualifying posts in W rolling days earns the configured points"), plus matching admin-form inputs so operators can author such campaigns. The Meta Graph API polling job (IG-3 + IG-4) that _consumes_ these new fields is deferred to a follow-up REQ — no code today reads `postsRequired`, `windowDays`, or `requireMention`.

## In scope (regression)

The four files touched:

- **Interface** — `interfaces/reward.interface.ts`: adds three optional fields to `ISocialRewardConfig`. Existing fields untouched.
- **Mongoose schema** — `models/reward-rule-model.ts`: adds three matching paths under `socialConfig` (validators + `requireMention` default `true`).
- **Admin form** — `components/features/admin/rewards/reward-rule-form.tsx`: extends the Zod form schema, the `initialData` hydration block, and adds three new inputs inside a dashed-border "Cadence (optional)" subsection within the existing Instagram card.
- **New vitest file** — `__tests__/services/reward-rule-cadence-schema.test.ts`: introspects the Mongoose schema to verify the new fields are registered with the right types/validators, plus a regression check that the legacy `socialConfig` fields are still present.

Plus the gates: `npx tsc --noEmit` (catches any interface/TS breakage) and the full vitest suite (catches collateral test regressions).

## Out of scope (deferred to follow-up REQs)

- **IG-3** — Meta Graph API mention/tag polling (no code reads the new fields yet).
- **IG-4** — Sliding-window `InstagramPostCredit` ledger + award trigger.
- **IG-5** — Scheduling the existing `InstagramService.processInstagramRewards()` job.
- **IG-7** — Customer-facing "Earn points on Instagram" card.
- **IG-8** — WhatsApp notification on award.
- **IG-2** — Customer IG handle capture; already in place at `components/features/profile/personal-info-tab.tsx:156`.

## Risk justification (LOW)

- Additive schema only. New fields are `optional` on the interface and have no validators that could reject pre-existing documents.
- Legacy fields (`maxPostsPerPeriod`, `periodType`, `pointsAwarded`, `hashtag`, `minViews`, `platform`) are completely untouched.
- No code in `services/` or `app/` reads the new fields yet, so behaviour on existing rules is identical.
- Admin form change is also additive — the new subsection appears below the existing inputs and can be left blank without effect.
