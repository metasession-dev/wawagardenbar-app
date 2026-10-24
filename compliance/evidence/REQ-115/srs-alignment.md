---
req: REQ-115
generated_by: requirements-aligner
generated_at: 2026-10-24T16:41:34Z
---

# SRS alignment — REQ-115

## ACs traced

| AC               | SRS item                | Action this cycle                                                                                                              |
| ---------------- | ----------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| AC1, AC4         | REQ-WA-005              | updated: welcome parameters, `actionTaken` outcome semantics, canonical-phone matching and `phone_mismatch` added to Behaviour |
| AC2              | REQ-WA-003              | unchanged (trace-only); parameter shape is defined in `docs/whatsapp-templates.md` §7                                          |
| AC3, AC6, AC11   | REQ-WA-002              | unchanged (trace-only)                                                                                                         |
| AC5              | REQ-WA-008              | **new**: canonical E.164 phone format and the no-merge migration                                                               |
| AC7, AC8, AC16   | REQ-WA-001              | unchanged (infrastructure and error mapping; behaviour unchanged)                                                              |
| AC9              | REQ-WA-005 / REQ-WA-007 | updated (the SRS and RTM edits themselves)                                                                                     |
| AC14             | REQ-WA-007              | unchanged (live evidence only)                                                                                                 |
| AC15             | REQ-AUTHC-001           | updated: said "4-digit PIN"; now 6-digit from a secure RNG, plus the invalid-length case                                       |
| AC10, AC12, AC13 | n/a                     | `@srs-deferred`: test infrastructure, housekeeping and operator evidence, no product behaviour                                 |

Table/heading drift check: none found for REQ-WA-_ or REQ-AUTHC-_. REQ-WA-008 was added to both the summary table and a heading block.

**Gap status:** CLEAN.

## Operator sign-off

I have reviewed the AC-to-SRS-item traces above and confirm:

- [ ] Each AC has a defensible SRS item.
- [ ] New SRS items have been edited from stubs to canonical Given/When/Then prose (REQ-WA-008 was drafted in full; please review the wording).
- [ ] Stale items have been brought current.

**Reviewer:** REPLACE — operator name
**Date:** REPLACE — YYYY-MM-DD
