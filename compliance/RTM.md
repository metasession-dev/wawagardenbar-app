# Requirements Traceability Matrix (RTM)

**Project:** Wawa Garden Bar Web Application
**Standard:** ISO/IEC/IEEE 29119-3:2021 (Test Documentation)
**Document Version:** 2.0
**Date:** 2026-03-07
**Classification:** Internal
**Retention Period:** Permanent
**Review Frequency:** Quarterly

---

## Document Control

| Field        | Value                         |
| ------------ | ----------------------------- |
| Document ID  | RTM-WGBA-002                  |
| Version      | 2.0                           |
| Status       | Active                        |
| Author       | Development & Compliance Team |
| Date Created | 2026-03-04                    |
| Last Updated | 2026-03-20                    |

### Approval Sign-Off

| Role               | Name                   | Signature              | Date                   |
| ------------------ | ---------------------- | ---------------------- | ---------------------- |
| Project Owner      | William                | **\*\***\_\_\_**\*\*** | \_**\_/\_\_**/\_\_\_\_ |
| QA Lead            | **\*\***\_\_\_**\*\*** | **\*\***\_\_\_**\*\*** | \_**\_/\_\_**/\_\_\_\_ |
| Compliance Officer | **\*\***\_\_\_**\*\*** | **\*\***\_\_\_**\*\*** | \_**\_/\_\_**/\_\_\_\_ |

### Revision History

| Version | Date       | Author       | Changes                                                                                                                                      |
| ------- | ---------- | ------------ | -------------------------------------------------------------------------------------------------------------------------------------------- |
| 1.0     | 2026-03-04 | AI (Cascade) | Initial RTM with REQ-001 through REQ-005                                                                                                     |
| 1.1     | 2026-03-05 | AI (Cascade) | Added REQ-006                                                                                                                                |
| 1.2     | 2026-03-06 | AI (Cascade) | Added REQ-007, E2E test evidence                                                                                                             |
| 1.4     | 2026-03-06 | AI (Cascade) | Updated traceability matrix                                                                                                                  |
| 2.0     | 2026-03-07 | AI (Cascade) | Full rewrite: ISO/IEC/IEEE 29119-3 alignment, forward traceability (Part A), change request traceability (Part B), coverage summary (Part C) |
| 2.1     | 2026-03-13 | AI (Cascade) | Added REQ-008 (Customer SOPs — Manual + Agentic)                                                                                             |
| 2.2     | 2026-03-20 | William      | Approved REQ-001, REQ-002, REQ-003, REQ-004, REQ-007, REQ-008 — all requirements now APPROVED - DEPLOYED                                     |

---

## Purpose

This Requirements Traceability Matrix provides bidirectional traceability between the requirements documented in `docs/REQUIREMENTS.md` (27 sections), the E2E test cases that verify them, and the change requests (REQ-001 through REQ-007) that track implementation work. It ensures compliance with SOC 2, ISO 27001, and regulatory audit requirements.

---

## Related Documents

| Document                   | Location                            | Description                                         |
| -------------------------- | ----------------------------------- | --------------------------------------------------- |
| Test Plan                  | `compliance/test-plan.md`           | Test strategy, risk assessment, entry/exit criteria |
| Test Case Specifications   | `compliance/test-cases.md`          | 181 formal test case specifications                 |
| Test Summary Report        | `compliance/test-summary-report.md` | Execution results, defect log, residual risk        |
| Comprehensive Requirements | `docs/REQUIREMENTS.md`              | 27-section requirements document                    |
| E2E Test Guide             | `docs/E2E-TEST-GUIDE.md`            | Setup, run, and troubleshooting guide               |

---

## Status Definitions

| Status                      | Description                                 |
| --------------------------- | ------------------------------------------- |
| `DRAFT`                     | Requirement defined but not yet implemented |
| `IN PROGRESS`               | Active development underway                 |
| `IMPLEMENTED`               | Code complete, awaiting testing             |
| `TESTED - PENDING SIGN-OFF` | All tests passed, awaiting human approval   |
| `APPROVED - DEPLOYED`       | Human-approved and deployed to production   |
| `DEPRECATED`                | No longer applicable or superseded          |

---

## Test Artefact References

| Artefact                | Location                                | Description                                                                |
| ----------------------- | --------------------------------------- | -------------------------------------------------------------------------- |
| Requirements Document   | `docs/REQUIREMENTS.md`                  | 27-section comprehensive requirements (v1.0)                               |
| E2E Test Suite (Public) | `e2e/requirements-verification.spec.ts` | 142 Playwright tests covering public/unauthenticated scenarios             |
| E2E Test Suite (Auth)   | `e2e/authenticated.spec.ts`             | 39 Playwright tests covering admin and super-admin authenticated scenarios |
| Test Results            | `test-results/`                         | Playwright HTML reports and screenshots                                    |
| Evidence Archive        | `compliance/evidence/`                  | Per-requirement evidence bundles                                           |

---

## Part A: Requirements to Test Cases (Forward Traceability)

This section maps every section in `docs/REQUIREMENTS.md` to the specific test cases that verify it. Test Case IDs use the format `TC-SECT##-###` where `SECT##` is the zero-padded requirement section number and `###` is a sequential test number.

### Section 1 / 5.1: Home Page

| Test Case ID | Test Name                                                     | Spec File                         | Type |
| ------------ | ------------------------------------------------------------- | --------------------------------- | ---- |
| TC-SEC01-001 | renders home page with branding, logo, and CTA                | requirements-verification.spec.ts | E2E  |
| TC-SEC01-002 | displays order type feature cards (Dine In, Pickup, Delivery) | requirements-verification.spec.ts | E2E  |
| TC-SEC01-003 | displays "How It Works" section with descriptions             | requirements-verification.spec.ts | E2E  |
| TC-SEC01-004 | is responsive -- renders correctly on mobile viewport         | requirements-verification.spec.ts | E2E  |
| TC-SEC01-005 | is responsive -- renders correctly on tablet viewport         | requirements-verification.spec.ts | E2E  |

| Req Section | Requirement                                                 | Test Case IDs                | Test Count | Pass Rate | Evidence                              |
| ----------- | ----------------------------------------------------------- | ---------------------------- | ---------- | --------- | ------------------------------------- |
| 1 / 5.1     | Home Page -- branding, logo, CTA, feature cards, responsive | TC-SEC01-001 to TC-SEC01-005 | 5          | 100%      | e2e/requirements-verification.spec.ts |

---

### Section 2: Technical Stack

