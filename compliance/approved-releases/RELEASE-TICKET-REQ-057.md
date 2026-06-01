# Release Ticket: REQ-057 — Instagram engagement foundation (IG-1 + IG-2)

**Status:** RELEASED
**Date:** 2026-06-01
**Requirement ID:** REQ-057
**Risk Level:** LOW
**GitHub Issue:** [#117 IG-1 + IG-2](https://github.com/metasession-dev/wawagardenbar-app/issues/117)
**Integration PR:** [#236](https://github.com/metasession-dev/wawagardenbar-app/pull/236) — merged to develop 2026-06-01 (commit `c9d8c04` via merge `4eaa2b8`).
**Release PR:** #238
**DevAudit Release:** [`devaudit.metasession.co/projects/wgb/`](https://devaudit.metasession.co/projects/wgb/) — release version `REQ-057`, status `draft` → `uat_review` on this evidence push.
**Sign-off (dual-actor):** UAT approved + Production approved on the DevAudit portal (`released`); post-deploy production smoke evidence captured. Closed out 2026-06-01.

---

## Summary

First two items in #117's Instagram engagement bundle — foundation for IG-3 onwards.

**IG-1** — `RewardRule.socialConfig` cadence:

- Schema defaults: `postsRequired: 3`, `windowDays: 7`. New rules get a sane "3 posts in 7 days" cadence out of the box.
- Pre-validate hook rejects half-set cadence pairs (`postsRequired` set without `windowDays` or vice versa). Allows both-set (new cadence model) and neither-set (legacy `maxPostsPerPeriod` model); blocks the degenerate half-state.

**IG-2** — Instagram handle validation:

- New `instagramHandleSchema` zod pipe exported from `app/actions/profile/profile-actions.ts`. Client form imports + mirrors — single source of truth.
- Transform strips a leading `@` and trims whitespace.
- Refine validates against Instagram's actual handle character set: `^[a-zA-Z0-9._]{1,30}$`. Previously the schema accepted any string up to 30 chars (incl. `<script>` shapes — security-positive change).
- Now-redundant manual `@`-strip removed from the action body.
- Explainer copy updated to "Required to earn points on Instagram tagging campaigns — we use this to match your tags to your account."

**Scope-shrink note:** pre-REQ-057 survey found `ISocialRewardConfig` already had `postsRequired` / `windowDays` / `pointsAwarded` / `requireMention` / `hashtag`; top-level `IRewardRule.startDate`/`endDate` + `campaignDates[]` already covered the campaign-window intent; Instagram handle input + adornment already existed. REQ-057 is the tight LOW-risk polish that finishes the job.

## AI Involvement

- **AI Tool Used:** Claude Opus 4.7 via Claude Code (CLI).
- **AI-Generated Changes:** implementation plan with STRIDE + threat model + rollback, schema defaults + pre-validate hook on `RewardRule.socialConfig`, exported `instagramHandleSchema` zod pipe (transform + refine), client schema import + explainer copy update, 19 new vitest cases (7 schema + 12 zod), full REQ-057 compliance markdown pack. See `compliance/evidence/REQ-057/ai-prompts.md` + `ai-use-note.md`.
- **Operator action this cycle:** acknowledged the scope-shrink discovery, merged the DevAudit 0.1.29 sync PR #235 (which landed the upstream fixes from REQ-053/REQ-056 cycles), then merged the REQ-057 integration PR #236. Will perform Phase 4 portal UAT approval + Phase 5 Production approval.
- **Human Reviewer:** Stage 4 `dual_actor` approver — see `implementation-plan.md` § _Four-eyes attestation_.

## Implementation Details

**Files Added:**

- `__tests__/actions/profile-actions.instagram-handle.test.ts` — 16 zod handle cases (5 accept + 6 reject + 4 transform + 1 sentinel).
- `compliance/plans/REQ-057/implementation-plan.md` — plan with ACs, STRIDE, rollback.

**Files Modified:**

- `models/reward-rule-model.ts` — defaults `postsRequired: 3` / `windowDays: 7`; pre-validate hook for paired-field validity.
- `app/actions/profile/profile-actions.ts` — exported `instagramHandleSchema`; removed manual `@`-strip block (now done by transform).
- `components/features/profile/personal-info-tab.tsx` — imported shared schema; updated explainer copy.
- `__tests__/services/reward-rule-cadence-schema.test.ts` — extended with 7 new REQ-057 cases (3 defaults + 4 paired-validity).
- `compliance/RTM.md` — REQ-057 IN PROGRESS row.

**Dependencies Added/Changed:**

- No new packages introduced by REQ-057.
- No env vars, no DB migration.

## Test Evidence

| Test Type         | Count                       | Passed | Failed | Evidence Location                                                                        |
| ----------------- | --------------------------- | ------ | ------ | ---------------------------------------------------------------------------------------- |
| Schema unit       | 11 (4 pre-existing + 7 new) | 11     | 0      | DevAudit portal: `wgb/REQ-057`; `compliance/evidence/REQ-057/test-execution-summary.md`  |
| Zod handle unit   | 16                          | 16     | 0      | Same                                                                                     |
| Full vitest suite | 993                         | 989    | 0      | Same (+4 skipped pre-existing)                                                           |
| E2E               | n/a                         | —      | —      | `project_e2e_targeted_until_117` policy + scope justification (schema + form validation) |

**Net new from REQ-056 baseline (966 / 4 skip):** +19 REQ-057 cases. No existing tests changed.

## Security Evidence

| Check                 | Result                                               | Evidence Location                                                                                                                   |
| --------------------- | ---------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| TypeScript Check      | exit 0                                               | DevAudit portal: `wgb/REQ-057`; CI run [26782113739](https://github.com/metasession-dev/wawagardenbar-app/actions/runs/26782113739) |
| SAST (Semgrep)        | 0 ERROR-severity findings                            | Same                                                                                                                                |
| Dependency Audit      | 0 high / 0 critical                                  | Same                                                                                                                                |
| Access Control review | N/A                                                  | `compliance/evidence/REQ-057/security-summary.md`                                                                                   |
| Audit Log review      | PASS — existing `user.update` action audit unchanged | `compliance/evidence/REQ-057/security-summary.md`                                                                                   |

## Acceptance Criteria

- [x] AC1 — `postsRequired` defaults to 3; `windowDays` defaults to 7
- [x] AC2 — paired-validity hook rejects half-set cadence pairs
- [x] AC3 — zod regex `^[a-zA-Z0-9._]{1,30}$` validates handle format
- [x] AC4 — transform strips leading `@` and trims; manual strip removed from action
- [x] AC5 — explainer copy ties to IG campaigns
- [x] AC6 — tests written TDD-first
- [x] TypeScript clean
- [x] SAST clean
- [x] Dependencies clean
- [x] AI use documented

## Risk Assessment

- **Tightened handle regex** is a security-positive change (blocks `<script>` shapes that the previous `.max(30)` admitted). No regression risk — handles already saved remain valid (they were already constrained to 30 chars).
- **Schema defaults** apply on next-write of new rules; existing rules unaffected (Mongoose default-on-read doesn't write to disk).
- **Pre-validate hook** is the only place that catches half-set cadence; defaults make that state unreachable via normal API surface but the hook still guards explicit-null and direct-Mongo writes.
- **No new dependencies, no env vars, no DB migration**.

## Post-Deploy Actions

| Type | Script / Command | Target | Required | Notes                                                                                                                                                      |
| ---- | ---------------- | ------ | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| —    | None             | —      | —        | No data migration, no schema migration. Existing reward rules unaffected by defaults (Mongoose default-on-read doesn't write to disk). No env vars to set. |

**Run these after deployment, before production verification.**

---

## Reviewer Checklist

- [ ] Code matches requirement (review `models/reward-rule-model.ts`, `app/actions/profile/profile-actions.ts`, `components/features/profile/personal-info-tab.tsx` diffs)
- [ ] Test evidence present and all-pass (11 schema + 16 zod = 27 directly relevant cases — green on develop CI)
- [ ] Security evidence present and clean (SAST 0, dep-audit 0, STRIDE assessed)
- [ ] Test scope fully addressed (test-scope.md ↔ test-plan.md ↔ test-execution-summary.md)
- [ ] RTM correct status and risk (LOW, will flip to RELEASED at close-out)
- [ ] No sensitive data committed
- [ ] No regressions (full vitest 989 / 0 fail / 4 skip — unchanged from REQ-056 baseline)
- [ ] AI code reviewed (`ai-use-note.md` + `ai-prompts.md`)
- [ ] No hallucinated dependencies (no new packages)
- [ ] Post-deploy actions documented (None required)

---

## 🛡️ Compliance & UAT Sign-off

_This section must be completed by a human reviewer before merging to Production._

| Role                | Name | Date | Status              | Signature/Notes |
| :------------------ | :--- | :--- | :------------------ | :-------------- |
| **QA Lead**         |      |      | [ ] PASS / [ ] FAIL |                 |
| **Product Owner**   |      |      | [ ] PASS / [ ] FAIL |                 |
| **Security Review** |      |      | [ ] N/A / [ ] OK    |                 |

> **Audit Note:** This release was assisted by Claude Code (Opus 4.7) via the project's `sdlc-implementer` skill. All AI-generated content was reviewed by the operator and linked to the Requirement Traceability Matrix. AC1–AC6 are covered by 27 new unit cases (7 schema + 16 zod handle + 4 pre-existing regression), 0 failures, with E2E policy honoured per `project_e2e_targeted_until_117`. **Phase 3 evidence pack assembled BEFORE the release PR this cycle** (fix for REQ-056's order-of-operations bug; encoded in the new `feedback_phase3_release_ticket_mandatory` memory).

## Audit Trail

| Date       | Action                                  | Actor       | Notes                                                                                                                |
| ---------- | --------------------------------------- | ----------- | -------------------------------------------------------------------------------------------------------------------- |
| 2026-06-01 | Requirement created                     | ostendo-io  | Risk: LOW                                                                                                            |
| 2026-06-01 | Pre-implementation survey               | Claude Code | Discovered most of IG-1/IG-2 surface already implemented; scope shrunk from guessed-M to actual-S                    |
| 2026-06-01 | Implementation plan presented           | Claude Code | 6 ACs + STRIDE + scope-shrink notes; LOW risk so no formal approval gate                                             |
| 2026-06-01 | Plan acknowledged                       | ostendo-io  | "go this PR [#235] before proceeding" then "yes" — implicit plan acceptance                                          |
| 2026-06-01 | TDD red baseline (19 new cases) written | Claude Code | 7 schema + 12 zod                                                                                                    |
| 2026-06-01 | Implementation completed                | Claude Code | schema defaults + pre-validate hook + zod pipe + client mirror + copy update                                         |
| 2026-06-01 | Tests passed                            | Claude Code | 27 / 27 directly relevant; full suite 989 / 4 skip / 0 fail                                                          |
| 2026-06-01 | Integration PR #236 opened + merged     | ostendo-io  | merged to develop (`4eaa2b8`)                                                                                        |
| 2026-06-01 | CI green; attribution clean             | —           | Compliance Evidence Upload `Release version: REQ-057` (step 3 picked `[REQ-057]` from PR title in merge-commit body) |
| 2026-06-01 | Phase 3 evidence pack assembled         | Claude Code | This PR — BEFORE release PR per the new `feedback_phase3_release_ticket_mandatory` memory                            |
| 2026-06-01 | Submitted for UAT review                | Claude Code | After this evidence-pack PR merges                                                                                   |
