---
req: REQ-121
generated_by: requirements-aligner
generated_at: 2026-11-17T12:00:00Z
---

# SRS alignment — REQ-121

## ACs traced

| AC  | SRS item         | Action this cycle                                        |
| --- | ---------------- | -------------------------------------------------------- |
| AC1 | REQ-CHECKOUT-014 | added (new)                                              |
| AC1 | REQ-CHECKOUT-001 | updated (was multi-step form)                            |
| AC2 | REQ-CHECKOUT-015 | added (new)                                              |
| AC3 | REQ-CHECKOUT-016 | added (new)                                              |
| AC3 | REQ-CHECKOUT-002 | updated (order-type fields, tab lock text removed)       |
| AC3 | REQ-CHECKOUT-003 | unchanged (fee only displayed)                           |
| AC4 | REQ-CHECKOUT-006 | updated (inline customer tip, no tip method)             |
| AC5 | REQ-CHECKOUT-017 | added (new)                                              |
| AC6 | REQ-CHECKOUT-018 | added (new)                                              |
| AC6 | REQ-CHECKOUT-012 | unchanged (typed errors come from `createCustomerOrder`) |

**Drift noted:** REQ-CHECKOUT-010 (Monnify-only payment) is stale after this REQ; filed as #1045. **Table/heading drift:** none found for the `REQ-CHECKOUT`, `REQ-DASH`, `REQ-AUTHA`, `REQ-SETTINGS`, `REQ-WA` prefixes.

## Operator sign-off

I have reviewed the AC-to-SRS-item traces above and confirm:

- [x] Each AC has a defensible SRS item.
- [x] New SRS items have been edited from stubs to canonical Given/When/Then prose.
- [x] Stale items have been brought current.

**Reviewer:** William
**Date:** 2026-11-17
