---
req: REQ-119
generated_by: adr-author
generated_at: 2026-11-06T16:35:00Z
---

# Architecture decision — REQ-119

## Outcome

**Produced ADR-009:** Staff authorization is any-of over a `roles[]` list through one helper module, with `role` kept as a read-only fallback for one release (`docs/ADR/ADR-009-staff-authorization-any-of-roles-array.md`).

## Detail

- **ADR file:** `docs/ADR/ADR-009-staff-authorization-any-of-roles-array.md`
- **Status:** Accepted (operator approved the plan on 2026-11-06, `PROCEED`)
- **Summary:** Staff accounts and sessions carry `roles[]`; every check is an any-of check through the helpers in `lib/roles.ts` (re-exported from `lib/session.ts`); `isAdmin` keeps meaning "csr or above" and excludes `kitchen`; `role` stays as the highest role and the read fallback, so deploy order and migration timing do not matter.
- **Affected files:** about 125 files (261 direct role references replaced across `app/`, `lib/`, `services/`, `components/`, `proxy.ts`); schema change on the user model (`roles`, `role` enum); `lib/session.ts`, `lib/roles.ts`, `lib/permissions.ts`, `lib/auth-middleware.ts`, `proxy.ts`.
- **Signals that triggered the verdict:** risk class HIGH; pattern change spanning more than 3 files; schema-level data model change.
- **As built:** the decision held. Two refinements found while building are recorded in the plan's deviation section and do not change the decision: the helpers live in a client-safe `lib/roles.ts`, and `requirePermission` admits any staff role while the stored permission is the gate (`requireAdmin` still excludes `kitchen`).
- **Cross-references:** SRS REQ-AUTHA-004 to REQ-AUTHA-007, REQ-SETTINGS-002; risks R-052 to R-055.

## Operator sign-off

I have reviewed the ADR-worthiness verdict above and confirm:

- [ ] The verdict (ADR or no-ADR) matches the actual scope of this REQ.
- [ ] If ADR: the file at `docs/ADR/ADR-009-staff-authorization-any-of-roles-array.md` is edited from stub to canonical prose and status is Accepted.
- [ ] If no-ADR: the rationale is specific enough that an auditor reading this in 12 months would agree.

**Reviewer:** PENDING (operator)
**Date:** PENDING
