# Wawa Garden Bar --- Test Plan

**Standard:** ISO/IEC/IEEE 29119-3:2021
**Document Identifier:** WGB-TP-001
**Version:** 1.0
**Date:** 2026-03-07
**Classification:** Internal --- Confidential
**Status:** Draft --- Pending Approval

---

## Document Control

| Field               | Value                                          |
|---------------------|------------------------------------------------|
| Document Title      | Wawa Garden Bar Test Plan                      |
| Document ID         | WGB-TP-001                                     |
| Version             | 1.0                                            |
| Date                | 2026-03-07                                     |
| Classification      | Internal --- Confidential                      |
| Retention Period    | 7 years minimum (per data retention policy)    |
| Review Frequency    | Quarterly, or upon major release               |
| Supersedes          | N/A (initial issue)                            |

### Revision History

| Version | Date       | Author        | Description                          |
|---------|------------|---------------|--------------------------------------|
| 1.0     | 2026-03-07 | QA Lead       | Initial release                      |

### Approval Sign-Off

| Role             | Name | Signature | Date |
|------------------|------|-----------|------|
| QA Lead          |      |           |      |
| Product Owner    |      |           |      |
| Technical Lead   |      |           |      |

---

## 1. Purpose and Scope

### 1.1 Purpose

This Test Plan defines the testing approach, scope, resources, schedule, and deliverables for the **Wawa Garden Bar** web application --- a full-stack Next.js 16 food and drink ordering platform serving customers in Lagos, Nigeria. It establishes the strategy for validating all functional requirements (REQ-001 through REQ-007), non-functional requirements, and system integrations prior to production deployment.

This document conforms to **ISO/IEC/IEEE 29119-3:2021** (Test Documentation) and serves as the master test planning artifact for audit and compliance purposes.

### 1.2 In-Scope

The following areas are within the scope of this test plan:

| Area | Description | Requirement Ref |
|------|-------------|-----------------|
| Customer Authentication | Passwordless login (phone/email PIN), guest checkout, session management (iron-session) | REQUIREMENTS.md Section 4 |
| Admin Authentication | Username/password login, bcrypt hashing, account lockout, force password change | REQUIREMENTS.md Section 4 |
| RBAC & Route Protection | Role-based dashboard access (customer/admin/super-admin), granular admin permissions, proxy.ts route guards | REQUIREMENTS.md Section 4 |
| Menu Browsing | Category navigation (11 food, 18 drink subcategories), search/filter, item detail | REQUIREMENTS.md Section 6 |
| Cart | Zustand-persisted cart, quantity management, portion sizes (full/half/quarter), customizations, subtotal | REQUIREMENTS.md Section 5.3 |
| Ordering System | Four order types (dine-in, pickup, delivery, pay-now), full lifecycle (pending through completed/cancelled), idempotency keys | REQUIREMENTS.md Section 7 |
| Tab System | Open/settling/closed lifecycle, order attachment, tab totals recalculation, guest access | REQUIREMENTS.md Section 8 |
| Checkout & Payment | Multi-step checkout, fee calculation (service/delivery/tax), Monnify integration (card/transfer/USSD/phone), manual payment recording | REQUIREMENTS.md Section 9 |
| Rewards & Loyalty | Points system, reward rules (spend threshold, probability, campaigns), Instagram social rewards, points redemption at checkout | REQUIREMENTS.md Section 10 |
| Admin Dashboard | 12 dashboard sections with role-gated access, order management, kitchen display, menu/inventory/finance/reports/analytics/settings | REQUIREMENTS.md Sections 11--19 |
| Inventory Management | Stock tracking, stock movements, inventory snapshots (approval workflow), location tracking, inter-location transfers | REQUIREMENTS.md Section 14 |
| Financial Management | Expense tracking (direct/operating), bank statement import (CSV/XLSX), profitability calculation, price history | REQUIREMENTS.md Section 15 |
| Public REST API | 27 endpoints across 10 groups, API key authentication (17 scopes), rate limiting (30 req/min) | REQUIREMENTS.md Section 20 |
| Real-Time (Socket.IO) | Kitchen display updates, order status broadcasts, WebSocket connectivity | REQUIREMENTS.md Section 21 |
| Security | Rate limiting (strict/moderate/relaxed tiers), CORS, security headers, webhook signature validation | REQUIREMENTS.md Section 22 |
| Audit Logging | All admin actions logged with userId, action, resource, IP, userAgent | REQUIREMENTS.md Section 23 |
| Data Privacy | Customer data deletion requests, privacy policy, guest-to-registered conversion | REQUIREMENTS.md Section 24 |
| SOP Documentation | Waiter tab/order procedures, API integration guide, reporting API documentation | RTM REQ-001 |
| Idempotency Key Generation | Auto-generation via pre-save hook, CSPRNG, sparse unique index | RTM REQ-002 |
| MongoDB Resilience | Non-blocking warmup, connection health checks, Railway-specific configuration | RTM REQ-003, REQ-004 |
| Public API Tab Support | Tab attachment via tabId/useTab on order creation, backward-compatible response shape | RTM REQ-005 |
| Tab/Menu Lookup | tabNumber filter on GET /api/public/tabs, menu item name search via q= parameter | RTM REQ-006 |
| Requirements Document | Comprehensive 27-section requirements specification verified against codebase | RTM REQ-007 |

