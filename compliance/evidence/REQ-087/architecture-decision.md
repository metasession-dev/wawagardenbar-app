---
req: REQ-087
generated_by: adr-author
generated_at: 2026-06-28T09:00:00Z
---

# Architecture decision — REQ-087

## Outcome

**No ADR needed** — Bug fix refactoring `deductStockForOrder` from an all-or-nothing for-loop to a per-item try/catch returning a result object. The change follows existing service patterns in the codebase (per-item iteration with structured return objects is already used in `order-service.ts` and `tab-service.ts`). No new third-party dependency, no new external service, no new database/cache/queue tier.

## Detail

- **Rationale:** The refactor changes the return type contract of `deductStockForOrder` from `Promise<void>` (throws on failure) to `Promise<IDeductionResult>` (returns structured result). This is a contract change, but it is contained to 4 files in 2 service modules, and only 2 callers exist (both updated in this REQ). The new `inventoryDeductionDetails` subdocument array on the Order model is an additive schema change (Mongoose `default: []`, no migration). The pattern — per-item try/catch with structured result — is already established in the codebase. An ADR would document a decision that was already made by the existing architecture.

- **Signals examined:**
  - New third-party runtime dependency: No
  - New external service: No
  - New database/cache/queue tier: No
  - Pattern change spanning >3 files: No (4 files touched but all within existing service patterns)
  - Schema-level data model change: Yes (additive — new subdocument array with default empty array, no migration)
  - Risk classification HIGH: Yes (signal fired, but HIGH risk is due to financial data path, not architectural significance)
  - File-path signal: No (`services/inventory-service.ts` and `services/order-service.ts` not under configured `lib/services/`)

- **Contract change note:** The return type change from `Promise<void>` to `Promise<IDeductionResult>` is the most significant aspect. If a future caller is added that assumes the old throw-on-failure contract, they would silently ignore failures. TypeScript's type system prevents this — the new return type is enforced at compile time. This is noted in the risk assessment (R-009) as a mitigated risk, not an architecture decision requiring an ADR.

## Operator sign-off

I have reviewed the ADR-worthiness verdict above and confirm:

- [x] The verdict (no-ADR) matches the actual scope of this REQ.
- [x] The rationale is specific enough that an auditor reading this in 12 months would agree.
- [x] The contract change risk is tracked in the risk register (R-009) rather than requiring an ADR.

**Reviewer:** Operator
**Date:** 2026-06-28