| Test Case ID | Test Name                                             | Spec File                         | Type |
| ------------ | ----------------------------------------------------- | --------------------------------- | ---- |
| TC-SEC02-001 | pages are server-rendered (not empty on initial load) | requirements-verification.spec.ts | E2E  |
| TC-SEC02-002 | application uses Next.js framework                    | requirements-verification.spec.ts | E2E  |

| Req Section | Requirement                                  | Test Case IDs                | Test Count | Pass Rate | Evidence                              |
| ----------- | -------------------------------------------- | ---------------------------- | ---------- | --------- | ------------------------------------- |
| 2           | Technical Stack -- Next.js, server rendering | TC-SEC02-001 to TC-SEC02-002 | 2          | 100%      | e2e/requirements-verification.spec.ts |

---

### Section 3: Architecture & Project Structure

| Test Case ID | Test Name                               | Spec File                         | Type |
| ------------ | --------------------------------------- | --------------------------------- | ---- |
| TC-SEC03-001 | home page includes "View Menu" link     | requirements-verification.spec.ts | E2E  |
| TC-SEC03-002 | "View Menu" link navigates to menu page | requirements-verification.spec.ts | E2E  |

| Req Section | Requirement                                              | Test Case IDs                | Test Count | Pass Rate | Evidence                              |
| ----------- | -------------------------------------------------------- | ---------------------------- | ---------- | --------- | ------------------------------------- |
| 3           | Architecture -- navigation structure, App Router routing | TC-SEC03-001 to TC-SEC03-002 | 2          | 100%      | e2e/requirements-verification.spec.ts |

---

### Section 4: Authentication & Authorization

| Test Case ID | Test Name                                                           | Spec File                         | Type |
| ------------ | ------------------------------------------------------------------- | --------------------------------- | ---- |
| TC-SEC04-001 | login page renders with title and phone prompt                      | requirements-verification.spec.ts | E2E  |
| TC-SEC04-002 | login page shows PIN delivery method options (WhatsApp, SMS, Email) | requirements-verification.spec.ts | E2E  |
| TC-SEC04-003 | login page displays delivery method descriptions                    | requirements-verification.spec.ts | E2E  |
| TC-SEC04-004 | login page links to privacy policy and terms                        | requirements-verification.spec.ts | E2E  |
| TC-SEC04-005 | unauthenticated user is redirected from /orders to /login           | requirements-verification.spec.ts | E2E  |
| TC-SEC04-006 | unauthenticated user is redirected from /profile to /login          | requirements-verification.spec.ts | E2E  |
| TC-SEC04-007 | admin login page renders with credentials form                      | requirements-verification.spec.ts | E2E  |
| TC-SEC04-008 | admin login form has username and password fields                   | requirements-verification.spec.ts | E2E  |
| TC-SEC04-009 | admin login rejects invalid credentials                             | requirements-verification.spec.ts | E2E  |
| TC-SEC04-010 | unauthenticated user is redirected from /dashboard to login         | requirements-verification.spec.ts | E2E  |
| TC-SEC04-011 | unauthorized page is accessible                                     | requirements-verification.spec.ts | E2E  |
| TC-SEC04-012 | dashboard forbidden page redirects unauthenticated users            | requirements-verification.spec.ts | E2E  |
| TC-SEC04-013 | session cookie is httpOnly                                          | requirements-verification.spec.ts | E2E  |
| TC-SEC04-014 | admin can access dashboard without redirect                         | authenticated.spec.ts             | Auth |
| TC-SEC04-015 | super-admin can access dashboard overview                           | authenticated.spec.ts             | Auth |
| TC-SEC04-016 | logout endpoint returns success                                     | authenticated.spec.ts             | Auth |

| Req Section | Requirement                                                                       | Test Case IDs                | Test Count | Pass Rate | Evidence        |
| ----------- | --------------------------------------------------------------------------------- | ---------------------------- | ---------- | --------- | --------------- |
| 4           | Authentication -- passwordless login, admin login, RBAC, session security, logout | TC-SEC04-001 to TC-SEC04-016 | 16         | 100%      | Both spec files |

---

### Section 5.2 / 6: Menu System

| Test Case ID | Test Name                                                        | Spec File                         | Type |
| ------------ | ---------------------------------------------------------------- | --------------------------------- | ---- |
| TC-SEC05-001 | menu page loads with title and description                       | requirements-verification.spec.ts | E2E  |
| TC-SEC05-002 | menu page displays item cards                                    | requirements-verification.spec.ts | E2E  |
| TC-SEC05-003 | menu page has category navigation with food and drink categories | requirements-verification.spec.ts | E2E  |
| TC-SEC05-004 | menu page supports search via URL parameter                      | requirements-verification.spec.ts | E2E  |
| TC-SEC05-005 | menu page supports category filter via URL parameter             | requirements-verification.spec.ts | E2E  |
| TC-SEC05-006 | menu page supports table number via URL parameter                | requirements-verification.spec.ts | E2E  |

| Req Section | Requirement                                    | Test Case IDs                | Test Count | Pass Rate | Evidence                              |
| ----------- | ---------------------------------------------- | ---------------------------- | ---------- | --------- | ------------------------------------- |
| 5.2 / 6     | Menu -- categories, search, filter, item cards | TC-SEC05-001 to TC-SEC05-006 | 6          | 100%      | e2e/requirements-verification.spec.ts |

---

### Section 5.3: Cart

| Test Case ID | Test Name                                                             | Spec File                         | Type |
| ------------ | --------------------------------------------------------------------- | --------------------------------- | ---- |
| TC-SEC53-001 | cart persists items in localStorage under wawa-cart-storage           | requirements-verification.spec.ts | E2E  |
| TC-SEC53-002 | cart stores quantity, portion size, and special instructions per item | requirements-verification.spec.ts | E2E  |
| TC-SEC53-003 | seeded cart items appear in checkout                                  | requirements-verification.spec.ts | E2E  |

| Req Section | Requirement                                                        | Test Case IDs                | Test Count | Pass Rate | Evidence                              |
| ----------- | ------------------------------------------------------------------ | ---------------------------- | ---------- | --------- | ------------------------------------- |
| 5.3         | Cart -- Zustand persistence, item properties, checkout integration | TC-SEC53-001 to TC-SEC53-003 | 3          | 100%      | e2e/requirements-verification.spec.ts |

---

### Section 5.5: Orders & Tabs Page

| Test Case ID | Test Name                                           | Spec File                         | Type |
| ------------ | --------------------------------------------------- | --------------------------------- | ---- |
| TC-SEC55-001 | orders page redirects unauthenticated users         | requirements-verification.spec.ts | E2E  |
| TC-SEC55-002 | orders/tabs page redirects unauthenticated users    | requirements-verification.spec.ts | E2E  |
| TC-SEC55-003 | orders/history page redirects unauthenticated users | requirements-verification.spec.ts | E2E  |

