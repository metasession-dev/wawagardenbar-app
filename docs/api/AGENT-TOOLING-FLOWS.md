# Wawa Cafe API — Agent Flows, Schemas & MCP Skeleton

Companion to [AGENT-TOOLING-GUIDE.md](./AGENT-TOOLING-GUIDE.md).

---

## 1. Recommended Agent Flows

### Flow 1: Daily Business Report

```
1. get_sales_summary(period="today")
2. get_order_summary(period="today")
3. get_inventory_alerts()
4. get_tab_summary(period="today")
→ Compose natural language report from all four responses.
```

### Flow 2: Customer Lookup & History

```
1. list_customers(q="ada@example.com")
2. get_customer(customerId=result[0]._id)
3. get_customer_orders(customerId=result[0]._id, limit=5)
→ Present customer profile with recent orders.
```

### Flow 3: Restock Decision

```
1. get_inventory_summary()
2. Review data.needsRestock[]
3. For critical items:
   adjust_stock(inventoryId, quantity, type="addition", reason="Restocked")
→ Confirm restock actions taken.
```

### Flow 4: End-of-Day Tab Closeout

```
1. list_tabs(status="open")
2. For each open tab:
   a. get_tab(tabId)
   b. If orders complete: update_tab(tabId, action="close")
→ Report closed tabs and remaining open tabs.
```

### Flow 5: Weekly Trend Analysis

```
1. get_sales_summary(period="this-week")
2. get_sales_summary(period="last-week")
3. Compare revenue.total, profit.netMargin, orders.total
→ "Revenue up 15% WoW, driven by drinks (+22%)."
```

### Flow 6: New Customer Onboarding

```
1. create_customer(email="new@example.com", firstName="New", lastName="User")
2. If 409 → list_customers(q="new@example.com") (already exists)
3. create_order(orderType="dine-in", tableNumber="T3", items=[...], customerEmail="new@example.com")
→ Customer registered and first order placed.
```

### Flow 7: Tab Lifecycle (Open → Order → Close)

```
1. create_order(orderType="dine-in", useTab="new", customerName="John",
     dineInDetails={tableNumber:"T7"}, items=[...], total=...)
   → Creates tab + first order in one call. Store tab._id.
2. create_order(orderType="dine-in", useTab="existing",
     dineInDetails={tableNumber:"T7"}, items=[...], total=...)
   → Adds second order to the same tab.
3. update_order_status(orderId, status="completed")
4. update_tab(tabId, tipAmount=500)
5. update_tab(tabId, action="close")
→ Tab opened with first order, second order added, completed, tip added, tab closed.
```

**Alternative (using tabId directly):**
```
1. create_tab(tableNumber="T7", customerName="John")  → standalone tab
2. create_order(orderType="dine-in", tabId=tab._id,
     dineInDetails={tableNumber:"T7"}, items=[...], total=...)
3-5. Same as above.
```

---

## 2. OpenAI Function-Calling Schemas

Copy these into your `tools` array for OpenAI's Chat Completions API, or adapt for
LangChain, Anthropic, or any JSON Schema-based tool framework.

### get_sales_summary

```json
{
  "type": "function",
  "function": {
    "name": "get_sales_summary",
    "description": "Get comprehensive sales summary for a time period. Returns revenue (food/drinks split), COGS, gross/net profit, top items, payment breakdown, and daily time-series. Use for questions about revenue, profit, margins, or financial performance.",
    "parameters": {
      "type": "object",
      "properties": {
        "period": {
          "type": "string",
          "enum": ["today", "yesterday", "this-week", "last-week", "this-month", "last-month", "this-quarter", "last-quarter", "this-year", "last-year", "last-7-days", "last-30-days", "last-90-days", "custom"],
          "description": "Time period preset. Defaults to 'today'."
        },
        "startDate": { "type": "string", "description": "ISO 8601 start. Required when period='custom'." },
        "endDate": { "type": "string", "description": "ISO 8601 end. Required when period='custom'." }
      }
    }
  }
}
```

### get_order_summary

