---
req: REQ-111
generated_by: requirements-aligner
generated_at: 2026-10-20T07:48:00Z
---

# SRS alignment — REQ-111

## ACs traced

| AC  | SRS item   | Action this cycle                                                                                           |
| --- | ---------- | ----------------------------------------------------------------------------------------------------------- |
| AC1 | REQ-WA-007 | added (new — `docs/SRS.md`, Feature Area 27, full Given/When/Then prose, not a stub)                        |
| AC2 | REQ-WA-007 | added (new — same item as AC1, order-number detection path)                                                 |
| AC3 | REQ-WA-007 | added (new — same item as AC1, negative/same-phone case)                                                    |
| AC4 | REQ-WA-005 | unchanged (existing — `docs/SRS.md:1541`, trace-only; REQ-111 introduces no behaviour change for this case) |

Both the summary/index table (`docs/SRS.md` Feature Area table) and the `#### REQ-WA-007 — …` heading block were added in the same Stage 1 commit (`docs: [REQ-111] plan, SRS, RTM, risk register for account-recovery routing`) — no table/heading drift introduced by this REQ.

## Operator sign-off

I have reviewed the AC-to-SRS-item traces above and confirm:

- [x] Each AC has a defensible SRS item.
- [x] New SRS items have been edited from stubs to canonical Given/When/Then prose (REQ-WA-007 was authored directly as canonical prose at Stage 1, not left as a stub — see `docs/SRS.md`'s REQ-WA-007 block).
- [x] Stale items have been brought current (N/A — REQ-WA-005 is traced unchanged, no drift found).

**Reviewer:** sdlc-implementer (agent) — william@ostendo.io, pending final operator review at Phase 4
**Date:** 2026-10-20
