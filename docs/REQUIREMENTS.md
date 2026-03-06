# Wawa Garden Bar — Comprehensive Requirements Document

**Document Version:** 1.0  
**Last Updated:** 2026-03-06  
**Status:** Living Document  
**Classification:** Internal

---

## 1. Project Overview

**Wawa Garden Bar** is a full-stack food and drink ordering platform built as a single **Next.js 16 (App Router)** project with a custom HTTP server for Socket.IO. It is a **mobile-first, responsive web app** supporting dine-in (with bar tabs), pickup, delivery, and pay-now orders.

**Currency:** Nigerian Naira (₦) | **Region:** Lagos, Nigeria  
**Production:** Railway auto-deploy from `main` branch

---

## 2. Technical Stack

| Layer | Technology |
|-------|-----------|
| **Framework** | Next.js 16 (App Router), TypeScript 5.6, React 19 |
| **UI** | Shadcn UI, Radix UI, Tailwind CSS 3, Lucide icons |
| **State** | Zustand (cart/order stores), nuqs (URL state), TanStack Query |
| **Forms** | React Hook Form + Zod validation |
| **Database** | MongoDB via Mongoose 8 |
| **Auth** | iron-session 8 (encrypted cookies), bcrypt (admin passwords) |
| **Real-Time** | Socket.IO 4 |
| **Payments** | Monnify (active), Paystack (infrastructure ready) |
| **Email/SMS** | Nodemailer, WhatsApp Business API |
| **Charts/Export** | Recharts, jsPDF, xlsx |
| **Testing** | Vitest (unit), Playwright (E2E) |
| **Hosting** | Railway, Docker support |

---

## 3. Architecture & Project Structure

**Philosophy:** Server-Component-first, Service Layer Pattern, S.O.L.I.D. principles

```
/app                    # Next.js App Router
  /(auth)               #   Login page
  /(customer)           #   Customer pages (orders, profile, rewards)
  /(public)             #   Public pages (privacy, data-deletion)
  /actions              #   Server Actions (42 files across auth, admin, cart, order, etc.)
  /api                  #   Route Handlers
    /admin              #     Admin-only API
    /auth               #     Session/logout endpoints
    /public             #     27 Public REST API routes (API key auth)
    /webhooks           #     Monnify, Paystack, WhatsApp webhooks
  /checkout             #   Multi-step checkout
  /dashboard            #   Admin dashboard (37 pages)
  /menu                 #   Menu browsing
/components             # features (142), shared (36), ui (32)
/interfaces             # 20 TypeScript interface files
/models                 # 20 Mongoose models
/services               # 28 business logic services
/lib                    # 21 utility modules (auth, email, sms, socket, rate-limiter, etc.)
/stores                 # Zustand: cart-store, order-store
/scripts                # 45 migration, seed, and utility scripts
```

**Conventions:** `kebab-case` files, `PascalCase` components, `camelCase` variables, named exports, interfaces over types, maps over enums.

---

## 4. Authentication & Authorization

### Customer Auth (Passwordless)
- Enter phone/email → 4-digit PIN sent (email, SMS, or WhatsApp) → verify → session created
- iron-session cookie: 7-day expiry, httpOnly, secure in production
- Guest checkout: `isGuest: true` + `guestId`; claimable by matching email later

### Admin Auth
- Username + password (bcrypt hashed)
- Failed login tracking with account lockout
- Force password change support

### RBAC

| Role | Dashboard Access |
|------|-----------------|
| `customer` | None (redirected to home) |
| `admin` | Orders + Kitchen only |
| `super-admin` | Full access (all sections) |

### Granular Admin Permissions (`IAdminPermissions`)
`orderManagement`, `menuManagement`, `inventoryManagement`, `rewardsAndLoyalty`, `reportsAndAnalytics`, `expensesManagement`, `settingsAndConfiguration`

### Route Protection (`proxy.ts`)
- Dashboard: admin/super-admin session required
- `/api/admin/*`: admin session required
- `/api/public/*`: API key required
- Customer routes: logged-in session (guest or registered)
- Rate limiting on all `/api/` routes

