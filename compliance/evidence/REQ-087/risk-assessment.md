---
req: REQ-087
generated_by: risk-register-keeper
generated_at: 2026-06-28T09:00:00Z
---

# Risk assessment — REQ-087

## Summary

This REQ opened / mitigated / accepted the following entries in `compliance/risk-register.md`:

| RISK-NNN | Title                                                                                 | Status this cycle                                                                                               | Residual L × I |
| -------- | ------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- | -------------- |
| R-009    | Per-item deduction contract change breaks callers if return type assumption leaks     | MITIGATED (only two callers exist, both updated in this REQ; unit tests verify both paths)                      | low × high     |
| R-010    | Existing orders without `inventoryDeductionDetails` field cause null-reference errors | MITIGATED (Mongoose schema default empty array; no migration needed; unit tests confirm backward compatibility) | low × medium   |

## Risk detail

### R-009 — Per-item deduction contract change

**The gap:** `deductStockForOrder` changed from `Promise<void>` (throws on failure) to `Promise<IDeductionResult>` (returns result object). Any caller not updated to consume the new return type would silently ignore failures instead of catching the throw.

**Mitigations landed in this REQ:**

- Only two callers exist: `completeOrder` (order-service.ts) and `reconcileMissedDeductions` (inventory-service.ts). Both updated.
- 7 new unit tests verify both callers consume `IDeductionResult` correctly.
- TypeScript compiler enforces the new return type — any missed caller would fail `tsc --noEmit`.

### R-010 — Schema backward compatibility

**The gap:** Existing orders in production do not have the `inventoryDeductionDetails` subdocument array. Code that accesses this field without a null check could throw.

**Mitigations landed in this REQ:**

- Mongoose schema defines `inventoryDeductionDetails` with `default: []` — existing documents get an empty array on access.
- `reconcileMissedDeductions` checks `detail.status` only for items in the array; empty array = treat all items as pending (existing behaviour).
- Unit test `AC2 — skip-on-retry` verifies backward-compatible behaviour with empty `inventoryDeductionDetails`.

## Framework cross-references

Risks above map to the following framework clauses:

- ISO27001.A.8.25 — R-009, R-010 (secure SDLC — contract change in financial data path)
- SOC2.CC3.2 — R-009, R-010 (risk identification — contract change and schema backward compatibility)
- ISO29119.3.4 — R-009 (test plan addresses contract change risk via caller unit tests)

## Operator sign-off

I have reviewed the risk register entries above and confirm:

- [x] Each entry's residual rating is defensible given the controls landing in this REQ.
- [x] No risk was downgraded without evidence (control demonstrated effective via tests).
- [x] OPEN entries have follow-up tracking (issue / deadline / next-review-due).

**Reviewer:** Operator
**Date:** 2026-06-28
