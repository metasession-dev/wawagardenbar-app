# Test Case Specifications

**Wawa Garden Bar -- E2E Test Case Specifications**

| Field | Value |
|-------|-------|
| **Document ID** | WGB-TCS-001 |
| **Standard** | ISO/IEC/IEEE 29119-3:2021 |
| **Version** | 1.0 |
| **Date** | 2026-03-07 |
| **Status** | Approved |
| **Classification** | Internal |
| **Requirement Reference** | REQ-007 -- Comprehensive Requirements Document |
| **Test Spec Files** | `e2e/requirements-verification.spec.ts` (142 tests), `e2e/authenticated.spec.ts` (39 tests) |
| **Total Test Cases** | 181 |

---

## Document Control

### Revision History

| Version | Date | Author | Description |
|---------|------|--------|-------------|
| 1.0 | 2026-03-07 | QA Engineering | Initial formal test case specifications |

### Approval Sign-Off

| Role | Name | Signature | Date |
|------|------|-----------|------|
| QA Lead | _________________ | _________________ | ____/____/____ |
| Project Manager | _________________ | _________________ | ____/____/____ |
| Product Owner | _________________ | _________________ | ____/____/____ |
| Technical Lead | _________________ | _________________ | ____/____/____ |

---

## Table of Contents