---

## 5. Customer-Facing Features

### 5.1 Home Page (`/`)
Branding, logo, "View Menu" CTA, feature cards (Dine In, Pickup, Delivery)

### 5.2 Menu (`/menu`)
Category-based navigation (food/drinks subcategories), item cards, search/filter, add to cart

### 5.3 Cart (Zustand store)
Persisted client-side; item quantity, portion sizes (full/half/quarter), customizations, special instructions, running subtotal

### 5.4 Order Tracking (`/order`)
Live status via Socket.IO: Pending → Confirmed → Preparing → Ready → Delivered/Completed

### 5.5 Orders & Tabs Page (`/orders`)
Lists standalone orders and tabs; tab summary with pay/close actions; guest access via guestId/email

### 5.6 Customer Profile (`/profile`)
Edit profile info, address management, order history, preferences

### 5.7 Rewards (`/rewards`, `/profile/rewards`)
Active rewards with codes/expiry, reward history, loyalty points balance, statistics

---

## 6. Menu System

### Data Model (`IMenuItem`)
`name`, `description`, `mainCategory` (food/drinks), `category` (28 subcategories), `price`, `costPerUnit`, `images`, `customizations` (groups with options/prices), `isAvailable`, `preparationTime`, `tags`, `allergens`, `nutritionalInfo` (calories/protein/carbs/fat/spiceLevel), `slug`, `trackInventory`, `portionOptions` (half/quarter with surcharges), `pointsValue`, `pointsRedeemable`, `allowManualPriceOverride`

### Categories
**Food (11):** Starters, Main Courses, Rice Dishes, Swallow, Soups, Pepper Soup, Noodles, Sauce, Small Chops, Desserts, Sides  
**Drinks (18):** Beer (Local/Imported/Craft), Wine, Soft Drinks, Water, Juice, Energy Drink, Malt, Yoghurt, Healthy Soft Drink, Cider, Pre-mixed Spirit, Bitters, Liqueur, Whisky, Tequila, Cocktails

---

## 7. Ordering System

### Order Types
`dine-in` (table number), `pickup` (preferred time), `delivery` (address), `pay-now` (immediate dine-in)

### Order Lifecycle
`pending → confirmed → preparing → ready → out-for-delivery → delivered → completed` | `cancelled` at any unpaid stage

### Order Data Model (`IOrder`)
- **Core:** `orderNumber`, `idempotencyKey`, `userId`/`guestEmail`, `orderType`, `status`, `tabId`, `items[]`
- **Financial:** `subtotal`, `serviceFee`, `tax`, `deliveryFee`, `discount`, `tipAmount`, `total`, `totalCost`, `grossProfit`, `profitMargin`, `operationalCosts`
- **Payment:** `paymentMethod` (card/transfer/ussd/phone/cash), `paymentStatus` (pending/paid/failed/cancelled/refunded)
- **Tracking:** `statusHistory[]`, `estimatedWaitTime`, `kitchenPriority`, `inventoryDeducted`
- **Loyalty:** `pointsUsed`, `pointsValue`, `appliedRewards[]`
- **Per-Item:** `costPerUnit`, `grossProfit`, `profitMargin`, `priceOverridden`, `priceOverrideReason`

### Cancellation Rules
Admins only; mandatory reason; blocked for paid orders or settling tabs; triggers tab total recalculation; audit logged

---

## 8. Tab System (Dine-In Bar Tabs)

### Data Model (`ITab`)
`tabNumber`, `tableNumber`, `status` (open/settling/closed), `orders[]`, `subtotal/serviceFee/tax/total`, `paymentStatus` (pending/paid/failed), `customerName/Email/Phone`

### Lifecycle
`open` (add orders, totals recalculated) → `settling` (payment in progress, no changes) → `closed` (paid)

### Constraints
- Existing open tab → cannot open new or pay separately; must add to existing or close
- Cancelled orders excluded from tab totals (auto-recalculated)
- Guest access via `guestId` or `customerEmail`
- Customer info prepopulated at checkout from tab or profile data

