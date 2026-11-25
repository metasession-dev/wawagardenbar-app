# Security Evidence Summary — REQ-125

**Date:** 2026-11-25
**Risk class:** MEDIUM

| Control                           | Result            | Evidence                                                                                                                                                           |
| --------------------------------- | ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Dependency audit                  | PASS              | `npm audit --omit=dev --audit-level=high`: no high or critical findings; no dependency was added or changed                                                        |
| SAST                              | PASS (local) / CI | `npx tsc --noEmit`: 0 errors. `npm run lint`: 0 errors. `semgrep` is not installed locally; CI Quality Gates runs it on the PR                                     |
| Sign-in PIN cannot be gated       | PASS              | The PIN is on a code-level locked list and the gate returns before reading settings; a unit test sends it with the master switch off; the UI shows it locked (e2e) |
| Settings read failure             | PASS              | Fails open: the message is sent (unit)                                                                                                                             |
| Who can change the switches       | PASS              | Admin and super-admin only; csr, kitchen and customer sessions are rejected (unit) and cannot reach the page (e2e)                                                 |
| Audit                             | PASS              | Every change writes who, key, before and after (unit)                                                                                                              |
| Operator error                    | PASS              | High-impact switch-offs ask for confirmation that repeats the consequence (e2e)                                                                                    |
| New dependencies / external calls | PASS              | None                                                                                                                                                               |

## Data handling

No new personal data. Settings hold switch states; suppressed sends write a NotificationLog row with the same fields as any attempt.

## Post-deploy controls

- Revert the merge to roll back; the new settings document, the intent values and the cancel reason are additive.
- Operator: confirm the WhatsApp switches are all on after release (the default) and review the notification log for `suppressed_admin_disabled` after any change.

## Bundled Release Context

- **Core tracked release:** `REQ-125` (this REQ is the core)
- **Absorbed predecessor releases:** None
- **Absorbed non-release work:** housekeeping commits since `origin/main` (DevAudit 1.15.0 sync, `reuse_pull_request_gates` config); see `compliance/pending-releases/BUNDLED-CHANGES-REQ-125.md`
- **Why bundled here:** REQ-125 (WA-15), REQ-126 (WA-16) and REQ-127 (#1031) were declared as one bundle at planning time (MEDIUM, no overlapping files) and ship through one integration PR and one UAT.
- **Evidence impact:** each REQ keeps its own evidence directory; the UAT pack is written once, on REQ-125, and covers all three.
- **Reviewer impact:** approval covers REQ-125 and its co-tracked members REQ-126 and REQ-127 (all MEDIUM).
- **Security / risk impact:** see `security-summary.md` and R-77 to R-80 in `compliance/risk-register.md`.
- **Reference:** commit range `origin/main..HEAD`, branch `feat/bundle-wa15-wa16-checkout-fix`
