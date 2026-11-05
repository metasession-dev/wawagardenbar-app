---
title: 'Implementation plan — REQ-117'
requirement_id: 'REQ-117'
risk_class: 'HIGH'
change_type: 'feat'
authored_by: 'sdlc-implementer (Claude) for operator'
authored_at: '2026-11-05'
---

# Implementation plan — REQ-117

Issue: #966 (WA-04, tracker #953). Risk HIGH: customer authentication (PIN generation, storage, verification, attempt limits, session lifetime) and an identity-channel change (WhatsApp becomes the only customer sign-in channel). **Declared bundle** with REQ-118 (#972, WA-10): one branch `feat/bundle-wa-04-wa-10`, one PR, one release; REQ-117 is the **primary** (bundle-key) REQ. Eligibility was checked: the two REQs touch disjoint files.

## Framework attribution

**Evidence type:** `compliance_document` · **Category:** `planning` · **Scope:** per-REQ

Closes ISO 29119 §3.4 (§1), ISO 27001 A.8.25 (§5), GDPR Art. 25 (§6), EU AI Act Art. 11 (§7).

## 1. Goal + acceptance criteria

- **Goal:** Customers sign in with their phone number and a PIN delivered over WhatsApp only. The SMS and email PIN paths and guest checkout are removed from the customer flow. The PIN is stored hashed with attempt and request limits, unverified accounts are purged, the session lasts 90 days, legacy accounts re-verify by WhatsApp, and when WhatsApp is unavailable the customer sees a notice and an Incident is raised.

| AC   | Description (Given / When / Then)                                                                                                                                                                                                                                                                                                                                                  | Verification                                                                                                                             |
| ---- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| AC1  | **Given** a visitor at sign-in, **When** the form loads, **Then** it asks for a phone number only (no method step) and always sends the PIN over WhatsApp; the SMS actions, email PIN actions, `guest-checkout.ts`, the guest banner and the email-as-guest path no longer exist in the customer flow.                                                                             | `e2e/critical/customer-signin-whatsapp-only.spec.ts` (US-A1.2, US-A1.8); unit                                                            |
| AC2  | **Given** a new number, **When** the PIN step shows, **Then** "WhatsApp messages about my orders and bookings" is shown checked and disabled as part of the service, and marketing options are unchecked.                                                                                                                                                                          | same spec (US-A1.3)                                                                                                                      |
| AC3  | **Given** a number that is not on WhatsApp, **When** the send fails with `NOT_ON_WHATSAPP`, **Then** the terminal message "This number isn't on WhatsApp. To order, please use the counter or call us." shows with no retry-by-other-channel option.                                                                                                                               | same spec (US-A1.4)                                                                                                                      |
| AC4  | **Given** a cart and no session, **When** the customer presses Checkout, **Then** the phone and PIN form opens and, after sign-in, returns to `/checkout` with the cart intact; browsing and cart building need no sign-in.                                                                                                                                                        | same spec (US-A1.1, US-A1.2)                                                                                                             |
| AC5  | **Given** a PIN, **Then** only a keyed hash (HMAC-SHA-256, key derived from `SESSION_PASSWORD`, see ADR-008) is stored, not plaintext; five wrong attempts invalidate it and require a new one; at most five PIN requests per phone per hour; the PIN expires after ten minutes. In E2E-intercept mode the plaintext is also kept in a test-only field read by `readPinFromMongo`. | `__tests__/actions/auth/verify-whatsapp-pin.test.ts`, `send-whatsapp-pin.test.ts`; `__tests__/lib/auth-utils.pin-hash.test.ts` (US-A1.5) |
| AC6  | **Given** a user created by a PIN request who never verified, **When** 24 hours pass, **Then** a scheduled job deletes the user.                                                                                                                                                                                                                                                   | `__tests__/lib/scheduled-jobs.unverified-purge.test.ts`                                                                                  |
| AC7  | **Given** a verified customer, **Then** the customer session lasts 90 days and is refreshed on activity, while staff sessions keep today's lifetime.                                                                                                                                                                                                                               | `__tests__/lib/session.customer-ttl.test.ts`; e2e (US-A1.6)                                                                              |
| AC8  | **Given** an existing account with no verified phone (email-only or SMS-only), **When** it first signs in, **Then** it re-verifies by WhatsApp and the phone is attached, without merging or deleting any account.                                                                                                                                                                 | unit + e2e                                                                                                                               |
| AC9  | **Given** the PIN send fails with `SERVICE_DISABLED`, `MISSING_CREDENTIALS`, `TEMPLATE_NOT_FOUND` or a Meta outage code, **Then** the customer sees "Online ordering is temporarily unavailable. Please order at the counter or call us." (also on `/checkout` and `/book`) and an Incident is created.                                                                            | same spec (US-A1.7); unit                                                                                                                |
| AC10 | **Given** an inbound WhatsApp message, **Then** the webhook may create or identify the user but never mints a session cookie.                                                                                                                                                                                                                                                      | `__tests__/api/whatsapp-webhook-no-session.test.ts`                                                                                      |