---

## 9. Checkout & Payment

### Multi-Step Checkout (`/checkout`)
Order type → Tab options (dine-in) → Customer details → Delivery details → Special instructions → Review → Payment

### Fee Calculation
- **Service Fee:** configurable % (default 2%)
- **Delivery Fee:** base ₦1,000, reduced ₦500, free above ₦2,000
- **Tax:** optional 7.5% VAT
- **Minimum Order:** ₦1,000

### Payment Providers
- **Monnify (active):** Card, Transfer, USSD, Phone; webhook verification
- **Paystack (ready):** Infrastructure built, not yet in checkout UI
- **Manual (admin):** Cash/transfer/card recording with audit log

### Points Redemption
100 points = ₦1; tracks `pointsUsed`, `pointsValue`, `itemsPaidWithPoints`

---

## 10. Rewards & Loyalty

### Points System
Earned on orders; tracked on User (`loyaltyPoints`, `totalPointsEarned/Spent`); redeemable at checkout

### Reward Rules (`IRewardRule`)
`spendThreshold`, `rewardType` (discount-percentage/fixed, free-item, loyalty-points), `triggerType` (transaction/social_instagram), `probability` (0-100%), `validityDays`, `maxRedemptionsPerUser`, `campaignDates[]`

### Issued Rewards (`IReward`)
Unique `code`, `status` (pending/active/redeemed/expired), `expiresAt`, redemption tracking

### Instagram Rewards
`socialConfig` with hashtag, minViews, pointsAwarded; `InstagramService` for Graph API verification; user `socialProfiles.instagram`

---

## 11. Admin Dashboard

### Overview (`/dashboard`) — Super-Admin Only
Today's revenue/orders, monthly revenue, avg order value, pending orders, low stock, active customers, recent orders

### Dashboard Sections

| Section | Route | Admin | Super-Admin |
|---------|-------|:-----:|:-----------:|
| Overview | `/dashboard` | ❌ | ✅ |
| Orders | `/dashboard/orders` | ✅ | ✅ |
| Kitchen | `/dashboard/kitchen` | ✅ | ✅ |
| Menu | `/dashboard/menu` | ❌ | ✅ |
| Customers | `/dashboard/customers` | ❌ | ✅ |
| Inventory | `/dashboard/inventory` | ❌ | ✅ |
| Rewards | `/dashboard/rewards` | ❌ | ✅ |
| Reports | `/dashboard/reports` | ❌ | ✅ |
| Finance | `/dashboard/finance` | ❌ | ✅ |
| Analytics | `/dashboard/analytics` | ❌ | ✅ |
| Audit Logs | `/dashboard/audit-logs` | ❌ | ✅ |
| Settings | `/dashboard/settings` | ❌ | ✅ |

---

## 12. Order Management (Admin)

- **Order Queue** (`/dashboard/orders`): Real-time via Socket.IO; filters (status, search); batch ops; quick actions; CSV export; stats cards
- **Order Details** (`/dashboard/orders/[orderId]`): Full info, timeline, payment, status actions, notes, customer contact
- **Order Analytics** (`/dashboard/orders/analytics`): Volume trends, revenue, type distribution
- **Order Editing**: Item/quantity edits, price override with reason and audit trail
- **Tab Management** (`/dashboard/orders/tabs`): Filter by status/date, stats, detail view, checkout, deletion
- **Inventory Impact**: `/dashboard/orders/inventory-summary`, `/dashboard/orders/inventory-updates`

---

## 13. Menu Management (Admin — Super-Admin Only)

- **List** (`/dashboard/menu`): Table/grid view, search, category filter, quick actions
- **Create** (`/dashboard/menu/new`): Full form with image upload, customization builder, portion options, dietary info, inventory tracking, SEO metadata
- **Edit** (`/dashboard/menu/[itemId]/edit`): Same form populated, audit trail, unsaved changes warning, duplicate/delete

---

## 14. Inventory Management

