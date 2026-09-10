---
req: REQ-103
generated_by: requirements-aligner
generated_at: 2026-09-08T20:50:00Z
---

# SRS alignment — REQ-103

## ACs traced

| AC  | SRS item                | Action this cycle                                                                                                                 |
| --- | ----------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| AC1 | REQ-MENUMGT-009         | updated (drift corrected — actor broadened from super-admin-only to super-admin or `menuManagement`-permitted admin)              |
| AC2 | REQ-MENUMGT-009         | updated (same drift correction, price-field path)                                                                                 |
| AC3 | REQ-MENUMGT-010         | updated (drift corrected — actor broadened, same as above)                                                                        |
| AC4 | REQ-MENUMGT-008         | updated (drift corrected — item previously documented the bug itself as intended: "Given a non-super-admin session ... rejected") |
| AC5 | REQ-MENUMGT-008/009/010 | updated (negative-case bullet added/confirmed on all three items)                                                                 |
| AC6 | REQ-MENUMGT-010         | unchanged (item already documented "without touching any other settings" — no drift)                                              |

No new `REQ-AREA-NNN` items were proposed. This REQ is a pure drift correction: the three touched SRS items previously described the pre-fix (buggy) behaviour as the intended spec. `docs/SRS.md` was edited during Phase 1 to replace the super-admin-only actor language with "super-admin or an admin with `permissions.menuManagement === true`" across all three items, and to add/confirm the negative-case bullet for a session holding neither.

## Gap status: CLEAN

All 6 ACs trace to existing SRS items with drift fully resolved in this cycle (no `@srs-deferred` annotations needed).

## Operator sign-off

I have reviewed the AC-to-SRS-item traces above and confirm:

- [ ] Each AC has a defensible SRS item.
- [ ] New SRS items have been edited from stubs to canonical Given/When/Then prose. (N/A — no new items this cycle.)
- [ ] Stale items have been brought current.

**Reviewer:** REPLACE — operator name
**Date:** REPLACE — YYYY-MM-DD
