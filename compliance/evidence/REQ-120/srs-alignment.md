---
req: REQ-120
generated_by: requirements-aligner
generated_at: 2026-11-10T22:10:00Z
---

# SRS alignment — REQ-120

## ACs traced

| AC  | SRS item                                       | Action this cycle                                 |
| --- | ---------------------------------------------- | ------------------------------------------------- |
| AC1 | REQ-CHECKOUT-012                               | added (new): single customer order service        |
| AC1 | REQ-CHECKOUT-007                               | updated: create is a wrapper over the service     |
| AC2 | REQ-CHECKOUT-012                               | added (validation, typed errors, server totals)   |
| AC3 | REQ-CHECKOUT-008                               | updated: service-level idempotency, key required  |
| AC4 | REQ-CHECKOUT-012                               | added (single order-number format)                |
| AC5 | REQ-ORDMGT-019                                 | added (new): `origin`/`channel` and migration     |
| AC6 | REQ-TABMGT-011                                 | added (new): tabs are staff-only                  |
| AC6 | REQ-CHECKOUT-005, REQ-ORDER-003, REQ-ORDER-004 | retired: customer tab options and pages removed   |
| AC7 | REQ-CHECKOUT-013                               | added (new): ordering options                     |
| AC8 | REQ-API-007                                    | added (new): customer-scoped keys bound to a user |

**Gap status:** CLEAN. Every AC traces to an SRS item; no `@srs-stub` or `<TODO>` marker remains in `docs/SRS.md`; no table/heading drift was found for the five touched areas. The prose for the five new items was drafted by the agent from the approved plan and is for the operator to confirm at sign-off.

## Operator sign-off

I have reviewed the AC-to-SRS-item traces above and confirm:

- [x] Each AC has a defensible SRS item.
- [x] New SRS items have been edited from stubs to canonical Given/When/Then prose.
- [x] Stale items have been brought current.

**Reviewer:** metasession-dev (Metassession Dev)
**Date:** 2026-11-10

_Approved by metasession-dev (Metassession Dev) in the Claude Code session on 2026-11-10; recorded by the agent from the operator's explicit reply._
