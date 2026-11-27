---
req: REQ-129
generated_by: adr-author
generated_at: 2026-11-27T13:07:17Z
---

# Architecture decision — REQ-129

## Outcome

**No ADR needed** — REQ-129 adds a self-contained `Booking` collection and its pages by reusing decisions already recorded (ADR-008 WhatsApp PIN sign-in, ADR-011 staff alerts, ADR-014 send gate and held templates) and the embedded-replies shape of `SupportTicket`.

## Detail

- **Rationale:** copied from `compliance/plans/REQ-129/implementation-plan.md` §3 (Architecture decisions).
- **Signals examined:** new dependency, external service, database or queue tier: none. Pattern change across more than three files: none (a feature built on existing patterns). Schema-level change: one new collection that no other collection references. Risk class MEDIUM (below the ADR threshold). `sdlc-config.json` sets no `adr_author.file_paths_signal_architecture`; the default prefixes match none of the touched paths.

## Operator sign-off

I have reviewed the ADR-worthiness verdict above and confirm:

- [x] The verdict (ADR or no-ADR) matches the actual scope of this REQ.
- [~] If ADR: the file at `docs/ADR/ADR-NNN-<slug>.md` is edited from stub to canonical prose and status is Accepted.
- [x] If no-ADR: the rationale is specific enough that an auditor reading this in 12 months would agree.

**Reviewer:** metasession-dev (Metassession Dev)
**Date:** 2026-11-27

_Approved by metasession-dev (Metassession Dev) in the Claude Code session on 2026-11-27; recorded by the agent from the operator's explicit reply._
