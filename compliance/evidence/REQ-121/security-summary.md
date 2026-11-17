# Security Evidence Summary — REQ-121

**Date:** 2026-11-17
**Risk class:** HIGH

| Control                           | Result            | Evidence                                                                                                                                                                                                                 |
| --------------------------------- | ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Dependency audit                  | PASS              | `npm audit --omit=dev --audit-level=high`: no high or critical findings; no dependency was added or changed by this REQ                                                                                                  |
| SAST                              | PASS (local) / CI | `npx tsc --noEmit`: 0 errors. `npm run lint`: 0 errors. `semgrep` is not installed locally; CI Quality Gates runs it on the PR                                                                                           |
| Client money is never trusted     | PASS              | The customer is charged the server `order.total` for their own order; a request cannot set it (unit `initialize-payment-customer-charge`; e2e order-total test); a tip above the subtotal is capped by the server (unit) |
| Another customer's order          | PASS              | `initializePayment` refuses an order that belongs to another customer (unit)                                                                                                                                             |
| Personal data at checkout         | PASS              | Phone and email are taken from the account, never from the form; only an optional first name is accepted; no email is asked (unit `create-order-wrapper`, `user-service.checkout-profile`)                               |
| Saved address                     | PASS              | Saved to the profile only when new (deduped) and only for the signed-in user (unit)                                                                                                                                      |
| Closed hours                      | PASS              | Pay is blocked for pickup and delivery outside hours in the form; the server rule (REQ-061) still refuses, dine-in stays payable (e2e `checkout-closed-hours`)                                                           |
| Auth user API                     | PASS              | `/api/auth/user` adds `hasName` (boolean); no new personal data is returned (unit)                                                                                                                                       |
| New dependencies / external calls | PASS              | None (WhatsApp is the existing channel)                                                                                                                                                                                  |

## Data handling

No new personal data is collected. The checkout stops asking for email and phone (they come from the account). A delivery address and a first name are saved to the customer's own profile, as before. Customer tips are recorded with payment method `card` (follow-up #1046). Retention is unchanged.

## Post-deploy controls

- Revert the merge to roll back; no schema or data migration is involved (the profile keys are unchanged).
- Operator: place a pickup order and a dine-in order on UAT after deploy (UAT pack steps 1 to 9).

## Bundled Release Context

- **Core tracked release:** `REQ-121`
- **Absorbed predecessor releases:** None
- **Absorbed non-release work:** housekeeping commits since `origin/main` (DevAudit 1.14.0 sync, configure changes, expired exception removal); see `compliance/pending-releases/BUNDLED-CHANGES-REQ-121.md`
- **Why bundled here:** REQ-121 (WA-06) and REQ-122 (WA-12) were declared as one bundle at planning time and ship through one integration PR and one UAT.
- **Evidence impact:** each REQ keeps its own evidence directory; the UAT pack is written once, on REQ-121, and covers both.
- **Reviewer impact:** approval covers REQ-121 and its co-tracked member REQ-122 (both HIGH).
- **Security / risk impact:** see `security-summary.md` and the R-60 to R-66 records in `compliance/risk-register.md`.
- **Reference:** commit range `origin/main..HEAD`, branch `feat/bundle-wa-06-wa-12-checkout-staff-alerts`
