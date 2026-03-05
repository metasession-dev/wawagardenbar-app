# Release Ticket: REQ-006

## Tab Lookup by tabNumber, Item Name Lookup, SOP Enhancement

**Requirement ID:** REQ-006  
**Priority:** High  
**Category:** Feature Enhancement / API / Documentation  
**Date:** 2026-03-05  
**Status:** TESTED - PENDING SIGN-OFF

---

## Summary

This release enhances the public API and SOP documentation with three capabilities:

1. **Menu item name lookup** — Documents use of `GET /api/public/menu?q=<name>` to resolve human-readable item names to `menuItemId` for order creation.
2. **Tab lookup by table number or tab number** — Added `tabNumber` query param filter to `GET /api/public/tabs` and documented both `tableNumber` and `tabNumber` lookup patterns.
3. **SOP v1.2 update** — Added Prerequisite A (item name lookup), Prerequisite B (tab lookup), and rewrote the Complete Workflow Example with `lookupMenuItem`, `findTab`, and `handleOrderByTabNumber` helpers.

---

## Implementation Details

### Files Changed

| File | Change Type | Description |
|------|------------|-------------|
| `app/api/public/tabs/route.ts` | Modified | Added `tabNumber` query param filter to GET handler; added `@requirement REQ-006` JSDoc |
| `docs/operations/SOP-API-TAB-ORDER-MANAGEMENT.md` | Modified | Added Prerequisite A & B sections, updated scopes list, rewrote Complete Workflow Example, bumped to v1.2 |
| `__tests__/api/public/tabs-filter-support.test.ts` | Created | 27 unit tests covering filter building, sort resolution, and menu item name resolution |

### API Changes

| Endpoint | Change |
|----------|--------|
| `GET /api/public/tabs` | New query param: `tabNumber` — filters tabs by human-readable tab number (e.g. `TAB-5-123456`) |

### Backward Compatibility

- **Fully backward compatible** — the `tabNumber` filter is optional; existing queries are unaffected
- No schema changes, no new endpoints, no breaking changes
- Existing SOP sections (Part 1, Part 2, Part 3) remain intact

---

## Test Results

### Unit Tests (Vitest)

- **Test File:** `__tests__/api/public/tabs-filter-support.test.ts`
- **Total Tests:** 27
- **Passed:** 27
- **Failed:** 0
- **Duration:** <1s

### Test Suites

| Suite | Tests | Status |
|-------|-------|--------|
| Tab Filter Building — tabNumber support | 4 | ✅ Pass |
| Tab Filter Building — tableNumber support | 2 | ✅ Pass |
| Tab Filter Building — status validation | 5 | ✅ Pass |
| Tab Filter Building — combined filters | 6 | ✅ Pass |
| Tab Sort Resolution | 4 | ✅ Pass |
| Menu Item Name Resolution | 6 | ✅ Pass |

### Full Suite (including REQ-005)

- **Total Tests:** 53 (26 REQ-005 + 27 REQ-006)
- **All Passed:** ✅

### TypeScript Compilation

- `npx tsc --noEmit` — **0 errors**

### Evidence Location

- `/compliance/evidence/REQ-006/unit-test-results.txt`

---

## Risk Assessment

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| tabNumber filter returns no results for invalid format | Low | Low | Client-side validation of tab number format |
| Menu search returns wrong item for ambiguous names | Medium | Low | SOP recommends checking `isAvailable` and `stockStatus` before use |
| SOP documentation drift from code | Low | Low | Version-tracked in revision history |

---

## Rollback Plan

1. Remove `tabNumber` filter lines from `app/api/public/tabs/route.ts` (2 lines)
2. Revert SOP to v1.1 via git
3. No database changes to roll back

---

## 🛡️ Compliance & UAT Sign-off

*This section must be completed by a human reviewer before merging to Production.*

| Role | Name | Date | Status | Signature/Notes |
| :--- | :--- | :--- | :--- | :--- |
| **QA Lead** | [Name] | [YYYY-MM-DD] | [ ] PASS / [ ] FAIL | |
| **Product Owner** | [Name] | [YYYY-MM-DD] | [ ] PASS / [ ] FAIL | |
| **Security Review** | [Name] | [YYYY-MM-DD] | [ ] N/A / [ ] OK | |

> **Audit Note:** This release was assisted by Windsurf Cascade (AI). All AI-generated logic has been verified against the Requirement Traceability Matrix (RTM). The code change is minimal (2 lines of filter logic) with comprehensive test coverage (27 tests).

---