```json
{
  "type": "function",
  "function": {
    "name": "get_order_summary",
    "description": "Get period-based order analytics: totals, type/status/payment breakdowns, peak hours, daily series. Use for questions about order volume, trends, busy hours, or order type distribution.",
    "parameters": {
      "type": "object",
      "properties": {
        "period": {
          "type": "string",
          "enum": ["today", "yesterday", "this-week", "last-week", "this-month", "last-month", "this-quarter", "last-quarter", "this-year", "last-year", "last-7-days", "last-30-days", "last-90-days", "custom"],
          "description": "Time period preset. Defaults to 'today'."
        },
        "startDate": { "type": "string", "description": "ISO 8601 start. Required when period='custom'." },
        "endDate": { "type": "string", "description": "ISO 8601 end. Required when period='custom'." },
        "orderType": { "type": "string", "enum": ["dine-in", "pickup", "delivery", "pay-now"], "description": "Filter to one order type." }
      }
    }
  }
}
```

### get_inventory_summary

```json
{
  "type": "function",
  "function": {
    "name": "get_inventory_summary",
    "description": "Get aggregate inventory overview: total stock, value, status distribution, category breakdown, items needing restock, and highest-value items. Use for stock position questions.",
    "parameters": {
      "type": "object",
      "properties": {
        "mainCategory": { "type": "string", "enum": ["drinks", "food"], "description": "Filter by main category." }
      }
    }
  }
}
```

### get_inventory_alerts

```json
{
  "type": "function",
  "function": {
    "name": "get_inventory_alerts",
    "description": "Get low-stock and out-of-stock alerts. Returns items below minimum stock, out-of-stock items, and location-specific alerts. Use for 'are we running low?' questions.",
    "parameters": { "type": "object", "properties": {} }
  }
}
```

### adjust_stock

```json
{
  "type": "function",
  "function": {
    "name": "adjust_stock",
    "description": "Add or deduct inventory stock. Use when restocking from supplier, recording waste, or correcting counts.",
    "parameters": {
      "type": "object",
      "properties": {
        "inventoryId": { "type": "string", "description": "MongoDB ObjectId of the inventory item." },
        "quantity": { "type": "number", "description": "Amount to add or deduct." },
        "type": { "type": "string", "enum": ["addition", "deduction"], "description": "'addition' for restock, 'deduction' for usage/waste." },
        "reason": { "type": "string", "description": "Mandatory reason for audit trail." }
      },
      "required": ["inventoryId", "quantity", "type", "reason"]
    }
  }
}
```

### list_tabs

```json
{
  "type": "function",
  "function": {
    "name": "list_tabs",
    "description": "List dine-in tabs with optional filters. Use to find open tabs, check table status, or review tab history.",
    "parameters": {
      "type": "object",
      "properties": {
        "status": { "type": "string", "enum": ["open", "settling", "closed"] },
        "tableNumber": { "type": "string", "description": "e.g., 'T5'" },
        "paymentStatus": { "type": "string", "enum": ["pending", "paid", "failed"] },
        "page": { "type": "integer", "default": 1 },
        "limit": { "type": "integer", "default": 25 }
      }
    }
  }
}
```

### create_tab

```json
{
  "type": "function",
  "function": {
    "name": "create_tab",
    "description": "Open a new dine-in tab for a table. Returns 409 if table already has an open tab.",
    "parameters": {
      "type": "object",
      "properties": {
        "tableNumber": { "type": "string", "description": "Table identifier." },
        "customerName": { "type": "string" },
        "customerEmail": { "type": "string" },
        "customerPhone": { "type": "string" }
      },
      "required": ["tableNumber"]
    }
  }
}
```

### update_tab

```json
{
  "type": "function",
  "function": {
    "name": "update_tab",
    "description": "Update a tab: close it (action='close'), rename it (customName), or set tip (tipAmount). One action per call.",
    "parameters": {
      "type": "object",
      "properties": {
        "tabId": { "type": "string", "description": "Tab MongoDB ObjectId." },
        "action": { "type": "string", "enum": ["close"], "description": "Close tab without payment." },
        "customName": { "type": "string", "description": "Rename the tab." },
        "tipAmount": { "type": "number", "description": "Set tip >= 0, recalculates total." }
      },
      "required": ["tabId"]
    }
  }
}
```

### get_tab_summary

