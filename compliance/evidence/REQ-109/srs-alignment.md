---
req: REQ-109
generated_by: requirements-aligner
generated_at: 2026-09-30T02:50:00Z
---

# SRS alignment — REQ-109

## ACs traced

| AC                               | SRS item                         | Action this cycle                                                                                                         |
| -------------------------------- | -------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| AC1                              | REQ-ORDMGT-010                   | updated (drift — Quick Actions removed; behaviour text now staff-role-agnostic)                                           |
| AC2                              | REQ-ORDMGT-010                   | updated (drift — same item, csr visibility)                                                                               |
| AC3                              | REQ-TABMGT-010                   | added (new)                                                                                                               |
| AC4                              | REQ-ORDMGT-018                   | added (new)                                                                                                               |
| AC5                              | REQ-TABMGT-010                   | added (new)                                                                                                               |
| AC6 (order part — cancel/delete) | REQ-ORDMGT-018                   | added (new)                                                                                                               |
| AC6 (write-off part)             | REQ-TABMGT-007                   | updated (drift — item's own AC previously said non-admin/super-admin staff are refused write-off; rewritten to admit csr) |
| AC7                              | REQ-TABMGT-004                   | unchanged (confirms existing super-admin-only override AC still holds)                                                    |
| AC8                              | REQ-ORDER-002 / REQ-CHECKOUT-007 | unchanged (customer checkout flow untouched)                                                                              |

All items verified present in `docs/SRS.md` on `develop` post-merge (commit `22ad1e0`), with full canonical Given/When/Then prose — no stub placeholders remain.

## Operator sign-off

I have reviewed the AC-to-SRS-item traces above and confirm:

- [x] Each AC has a defensible SRS item.
- [x] New SRS items (REQ-ORDMGT-018, REQ-TABMGT-010) have been written as full canonical Given/When/Then prose, not stubs.
- [x] Stale items (REQ-ORDMGT-010, REQ-TABMGT-007) have been brought current.

**Reviewer:** sdlc-implementer (agent) — operator sign-off pending final review
**Date:** 2026-09-30
