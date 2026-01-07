# Daily Financial Reports - Requirements & Implementation

## Overview
A comprehensive daily financial summary report that provides real-time insights into the business's financial performance, enabling data-driven decision-making on a daily basis.

---

## Report Structure

### 1. Daily Summary Report

The primary financial report that consolidates all daily financial activities into a single view.

#### Report Sections

##### A. Revenue Breakdown
**Food Category:**
- List of food items sold (e.g., "3 Pepper Soup, 2 Awesome Meals")
- Quantity sold per item
- Selling price per item
- **Total Food Revenue** (sum of all food sales)

**Drink Category:**
- List of drinks sold
- Quantity sold per item
- Selling price per item
- **Total Drink Revenue** (sum of all drink sales)

**Total Revenue:**
- Combined revenue from food and drinks
- Also referred to as "Turnover"

##### B. Cost of Goods Sold (COGS) / Direct Costs
**Food Costs:**
- Cost price per food item (from inventory)
- Total cost for food items sold
- **Total Food Cost**

**Drink Costs:**
- Cost price per drink item (from inventory)
- Total cost for drinks sold
- **Total Drink Cost**

**Total Direct Costs:**
- Combined cost of food and drinks sold

##### C. Gross Profit
**Food Gross Profit:**
- Formula: `Food Revenue - Food Cost`
- Shows profitability of food category

**Drink Gross Profit:**
- Formula: `Drink Revenue - Drink Cost`
- Shows profitability of drink category

**Total Gross Profit:**
- Formula: `Total Revenue - Total Direct Costs`
- Profit before operating expenses

##### D. Operating Expenses
**Daily Operating Costs:**
- Petrol/Transportation
- Electricity
- Internet
- Maintenance (e.g., broken toilet cubicle repairs)
- Other day-to-day expenses

**Salary (Prorated Daily):**
- Monthly salary divided by number of days in month
- Formula: `Monthly Salary / Days in Month`
- Allows tracking of daily salary expense burden

**Total Operating Expenses:**
- Sum of all operating costs for the day

##### E. Net Profit/Loss
**Formula:**
```
Net Profit = Gross Profit - Operating Expenses
Net Profit = (Total Revenue - Total Direct Costs) - Operating Expenses
```

**Interpretation:**
- **Positive Net Profit:** Business is profitable for the day
- **Negative Net Profit (Net Loss):** Business operated at a loss for the day

---

## Business Insights & Decision Making

### Daily Decision Points
1. **Immediate Performance Assessment:**
   - Are we making profit daily?
   - Are we covering our operating expenses?
   - Are we generating enough to pay salaries?

2. **Trend Analysis:**
   - Track performance over time (daily, weekly, monthly)
   - Identify if business is "catching up" or "falling behind"
   - Spot patterns in profitability

3. **Inventory Planning:**
   - Determine how much to allocate for inventory replenishment
   - Based on sales velocity and profit margins

4. **Cash Flow Management:**
   - Know how much cash is available daily
   - Plan for upcoming expenses

### Monthly Accumulation
- Daily net profits accumulate over the month
- Monthly total provides basis for strategic decisions:
  - **Capital Investment:** Upgrade equipment, expand facilities
  - **Investor Distributions:** Pay dividends or returns
  - **Tax Reserves:** Set aside funds for tax obligations
  - **Savings/Reserves:** Build emergency fund

**Note:** Capital allocation decisions are made monthly, not daily, based on accumulated net profit.

---

## Technical Implementation Requirements

### Database Schema Requirements

#### 1. Order/Sales Data
- Link to existing `Order` model
- Filter by date range (start of day to end of day)
- Separate food items from drink items (via `MenuItem.category`)
- Calculate revenue: `sum(item.price * item.quantity)`

#### 2. Inventory/Cost Data
- Link to `Inventory` model
- Each menu item must have `costPerUnit` field
- Calculate COGS: `sum(item.costPerUnit * item.quantity)`

#### 3. Operating Expenses Tracking
**New Model Required: `OperatingExpense`**
```typescript
interface IOperatingExpense {
  _id: ObjectId;
  date: Date;
  category: 'petrol' | 'electricity' | 'internet' | 'maintenance' | 'salary' | 'other';
  description: string;
  amount: number;
  isRecurring: boolean; // For monthly expenses like salary
  recurringAmount?: number; // Monthly amount (for prorated calculation)
  createdBy: ObjectId; // Admin who recorded the expense
  createdAt: Date;
  updatedAt: Date;
}
```

### Service Layer

#### `FinancialReportService`

**Methods:**

