# Profitability Calculation Implementation Status

## Overview
Implementation of the profitability calculation system as detailed in `profitability-calculation.md`.

## Phase 1: Database Schema & Models ✅ COMPLETED

### 1.1 Price History Interface & Model ✅
- **Created**: `/interfaces/menu-item-price-history.interface.ts`
  - `IMenuItemPriceHistory` interface
  - `PriceChangeReason` type
- **Created**: `/models/menu-item-price-history-model.ts`
  - Mongoose schema with indexes for efficient querying
  - Compound indexes for date range queries
  - Index for finding current prices (effectiveTo is null)

### 1.2 Cost History Interface & Model ✅
- **Created**: `/interfaces/inventory-item-cost-history.interface.ts`
  - `IInventoryItemCostHistory` interface
- **Created**: `/models/inventory-item-cost-history-model.ts`
  - Mongoose schema with indexes
  - Tracks supplier and purchase date information

### 1.3 Enhanced Order Interface & Model ✅
- **Updated**: `/interfaces/order.interface.ts`
  - Added to `IOrderItem`:
    - `costPerUnit: number` - Cost at time of order
    - `totalCost: number` - quantity × costPerUnit
    - `grossProfit: number` - subtotal - totalCost
    - `profitMargin: number` - (grossProfit / subtotal) × 100
  - Added to `IOrder`:
    - `totalCost: number` - Sum of all item costs
    - `grossProfit: number` - total - totalCost - operationalCosts
    - `profitMargin: number` - (grossProfit / total) × 100
    - `operationalCosts` object with delivery, packaging, processing fields

- **Updated**: `/models/order-model.ts`
  - Added profitability fields to `orderItemSchema`
  - Added profitability and operational cost fields to `orderSchema`
  - All new fields have default values for backward compatibility

### 1.4 Enhanced MenuItem Interface & Model ✅
- **Updated**: `/interfaces/menu-item.interface.ts`
  - Added `costPerUnit: number` field
- **Updated**: `/models/menu-item-model.ts`
  - Added `costPerUnit` field with default value 0
  - Required field for all new menu items

### 1.5 Interface Exports ✅
- **Updated**: `/interfaces/index.ts`
  - Exported `menu-item-price-history.interface`
  - Exported `inventory-item-cost-history.interface`

## Phase 2: Service Layer ✅ COMPLETED

### 2.1 Price History Service ✅
- **Created**: `/services/price-history-service.ts`
  - `getCurrentPricing(menuItemId)` - Get current price and cost
  - `getPriceAtDate(menuItemId, date)` - Get historical pricing
  - `updatePrice(...)` - Update price and create history record
  - `getPriceHistory(menuItemId)` - Get all price changes
  - `initializePriceHistory(...)` - For migration
  - `getPriceChangesInRange(startDate, endDate)` - For reports
  - `calculateProfitMargin(price, cost)` - Utility method

### 2.2 Order Service Enhancement ✅
- **Updated**: `/services/order-service.ts`
  - Imported `PriceHistoryService` ✅
  - Added `enrichOrderItemsWithCosts()` method - Captures cost snapshots for each item
  - Added `calculateOperationalCosts()` method - Calculates delivery, packaging, processing costs
  - Updated `createOrder()` to:
    - Enrich items with cost data at order time
    - Calculate item-level profitability (costPerUnit, totalCost, grossProfit, profitMargin)
    - Calculate order-level profitability (totalCost, grossProfit, profitMargin)
    - Store operational costs breakdown
    - Store complete financial snapshot

### 2.3 Profitability Analytics Service ✅
- **Created**: `/services/profitability-analytics-service.ts`
  - `generateProfitabilityReport()` - Comprehensive report with summary, trends, breakdowns
  - `calculateSummary()` - Overall metrics (revenue, costs, profit, margin)
  - `calculateByItem()` - Item-level profitability analysis
  - `calculateByOrderType()` - Profitability by dine-in/pickup/delivery
  - `calculateDailyTrends()` - Daily profitability trends
  - `getTopProfitableItems()` - Best performing items
  - `getItemsWithDecliningMargins()` - Items needing attention

