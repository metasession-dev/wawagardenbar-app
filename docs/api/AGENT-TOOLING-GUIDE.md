# Wawa Cafe Public API — Agent Tooling Guide

> **Audience:** Developers building AI agent tool functions (MCP servers, LangChain tools,
> OpenAI function-calling schemas, custom orchestrators) that operate against the Wawa Cafe
> Public API.

---

## 1. Overview & Design Philosophy

The API is purpose-built for **agentic automation**. Every endpoint:

- Returns a **deterministic JSON envelope** (`{ success, data, error, meta }`)
- Uses **flat, descriptive field names**
- Supports **period presets** (`today`, `this-week`, `last-30-days`, etc.)
- Returns **pre-aggregated summaries** so agents answer questions in a single call
- Uses **scope-based access control** for least-privilege key provisioning

**Base URL:** `https://<your-domain>/api/public`

---

## 2. Authentication

All endpoints (except `/api/public/health`) require an API key.

| Method | Header |
|---|---|
| Dedicated header | `x-api-key: wawa_abc_7f3a...` |
| Bearer token | `Authorization: Bearer wawa_abc_7f3a...` |

### API Key Scopes

| Scope | Description |
|---|---|
| `menu:read` | Browse menu items and categories |
| `orders:read` | List/view orders, stats, summary |
| `orders:write` | Create orders, update status |
| `inventory:read` | List inventory, alerts, summary |
| `inventory:write` | Adjust stock levels |
| `tabs:read` | List tabs, details, summary |
| `tabs:write` | Create, update, close, delete tabs |
| `customers:read` | List customers, profiles, summary |
| `customers:write` | Create/update customers |
| `payments:read` | View payment status |
| `payments:write` | Initialize/record payments |
| `rewards:read` | View/validate/redeem rewards |
| `analytics:read` | Sales summary (revenue, profit, COGS) |
| `settings:read` | Read app configuration |

### Recommended Scope Sets

| Agent Role | Scopes |
|---|---|
| **Reporting** | `analytics:read`, `orders:read`, `inventory:read`, `tabs:read`, `customers:read` |
| **Order Manager** | `orders:read`, `orders:write`, `tabs:read`, `tabs:write`, `payments:write` |
| **Inventory Manager** | `inventory:read`, `inventory:write`, `menu:read` |
| **Customer Service** | `customers:read`, `customers:write`, `orders:read`, `rewards:read` |

---

## 3. Response Envelope

```jsonc
{
  "success": true,           // boolean — always present
  "data": { ... },           // present on success
  "error": "message",        // present on failure
  "meta": {
    "timestamp": "ISO8601",  // always present
    "page": 1,               // on paginated responses
    "limit": 25,
    "total": 89,
    "totalPages": 4
  }
}
```

**Agent parsing:**
```python
result = call_api(endpoint, params)
if result["success"]:
    return result["data"]
else:
    raise ToolError(result["error"])
```

---

## 4. Period Presets

Used by: `/sales/summary`, `/orders/summary`, `/tabs/summary`, `/customers/summary`

| Value | Description |
|---|---|
| `today` | Current day (default) |
| `yesterday` | Previous day |
| `this-week` / `last-week` | ISO week (Mon–Sun) |
| `this-month` / `last-month` | Calendar month |
| `this-quarter` / `last-quarter` | Fiscal quarter |
| `this-year` / `last-year` | Calendar year |
| `last-7-days` / `last-30-days` / `last-90-days` | Rolling windows |
| `custom` | Requires `startDate` + `endDate` (ISO 8601) |

---

## 5. Rate Limiting & Errors

- **Rate:** 60 req/min per key
- **Max page size:** 100 items, default 25

| Code | Meaning | Agent Action |
|---|---|---|
| `200/201` | Success | Parse `data` |
| `400` | Bad request | Fix params, retry |
| `401` | Unauthorized | Check API key |
| `403` | Forbidden | Need different scope |
| `404` | Not found | Resource missing |
| `409` | Conflict | Duplicate resource |
| `422` | Business rule | Read `error` message |
| `429` | Rate limited | Backoff, retry |
| `500` | Server error | Retry with backoff |

---

## 6. Complete Tool Reference

### 6.1 Sales Summary

**`get_sales_summary`** — `GET /api/public/sales/summary` — `analytics:read`

Params: `period`, `startDate`, `endDate`

Returns: `{ period, revenue: { total, food, drinks, serviceFees, tax, tips, discounts }, costs: { totalCOGS, foodCOGS, drinksCOGS }, profit: { grossProfit, grossMargin, operatingExpenses, netProfit, netMargin }, orders: { total, completed, cancelled, averageValue, byType, byStatus }, payments: { byMethod, byStatus }, topItems[], dailySeries[] }`