1. **`generateDailySummary(date: Date): Promise<DailySummaryReport>`**
   - Fetches all orders for the specified date
   - Calculates revenue by category (food/drink)
   - Calculates COGS by category
   - Calculates gross profit
   - Fetches operating expenses for the date
   - Calculates prorated salary expense
   - Calculates net profit
   - Returns comprehensive report object

2. **`getMonthlyAccumulation(month: number, year: number): Promise<MonthlyReport>`**
   - Aggregates daily summaries for the entire month
   - Returns monthly totals and trends

3. **`exportDailyReport(date: Date, format: 'pdf' | 'csv' | 'excel'): Promise<Buffer>`**
   - Generates downloadable report in specified format

### Report Data Structure

```typescript
interface DailySummaryReport {
  date: Date;
  
  revenue: {
    food: {
      items: Array<{ name: string; quantity: number; price: number; total: number }>;
      totalRevenue: number;
    };
    drink: {
      items: Array<{ name: string; quantity: number; price: number; total: number }>;
      totalRevenue: number;
    };
    totalRevenue: number;
  };
  
  costs: {
    food: {
      items: Array<{ name: string; quantity: number; costPerUnit: number; total: number }>;
      totalCost: number;
    };
    drink: {
      items: Array<{ name: string; quantity: number; costPerUnit: number; total: number }>;
      totalCost: number;
    };
    totalDirectCosts: number;
  };
  
  grossProfit: {
    food: number;
    drink: number;
    total: number;
  };
  
  operatingExpenses: {
    items: Array<{ category: string; description: string; amount: number }>;
    salaryProrated: number;
    totalOperatingExpenses: number;
  };
  
  netProfit: number;
}
```

---

## Admin Dashboard UI

### Page: `/dashboard/reports/daily`

#### Features:
1. **Date Selector:**
   - Calendar picker to select report date
   - Quick links: Today, Yesterday, Last 7 Days

2. **Revenue Section:**
   - Cards showing Food Revenue, Drink Revenue, Total Revenue
   - Detailed table of items sold with quantities and prices

3. **Cost Section:**
   - Cards showing Food Costs, Drink Costs, Total COGS
   - Breakdown by item

4. **Gross Profit Section:**
   - Visual indicators (green for profit, red for loss)
   - Profit margins by category

5. **Operating Expenses Section:**
   - List of expenses for the day
   - Prorated salary display
   - Total operating expenses

6. **Net Profit Summary:**
   - Large, prominent display of net profit/loss
   - Percentage margin
   - Comparison to previous day/week/month

7. **Export Options:**
   - Download as PDF
   - Download as Excel
   - Download as CSV

8. **Trend Charts:**
   - 7-day net profit trend
   - 30-day net profit trend
   - Revenue vs. Expenses comparison

---

## Access Control

- **Super-Admin:** Full access to all financial reports
- **Admin:** Read-only access to daily reports (no access to monthly strategic decisions)
- **Customer:** No access

---

## Implementation Phases

### Phase 1: Data Foundation
1. Add `costPerUnit` field to `Inventory` model (if not exists)
2. Create `OperatingExpense` model and service
3. Create admin UI for recording operating expenses

### Phase 2: Report Generation
1. Implement `FinancialReportService`
2. Create `generateDailySummary` method
3. Add server actions for fetching reports

### Phase 3: Dashboard UI
1. Create `/dashboard/reports/daily` page
2. Build report components (cards, tables, charts)
3. Add date selector and filtering

### Phase 4: Export & Analytics
1. Implement PDF/Excel/CSV export
2. Add trend charts and visualizations
3. Create monthly accumulation view

### Phase 5: Automation
1. Scheduled daily report generation (midnight)
2. Email daily summary to super-admin
3. Alert notifications for losses or low profitability

---

## Key Formulas Summary

```
Total Revenue = Food Revenue + Drink Revenue

Total Direct Costs (COGS) = Food Costs + Drink Costs

Gross Profit = Total Revenue - Total Direct Costs

Daily Salary Expense = Monthly Salary / Days in Month

Total Operating Expenses = Sum(Daily Expenses) + Daily Salary Expense

Net Profit = Gross Profit - Total Operating Expenses
```

---

## Notes

- **Inventory costs are already covered** in the direct costs/COGS calculation
- **Capital expenses** (e.g., buying new equipment) are NOT included in daily reports
- **Monthly strategic decisions** (capital investment, investor distributions, tax reserves) are made separately based on accumulated monthly net profit
- **Daily reports enable proactive management** - identify issues early and make timely adjustments
