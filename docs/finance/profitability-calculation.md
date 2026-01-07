# Profitability Calculation & Price History Management

## Problem Statement

Over time, menu item prices and costs change due to:
- Supplier price increases/decreases
- Inflation adjustments
- Promotional pricing
- Seasonal variations
- Market competition
- Cost optimization

**Challenge**: How do we ensure profitability reports and analytics remain accurate when prices change, while maintaining historical data integrity for past orders?

## Core Requirements

### 1. Historical Accuracy
- Past orders must reflect the prices and costs at the time of sale
- Profitability reports for historical periods must remain consistent
- Audit trail of all price changes with timestamps

### 2. Current Operations
- Menu displays current prices
- New orders use current prices and costs
- Inventory tracking uses current costs

### 3. Reporting & Analytics
- Accurate profit margins for any time period
- Trend analysis showing how profitability changes over time
- Cost variance reports comparing historical vs current costs
- Price elasticity analysis

### 4. Data Integrity
- No retroactive changes to completed orders
- Clear separation between historical and current pricing
- Ability to reconstruct profitability at any point in time

## Solution Architecture

### Approach: Price Snapshot at Order Time

**Core Principle**: Capture and store complete pricing information at the moment of order creation, making each order a self-contained financial record.

### Database Schema Changes

#### 1. Menu Item Price History

```typescript
interface IMenuItemPriceHistory {
  _id: Types.ObjectId;
  menuItemId: Types.ObjectId;
  price: number;
  costPerUnit: number;
  effectiveFrom: Date;
  effectiveTo?: Date; // null for current price
  reason?: string; // "supplier_increase", "promotion", "seasonal", "market_adjustment"
  changedBy: Types.ObjectId; // admin who made the change
  createdAt: Date;
}
```

#### 2. Order Item Enhancement (Already Partially Implemented)

```typescript
interface IOrderItem {
  menuItemId: Types.ObjectId;
  name: string;
  quantity: number;
  
  // Pricing snapshot at order time
  unitPrice: number; // Selling price at time of order
  costPerUnit: number; // Cost at time of order (NEW)
  subtotal: number; // quantity * unitPrice
  
  // Profitability calculation
  totalCost: number; // quantity * costPerUnit (NEW)
  grossProfit: number; // subtotal - totalCost (NEW)
  profitMargin: number; // (grossProfit / subtotal) * 100 (NEW)
  
  customizations?: IOrderItemCustomization[];
  specialInstructions?: string;
}
```

#### 3. Order-Level Profitability

```typescript
interface IOrder {
  // ... existing fields ...
  
  // Financial breakdown
  subtotal: number;
  tax: number;
  deliveryFee: number;
  discount: number;
  tip: number;
  total: number;
  
  // Profitability metrics (NEW)
  totalCost: number; // Sum of all item costs
  grossProfit: number; // total - totalCost - operationalCosts
  profitMargin: number; // (grossProfit / total) * 100
  operationalCosts: {
    delivery?: number; // Delivery driver cost if applicable
    packaging?: number; // Packaging materials cost
    processing?: number; // Payment processing fees
  };
}
```

#### 4. Inventory Item Cost History

```typescript
interface IInventoryItemCostHistory {
  _id: Types.ObjectId;
  inventoryItemId: Types.ObjectId;
  costPerUnit: number;
  supplier?: string;
  purchaseDate: Date;
  effectiveFrom: Date;
  effectiveTo?: Date;
  changedBy: Types.ObjectId;
  createdAt: Date;
}
```

## Implementation Plan

### Phase 1: Database Schema & Models (Week 1)

#### Step 1.1: Create Price History Model
- Create `MenuItemPriceHistory` model
- Create `InventoryItemCostHistory` model
- Add indexes for efficient querying by date ranges

#### Step 1.2: Enhance Order Model
- Add profitability fields to `IOrderItem` interface
- Add profitability fields to `IOrder` interface
- Update Order schema with new fields

#### Step 1.3: Migration Script
- Create script to populate initial price history from current menu items
- Backfill existing orders with cost data (use current costs as estimate)
- Mark backfilled data with flag for transparency

### Phase 2: Service Layer Updates (Week 1-2)