| Req Section | Requirement                                          | Test Case IDs                | Test Count | Pass Rate | Evidence                              |
| ----------- | ---------------------------------------------------- | ---------------------------- | ---------- | --------- | ------------------------------------- |
| 5.5         | Orders & Tabs Page -- route protection, guest access | TC-SEC55-001 to TC-SEC55-003 | 3          | 100%      | e2e/requirements-verification.spec.ts |

---

### Section 5.7 / 10: Rewards & Loyalty

| Test Case ID | Test Name                                                    | Spec File                         | Type |
| ------------ | ------------------------------------------------------------ | --------------------------------- | ---- |
| TC-SEC57-001 | rewards page loads with loyalty information                  | requirements-verification.spec.ts | E2E  |
| TC-SEC57-002 | rewards page shows sign-in prompt for unauthenticated users  | requirements-verification.spec.ts | E2E  |
| TC-SEC57-003 | rewards page displays feature preview cards                  | requirements-verification.spec.ts | E2E  |
| TC-SEC57-004 | rewards page explains points conversion (100 points = NGN 1) | requirements-verification.spec.ts | E2E  |
| TC-SEC57-005 | rewards page has "How It Works" guide                        | requirements-verification.spec.ts | E2E  |
| TC-SEC57-006 | rewards page links to login for sign-in                      | requirements-verification.spec.ts | E2E  |

| Req Section | Requirement                                                               | Test Case IDs                | Test Count | Pass Rate | Evidence                              |
| ----------- | ------------------------------------------------------------------------- | ---------------------------- | ---------- | --------- | ------------------------------------- |
| 5.7 / 10    | Rewards -- loyalty info, points conversion, feature cards, sign-in prompt | TC-SEC57-001 to TC-SEC57-006 | 6          | 100%      | e2e/requirements-verification.spec.ts |

---

### Section 7: Ordering System

| Test Case ID | Test Name                                                        | Spec File                         | Type |
| ------------ | ---------------------------------------------------------------- | --------------------------------- | ---- |
| TC-SEC07-001 | home page advertises all order types (dine-in, pickup, delivery) | requirements-verification.spec.ts | E2E  |
| TC-SEC07-002 | checkout form includes order type selection                      | requirements-verification.spec.ts | E2E  |

| Req Section | Requirement                                             | Test Case IDs                | Test Count | Pass Rate | Evidence                              |
| ----------- | ------------------------------------------------------- | ---------------------------- | ---------- | --------- | ------------------------------------- |
| 7           | Ordering System -- order types, checkout type selection | TC-SEC07-001 to TC-SEC07-002 | 2          | 100%      | e2e/requirements-verification.spec.ts |

---

### Section 8: Tab System

| Test Case ID | Test Name                                     | Spec File                         | Type |
| ------------ | --------------------------------------------- | --------------------------------- | ---- |
| TC-SEC08-001 | customer tabs page requires authentication    | requirements-verification.spec.ts | E2E  |
| TC-SEC08-002 | admin tabs management requires authentication | requirements-verification.spec.ts | E2E  |
| TC-SEC08-003 | tabs page loads for authenticated admin       | authenticated.spec.ts             | Auth |

| Req Section | Requirement                                     | Test Case IDs                | Test Count | Pass Rate | Evidence        |
| ----------- | ----------------------------------------------- | ---------------------------- | ---------- | --------- | --------------- |
| 8           | Tab System -- route protection, admin tabs page | TC-SEC08-001 to TC-SEC08-003 | 3          | 100%      | Both spec files |

---

### Section 9: Checkout & Payment

| Test Case ID | Test Name                                                   | Spec File                         | Type |
| ------------ | ----------------------------------------------------------- | --------------------------------- | ---- |
| TC-SEC09-001 | checkout page renders with form                             | requirements-verification.spec.ts | E2E  |
| TC-SEC09-002 | checkout with seeded cart shows multi-step form             | requirements-verification.spec.ts | E2E  |
| TC-SEC09-003 | checkout displays cart items and totals                     | requirements-verification.spec.ts | E2E  |
| TC-SEC09-004 | checkout form has customer info fields (name, email, phone) | requirements-verification.spec.ts | E2E  |
| TC-SEC09-005 | checkout shows navigation buttons (Back/Next)               | requirements-verification.spec.ts | E2E  |

| Req Section | Requirement                                                          | Test Case IDs                | Test Count | Pass Rate | Evidence                              |
| ----------- | -------------------------------------------------------------------- | ---------------------------- | ---------- | --------- | ------------------------------------- |
| 9           | Checkout & Payment -- multi-step form, cart display, customer fields | TC-SEC09-001 to TC-SEC09-005 | 5          | 100%      | e2e/requirements-verification.spec.ts |

---

### Section 11: Admin Dashboard

| Test Case ID | Test Name                                                          | Spec File                         | Type |
| ------------ | ------------------------------------------------------------------ | --------------------------------- | ---- |
| TC-SEC11-001 | /dashboard redirects unauthenticated users                         | requirements-verification.spec.ts | E2E  |
| TC-SEC11-002 | /dashboard/orders redirects unauthenticated users                  | requirements-verification.spec.ts | E2E  |
| TC-SEC11-003 | /dashboard/menu redirects unauthenticated users                    | requirements-verification.spec.ts | E2E  |
| TC-SEC11-004 | /dashboard/inventory redirects unauthenticated users               | requirements-verification.spec.ts | E2E  |
| TC-SEC11-005 | /dashboard/settings redirects unauthenticated users                | requirements-verification.spec.ts | E2E  |
| TC-SEC11-006 | /dashboard/rewards redirects unauthenticated users                 | requirements-verification.spec.ts | E2E  |
| TC-SEC11-007 | /dashboard/audit-logs redirects unauthenticated users              | requirements-verification.spec.ts | E2E  |
| TC-SEC11-008 | /dashboard/reports redirects unauthenticated users                 | requirements-verification.spec.ts | E2E  |
| TC-SEC11-009 | /dashboard/kitchen redirects unauthenticated users                 | requirements-verification.spec.ts | E2E  |
| TC-SEC11-010 | /dashboard/customers redirects unauthenticated users               | requirements-verification.spec.ts | E2E  |
| TC-SEC11-011 | /dashboard/finance/expenses redirects unauthenticated users        | requirements-verification.spec.ts | E2E  |
| TC-SEC11-012 | /dashboard/analytics/profitability redirects unauthenticated users | requirements-verification.spec.ts | E2E  |
| TC-SEC11-013 | super-admin can access dashboard overview                          | authenticated.spec.ts             | Auth |
| TC-SEC11-014 | dashboard shows quick stats cards                                  | authenticated.spec.ts             | Auth |
| TC-SEC11-015 | dashboard shows recent orders section                              | authenticated.spec.ts             | Auth |
| TC-SEC11-016 | regular admin is redirected from /dashboard to /dashboard/orders   | authenticated.spec.ts             | Auth |
| TC-SEC11-017 | dashboard sidebar shows navigation links                           | authenticated.spec.ts             | Auth |
| TC-SEC11-018 | dashboard has header with "Dashboard" title                        | authenticated.spec.ts             | Auth |
| TC-SEC11-019 | customers page loads                                               | authenticated.spec.ts             | Auth |

