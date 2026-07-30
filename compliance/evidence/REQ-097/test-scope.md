# Test scope — REQ-097

Portion (half/quarter) pricing fix — Admin order management.

| AC  | Description                                                                                                   | Risk   | Verification method |
| --- | ------------------------------------------------------------------------------------------------------------- | ------ | ------------------- |
| AC1 | Portion picker Half Portion price = `round(basePrice × 0.5) + surcharge`                                      | HIGH   | Unit + E2E          |
| AC2 | Portion picker Quarter Portion price = `round(basePrice × 0.25) + surcharge`                                  | HIGH   | Unit + E2E          |
| AC3 | Persisted Express Create Order line price includes the portion surcharge                                      | HIGH   | Unit + E2E          |
| AC4 | Persisted Order Edit line price includes the portion surcharge                                                | HIGH   | Unit                |
| AC5 | Public checkout API (`/api/public/orders`) recomputed subtotal + persisted line include the portion surcharge | HIGH   | Unit                |
| AC6 | Portion surcharge still applies on top of an admin manual price override                                      | MEDIUM | Unit                |

Placeholder authored at Phase 1 plan time; extracted from `compliance/plans/REQ-097/implementation-plan.md` § Acceptance criteria.
