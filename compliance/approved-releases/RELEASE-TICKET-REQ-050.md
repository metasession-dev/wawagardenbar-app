# Release Ticket: REQ-050 — Expense-restock stock-leak fix for `trackByLocation` inventory

**Status:** RELEASED
**Date:** 2026-05-28
**Requirement ID:** REQ-050
**Risk Level:** HIGH
**GitHub Issue:** [#175](https://github.com/metasession-dev/wawagardenbar-app/issues/175)
**Integration PR:** [#177](https://github.com/metasession-dev/wawagardenbar-app/pull/177) — merged to develop `4f0cbeb` (2026-05-28).
**Release PR:** #180
**DevAudit Release:** `https://devaudit.metasession.co/projects/wgb/` (release version `REQ-050`)
**Sign-off (dual-actor):** UAT approved + Production approved on the DevAudit portal (`released`); post-deploy production smoke evidence captured. Closed out 2026-05-28.

---

## Summary

Closes the **silent-stock-loss bug for `trackByLocation` inventory items on the expense-restock code path** (#175). Same defect class as REQ-044 / PR #115 (the order path), applied to a code path REQ-044 didn't audit. Symptom on UAT 2026-05-28: 40 bottles of Orijin - Small added via expense restock, dashboard kept showing 0. The bug had likely been compounding for weeks across multiple weekly restocks (drift analysis showed ~28 bottles of accumulated loss before the most recent restock).

The fix mirrors REQ-044's `applyOrderStockDelta` pattern: doc-mutation + `inventory.save()` so the pre-save hook (which recomputes `currentStock = sum(locations[].currentStock)` for `trackByLocation` items) reflects the change. The new `applyExpenseStockDelta` helper routes the delta through the receiving location (`defaultReceivingLocation`, with `locations[0]` fallback) — slightly more sophisticated than REQ-044's locations[0]-only choice.

Ships with `scripts/reconcile-track-by-location-stock.ts` to systematically recover any other drifted rows.

## AI Involvement

- **AI Tool Used:** Claude Opus 4.7 via Claude Code (CLI).
- **AI-Generated Changes:** diagnosis, plan, helper + 3-site refactor in `expense-inventory-link-service.ts`, reconcile script, 17 new vitest cases, 33 updated REQ-034 tests, full REQ-050 compliance markdown. See `compliance/evidence/REQ-050/ai-prompts.md` + `ai-use-note.md` for provenance.
- **Operator action this turn:** approved the plan at Phase-1 HIGH-mandatory checkpoint; chose to bundle the reconcile script (A) and apply one-shot UAT repair to Orijin (C); UAT row repaired manually during Phase 1.
- **Human Reviewer:** Stage 4 `dual_actor` approver (independent of submitter) is the next gate — see `implementation-plan.md` § _Four-eyes attestation_.

## Implementation Details

- **`services/expense-inventory-link-service.ts`** — new private `applyExpenseStockDelta` helper; 3 sites switched from `updateOne $inc` to doc-mutation + `save()` (apply, reverse, runReversalPass). Reverse's AC7 check is now receiving-location-aware. `computeInventoryStatus` import dropped (pre-save hook now sets status).
- **`scripts/reconcile-track-by-location-stock.ts`** (new) — pure helpers (`replayMovements`, `computeDriftPlan`) + CLI bootstrap (`--dry-run` default, `--apply` opt-in, `--inventory-id` for one row, `--db-name` override). Flags `unrecorded-initial-stock` rows for manual review rather than auto-applying.
- **Tests** — new `__tests__/services/expense-inventory-link.trackbylocation.test.ts` (6 cases) + new `__tests__/scripts/reconcile-track-by-location-stock.test.ts` (11 cases) + updated `expense-inventory-link.test.ts` + `expense-inventory-link.reversal.test.ts` (33 cases regression).
- **Evidence pack (Stage 3, this commit):** test-scope / test-plan / test-execution-summary / security-summary / ai-use-note / ai-prompts / implementation-plan + this release ticket.

## Verification

- `npx tsc --noEmit` → exit 0.
- `npx vitest run` (full suite, develop @ `4f0cbeb`) → **875 pass · 0 fail · 4 skip**.
- `npx eslint <REQ-050 files>` → 0 errors.
- `npm audit --audit-level=high` → 0 high/critical.
- Semgrep (`--severity ERROR`) → 0 findings on REQ-050 code.
- E2E: N/A by scope (service-layer fix; UI reflects state).
- CI Pipeline ran on develop-push merging `4f0cbeb` — `derive-release-version.sh` returned `REQ-050` ✓; gate evidence uploaded at `environment=uat` under `--release REQ-050`.
- Compliance Evidence Upload initially failed silently on the post-`4f0cbeb` develop pushes (the v0.1.21 sync introduced a `set -e` + bash-function-last-command bug in `req_meta_args`). Fixed via PR #182 (`return 0` guard in the helper); workflow now successfully uploads the REQ-050 release ticket + 7 evidence files to the `REQ-050` release record (verified end-to-end on `workflow_dispatch` run `26583892811`, 12 uploads in 9s). Upstream issue [DevAudit-Installer#77](https://github.com/metasession-dev/DevAudit-Installer/issues/77) tracks the permanent fix in the next sync.

## Operational repair (separate from this code release)

- **Orijin - Small row** (`694540785172c0ca02759606`): manually repaired during Phase 1 — Main Store `currentStock` 0 → 48. The systematic recovery via the bundled `reconcile-track-by-location-stock.ts` script is post-deploy operational work.

## Residual Risk

- **Unrecorded-initial-stock items** (those whose StockMovement-replay yields a negative number) are not auto-fixable by the script — they're flagged for manual review. The honest workaround is a physical count + manual set (as done for Orijin).
- **Concurrent-write race safety improved** by switching to doc-save + `__v` versioning vs the previous `updateOne` without version check.
- **The `applyOrderStockDelta` + new `applyExpenseStockDelta` are doing the same thing for different code paths** — refactor to a single helper deliberately deferred to keep this PR diff focused.
