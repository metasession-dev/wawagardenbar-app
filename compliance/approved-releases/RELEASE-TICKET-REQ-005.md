# Release Ticket: REQ-005 — Public API Tab Support for Orders

**Requirement ID:** REQ-005  
**Category:** Feature Enhancement / API  
**Priority:** High  
**Status:** TESTED — PENDING SIGN-OFF  
**Created:** 2026-03-05  
**Author:** AI (Cascade)

---

## Summary

Added optional tab support to the `POST /api/public/orders` endpoint. API consumers can now create orders that are automatically attached to dine-in tabs using one of three methods:

| Method | Field | Behavior |
|--------|-------|----------|
| Attach by ID | `tabId` | Attaches order to an existing tab by ObjectId |
| Create new | `useTab: "new"` | Creates a new tab for the table, attaches order (409 if table has open tab) |
| Find existing | `useTab: "existing"` | Finds the open tab for the table, attaches order (422 if no open tab) |

**Backward compatible** — all tab fields are optional. Existing API consumers are unaffected.

---

## Implementation Details

### Files Modified

| File | Change |
|------|--------|
| `app/api/public/orders/route.ts` | Added `TabService` import, `tabId`/`useTab`/`customerName` to `CreateOrderBody`, validation logic, tab branching, wrapped response shape, `@requirement REQ-005` header |
| `docs/operations/SOP-API-TAB-ORDER-MANAGEMENT.md` | Corrected all field names, added `tabId` attachment, updated payloads/examples/troubleshooting, bumped to v1.1 |
| `docs/api/AGENT-TOOLING-FLOWS.md` | Updated `create_order` OpenAI function schema, updated Flow 7 (Tab Lifecycle) |
| `docs/api/AGENT-TOOLING-GUIDE.md` | Updated `create_order` tool description in reference table |

### Files Created

| File | Purpose |
|------|---------|
| `vitest.config.ts` | Vitest test configuration |
| `__tests__/api/public/orders-tab-support.test.ts` | 26 unit tests for REQ-005 |
| `compliance/evidence/REQ-005/unit-test-results.txt` | Test execution output |

### New Optional Request Fields

```typescript
interface CreateOrderBody {
  // ... existing fields unchanged ...
  tabId?: string;                    // Attach to existing tab by ObjectId
  useTab?: 'new' | 'existing';      // Create or find tab by table number
  customerName?: string;             // Customer name for new tab creation
}
```

### Response Shape

**Without tab (unchanged):**
```json
{ "success": true, "data": { "_id": "...", "orderNumber": "WGB-...", "status": "pending", ... } }
```

**With tab (wrapped):**
```json
{ "success": true, "data": { "order": { ... }, "tab": { "tabNumber": "TAB-T5-...", "status": "open", ... } } }
```

### Validation Rules

| Rule | Error Code | Message |
|------|-----------|---------|
| Invalid `useTab` value | 400 | `useTab must be "new" or "existing"` |
| Tab fields on non-dine-in | 400 | `Tab support is only available for dine-in orders` |
| Missing `dineInDetails.tableNumber` with `useTab` | 400 | `dineInDetails.tableNumber is required when using useTab` |
| Table already has open tab (`useTab: "new"`) | 409 | `Table {X} already has an open tab` |
| No open tab found (`useTab: "existing"`) | 422 | `No open tab found for table {X}` |

---

## Test Results

### Unit Tests (Vitest)

| Suite | Tests | Passed | Failed |
|-------|-------|--------|--------|
| validateTabFields | 11 | 11 | 0 |
| determineTabBranch | 5 | 5 | 0 |
| resolveCustomerName | 5 | 5 | 0 |
| Response Shape | 2 | 2 | 0 |
| CreateOrderBody Interface | 3 | 3 | 0 |
| **Total** | **26** | **26** | **0** |

### TypeScript Compilation

- `npx tsc --noEmit`: **PASS** (exit code 0, 0 errors)

### Test Evidence Location

- Unit test output: `/compliance/evidence/REQ-005/unit-test-results.txt`
- Test source: `/__tests__/api/public/orders-tab-support.test.ts`

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Breaking existing API consumers | Very Low | High | All new fields optional, flat response unchanged |
| Tab creation race condition | Low | Medium | `getOpenTabForTable` check before `createTab` |
| Orphaned order on tab creation failure | Low | Low | Order created first, tab failure returns error with order still persisted |

---

## Rollback Plan

1. Revert `app/api/public/orders/route.ts` to remove `TabService` import and tab logic
2. Remove `tabId`, `useTab`, `customerName` from `CreateOrderBody` interface
3. Documentation changes are non-breaking and can remain

---

## 🛡️ Compliance & UAT Sign-off
*This section must be completed by a human reviewer before merging to Production.*

| Role | Name | Date | Status | Signature/Notes |
| :--- | :--- | :--- | :--- | :--- |
| **QA Lead** | William | 2026-03-05 | [x] PASS / [ ] FAIL | 26/26 unit tests verified, validation logic correct |
| **Product Owner** | William | 2026-03-05 | [x] PASS / [ ] FAIL | Feature meets requirements, backward compatible |
| **Security Review** | William | 2026-03-05 | [ ] N/A / [x] OK | Tab ops inherit existing API key auth + orders:write scope |

> **Audit Note:** This release was assisted by Windsurf Cascade (AI). All AI-generated logic has been verified against the Requirement Traceability Matrix (RTM). 26 unit tests confirm validation logic, branch selection, customer name resolution, response shape, and backward compatibility.
---