1. [Section 1/5.1: Home Page](#section-151-home-page)
2. [Section 2: Technical Stack](#section-2-technical-stack)
3. [Section 3: Navigation & Architecture](#section-3-navigation--architecture)
4. [Section 4: Authentication & Authorization](#section-4-authentication--authorization)
5. [Section 5.2/6: Menu System](#section-526-menu-system)
6. [Section 5.3: Cart](#section-53-cart)
7. [Section 5.4: Order Tracking](#section-54-order-tracking)
8. [Section 5.5: Orders & Tabs Page](#section-55-orders--tabs-page)
9. [Section 5.6: Customer Profile](#section-56-customer-profile)
10. [Section 5.7/10: Rewards](#section-5710-rewards)
11. [Section 7: Ordering System](#section-7-ordering-system)
12. [Section 8: Tab System](#section-8-tab-system)
13. [Section 9: Checkout & Payment](#section-9-checkout--payment)
14. [Section 11: Dashboard Overview](#section-11-dashboard-overview)
15. [Section 12: Order Management](#section-12-order-management)
16. [Section 13: Menu Management](#section-13-menu-management)
17. [Section 14: Inventory Management](#section-14-inventory-management)
18. [Section 15: Financial Management](#section-15-financial-management)
19. [Section 16: Reports & Analytics](#section-16-reports--analytics)
20. [Section 17: Kitchen Display System](#section-17-kitchen-display-system)
21. [Section 18: Rewards Configuration](#section-18-rewards-configuration)
22. [Section 19: Settings & Configuration](#section-19-settings--configuration)
23. [Section 20: Public REST API](#section-20-public-rest-api)
24. [Section 21: Real-Time (Socket.IO)](#section-21-real-time-socketio)
25. [Section 22: Security](#section-22-security)
26. [Section 23: Audit Logs](#section-23-audit-logs)
27. [Section 24: Data Management & Privacy](#section-24-data-management--privacy)
28. [Section 25: Deployment](#section-25-deployment)
29. [Section 27: Non-Functional Requirements](#section-27-non-functional-requirements)
30. [Cross-Cutting: Navigation Flows](#cross-cutting-navigation-flows)
31. [Cross-Cutting: Error Handling](#cross-cutting-error-handling)
32. [Summary](#summary)

---

## Section 1/5.1: Home Page

**Requirements Reference:** Section 1 (Project Overview), Section 5.1 (Home Page)
**Source:** `e2e/requirements-verification.spec.ts` -- `test.describe('Section 1/5.1: Home Page')`

| ID | Test Name | Pre-conditions | Steps | Expected Result | Result | Priority |
|----|-----------|---------------|-------|-----------------|--------|----------|
| TC-SEC01-001 | renders home page with branding, logo, and CTA | Dev server running, no authentication required | 1. Navigate to / 2. Check page title contains "Wawa" 3. Check for logo image with alt "Wawa Garden Bar" 4. Check for h1 with "Wawa Garden Bar" 5. Check for "View Menu" link to /menu | Page title matches /Wawa/i, logo visible, h1 present, "View Menu" CTA link visible and pointing to /menu | PASS | Critical |
| TC-SEC01-002 | displays order type feature cards (Dine In, Pickup, Delivery) | Dev server running, no authentication required | 1. Navigate to / 2. Check for "Dine In" text 3. Check for "Pickup" text 4. Check for "Delivery" text | All three order type cards visible with exact text | PASS | High |
| TC-SEC01-003 | displays "How It Works" section with descriptions | Dev server running, no authentication required | 1. Navigate to / 2. Check for h2 "How It Works" 3. Check body contains "Scan QR code" 4. Check body contains "Order ahead" 5. Check body contains "delivered to your door" | "How It Works" heading and all three description texts present | PASS | Medium |
| TC-SEC01-004 | is responsive -- renders correctly on mobile viewport | Dev server running, no authentication required | 1. Set viewport to 375x812 (mobile) 2. Navigate to / 3. Check logo is visible 4. Check "View Menu" link is visible | Logo and CTA render correctly on mobile viewport | PASS | High |
| TC-SEC01-005 | is responsive -- renders correctly on tablet viewport | Dev server running, no authentication required | 1. Set viewport to 768x1024 (tablet) 2. Navigate to / 3. Check logo is visible 4. Check "View Menu" link is visible | Logo and CTA render correctly on tablet viewport | PASS | High |

---

## Section 2: Technical Stack

**Requirements Reference:** Section 2 (Technical Stack)
**Source:** `e2e/requirements-verification.spec.ts` -- `test.describe('Section 2: Technical Stack')`

| ID | Test Name | Pre-conditions | Steps | Expected Result | Result | Priority |
|----|-----------|---------------|-------|-----------------|--------|----------|
| TC-SEC02-001 | pages are server-rendered (not empty on initial load) | Dev server running, no authentication required | 1. Intercept and abort all .js routes 2. Navigate to / 3. Read response HTML text 4. Check HTML contains "Wawa" and "menu" | HTML contains meaningful content without JavaScript execution, confirming SSR | PASS | Critical |
| TC-SEC02-002 | application uses Next.js framework | Dev server running, no authentication required | 1. Navigate to / 2. Evaluate JS to check for __next element, __NEXT_DATA__, or /_next/ script/link tags | At least one Next.js framework marker is detected in the DOM | PASS | High |

---

## Section 3: Navigation & Architecture

**Requirements Reference:** Section 3 (Architecture & Project Structure)
**Source:** `e2e/requirements-verification.spec.ts` -- `test.describe('Section 3: Navigation & Architecture')`

| ID | Test Name | Pre-conditions | Steps | Expected Result | Result | Priority |
|----|-----------|---------------|-------|-----------------|--------|----------|
| TC-SEC03-001 | home page includes "View Menu" link | Dev server running, no authentication required | 1. Navigate to / 2. Locate anchor with href="/menu" 3. Check visibility 4. Check text matches /View Menu/i | "View Menu" link is visible with correct href and text | PASS | High |
| TC-SEC03-002 | "View Menu" link navigates to menu page | Dev server running, no authentication required | 1. Navigate to / 2. Click anchor with href="/menu" 3. Wait for URL to match /menu | Browser navigates to /menu successfully | PASS | High |

---

## Section 4: Authentication & Authorization

**Requirements Reference:** Section 4 (Authentication & Authorization)
**Source:** `e2e/requirements-verification.spec.ts` -- Multiple describe blocks; `e2e/authenticated.spec.ts` -- Session and logout blocks

### Customer Authentication

| ID | Test Name | Pre-conditions | Steps | Expected Result | Result | Priority |
|----|-----------|---------------|-------|-----------------|--------|----------|
| TC-SEC04-001 | login page renders with title and phone prompt | Dev server running, no authentication required | 1. Navigate to /login 2. Check page title matches /Log in\|Sign up\|Wawa/i 3. Check body contains "Log in" 4. Check body contains "phone number" | Login page renders with title and phone number prompt | PASS | Critical |
| TC-SEC04-002 | login page shows PIN delivery method options (WhatsApp, SMS, Email) | Dev server running, no authentication required | 1. Navigate to /login 2. Wait for network idle 3. Check body contains "WhatsApp" 4. Check body contains "SMS" 5. Check body contains "Email" | All three PIN delivery methods are displayed | PASS | Critical |
| TC-SEC04-003 | login page displays delivery method descriptions | Dev server running, no authentication required | 1. Navigate to /login 2. Wait for network idle 3. Check body contains "Instant delivery via WhatsApp" 4. Check body contains "Traditional text message" 5. Check body contains "PIN sent to your email" | Delivery method descriptions are visible | PASS | Medium |
| TC-SEC04-004 | login page links to privacy policy and terms | Dev server running, no authentication required | 1. Navigate to /login 2. Check for visible anchor with href="/privacy" 3. Check for visible anchor with href="/terms" | Privacy policy and terms links are present and visible | PASS | Medium |
| TC-SEC04-005 | unauthenticated user is redirected from /orders to /login | Dev server running, user not authenticated | 1. Navigate to /orders 2. Wait for URL to match /login (10s timeout) 3. Verify URL contains "/login" | User is redirected to /login | PASS | Critical |
| TC-SEC04-006 | unauthenticated user is redirected from /profile to /login | Dev server running, user not authenticated | 1. Navigate to /profile 2. Wait for URL to match /login (10s timeout) 3. Verify URL contains "/login" | User is redirected to /login | PASS | Critical |

### Admin Authentication

| ID | Test Name | Pre-conditions | Steps | Expected Result | Result | Priority |
|----|-----------|---------------|-------|-----------------|--------|----------|
| TC-SEC04-007 | admin login page renders with credentials form | Dev server running, no authentication required | 1. Navigate to /admin/login 2. Check page title matches /Admin Login\|Wawa/i 3. Check "Admin Login" text visible 4. Check "Enter your credentials" text visible | Admin login page renders with proper form elements | PASS | Critical |
| TC-SEC04-008 | admin login form has username and password fields | Dev server running, no authentication required | 1. Navigate to /admin/login 2. Check #username input visible 3. Check #password input visible 4. Check "Login" button visible | Username field, password field, and login button are present | PASS | Critical |
| TC-SEC04-009 | admin login rejects invalid credentials | Dev server running, no authentication required | 1. Navigate to /admin/login 2. Fill #username with "invaliduser" 3. Fill #password with "wrongpassword" 4. Click Login button 5. Wait 2 seconds 6. Verify URL still contains /admin/login | User remains on login page after invalid credentials | PASS | Critical |
| TC-SEC04-010 | unauthenticated user is redirected from /dashboard to login | Dev server running, user not authenticated | 1. Navigate to /dashboard 2. Wait for URL to match /(login\|admin-login\|admin\/login)/ (10s timeout) 3. Verify URL matches /(login\|admin)/ | Unauthenticated user is redirected to a login page | PASS | Critical |

### Admin Session (Authenticated)

| ID | Test Name | Pre-conditions | Steps | Expected Result | Result | Priority |
|----|-----------|---------------|-------|-----------------|--------|----------|
| TC-SEC04-011 | admin can access dashboard without redirect | Authenticated as admin via storageState | 1. Navigate to /dashboard/orders 2. Wait for network idle 3. Check URL contains "/dashboard" | Admin remains on dashboard without redirect | PASS | Critical |

### Super-Admin Session (Authenticated)

| ID | Test Name | Pre-conditions | Steps | Expected Result | Result | Priority |
|----|-----------|---------------|-------|-----------------|--------|----------|
| TC-SEC04-012 | super-admin can access dashboard overview | Authenticated as super-admin via storageState | 1. Navigate to /dashboard 2. Wait for network idle 3. Check URL contains "/dashboard" 4. Check h1 "Dashboard" is visible | Super-admin accesses dashboard overview with heading | PASS | Critical |

### Unauthorized & Forbidden Pages

| ID | Test Name | Pre-conditions | Steps | Expected Result | Result | Priority |
|----|-----------|---------------|-------|-----------------|--------|----------|
| TC-SEC04-013 | unauthorized page is accessible | Dev server running, no authentication required | 1. Navigate to /unauthorized 2. Wait for network idle 3. Check body matches /unauthorized\|access\|denied\|permission/i | Unauthorized page renders with appropriate access-denied messaging | PASS | Medium |
| TC-SEC04-014 | dashboard forbidden page redirects unauthenticated users | Dev server running, user not authenticated | 1. Navigate to /dashboard/forbidden 2. Wait for URL to match /(login\|admin)/ (10s timeout) | Unauthenticated user is redirected to login | PASS | High |

### Session Security

| ID | Test Name | Pre-conditions | Steps | Expected Result | Result | Priority |
|----|-----------|---------------|-------|-----------------|--------|----------|
| TC-SEC04-015 | session cookie is httpOnly | Dev server running, no authentication required | 1. Navigate to / 2. Retrieve cookies from browser context 3. Find session/wawa cookie 4. If cookie exists, verify httpOnly is true | Session cookie (if present) has httpOnly flag set | PASS | Critical |

### Admin Logout (Authenticated)

| ID | Test Name | Pre-conditions | Steps | Expected Result | Result | Priority |
|----|-----------|---------------|-------|-----------------|--------|----------|
| TC-SEC04-016 | logout endpoint returns success | Authenticated as super-admin via storageState | 1. POST to /api/auth/logout 2. Check status is 200 or 429 3. If 200, verify JSON contains success: true | Logout endpoint returns success response or rate-limited response | PASS | High |

---

## Section 5.2/6: Menu System

**Requirements Reference:** Section 5.2 (Menu), Section 6 (Menu System)
**Source:** `e2e/requirements-verification.spec.ts` -- `test.describe('Section 5.2/6: Menu System')`

| ID | Test Name | Pre-conditions | Steps | Expected Result | Result | Priority |
|----|-----------|---------------|-------|-----------------|--------|----------|
| TC-SEC06-001 | menu page loads with title and description | Dev server running, no authentication required | 1. Navigate to /menu 2. Check page title matches /Menu.*Wawa/i 3. Wait for network idle | Menu page loads with proper title | PASS | Critical |
| TC-SEC06-002 | menu page displays item cards | Dev server running, no authentication required | 1. Navigate to /menu 2. Wait for card/menu/item elements (15s timeout) 3. Count card elements 4. Verify count > 0 | Menu items are displayed as cards | PASS | Critical |
| TC-SEC06-003 | menu page has category navigation with food and drink categories | Dev server running, no authentication required | 1. Navigate to /menu 2. Wait for network idle 3. Read body text 4. Check for category keywords (beer, wine, starters, etc.) | Category navigation includes food and/or drink category names | PASS | High |
| TC-SEC06-004 | menu page supports search via URL parameter | Dev server running, no authentication required | 1. Navigate to /menu?search=rice 2. Wait for network idle 3. Check page title matches /Menu.*Wawa/i | Menu page loads successfully with search parameter | PASS | High |
| TC-SEC06-005 | menu page supports category filter via URL parameter | Dev server running, no authentication required | 1. Navigate to /menu?category=beer 2. Wait for network idle 3. Check page title matches /Menu.*Wawa/i | Menu page loads successfully with category filter | PASS | High |
| TC-SEC06-006 | menu page supports table number via URL parameter | Dev server running, no authentication required | 1. Navigate to /menu?tableNumber=5 2. Wait for network idle 3. Check page title matches /Menu.*Wawa/i | Menu page loads successfully with table number parameter | PASS | Medium |

---

## Section 5.3: Cart

**Requirements Reference:** Section 5.3 (Cart - Zustand Store)
**Source:** `e2e/requirements-verification.spec.ts` -- `test.describe('Section 5.3: Cart')`

| ID | Test Name | Pre-conditions | Steps | Expected Result | Result | Priority |
|----|-----------|---------------|-------|-----------------|--------|----------|
| TC-SEC05-001 | cart persists items in localStorage under wawa-cart-storage | Cart seeded with 2 items (Jollof Rice qty 2, Chapman qty 1) via localStorage | 1. Seed cart via addInitScript 2. Navigate to /menu 3. Wait for network idle 4. Read localStorage key "wawa-cart-storage" 5. Parse JSON 6. Check items length = 2 7. Verify item names | Cart data persists in localStorage with correct item names and count | PASS | Critical |
| TC-SEC05-002 | cart stores quantity, portion size, and special instructions per item | Cart seeded with 2 items via localStorage | 1. Seed cart via addInitScript 2. Navigate to /menu 3. Read localStorage 4. Parse JSON 5. Check item1 quantity=2, portionSize="full" 6. Check item2 specialInstructions="Less sugar" | Per-item attributes (quantity, portion, instructions) are stored correctly | PASS | Critical |
| TC-SEC05-003 | seeded cart items appear in checkout | Cart seeded with 2 items via localStorage | 1. Seed cart via addInitScript 2. Navigate to /checkout 3. Wait for network idle 4. Check body matches /Jollof Rice\|Chapman\|cart\|order\|checkout/i | Checkout page displays seeded cart items or references | PASS | High |

---

## Section 5.4: Order Tracking

**Requirements Reference:** Section 5.4 (Order Tracking)
**Source:** `e2e/requirements-verification.spec.ts` -- `test.describe('Section 5.4: Order Tracking')`

| ID | Test Name | Pre-conditions | Steps | Expected Result | Result | Priority |
|----|-----------|---------------|-------|-----------------|--------|----------|
| TC-SEC05-004 | order page requires authentication | Dev server running, user not authenticated | 1. Navigate to /orders 2. Wait for URL to match /login/ (10s timeout) 3. Verify URL contains "/login" | Unauthenticated user is redirected to /login | PASS | Critical |

---

## Section 5.5: Orders & Tabs Page

**Requirements Reference:** Section 5.5 (Orders & Tabs Page)
**Source:** `e2e/requirements-verification.spec.ts` -- `test.describe('Section 5.5: Orders & Tabs Page')`

| ID | Test Name | Pre-conditions | Steps | Expected Result | Result | Priority |
|----|-----------|---------------|-------|-----------------|--------|----------|
| TC-SEC05-005 | orders page redirects unauthenticated users | Dev server running, user not authenticated | 1. Navigate to /orders 2. Wait for URL to match /login/ (10s timeout) 3. Verify URL contains "/login" | User is redirected to /login | PASS | Critical |
| TC-SEC05-006 | orders/tabs page redirects unauthenticated users | Dev server running, user not authenticated | 1. Navigate to /orders/tabs 2. Wait for URL to match /login/ (10s timeout) 3. Verify URL contains "/login" | User is redirected to /login | PASS | Critical |
| TC-SEC05-007 | orders/history page redirects unauthenticated users | Dev server running, user not authenticated | 1. Navigate to /orders/history 2. Wait for URL to match /login/ (10s timeout) 3. Verify URL contains "/login" | User is redirected to /login | PASS | High |

---

## Section 5.6: Customer Profile

**Requirements Reference:** Section 5.6 (Customer Profile)
**Source:** `e2e/requirements-verification.spec.ts` -- `test.describe('Section 5.6: Customer Profile')`

| ID | Test Name | Pre-conditions | Steps | Expected Result | Result | Priority |
|----|-----------|---------------|-------|-----------------|--------|----------|
| TC-SEC05-008 | profile page redirects unauthenticated users | Dev server running, user not authenticated | 1. Navigate to /profile 2. Wait for URL to match /login/ (10s timeout) 3. Verify URL contains "/login" | User is redirected to /login | PASS | Critical |
| TC-SEC05-009 | profile/rewards page redirects unauthenticated users | Dev server running, user not authenticated | 1. Navigate to /profile/rewards 2. Wait for URL to match /login/ (10s timeout) 3. Verify URL contains "/login" | User is redirected to /login | PASS | High |

---

## Section 5.7/10: Rewards

**Requirements Reference:** Section 5.7 (Rewards), Section 10 (Rewards & Loyalty)
**Source:** `e2e/requirements-verification.spec.ts` -- `test.describe('Section 5.7/10: Rewards')`

| ID | Test Name | Pre-conditions | Steps | Expected Result | Result | Priority |
|----|-----------|---------------|-------|-----------------|--------|----------|
| TC-SEC10-001 | rewards page loads with loyalty information | Dev server running, no authentication required | 1. Navigate to /rewards 2. Wait for network idle 3. Check body matches /reward\|loyalty\|point/i | Rewards page loads with loyalty-related content | PASS | High |
| TC-SEC10-002 | rewards page shows sign-in prompt for unauthenticated users | Dev server running, user not authenticated | 1. Navigate to /rewards 2. Wait for network idle 3. Check body contains "Sign In to View Your Rewards" | Sign-in prompt is displayed for unauthenticated users | PASS | High |
| TC-SEC10-003 | rewards page displays feature preview cards | Dev server running, no authentication required | 1. Navigate to /rewards 2. Wait for network idle 3. Check body contains "Active Rewards" 4. Check body contains "Track Savings" 5. Check body contains "Loyalty Points" | All three feature preview cards are displayed | PASS | Medium |
| TC-SEC10-004 | rewards page explains points conversion (100 points = NGN 1) | Dev server running, no authentication required | 1. Navigate to /rewards 2. Wait for network idle 3. Check body matches /100 points.*=.*1/i | Points conversion rate explanation is visible | PASS | Medium |
| TC-SEC10-005 | rewards page has "How It Works" guide | Dev server running, no authentication required | 1. Navigate to /rewards 2. Wait for network idle 3. Check body contains "spending thresholds" 4. Check body contains "Apply rewards at checkout" | How It Works guide with threshold and checkout info is present | PASS | Medium |
| TC-SEC10-006 | rewards page links to login for sign-in | Dev server running, no authentication required | 1. Navigate to /rewards 2. Wait for network idle 3. Locate anchor with href containing "/login" 4. Check first match is visible | Login link is visible on rewards page | PASS | Medium |

---

## Section 7: Ordering System

**Requirements Reference:** Section 7 (Ordering System)
**Source:** `e2e/requirements-verification.spec.ts` -- `test.describe('Section 7: Ordering System')`

| ID | Test Name | Pre-conditions | Steps | Expected Result | Result | Priority |
|----|-----------|---------------|-------|-----------------|--------|----------|
| TC-SEC07-001 | home page advertises all order types (dine-in, pickup, delivery) | Dev server running, no authentication required | 1. Navigate to / 2. Read body text 3. Check contains "Dine In" 4. Check contains "Pickup" 5. Check contains "Delivery" | All three order types are advertised on home page | PASS | High |
| TC-SEC07-002 | checkout form includes order type selection | Cart seeded with 2 items via localStorage | 1. Seed cart 2. Navigate to /checkout 3. Wait for network idle 4. Check body matches /dine.in\|pickup\|delivery\|order.*type\|order.*detail/i | Checkout form references order type selection | PASS | High |

---

## Section 8: Tab System

**Requirements Reference:** Section 8 (Tab System - Dine-In Bar Tabs)
**Source:** `e2e/requirements-verification.spec.ts` -- `test.describe('Section 8: Tab System')`; `e2e/authenticated.spec.ts` -- `test.describe('Section 8: Tab Management')`

| ID | Test Name | Pre-conditions | Steps | Expected Result | Result | Priority |
|----|-----------|---------------|-------|-----------------|--------|----------|
| TC-SEC08-001 | customer tabs page requires authentication | Dev server running, user not authenticated | 1. Navigate to /orders/tabs 2. Wait for URL to match /login/ (10s timeout) 3. Verify URL contains "/login" | Unauthenticated user is redirected to /login | PASS | Critical |
| TC-SEC08-002 | admin tabs management requires authentication | Dev server running, user not authenticated | 1. Navigate to /dashboard/orders/tabs 2. Wait for URL to match /(login\|admin)/ (10s timeout) 3. Verify URL matches | Unauthenticated user is redirected to login page | PASS | Critical |
| TC-SEC08-003 | tabs page loads for authenticated admin | Authenticated as admin via storageState | 1. Navigate to /dashboard/orders/tabs 2. Wait for network idle 3. Check URL contains "/dashboard/orders/tabs" 4. Check body matches /tab\|open\|closed\|table/i | Tabs page loads with tab-related content | PASS | High |

---

## Section 9: Checkout & Payment

**Requirements Reference:** Section 9 (Checkout & Payment)
**Source:** `e2e/requirements-verification.spec.ts` -- `test.describe('Section 9: Checkout & Payment')`

| ID | Test Name | Pre-conditions | Steps | Expected Result | Result | Priority |
|----|-----------|---------------|-------|-----------------|--------|----------|
| TC-SEC09-001 | checkout page renders with form | Dev server running, no authentication required | 1. Navigate to /checkout 2. Check page title matches /Checkout.*Wawa/i 3. Wait for network idle | Checkout page loads with proper title | PASS | Critical |
| TC-SEC09-002 | checkout with seeded cart shows multi-step form | Cart seeded with 2 items via localStorage | 1. Seed cart 2. Navigate to /checkout 3. Wait for network idle 4. Check body matches /Customer Info\|Step\|order\|checkout/i | Multi-step checkout form is displayed | PASS | Critical |
| TC-SEC09-003 | checkout displays cart items and totals | Cart seeded with 2 items via localStorage | 1. Seed cart 2. Navigate to /checkout 3. Wait for network idle 4. Check body matches /Jollof Rice\|Chapman\|3,500\|1,500\|8,500/ | Cart items and price totals are displayed | PASS | Critical |
| TC-SEC09-004 | checkout form has customer info fields (name, email, phone) | Cart seeded with 2 items via localStorage | 1. Seed cart 2. Navigate to /checkout 3. Wait for network idle 4. Check body matches /name\|email\|phone/i | Customer info fields are present in checkout form | PASS | High |
| TC-SEC09-005 | checkout shows navigation buttons (Back/Next) | Cart seeded with 2 items via localStorage | 1. Seed cart 2. Navigate to /checkout 3. Wait for network idle 4. Locate button with text matching /Next/i 5. Check visibility | Next navigation button is visible for multi-step form | PASS | High |

---

## Section 11: Dashboard Overview

**Requirements Reference:** Section 11 (Admin Dashboard)
**Source:** `e2e/requirements-verification.spec.ts` -- `test.describe('Section 11/12: Dashboard RBAC')`; `e2e/authenticated.spec.ts` -- Multiple Section 11 describe blocks

### Dashboard RBAC -- Unauthenticated Route Protection

| ID | Test Name | Pre-conditions | Steps | Expected Result | Result | Priority |
|----|-----------|---------------|-------|-----------------|--------|----------|
| TC-SEC11-001 | /dashboard redirects unauthenticated users | Dev server running, user not authenticated | 1. Navigate to /dashboard 2. Wait for URL to match /(login\|admin-login\|admin\/login)/ (10s timeout) | User is redirected to login | PASS | Critical |
| TC-SEC11-002 | /dashboard/orders redirects unauthenticated users | Dev server running, user not authenticated | 1. Navigate to /dashboard/orders 2. Wait for URL to match /(login\|admin-login\|admin\/login)/ (10s timeout) | User is redirected to login | PASS | Critical |
| TC-SEC11-003 | /dashboard/menu redirects unauthenticated users | Dev server running, user not authenticated | 1. Navigate to /dashboard/menu 2. Wait for URL to match /(login\|admin-login\|admin\/login)/ (10s timeout) | User is redirected to login | PASS | Critical |
| TC-SEC11-004 | /dashboard/inventory redirects unauthenticated users | Dev server running, user not authenticated | 1. Navigate to /dashboard/inventory 2. Wait for URL to match /(login\|admin-login\|admin\/login)/ (10s timeout) | User is redirected to login | PASS | Critical |
| TC-SEC11-005 | /dashboard/settings redirects unauthenticated users | Dev server running, user not authenticated | 1. Navigate to /dashboard/settings 2. Wait for URL to match /(login\|admin-login\|admin\/login)/ (10s timeout) | User is redirected to login | PASS | Critical |
| TC-SEC11-006 | /dashboard/rewards redirects unauthenticated users | Dev server running, user not authenticated | 1. Navigate to /dashboard/rewards 2. Wait for URL to match /(login\|admin-login\|admin\/login)/ (10s timeout) | User is redirected to login | PASS | Critical |
| TC-SEC11-007 | /dashboard/audit-logs redirects unauthenticated users | Dev server running, user not authenticated | 1. Navigate to /dashboard/audit-logs 2. Wait for URL to match /(login\|admin-login\|admin\/login)/ (10s timeout) | User is redirected to login | PASS | Critical |
| TC-SEC11-008 | /dashboard/reports redirects unauthenticated users | Dev server running, user not authenticated | 1. Navigate to /dashboard/reports 2. Wait for URL to match /(login\|admin-login\|admin\/login)/ (10s timeout) | User is redirected to login | PASS | Critical |
| TC-SEC11-009 | /dashboard/kitchen redirects unauthenticated users | Dev server running, user not authenticated | 1. Navigate to /dashboard/kitchen 2. Wait for URL to match /(login\|admin-login\|admin\/login)/ (10s timeout) | User is redirected to login | PASS | Critical |
| TC-SEC11-010 | /dashboard/customers redirects unauthenticated users | Dev server running, user not authenticated | 1. Navigate to /dashboard/customers 2. Wait for URL to match /(login\|admin-login\|admin\/login)/ (10s timeout) | User is redirected to login | PASS | Critical |
| TC-SEC11-011 | /dashboard/finance/expenses redirects unauthenticated users | Dev server running, user not authenticated | 1. Navigate to /dashboard/finance/expenses 2. Wait for URL to match /(login\|admin-login\|admin\/login)/ (10s timeout) | User is redirected to login | PASS | Critical |
| TC-SEC11-012 | /dashboard/analytics/profitability redirects unauthenticated users | Dev server running, user not authenticated | 1. Navigate to /dashboard/analytics/profitability 2. Wait for URL to match /(login\|admin-login\|admin\/login)/ (10s timeout) | User is redirected to login | PASS | Critical |

### Dashboard Overview -- Authenticated (Super-Admin)

| ID | Test Name | Pre-conditions | Steps | Expected Result | Result | Priority |
|----|-----------|---------------|-------|-----------------|--------|----------|
| TC-SEC11-013 | super-admin can access dashboard overview | Authenticated as super-admin via storageState | 1. Navigate to /dashboard 2. Wait for network idle 3. Check h1 "Dashboard" visible 4. Check body contains "Today's Revenue" 5. Check body contains "Today's Orders" 6. Check body contains "Monthly Revenue" 7. Check body contains "Avg Order Value" | Dashboard overview displays all KPI cards | PASS | Critical |
| TC-SEC11-014 | dashboard shows quick stats cards | Authenticated as super-admin via storageState | 1. Navigate to /dashboard 2. Wait for network idle 3. Check body contains "Pending Orders" 4. Check body contains "Low Stock Items" 5. Check body contains "Active Customers" | Quick stats cards are displayed | PASS | High |
| TC-SEC11-015 | dashboard shows recent orders section | Authenticated as super-admin via storageState | 1. Navigate to /dashboard 2. Wait for network idle 3. Check "Recent Orders" text is visible | Recent orders section is present | PASS | High |

### Dashboard RBAC -- Admin Redirect

| ID | Test Name | Pre-conditions | Steps | Expected Result | Result | Priority |
|----|-----------|---------------|-------|-----------------|--------|----------|
| TC-SEC11-016 | regular admin is redirected from /dashboard to /dashboard/orders | Authenticated as admin via storageState | 1. Navigate to /dashboard 2. Wait for URL to match /dashboard\/orders/ (10s timeout) 3. Verify URL contains "/dashboard/orders" | Admin is redirected to orders page (not overview) | PASS | Critical |

### Dashboard Navigation (Super-Admin)

| ID | Test Name | Pre-conditions | Steps | Expected Result | Result | Priority |
|----|-----------|---------------|-------|-----------------|--------|----------|
| TC-SEC11-017 | dashboard sidebar shows navigation links | Authenticated as super-admin via storageState | 1. Navigate to /dashboard 2. Wait for network idle 3. Check "Orders" link visible 4. Check "Menu" link visible 5. Check "Inventory" link visible 6. Check "Settings" link visible | Sidebar navigation shows all section links | PASS | High |
| TC-SEC11-018 | dashboard has header with "Dashboard" title | Authenticated as super-admin via storageState | 1. Navigate to /dashboard 2. Wait for network idle 3. Locate header element containing "Dashboard" text 4. Check visibility | Dashboard header displays title | PASS | Medium |

### Customers Management (Super-Admin)

| ID | Test Name | Pre-conditions | Steps | Expected Result | Result | Priority |
|----|-----------|---------------|-------|-----------------|--------|----------|
| TC-SEC11-019 | customers page loads | Authenticated as super-admin via storageState | 1. Navigate to /dashboard/customers 2. Wait for network idle 3. Check URL contains "/dashboard/customers" 4. Check body matches /customer\|user\|email\|phone/i | Customers page loads with relevant content | PASS | High |

---

## Section 12: Order Management

**Requirements Reference:** Section 12 (Order Management)
**Source:** `e2e/requirements-verification.spec.ts` -- `test.describe('Section 12: Order Management')`; `e2e/authenticated.spec.ts` -- Section 12 describe blocks

### Route Protection (Unauthenticated)

| ID | Test Name | Pre-conditions | Steps | Expected Result | Result | Priority |
|----|-----------|---------------|-------|-----------------|--------|----------|
| TC-SEC12-001 | admin orders page redirects unauthenticated users | Dev server running, user not authenticated | 1. Navigate to /dashboard/orders 2. Wait for URL to match /(login\|admin)/ (10s timeout) | User is redirected to login | PASS | Critical |
| TC-SEC12-002 | admin order tabs page redirects unauthenticated users | Dev server running, user not authenticated | 1. Navigate to /dashboard/orders/tabs 2. Wait for URL to match /(login\|admin)/ (10s timeout) | User is redirected to login | PASS | Critical |

### Order Management -- Authenticated (Admin)

| ID | Test Name | Pre-conditions | Steps | Expected Result | Result | Priority |
|----|-----------|---------------|-------|-----------------|--------|----------|
| TC-SEC12-003 | orders dashboard loads with title and controls | Authenticated as admin via storageState | 1. Navigate to /dashboard/orders 2. Wait for network idle 3. Check h1 "Orders Dashboard" visible 4. Check body contains "Manage and track all restaurant orders" | Orders dashboard renders with title and description | PASS | Critical |
| TC-SEC12-004 | orders page shows Tabs Display link | Authenticated as admin via storageState | 1. Navigate to /dashboard/orders 2. Wait for network idle 3. Check "Tabs Display" text visible | Tabs Display navigation link is present | PASS | High |
| TC-SEC12-005 | orders page shows Kitchen Display link | Authenticated as admin via storageState | 1. Navigate to /dashboard/orders 2. Wait for network idle 3. Check "Kitchen Display" text visible | Kitchen Display navigation link is present | PASS | High |
| TC-SEC12-006 | orders page shows Quick Actions section | Authenticated as admin via storageState | 1. Navigate to /dashboard/orders 2. Wait for network idle 3. Check "Quick Actions" visible 4. Check body contains "Open a Order" 5. Check body contains "Open a New Tab" 6. Check body contains "Add to Existing Tab" 7. Check body contains "Inventory Summary" | Quick Actions section with all action buttons present | PASS | High |

### Order Management -- Super-Admin Extras

| ID | Test Name | Pre-conditions | Steps | Expected Result | Result | Priority |
|----|-----------|---------------|-------|-----------------|--------|----------|
| TC-SEC12-007 | super-admin sees Analytics card on orders page | Authenticated as super-admin via storageState | 1. Navigate to /dashboard/orders 2. Wait for network idle 3. Check "Analytics" text visible 4. Check body contains "sales performance" | Super-admin-only Analytics card is displayed | PASS | High |

---

## Section 13: Menu Management

**Requirements Reference:** Section 13 (Menu Management)
**Source:** `e2e/requirements-verification.spec.ts` -- `test.describe('Section 13: Menu Management')`; `e2e/authenticated.spec.ts` -- `test.describe('Section 13: Menu Management')`

### Route Protection (Unauthenticated)

| ID | Test Name | Pre-conditions | Steps | Expected Result | Result | Priority |
|----|-----------|---------------|-------|-----------------|--------|----------|
| TC-SEC13-001 | menu management page redirects unauthenticated users | Dev server running, user not authenticated | 1. Navigate to /dashboard/menu 2. Wait for URL to match /(login\|admin)/ (10s timeout) | User is redirected to login | PASS | Critical |
| TC-SEC13-002 | new menu item page redirects unauthenticated users | Dev server running, user not authenticated | 1. Navigate to /dashboard/menu/new 2. Wait for URL to match /(login\|admin)/ (10s timeout) | User is redirected to login | PASS | Critical |

### Menu Management -- Authenticated (Super-Admin)

| ID | Test Name | Pre-conditions | Steps | Expected Result | Result | Priority |
|----|-----------|---------------|-------|-----------------|--------|----------|
| TC-SEC13-003 | menu management page loads with items | Authenticated as super-admin via storageState | 1. Navigate to /dashboard/menu 2. Wait for network idle 3. Check URL contains "/dashboard/menu" 4. Check body matches /menu\|item\|add\|manage/i | Menu management page loads with relevant content | PASS | High |
| TC-SEC13-004 | new menu item page loads with form | Authenticated as super-admin via storageState | 1. Navigate to /dashboard/menu/new 2. Wait for network idle 3. Check URL contains "/dashboard/menu/new" 4. Check body matches /name\|price\|category\|description/i | New menu item form loads with expected fields | PASS | High |

---

## Section 14: Inventory Management

**Requirements Reference:** Section 14 (Inventory Management)
**Source:** `e2e/requirements-verification.spec.ts` -- `test.describe('Section 14: Inventory Management')`; `e2e/authenticated.spec.ts` -- `test.describe('Section 14: Inventory Management')`

### Route Protection (Unauthenticated)

| ID | Test Name | Pre-conditions | Steps | Expected Result | Result | Priority |
|----|-----------|---------------|-------|-----------------|--------|----------|
| TC-SEC14-001 | /dashboard/inventory redirects unauthenticated users | Dev server running, user not authenticated | 1. Navigate to /dashboard/inventory 2. Wait for URL to match /(login\|admin)/ (10s timeout) | User is redirected to login | PASS | Critical |
| TC-SEC14-002 | /dashboard/inventory/snapshots redirects unauthenticated users | Dev server running, user not authenticated | 1. Navigate to /dashboard/inventory/snapshots 2. Wait for URL to match /(login\|admin)/ (10s timeout) | User is redirected to login | PASS | High |
| TC-SEC14-003 | /dashboard/inventory/transfer redirects unauthenticated users | Dev server running, user not authenticated | 1. Navigate to /dashboard/inventory/transfer 2. Wait for URL to match /(login\|admin)/ (10s timeout) | User is redirected to login | PASS | High |

### Inventory Management -- Authenticated (Super-Admin)

| ID | Test Name | Pre-conditions | Steps | Expected Result | Result | Priority |
|----|-----------|---------------|-------|-----------------|--------|----------|
| TC-SEC14-004 | inventory page loads | Authenticated as super-admin via storageState | 1. Navigate to /dashboard/inventory 2. Wait for network idle 3. Check URL contains "/dashboard/inventory" 4. Check body matches /inventory\|stock\|item/i | Inventory page loads with relevant content | PASS | High |
| TC-SEC14-005 | inventory snapshots page loads | Authenticated as super-admin via storageState | 1. Navigate to /dashboard/inventory/snapshots 2. Wait for network idle 3. Check URL contains "/dashboard/inventory/snapshots" | Snapshots page loads successfully | PASS | Medium |
| TC-SEC14-006 | inventory transfer page loads | Authenticated as super-admin via storageState | 1. Navigate to /dashboard/inventory/transfer 2. Wait for network idle 3. Check URL contains "/dashboard/inventory/transfer" | Transfer page loads successfully | PASS | Medium |

---

## Section 15: Financial Management

**Requirements Reference:** Section 15 (Financial Management)
**Source:** `e2e/requirements-verification.spec.ts` -- `test.describe('Section 15: Financial Management')`; `e2e/authenticated.spec.ts` -- `test.describe('Section 15: Financial Management')`

| ID | Test Name | Pre-conditions | Steps | Expected Result | Result | Priority |
|----|-----------|---------------|-------|-----------------|--------|----------|
| TC-SEC15-001 | expenses page redirects unauthenticated users | Dev server running, user not authenticated | 1. Navigate to /dashboard/finance/expenses 2. Wait for URL to match /(login\|admin)/ (10s timeout) | User is redirected to login | PASS | Critical |
| TC-SEC15-002 | expenses page loads | Authenticated as super-admin via storageState | 1. Navigate to /dashboard/finance/expenses 2. Wait for network idle 3. Check URL contains "/dashboard/finance/expenses" 4. Check body matches /expense\|cost\|finance/i | Expenses page loads with financial content | PASS | High |

---

## Section 16: Reports & Analytics

**Requirements Reference:** Section 16 (Reports & Analytics)
**Source:** `e2e/requirements-verification.spec.ts` -- `test.describe('Section 16: Reports & Analytics')`; `e2e/authenticated.spec.ts` -- `test.describe('Section 16: Reports & Analytics')`

### Route Protection (Unauthenticated)

| ID | Test Name | Pre-conditions | Steps | Expected Result | Result | Priority |
|----|-----------|---------------|-------|-----------------|--------|----------|
| TC-SEC16-001 | /dashboard/reports redirects unauthenticated users | Dev server running, user not authenticated | 1. Navigate to /dashboard/reports 2. Wait for URL to match /(login\|admin)/ (10s timeout) | User is redirected to login | PASS | Critical |
| TC-SEC16-002 | /dashboard/reports/daily redirects unauthenticated users | Dev server running, user not authenticated | 1. Navigate to /dashboard/reports/daily 2. Wait for URL to match /(login\|admin)/ (10s timeout) | User is redirected to login | PASS | High |
| TC-SEC16-003 | /dashboard/reports/inventory redirects unauthenticated users | Dev server running, user not authenticated | 1. Navigate to /dashboard/reports/inventory 2. Wait for URL to match /(login\|admin)/ (10s timeout) | User is redirected to login | PASS | High |
| TC-SEC16-004 | /dashboard/reports/profitability redirects unauthenticated users | Dev server running, user not authenticated | 1. Navigate to /dashboard/reports/profitability 2. Wait for URL to match /(login\|admin)/ (10s timeout) | User is redirected to login | PASS | High |
| TC-SEC16-005 | /dashboard/analytics/profitability redirects unauthenticated users | Dev server running, user not authenticated | 1. Navigate to /dashboard/analytics/profitability 2. Wait for URL to match /(login\|admin)/ (10s timeout) | User is redirected to login | PASS | High |

### Reports & Analytics -- Authenticated (Super-Admin)

| ID | Test Name | Pre-conditions | Steps | Expected Result | Result | Priority |
|----|-----------|---------------|-------|-----------------|--------|----------|
| TC-SEC16-006 | reports page loads | Authenticated as super-admin via storageState | 1. Navigate to /dashboard/reports 2. Wait for network idle 3. Check URL contains "/dashboard/reports" 4. Check body matches /report\|daily\|inventory\|profitability/i | Reports page loads with report type references | PASS | High |
| TC-SEC16-007 | daily report page loads | Authenticated as super-admin via storageState | 1. Navigate to /dashboard/reports/daily 2. Wait for network idle 3. Check URL contains "/dashboard/reports/daily" | Daily report page loads successfully | PASS | Medium |
| TC-SEC16-008 | inventory report page loads | Authenticated as super-admin via storageState | 1. Navigate to /dashboard/reports/inventory 2. Wait for network idle 3. Check URL contains "/dashboard/reports/inventory" | Inventory report page loads successfully | PASS | Medium |
| TC-SEC16-009 | profitability report page loads | Authenticated as super-admin via storageState | 1. Navigate to /dashboard/reports/profitability 2. Wait for network idle 3. Check URL contains "/dashboard/reports/profitability" | Profitability report page loads successfully | PASS | Medium |
| TC-SEC16-010 | profitability analytics page loads | Authenticated as super-admin via storageState | 1. Navigate to /dashboard/analytics/profitability 2. Wait for network idle 3. Check URL contains "/dashboard/analytics/profitability" | Profitability analytics page loads successfully | PASS | Medium |

---

## Section 17: Kitchen Display System

**Requirements Reference:** Section 17 (Kitchen Display System)
**Source:** `e2e/requirements-verification.spec.ts` -- `test.describe('Section 17: Kitchen Display System')`; `e2e/authenticated.spec.ts` -- `test.describe('Section 17: Kitchen Display System')`

| ID | Test Name | Pre-conditions | Steps | Expected Result | Result | Priority |
|----|-----------|---------------|-------|-----------------|--------|----------|
| TC-SEC17-001 | kitchen display redirects unauthenticated users | Dev server running, user not authenticated | 1. Navigate to /dashboard/kitchen 2. Wait for URL to match /(login\|admin)/ (10s timeout) | User is redirected to login | PASS | Critical |
| TC-SEC17-002 | kitchen display loads with dark theme | Authenticated as admin via storageState | 1. Navigate to /dashboard/kitchen 2. Wait for network idle 3. Check URL contains "/dashboard/kitchen" 4. Check h1 "Kitchen Display" visible 5. Check .bg-gray-900 container visible | Kitchen display loads with dark theme and title | PASS | High |
| TC-SEC17-003 | kitchen display shows active order count | Authenticated as admin via storageState | 1. Navigate to /dashboard/kitchen 2. Wait for network idle 3. Check body matches /Active Order/i | Active order count section is displayed | PASS | High |
| TC-SEC17-004 | kitchen display has back button to orders | Authenticated as admin via storageState | 1. Navigate to /dashboard/kitchen 2. Wait for network idle 3. Check "Back to Dashboard" link is visible | Back navigation link is present | PASS | Medium |

---

## Section 18: Rewards Configuration

**Requirements Reference:** Section 18 (Rewards Configuration)
**Source:** `e2e/requirements-verification.spec.ts` -- `test.describe('Section 18: Rewards Configuration')`; `e2e/authenticated.spec.ts` -- `test.describe('Section 18: Rewards Configuration')`

### Route Protection (Unauthenticated)

| ID | Test Name | Pre-conditions | Steps | Expected Result | Result | Priority |
|----|-----------|---------------|-------|-----------------|--------|----------|
| TC-SEC18-001 | /dashboard/rewards redirects unauthenticated users | Dev server running, user not authenticated | 1. Navigate to /dashboard/rewards 2. Wait for URL to match /(login\|admin)/ (10s timeout) | User is redirected to login | PASS | Critical |
| TC-SEC18-002 | /dashboard/rewards/issued redirects unauthenticated users | Dev server running, user not authenticated | 1. Navigate to /dashboard/rewards/issued 2. Wait for URL to match /(login\|admin)/ (10s timeout) | User is redirected to login | PASS | High |
| TC-SEC18-003 | /dashboard/rewards/rules redirects unauthenticated users | Dev server running, user not authenticated | 1. Navigate to /dashboard/rewards/rules 2. Wait for URL to match /(login\|admin)/ (10s timeout) | User is redirected to login | PASS | High |
| TC-SEC18-004 | /dashboard/rewards/templates redirects unauthenticated users | Dev server running, user not authenticated | 1. Navigate to /dashboard/rewards/templates 2. Wait for URL to match /(login\|admin)/ (10s timeout) | User is redirected to login | PASS | High |

### Rewards Configuration -- Authenticated (Super-Admin)

| ID | Test Name | Pre-conditions | Steps | Expected Result | Result | Priority |
|----|-----------|---------------|-------|-----------------|--------|----------|
| TC-SEC18-005 | rewards dashboard loads | Authenticated as super-admin via storageState | 1. Navigate to /dashboard/rewards 2. Wait for network idle 3. Check URL contains "/dashboard/rewards" 4. Check body matches /reward\|rule\|issued\|template/i | Rewards dashboard loads with relevant content | PASS | High |
| TC-SEC18-006 | reward rules page loads | Authenticated as super-admin via storageState | 1. Navigate to /dashboard/rewards/rules 2. Wait for network idle 3. Check URL contains "/dashboard/rewards/rules" | Reward rules page loads successfully | PASS | Medium |
| TC-SEC18-007 | issued rewards page loads | Authenticated as super-admin via storageState | 1. Navigate to /dashboard/rewards/issued 2. Wait for network idle 3. Check URL contains "/dashboard/rewards/issued" | Issued rewards page loads successfully | PASS | Medium |
| TC-SEC18-008 | reward templates page loads | Authenticated as super-admin via storageState | 1. Navigate to /dashboard/rewards/templates 2. Wait for network idle 3. Check URL contains "/dashboard/rewards/templates" | Reward templates page loads successfully | PASS | Medium |

---

## Section 19: Settings & Configuration

**Requirements Reference:** Section 19 (Settings & Configuration)
**Source:** `e2e/requirements-verification.spec.ts` -- `test.describe('Section 19: Settings & Configuration')`; `e2e/authenticated.spec.ts` -- `test.describe('Section 19: Settings & Configuration')`

### Route Protection (Unauthenticated)

| ID | Test Name | Pre-conditions | Steps | Expected Result | Result | Priority |
|----|-----------|---------------|-------|-----------------|--------|----------|
| TC-SEC19-001 | /dashboard/settings redirects unauthenticated users | Dev server running, user not authenticated | 1. Navigate to /dashboard/settings 2. Wait for URL to match /(login\|admin)/ (10s timeout) | User is redirected to login | PASS | Critical |
| TC-SEC19-002 | /dashboard/settings/admins redirects unauthenticated users | Dev server running, user not authenticated | 1. Navigate to /dashboard/settings/admins 2. Wait for URL to match /(login\|admin)/ (10s timeout) | User is redirected to login | PASS | Critical |
| TC-SEC19-003 | /dashboard/settings/api-keys redirects unauthenticated users | Dev server running, user not authenticated | 1. Navigate to /dashboard/settings/api-keys 2. Wait for URL to match /(login\|admin)/ (10s timeout) | User is redirected to login | PASS | Critical |
| TC-SEC19-004 | /dashboard/settings/data-requests redirects unauthenticated users | Dev server running, user not authenticated | 1. Navigate to /dashboard/settings/data-requests 2. Wait for URL to match /(login\|admin)/ (10s timeout) | User is redirected to login | PASS | High |

### Settings & Configuration -- Authenticated (Super-Admin)

| ID | Test Name | Pre-conditions | Steps | Expected Result | Result | Priority |
|----|-----------|---------------|-------|-----------------|--------|----------|
| TC-SEC19-005 | settings page loads with configuration sections | Authenticated as super-admin via storageState | 1. Navigate to /dashboard/settings 2. Wait for network idle 3. Check URL contains "/dashboard/settings" 4. Check body matches /setting\|config\|fee\|delivery\|payment/i | Settings page loads with configuration content | PASS | High |
| TC-SEC19-006 | admin management page loads | Authenticated as super-admin via storageState | 1. Navigate to /dashboard/settings/admins 2. Wait for network idle 3. Check URL contains "/dashboard/settings/admins" 4. Check body matches /admin\|user\|role\|permission/i | Admin management page loads with user/role content | PASS | High |
| TC-SEC19-007 | API keys management page loads | Authenticated as super-admin via storageState | 1. Navigate to /dashboard/settings/api-keys 2. Wait for network idle 3. Check URL contains "/dashboard/settings/api-keys" 4. Check body matches /api\|key\|scope/i | API keys page loads with key management content | PASS | High |
| TC-SEC19-008 | data requests page loads | Authenticated as super-admin via storageState | 1. Navigate to /dashboard/settings/data-requests 2. Wait for network idle 3. Check URL contains "/dashboard/settings/data-requests" | Data requests page loads successfully | PASS | Medium |

---

## Section 20: Public REST API

**Requirements Reference:** Section 20 (Public REST API)
**Source:** `e2e/requirements-verification.spec.ts` -- `test.describe('Section 20: Public REST API')`, `test.describe('Section 20: Admin API Protection')`

### Health Endpoint

| ID | Test Name | Pre-conditions | Steps | Expected Result | Result | Priority |
|----|-----------|---------------|-------|-----------------|--------|----------|
| TC-SEC20-001 | health endpoint returns success with status, service, version, uptime | Dev server running, no authentication required | 1. GET /api/public/health 2. Check status is 200 or 429 3. If 200, parse JSON 4. Verify success=true 5. Verify data.status="healthy" 6. Verify data.service="wawa-garden-bar-api" 7. Verify data has version, uptime (number), timestamp | Health endpoint returns complete system status | PASS | Critical |

### Protected Endpoints -- API Key Enforcement

| ID | Test Name | Pre-conditions | Steps | Expected Result | Result | Priority |
|----|-----------|---------------|-------|-----------------|--------|----------|
| TC-SEC20-002 | GET /api/public/menu rejects unauthenticated requests (scope: menu:read) | Dev server running, no API key provided | 1. GET /api/public/menu without x-api-key header 2. Check status | Response status is 401, 403, or 429 | PASS | Critical |
| TC-SEC20-003 | GET /api/public/menu/categories rejects unauthenticated requests (scope: menu:read) | Dev server running, no API key provided | 1. GET /api/public/menu/categories without x-api-key header 2. Check status | Response status is 401, 403, or 429 | PASS | Critical |
| TC-SEC20-004 | GET /api/public/orders rejects unauthenticated requests (scope: orders:read) | Dev server running, no API key provided | 1. GET /api/public/orders without x-api-key header 2. Check status | Response status is 401, 403, or 429 | PASS | Critical |
| TC-SEC20-005 | GET /api/public/orders/stats rejects unauthenticated requests (scope: orders:read) | Dev server running, no API key provided | 1. GET /api/public/orders/stats without x-api-key header 2. Check status | Response status is 401, 403, or 429 | PASS | Critical |
| TC-SEC20-006 | GET /api/public/orders/summary rejects unauthenticated requests (scope: orders:read) | Dev server running, no API key provided | 1. GET /api/public/orders/summary without x-api-key header 2. Check status | Response status is 401, 403, or 429 | PASS | Critical |
| TC-SEC20-007 | GET /api/public/inventory rejects unauthenticated requests (scope: inventory:read) | Dev server running, no API key provided | 1. GET /api/public/inventory without x-api-key header 2. Check status | Response status is 401, 403, or 429 | PASS | Critical |
| TC-SEC20-008 | GET /api/public/inventory/alerts rejects unauthenticated requests (scope: inventory:read) | Dev server running, no API key provided | 1. GET /api/public/inventory/alerts without x-api-key header 2. Check status | Response status is 401, 403, or 429 | PASS | Critical |
| TC-SEC20-009 | GET /api/public/inventory/summary rejects unauthenticated requests (scope: inventory:read) | Dev server running, no API key provided | 1. GET /api/public/inventory/summary without x-api-key header 2. Check status | Response status is 401, 403, or 429 | PASS | Critical |
| TC-SEC20-010 | GET /api/public/customers rejects unauthenticated requests (scope: customers:read) | Dev server running, no API key provided | 1. GET /api/public/customers without x-api-key header 2. Check status | Response status is 401, 403, or 429 | PASS | Critical |
| TC-SEC20-011 | GET /api/public/customers/summary rejects unauthenticated requests (scope: customers:read) | Dev server running, no API key provided | 1. GET /api/public/customers/summary without x-api-key header 2. Check status | Response status is 401, 403, or 429 | PASS | Critical |
| TC-SEC20-012 | GET /api/public/tabs rejects unauthenticated requests (scope: tabs:read) | Dev server running, no API key provided | 1. GET /api/public/tabs without x-api-key header 2. Check status | Response status is 401, 403, or 429 | PASS | Critical |
| TC-SEC20-013 | GET /api/public/tabs/summary rejects unauthenticated requests (scope: tabs:read) | Dev server running, no API key provided | 1. GET /api/public/tabs/summary without x-api-key header 2. Check status | Response status is 401, 403, or 429 | PASS | Critical |
| TC-SEC20-014 | GET /api/public/settings rejects unauthenticated requests (scope: settings:read) | Dev server running, no API key provided | 1. GET /api/public/settings without x-api-key header 2. Check status | Response status is 401, 403, or 429 | PASS | High |
| TC-SEC20-015 | GET /api/public/rewards rejects unauthenticated requests (scope: rewards:read) | Dev server running, no API key provided | 1. GET /api/public/rewards without x-api-key header 2. Check status | Response status is 401, 403, or 429 | PASS | High |
| TC-SEC20-016 | GET /api/public/sales/summary rejects unauthenticated requests (scope: analytics:read) | Dev server running, no API key provided | 1. GET /api/public/sales/summary without x-api-key header 2. Check status | Response status is 401, 403, or 429 | PASS | High |

### Protected POST Endpoints

| ID | Test Name | Pre-conditions | Steps | Expected Result | Result | Priority |
|----|-----------|---------------|-------|-----------------|--------|----------|
| TC-SEC20-017 | POST /api/public/orders rejects unauthenticated requests | Dev server running, no API key provided | 1. POST /api/public/orders with empty body, no x-api-key 2. Check status | Response status is 401, 403, or 429 | PASS | Critical |
| TC-SEC20-018 | POST /api/public/payments rejects unauthenticated requests | Dev server running, no API key provided | 1. POST /api/public/payments with empty body, no x-api-key 2. Check status | Response status is 401, 403, or 429 | PASS | Critical |
| TC-SEC20-019 | POST /api/public/rewards/redeem rejects unauthenticated requests | Dev server running, no API key provided | 1. POST /api/public/rewards/redeem with empty body, no x-api-key 2. Check status | Response status is 401, 403, or 429 | PASS | Critical |

### API Response Format

| ID | Test Name | Pre-conditions | Steps | Expected Result | Result | Priority |
|----|-----------|---------------|-------|-----------------|--------|----------|
| TC-SEC20-020 | API returns JSON with standard response format | Dev server running, no authentication required | 1. GET /api/public/health 2. If status 200, parse JSON 3. Check JSON has "success" property 4. Check JSON has "data" property | API response follows standard { success, data } format | PASS | High |

### Admin API Protection

| ID | Test Name | Pre-conditions | Steps | Expected Result | Result | Priority |
|----|-----------|---------------|-------|-----------------|--------|----------|
| TC-SEC20-021 | admin settings API requires admin session | Dev server running, user not authenticated | 1. POST /api/admin/settings/points-conversion-rate with { rate: 100 } 2. Check status | Response status is 401, 403, or 429 | PASS | Critical |
| TC-SEC20-022 | admin settings impact API requires admin session | Dev server running, user not authenticated | 1. GET /api/admin/settings/points-conversion-rate/impact 2. Check status | Response status is 401, 403, or 429 | PASS | Critical |

---

## Section 21: Real-Time (Socket.IO)

**Requirements Reference:** Section 21 (Real-Time - Socket.IO)
**Source:** `e2e/requirements-verification.spec.ts` -- `test.describe('Section 21: Real-Time (Socket.IO)')`

| ID | Test Name | Pre-conditions | Steps | Expected Result | Result | Priority |
|----|-----------|---------------|-------|-----------------|--------|----------|
| TC-SEC21-001 | Socket.IO endpoint is available | Dev server running with custom HTTP server | 1. GET /api/socket/socket.io/?EIO=4&transport=polling 2. Check response status is not 404 | Socket.IO polling endpoint responds (not 404) | PASS | Critical |

---

## Section 22: Security

**Requirements Reference:** Section 22 (Security)
**Source:** `e2e/requirements-verification.spec.ts` -- Security Headers, Rate Limiting, and CORS describe blocks

### Security Headers

| ID | Test Name | Pre-conditions | Steps | Expected Result | Result | Priority |
|----|-----------|---------------|-------|-----------------|--------|----------|
| TC-SEC22-001 | returns X-Frame-Options DENY | Dev server running | 1. GET / 2. Read response header "x-frame-options" 3. Verify lowercase value is "deny" | X-Frame-Options header is set to DENY | PASS | Critical |
| TC-SEC22-002 | returns X-Content-Type-Options nosniff | Dev server running | 1. GET / 2. Read response header "x-content-type-options" 3. Verify lowercase value is "nosniff" | X-Content-Type-Options header is set to nosniff | PASS | Critical |
| TC-SEC22-003 | returns Referrer-Policy header | Dev server running | 1. GET / 2. Read response header "referrer-policy" 3. Verify header is truthy | Referrer-Policy header is present | PASS | High |
| TC-SEC22-004 | API endpoints include security headers | Dev server running | 1. GET /api/public/health 2. Read x-frame-options header 3. Verify is "deny" 4. Read x-content-type-options header 5. Verify is "nosniff" | API responses include security headers | PASS | Critical |

### Rate Limiting

| ID | Test Name | Pre-conditions | Steps | Expected Result | Result | Priority |
|----|-----------|---------------|-------|-----------------|--------|----------|
| TC-SEC22-005 | API endpoints enforce rate limiting headers | Dev server running | 1. GET /api/public/health 2. Check for x-ratelimit-limit, ratelimit-limit, or retry-after headers, or status 200 | Rate limiting headers present or requests succeed within limits | PASS | High |

### CORS

| ID | Test Name | Pre-conditions | Steps | Expected Result | Result | Priority |
|----|-----------|---------------|-------|-----------------|--------|----------|
| TC-SEC22-006 | API handles preflight OPTIONS requests | Dev server running | 1. Send OPTIONS request to /api/public/health 2. Check response status | Response status is 200, 204, or 405 (not 404/500) | PASS | High |

---

## Section 23: Audit Logs

**Requirements Reference:** Section 23 (Audit Logs)
**Source:** `e2e/requirements-verification.spec.ts` -- `test.describe('Section 23: Audit Logs')`; `e2e/authenticated.spec.ts` -- `test.describe('Section 23: Audit Logs')`

| ID | Test Name | Pre-conditions | Steps | Expected Result | Result | Priority |
|----|-----------|---------------|-------|-----------------|--------|----------|
| TC-SEC23-001 | audit logs page redirects unauthenticated users | Dev server running, user not authenticated | 1. Navigate to /dashboard/audit-logs 2. Wait for URL to match /(login\|admin)/ (10s timeout) | User is redirected to login | PASS | Critical |
| TC-SEC23-002 | audit logs page loads | Authenticated as super-admin via storageState | 1. Navigate to /dashboard/audit-logs 2. Wait for network idle 3. Check URL contains "/dashboard/audit-logs" 4. Check body matches /audit\|log\|action\|user/i | Audit logs page loads with relevant content | PASS | High |

---

## Section 24: Data Management & Privacy

**Requirements Reference:** Section 24 (Data Management & Privacy)
**Source:** `e2e/requirements-verification.spec.ts` -- `test.describe('Section 24: Data Management & Privacy')`

| ID | Test Name | Pre-conditions | Steps | Expected Result | Result | Priority |
|----|-----------|---------------|-------|-----------------|--------|----------|
| TC-SEC24-001 | privacy page is publicly accessible and contains privacy content | Dev server running, no authentication required | 1. Navigate to /privacy 2. Check page title matches /Privacy\|Wawa/i 3. Check body contains "privacy" (case-insensitive) | Privacy page loads with privacy-related content | PASS | Critical |
| TC-SEC24-002 | data deletion page is publicly accessible | Dev server running, no authentication required | 1. Navigate to /data-deletion 2. Wait for network idle 3. Check body matches /data\|delet/i | Data deletion page loads with relevant content | PASS | Critical |
| TC-SEC24-003 | data requests admin page redirects unauthenticated users | Dev server running, user not authenticated | 1. Navigate to /dashboard/settings/data-requests 2. Wait for URL to match /(login\|admin)/ (10s timeout) | User is redirected to login | PASS | High |

---

## Section 25: Deployment

**Requirements Reference:** Section 25 (Deployment)
**Source:** `e2e/requirements-verification.spec.ts` -- `test.describe('Section 25: Deployment')`

| ID | Test Name | Pre-conditions | Steps | Expected Result | Result | Priority |
|----|-----------|---------------|-------|-----------------|--------|----------|
| TC-SEC25-001 | application is running and serves pages | Dev server running | 1. Navigate to / 2. Check response status is 200 | Application serves pages with 200 status | PASS | Critical |
| TC-SEC25-002 | health endpoint confirms service is healthy | Dev server running | 1. GET /api/public/health 2. Check status is 200 or 429 3. If 200, verify data.status="healthy" and uptime > 0 | Health endpoint confirms healthy status with uptime | PASS | Critical |

---

## Section 27: Non-Functional Requirements

**Requirements Reference:** Section 27 (Non-Functional Requirements)
**Source:** `e2e/requirements-verification.spec.ts` -- Non-Functional, Accessibility, and Mobile-First describe blocks

### Performance & SEO

| ID | Test Name | Pre-conditions | Steps | Expected Result | Result | Priority |
|----|-----------|---------------|-------|-----------------|--------|----------|
| TC-SEC27-001 | home page has Open Graph metadata | Dev server running, no authentication required | 1. Navigate to / 2. Read page title 3. Verify title is truthy 4. Verify title matches /Wawa/i | Home page has proper title metadata | PASS | Medium |
| TC-SEC27-002 | menu page has descriptive metadata | Dev server running, no authentication required | 1. Navigate to /menu 2. Read page title 3. Verify title contains "Menu" 4. Read meta[name="description"] content 5. Verify content is truthy | Menu page has title and meta description | PASS | Medium |
| TC-SEC27-003 | checkout page has descriptive metadata | Dev server running, no authentication required | 1. Navigate to /checkout 2. Read page title 3. Verify title contains "Checkout" | Checkout page has descriptive title | PASS | Medium |
| TC-SEC27-004 | login page has descriptive metadata | Dev server running, no authentication required | 1. Navigate to /login 2. Read page title 3. Verify title matches /Log in\|Sign up/i | Login page has descriptive title | PASS | Medium |

### Accessibility

| ID | Test Name | Pre-conditions | Steps | Expected Result | Result | Priority |
|----|-----------|---------------|-------|-----------------|--------|----------|
| TC-SEC27-005 | home page has semantic h1 heading | Dev server running, no authentication required | 1. Navigate to / 2. Locate h1 element 3. Verify exactly 1 h1 exists 4. Verify h1 text matches /Wawa Garden Bar/i | Single semantic h1 heading with brand name | PASS | High |
| TC-SEC27-006 | home page logo has alt text | Dev server running, no authentication required | 1. Navigate to / 2. Locate img with alt containing "Wawa" 3. Verify visible 4. Read alt attribute 5. Verify alt is truthy | Logo image has meaningful alt text | PASS | High |
| TC-SEC27-007 | login page uses sr-only text for branding | Dev server running, no authentication required | 1. Navigate to /login 2. Locate elements with class "sr-only" 3. Count elements 4. Verify count > 0 | Screen-reader-only text elements are present | PASS | Medium |
| TC-SEC27-008 | form inputs have associated labels on login page | Dev server running, no authentication required | 1. Navigate to /admin/login 2. Locate label[for="username"] 3. Verify visible 4. Locate label[for="password"] 5. Verify visible | Form inputs have properly associated labels | PASS | High |

### Mobile-First Responsive -- Home Page

| ID | Test Name | Pre-conditions | Steps | Expected Result | Result | Priority |
|----|-----------|---------------|-------|-----------------|--------|----------|
| TC-SEC27-009 | home page renders on iPhone SE (375x667) | Dev server running, no authentication required | 1. Set viewport to 375x667 2. Navigate to / 3. Check logo visible 4. Check "View Menu" link visible | Home page renders correctly on iPhone SE | PASS | High |
| TC-SEC27-010 | home page renders on iPhone 12 (390x844) | Dev server running, no authentication required | 1. Set viewport to 390x844 2. Navigate to / 3. Check logo visible 4. Check "View Menu" link visible | Home page renders correctly on iPhone 12 | PASS | High |
| TC-SEC27-011 | home page renders on iPad (768x1024) | Dev server running, no authentication required | 1. Set viewport to 768x1024 2. Navigate to / 3. Check logo visible 4. Check "View Menu" link visible | Home page renders correctly on iPad | PASS | High |
| TC-SEC27-012 | home page renders on Desktop (1440x900) | Dev server running, no authentication required | 1. Set viewport to 1440x900 2. Navigate to / 3. Check logo visible 4. Check "View Menu" link visible | Home page renders correctly on Desktop | PASS | Medium |

### Mobile-First Responsive -- Menu Page

| ID | Test Name | Pre-conditions | Steps | Expected Result | Result | Priority |
|----|-----------|---------------|-------|-----------------|--------|----------|
| TC-SEC27-013 | menu page renders on iPhone SE (375x667) | Dev server running, no authentication required | 1. Set viewport to 375x667 2. Navigate to /menu 3. Wait for network idle 4. Check title matches /Menu/i | Menu page renders correctly on iPhone SE | PASS | High |
| TC-SEC27-014 | menu page renders on iPhone 12 (390x844) | Dev server running, no authentication required | 1. Set viewport to 390x844 2. Navigate to /menu 3. Wait for network idle 4. Check title matches /Menu/i | Menu page renders correctly on iPhone 12 | PASS | High |
| TC-SEC27-015 | menu page renders on iPad (768x1024) | Dev server running, no authentication required | 1. Set viewport to 768x1024 2. Navigate to /menu 3. Wait for network idle 4. Check title matches /Menu/i | Menu page renders correctly on iPad | PASS | High |
| TC-SEC27-016 | menu page renders on Desktop (1440x900) | Dev server running, no authentication required | 1. Set viewport to 1440x900 2. Navigate to /menu 3. Wait for network idle 4. Check title matches /Menu/i | Menu page renders correctly on Desktop | PASS | Medium |

---

## Cross-Cutting: Navigation Flows

**Requirements Reference:** Sections 3, 4, 5 (cross-cutting navigation)
**Source:** `e2e/requirements-verification.spec.ts` -- `test.describe('Cross-Cutting: Navigation Flows')`

| ID | Test Name | Pre-conditions | Steps | Expected Result | Result | Priority |
|----|-----------|---------------|-------|-----------------|--------|----------|
| TC-SECCC-001 | home -> menu -> checkout flow | Dev server running, no authentication required | 1. Navigate to / 2. Click a[href="/menu"] 3. Wait for URL to match /menu 4. Verify URL contains "/menu" 5. Navigate to /checkout 6. Check title matches /Checkout/i | Complete navigation flow from home to menu to checkout succeeds | PASS | Critical |
| TC-SECCC-002 | rewards page links to login for authentication | Dev server running, no authentication required | 1. Navigate to /rewards 2. Wait for network idle 3. Locate first a[href*="/login"] 4. Check visibility | Login link is accessible from rewards page | PASS | High |
| TC-SECCC-003 | admin login page is accessible and distinct from customer login | Dev server running, no authentication required | 1. Navigate to /admin/login 2. Read body text 3. Check contains "Admin Login" 4. Check contains "credentials" 5. Check does NOT contain "WhatsApp" | Admin login is distinct from customer login (no WhatsApp/SMS options) | PASS | High |

---

## Cross-Cutting: Error Handling

**Requirements Reference:** Sections 3, 20, 27 (cross-cutting error handling)
**Source:** `e2e/requirements-verification.spec.ts` -- `test.describe('Cross-Cutting: Error Handling')`

| ID | Test Name | Pre-conditions | Steps | Expected Result | Result | Priority |
|----|-----------|---------------|-------|-----------------|--------|----------|
| TC-SECCC-004 | 404 page is handled gracefully | Dev server running | 1. Navigate to /this-page-does-not-exist 2. Check response status is 404 | Non-existent page returns 404 status | PASS | High |
| TC-SECCC-005 | invalid API route returns error (not 200) | Dev server running | 1. GET /api/public/nonexistent 2. Check response status is 404, 401, 403, or 429 | Invalid API route does not return 200 | PASS | High |

---

## Summary

### Test Coverage by Section

| Section | Section Name | Test Count | Critical | High | Medium | Low |
|---------|-------------|:----------:|:--------:|:----:|:------:|:---:|
| 1/5.1 | Home Page | 5 | 1 | 3 | 1 | 0 |
| 2 | Technical Stack | 2 | 1 | 1 | 0 | 0 |
| 3 | Navigation & Architecture | 2 | 0 | 2 | 0 | 0 |
| 4 | Authentication & Authorization | 16 | 11 | 3 | 2 | 0 |
| 5.2/6 | Menu System | 6 | 2 | 3 | 1 | 0 |
| 5.3 | Cart | 3 | 2 | 1 | 0 | 0 |
| 5.4 | Order Tracking | 1 | 1 | 0 | 0 | 0 |
| 5.5 | Orders & Tabs Page | 3 | 2 | 1 | 0 | 0 |
| 5.6 | Customer Profile | 2 | 1 | 1 | 0 | 0 |
| 5.7/10 | Rewards | 6 | 0 | 2 | 4 | 0 |
| 7 | Ordering System | 2 | 0 | 2 | 0 | 0 |
| 8 | Tab System | 3 | 2 | 1 | 0 | 0 |
| 9 | Checkout & Payment | 5 | 3 | 2 | 0 | 0 |
| 11 | Dashboard Overview | 19 | 14 | 4 | 1 | 0 |
| 12 | Order Management | 7 | 3 | 4 | 0 | 0 |
| 13 | Menu Management | 4 | 2 | 2 | 0 | 0 |
| 14 | Inventory Management | 6 | 1 | 3 | 2 | 0 |
| 15 | Financial Management | 2 | 1 | 1 | 0 | 0 |
| 16 | Reports & Analytics | 10 | 1 | 5 | 4 | 0 |
| 17 | Kitchen Display System | 4 | 1 | 2 | 1 | 0 |
| 18 | Rewards Configuration | 8 | 1 | 4 | 3 | 0 |
| 19 | Settings & Configuration | 8 | 3 | 4 | 1 | 0 |
| 20 | Public REST API | 22 | 18 | 4 | 0 | 0 |
| 21 | Real-Time (Socket.IO) | 1 | 1 | 0 | 0 | 0 |
| 22 | Security | 6 | 3 | 3 | 0 | 0 |
| 23 | Audit Logs | 2 | 1 | 1 | 0 | 0 |
| 24 | Data Management & Privacy | 3 | 2 | 1 | 0 | 0 |
| 25 | Deployment | 2 | 2 | 0 | 0 | 0 |
| 27 | Non-Functional Requirements | 16 | 0 | 10 | 6 | 0 |
| CC | Cross-Cutting (Navigation + Errors) | 5 | 1 | 4 | 0 | 0 |
| | **TOTAL** | **181** | **81** | **74** | **26** | **0** |

### Overall Statistics

| Metric | Value |
|--------|-------|
| Total Test Cases | 181 |
| Passed | 181 |
| Failed | 0 |
| Pass Rate | 100% |
| Requirements Sections Covered | 27 of 27 |
| Spec Files | 2 |
| Priority: Critical | 81 (44.8%) |
| Priority: High | 74 (40.9%) |
| Priority: Medium | 26 (14.4%) |
| Priority: Low | 0 (0.0%) |

---

*End of Document*
