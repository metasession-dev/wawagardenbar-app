---
req: REQ-119
generated_by: requirements-aligner
generated_at: 2026-11-06T16:30:00Z
---

# SRS alignment — REQ-119

Status returned to `sdlc-implementer`: **CLEAN** (every AC traces to an SRS item; no stub placeholders remain in `docs/SRS.md`; no table/heading drift for the touched IDs).

## ACs traced

| AC  | SRS item                        | Action this cycle                                                                                   |
| --- | ------------------------------- | --------------------------------------------------------------------------------------------------- |
| AC1 | REQ-AUTHA-004, REQ-AUTHA-005    | REQ-AUTHA-004 updated (any-of over `roles[]`, new roles); REQ-AUTHA-005 added                       |
| AC2 | REQ-AUTHA-004                   | updated (no direct role comparison; guard test)                                                     |
| AC3 | REQ-AUTHA-006, REQ-SETTINGS-002 | REQ-AUTHA-006 added; REQ-SETTINGS-002 updated (admin management includes role editing)              |
| AC4 | REQ-AUTHA-007                   | added (migration, dry run, idempotent, deploy-order independent)                                    |
| AC5 | REQ-AUTHA-006, REQ-SETTINGS-002 | added (one `admin.roles-updated` audit row per change)                                              |
| AC6 | REQ-AUTHA-004                   | updated (customer and guest sessions rejected)                                                      |
| AC7 | REQ-AUTHA-005                   | added (union of role defaults plus per-user overrides; kitchen and manager defaults)                |
| AC8 | REQ-AUTHA-005                   | added (nav, `proxy.ts` gate and landing redirect any-of; kitchen-only lands on the kitchen display) |
| AC9 | REQ-AUTHA-007                   | added (public admins API accepts `role` or `roles`; pre-release sessions keep working)              |

## Notes

- **Prose provenance.** The prose for REQ-AUTHA-005 to REQ-AUTHA-007 was written by `sdlc-implementer` from the approved ACs at Stage 1 and was reviewed by the operator when the plan was approved (2026-11-06, `PROCEED`). It is final text, not a stub.
- **Behaviour added during Phase 2 that the SRS now reflects:** a kitchen-only member lands on the kitchen display; `/dashboard/forbidden` is reachable by every staff role; the customers-page single-role dialog delegates to the same service. None needed a new SRS item (all within REQ-AUTHA-004 to 006).
- **ID allocation.** Max existing `REQ-AUTHA` ID before this cycle was 004 in both the summary table and the headings; 005 to 007 are free of collisions. No table/heading drift found for `REQ-AUTHA-*` or `REQ-SETTINGS-*`.
- **Deferred:** none (`@srs-deferred` not used).

## Operator sign-off

I have reviewed the AC-to-SRS-item traces above and confirm:

- [ ] Each AC has a defensible SRS item.
- [ ] New SRS items have been edited from stubs to canonical Given/When/Then prose.
- [ ] Stale items have been brought current.

**Reviewer:** PENDING (operator)
**Date:** PENDING
