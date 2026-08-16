---
req: REQ-099
generated_by: adr-author
generated_at: 2026-08-16T20:51:00Z
---

# Architecture decision — REQ-099

## Outcome

**No ADR needed** — additive UI-rendering + query-filter change on an existing, already-designed data model (`Tab.paymentStatus === 'written-off'` shipped in REQ-098 / ADR-003).

## Detail

- **Rationale:** No new third-party dependency, no new database/cache/queue tier, no new external service. The 4 touched files (`dashboard-tabs-list-client.tsx`, `dashboard-tabs-filter.tsx`, `tab-actions.ts`, `tab-service.ts`) are the standard existing action→service layering already used by every other filter on this same list view — not a new pattern spanning the codebase, just the existing filter/query flow gaining one more filter dimension. Risk class is MEDIUM (not HIGH/CRITICAL).
- **Signals examined:** new dependency (no) · new DB/cache/queue (no) · new external service (no) · pattern change >3 files (no — 4 files, all within one existing pattern) · risk class HIGH/CRITICAL (no — MEDIUM) · `sdlc-config.json:adr_author.file_paths_signal_architecture` match (no — none of the touched paths match a configured architecture-signal path).

## Operator sign-off

I have reviewed the ADR-worthiness verdict above and confirm:

- [x] The verdict (no-ADR) matches the actual scope of this REQ.
- [x] The rationale is specific enough that an auditor reading this in 12 months would agree.

**Reviewer:** william@ostendo.io (solo-operator dual-actor sign-off)
**Date:** 2026-08-16
