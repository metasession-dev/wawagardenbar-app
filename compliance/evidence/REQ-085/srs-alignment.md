---
req: REQ-085
generated_by: sdlc-implementer
generated_at: 2026-06-25T16:00:00Z
---

# SRS alignment — REQ-085

## Summary

This REQ proposed 4 new SRS items in `docs/SRS.md`:

| SRS item        | Status                   | ACs it traces to |
| --------------- | ------------------------ | ---------------- |
| REQ-TABMGT-006  | Added (stub → canonical) | AC1, AC2         |
| REQ-KITCHEN-007 | Added (stub → canonical) | AC3              |
| REQ-ORDER-005   | Added (stub → canonical) | AC4, AC5, AC7    |
| REQ-KITCHEN-008 | Added (stub → canonical) | AC6              |

All 4 SRS items were added to both the index table and the detailed entries section of `docs/SRS.md` with canonical Given/When/Then prose.

AC8 is annotated `@srs-deferred: regression guard, not user-observable behaviour` — no SRS item needed.

## Operator sign-off

- [x] All SRS stubs have been promoted to canonical prose (no TODO or @srs-stub markers remain).
- [x] Each AC traces to at least one SRS item (or has an explicit @srs-deferred annotation).
- [x] SRS items are in the correct feature area sections.

**Reviewer:** Operator
**Date:** 2026-06-25
