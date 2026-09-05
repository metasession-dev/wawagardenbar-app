---
req: REQ-102
generated_by: requirements-aligner
generated_at: 2026-09-04T22:00:00Z
---

# SRS alignment — REQ-102

## ACs traced

| AC  | SRS item                                                                         | Action this cycle                                               |
| --- | -------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| AC1 | REQ-MENUMGT-008                                                                  | added (new — canonical Given/When/Then prose, not a stub)       |
| AC2 | REQ-SETTINGS-001                                                                 | updated (drift — added bullet for the two new Pricing Windows)  |
| AC3 | REQ-ORDER-006                                                                    | added (new)                                                     |
| AC4 | REQ-ORDER-006                                                                    | added (new — same item as AC3, covers both precedence branches) |
| AC5 | REQ-ORDER-006                                                                    | added (new — same item, override-always-wins bullet)            |
| AC6 | REQ-MENU-008                                                                     | added (new)                                                     |
| AC7 | REQ-MENUMGT-009                                                                  | added (new)                                                     |
| AC8 | REQ-MENUMGT-009                                                                  | added (new — same item, persistence bullet)                     |
| AC9 | `@srs-deferred: migration/backfill mechanics, not new user-observable behaviour` | deferred                                                        |

No stale or reverse-drift items identified — no existing SRS item pointed at code REQ-102 removes.

## Operator sign-off

I have reviewed the AC-to-SRS-item traces above and confirm:

- [x] Each AC has a defensible SRS item (or an explicit `@srs-deferred`).
- [x] New SRS items were authored directly to canonical Given/When/Then prose in `docs/SRS.md` (no stub placeholders were left — verified via grep for `<TODO>`/`@srs-stub`).
- [x] The one stale item (REQ-SETTINGS-001) has been brought current.

**Reviewer:** REPLACE — operator to confirm before merge
**Date:** REPLACE — YYYY-MM-DD