| Req Section | Requirement                                                                         | Test Case IDs                | Test Count | Pass Rate | Evidence        |
| ----------- | ----------------------------------------------------------------------------------- | ---------------------------- | ---------- | --------- | --------------- |
| 11          | Dashboard -- RBAC route protection, overview stats, navigation, customer management | TC-SEC11-001 to TC-SEC11-019 | 19         | 100%      | Both spec files |

---

### Section 12: Order Management

| Test Case ID | Test Name                                             | Spec File                         | Type |
| ------------ | ----------------------------------------------------- | --------------------------------- | ---- |
| TC-SEC12-001 | admin orders page redirects unauthenticated users     | requirements-verification.spec.ts | E2E  |
| TC-SEC12-002 | admin order tabs page redirects unauthenticated users | requirements-verification.spec.ts | E2E  |
| TC-SEC12-003 | orders dashboard loads with title and controls        | authenticated.spec.ts             | Auth |
| TC-SEC12-004 | orders page shows Tabs Display link                   | authenticated.spec.ts             | Auth |
| TC-SEC12-005 | orders page shows Kitchen Display link                | authenticated.spec.ts             | Auth |
| TC-SEC12-006 | orders page shows Quick Actions section               | authenticated.spec.ts             | Auth |
| TC-SEC12-007 | super-admin sees Analytics card on orders page        | authenticated.spec.ts             | Auth |

| Req Section | Requirement                                                                        | Test Case IDs                | Test Count | Pass Rate | Evidence        |
| ----------- | ---------------------------------------------------------------------------------- | ---------------------------- | ---------- | --------- | --------------- |
| 12          | Order Management -- route protection, dashboard controls, quick actions, analytics | TC-SEC12-001 to TC-SEC12-007 | 7          | 100%      | Both spec files |

---

### Section 13: Menu Management

| Test Case ID | Test Name                                            | Spec File                         | Type |
| ------------ | ---------------------------------------------------- | --------------------------------- | ---- |
| TC-SEC13-001 | menu management page redirects unauthenticated users | requirements-verification.spec.ts | E2E  |
| TC-SEC13-002 | new menu item page redirects unauthenticated users   | requirements-verification.spec.ts | E2E  |
| TC-SEC13-003 | menu management page loads with items                | authenticated.spec.ts             | Auth |
| TC-SEC13-004 | new menu item page loads with form                   | authenticated.spec.ts             | Auth |

| Req Section | Requirement                                                 | Test Case IDs                | Test Count | Pass Rate | Evidence        |
| ----------- | ----------------------------------------------------------- | ---------------------------- | ---------- | --------- | --------------- |
| 13          | Menu Management -- route protection, list view, create form | TC-SEC13-001 to TC-SEC13-004 | 4          | 100%      | Both spec files |

---

### Section 14: Inventory Management

| Test Case ID | Test Name                                                      | Spec File                         | Type |
| ------------ | -------------------------------------------------------------- | --------------------------------- | ---- |
| TC-SEC14-001 | /dashboard/inventory redirects unauthenticated users           | requirements-verification.spec.ts | E2E  |
| TC-SEC14-002 | /dashboard/inventory/snapshots redirects unauthenticated users | requirements-verification.spec.ts | E2E  |
| TC-SEC14-003 | /dashboard/inventory/transfer redirects unauthenticated users  | requirements-verification.spec.ts | E2E  |
| TC-SEC14-004 | inventory page loads                                           | authenticated.spec.ts             | Auth |
| TC-SEC14-005 | inventory snapshots page loads                                 | authenticated.spec.ts             | Auth |
| TC-SEC14-006 | inventory transfer page loads                                  | authenticated.spec.ts             | Auth |

| Req Section | Requirement                                                          | Test Case IDs                | Test Count | Pass Rate | Evidence        |
| ----------- | -------------------------------------------------------------------- | ---------------------------- | ---------- | --------- | --------------- |
| 14          | Inventory Management -- route protection, list, snapshots, transfers | TC-SEC14-001 to TC-SEC14-006 | 6          | 100%      | Both spec files |

---

### Section 15: Financial Management

| Test Case ID | Test Name                                     | Spec File                         | Type |
| ------------ | --------------------------------------------- | --------------------------------- | ---- |
| TC-SEC15-001 | expenses page redirects unauthenticated users | requirements-verification.spec.ts | E2E  |
| TC-SEC15-002 | expenses page loads                           | authenticated.spec.ts             | Auth |

| Req Section | Requirement                                             | Test Case IDs                | Test Count | Pass Rate | Evidence        |
| ----------- | ------------------------------------------------------- | ---------------------------- | ---------- | --------- | --------------- |
| 15          | Financial Management -- route protection, expenses page | TC-SEC15-001 to TC-SEC15-002 | 2          | 100%      | Both spec files |

---

### Section 16: Reports & Analytics

| Test Case ID | Test Name                                                          | Spec File                         | Type |
| ------------ | ------------------------------------------------------------------ | --------------------------------- | ---- |
| TC-SEC16-001 | /dashboard/reports redirects unauthenticated users                 | requirements-verification.spec.ts | E2E  |
| TC-SEC16-002 | /dashboard/reports/daily redirects unauthenticated users           | requirements-verification.spec.ts | E2E  |
| TC-SEC16-003 | /dashboard/reports/inventory redirects unauthenticated users       | requirements-verification.spec.ts | E2E  |
| TC-SEC16-004 | /dashboard/reports/profitability redirects unauthenticated users   | requirements-verification.spec.ts | E2E  |
| TC-SEC16-005 | /dashboard/analytics/profitability redirects unauthenticated users | requirements-verification.spec.ts | E2E  |
| TC-SEC16-006 | reports page loads                                                 | authenticated.spec.ts             | Auth |
| TC-SEC16-007 | daily report page loads                                            | authenticated.spec.ts             | Auth |
| TC-SEC16-008 | inventory report page loads                                        | authenticated.spec.ts             | Auth |
| TC-SEC16-009 | profitability report page loads                                    | authenticated.spec.ts             | Auth |
| TC-SEC16-010 | profitability analytics page loads                                 | authenticated.spec.ts             | Auth |

