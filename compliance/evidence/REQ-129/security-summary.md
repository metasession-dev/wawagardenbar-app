# Security Evidence Summary — REQ-129

**Date:** 2026-11-27
**Risk class:** MEDIUM

| Control                           | Result            | Evidence                                                                                                                                        |
| --------------------------------- | ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Dependency audit                  | PASS              | `npm audit --omit=dev --audit-level=high`: no high or critical findings; no dependency was added or changed                                     |
| SAST                              | PASS (local) / CI | `npx tsc --noEmit`: 0 errors. `npm run lint`: 0 errors. `semgrep` is not installed locally; CI Quality Gates runs it on the PR                  |
| Who can create a booking          | PASS              | A verified customer session is required; the phone comes from the account, never the form; a staff session is refused (unit, e2e)               |
| Abuse of the public form          | PASS              | Five requests per phone per business day counted in the database; field length caps; guests limited to 1–500 (unit, e2e)                        |
| Cross-customer access             | PASS              | Customer reads are owner-scoped; another customer's id is a 404 revealing nothing (unit, e2e)                                                   |
| Who can handle bookings           | PASS              | csr, manager, admin, super-admin only: layout, proxy route table and every server action; kitchen and customer sessions are refused (unit, e2e) |
| Audit                             | PASS              | Status changes, assignments, notes and replies are audit-logged with the actor; the note text is not copied into the audit entry (unit, e2e)    |
| Output encoding                   | PASS              | Free text is rendered by React and sent as WhatsApp text only; template variables are stripped of newlines                                      |
| New dependencies / external calls | PASS              | None; two new Meta templates (UTILITY) submitted to the UAT account                                                                             |

## Data handling

Personal data: name, verified phone, event details and free-text requests, plus staff notes and replies. Purpose: respond to the enquiry. Phone is the verified WhatsApp number; staff access is role-gated and audit-logged; customers can read their own bookings. Messages go only to customers with consent for transactional messages. Retention follows WA-14 (to follow); until then bookings are kept.

## Post-deploy controls

- Revert the merge to roll back; the new collection and values are additive.
- Operator: submit `booking_received`, `booking_update`, `welcome_new_user` and `welcome_back` on the production WhatsApp account (the API refuses on that account), and check both UAT templates are APPROVED before UAT.
- Operator: review the Bookings list and `held_template_pending` rows after release.

## Bundled Release Context

- **Core tracked release:** `REQ-129` (this REQ is the core)
- **Absorbed predecessor releases:** None
- **Absorbed non-release work:** housekeeping commits since `origin/main` (the docs note on Paystack keys, PR #1104); see `compliance/pending-releases/BUNDLED-CHANGES-REQ-129.md`
- **Why bundled here:** REQ-129 (WA-13, MEDIUM) and REQ-130 (#1087, LOW) were declared as one bundle at planning time by the operator; both add one entry to `components/features/admin/dashboard-nav.tsx` (the overlap was accepted) and ship through one integration PR and one UAT.
- **Evidence impact:** each REQ keeps its own evidence directory; the UAT pack is written once, on REQ-129, and covers both.
- **Reviewer impact:** approval covers REQ-129 and its co-tracked member REQ-130 (the bundle runs at MEDIUM).
- **Security / risk impact:** see `security-summary.md` and R-85 to R-87 in `compliance/risk-register.md`.
- **Reference:** commit range `origin/main..HEAD`, branch `feat/bundle-wa13-bookings-support-link`
