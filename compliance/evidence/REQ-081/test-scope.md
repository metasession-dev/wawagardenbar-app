# Test Scope - REQ-081

**Risk Level:** MEDIUM
**Requirement:** Use Main Menu Category before Sub Category and item selection in express order, menu management, and sellable inventory management.
**GitHub Issue:** [#387](https://github.com/metasession-dev/wawagardenbar-app/issues/387)
**Date:** 2026-06-15

## Test Approach

REQ-081 is a user-facing workflow change across order entry and admin management surfaces. Testing must prove the cascade order, backward navigation, state preservation, source-of-truth category data, and no-permission-change posture.

## In Scope

- Express create-order category cascade: main category first, then sub-category, then matching available sellable items.
- Express, menu-management, and sellable-inventory contextual search while preserving the main-category -> sub-category browsing flow.
- Express cart/order context preservation while navigating back to sub-category and main-category steps.
- Cross-main item addition in one express cart.
- Express server action filtering on both `mainCategory` and `category` while keeping `kind:'menu-item'` and `isAvailable` constraints.
- Menu management list cascade and create/edit invalid sub-category clearing.
- Sellable inventory list cascade for linked menu items.
- Empty states for main category without enabled sub-categories and sub-category without available items.

## Out of Scope

- Category registry CRUD (REQ-075).
- Public customer menu redesign.
- Kitchen ingredient COGS category taxonomy.
- Inventory deduction, production, stock-movement, payment, tab, or reporting calculations.
- Permission/RBAC changes.

## Acceptance Criteria

- [ ] AC1: Given staff opens express create order, when the item picker first renders, then Main Menu Categories are shown first and sub-categories/items are not shown yet.
- [ ] AC2: Given a main category is selected, when the sub-category step renders, then only sub-categories for that main category are displayed.
- [ ] AC3: Given main and sub-category are selected, when item results render/search runs, then only available sellable items matching both selections appear and search remains enabled.
- [ ] AC4: Given express cart lines already exist, when staff navigates back to sub-category/main-category and adds an item from another main, then the existing cart remains intact.
- [ ] AC5: Given quick/express menu item selection uses the express search path, when it opens, then the same cascade and registry data are used.
- [ ] AC6: Given a super-admin opens menu management, when filters render, then main categories precede sub-categories, search remains enabled, and the table filters by both selections plus search text.
- [ ] AC7: Given menu create/edit has a selected sub-category, when main category changes to an incompatible main, then the stale sub-category value is cleared before save.
- [ ] AC8: Given admin opens sellable inventory, when filters render, then main categories precede sub-categories, search remains enabled, and linked inventory rows filter by both selections plus search text.
- [ ] AC9: Given no sub-categories or no items exist for a selected step, when the user reaches it, then a clear empty state is shown.
- [ ] AC10: Given permissions and registry settings exist, when the cascade is used, then permissions remain unchanged and category choices come from the configured registry/source of truth.

## Risk-Based Depth

MEDIUM risk because this touches staff order-entry and admin management surfaces but does not change auth, payment, stock deduction, persistence schema, or personal-data processing. Required evidence: focused unit/integration tests plus GitHub Actions E2E/Quality Gates for authoritative verification.