### Data Model (`IInventory`)
`menuItemId`, `currentStock`, `minimumStock/maximumStock`, `unit`, `status` (in-stock/low-stock/out-of-stock), `autoReorderEnabled`, `supplier`, `costPerUnit`, `preventOrdersWhenOutOfStock`, sales/waste/restock analytics, `trackByLocation`, `locations[]`

### Stock Movements (`IStockMovement`)
Types: addition/deduction/adjustment; Categories: sale/restock/waste/damage/transfer; location transfers with references

### Inventory Snapshots
Staff daily counts → pending → approved/rejected by super-admin; discrepancy tracking; per-location breakdown

### Dashboard Pages
- `/dashboard/inventory` — List with status/search/filters
- `/dashboard/inventory/[id]` — Detail with history, movements, locations
- `/dashboard/inventory/snapshots` — Snapshot approval workflow
- `/dashboard/inventory/transfer` — Inter-location stock transfers

### Location Tracking
Configurable: store, chiller-1/2/3, other; per-location counts; transfer tracking

---

## 15. Financial Management

### Expense Tracking (`/dashboard/finance/expenses`)
**Direct Costs:** Meat, Oil, Condiments, Vegetables, Gas, Beverages, Other Ingredients  
**Operating:** Utilities, Internet, Maintenance, Fuel, Salaries, Security, Cleaning, Rent, Insurance, Licenses, Other

### Bank Statement Import
Upload CSV/XLSX → parse → approval workflow (pending/approved/rejected) → expense records; deduplication by reference

### Profitability
- Per-order: Revenue - COGS = Gross Profit - Operating Overhead = Net Profit
- Revenue attribution by `mainCategory` (food vs drinks)
- Price history + cost history tracking
- Price override analytics

---

## 16. Reports & Analytics

| Report | Status | Route |
|--------|--------|-------|
| Daily Summary | ✅ | `/dashboard/reports/daily` |
| Inventory | ✅ | `/dashboard/reports/inventory` |
| Profitability | ✅ | `/dashboard/reports/profitability` |
| Profitability Analytics | ✅ | `/dashboard/analytics/profitability` |
| Order Analytics | ✅ | `/dashboard/orders/analytics` |
| Weekly/Monthly/Expense/Sales | 🔜 Planned | — |

Features: Date range selection, PDF/Excel export, charts (Recharts), comparative analysis

---

## 17. Kitchen Display System (`/dashboard/kitchen`)

Full-screen dark mode; active orders (pending/confirmed/preparing/ready); real-time via Socket.IO (`kitchen:new-order`); order cards with items, portion sizes, customizations, special instructions, elapsed time; quick status actions

---

## 18. Rewards Configuration (Admin)

- **Rules** (`/dashboard/rewards/rules`): CRUD, spend threshold, probability, campaign dates, Instagram config
- **Analytics** (`/dashboard/rewards`): Active rules, issued/redeemed counts, redemption rate, charts
- **Issued** (`/dashboard/rewards/issued`): Filter/search, manual issuance, manual expiration
- **Templates** (`/dashboard/rewards/templates`): Pre-configured templates, one-click apply

---

## 19. Settings & Configuration (`/dashboard/settings`)

- **Fees:** Service fee %, delivery fees, minimum order, tax
- **Orders:** Prep time, max orders/hour, guest checkout toggle
- **Delivery:** Radius, delivery/pickup/dine-in toggles
- **Business Hours:** Per-day open/close with closed toggle
- **Contact:** Email, phone, address
- **Payment:** Monnify/Paystack configuration
- **Categories:** Menu categories (reorder/rename/toggle), expense categories
- **Notifications:** Email config and preferences
- **Inventory Locations:** Manage storage locations
- **API Keys** (`/dashboard/settings/api-keys`): Create/revoke with scoped permissions (17 scopes)
- **Admins** (`/dashboard/settings/admins`): Create admins, manage permissions, password resets
- **Data Requests** (`/dashboard/settings/data-requests`): User data deletion processing

---

## 20. Public REST API (27 Endpoints)

Auth: API key via `x-api-key` header | Rate: 30 req/min | Format: `{ success, data, meta }`

