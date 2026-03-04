# SOP: Agentic API Reporting and Analytics

**Document ID:** SOP-API-002  
**Version:** 1.0  
**Effective Date:** March 4, 2026  
**Department:** Technical Integration / Business Intelligence  
**Applies To:** AI Agents, Analytics Systems, Reporting Tools, Third-party Integrations

---

## Purpose

This Standard Operating Procedure (SOP) provides technical specifications and implementation guidelines for agentic systems to programmatically retrieve financial reports, order analytics, inventory data, and business metrics using the Wawa Garden Bar Public REST API with appropriate parameterization.

---

## Scope

This SOP covers:
- Financial reporting (daily, date range, custom periods)
- Order analytics and statistics
- Inventory reports and alerts
- Customer analytics
- Revenue breakdowns
- Expense tracking
- Parameter validation and optimization
- Data export formats

---

## Prerequisites

- Valid API key with required scopes
- HTTPS-capable client
- JSON request/response handling capability
- Date/time manipulation library (recommended)
- CSV/Excel export capability (optional)

---

## API Authentication

### Required Headers

```http
x-api-key: wawa_your_api_key_here
Content-Type: application/json
```

### Required API Key Scopes

- `analytics:read` - Access to analytics and reports
- `orders:read` - Order data for reporting
- `inventory:read` - Inventory reports
- `payments:read` - Payment and revenue data

---

## Report Types and Endpoints

### 1. Financial Reports

#### 1.1 Daily Financial Summary

**Endpoint:** `GET /api/public/reports/financial/daily`

**Purpose:** Retrieve complete financial summary for a specific date including revenue, costs, expenses, and profit metrics.

**Query Parameters:**

| Parameter | Type | Required | Description | Example | Default |
|-----------|------|----------|-------------|---------|---------|
| `date` | string | ❌ No | Date in ISO format (YYYY-MM-DD) | `2026-03-04` | Today |
| `timezone` | string | ❌ No | IANA timezone identifier | `Africa/Lagos` | `UTC` |
| `currency` | string | ❌ No | Currency code | `NGN` | `NGN` |
| `includeDetails` | boolean | ❌ No | Include item-level details | `true` | `false` |

**Example Request:**

```bash
curl -X GET "https://api.wawagardenbar.com/api/public/reports/financial/daily?date=2026-03-04&includeDetails=true" \
  -H "x-api-key: wawa_your_api_key_here"
```

**Response Structure:**

```json
{
  "success": true,
  "data": {
    "date": "2026-03-04",
    "timezone": "Africa/Lagos",
    "summary": {
      "totalRevenue": 125000,
      "foodRevenue": 85000,
      "drinkRevenue": 40000,
      "orderCount": 45,
      "averageOrderValue": 2777.78,
      "grossProfit": 87500,
      "grossProfitMargin": 70.0,
      "netProfit": 62500,
      "netProfitMargin": 50.0,
      "totalCOGS": 37500,
      "operatingExpenses": 25000
    },
    "revenue": {
      "byCategory": {
        "food": {
          "revenue": 85000,
          "orderCount": 30,
          "items": [
            {
              "name": "Jollof Rice",
              "category": "main-courses",
              "quantity": 25,
              "revenue": 87500,
              "averagePrice": 3500
            }
          ]
        },
        "drinks": {
          "revenue": 40000,
          "orderCount": 15,
          "items": [
            {
              "name": "Star Lager Beer",
              "category": "beer-local",
              "quantity": 50,
              "revenue": 40000,
              "averagePrice": 800
            }
          ]
        }
      },
      "byPaymentMethod": {
        "card": 75000,
        "transfer": 35000,
        "cash": 15000
      }
    },
    "costs": {
      "totalCOGS": 37500,
      "byCategory": {
        "food": 25500,
        "drinks": 12000
      },
      "items": [
        {
          "name": "Jollof Rice",
          "quantity": 25,
          "costPerUnit": 1000,
          "totalCost": 25000,
          "revenue": 87500,
          "grossProfit": 62500,
          "margin": 71.43
        }
      ]
    },
    "expenses": {
      "operatingExpenses": 25000,
      "directCosts": 15000,
      "totalCashOutflow": 40000,
      "byCategory": {
        "utilities": 8000,
        "salaries": 12000,
        "maintenance": 5000
      }
    },
    "metrics": {
      "grossProfitMargin": 70.0,
      "netProfitMargin": 50.0,
      "averageOrderValue": 2777.78,
      "costRatio": 30.0,
      "expenseRatio": 20.0
    }
  },
  "meta": {
    "timestamp": "2026-03-04T20:01:00Z",
    "generatedAt": "2026-03-04T20:01:00Z"
  }
}
```

