# Release Ticket: REQ-117 — WhatsApp-only customer sign-in (WA-04)

**Status:** TESTED - PENDING SIGN-OFF
**Date:** 2026-11-05
**Requirement ID:** REQ-117
**Risk Level:** HIGH
**Issue:** [#966](https://github.com/metasession-dev/wawagardenbar-app/issues/966) (sub-issue of tracker [#953](https://github.com/metasession-dev/wawagardenbar-app/issues/953))
**Implementation branch:** `feat/bundle-wa-04-wa-10` (declared bundle with REQ-118; REQ-117 is the primary REQ)
**Absorbed predecessor releases:** None

## Summary

Customers sign in with a phone number and a PIN delivered over WhatsApp only. SMS and email PIN delivery and guest checkout are removed from the customer flow.

- **One channel:** the login form asks for a phone number only. Checkout needs a sign-in and returns to `/checkout` with the cart intact; browsing and cart building need none.
- **PIN hardening (ADR-008):** the PIN is stored as an HMAC-SHA-256 hash (the issue said SHA-256; the key makes it worth having). Five wrong attempts invalidate it, five PIN requests per phone per hour, ten-minute expiry. Never-verified users are purged after 24 hours.
- **Session:** 90 days for customers (refreshed on activity), 7 days for staff.
- **Consent and failure notices:** new numbers see the transactional box checked and disabled with marketing unchecked; a number not on WhatsApp gets a terminal message; a WhatsApp outage shows a notice and raises an Incident.
- **Legacy accounts:** found by phone in any stored form and reused (never duplicated); the WhatsApp PIN round-trip verifies them. Email-only accounts whose phone on file is not their WhatsApp number go through staff recovery (REQ-111). This differs slightly from the plan text and is recorded in the plan.
- **Inbound isolation:** a WhatsApp message never creates a session.

## Bundled Changes

- **Core tracked release:** `REQ-117`
- **Bundle manifest:** `BUNDLED-CHANGES-REQ-117.json`
- **Absorbed predecessor releases:** None
- **Co-tracked bundle members:** REQ-118
- **Absorbed non-release work:** housekeeping commits since `origin/main` (see `BUNDLED-CHANGES-REQ-117.md`)
- **Why bundled here:** operator-declared bundle (`Bundles: #966, #972`) from tracker #953; REQ-117 is the primary REQ.
- **Evidence impact:** evidence stays per REQ (`compliance/evidence/REQ-117/` and `REQ-118/`).
- **Reviewer impact:** one HIGH-risk approval envelope covers both REQs.
- **Security / risk impact:** R-047 to R-050 (REQ-117) and R-051 (REQ-118); see each `risk-assessment.md`.
- **Reference:** commit range `origin/main..HEAD`, branch `feat/bundle-wa-04-wa-10`

## Absorbed Predecessor Releases

None.

## AI contributors

| Tool        | Version    | Commits                                                                              | Date       |
| ----------- | ---------- | ------------------------------------------------------------------------------------ | ---------- |
| Claude Code | Sonnet 5.5 | plan, ADR, risk, implementation, test and compliance commits on this bundle's branch | 2026-11-05 |

## Implementation details

- **Auth actions:** `send-whatsapp-pin.ts` and `verify-whatsapp-pin.ts` rewritten; `send-pin`, `verify-pin`, `send-email-pin`, `verify-email-pin` and `guest-checkout` deleted.
- **Library and models:** `lib/auth-utils.ts` (PIN hash), `lib/session.ts` (customer lifetime), `lib/scheduled-jobs.ts` (purge), `models/user-model.ts` and its interface (hash, counters, test-only plaintext).
- **UI:** `components/shared/auth/login-form.tsx`, checkout sign-in gate; guest banner and guest form removed.
- **Tests:** seven unit files, one new critical spec (9 tests), seven updated specs, two helpers.
- **Design:** ADR-008. **SRS:** REQ-AUTHC-004 to REQ-AUTHC-007 new; REQ-AUTHC-001 to REQ-AUTHC-003 updated. **Risk register:** R-047 to R-050; R-040 cross-referenced.

## Operator tasks (not code)

1. Live UAT sign-in with a real number after the UAT deploy; record the date in evidence, never the PIN.
2. After release: confirm the PIN arrives on production and that five wrong PINs invalidate it.
3. Sign off the SRS, ADR and risk artefacts in `compliance/evidence/REQ-117/`, and the `e2e-scope-decision.md`.
4. Approve the rationale for the one accepted skip (`close-tab-tip-capture`) in the test execution summary.

## Verification

- TypeScript: 0 errors. ESLint: 0 errors (pre-existing warnings only).
- Unit/integration: 1846 passed, 4 skipped (full suite).
- E2E: full `critical` tier at the default worker count: 337 passed, 0 failed, 1 skipped, against an isolated server and disposable MongoDB. One earlier flake (REQ-095 daily report) is triaged in the summary. Full `regression` was not run locally; CI runs it.
- Dependency audit: `0 accepted, 0 unresolved`; no dependency changed.
- `verification_pin` and `account_recovery` are APPROVED on production (checked 2026-11-04).
- Full detail: `compliance/evidence/REQ-117/test-execution-summary.md` and `security-summary.md`.
- Not yet done (operator): live UAT sign-in.

## Sign-off (dual-actor)

This is a HIGH-risk bundle on a solo-operator team, so the "reviewer ≠ submitter" check is read as actor type, not human identity. The AI tooling that implemented these REQs and the human operator who performs UAT and approves on the portal are distinct actors.

- **Submitter (implementation):** Claude Code (Sonnet 5.5)
- **UAT reviewer / approver:** operator, on the DevAudit portal
- **Operator approvals on record:** plan approval, HMAC PIN-hash deviation, ADR-008 Accepted and R-047 to R-051 sign-off (2026-11-05); `support_reply` submission to UAT and production (2026-11-05).
