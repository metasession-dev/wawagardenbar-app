---
req: REQ-108
generated_by: requirements-aligner
generated_at: 2026-09-22T11:30:00Z
---

# SRS alignment — REQ-108

## SRS-ID collision found and corrected

During Stage 3, this REQ's SRS item was found allocated as `REQ-ORDMGT-015` — but that ID was already legitimately owned by REQ-097 ("Portion picker preview price matches menu-editor calculation", released 2026-07-30, nearly two months before REQ-108's Stage 1). This was **not** a cross-branch race — `git log` confirms REQ-097's heading blocks for `REQ-ORDMGT-015`/`-016` were already committed to `develop` well before REQ-108's Stage 1 ran. The actual root cause: REQ-097's own Stage-1 commit (`f40767b`) added both SRS _heading blocks_ (`#### REQ-ORDMGT-015 — ...`, `#### REQ-ORDMGT-016 — ...`) but never added their corresponding rows to the SRS _summary table_ — the two representations of `docs/SRS.md`'s content drifted out of sync within REQ-097's own change. REQ-108's Stage-1 ID allocation then scanned the summary table (whose last row was `REQ-ORDMGT-014`) to find the next-free ID, proposed `015`, and collided with the table-absent-but-heading-present item REQ-097 already owned.

Per `requirements-aligner`'s own documented remediation ("Re-run the skill post-merge to re-allocate"), REQ-108's item has been reallocated to `REQ-ORDMGT-017` (the next genuinely free ID — `016` was also already taken, by the same REQ-097 cycle). Updated: `docs/SRS.md` (summary table row + heading), `compliance/plans/REQ-108/implementation-plan.md`, `compliance/evidence/REQ-108/implementation-plan.md`, `compliance/evidence/REQ-108/test-scope.md`, `compliance/pending-releases/RELEASE-TICKET-REQ-108.md`, `compliance/RTM.md`. REQ-097's files (which legitimately own `REQ-ORDMGT-015`) were left untouched. Filed upstream as [DevAudit-Installer#840](https://github.com/metasession-dev/DevAudit-Installer/issues/840).

## ACs traced

| AC  | SRS item       | Action this cycle                                                         |
| --- | -------------- | ------------------------------------------------------------------------- |
| AC1 | REQ-ORDMGT-017 | added (new — reallocated from the colliding REQ-ORDMGT-015)               |
| AC2 | REQ-ORDMGT-017 | added (new — same item, paired positive/negative Given/When/Then bullets) |
| AC3 | REQ-ORDMGT-017 | added (new — same item, covers the `addOrderToTab` chokepoint fix)        |

Fuzzy-match note (unchanged from Phase 1): matched against the existing `REQ-ORDMGT-007` (inventory-deduction chokepoint) first — that item's source-of-truth text covers only inventory deduction, no payment-status side effects, so this is genuinely new behaviour rather than drift on an existing item.

## Operator sign-off

I have reviewed the AC-to-SRS-item traces above and confirm:

- [x] Each AC has a defensible SRS item.
- [x] New SRS items have been edited from stubs to canonical Given/When/Then prose (done at Phase 1; unaffected by the Stage-3 ID reallocation).
- [x] Stale items have been brought current (N/A — no existing items required updating for this REQ).

**Reviewer:** operator (william@ostendo.io)
**Date:** 2026-09-22
