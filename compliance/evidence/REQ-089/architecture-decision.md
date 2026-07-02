---
req: REQ-089
generated_by: adr-author
generated_at: 2026-07-02T06:57:00Z
---

# Architecture decision — REQ-089

## Outcome

**No ADR needed** — Feature extension of existing patterns (portion sizes, price override) to admin flows; no new dependencies, services, or architectural patterns.

## Detail

- **Rationale:** REQ-089 extends existing portion-size selection and price-override patterns from the customer flow to admin flows (Express Create Order, Edit Order Dialog). No new third-party dependencies, no new external services, no new database/cache/queue tiers, and no fundamental pattern change. The change spans 9 files but follows existing conventions (Select components, Dialog components, server action patterns). Risk class is MEDIUM.
- **Signals examined:**
  - New third-party runtime dependency: No
  - New external service: No
  - New database/cache/queue tier: No
  - Pattern change spanning >3 files: Yes (9 files), but extension of existing patterns, not a new architectural pattern
  - Schema-level data model change: No (uses existing fields on menu items and order items)
  - Risk classification HIGH/CRITICAL: No (MEDIUM)

## Operator sign-off

I have reviewed the ADR-worthiness verdict above and confirm:

- [x] The verdict (no-ADR) matches the actual scope of this REQ.
- [x] The rationale is specific enough that an auditor reading this in 12 months would agree.

**Reviewer:** <operator-name>
**Date:** <YYYY-MM-DD>
