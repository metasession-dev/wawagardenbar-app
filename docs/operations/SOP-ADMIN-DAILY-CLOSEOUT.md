# SOP-ADMIN-004: Daily Close-Out and Financial Reporting

| Field            | Detail                                              |
|------------------|-----------------------------------------------------|
| **Document ID**  | SOP-ADMIN-004                                       |
| **Title**        | Daily Close-Out and Financial Reporting              |
| **Version**      | 1.0                                                 |
| **Effective Date** | March 7, 2026                                     |
| **Department**   | Operations / Finance                                |
| **Applies To**   | Super-Admin (reportsAndAnalytics + expensesManagement permissions) |
| **Classification** | Internal Use Only                                 |

---

## Table of Contents

1. [Purpose, Scope, and Prerequisites](#1-purpose-scope-and-prerequisites)
2. [Procedure](#2-procedure)
   - [Part 1: Pre-Close Checklist](#part-1-pre-close-checklist)
   - [Part 2: Running the Daily Report](#part-2-running-the-daily-report)
   - [Part 3: Recording Expenses](#part-3-recording-expenses)
   - [Part 4: Inventory Reconciliation](#part-4-inventory-reconciliation)
   - [Part 5: Generating Reports](#part-5-generating-reports)
   - [Part 6: Sign-Off](#part-6-sign-off)
3. [Quick Reference Checklist for Daily Close](#3-quick-reference-checklist-for-daily-close)
4. [Common Scenarios](#4-common-scenarios)
5. [Related Procedures](#5-related-procedures)
6. [Revision History and Approval](#6-revision-history-and-approval)

---

## 1. Purpose, Scope, and Prerequisites

### 1.1 Purpose

This Standard Operating Procedure defines the step-by-step process for completing the daily close-out at Wawa Garden Bar. It ensures that all financial transactions are accurately recorded, reconciled, and reported at the end of each business day. Consistent execution of this procedure safeguards revenue integrity, supports accurate profitability analysis, and maintains audit-ready financial records.

### 1.2 Scope

This procedure covers the following activities performed at the end of each business day:

- Verification that all customer tabs and orders are settled.
- Generation and review of the daily financial summary.
- Recording of daily operational expenses.
- Inventory reconciliation against expected stock levels.
- Generation, review, and filing of end-of-day reports.
- Manager sign-off and approval.

All monetary values referenced in this procedure are denominated in Nigerian Naira (NGN, symbol: ₦).

### 1.3 Prerequisites

| Prerequisite | Detail |
|---|---|
| **Role** | Super-Admin account with `reportsAndAnalytics` and `expensesManagement` permissions enabled. |
| **System Access** | Authenticated session in the Wawa Garden Bar dashboard application. |
| **Timing** | This procedure must be executed after the last customer has been served and all orders for the day have been finalised. |
| **Prior Knowledge** | Familiarity with the dashboard navigation, payment methods accepted (card, bank transfer, cash), and menu categories (food, drink). |

---

## 2. Procedure

### Part 1: Pre-Close Checklist

The pre-close checklist must be completed before any reports are generated. Its purpose is to ensure that the data feeding into the daily report is complete and accurate.

#### 1.1 Verify All Tabs Are Settled or Closed

1. Navigate to the active orders or tabs view in the dashboard.
2. Review the list for any tabs that remain open.
3. For each open tab:
   - Confirm with the serving staff whether the customer has departed.
   - If the customer has departed and payment was received but not recorded, record the payment immediately and close the tab.
   - If the customer has departed without paying, escalate to the on-duty manager before proceeding. Document the incident.
4. Confirm that zero (0) open tabs remain before moving to the next step.

#### 1.2 Verify All Orders Are Completed

1. Review the orders list for any orders in a pending, preparing, or in-progress status.
2. Coordinate with kitchen and bar staff to confirm the status of any outstanding orders.
3. Mark all fulfilled orders as completed in the system.
4. Any voided or cancelled orders should have a recorded reason.

#### 1.3 Check for Pending Payments

1. Filter orders or transactions by payment status to identify any flagged as "pending" or "unpaid."
2. Resolve each pending payment:
   - If payment was received but not recorded, update the payment record with the correct method (card, transfer, or cash).
   - If payment is genuinely outstanding, record it as a receivable and note the customer details for follow-up.
3. Confirm that all transactions for the day reflect an accurate payment status.

---

### Part 2: Running the Daily Report

#### 2.1 Accessing the Daily Financial Summary

1. Navigate to **Reports** via `/dashboard/reports`.
2. Select **Daily Report** or navigate directly to `/dashboard/reports/daily`.
3. Confirm that the date displayed corresponds to the current business day. If the date is incorrect, select the correct date from the date picker.
4. Allow the report to fully load before reviewing.

#### 2.2 Reviewing Revenue by Category

1. Locate the **Total Revenue** figure displayed on the daily report.
2. Review the breakdown by category:
   - **Food Revenue** -- total revenue from food menu items.
   - **Drink Revenue** -- total revenue from drink menu items.
3. Verify that the sum of food and drink revenue equals the total revenue figure. If there is a discrepancy, investigate by reviewing individual order records.
4. Note the **Order Count** and **Average Order Value** for the day.

#### 2.3 Reviewing Payment Method Breakdown

1. Locate the payment method breakdown section of the daily report.
2. Review the totals for each payment method:
   - **Card** -- payments received via POS terminal or card payment.
   - **Bank Transfer** -- payments received via direct bank transfer.
   - **Cash** -- payments received in cash.
3. Cross-reference the card total against POS terminal settlement records.
4. Cross-reference the bank transfer total against bank notifications received during the day.
5. Count the physical cash on hand and compare it to the cash total shown in the report.
6. Document any variances by payment method.

#### 2.4 Checking Profitability Metrics

1. Review the following metrics on the daily report:
   - **Gross Profit** -- revenue minus cost of goods sold (COGS).
   - **Net Profit** -- gross profit minus operating expenses.
   - **COGS** -- total cost of goods sold for the day.
2. If gross profit margin appears unusually low or high compared to typical daily performance, flag for further investigation during the sign-off phase.

---

### Part 3: Recording Expenses

#### 3.1 Entering Daily Operational Expenses

1. Navigate to **Finance / Expenses** via `/dashboard/finance` or `/dashboard/expenses`.
2. For each expense incurred during the business day, create a new expense entry with the following information:
   - **Date** -- the date the expense was incurred.
   - **Amount** -- the expense amount in NGN (₦).
   - **Category** -- select the appropriate category (see Section 3.3).
   - **Description** -- a brief description of the expense.
   - **Receipt/Reference** -- attach or reference any supporting documentation.
3. Common daily expenses to record include:
   - Utilities (electricity, water, generator fuel).
   - Supplies (cleaning materials, disposables, packaging).
   - Staff wages and daily labour costs.
   - Delivery or transport costs.
   - Miscellaneous operational costs.
4. Save each expense entry after verifying the details.

#### 3.2 Bank Statement Import

1. If a bank statement is available for reconciliation, use the **Bank Statement Import** feature.
2. Upload the bank statement file in the supported format.
3. Review the imported transactions and match them against recorded revenue and expenses.
4. Resolve any unmatched transactions:
   - Identify whether the transaction is an unrecorded expense or revenue item.
   - Create the appropriate record in the system.
5. Bank statement import is recommended on a weekly basis at minimum, or daily when feasible.

#### 3.3 Categorizing Expenses

Ensure all expenses are categorised consistently using the standard categories configured in the system. Common categories include:

| Category | Examples |
|---|---|
| Utilities | Electricity, water, generator fuel |
| Supplies | Cleaning products, disposables, packaging |
| Wages | Daily staff pay, overtime |
| Food Ingredients | Fresh produce, proteins, dry goods |
| Beverages | Drink stock, mixers, ice |
| Maintenance | Equipment repair, facility upkeep |
| Marketing | Promotions, printed materials |
| Miscellaneous | Items that do not fit other categories |

If an expense does not fit any existing category, use "Miscellaneous" and flag it for review so that a new category can be created if a pattern emerges.

---

### Part 4: Inventory Reconciliation

#### 4.1 Running the Inventory Report

1. Navigate to **Inventory Report** via `/dashboard/reports/inventory`.
2. Select the current date or date range as applicable.
3. Review the report, which displays expected stock levels based on sales data and recorded stock intake.

#### 4.2 Comparing Expected vs. Actual Stock

1. For high-value or high-turnover items, perform a physical count at close of day.
2. Compare the physical count against the expected quantity shown in the inventory report.
3. Record the results in the following format:

| Item | Expected Qty | Actual Qty | Variance | Notes |
|---|---|---|---|---|
| (Item name) | (System value) | (Counted value) | (Difference) | (Explanation if known) |

#### 4.3 Noting Discrepancies

1. Any variance exceeding acceptable thresholds (as defined by management) must be documented and flagged.
2. Investigate the cause of the discrepancy:
   - Wastage or spoilage not recorded.
   - Theft or pilferage.
   - Incorrect stock intake recording.
   - System error or incorrect recipe configuration.
3. Record the findings and any corrective actions taken.
4. Significant discrepancies must be escalated to the on-duty manager immediately.

---

### Part 5: Generating Reports

#### 5.1 Saving and Exporting the Daily Report

1. Return to the daily report at `/dashboard/reports/daily`.
2. Use the export or save function to generate a copy of the daily report.
3. Save the exported report to the designated storage location (shared drive, cloud folder, or filing system as determined by management).
4. Name the file using the standard convention: `DailyReport_YYYY-MM-DD` (e.g., `DailyReport_2026-03-07`).

#### 5.2 Reviewing Profitability Analytics

1. Navigate to **Profitability Report** at `/dashboard/reports/profitability` and **Analytics** at `/dashboard/analytics`.
2. Review trend data to identify:
   - Whether daily revenue is tracking above or below weekly/monthly averages.
   - Whether COGS ratios are within acceptable ranges.
   - Any notable shifts in product mix or average order value.
3. Note any observations or anomalies for discussion during the sign-off phase.

---

### Part 6: Sign-Off

#### 6.1 Manager Review and Approval

1. The closing staff member presents the following to the on-duty manager:
   - Completed daily report (exported copy).
   - Summary of any discrepancies, variances, or escalations from the close-out process.
   - Inventory reconciliation results.
   - List of expenses recorded for the day.
2. The manager reviews the report and supporting information.
3. The manager confirms accuracy and provides sign-off (digital approval in the system or physical signature on the printed report, per establishment policy).

#### 6.2 Filing the Daily Report

1. File the signed-off daily report in the designated archive (digital or physical).
2. Ensure the following are attached or linked to the daily report:
   - Payment method reconciliation notes.
   - Inventory reconciliation worksheet.
   - Expense records for the day.
3. The daily close-out is complete once the report has been filed.

---

## 3. Quick Reference Checklist for Daily Close

Use this checklist as a quick guide during the close-out process. Each item corresponds to a section in the procedure above.

- [ ] All customer tabs settled and closed.
- [ ] All orders marked as completed.
- [ ] No pending or unrecorded payments remain.
- [ ] Daily report accessed and date confirmed at `/dashboard/reports/daily`.
- [ ] Total revenue reviewed (food and drink breakdown verified).
- [ ] Payment method totals reconciled (card, transfer, cash).
- [ ] Profitability metrics reviewed (gross profit, net profit, COGS).
- [ ] Daily operational expenses entered at `/dashboard/finance` or `/dashboard/expenses`.
- [ ] Bank statement imported and reconciled (if applicable).
- [ ] Expenses categorised correctly.
- [ ] Inventory report reviewed at `/dashboard/reports/inventory`.
- [ ] Physical stock count performed for high-value items.
- [ ] Inventory discrepancies documented and escalated if necessary.
- [ ] Daily report exported and saved with correct file name.
- [ ] Profitability analytics reviewed at `/dashboard/analytics`.
- [ ] Manager review and sign-off obtained.
- [ ] Daily report and supporting documents filed.

---

## 4. Common Scenarios

### Scenario 1: Discrepancy Found Between Revenue and Payment Totals

**Situation:** The sum of card, transfer, and cash payments does not match the total revenue figure.

**Resolution:**
1. Re-check each payment method total against source records (POS terminal, bank notifications, physical cash count).
2. Review individual order records for the day to identify any orders with incorrect or missing payment method assignments.
3. Correct any data entry errors found.
4. If the discrepancy persists after correction, document the variance amount and payment method affected.
5. Escalate to the manager for review and further investigation.

### Scenario 2: Missing Payment on a Closed Order

**Situation:** An order is marked as completed but has no payment recorded.

**Resolution:**
1. Identify the staff member who served the order.
2. Determine whether payment was received but not recorded in the system.
3. If payment was received, record the payment with the correct method and amount.
4. If payment was not received (customer left without paying), record the amount as a loss and complete an incident report.
5. Include the incident in the daily report notes for manager review.

### Scenario 3: Cash Shortage

**Situation:** The physical cash count is less than the cash total shown in the daily report.

**Resolution:**
1. Recount the physical cash to rule out a counting error.
2. Review cash transactions for the day to identify potential errors (e.g., incorrect change given, a cash transaction recorded that was actually paid by card or transfer).
3. Check whether any cash was used for petty expenses that were not yet recorded in the system. If so, record the expense immediately.
4. If the shortage remains unexplained, document the amount and circumstances.
5. Escalate to the manager. Repeated unexplained cash shortages may require further investigation.

### Scenario 4: Unusually High or Low COGS

**Situation:** The cost of goods sold for the day appears significantly higher or lower than expected.

**Resolution:**
1. Review the inventory report to check for large stock movements or adjustments.
2. Verify that all stock intake entries for the day are accurate.
3. Check whether menu item costs (recipes) have been recently updated in the system.
4. If COGS appears inflated, check for waste or spoilage that may not have been recorded correctly.
5. Document findings and include in the daily report for manager review.

---

## 5. Related Procedures

| Document ID | Title |
|---|---|
| SOP-ADMIN-001 | Menu and Inventory Management |
| SOP-ADMIN-002 | Staff and Role Management |
| SOP-ADMIN-003 | Order Processing and Table Management |
| SOP-ADMIN-005 | Rewards and Loyalty Program Management |

---

## 6. Revision History and Approval

### Revision History

| Version | Date | Author | Description |
|---|---|---|---|
| 1.0 | March 7, 2026 | Operations / Finance | Initial release. |

### Approval

| Role | Name | Signature | Date |
|---|---|---|---|
| Document Author | ________________ | ________________ | ________________ |
| Operations Manager | ________________ | ________________ | ________________ |
| Finance Lead | ________________ | ________________ | ________________ |

---

*This document is the property of Wawa Garden Bar. Unauthorised distribution is prohibited. This SOP must be reviewed at least annually or whenever significant changes are made to the reporting or financial management processes.*
