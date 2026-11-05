# Security Evidence Summary — REQ-117

**Date:** 2026-11-05
**Risk class:** HIGH (customer authentication, credential storage, session lifetime)

## Bundled Release Context

- **Core tracked release:** `REQ-117`
- **Absorbed predecessor releases:** None
- **Absorbed non-release work:** housekeeping commits since `origin/main` (DevAudit 1.12.0 template sync, sharded-regression CI tweak, REQ-116 accepted-failure record); see `compliance/pending-releases/BUNDLED-CHANGES-REQ-117.md`
- **Why bundled here:** operator-declared bundle (`Bundles: #966, #972`). REQ-117 is the primary REQ of the bundle. Both touch the WhatsApp channel and ship behind one UAT.
- **Evidence impact:** evidence stays per REQ. This folder covers REQ-117 only; REQ-118 has its own folder.
- **Reviewer impact:** one approval envelope (`REQ-117`, HIGH) covers both REQs; the reviewer reads both evidence folders.
- **Security / risk impact:** see the table below. Bundle ceremony is HIGH because REQ-117 is HIGH.
- **Reference:** commit range `origin/main..HEAD`, branch `feat/bundle-wa-04-wa-10`

| Control                           | Result                        | Evidence                                                                                                                                                                                                                                                                         |
| --------------------------------- | ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Dependency audit                  | PASS                          | `scripts/evaluate-npm-audit.sh`: `0 accepted, 0 unresolved`. `package.json` and `package-lock.json` are unchanged                                                                                                                                                                |
| SAST                              | PASS (local) / CI             | `npx tsc --noEmit`: 0 errors. `npm run lint`: 0 errors. `semgrep` is not installed locally; CI Quality Gates runs it on the PR                                                                                                                                                   |
| PIN at rest                       | PASS                          | Only an HMAC-SHA-256 hash (key derived from `SESSION_PASSWORD`, label `wgb:pin-hash:v1`) is stored, compared with `timingSafeEqual`. The test-only plaintext is written only under `ENABLE_E2E_PIN_INTERCEPT=true`. Unit tests and the critical spec check a 64-hex hash (R-047) |
| Brute force                       | PASS                          | Five wrong attempts invalidate the PIN; five PIN requests per phone per hour (counted on the user document, so it holds across instances); ten-minute expiry (R-047, closes the gap left in R-040)                                                                               |
| Session lifetime                  | PASS, accepted                | Customer cookie about 90 days, staff about 7 days, proved by a seal and unseal test and the critical spec; httpOnly, secure and sameSite unchanged (R-049 accepted)                                                                                                              |
| Session minting                   | PASS                          | An inbound signed webhook creates or identifies a user but sets no session cookie (AC10)                                                                                                                                                                                         |
| Legacy account linking            | PASS, with a documented limit | The phone is attached only after the WhatsApp PIN round-trip; no account is merged or deleted; email-only accounts with a wrong phone on file go through staff recovery (R-050)                                                                                                  |
| Channel removal                   | PASS                          | SMS and email PIN actions and guest checkout are deleted from the customer flow; no staff caller existed                                                                                                                                                                         |
| Availability                      | PASS, accepted                | A WhatsApp outage shows a notice and raises an Incident; customers order at the counter (R-048 accepted programme decision)                                                                                                                                                      |
| Unverified accounts               | PASS                          | A scheduled job deletes never-verified users after 24 hours                                                                                                                                                                                                                      |
| New dependencies / external calls | PASS                          | None                                                                                                                                                                                                                                                                             |

## Data handling

Personal data touched: phone number, first name and consent flags. The PIN hash replaces a plaintext PIN (data protection by design). Unverified accounts are deleted after 24 hours (storage limitation). SMS and email PIN channels stop processing customer email and phone for sign-in. No new data category is collected.

## Post-deploy controls

- Revert the bundle merge to roll back. The new user fields (hash, counters, test-only plaintext) are additive. Sessions issued with the 90-day lifetime stay valid until they expire; rotate `SESSION_PASSWORD` to invalidate them (this also invalidates outstanding PINs and every session).
- Deploy check after release: request a PIN with a real number (it arrives on WhatsApp), and confirm five wrong PINs invalidate it.
- `verification_pin` and `account_recovery` are APPROVED on the production WhatsApp account (checked 2026-11-04).
- Operator: record the live UAT sign-in date in evidence (never the PIN).
