# Test Scope — REQ-021

**Risk Level:** MEDIUM
**Requirement:** Crate/unit packaging for inventory items (drinks)
**GitHub Issue:** #44
**Date:** 2026-04-01

## Test Approach

Standard gates plus targeted verification.

**Universal gates (mandatory — verified locally AND in CI):**

- TypeScript compilation: 0 errors
- SAST scan: 0 high/critical findings
- Dependency audit: 0 high/critical vulnerabilities
- E2E suite: all pass
- Human code review via PR

**Additional testing required by risk level:**

- [ ] Data model: crateSize and packagingType fields persist correctly on create and update
- [ ] Form validation: crateSize must be positive integer when provided
- [ ] Restock display: crate breakdown shows correctly when crateSize is set
- [ ] Restock display: no crate info shown when crateSize is not set
- [ ] CSV export: crate info included in export when available
- [ ] Regression: existing inventory creation/edit without crate fields still works

## Validation Approach

- Create a new menu item with inventory tracking and crate size set
- Edit an existing inventory item to add crate size
- View restock recommendations and verify crate breakdown appears
- Export CSV and verify crate columns are present

## Acceptance Criteria

- [ ] `crateSize` (optional number) and `packagingType` (optional string) fields added to inventory model/interface
- [ ] Menu item creation form shows crate size and packaging type fields when trackInventory is enabled
- [ ] Menu item edit form shows crate size and packaging type fields
- [ ] Crate fields save correctly on create and update
- [ ] Restock recommendations table shows crate breakdown when crateSize is set (e.g. "3 crates (72)")
- [ ] Suggested reorder qty rounds up to nearest whole crate count
- [ ] Items without crateSize show reorder qty as before (no crate info)
- [ ] CSV export includes crate columns (Crate Size, Crates to Order)
- [ ] All existing inventory functionality unchanged
- [ ] All additional testing items above pass
