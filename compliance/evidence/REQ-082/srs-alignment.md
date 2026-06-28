---
req: REQ-082
generated_by: sdlc-implementer
generated_at: 2026-06-28T12:30:00Z
---

# SRS alignment — REQ-082

## Summary

This REQ modified 3 existing SRS items in `docs/SRS.md` to reflect the progressive disclosure pattern that replaced the strict drill-down cascade:

| SRS item        | Status              | ACs it traces to                  |
| --------------- | ------------------- | --------------------------------- |
| REQ-ORDMGT-008  | Updated (canonical) | AC1, AC2, AC3, AC4, AC5, AC6, AC8 |
| REQ-MENUMGT-007 | Updated (canonical) | AC1, AC2, AC3, AC4, AC5           |
| REQ-INV-018     | Updated (canonical) | AC1, AC2, AC3, AC4, AC5           |

All 3 SRS items were updated in both the index table and the detailed entries sections of `docs/SRS.md`. The Given/When/Then blocks were rewritten from the old cascade behaviour ("sub-categories hidden until a main category is selected") to the progressive disclosure behaviour ("all items visible on landing, grouped by main category then sub-category, categories as toggle filters, search filters items not categories").

AC7 is annotated `@srs-deferred: E2E test update` — not a user-observable behaviour change, no separate SRS item needed.

## Operator sign-off

- [x] All SRS items have been updated to canonical prose reflecting progressive disclosure (no stale cascade language remains).
- [x] Each AC traces to at least one SRS item (or has an explicit @srs-deferred annotation).
- [x] SRS items are in the correct feature area sections.

**Reviewer:** Operator
**Date:** 2026-06-28