---

#### 1.2 Date Range Financial Report

**Endpoint:** `GET /api/public/reports/financial/range`

**Purpose:** Retrieve aggregated financial data across multiple days with comparative analysis.

**Query Parameters:**

| Parameter | Type | Required | Description | Example | Validation |
|-----------|------|----------|-------------|---------|------------|
| `startDate` | string | ✅ Yes | Start date (ISO format) | `2026-03-01` | Must be valid date |
| `endDate` | string | ✅ Yes | End date (ISO format) | `2026-03-04` | Must be >= startDate |
| `groupBy` | string | ❌ No | Grouping interval | `day`, `week`, `month` | Default: `day` |
| `timezone` | string | ❌ No | IANA timezone | `Africa/Lagos` | Default: `UTC` |
| `includeComparison` | boolean | ❌ No | Include period comparison | `true` | Default: `false` |
| `compareWith` | string | ❌ No | Comparison period | `previous`, `lastYear` | Requires includeComparison |

**Example Request:**

```bash
curl -X GET "https://api.wawagardenbar.com/api/public/reports/financial/range?startDate=2026-03-01&endDate=2026-03-04&groupBy=day&includeComparison=true&compareWith=previous" \
  -H "x-api-key: wawa_your_api_key_here"
```

**Response Structure:**

```json
{
  "success": true,
  "data": {
    "period": {
      "startDate": "2026-03-01",
      "endDate": "2026-03-04",
      "days": 4,
      "groupBy": "day"
    },
    "summary": {
      "totalRevenue": 450000,
      "totalOrders": 180,
      "averageOrderValue": 2500,
      "grossProfit": 315000,
      "netProfit": 225000,
      "grossProfitMargin": 70.0,
      "netProfitMargin": 50.0
    },
    "breakdown": [
      {
        "date": "2026-03-01",
        "revenue": 100000,
        "orders": 40,
        "grossProfit": 70000,
        "netProfit": 50000
      },
      {
        "date": "2026-03-02",
        "revenue": 120000,
        "orders": 48,
        "grossProfit": 84000,
        "netProfit": 60000
      },
      {
        "date": "2026-03-03",
        "revenue": 105000,
        "orders": 42,
        "grossProfit": 73500,
        "netProfit": 52500
      },
      {
        "date": "2026-03-04",
        "revenue": 125000,
        "orders": 50,
        "grossProfit": 87500,
        "netProfit": 62500
      }
    ],
    "comparison": {
      "previousPeriod": {
        "startDate": "2026-02-26",
        "endDate": "2026-02-29",
        "totalRevenue": 380000,
        "totalOrders": 152
      },
      "changes": {
        "revenue": {
          "absolute": 70000,
          "percentage": 18.42
        },
        "orders": {
          "absolute": 28,
          "percentage": 18.42
        },
        "grossProfit": {
          "absolute": 49000,
          "percentage": 18.42
        }
      }
    },
    "trends": {
      "revenueGrowth": "increasing",
      "orderGrowth": "increasing",
      "averageOrderValueTrend": "stable"
    }
  },
  "meta": {
    "timestamp": "2026-03-04T20:01:00Z"
  }
}
```

---

### 2. Order Analytics

#### 2.1 Order Statistics

**Endpoint:** `GET /api/public/orders/stats`

**Purpose:** Retrieve aggregated order statistics with flexible filtering.

**Query Parameters:**

| Parameter | Type | Required | Description | Example | Validation |
|-----------|------|----------|-------------|---------|------------|
| `startDate` | string | ❌ No | Filter from date | `2026-03-01` | ISO format |
| `endDate` | string | ❌ No | Filter to date | `2026-03-04` | ISO format |
| `status` | string | ❌ No | Filter by status | `completed` | Valid order status |
| `orderType` | string | ❌ No | Filter by type | `dine-in`, `pickup`, `delivery` | Valid type |
| `paymentStatus` | string | ❌ No | Filter by payment | `paid`, `pending` | Valid status |
| `groupBy` | string | ❌ No | Group results | `status`, `type`, `hour`, `day` | Valid grouping |

