# Implementation Plan — REQ-046

**Requirement:** REQ-046 — IG-1 cadence schema + IG-6 admin form fields
**Risk Level:** LOW
**Implementation PR:** [#124](https://github.com/metasession-dev/wawagardenbar-app/pull/124)
**Date:** 2026-05-25

## Context

Issue [#117](https://github.com/metasession-dev/wawagardenbar-app/issues/117) defines an **IG band** for configurable Instagram engagement campaigns ("post N times in W days, earn X points"). The Meta Graph API integration to auto-detect qualifying posts already exists in skeleton form (`services/instagram-service.ts:processInstagramRewards()` + `RewardRule.triggerType: 'social_instagram'`). What's missing across IG-1 through IG-8: cadence fields, admin UI exposure, polling-job specifics, scheduling, customer-side surface, WhatsApp notification on award.

This REQ ships the smallest coherent slice — the schema fields + admin-form inputs — so operators can author cadence-based campaigns today even though the processor that consumes them doesn't run yet. Per the IG-band recommended sequence on issue #117.

## Scope

Three new optional fields on `ISocialRewardConfig`:

- `postsRequired: number` (min 1) — qualifying posts to trigger one award
- `windowDays: number` (min 1) — rolling window in days
- `requireMention: boolean` (default `true`) — post must @-mention the bar's IG Business account

Plus matching admin-form inputs inside a new dashed-border "Cadence (optional)" subsection in the Instagram card on `/dashboard/rewards`.

**Explicitly out of scope:**

- The polling job that reads the new fields (IG-3 / IG-4 / IG-5 — separate REQ).
- Customer-side surface (IG-7 — separate REQ).
- WhatsApp notification on award (IG-8 — separate REQ).
- Customer IG handle capture (IG-2 — already exists at `personal-info-tab.tsx:156`).

## Files changed

| File                                                          | Change                                                                                    |
| ------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `interfaces/reward.interface.ts`                              | Add `postsRequired?`, `windowDays?`, `requireMention?` to `ISocialRewardConfig` interface |
| `models/reward-rule-model.ts`                                 | Add same three fields to the `socialConfig` Mongoose schema                               |
| `components/features/admin/rewards/reward-rule-form.tsx`      | Extend Zod form schema + `initialData` hydration + render three new inputs                |
| `__tests__/services/reward-rule-cadence-schema.test.ts` (new) | 4 schema-introspection vitest cases                                                       |

## Coexistence with legacy `socialConfig` fields

The model already had `maxPostsPerPeriod`, `periodType`, `pointsAwarded`, `hashtag`, `minViews`, `platform`. They have different semantics from the new cadence fields:

- **Legacy** `maxPostsPerPeriod` / `periodType` = **cap on repeat awards** within a calendar bucket (weekly / monthly / campaign-duration).
- **New** `postsRequired` / `windowDays` = **threshold to trigger** one award via a rolling window.

Both can coexist in a rule. The interface JSDoc documents this. The polling job (future REQ) will combine them: "fire one award per `postsRequired` posts in any rolling `windowDays`, capped at `maxPostsPerPeriod` awards per `periodType`."

## Reused primitives

- `RewardRule.triggerType: 'social_instagram'` enum value (already existed).
- `RewardRule.socialConfig.platform: 'instagram'` enum (already existed; hidden input in form preserved).
- `RewardRuleForm` Zod + react-hook-form scaffolding (already wired; just extended).

## Risk classification rationale (LOW)

- Additive schema; all three new fields are `optional`. No migration needed for existing documents.
- Legacy fields untouched.
- No code reads the new fields yet (deferred to follow-up REQ), so behaviour on existing rules is identical.
- Admin form change is purely additive; new subsection visible but skippable.
- No financial calc, no access control, no data-handling change.
- No customer-visible surface change.

## AI use

See `ai-prompts.md` and `ai-use-note.md`.