#### Step 2.1: MenuItemService Enhancements

```typescript
class MenuItemService {
  /**
   * Update menu item price and create history record
   */
  static async updatePrice(
    menuItemId: string,
    newPrice: number,
    reason: string,
    changedBy: string
  ): Promise<void> {
    // Close current price history record
    // Create new price history record
    // Update menu item with new price
  }
  
  /**
   * Get price at specific date
   */
  static async getPriceAtDate(
    menuItemId: string,
    date: Date
  ): Promise<{ price: number; costPerUnit: number }> {
    // Query price history for effective price at date
  }
  
  /**
   * Get current price and cost
   */
  static async getCurrentPricing(
    menuItemId: string
  ): Promise<{ price: number; costPerUnit: number }> {
    // Get latest price history record
  }
}
```

#### Step 2.2: OrderService Enhancements

```typescript
class OrderService {
  /**
   * Create order with profitability snapshot
   */
  static async createOrder(orderData: CreateOrderData): Promise<IOrder> {
    // For each item:
    // 1. Get current price and cost
    // 2. Calculate item profitability
    // 3. Store snapshot in order
    
    // Calculate order-level profitability
    // Include operational costs
    // Store complete financial picture
  }
  
  /**
   * Calculate profitability for existing order
   */
  static async calculateOrderProfitability(
    orderId: string
  ): Promise<ProfitabilityMetrics> {
    // Use stored snapshot data
    // No recalculation with current prices
  }
}
```

#### Step 2.3: InventoryService Enhancements

```typescript
class InventoryService {
  /**
   * Update inventory cost and create history
   */
  static async updateCost(
    inventoryItemId: string,
    newCost: number,
    supplier: string,
    changedBy: string
  ): Promise<void> {
    // Close current cost history
    // Create new cost history record
    // Update inventory item
    // Update linked menu items' costs
  }
  
  /**
   * Get cost at specific date
   */
  static async getCostAtDate(
    inventoryItemId: string,
    date: Date
  ): Promise<number> {
    // Query cost history
  }
}
```

### Phase 3: Admin Dashboard Features (Week 2)

#### Step 3.1: Price Management Interface

**Location**: `/app/dashboard/menu/[itemId]/pricing`

Features:
- View current price and cost
- Update price with reason
- View price history timeline
- Compare price changes over time
- Set scheduled price changes (future effective dates)

#### Step 3.2: Cost Management Interface

**Location**: `/app/dashboard/inventory/[itemId]/costs`

Features:
- View current cost per unit
- Update cost with supplier info
- View cost history timeline
- Link cost changes to menu items
- Bulk cost updates for supplier price changes

#### Step 3.3: Profitability Dashboard

**Location**: `/app/dashboard/analytics/profitability`

Features:
- **Overview Cards**:
  - Total revenue (period)
  - Total costs (period)
  - Gross profit (period)
  - Average profit margin (period)

- **Profitability Trends**:
  - Line chart: Revenue vs Cost vs Profit over time
  - Profit margin trend line
  - Comparison with previous period

- **Item Performance**:
  - Table: Top profitable items
  - Table: Low margin items needing attention
  - Profit margin by category

- **Cost Analysis**:
  - Cost variance report (current vs historical)
  - Items with increasing costs
  - Price optimization recommendations

- **Filters**:
  - Date range selector
  - Order type filter (dine-in, pickup, delivery)
  - Category filter
  - Export to CSV/Excel

### Phase 4: Reporting & Analytics (Week 2-3)

#### Step 4.1: Profitability Reports

```typescript
interface ProfitabilityReport {
  period: { start: Date; end: Date };
  summary: {
    totalRevenue: number;
    totalCosts: number;
    grossProfit: number;
    profitMargin: number;
    orderCount: number;
    averageOrderProfit: number;
  };
  byCategory: CategoryProfitability[];
  byItem: ItemProfitability[];
  byOrderType: OrderTypeProfitability[];
  trends: {
    daily: DailyProfitability[];
    weekly: WeeklyProfitability[];
    monthly: MonthlyProfitability[];
  };
}
```

#### Step 4.2: Cost Variance Analysis

