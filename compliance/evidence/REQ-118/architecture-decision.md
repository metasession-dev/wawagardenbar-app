---
req: REQ-118
generated_by: adr-author
generated_at: 2026-11-05T12:00:00Z
---

# Architecture decision — REQ-118

## Outcome

**No ADR needed** — additive fields on one existing model, no new dependency, service, queue or external system, and no change to a cross-cutting pattern.

## Detail

- **Rationale:** `lastCustomerMessageAt` and `slaDueAt` are added to `SupportTicket` and the `priority` enum gains `urgent`. The reply-mode rule (24-hour window) is recorded in SRS REQ-WA-012.
- **Signals examined:** new dependency (no), new external service (no), new data tier (no), pattern change over more than 3 files (no: the change stays inside the support ticket service, the inbound service and the dashboard views), schema-level change (additive fields only), risk class MEDIUM (bundle ceremony HIGH is covered by ADR-008 for the primary REQ).

## Operator sign-off

I have reviewed the ADR-worthiness verdict above and confirm:

- [ ] The verdict (no-ADR) matches the actual scope of this REQ.
- [ ] The rationale is specific enough that an auditor reading this in 12 months would agree.

**Reviewer:** REPLACE — operator name
**Date:** REPLACE — YYYY-MM-DD
