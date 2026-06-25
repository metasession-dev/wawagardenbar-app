---
req: REQ-085
generated_by: adr-author
generated_at: 2026-06-25T16:00:00Z
---

# Architecture decision — REQ-085

## Outcome

**No ADR needed** — Bug fix removing `status: 'confirmed'` from two `updateMany` calls in `services/tab-service.ts` + UI badge label additions across 4 components. No structural change, no new pattern, no dependency choice. The HIGH risk classification reflects the blast radius of the bug (payments + inventory), not the architectural significance of the fix.

## Detail

- **Rationale:** Bug fix removing a harmful field overwrite + UI label additions. No new third-party dependency, no new external service, no new database/cache/queue tier, no pattern change spanning >3 files, no schema-level data model change. The HIGH risk signal fired but the actual change is a removal of a field from two `$set` objects — not an architecture decision.
- **Signals examined:**
  - New third-party runtime dependency: No
  - New external service: No
  - New database/cache/queue tier: No
  - Pattern change spanning >3 files: No (5 files touched but bug fix + labels, not pattern change)
  - Schema-level data model change: No
  - Risk classification HIGH: Yes (signal fired, but operator confirmed no ADR needed)
  - File-path signal: No (`services/tab-service.ts` not under configured `lib/services/`)

## Operator sign-off

I have reviewed the ADR-worthiness verdict above and confirm:

- [x] The verdict (no-ADR) matches the actual scope of this REQ.
- [x] The rationale is specific enough that an auditor reading this in 12 months would agree.

**Reviewer:** Operator
**Date:** 2026-06-25