| Req Section | Requirement                                                    | Test Case IDs                | Test Count | Pass Rate | Evidence        |
| ----------- | -------------------------------------------------------------- | ---------------------------- | ---------- | --------- | --------------- |
| 16          | Reports & Analytics -- route protection, all report pages load | TC-SEC16-001 to TC-SEC16-010 | 10         | 100%      | Both spec files |

---

### Section 17: Kitchen Display System

| Test Case ID | Test Name                                       | Spec File                         | Type |
| ------------ | ----------------------------------------------- | --------------------------------- | ---- |
| TC-SEC17-001 | kitchen display redirects unauthenticated users | requirements-verification.spec.ts | E2E  |
| TC-SEC17-002 | kitchen display loads with dark theme           | authenticated.spec.ts             | Auth |
| TC-SEC17-003 | kitchen display shows active order count        | authenticated.spec.ts             | Auth |
| TC-SEC17-004 | kitchen display has back button to orders       | authenticated.spec.ts             | Auth |

| Req Section | Requirement                                                                | Test Case IDs                | Test Count | Pass Rate | Evidence        |
| ----------- | -------------------------------------------------------------------------- | ---------------------------- | ---------- | --------- | --------------- |
| 17          | Kitchen Display -- route protection, dark theme, active orders, navigation | TC-SEC17-001 to TC-SEC17-004 | 4          | 100%      | Both spec files |

---

### Section 18: Rewards Configuration

| Test Case ID | Test Name                                                    | Spec File                         | Type |
| ------------ | ------------------------------------------------------------ | --------------------------------- | ---- |
| TC-SEC18-001 | /dashboard/rewards redirects unauthenticated users           | requirements-verification.spec.ts | E2E  |
| TC-SEC18-002 | /dashboard/rewards/issued redirects unauthenticated users    | requirements-verification.spec.ts | E2E  |
| TC-SEC18-003 | /dashboard/rewards/rules redirects unauthenticated users     | requirements-verification.spec.ts | E2E  |
| TC-SEC18-004 | /dashboard/rewards/templates redirects unauthenticated users | requirements-verification.spec.ts | E2E  |
| TC-SEC18-005 | rewards dashboard loads                                      | authenticated.spec.ts             | Auth |
| TC-SEC18-006 | reward rules page loads                                      | authenticated.spec.ts             | Auth |
| TC-SEC18-007 | issued rewards page loads                                    | authenticated.spec.ts             | Auth |
| TC-SEC18-008 | reward templates page loads                                  | authenticated.spec.ts             | Auth |

| Req Section | Requirement                                                               | Test Case IDs                | Test Count | Pass Rate | Evidence        |
| ----------- | ------------------------------------------------------------------------- | ---------------------------- | ---------- | --------- | --------------- |
| 18          | Rewards Configuration -- route protection, rules, issued, templates pages | TC-SEC18-001 to TC-SEC18-008 | 8          | 100%      | Both spec files |

---

### Section 19: Settings & Configuration

| Test Case ID | Test Name                                                         | Spec File                         | Type |
| ------------ | ----------------------------------------------------------------- | --------------------------------- | ---- |
| TC-SEC19-001 | /dashboard/settings redirects unauthenticated users               | requirements-verification.spec.ts | E2E  |
| TC-SEC19-002 | /dashboard/settings/admins redirects unauthenticated users        | requirements-verification.spec.ts | E2E  |
| TC-SEC19-003 | /dashboard/settings/api-keys redirects unauthenticated users      | requirements-verification.spec.ts | E2E  |
| TC-SEC19-004 | /dashboard/settings/data-requests redirects unauthenticated users | requirements-verification.spec.ts | E2E  |
| TC-SEC19-005 | settings page loads with configuration sections                   | authenticated.spec.ts             | Auth |
| TC-SEC19-006 | admin management page loads                                       | authenticated.spec.ts             | Auth |
| TC-SEC19-007 | API keys management page loads                                    | authenticated.spec.ts             | Auth |
| TC-SEC19-008 | data requests page loads                                          | authenticated.spec.ts             | Auth |

| Req Section | Requirement                                                                             | Test Case IDs                | Test Count | Pass Rate | Evidence        |
| ----------- | --------------------------------------------------------------------------------------- | ---------------------------- | ---------- | --------- | --------------- |
| 19          | Settings & Configuration -- route protection, settings, admins, API keys, data requests | TC-SEC19-001 to TC-SEC19-008 | 8          | 100%      | Both spec files |

---

### Section 20: Public REST API

| Test Case ID | Test Name                                                                                  | Spec File                         | Type |
| ------------ | ------------------------------------------------------------------------------------------ | --------------------------------- | ---- |
| TC-SEC20-001 | health endpoint returns success with status, service, version, uptime                      | requirements-verification.spec.ts | E2E  |
| TC-SEC20-002 | GET /api/public/menu rejects unauthenticated requests (scope: menu:read)                   | requirements-verification.spec.ts | E2E  |
| TC-SEC20-003 | GET /api/public/menu/categories rejects unauthenticated requests (scope: menu:read)        | requirements-verification.spec.ts | E2E  |
| TC-SEC20-004 | GET /api/public/orders rejects unauthenticated requests (scope: orders:read)               | requirements-verification.spec.ts | E2E  |
| TC-SEC20-005 | GET /api/public/orders/stats rejects unauthenticated requests (scope: orders:read)         | requirements-verification.spec.ts | E2E  |
| TC-SEC20-006 | GET /api/public/orders/summary rejects unauthenticated requests (scope: orders:read)       | requirements-verification.spec.ts | E2E  |
| TC-SEC20-007 | GET /api/public/inventory rejects unauthenticated requests (scope: inventory:read)         | requirements-verification.spec.ts | E2E  |
| TC-SEC20-008 | GET /api/public/inventory/alerts rejects unauthenticated requests (scope: inventory:read)  | requirements-verification.spec.ts | E2E  |
| TC-SEC20-009 | GET /api/public/inventory/summary rejects unauthenticated requests (scope: inventory:read) | requirements-verification.spec.ts | E2E  |
| TC-SEC20-010 | GET /api/public/customers rejects unauthenticated requests (scope: customers:read)         | requirements-verification.spec.ts | E2E  |
| TC-SEC20-011 | GET /api/public/customers/summary rejects unauthenticated requests (scope: customers:read) | requirements-verification.spec.ts | E2E  |
| TC-SEC20-012 | GET /api/public/tabs rejects unauthenticated requests (scope: tabs:read)                   | requirements-verification.spec.ts | E2E  |
| TC-SEC20-013 | GET /api/public/tabs/summary rejects unauthenticated requests (scope: tabs:read)           | requirements-verification.spec.ts | E2E  |
| TC-SEC20-014 | GET /api/public/settings rejects unauthenticated requests (scope: settings:read)           | requirements-verification.spec.ts | E2E  |
| TC-SEC20-015 | GET /api/public/rewards rejects unauthenticated requests (scope: rewards:read)             | requirements-verification.spec.ts | E2E  |
| TC-SEC20-016 | GET /api/public/sales/summary rejects unauthenticated requests (scope: analytics:read)     | requirements-verification.spec.ts | E2E  |
| TC-SEC20-017 | POST /api/public/orders rejects unauthenticated requests                                   | requirements-verification.spec.ts | E2E  |
| TC-SEC20-018 | POST /api/public/payments rejects unauthenticated requests                                 | requirements-verification.spec.ts | E2E  |
| TC-SEC20-019 | POST /api/public/rewards/redeem rejects unauthenticated requests                           | requirements-verification.spec.ts | E2E  |
| TC-SEC20-020 | API returns JSON with standard response format                                             | requirements-verification.spec.ts | E2E  |
| TC-SEC20-021 | admin settings API requires admin session                                                  | requirements-verification.spec.ts | E2E  |
| TC-SEC20-022 | admin settings impact API requires admin session                                           | requirements-verification.spec.ts | E2E  |

