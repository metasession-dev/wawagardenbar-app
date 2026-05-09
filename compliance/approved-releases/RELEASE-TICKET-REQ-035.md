# Release Ticket: REQ-035 — Tip recording at express checkout + tips breakdown in Daily Financial Report

**Status:** APPROVED - DEPLOYED
**Date:** 2026-05-07
**Approved:** 2026-05-08 — META-COMPLY UAT approved
**Merged:** 2026-05-08 12:44:04 UTC — merge commit `c5b4e44` (PR [#80](https://github.com/metasession-dev/wawagardenbar-app/pull/80))
**Requirement ID:** REQ-035
**Risk Level:** HIGH (financial-data write path; multi-collection schema additions; daily-report aggregator change)
**Issue:** [#76](https://github.com/metasession-dev/wawagardenbar-app/issues/76) (closed)
**Independent of:** REQ-034 (#74) — can ship in parallel, no soak-window dependency.
**Add-on shipped alongside:** REQ-036 (#77) — tip-method dropdown parity + tip display on order surfaces.

---

## Summary

Adds tip capture at the till and tip reporting in the Daily Financial Report.

1. **Express create-order:** the payment step gains a tip amount input + an independently-selectable tip payment method (cash / POS / transfer), defaulting to the bill's payment method.
2. **Close-tab:** every partial-payment row gains its own tip amount; the row's `paymentType` doubles as the tip method. Tab-level `tipAmount` becomes a derived sum.
3. **Daily Financial Report:** a new "Tips received" card grid renders beneath the existing "Revenue by method", showing per-method tip amounts (cash / POS / transfer / ussd / phone / unspecified) with percentage of total tips. PDF / Excel / CSV exports include the tips block.

The realistic operational case the feature targets: customer pays card and tips cash. Today, that tip is invisible to the business — uncaptured at the till, unreported.

**Tips do NOT inflate revenue.** `paymentBreakdown.total` continues to mean revenue-only; the new `tipsBreakdown` is reported alongside, not added in. AC6 protects this invariant via a regression test.

---

## AI Involvement

- **AI Tool Used:** Claude Code (Claude Opus 4.7, 1M context)
- **AI-Generated Files:** payment-method interface, pure helpers + tests, tip-input-row + tips-section components, server-action extensions, schema additions, backfill script, all SDLC artefacts.
- **Human Reviewers of AI Code:** ostendo-io + 1 additional reviewer (HIGH risk — 2 reviewers required per Risk-Tiered Review Policy)
- **Components Regenerated:** None — every change is a targeted edit.
- **Prompt log:** `compliance/evidence/REQ-035/ai-prompts.md` (compiled before merge)

HIGH risk — 2 reviewers + AI-prompts artefact required. No AI-involvement bump warranted because the change is contained, deterministic, all logic in pure helpers + service-layer methods that mirror existing patterns (REQ-013 tipAmount field, REQ-032 financial-report-service shape).

---

## Implementation Details

(See `compliance/evidence/REQ-035/implementation-plan.md` for the full file-level spec.)

**Files Created:**

- `interfaces/payment-method.ts` — first-class enum exports
- `lib/tip-aggregation.ts` — pure helpers
- `__tests__/lib/tip-aggregation.test.ts` (8 tests)
- `__tests__/services/order-service.tip.test.ts` (5 tests)
- `__tests__/services/tab-service.tip.test.ts` (5 tests)
- `__tests__/services/financial-report-service.tip.test.ts` (4 tests)
- `components/features/orders/tip-input-row.tsx`
- `components/features/reports/tips-section.tsx`
- `scripts/backfill-tip-payment-method.ts` (idempotent)
- `e2e/orders/express-tip-capture.spec.ts`
- `e2e/orders/close-tab-tip-capture.spec.ts`

**Files Modified:**

- `models/order-model.ts` (+ `tipPaymentMethod` field + pre-validate hook)
- `interfaces/order.interface.ts` (mirror)
- `models/tab-model.ts` (+ `partialPayments[].tipAmount` + pre-save recompute hook)
- `interfaces/tab.interface.ts` (mirror)
- `services/order-service.ts` (`completeOrderPaymentManually` accepts tip fields)
- `services/tab-service.ts` (`completeTabPaymentManually` accepts per-row tip)
- `services/financial-report-service.ts` (+ `tipsBreakdown` aggregation)
- `app/actions/admin/express-actions.ts` (forward tip fields)
- `app/dashboard/orders/express/create-order/page.tsx` (render TipInputRow)
- close-tab UI — exact path under `app/dashboard/orders/tabs/[tabId]/...` (verified during implementation)
- `app/dashboard/reports/daily/daily-report-client.tsx` (render TipsSection)
- `lib/report-export.ts` (PDF / Excel / CSV extended)
- `compliance/RTM.md` (REQ-035 row)

**Schema additions:**

- `Order.tipPaymentMethod?: 'cash' | 'card' | 'transfer' | 'ussd' | 'phone'` — optional, validated against existing `tipAmount > 0`.
- `Tab.partialPayments[].tipAmount?: number` — default 0, min 0.
- Tab-level `tipAmount` becomes a derived sum maintained server-side.

---

## Acceptance Criteria

(See `compliance/evidence/REQ-035/test-plan.md` for the canonical AC list and AC↔test mapping.)

---

## Test Plan

`compliance/evidence/REQ-035/test-plan.md`

---

## Quality Gates

- [x] TypeScript: 0 errors (`tsc --noEmit`) — `gates/tsc.txt`
- [x] Unit tests: 26 new pass + 486 baseline = 512 total — `gates/vitest-summary.txt`
- [x] E2E: 2 new specs parse and skip-graceful; CI ran the full suite end-to-end on `72b862c`
- [x] Build: `npm run build` succeeds (verified locally on `0ad8edf`)
- [x] Semgrep: 0 findings on REQ-035 changed files (`gates/semgrep.json`); 3 ERROR-level findings on workflow YAML are baseline drift unrelated to this REQ
- [x] Dependency audit: 0 unaccepted high/critical (`gates/dependency-audit.json`); mongoose bump 8.7.0→8.23.1 in `72b862c` cleared GHSA-wpg9-53fq-2r8h baseline drift
- [x] CI Pipeline: PASS on `72b862c` ([run #75](https://github.com/metasession-dev/wawagardenbar-app/actions/runs/25497499761)) — Quality Gates ✓ Register Release ✓ Upload Evidence ✓
- [x] Compliance validator: `bash scripts/validate-compliance-artifacts.sh` passes for REQ-035

---

## Rollback Plan

Single additive change. Rollback = revert the merge commit. All schema additions are optional fields with defaults:

- `Order.tipPaymentMethod` is `undefined` by default — reverting code does not break existing rows.
- `Tab.partialPayments[].tipAmount` defaults to 0 — reverting code does not break existing partial-payment subdocs.

The backfill script writes only when `tipAmount > 0` AND `tipPaymentMethod` is unset. Re-running it post-rollback is a no-op (the field exists in the document but the schema doesn't read it; it sits dormant). No DB migration to reverse.

---

## Post-Deploy Actions

1. **Run the backfill script** on production: `npx tsx scripts/backfill-tip-payment-method.ts`. Inspect log for total / per-method counts; verify a re-run reports 0 updates (idempotent).
2. **Verify Daily Financial Report** for a date with at least one tipped order/tab — Tips received cards render with non-zero amounts, percentages add to 100%.
3. **Spot-check Express create-order** — staff records a low-value test order with ₦100 tip in a different method from the bill; verify the order persists both `tipAmount` and `tipPaymentMethod`, and the report attributes the tip to the chosen method.
4. **Spot-check close-tab** — staff closes a tab with two partial payments each carrying its own tip; verify tab-level `tipAmount` = sum and the report rolls up correctly.
5. **Spot-check exports** — download PDF, Excel, CSV for the same date; verify the tips block is present and matches the on-screen figures.

No soak window required for downstream features. (REQ-034 is independent and queued separately.)

---

## Sign-off

- [x] Implementation complete
- [x] All quality gates pass on develop — CI run [#7](https://github.com/metasession-dev/wawagardenbar-app/actions/runs/25555263101) on `3adf04b` (Quality Gates ✓ Register Release ✓ Upload Evidence ✓)
- [x] Backfill script run on UAT, log inspected — `wawagardenbar_uat` had 0 candidates (REQ-035 first surface to capture tips)
- [x] META-COMPLY UAT approval obtained — 2026-05-08
- [x] PR merged to main — PR [#80](https://github.com/metasession-dev/wawagardenbar-app/pull/80), merge commit `c5b4e44` (2026-05-08 12:44:04 UTC)
- [x] Backfill script run on production — 2026-05-09 dry-run: **0 candidates** (`tipAmount > 0 AND tipPaymentMethod missing`). Mirrors UAT — REQ-035 is the first surface to capture tips, so no legacy rows exist. No write run needed (no-op).
- [ ] Production smoke (express tip + close-tab tip + report export) green — pending
