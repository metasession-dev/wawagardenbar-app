# Security Summary — REQ-036

**Requirement:** REQ-036 — Quick-action tip-method parity + tip display on order surfaces (add-on to REQ-035)
**Issue:** [#77](https://github.com/metasession-dev/wawagardenbar-app/issues/77)
**Parent Issue:** [#76](https://github.com/metasession-dev/wawagardenbar-app/issues/76) (REQ-035)
**Risk Level:** MEDIUM (additive optional schema field; thin service passthrough; UI display)
**Date:** 2026-05-07
**Develop SHA evaluated:** `adb96cc` (Quality Gates green; CI run [#76](https://github.com/metasession-dev/wawagardenbar-app/actions/runs/25509934777))

---

## Universal Gates

| Gate                        | Result                                                                   | Notes                                                                                                                                                                         |
| --------------------------- | ------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| TypeScript (`tsc --noEmit`) | **0 errors**                                                             | `gates/tsc.txt`                                                                                                                                                               |
| Vitest unit suite           | **517/517 passed** (512 baseline + 5 new)                                | `gates/vitest-summary.txt`                                                                                                                                                    |
| Semgrep SAST                | **0 findings on REQ-036 changed files**                                  | `gates/semgrep.json` — 3 ERROR-level findings on `.github/workflows/*.yml` are baseline drift unrelated to REQ-036 (carried over from REQ-035 evidence; not in REQ-036 scope) |
| Dependency audit            | **0 unaccepted high/critical** (1 high `xlsx` allowlisted in CI gate)    | `gates/dependency-audit.json` — REQ-035's mongoose 8.23.1 fix preserved; no new audit findings introduced by REQ-036                                                          |
| Playwright E2E              | One new spec parses + skip-graceful; CI ran end-to-end pass on `adb96cc` | `e2e/orders/admin-pay-tab-tip-method.spec.ts`                                                                                                                                 |
| CI pipeline (develop)       | **Quality Gates PASS at `adb96cc`**                                      | Run #76: Quality Gates ✓ Register Release ✓ Upload Evidence transient 429 (META-COMPLY rate limit on infra artefact upload — unrelated to REQ-036 code; resolves on retry)    |

---

## Security Assessment

### Data Integrity

**No schema removal. No destructive migration.** Only one optional field added: `Tab.partialPayments[].tipPaymentMethod` (enum cash/transfer/card). When unset, the daily-report aggregator's new `??` fallback uses `pp.paymentType`, producing identical attribution to pre-REQ-036 behaviour.

`Order.tipPaymentMethod` already exists from REQ-035 with its `pre('validate')` invariant (`tipAmount > 0 ⇒ tipPaymentMethod` set). Customer-checkout flow now forwards `tipPaymentMethod` through `payment-actions.ts:createOrder`; service-layer validation continues to apply.

**No backfill required.** Legacy partial-payment subdocs simply don't have a `tipPaymentMethod` property; aggregator fallback preserves their attribution.

### Access Control (RBAC)

**No new auth surface.** All capture surfaces inherit existing admin/super-admin gates from REQ-035:

- `expressCloseTabAction`, `recordPartialPaymentAction`, `completeTabPaymentManuallyAction` — admin/super-admin only (unchanged).
- Customer-checkout `payment-actions:createOrder` — open to authenticated customers + staff (unchanged); the `tipPaymentMethod` is metadata, no privilege change.

### Audit Logging

Per-payment audit preserved by reusing existing fields. Partial-payment subdocs continue to carry `processedBy` + `paidAt`; the new `tipPaymentMethod` rides on the same subdoc, attributable to a specific staff member at a specific time. No new audit-log code.

### Input Validation

Three layers (defence in depth):

1. **Action layer** — runtime checks in `app/actions/admin/express-actions.ts`, `app/actions/tabs/tab-actions.ts`, `app/actions/payment/payment-actions.ts`. Accept optional `tipPaymentMethod`; pass through to services.
2. **Service layer** — `TabService.recordPartialPayment` and `completeTabPaymentManually` only persist `tipPaymentMethod` when explicitly supplied (the `...(params.tipPaymentMethod !== undefined ? { tipPaymentMethod } : {})` guard). Mongoose enum on the schema rejects out-of-enum values at save time.
3. **Form-level** — `CheckoutForm` Zod refine enforces `tipPaymentMethod` is present when `tipAmount > 0`, blocking customer-checkout submit if the user picked an amount but skipped the method.

### NoSQL Injection

**N/A — no new query operator keys.** Reads/writes are typed Mongoose schema operations; the new field is set via `pp.tipPaymentMethod = …` (or via the spread-when-defined pattern in service code), never used as a query operator key.

### XSS / Output Encoding

**No new untrusted-source rendering.** Display surfaces (`OrderPaymentInfo`, `OrderSummary`, Tab detail page) render the persisted enum value via React's auto-escaping JSX with explicit `'card'` → `'POS / Card'` mapping. No `dangerouslySetInnerHTML`, no template injection.

### CSRF

**Reuses existing server actions.** Next.js server actions are CSRF-protected by the framework. No new fetch endpoint.

### Race Conditions / Concurrency

Behaviour unchanged from REQ-035. Per-tab serialisation via Mongoose `findById` + `save`. The new `tipPaymentMethod` is a single string field — no read-modify-write window beyond what `tipAmount` already had.

### Double-counting Prevention

AC8 invariant: aggregator prefers `pp.tipPaymentMethod` over `pp.paymentType` for tip attribution. Verified by `__tests__/services/financial-report-service.tip-method.test.ts` "AC8: card bill + cash tip on the same row → tip in cash bucket". REQ-035's AC6 invariant (`paymentBreakdown.total` unchanged) is preserved — this REQ only changes the tip-side bucket attribution, not revenue figures. Existing REQ-013 double-count guard for partial-payments vs orders is unchanged.

---

## Threat Model & Mitigations

### T1 — Staff overrides tipPaymentMethod to a method the bill wasn't paid in to evade tracking

By design — this is the _intended_ behaviour. The realistic case is "card-paid bill + cash-paid tip", which is auditable via the explicit `tipPaymentMethod` field and the existing `processedBy` audit trail.

**Mitigation:** every override is captured in the persisted document with a clear distinct field (paymentType vs tipPaymentMethod), so a deliberate misuse pattern is detectable in the audit log.

### T2 — Customer-checkout submit without tipPaymentMethod when tipAmount > 0

Form-level Zod refine blocks the submit. Service-layer doesn't have an equivalent guard for `Order` writes (it accepts `tipPaymentMethod` undefined when `tipAmount > 0`), but Mongoose `pre('validate')` from REQ-035 catches it at the schema layer.

**Mitigation:** three layers of validation; even if a malicious caller bypasses the form, the schema layer rejects.

### T3 — Aggregator mistakenly trusts pp.tipPaymentMethod from corrupted DB

`pp.tipPaymentMethod` is read defensively as `(pp as { tipPaymentMethod?: string }).tipPaymentMethod ?? method`, where `method` is `pp.paymentType`. If the value is unrecognized, falls through to `unspecified` bucket via the existing validMethods guard.

### T4 — Schema field added but service forgets to persist

Three new tests (`tab-service.tip-method.test.ts`) cover the persist paths. Aggregator test covers the read path.

---

## Static Analysis (Semgrep)

Ran `semgrep --config=auto` on the REQ-036 changed files:

- `models/tab-model.ts`, `interfaces/tab.interface.ts`
- `services/tab-service.ts`, `services/financial-report-service.ts`
- `app/actions/admin/express-actions.ts`, `app/actions/tabs/tab-actions.ts`, `app/actions/payment/payment-actions.ts`
- `components/features/admin/tabs/admin-pay-tab-dialog.tsx`
- `components/features/checkout/tip-input-step.tsx`, `components/features/checkout/checkout-form.tsx`, `components/features/checkout/order-summary.tsx`
- `components/features/admin/order-payment-info.tsx`
- `app/dashboard/orders/tabs/[tabId]/page.tsx`

**Result on REQ-036 files: 0 findings.**

3 ERROR-level findings present in `gates/semgrep.json` are on `.github/workflows/ci.yml` and `.github/workflows/compliance-evidence.yml` — baseline drift carried over from REQ-035 (semgrep ruleset bumped between REQ-033 ship date 2026-05-04 and today). REQ-036 does not modify any workflow YAML.

## Dependency Audit

`npm audit --omit=dev` on `adb96cc`:

- 1 HIGH — `xlsx` (pre-existing, allowlisted by CI gate `ACCEPTED="xlsx"`).
- 4 moderate — pre-existing.
- **0 new vulnerabilities introduced by REQ-036.**

Full output: `gates/dependency-audit.json`.

---

## Sign-off

- [x] All universal gates pass (Quality Gates job green on `adb96cc`)
- [x] Threat model reviewed (T1–T4)
- [x] No new auth surface
- [x] No new persistence path beyond optional fields with defaults
- [x] No new query operator keys
- [x] Static analysis clean on REQ-036 files
- [x] Dependency audit unchanged from REQ-035 baseline
- [x] No backfill required
- [x] AC8 (aggregator override) regression-guarded by unit test

Per the Risk-Tiered Review Policy, MEDIUM-risk additive UI + thin schema/service work requires **one** human reviewer.
