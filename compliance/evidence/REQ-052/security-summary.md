# REQ-052 — Security summary

**Requirement ID:** REQ-052
**Risk class:** MEDIUM
**Surface:** `services/tab-service.ts:recordPartialPayment` (3-LOC insert).

## STRIDE assessment

| Category                  | Risk introduced by REQ-052? | Rationale / mitigation                                                                                                                                                                                                                                  |
| ------------------------- | --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **S** — Spoofing          | No                          | No auth-surface change. The change is internal to the service and runs only after `recordPartialPayment`'s existing caller-authorised path.                                                                                                             |
| **T** — Tampering         | No (defensive)              | Write-once semantics on `tab.businessDate` from this code path: existing values are preserved (covered by AC2). The only insert is `if (!tab.businessDate) tab.businessDate = …` — no other field is mutated by REQ-052.                                |
| **R** — Repudiation       | No                          | The existing audit-log entry for the partial-payment event records `paidAt`, processor, amount, payment type. Setting `tab.businessDate` is an internal aggregation key; it doesn't change what's audit-logged.                                         |
| **I** — Info disclosure   | No                          | DFR access is admin-gated already; admins authorised for today's DFR are by policy authorised for every report date. Making open-tab partial payments visible at the correct business day improves financial-integrity reporting, not exposure surface. |
| **D** — Denial of service | Negligible                  | One additional `await SystemSettingsService.getBusinessDayCutoff()` per partial payment when `tab.businessDate` is unset. The same fetch already runs on every `closeTab` / `completeTabPaymentManually` call and has not been a DoS surface there.     |
| **E** — Elevation         | No                          | No role / permission change; no new endpoint; no new caller path.                                                                                                                                                                                       |

## Threat model — write-once semantics

The fix relies on `if (!tab.businessDate)` to be the only gate. Failure
modes considered:

1. **Race on simultaneous partials** — two concurrent
   `recordPartialPayment` calls on the same tab could both see
   `tab.businessDate === undefined` and both write. **Outcome**: both
   writes resolve to the same `deriveBusinessDate(new Date(), cutoff)`
   value (cutoff is a settings read; the date math is deterministic per
   business day). The Mongoose `tab.save()` is last-write-wins, but
   both writes set the same value, so the final state is correct.
   No mitigation needed.

2. **Pre-existing `tab.businessDate` set by a prior `closeTab` /
   `completeTabPaymentManually`** — a tab cannot be both `closed` and
   eligible for `recordPartialPayment` (the function throws early if
   `tab.status === 'closed'`), so this combination cannot arise.

3. **Manual write of `tab.businessDate` from an admin tool** — there is
   no admin tool that sets `tab.businessDate` directly. The
   `applyExpenseStockDelta`-style migration script in REQ-050 does not
   touch tabs. If a future migration sets the field, the AC2 semantics
   ensure REQ-052 honours it.

## Static analysis

`semgrep scan --config auto services/tab-service.ts` → 0 findings.

## Dependency audit

`npm audit --audit-level=high` → unchanged vs the REQ-051 baseline.
0 high / 0 critical; 7 pre-existing moderates (transitive, tracked via
the dependency-update cadence).

## Four-eyes attestation

- **Submitter**: Claude Code (AI tool) via project orchestrator.
- **Reviewer**: ostendo-io (solo-operator dual-actor interpretation per
  DevAudit-Installer issue #89 gap 10).

## Out of scope

- The pre-existing `console.warn` lint warnings at `tab-service.ts:363`
  and `:849` predate REQ-052 and are not addressed here. The REQ-052
  insert (line ~670) is comment-only above + `if`-guarded.
