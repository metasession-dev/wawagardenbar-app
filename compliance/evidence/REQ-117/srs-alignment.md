---
req: REQ-117
generated_by: requirements-aligner
generated_at: 2026-11-05T12:00:00Z
---

# SRS alignment — REQ-117

## ACs traced

| AC             | SRS item                     | Action this cycle                                                                                                                    |
| -------------- | ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| AC1, AC4       | REQ-AUTHC-001                | updated: WhatsApp only, no method step, 90-day customer session                                                                      |
| AC1            | REQ-AUTHC-003                | updated: guest checkout deprecated for customers                                                                                     |
| AC2, AC3       | REQ-AUTHC-004                | **new**: consent display and terminal not-on-WhatsApp message                                                                        |
| AC5, AC6       | REQ-AUTHC-002, REQ-AUTHC-005 | REQ-AUTHC-002 updated (5 attempts, keyed hash); **new** REQ-AUTHC-005: hashed PIN, attempt and request limits, unverified-user purge |
| AC7, AC8, AC10 | REQ-AUTHC-006                | **new**: customer session lifetime, legacy re-verification, inbound never mints a session                                            |
| AC9            | REQ-AUTHC-007                | **new**: WhatsApp-unavailable notice and incident                                                                                    |

Source-of-truth paths for REQ-AUTHC-001 and REQ-AUTHC-002 now point at `verify-whatsapp-pin.ts` (the old `verify-pin.ts` was deleted). The AC8 behaviour as built differs slightly from the plan text; see the deviation in the plan (legacy accounts are found by phone and reused; wrong-phone email-only accounts go through REQ-111 recovery).

Table/heading drift check: none found for REQ-AUTHC-\*. REQ-AUTHC-004 to REQ-AUTHC-007 are in both the summary table and a heading block.

**Gap status:** CLEAN.

## Operator sign-off

I have reviewed the traces above and confirm:

- [x] Each AC has a defensible SRS item.
- [x] New SRS items have been edited from stubs to canonical Given/When/Then prose.
- [x] Stale items have been brought current.

**Reviewer:** William Thompson
**Date:** 2026-11-05
