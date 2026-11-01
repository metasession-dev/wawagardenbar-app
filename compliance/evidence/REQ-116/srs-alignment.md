---
req: REQ-116
generated_by: requirements-aligner
generated_at: 2026-11-01T11:00:00Z
---

# SRS alignment — REQ-116

## ACs traced

| AC                           | SRS item               | Action this cycle                                                                                         |
| ---------------------------- | ---------------------- | --------------------------------------------------------------------------------------------------------- |
| AC1, AC2, AC3                | REQ-WA-009             | **new**: webhook authenticity (fail closed, length-checked HMAC over the raw body, no secrets in logs)    |
| AC4, AC5, AC7, AC8           | REQ-WA-005             | updated: dedup-first on `wamid`, all `entry[]`/`changes[]`, per-phone limit, outbound retry then incident |
| AC6                          | REQ-WA-010, REQ-WA-006 | **new** REQ-WA-010 (START, marketing-only STOP); REQ-WA-006 updated: STOP and START change marketing only |
| AC9, AC10                    | REQ-WA-001             | updated: the PIN is in the body and the Copy-code button parameter (Meta #131008)                         |
| AC11, AC12, AC13, AC14, AC15 | n/a                    | `@srs-deferred`: test infrastructure and regression-pack fixes, no product behaviour                      |

Table/heading drift check: none found for REQ-WA-\*. REQ-WA-009 and REQ-WA-010 were added to both the summary table and a heading block.

**Gap status:** CLEAN.

## Operator sign-off

I have reviewed the AC-to-SRS-item traces above and confirm:

- [ ] Each AC has a defensible SRS item.
- [ ] New SRS items have been edited from stubs to canonical Given/When/Then prose (REQ-WA-009 and REQ-WA-010 were drafted in full; please review the wording).
- [ ] Stale items have been brought current.

**Reviewer:** REPLACE — operator name
**Date:** REPLACE — YYYY-MM-DD
