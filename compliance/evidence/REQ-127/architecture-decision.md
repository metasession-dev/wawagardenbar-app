---
req: REQ-127
generated_by: adr-author
generated_at: 2026-11-25T05:20:00Z
---

# Architecture decision — REQ-127

## Outcome

**No ADR needed** — client-side change within the existing idempotency design (ADR-010).

## Detail

- **Rationale:** the stored attempt reuses the server's existing idempotency behaviour (REQ-CHECKOUT-008) and adds one narrow owner-scoped cancel action.
- **Signals examined:** new dependency no; new external service no; new datastore no (browser sessionStorage only); pattern change over three files no (checkout form, one helper, one action); schema change no; HIGH risk no (MEDIUM).

## Operator sign-off

I have reviewed the ADR-worthiness verdict above and confirm:

- [x] The verdict (ADR or no-ADR) matches the actual scope of this REQ.
- [~] If ADR: the file at `docs/ADR/` is edited from stub to canonical prose and status is Accepted.
- [x] If no-ADR: the rationale is specific enough that an auditor reading this in 12 months would agree.

**Reviewer:** metasession-dev (Metassession Dev)
**Date:** 2026-11-25

_Approved by metasession-dev (Metassession Dev) in the Claude Code session on 2026-11-25; recorded by the agent from the operator's explicit reply._
