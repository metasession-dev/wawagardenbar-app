# Release Ticket: REQ-106 — Cash Position tracking + Cash Deposits

**Status:** RELEASED
**Date:** 2026-09-14
**Requirement ID:** REQ-106
**Risk Level:** MEDIUM
**Issue:** [#769](https://github.com/metasession-dev/wawagardenbar-app/issues/769)
**Implementation branch:** `feat/bundle-cash-tags-expense-edit`

## Bundled Changes

Part of a 3-issue bundle declared up front (`Bundles: #767, #768, #769`) — REQ-104, REQ-105, and REQ-106 share one branch, one PR to `develop`, and one release cycle to `main`, each with its own REQ number, plan, and evidence pack. Bundle eligibility: all three are LOW/MEDIUM risk (no CRITICAL member, no more than one risk tier apart), and each touches a distinct file set with no scope overlap between them. Bundle manifest: `compliance/pending-releases/BUNDLED-CHANGES-REQ-104.md` / `.json` (`sha256:e84a35121bd6a67702a783a8fdfbbcc773fe716f0865a89d70498cc4b257df43`). Bundle ceremony runs at MEDIUM (the max risk across the set).

- **Core tracked release:** REQ-106 (declared bundle key; co-tracked with REQ-104, REQ-105)
- **Absorbed predecessor releases:** None
- **Absorbed non-release work:** housekeeping commits since `main` — see `compliance/pending-releases/BUNDLED-CHANGES-REQ-104.md` / `.json`
- **Why bundled here:** REQ-104, REQ-105, and REQ-106 were declared as an explicit bundle at Phase 1 planning time (`Bundles: #767, #768, #769`) — all three are LOW/MEDIUM risk, share one branch/PR/release cycle, and touch distinct file sets with no scope overlap between them.
- **Evidence impact:** Evidence ownership remains on each source REQ; the bundle manifest provides lineage and inherited visibility only.
- **Reviewer impact:** Approval scope covers all three co-tracked REQs plus the absorbed non-release housekeeping work listed in the bundle manifest.
- **Security / risk impact:** Bundle ceremony runs at MEDIUM (the max risk across the set, from REQ-106). No additional security/risk impact beyond what each REQ's own risk-register entries (R-029/R-030/R-031 for REQ-106) already document.
- **Reference:** `compliance/pending-releases/BUNDLED-CHANGES-REQ-104.md` / `.json`

## Summary

Adds a system-computed **Current Cash Position** to the Daily Report — cash sale revenue in (reusing `paymentBreakdown.cash`, tips excluded per operator decision), transferred cash-method expenses and cash deposits out, computed on-demand (mirrors `financial-report-service.ts`'s existing convention, no running counter). Pending expense groups gain a required Cash/Transfer payment method; only cash-method transferred groups reduce the position. A new Cash Deposit workflow (pending → approved → transferred, optional reference) moves till cash into the bank. A super-admin can adjust the position (initial opening balance or later correction) via a fully audited, append-only ledger.

## AI contributors

| Tool        | Version  | Commits                                                    | Date       |
| ----------- | -------- | ---------------------------------------------------------- | ---------- |
| Claude Code | Sonnet 5 | `1c1d664` (plan + implementation + tests + e2e-driven fix) | 2026-09-14 |

## Implementation details

- `models/cash-position-adjustment-model.ts` — unified opening-balance + correction audit ledger (append-only, signed delta).
- `models/cash-deposit-model.ts` — dedicated model (not folded into `PendingExpenseGroup`; never creates an `Expense` ledger row).
- `services/cash-position-service.ts` — on-demand computation (opening + cash-in − cash-out-expenses − cash-out-deposits).
- `services/cash-deposit-service.ts` — `pending → approved → transferred` state machine, shared with `PendingExpenseGroupService` via `lib/status-transition.ts`.
- `models/pending-expense-group-model.ts` — group-level `paymentMethod`; `services/pending-expense-group-service.ts` — conditional `transferReference` requirement (mandatory for transfer-method, optional for cash-method), batch payment-method homogeneity guard (`assignBatch` + `confirmTransfer`).
- New Daily Report section `components/features/reports/cash-position-section.tsx` (always renders, defined empty state) + `components/features/finance/cash-position-adjustment-dialog.tsx` (super-admin only).
- New Cash Deposits page (`/dashboard/finance/deposits`) + form/list/transfer-dialog components.
- `docs/SRS.md` — REQ-REPORT-007 + REQ-FIN-008 (new), REQ-FIN-003 (updated — drift). No ADR needed (reuses existing state-machine + on-demand-computation patterns). Risk register R-029/R-030/R-031 (new).
- Tests: 28 new unit tests across `cash-position-service.test.ts`, `cash-deposit-service.test.ts`, `pending-expense-group-service.test.ts` REQ-106 blocks; 5 new E2E tests.

## Notable finding during implementation

E2E execution (against a local dev server backed by the tunneled UAT database) surfaced a genuine business-date resolution defect: `CashPositionService` originally derived business-day boundaries from a synthetic "noon" anchor `Date` via `businessDayRange()`, which could resolve to the _previous_ business day under a late (15:00 WAT) cutoff — causing a same-day, already-recorded opening balance to read back as "not yet tracked." Fixed by deriving the label via `watCalendarDateKey` (matching `FinancialReportService.generateDateRangeReport`'s own approach) and resolving exact bounds via `businessDateQueryRange`. A regression unit test was added. Full writeup: `compliance/evidence/REQ-106/e2e-scope-decision.md`.

## Verification

- Unit: 1,479 passed, 4 skipped (full suite), 33 new for this REQ.
- E2E: 5/5 targeted tests passed; 33/35 adjacent regression specs passed (2 pre-existing UI-read timing flakes in `expense-link.spec.ts`, confirmed unrelated via direct database inspection — the underlying stock-increment logic is correct).
- TypeScript/ESLint: 0 errors.
- Full detail: `compliance/evidence/REQ-106/test-execution-summary.md`.

## Iteration 1 — defect (post-UAT, 2026-09-15)

UAT found a same-day cash-position adjustment did not update the displayed closing position until the following business day (AC6 regression). Root cause and fix: `compliance/plans/REQ-106/implementation-plan.md` § "Plan deviation". Filed as [wawagardenbar-app#779](https://github.com/metasession-dev/wawagardenbar-app/issues/779). New `adjustments` field on `CashPositionSummary`, `± Adjustments` UI line, strengthened e2e assertion, new unit regression test.

## Iteration 2 — requirements gap (post-UAT, 2026-09-16)

UAT flagged that "Current Cash Position" behaved like an accumulation over the Daily Report's selected date/range rather than the live till balance right now — AC1 never specified this. Folded into REQ-106 per operator direction. Added AC9 (decouples the Daily Report section from the date picker — always live) and AC10 (new `/dashboard/finance/cash-position` page: live balance, total cash sales in since opening, itemized reverse-chronological ledger of every transferred cash expense, transferred deposit, and manual adjustment). See `compliance/plans/REQ-106/implementation-plan.md` § "Requirements gap accepted (amended post-UAT, iteration 2)".

## Sign-off (dual-actor)

Solo-operator team — the "reviewer ≠ submitter" check is interpreted as actor type, not human identity: AI tooling (this implementation) and the human operator (portal approver) are distinct actors. MEDIUM risk auto-continued through Phase 1 per skill policy (no HIGH/CRITICAL plan-approval pause). The operator reviews the shared bundle PR + performs the portal UAT review before Production approval.
