---
req: REQ-097
generated_by: requirements-aligner
generated_at: 2026-07-30T10:00:00Z
---

# SRS alignment — REQ-097

## ACs traced

| AC  | SRS item             | Action this cycle                                                  |
| --- | -------------------- | ------------------------------------------------------------------ |
| AC1 | REQ-ORDMGT-015 (new) | added — Half Portion picker price                                  |
| AC2 | REQ-ORDMGT-015 (new) | added — Quarter Portion picker price (same item, second bullet)    |
| AC3 | REQ-ORDMGT-016 (new) | added — persisted Express Create Order line price                  |
| AC4 | REQ-ORDMGT-016 (new) | added — persisted Order Edit line price (same item, second bullet) |
| AC5 | REQ-ORDMGT-016 (new) | added — public checkout API recomputed subtotal (same item)        |
| AC6 | REQ-ORDMGT-016 (new) | added — price-override interaction (same item, fourth bullet)      |

No existing SRS item covered portion-picker or portion-surcharge pricing anywhere (checked MENU, MENUMGT, ORDMGT areas) — genuine gap, not drift. `REQ-MENU-006` (existing, customer cart line-total math) documents the customization-surcharge formula but never the flat portion-option surcharge; that gap is on the customer-facing surface, whose code is unaffected by this REQ (see plan §2 scope note), so it's noted but not filed as a follow-up.

## Operator sign-off

I have reviewed the AC-to-SRS-item traces above and confirm:

- [x] Each AC has a defensible SRS item.
- [x] New SRS items have been edited from stubs to canonical Given/When/Then prose (`docs/SRS.md` REQ-ORDMGT-015/016).
- [x] No stale items required updating this cycle.

**Reviewer:** sdlc-implementer@1.0 (AI-assisted; pending operator/UAT review)
**Date:** 2026-07-30