```json
{
  "type": "function",
  "function": {
    "name": "get_tab_summary",
    "description": "Period-based tab analytics: totals, revenue, table utilisation, daily series. Use for tab performance questions.",
    "parameters": {
      "type": "object",
      "properties": {
        "period": {
          "type": "string",
          "enum": ["today", "yesterday", "this-week", "last-week", "this-month", "last-month", "this-quarter", "last-quarter", "this-year", "last-year", "last-7-days", "last-30-days", "last-90-days", "custom"]
        },
        "startDate": { "type": "string" },
        "endDate": { "type": "string" }
      }
    }
  }
}
```

### list_customers

```json
{
  "type": "function",
  "function": {
    "name": "list_customers",
    "description": "List or search customers. Search by email, phone, or name (min 3 chars). Use to look up specific customers or browse the customer base.",
    "parameters": {
      "type": "object",
      "properties": {
        "q": { "type": "string", "description": "Search query (min 3 chars)." },
        "role": { "type": "string", "enum": ["customer", "admin", "super-admin"] },
        "status": { "type": "string", "enum": ["active", "suspended", "deleted"], "default": "active" },
        "sort": { "type": "string", "default": "-createdAt" },
        "page": { "type": "integer", "default": 1 },
        "limit": { "type": "integer", "default": 25 }
      }
    }
  }
}
```

### create_customer

```json
{
  "type": "function",
  "function": {
    "name": "create_customer",
    "description": "Register a new customer account. Returns 409 if email already exists.",
    "parameters": {
      "type": "object",
      "properties": {
        "email": { "type": "string", "description": "Valid, unique email." },
        "firstName": { "type": "string" },
        "lastName": { "type": "string" },
        "phone": { "type": "string" }
      },
      "required": ["email"]
    }
  }
}
```

### get_customer_summary

```json
{
  "type": "function",
  "function": {
    "name": "get_customer_summary",
    "description": "Period-based customer analytics: totals, new registrations, top spenders, loyalty stats, acquisition trend. Use for customer growth questions.",
    "parameters": {
      "type": "object",
      "properties": {
        "period": {
          "type": "string",
          "enum": ["today", "yesterday", "this-week", "last-week", "this-month", "last-month", "this-quarter", "last-quarter", "this-year", "last-year", "last-7-days", "last-30-days", "last-90-days", "custom"]
        },
        "startDate": { "type": "string" },
        "endDate": { "type": "string" }
      }
    }
  }
}
```

### list_orders

```json
{
  "type": "function",
  "function": {
    "name": "list_orders",
    "description": "List orders with filters. Use to find specific orders or browse order history.",
    "parameters": {
      "type": "object",
      "properties": {
        "status": { "type": "string", "enum": ["pending", "confirmed", "preparing", "ready", "completed", "delivered", "cancelled"] },
        "orderType": { "type": "string", "enum": ["dine-in", "pickup", "delivery", "pay-now"] },
        "paymentStatus": { "type": "string", "enum": ["pending", "paid", "failed", "refunded"] },
        "startDate": { "type": "string" },
        "endDate": { "type": "string" },
        "sort": { "type": "string", "default": "-createdAt" },
        "page": { "type": "integer", "default": 1 },
        "limit": { "type": "integer", "default": 25 }
      }
    }
  }
}
```

### create_order

```json
{
  "type": "function",
  "function": {
    "name": "create_order",
    "description": "Create a new order. For dine-in with tab: use tabId to attach to existing tab, or useTab='new'/'existing' with dineInDetails.tableNumber to create/find a tab automatically. When a tab is involved the response is { order, tab }.",
    "parameters": {
      "type": "object",
      "properties": {
        "orderType": { "type": "string", "enum": ["dine-in", "pickup", "delivery", "pay-now"] },
        "items": {
          "type": "array",
          "items": {
            "type": "object",
            "properties": {
              "menuItemId": { "type": "string" },
              "name": { "type": "string", "description": "Item display name." },
              "price": { "type": "number", "description": "Unit price in Naira." },
              "quantity": { "type": "integer" },
              "portionSize": { "type": "string", "enum": ["full", "half", "quarter"], "default": "full" },
              "subtotal": { "type": "number", "description": "Line item subtotal." },
              "customizations": { "type": "array", "items": { "type": "object" } },
              "specialInstructions": { "type": "string" }
            },
            "required": ["menuItemId", "name", "price", "quantity", "subtotal"]
          },
          "description": "Order items array (min 1)."
        },
        "subtotal": { "type": "number" },
        "tax": { "type": "number" },
        "deliveryFee": { "type": "number" },
        "discount": { "type": "number" },
        "total": { "type": "number", "description": "Final total in Naira." },
        "guestName": { "type": "string" },
        "guestEmail": { "type": "string" },
        "guestPhone": { "type": "string" },
        "userId": { "type": "string", "description": "Registered user ObjectId." },
        "dineInDetails": {
          "type": "object",
          "properties": {
            "tableNumber": { "type": "string" }
          },
          "description": "Required for dine-in orders."
        },
        "specialInstructions": { "type": "string" },
        "tabId": { "type": "string", "description": "Attach order to existing tab by ID." },
        "useTab": { "type": "string", "enum": ["new", "existing"], "description": "'new' creates a tab, 'existing' finds the open tab for the table." },
        "customerName": { "type": "string", "description": "Customer name for new tab creation." }
      },
      "required": ["orderType", "items", "total"]
    }
  }
}
```

