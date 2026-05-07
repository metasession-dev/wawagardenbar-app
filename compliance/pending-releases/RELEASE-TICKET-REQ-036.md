# Release Ticket: REQ-036 — Quick-action tip-method parity + tip display on order surfaces

**Status:** DRAFT
**Date:** 2026-05-07
**Requirement ID:** REQ-036
**Risk Level:** MEDIUM (additive schema field + thin service passthrough + UI display)
**Issue:** [#77](https://github.com/metasession-dev/wawagardenbar-app/issues/77)
**Parent Issue:** [#76](https://github.com/metasession-dev/wawagardenbar-app/issues/76) (REQ-035)
**Add-on to:** REQ-035 — same merge cycle if both ready, otherwise separate PR after REQ-035.

---

## Summary

Closes the gap surfaced after REQ-035 hit UAT: the **Process Tab Payment** dialog (Full + Partial branches) and the **customer-checkout Tip step** ("Pay Now" flow) shipped with only a tip-amount input. They lacked the independently-selectable tip-payment-method dropdown that the Express create-order surface has. Without it, staff cannot record a card-paid bill with a cash tip on these surfaces — the tip rolls into the bill bucket of the Daily Financial Report.

Adds:

1. **Tip method dropdown** on Process Tab Payment > Full Payment, Process Tab Payment > Partial Payment, and customer-checkout TipInputStep.
2. **Schema field** `Tab.partialPayments[].tipPaymentMethod` (optional enum). Aggregator falls back to `pp.paymentType` for legacy rows.
3. **Tip display** on admin order detail (`OrderPaymentInfo`), customer checkout summary (`OrderSummary`), and tab detail's partial-payments history.
4. **Aggregator fix**: `pp.tipPaymentMethod ?? pp.paymentType` in the partial-payment tip path of `aggregatePartialPayments`.

**No destructive migration. No backfill required.**

---

## AI Involvement

- **AI Tool Used:** Claude Code (Claude Opus 4.7, 1M context)
- **AI-Generated Files:** schema additions, service extensions, server-action passthroughs, UI dropdown wiring (mirrors REQ-035 patterns), display additions, all SDLC artefacts.
- **Human Reviewer of AI Code:** ostendo-io (1 reviewer per MEDIUM Risk-Tiered Review Policy).
- **Components Regenerated:** None — every change is a targeted edit.
- **Prompt log:** `compliance/evidence/REQ-036/ai-prompts.md`.

MEDIUM risk — 1 reviewer. AI-prompts artefact authored as good hygiene given financial-data-adjacent scope (carries forward from REQ-035 expectations).

---

## Implementation Details

(See `compliance/evidence/REQ-036/implementation-plan.md` for the full file-level spec.)

**Files Created:**

- `__tests__/services/tab-service.tip-method.test.ts` (3 tests)
- `__tests__/services/financial-report-service.tip-method.test.ts` (1 test)
- `e2e/orders/admin-pay-tab-tip-method.spec.ts`

**Files Modified:**

- `models/tab-model.ts` (+ `partialPayments[].tipPaymentMethod`)
- `interfaces/tab.interface.ts` (mirror)
- `services/tab-service.ts` (`recordPartialPayment` + `completeTabPaymentManually` accept `tipPaymentMethod`)
- `services/financial-report-service.ts` (aggregator one-line `??` fallback)
- `app/actions/admin/express-actions.ts` (forward `tipPaymentMethod`)
- `app/actions/tabs/tab-actions.ts` (forward in both partial + full actions)
- `app/actions/payment/payment-actions.ts` (customer-checkout: accept + persist on Order)
- `components/features/admin/tabs/admin-pay-tab-dialog.tsx` (tip method state for both branches; pass to `<TipInputRow>`)
- `components/features/checkout/tip-input-step.tsx` (add Select)
- `components/features/checkout/checkout-form.tsx` (schema + default + submit forwarding)
- `components/features/admin/order-payment-info.tsx` (render tip + method)
- `components/features/checkout/order-summary.tsx` (render tip line)
- `app/dashboard/orders/tabs/[tabId]/page.tsx` (serialize + render per-row tip)
- `compliance/RTM.md` (REQ-036 row)

**Schema additions:**

- `Tab.partialPayments[].tipPaymentMethod?: 'cash' | 'transfer' | 'card'` — optional, falls back to `paymentType` for legacy rows.

---

## Acceptance Criteria

(See `compliance/evidence/REQ-036/test-plan.md` for the canonical AC list and AC↔test mapping.)

---

## Test Plan

`compliance/evidence/REQ-036/test-plan.md`

---

## Quality Gates

- [ ] TypeScript: 0 errors (`tsc --noEmit`)
- [ ] Lint: 0 errors (or pre-existing config issue noted)
- [ ] Unit tests: 4 new pass; 512 baseline still pass
- [ ] E2E: `e2e/orders/admin-pay-tab-tip-method.spec.ts` passes
- [ ] Build: `npm run build` succeeds
- [ ] Semgrep: 0 new high/critical findings
- [ ] Dependency audit: 0 new high/critical vulnerabilities
- [ ] Compliance validator: `bash scripts/validate-compliance-artifacts.sh` passes for REQ-036

---

## Rollback Plan

Single additive change. Rollback = revert the merge commit. The new schema field on `Tab.partialPayments[].tipPaymentMethod` is optional — reverting code does not break existing rows. The aggregator's `??` fallback means the report continues to work pre- or post-rollback. No DB migration to reverse.

---

## Post-Deploy Actions

1. **No backfill required.** Legacy partial-payment rows have no `tipPaymentMethod`; aggregator falls back to `paymentType`. Future writes pick up the new field.
2. **Verify Daily Financial Report** for a date with at least one tipped tab partial-payment that recorded an explicit `tipPaymentMethod` distinct from `paymentType` (e.g. card bill + cash tip). Confirm the tip lands in the cash bucket of Tips Received.
3. **Spot-check capture surfaces** — customer-checkout Tip step shows the dropdown; Process Tab Payment shows the dropdown on both branches.
4. **Spot-check display surfaces** — admin order detail shows tip + method row; customer checkout summary shows tip line; tab detail shows per-row tips.

---

## Sign-off

- [ ] Implementation complete
- [ ] All quality gates pass on develop
- [ ] META-COMPLY UAT approval obtained
- [ ] PR merged to main
- [ ] Production smoke (capture + display + report attribution) green
