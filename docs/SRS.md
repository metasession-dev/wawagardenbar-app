# Software Requirements Specification — Wawa Garden Bar

**Status:** Living document · **Supersedes:** `docs/REQUIREMENTS.md` (v1.0, 2026-03-06)
**Audience:** Internal developers **and Claude Code**, for authoring and executing end-to-end tests.
**Convention:** Mirrors the META-JOBS SRS. Every requirement is **observable and testable from the outside** (UI / API / webhook) — no internal-implementation-only assertions.

**How to read this:** Pick a requirement by its `REQ-<AREA>-NNN` ID, read its **Behaviour** and **Given/When/Then**, set up the area's **Fixtures/env**, and write the test. The **Source** line points at where the behaviour lives. Existing `compliance/RTM.md` change-request IDs (`REQ-0NN`) are cited in Source where a behaviour traces to one; those numeric IDs remain the compliance source of truth, while the area-scoped IDs here are the test-authoring handles.

> **Line numbers are indicative** — they reflect the code at authoring time and locate the behaviour; treat the file + symbol as authoritative if they drift.

---

## 1. Codebase Inventory

### 1.1 Stack

| Layer         | Technology                                                                                                          |
| ------------- | ------------------------------------------------------------------------------------------------------------------- |
| Framework     | Next.js 16 (App Router), React 19, TypeScript 5.6, custom HTTP server (`server.ts`) for Socket.IO                   |
| UI            | Shadcn UI, Radix UI, Tailwind CSS 3, Lucide icons                                                                   |
| Client state  | Zustand (`stores/cart-store.ts`, `stores/order-store.ts`), nuqs (URL state), TanStack Query                         |
| Forms         | React Hook Form + Zod                                                                                               |
| Database      | MongoDB via Mongoose 8                                                                                              |
| Auth          | iron-session 8 (encrypted cookies) for sessions; bcrypt for admin passwords; passwordless 4-digit PIN for customers |
| Real-time     | Socket.IO 4 (`lib/socket-server.ts`, path `/api/socket`)                                                            |
| Payments      | Monnify (active), Paystack (infrastructure only, not wired into checkout UI)                                        |
| Messaging     | Nodemailer (email), SMS provider, WhatsApp Business API                                                             |
| Charts/Export | Recharts, jsPDF, xlsx                                                                                               |
| Testing       | Vitest (unit, `__tests__/`), Playwright (E2E, `e2e/`)                                                               |
| Hosting       | Railway (auto-deploy from `main`), Docker                                                                           |

**Region/currency:** Lagos, Nigeria · Nigerian Naira (₦).

### 1.2 Entry points

- **Customer pages** — `app/page.tsx` (home), `app/menu/page.tsx`, `app/checkout/page.tsx`, `app/(customer)/orders/`, `app/(customer)/profile/`, `app/(customer)/profile/rewards/`, `app/(auth)/login/`, `app/(public)/privacy`, `app/(public)/data-deletion`.
- **Admin dashboard** — `app/dashboard/**` (overview, orders, kitchen, kitchen-display, menu, customers, inventory, finance, reports, analytics, rewards, settings, audit-logs). Protected by `app/dashboard/**/layout.tsx` gates.
- **Server Actions** — `app/actions/**` (auth, cart, payment, admin, inventory, finance, reports, tabs, rewards).
- **Internal API** — `app/api/auth/*`, `app/api/payment/*`, `app/api/admin/*`.
- **Public REST API** — `app/api/public/**` (~31 route files; API-key auth).
- **Webhooks** — `app/api/webhooks/{monnify,paystack,whatsapp}/route.ts`.
- **Edge gate** — `proxy.ts` (route protection, rate limiting, CORS preflight).

### 1.3 External dependencies (E2E must stand up / stub)

