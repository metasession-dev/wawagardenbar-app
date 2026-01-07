# Expense Management - Requirements & Implementation

## Overview
A comprehensive expense tracking system that captures both **Direct Costs** and **Operating Expenses** to enable accurate financial reporting and profitability analysis.

---

## Expense Categories

### 1. Direct Costs (Cost of Goods Sold - COGS)
**Definition:** Expenses directly tied to preparing and serving menu items. These costs are variable and scale with production volume.

**Examples:**
- **Meat/Protein:** Goat, chicken, beef, fish
- **Cooking Oils:** Palm oil, vegetable oil
- **Condiments & Spices:** Salt, pepper, herbs, spices
- **Vegetables:** Onions, tomatoes, peppers
- **Cooking Gas/Fuel:** LPG cylinders, charcoal
- **Beverages (for resale):** Beer stock, wine, soft drinks
- **Other Ingredients:** Rice, garri, flour, etc.

**Key Characteristics:**
- Directly attributable to specific menu items
- Variable costs (increase with sales volume)
- Used to calculate menu item cost price
- Impact gross profit margin

### 2. Operating Expenses (Indirect Costs)
**Definition:** Expenses required to run the business operations but not directly tied to specific menu items. These are typically fixed or semi-fixed costs.

**Examples:**
- **Utilities:** Electricity, water
- **Internet/Telecommunications:** WiFi, phone bills
- **Maintenance & Repairs:** Fixing doors, plumbing, equipment repairs
- **Fuel/Transportation:** Petrol for deliveries or supply runs
- **Salaries:** Staff wages (kitchen, waiters, security, gardener)
- **Security Services:** Security guards, alarm systems
- **Cleaning Supplies:** Detergents, sanitizers
- **Rent:** (if applicable)
- **Insurance:** Business insurance premiums
- **Licenses & Permits:** Business registration, health permits

**Key Characteristics:**
- Not directly tied to specific menu items
- Often fixed or semi-fixed costs
- Required to keep business operational
- Impact net profit margin

---

## Inventory Management Integration

### Non-Sellable Inventory Items
**Purpose:** Track raw materials and ingredients used in food preparation for restocking purposes.

**Examples:**
- Palm oil (litres)
- Salt (kilos)
- Goat meat (whole goats or kilos)
- Cooking gas (cylinders)
- Herbs and spices
- Vegetables

**Key Points:**
- **NOT part of financial profitability calculations**
- Used purely for **inventory tracking and restocking alerts**
- Helps answer: "When do I need to restock palm oil?"
- Separate from sellable inventory (completed menu items)

### Sellable Inventory Items
**Definition:** Completed menu items ready for sale to customers.

**Examples:**
- Goat Meat Pepper Soup
- Jollof Rice
- Fried Chicken
- Bottled Beer
- Soft Drinks

**Cost Calculation:**
The cost of a sellable menu item includes ALL ingredients:
```
Goat Meat Pepper Soup Cost = 
  (Goat meat cost per portion) +
  (Palm oil cost per portion) +
  (Salt cost per portion) +
  (Herbs & spices cost per portion) +
  (Cooking gas cost per portion) +
  (Other ingredients cost per portion)
```

**Example Calculation:**
- 1 Goat costs ₦75,000
- 1 Goat yields 200 portions of pepper soup
- Base goat cost per portion: ₦75,000 / 200 = ₦375

Additional ingredients per portion:
- Palm oil: ₦50
- Salt & spices: ₦20
- Gas: ₦30
- Other ingredients: ₦25

**Total Cost per Portion = ₦375 + ₦50 + ₦20 + ₦30 + ₦25 = ₦500**

If selling price is ₦1,200, gross profit per portion = ₦700

---

## Expense Entry System Requirements

### Page: `/dashboard/finance/expenses`

#### Features Required:

##### 1. Add Expense Form
**Fields:**
- **Date:** Date picker (defaults to today)
- **Expense Type:** Dropdown
  - Direct Cost
  - Operating Expense
- **Category:** Dropdown (dynamic based on expense type)
  
  **Direct Cost Categories:**
  - Meat/Protein
  - Cooking Oil
  - Condiments & Spices
  - Vegetables
  - Cooking Gas/Fuel
  - Beverages (Stock)
  - Other Ingredients
  
  **Operating Expense Categories:**
  - Utilities (Electricity, Water)
  - Internet/Telecommunications
  - Maintenance & Repairs
  - Fuel/Transportation
  - Salaries
  - Security Services
  - Cleaning Supplies
  - Rent
  - Insurance
  - Licenses & Permits
  - Other

- **Description:** Text field (e.g., "1 Goat for pepper soup", "Fixed broken toilet door")
- **Quantity:** Number input (optional, for tracking units)
- **Unit:** Text input (e.g., "goat", "litres", "kg", "cylinders")
- **Amount (₦):** Number input (total cost)
- **Supplier/Vendor:** Text input (optional)
- **Receipt/Reference:** Text input (optional, for tracking invoices)
- **Notes:** Textarea (optional, additional details)

