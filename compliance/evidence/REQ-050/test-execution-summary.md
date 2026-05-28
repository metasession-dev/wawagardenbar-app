# Test Execution Summary — REQ-050

**Requirement:** REQ-050 — Expense-restock stock-leak fix for `trackByLocation` inventory
**Date:** 2026-05-28
**SHA range:** `33dd75d..4f0cbeb` (develop after PR #177 merge)

## Results

| Gate                                          | Result                            | Detail                                                                                           |
| --------------------------------------------- | --------------------------------- | ------------------------------------------------------------------------------------------------ |
| `npx tsc --noEmit`                            | ✅ exit 0                         | Clean.                                                                                           |
| `npx vitest run` (full suite)                 | ✅ **875 pass · 0 fail · 4 skip** | Includes 50 cases from REQ-050 changes (17 new + 33 updated REQ-034 regression).                 |
| `npx eslint <changed files>`                  | ✅ 0 errors                       | The reconcile script's intentional `console.log` lines (operational tool) produce warnings only. |
| `semgrep scan --config auto --severity ERROR` | ✅ 0 findings on REQ-050 code     | (4 pre-existing on DevAudit-generated workflow files are unchanged, same as REQ-048/049 noted.)  |
| `npm audit --audit-level=high`                | ✅ 0 high/critical                | 7 residual moderate — below gate.                                                                |
| E2E (Playwright)                              | ▶ N/A by scope                   | Service-layer fix; UI just reflects state. See `test-scope.md`.                                  |

## New tests added (17 cases, 2 files)

- `__tests__/services/expense-inventory-link.trackbylocation.test.ts` (6) — apply + reverse + AC7 + invariant + non-tracked regression.
- `__tests__/scripts/reconcile-track-by-location-stock.test.ts` (11) — pure-helper coverage of `replayMovements` + `computeDriftPlan`.

## Existing tests updated (33 cases, 2 files)

- `__tests__/services/expense-inventory-link.test.ts` (20) — assertion mechanism changed from `expect(InventoryModel.updateOne)...$inc` to `expect(_inv.save).toHaveBeenCalled()` via the mocked `findById` return value. All 16 inline `findById.mockResolvedValue({…})` calls patched to include `save: vi.fn()`. Tests assert the same end behaviour through the new mechanism.
- `__tests__/services/expense-inventory-link.reversal.test.ts` (13) — same shape; 13 inline mocks patched, 6 updateOne assertions rewritten.

## CI verification

CI Pipeline ran on develop-push merging `4f0cbeb`. `derive-release-version.sh` correctly returned **`REQ-050`** (the `[REQ-050]` PR-title convention from `feedback_pr_title_req_brackets` worked again — no #163-style attribution-fix follow-up needed). Gate evidence uploaded to DevAudit at `environment=uat` under `--release REQ-050` (categories: `security_scan`, `ci_pipeline`, `test_report`).

## Operational repair (separate from this code release)

The Orijin - Small UAT row (`694540785172c0ca02759606`) was **manually repaired during Phase 1** — Main Store `currentStock` 0 → 48 — via a temp tsx script (not committed). Diagnosis showed the bug had likely been compounding over weeks of weekly restocks; the reconciliation script bundled in this PR is the systematic recovery path for any other affected rows. Operators run it post-deploy with `--dry-run` first.