### update_order_status

```json
{
  "type": "function",
  "function": {
    "name": "update_order_status",
    "description": "Transition an order to the next status. Valid: pending→confirmed→preparing→ready→completed/delivered. Use 'cancelled' with cancelReason.",
    "parameters": {
      "type": "object",
      "properties": {
        "orderId": { "type": "string" },
        "status": { "type": "string", "enum": ["confirmed", "preparing", "ready", "completed", "delivered", "cancelled"] },
        "cancelReason": { "type": "string", "description": "Required when status='cancelled'." }
      },
      "required": ["orderId", "status"]
    }
  }
}
```

---

## 3. MCP Server Skeleton (TypeScript)

```typescript
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

const BASE = process.env.WAWA_API_BASE_URL!;
const KEY = process.env.WAWA_API_KEY!;

async function api(
  method: string,
  path: string,
  params?: Record<string, string>,
  body?: Record<string, unknown>
) {
  const url = new URL(`${BASE}${path}`);
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      if (v != null && v !== "") url.searchParams.set(k, v);
    }
  }
  const res = await fetch(url, {
    method,
    headers: { "x-api-key": KEY, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.error || `API ${res.status}`);
  return json;
}

const server = new Server(
  { name: "wawa-cafe", version: "1.0.0" },
  { capabilities: { tools: {} } }
);

// Register tools (abbreviated — add all from Section 2)
server.setRequestHandler("tools/list", async () => ({
  tools: [
    {
      name: "get_sales_summary",
      description: "Sales summary with revenue, profit, top items, daily series.",
      inputSchema: {
        type: "object",
        properties: {
          period: { type: "string", default: "today" },
          startDate: { type: "string" },
          endDate: { type: "string" },
        },
      },
    },
    {
      name: "get_inventory_alerts",
      description: "Low-stock and out-of-stock alerts.",
      inputSchema: { type: "object", properties: {} },
    },
    {
      name: "list_tabs",
      description: "List dine-in tabs with filters.",
      inputSchema: {
        type: "object",
        properties: {
          status: { type: "string", enum: ["open", "settling", "closed"] },
          tableNumber: { type: "string" },
          page: { type: "integer" },
          limit: { type: "integer" },
        },
      },
    },
    // ... register remaining tools here
  ],
}));

// Route tool calls
server.setRequestHandler("tools/call", async (request) => {
  const { name, arguments: args } = request.params;
  const p = (args || {}) as Record<string, string>;

  const routes: Record<string, () => Promise<unknown>> = {
    // Summaries (GET, query params only)
    get_sales_summary: () => api("GET", "/api/public/sales/summary", p),
    get_order_summary: () => api("GET", "/api/public/orders/summary", p),
    get_tab_summary: () => api("GET", "/api/public/tabs/summary", p),
    get_customer_summary: () => api("GET", "/api/public/customers/summary", p),
    get_inventory_summary: () => api("GET", "/api/public/inventory/summary", p),
    get_inventory_alerts: () => api("GET", "/api/public/inventory/alerts"),

    // Lists (GET, query params)
    list_orders: () => api("GET", "/api/public/orders", p),
    list_tabs: () => api("GET", "/api/public/tabs", p),
    list_customers: () => api("GET", "/api/public/customers", p),
    list_menu: () => api("GET", "/api/public/menu", p),

    // Detail (GET, path param)
    get_order: () => api("GET", `/api/public/orders/${p.orderId}`),
    get_tab: () => api("GET", `/api/public/tabs/${p.tabId}`),
    get_customer: () => api("GET", `/api/public/customers/${p.customerId}`),
    get_customer_orders: () =>
      api("GET", `/api/public/customers/${p.customerId}/orders`, p),

    // Writes (POST/PATCH/DELETE with body or path)
    create_order: () => api("POST", "/api/public/orders", undefined, args),
    create_tab: () => api("POST", "/api/public/tabs", undefined, args),
    create_customer: () => api("POST", "/api/public/customers", undefined, args),
    update_order_status: () =>
      api("PATCH", `/api/public/orders/${p.orderId}`, undefined, {
        status: p.status,
        cancelReason: p.cancelReason,
      }),
    update_tab: () =>
      api("PATCH", `/api/public/tabs/${p.tabId}`, undefined, {
        action: p.action,
        customName: p.customName,
        tipAmount: p.tipAmount ? Number(p.tipAmount) : undefined,
      }),
    delete_tab: () => api("DELETE", `/api/public/tabs/${p.tabId}`),
    adjust_stock: () =>
      api("PATCH", `/api/public/inventory/${p.inventoryId}`, undefined, {
        quantity: Number(p.quantity),
        type: p.type,
        reason: p.reason,
      }),
  };

  const handler = routes[name];
  if (!handler) {
    return {
      content: [{ type: "text", text: `Unknown tool: ${name}` }],
      isError: true,
    };
  }

  try {
    const result = await handler();
    return { content: [{ type: "text", text: JSON.stringify(result) }] };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { content: [{ type: "text", text: msg }], isError: true };
  }
});

// Start
const transport = new StdioServerTransport();
await server.connect(transport);
```