**Actions:**
- Save Expense
- Save & Add Another
- Cancel

##### 2. Expense List/Table View
**Columns:**
- Date
- Type (Direct Cost / Operating Expense)
- Category
- Description
- Amount (₦)
- Recorded By (Admin name)
- Actions (Edit, Delete)

**Filters:**
- Date Range Picker
- Expense Type (All, Direct Cost, Operating Expense)
- Category Filter
- Search by description

**Summary Cards (above table):**
- Total Direct Costs (selected period)
- Total Operating Expenses (selected period)
- Total Expenses (selected period)
- Most Expensive Category

##### 3. Bulk Import
- CSV upload for bulk expense entry
- Template download for proper formatting

##### 4. Export
- Export expenses as CSV/Excel
- Filter by date range before export

---

## Database Schema

### Model: `Expense`

```typescript
interface IExpense {
  _id: ObjectId;
  date: Date;
  
  // Expense Classification
  expenseType: 'direct-cost' | 'operating-expense';
  category: string; // Dynamic based on expenseType
  
  // Details
  description: string;
  quantity?: number;
  unit?: string; // 'goat', 'litres', 'kg', 'cylinders', etc.
  amount: number; // Total cost in Naira
  
  // Tracking
  supplier?: string;
  receiptReference?: string;
  notes?: string;
  
  // Audit
  createdBy: ObjectId; // Admin who recorded the expense
  createdAt: Date;
  updatedAt: Date;
}
```

**Indexes:**
- `date` (for date range queries)
- `expenseType` (for filtering)
- `category` (for reporting)
- Compound index: `{ date: 1, expenseType: 1 }`

---

## Service Layer

### `ExpenseService`

**Methods:**

1. **`createExpense(data: CreateExpenseDTO): Promise<IExpense>`**
   - Validates expense data
   - Creates new expense record
   - Creates audit log entry
   - Returns created expense

2. **`getExpensesByDateRange(startDate: Date, endDate: Date, filters?: ExpenseFilters): Promise<IExpense[]>`**
   - Fetches expenses within date range
   - Supports filtering by type, category
   - Returns sorted list

3. **`getExpenseSummary(startDate: Date, endDate: Date): Promise<ExpenseSummary>`**
   - Calculates total direct costs
   - Calculates total operating expenses
   - Returns breakdown by category
   - Used in daily/monthly reports

4. **`updateExpense(id: string, data: UpdateExpenseDTO): Promise<IExpense>`**
   - Updates existing expense
   - Creates audit log entry
   - Returns updated expense

5. **`deleteExpense(id: string): Promise<void>`**
   - Soft delete or hard delete (configurable)
   - Creates audit log entry
   - Validates permissions

6. **`importExpensesFromCSV(file: Buffer): Promise<ImportResult>`**
   - Parses CSV file
   - Validates data
   - Bulk creates expenses
   - Returns success/error report

7. **`exportExpensesToCSV(startDate: Date, endDate: Date): Promise<Buffer>`**
   - Generates CSV file
   - Includes all expense details
   - Returns downloadable buffer

---

## Integration with Daily Reports

### How Expenses Feed into Daily Summary Report:

1. **Direct Costs:**
   - Aggregated by date
   - Added to COGS calculation
   - Impacts gross profit
   - Example: If ₦50,000 worth of goat meat was purchased on Monday, this is added to Monday's direct costs

2. **Operating Expenses:**
   - Aggregated by date
   - Subtracted from gross profit to calculate net profit
   - Example: If ₦5,000 was spent on electricity on Monday, this is subtracted from Monday's gross profit

### Daily Report Calculation Flow:
```
Revenue (from orders) = ₦200,000

Direct Costs:
  - Menu item costs (from inventory) = ₦80,000
  - Additional direct costs (from expenses) = ₦20,000
  Total Direct Costs = ₦100,000

Gross Profit = ₦200,000 - ₦100,000 = ₦100,000

Operating Expenses (from expenses table):
  - Electricity = ₦5,000
  - Internet = ₦2,000
  - Maintenance = ₦3,000
  - Prorated Salary = ₦10,000
  Total Operating Expenses = ₦20,000

Net Profit = ₦100,000 - ₦20,000 = ₦80,000
```

---

## Menu Item Cost Calculation

### Current System:
Menu items have a `costPerUnit` field in the inventory model.

### Enhanced System (Recommended):
Menu items should have a **detailed cost breakdown** that includes all ingredients.

#### Option 1: Manual Cost Entry
Admin manually calculates and enters the total cost per menu item, including all ingredients.