### 1.3 Out of Scope

The following items are explicitly excluded from this test plan:

- **Paystack payment provider** --- infrastructure is built but not active in the checkout UI; will be tested when enabled.
- **Weekly/Monthly/Expense/Sales reports** --- marked as planned but not yet implemented (REQUIREMENTS.md Section 16).
- **WhatsApp Business API message delivery** --- webhook signature validation is tested, but end-to-end WhatsApp message delivery depends on a third-party service and is verified via manual testing only.
- **Third-party CDN/image hosting** --- external image optimization services are not under test.
- **Mobile native apps** --- no native iOS/Android applications exist; only responsive web is tested.
- **Load/stress testing** --- performance is validated at the functional level; dedicated load testing is a separate engagement.
- **Penetration testing** --- security testing in this plan covers functional security controls; formal penetration testing is a separate engagement.

---

## 2. References

| Document | Location | Version |
|----------|----------|---------|
| Comprehensive Requirements Document | `docs/REQUIREMENTS.md` | 1.0 |
| Requirements Traceability Matrix | `compliance/RTM.md` | 1.4 |
| SOP --- Waiter Tab/Order Management | `docs/operations/SOP-WAITER-TAB-ORDER-MANAGEMENT.md` | 1.0 |
| SOP --- API Tab/Order Management | `docs/operations/SOP-API-TAB-ORDER-MANAGEMENT.md` | 1.2 |
| SOP --- API Reporting | `docs/operations/SOP-API-REPORTING.md` | 1.0 |
| Agent Tooling Flows | `docs/api/AGENT-TOOLING-FLOWS.md` | --- |
| Agent Tooling Guide | `docs/api/AGENT-TOOLING-GUIDE.md` | --- |
| Playwright Configuration | `playwright.config.ts` | --- |
| Vitest Configuration | `vitest.config.ts` | --- |
| ISO/IEC/IEEE 29119-3:2021 | External standard | 2021 |

---

## 3. Risk Assessment

Each risk is assessed on a Likelihood (L) and Impact (I) scale of 1 (Low) to 5 (Critical). The Risk Priority Number (RPN) is L x I.