```typescript
interface CostVarianceReport {
  items: {
    menuItemId: string;
    name: string;
    currentCost: number;
    averageCostLastMonth: number;
    costChange: number;
    costChangePercent: number;
    impactOnMargin: number;
  }[];
  recommendations: {
    itemsNeedingPriceIncrease: MenuItem[];
    itemsWithDecliningMargins: MenuItem[];
    costSavingOpportunities: MenuItem[];
  };
}
```

#### Step 4.3: Price Optimization Engine

```typescript
class PriceOptimizationService {
  /**
   * Analyze price elasticity and recommend optimal pricing
   */
  static async analyzePriceElasticity(
    menuItemId: string
  ): Promise<PriceElasticityAnalysis> {
    // Analyze historical sales volume vs price changes
    // Calculate price elasticity coefficient
    // Recommend optimal price point
  }
  
  /**
   * Suggest price adjustments based on cost changes
   */
  static async suggestPriceAdjustments(): Promise<PriceAdjustmentSuggestion[]> {
    // Identify items with margin below target
    // Calculate required price increase
    // Consider market positioning
  }
}
```

### Phase 5: API Endpoints (Week 3)

#### Profitability Endpoints

```typescript
// GET /api/analytics/profitability
// Query params: startDate, endDate, orderType, category
// Returns: ProfitabilityReport

// GET /api/analytics/cost-variance
// Query params: startDate, endDate
// Returns: CostVarianceReport

// GET /api/menu/[itemId]/price-history
// Returns: MenuItemPriceHistory[]

// POST /api/menu/[itemId]/update-price
// Body: { price, costPerUnit, reason }
// Returns: Success/Error

// GET /api/inventory/[itemId]/cost-history
// Returns: InventoryItemCostHistory[]

// POST /api/inventory/[itemId]/update-cost
// Body: { costPerUnit, supplier }
// Returns: Success/Error
```

## Data Integrity Rules

### 1. Immutability of Historical Data
- **NEVER** modify price/cost data on completed orders
- **NEVER** recalculate profitability for past orders using current prices
- Historical reports must always return the same results

### 2. Price Change Workflow
```
1. Admin updates menu item price
2. System creates new price history record
3. System closes previous price history record (sets effectiveTo)
4. New orders use new price
5. Old orders remain unchanged
```

### 3. Cost Change Workflow
```
1. Admin updates inventory cost
2. System creates new cost history record
3. System updates linked menu items' cost per unit
4. System creates price history records for affected menu items
5. New orders use new costs
6. Old orders remain unchanged
```

### 4. Audit Trail Requirements
- Every price change logged with reason and admin user
- Every cost change logged with supplier and date
- Timestamp all changes with timezone
- Maintain complete change history (never delete)

## Profitability Calculation Examples

### Example 1: Simple Order

```typescript
// Menu Item: Desperados Beer
// Current Price: ₦1,500
// Current Cost: ₦800
// Order Date: 2025-12-17

Order Item Snapshot:
{
  name: "Desperados",
  quantity: 2,
  unitPrice: 1500,      // Price at order time
  costPerUnit: 800,     // Cost at order time
  subtotal: 3000,       // 2 × 1500
  totalCost: 1600,      // 2 × 800
  grossProfit: 1400,    // 3000 - 1600
  profitMargin: 46.67   // (1400 / 3000) × 100
}
```

### Example 2: Price Change Impact

```typescript
// Scenario: Supplier increases cost from ₦800 to ₦950

// Order #1 (Before price change - Dec 15)
{
  unitPrice: 1500,
  costPerUnit: 800,
  grossProfit: 700,     // per unit
  profitMargin: 46.67%
}

// Order #2 (After price change - Dec 20)
{
  unitPrice: 1500,      // Not changed yet
  costPerUnit: 950,     // New cost
  grossProfit: 550,     // per unit
  profitMargin: 36.67%  // Margin decreased!
}

// Recommendation: Increase price to ₦1,700 to maintain 46% margin
```

### Example 3: Delivery Order with Operational Costs

