---
req: REQ-081
generated_by: risk-register-keeper
generated_at: 2026-06-15T07:30:00Z
---

# Risk assessment - REQ-081

## Summary

This REQ opens the following entry in [`compliance/risk-register.md`](../../risk-register.md):

| RISK-NNN | Title                                                                         | Status this cycle                                   | Residual L x I |
| -------- | ----------------------------------------------------------------------------- | --------------------------------------------------- | -------------- |
| R-005    | Category cascade hides valid sellable items or disrupts express order context | OPEN (opened this REQ; mitigations planned/applied) | low x medium   |

## Mitigations planned/applied (this REQ)

### R-005 - Category cascade hides valid sellable items or disrupts express order context

1. Category options derive from `CategoryService` / configured registry data instead of hardcoded lists.
2. Express search keeps explicit server filters for `kind:'menu-item'`, `isAvailable`, `mainCategory`, and `category`.
3. Navigation state is separated from selected cart/task state; changing main clears stale downstream selections only.
4. Empty states distinguish "no sub-categories" from "no available items".
5. Automated coverage pins express cascade, backward navigation, cross-main cart preservation, and at least one admin management surface.

## Risks examined and `@risk-deferred`

| Threat                                    | Rationale for `@risk-deferred`                                                                       |
| ----------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| Unauthorised access to dashboard surfaces | Existing auth/RBAC gates are unchanged; no new route or permission is introduced.                    |
| Personal-data exposure                    | No additional customer/admin personal fields are read or displayed.                                  |
| Kitchen ingredient category regression    | Kitchen COGS taxonomy is explicitly out of scope and remains separate from sellable menu categories. |

## Framework cross-references

| Clause                                           | RISK-NNN coverage                                  |
| ------------------------------------------------ | -------------------------------------------------- |
| ISO 27001 A.8.25 - Secure development life cycle | R-005 operational regression risk and mitigations. |
| SOC 2 CC8.1 - Change management                  | R-005 release/UAT controls.                        |

## Operator sign-off

- [ ] Residual rating is defensible given the implemented controls.
- [ ] Automated tests and CI evidence demonstrate the controls.
- [ ] No risk was downgraded without evidence.

**Reviewer:** pending
**Date:** 2026-06-15

## Refs

- Canonical risk-register entry: [`compliance/risk-register.md`](../../risk-register.md) — R-005
- Implementation plan: [`compliance/plans/REQ-081/implementation-plan.md`](../../plans/REQ-081/implementation-plan.md) section 4
- Sibling artefacts: [`srs-alignment.md`](./srs-alignment.md), [`architecture-decision.md`](./architecture-decision.md)
