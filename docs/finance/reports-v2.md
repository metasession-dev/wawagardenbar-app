# Financial Reporting Analysis & Implementation Plan (v2)

## 1. Current State Analysis

### A. Revenue Attribution Issue
**Problem:** The current report indicates ₦0.00 for Drink Revenue despite drink sales occurring.
**Root Cause:** The `FinancialReportService` categorizes items based on `menuItem.category` (the sub-category, e.g., 'beer-local', 'soft-drinks') checking if it equals "drinks". Since the sub-categories are specific, this check fails for all drinks.
**Fix:** The logic should rely on `menuItem.mainCategory` ('food' vs 'drinks') which is already defined in the schema but not currently used in the aggregation logic.

### B. Double Counting of Costs (The "Double Dipping" Problem)
**Problem:** The Net Profit calculation subtracts costs twice:
1.  **COGS (Theoretical):** Calculated as `Quantity Sold × Cost Per Unit`. This represents the value of inventory *consumed*.
2.  **Direct Expenses (Actual):** The user enters ingredient purchases as "Direct Costs" in the Expenses module. These are subtracted again as Operating Expenses.

**Result:**
$$ \text{Net Profit} = \text{Revenue} - \text{COGS (Theoretical)} - \text{Direct Expenses (Purchases)} - \text{Operating Expenses} $$
This is incorrect because "Direct Expenses" (purchases) and "COGS" (usage) represent the same cost element (food/drink cost), just at different stages (buying vs. selling).

### C. Accounting Philosophy
To provide accurate reports, we must choose a consistent method. For a restaurant management system that tracks inventory usage per item, **Accrual/Usage-based Accounting** is the standard for P&L.

*   **P&L View (Profitability):** Should reflect the cost of the *items actually sold* (COGS). Purchases that sit in inventory are Assets, not Expenses yet.
*   **Cash Flow View:** Should reflect *actual purchases* (Cash Out).

## 2. Implementation Plan

### Phase 1: Immediate Fixes (Code Corrections)

#### 1. Fix Revenue Attribution
*   **Action:** Update `FinancialReportService` to fetch and use `mainCategory` from `MenuItemModel`.
*   **Logic:**
    ```typescript
    // Change this
    category: menuItem.category // 'beer-local'
    
    // To this
    mainCategory: menuItem.mainCategory // 'drinks'
    
    // And update the check
    if (item.mainCategory === 'drinks') { ... }
    ```

#### 2. Fix Net Profit Calculation (Stop Double Counting)
*   **Action:** Exclude `Direct Costs` (Ingredient Purchases) from the *Net Profit* calculation in the Daily Financial Report.
*   **Logic:**
    $$ \text{Net Profit} = \text{Gross Profit} (\text{Revenue} - \text{COGS}) - \text{Operating Expenses (Overhead Only)} $$
*   **Display:** We will still fetch and display "Direct Expenses" in the report for comparison (Variance Analysis), but we will visually separate them from the P&L calculation. This allows the owner to compare "Theoretical Cost (COGS)" vs "Actual Spend (Purchases)" to spot waste or theft, without breaking the profit math.

### Phase 2: Report Redesign (UI Updates)

Update the `DailyFinancialReport` structure to clearer sections:
1.  **Revenue** (Food vs Drink)
2.  **Cost of Goods Sold (COGS)** (Theoretical Usage)
3.  **Gross Profit** (Revenue - COGS)
4.  **Operating Expenses** (Rent, Salaries, Marketing - *Excluding Ingredient Purchases*)
5.  **Net Profit** (Gross Profit - Operating Expenses)
6.  **Cash Flow / Variance Check** (Informational Section):
    *   *Actual Ingredient Purchases (from Expenses)*
    *   *Theoretical Usage (COGS)*
    *   *Variance (Purchases - Usage)*

## 3. Recommended Workflow for User

To ensure this model works, the user should continue:
1.  **Setting Cost Per Unit:** Ensure every menu item has a `costPerUnit` set in the Menu settings (based on recipe cost).
2.  **Recording Expenses:**
    *   Mark Ingredient Purchases as `Direct Costs`.
    *   Mark Rent/Salaries/Utilities as `Operating Expenses`.

This ensures the system can calculate:
*   **Profit:** Based on what you sold (`costPerUnit`).
*   **Spending:** Based on what you bought (`Expenses`).
