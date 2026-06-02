# Release Ticket: REQ-059 — InstagramPostCredit ledger + sliding-window award trigger (IG-4)

**Status:** TESTED - PENDING SIGN-OFF
**Date:** 2026-06-02
**Requirement ID:** REQ-059
**Risk Level:** MEDIUM
**GitHub Issue:** [#117 IG-4](https://github.com/metasession-dev/wawagardenbar-app/issues/117)
**Integration PR:** [#245](https://github.com/metasession-dev/wawagardenbar-app/pull/245) — merged to develop 2026-06-02 (commit `96f4f05`).
**Release PR:** pending — to be opened `develop → main` after this evidence pack lands.
**DevAudit Release:** [`devaudit.metasession.co/projects/wgb/`](https://devaudit.metasession.co/projects/wgb/) — release version `REQ-059`, status `draft` → `uat_review` on this evidence push.

---

## Summary

REQ-058 hooked `InstagramService.processInstagramRewards()` into the scheduler so it now ticks hourly, but the dedup was a naive regex match against `PointsTransaction.description`. That worked for "was this post awarded?" but had no notion of pending state — a customer at 1/3 in a 3-posts-in-7-days cadence had no ledger to read from. REQ-059 introduces `InstagramPostCredit` as the canonical ledger: one row per `(userId, ruleId, postId)`, status `pending` until the sliding-window threshold is reached, then `awarded` with `awardedAt` stamped.

**Race-safe** via unique `postId` index: concurrent ticks attempting to insert the same media id get an E11000 the service catches as `skipped_already_seen`. **Transition-safe** via AC3 legacy fallback: posts awarded pre-REQ-059 get an `awarded` credit row inserted on first re-encounter, preventing double-awarding.

Unblocks IG-7 (customer progress card reads pending count from the ledger), IG-6 (admin metrics view aggregates cadence completions), and gives IG-3 cleaner Graph API polling integration.

## AI Involvement

- **AI Tool Used:** Claude Opus 4.7 via Claude Code (CLI).
- **AI-Generated Changes:** implementation plan with 7 ACs + STRIDE + threat model + rollback, the `InstagramPostCredit` Mongoose model (unique `postId`, compound `(userId, ruleId, postedAt)` index), the new `InstagramService.processQualifyingPost` public-static method (~110 LOC) with action-tag union return type, the `processRule` swap to delegate per-post via a single call, promotion of `hasProcessedPost` from `private` to `public` (AC3 fallback), removal of the old `markPostAsProcessed` stub, 16 new vitest cases (6 model + 10 service), full REQ-059 compliance markdown pack. See `compliance/evidence/REQ-059/ai-prompts.md` + `ai-use-note.md`.
- **Operator action this cycle:** flagged that IG-7 (initial pick) depended on IG-4; accepted the IG-4-first re-scope; approved the plan at the MEDIUM-risk gate ("Approve as scoped"). Merged the REQ-059 integration PR #245. Will perform Phase 4 portal UAT approval + Phase 5 Production approval.
- **Human Reviewer:** Stage 4 `dual_actor` approver — see `implementation-plan.md` § _Four-eyes attestation_.

## Implementation Details

**Files Added:**

- `models/instagram-post-credit-model.ts` — Mongoose schema for the ledger with `userId`/`ruleId`/`postId (unique)`/`postedAt`/`status (enum)`/`awardedAt`; compound index `(userId, ruleId, postedAt: -1)`.
- `__tests__/models/instagram-post-credit-model.test.ts` — 6 schema cases.
- `__tests__/services/instagram-service.ledger.test.ts` — 10 service cases covering the new `processQualifyingPost` method end-to-end.
- `compliance/plans/REQ-059/implementation-plan.md` — plan with ACs, STRIDE, rollback.

**Files Modified:**

- `services/instagram-service.ts` — added top-level imports (`Types`, `InstagramPostCreditModel`) + `DAY_MS` constant; added new exported `ProcessQualifyingPostArgs` interface and `ProcessQualifyingPostAction` type alias; added new public-static `processQualifyingPost` method; replaced the inline dedup-and-award block in `processRule` with a single delegation call; promoted `hasProcessedPost` to `public`; removed the old `markPostAsProcessed` stub.
- `compliance/RTM.md` — REQ-059 IN PROGRESS row.

**Dependencies Added/Changed:**

- No new packages introduced by REQ-059.
- No env vars, no DB migration.

## Test Evidence

| Test Type         | Count | Passed | Failed | Evidence Location                                                                        |
| ----------------- | ----- | ------ | ------ | ---------------------------------------------------------------------------------------- |
| Model unit        | 6     | 6      | 0      | DevAudit portal: `wgb/REQ-059`; `compliance/evidence/REQ-059/test-execution-summary.md`  |
| Service unit      | 10    | 10     | 0      | Same                                                                                     |
| Full vitest suite | 1011  | 1007   | 0      | Same (+4 skipped pre-existing)                                                           |
| E2E               | n/a   | —      | —      | `project_e2e_targeted_until_117` policy + scope justification (server-side ledger logic) |

**Net new from REQ-058 baseline (991 / 4 skip):** +16 REQ-059 cases.

## Security Evidence

| Check                 | Result                                                                                                        | Evidence Location                                                                                                                   |
| --------------------- | ------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| TypeScript Check      | exit 0                                                                                                        | DevAudit portal: `wgb/REQ-059`; CI run [26798396560](https://github.com/metasession-dev/wawagardenbar-app/actions/runs/26798396560) |
| SAST (Semgrep)        | 0 ERROR-severity findings                                                                                     | Same                                                                                                                                |
| Dependency Audit      | 0 high / 0 critical                                                                                           | Same                                                                                                                                |
| Access Control review | N/A                                                                                                           | `compliance/evidence/REQ-059/security-summary.md`                                                                                   |
| Audit Log review      | PASS — existing `PointsTransaction` audit trail unchanged; new `InstagramPostCredit` ledger IS an audit trail | `compliance/evidence/REQ-059/security-summary.md`                                                                                   |

## Acceptance Criteria

- [x] AC1 — `InstagramPostCredit` model with documented fields, defaults, enums, unique `postId`, compound index
- [x] AC2 — Ledger replaces naive dedup as primary; existing row → skip; new row → insert pending
- [x] AC3 — Legacy fallback inserts `awarded` credit + skips re-award
- [x] AC4 — Sliding-window pending count → award threshold
- [x] AC5 — Award + flip atomically (best-effort); award-throws → no flip
- [x] AC6 — Hourly re-tick idempotent; concurrent E11000 caught
- [x] AC7 — `markPostAsProcessed` stub removed; ledger insert is canonical "mark processed"
- [x] TypeScript clean
- [x] SAST clean
- [x] Dependencies clean
- [x] AI use documented

## Risk Assessment

- **Race on concurrent ticks** — mitigated by unique `postId` index → E11000 → `skipped_already_seen`.
- **Partial failure between award + flip** — if `awardSocialPoints` succeeds but `updateMany` fails, the customer could double-award on next tick. Documented in `security-summary.md` and the plan; mitigation is operational (monitor row counts per `(userId, ruleId)` per window). Future REQ can wrap in a Mongo transaction.
- **Rollback risk** — `pending` credits at time of revert could double-award under legacy code on next tick. Mitigation: pause the scheduler or wait for the next tick to flip pending → awarded before reverting.
- **No new dependencies, no env vars, no DB migration**.

## Post-Deploy Actions

| Type | Script / Command | Target | Required | Notes                                                                                                                                                                                                                                    |
| ---- | ---------------- | ------ | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| —    | None             | —      | —        | No data migration, no schema migration. The new ledger collection is created lazily on first write. Existing `PointsTransaction` rows are untouched. AC3 fallback covers historical posts lazily as they re-appear in Graph API fetches. |

**Run these after deployment, before production verification.**

---

## Reviewer Checklist

- [ ] Code matches requirement (review `models/instagram-post-credit-model.ts` + `services/instagram-service.ts` diff)
- [ ] Test evidence present and all-pass (16 cases — green on develop CI)
- [ ] Security evidence present and clean (SAST 0, dep-audit 0, STRIDE assessed including partial-failure edge case)
- [ ] Test scope fully addressed (test-scope.md ↔ test-plan.md ↔ test-execution-summary.md)
- [ ] RTM correct status and risk (MEDIUM, will flip to RELEASED at close-out)
- [ ] No sensitive data committed
- [ ] No regressions (full vitest 1007 / 0 fail / 4 skip — unchanged from REQ-058 baseline)
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

> **Audit Note:** This release was assisted by Claude Code (Opus 4.7) via the project's `sdlc-implementer` skill. All AI-generated content was reviewed by the operator and linked to the Requirement Traceability Matrix. AC1–AC7 are covered by 16 unit cases (6 model + 10 service), 0 failures, with E2E policy honoured per `project_e2e_targeted_until_117`. **Phase 3 evidence pack assembled BEFORE the release PR** per `feedback_phase3_release_ticket_mandatory` — third consecutive cycle applying this lesson (REQ-057 → REQ-058 → REQ-059).

## Audit Trail

| Date       | Action                              | Actor       | Notes                                                                                                       |
| ---------- | ----------------------------------- | ----------- | ----------------------------------------------------------------------------------------------------------- |
| 2026-06-02 | Requirement created                 | ostendo-io  | Risk: MEDIUM. Re-scoped from initial IG-7 pick after AI flagged the IG-4 dependency                         |
| 2026-06-02 | Implementation plan presented       | Claude Code | 7 ACs + STRIDE + partial-failure edge case + rollback                                                       |
| 2026-06-02 | Plan approved                       | ostendo-io  | "Approve as scoped (Recommended)" — AC3 legacy fallback chosen over clean-break or eager-backfill           |
| 2026-06-02 | TDD red baseline (16 cases) written | Claude Code | 6 model + 10 service                                                                                        |
| 2026-06-02 | Implementation completed            | Claude Code | model + processQualifyingPost extraction + processRule swap                                                 |
| 2026-06-02 | Tests passed                        | Claude Code | 16 / 16; full suite 1007 / 4 skip / 0 fail                                                                  |
| 2026-06-02 | Integration PR #245 opened + merged | ostendo-io  | merged to develop (`96f4f05`)                                                                               |
| 2026-06-02 | CI green; attribution clean         | —           | run 26798396560 — `Release version: REQ-059` (step 3 picked `[REQ-059]` from PR title in merge-commit body) |
| 2026-06-02 | Phase 3 evidence pack assembled     | Claude Code | This PR — BEFORE release PR per `feedback_phase3_release_ticket_mandatory`                                  |
| 2026-06-02 | Submitted for UAT review            | Claude Code | After this evidence-pack PR merges                                                                          |
