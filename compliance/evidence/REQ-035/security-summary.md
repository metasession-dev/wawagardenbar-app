# Security Summary — REQ-035

**Requirement:** REQ-035 — Tip recording at express checkout + tips breakdown in Daily Financial Report
**Issue:** [#76](https://github.com/metasession-dev/wawagardenbar-app/issues/76)
**Risk Level:** HIGH (financial-data write path; Order + Tab schema additions; daily-report aggregator change)
**Date:** 2026-05-07
**Develop SHA evaluated:** `72b862c` (CI green: Quality Gates + Register Release + Upload Evidence)

---

## Universal Gates

| Gate                        | Result                                                                                                                                                                                     | Notes                                                                                                                                                                                                                                           |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| TypeScript (`tsc --noEmit`) | **0 errors**                                                                                                                                                                               | `gates/tsc.txt`                                                                                                                                                                                                                                 |
| Vitest unit suite           | **512/512 passed** (486 baseline + 26 new)                                                                                                                                                 | `gates/vitest-summary.txt`                                                                                                                                                                                                                      |
| Semgrep SAST                | **0 findings on REQ-035 changed files**                                                                                                                                                    | `gates/semgrep.json` — 3 ERROR-level findings flagged on `.github/workflows/ci.yml` and `.github/workflows/compliance-evidence.yml` are baseline drift (semgrep ruleset bumped between REQ-033 ship 2026-05-04 and today; not in REQ-035 scope) |
| Dependency audit            | **0 unaccepted high/critical** (1 high `xlsx` allowlisted in CI gate)                                                                                                                      | `gates/dependency-audit.json` — REQ-035 included a baseline-clearing bump of `mongoose` 8.7.0 → 8.23.1 to clear `GHSA-wpg9-53fq-2r8h` (high) committed at `72b862c`                                                                             |
| Playwright E2E              | Two new specs (`express-tip-capture.spec.ts`, `close-tab-tip-capture.spec.ts`) parse, list tests, skip gracefully if local auth/test fixtures absent. CI ran end-to-end pass on `72b862c`. | `e2e/orders/`                                                                                                                                                                                                                                   |
| CI pipeline (develop)       | **PASS at `72b862c`**                                                                                                                                                                      | Run #75: Quality Gates ✓ Register Release ✓ Upload Evidence ✓                                                                                                                                                                                   |

---

## Security Assessment

### Data Integrity

**No schema removal. No destructive migration.**

- `Order.tipPaymentMethod` — new optional field, enum `cash | card | transfer | ussd | phone`. Mongoose `pre('validate')` hook enforces the invariant `tipAmount > 0 ⇒ tipPaymentMethod` set, blocking direct DB writes that bypass the service.
- `Tab.partialPayments[].tipAmount` — new optional field, default 0, `min: 0`. Existing documents are unaffected (default kicks in on first read).
- `Tab.tipAmount` (tab-level scalar) becomes a derived sum of partial-payment subdocs' tipAmounts, recomputed by `TabModel.pre('save')`. Existing tabs with no partial-payment tips compute to 0 — same as today's default.

**Backfill is non-destructive.** `scripts/backfill-tip-payment-method.ts`:

- Skips rows where `tipPaymentMethod` is already set (idempotent).
- Skips rows without a `paymentMethod` to fall back to (logged for manual review).
- Writes `_tip-pm-backfill-{timestamp}.json` audit file before mutating.
- Supports `--dry-run` for non-destructive verification on UAT.

### Access Control (RBAC)

**No new auth surface.** Tip capture lives inside existing admin-only flows:

- Express create-order is gated by `requireAdminSession()` (unchanged).
- Close-tab actions (`expressCloseTabAction`, `completeTabPaymentManuallyAction`, `recordPartialPaymentAction`) all require `session.role` ∈ `{admin, super-admin}` (unchanged).
- Daily Financial Report page is super-admin gated (unchanged).

Tip-related parameters are forwarded through these existing-admin paths; no new endpoint, no new role, no role downgrade.

### Audit Logging

Per-payment audit is preserved by reusing existing fields:

- Partial-payment subdocs already carry `processedBy: ObjectId` (the staff member) and `paidAt: Date`. New `tipAmount` rides on the same subdoc, so every tip is attributable to a specific staff member at a specific time, alongside the bill payment.
- Order-level tips inherit the existing Order audit (statusHistory, paymentId, processedByAdminId in `audit-log` writes by `OrderService.completeOrderPaymentManually`).
- The closing-payment-as-partial change in `completeTabPaymentManually` adds an additional audit row per tab close (the closing payment is now a discoverable partial-payment subdoc), which is a **net audit improvement** — previously the closing payment lived only on tab-level scalar fields with no subdoc trail.

### Input Validation

Validated at three layers (defence in depth):

1. **Action layer** (Zod-style runtime checks in `app/actions/admin/express-actions.ts` and `app/actions/tabs/tab-actions.ts`) — accepts optional `tipAmount` and `tipPaymentMethod`; passes through to services.
2. **Service layer**:
   - `OrderService.completeOrderPaymentManually`: rejects non-finite/negative `tipAmount`; rejects `tipAmount > 0` without `tipPaymentMethod`; rejects `tipPaymentMethod` outside `cash | card | transfer`.
   - `TabService.completeTabPaymentManually` and `recordPartialPayment`: rejects non-finite/negative `tipAmount`.
3. **Schema layer**:
   - `OrderModel` enum on `tipPaymentMethod` and `pre('validate')` hook for the `tipAmount > 0 ⇒ tipPaymentMethod` invariant.
   - `TabModel.partialPayments.tipAmount` `min: 0`.
   - `TabModel.pre('save')` recomputes tab-level `tipAmount` defensively, so a caller cannot pass an arbitrary tab-level value.

Service-layer guards run **before** any DB mutation, so a malicious/garbled payload cannot persist a half-saved Order or Tab.

### NoSQL Injection

**N/A — no new query operator keys.** All new persistence paths use Mongoose's typed schema setters (`order.tipAmount = …`, `pp.tipAmount = …`). The backfill script's `updateOne` filter uses fixed string keys (`_id`, `tipAmount`, `tipPaymentMethod`) and a server-controlled `setTo` value derived from the read-back document's own `paymentMethod` enum value. No user-derived operator keys.

The mongoose 8.7.0 → 8.23.1 bump committed at `72b862c` clears `GHSA-wpg9-53fq-2r8h` (NoSQL injection in `$nor` sanitizer) — REQ-035 does not use `$nor` anywhere, but the upgrade hardens the wider codebase.

### XSS / Output Encoding

**No new untrusted-source rendering.** `<TipsSection>` renders numbers via React's auto-escaping JSX and the existing `formatCurrency` helper. `<TipInputRow>` is a controlled form input bound to numeric/enum state. No `dangerouslySetInnerHTML`, no `eval`, no template-injection surface.

### CSRF

**Reuses existing server actions.** Next.js server actions are CSRF-protected by the framework; REQ-035 does not introduce a new fetch endpoint or bypass the SA boundary.

### Race Conditions / Concurrency

**Per-tab serialisation.** `completeTabPaymentManually` and `recordPartialPayment` both `findById` then `save()` — Mongoose's optimistic concurrency on `__v` (when enabled) catches concurrent writes; without it, the last writer wins on the same `partialPayments[]` array. Behaviour is unchanged from REQ-012's existing partial-payments path. The new `pre('save')` recompute of tab-level `tipAmount` runs deterministically on whatever state the saver sees, so divergence between `partialPayments` and `tab.tipAmount` is impossible at save time.

### Double-counting Prevention

AC6 invariant: `paymentBreakdown.total` stays revenue-only.

- Order tips do NOT add to `paymentBreakdown` for tab orders (tab tips are sourced from partial-payment subdocs only — see service code in `services/financial-report-service.ts` near "Tab orders skip this branch").
- Partial-payment tips do NOT add to `paymentBreakdown.total` — they accumulate into the parallel `tipsBreakdown.total`. Verified by the regression test `__tests__/services/financial-report-service.tip.test.ts` "AC6 — paymentBreakdown.total is unchanged when tips are present".
- The pre-existing REQ-013 double-count guard for `Order.total` vs partial-payment `amount` is unchanged and still active.

---

## Threat Model & Mitigations

### T1 — Malicious staff records a fictitious tip to launder cash

A staff member could record a fake ₦5000 tip on a small bill to conceal a cash-drawer skim.

**Mitigations:**

- Every partial-payment row carries `processedBy: ObjectId` (the staff member's user id) and `paidAt`. Audit log captures every close-tab and partial-payment action with the same fields.
- Daily report tipsBreakdown surfaces tip totals to super-admin; outsized tips are visible against the bill base.
- Future hardening (out of scope here): a "tip ratio" alert at the report level could flag tips > 30% of bill.

### T2 — Race between concurrent tab payments inflates tab-level tipAmount

Two admins close-tab the same tab at the same instant.

**Mitigations:**

- Existing optimistic-concurrency / last-writer-wins behaviour from REQ-012 unchanged.
- The `pre('save')` recompute means the persisted tab-level `tipAmount` always equals the sum of whatever partials are in the array at save time. There is no "additive" path that could double-count even on race.
- Service-layer guard `if (tab.paymentStatus === 'paid')` blocks the second save with a thrown error.

### T3 — Tip method spoofing in the express UI bypasses paymentMethod independence

A staff member overrides tipPaymentMethod to a method the bill wasn't paid in, distorting the daily tip-by-method breakdown.

**Mitigations:**

- This is the _intended_ behaviour per locked design decision (the realistic case is "card-paid bill + cash tip"). Independence is a feature, not a bug.
- The audit log captures both `paymentMethod` and `tipPaymentMethod` separately, so any deliberate misuse (e.g. always tipping to a single staff member's favourite bucket) is auditable.
- Tip recorded against the row's actual `paymentType` for tab partials (no separate dropdown) eliminates the spoofing surface for the tab-side flow.

### T4 — Backfill writes after a user's in-flight edit

Same shape as REQ-033 T2. Backfill writes are bounded to rows where `tipPaymentMethod` is unset, so a concurrent edit that sets it would be skipped on re-run.

### T5 — Mongoose vuln (GHSA-wpg9-53fq-2r8h) reachable via tip code

The vuln affects the `$nor` operator's sanitizer. REQ-035 does not use `$nor`. The upgrade to 8.23.1 cleared the advisory anyway; closes the surface defensively.

---

## Static Analysis (Semgrep)

Ran `semgrep --config=auto` on the REQ-035 changed files:

- `lib/tip-aggregation.ts`
- `interfaces/payment-method.interface.ts`
- `interfaces/order.interface.ts`, `interfaces/tab.interface.ts`
- `models/order-model.ts`, `models/tab-model.ts`
- `services/order-service.ts`, `services/tab-service.ts`, `services/financial-report-service.ts`
- `app/actions/admin/express-actions.ts`, `app/actions/tabs/tab-actions.ts`
- `app/dashboard/orders/express/create-order/page.tsx`
- `app/dashboard/reports/daily/daily-report-client.tsx`
- `components/features/orders/tip-input-row.tsx`
- `components/features/reports/tips-section.tsx`
- `components/features/admin/tabs/admin-pay-tab-dialog.tsx`
- `lib/report-export.ts`
- `scripts/backfill-tip-payment-method.ts`

**Result on REQ-035 files: 0 findings.**

The 3 ERROR-level semgrep findings present in `gates/semgrep.json` are baseline drift on `.github/workflows/ci.yml` and `.github/workflows/compliance-evidence.yml` — both touched last at REQ-033's `1066be3` (2026-05-04) and not modified by REQ-035. Semgrep's ruleset evidently introduced or re-classified the `run-shell-injection` check between REQ-033's evidence capture and today; should be addressed by a separate workflow-hardening REQ.

## Dependency Audit

`npm audit --omit=dev` on `72b862c`:

- 1 HIGH — `xlsx` (pre-existing, allowlisted by `.github/workflows/ci.yml` `ACCEPTED="xlsx"`).
- 4 moderate — pre-existing (`dompurify`, `next`, `nuqs`, `postcss`).
- **0 new vulnerabilities introduced by REQ-035.** The mongoose bump committed at `72b862c` removed a high-severity baseline drift (`GHSA-wpg9-53fq-2r8h`) that was not present at REQ-033 ship.

Full output: `gates/dependency-audit.json`.

---

## Sign-off

- [x] All universal gates pass on `72b862c` (CI green)
- [x] Threat model reviewed (T1–T5)
- [x] No new auth surface
- [x] No new persistence path beyond optional fields with defaults
- [x] No new query operator keys
- [x] Static analysis clean on REQ-035 files
- [x] Dependency audit returns 0 unaccepted findings
- [x] Backfill is non-destructive, idempotent, and audit-emitting
- [x] AC6 invariant (paymentBreakdown.total unchanged) regression-guarded by unit test

Per the Risk-Tiered Review Policy, HIGH-risk financial-data changes require **two** human reviewers and an `ai-prompts.md` artefact (provided).
