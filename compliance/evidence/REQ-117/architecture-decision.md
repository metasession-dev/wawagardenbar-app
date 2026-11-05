---
req: REQ-117
generated_by: adr-author
generated_at: 2026-11-05T12:00:00Z
---

# Architecture decision — REQ-117

## Outcome

**Produced ADR-008:** WhatsApp-only customer sign-in with a keyed-hash, rate-limited PIN and a 90-day customer session (`docs/ADR/ADR-008-whatsapp-only-customer-signin-hashed-pin-session.md`).

## Detail

- **ADR file:** `docs/ADR/ADR-008-whatsapp-only-customer-signin-hashed-pin-session.md`
- **Status:** Accepted (operator, 2026-11-05)
- **Summary:** One customer identity channel; the PIN is stored as HMAC-SHA-256 keyed from `SESSION_PASSWORD` and compared in constant time; five attempts and five requests per hour per phone; a 90-day customer session under iron-session `updateConfig`; unverified users purged after 24 hours.
- **Affected files:** `app/actions/auth/*`, `components/shared/auth/login-form.tsx`, `lib/auth-utils.ts`, `lib/session.ts`, `lib/scheduled-jobs.ts`, `models/user-model.ts`.
- **Cross-references:** SRS REQ-AUTHC-001 to REQ-AUTHC-007; risks R-047 to R-050.
- **Built as decided:** the HMAC deviation from the issue text ("SHA-256") was confirmed by the operator. The iron-session open check passed (one cookie name holds both lifetimes), so the second-cookie fallback was not needed.

## Operator sign-off

I have reviewed the ADR-worthiness verdict above and confirm:

- [x] The verdict (ADR or no-ADR) matches the actual scope of this REQ.
- [x] The ADR file is edited from stub to canonical prose and status is Accepted.

**Reviewer:** William Thompson
**Date:** 2026-11-05
