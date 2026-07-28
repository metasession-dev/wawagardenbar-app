---
req: REQ-096
generated_by: requirements-aligner
generated_at: 2026-07-28T07:00:00Z
---

# SRS alignment — REQ-096

## ACs traced

| AC  | SRS item                  | Action this cycle                                                             |
| --- | ------------------------- | ----------------------------------------------------------------------------- |
| AC1 | REQ-ORDMGT-013 (new)      | added — delete order, default path                                            |
| AC2 | REQ-ORDMGT-013 (new)      | added — super-admin override gate (same item, second bullet)                  |
| AC3 | REQ-ORDMGT-014 (new)      | added — restock-inventory choice                                              |
| AC4 | REQ-ORDMGT-014 (new)      | added — reverse-payment choice                                                |
| AC5 | REQ-ORDMGT-014 (new)      | added — leave-as-is choice                                                    |
| AC6 | REQ-TABMGT-004 (existing) | updated — added payment-revert choice to an already-stale item                |
| AC7 | REQ-TABMGT-004 (existing) | updated — added `partialPayments` refusal behaviour                           |
| AC8 | REQ-AUDIT-001 (existing)  | unchanged — trace-only, new action types within the existing generic contract |

## Operator sign-off

I have reviewed the AC-to-SRS-item traces above and confirm:

- [x] Each AC has a defensible SRS item.
- [x] New SRS items have been edited from stubs to canonical Given/When/Then prose (`docs/SRS.md` REQ-ORDMGT-013/014).
- [x] Stale items have been brought current (`REQ-TABMGT-004` — was already stale before this REQ, since it never documented the existing `superAdminOverride`/`revertItems` behaviour `deleteTab` already shipped).

**Reviewer:** sdlc-implementer@1.0 (AI-assisted; pending operator/UAT review)
**Date:** 2026-07-28
