# Standard Operating Procedure

| Field            | Detail                                          |
|------------------|-------------------------------------------------|
| **Document ID**  | SOP-MANUAL-ADMIN-009                            |
| **Title**        | Reporting and Analytics                         |
| **Version**      | 1.0                                             |
| **Effective Date** | March 7, 2026                                 |
| **Department**   | Operations / Management                         |
| **Applies To**   | Admin, Super-Admin (reportsAndAnalytics permission required) |
| **Classification** | Internal Use Only                             |

---

## Table of Contents

1. [Purpose](#1-purpose)
2. [Scope](#2-scope)
3. [Prerequisites](#3-prerequisites)
4. [Procedure](#4-procedure)
   - Part 1: Accessing Reports
   - Part 2: Daily Financial Reports
   - Part 3: Date Range Reports
   - Part 4: Order Analytics
   - Part 5: Inventory Reports
   - Part 6: Customer Analytics
   - Part 7: Exporting and Sharing Reports
5. [Quick Reference](#5-quick-reference)
6. [Common Scenarios](#6-common-scenarios)
7. [Troubleshooting](#7-troubleshooting)
8. [Related Procedures](#8-related-procedures)
9. [Revision History](#9-revision-history)
10. [Approval](#10-approval)

---

## 1. Purpose

This Standard Operating Procedure defines the step-by-step process for accessing, generating, reviewing, and exporting reports and analytics through the Wawa Garden Bar dashboard. It ensures that management and authorised staff can consistently retrieve accurate financial, operational, and customer data to support informed business decisions.

## 2. Scope

This SOP covers all reporting and analytics operations performed through the Wawa Garden Bar dashboard, including:

- Accessing the reports and analytics sections of the dashboard.
- Generating and reviewing daily financial reports.
- Creating date range reports and comparing periods.
- Analysing order statistics, peak hours, and average order values.
- Reviewing inventory reports and low stock alerts.
- Examining customer analytics, segments, and acquisition trends.
- Exporting, saving, and scheduling reports.

This procedure covers **dashboard (manual) operations only**. For programmatic access to the same data via the API, refer to SOP-AGENTIC-002 (Agentic API Reporting and Analytics).

All monetary values referenced in this procedure are denominated in Nigerian Naira (NGN, symbol: N).

## 3. Prerequisites

| Requirement         | Detail                                                                      |
|---------------------|-----------------------------------------------------------------------------|
| **Role**            | Admin or Super-Admin                                                        |
| **Permission**      | `reportsAndAnalytics` permission must be granted to the user                |
| **Access**          | Authenticated session on the Wawa Garden Bar dashboard                      |
| **Dashboard Paths** | `/dashboard/reports` (reports home)                                         |
|                     | `/dashboard/reports/daily` (daily financial report)                         |
|                     | `/dashboard/reports/inventory` (inventory report)                           |
|                     | `/dashboard/reports/profitability` (profitability report)                   |
|                     | `/dashboard/analytics` (analytics and customer data)                        |

Before performing any reporting or analytics task, confirm that:

1. You are logged in with an Admin or Super-Admin account that holds the `reportsAndAnalytics` permission.
2. You understand the menu categories (food, drink) and payment methods (card, bank transfer, cash) used by the establishment.
3. You are familiar with the reporting period conventions used by your team (daily, weekly, monthly).

---

## 4. Procedure

### Part 1: Accessing Reports

#### 1.1 Navigating to the Reports Section

1. Log in to the Wawa Garden Bar dashboard.
2. Navigate to **Reports** via `/dashboard/reports`.
3. The reports home page displays an overview of available report types:
   - **Daily Report** -- financial summary for a single business day.
   - **Inventory Report** -- stock levels, usage, and alerts.
   - **Profitability Report** -- gross profit, net profit, and cost analysis.
4. Select the desired report type to proceed, or navigate directly using the paths listed in the Prerequisites section.

#### 1.2 Navigating to the Analytics Section

1. Navigate to **Analytics** via `/dashboard/analytics`.
2. The analytics section provides interactive dashboards covering:
   - Customer segments and behaviour.
   - Acquisition and retention trends.
   - Top spenders and customer lifetime value.
3. Use the filters and date selectors available on the analytics page to customise the data displayed.

---

### Part 2: Daily Financial Reports

#### 2.1 Accessing the Daily Report

1. Navigate to `/dashboard/reports/daily`.
2. The report defaults to the current business day. If you need to view a different date, use the date picker to select the desired date.
3. Allow the report to fully load before reviewing the data.

#### 2.2 Reviewing Revenue by Category

1. Locate the **Total Revenue** figure at the top of the daily report.
2. Review the breakdown by category:
   - **Food Revenue** -- total revenue generated from food menu items.
   - **Drink Revenue** -- total revenue generated from drink menu items.
3. Verify that the sum of food revenue and drink revenue equals the total revenue figure. If a discrepancy exists, review individual order records for the day to identify the source.
4. Note the **Order Count** for the day, which indicates the total number of completed orders.

#### 2.3 Payment Method Breakdown

1. Locate the payment method breakdown section of the daily report.
2. Review the totals for each payment method:
   - **Card** -- payments received via POS terminal or card payment.
   - **Bank Transfer** -- payments received via direct bank transfer.
   - **Cash** -- payments received in cash.
3. Verify that the sum of all payment method totals equals the total revenue.
4. Use this breakdown for reconciliation with POS terminal records, bank notifications, and physical cash counts.

#### 2.4 Profitability Metrics

1. Review the profitability section of the daily report, which includes:
   - **Gross Profit** -- revenue minus cost of goods sold (COGS).
   - **Net Profit** -- gross profit minus recorded operating expenses.
   - **COGS** -- total cost of goods sold for the day, derived from inventory cost data.
   - **Gross Profit Margin** -- gross profit expressed as a percentage of revenue.
2. Compare the day's profitability metrics against historical averages to identify any unusual variances.
3. If the gross profit margin appears significantly higher or lower than expected, flag the report for further investigation.

---

### Part 3: Date Range Reports

#### 3.1 Selecting Custom Date Ranges

1. Navigate to `/dashboard/reports` or the specific report type you wish to generate.
2. Locate the date range selector.
3. Set the **Start Date** and **End Date** for the reporting period.
4. Common date ranges include:
   - **This Week** -- Monday to the current day.
   - **Last Week** -- the previous Monday to Sunday.
   - **This Month** -- the first day of the current month to the current day.
   - **Last Month** -- the first day to the last day of the previous month.
   - **Custom** -- any user-defined start and end date.
5. Apply the date range and allow the report to regenerate.

#### 3.2 Comparing Periods

1. After generating a date range report, look for the period comparison feature.
2. Select a comparison period (e.g., compare this week to last week, or this month to the previous month).
3. Review the comparison data, which typically includes:
   - Revenue change (absolute and percentage).
   - Order count change.
   - Average order value change.
   - Profitability change.
4. Use percentage changes to quickly identify positive or negative trends.

#### 3.3 Identifying Trends

1. Review the trend charts and graphs displayed on the report.
2. Look for the following patterns:
   - **Revenue trends** -- is revenue increasing, decreasing, or stable over the selected period?
   - **Order volume trends** -- are order counts growing or declining?
   - **Category shifts** -- has the proportion of food vs. drink revenue changed?
   - **Day-of-week patterns** -- which days consistently produce the highest and lowest revenue?
3. Document any significant trends or anomalies for discussion with management.

---

### Part 4: Order Analytics

#### 4.1 Order Statistics by Type and Status

1. Navigate to the order analytics section within `/dashboard/reports` or `/dashboard/analytics`.
2. Review order statistics grouped by:
   - **Order Type** -- dine-in, takeaway, delivery.
   - **Order Status** -- completed, cancelled, refunded.
3. Note the proportion of each order type to understand channel mix.
4. Review cancelled and refunded orders for patterns that may indicate operational issues.

#### 4.2 Peak Hours Analysis

1. Locate the peak hours or hourly breakdown section of the order analytics.
2. Review order volume and revenue by hour of the day.
3. Identify:
   - **Peak hours** -- the hours with the highest order volume and revenue.
   - **Off-peak hours** -- the hours with the lowest activity.
4. Use this data to inform staffing decisions, promotional timing, and operational planning.

#### 4.3 Average Order Values

1. Review the **Average Order Value (AOV)** metric.
2. Compare AOV across:
   - Different time periods (daily, weekly, monthly).
   - Order types (dine-in, takeaway, delivery).
3. A declining AOV may indicate a shift in customer ordering behaviour or menu mix.
4. An increasing AOV may reflect successful upselling or menu price adjustments.

---

### Part 5: Inventory Reports

#### 5.1 Accessing Stock Level Reports

1. Navigate to `/dashboard/reports/inventory`.
2. The inventory report displays current stock levels for all tracked items, including:

   | Field              | Description                                                    |
   |--------------------|----------------------------------------------------------------|
   | **Item Name**      | The name of the inventory item.                                |
   | **Current Stock**  | The current quantity on hand.                                  |
   | **Minimum Stock**  | The threshold below which a low stock alert is triggered.      |
   | **Unit**           | The unit of measurement (e.g., kg, litres, pieces, bottles).   |
   | **Location**       | The storage location (bar, chiller, storage, kitchen).         |

3. Use filters to view stock by location, category, or alert status.

#### 5.2 Low Stock Alerts

1. On the inventory report, items at or below their **minimumStock** threshold are flagged as low stock.
2. Review all flagged items and assess the urgency of restocking:
   - Items critical to active menu items require immediate attention.
   - Items with longer supplier lead times should be reordered early.
3. Cross-reference low stock alerts with upcoming expected demand (e.g., weekend service, events).
4. Coordinate with the inventory management team to initiate reorders (refer to SOP-MANUAL-ADMIN-003).

#### 5.3 Inventory Valuation

1. Review the inventory valuation section of the report, which calculates the total monetary value of stock on hand.
2. Valuation is calculated as: **Current Stock x Cost Per Unit** for each item.
3. Use the total inventory valuation to:
   - Track changes in stock investment over time.
   - Identify items with disproportionately high stock value relative to their sales velocity.
   - Support financial reporting and balance sheet preparation.

---

### Part 6: Customer Analytics

#### 6.1 Customer Segments

1. Navigate to `/dashboard/analytics`.
2. Locate the customer segmentation section.
3. Review customer segments, which may include:
   - **New Customers** -- customers who placed their first order within the selected period.
   - **Returning Customers** -- customers who have placed more than one order.
   - **Inactive Customers** -- customers who have not placed an order within a defined period.
4. Note the distribution across segments to understand customer retention and acquisition health.

#### 6.2 Top Spenders

1. Within the analytics dashboard, locate the top spenders list.
2. Review the ranking of customers by total spend over the selected period.
3. Use this data to:
   - Identify high-value customers for loyalty rewards or targeted engagement (refer to SOP-MANUAL-ADMIN-005).
   - Monitor whether top spender activity is increasing or decreasing.
4. Review the average spend per visit for top customers compared to the overall customer base.

#### 6.3 Acquisition Trends

1. Review the customer acquisition chart on the analytics dashboard.
2. This shows the number of new customers acquired over time (daily, weekly, or monthly).
3. Identify:
   - Periods of high acquisition (which may correlate with marketing campaigns or events).
   - Periods of low acquisition (which may indicate the need for promotional activity).
4. Compare acquisition trends alongside revenue trends to assess the quality of new customer acquisition.

---

### Part 7: Exporting and Sharing Reports

#### 7.1 Exporting to CSV

1. On any report page, locate the **Export** button.
2. Select **CSV** as the export format.
3. The system generates a CSV file containing the report data.
4. Save the file to the designated storage location (shared drive, cloud folder, or local machine).
5. Use the standard naming convention: `ReportType_YYYY-MM-DD` (e.g., `DailyReport_2026-03-07`, `InventoryReport_2026-03-07`).

#### 7.2 Saving Reports

1. Use the **Save** or **Bookmark** function (if available) to save a report configuration for future reference.
2. Saved reports retain the selected date range, filters, and display options.
3. Access saved reports from the reports home page at `/dashboard/reports`.

#### 7.3 Scheduling Reports

1. If the scheduling feature is available, navigate to the report scheduling section.
2. Configure the schedule:

   | Field              | Description                                              |
   |--------------------|----------------------------------------------------------|
   | **Report Type**    | The type of report to generate (daily, inventory, etc.). |
   | **Frequency**      | How often the report should be generated (daily, weekly, monthly). |
   | **Recipients**     | The email addresses or user accounts to receive the report. |
   | **Format**         | The export format (CSV).                                 |

3. Save the schedule.
4. Verify that the first scheduled report is delivered as expected.
5. Review and update schedules periodically to ensure they remain relevant.

---

## 5. Quick Reference

| Task                              | Path                                | Key Action                                          |
|-----------------------------------|-------------------------------------|-----------------------------------------------------|
| Reports home                      | `/dashboard/reports`                | View available report types                         |
| Daily financial report            | `/dashboard/reports/daily`          | Select date, review revenue and profitability       |
| Inventory report                  | `/dashboard/reports/inventory`      | Review stock levels, low stock alerts, valuation    |
| Profitability report              | `/dashboard/reports/profitability`  | Review gross profit, net profit, COGS               |
| Analytics and customer data       | `/dashboard/analytics`              | View segments, top spenders, acquisition trends     |
| Export a report                   | Any report page                     | Click Export, select CSV, save file                 |
| Compare periods                   | Date range report                   | Set date range, select comparison period            |
| View peak hours                   | Order analytics                     | Review hourly order volume and revenue              |
| Review low stock alerts           | `/dashboard/reports/inventory`      | Check flagged items at or below minimumStock        |

---

## 6. Common Scenarios

### Scenario 1: Generating a Weekly Revenue Summary for Management

1. Navigate to `/dashboard/reports/daily` or the date range report view.
2. Set the date range to cover the past seven days (e.g., Monday to Sunday of the previous week).
3. Review the total revenue, order count, and average order value for the period.
4. Note the revenue breakdown by category (food vs. drink) and payment method (card, transfer, cash).
5. Review the profitability metrics for the period.
6. Export the report to CSV using the naming convention `WeeklyRevenue_YYYY-MM-DD_to_YYYY-MM-DD`.
7. Share the exported file with management via the agreed distribution method (email, shared drive, or printed copy).

### Scenario 2: Comparing This Month's Performance to Last Month

1. Navigate to the date range report view.
2. Set the date range to cover the current month (first day of the month to today).
3. Enable the period comparison feature and select the previous month as the comparison period.
4. Review the following comparisons:
   - Total revenue change (absolute and percentage).
   - Order count change.
   - Average order value change.
   - Gross profit margin change.
5. Identify the primary drivers of any significant changes (e.g., higher order volume, menu price changes, increased expenses).
6. Document findings and include them in the monthly management report.

### Scenario 3: Identifying Best-Selling Menu Items

1. Navigate to the order analytics section within `/dashboard/reports` or `/dashboard/analytics`.
2. Select the desired date range for the analysis.
3. Locate the menu item performance or sales breakdown section.
4. Review items ranked by:
   - **Quantity sold** -- identifies the most popular items.
   - **Revenue generated** -- identifies the highest-grossing items.
5. Cross-reference best sellers with profitability data to determine which items are both popular and profitable.
6. Use this information to inform menu planning, promotional decisions, and inventory ordering priorities.

### Scenario 4: Reviewing Inventory Usage Against Sales

1. Navigate to `/dashboard/reports/inventory` to review current stock levels.
2. Note the stock consumed over the selected period by reviewing stock movement history.
3. Navigate to the daily or date range report to review total sales for the same period.
4. Compare inventory consumption against sales volume:
   - If consumption exceeds what sales data would predict, investigate for unrecorded waste, breakage, or shrinkage.
   - If consumption is lower than expected, verify that stock deductions are being applied correctly to orders.
5. Document any discrepancies and coordinate with the inventory management team (refer to SOP-MANUAL-ADMIN-003) for resolution.

---

## 7. Troubleshooting

| Issue                                          | Possible Cause                                | Resolution                                                            |
|------------------------------------------------|-----------------------------------------------|-----------------------------------------------------------------------|
| Unable to access reports or analytics pages    | Missing `reportsAndAnalytics` permission      | Contact the system administrator to verify and grant the required permission. |
| Report shows no data for the selected date     | No orders were placed on that date, or data has not yet synchronised | Verify that orders exist for the date; wait for data synchronisation if the report is for the current day. |
| Revenue totals do not match payment method totals | Pending or unrecorded payments               | Review individual orders for the period and resolve any pending payment records. |
| Export button is not visible or not functioning | Browser compatibility issue or permission restriction | Try a different browser; confirm that export functionality is enabled for your role. |
| Date range report takes too long to load       | Very large date range selected                | Reduce the date range (e.g., query one month at a time instead of an entire year). |
| Profitability metrics appear incorrect         | Expenses not recorded or inventory costs outdated | Verify that daily expenses have been entered and that inventory cost per unit values are current. |
| Customer analytics data appears incomplete     | Customer records not linked to orders         | Ensure that orders are associated with customer accounts where applicable. |
| Scheduled report not delivered                 | Incorrect recipient configuration or system error | Verify the schedule configuration; check recipient email addresses; report to IT support if the issue persists. |

---

## 8. Related Procedures

| Document ID         | Title                                      | Relevance                                                        |
|---------------------|--------------------------------------------|------------------------------------------------------------------|
| SOP-MANUAL-ADMIN-004       | Daily Close-Out and Financial Reporting    | End-of-day financial reconciliation and report generation        |
| SOP-MANUAL-ADMIN-003       | Inventory Management                       | Stock level management, counts, and adjustments                  |
| SOP-AGENTIC-002         | Agentic API Reporting and Analytics        | Programmatic (API) counterpart to this manual procedure          |

---

## 9. Revision History

| Version | Date           | Author | Description         |
|---------|----------------|--------|---------------------|
| 1.0     | March 7, 2026  |        | Initial release     |

---

## 10. Approval

| Role               | Name | Signature | Date |
|--------------------|------|-----------|------|
| Prepared By        |      |           |      |
| Reviewed By        |      |           |      |
| Approved By        |      |           |      |

---

*End of Document -- SOP-MANUAL-ADMIN-009 Reporting and Analytics v1.0*