| Req Section | Requirement                                                                                                          | Test Case IDs                | Test Count | Pass Rate | Evidence                              |
| ----------- | -------------------------------------------------------------------------------------------------------------------- | ---------------------------- | ---------- | --------- | ------------------------------------- |
| 20          | Public REST API -- health endpoint, scoped auth enforcement (15 GET + 3 POST), response format, admin API protection | TC-SEC20-001 to TC-SEC20-022 | 22         | 100%      | e2e/requirements-verification.spec.ts |

---

### Section 21: Real-Time (Socket.IO)

| Test Case ID | Test Name                       | Spec File                         | Type |
| ------------ | ------------------------------- | --------------------------------- | ---- |
| TC-SEC21-001 | Socket.IO endpoint is available | requirements-verification.spec.ts | E2E  |

| Req Section | Requirement                                  | Test Case IDs | Test Count | Pass Rate | Evidence                              |
| ----------- | -------------------------------------------- | ------------- | ---------- | --------- | ------------------------------------- |
| 21          | Real-Time -- Socket.IO endpoint availability | TC-SEC21-001  | 1          | 100%      | e2e/requirements-verification.spec.ts |

---

### Section 22: Security

| Test Case ID | Test Name                                   | Spec File                         | Type |
| ------------ | ------------------------------------------- | --------------------------------- | ---- |
| TC-SEC22-001 | returns X-Frame-Options DENY                | requirements-verification.spec.ts | E2E  |
| TC-SEC22-002 | returns X-Content-Type-Options nosniff      | requirements-verification.spec.ts | E2E  |
| TC-SEC22-003 | returns Referrer-Policy header              | requirements-verification.spec.ts | E2E  |
| TC-SEC22-004 | API endpoints include security headers      | requirements-verification.spec.ts | E2E  |
| TC-SEC22-005 | API endpoints enforce rate limiting headers | requirements-verification.spec.ts | E2E  |
| TC-SEC22-006 | API handles preflight OPTIONS requests      | requirements-verification.spec.ts | E2E  |

| Req Section | Requirement                                                                          | Test Case IDs                | Test Count | Pass Rate | Evidence                              |
| ----------- | ------------------------------------------------------------------------------------ | ---------------------------- | ---------- | --------- | ------------------------------------- |
| 22          | Security -- headers (X-Frame-Options, nosniff, Referrer-Policy), rate limiting, CORS | TC-SEC22-001 to TC-SEC22-006 | 6          | 100%      | e2e/requirements-verification.spec.ts |

---

### Section 23: Audit Logs

| Test Case ID | Test Name                                       | Spec File                         | Type |
| ------------ | ----------------------------------------------- | --------------------------------- | ---- |
| TC-SEC23-001 | audit logs page redirects unauthenticated users | requirements-verification.spec.ts | E2E  |
| TC-SEC23-002 | audit logs page loads                           | authenticated.spec.ts             | Auth |

| Req Section | Requirement                                                | Test Case IDs                | Test Count | Pass Rate | Evidence        |
| ----------- | ---------------------------------------------------------- | ---------------------------- | ---------- | --------- | --------------- |
| 23          | Audit Logs -- route protection, page loads for super-admin | TC-SEC23-001 to TC-SEC23-002 | 2          | 100%      | Both spec files |

---

### Section 24: Data Management & Privacy

| Test Case ID | Test Name                                                        | Spec File                         | Type |
| ------------ | ---------------------------------------------------------------- | --------------------------------- | ---- |
| TC-SEC24-001 | privacy page is publicly accessible and contains privacy content | requirements-verification.spec.ts | E2E  |
| TC-SEC24-002 | data deletion page is publicly accessible                        | requirements-verification.spec.ts | E2E  |
| TC-SEC24-003 | data requests admin page redirects unauthenticated users         | requirements-verification.spec.ts | E2E  |

| Req Section | Requirement                                                                                | Test Case IDs                | Test Count | Pass Rate | Evidence                              |
| ----------- | ------------------------------------------------------------------------------------------ | ---------------------------- | ---------- | --------- | ------------------------------------- |
| 24          | Data Management & Privacy -- public privacy/deletion pages, admin data requests protection | TC-SEC24-001 to TC-SEC24-003 | 3          | 100%      | e2e/requirements-verification.spec.ts |

---

### Section 25: Deployment

| Test Case ID | Test Name                                   | Spec File                         | Type |
| ------------ | ------------------------------------------- | --------------------------------- | ---- |
| TC-SEC25-001 | application is running and serves pages     | requirements-verification.spec.ts | E2E  |
| TC-SEC25-002 | health endpoint confirms service is healthy | requirements-verification.spec.ts | E2E  |

| Req Section | Requirement                                             | Test Case IDs                | Test Count | Pass Rate | Evidence                              |
| ----------- | ------------------------------------------------------- | ---------------------------- | ---------- | --------- | ------------------------------------- |
| 25          | Deployment -- application availability, health endpoint | TC-SEC25-001 to TC-SEC25-002 | 2          | 100%      | e2e/requirements-verification.spec.ts |

---

### Section 27: Non-Functional Requirements