```typescript
Order:
{
  items: [
    { subtotal: 5000, totalCost: 2500 }
  ],
  subtotal: 5000,
  deliveryFee: 500,
  total: 5500,
  
  operationalCosts: {
    delivery: 300,      // Driver payment
    packaging: 100,     // Containers, bags
    processing: 165     // 3% payment gateway fee
  },
  
  totalCost: 2500,
  totalOperationalCosts: 565,
  grossProfit: 2435,    // 5500 - 2500 - 565
  profitMargin: 44.27%  // (2435 / 5500) × 100
}
```

## Migration Strategy

### Phase 1: Backfill Historical Data

```typescript
// Migration Script: backfill-price-history.ts

async function backfillPriceHistory() {
  // 1. For each menu item:
  //    - Create initial price history record
  //    - Use current price and cost
  //    - Set effectiveFrom to item creation date
  
  // 2. For each existing order:
  //    - Calculate profitability using current costs (best estimate)
  //    - Mark as "estimated" for transparency
  //    - Store in order document
  
  // 3. Create audit log entry for migration
}
```

### Phase 2: Gradual Rollout

1. **Week 1**: Deploy schema changes, no UI changes
2. **Week 2**: Enable price history tracking for new changes
3. **Week 3**: Launch admin price management interface
4. **Week 4**: Launch profitability dashboard (read-only)
5. **Week 5**: Enable full analytics and reporting

## Testing Plan

### Unit Tests
- Price history creation and querying
- Cost history creation and querying
- Profitability calculations
- Price/cost retrieval at specific dates

### Integration Tests
- Order creation with price snapshot
- Price update workflow
- Cost update workflow
- Report generation with date ranges

### E2E Tests
- Admin updates menu item price
- New order uses new price, old order unchanged
- Profitability report shows correct margins
- Cost variance report identifies changes

## Performance Considerations

### Indexing Strategy

```typescript
// MenuItemPriceHistory indexes
{
  menuItemId: 1,
  effectiveFrom: -1,
  effectiveTo: -1
}

// InventoryItemCostHistory indexes
{
  inventoryItemId: 1,
  effectiveFrom: -1,
  effectiveTo: -1
}

// Order indexes for profitability queries
{
  createdAt: -1,
  orderType: 1,
  'items.menuItemId': 1
}
```

### Caching Strategy
- Cache current prices (1 hour TTL)
- Cache profitability reports (15 minutes TTL)
- Invalidate cache on price/cost updates

### Query Optimization
- Use aggregation pipelines for reports
- Limit date ranges for large datasets
- Implement pagination for item-level reports

## Security & Permissions

### Role-Based Access

**Super Admin**:
- Update prices and costs
- View all profitability data
- Access cost history
- Export financial reports

**Admin**:
- View profitability dashboard (limited)
- View price history (no costs)
- No cost data access

**Customer**:
- No access to profitability data
- See only current menu prices

## Future Enhancements

### Phase 2 Features
- Predictive cost modeling
- Automated price adjustment suggestions
- Competitor price tracking integration
- Dynamic pricing based on demand
- Seasonal pricing automation
- Bulk price update tools
- Price change scheduling
- A/B testing for price points

### Advanced Analytics
- Customer lifetime value by price sensitivity
- Menu mix optimization for maximum profit
- Cross-sell profitability analysis
- Time-of-day profitability patterns
- Weather impact on profitability

## Success Metrics

### Accuracy Metrics
- 100% of orders have complete cost data
- Historical reports remain consistent over time
- Zero retroactive changes to completed orders

### Business Metrics
- Improved profit margin visibility
- Faster response to cost increases
- Data-driven pricing decisions
- Reduced margin erosion

### Operational Metrics
- Price update time < 2 minutes
- Report generation time < 5 seconds
- 99.9% data accuracy

## Conclusion

This approach ensures:
1. **Historical Accuracy**: Past orders remain unchanged
2. **Current Operations**: New orders use current pricing
3. **Reporting Integrity**: Consistent profitability analysis
4. **Audit Compliance**: Complete change history
5. **Business Intelligence**: Data-driven pricing decisions

By capturing complete pricing information at order time, we create a self-contained financial record that remains accurate regardless of future price changes, while maintaining the flexibility to analyze trends and optimize pricing strategies.