### 6.2 Inventory Tools

| Tool | Method | Path | Scope | Description |
|---|---|---|---|---|
| `list_inventory` | GET | `/inventory` | `inventory:read` | Paginated list with stock levels |
| `get_inventory_item` | GET | `/inventory/{id}` | `inventory:read` | Detail with locations, waste, margins |
| `adjust_stock` | PATCH | `/inventory/{id}` | `inventory:write` | Body: `{ quantity, type, reason }` |
| `get_inventory_alerts` | GET | `/inventory/alerts` | `inventory:read` | Low/out-of-stock alerts |
| `get_inventory_summary` | GET | `/inventory/summary` | `inventory:read` | Aggregates, restock needs, high-value items |

### 6.3 Order Tools

| Tool | Method | Path | Scope | Description |
|---|---|---|---|---|
| `list_orders` | GET | `/orders` | `orders:read` | Filter by status/type/payment/date |
| `create_order` | POST | `/orders` | `orders:write` | Body: orderType, items[], customer info |
| `get_order` | GET | `/orders/{id}` | `orders:read` | Full order detail |
| `update_order_status` | PATCH | `/orders/{id}` | `orders:write` | Body: `{ status, cancelReason? }` |
| `get_order_stats` | GET | `/orders/stats` | `orders:read` | Quick aggregates |
| `get_order_summary` | GET | `/orders/summary` | `orders:read` | Period-based with peak hours, daily series |

### 6.4 Tab Tools

| Tool | Method | Path | Scope | Description |
|---|---|---|---|---|
| `list_tabs` | GET | `/tabs` | `tabs:read` | Filter by status/table/customer/date |
| `create_tab` | POST | `/tabs` | `tabs:write` | Body: `{ tableNumber, customerName?, ... }` |
| `get_tab` | GET | `/tabs/{id}` | `tabs:read` | Tab + populated orders |
| `update_tab` | PATCH | `/tabs/{id}` | `tabs:write` | Close, rename, or set tip |
| `delete_tab` | DELETE | `/tabs/{id}` | `tabs:write` | All orders must be cancelled first |
| `get_tab_summary` | GET | `/tabs/summary` | `tabs:read` | Period-based with table usage |

### 6.5 Customer Tools

| Tool | Method | Path | Scope | Description |
|---|---|---|---|---|
| `list_customers` | GET | `/customers` | `customers:read` | Search by email/name/phone |
| `create_customer` | POST | `/customers` | `customers:write` | Body: `{ email, firstName?, ... }` |
| `get_customer` | GET | `/customers/{id}` | `customers:read` | Profile (sensitive fields excluded) |
| `update_customer` | PATCH | `/customers/{id}` | `customers:write` | Safe fields only |
| `get_customer_orders` | GET | `/customers/{id}/orders` | `customers:read` + `orders:read` | Order history |
| `get_customer_summary` | GET | `/customers/summary` | `customers:read` | Acquisition, top spenders, loyalty |

### 6.6 Other Tools

| Tool | Method | Path | Scope | Description |
|---|---|---|---|---|
| `list_menu` | GET | `/menu` | `menu:read` | Browse items/categories |
| `get_menu_item` | GET | `/menu/{id}` | `menu:read` | Item detail |
| `get_rewards` | GET | `/rewards` | `rewards:read` | User or global stats |
| `validate_reward` | POST | `/rewards/validate` | `rewards:read` | Body: `{ userId, code }` |
| `redeem_reward` | POST | `/rewards/redeem` | `rewards:read` | Body: `{ rewardId, orderId }` |
| `health_check` | GET | `/health` | None | Connectivity check |
| `get_settings` | GET | `/settings` | `settings:read` | App config |

---

## 7. Pagination

All list endpoints: `page` (1-indexed), `limit` (max 100, default 25).

```python
def fetch_all(endpoint, params):
    all_items, page = [], 1
    while True:
        r = call_api(endpoint, {**params, "page": page, "limit": 100})
        all_items.extend(r["data"])
        if page >= r["meta"]["totalPages"]:
            break
        page += 1
    return all_items
```

> **Tip:** Prefer `/summary` endpoints over paginating raw records.

---

## 8. Recommended Agent Flows

See [AGENT-TOOLING-FLOWS.md](./AGENT-TOOLING-FLOWS.md) for detailed flow examples, OpenAI
function schemas, and MCP server skeleton code.