| ID | Risk | L | I | RPN | Mitigation |
|----|------|---|---|-----|------------|
| R-001 | **Authentication bypass** --- Unauthenticated users access admin dashboard or protected API routes | 2 | 5 | 10 | E2E tests validate proxy.ts route guards for all dashboard sections (admin vs super-admin). Authenticated Playwright project (39 tests) verifies session-gated access. iron-session cookies are httpOnly and secure in production. |
| R-002 | **RBAC bypass** --- Admin-role user accesses super-admin-only sections (menu, inventory, finance, settings, etc.) | 2 | 5 | 10 | Playwright authenticated tests verify role-based redirects for all 12 dashboard sections. Granular permission checks (IAdminPermissions) tested per feature. |
| R-003 | **Payment failure / double charge** --- Monnify webhook processed twice or payment status incorrectly updated | 2 | 5 | 10 | Idempotency keys (REQ-002) prevent duplicate orders. Monnify webhook hash validation tested. Payment status transitions tested (pending/paid/failed/cancelled/refunded). Manual payment audit trail verified. |
| R-004 | **Inventory deduction errors** --- Stock not deducted on order confirmation, or double-deducted on retry | 3 | 4 | 12 | Order model tracks `inventoryDeducted` boolean. Stock movement records (sale/restock/waste/damage/transfer) are auditable. Inventory snapshot approval workflow provides reconciliation. E2E tests verify inventory pages and stock status. |
| R-005 | **Data loss on MongoDB disconnect** --- Railway deployment loses database connectivity mid-transaction | 2 | 5 | 10 | Non-blocking warmup with 5 retries (REQ-004). Connection health checks invalidate stale cached connections. directConnection: true for Railway standalone MongoDB. retryWrites and retryReads enabled. Health endpoint monitored. |
| R-006 | **Socket.IO disconnect** --- Kitchen display loses real-time updates, orders missed | 3 | 3 | 9 | Socket.IO automatic reconnection. Kitchen display shows elapsed time per order (visual staleness indicator). Manual refresh available. Order queue also accessible via REST API polling. |
| R-007 | **Rate limiting blocks legitimate traffic** --- Strict tier (5/min auth) or moderate tier (30/min API) rejects valid requests | 2 | 3 | 6 | Rate limits are configurable. Three tiers (strict/moderate/relaxed) match endpoint sensitivity. API consumers documented on limits in SOP. Monitoring via audit logs. |
| R-008 | **Tab total miscalculation** --- Cancelled order not excluded from tab subtotal, or service fee/tax incorrect | 2 | 4 | 8 | Tab totals auto-recalculated on order cancellation. Unit tests (REQ-005: 26 tests, REQ-006: 27 tests) validate tab operations. Fee calculation logic (service fee %, delivery tiers, 7.5% VAT) tested in checkout E2E flows. |
| R-009 | **Cross-browser rendering failure** --- Application unusable on non-Chromium browsers | 3 | 3 | 9 | Primary E2E suite runs on Chromium (Desktop Chrome). Manual testing covers Safari and Firefox. Tailwind CSS and Radix UI provide cross-browser consistency. Mobile-first responsive design validated. |
| R-010 | **Deployment regression** --- Push to main introduces breaking change not caught in develop | 2 | 4 | 8 | Branch strategy: develop -> main with deploy-main workflow. All 183 Playwright tests must pass on develop before merge. Vitest unit tests run on each change. Railway auto-deploy with health endpoint verification. |

---

## 4. Test Strategy

### 4.1 Test Levels

#### 4.1.1 Unit Testing (Vitest)

**Purpose:** Validate individual service functions, utility modules, API route logic, and data transformations in isolation.

| Attribute | Detail |
|-----------|--------|
| Tool | Vitest |
| Language | TypeScript |
| Scope | Services, API route handlers, utility functions, validation logic, data model hooks |
| Execution | Local development, CI pipeline |
| Key Suites | REQ-005 tab support (26 tests), REQ-006 tab/menu lookup (27 tests), idempotency key generation (37 criteria) |
| Mocking | Mongoose models, external services (Monnify, email, SMS) |
| Coverage Target | All business-critical service methods; all public API route handlers |

#### 4.1.2 End-to-End Testing (Playwright)

**Purpose:** Validate complete user workflows through the browser, covering customer journeys and admin operations.

| Attribute | Detail |
|-----------|--------|
| Tool | Playwright |
| Test Count | 183 tests across 3 projects |
| Browser | Chromium (Desktop Chrome device profile) |
| Base URL | `http://localhost:3000` |
| Reporter | HTML (`playwright-report/`), JSON (`compliance/evidence/REQ-007/e2e-results.json`), list (console) |
| Screenshots | Captured for every test (`screenshot: 'on'`) |
| Video | Captured on first retry (`video: 'on-first-retry'`) |
| Traces | Captured on first retry (`trace: 'on-first-retry'`) |
| Retries | 0 locally, 2 in CI |
| Workers | Unlimited locally, 1 in CI |
| Dev Server | Auto-started via `npm run dev` (120s timeout), reuses existing server |