**Example Request:**

```bash
curl -X GET "https://api.wawagardenbar.com/api/public/orders/stats?startDate=2026-03-01&endDate=2026-03-04&groupBy=type" \
  -H "x-api-key: wawa_your_api_key_here"
```

**Response Structure:**

```json
{
  "success": true,
  "data": {
    "period": {
      "startDate": "2026-03-01",
      "endDate": "2026-03-04"
    },
    "overall": {
      "totalOrders": 180,
      "completedOrders": 175,
      "cancelledOrders": 5,
      "totalRevenue": 450000,
      "averageOrderValue": 2571.43,
      "averageItemsPerOrder": 3.2
    },
    "byType": {
      "dine-in": {
        "count": 120,
        "revenue": 300000,
        "averageValue": 2500,
        "percentage": 66.67
      },
      "pickup": {
        "count": 40,
        "revenue": 100000,
        "averageValue": 2500,
        "percentage": 22.22
      },
      "delivery": {
        "count": 20,
        "revenue": 50000,
        "averageValue": 2500,
        "percentage": 11.11
      }
    },
    "byStatus": {
      "completed": 175,
      "cancelled": 5,
      "pending": 0
    },
    "byPaymentMethod": {
      "card": {
        "count": 100,
        "revenue": 250000
      },
      "transfer": {
        "count": 60,
        "revenue": 150000
      },
      "cash": {
        "count": 20,
        "revenue": 50000
      }
    },
    "peakHours": [
      {
        "hour": 18,
        "orderCount": 45,
        "revenue": 112500
      },
      {
        "hour": 19,
        "orderCount": 40,
        "revenue": 100000
      },
      {
        "hour": 20,
        "orderCount": 35,
        "revenue": 87500
      }
    ]
  },
  "meta": {
    "timestamp": "2026-03-04T20:01:00Z"
  }
}
```

---

### 3. Inventory Reports

#### 3.1 Inventory Status Report

**Endpoint:** `GET /api/public/inventory`

**Purpose:** Retrieve current inventory status with stock levels and alerts.

**Query Parameters:**

| Parameter | Type | Required | Description | Example | Validation |
|-----------|------|----------|-------------|---------|------------|
| `status` | string | ❌ No | Filter by status | `low-stock`, `out-of-stock`, `in-stock` | Valid status |
| `category` | string | ❌ No | Filter by category | `drinks`, `food` | Valid category |
| `location` | string | ❌ No | Filter by location | `bar`, `kitchen`, `storage` | Valid location |
| `sortBy` | string | ❌ No | Sort field | `name`, `stock`, `value` | Valid field |
| `sortOrder` | string | ❌ No | Sort direction | `asc`, `desc` | Default: `asc` |
| `page` | number | ❌ No | Page number | `1` | Min: 1 |
| `limit` | number | ❌ No | Items per page | `50` | Max: 100 |

**Example Request:**

```bash
curl -X GET "https://api.wawagardenbar.com/api/public/inventory?status=low-stock&sortBy=stock&sortOrder=asc&limit=20" \
  -H "x-api-key: wawa_your_api_key_here"
```

**Response Structure:**

```json
{
  "success": true,
  "data": [
    {
      "_id": "inv_123",
      "itemName": "Star Lager Beer",
      "category": "drinks",
      "currentStock": 15,
      "minimumStock": 20,
      "maximumStock": 100,
      "unit": "bottles",
      "status": "low-stock",
      "costPerUnit": 400,
      "totalValue": 6000,
      "locations": {
        "bar": 10,
        "storage": 5
      },
      "lastRestocked": "2026-03-01T10:00:00Z",
      "supplier": "Star Brewery"
    },
    {
      "_id": "inv_456",
      "itemName": "Rice (Jollof)",
      "category": "food",
      "currentStock": 5,
      "minimumStock": 10,
      "maximumStock": 50,
      "unit": "kg",
      "status": "low-stock",
      "costPerUnit": 1000,
      "totalValue": 5000,
      "locations": {
        "kitchen": 5
      },
      "lastRestocked": "2026-03-02T08:00:00Z",
      "supplier": "Local Market"
    }
  ],
  "meta": {
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 2,
      "pages": 1
    },
    "timestamp": "2026-03-04T20:01:00Z"
  }
}
```

---

#### 3.2 Inventory Alerts