## SRS items proposed/touched

| AC             | SRS item                                      | Status           | Notes                                                                   |
| -------------- | --------------------------------------------- | ---------------- | ----------------------------------------------------------------------- |
| AC1, AC4       | REQ-AUTHC-001 (existing)                      | stale, update    | WhatsApp-only, no method step, 90-day session                           |
| AC1            | REQ-AUTHC-003 (existing)                      | stale, deprecate | guest checkout removed from the customer flow                           |
| AC2, AC3       | REQ-AUTHC-004 (new)                           | stub             | consent display and terminal not-on-WhatsApp message                    |
| AC5, AC6       | REQ-AUTHC-002 (existing), REQ-AUTHC-005 (new) | update, stub     | hashed PIN, attempt and request limits, purge of unverified users       |
| AC7, AC8, AC10 | REQ-AUTHC-006 (new)                           | stub             | session lifetime, legacy re-verification, inbound never mints a session |
| AC9            | REQ-AUTHC-007 (new)                           | stub             | WhatsApp-unavailable notice and incident                                |

## 2. Scope

In scope: customer sign-in and its server actions, the login form, the checkout sign-in gate, PIN storage and limits, the session lifetime, the unverified-user purge, the unavailable notice and incident, test and helper updates. Out of scope: checkout redesign (WA-06), bookings (WA-13), staff login (unchanged).

### Surface inventory

| Surface                                                                                                                      | Change                                                                              |
| ---------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| `components/shared/auth/login-form.tsx`                                                                                      | phone-only WhatsApp flow, consent, terminal and unavailable messages                |
| `app/actions/auth/send-whatsapp-pin.ts`, `verify-whatsapp-pin.ts`                                                            | hashed PIN, attempts, request limit, expiry, legacy re-verify, unavailable handling |
| `app/actions/auth/send-pin.ts`, `verify-pin.ts`, `send-email-pin.ts`, `verify-email-pin.ts`, `guest-checkout.ts`, `index.ts` | removed from the customer flow (no staff caller found)                              |
| `components/shared/auth/guest-checkout-form.tsx`, `components/features/checkout/customer-checkout-form.tsx`                  | guest banner and guest path removed; checkout sign-in gate                          |
| `lib/auth-utils.ts`, `models/user-model.ts`, `interfaces/user.interface.ts`                                                  | PIN hash, attempt counters, test-only plaintext field                               |
| `lib/session.ts` and the customer login actions                                                                              | 90-day customer session, staff unchanged                                            |
| `lib/scheduled-jobs.ts`                                                                                                      | 24-hour unverified-user purge                                                       |
| Incident creation                                                                                                            | `notification_delivery_failed` kind reused for WhatsApp-unavailable                 |
| `e2e/helpers/customer-auth.ts` and the specs listed in the issue                                                             | updated for the new flow                                                            |

## 3. Architecture decisions

- **ADR-008 — Customer sign-in is WhatsApp-only with a keyed-hash, rate-limited PIN and a 90-day customer session.** Proposed by `adr-author`; draft at `docs/ADR/ADR-008-whatsapp-only-customer-signin-hashed-pin-session.md`. Operator flips to Accepted at plan approval. Triggered by: HIGH risk and a change spanning more than 3 files.
- **Deviation from the issue text, for the operator to confirm:** the issue says "SHA-256 hash"; the plan uses HMAC-SHA-256 because a plain hash of a 6-digit PIN is reversible from a database copy. No new environment variable is needed.
- **Deviation recorded at Stage 3 (AC8):** the plan said an account with no verified phone "re-verifies by WhatsApp and the phone is attached". As built, a legacy account is found by its phone number in any stored form (E.164, digits only or the old local format) and reused, never duplicated; the WhatsApp PIN round-trip then verifies it and sets `phoneVerified` and `whatsappVerifiedAt`. An email-only account whose phone on file is not the customer's real WhatsApp number cannot be linked automatically and goes through the staff account-recovery flow (REQ-111). No account is merged or deleted. Tested in `e2e/critical/customer-signin-whatsapp-only.spec.ts` (AC8) and `__tests__/actions/auth/verify-whatsapp-pin.test.ts`.
- **Open implementation check:** whether iron-session v8 can hold two lifetimes under one cookie name is verified by a seal/unseal unit test in Phase 2; the fallback is a second cookie name for customers.