### 2.4 Inventory Service Enhancement ⏸️ PENDING
- **To Update**: `/services/inventory-service.ts`
  - Add cost history tracking
  - Update cost and create history records
  - Link cost changes to menu items

## Phase 3: API Endpoints ✅ COMPLETED

### Price Management Endpoints ✅
- **Created**: `GET /api/menu/[itemId]/price-history` - Get price history
  - Authentication required (admin/super-admin)
  - Optional limit parameter
  - Returns price change history with reasons and timestamps
  
- **Created**: `POST /api/menu/[itemId]/update-price` - Update price
  - Super-admin only
  - Validates price and costPerUnit
  - Requires reason for change
  - Creates price history record automatically

### Analytics Endpoints ✅
- **Created**: `GET /api/analytics/profitability` - Profitability report
  - Authentication required (admin/super-admin)
  - Date range parameters (startDate, endDate)
  - Optional filters (orderType, category)
  - Returns comprehensive profitability analysis

### Cost Management Endpoints ⏸️ PENDING
- `GET /api/inventory/[itemId]/cost-history` - Get cost history
- `POST /api/inventory/[itemId]/update-cost` - Update cost

## Phase 4: Admin Dashboard UI ⏸️ PENDING

### Price Management Interface
- Location: `/app/dashboard/menu/[itemId]/pricing`
- Features:
  - View current price and cost
  - Update price with reason
  - View price history timeline
  - Schedule future price changes

### Profitability Dashboard
- Location: `/app/dashboard/analytics/profitability`
- Features:
  - Overview cards (revenue, costs, profit, margin)
  - Profitability trends chart
  - Item performance tables
  - Cost analysis reports
  - Export functionality

## Phase 5: Migration & Data Backfill ✅ COMPLETED

### Migration Script ✅
- **Created**: `/scripts/migrate-profitability-data.ts`
  - Step 1: Creates initial price history records for all menu items
  - Step 2: Backfills existing orders with profitability data (processes 1000 at a time)
  - Step 3: Validates migration and reports coverage
  - Features:
    - Batch processing to avoid memory issues
    - Error handling for individual order failures
    - Progress reporting
    - Validation and coverage metrics
  - Run with: `npx tsx scripts/migrate-profitability-data.ts`

## Implementation Notes

### Backward Compatibility
- All new fields have default values (0 for numbers)
- Existing orders will show 0 for profitability metrics until backfilled
- New orders will automatically capture cost snapshots

### Data Integrity
- Price history records are immutable once created
- Historical orders never recalculated with current prices
- Complete audit trail of all price changes

### Performance Considerations
- Indexes added for efficient date range queries
- Price history lookup optimized with compound indexes
- Current price queries use effectiveTo=null index

## Next Steps

1. **Complete OrderService Enhancement**
   - Add `enrichOrderItemsWithCosts()` method
   - Update `createOrder()` to use cost snapshots
   - Calculate and store profitability metrics

2. **Create Migration Script**
   - Initialize price history for existing menu items
   - Backfill orders with estimated costs
   - Run in production during maintenance window

3. **Build API Endpoints**
   - Price management endpoints
   - Analytics endpoints
   - Proper authentication and authorization

4. **Build Admin UI**
   - Price management interface
   - Profitability dashboard
   - Cost variance reports

5. **Testing**
   - Unit tests for services
   - Integration tests for API endpoints
   - E2E tests for admin workflows

## Testing Checklist

- [ ] Price history creation and retrieval
- [ ] Cost snapshot capture on order creation
- [ ] Profitability calculations accuracy
- [ ] Historical data immutability
- [ ] Migration script safety
- [ ] API endpoint security
- [ ] Admin UI functionality
- [ ] Report generation performance

## Deployment Plan

1. **Week 1**: Deploy schema changes (non-breaking)
2. **Week 2**: Enable price history tracking
3. **Week 3**: Run migration script
4. **Week 4**: Deploy API endpoints
5. **Week 5**: Launch admin UI features

## Known Issues & Considerations

1. **TypeScript Warnings**: PriceHistoryService imported but not yet used in OrderService - will be resolved when enrichment method is added
2. **Existing Orders**: Will show 0 profitability until migration script runs
3. **Menu Items**: Need to populate costPerUnit field for existing items before price history can be initialized
