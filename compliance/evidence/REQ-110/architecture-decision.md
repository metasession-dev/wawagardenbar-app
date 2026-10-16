---
req: REQ-110
generated_by: adr-author
generated_at: 2026-10-16T16:00:00Z
---

# Architecture decision — REQ-110

## Outcome

**No ADR needed** — Risk class HIGH was examined and overridden.

## Detail

- **Rationale:** Risk class HIGH (per `Test_Policy.md`'s security-critical-functionality bucket) is one of `adr-author`'s decision-tree signals that can force an ADR, and was explicitly examined — but the change is structurally a routine dependency patch, not an architectural decision: `brace-expansion` stays the same package via an in-range version bump through an existing `overrides` mechanism (no new dependency, no new tier), and `nodemailer` 9.1.1→10.x keeps the same transport API for this project's usage (confirmed via the 10.0.0 changelog/release notes, whose only stated breaking change is the Node ≥20 runtime requirement, already satisfied).
- **Signals examined:** New third-party dependency (no), new external service/DB/cache/queue (no), pattern change spanning >3 files (no — single file, `lib/email.ts`, reviewed with zero changes), risk class HIGH (yes — examined, overridden), file-path signal (no match in `sdlc-config.json:adr_author.file_paths_signal_architecture`).
- This was an ambiguous case (HIGH risk signal vs. no structural change) surfaced to the operator via `AskUserQuestion`, who confirmed no ADR needed.

## Operator sign-off

I have reviewed the ADR-worthiness verdict above and confirm:

- [x] The verdict (no-ADR) matches the actual scope of this REQ.
- [x] N/A — no ADR file to edit.
- [x] The rationale is specific enough for an auditor reading this in 12 months to agree.

**Reviewer:** william@ostendo.io
**Date:** 2026-10-16