**Endpoint:** `GET /api/public/inventory/alerts`

**Purpose:** Retrieve active inventory alerts for low stock, out of stock, and location-specific issues.

**Query Parameters:**

| Parameter | Type | Required | Description | Example | Validation |
|-----------|------|----------|-------------|---------|------------|
| `alertType` | string | ❌ No | Filter by alert type | `low-stock`, `out-of-stock`, `location` | Valid type |
| `severity` | string | ❌ No | Filter by severity | `critical`, `warning`, `info` | Valid severity |
| `category` | string | ❌ No | Filter by category | `drinks`, `food` | Valid category |

**Example Request:**

```bash
curl -X GET "https://api.wawagardenbar.com/api/public/inventory/alerts?severity=critical" \
  -H "x-api-key: wawa_your_api_key_here"
```

**Response Structure:**

```json
{
  "success": true,
  "data": {
    "summary": {
      "totalAlerts": 5,
      "critical": 2,
      "warning": 3,
      "info": 0
    },
    "alerts": [
      {
        "type": "out-of-stock",
        "severity": "critical",
        "itemName": "Guinness Stout",
        "itemId": "inv_789",
        "category": "drinks",
        "currentStock": 0,
        "minimumStock": 20,
        "message": "Item is out of stock. Immediate restocking required.",
        "createdAt": "2026-03-04T15:30:00Z"
      },
      {
        "type": "low-stock",
        "severity": "critical",
        "itemName": "Star Lager Beer",
        "itemId": "inv_123",
        "category": "drinks",
        "currentStock": 15,
        "minimumStock": 20,
        "percentageRemaining": 75,
        "message": "Stock level below minimum threshold.",
        "createdAt": "2026-03-04T18:00:00Z"
      },
      {
        "type": "location",
        "severity": "warning",
        "itemName": "Jollof Rice Mix",
        "itemId": "inv_456",
        "location": "kitchen",
        "currentStock": 3,
        "message": "Kitchen stock running low. Consider transferring from storage.",
        "createdAt": "2026-03-04T19:00:00Z"
      }
    ]
  },
  "meta": {
    "timestamp": "2026-03-04T20:01:00Z"
  }
}
```

---

### 4. Customer Analytics

#### 4.1 Customer Statistics

**Endpoint:** `GET /api/public/customers/stats`

**Purpose:** Retrieve customer analytics including order history, spending patterns, and loyalty metrics.

**Query Parameters:**

| Parameter | Type | Required | Description | Example | Validation |
|-----------|------|----------|-------------|---------|------------|
| `startDate` | string | ❌ No | Filter from date | `2026-03-01` | ISO format |
| `endDate` | string | ❌ No | Filter to date | `2026-03-04` | ISO format |
| `segment` | string | ❌ No | Customer segment | `new`, `returning`, `vip` | Valid segment |
| `minOrders` | number | ❌ No | Min order count | `5` | Min: 1 |
| `minSpend` | number | ❌ No | Min total spend | `10000` | Min: 0 |

**Example Request:**

```bash
curl -X GET "https://api.wawagardenbar.com/api/public/customers/stats?startDate=2026-03-01&endDate=2026-03-04&segment=vip" \
  -H "x-api-key: wawa_your_api_key_here"
```

**Response Structure:**

```json
{
  "success": true,
  "data": {
    "period": {
      "startDate": "2026-03-01",
      "endDate": "2026-03-04"
    },
    "summary": {
      "totalCustomers": 120,
      "newCustomers": 25,
      "returningCustomers": 95,
      "vipCustomers": 15,
      "totalOrders": 180,
      "totalRevenue": 450000,
      "averageLifetimeValue": 3750,
      "averageOrdersPerCustomer": 1.5
    },
    "segments": {
      "new": {
        "count": 25,
        "orders": 25,
        "revenue": 62500,
        "averageOrderValue": 2500
      },
      "returning": {
        "count": 95,
        "orders": 140,
        "revenue": 350000,
        "averageOrderValue": 2500
      },
      "vip": {
        "count": 15,
        "orders": 60,
        "revenue": 150000,
        "averageOrderValue": 2500,
        "averageOrdersPerCustomer": 4
      }
    },
    "topCustomers": [
      {
        "customerId": "cust_123",
        "name": "John Doe",
        "email": "john@example.com",
        "totalOrders": 12,
        "totalSpent": 30000,
        "averageOrderValue": 2500,
        "lastOrderDate": "2026-03-04"
      }
    ]
  },
  "meta": {
    "timestamp": "2026-03-04T20:01:00Z"
  }
}
```

