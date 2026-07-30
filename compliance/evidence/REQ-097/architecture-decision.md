---
req: REQ-097
generated_by: adr-author
generated_at: 2026-07-30T10:00:00Z
---

# Architecture decision — REQ-097

## Outcome

**No ADR needed** — this is a bug fix correcting an arithmetic omission in existing, already-architected code paths.

## Detail

- **Rationale:** No new dependency, no new database/cache/queue tier, no new external service, and no pattern change spanning the touched files — every file already shared the same reconciler contract (`reconcileAndValidateOrderLines`/`computeLineTotal`) or the same reference-calculation pattern (the menu editor's own preview). The fix adds one additive term (a flat, non-fractioned surcharge) to formulas that already existed; it does not change how the codebase is structured. Risk class is HIGH (financial-calculation defect signal), which nominally flags for ADR consideration per the decision tree, but the HIGH classification here stems from the _impact_ of a silent under-charge, not from architectural complexity — there is no structural decision to record.
- **Signals examined:** new third-party dependency (no), new external service (no), new DB/cache/queue tier (no), pattern change spanning >3 files (no — same formula duplicated across pre-existing call sites, not a new pattern), schema-level data model change (no), risk classification HIGH (yes — considered, but overridden by the absence of any other signal; see rationale above), file-path signals from `sdlc-config.json:adr_author.file_paths_signal_architecture` (none matched).

## Operator sign-off

I have reviewed the ADR-worthiness verdict above and confirm:

- [ ] If ADR: N/A.
- [x] If no-ADR: the rationale is specific enough that an auditor reading this in 12 months would agree — it names the exact signals checked and why each didn't apply.

**Reviewer:** sdlc-implementer@1.0 (AI-assisted; pending operator/UAT review)
**Date:** 2026-07-30
