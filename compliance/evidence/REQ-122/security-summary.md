# Security Evidence Summary — REQ-122

**Date:** 2026-11-17
**Risk class:** HIGH

| Control                                     | Result            | Evidence                                                                                                                                                                                                                                          |
| ------------------------------------------- | ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Dependency audit                            | PASS              | `npm audit --omit=dev --audit-level=high`: no high or critical findings; no dependency was added or changed by this REQ                                                                                                                           |
| SAST                                        | PASS (local) / CI | `npx tsc --noEmit`: 0 errors. `npm run lint`: 0 errors. `semgrep` is not installed locally; CI Quality Gates runs it on the PR                                                                                                                    |
| Alerts reach only the right roles           | PASS              | The list, acknowledge and counts are scoped by the user's roles on the server; a manager sees nothing for an order rule limited to kitchen and csr (unit `staff-notification-actions`; e2e `staff-notifications`)                                 |
| Signal carries no content                   | PASS              | The `staff-notification` socket event carries an id and a type only; clients fetch the list over the authenticated action (ADR-011; unit)                                                                                                         |
| Staff alert number is separate and verified | PASS              | `alertPhone` is not the customer `phone`; a number belonging to a customer account or already verified for another staff member is refused; PIN verification with hashed code, attempt limit and expiry (unit 19 tests; e2e `staff-alert-number`) |
| PIN handling                                | PASS              | Only a keyed hash is stored; the plain code is kept only under `ENABLE_E2E_PIN_INTERCEPT` (never set in production) and no send happens then (unit + e2e)                                                                                         |
| Consent                                     | PASS              | Verifying the code records `alertConsentAt`; "Receive WhatsApp alerts" can be switched off; removing the number clears verification and on-shift (e2e)                                                                                            |
| Number validation                           | PASS              | A number that is not an international number is refused (unit + found by e2e)                                                                                                                                                                     |
| No duplicate or runaway WhatsApp            | PASS              | The level claim is an atomic `findOneAndUpdate`, once per level; per-user dedup across roles; quiet hours hold WhatsApp without claiming a level (unit `staff-alert-escalation`)                                                                  |
| Staff are not customers                     | PASS              | The inbound router excludes verified staff alert numbers (no ticket, welcome or customer account); an unverified number is routed as a customer (unit + e2e `whatsapp-staff-number-routing`)                                                      |
| Template contract                           | PASS              | `staff_alert` is defined in `docs/whatsapp-templates/staff_alert.json` and the contract test covers 13 templates; submission to Meta is an operator step                                                                                          |
| New dependencies / external calls           | PASS              | None (WhatsApp is the existing channel)                                                                                                                                                                                                           |

## Data handling

Staff alert numbers and the consent timestamp are new personal data about staff (legal basis: legitimate interest of the employer for operational alerts, with the staff member's own verification and an off switch). Notifications hold titles and references, not customer message content. Notifications are not kept beyond operational need (acknowledged items are retained as an audit of who acknowledged and when).

## Post-deploy controls

- Revert the merge to roll back; the new user fields and the `staffnotifications` collection are additive and ignored by old code.
- Operator: confirm before the `staff_alert` template is submitted to the UAT (+44 7363 078509) and production (+234 814 825 3342) WhatsApp accounts; until approved, WhatsApp sends fail and are recorded (ADR-011), in-app alerts still work.
- Operator: each staff member verifies their own number on `/dashboard/account`.

## Bundled Release Context

- **Core tracked release:** `REQ-121` (this REQ, REQ-122, is a co-tracked member)
- **Absorbed predecessor releases:** None
- **Absorbed non-release work:** housekeeping commits since `origin/main` (DevAudit 1.14.0 sync, configure changes, expired exception removal); see `compliance/pending-releases/BUNDLED-CHANGES-REQ-121.md`
- **Why bundled here:** REQ-121 (WA-06) and REQ-122 (WA-12) were declared as one bundle at planning time and ship through one integration PR and one UAT.
- **Evidence impact:** each REQ keeps its own evidence directory; the UAT pack is written once, on REQ-121, and covers both.
- **Reviewer impact:** approval covers REQ-121 and its co-tracked member REQ-122 (both HIGH).
- **Security / risk impact:** see `security-summary.md` and the R-60 to R-66 records in `compliance/risk-register.md`.
- **Reference:** commit range `origin/main..HEAD`, branch `feat/bundle-wa-06-wa-12-checkout-staff-alerts`
