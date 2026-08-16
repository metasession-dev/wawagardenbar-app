---
req: REQ-099
generated_by: requirements-aligner
generated_at: 2026-08-16T20:50:00Z
---

# SRS alignment — REQ-099

## ACs traced

| AC  | SRS item       | Action this cycle                                                                                                                        |
| --- | -------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| AC1 | REQ-TABMGT-009 | added (new) — written-off tab list badge + no "Tab Paid" button                                                                          |
| AC2 | REQ-TABMGT-009 | added (new) — "Written off" filter checkbox, independent of status checkboxes                                                            |
| AC3 | REQ-TABMGT-001 | updated (drift resolved) — added a Given/When/Then line clarifying status-checkbox filtering is unchanged when the new filter isn't used |

Both `docs/SRS.md` edits landed with canonical Given/When/Then prose directly (no stub placeholders left) — verified by grep for `<TODO>` / `@srs-stub` markers against `REQ-TABMGT-009` and the updated `REQ-TABMGT-001` entry: none found.

## Operator sign-off

I have reviewed the AC-to-SRS-item traces above and confirm:

- [x] Each AC has a defensible SRS item.
- [x] New SRS items have been edited from stubs to canonical Given/When/Then prose.
- [x] Stale items have been brought current.

**Reviewer:** william@ostendo.io (solo-operator dual-actor sign-off, per REQ-099's plan §9)
**Date:** 2026-08-16