---

## Implementation Examples

### Example 1: Daily Financial Report (JavaScript)

```javascript
class WawaReportingClient {
  constructor(apiKey, baseUrl = 'https://api.wawagardenbar.com') {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
  }

  async getDailyFinancialReport(date = null, options = {}) {
    const params = new URLSearchParams();
    
    // Date parameter (defaults to today)
    if (date) {
      params.append('date', this.formatDate(date));
    }
    
    // Optional parameters
    if (options.timezone) {
      params.append('timezone', options.timezone);
    }
    
    if (options.includeDetails !== undefined) {
      params.append('includeDetails', options.includeDetails.toString());
    }
    
    if (options.currency) {
      params.append('currency', options.currency);
    }
    
    const url = `${this.baseUrl}/api/public/reports/financial/daily?${params}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'x-api-key': this.apiKey,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }
    
    const result = await response.json();
    
    if (!result.success) {
      throw new Error(result.error.message);
    }
    
    return result.data;
  }

  formatDate(date) {
    // Convert Date object to YYYY-MM-DD
    if (date instanceof Date) {
      return date.toISOString().split('T')[0];
    }
    return date;
  }
}

// Usage
const client = new WawaReportingClient(process.env.WAWA_API_KEY);

// Get today's report
const todayReport = await client.getDailyFinancialReport();
console.log(`Revenue: ₦${todayReport.summary.totalRevenue}`);
console.log(`Net Profit: ₦${todayReport.summary.netProfit}`);

// Get specific date with details
const detailedReport = await client.getDailyFinancialReport('2026-03-04', {
  timezone: 'Africa/Lagos',
  includeDetails: true,
  currency: 'NGN'
});
```

---

### Example 2: Date Range Report with Comparison (Python)

```python
import requests
from datetime import datetime, timedelta
from typing import Optional, Dict, Any

class WawaReportingClient:
    def __init__(self, api_key: str, base_url: str = 'https://api.wawagardenbar.com'):
        self.api_key = api_key
        self.base_url = base_url
        self.headers = {
            'x-api-key': api_key,
            'Content-Type': 'application/json'
        }
    
    def get_date_range_report(
        self,
        start_date: str,
        end_date: str,
        group_by: str = 'day',
        include_comparison: bool = False,
        compare_with: Optional[str] = None,
        timezone: str = 'UTC'
    ) -> Dict[str, Any]:
        """
        Get financial report for a date range.
        
        Args:
            start_date: Start date in YYYY-MM-DD format
            end_date: End date in YYYY-MM-DD format
            group_by: Grouping interval ('day', 'week', 'month')
            include_comparison: Include period comparison
            compare_with: Comparison period ('previous', 'lastYear')
            timezone: IANA timezone identifier
        
        Returns:
            Financial report data
        """
        params = {
            'startDate': start_date,
            'endDate': end_date,
            'groupBy': group_by,
            'timezone': timezone
        }
        
        if include_comparison:
            params['includeComparison'] = 'true'
            if compare_with:
                params['compareWith'] = compare_with
        
        url = f"{self.base_url}/api/public/reports/financial/range"
        response = requests.get(url, headers=self.headers, params=params)
        response.raise_for_status()
        
        result = response.json()
        
        if not result.get('success'):
            raise Exception(result.get('error', {}).get('message', 'Unknown error'))
        
        return result['data']
    
    def get_last_n_days_report(self, days: int = 7) -> Dict[str, Any]:
        """Get report for the last N days."""
        end_date = datetime.now()
        start_date = end_date - timedelta(days=days-1)
        
        return self.get_date_range_report(
            start_date=start_date.strftime('%Y-%m-%d'),
            end_date=end_date.strftime('%Y-%m-%d'),
            group_by='day',
            include_comparison=True,
            compare_with='previous'
        )

# Usage
client = WawaReportingClient(api_key=os.environ['WAWA_API_KEY'])

# Get last 7 days with comparison
report = client.get_last_n_days_report(days=7)

print(f"Period: {report['period']['startDate']} to {report['period']['endDate']}")
print(f"Total Revenue: ₦{report['summary']['totalRevenue']:,}")
print(f"Total Orders: {report['summary']['totalOrders']}")