**Playwright Projects:**

| Project | Test Count | Auth Requirement | Test Match | Dependencies |
|---------|------------|------------------|------------|--------------|
| `chromium` | 142 | None (unauthenticated) | `requirements-verification.spec.ts` | None |
| `auth-setup` | 2 | Performs login (admin + super-admin) | `auth.setup.ts` | None |
| `authenticated` | 39 | Reuses saved session (storageState) | `authenticated.spec.ts` | `auth-setup` |

#### 4.1.3 Manual Testing

**Purpose:** Validate workflows that require human judgment, third-party service interaction, or physical verification.

| Area | Procedure |
|------|-----------|
| Monnify payment end-to-end | Initiate real card/transfer/USSD payment on staging; verify webhook callback; confirm payment status in dashboard |
| Kitchen Display usability | Verify full-screen dark mode, elapsed time accuracy, order card readability, status action responsiveness |
| Mobile responsiveness | Test on physical iOS (Safari) and Android (Chrome) devices across menu, cart, checkout, and order tracking flows |
| Socket.IO reconnection | Kill and restart server during active kitchen display session; verify automatic reconnection and order state recovery |
| Bank statement import | Upload real CSV/XLSX bank statements; verify parsing, deduplication, approval workflow |
| WhatsApp PIN delivery | Trigger passwordless login with WhatsApp-enabled phone; verify PIN receipt |
| Cross-browser | Verify core flows (menu, cart, checkout, login) on Firefox and Safari |
| Accessibility | Screen reader walkthrough (VoiceOver/NVDA) of menu browsing, cart, and checkout |

### 4.2 Test Design Techniques

- **Equivalence Partitioning:** Applied to order types (dine-in/pickup/delivery/pay-now), payment methods (card/transfer/USSD/phone/cash), user roles (customer/admin/super-admin), and fee calculation tiers.
- **Boundary Value Analysis:** Applied to minimum order amount (NGN 1,000), rate limiting thresholds (5/30/120 per minute), delivery fee tiers (free above NGN 2,000, reduced NGN 500, base NGN 1,000), and loyalty points conversion (100 points = NGN 1).
- **State Transition Testing:** Applied to order lifecycle (pending -> confirmed -> preparing -> ready -> delivered -> completed, with cancelled branch), tab lifecycle (open -> settling -> closed), payment status (pending -> paid/failed/cancelled/refunded), and reward status (pending -> active -> redeemed/expired).
- **Decision Table Testing:** Applied to RBAC rules (12 dashboard sections x 3 roles), checkout fee combinations (service fee + delivery fee + tax + discount + tips), and tab attachment logic (tabId vs useTab:new vs useTab:existing).
- **Error Guessing:** Applied to concurrent tab operations, stale MongoDB connections, malformed webhook payloads, expired sessions, and race conditions in inventory deduction.

---

## 5. Test Environment

### 5.1 Development / Test Environment

| Component | Specification |
|-----------|---------------|
| **Operating System** | Linux (Ubuntu/Debian-based), kernel 6.17+ |
| **Runtime** | Node.js (version per `.nvmrc` / `package.json` engines) |
| **Package Manager** | npm |
| **Framework** | Next.js 16 (App Router), TypeScript 5.6, React 19 |
| **Database** | MongoDB (localhost:27017 for local dev/test, Railway MongoDB for staging/production) |
| **Application URL** | `http://localhost:3000` (dev server via `npm run dev`) |
| **Browser** | Chromium (Playwright-managed, Desktop Chrome profile) |
| **Test Runners** | Playwright (E2E), Vitest (unit) |
| **Environment Variables** | Loaded from `.env.local` (Playwright config loads via `dotenv`) |

