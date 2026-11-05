---
adr_id: 'ADR-008'
status: 'Proposed'
date: '2026-11-05'
authored_by: 'sdlc-implementer (AI-assisted)'
related_reqs: ['REQ-117']
supersedes: []
superseded_by: null
---

# ADR-008: WhatsApp-only customer sign-in with a keyed-hash, rate-limited PIN and a 90-day customer session

## Status

**Proposed** (DRAFT, operator to flip to _Accepted_ on plan approval)

## Context

REQ-117 (WA-04, tracker #953) makes WhatsApp the only customer identity channel. Today the login form offers SMS, email and WhatsApp, guest checkout exists, the PIN is stored in plaintext on the user document (`verificationPin`), there is no per-PIN attempt limit or per-phone request limit (R-040 left this open), and every session is a 7-day iron-session cookie. The programme decisions in #953 require phone and PIN sign-in for checkout and booking, a long-lived customer session, and a notice (plus an Incident) when WhatsApp is unavailable. SRS: REQ-AUTHC-001 to REQ-AUTHC-007. Risks: R-047 to R-050.

## Decision

1. **One customer channel.** Delete the SMS and email PIN actions and guest checkout from the customer flow. No staff code calls them (checked), so they are removed rather than made staff-only.
2. **PIN stored as a keyed hash.** The 6-digit PIN is stored as `HMAC-SHA256(key, pin)` in `verificationPinHash`, where the key is derived from the existing `SESSION_PASSWORD` secret with a fixed label, so no new environment variable is needed. The issue text says "SHA-256 hash"; a plain SHA-256 of a 6-digit value can be reversed from a database copy in milliseconds, so the key is what makes the hash worth having. Verification compares with `timingSafeEqual`. Under `ENABLE_E2E_PIN_INTERCEPT` the plaintext is also kept in a test-only field so `readPinFromMongo` keeps working.
3. **Limits.** Five wrong attempts invalidate the PIN (counter on the user document); at most five PIN requests per phone per hour (counted on the user document, so it survives restarts and works across instances, unlike the webhook limiter in ADR-007); expiry ten minutes.
4. **Purge.** A scheduled job deletes users who were created by a PIN request and never verified, after 24 hours.
5. **Customer session lifetime.** Customer sessions last 90 days and are refreshed on activity; staff sessions keep the current 7 days. Implementation uses iron-session v8 per-session `updateConfig` (`ttl` and cookie `maxAge`) at customer sign-in. Because the seal's lifetime is set when the cookie is written, this is verified by a unit test of the real seal and unseal round trip; if iron-session cannot hold two lifetimes under one cookie name, the fallback is a second cookie name for customer sessions.
6. **Unavailable notice.** A failed send with `SERVICE_DISABLED`, `MISSING_CREDENTIALS`, `TEMPLATE_NOT_FOUND` or a Meta outage code shows the unavailable notice and records an Incident (kind `notification_delivery_failed`).
7. **Inbound isolation.** The webhook may create or identify a user but never creates a session; a test asserts this.

## Consequences

- **Good:** one auditable identity channel; a database copy no longer reveals live PINs; brute force is bounded per PIN and per phone; the unverified-user table cannot grow without limit.
- **Bad:** a WhatsApp outage blocks all customer sign-in and checkout (R-048, accepted in the programme decisions); a stolen 90-day cookie is valid for longer (R-049); legacy email-only customers must re-verify on first sign-in.
- **Neutral / tradeoffs:** the hash key is tied to `SESSION_PASSWORD`, so rotating that secret also invalidates outstanding PINs (they live ten minutes) as well as all sessions, which is acceptable; PIN request counting adds one write per request.

## Alternatives considered

- **Keep SMS and email as fallbacks:** ruled out by the programme decision that WhatsApp is the only customer identity channel and by the cost of keeping two more PIN paths secure.
- **Plain SHA-256 as the issue text says:** ruled out as above; offline reversal of a 6-digit space is trivial. A slow hash (bcrypt, argon2) would add a dependency for no benefit in a 10-minute, 5-attempt space; the keyed hash gets the same protection without one.
- **A new `PIN_HASH_SECRET` variable:** cleaner separation, but another secret to provision in Railway and k3s before this can deploy; deriving from `SESSION_PASSWORD` avoids that. Easy to change later because the key derivation sits in one function.
- **In-memory per-phone request limiter (as ADR-007):** ruled out for sign-in; it resets on restart and per instance, which would let an attacker reset the limit by waiting for a deploy.
- **A separate cookie name for customer sessions from the start:** simpler lifetime handling, but changes how every server component reads the session. Kept as the fallback.

## Cross-references

- Implementation plan: `compliance/plans/REQ-117/implementation-plan.md`
- SRS items: REQ-AUTHC-001 to REQ-AUTHC-007
- Risk register: R-040 (per-phone attempt gap closed here), R-047 to R-050
- Related: ADR-006 (canonical phone), ADR-007 (webhook limiter)
- Supersedes / superseded-by: none