if 'comparison' in report:
    revenue_change = report['comparison']['changes']['revenue']
    print(f"Revenue Change: {revenue_change['percentage']:.2f}% ({revenue_change['absolute']:+,})")
```

---

### Example 3: Order Analytics with Multiple Filters

```javascript
async function getOrderAnalytics(options = {}) {
  const {
    startDate,
    endDate,
    status,
    orderType,
    paymentStatus,
    groupBy = 'type'
  } = options;
  
  const params = new URLSearchParams();
  
  // Add all provided parameters
  if (startDate) params.append('startDate', startDate);
  if (endDate) params.append('endDate', endDate);
  if (status) params.append('status', status);
  if (orderType) params.append('orderType', orderType);
  if (paymentStatus) params.append('paymentStatus', paymentStatus);
  if (groupBy) params.append('groupBy', groupBy);
  
  const response = await fetch(
    `https://api.wawagardenbar.com/api/public/orders/stats?${params}`,
    {
      headers: {
        'x-api-key': process.env.WAWA_API_KEY
      }
    }
  );
  
  const result = await response.json();
  return result.data;
}

// Usage: Get completed dine-in orders for last week
const lastWeek = {
  startDate: '2026-02-26',
  endDate: '2026-03-04',
  status: 'completed',
  orderType: 'dine-in',
  groupBy: 'day'
};

const analytics = await getOrderAnalytics(lastWeek);

console.log('Order Analytics:');
console.log(`Total Orders: ${analytics.overall.totalOrders}`);
console.log(`Total Revenue: ₦${analytics.overall.totalRevenue}`);
console.log(`Average Order Value: ₦${analytics.overall.averageOrderValue}`);

// Analyze by type
Object.entries(analytics.byType).forEach(([type, data]) => {
  console.log(`\n${type}:`);
  console.log(`  Orders: ${data.count} (${data.percentage}%)`);
  console.log(`  Revenue: ₦${data.revenue}`);
});
```

---

### Example 4: Inventory Monitoring System

```python
import requests
from typing import List, Dict, Any
import smtplib
from email.mime.text import MIMEText

class InventoryMonitor:
    def __init__(self, api_key: str):
        self.api_key = api_key
        self.base_url = 'https://api.wawagardenbar.com'
        self.headers = {'x-api-key': api_key}
    
    def get_low_stock_items(self) -> List[Dict[str, Any]]:
        """Get all items with low stock."""
        response = requests.get(
            f"{self.base_url}/api/public/inventory",
            headers=self.headers,
            params={'status': 'low-stock', 'limit': 100}
        )
        result = response.json()
        return result['data']
    
    def get_critical_alerts(self) -> Dict[str, Any]:
        """Get critical inventory alerts."""
        response = requests.get(
            f"{self.base_url}/api/public/inventory/alerts",
            headers=self.headers,
            params={'severity': 'critical'}
        )
        result = response.json()
        return result['data']
    
    def send_alert_email(self, alerts: Dict[str, Any]):
        """Send email notification for critical alerts."""
        if alerts['summary']['critical'] == 0:
            return
        
        message = "CRITICAL INVENTORY ALERTS\n\n"
        
        for alert in alerts['alerts']:
            if alert['severity'] == 'critical':
                message += f"- {alert['itemName']}: {alert['message']}\n"
                message += f"  Current Stock: {alert['currentStock']}\n"
                message += f"  Minimum Stock: {alert['minimumStock']}\n\n"
        
        # Send email (configure SMTP settings)
        msg = MIMEText(message)
        msg['Subject'] = f"URGENT: {alerts['summary']['critical']} Critical Inventory Alerts"
        msg['From'] = 'alerts@wawagardenbar.com'
        msg['To'] = 'manager@wawagardenbar.com'
        
        # Send via SMTP (configure your SMTP server)
        # smtp.send_message(msg)
        
        print(message)
    
    def monitor(self):
        """Run monitoring check."""
        print("Checking inventory status...")
        
        # Get critical alerts
        alerts = self.get_critical_alerts()
        
        if alerts['summary']['critical'] > 0:
            print(f"⚠️  {alerts['summary']['critical']} critical alerts found!")
            self.send_alert_email(alerts)
        else:
            print("✅ No critical alerts")
        
        # Get low stock items
        low_stock = self.get_low_stock_items()
        
        if low_stock:
            print(f"\n📊 {len(low_stock)} items with low stock:")
            for item in low_stock[:5]:  # Show top 5
                print(f"  - {item['itemName']}: {item['currentStock']} {item['unit']}")