### 5.2 Staging / Production Environment

| Component | Specification |
|-----------|---------------|
| **Hosting** | Railway (auto-deploy from `main` branch) |
| **Database** | Railway MongoDB (standalone, private network `mongodb.railway.internal`) |
| **Docker** | Dockerfile + docker-compose available for containerized deployment |
| **Health Check** | `GET /api/public/health` (no authentication required) |
| **Connection Config** | `directConnection: true`, `maxPoolSize: 10`, `serverSelectionTimeoutMS: 15000` |

### 5.3 Test Data

| Data Category | Source | Notes |
|---------------|--------|-------|
| Menu items | Seed scripts (`/scripts/`) | 11 food + 18 drink subcategories |
| Admin accounts | Seed scripts / `.env.local` | admin (limited) and super-admin (full access) |
| Customer accounts | Created during E2E auth-setup | Passwordless login via PIN |
| Orders / Tabs | Created by E2E tests at runtime | Cleaned or isolated per test run |
| Inventory records | Seed scripts | Linked to menu items with stock levels |

---

## 6. Entry Criteria

Testing shall not commence until ALL of the following conditions are met:

| ID | Criterion | Verification Method |
|----|-----------|---------------------|
| EC-01 | Source code compiles without TypeScript errors (`npx tsc --noEmit` passes) | CI build log |
| EC-02 | All dependencies installed successfully (`npm install` exits 0) | CI build log |
| EC-03 | Development server starts and responds on `http://localhost:3000` within 120 seconds | Playwright `webServer` config |
| EC-04 | MongoDB is accessible on the configured URI (localhost:27017 or Railway) | Health endpoint / connection log |
| EC-05 | Test database is seeded with required reference data (menu items, admin accounts) | Seed script execution log |
| EC-06 | Environment variables (`.env.local`) are configured with valid values for auth, database, and payment keys | Manual verification |
| EC-07 | Requirements document (`docs/REQUIREMENTS.md`) is at version 1.0 or later | File header check |
| EC-08 | RTM (`compliance/RTM.md`) is current and all requirements under test have status IMPLEMENTED or later | RTM review |
| EC-09 | No Severity-1 (system crash / data loss) defects are open from the previous test cycle | Defect tracker |

---

## 7. Exit Criteria and Pass/Fail Criteria

### 7.1 Exit Criteria

Testing is complete when ALL of the following conditions are satisfied:

| ID | Criterion | Threshold |
|----|-----------|-----------|
| XC-01 | All Playwright E2E tests executed | 183/183 tests run |
| XC-02 | All Vitest unit test suites executed | 100% suites run |
| XC-03 | Critical test pass rate | 100% of Severity-1 and Severity-2 tests pass |
| XC-04 | Overall E2E pass rate | >= 95% (174/183 minimum) |
| XC-05 | Overall unit test pass rate | 100% pass |
| XC-06 | Open Severity-1 defects | 0 |
| XC-07 | Open Severity-2 defects | 0 |
| XC-08 | RBAC tests | 100% pass (all 12 dashboard sections verified for all 3 roles) |
| XC-09 | Payment flow tests | 100% pass (Monnify webhook, manual payment, payment status transitions) |
| XC-10 | RTM coverage | All requirements REQ-001 through REQ-007 have status TESTED or APPROVED |
| XC-11 | Test evidence archived | Screenshots, JSON results, and compliance evidence committed to `compliance/evidence/` |
| XC-12 | Test Summary Report produced | `compliance/TSR.md` created and reviewed |

### 7.2 Defect Severity Classification

| Severity | Definition | Example |
|----------|------------|---------|
| Severity-1 (Critical) | System crash, data loss, security breach, payment processing failure | Authentication bypass, double charge, MongoDB data corruption |
| Severity-2 (Major) | Feature unusable, incorrect financial calculation, RBAC violation | Tab total miscalculation, inventory not deducted, admin accessing super-admin pages |
| Severity-3 (Moderate) | Feature works with workaround, UI rendering issue, non-critical error | Broken layout on specific viewport, slow Socket.IO reconnection |
| Severity-4 (Minor) | Cosmetic issue, typo, minor UX inconvenience | Icon misalignment, tooltip text error |

