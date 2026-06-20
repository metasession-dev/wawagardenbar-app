# Release Ticket: REQ-073 — Admin destructive ops E2E coverage (sub-issue #296)

**Status:** DRAFT
**Date:** 2026-06-05
**Requirement ID:** REQ-073
**Risk Level:** MEDIUM (inherits from sub-issue #296 cluster classification; pure test addition)
**GitHub Issue:** [#296](https://github.com/metasession-dev/wawagardenbar-app/issues/296) (sub-issue of umbrella [#291](https://github.com/metasession-dev/wawagardenbar-app/issues/291))
**Integration PR:** (this PR — to be opened against develop)
**Release PR:** (bundled with REQ-069/REQ-070/REQ-071/REQ-072 or follow-up; pure test addition, low urgency)
**Sign-off (dual-actor):** Pending portal UAT + Production approval.

---

## Summary

Fifth cycle of umbrella tracker [#291](https://github.com/metasession-dev/wawagardenbar-app/issues/291) (SRS → E2E regression-pack coverage closure). **Pins admin-side destructive ops in the regression pack for the first time** — destructive operations previously had thin or no E2E coverage at the storage layer.

V1 ships 3 of the 8 candidate specs (operator-approved at plan-review time). 5 deferred to follow-up cycles within #296.

- **AC1 — menu-item delete.** `MenuItemModel.deleteOne()` removes the item; existing Order document's embedded snapshot persists (history preserved at order-item layer).
- **AC2 — menu-item duplicate.** Duplicate creates a new MenuItem with " (Copy)" name suffix + unique slug + `isAvailable: false`; original unchanged.
- **AC3 — kitchen-void-batch reversal.** `ProductionService.voidBatch` flips status to 'voided' + restores ingredient + reverses yield + writes 2 StockMovement audit rows.
- **AC4 — kitchen-void-batch idempotency.** Re-voiding is a no-op.

## AI Involvement

- **AI Tool Used:** Claude Opus 4.7 via Claude Code (CLI).
- **AI-Generated Changes:** 3 E2E specs + 6-doc evidence pack + release ticket + RTM row + implementation plan.
- **Operator action this cycle:** approved umbrella + sub-issue grouping in advance; said "proceed" after V1 plan review.

## Implementation Details

**Files Added:**

- `e2e/admin/menu-item-delete.spec.ts` — 1 test pinning REQ-MENUMGT-004 (delete half).
- `e2e/admin/menu-item-duplicate.spec.ts` — 1 test pinning REQ-MENUMGT-004 (duplicate half).
- `e2e/admin/kitchen-void-batch.spec.ts` — 2 tests pinning REQ-KITCHEN-005 + REQ-034 AC13.
- `compliance/plans/REQ-073/implementation-plan.md`.
- `compliance/evidence/REQ-073/{test-plan,test-scope,test-execution-summary,security-summary,ai-prompts,ai-use-note}.md` — 6-doc evidence pack.

**Files Modified:**

- `compliance/RTM.md` — REQ-073 IN PROGRESS row added.

**Schema changes:** None. **New packages:** None. **Env vars:** None new. **Pure test addition.**

## Test Plan & Evidence

See `compliance/evidence/REQ-073/test-plan.md` and `test-execution-summary.md`.

- Vitest: 1129 pass / 4 skip / 0 fail (unchanged).
- TypeScript: 0 errors.
- E2E focused REQ-073 (UAT): **7 passed** (3 auth-setup + 4 contract tests), 19.7s wall-clock.

## Security & Compliance

See `security-summary.md`. Headline: no production code change; test-only; UAT-only DB writes via the operator's `MONGODB_UAT_EXTERNAL_URI`; synthetic identifiers (`e2e-req073-{ts}`) with full `afterAll` cleanup.

**Honest disclosure**: Spec 3 seeds a real `role: 'super-admin'` user document on UAT to satisfy `voidBatch`'s precondition. The seed has synthetic email + no session creation; deleted in `afterAll`. Manual cleanup query if needed: `db.users.deleteMany({ email: /^e2e-req073-void-/ })`.

## Rollback Plan

Revert the integration PR. The new spec files are pure additions; reverting leaves no orphan production behavior.

## Deferred to follow-up cycles within #296

| Item                                                                  | Why                                                              |
| --------------------------------------------------------------------- | ---------------------------------------------------------------- |
| `tab-delete-reverses-payments` (REQ-TABMGT-004)                       | Multi-collection state changes (payments + points + tab + audit) |
| `force-password-change` (REQ-AUTHA-003)                               | UI-driven flow; needs browser context + session redirect         |
| `data-deletion-request-approval` (REQ-SETTINGS-004 + REQ-PRIVACY-002) | Admin workflow UI + cascade verification                         |
| `soft-delete-enforcement` (REQ-PRIVACY-002)                           | UI-driven across multiple admin views                            |
| `kitchen-ingredient-archive` (REQ-KITCHEN-006)                        | Same pattern as void-batch; lower urgency                        |

Tracked on sub-issue [#296](https://github.com/metasession-dev/wawagardenbar-app/issues/296)'s checklist.

## Quality Gates

| Gate                           | Expected   | Actual (2026-06-05)                               |
| ------------------------------ | ---------- | ------------------------------------------------- |
| `npx tsc --noEmit`             | exit 0     | exit 0                                            |
| `npx vitest run` (full)        | 0 failures | 1129 pass / 4 skip / 0 fail                       |
| E2E focused REQ-073 (UAT)      | 0 failures | 7 passed (3 auth-setup + 4 contract tests), 19.7s |
| E2E full regression pack (UAT) | green      | _to be run at evidence-pack push time_            |

## Stage Approvals

- [x] Stage 1 — Plan (`compliance/plans/REQ-073/implementation-plan.md`)
- [x] Stage 2 — Implement & test (3 specs; 4 tests live-passing against UAT)
- [x] Stage 3 — Compile evidence (this evidence pack)
- [ ] Stage 4 — Submit for UAT review (release PR)
- [ ] Stage 5 — UAT review + production deployment + close-out

## Notes

- Fifth cycle of umbrella [#291](https://github.com/metasession-dev/wawagardenbar-app/issues/291).
- 4 tests pinning storage-layer correctness across MenuItem CRUD + Production void lifecycle. A future regression where deletion behavior, duplicate-modification shape, or void reversal/idempotency drifts will fail the spec immediately.
- Zero production code change. Risk class MEDIUM per sub-issue cluster classification (pure test addition + UAT-only Mongo + synthetic identifiers).
