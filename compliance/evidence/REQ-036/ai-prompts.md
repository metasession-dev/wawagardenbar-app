# AI Prompt Log — REQ-036

**Requirement:** REQ-036 — Quick-action tip-method parity + tip display on order surfaces (add-on to REQ-035)
**Issue:** [#77](https://github.com/metasession-dev/wawagardenbar-app/issues/77)
**Parent Issue:** [#76](https://github.com/metasession-dev/wawagardenbar-app/issues/76)
**Risk Level:** MEDIUM (1 reviewer)
**AI tool:** Claude Code with Opus 4.7 (1M-context)
**Date:** 2026-05-07

---

## Session structure

REQ-036 was authored in the same Claude Code session that shipped REQ-035. After REQ-035 hit develop and was confirmed CI-green + UAT-deployable, the user surfaced the gap visible in three screenshots: (1) the Process Tab Payment dialog with only a tip amount input, (2) the customer-checkout TipInputStep with preset/custom amount only, (3) the working Express create-order modal with the dropdown for comparison.

The assistant clarified the scope via the user's confirmation that "Pay Now flow" = the customer-checkout TipInputStep (the screenshot showing the "Creating Order as Admin" badge), and that "Process Tab Payment" = AdminPayTabDialog. The user explicitly asked for the work to be filed as a new GitHub issue framed as an add-on to #76.

---

## Key prompts (verbatim from the user)

> "the order should have details of any tips paid along with what was ordered and the quick actions should also have the option with tips as express actions have."

> "there is a tip payment section when staff use the express actions with amount and payment method for the order as well as the tip payment method for the tip. The quick actions only have custom tip amount using the pay now flow as well as when using the process tab payment. the tip payment for quick actions needs to have payment types as well. All these need to be displayed correctly on customer orders and in the reports."

> "Which surface do you mean by 'the Pay Now flow' (the one that currently has a tip amount input but no tip-payment-type dropdown)? [3 screenshots showing AdminPayTabDialog Full Payment, customer TipInputStep, and Express create-order]"

> "create an issue and implement as an add on to issue #76"

The user provided the screenshots in lieu of the multi-choice clarifying question, which confirmed the surfaces unambiguously.

---

## AI-generated artefacts

Every file in the REQ-036 PR was AI-generated and human-reviewed. The new files:

- `__tests__/services/tab-service.tip-method.test.ts` (3 tests).
- `__tests__/services/financial-report-service.tip-method.test.ts` (2 tests).
- `e2e/orders/admin-pay-tab-tip-method.spec.ts`.

All SDLC artefacts (`test-scope.md`, `test-plan.md`, `implementation-plan.md`, this file, `security-summary.md`, `test-execution-summary.md`, `uat-checklist.md`, `ai-use-note.md`, the release ticket).

Modified files: `models/tab-model.ts`, `interfaces/tab.interface.ts`, `services/tab-service.ts`, `services/financial-report-service.ts`, `app/actions/admin/express-actions.ts`, `app/actions/tabs/tab-actions.ts`, `app/actions/payment/payment-actions.ts`, `components/features/admin/tabs/admin-pay-tab-dialog.tsx`, `components/features/checkout/tip-input-step.tsx`, `components/features/checkout/checkout-form.tsx`, `components/features/checkout/order-summary.tsx`, `components/features/admin/order-payment-info.tsx`, `app/dashboard/orders/tabs/[tabId]/page.tsx`, `compliance/RTM.md`.

---

## Areas requiring extra human-reviewer scrutiny

Per MEDIUM-risk policy, one human reviewer is required. The following decisions warrant explicit reviewer review beyond the line-by-line diff:

1. **Aggregator one-line `??` change.** `services/financial-report-service.ts:166-170` switched from `paymentBreakdown[method]` (where `method` was always `pp.paymentType`) to a parallel tip path that uses `pp.tipPaymentMethod ?? pp.paymentType`. Reviewers should confirm:
   - Legacy partial-payment rows (no `tipPaymentMethod` field) attribute identically to today (verified by `tab-service.tip.test.ts` from REQ-035 still passing without modification — its fixtures have no `tipPaymentMethod`).
   - The override branch lands tips in the correct bucket (verified by the new "AC8" regression test).
   - The bill-side `paymentBreakdown` attribution is **unchanged** (`paymentBreakdown[method] += amount` line still uses `pp.paymentType`).

2. **Customer-checkout Zod refine + form-level required validation.** `CheckoutForm` Zod refine asserts `tipPaymentMethod` is set when `tipAmount > 0`. Reviewers should confirm the refine fires before submit (vs. after server round-trip) and that the form-level error path is reachable.

3. **AdminPayTabDialog override-flag UX.** When staff opens the dialog and selects `paymentType = card`, `effectiveTipMethod` is `'card'` until they explicitly override via the dropdown. If they then change the bill `paymentType` to `'transfer'`, the tip method tracks the new bill type — UNLESS they had already overridden, in which case the override sticks. Reviewers should confirm this is the desired behaviour (it's the same pattern as Express create-order in REQ-035).

4. **Customer-checkout `OrderSummary` running total now includes the tip.** Previously the running summary's "Total" excluded the tip; with REQ-036 it includes `tipForTotal`. Reviewers should confirm this matches the customer's expectation (they're about to be charged the full amount, so the running total should reflect that).

---

## What the AI did NOT do

- Did not bypass any pre-commit hook or git verification.
- Did not modify CI workflow YAML.
- Did not run any production-touching command without explicit user confirmation.
- Did not attempt to fix the META-COMPLY HTTP 429 rate limit (out-of-band infra issue; documented as D1 in `test-execution-summary.md`).
- Did not extend `AdminPayOrderDialog` (Process Payment on order detail) — explicitly out of scope for REQ-036; tracked as separate follow-up.