### Environment Variables

```bash
WAWA_API_BASE_URL=https://your-domain.com
WAWA_API_KEY=wawa_abc_7f3a...
```

### MCP Client Config (Claude Desktop / Windsurf)

```json
{
  "mcpServers": {
    "wawa-cafe": {
      "command": "npx",
      "args": ["tsx", "path/to/wawa-mcp-server.ts"],
      "env": {
        "WAWA_API_BASE_URL": "https://your-domain.com",
        "WAWA_API_KEY": "wawa_abc_..."
      }
    }
  }
}
```

---

## 4. Security Considerations

1. **Never expose API keys** in client-side code or agent system prompts visible to end users.
2. **Use environment variables** for key storage. In cloud deployments, use secret managers.
3. **Provision least-privilege keys.** A reporting agent doesn't need `orders:write`.
4. **Rotate keys periodically.** Generate new keys in the Admin Dashboard → Settings → API Keys.
5. **Monitor usage.** API key usage is logged with timestamps. Review audit logs for anomalies.
6. **Validate agent outputs.** Before executing write operations (create order, adjust stock), implement a confirmation step in your agent flow.
7. **Rate limit awareness.** Build backoff into your agent's API client layer (see Section 5 of the main guide).
8. **Sensitive data.** Customer endpoints never return password hashes, PINs, or session tokens. The API strips these server-side — no client-side filtering needed.

---

## 5. Quick Reference Card

| Question Pattern | Tool | Key Fields |
|---|---|---|
| "How much did we make today?" | `get_sales_summary` | `revenue.total`, `profit.netProfit` |
| "What's our busiest hour?" | `get_order_summary` | `peakHours[0]` |
| "Are we running low on anything?" | `get_inventory_alerts` | `lowStock[]`, `outOfStock[]` |
| "How many open tabs right now?" | `list_tabs(status=open)` | `meta.total` |
| "Who are our top spenders?" | `get_customer_summary` | `topSpenders[]` |
| "How's our stock position?" | `get_inventory_summary` | `totals`, `needsRestock[]` |
| "Revenue trend this month?" | `get_sales_summary(period=this-month)` | `dailySeries[]` |
| "Open a tab for table 5" | `create_tab(tableNumber=T5)` | `data.tabNumber` |
| "Mark order ready" | `update_order_status(status=ready)` | `data.status` |
| "New customer registration" | `create_customer(email=...)` | `data._id` |
