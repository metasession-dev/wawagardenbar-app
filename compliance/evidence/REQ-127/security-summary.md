# Security Evidence Summary — REQ-127

**Date:** 2026-11-25
**Risk class:** MEDIUM

| Control                           | Result            | Evidence                                                                                                                                                                                                |
| --------------------------------- | ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Dependency audit                  | PASS              | `npm audit --omit=dev --audit-level=high`: no high or critical findings; no dependency was added or changed                                                                                             |
| SAST                              | PASS (local) / CI | `npx tsc --noEmit`: 0 errors. `npm run lint`: 0 errors. `semgrep` is not installed locally; CI Quality Gates runs it on the PR                                                                          |
| Money path                        | PASS              | A customer is charged the server's `order.total` for their own order (REQ-123); a changed cart, including the tip, gets a new key so a stale order is never reused (unit + e2e)                         |
| Order ownership                   | PASS              | The superseded-order cancel is one atomic update scoped to the caller's own customer-origin, pending, unpaid order with no payment reference; a paid or payment-started order is never cancelled (unit) |
| Browser storage                   | PASS              | Holds an opaque key, an order id and a hash only; cleared on success (unit + e2e)                                                                                                                       |
| New dependencies / external calls | PASS              | None                                                                                                                                                                                                    |

## Data handling

No new personal data; sessionStorage holds an opaque key, an order id and a hash on the customer\'s device for the session.

## Post-deploy controls

- Revert the merge to roll back; the new settings document, the intent values and the cancel reason are additive.
- Operator: none beyond the UAT precondition of a failing payment gateway for steps 15 to 17.

## Bundled Release Context

- **Core tracked release:** `REQ-125` (this REQ, REQ-127, is a co-tracked member)
- **Absorbed predecessor releases:** None
- **Absorbed non-release work:** housekeeping commits since `origin/main` (DevAudit 1.15.0 sync, `reuse_pull_request_gates` config); see `compliance/pending-releases/BUNDLED-CHANGES-REQ-125.md`
- **Why bundled here:** REQ-125 (WA-15), REQ-126 (WA-16) and REQ-127 (#1031) were declared as one bundle at planning time (MEDIUM, no overlapping files) and ship through one integration PR and one UAT.
- **Evidence impact:** each REQ keeps its own evidence directory; the UAT pack is written once, on REQ-125, and covers all three.
- **Reviewer impact:** approval covers REQ-125 and its co-tracked members REQ-126 and REQ-127 (all MEDIUM).
- **Security / risk impact:** see `security-summary.md` and R-77 to R-80 in `compliance/risk-register.md`.
- **Reference:** commit range `origin/main..HEAD`, branch `feat/bundle-wa15-wa16-checkout-fix`
