# REQ-077 — Test plan

**Requirement ID:** REQ-077
**Risk:** MEDIUM
**Related issue:** [#364](https://github.com/metasession-dev/wawagardenbar-app/issues/364)
**Date:** 2026-06-10

## Acceptance criteria → tests

| AC  | Statement                                                                                                                                                                                                                                                                   | Test                                                                                                                                                                                              |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AC1 | Click row / chevron / Enter / Space toggles expansion; multiple rows expand simultaneously; `aria-expanded` mirrors state. (SRS REQ-INV-014)                                                                                                                                | `e2e/critical/incidents-expansion.spec.ts` — 3 cases (click toggle + chevron rotate; keyboard Space + Enter; multi-row)                                                                           |
| AC2 | Expanded panel shows full `errorDetails` JSON pretty-printed + `createdAt` / `updatedAt` in ISO + relative forms + `entityId` as clickable link to `/dashboard/orders/{id}`. (SRS REQ-INV-015)                                                                              | `e2e/critical/incidents-expansion.spec.ts` — AC2+AC3 case                                                                                                                                         |
| AC3 | For incidents whose `entityId` resolves to a valid Order, panel includes a snapshot block: order number, status, paymentStatus, paymentMethod, businessDate, items (name × qty × subtotal), total, tipAmount, inventoryDeducted, paidAt/completedAt. (SRS REQ-INV-015)      | `e2e/critical/incidents-expansion.spec.ts` — AC2+AC3 case; `__tests__/services/incident-event-service.list-with-linked-orders.test.ts` (3 cases pin the projection contract)                      |
| AC4 | For `inventory_deduction_failed` with `inventoryDeducted:false` the existing `<IncidentRetryButton>` is reachable inside the expansion (R-003 mitigation). For `stale_paid_order` the panel shows status-history chronologically. (SRS REQ-INV-013 trace + REQ-INV-016 new) | `e2e/critical/incidents-expansion.spec.ts` — AC4(R-003) retry-visible case + AC4(REQ-INV-016) status-history case                                                                                 |
| AC5 | Expanding a row triggers no `/api/incidents/*` network request (server-rendered + client-side toggle only).                                                                                                                                                                 | `e2e/critical/incidents-expansion.spec.ts` — AC5 case (page.on('request') filter)                                                                                                                 |
| AC6 | `#open=<id1>,<id2>` URL hash preserves expanded state across reload; segments regex-validated against `/^[a-f0-9]+$/`; malformed segments silently ignored, no XSS surface. (SRS REQ-INV-017, R-004 mitigation)                                                             | `e2e/critical/incidents-expansion.spec.ts` — AC6 round-trip case + AC6 (R-004) malformed-hash case; `__tests__/components/incident-row.hash-parse.test.ts` — 10 unit cases pin the regex contract |

## Surfaces / contracts under test

| Surface                                                | Source-of-truth                                                      | Pinned by                                                                                                     |
| ------------------------------------------------------ | -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `IncidentEventService.listWithLinkedOrders()`          | `services/incident-event-service.ts`                                 | unit (8 cases) — empty, kind-filter, dedup, projection, statusHistory shape, missing-Order null, pagination   |
| `<IncidentRow>` expansion + chevron + a11y             | `components/features/admin/incident-row.tsx`                         | E2E AC1 (3 cases)                                                                                             |
| `parseExpandedFromHash()` regex contract               | `components/features/admin/incident-row.tsx`                         | unit (10 cases) — empty / single ObjectId / multi / garbage discarded / cross-key isolation / trailing commas |
| `<IncidentDetailsPanel>` errorDetails + Order snapshot | `components/features/admin/incident-details-panel.tsx`               | E2E AC2+AC3 + AC4 (status-history)                                                                            |
| Retry button reused unchanged inside expansion (R-003) | `components/features/admin/incident-retry-button.tsx` (no change)    | E2E AC4(R-003)                                                                                                |
| URL-hash → server-rendered initial state               | `app/dashboard/incidents/page.tsx` + `<IncidentRow>` useEffect-mount | E2E AC6 round-trip                                                                                            |
| Malformed-hash silently ignored, no XSS (R-004)        | `parseExpandedFromHash()` regex + no `dangerouslySetInnerHTML`       | E2E AC6 (R-004) + unit (regex-rejects cases)                                                                  |

## Out of scope

- Retrying `retryInventoryDeductionAction` end-to-end inside the expansion → already covered by REQ-066 AC10 e2e elsewhere; this REQ pins the button's reachability, not the action's behaviour.
- New incident kinds (REQ-077 surfaces what's already captured).
- Bulk actions (mark-as-read, clear-all).
- Pagination beyond the existing 200-row cap.
