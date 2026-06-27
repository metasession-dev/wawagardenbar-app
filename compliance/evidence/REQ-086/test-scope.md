# Test Scope — REQ-086

**Risk Level:** LOW
**Requirement:** Rename "Express Actions" to "Admin Order Management" and move Inventory Summary card
**GitHub Issue:** #417
**Date:** 2026-06-27

## Test Approach

Standard gates apply. No additional testing beyond universal exit criteria.

- TypeScript compilation: 0 errors
- SAST scan: 0 high/critical findings
- Dependency audit: 0 high/critical vulnerabilities
- E2E suite: all pass
- CI independent verification: all PR checks pass
- Human code review via PR

## Acceptance Criteria

- [x] AC1 — Given an admin views `/dashboard/orders`, When the page loads, Then the section formerly labeled "Express Actions" reads "Admin Order Management".
- [x] AC2 — Given the "Admin Order Management" section, When it renders, Then Inventory Summary appears alongside Create Tab, Create Order, and Close Tab (4 cards).
- [x] AC3 — Given the "Quick Actions" section, When it renders, Then it contains only: Open a Order, Open a New Tab, Add to Existing Tab (3 cards).
- [x] AC4 — Given desktop viewport, When the sections render, Then "Admin Order Management" uses a 4-column grid and "Quick Actions" uses a 3-column grid.
- [x] AC5 — Given the "Admin Order Management" heading, When rendered, Then a neutral icon (ClipboardList) is used instead of Zap.
- [x] AC6 — Given the existing E2E test, When it runs, Then it verifies the "Admin Order Management" heading and Quick Actions content correctly.
- [x] AC7 — Given the SOP manual, When updated, Then all "Express Actions" references are replaced with "Admin Order Management" and Inventory Summary is described under the new section.
