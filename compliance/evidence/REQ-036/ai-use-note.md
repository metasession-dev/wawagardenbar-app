# AI Use Note — REQ-036

**Requirement:** REQ-036 — Quick-action tip-method parity + tip display on order surfaces (add-on to REQ-035)
**Risk Level:** MEDIUM (1 reviewer)
**Date:** 2026-05-07
**AI Tool:** Claude Code (Claude Opus 4.7, 1M context)

## Scope of AI involvement

| Surface                                                                                                                                           | AI authored       | Human reviewed            |
| ------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------- | ------------------------- |
| `Tab.partialPayments[].tipPaymentMethod` schema additions                                                                                         | Yes               | Yes — pre-merge PR review |
| `interfaces/tab.interface.ts` IPartialPayment field                                                                                               | Yes               | Yes                       |
| `TabService.recordPartialPayment` + `completeTabPaymentManually` extensions                                                                       | Yes (tests-first) | Yes                       |
| `__tests__/services/tab-service.tip-method.test.ts` (3 tests)                                                                                     | Yes (tests-first) | Yes                       |
| `services/financial-report-service.ts:aggregatePartialPayments` `??` change                                                                       | Yes (tests-first) | Yes                       |
| `__tests__/services/financial-report-service.tip-method.test.ts` (2 tests)                                                                        | Yes (tests-first) | Yes                       |
| Server-action passthrough (`expressCloseTabAction`, `recordPartialPaymentAction`, `completeTabPaymentManuallyAction`)                             | Yes               | Yes                       |
| Customer-checkout `payment-actions:createOrder` extension                                                                                         | Yes               | Yes                       |
| `AdminPayTabDialog` tip-method state for both branches                                                                                            | Yes               | Yes                       |
| `TipInputStep` Cash/POS/Transfer Select                                                                                                           | Yes               | Yes                       |
| `CheckoutForm` Zod schema + refine                                                                                                                | Yes               | Yes                       |
| `OrderPaymentInfo` tip + method row                                                                                                               | Yes               | Yes                       |
| `OrderSummary` tip line + total update                                                                                                            | Yes               | Yes                       |
| Tab detail page partial-payments serialization + render                                                                                           | Yes               | Yes                       |
| `e2e/orders/admin-pay-tab-tip-method.spec.ts`                                                                                                     | Yes               | Yes                       |
| Compliance artefacts (test-scope, test-plan, implementation-plan, security-summary, test-execution-summary, ai-prompts, this file, uat-checklist) | Yes               | Yes                       |

## AI-specific risks for this REQ

### Risk: AI introduces double-counting or breaks REQ-035's AC6 invariant

REQ-035's AC6 (`paymentBreakdown.total` unchanged when tips are present) is the most reviewable correctness property. REQ-036 only changes the tip-side bucket attribution, but the aggregator code paths overlap.

**Mitigation:**

- The bill-side attribution line `paymentBreakdown[method] += amount` is **unchanged** — still uses `pp.paymentType`. Only the tip-side path got the `??` fallback.
- All REQ-035 unit tests (including the AC6 regression "paymentBreakdown.total is unchanged when tips are present") run unmodified on the new code; 512/512 baseline pass.
- Documented in `ai-prompts.md` as a reviewer scrutiny area.

### Risk: Mongoose default behaviour silently introduces an empty `tipPaymentMethod` field on legacy rows

Mongoose schema-level enums default to `undefined` when no default is set. New writes only set `tipPaymentMethod` when explicitly supplied (the `...(params.tipPaymentMethod !== undefined ? { tipPaymentMethod } : {})` spread guard).

**Mitigation:** Service-layer test asserts the field stays unset when caller omits it. Aggregator test asserts the legacy fallback path produces correct attribution. Both tests pass.

### Risk: AI declares "Tests to Update: None" without auditing

Documented as a real risk in REQ-033's ai-use-note.

**Mitigation:** test-plan.md explicitly enumerates the existing tests and confirms why each is "verified safe — no update needed". REQ-035 tests pass unchanged because their fixtures don't set the new field; the aggregator's `??` fallback preserves their expected outcomes.

### Risk: AI under auto-mode skips review pause

Memory feedback `feedback_sdlc_impl_plan_review.md`: HIGH-risk REQs require explicit human approval. REQ-036 is MEDIUM, so the pause is lighter. The user explicitly approved with "create an issue and implement as an add on to issue #76" before any code landed. Scaffold + implementation + evidence sequence followed.

## Components Regenerated

None — every edit is targeted at existing infrastructure (REQ-012 partial-payments, REQ-013 double-count guard, REQ-035's `<TipInputRow>` and `tipsBreakdown`). No file rewritten from scratch.

## Reviewer Sign-off (post-merge)

- **Lead reviewer (1 of 1, MEDIUM baseline):** ostendo-io
- **AI-involvement bump applied:** No. Change is contained, deterministic, all logic in pure helpers + service-layer methods that mirror existing REQ-035 audited patterns.
- **Sign-off date:** TBD (post-PR merge).