| Dependency             | Used for                      | E2E handling                                                                                          |
| ---------------------- | ----------------------------- | ----------------------------------------------------------------------------------------------------- |
| MongoDB (local :27017) | All persistence               | Stand up real instance; seed via `scripts/seed-*.ts`.                                                 |
| Monnify                | Payment init/verify + webhook | Stub/mizock at the API boundary; do not call live. Drive webhook by POSTing a signed payload.         |
| Paystack               | Payment (infra only)          | Out of scope — not in checkout UI.                                                                    |
| SMS / Email / WhatsApp | PIN delivery, notifications   | Stub; assert the PIN is requested, not delivery. For login tests, read PIN from DB seed or test hook. |
| Socket.IO              | Live order/kitchen updates    | Real (in-process). See [REQ-RT-\*](#feature-area-22--real-time-socketio-rt).                          |

### 1.4 Existing test setup (summary; full detail in [§3](#3-e2e-testing-stack))

- **Playwright** — `playwright.config.ts`, `testDir: ./e2e`, baseURL `http://localhost:3000`. **~33 spec files / ~25 projects.**
- **Vitest** — unit/service tests under `__tests__/`.
- **CI execution:** `ci.yml` Gate 4 seeds the test DB and runs the **`smoke`** project (fast critical-path subset) on every develop push + PR; the project-owned **`e2e-regression.yml`** runs the full **`regression`** project on PRs to `main` and nightly. The **Suite** column below drives membership: `smoke`-tier specs live in `e2e/smoke/`, everything else runs in `regression`. See [§3.4](#34-running) and [Appendix B](#appendix-b--e2e-test-environment).

### 1.5 Domain model (key collections)

20 MongoDB collections (`models/`). The ones E2E most often touches:

- **User** — customers + admins. Roles: `customer`, `csr`, `admin`, `super-admin`. Admins carry `IAdminPermissions`. Customers carry `loyaltyPoints`, `addresses`, `isGuest`/`guestId`, `verificationPin`/`pinExpiresAt`, `accountStatus`.
- **Order** — `orderNumber`, `idempotencyKey`, `orderType` (`dine-in`|`pickup`|`delivery`|`pay-now`), `status` lifecycle, `tabId`, `items[]`, financial fields (`subtotal`/`serviceFee`/`tax`/`deliveryFee`/`tipAmount`/`total`/`totalCost`/`grossProfit`), `paymentMethod`/`paymentStatus`, `statusHistory[]`, loyalty fields.
- **Tab** — dine-in bar tab. `tabNumber`, `tableNumber`, `status` (`open`|`settling`|`closed`), `orders[]`, totals, partial payments (with `tipAmount`/`tipPaymentMethod`).
- **MenuItem** — `kind` is either `menu-item` (sellable) or `kitchen-ingredient` (recipe input). Customizations, portion options (full/half/quarter + surcharges), `trackInventory`, `pointsValue`.
- **Inventory / StockMovement / InventorySnapshot** — stock, movements, staff-count approval workflow, multi-location.
- **RewardRule / Reward / PointsTransaction** — reward config, issued rewards, points ledger.
- **Expense / UploadedExpense / Settings / SystemSettings / ApiKey / AuditLog**.

---

## 2. Prioritized Requirements Index

MoSCoW also signals **test execution order**: **Must** → smoke; **Should** → regression; **Could** → extended/edge; **Won't** → excluded this cycle.

| ID               | Title                                                                   | Priority | Suite      | Source                                                                                                           |
| ---------------- | ----------------------------------------------------------------------- | -------- | ---------- | ---------------------------------------------------------------------------------------------------------------- |
| REQ-HOME-001     | Home renders branding + order-type CTAs                                 | Should   | regression | `app/page.tsx`                                                                                                   |
| REQ-HOME-002     | "View Menu" navigates to `/menu`                                        | Must     | smoke      | `app/page.tsx:14`                                                                                                |
| REQ-MENU-001     | Menu lists items by category                                            | Must     | smoke      | `app/menu/page.tsx`, `components/features/menu/menu-content.tsx`                                                 |
| REQ-MENU-002     | Menu search & category filter via URL params                            | Must     | smoke      | `app/menu/page.tsx:20`, `category-navigation.tsx`                                                                |
| REQ-MENU-003     | Item detail modal: portion, qty, customizations, instructions           | Must     | regression | `components/features/menu/menu-item-detail-modal.tsx`                                                            |
| REQ-MENU-004     | Out-of-stock blocks add-to-cart; qty capped by stock                    | Should   | regression | `menu-item-detail-modal.tsx:82,98`; REQ-030                                                                      |
| REQ-MENU-005     | Add to cart merges identical lines; cart count updates                  | Must     | smoke      | `stores/cart-store.ts:66`, `lib/cart-store-helpers.ts:43`                                                        |
| REQ-MENU-006     | Cart line total = (base + Σ surcharge×portionMult)×qty                  | Must     | regression | `lib/cart-store-helpers.ts:97`; REQ-031                                                                          |
| REQ-MENU-007     | Cart persists across reload (localStorage)                              | Should   | regression | `stores/cart-store.ts:199`                                                                                       |
| REQ-CHECKOUT-001 | Multi-step checkout renders & validates per step                        | Must     | smoke      | `components/features/checkout/checkout-form.tsx`                                                                 |
| REQ-CHECKOUT-002 | Order-type-specific required fields enforced                            | Must     | regression | `checkout/order-details-step.tsx:79`                                                                             |
| REQ-CHECKOUT-003 | Fees computed (service %, delivery tiers, VAT)                          | Must     | regression | `services/settings-service.ts:82`                                                                                |
| REQ-CHECKOUT-004 | Minimum-order threshold blocks checkout                                 | Should   | regression | `services/settings-service.ts:145`                                                                               |
| REQ-CHECKOUT-005 | Dine-in tab options (pay-now / new / existing)                          | Should   | regression | `checkout/tab-options-step.tsx`                                                                                  |
| REQ-CHECKOUT-006 | Independent tip amount + tip payment method                             | Should   | regression | `checkout/tip-input-step.tsx`; REQ-035/036                                                                       |
| REQ-CHECKOUT-007 | Submit creates order (happy path) + clears cart                         | Must     | smoke      | `app/actions/payment/payment-actions.ts:65`                                                                      |
| REQ-CHECKOUT-008 | Idempotency key prevents duplicate orders                               | Must     | regression | `payment-actions.ts:82`                                                                                          |
| REQ-CHECKOUT-009 | Apply reward code / redeem points at checkout                           | Could    | extended   | `checkout/order-summary.tsx`                                                                                     |
| REQ-ORDER-001    | Order tracking page shows live status                                   | Should   | regression | `app/(customer)/orders/[orderId]/page.tsx`, `real-time-order-tracker.tsx`                                        |
| REQ-ORDER-002    | Orders & Tabs page lists orders + tabs (auth)                           | Must     | smoke      | `app/(customer)/orders/page.tsx`                                                                                 |
| REQ-ORDER-003    | Guest sees own open tabs by guestId/email                               | Should   | regression | `app/(customer)/orders/page.tsx:55`                                                                              |
| REQ-ORDER-004    | Pay & close tab from customer side                                      | Should   | regression | `app/(customer)/orders/tabs/[tabId]/checkout/`                                                                   |
| REQ-PROFILE-001  | View/edit personal info                                                 | Should   | regression | `app/(customer)/profile/page.tsx`, `personal-info-tab.tsx`                                                       |
| REQ-PROFILE-002  | Address CRUD + default address                                          | Could    | extended   | `addresses-tab.tsx`                                                                                              |
| REQ-REWARDC-001  | Rewards page shows active rewards, codes, expiry                        | Should   | regression | `app/(customer)/profile/rewards/page.tsx`                                                                        |
| REQ-REWARDC-002  | Points balance + ₦ equivalent + history                                 | Could    | extended   | `profile/rewards/page.tsx:89`                                                                                    |
| REQ-AUTHC-001    | Passwordless PIN login (email/SMS/WhatsApp)                             | Must     | smoke      | `components/shared/auth/login-form.tsx`, `app/actions/auth/verify-pin.ts`                                        |
| REQ-AUTHC-002    | PIN expiry / invalid-PIN error handling                                 | Should   | regression | `app/actions/auth/verify-pin.ts:62,69`                                                                           |
| REQ-AUTHC-003    | Guest checkout (no PIN)                                                 | Should   | regression | `app/actions/auth/guest-checkout.ts`                                                                             |
| REQ-AUTHA-001    | Admin login (username + bcrypt)                                         | Must     | smoke      | `app/actions/auth/admin-login.ts`, `services/admin-service.ts:478`                                               |
| REQ-AUTHA-002    | Failed-login lockout (5 attempts / 15 min)                              | Should   | regression | `services/admin-service.ts:13,499`                                                                               |
| REQ-AUTHA-003    | Force password change flag                                              | Could    | extended   | `admin-login.ts:78`                                                                                              |
| REQ-AUTHA-004    | RBAC route gating (role + permission)                                   | Must     | smoke      | `proxy.ts`, `lib/auth-middleware.ts:90`, `lib/permissions.ts:13`                                                 |
| REQ-DASH-001     | Super-admin dashboard overview stats                                    | Should   | regression | `app/dashboard/page.tsx:53`; REQ-007                                                                             |
| REQ-DASH-002     | Admin redirected from `/dashboard` to `/orders`                         | Must     | smoke      | `app/dashboard/page.tsx:303`                                                                                     |
| REQ-ORDMGT-001   | Order queue with filters + real-time                                    | Must     | smoke      | `app/dashboard/orders/page.tsx`, `order-management-actions.ts:42`                                                |
| REQ-ORDMGT-002   | Order detail: timeline, payment, actions                                | Should   | regression | `app/dashboard/orders/[orderId]/page.tsx`                                                                        |
| REQ-ORDMGT-003   | Edit order items (unpaid only)                                          | Should   | regression | `app/actions/admin/order-edit-actions.ts:33`                                                                     |
| REQ-ORDMGT-004   | Price override with reason → audit                                      | Should   | regression | `payment-actions.ts:129`                                                                                         |
| REQ-ORDMGT-005   | Cancel order: reason required, paid blocked                             | Should   | regression | `order-management-actions.ts`                                                                                    |
| REQ-ORDMGT-006   | Manual payment recording                                                | Should   | regression | `order-payment-actions.ts:16`                                                                                    |
| REQ-ORDMGT-007   | Order completion → inventory deduction chokepoint                       | Must     | regression | `services/order-service.ts:806`; REQ-066                                                                         |
| REQ-TABMGT-001   | Tab list with status filter + stats                                     | Should   | regression | `app/dashboard/orders/tabs/page.tsx`                                                                             |
| REQ-TABMGT-002   | Tab detail with partial payments                                        | Should   | regression | `tabs/[tabId]/page.tsx:82`; REQ-012/035/036                                                                      |
| REQ-TABMGT-003   | Admin pay tab with method + independent tip                             | Should   | regression | `admin-pay-tab-dialog`; REQ-036                                                                                  |
| REQ-TABMGT-004   | Delete tab (guard closed/paid)                                          | Could    | extended   | `delete-tab-dialog`                                                                                              |
| REQ-KITCHEN-001  | Kitchen display shows active orders real-time                           | Should   | regression | `app/dashboard/kitchen-display/page.tsx`                                                                         |
| REQ-KITCHEN-002  | `kitchenManagement` gates kitchen routes                                | Must     | regression | `app/dashboard/kitchen/layout.tsx`; REQ-034                                                                      |
| REQ-KITCHEN-003  | Recipe CRUD + validation                                                | Should   | regression | `services/recipe-service.ts:41`; REQ-034                                                                         |
| REQ-KITCHEN-004  | Make-a-batch deducts ingredients, yields stock                          | Should   | regression | `app/dashboard/kitchen/production/page.tsx`; REQ-034                                                             |
| REQ-KITCHEN-005  | Void batch (super-admin only)                                           | Could    | extended   | `production-history`; REQ-034                                                                                    |
| REQ-KITCHEN-006  | Kitchen ingredient CRUD                                                 | Could    | extended   | REQ-037                                                                                                          |
| REQ-MENUMGT-001  | Menu item list + stats (super-admin)                                    | Should   | regression | `app/dashboard/menu/page.tsx`                                                                                    |
| REQ-MENUMGT-002  | Create menu item (+ optional inventory)                                 | Should   | regression | `app/actions/admin/menu-actions.ts:60`                                                                           |
| REQ-MENUMGT-003  | Edit item incl. customization inventory links                           | Should   | regression | `menu/[itemId]/edit/page.tsx`; REQ-030                                                                           |
| REQ-MENUMGT-004  | Delete/duplicate item                                                   | Could    | extended   | `menu-items-client`                                                                                              |
| REQ-MENUMGT-005  | Configurable main categories (rename / add / delete, reference-blocked) | Should   | regression | `app/dashboard/settings/page.tsx`; `services/main-category-service.ts`; REQ-075                                  |
| REQ-MENUMGT-006  | Per-main-category report + per-user access control                      | Should   | regression | `app/dashboard/reports/by-main-category/`; `services/financial-report-service.ts`; `lib/permissions.ts`; REQ-076 |
| REQ-CUST-001     | Customer list (csr/super-admin)                                         | Should   | regression | `app/dashboard/customers/page.tsx`                                                                               |
| REQ-CUST-002     | Delete + recreate customer by email                                     | Could    | extended   | REQ-027                                                                                                          |
| REQ-INV-001      | Inventory list with live status                                         | Should   | regression | `app/dashboard/inventory/page.tsx:77`                                                                            |
| REQ-INV-002      | Inventory detail: movements + locations                                 | Should   | regression | `inventory/[id]/page.tsx`                                                                                        |
| REQ-INV-003      | Snapshot submit → pending                                               | Should   | regression | `app/actions/inventory/snapshot-actions.ts:52`; REQ-018                                                          |
| REQ-INV-004      | Snapshot approve/reject (super-admin)                                   | Should   | regression | `snapshot-actions.ts:154,190`; REQ-018                                                                           |
| REQ-INV-005      | Restock recommendations                                                 | Could    | extended   | `restock-recommendation-actions.ts:27`; REQ-019/020                                                              |
| REQ-INV-006      | Inter-location stock transfer                                           | Could    | extended   | `inventory/transfer/page.tsx`                                                                                    |
| REQ-INV-007      | Cost-snapshot integrity                                                 | Could    | extended   | REQ-022                                                                                                          |
| REQ-INV-008      | Units of measurement registry                                           | Could    | extended   | REQ-033                                                                                                          |
| REQ-INV-009      | Sale-point routing for deductions (`defaultSalesLocation`)              | Must     | regression | `services/inventory-service.ts:48`; REQ-066                                                                      |
| REQ-INV-010      | IncidentEvent model + recording                                         | Must     | regression | `models/incident-event-model.ts`; REQ-066                                                                        |
| REQ-INV-011      | Reconciliation cron + stale-paid scan                                   | Must     | regression | `lib/scheduled-jobs.ts`; `services/order-service.ts`; REQ-066                                                    |
| REQ-INV-012      | `/dashboard/incidents` page + deduction-failure toast                   | Should   | regression | `app/dashboard/incidents/page.tsx`; REQ-066                                                                      |
| REQ-INV-013      | Retry-now remediation + audit log                                       | Should   | regression | `app/actions/admin/incidents-actions.ts`; REQ-066                                                                |
| REQ-FIN-001      | Create + list expenses by date/filters                                  | Should   | regression | `app/actions/finance/expense-actions.ts:17,52`                                                                   |
| REQ-FIN-002      | Bank statement (XLSX) import + dedupe                                   | Should   | regression | `app/actions/expenses/csv-import-actions.ts:31`                                                                  |
| REQ-FIN-003      | Pending expense group submit/edit/approve                               | Should   | regression | `pending-expense-actions.ts:49`; REQ-026/032                                                                     |
| REQ-FIN-004      | Grouped expense category dropdown                                       | Could    | extended   | `expense-categories-actions.ts`; REQ-028                                                                         |
| REQ-FIN-005      | Staff pot balance from approved expenses                                | Could    | extended   | REQ-015                                                                                                          |
| REQ-REPORT-001   | Daily report: payment accuracy + reconciliation                         | Should   | regression | `app/actions/reports/report-actions.ts:11`; REQ-013/014                                                          |
| REQ-REPORT-002   | Business-day cutoff grouping                                            | Should   | regression | REQ-025                                                                                                          |
| REQ-REPORT-003   | Profitability report by item/category                                   | Could    | extended   | `profitability-analytics-actions.ts:15`                                                                          |
| REQ-REPORT-004   | PDF/Excel export                                                        | Could    | extended   | `report-actions.ts`                                                                                              |
| REQ-REPORT-005   | Dashboard ↔ daily report revenue consistency                           | Should   | regression | `dashboard-revenue.spec.ts`                                                                                      |
| REQ-REWMGT-001   | Reward rule CRUD (+ probability, campaign)                              | Should   | regression | `app/actions/admin/reward-rules-actions.ts:95`                                                                   |
| REQ-REWMGT-002   | Social (Instagram) rule config                                          | Could    | extended   | `reward-rules-actions.ts:42`; REQ-046                                                                            |
| REQ-REWMGT-003   | Issued rewards: filter, manual issue/expire, export                     | Could    | extended   | `issued-rewards-actions.ts`                                                                                      |
| REQ-REWMGT-004   | Apply reward template (one-click)                                       | Could    | extended   | `rewards/templates/page.tsx:111`                                                                                 |
| REQ-SETTINGS-001 | Fees/delivery/hours config persists                                     | Should   | regression | `app/dashboard/settings/page.tsx`                                                                                |
| REQ-SETTINGS-002 | Admin CRUD + permissions (super-admin)                                  | Should   | regression | `admin-management-actions.ts:11`                                                                                 |
| REQ-SETTINGS-003 | API key create/revoke with scopes                                       | Should   | regression | `settings/api-keys/page.tsx`, `services/api-key-service.ts:54`                                                   |
| REQ-SETTINGS-004 | Process data-deletion requests                                          | Could    | extended   | `settings/data-requests/`; REQ-027                                                                               |
| REQ-SETTINGS-005 | `incidentsAccess` admin permission                                      | Should   | regression | `interfaces/admin-permissions.interface.ts`; REQ-066                                                             |
| REQ-AUDIT-001    | Admin actions appear in audit log                                       | Should   | regression | `app/dashboard/audit-logs/page.tsx`, `AuditLogService`                                                           |
| REQ-API-001      | Public API requires valid key (401)                                     | Must     | smoke      | `lib/api-key-validator.ts:39`; REQ-007                                                                           |
| REQ-API-002      | Insufficient scope → 403                                                | Must     | smoke      | `api-key-validator.ts`                                                                                           |
| REQ-API-003      | Response envelope `{success,data,meta}`                                 | Must     | regression | `lib/api-response.ts:9`                                                                                          |
| REQ-API-004      | Health endpoint is unauthenticated                                      | Should   | smoke      | `app/api/public/health/route.ts`                                                                                 |
| REQ-API-005      | Rate limit returns 429 + Retry-After                                    | Should   | regression | `lib/rate-limiter.ts:82`                                                                                         |
| REQ-API-006      | Per-group contracts (menu/orders/inventory/…)                           | Should   | regression | `app/api/public/**`                                                                                              |
| REQ-RT-001       | Order status broadcast to subscribers                                   | Could    | extended   | `lib/socket-server.ts:108`, `hooks/use-order-socket.ts`                                                          |
| REQ-RT-002       | New order broadcast to kitchen room                                     | Could    | extended   | `lib/socket-server.ts:134`                                                                                       |
| REQ-PAY-001      | Payment init returns checkout URL + ref                                 | Should   | regression | `app/api/public/payments/route.ts`                                                                               |
| REQ-PAY-002      | Monnify webhook updates order on valid hash                             | Should   | regression | `app/api/webhooks/monnify/route.ts:24`                                                                           |
| REQ-PAY-003      | Webhook rejects invalid signature                                       | Must     | regression | `webhooks/{monnify,whatsapp,paystack}/route.ts`                                                                  |
| REQ-PAY-004      | Partial payments on a tab                                               | Should   | regression | `tabs/[tabId]/page.tsx`; REQ-012                                                                                 |
| REQ-SEC-001      | Security headers present                                                | Must     | smoke      | `next.config.ts:5`                                                                                               |
| REQ-SEC-002      | Session cookie httpOnly/secure/sameSite                                 | Should   | regression | `lib/session.ts:18`                                                                                              |
| REQ-SEC-003      | CORS: no wildcard origin with credentials                               | Should   | regression | `lib/cors.ts`; REQ-047                                                                                           |
| REQ-SEC-004      | Auth endpoints strict rate limit (5/min)                                | Should   | regression | `lib/rate-limiter.ts:19`                                                                                         |
| REQ-PRIVACY-001  | `/privacy` + `/data-deletion` public                                    | Should   | smoke      | `app/(public)/privacy`, `app/(public)/data-deletion`                                                             |
| REQ-PRIVACY-002  | Data-deletion request → soft delete                                     | Could    | extended   | `accountStatus: 'deleted'`                                                                                       |

---

## Feature Area 1 — Home & Discovery (HOME)

**Fixtures/env:** None (static, unauthenticated).

#### REQ-HOME-001 — Home renders branding + order-type CTAs · **Should** · regression

**Source:** `app/page.tsx` (hero lines ~14-37, feature cards ~40-97)
**Behaviour:** `/` renders the logo, tagline, a "View Menu" CTA, and three feature cards (Dine In, Pickup, Delivery). Logo failure falls back to alt text.

- **Given** a visitor, **When** they open `/`, **Then** the hero, "View Menu" CTA, and three order-type cards are visible.

#### REQ-HOME-002 — "View Menu" navigates to `/menu` · **Must** · smoke

**Source:** `app/page.tsx:14`

- **Given** a visitor on `/`, **When** they click "View Menu", **Then** they land on `/menu`.

---

## Feature Area 2 — Menu & Cart (MENU)

**Fixtures/env:** ≥1 menu category with ≥2 available `kind:'menu-item'` items (seed `scripts/seed-menu.ts` / `seed-food-menu.ts` / `seed-drinks-menu.ts`); at least one item with a customization group and portion options; one item flagged out-of-stock for REQ-MENU-004.

#### REQ-MENU-001 — Menu lists items by category · **Must** · smoke

**Source:** `app/menu/page.tsx` (`CategoryService.getItemsByCategory`), `components/features/menu/menu-content.tsx`, `category-navigation.tsx`
**Behaviour:** `/menu` renders category navigation and a grid of item cards (name, price, image, availability). Only sellable items appear.

- **Given** seeded menu items, **When** a visitor opens `/menu`, **Then** category navigation and item cards render.

#### REQ-MENU-002 — Search & category filter sync to URL · **Must** · smoke

**Source:** `app/menu/page.tsx:20` (reads `?category=`, `?search=`, `?tableNumber=`)

- **Given** `/menu`, **When** the visitor selects a category or types a search term, **Then** the URL gains `?category=` / `?search=` and the grid updates; an unmatched search shows an empty state.

#### REQ-MENU-003 — Item detail modal · **Must** · regression

**Source:** `components/features/menu/menu-item-detail-modal.tsx` (portions ~65-80, qty ~86-99)
**Behaviour:** Clicking an item opens a modal with image, description, price, portion selector (full/half/quarter with surcharge pricing), customization picker, special-instructions field, and quantity stepper. "Add to Cart" is disabled until required customization groups are chosen.

- **Given** an item with customizations, **When** the visitor opens its modal without choosing a required group, **Then** "Add to Cart" stays disabled until the group is selected.

#### REQ-MENU-004 — Stock gating · **Should** · regression

**Source:** `menu-item-detail-modal.tsx:82,98`; cross-ref REQ-030
**Behaviour:** Out-of-stock items disable "Add to Cart"; max selectable quantity is derived from `currentStock ÷ portionMultiplier`.

- **Given** an out-of-stock item, **When** its modal opens, **Then** "Add to Cart" is disabled and an out-of-stock badge shows.
- **Given** an item with stock N, **When** the visitor raises quantity, **Then** it cannot exceed the stock-derived max.

#### REQ-MENU-005 — Add to cart merges identical lines · **Must** · smoke

**Source:** `stores/cart-store.ts:66` (`addItem`), `lib/cart-store-helpers.ts:43` (`computeCartItemMergeKey` = id|portion|instructions|customizations)

- **Given** an empty cart, **When** the visitor adds the same item+portion+customizations twice, **Then** one line shows quantity 2 and the header cart count reads 2.

#### REQ-MENU-006 — Line total math · **Must** · regression

**Source:** `lib/cart-store-helpers.ts:97` (`computeCartItemTotal`); cross-ref REQ-031
**Behaviour:** Line total = `(basePrice + Σ customizationSurcharge × portionMultiplier) × quantity`.

- **Given** an item with a ₦X surcharge customization at half portion (×0.5) and quantity 2, **When** added, **Then** the line total equals `(base + X×0.5) × 2`.

#### REQ-MENU-007 — Cart persistence · **Should** · regression

**Source:** `stores/cart-store.ts:199` (persist key `wawa-cart-storage`)

- **Given** items in the cart, **When** the page reloads, **Then** the cart contents and count survive.

---

## Feature Area 3 — Checkout & Payment Initiation (CHECKOUT)

**Fixtures/env:** Non-empty cart (seed via localStorage as `requirements-verification.spec.ts` does); `Settings` with serviceFeePercentage, delivery tiers, tax, minimum order; for tab tests an open dine-in tab.

#### REQ-CHECKOUT-001 — Multi-step form renders & validates · **Must** · smoke

**Source:** `components/features/checkout/checkout-form.tsx`, `customer-info-step.tsx`
**Behaviour:** Steps: order type → (dine-in) tab options → customer details → delivery/pickup details → tip → review → payment. Customer name ≥2 chars, valid email, phone ≥10 digits.

- **Given** a non-empty cart at `/checkout`, **When** the visitor submits customer details with an invalid email, **Then** a validation error blocks progression.

#### REQ-CHECKOUT-002 — Order-type-specific fields · **Must** · regression

**Source:** `checkout/order-details-step.tsx:79` (Zod refine)
**Behaviour:** Dine-in requires `tableNumber`; pickup requires `pickupTime`; delivery requires address fields. Table number locks and delivery disables when an existing open tab is detected.

- **Given** order type = dine-in, **When** the visitor proceeds without a table number, **Then** a "table number required" error shows.

#### REQ-CHECKOUT-003 — Fee calculation · **Must** · regression

**Source:** `services/settings-service.ts:82` (service fee), `:90` (delivery tiers), `:103` (tax), `:131` (total)
**Behaviour:** Service fee = subtotal × serviceFeePercentage; delivery fee tiered (base / reduced above free-threshold; zero unless delivery); tax = subtotal × taxPercentage when enabled. Summary shows each line and a total.

- **Given** a delivery order below the free-delivery threshold, **When** the visitor reaches review, **Then** the base delivery fee, service fee and (if enabled) VAT appear and sum into the total.

#### REQ-CHECKOUT-004 — Minimum order · **Should** · regression

**Source:** `services/settings-service.ts:145` (`meetsMinimumOrder`)

- **Given** a subtotal below the configured minimum, **When** the visitor tries to pay, **Then** checkout is blocked with a minimum-order message.

#### REQ-CHECKOUT-005 — Dine-in tab options · **Should** · regression

**Source:** `checkout/tab-options-step.tsx`

- **Given** a dine-in order, **When** the visitor chooses "new tab" vs "pay now" vs "existing tab", **Then** the flow routes accordingly and an existing open tab is selectable.

#### REQ-CHECKOUT-006 — Independent tip · **Should** · regression

**Source:** `checkout/tip-input-step.tsx`; cross-ref REQ-035 (tipAmount), REQ-036 (tipPaymentMethod)
**Behaviour:** Tip amount (≥0) and tip payment method (cash/transfer/card) are captured independently of the order payment method and added to the running total before submit.

- **Given** a card order, **When** the visitor adds a ₦500 cash tip, **Then** the total includes ₦500 and the tip's payment method is recorded as cash, distinct from the order's card method.

#### REQ-CHECKOUT-007 — Create order (happy path) · **Must** · smoke

**Source:** `app/actions/payment/payment-actions.ts:65` (`createOrder`)
**Behaviour:** On submit, an Order is created with a unique `orderNumber`, computed totals, `paymentStatus:'pending'`, estimated wait time; the cart is cleared and the kitchen is notified. **Inventory is NOT deducted at order creation** — deduction happens on transition to `status === 'completed'` via `OrderService.completeOrder` (see **REQ-ORDMGT-007**). Pre-REQ-066 the create/payment path called `deductStockForOrder` inline; those six call sites were removed by AC2.

- **Given** a valid checkout, **When** the visitor submits, **Then** an order is created and they reach the order/payment confirmation; the cart empties.
- **Given** the order is created with stock-tracked items, **When** the create-action returns, **Then** no inventory mutation has occurred (deduction is deferred to completion per REQ-ORDMGT-007).

#### REQ-CHECKOUT-008 — Idempotency · **Must** · regression

**Source:** `payment-actions.ts:82`

- **Given** a submission carrying an idempotency key, **When** the same key is submitted twice, **Then** the second returns the existing order rather than creating a duplicate.

#### REQ-CHECKOUT-009 — Rewards/points at checkout · **Could** · extended

**Source:** `checkout/order-summary.tsx`

- **Given** a customer with an active reward code, **When** they apply it on the summary, **Then** the discount/points reduce the total; removing it restores the total.

> ⚠ **Known gap (#117 P0#4):** the **dine-in tab** checkout path does not surface eligible rewards — `services/tab-service.ts:256` returns `eligibleRewards: []` as a hardcoded TODO. This requirement is therefore testable only for the standalone-order path today; see [§4](#4-roadmap--cross-reference-to-issue-117).

---

## Feature Area 4 — Order Tracking & Customer Tabs (ORDER)

**Fixtures/env:** A logged-in (or guest) customer with ≥1 order and ≥1 open tab; an order in a non-terminal status for live-tracking.

#### REQ-ORDER-001 — Live order tracking · **Should** · regression

**Source:** `app/(customer)/orders/[orderId]/page.tsx`, `components/features/orders/real-time-order-tracker.tsx`
**Behaviour:** The page shows order number, items, total, estimated wait, a status timeline, and a live-connection indicator; status updates arrive over Socket.IO. Pending-payment and confirmed/paid states show distinct alerts.

- **Given** an order page open, **When** the order status changes server-side, **Then** the timeline advances without a manual reload.

> ⚠ **Known gap (#117 P1#7):** the page also renders a "Receipt" download button (`orders/[orderId]/page.tsx:68`) that is a **dead stub** (no handler) — do not write a test asserting it works. Tracked in [§4](#4-roadmap--cross-reference-to-issue-117).

#### REQ-ORDER-002 — Orders & Tabs list (auth) · **Must** · smoke

**Source:** `app/(customer)/orders/page.tsx`
**Behaviour:** A registered user sees standalone orders plus all their tabs (open and closed), each with status, total and actions. Unauthenticated access redirects to `/login?redirect=/orders`. Empty state when none.

- **Given** an unauthenticated visitor, **When** they open `/orders`, **Then** they are redirected to login.
- **Given** a registered user with orders, **When** they open `/orders`, **Then** their orders and tabs list with statuses.

#### REQ-ORDER-003 — Guest tab access · **Should** · regression

**Source:** `app/(customer)/orders/page.tsx:55`

- **Given** a guest session with a guestId/email, **When** they open `/orders`, **Then** only their own open tabs are shown.

#### REQ-ORDER-004 — Pay & close tab (customer) · **Should** · regression

**Source:** `app/(customer)/orders/tabs/[tabId]/checkout/`

- **Given** an open tab owned by the customer, **When** they choose "Pay & Close Tab" and complete payment, **Then** the tab moves to settling→closed and the orders are marked paid.

> ⚠ **Known gap (#117 P0#4):** rewards cannot be applied on this tab path — eligible rewards come back empty (see REQ-CHECKOUT-009). Test the close-tab/payment flow without expecting a rewards step.

---

## Feature Area 5 — Customer Profile (PROFILE)

**Fixtures/env:** A registered customer with profile + ≥1 saved address.

#### REQ-PROFILE-001 — View/edit personal info · **Should** · regression

**Source:** `app/(customer)/profile/page.tsx`, `personal-info-tab.tsx`

- **Given** a logged-in customer on `/profile`, **When** they edit and save their name/phone, **Then** the change persists and a success toast shows; unauthenticated access redirects to login.

#### REQ-PROFILE-002 — Address management · **Could** · extended

**Source:** `addresses-tab.tsx`

- **Given** the Addresses tab, **When** the customer adds an address and marks it default, **Then** it appears in the list flagged default and is preselected at delivery checkout.

---

## Feature Area 6 — Customer Rewards & Loyalty (REWARDC)

**Fixtures/env:** A customer with ≥1 active reward (with code + expiry), some points balance, and reward/points history.

#### REQ-REWARDC-001 — Active rewards display · **Should** · regression

**Source:** `app/(customer)/profile/rewards/page.tsx` (RewardCard ~222-288)
**Behaviour:** Shows each active reward's code, type (% off / ₦ off / free item / loyalty points) and expiry; rewards expiring ≤3 days show a red countdown badge. Empty state when none.

- **Given** a reward expiring in 2 days, **When** the customer opens `/profile/rewards`, **Then** that reward shows a red expiry badge with a countdown.

#### REQ-REWARDC-002 — Points balance & history · **Could** · extended

**Source:** `profile/rewards/page.tsx:89` (balance + conversion), points history tab

- **Given** a points balance, **When** the customer views the stats, **Then** the balance and its ₦ equivalent (balance ÷ conversionRate) and a transaction history are shown.

---

## Feature Area 7 — Customer Authentication (AUTHC)

**Fixtures/env:** Ability to read the issued PIN (DB seed/test hook) since SMS/email/WhatsApp delivery is stubbed.

#### REQ-AUTHC-001 — Passwordless PIN login · **Must** · smoke

**Source:** `components/shared/auth/login-form.tsx`, `app/actions/auth/send-pin.ts:22`, `verify-pin.ts:20`
**Behaviour:** Choose method (SMS/Email/WhatsApp) → enter phone/email → a 4-digit PIN is sent → enter PIN → session created (7-day iron-session cookie), `phoneVerified=true`, redirect to `?redirect=` (default `/`). Resend has a 60s countdown.

- **Given** the login page, **When** the customer requests and enters the correct PIN, **Then** a session is created and they are redirected.

#### REQ-AUTHC-002 — PIN error handling · **Should** · regression

**Source:** `verify-pin.ts:57,62,69`

- **Given** an expired PIN, **When** the customer submits it, **Then** "PIN has expired" shows.
- **Given** a wrong PIN, **When** submitted, **Then** "Invalid PIN" shows and no session is created.
- **Given** SMS delivery failure (DND/invalid), **When** sending, **Then** a retry-with-email fallback is offered.

#### REQ-AUTHC-003 — Guest checkout · **Should** · regression

**Source:** `app/actions/auth/guest-checkout.ts`

- **Given** a visitor, **When** they choose guest checkout (optional email/name), **Then** a guest session with a `guestId` is created and they can reach `/checkout` and view their orders without a PIN.

---

## Feature Area 8 — Admin Authentication & RBAC (AUTHA)

**Fixtures/env:** Seeded `e2e-admin` (admin) and `e2e-superadmin` (super-admin) via `scripts/seed-e2e-admins.ts`; `E2E_*` credentials in `.env.local`. A CSR user for negative gating.

#### REQ-AUTHA-001 — Admin login · **Must** · smoke

**Source:** `app/actions/auth/admin-login.ts`, `services/admin-service.ts:478` (`authenticate`)
**Behaviour:** `/admin/login` takes username + password (bcrypt-verified). Success sets a session and redirects to `/dashboard`. Wrong credentials show "Invalid credentials".

- **Given** valid admin credentials, **When** submitted at `/admin/login`, **Then** the session is set and `/dashboard` loads.

#### REQ-AUTHA-002 — Failed-login lockout · **Should** · regression

**Source:** `services/admin-service.ts:13` (`MAX_FAILED_ATTEMPTS=5`, `LOCKOUT_DURATION_MS=15m`), `:499`

- **Given** 4 prior failures, **When** a 5th wrong password is submitted, **Then** the account locks for 15 minutes and a lockout message shows; a correct password during lockout is still rejected.

#### REQ-AUTHA-003 — Force password change · **Could** · extended

**Source:** `admin-login.ts:78`

- **Given** an admin with `mustChangePassword`, **When** they log in, **Then** they are redirected to `/admin/change-password`.

#### REQ-AUTHA-004 — RBAC route gating · **Must** · smoke

**Source:** `proxy.ts`, `lib/auth-middleware.ts:90` (`requirePermission`), `lib/permissions.ts:13` (`routePermissions`), `interfaces/admin-permissions.interface.ts`
**Behaviour:** `customer` → no dashboard; `admin` → Orders + Kitchen (per default permissions); `super-admin` → all. Granular `IAdminPermissions` gate menu/inventory/rewards/reports/expenses/settings/kitchen routes; missing permission redirects to `/dashboard/forbidden`. `/api/admin/*` requires an admin session; `/api/public/*` requires an API key.

- **Given** a CSR session, **When** they navigate to `/dashboard/settings`, **Then** they are redirected (forbidden), while a super-admin reaches it.
- **Given** no session, **When** calling `/api/admin/*`, **Then** the response is 401/redirect.

---

## Feature Area 9 — Admin Dashboard Overview (DASH)

**Fixtures/env:** Authenticated super-admin and admin sessions; some orders for stats.

#### REQ-DASH-001 — Overview stats (super-admin) · **Should** · regression

**Source:** `app/dashboard/page.tsx:53` (`DashboardMetrics`), `:170` (recent orders), `:214` (quick stats); cross-ref REQ-007
**Behaviour:** Super-admin sees today's revenue/orders, monthly revenue, average order value, per-order-type breakdown, recent 10 orders, and quick stats (pending orders, low stock, active customers). Empty states when no data.

- **Given** a super-admin, **When** they open `/dashboard`, **Then** the metric cards, recent orders and quick stats render.

#### REQ-DASH-002 — Admin redirect · **Must** · smoke

**Source:** `app/dashboard/page.tsx:303`

- **Given** an admin (non-super) session, **When** they open `/dashboard`, **Then** they are redirected to `/dashboard/orders`.

---

## Feature Area 10 — Order Management (ORDMGT)

**Fixtures/env:** Super-admin/admin session (gate: `orderManagement`); orders across statuses, ≥1 unpaid and ≥1 paid.

#### REQ-ORDMGT-001 — Order queue · **Must** · smoke

**Source:** `app/dashboard/orders/page.tsx`, `app/actions/admin/order-management-actions.ts:42` (filters: status, type, date range, search, paymentStatus, reconciled; pagination)

- **Given** seeded orders, **When** an admin opens `/dashboard/orders` and filters by status, **Then** the matching orders and stats cards render and update live on new orders.

#### REQ-ORDMGT-002 — Order detail · **Should** · regression

**Source:** `app/dashboard/orders/[orderId]/page.tsx` (header, items, payment, timeline, actions sidebar)

- **Given** an order, **When** the admin opens its detail, **Then** items, payment info, status timeline and action sidebar render; an unknown id 404s.

#### REQ-ORDMGT-003 — Edit order items · **Should** · regression

**Source:** `app/actions/admin/order-edit-actions.ts:33` (unpaid-only :47; available-item check :78; customization validation :103)

- **Given** an unpaid order, **When** the admin adds/removes an item, **Then** totals recompute; **Given** a paid order, **When** edit is attempted, **Then** it is blocked with "cannot edit paid orders".

#### REQ-ORDMGT-004 — Price override · **Should** · regression

**Source:** `app/actions/payment/payment-actions.ts:129` (admin-only :131); audit at `:256`

- **Given** an admin overriding an item price with a reason, **When** saved, **Then** the subtotal updates and an audit entry records the reason, admin and timestamp; a non-admin override is rejected.

#### REQ-ORDMGT-005 — Cancel order · **Should** · regression

**Source:** `app/actions/admin/order-management-actions.ts`

- **Given** an unpaid order, **When** the admin cancels with a reason, **Then** the order is cancelled, its tab total recalculates, and it is audit-logged; cancelling a paid/settling order is blocked.

> ⚠ **Known defect (#117 P0#2):** cancellation does **not** reverse loyalty — `services/order-service.ts` `cancelOrder()` restores inventory but writes no reversal `PointsTransaction` and does not re-activate `appliedRewards`. Do not assert points/rewards are restored on cancel until this is fixed; see [§4](#4-roadmap--cross-reference-to-issue-117).

#### REQ-ORDMGT-006 — Manual payment · **Should** · regression

**Source:** `app/actions/admin/order-payment-actions.ts:16`

- **Given** an unpaid order, **When** the admin records a manual cash/transfer/card payment, **Then** `paymentStatus` becomes paid and a socket update fires.

#### REQ-ORDMGT-007 — Order completion → inventory deduction chokepoint · **Must** · regression

**Source:** `services/order-service.ts:806` (`completeOrder`), `app/actions/admin/order-management-actions.ts` (`updateOrderStatusAction`); cross-ref REQ-066, REQ-INV-009/010
**Behaviour:** Order completion via kitchen-display Complete-Order action OR admin order-card "Complete" button routes through `OrderService.completeOrder` — the chokepoint is the **only** place inventory deduction occurs on the customer-order path. The chokepoint flips `Order.inventoryDeducted` on success and writes `inventoryDeductedAt` + `inventoryDeductedBy`. On a deduction throw, the order still flips to `completed` (kitchen workflow can't stall), the action returns `deductionFailed: true` + `deductionError: <message>`, and an IncidentEvent is recorded.

- **Given** a confirmed/in-progress order with stock-tracked items, **When** kitchen-display or an admin marks it `completed`, **Then** `completeOrder` calls `deductStockForOrder`, flips `inventoryDeducted: true` on success, and the items' inventory rows decrement (per REQ-INV-009).
- **Given** insufficient stock at the routed sale point, **When** `completeOrder` runs, **Then** `Order.status` still flips to `completed`, `Order.inventoryDeducted` stays `false`, the action result returns `deductionFailed: true`, and an `inventory_deduction_failed` IncidentEvent is recorded (REQ-INV-010).

---

## Feature Area 11 — Tab Management (TABMGT)

**Fixtures/env:** Super-admin/admin session; open and closed tabs with orders; a tab with partial payments.

#### REQ-TABMGT-001 — Tab list · **Should** · regression

**Source:** `app/dashboard/orders/tabs/page.tsx` (status filter, 25/page, stats, staff-pot)

- **Given** seeded tabs, **When** the admin filters by status, **Then** matching tabs and totals (total/open/closed) render.

#### REQ-TABMGT-002 — Tab detail + partial payments · **Should** · regression

**Source:** `tabs/[tabId]/page.tsx:82` (partial payments incl. tipAmount/tipPaymentMethod); cross-ref REQ-012/035/036

- **Given** a tab with partial payments, **When** the admin opens it, **Then** each payment's amount, note, type, paidAt and any tip details list.

#### REQ-TABMGT-003 — Admin pay tab · **Should** · regression

**Source:** `admin-pay-tab-dialog`; cross-ref REQ-036

- **Given** an open tab, **When** the admin processes payment choosing a method and an independent tip method, **Then** the tab closes and the tip's method is recorded separately from the payment method.

#### REQ-TABMGT-004 — Delete tab · **Could** · extended

**Source:** `delete-tab-dialog`

- **Given** an open tab, **When** the admin deletes it, **Then** it is removed/closed with an audit entry; deleting a closed/paid tab is blocked.

---

## Feature Area 12 — Kitchen (KITCHEN)

**Fixtures/env:** Super-admin (full kitchen access) + an admin with/without `kitchenManagement`; ≥1 recipe with `kitchen-ingredient` inputs and a `menu-item` target; ingredient inventory with units. Cross-ref REQ-034 / REQ-037.

#### REQ-KITCHEN-001 — Kitchen display · **Should** · regression

**Source:** `app/dashboard/kitchen-display/page.tsx` (active statuses), `kitchen-order-grid`

- **Given** active orders, **When** kitchen display loads, **Then** order cards with items, instructions and status actions render full-screen and update on `kitchen:new-order`.

#### REQ-KITCHEN-002 — Kitchen permission gating · **Must** · regression

**Source:** `app/dashboard/kitchen/layout.tsx` (`requirePermission('kitchenManagement')`); cross-ref REQ-034

- **Given** a CSR/admin without `kitchenManagement`, **When** they open `/dashboard/kitchen`, **Then** they are forbidden; a super-admin sees Recipes + Production.

#### REQ-KITCHEN-003 — Recipe CRUD + validation · **Should** · regression

**Source:** `services/recipe-service.ts:41` (target must be `menu-item` :53; ingredients must be `kitchen-ingredient` :87; unit-dimension match; no duplicates; qty>0)

- **Given** the recipe builder, **When** a recipe is saved with a non-kitchen-ingredient input or a zero quantity, **Then** a validation error blocks it; a valid recipe saves and appears in the list with an active toggle.

#### REQ-KITCHEN-004 — Make a batch · **Should** · regression

**Source:** `app/dashboard/kitchen/production/page.tsx`, `ProductionService`

- **Given** an active recipe, **When** the user makes a batch for a yield quantity, **Then** ingredient inventory is deducted, the target item's stock increases, and a production-history entry is created.

#### REQ-KITCHEN-005 — Void batch · **Could** · extended

**Source:** `production-history` (super-admin-only Void)

- **Given** a production record, **When** a super-admin voids it, **Then** it is marked reversed; the Void control is hidden for non-super-admins.

#### REQ-KITCHEN-006 — Kitchen ingredient CRUD · **Could** · extended

**Source:** cross-ref REQ-037 (`e2e/kitchen/inventory-crud.spec.ts`)

- **Given** the kitchen inventory tab, **When** a super-admin edits or deletes an ingredient, **Then** the change persists and the sellable/kitchen counts update.

---

## Feature Area 13 — Menu Management (MENUMGT)

**Fixtures/env:** Super-admin session (gate: `menuManagement`); ≥1 menu item, optionally inventory-tracked with customization inventory links (REQ-030).

#### REQ-MENUMGT-001 — Menu list + stats · **Should** · regression

**Source:** `app/dashboard/menu/page.tsx` (lists only `kind:'menu-item'`; stats total/available/food-vs-drinks)

- **Given** seeded items, **When** the super-admin opens `/dashboard/menu`, **Then** the stats cards and a searchable/filterable table render (kitchen-ingredient stubs excluded).

#### REQ-MENUMGT-002 — Create item · **Should** · regression

**Source:** `app/actions/admin/menu-actions.ts:60`

- **Given** the new-item form, **When** the super-admin saves name/category/price (+ optional `trackInventory`), **Then** a `menu-item` is created and, if tracking, an inventory row is created.

#### REQ-MENUMGT-003 — Edit item + customization inventory links · **Should** · regression

**Source:** `app/dashboard/menu/[itemId]/edit/page.tsx`, `customization-options-builder`; cross-ref REQ-030

- **Given** an item, **When** the super-admin links a customization option to an inventory item with a deduction quantity and saves, **Then** the form persists the link (validated as 24-hex inventoryId + positive deduction).

#### REQ-MENUMGT-004 — Delete/duplicate · **Could** · extended

**Source:** `menu-items-client`

- **Given** an item, **When** the super-admin deletes it, **Then** a confirmation is required and the item leaves the active list.

#### REQ-MENUMGT-005 — Configurable main categories · **Should** · regression

**Source:** `app/dashboard/settings/page.tsx`; `services/main-category-service.ts`; REQ-075.

Pre-REQ-075, `MenuItem.mainCategory` was a hardcoded `'food' | 'drinks'` union. This requirement makes the registry of main categories admin-configurable from `/dashboard/settings`, with reference-counted delete and a server-side rename that cascades across MenuItem rows and the per-main sub-category settings.

- **Given** the super-admin opens `/dashboard/settings`, **When** the Main Categories card renders, **Then** every registry entry shows its label, slug, enabled toggle, and reorder + rename + delete controls.
- **Given** a new label, **When** the admin clicks Add, **Then** a new main category is created with a kebab-case slug derived from the label, `order = max + 1`, `isEnabled: true`, and reserved + duplicate + format guards reject invalid input.
- **Given** an existing slug, **When** the admin renames it through the per-row Rename action, **Then** every `MenuItem.mainCategory` referencing the old slug is rewritten and the sub-category list under `'menu-categories'` is relocated atomically (sequentially; partial failure leaves a discoverable mismatch the admin can re-run rename against).
- **Given** an existing slug that no `MenuItem` references and no sub-category lives under, **When** the admin confirms Delete, **Then** the entry is removed from the registry.
- **Given** ≥1 `MenuItem` references the slug OR ≥1 sub-category lives under it, **When** the admin attempts Delete, **Then** the action errors with the reference counts and the entry is retained.
- **Given** the public envelope contract at `GET /api/public/menu/categories`, **When** any consumer reads it post-REQ-075, **Then** the response shape is `{ mainCategories: [{ slug, label, order, subCategories[] }] }` (BREAKING — supersedes the pre-REQ-075 `{ food: [], drinks: [] }` envelope captured under REQ-API-006).

#### REQ-MENUMGT-006 — Per-main-category report + per-user access control · **Should** · regression

**Source:** `app/dashboard/reports/by-main-category/`; `services/financial-report-service.ts:generateMainCategoryReport`; `lib/permissions.ts:getAllowedMainCategoriesForReports`; REQ-076.

Replicates the Daily Report's revenue / costs / gross-profit / items shape but scoped to one main-category slug at a time, and adds a per-user permission field (`mainCategoryReportAccess`) so admins can be restricted to reporting on specific mains only. The aggregate Daily Report (`/dashboard/reports/daily`) is unchanged.

- **Given** the super-admin opens `/dashboard/reports/by-main-category`, **When** the page renders, **Then** a Main Category dropdown lists every enabled registered main + a date-range picker mirrors the daily-report controls.
- **Given** a selected main + date range, **When** the report renders, **Then** the page shows a revenue items table (name × qty × price × line total), a costs items table (name × qty × costPerUnit × line total), totalRevenue, totalCost, grossProfit, grossProfitMargin (%), itemCount (sum of quantities), and orderCount (distinct orders containing at least one item from this main).
- **Given** a selected main, **When** the operator clicks PDF / Excel / CSV, **Then** a downloaded file named `main-category-report-{slug}-{YYYY-MM-DD}[-{YYYY-MM-DD}].{pdf|xlsx|csv}` contains the same numbers as the on-screen view.
- **Given** an admin user whose `permissions.mainCategoryReportAccess` is `undefined` or `null`, **When** they open the page, **Then** they see all enabled registered mains in the dropdown (back-compat for users created before REQ-076).
- **Given** an admin user whose `permissions.mainCategoryReportAccess` is `['drinks']`, **When** they open the page, **Then** the dropdown shows ONLY "Drinks"; a direct server-action call for a different main slug returns `{ success: false, error: 'Forbidden: not authorized for this main category' }`.
- **Given** an admin user whose `permissions.mainCategoryReportAccess` is `[]`, **When** they navigate to the page, **Then** they are redirected to `/dashboard` with a "no access" indicator.
- **Given** a super-admin, **When** their `permissions.mainCategoryReportAccess` is explicitly `[]`, **Then** they still see all mains (super-admin bypass).
- **Given** the super-admin opens `/dashboard/settings/admins/<adminId>/permissions`, **When** the Main-Category Report Access section renders, **Then** an "Unrestricted" checkbox + a multi-select of registered enabled mains let them set `undefined`, `[]`, or `['food', 'snacks', …]`.

**Honest limitations (documented in the report's footer):** Payments + tips are NOT split per main category (they're order-level and multi-category; payment/tip breakdowns stay on the aggregate Daily Report only). Operating expenses are NOT split per main category. Order count = distinct orders containing at least one item from the selected main; multi-main orders count toward each main's report, so sums don't tie out to the aggregate Daily Report's order count.

---

## Feature Area 14 — Customers (CUST)

**Fixtures/env:** CSR/super-admin session; ≥1 customer with orders.

#### REQ-CUST-001 — Customer list · **Should** · regression

**Source:** `app/dashboard/customers/page.tsx` (gate `requireRole(['csr','super-admin'])`; excludes deleted; 100 most recent)

- **Given** seeded customers, **When** a super-admin opens `/dashboard/customers`, **Then** a table of email/name/role/order count/total spent/verification renders; deleted accounts are excluded.

#### REQ-CUST-002 — Delete + recreate by email · **Could** · extended

**Source:** cross-ref REQ-027 (`e2e/user-deletion-recreation.spec.ts`)

- **Given** a deleted customer, **When** a new account is created with the same email, **Then** creation succeeds without conflict.

---

## Feature Area 15 — Inventory Management (INV)

**Fixtures/env:** Super-admin (snapshots/approvals) + admin (list/recommendations); inventory items with stock/min/max, ≥1 low-stock; a pending snapshot; multi-location items for transfer.

#### REQ-INV-001 — Inventory list with live status · **Should** · regression

**Source:** `app/dashboard/inventory/page.tsx:77` (status computed from currentStock+minimumStock, not cached; low-stock first)

- **Given** items of varying stock, **When** an admin opens `/dashboard/inventory`, **Then** each shows a live in-stock/low/out badge, sorted low-stock first.

#### REQ-INV-002 — Inventory detail · **Should** · regression

**Source:** `inventory/[id]/page.tsx` (history, movements, per-location breakdown)

- **Given** an item, **When** the admin opens its detail, **Then** stock history, movements and (if `trackByLocation`) location breakdown render.

#### REQ-INV-003 — Snapshot submit · **Should** · regression

**Source:** `app/actions/inventory/snapshot-actions.ts:52` (admin/super-admin); cross-ref REQ-018

- **Given** the snapshot form, **When** staff submit counts, **Then** a snapshot with status `pending` is created.

#### REQ-INV-004 — Snapshot approve/reject · **Should** · regression

**Source:** `snapshot-actions.ts:154` (approve, super-admin :162), `:190` (reject, notes required :202); cross-ref REQ-018

- **Given** a pending snapshot, **When** a super-admin approves it, **Then** status→approved and inventory updates to the counted values; **When** rejecting without notes, **Then** a validation error blocks it.

#### REQ-INV-005 — Restock recommendations · **Could** · extended

**Source:** `restock-recommendation-actions.ts:27`; cross-ref REQ-019/020

- **Given** sales history, **When** an admin requests recommendations with filters/strategy, **Then** a prioritized restock report renders; an invalid date range errors.

#### REQ-INV-006 — Stock transfer · **Could** · extended

**Source:** `inventory/transfer/page.tsx`

- **Given** a location-tracked item, **When** an admin transfers stock between locations, **Then** both locations' counts adjust and a movement is recorded.

#### REQ-INV-007 — Cost-snapshot integrity · **Could** · extended

**Source:** cross-ref REQ-022 (`e2e/cost-snapshot.spec.ts`)

- **Given** an order, **When** it is created, **Then** per-item `costPerUnit` is snapshotted so later cost changes don't retroactively alter historical profit.

#### REQ-INV-008 — Units of measurement · **Could** · extended

**Source:** cross-ref REQ-033 (`e2e/units-of-measurement.spec.ts`)

- **Given** the UoM registry, **When** a super-admin adds a unit, **Then** it appears in inventory/recipe dropdowns and enforces dimension matching.

#### REQ-INV-009 — Sale-point routing for deductions · **Must** · regression

**Source:** `services/inventory-service.ts:48` (`applyOrderStockDelta`), `lib/sale-point-location-backfill.ts` (`deriveSalePointLocation`); cross-ref REQ-066 AC8
**Behaviour:** Inventory deductions on the customer-order path route to the `locations[]` entry whose name matches `Inventory.defaultSalesLocation` (front-of-house, typically `chiller1`/`freezer1`). When `defaultSalesLocation` is unset, a "first non-empty" fallback walks `locations[]`. When it points at a bucket below the deduction quantity, `applyOrderStockDelta` **throws** — the system never auto-spills to other locations (operator stipulation). Refills (positive deltas) always land on `locations[0]` (storeroom).

- **Given** an inventory row with `defaultSalesLocation: 'chiller1'` and chiller1.currentStock ≥ deduction, **When** order completion runs, **Then** chiller1 decrements and other location buckets are untouched.
- **Given** an inventory row whose `defaultSalesLocation` bucket has insufficient stock — even when other locations have plenty, **When** order completion runs, **Then** `applyOrderStockDelta` throws `Insufficient stock at defaultSalesLocation='<loc>': have <n>, need <m>`; the chokepoint catches (REQ-ORDMGT-007).
- **Given** a refill (cancel restore or production yield), **When** the delta is positive, **Then** it lands on `locations[0]` regardless of `defaultSalesLocation`.

#### REQ-INV-010 — IncidentEvent model + recording · **Must** · regression

**Source:** `models/incident-event-model.ts`, `services/incident-event-service.ts` (`recordIncident`, `dedupRecent`); cross-ref REQ-066 AC3
**Behaviour:** `IncidentEvent` documents capture operational failures via two kinds: `inventory_deduction_failed` (entityId=orderId, recorded when the chokepoint catches a deduction throw) and `stale_paid_order` (entityId=orderId, recorded by the visibility scan). Each event carries `summary`, `errorDetails.message`, and timestamps. Dedup windows: 1h for `inventory_deduction_failed`, 24h for `stale_paid_order`.

- **Given** an order completion where `applyOrderStockDelta` throws, **When** the chokepoint catches, **Then** an IncidentEvent kind=`inventory_deduction_failed` is written with `entityId` = orderId and `errorDetails.message` = the throw text.
- **Given** an already-recorded `inventory_deduction_failed` event for the same orderId within the last hour, **When** the reconciliation cron retries and throws again, **Then** `IncidentEventService.dedupRecent` suppresses a duplicate write.

#### REQ-INV-011 — Reconciliation cron + stale-paid scan · **Must** · regression

**Source:** `lib/scheduled-jobs.ts`, `services/inventory-service.ts:reconcileMissedDeductions`, `services/order-service.ts:scanStalePaidOrders`; cross-ref REQ-066 AC4 + AC5
**Behaviour:** A 15-minute scheduled job (1) re-runs `deductStockForOrder` for every Order with `inventoryDeducted: false` — `Order.status` is **never mutated** by the cron (operator stipulation); (2) scans for orders with `paymentStatus === 'paid'` AND `status !== 'completed'/'cancelled'` AND age ≥ 2h, recording `stale_paid_order` IncidentEvents within the 24h dedup window. Stops firing for a given order once `inventoryDeducted` flips true or the order is cancelled.

- **Given** an order with `inventoryDeducted: false` AND deductible stock now exists at the routed location, **When** the cron tick runs, **Then** the retry succeeds, the flag flips to `true`, and no further IncidentEvents fire for that order.
- **Given** a paid order older than 2h whose status is `confirmed` (never completed), **When** the cron tick runs, **Then** a `stale_paid_order` IncidentEvent is recorded once, suppressed for the next 24h.

#### REQ-INV-012 — `/dashboard/incidents` page + deduction-failure toast · **Should** · regression

**Source:** `app/dashboard/incidents/page.tsx`; `components/features/kitchen/kitchen-order-card.tsx`, `components/features/admin/orders/admin-order-card.tsx`, `components/features/admin/orders/order-actions-sidebar.tsx`; cross-ref REQ-066 AC6 + AC9, REQ-SETTINGS-005
**Behaviour:** `/dashboard/incidents` lists IncidentEvents newest-first with kind-filter chips; gated by RBAC csr/admin/super-admin AND the `incidentsAccess` permission. When the order-completion action returns a `warning` (from `deductionFailed: true`), the calling UI surface — kitchen-display, admin order-card, or order-actions-sidebar — shows a destructive-variant toast titled "Completed — inventory not deducted" containing the chokepoint's error message and a pointer to `/dashboard/incidents`.

- **Given** an admin/csr/super-admin with `incidentsAccess: true`, **When** they open `/dashboard/incidents`, **Then** IncidentEvents render newest-first with kind-filter chips and Retry-now buttons on the `inventory_deduction_failed` rows (REQ-INV-013).
- **Given** a deduction failure during completion, **When** the action result returns `warning`, **Then** the UI surface that initiated the completion shows the destructive "Completed — inventory not deducted" toast with the message and the `/dashboard/incidents` pointer.

#### REQ-INV-013 — Retry-now remediation + audit log · **Should** · regression

**Source:** `app/actions/admin/incidents-actions.ts:retryInventoryDeductionAction`, `components/features/admin/incident-retry-button.tsx`; cross-ref REQ-066 AC10
**Behaviour:** The per-row "Retry now" button on `/dashboard/incidents` calls `retryInventoryDeductionAction(orderId)`. The action is **idempotent** — when `Order.inventoryDeducted === true` it returns a no-op success; otherwise it invokes `deductStockForOrder`. On success the order's `inventoryDeducted` flips, the row's badge renders ✓ Deducted on next load, and an `incidents.retry_deduction_succeeded` audit-log entry is written. On still-failing it shows a destructive toast and writes `incidents.retry_deduction_failed`.

- **Given** an `inventory_deduction_failed` row whose underlying order has `inventoryDeducted: false` and stock now exists at the routed location, **When** an admin clicks Retry now, **Then** the deduction succeeds, the row's badge flips to ✓ Deducted, and an audit-log entry `incidents.retry_deduction_succeeded` is written.
- **Given** an already-retried row whose `Order.inventoryDeducted` is already `true`, **When** Retry now is clicked again, **Then** the action exits idempotently with success and no further inventory or audit mutation.

---

## Feature Area 16 — Financial Management (FIN)

**Fixtures/env:** Admin/super-admin session; expense categories configured; a sample Moniepoint XLSX for import; a pending expense group.

#### REQ-FIN-001 — Expense create + list · **Should** · regression

**Source:** `app/actions/finance/expense-actions.ts:17` (create, admin+ :24), `:52` (list by date/filters)

- **Given** the expenses page, **When** an admin adds an expense (category, amount>0, date), **Then** it appears in the list and is audit-logged; amount ≤0 errors.

#### REQ-FIN-002 — Bank statement import · **Should** · regression

**Source:** `app/actions/expenses/csv-import-actions.ts:31` (admin :60; XLSX validate :98; dedupe by reference :109; parse :114)

- **Given** a Moniepoint XLSX, **When** an admin uploads it, **Then** parsed expenses list with duplicates (by reference) flagged/skipped; a non-XLSX or >10MB file is rejected with a message.

#### REQ-FIN-003 — Pending expense groups · **Should** · regression

**Source:** `app/actions/finance/pending-expense-actions.ts:49` (create, admin+ :54), `:76` (update); cross-ref REQ-026/032

- **Given** a multi-line expense group, **When** an admin submits it, **Then** it enters the pending queue; a super-admin approving it confirms the batch and creates expense/ledger records.

#### REQ-FIN-004 — Grouped category dropdown · **Could** · extended

**Source:** `expense-categories-actions.ts`; cross-ref REQ-028

- **Given** the expense form, **When** the category dropdown opens, **Then** options are grouped into Direct Costs and Operating Expenses.

#### REQ-FIN-005 — Staff pot · **Could** · extended

**Source:** cross-ref REQ-015 (`e2e/staff-pot.spec.ts`)

- **Given** staff-pot config, **When** a relevant expense/snapshot is approved, **Then** the staff-pot balance updates accordingly.

---

## Feature Area 17 — Reports & Analytics (REPORT)

**Fixtures/env:** Admin/super-admin session; orders with mixed payment methods spanning ≥2 business days; business-day cutoff configured.

#### REQ-REPORT-001 — Daily report accuracy · **Should** · regression

**Source:** `app/actions/reports/report-actions.ts:11` (admin+ :19); cross-ref REQ-013 (payment accuracy), REQ-014 (reconciliation)

- **Given** a day's orders, **When** an admin generates the daily report, **Then** totals, a payment-method breakdown, discrepancies and a reconciliation summary render and reconcile to the orders.

#### REQ-REPORT-002 — Business-day cutoff · **Should** · regression

**Source:** cross-ref REQ-025 (`e2e/business-day-cutoff.spec.ts`)

- **Given** an order created before the configured cutoff, **When** the daily report groups orders, **Then** it is attributed to the prior business day.

#### REQ-REPORT-003 — Profitability report · **Could** · extended

**Source:** `app/actions/admin/profitability-analytics-actions.ts:15`

- **Given** orders with cost data, **When** an admin runs the profitability report for a range, **Then** per-item/category revenue−COGS−overhead breakdown renders.

#### REQ-REPORT-004 — Export · **Could** · extended

**Source:** `report-actions.ts`

- **Given** a generated report, **When** the admin exports PDF/Excel, **Then** a file downloads.

#### REQ-REPORT-005 — Revenue consistency · **Should** · regression

**Source:** `e2e/dashboard-revenue.spec.ts`

- **Given** the same date, **When** comparing the dashboard overview revenue with the daily report, **Then** the figures agree.

---

## Feature Area 18 — Rewards Configuration (REWMGT)

**Fixtures/env:** Admin/super-admin session (gate: `rewardsAndLoyalty`); for free-item rules a target menu item. **No E2E spec currently exists for this area** (see [Appendix A](#appendix-a--assumptions--ambiguities)).

#### REQ-REWMGT-001 — Reward rule CRUD · **Should** · regression

**Source:** `app/actions/admin/reward-rules-actions.ts:95` (create, `requireAdmin` :100; Zod schema :33; rewardType enum :54; campaign dates :56)
**Behaviour:** Create/edit a rule with name, spend threshold, reward type (discount-percentage/discount-fixed/free-item/loyalty-points), reward value, probability, validity days, optional campaign dates and `maxRedemptionsPerUser`. New rules default active.

- **Given** the rule form, **When** a super-admin saves a valid transaction rule, **Then** it appears active in the rules list; an end date ≤ start date, or a free-item rule without a target item, errors.

#### REQ-REWMGT-002 — Social (Instagram) rule · **Could** · extended

**Source:** `reward-rules-actions.ts:42` (`triggerType` incl. `social_instagram`), `:43` (`socialConfig`: hashtag, minViews, postsRequired, windowDays); cross-ref REQ-046

- **Given** a social rule, **When** optional social fields are left blank and Period Type untouched, **Then** it still saves; a `0` posts-required cadence is rejected naming `socialConfig.postsRequired`.

#### REQ-REWMGT-003 — Issued rewards · **Could** · extended

**Source:** `issued-rewards-actions.ts`, `app/dashboard/rewards/issued/page.tsx`

- **Given** issued rewards, **When** an admin filters by status/type and exports CSV, **Then** the filtered set lists and exports; manual issue/expire act on a record.

#### REQ-REWMGT-004 — Templates · **Could** · extended

**Source:** `app/dashboard/rewards/templates/page.tsx:111`

- **Given** a non-free-item template, **When** the admin clicks "Use Template", **Then** a rule is created from it; free-item templates prompt manual setup rather than creating a rule.

---

## Feature Area 19 — Settings & Configuration (SETTINGS)

**Fixtures/env:** Super-admin session; existing Settings/SystemSettings; for admin CRUD a spare username.

#### REQ-SETTINGS-001 — Fees/delivery/hours config · **Should** · regression

**Source:** `app/dashboard/settings/page.tsx`, `SettingsForm`

- **Given** the settings hub, **When** a super-admin changes service fee % / delivery toggles / business hours and saves, **Then** the change persists and is reflected in checkout and the public settings endpoint.

#### REQ-SETTINGS-002 — Admin management · **Should** · regression

**Source:** `app/actions/admin/admin-management-actions.ts:11` (create, `requireSuperAdmin` :21), `:79` (reset password)

- **Given** the admins page, **When** a super-admin creates an admin with a role + permissions, **Then** that admin can log in; a duplicate username errors; password reset returns a one-time temp password.

#### REQ-SETTINGS-003 — API keys · **Should** · regression

**Source:** `app/dashboard/settings/api-keys/page.tsx` (`requireSuperAdmin`), `services/api-key-service.ts:54`

- **Given** the API-keys page, **When** a super-admin creates a key with chosen scopes, **Then** the key string is shown once and stored hashed; revoking it disables future use.

#### REQ-SETTINGS-004 — Data-deletion requests · **Could** · extended

**Source:** `app/dashboard/settings/data-requests/`; cross-ref REQ-027

- **Given** a pending deletion request, **When** a super-admin approves it, **Then** the customer's `accountStatus` becomes `deleted` and it is audit-logged.

#### REQ-SETTINGS-005 — `incidentsAccess` admin permission · **Should** · regression

**Source:** `interfaces/admin-permissions.interface.ts` (`IAdminPermissions.incidentsAccess`), `components/features/admin/dashboard-nav.tsx`, `components/features/admin/permissions-editor.tsx`; cross-ref REQ-066 AC10, REQ-INV-012
**Behaviour:** `IAdminPermissions` includes `incidentsAccess: boolean`. The three role presets (`DEFAULT_ADMIN_PERMISSIONS`, `CSR_DEFAULT_PERMISSIONS`, `SUPER_ADMIN_PERMISSIONS`) default it to `true`. The three read sites (admin-login + permissions-editor + dashboard-nav) **soft-default** to `true` when the key is missing on a User document — legacy users without the field still see the nav link, no data backfill required. The field gates the "Incidents" main-nav item.

- **Given** a newly-created admin with the default preset, **When** they log in, **Then** the dashboard nav includes the "Incidents" link and `/dashboard/incidents` is reachable.
- **Given** a User document predating REQ-066 (the `incidentsAccess` key is missing), **When** the user logs in, **Then** the soft-default of `true` applies and the nav link still appears (no schema migration was run).
- **Given** a super-admin who toggles `incidentsAccess: false` for a specific admin via the permissions editor, **When** that admin reloads, **Then** the "Incidents" nav link is hidden and direct access to `/dashboard/incidents` is denied.

---

## Feature Area 20 — Audit Logs (AUDIT)

**Fixtures/env:** Super-admin session; perform an auditable action (e.g. price override) to generate an entry.

#### REQ-AUDIT-001 — Admin actions are logged · **Should** · regression

**Source:** `app/dashboard/audit-logs/page.tsx`, `AuditLogService.getLogs`
**Behaviour:** Admin actions (create/update/delete/approve/cancel across user/menu/order/inventory/expense/reward/settings/tab) write `userId/userEmail/userRole/action/resource/resourceId/details/ipAddress/createdAt`, visible in the audit-logs table (newest first, action-coloured).

- **Given** an admin performs a price override, **When** they open `/dashboard/audit-logs`, **Then** a matching entry appears with the actor, action and timestamp.

---

## Feature Area 21 — Public REST API (API)

**Fixtures/env:** An API key with known scopes (create via settings or seed); run API tests **serially** to stay under 30 req/min. Response envelope from `lib/api-response.ts`.

#### REQ-API-001 — Auth required · **Must** · smoke

**Source:** `lib/api-key-validator.ts:39` (`authenticateRequest`); cross-ref REQ-007 (`requirements-verification.spec.ts:610`)

- **Given** a protected endpoint (e.g. `GET /api/public/orders`), **When** called without a key, **Then** 401 `{success:false,error:"Unauthorized…"}`.

#### REQ-API-002 — Scope enforcement · **Must** · smoke

**Source:** `api-key-validator.ts` (`requiredScopes.every…`)

- **Given** a key lacking `orders:write`, **When** it POSTs `/api/public/orders`, **Then** 403 forbidden.

#### REQ-API-003 — Response envelope · **Must** · regression

**Source:** `lib/api-response.ts:9`

- **Given** any successful public call, **When** it returns, **Then** the body is `{success:true,data,meta:{…,timestamp}}` (with pagination meta on lists).

#### REQ-API-004 — Health unauthenticated · **Should** · smoke

**Source:** `app/api/public/health/route.ts`

- **Given** no key, **When** calling `GET /api/public/health`, **Then** 200 with `{status,service,version,uptime}`.

#### REQ-API-005 — Rate limiting · **Should** · regression

**Source:** `lib/rate-limiter.ts:82` (`moderate` 30/min for `/api/public/*`)

- **Given** >30 requests/min from one client, **When** the limit is exceeded, **Then** 429 with a `Retry-After` header.

#### REQ-API-006 — Per-group contracts · **Should** · regression

**Source:** `app/api/public/**` (menu, orders, tabs, payments, inventory, customers, rewards, sales, settings, audit-logs, admins)
**Behaviour:** Each group enforces its scope and validates inputs (400 on missing/invalid fields, 404 on unknown id). E.g. `GET /api/public/menu` paginates (default 25, max 100) with `mainCategory`/`category`/`q`; `POST /api/public/orders` validates the order body.

- **Given** `menu:read`, **When** calling `GET /api/public/menu?limit=10`, **Then** 200 with ≤10 items and pagination meta.
- **Given** `menu:read` (REQ-075, BREAKING), **When** calling `GET /api/public/menu/categories`, **Then** 200 with envelope `{ success, data: { mainCategories: [{ slug, label, order, subCategories[] }] }, meta: { timestamp } }`. This supersedes the pre-REQ-075 envelope `{ success, data: { drinks: string[], food: string[] }, meta }` exposed under REQ-071 and is intentionally not back-compatible; clients pinned to the old shape must migrate when REQ-075 ships.

---

## Feature Area 22 — Real-time (Socket.IO) (RT)

**Fixtures/env:** Running app server (Socket.IO in-process at `/api/socket`); two clients (kitchen subscriber + order subscriber).

#### REQ-RT-001 — Order status broadcast · **Could** · extended

**Source:** `lib/socket-server.ts:108` (`emitOrderStatusUpdate` → `order-${orderId}`), `hooks/use-order-socket.ts`

- **Given** a client joined to an order room, **When** the order status changes server-side, **Then** the client receives an `order-status-update` event with the new status.

#### REQ-RT-002 — New-order broadcast to kitchen · **Could** · extended

**Source:** `lib/socket-server.ts:134` (`emitNewOrder` → `kitchen-display`)

- **Given** a kitchen-display subscriber, **When** a new order is created, **Then** it receives a `kitchen:new-order` event with order summary.

---

## Feature Area 23 — Payments & Webhooks (PAY)

**Fixtures/env:** Monnify stubbed at the boundary; ability to POST a correctly-signed (and a wrongly-signed) webhook payload; an order in pending payment.

#### REQ-PAY-001 — Payment init · **Should** · regression

**Source:** `app/api/public/payments/route.ts` (scope `payments:write`)

- **Given** a pending order, **When** payment is initialized, **Then** the response returns a checkout URL + `paymentReference` and the provider.

#### REQ-PAY-002 — Monnify webhook · **Should** · regression

**Source:** `app/api/webhooks/monnify/route.ts:24` (`validateWebhookSignature`)

- **Given** a valid Monnify webhook for an order, **When** received with a correct hash, **Then** the order's `paymentStatus`/`transactionReference`/`paidAt` update and an audit entry is written.

> ⚠ **Known defect (#117 P0#1):** webhook handlers have **no idempotency guard** — a replayed event re-deducts inventory and re-grants points/rewards. A regression test for replay-safety will currently fail (expected, until fixed); see [§4](#4-roadmap--cross-reference-to-issue-117).

#### REQ-PAY-003 — Reject invalid signature · **Must** · regression

**Source:** `app/api/webhooks/{monnify,whatsapp,paystack}/route.ts` (HMAC; WhatsApp `x-hub-signature-256` :8)

- **Given** a webhook with a bad signature, **When** received, **Then** it is rejected and no order changes.

#### REQ-PAY-004 — Tab partial payments · **Should** · regression

**Source:** `tabs/[tabId]/page.tsx`; cross-ref REQ-012

- **Given** an open tab, **When** a partial payment is recorded, **Then** the remaining balance reduces and the payment lists on the tab.

---

## Feature Area 24 — Security (SEC)

**Fixtures/env:** None beyond a running server (mostly unauthenticated assertions; covered today by `requirements-verification.spec.ts`).

#### REQ-SEC-001 — Security headers · **Must** · smoke

**Source:** `next.config.ts:5` (X-Frame-Options DENY, nosniff, Referrer-Policy, Permissions-Policy, CSP; HSTS in prod)

- **Given** any response, **When** inspected, **Then** X-Frame-Options=DENY, X-Content-Type-Options=nosniff and Referrer-Policy are present.

#### REQ-SEC-002 — Session cookie flags · **Should** · regression

**Source:** `lib/session.ts:18` (httpOnly, secure in prod, sameSite=lax, 7-day)

- **Given** a logged-in session, **When** the cookie is inspected, **Then** it is httpOnly and sameSite=lax (and Secure in production).

#### REQ-SEC-003 — CORS hardening · **Should** · regression

**Source:** `lib/cors.ts`; cross-ref REQ-047

- **Given** a cross-origin preflight, **When** the origin is not allow-listed, **Then** no `Access-Control-Allow-Origin` is echoed; a wildcard origin is never combined with credentials.

#### REQ-SEC-004 — Auth rate limit · **Should** · regression

**Source:** `lib/rate-limiter.ts:19` (`strict` 5/min for `/api/auth/*`)

- **Given** `/api/auth/*`, **When** a 6th request hits within 60s, **Then** 429 with Retry-After.

---

## Feature Area 25 — Data Management & Privacy (PRIVACY)

**Fixtures/env:** None for the public pages; a customer + a deletion request for REQ-PRIVACY-002.

#### REQ-PRIVACY-001 — Public legal/privacy pages · **Should** · smoke

**Source:** `app/(public)/privacy`, `app/(public)/data-deletion`

- **Given** any visitor, **When** they open `/privacy` and `/data-deletion`, **Then** both load without authentication.

#### REQ-PRIVACY-002 — Data deletion request → soft delete · **Could** · extended

**Source:** `app/(public)/data-deletion`, `settings/data-requests/`; cross-ref REQ-027

- **Given** a submitted deletion request, **When** a super-admin approves it, **Then** the customer's `accountStatus` becomes `deleted` and they are excluded from active lists.

---

## Feature Area 26 — Won't (this cycle)

Excluded from the E2E suite this cycle, with rationale:

- **Paystack checkout flow** — infrastructure exists but is not wired into the checkout UI (`docs/REQUIREMENTS.md §9`). No observable user path to test.
- **Planned reports** — Weekly/Monthly/Expense/Sales reports are marked 🔜 Planned (`docs/REQUIREMENTS.md §16`). Not implemented.
- **Live SMS/Email/WhatsApp delivery** — third-party delivery is stubbed; we assert PIN issuance and error handling, not carrier delivery.
- **Socket.IO transport internals** — we assert observable broadcast events (REQ-RT-\*) but not reconnection/transport edge cases.

---

## Appendix A — Assumptions & Ambiguities

1. **Reward configuration has no E2E coverage.** No `e2e/*reward*` spec exists (PR #135, the intended reward-rule form spec, was never merged). REQ-REWMGT-\* are written from code; they are prime candidates for the follow-up regression-pack issue.
2. **Customer profile, customer rewards, home, and the menu→cart customer journey** are only covered indirectly; treat REQ-PROFILE/REQ-REWARDC/REQ-HOME/REQ-MENU as new coverage targets.
3. **Public API coverage is shallow.** `requirements-verification.spec.ts` checks health + ~15 endpoints for 401/403/429 only; per-group contract tests (REQ-API-006) are largely unwritten.
4. **Line numbers are indicative** and were captured at authoring time; the file + symbol are authoritative.
5. **Guest-to-registered conversion** is described in `docs/REQUIREMENTS.md §24` but the explicit linking flow was not located in code — flagged as a behaviour to confirm before writing REQ for it.
6. **CSR role** appears in code (`e2e/csr-uat.spec.ts`, `requireRole(['csr',…])`) but is not enumerated in `docs/REQUIREMENTS.md`'s RBAC table; RBAC requirements here include CSR as observed in code.
7. **`/dashboard/kitchen` vs `/dashboard/kitchen-display`** are distinct (management hub vs live display); both documented separately.

---

## Appendix B — E2E Test Environment

### B.1 External dependencies & how to handle them

| Dependency          | Handling                                                                                                             |
| ------------------- | -------------------------------------------------------------------------------------------------------------------- |
| MongoDB             | Real local instance (:27017); seed before runs.                                                                      |
| Admin/CSR users     | `npx tsx scripts/seed-e2e-admins.ts`; credentials in `.env.local` (`E2E_ADMIN_*`, `E2E_SUPER_ADMIN_*`, `E2E_CSR_*`). |
| Menu/inventory data | `scripts/seed-menu.ts`, `seed-food-menu.ts`, `seed-drinks-menu.ts`, `seed-inventory.ts`.                             |
| Monnify/Paystack    | Stub at the API boundary; drive webhooks by POSTing signed payloads. Never call live.                                |
| SMS/Email/WhatsApp  | Stub delivery; read the issued PIN from DB/seed for login tests.                                                     |
| Socket.IO           | In-process; assert observable events.                                                                                |

### B.2 Required fixtures (by area)

- **MENU/CHECKOUT** — seeded categories + items (incl. one with customizations + portions, one out-of-stock), configured Settings (fees, delivery tiers, tax, minimum order).
- **AUTHA/dashboard areas** — seeded admin, super-admin, CSR; storageState via `auth.setup.ts`.
- **ORDMGT/TABMGT/REPORT** — orders across statuses/payment methods spanning ≥2 business days; open + closed tabs; a tab with partial payments.
- **KITCHEN** — recipe with kitchen-ingredient inputs + menu-item target; ingredient inventory with units.
- **INV/FIN** — low-stock items, a pending snapshot, expense categories, a sample Moniepoint XLSX.
- **API** — an API key per scope under test.

### B.3 Suggested mocking strategy

- Mock payment providers and messaging at the network boundary (route interception or a test double service), keeping MongoDB and Socket.IO real.
- For webhook tests, generate the provider signature with the test secret so both valid- and invalid-signature paths are exercised.
- Use `e2e/helpers/evidence.ts` for per-AC evidence screenshots where compliance evidence is required.

---

## 3. E2E Testing Stack

### 3.1 Framework & version

**Playwright** (`@playwright/test`), Chromium (`Desktop Chrome`). Config: `playwright.config.ts`. Tests in `e2e/`. Unit/service tests use **Vitest** under `__tests__/`.

### 3.2 Configuration (`playwright.config.ts`)

- `testDir: ./e2e`, `fullyParallel: true`, `baseURL` = `BASE_URL` or `http://localhost:3000`.
- CI: `retries: 2`, `workers: 1`. Reporters: HTML (`playwright-report/`), JSON (`compliance/evidence/REQ-007/e2e-results.json`), list. `screenshot: 'on'`.
- `webServer` runs `npm run dev` unless `BASE_URL` is set (so tests can target a deployed UAT URL).
- **Projects:** `chromium` (unauthenticated, `requirements-verification.spec.ts`), `auth-setup` (logs in + saves `storageState` to `.auth/*.json`), and ~23 authenticated projects each depending on `auth-setup` (one per feature spec).

### 3.3 Layout & conventions

- **One project per feature spec**, gated behind `auth-setup` for authenticated flows.
- **Auth-skip guard:** `auth.setup.ts` saves empty state if credentials are missing/login fails; authenticated specs verify the session in `beforeEach` and **skip gracefully** rather than fail when unseeded.
- **Naming:** `e2e/<feature>.spec.ts` or `e2e/<area>/<feature>.spec.ts` (e.g. `kitchen/`, `orders/`, `finance/`, `settings/`).
- **Evidence:** `e2e/helpers/evidence.ts` captures per-AC screenshots to `compliance/evidence/REQ-XXX/`.
- API tests run **serially** to stay under the 30 req/min limit.

### 3.4 Running

```bash
npm run dev                                   # or rely on webServer
npx tsx scripts/seed-e2e-admins.ts            # seed admin/super-admin/CSR (+ menu/inventory seeds)
npx playwright test --project=smoke           # fast critical-path subset (CI per-push gate)
npx playwright test --project=regression      # full suite (PR→main + nightly)
npx playwright test e2e/kitchen/...spec.ts    # one spec by path
npx playwright test -g "REQ-034"              # by title/REQ id
BASE_URL=https://wawagardenbar-app-uat.up.railway.app npx playwright test --project=regression   # against UAT
```

**CI gating (current reality):** `ci.yml` Gate 4 seeds the test DB and runs **`--project=smoke`** on every develop push and PR (fast gate). The project-owned **`.github/workflows/e2e-regression.yml`** runs the full **`--project=regression`** suite on PRs to `main` and nightly. Seeding + E2E credentials are wired via `sdlc-config.json` (`e2e_setup_command` / `e2e_env`, regenerated into `ci.yml` — requires devaudit ≥ 0.1.16). In CI a missing/failed login **fails** the run (no silent skips); locally it skips gracefully when admins aren't seeded.

### 3.5 Recommended additions (conventions for new tests authored from this SRS)

- Name new specs by area prefix (e.g. `e2e/rewards/reward-rule-form.spec.ts` for REQ-REWMGT-\*), register a Playwright project depending on `auth-setup`, and keep the auth-skip guard.
- Map each test to its `REQ-<AREA>-NNN` ID in a comment/title so traceability back to this SRS (and onward to `compliance/RTM.md`) is mechanical.
- Prioritize by Suite: cover **Must/smoke** first (auth, menu→cart→checkout→order, RBAC, API auth, security headers), then **Should/regression**, then **Could/extended**.
- Prefer seeding state via scripts/DB over driving long UI prerequisites.

---

## 4. Roadmap & cross-reference to issue #117

[Issue #117](https://github.com/metasession-dev/wawagardenbar-app/issues/117) is the prioritized **customer-facing backlog** (WhatsApp-first comms, Instagram campaigns, P0 correctness bugs, P1–P4 features). It and this SRS play different roles, managed as follows.

**Management model.** This SRS documents **implemented, observable** behaviour — the basis for E2E tests. #117 is the **forward backlog** of mostly-unbuilt work. They join through the repo's existing pipeline: a #117 item is scoped into a `REQ-XXX` change request → gets an `RTM.md` row → and, when it ships, its SRS requirement is **added or upgraded** (new feature areas get new sections; bug-fix items update the affected requirement and clear its known-gap note), citing the implementing `REQ-XXX` in the Source line. The SRS is **not** a place to pre-list unbuilt work — that would create untestable "requirements" and duplicate the backlog. (Note #117 is itself partly stale, e.g. its "no customer points surface" item is already built — REQ-REWARDC-001/002 — which is why the SRS, not the backlog, is the source of truth for current behaviour.)

**Known gaps / defects in documented behaviour.** Items where the SRS describes behaviour that is currently a stub or carries a known bug — test authors should not assert these until the linked #117 item ships:

| SRS requirement                                | #117 item | Nature                                                               |
| ---------------------------------------------- | --------- | -------------------------------------------------------------------- |
| REQ-ORDER-001 (receipt download button)        | P1#7      | Stub — dead button, no handler                                       |
| REQ-CHECKOUT-009 / REQ-ORDER-004 (tab rewards) | P0#4      | Stub — `tab-service.ts:256` returns `eligibleRewards: []`            |
| REQ-PAY-002 / REQ-PAY-003 (webhooks)           | P0#1      | Defect — no idempotency guard; replay re-grants                      |
| REQ-ORDMGT-005 (cancel order)                  | P0#2      | Defect — points/rewards not reversed on cancel                       |
| (reward expiry enforcement)                    | P0#3      | Defect — `RewardsService.expireOldRewards()` has no scheduled caller |

**Planned areas not yet in the SRS.** These enter the SRS as new requirements/areas only when built (each is a #117 band): WhatsApp transactional comms (WA), Instagram engagement campaigns (IG), order reviews, support tickets/queue, real provider-side refunds, reservations/table booking, self-service data export, cookie consent, the `/contact` page, the reorder action, business-hours gate at checkout, max-delivery-distance validation, and the pickup-time slot picker.

---

_End of document._
