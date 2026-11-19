---
req: REQ-122
generated_by: requirements-aligner
generated_at: 2026-11-17T12:00:00Z
---

# SRS alignment — REQ-122

## ACs traced

| AC  | SRS item         | Action this cycle                                                                                                                                                               |
| --- | ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AC1 | REQ-DASH-003     | added (new)                                                                                                                                                                     |
| AC2 | REQ-DASH-004     | added (new)                                                                                                                                                                     |
| AC3 | REQ-DASH-005     | added (new)                                                                                                                                                                     |
| AC4 | REQ-AUTHA-008    | added (new)                                                                                                                                                                     |
| AC5 | REQ-DASH-006     | added (new)                                                                                                                                                                     |
| AC6 | REQ-SETTINGS-006 | added (new)                                                                                                                                                                     |
| AC7 | REQ-WA-014       | added (new)                                                                                                                                                                     |
| AC8 | REQ-WA-015       | added (new)                                                                                                                                                                     |
| AC8 | REQ-WA-005       | updated (inbound router excludes verified staff numbers)                                                                                                                        |
| AC9 | none             | `@srs-deferred: operator task (submit the staff_alert template to Meta); no product behaviour; the template definition is covered by REQ-WA-014 and the template contract test` |

**Status:** CLEAN. The Stage 1 gap G2 (booking and refund sources do not exist yet; `markOrderPaid` is `OrderService.updatePaymentStatus`) was decided as amend (b) on 2026-11-16 and is recorded in the plan.

## Operator sign-off

I have reviewed the AC-to-SRS-item traces above and confirm:

- [x] Each AC has a defensible SRS item.
- [x] New SRS items have been edited from stubs to canonical Given/When/Then prose.
- [x] Stale items have been brought current.

**Reviewer:** William
**Date:** 2026-11-17