| Group | Endpoints | Scopes |
|-------|-----------|--------|
| **Menu** | GET list/categories/[itemId] | `menu:read` |
| **Orders** | GET list/[id]/stats/summary, POST create, PATCH update | `orders:read/write` |
| **Tabs** | GET list/[tabId]/summary, POST create | `tabs:read/write` |
| **Payments** | POST init/verify/[orderId]/manual | `payments:read/write` |
| **Inventory** | GET list/[id]/alerts/summary, PATCH stock | `inventory:read/write` |
| **Customers** | GET list/[id]/[id]/orders/summary, PATCH update | `customers:read/write` |
| **Rewards** | GET list, POST validate/redeem | `rewards:read` |
| **Sales** | GET summary | `analytics:read` |
| **Settings** | GET config | `settings:read` |
| **Health** | GET status | (none) |

---

## 21. Real-Time (Socket.IO)

Custom HTTP server (`server.ts`); path `/api/socket`; events: `kitchen:new-order`, `order:status-updated`, `new-order`; rooms: `kitchen-display`; client hooks: `useOrderSocket`

---

## 22. Security

- **Rate Limiting:** strict (5/min auth), moderate (30/min API), relaxed (120/min general)
- **CORS:** configurable origins, preflight handling
- **Headers:** X-Frame-Options DENY, nosniff, HSTS (prod), CSP
- **Sessions:** httpOnly, secure, sameSite:lax
- **Webhooks:** Monnify hash validation, WhatsApp HMAC, Paystack signature

---

## 23. Audit Logs (`/dashboard/audit-logs`)

All admin actions logged: user/menu/order/inventory/expense/reward/settings/tab/admin operations. Fields: `userId`, `userEmail`, `userRole`, `action`, `resource`, `resourceId`, `details`, `ipAddress`, `userAgent`, `createdAt`

---

## 24. Data Management & Privacy

- Customer data deletion requests (`/data-deletion`) with admin processing
- Privacy policy (`/privacy`)
- Guest-to-registered conversion by matching email

---

## 25. Deployment

- **Railway:** Auto-deploy on push to `main`; health endpoint for healthcheck
- **Branch Strategy:** `develop` → `main` (workflow: `/deploy-main`)
- **MongoDB Warmup:** Non-blocking, 5 retries after server starts
- **Docker:** Dockerfile + docker-compose for local/prod
- **Scripts:** 45 migration/seed/utility scripts

---

## 26. Data Models (20 MongoDB Collections)

| Model | Purpose |
|-------|---------|
| User | Customers + admins with addresses, preferences, loyalty |
| Order | Orders with items, status, payment, profitability |
| MenuItem | Menu catalog with customizations, portions |
| Tab | Dine-in bar tabs linking orders |
| Payment | Payment transactions (Monnify/manual) |
| Inventory | Stock tracking per item with locations |
| StockMovement | Normalized stock change history |
| InventorySnapshot | Staff inventory count submissions |
| InventoryItemCostHistory | Cost per unit history |
| MenuItemPriceHistory | Price change history |
| Reward | Issued customer rewards |
| RewardRule | Reward rules and campaigns |
| PointsTransaction | Loyalty points ledger |
| Expense | Manual expense records |
| UploadedExpense | Imported bank statement expenses |
| Settings | Singleton app configuration |
| SystemSettings | Payment/notification/category config |
| ApiKey | API key records (hashed) |
| AuditLog | Admin action audit trail |

---

## 27. Non-Functional Requirements

- **Performance:** Server components by default; Suspense + streaming; dynamic imports; image optimization
- **Accessibility:** Semantic HTML, ARIA roles, sr-only text
- **Mobile-First:** Tailwind responsive design
- **SEO:** Dynamic metadata, Open Graph tags
- **Reliability:** Idempotency keys on orders, MongoDB connection resilience with retries
- **Observability:** Structured logging, audit trail, health endpoint
- **Data Retention:** Test evidence 7+ years, audit logs permanent

---

*End of Document*