| Test Case ID | Test Name                                        | Spec File                         | Type |
| ------------ | ------------------------------------------------ | --------------------------------- | ---- |
| TC-SEC27-001 | home page has Open Graph metadata                | requirements-verification.spec.ts | E2E  |
| TC-SEC27-002 | menu page has descriptive metadata               | requirements-verification.spec.ts | E2E  |
| TC-SEC27-003 | checkout page has descriptive metadata           | requirements-verification.spec.ts | E2E  |
| TC-SEC27-004 | login page has descriptive metadata              | requirements-verification.spec.ts | E2E  |
| TC-SEC27-005 | home page has semantic h1 heading                | requirements-verification.spec.ts | E2E  |
| TC-SEC27-006 | home page logo has alt text                      | requirements-verification.spec.ts | E2E  |
| TC-SEC27-007 | login page uses sr-only text for branding        | requirements-verification.spec.ts | E2E  |
| TC-SEC27-008 | form inputs have associated labels on login page | requirements-verification.spec.ts | E2E  |
| TC-SEC27-009 | home page renders on iPhone SE (375x667)         | requirements-verification.spec.ts | E2E  |
| TC-SEC27-010 | home page renders on iPhone 12 (390x844)         | requirements-verification.spec.ts | E2E  |
| TC-SEC27-011 | home page renders on iPad (768x1024)             | requirements-verification.spec.ts | E2E  |
| TC-SEC27-012 | home page renders on Desktop (1440x900)          | requirements-verification.spec.ts | E2E  |
| TC-SEC27-013 | menu page renders on iPhone SE (375x667)         | requirements-verification.spec.ts | E2E  |
| TC-SEC27-014 | menu page renders on iPhone 12 (390x844)         | requirements-verification.spec.ts | E2E  |
| TC-SEC27-015 | menu page renders on iPad (768x1024)             | requirements-verification.spec.ts | E2E  |
| TC-SEC27-016 | menu page renders on Desktop (1440x900)          | requirements-verification.spec.ts | E2E  |

| Req Section | Requirement                                                                                                                              | Test Case IDs                | Test Count | Pass Rate | Evidence                              |
| ----------- | ---------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------- | ---------- | --------- | ------------------------------------- |
| 27          | Non-Functional -- SEO/OG metadata, accessibility (semantic HTML, ARIA, sr-only, labels), mobile-first responsive (4 viewports x 2 pages) | TC-SEC27-001 to TC-SEC27-016 | 16         | 100%      | e2e/requirements-verification.spec.ts |

---

### Cross-Cutting: Navigation & Error Handling

| Test Case ID | Test Name                                                       | Spec File                         | Type |
| ------------ | --------------------------------------------------------------- | --------------------------------- | ---- |
| TC-SECXX-001 | home to menu to checkout flow                                   | requirements-verification.spec.ts | E2E  |
| TC-SECXX-002 | rewards page links to login for authentication                  | requirements-verification.spec.ts | E2E  |
| TC-SECXX-003 | admin login page is accessible and distinct from customer login | requirements-verification.spec.ts | E2E  |
| TC-SECXX-004 | 404 page is handled gracefully                                  | requirements-verification.spec.ts | E2E  |
| TC-SECXX-005 | invalid API route returns error (not 200)                       | requirements-verification.spec.ts | E2E  |

| Req Section   | Requirement                           | Test Case IDs                | Test Count | Pass Rate | Evidence                              |
| ------------- | ------------------------------------- | ---------------------------- | ---------- | --------- | ------------------------------------- |
| Cross-cutting | Navigation flows, error handling, 404 | TC-SECXX-001 to TC-SECXX-005 | 5          | 100%      | e2e/requirements-verification.spec.ts |

---

### Sections Without Dedicated E2E Tests

| Req Section | Requirement                          | Justification                                                                                                                          |
| ----------- | ------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------- |
| 5.4         | Order Tracking                       | Requires active order with Socket.IO real-time updates; verified via authenticated session indirectly (1 route-protection test exists) |
| 5.6         | Customer Profile                     | Requires authenticated customer session; route protection verified (2 tests exist)                                                     |
| 26          | Data Models (20 MongoDB Collections) | Infrastructure/schema concern; validated by Mongoose model unit tests and integration tests, not suitable for E2E browser testing      |

---

### Forward Traceability Summary

| Req Section | Requirement Title                 | E2E Tests | Auth Tests | Total   | Pass Rate |
| ----------- | --------------------------------- | --------- | ---------- | ------- | --------- |
| 1 / 5.1     | Home Page                         | 5         | 0          | 5       | 100%      |
| 2           | Technical Stack                   | 2         | 0          | 2       | 100%      |
| 3           | Architecture                      | 2         | 0          | 2       | 100%      |
| 4           | Authentication & Authorization    | 13        | 3          | 16      | 100%      |
| 5.2 / 6     | Menu System                       | 6         | 0          | 6       | 100%      |
| 5.3         | Cart                              | 3         | 0          | 3       | 100%      |
| 5.5         | Orders & Tabs Page                | 3         | 0          | 3       | 100%      |
| 5.7 / 10    | Rewards & Loyalty                 | 6         | 0          | 6       | 100%      |
| 7           | Ordering System                   | 2         | 0          | 2       | 100%      |
| 8           | Tab System                        | 2         | 1          | 3       | 100%      |
| 9           | Checkout & Payment                | 5         | 0          | 5       | 100%      |
| 11          | Admin Dashboard                   | 12        | 7          | 19      | 100%      |
| 12          | Order Management                  | 2         | 5          | 7       | 100%      |
| 13          | Menu Management                   | 2         | 2          | 4       | 100%      |
| 14          | Inventory Management              | 3         | 3          | 6       | 100%      |
| 15          | Financial Management              | 1         | 1          | 2       | 100%      |
| 16          | Reports & Analytics               | 5         | 5          | 10      | 100%      |
| 17          | Kitchen Display                   | 1         | 3          | 4       | 100%      |
| 18          | Rewards Configuration             | 4         | 4          | 8       | 100%      |
| 19          | Settings & Configuration          | 4         | 4          | 8       | 100%      |
| 20          | Public REST API                   | 22        | 0          | 22      | 100%      |
| 21          | Socket.IO                         | 1         | 0          | 1       | 100%      |
| 22          | Security                          | 6         | 0          | 6       | 100%      |
| 23          | Audit Logs                        | 1         | 1          | 2       | 100%      |
| 24          | Data Management & Privacy         | 3         | 0          | 3       | 100%      |
| 25          | Deployment                        | 2         | 0          | 2       | 100%      |
| 27          | Non-Functional Requirements       | 16        | 0          | 16      | 100%      |
| --          | Cross-Cutting (Navigation/Errors) | 5         | 0          | 5       | 100%      |
| **TOTAL**   |                                   | **142**   | **39**     | **183** | **100%**  |