### 7.3 Pass/Fail Criteria per Test Level

| Test Level | Pass Criteria |
|------------|---------------|
| Unit (Vitest) | All tests pass. Zero failures permitted. |
| E2E --- chromium (142 unauthenticated) | 100% pass. These cover core requirements verification. |
| E2E --- auth-setup (2) | 100% pass. Both admin and super-admin login must succeed. |
| E2E --- authenticated (39) | 100% pass. All role-gated dashboard tests must succeed. |

---

## 8. Test Deliverables

| Deliverable | Format | Location | Produced By |
|-------------|--------|----------|-------------|
| This Test Plan | Markdown | `compliance/test-plan.md` | QA Lead |
| Requirements Traceability Matrix | Markdown | `compliance/RTM.md` | Development & Compliance Team |
| E2E Test Cases (Playwright specs) | TypeScript | `e2e/*.spec.ts`, `e2e/*.setup.ts` | QA / Development Team |
| Unit Test Cases (Vitest) | TypeScript | `__tests__/**/*.test.ts` | Development Team |
| E2E Test Results (JSON) | JSON | `compliance/evidence/REQ-007/e2e-results.json` | Playwright (automated) |
| E2E Test Report (HTML) | HTML | `playwright-report/` | Playwright (automated) |
| E2E Screenshots | PNG | `test-results/` | Playwright (automated) |
| Compliance Evidence | Mixed | `compliance/evidence/REQ-001/` through `compliance/evidence/REQ-007/` | QA / Development Team |
| Test Summary Report (TSR) | Markdown | `compliance/TSR.md` | QA Lead |
| Defect Log | Per project tracker | Project defect tracker | QA Team |

---

## 9. Roles and Responsibilities

| Role | Responsibility |
|------|----------------|
| **QA Lead** | Owns this test plan. Maintains test strategy, reviews test results, produces TSR, manages defect triage, ensures exit criteria are met before sign-off. |
| **Product Owner** | Defines acceptance criteria for each requirement. Reviews and approves test results. Provides final UAT sign-off. Prioritizes defect resolution. |
| **Technical Lead** | Reviews test environment configuration. Resolves Severity-1 and Severity-2 defects. Approves infrastructure changes (MongoDB config, Railway deployment). Maintains CI/CD pipeline. |
| **Development Team** | Writes and maintains unit tests (Vitest) and E2E tests (Playwright). Fixes defects. Updates RTM after implementation changes. Ensures TypeScript compilation. |
| **Compliance Officer** | Verifies evidence archival in `compliance/evidence/`. Reviews RTM traceability. Confirms retention policy adherence (7-year minimum). |

---

## 10. Schedule and Milestones

| Phase | Activities | Entry Gate | Duration | Exit Gate |
|-------|------------|------------|----------|-----------|
| **Phase 1: Test Planning** | Finalize test plan, confirm environment, seed test data | Requirements document approved (REQ-007) | 1 day | Test plan approved (this document) |
| **Phase 2: Unit Test Execution** | Run all Vitest suites, fix failures, verify REQ-002/REQ-005/REQ-006 unit tests | TypeScript compilation clean, entry criteria EC-01 through EC-09 met | 1 day | 100% unit tests pass |
| **Phase 3: E2E Test Execution** | Run full Playwright suite (183 tests across 3 projects), capture evidence | Dev server running, MongoDB seeded, unit tests green | 2 days | >= 95% pass rate, 0 Severity-1 open |
| **Phase 4: Manual Testing** | Monnify payment, mobile devices, cross-browser, Socket.IO, accessibility | E2E suite green | 2 days | Manual test checklist signed off |
| **Phase 5: Regression** | Re-run full suite after defect fixes | All Severity-1 and Severity-2 defects resolved | 1 day | Exit criteria XC-01 through XC-12 met |
| **Phase 6: Sign-Off** | Produce TSR, update RTM statuses, archive evidence, obtain approvals | All exit criteria met | 1 day | Approval sign-off block signed |

