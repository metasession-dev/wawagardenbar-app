---
req: REQ-126
generated_by: adr-author
generated_at: 2026-11-25T05:20:00Z
---

# Architecture decision — REQ-126

## Outcome

**No ADR needed** — small extension of the existing inbound intent classifier and urgent-ticket path.

## Detail

- **Rationale:** two new intent values on the existing router, reusing the urgent ticket and SLA of REQ-WA-013; no new dependency, service, data store or pattern.
- **Signals examined:** new dependency no; new external service no; new datastore no; pattern change over three files no (inbound service, intent model, ticket service label); schema change no (enum values only); HIGH risk no (MEDIUM).

## Operator sign-off

I have reviewed the ADR-worthiness verdict above and confirm:

- [x] The verdict (ADR or no-ADR) matches the actual scope of this REQ.
- [~] If ADR: the file at `docs/ADR/` is edited from stub to canonical prose and status is Accepted.
- [x] If no-ADR: the rationale is specific enough that an auditor reading this in 12 months would agree.

**Reviewer:** metasession-dev (Metassession Dev)
**Date:** 2026-11-25

_Approved by metasession-dev (Metassession Dev) in the Claude Code session on 2026-11-25; recorded by the agent from the operator's explicit reply._
