---
adr_id: 'ADR-006'
status: 'Proposed'
date: '2026-10-24'
authored_by: 'sdlc-implementer (AI-assisted)'
related_reqs: ['REQ-115']
supersedes: []
superseded_by: null
---

# ADR-006: Canonical E.164 phone format (`+` prefix) for every identity lookup

## Status

**Proposed** (DRAFT — operator to flip to _Accepted_ on plan approval)

## Context

REQ-115 (#963, SRS REQ-WA-008). Meta's inbound webhook `from` is digits only (`2348012345678`); web sign-in stores the number as typed, and `sanitizePhone` keeps a leading `+` only if the user typed one. The same person can therefore be stored as `+234…`, `234…` or `0…`, and an inbound lookup by `from` can miss their account and classify them as `new`, creating a duplicate user. Phone is also the sign-in identity, so a lookup mismatch is an identity problem, not only a data-quality one. The change touches more than three files (auth utils, inbound service, PIN send/verify actions, migration script), which is why this is recorded.

## Decision

The single canonical form is E.164 with a leading `+` (default country NG). One function, `normalizePhone(input): string` in `lib/auth-utils.ts`, converts `234…`, `0…` and `+234…` to `+234…`. `sanitizePhone` delegates to it. Every place that stores, compares or queries a phone (inbound lookups in `whatsapp-inbound-service.ts`, PIN send and verify actions) calls it first; Meta's outbound `to` keeps stripping non-digits as today. A one-off script, `scripts/migrate-normalize-phones.ts`, rewrites stored `users.phone` values to the canonical form (dry-run by default, before/after file written for rollback) and **reports duplicates without merging**.

## Consequences

- **Good:** Inbound `from` and web-entered numbers resolve to the same user; no duplicate users from format drift.
- **Good:** One function to test and one place to extend (other countries later).
- **Bad:** Existing data needs the migration; until it has run, rows still in the old format are matched only if lookups also try the legacy forms. Mitigation: the migration runs after UAT approval and lookups call `normalizePhone` on both sides.
- **Bad:** Default-country NG is an assumption for numbers typed without a country code.
- **Neutral / tradeoffs:** Duplicates found by the migration are a manual customer-service decision; merging accounts is deliberately out of scope because a wrong merge is an account takeover.

## Alternatives considered

- **Strip `+` everywhere (digits only):** matches Meta's format, but loses the unambiguous international marker and conflicts with how numbers display and with existing stored `+` values. Ruled out.
- **Store as typed, normalise only at lookup time:** leaves the database inconsistent and makes unique indexes and duplicate detection unreliable. Ruled out.
- **Use a phone library (libphonenumber):** more correct for non-NG numbers but adds a runtime dependency for a single-country business today. Deferred; the single function is the seam to swap it in.

## Cross-references

- Implementation plan: `compliance/plans/REQ-115/implementation-plan.md`
- SRS items: REQ-WA-008 (new), REQ-WA-005, REQ-AUTHC-001
- Risk register: see `compliance/evidence/REQ-115/risk-assessment.md` (to be created by `risk-register-keeper`)
