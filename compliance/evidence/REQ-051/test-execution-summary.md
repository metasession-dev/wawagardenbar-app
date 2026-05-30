# Test Execution Summary — REQ-051

**Requirement:** REQ-051 — DFR aggregation queries by business-day range, not calendar-day range
**Date:** 2026-05-30
**SHA range:** `0e5cf71..(feat-branch-HEAD)` on `feat/REQ-051-dfr-business-day-range`

## Results

| Gate                                          | Result                            | Detail                                                                                           |
| --------------------------------------------- | --------------------------------- | ------------------------------------------------------------------------------------------------ |
| `npx tsc --noEmit`                            | ✅ exit 0                         | Clean.                                                                                           |
| `npx vitest run` (full suite)                 | ✅ **889 pass · 0 fail · 4 skip** | Includes 14 new cases from REQ-051 + 3 existing files with the new `SystemSettingsService` mock. |
| `npx eslint <changed files>`                  | ✅ 0 errors                       | —                                                                                                |
| E2E focused regression (7 originally-blocked) | 🟡 **4 of 7 fixed**               | 3 remain on different bugs (#200, #201) + 1 surfaced (#202). See `test-plan.md`.                 |
| E2E full regression                           | ▶ pending develop                | Will run on merge to develop; expected -4 to -5 vs current baseline (15 → ~10 or 11).            |

## New tests added (14 cases, 2 files)

- `__tests__/lib/business-date.test.ts` (+9) — `businessDayRange` boundary, fallback, invariant, businessDate-key semantics.
- `__tests__/services/financial-report-service.business-day.test.ts` (+5) — mock-based verification that `generateDailySummary`'s `$or` filter branches use the business-day range.

## Existing tests updated (3 files, +SystemSettingsService mock)

- `__tests__/services/financial-report-service.tip.test.ts`
- `__tests__/services/financial-report-service.tip-method.test.ts`
- `__tests__/services/financial-report-service.order-type.test.ts`

Each gains a single `vi.mock('@/services/system-settings-service', …)` block stubbing `getBusinessDayCutoff` to `'15:00'`. Without it the new awaited cutoff fetch hangs the existing assertions.

## CI verification

CI Pipeline + Compliance Evidence Upload run on the develop-push merging the integration PR. `derive-release-version.sh` returns `REQ-051` per the `[REQ-051]` PR-title convention; gate evidence uploads at `environment=uat` under `--release REQ-051`. Same mechanism that worked cleanly on REQ-050 yesterday.

## E2E partial outcome — what shifted in the 15-failure baseline

The full regression baseline on `develop` (pre-REQ-051) was 15 unexpected. Of those, 4 are demonstrably fixed by this PR; 3 remain but for different bugs filed as #200/#201; 1 previously-skipped surfaces as #202. Net expected post-PR: **~11 unexpected** (15 − 4 fixed + 1 newly-exercised) until the follow-ups land.

## Out of scope (documented, deferred)

- `generateDateRangeReport` — separate REQ.
- CSS selector for the Total Revenue value card — [#200](https://github.com/metasession-dev/wawagardenbar-app/issues/200).
- Tip path DFR aggregation (REQ-035's `tipsBreakdown`) — [#201](https://github.com/metasession-dev/wawagardenbar-app/issues/201).
- Open-tab partial-payment query — [#202](https://github.com/metasession-dev/wawagardenbar-app/issues/202).
