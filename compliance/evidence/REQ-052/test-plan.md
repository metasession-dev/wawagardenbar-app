# REQ-052 — Test plan

**Requirement ID:** REQ-052
**Risk:** MEDIUM
**Related issue:** [#202](https://github.com/metasession-dev/wawagardenbar-app/issues/202)
**Date:** 2026-05-31

## Acceptance criteria → tests

| AC  | Statement                                                                                             | Unit test                                                                                            | E2E                                                                 |
| --- | ----------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| AC1 | `recordPartialPayment` on a tab with no `businessDate` sets it via `deriveBusinessDate(now, cutoff)`. | `tab-service.business-date.test.ts` — "AC1 — open tab with no businessDate"                          | `e2e/daily-report-payments.spec.ts` — "partial payment on open tab" |
| AC2 | `recordPartialPayment` on a tab that already has `businessDate` does NOT overwrite.                   | `tab-service.business-date.test.ts` — "AC2 — tab with existing businessDate"                         | n/a — covered by unit boundary                                      |
| AC3 | `#202` regression spec passes deterministically.                                                      | n/a                                                                                                  | `e2e/daily-report-payments.spec.ts` — "partial payment on open tab" |
| AC4 | No regression in closed-tab flows or other tab-service tests.                                         | `tab-service.tip.test.ts`, `tab-service.tip-method.test.ts`, full `__tests__/services/tab-service.*` | full e2e regression suite                                           |
| AC5 | No DB migration; `tab.businessDate` field type unchanged.                                             | n/a — verified by type-check and code inspection                                                     | n/a                                                                 |

## Test environment

- **Unit**: vitest 4.x via `npx vitest run`. Mongo / network boundary
  fully mocked. `SystemSettingsService.getBusinessDayCutoff` and
  `deriveBusinessDate` mocked at module boundary; `connectDB` mocked to
  a no-op.
- **E2E**: Playwright against [UAT app](https://wawagardenbar-app-uat.up.railway.app/)
  on `feat/REQ-052-partial-payment-businessdate` once integration PR
  merges. Existing `daily-report-payments.spec.ts` previously skipped/
  failing test is the load-bearing gate.

## Quality gates

| Gate                                                                  | Expected              | Actual (2026-05-31)                                   |
| --------------------------------------------------------------------- | --------------------- | ----------------------------------------------------- |
| `npx tsc --noEmit`                                                    | exit 0                | exit 0                                                |
| `npx vitest run` (full)                                               | 0 failures            | 893 pass / 4 skip / 0 fail                            |
| `npx vitest run __tests__/services/tab-service.business-date.test.ts` | 4 pass                | 4 pass                                                |
| `npx eslint <changed>`                                                | 0 errors              | 0 errors (2 pre-existing console warnings unaffected) |
| `semgrep scan --config auto services/tab-service.ts`                  | 0 findings            | 0 findings                                            |
| `npm audit --audit-level=high`                                        | unchanged             | unchanged (7 moderate, unrelated)                     |
| E2E focused (`daily-report-payments.spec.ts`)                         | open-tab partial pass | TBC on CI after merge                                 |
| E2E full regression suite                                             | net -1 failure (#202) | TBC on CI after merge                                 |

## Test data

- TAB_ID `65a1b2c3d4e5f6a7b8c9d0e1` (synthetic).
- PROCESSED_BY `65a1b2c3d4e5f6a7b8c9d0e2` (synthetic).
- FIXED_BUSINESS_DATE `2026-05-31T00:00:00.000Z` (mock).
- EXISTING_BUSINESS_DATE `2026-04-01T00:00:00.000Z` (mock — sentinel for
  the AC2 "doesn't overwrite" assertion).

## Sequencing

1. Unit gate runs locally + on CI per push.
2. E2E gate runs against UAT on push to `develop` via integration PR.
3. Release PR `develop → main` aggregates the CI evidence.

## Rollback signal

`#202` reopens (`daily report shows partial payment even though tab is
still open` reverts to failing) → revert `services/tab-service.ts` to the
pre-REQ-052 state via `git revert <merge-sha>`; newly-written
`businessDate` values on existing tabs persist (the field stays set; the
correct intent of REQ-025 is preserved).