## 4. E2E test coverage

New critical spec `e2e/critical/customer-signin-whatsapp-only.spec.ts` (US-A1.1 to US-A1.4, US-A1.6 to US-A1.8) with WhatsApp mocked and the PIN intercept; updated: `e2e/customer/auth-pin-happy-path.spec.ts`, `e2e/smoke/customer-auth.spec.ts`, `e2e/customer/auth-guest-flow.spec.ts` (guest part retired), the consent specs in `e2e/smoke/`, `__tests__/actions/auth/pin-intercept.test.ts`. All e2e work is delegated to `e2e-test-engineer`; seed or fixture changes to `e2e-test-data`.

### Test data requirements

A customer user with a verified phone, one with an unverified phone, and one legacy email-only account, each created inside the spec with unique numbers and removed afterwards. No shared seeded rows are mutated.

## 5. Threat model + security considerations

| Threat (STRIDE)                                                | Surface       | Mitigation                                                                                      |
| -------------------------------------------------------------- | ------------- | ----------------------------------------------------------------------------------------------- |
| Spoofing: PIN guessing                                         | verify action | five attempts then invalidate; five requests per phone per hour; ten-minute expiry              |
| Information disclosure: PIN at rest                            | user document | SHA-256 hash only; plaintext only in the test-only field under `ENABLE_E2E_PIN_INTERCEPT`       |
| Spoofing: session minting via inbound message                  | webhook       | AC10 test asserts no session cookie                                                             |
| Elevation: stolen long-lived session                           | 90-day cookie | httpOnly, secure, sameSite lax unchanged; logout; refresh on activity                           |
| Spoofing: attaching a phone to a legacy account                | AC8           | the phone is attached only after the WhatsApp PIN round-trip proves control; no merge or delete |
| Denial of service: WhatsApp outage blocks all customer sign-in | AC9           | notice and an Incident; accepted programme decision (R-048)                                     |

### Risk register entries

- **R-047 — Customer PIN brute force and PIN stored in plaintext** — closes the per-phone attempt gap left open in R-040. OPEN until the live UAT check, then MITIGATED. Opened by `risk-register-keeper`; the operator signs off the residual rating at plan approval.
- **R-048 — Customer sign-in and checkout unavailable when WhatsApp is down** — ACCEPTED (programme decision, #953); compensating: notice, Incident, counter or phone ordering.
- **R-049 — 90-day customer session lifetime** — ACCEPTED with compensating controls.
- **R-050 — Legacy account phone attachment on first WhatsApp sign-in** — OPEN, mitigated by WhatsApp proof of control and no-merge rule.

## 6. Data protection (GDPR Art. 25)

Personal data: phone number, first name, consent flags. Lawful basis: Art. 6(1)(b) for order and sign-in messages; marketing stays consent-based (Art. 7, shown unchecked). The PIN hash replaces a plaintext PIN (data protection by design). Unverified accounts are deleted after 24 hours (storage limitation). SMS and email PIN channels stop processing customer email and phone for sign-in. No new data category is collected.

## 7. AI / model considerations (EU AI Act Art. 11)

No AI in scope. Implementation was drafted with Claude Code (disclosed on every commit); no model runs in the product.

## 8. Rollback plan

Revert the bundle merge. New fields on the user document (hash, counters, test-only plaintext) are additive and ignored by the old code. Sessions issued with the 90-day lifetime stay valid until they expire; invalidate them by rotating `SESSION_PASSWORD` if that is not acceptable. The removed SMS and email actions return with the revert. The purge job stops with the revert.

## 9. Verification

Unit and integration tests per the AC table; critical-tier e2e at the default worker count; live UAT sign-in with a real number (operator, AC1, AC4, AC7 evidence); `verification_pin` is APPROVED on both WhatsApp accounts (checked 2026-11-04).

## 10. Operator tasks (non-code)

1. Live UAT sign-in with a real number after the UAT deploy; record the date in evidence, never the PIN.
2. Sign off R-047 to R-050 and ADR-008 at plan approval.
3. Confirm the production deploy check after release (PIN arrives, wrong PIN five times invalidates it).

## 11. Sign-off

- **Plan approved by operator:** approved 2026-11-05 (HIGH-risk checkpoint): the operator said `continue` after the checklist (review the plans, confirm the HMAC PIN-hash deviation, ADR-008 Accepted, sign off R-047 to R-051, submit `support_reply`). `support_reply` submission status is not confirmed here; it stays an operator task.