**Example:**
- Menu Item: Goat Meat Pepper Soup
- Cost Per Unit: ₦500 (manually calculated to include goat, oil, spices, gas, etc.)

#### Option 2: Recipe-Based Cost Calculation (Advanced)
Create a recipe system that automatically calculates menu item cost based on ingredients.

**Recipe Model:**
```typescript
interface IRecipe {
  menuItemId: ObjectId;
  ingredients: Array<{
    ingredientName: string;
    quantity: number;
    unit: string;
    costPerUnit: number;
    totalCost: number;
  }>;
  totalRecipeCost: number;
  yield: number; // Number of portions this recipe makes
  costPerPortion: number; // totalRecipeCost / yield
}
```

**Example Recipe:**
```
Goat Meat Pepper Soup (200 portions)
- 1 Goat: ₦75,000
- 4 Litres Palm Oil: ₦10,000
- 2 kg Salt & Spices: ₦4,000
- 5 Cylinders Gas: ₦6,000
- Other Ingredients: ₦5,000
Total Recipe Cost: ₦100,000
Cost Per Portion: ₦100,000 / 200 = ₦500
```

**Note:** Recipe-based calculation is more complex but provides better accuracy and tracking. Start with manual cost entry for MVP.

---

## Access Control

- **Super-Admin:** Full access (create, read, update, delete expenses)
- **Admin:** Limited access (create, read expenses only - no delete)
- **Customer:** No access

---

## Implementation Phases

### Phase 1: Basic Expense Entry
1. Create `Expense` model and schema
2. Create `ExpenseService` with basic CRUD operations
3. Build expense entry form UI
4. Build expense list/table view
5. Add filtering and search

### Phase 2: Integration with Reports
1. Update `FinancialReportService` to include expenses
2. Modify daily report calculation to include direct costs and operating expenses
3. Add expense breakdown section to daily report UI

### Phase 3: Advanced Features
1. Implement CSV import/export
2. Add expense analytics and trends
3. Create expense categories management
4. Add recurring expense templates

### Phase 4: Recipe System (Optional)
1. Create recipe model and service
2. Build recipe builder UI
3. Link recipes to menu items
4. Auto-calculate menu item costs from recipes

---

## Validation Rules

1. **Date:** Cannot be in the future
2. **Amount:** Must be greater than 0
3. **Expense Type:** Required, must be valid enum value
4. **Category:** Required, must match expense type
5. **Description:** Required, minimum 3 characters
6. **Quantity & Unit:** If quantity is provided, unit must be provided

---

## Reporting & Analytics

### Expense Reports to Build:

1. **Daily Expense Summary:**
   - Total direct costs for the day
   - Total operating expenses for the day
   - Breakdown by category

2. **Monthly Expense Report:**
   - Total expenses for the month
   - Comparison to previous month
   - Trend analysis

3. **Expense by Category:**
   - Pie chart showing distribution
   - Top 5 expense categories

4. **Supplier/Vendor Report:**
   - Total spent per supplier
   - Most frequent suppliers

---

## User Flow

### Adding an Expense:

1. Admin navigates to `/dashboard/finance/expenses`
2. Clicks "Add Expense" button
3. Fills out expense form:
   - Selects date (defaults to today)
   - Selects expense type (Direct Cost or Operating Expense)
   - Selects category from dropdown
   - Enters description (e.g., "1 Goat for pepper soup")
   - Enters quantity (1) and unit (goat)
   - Enters amount (₦75,000)
   - Optionally adds supplier name and receipt reference
4. Clicks "Save Expense"
5. Expense is recorded and appears in the expense list
6. Expense is automatically included in daily report calculations

### Viewing Expenses:

1. Admin navigates to `/dashboard/finance/expenses`
2. Sees summary cards showing totals
3. Views table of recent expenses
4. Uses filters to narrow down:
   - Date range: Last 7 days, Last 30 days, Custom range
   - Expense type: All, Direct Costs, Operating Expenses
   - Category: Specific category
5. Searches by description
6. Clicks on expense to view details or edit
7. Exports filtered expenses as CSV if needed

---

## Key Takeaways

1. **Two Main Expense Types:**
   - **Direct Costs:** Ingredients and materials for menu items (variable)
   - **Operating Expenses:** Business running costs (fixed/semi-fixed)

2. **Non-Sellable Inventory:**
   - Used for tracking restocking needs
   - NOT used in financial calculations
   - Separate from expense tracking

3. **Menu Item Costs:**
   - Must include ALL ingredients (goat + oil + spices + gas, etc.)
   - Used to calculate gross profit
   - Can be manually entered or calculated via recipes

4. **Expense Entry:**
   - Simple form with date, type, category, description, amount
   - Recorded by admins
   - Automatically feeds into daily reports

5. **Financial Flow:**
   ```
   Revenue - Direct Costs = Gross Profit
   Gross Profit - Operating Expenses = Net Profit
   ```
