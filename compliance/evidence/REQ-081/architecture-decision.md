---
req: REQ-081
generated_by: adr-author
generated_at: 2026-06-15T07:30:00Z
---

# Architecture decision - REQ-081

## Outcome

**No ADR needed** — existing-pattern UI/server-action enhancement using the existing category registry and dashboard component patterns.

## Detail

### Rationale

REQ-081 reuses `CategoryService` / configured category data, existing Next.js dashboard pages, and existing server-action patterns. It introduces no new runtime dependency, external service, database schema, queue/cache tier, or cross-cutting architecture pattern. The shared cascade component/helper, if added, is a local UI abstraction for repeated filtering controls.

### Signals examined

| Signal                                   | Match? | Note                                                                                  |
| ---------------------------------------- | ------ | ------------------------------------------------------------------------------------- |
| New third-party runtime dependency       | NO     | No dependency planned.                                                                |
| New external service                     | NO     | Existing Mongo-backed category/menu data only.                                        |
| New database/cache/queue tier            | NO     | No infrastructure change.                                                             |
| Schema-level data-model change           | NO     | No model migration or collection change.                                              |
| Pattern change spanning multiple domains | NO     | Repeated UI filter pattern across existing admin/order surfaces; no new architecture. |
| Risk classification HIGH/CRITICAL        | NO     | MEDIUM.                                                                               |

### Affected areas

- `app/actions/admin/express-actions.ts`
- `app/dashboard/orders/express/create-order/page.tsx`
- `components/features/admin/menu-items-client.tsx`
- `components/features/admin/menu-item-form.tsx`
- `components/features/admin/menu-item-edit-form.tsx`
- `components/features/admin/inventory-items-client.tsx`
- Shared cascade UI/helper if introduced.

## Operator sign-off

- [ ] The no-ADR verdict matches the final implementation diff.
- [ ] No architectural surprise landed during implementation.

**Reviewer:** pending
**Date:** 2026-06-15

## Refs

- Implementation plan: [`compliance/plans/REQ-081/implementation-plan.md`](../../plans/REQ-081/implementation-plan.md) section 3
- Sibling artefacts: [`srs-alignment.md`](./srs-alignment.md), [`risk-assessment.md`](./risk-assessment.md)
