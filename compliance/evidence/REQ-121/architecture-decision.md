---
req: REQ-121
generated_by: adr-author
generated_at: 2026-11-17T12:00:00Z
---

# Architecture decision — REQ-121

## Outcome

**No ADR needed** — This REQ restructures the customer checkout UI on top of ADR-010 (the single `createCustomerOrder` service) and keeps every server-side rule where it is.

## Detail

- **Rationale:** UI restructuring plus a few small service changes (tip cap, tip method default, first-name save); no structural change.
- **Signals examined:** new third-party dependency, no; new external service, no; new database, cache or queue, no; schema-level data model change, no (the profile keys are unchanged); pattern change over more than three files, no (the form and its components are replaced in place; the rules module is new but local); risk class HIGH, yes (money path), confirmed by the operator at the plan checkpoint as covered by ADR-010 and requirements gap G1 rather than a new decision.

## Operator sign-off

I have reviewed the ADR-worthiness verdict above and confirm:

- [x] The verdict (ADR or no-ADR) matches the actual scope of this REQ.
- [~] If ADR: not applicable (no ADR).
- [x] If no-ADR: the rationale is specific enough that an auditor reading this in 12 months would agree.

**Reviewer:** William
**Date:** 2026-11-17