---

## Part B: Change Request Traceability

This section tracks discrete change requests (REQ-001 through REQ-008) that represent implementation work items. Each entry maps to implementation artefacts, test evidence, and approval status.

| REQ-ID  | Issue | Risk   | Evidence                     | Status              | Approver | Date       |
| ------- | ----- | ------ | ---------------------------- | ------------------- | -------- | ---------- |
| REQ-001 | --    | LOW    | compliance/evidence/REQ-001/ | APPROVED - DEPLOYED | William  | 2026-03-20 |
| REQ-002 | --    | MEDIUM | compliance/evidence/REQ-002/ | APPROVED - DEPLOYED | William  | 2026-03-20 |
| REQ-003 | --    | LOW    | compliance/evidence/REQ-003/ | APPROVED - DEPLOYED | William  | 2026-03-20 |
| REQ-004 | --    | MEDIUM | compliance/evidence/REQ-004/ | APPROVED - DEPLOYED | William  | 2026-03-20 |
| REQ-005 | --    | MEDIUM | compliance/evidence/REQ-005/ | APPROVED - DEPLOYED | William  | 2026-03-05 |
| REQ-006 | --    | MEDIUM | compliance/evidence/REQ-006/ | APPROVED - DEPLOYED | William  | 2026-03-06 |
| REQ-007 | --    | LOW    | compliance/evidence/REQ-007/ | APPROVED - DEPLOYED | William  | 2026-03-20 |
| REQ-008 | --    | LOW    | compliance/evidence/REQ-008/ | APPROVED - DEPLOYED | William  | 2026-03-20 |
| REQ-009 | #2    | HIGH   | compliance/evidence/REQ-009/ | APPROVED - DEPLOYED | William  | 2026-03-22 |
| REQ-010 | #4    | MEDIUM | compliance/evidence/REQ-010/ | APPROVED - DEPLOYED | William  | 2026-03-23 |
| REQ-011 | #6    | LOW    | compliance/evidence/REQ-011/ | APPROVED - DEPLOYED | William  | 2026-03-25 |
| REQ-012 | #9    | HIGH   | compliance/evidence/REQ-012/ | APPROVED - DEPLOYED | William  | 2026-03-28 |
| REQ-013 | #10   | HIGH   | compliance/evidence/REQ-013/ | APPROVED - DEPLOYED | William  | 2026-03-28 |
| REQ-014 | #11   | MEDIUM | compliance/evidence/REQ-014/ | APPROVED - DEPLOYED | William  | 2026-03-28 |
| REQ-015 | #15   | MEDIUM | compliance/evidence/REQ-015/ | APPROVED - DEPLOYED | William  | 2026-03-29 |
| REQ-016 | #23   | LOW    | compliance/evidence/REQ-016/ | APPROVED - DEPLOYED | William  | 2026-03-29 |
| REQ-017 | #26   | MEDIUM | compliance/evidence/REQ-017/ | DRAFT               | --       | --         |

### Change Request Dependencies

```
REQ-003 ──superseded-by──> REQ-004 (non-blocking warmup replaces blocking warmup)
REQ-001 <──updated-by──── REQ-005 (SOP corrected to match API implementation)
REQ-001 <──updated-by──── REQ-006 (SOP v1.2 with prerequisite sections)
REQ-007 ──verified-by───> E2E test suites (requirements-verification + authenticated)
REQ-008 ──references────> REQ-001 (SOP format), REQ-007 (requirements coverage)
```

---

## Part C: Coverage Summary

### Overall Metrics

| Metric                                                         | Value                 |
| -------------------------------------------------------------- | --------------------- |
| Total requirements sections (REQUIREMENTS.md)                  | 27                    |
| Sections with E2E coverage (requirements-verification.spec.ts) | 25                    |
| Sections with authenticated coverage (authenticated.spec.ts)   | 14                    |
| Sections with any automated test coverage                      | 25                    |
| Total test cases                                               | 183                   |
| Tests in requirements-verification.spec.ts                     | 142                   |
| Tests in authenticated.spec.ts                                 | 39                    |
| Overall pass rate                                              | 100%                  |
| Test framework                                                 | Playwright (Chromium) |

### Sections With No Automated E2E Coverage

| Section | Title            | Justification                                                                                                                                                |
| ------- | ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 5.4     | Order Tracking   | Requires live order + Socket.IO real-time updates; indirectly validated by route-protection test and Section 21 Socket.IO availability test                  |
| 5.6     | Customer Profile | Requires authenticated customer session (not admin); route protection verified; profile editing requires seeded customer data                                |
| 26      | Data Models      | Infrastructure/schema definition; validated through Mongoose model compilation, Vitest unit tests, and integration tests; not suitable for browser-based E2E |

### Coverage by Test Type

| Test Type                    | Sections Covered                            | Test Count | Notes                                                                                          |
| ---------------------------- | ------------------------------------------- | ---------- | ---------------------------------------------------------------------------------------------- |
| E2E (public/unauthenticated) | 25                                          | 142        | Route protection, public pages, API auth enforcement, security headers, responsive design, SEO |
| E2E (authenticated admin)    | 14                                          | 39         | Dashboard features, RBAC, admin page functionality, kitchen display, settings                  |
| Vitest (unit)                | REQ-005, REQ-006                            | 53         | API route handler logic, filter building, menu resolution                                      |
| Documentation validation     | REQ-001, REQ-002, REQ-003, REQ-004, REQ-007 | --         | Structure, completeness, accuracy checks                                                       |

### Risk Assessment

| Risk                                            | Mitigation                                                                                                                      |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Socket.IO real-time events not fully E2E tested | Socket.IO endpoint availability confirmed; kitchen display rendering verified; manual QA recommended for live event propagation |
| Payment flow not E2E tested with live provider  | Payment provider (Monnify) requires production credentials and real transactions; webhook validation tested via unit tests      |
| Customer profile editing not E2E tested         | Route protection verified; form rendering validated on similar pages (checkout); manual QA recommended                          |

---

## Notes

- All AI-assisted implementations are verified against requirements
- Human sign-off required before production deployment
- Test evidence retained for audit period (7 years minimum)
- RTM updated with each requirement change or status update
- Test Case IDs (TC-SECT##-###) are stable identifiers for audit cross-referencing

---

**Document Control:**

- Version: 2.0
- Classification: Internal
- Retention Period: Permanent
- Review Frequency: Quarterly
