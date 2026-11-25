# Security Evidence Summary — REQ-126

**Date:** 2026-11-25
**Risk class:** MEDIUM

| Control                           | Result            | Evidence                                                                                                                                                  |
| --------------------------------- | ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Dependency audit                  | PASS              | `npm audit --omit=dev --audit-level=high`: no high or critical findings; no dependency was added or changed                                               |
| SAST                              | PASS (local) / CI | `npx tsc --noEmit`: 0 errors. `npm run lint`: 0 errors. `semgrep` is not installed locally; CI Quality Gates runs it on the PR                            |
| No order data by text             | PASS              | The status reply is a fixed acknowledgement; an order number belonging to another phone reveals nothing and the ticket is linked to no order (unit + e2e) |
| Ticket flooding                   | PASS              | An open ticket is escalated and appended, never duplicated (unit + e2e); the existing per-sender rate limit applies                                       |
| Consent                           | PASS              | Replies answer a message the customer just sent; STOP still clears marketing only (unit + e2e)                                                            |
| Ordinary support text             | PASS              | Messages that merely mention an order or a drink still open an ordinary ticket (unit + e2e; found by the regression sweep)                                |
| New dependencies / external calls | PASS              | None                                                                                                                                                      |

## Data handling

No new personal data; the inbound message body already lands in IncomingMessage and SupportTicket.

## Post-deploy controls

- Revert the merge to roll back; the new settings document, the intent values and the cancel reason are additive.
- Operator: after release confirm on UAT and production that texting "order" returns the menu link and "status" raises an urgent ticket.

## Bundled Release Context

- **Core tracked release:** `REQ-125` (this REQ, REQ-126, is a co-tracked member)
- **Absorbed predecessor releases:** None
- **Absorbed non-release work:** housekeeping commits since `origin/main` (DevAudit 1.15.0 sync, `reuse_pull_request_gates` config); see `compliance/pending-releases/BUNDLED-CHANGES-REQ-125.md`
- **Why bundled here:** REQ-125 (WA-15), REQ-126 (WA-16) and REQ-127 (#1031) were declared as one bundle at planning time (MEDIUM, no overlapping files) and ship through one integration PR and one UAT.
- **Evidence impact:** each REQ keeps its own evidence directory; the UAT pack is written once, on REQ-125, and covers all three.
- **Reviewer impact:** approval covers REQ-125 and its co-tracked members REQ-126 and REQ-127 (all MEDIUM).
- **Security / risk impact:** see `security-summary.md` and R-77 to R-80 in `compliance/risk-register.md`.
- **Reference:** commit range `origin/main..HEAD`, branch `feat/bundle-wa15-wa16-checkout-fix`
