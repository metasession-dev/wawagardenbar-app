# Release Ticket: REQ-046 — IG-1 cadence schema + IG-6 admin form fields

**Status:** TESTED - PENDING SIGN-OFF
**Date:** 2026-05-25 (last updated 2026-05-26)
**Requirement ID:** REQ-046
**Risk Level:** LOW
**GitHub Issue:** [#117](https://github.com/metasession-dev/wawagardenbar-app/issues/117) (IG band, items IG-1 + IG-6)
**Implementation PR:** [#124](https://github.com/metasession-dev/wawagardenbar-app/pull/124) (IG-1 schema + IG-6 form), followed by UAT defect fixes [#127](https://github.com/metasession-dev/wawagardenbar-app/pull/127) (D1+D2), [#131](https://github.com/metasession-dev/wawagardenbar-app/pull/131) (D3), [#133](https://github.com/metasession-dev/wawagardenbar-app/pull/133) (D4), [#134](https://github.com/metasession-dev/wawagardenbar-app/pull/134) (D5)
**Release PR:** Will be linked when the develop → main PR is created
**DevAudit Release:** `https://devaudit.metasession.co/projects/wgb/` (release version `REQ-046`)

---

## Summary

First slice of issue #117's **IG band** — Instagram engagement campaigns configured from rewards management. Adds the schema + admin-form scaffolding so operators can author "3 posts in 7 days earns 100 points" style campaigns today. The Meta Graph API polling job that consumes the new fields (IG-3 / IG-4 / IG-5) ships in a follow-up REQ. **No customer-visible effect** until that lands — this REQ is purely additive schema + UI.

## AI Involvement

- **AI Tool Used:** Claude Opus 4.7 via Claude Code (CLI)
- **AI-Generated Changes:** `interfaces/reward.interface.ts` (three new optional fields on `ISocialRewardConfig`), `models/reward-rule-model.ts` (matching Mongoose paths), `components/features/admin/rewards/reward-rule-form.tsx` (Zod schema + form inputs), `__tests__/services/reward-rule-cadence-schema.test.ts` (4 schema-introspection cases), all REQ-046 compliance markdown. See `compliance/evidence/REQ-046/ai-prompts.md` and `compliance/evidence/REQ-046/ai-use-note.md`.
- **Follow-up defect fixes (D1–D5):** also AI-assisted (Claude Opus 4.7 via Claude Code) — `app/actions/admin/reward-rules-actions.ts` (server schema), `components/features/admin/rewards/reward-rule-form.tsx` (`optionalCount` preprocessor, `firstErrorPath`, `periodType`/`maxRedemptionsPerUser` defaults), and tests `__tests__/components/reward-rule-form-schema.test.ts` + `__tests__/actions/admin/reward-rules-actions.social-instagram.test.ts`. See `compliance/evidence/REQ-046/defects.md`.
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

- **Unit (vitest)** — schema introspection (`__tests__/services/reward-rule-cadence-schema.test.ts`), client form-schema cases (`__tests__/components/reward-rule-form-schema.test.ts`, incl. blank-cadence + periodType-default + nested-error-path), and server-action cases (`__tests__/actions/admin/reward-rules-actions.social-instagram.test.ts`, proving `socialConfig` persists through `create`/`update`). All green.
- **Full suite** — `npx vitest run` → 828 pass / 4 skipped on `develop` (@ `ddfc151`). No collateral regressions.
- **Type check** — `npx tsc --noEmit` clean.
- **CI** — `ci.yml` Quality Gates green on `develop` @ `ddfc151` (current HEAD, not stale).
- **Defects (UAT smoke)** — five defects found and fixed during UAT, all documented in `compliance/evidence/REQ-046/defects.md`. The first save attempt failed end-to-end; each fix exposed the next instance of the same "displayed default / blank value not persisted to form state" class:
  - **D1+D2** (#127) — social-rule `platform` autofill (client) + server-side Zod now accepts `triggerType`/`socialConfig` instead of stripping them.
  - **D3** (#131) — blank Cadence fields (`postsRequired`/`windowDays`) now save via an `optionalCount` preprocessor (`"" → undefined`); error toast names the nested sub-field.
  - **D4** (#133) — `periodType` default (`weekly`) persisted, so an untouched Period Type select no longer blocks the save.
  - **D5** (#134) — `maxRedemptionsPerUser` "leave blank for unlimited" now accepted (reuses the `optionalCount` preprocessor); also fixes transaction rules.
- **UAT-environment verification** — **PASSED** on the deployed UAT build (https://wawagardenbar-app-uat.up.railway.app/) carrying D3–D5; recorded in #136 (commit `7e0e928`). A Social rule with Cadence blank, Period Type untouched, and Max Redemptions blank saves and persists; confirmed in the UAT database (`social_instagram` rule "test insta", `periodType=weekly`, `postsRequired`/`windowDays` omitted, `requireMention=true`). Health + smoke PASS. Satisfies Stage 3 Step 10 (`uat.required_risk_classes: ["*"]`).

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
