# From Internal Dashboard to AI-Ready API: Refactoring Wawa Cafe's Public API for Agent Automation

**Date:** March 2026
**Author:** Engineering Team
**Status:** Complete

---

## Executive Summary

Wawa Cafe's public API began as a straightforward set of CRUD endpoints serving a Next.js frontend — menu browsing, order placement, customer management, and payment processing. When the requirement arose to support **AI agent automation** — autonomous systems that query sales data, manage inventory, operate tabs, and generate business reports without human intervention — we discovered that the existing API, while functional for a web UI, was fundamentally insufficient for agentic tooling.

This article documents the three-phase journey: **what we started with**, **what we needed**, **what we built**, and the **architectural decisions** that shaped the final design.

---

## Table of Contents

1. [The Starting Point](#1-the-starting-point)
2. [The Requirements](#2-the-requirements)
3. [Phase 1 — Infrastructure Refactoring](#3-phase-1--infrastructure-refactoring)
4. [Phase 2 — Summary Endpoints (The Agent's Eyes)](#4-phase-2--summary-endpoints-the-agents-eyes)
5. [Phase 3 — Full Tab & Customer Lifecycle APIs](#5-phase-3--full-tab--customer-lifecycle-apis)
6. [Phase 4 — Documentation for Machines](#6-phase-4--documentation-for-machines)
7. [Technical Decisions & Trade-offs](#7-technical-decisions--trade-offs)
8. [Before & After: Endpoint Inventory](#8-before--after-endpoint-inventory)
9. [What We Learned](#9-what-we-learned)

---

## 1. The Starting Point

Before this work began, the public API at `/api/public` consisted of **18 route files** organised into six domains:

| Domain | Endpoints | Capabilities |
|---|---|---|
| **Menu** | `GET /menu`, `GET /menu/{id}`, `GET /menu/categories` | Browse items, view details |
| **Orders** | `GET /orders`, `POST /orders`, `GET /orders/{id}`, `PATCH /orders/{id}`, `GET /orders/stats` | CRUD + basic stats |
| **Inventory** | `GET /inventory`, `GET /inventory/{id}`, `PATCH /inventory/{id}`, `GET /inventory/alerts` | List, detail, adjust stock, alerts |
| **Customers** | `GET /customers`, `GET /customers/{id}`, `PATCH /customers/{id}`, `GET /customers/{id}/orders` | List, view, update, order history |
| **Payments** | `POST /payments`, `POST /payments/verify`, `POST /payments/{id}/manual` | Initialize, verify, record manual |
| **Rewards** | `GET /rewards`, `POST /rewards/validate`, `POST /rewards/redeem` | Stats, validate codes, redeem |

These endpoints were designed for a **human-driven frontend**. A user browsing the menu, placing an order, checking their tab — the API answered individual, narrow questions. This design worked well for its purpose.

### What Was Already Right

The existing API had solid foundations that we preserved and built upon:

- **API key authentication** with scope-based access control (`x-api-key` header or `Authorization: Bearer` pattern)
- **Standardised response envelope** — every response wrapped in `{ success, data, error, meta }`
- **Pagination** — consistent `page`/`limit` query parameters with a 100-item cap
- **Mongoose document serialisation** — `serialize()` helper to strip internal Mongoose metadata
- **Error handling** — `withApiAuth()` guard combining authentication, DB connection, and error boundaries

### What Was Missing

When we attempted to wire these endpoints into an AI agent (an LLM-powered assistant for daily reporting, inventory management, and operations), the gaps became immediately apparent:

1. **No summary/analytics endpoints.** To answer "How much revenue did we make this week?", an agent would need to fetch *every order*, paginate through them, and compute totals client-side. Impractical, slow, and wasteful.

2. **No tab management API.** Tabs (dine-in running bills) were managed entirely through server actions in the Next.js frontend. No REST endpoints existed for listing, creating, closing, or summarising tabs.

3. **No period-based querying.** Endpoints accepted raw `startDate`/`endDate` ISO strings, but agents had to compute "this week", "last month", or "last quarter" date ranges themselves — a common source of off-by-one errors.

4. **No customer creation endpoint.** Customers could be listed and updated, but not created through the API. Registration was tightly coupled to the frontend auth flow.

5. **No sales analytics.** Revenue, COGS, profit margins, top-selling items, payment method breakdowns — none of this was available without calling the internal `FinancialReportService` directly.

6. **Missing scopes.** Tab operations had no API key scopes (`tabs:read`, `tabs:write`), meaning the permission model couldn't express tab access.

7. **No agent-oriented documentation.** The existing docs page described endpoints for human developers. There were no function-calling schemas, no MCP server templates, no recommended agent flows.

---

## 2. The Requirements

The brief was clear: **make the API a first-class interface for AI agent automation**. Specifically:

### Functional Requirements

| # | Requirement | Rationale |
|---|---|---|
| R1 | **Sales summary endpoint** with revenue, COGS, gross/net profit, top items, payment breakdown, and daily time-series | Agents need to answer financial questions in a single call |
| R2 | **Inventory summary endpoint** with totals, stock value, category breakdown, restock needs, and high-value items | Agents need a stock position overview without paginating raw records |
| R3 | **Order summary endpoint** with period-based totals, type/status/payment breakdowns, peak hours, and daily series | Agents need operational insights, not just raw order lists |
| R4 | **Complete tab CRUD + summary** — list, create, get, update, close, delete, and period-based summary | Tabs were a blind spot in the API; agents managing dine-in operations had no tools |
| R5 | **Customer creation endpoint** | Agents need to register customers programmatically |
| R6 | **Customer summary** with acquisition trends, top spenders, loyalty stats | Agents answering "How is our customer base growing?" need pre-aggregated data |
| R7 | **Period presets** shared across all summary endpoints | Eliminate date math bugs; provide natural-language-friendly time ranges |
| R8 | **Tab API key scopes** (`tabs:read`, `tabs:write`) | The permission model must cover every domain |

### Non-Functional Requirements

| # | Requirement | How We Met It |
|---|---|---|
| N1 | **Deterministic response shape** | Every endpoint uses the same `{ success, data, error, meta }` envelope |
| N2 | **Pre-aggregated data** | Summary endpoints compute totals, breakdowns, and series server-side |
| N3 | **Flat, descriptive field names** | No deeply nested ambiguous structures; agents can access fields by path |
| N4 | **Data security** | Sensitive fields (PIN hashes, session tokens) stripped server-side; scope-based access control |
| N5 | **Enterprise-compliant documentation** | JSDoc on every route handler; function-calling schemas for OpenAI/Anthropic; MCP server skeleton |
| N6 | **Type safety** | All new code in TypeScript; clean compilation verified |

---

## 3. Phase 1 — Infrastructure Refactoring

Before building new endpoints, we invested in two pieces of shared infrastructure that every summary endpoint would depend on.

### 3.1 Date Period Utility (`/lib/date-periods.ts`)

**Problem:** Every summary endpoint needs to resolve "this week" or "last quarter" into concrete `startDate`/`endDate` pairs. Duplicating this logic across routes would be fragile and inconsistent.

**Solution:** A single `parsePeriodParams(searchParams)` function that:

1. Reads the `period` query parameter (defaults to `"today"`)
2. Validates it against 14 named presets: `today`, `yesterday`, `this-week`, `last-week`, `this-month`, `last-month`, `this-quarter`, `last-quarter`, `this-year`, `last-year`, `last-7-days`, `last-30-days`, `last-90-days`, `custom`
3. For `custom`, validates and parses explicit `startDate`/`endDate` ISO strings
4. Returns a typed `DateRange` object: `{ startDate: Date, endDate: Date, label: string }`

This utility uses `date-fns` (already a project dependency at v4.1.0) for reliable date arithmetic, including ISO week boundaries (Monday start) and quarter/year boundaries.

**Key design choice:** The `label` field (e.g., "This Week", "Last 30 Days") is returned in every summary response. This lets agents include the period name in natural language output without re-deriving it.

### 3.2 Tab API Key Scopes

**Problem:** The `ApiKeyScope` type union and the Mongoose model's validation array both lacked `tabs:read` and `tabs:write`. Tab endpoints couldn't be protected with fine-grained permissions.

**Solution:** A three-file change:

- `/interfaces/api-key.interface.ts` — Added `'tabs:read' | 'tabs:write'` to the `ApiKeyScope` union
- `/constants/api-key-scopes.ts` — Added human-readable labels for the admin UI
- `/models/api-key-model.ts` — Added both values to the `API_KEY_SCOPES` enum array

This was a minimal, surgical change — three files, zero risk to existing endpoints — but it unlocked the entire tab API domain.

---

## 4. Phase 2 — Summary Endpoints (The Agent's Eyes)

The core of this work: four new summary endpoints that transform the API from a CRUD interface into an **analytics layer** that agents can query conversationally.

### 4.1 Sales Summary (`GET /api/public/sales/summary`)

**Scope:** `analytics:read`

This is the most complex endpoint in the suite. It joins data from **four models** — `Order`, `MenuItem`, `Inventory`, and `Expense` — to produce a complete financial picture:

| Section | Fields | Source |
|---|---|---|
| **Revenue** | `total`, `food`, `drinks`, `serviceFees`, `tax`, `tips`, `discounts` | Paid orders, split by `menuItem.mainCategory` |
| **Costs** | `totalCOGS`, `foodCOGS`, `drinksCOGS` | Inventory `costPerUnit` × quantity sold |
| **Profit** | `grossProfit`, `grossMargin` (%), `operatingExpenses`, `netProfit`, `netMargin` (%) | Revenue − COGS − operating expenses (accrual-based) |
| **Orders** | `total`, `completed`, `cancelled`, `averageValue`, `byType`, `byStatus` | All orders in range |
| **Payments** | `byMethod`, `byStatus` | Paid orders grouped by `paymentMethod` |
| **Top Items** | `name`, `category`, `quantity`, `revenue` | Top 10 by revenue |
| **Daily Series** | `date`, `revenue`, `orderCount`, `averageOrderValue` | Day-by-day breakdown |

**Design decision — Revenue attribution:** We use `menuItem.mainCategory` (`"food"` vs `"drinks"`) for the food/drinks revenue split, not the granular `category` field. This was a deliberate choice from our earlier financial reporting refactoring, ensuring consistency between the API and the admin dashboard.

**Design decision — Profit model:** Net profit uses accrual/usage-based logic: `Revenue − COGS − Operating Overhead`. Direct ingredient purchases are tracked separately as cash outflow and are *not* double-subtracted from net profit alongside COGS.

### 4.2 Inventory Summary (`GET /api/public/inventory/summary`)

**Scope:** `inventory:read`

An agent asking "How's our stock?" gets everything in one call:

- **Totals:** `totalItems`, `totalStockUnits`, `totalStockValue` (₦), `averageCostPerUnit`
- **Status distribution:** `inStock`, `lowStock`, `outOfStock` counts
- **Category breakdown:** Grouped by `mainCategory` + `category` with item count, stock, and value
- **Restock needs:** Items where `currentStock ≤ minimumStock`, sorted by deficit (most critical first)
- **High-value items:** Top 10 by total stock value (cost × quantity)

**Technical note:** We initially attempted a Mongoose aggregation pipeline with `$lookup` for this endpoint but hit TypeScript `PipelineStage` typing issues. We refactored to a `.find().populate().lean()` approach with in-memory projection of computed fields. The result is identical, the code is type-safe, and for the typical inventory size (sub-1000 items) the performance difference is negligible.

### 4.3 Order Summary (`GET /api/public/orders/summary`)

**Scope:** `orders:read`

Builds on the existing `/orders/stats` endpoint but adds period awareness, richer breakdowns, and time-series:

- **Totals:** `totalOrders`, `totalRevenue`, `averageOrderValue`, `completedOrders`, `cancelledOrders`, `cancellationRate` (%)
- **By type:** `{ "dine-in": { count, revenue }, "pickup": { count, revenue }, ... }`
- **By status:** `{ pending, confirmed, preparing, ready, completed, delivered, cancelled }`
- **By payment method:** `{ card: { count, revenue }, cash: { count, revenue }, ... }`
- **Peak hours:** `[{ hour: 0-23, orderCount, revenue }]` sorted by order count descending
- **Daily series:** `[{ date, orderCount, revenue, avgValue }]`

The `peakHours` array is particularly useful for agents answering "When should we schedule extra staff?" — a question that previously required manual report generation.

### 4.4 Tab Summary (`GET /api/public/tabs/summary`)

**Scope:** `tabs:read`

- **Totals:** `totalTabs`, `totalRevenue`, `averageTabValue`, `openTabs`, `closedTabs`, `paidTabs`
- **By status:** `{ open, settling, closed }`
- **By payment:** `{ pending, paid, failed }`
- **Table usage:** `[{ tableNumber, tabCount, totalRevenue }]` — which tables generate the most activity
- **Daily series:** `[{ date, tabsOpened, tabsClosed, revenue }]`

### 4.5 Customer Summary (`GET /api/public/customers/summary`)

**Scope:** `customers:read`

- **Totals:** `totalCustomers` (all-time), `newCustomersInPeriod`, `totalSpent`, `averageSpent`, `totalLoyaltyPoints`
- **Top spenders:** Top 10 by lifetime spend with loyalty points
- **By role:** `{ customer, admin, "super-admin" }` counts
- **Acquisition series:** `[{ date, newCustomers }]` — daily new customer registrations

---

## 5. Phase 3 — Full Tab & Customer Lifecycle APIs

### 5.1 Tab CRUD (6 new endpoints)

Tabs were the biggest gap. The frontend managed them through Next.js server actions — functions that execute server-side but are tightly coupled to React components. No external system could create, query, or manage tabs.

We built a complete REST interface:

| Endpoint | Method | Description |
|---|---|---|
| `/api/public/tabs` | GET | List tabs with filtering (status, table, customer, payment, date range), sorting, pagination |
| `/api/public/tabs` | POST | Create a tab for a table. Returns 409 if the table already has an open tab |
| `/api/public/tabs/{tabId}` | GET | Get tab detail with all populated orders |
| `/api/public/tabs/{tabId}` | PATCH | Update: close (action: "close"), rename (customName), or set tip (tipAmount) |
| `/api/public/tabs/{tabId}` | DELETE | Delete tab (precondition: all orders cancelled, tab unpaid) |
| `/api/public/tabs/summary` | GET | Period-based aggregate summary |

**Key decisions:**

- **Duplicate tab prevention:** `POST /tabs` checks for an existing open tab on the same table before creating. This mirrors the business logic already enforced in the frontend checkout flow — customers with an open tab cannot open another one.

- **PATCH semantics:** Rather than separate `/close`, `/rename`, `/tip` endpoints, we use a single PATCH with mutually exclusive body fields. This is more natural for function-calling agents: one tool (`update_tab`) with optional parameters, not three separate tools.

- **DELETE safety:** Tabs cannot be deleted if they contain non-cancelled orders or have been paid. The endpoint returns `422` with a descriptive error, not a silent failure.

- **Audit trail:** Tab deletion logs to the audit system with `'api-system'` as the actor, since API key auth doesn't carry a user identity.

### 5.2 Customer Creation (`POST /api/public/customers`)

**Scope:** `customers:write`

The existing API could list, view, and update customers — but not create them. Registration was embedded in the passwordless auth flow (email → PIN → session). For agents that need to onboard customers programmatically, we added:

- Email validation (must contain `@`, normalised to lowercase)
- Duplicate check (returns `409` if email exists)
- Sensitive field exclusion on the response (no PIN hashes, session tokens)
- Optional fields: `firstName`, `lastName`, `phone`, `preferences`

---

## 6. Phase 4 — Documentation for Machines

Traditional API documentation is written for human developers. Agent tooling requires a different artefact: **structured tool definitions** that an LLM or orchestrator can interpret directly.

We produced three documentation layers:

### 6.1 In-code JSDoc (`@/app/api/public/*/route.ts`)

Every route handler has comprehensive JSDoc covering authentication, rate limits, parameters, return types, status codes, and examples. This serves as the source of truth and is readable in any IDE.

### 6.2 API Documentation Spec (`@/constants/api-docs-spec.ts`)

The structured TypeScript data file that drives the `/docs/api` page. We added documentation for all 12 new endpoints across 3 new sections (Sales Summary, Tabs, Customer Summary) and updated 3 existing sections (Inventory, Orders, Customers). Every endpoint has:

- Method, path, summary, description
- Required scopes
- Path params, query params, request body fields (with types, required flags, descriptions)
- Response fields
- Status codes
- Request/response examples

### 6.3 Agent Tooling Guide (`@/docs/api/AGENT-TOOLING-GUIDE.md` + `AGENT-TOOLING-FLOWS.md`)

Purpose-built documentation for agent developers, including:

- **Complete tool reference** — every endpoint as a named tool with parameters and return shapes
- **OpenAI function-calling JSON schemas** — copy-paste ready for GPT-4, Claude, or any JSON Schema-based framework
- **MCP server skeleton** — a full TypeScript Model Context Protocol server with `tools/list` and `tools/call` handlers
- **Recommended agent flows** — step-by-step sequences for common tasks (daily report, restock decision, tab closeout, customer lookup)
- **Quick reference card** — maps natural language question patterns to tools and key fields
- **Security guidance** — least-privilege scope sets, key rotation, sensitive data handling

---

## 7. Technical Decisions & Trade-offs

### 7.1 In-Memory Aggregation vs. MongoDB Aggregation Pipelines

For summary endpoints, we chose to fetch documents with `.find().lean()` and aggregate in JavaScript rather than using MongoDB's `$group`/`$lookup` aggregation pipelines.

**Reasoning:**
- TypeScript typing for aggregation pipelines is brittle (we hit `PipelineStage` errors in the inventory summary)
- The data volumes are manageable (a busy week might produce ~500 orders, ~100 inventory items, ~30 tabs)
- In-memory logic is easier to test, debug, and modify
- The code remains readable and auditable

**Trade-off:** For very high-volume deployments (thousands of orders per day), MongoDB aggregation would be more efficient. The current approach is appropriate for our scale.

### 7.2 Single PATCH vs. Multiple Action Endpoints

For tabs, we consolidated close/rename/tip into a single `PATCH /tabs/{tabId}` with mutually exclusive body fields. An agent calls one tool (`update_tab`) and specifies the action through parameters.

**Alternative considered:** Separate endpoints (`POST /tabs/{id}/close`, `PATCH /tabs/{id}/name`, etc.). We rejected this because it would multiply tool definitions without adding capability.

### 7.3 Period Presets as a Shared Utility

Rather than hardcoding date logic in each summary endpoint, we extracted `parsePeriodParams()` into `/lib/date-periods.ts`. All four summary endpoints import it. This ensures:

- Consistent week boundaries (ISO Monday start)
- Consistent quarter boundaries
- A single place to add new presets (e.g., `last-365-days`)
- Validated `custom` range parsing

### 7.4 Scope Naming Convention

We followed the `{domain}:{action}` pattern already established (`orders:read`, `inventory:write`). For sales summary, we chose `analytics:read` rather than inventing `sales:read`, because the sales summary is fundamentally a cross-domain analytics query, not a CRUD operation on a "sale" entity.

---

## 8. Before & After: Endpoint Inventory

### Before (18 route files, ~35 endpoints)

```
/api/public/health
/api/public/menu              (GET)
/api/public/menu/{id}         (GET)
/api/public/menu/categories   (GET)
/api/public/orders            (GET, POST)
/api/public/orders/{id}       (GET, PATCH)
/api/public/orders/stats      (GET)
/api/public/inventory         (GET)
/api/public/inventory/{id}    (GET, PATCH)
/api/public/inventory/alerts  (GET)
/api/public/customers         (GET)
/api/public/customers/{id}    (GET, PATCH)
/api/public/customers/{id}/orders (GET)
/api/public/payments          (POST)
/api/public/payments/verify   (POST)
/api/public/payments/{id}/manual (POST)
/api/public/rewards           (GET)
/api/public/rewards/validate  (POST)
/api/public/rewards/redeem    (POST)
/api/public/settings          (GET)
```

### After (27 route files, ~47 endpoints)

```
+ /api/public/sales/summary        (GET)     ← NEW: Financial analytics
+ /api/public/inventory/summary    (GET)     ← NEW: Stock position overview
+ /api/public/orders/summary       (GET)     ← NEW: Order analytics with peak hours
+ /api/public/tabs                 (GET, POST) ← NEW: List + create tabs
+ /api/public/tabs/{tabId}         (GET, PATCH, DELETE) ← NEW: Tab lifecycle
+ /api/public/tabs/summary         (GET)     ← NEW: Tab analytics
+ /api/public/customers/summary    (GET)     ← NEW: Customer analytics
~ /api/public/customers            (POST)    ← ENHANCED: Customer creation added
```

**Net change:** +9 new route files, +12 new endpoint methods, 1 enhanced existing route. Zero breaking changes to existing endpoints.

### Infrastructure Changes

| File | Change |
|---|---|
| `/lib/date-periods.ts` | **New** — shared period preset utility |
| `/interfaces/api-key.interface.ts` | `tabs:read`, `tabs:write` scopes added |
| `/constants/api-key-scopes.ts` | Scope labels for admin UI |
| `/models/api-key-model.ts` | Scope validation array updated |
| `/constants/api-docs-spec.ts` | 12 new endpoint docs across 6 sections |
| `/docs/api/AGENT-TOOLING-GUIDE.md` | **New** — agent tooling reference |
| `/docs/api/AGENT-TOOLING-FLOWS.md` | **New** — schemas, flows, MCP skeleton |

---

## 9. What We Learned

### 1. CRUD is not enough for agents

A CRUD API forces agents into multi-step fetching and client-side aggregation. Every additional step is a latency penalty, a potential failure point, and a token cost. Summary endpoints that return **pre-computed answers** are dramatically more effective for agentic workflows.

### 2. Period presets eliminate an entire class of bugs

Agents computing "last quarter" in different time zones, with different week-start conventions, produce inconsistent results. Server-side period resolution with named presets (`this-quarter`) removes the ambiguity entirely.

### 3. Documentation must be machine-readable

JSDoc and Markdown are for humans. Agents need JSON schemas with typed parameters, enum constraints, and descriptions that help an LLM select the right tool. We now produce both: human-readable docs and machine-consumable function schemas from the same source of truth.

### 4. Scope-based access control maps cleanly to agent roles

A "reporting agent" gets `analytics:read` + `orders:read` + `inventory:read`. An "operations agent" gets `orders:write` + `tabs:write`. The scope model we already had turned out to be a natural fit for agent provisioning.

### 5. Existing service layers are your friend

The Tab API delegates to `TabService` — the same service used by the frontend's server actions. We didn't rewrite business logic; we exposed it through a new interface. This was possible because the service layer was already well-separated from the UI layer, following the architecture's separation of concerns.

### 6. Type safety catches real bugs early

Multiple times during implementation, TypeScript caught issues that would have been runtime errors: incorrect `apiSuccess` call signatures, mismatched Mongoose query types, and undeclared properties on lean documents. The investment in type-safe API response helpers (`apiSuccess`, `apiError`, `withApiAuth`) paid for itself during this extension.

---

## Appendix: File Manifest

All files created or modified during this work:

**New files:**
- `/lib/date-periods.ts`
- `/app/api/public/sales/summary/route.ts`
- `/app/api/public/inventory/summary/route.ts`
- `/app/api/public/orders/summary/route.ts`
- `/app/api/public/tabs/route.ts`
- `/app/api/public/tabs/[tabId]/route.ts`
- `/app/api/public/tabs/summary/route.ts`
- `/app/api/public/customers/summary/route.ts`
- `/docs/api/AGENT-TOOLING-GUIDE.md`
- `/docs/api/AGENT-TOOLING-FLOWS.md`

**Modified files:**
- `/interfaces/api-key.interface.ts`
- `/constants/api-key-scopes.ts`
- `/models/api-key-model.ts`
- `/app/api/public/customers/route.ts`
- `/constants/api-docs-spec.ts`
