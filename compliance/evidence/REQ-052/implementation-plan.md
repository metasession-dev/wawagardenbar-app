# REQ-052 — `recordPartialPayment` sets `tab.businessDate` on the first partial payment

**Requirement ID:** REQ-052
**Risk Level:** MEDIUM
**GitHub Issue:** [#202](https://github.com/metasession-dev/wawagardenbar-app/issues/202)
**Date:** 2026-05-31

## Context

`TabService.recordPartialPayment` (`services/tab-service.ts:624-720`) pushes a new partial-payment subdoc onto `tab.partialPayments` but doesn't set `tab.businessDate`. Only `closeTab` and `completeTabPaymentManually` set it.

For OPEN tabs with one or more partial payments:

- `tab.businessDate`: undefined (not yet set)
- `tab.paidAt`: undefined (not yet set)
- `tab.partialPayments[i].paidAt`: set to `new Date()` per payment

The DFR aggregator's `aggregatePartialPayments` query (`services/financial-report-service.ts:171`) has three `$or` branches all keyed on `tab.businessDate` or `tab.paidAt`. Open tabs match no branch → never counted in the DFR.

Discovered by the [#202](https://github.com/metasession-dev/wawagardenbar-app/issues/202) regression triage after REQ-051 unblocked the preceding serial-mode test. Snapshot evidence in [`run 26713876740`](https://github.com/metasession-dev/wawagardenbar-app/actions/runs/26713876740): the open tab's ₦612 partial payment didn't move the DFR cash bucket.

## Acceptance criteria

1. **AC1** — `recordPartialPayment` on a tab with no `businessDate` sets `tab.businessDate = deriveBusinessDate(new Date(), cutoff)` where `cutoff` is the value of `SystemSettingsService.getBusinessDayCutoff()`.
2. **AC2** — `recordPartialPayment` on a tab that already has `businessDate` set does NOT overwrite it. The tab's business day is locked at the first payment event.
3. **AC3** — `daily-report-payments.spec.ts:daily report shows partial payment even though tab is still open` ([#202](https://github.com/metasession-dev/wawagardenbar-app/issues/202)) passes deterministically.
4. **AC4** — No regression in closed-tab flows (`closeTab`, `completeTabPaymentManually`, `addOrderToTab`) or other tab-service tests.
5. **AC5** — No DB migration; `tab.businessDate` field type unchanged.

## Technical approach

### 1. Change in `services/tab-service.ts`

```diff
   // REQ-035 — guard tipAmount before mutating.
   const tipAmount = params.tipAmount ?? 0;
   if (!Number.isFinite(tipAmount) || tipAmount < 0) {
     throw new Error('tipAmount must be a non-negative number');
   }

+  // REQ-052 — first partial payment locks the tab's businessDate so the
+  // DFR's aggregatePartialPayments query can find this tab. Subsequent
+  // partials don't overwrite (multi-day open tabs are rare; the cash event
+  // that opened the day stays the canonical attribution).
+  if (!tab.businessDate) {
+    const cutoff = await SystemSettingsService.getBusinessDayCutoff();
+    tab.businessDate = deriveBusinessDate(new Date(), cutoff);
+  }

   // Record the partial payment
   tab.partialPayments.push({ ... });
```

3 LOC (+ 4 LOC for the comment). No new imports — `deriveBusinessDate` and `SystemSettingsService` are already imported in the file (used by `closeTab` + others).

### 2. Tests

Per project memory (`feedback_tests_before_push`): write tests **first**, then implementation.

- **Unit**: new `__tests__/services/tab-service.business-date.test.ts` (~80 LOC).
  - AC1: open tab + no businessDate → recordPartialPayment → businessDate set via deriveBusinessDate.
  - AC2: tab with existing businessDate → recordPartialPayment → businessDate unchanged.
  - Multi-partial: 3 partials in sequence → businessDate set once (on first), unchanged on subsequent.
  - Cutoff plumbing: SystemSettingsService.getBusinessDayCutoff awaited; non-default cutoff (e.g. '06:00') honoured.
- **E2E**: focused regression on `e2e/daily-report-payments.spec.ts` — the open-tab partial test passes.

### 3. Dependencies

- `deriveBusinessDate` already imported in `tab-service.ts`.
- `SystemSettingsService.getBusinessDayCutoff()` already used by `closeTab` and `completeTabPaymentManually`.
- No new packages.

## Security considerations

### STRIDE

| Category                | Risk                                                                                                                                                                                                                            | Mitigation                |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------- |
| **S** (Spoofing)        | N/A — no auth surface change.                                                                                                                                                                                                   | —                         |
| **T** (Tampering)       | Could the write-once semantic be abused? Once set, `businessDate` is immutable from this code path. Already-set values are preserved.                                                                                           | Test AC2.                 |
| **R** (Repudiation)     | N/A — audit log already records partial-payment events.                                                                                                                                                                         | —                         |
| **I** (Info disclosure) | Could the DFR now expose data that wasn't visible before? **No** — admins authorised for today's DFR are already authorised for every report date. Open-tab partial payments are simply attributed to the correct business day. | Code-review + unit tests. |
| **D** (DoS)             | One additional async fetch of the cutoff setting per partial-payment call. Same fetch closeTab already does. Negligible.                                                                                                        | —                         |
| **E** (Elevation)       | N/A — no role change.                                                                                                                                                                                                           | —                         |

### Four-eyes attestation

- **Submitter**: AI tooling (Claude Code via the project orchestrator).
- **Reviewer**: ostendo-io (solo-operator dual-actor interpretation — see DevAudit-Installer#89 gap 10).

## Rollback plan

1. Single PR. `git revert <merge-sha>` restores the prior behaviour atomically. Newly-set businessDate values on existing tabs persist (they're not overwritten on revert; the data is correctly set per the original intent of REQ-025).
2. No DB migration; no schema change.
3. Detection: monitor #202 — if open-tab partials regress to invisible in DFR after revert, original behaviour is back.

## Test scope

| Gate                                | Expected                                                         |
| ----------------------------------- | ---------------------------------------------------------------- |
| `npx tsc --noEmit`                  | exit 0                                                           |
| `npx vitest run` (full suite)       | new tests pass; existing tab-service tests still pass; no flakes |
| `npx eslint <changed>`              | 0 errors                                                         |
| `npm audit --audit-level=high`      | 0 high/critical                                                  |
| `semgrep scan --severity ERROR`     | 0 new findings on REQ-052 code                                   |
| E2E focused (daily-report-payments) | open-tab partial test passes                                     |
| E2E full regression                 | net failures: 1 fewer (#202 cleared)                             |