---

## 11. Suspension and Resumption Criteria

### 11.1 Suspension Criteria

Testing shall be suspended when ANY of the following conditions occur:

| ID | Condition | Action |
|----|-----------|--------|
| SC-01 | 3 or more Severity-1 defects are open simultaneously | Suspend all testing. Notify Technical Lead and Product Owner. Development team focuses exclusively on Severity-1 resolution. |
| SC-02 | Test environment is unavailable (MongoDB down, dev server crashes, Railway outage) | Suspend affected test level. QA Lead documents downtime. Resume when environment is restored and verified. |
| SC-03 | Authentication system is non-functional (iron-session, admin login, or auth-setup Playwright project fails) | Suspend all authenticated tests (39 tests). Continue unauthenticated suite (142 tests) if possible. |
| SC-04 | Requirements change mid-cycle that invalidates more than 20% of planned tests | Suspend testing. QA Lead re-assesses test plan. Update RTM and test cases before resuming. |
| SC-05 | Test data corruption (seeded data deleted or modified outside test control) | Suspend testing. Re-seed database. Verify data integrity before resuming. |

### 11.2 Resumption Criteria

| Suspension Trigger | Resumption Condition |
|--------------------|----------------------|
| SC-01 (Severity-1 defects) | All Severity-1 defects resolved and verified. Regression suite passes. |
| SC-02 (Environment outage) | Environment restored. Health endpoint returns 200. MongoDB connection confirmed. |
| SC-03 (Auth failure) | Authentication system verified. auth-setup project passes (2/2 tests). |
| SC-04 (Requirements change) | Updated test plan reviewed. RTM updated. Affected test cases revised. |
| SC-05 (Data corruption) | Database re-seeded. Seed script execution verified. Sample queries confirmed. |

---

## 12. Requirement-to-Test Mapping

This section provides a high-level mapping from tracked requirements to their test coverage. Full bidirectional traceability is maintained in `compliance/RTM.md`.

| Req ID | Requirement | Test Type | Test Reference | Evidence Location |
|--------|-------------|-----------|----------------|-------------------|
| REQ-001 | SOP Documentation (Waiter, API, Reporting) | Documentation validation | Manual review (structure, completeness, code syntax) | `compliance/evidence/REQ-001/` |
| REQ-002 | Idempotency Key Auto-Generation | Unit (Vitest) | 37 validation criteria (format, CSPRNG, backward compat) | `compliance/evidence/REQ-002/` |
| REQ-003 | MongoDB Warmup on Startup | Integration | Production log verification, health endpoint | `compliance/evidence/REQ-003/` |
| REQ-004 | MongoDB Connection Resilience | Integration | Railway deployment healthcheck, API endpoint verification, production logs | `compliance/evidence/REQ-004/` |
| REQ-005 | Public API Tab Support for Orders | Unit (Vitest) | 26 tests (validation, branch selection, name resolution, response shape, interface compat) | `compliance/evidence/REQ-005/` |
| REQ-006 | Tab/Menu Lookup + SOP Enhancement | Unit (Vitest) | 27 tests (tabNumber filter, tableNumber filter, status validation, combined filters, sort, menu name resolution) | `compliance/evidence/REQ-006/` |
| REQ-007 | Comprehensive Requirements Document | E2E (Playwright) | 183 tests (142 unauthenticated + 2 auth-setup + 39 authenticated) | `compliance/evidence/REQ-007/` |

---

## 13. Approval Sign-Off

By signing below, the undersigned confirm that they have reviewed this Test Plan and approve its contents for execution.

### QA Lead

| Field | Value |
|-------|-------|
| Name  |       |
| Title | QA Lead |
| Signature |   |
| Date  |       |

### Product Owner

| Field | Value |
|-------|-------|
| Name  |       |
| Title | Product Owner |
| Signature |   |
| Date  |       |

### Technical Lead

| Field | Value |
|-------|-------|
| Name  |       |
| Title | Technical Lead |
| Signature |   |
| Date  |       |

---

*End of Document --- WGB-TP-001 v1.0*
