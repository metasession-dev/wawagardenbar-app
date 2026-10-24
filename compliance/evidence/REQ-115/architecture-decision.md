---
req: REQ-115
generated_by: adr-author
generated_at: 2026-10-24T16:41:34Z
---

# Architecture decision — REQ-115

## Outcome

**Produced ADR-006:** Canonical E.164 phone format (`+` prefix) for every identity lookup (`docs/ADR/ADR-006-canonical-e164-phone-format.md`).

## Detail

- **ADR file:** `docs/ADR/ADR-006-canonical-e164-phone-format.md`
- **Status:** Accepted (operator approved the plan on 2026-10-24)
- **Summary:** One function, `normalizePhone`, defines the single stored and compared phone form; lookups also match legacy stored forms until the no-merge migration has run.
- **Affected files:** `lib/auth-utils.ts`, `services/whatsapp-inbound-service.ts`, `app/actions/auth/*`, `lib/phone-migration.ts`, `scripts/migrate-normalize-phones.ts`.
- **Cross-references:** SRS REQ-WA-008, REQ-WA-005, REQ-AUTHC-001; risk R-041.
- **Not an ADR:** the `sendMessage` header/body/button options shape is a backward-compatible extension of one internal method with no new dependency or service. Recorded as examined in the plan.

## Operator sign-off

I have reviewed the ADR-worthiness verdict above and confirm:

- [ ] The verdict (ADR or no-ADR) matches the actual scope of this REQ.
- [ ] The file at `docs/ADR/ADR-006-canonical-e164-phone-format.md` is edited from stub to canonical prose and status is Accepted.

**Reviewer:** REPLACE — operator name
**Date:** REPLACE — YYYY-MM-DD
