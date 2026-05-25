# Release Ticket: REQ-046 — IG-1 cadence schema + IG-6 admin form fields

**Status:** TESTED - PENDING SIGN-OFF
**Date:** 2026-05-25
**Requirement ID:** REQ-046
**Risk Level:** LOW
**GitHub Issue:** [#117](https://github.com/metasession-dev/wawagardenbar-app/issues/117) (IG band, items IG-1 + IG-6)
**Implementation PR:** [#124](https://github.com/metasession-dev/wawagardenbar-app/pull/124)
**Release PR:** Will be linked when the develop → main PR is created
**DevAudit Release:** `https://devaudit.metasession.co/projects/wgb/` (release version `REQ-046`)

---

## Summary

First slice of issue #117's **IG band** — Instagram engagement campaigns configured from rewards management. Adds the schema + admin-form scaffolding so operators can author "3 posts in 7 days earns 100 points" style campaigns today. The Meta Graph API polling job that consumes the new fields (IG-3 / IG-4 / IG-5) ships in a follow-up REQ. **No customer-visible effect** until that lands — this REQ is purely additive schema + UI.

## AI Involvement

- **AI Tool Used:** Claude Opus 4.7 via Claude Code (CLI)
- **AI-Generated Changes:** `interfaces/reward.interface.ts` (three new optional fields on `ISocialRewardConfig`), `models/reward-rule-model.ts` (matching Mongoose paths), `components/features/admin/rewards/reward-rule-form.tsx` (Zod schema + form inputs), `__tests__/services/reward-rule-cadence-schema.test.ts` (4 schema-introspection cases), all REQ-046 compliance markdown. See `compliance/evidence/REQ-046/ai-prompts.md` and `compliance/evidence/REQ-046/ai-use-note.md`.
- **Human Reviewer:** Stage 3 `dual_actor` approver (independent of submitter).

## Implementation Details

Three new optional fields on `ISocialRewardConfig`:

- `postsRequired: number` (min 1) — qualifying posts to trigger one award.
- `windowDays: number` (min 1) — rolling window in days.
- `requireMention: boolean` (default `true`) — qualifying post must @-mention the bar's IG Business account.

The legacy `socialConfig` fields (`maxPostsPerPeriod`, `periodType`, `pointsAwarded`, `hashtag`, `minViews`, `platform`) are untouched and continue to work. New + legacy fields have distinct semantics (legacy = cap on repeat awards per calendar bucket; new = threshold to trigger one award per rolling window) documented in the interface JSDoc.

Admin form (`reward-rule-form.tsx`) gets a new dashed-border "Cadence (optional)" subsection inside the existing Instagram card, exposing the three fields with a brief explainer. Existing inputs unchanged.

Customer-side IG handle capture (IG-2) was already in place at `components/features/profile/personal-info-tab.tsx:156` so it is not part of this REQ.

## Verification

- **Unit (vitest)** — 4 new cases on the schema (`__tests__/services/reward-rule-cadence-schema.test.ts`) introspect that the new paths are registered with the right types/validators + a regression check on the legacy fields. All green.
- **Full suite** — `npx vitest run` → 813 pass / 4 skipped (was 809; +4 from new file). No collateral regressions.
- **Type check** — `npx tsc --noEmit` clean.
- **CI** — PR #124 expected to pass `ci.yml` Quality Gates and the Release Approval Gate (after DevAudit approval is captured).
- **Manual UAT** — to be executed by maintainer after merge to develop and UAT deploy. Steps documented in `compliance/evidence/REQ-046/test-plan.md` (create a `social_instagram` rule with the new cadence inputs, confirm save + re-hydrate; regression on transaction-trigger and legacy social rules).

## Residual Risk

None. Additive schema with optional fields; no migration needed for existing documents. No code reads the new fields yet (deferred to IG-3 / IG-4 / IG-5), so behaviour on existing rules is identical pre- and post-deploy.

## Out of Scope (Deferred to Follow-Up REQs)

- IG-3 — Meta Graph API mention/tag polling.
- IG-4 — Sliding-window `InstagramPostCredit` ledger + award trigger.
- IG-5 — Scheduling the existing `processInstagramRewards()` job.
- IG-7 — Customer-facing "Earn points on Instagram" card.
- IG-8 — WhatsApp notification on award.

---

## Compliance Note

REQ-046 is the first REQ to ship under the re-onboarded DevAudit SDLC flow post-batch-2 (per `compliance/risk-register.md` R-001). PR #124 was originally opened on 2026-05-25 without REQ tagging because of a stale assistant memory; RTM + evidence pack + this release ticket are being added in follow-up commits so the gated flow can run normally.
