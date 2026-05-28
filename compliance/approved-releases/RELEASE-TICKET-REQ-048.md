# Release Ticket: REQ-048 — Rewards-ledger correctness bundle (#117 P0 #2/#3/#4)

**Status:** RELEASED
**Date:** 2026-05-28
**Requirement ID:** REQ-048
**Risk Level:** MEDIUM
**GitHub Issue:** [#155](https://github.com/metasession-dev/wawagardenbar-app/issues/155)
**PR:** [#156](https://github.com/metasession-dev/wawagardenbar-app/pull/156) — merged to develop `68ba72d` (2026-05-28). The develop → main release PR is currently [#152](https://github.com/metasession-dev/wawagardenbar-app/pull/152) (bundled with the v2026.05.27 non-tracked batch).
**Release PR:** #152
**DevAudit Release:** `https://devaudit.metasession.co/projects/wgb/` (release version `REQ-048`)
**Sign-off (dual-actor):** UAT approved + Production approved on the DevAudit portal (`released`); post-deploy production smoke evidence captured. Closed out 2026-05-28.

---

## Summary

Three coupled silent gaps in the loyalty ledger, bundled per #117's own recommendation ("ship #6 first … then bundle #2 + #3 + #4 into one PR"). Same defect class as the inventory bugs PR #113 (cancellation restore) and PR #115 (`trackByLocation`).

1. **Order cancellation reverses points + restores redeemed rewards** — `OrderService.cancelOrder` now writes a compensating `adjusted` `PointsTransaction` (refund spent + claw back earned) via new `PointsService.reverseOrderTransactions`, and flips rewards `redeemed → active` via new `RewardsService.restoreRedeemedRewards`. Idempotent; failures logged loudly, never silently swallowed.
2. **Reward-expiry job runs on a schedule** — `RewardsService.expireOldRewards()` had no caller. New `lib/scheduled-jobs.ts` (in-process `setInterval`, hourly + boot catch-up) started from `server.ts` after `listen`. Zero new dependencies; the app is a persistent custom-Node server on Railway. This is the scheduler precedent **#117 IG-5** will reuse.
3. **Tab-checkout eligible-rewards list** — `TabService.prepareTabForCheckout` returned `eligibleRewards: []` (TODO). Now `await RewardsService.getEligibleRules(updatedTab.subtotal)`, typed `IRewardRule[]`.

## AI Involvement

- **AI Tool Used:** Claude Opus 4.7 via Claude Code (CLI).
- **AI-Generated Changes:** plan, 3 service-layer edits, new `lib/scheduled-jobs.ts`, `server.ts` wire-in, 4 test files (12 cases), all REQ-048 compliance markdown. First end-to-end tracked-change cycle through the `sdlc-implementer` skill's new Phase-0 Workflow Triage step (DevAudit-Installer #68, shipped in v0.1.19). See `compliance/evidence/REQ-048/ai-prompts.md` and `ai-use-note.md`.
- **Human Reviewer:** Phase-1 plan + scheduler-mechanism decision (setInterval vs node-cron) approved by the operator. Stage 4 `dual_actor` approver (independent of submitter) is the next step.

## Implementation Details

- **Files changed (Stage 2, PR #156):**
  - `services/order-service.ts` — reversal step in `cancelOrder` after the inventory-restore block.
  - `services/points-service.ts` — new `reverseOrderTransactions(userId, orderId)`.
  - `services/rewards-service.ts` — new `restoreRedeemedRewards(orderId)`.
  - `services/tab-service.ts` — wire `getEligibleRules(subtotal)` into `prepareTabForCheckout`; type `eligibleRewards: IRewardRule[]`.
  - `lib/scheduled-jobs.ts` — new in-process scheduler registry.
  - `server.ts` — `startScheduledJobs()` after `httpServer.listen`.
  - Tests: `__tests__/services/{points-service.reverse-order, order-service.cancel-reversal, tab-service.eligible-rewards}.test.ts` + `__tests__/lib/scheduled-jobs.test.ts`.
- **Files changed (Stage 3, this PR):** `compliance/evidence/REQ-048/` pack (7 files), `compliance/RTM.md` status update, `compliance/pending-releases/RELEASE-TICKET-REQ-048.md` (this file).

## Verification

- `npx tsc --noEmit` → exit 0.
- `npx vitest run` (full suite, develop @ `68ba72d`) → **846 pass · 0 fail · 4 skip**.
- `npx eslint <REQ-048 files>` → 0 errors (7 warnings on pre-existing `console.log` lines outside scope).
- `npm audit --audit-level=high` → 0 high/critical.
- E2E: **N/A by scope** — none of the three fixes introduces a user-visible surface (see `test-scope.md` + grep-verified determination in the implementation plan).
- CI Quality Gates job ran on develop-push merging `68ba72d` and PASSED. Evidence uploaded to DevAudit at `environment=uat`.

## Residual Risk

- **Single-instance scheduler assumption** — if multiple Railway replicas run, each runs the expiry tick. The job is idempotent (`updateMany` matching `active` + `expiresAt < now`), so duplicate runs are harmless. Documented in `lib/scheduled-jobs.ts`.
- **No e2e for tab-checkout eligible rewards** — accepted because no component renders the field yet. When a UI consumer lands, add e2e via `e2e-test-engineer` then.
- **`#117 P0 #5` (comms-prefs enforcement)** is explicitly deferred until WA-2 (so the channel-preference gate is built once for WhatsApp + email + SMS together).
