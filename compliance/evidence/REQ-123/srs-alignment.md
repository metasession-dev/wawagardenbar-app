---
req: REQ-123
generated_by: requirements-aligner
generated_at: 2026-11-19T00:00:00Z
---

# SRS alignment — REQ-123

## ACs traced

| AC  | SRS item                        | Action this cycle                                                           |
| --- | ------------------------------- | --------------------------------------------------------------------------- |
| AC1 | REQ-PAY-005, REQ-CHECKOUT-010   | added (new) / updated ("Monnify-only" became Paystack-only)                 |
| AC2 | REQ-PAY-006                     | added (new)                                                                 |
| AC3 | REQ-PAY-007, REQ-PAY-003        | added (new) / updated (raw-body note)                                       |
| AC4 | REQ-PAY-008                     | added (new)                                                                 |
| AC5 | REQ-KITCHEN-009, REQ-ORDMGT-001 | added (new) / updated (Awaiting payment view)                               |
| AC6 | REQ-PAY-009                     | added (new)                                                                 |
| AC7 | REQ-PAY-010                     | added (new)                                                                 |
| AC8 | REQ-WA-002                      | updated (the three templates, held until approved)                          |
| AC9 | `@srs-deferred`                 | evidence of a Paystack account capability, no product behaviour (for WA-11) |

Gap status: CLEAN. No table/heading drift found for PAY, KITCHEN or WA.

## Operator sign-off

I have reviewed the AC-to-SRS-item traces above and confirm:

- [ ] Each AC has a defensible SRS item.
- [ ] New SRS items have been edited from stubs to canonical Given/When/Then prose.
- [ ] Stale items have been brought current.

**Reviewer:** <operator-name>
**Date:** <YYYY-MM-DD>