# Usage
monitor = InventoryMonitor(api_key=os.environ['WAWA_API_KEY'])
monitor.monitor()

# Run as scheduled job (e.g., every hour)
# schedule.every().hour.do(monitor.monitor)
```

---

## Parameter Validation

### Date Validation

```javascript
function validateDateRange(startDate, endDate) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  // Check valid dates
  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    throw new Error('Invalid date format. Use YYYY-MM-DD');
  }
  
  // Check start <= end
  if (start > end) {
    throw new Error('startDate must be before or equal to endDate');
  }
  
  // Check not in future
  const now = new Date();
  if (end > now) {
    throw new Error('endDate cannot be in the future');
  }
  
  // Check reasonable range (e.g., max 1 year)
  const maxDays = 365;
  const daysDiff = (end - start) / (1000 * 60 * 60 * 24);
  if (daysDiff > maxDays) {
    throw new Error(`Date range cannot exceed ${maxDays} days`);
  }
  
  return true;
}
```

### Parameter Sanitization

```javascript
function sanitizeReportParams(params) {
  const sanitized = {};
  
  // Date parameters
  if (params.date) {
    sanitized.date = params.date.match(/^\d{4}-\d{2}-\d{2}$/)?.[0];
    if (!sanitized.date) throw new Error('Invalid date format');
  }
  
  if (params.startDate && params.endDate) {
    validateDateRange(params.startDate, params.endDate);
    sanitized.startDate = params.startDate;
    sanitized.endDate = params.endDate;
  }
  
  // Enum parameters
  const validGroupBy = ['day', 'week', 'month'];
  if (params.groupBy && validGroupBy.includes(params.groupBy)) {
    sanitized.groupBy = params.groupBy;
  }
  
  const validOrderTypes = ['dine-in', 'pickup', 'delivery'];
  if (params.orderType && validOrderTypes.includes(params.orderType)) {
    sanitized.orderType = params.orderType;
  }
  
  // Boolean parameters
  if (params.includeDetails !== undefined) {
    sanitized.includeDetails = Boolean(params.includeDetails);
  }
  
  // Numeric parameters
  if (params.limit) {
    sanitized.limit = Math.min(Math.max(1, parseInt(params.limit)), 100);
  }
  
  if (params.page) {
    sanitized.page = Math.max(1, parseInt(params.page));
  }
  
  return sanitized;
}
```

---

## Error Handling

### Common Error Responses

```json
// Invalid date format
{
  "success": false,
  "error": {
    "message": "Invalid date format. Expected YYYY-MM-DD",
    "code": "INVALID_DATE_FORMAT",
    "field": "startDate"
  }
}

// Date range too large
{
  "success": false,
  "error": {
    "message": "Date range cannot exceed 365 days",
    "code": "DATE_RANGE_TOO_LARGE",
    "maxDays": 365
  }
}

// Invalid parameter value
{
  "success": false,
  "error": {
    "message": "Invalid value for parameter 'groupBy'. Expected: day, week, month",
    "code": "INVALID_PARAMETER_VALUE",
    "field": "groupBy",
    "allowedValues": ["day", "week", "month"]
  }
}

// Insufficient permissions
{
  "success": false,
  "error": {
    "message": "API key does not have required scope: analytics:read",
    "code": "INSUFFICIENT_PERMISSIONS",
    "requiredScopes": ["analytics:read"]
  }
}
```

---

## Best Practices

### 1. Caching Strategy

```javascript
class CachedReportingClient {
  constructor(apiKey) {
    this.client = new WawaReportingClient(apiKey);
    this.cache = new Map();
    this.cacheTTL = 5 * 60 * 1000; // 5 minutes
  }
  
  async getDailyReport(date, options = {}) {
    const cacheKey = `daily:${date}:${JSON.stringify(options)}`;
    const cached = this.cache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
      return cached.data;
    }
    
    const data = await this.client.getDailyFinancialReport(date, options);
    
    this.cache.set(cacheKey, {
      data,
      timestamp: Date.now()
    });
    
    return data;
  }
  
  clearCache() {
    this.cache.clear();
  }
}
```

### 2. Batch Requests

```javascript
async function getMultipleDailyReports(dates) {
  // Process in batches to respect rate limits
  const batchSize = 5;
  const results = [];
  
  for (let i = 0; i < dates.length; i += batchSize) {
    const batch = dates.slice(i, i + batchSize);
    const promises = batch.map(date => 
      client.getDailyFinancialReport(date)
    );
    
    const batchResults = await Promise.all(promises);
    results.push(...batchResults);
    
    // Wait between batches
    if (i + batchSize < dates.length) {
      await sleep(2000); // 2 second delay
    }
  }
  
  return results;
}
```

### 3. Export to CSV

```javascript
function exportReportToCSV(report, filename) {
  const rows = [];
  
  // Headers
  rows.push(['Date', 'Revenue', 'Orders', 'Gross Profit', 'Net Profit']);
  
  // Data rows
  if (report.breakdown) {
    report.breakdown.forEach(day => {
      rows.push([
        day.date,
        day.revenue,
        day.orders,
        day.grossProfit,
        day.netProfit
      ]);
    });
  }
  
  // Convert to CSV
  const csv = rows.map(row => row.join(',')).join('\n');
  
  // Save to file (Node.js)
  const fs = require('fs');
  fs.writeFileSync(filename, csv);
  
  console.log(`Report exported to ${filename}`);
}
```

---

## Scheduled Reporting

### Daily Report Automation

```javascript
const cron = require('node-cron');

// Run daily at 11:59 PM
cron.schedule('59 23 * * *', async () => {
  try {
    console.log('Generating daily report...');
    
    const today = new Date().toISOString().split('T')[0];
    const report = await client.getDailyFinancialReport(today, {
      includeDetails: true,
      timezone: 'Africa/Lagos'
    });
    
    // Export to CSV
    exportReportToCSV(report, `reports/daily-${today}.csv`);
    
    // Send email notification
    await sendReportEmail(report);
    
    console.log('Daily report generated successfully');
  } catch (error) {
    console.error('Failed to generate daily report:', error);
  }
});
```

### Weekly Summary

```python
import schedule
import time
from datetime import datetime, timedelta

def generate_weekly_summary():
    """Generate weekly summary report."""
    end_date = datetime.now()
    start_date = end_date - timedelta(days=7)
    
    client = WawaReportingClient(api_key=os.environ['WAWA_API_KEY'])
    
    report = client.get_date_range_report(
        start_date=start_date.strftime('%Y-%m-%d'),
        end_date=end_date.strftime('%Y-%m-%d'),
        group_by='day',
        include_comparison=True,
        compare_with='previous'
    )
    
    # Process and send report
    print(f"Weekly Summary ({start_date.date()} to {end_date.date()})")
    print(f"Total Revenue: ₦{report['summary']['totalRevenue']:,}")
    print(f"Total Orders: {report['summary']['totalOrders']}")
    
    # Export or email report
    # ...

# Schedule weekly report (every Monday at 9 AM)
schedule.every().monday.at("09:00").do(generate_weekly_summary)

while True:
    schedule.run_pending()
    time.sleep(60)
```

---

## Quick Reference

### Financial Reports

| Endpoint | Parameters | Purpose |
|----------|------------|---------|
| `GET /api/public/reports/financial/daily` | `date`, `timezone`, `includeDetails` | Single day report |
| `GET /api/public/reports/financial/range` | `startDate`, `endDate`, `groupBy`, `includeComparison` | Multi-day report |

### Order Analytics

| Endpoint | Parameters | Purpose |
|----------|------------|---------|
| `GET /api/public/orders/stats` | `startDate`, `endDate`, `status`, `orderType`, `groupBy` | Order statistics |
| `GET /api/public/orders` | `status`, `type`, `paymentStatus`, `page`, `limit` | Order list |

### Inventory Reports

| Endpoint | Parameters | Purpose |
|----------|------------|---------|
| `GET /api/public/inventory` | `status`, `category`, `location`, `sortBy`, `page` | Inventory status |
| `GET /api/public/inventory/alerts` | `alertType`, `severity`, `category` | Inventory alerts |

---

## Support

**For technical support:**
- API Documentation: https://docs.wawagardenbar.com/api
- Developer Support: dev-support@wawagardenbar.com
- Status Page: https://status.wawagardenbar.com

**For API key requests:**
- Dashboard: https://wawagardenbar.com/dashboard/settings/api-keys
- Contact: admin@wawagardenbar.com
