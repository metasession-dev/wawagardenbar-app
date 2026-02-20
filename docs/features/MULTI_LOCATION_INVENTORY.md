# Multi-Location Inventory Tracking - Implementation Plan

## Feature Overview

A location-based inventory tracking system that enables staff to manage drinks stored across multiple physical locations (Store, Chillers) with full transfer tracking, audit trails, and location-aware reporting.

### Business Problem

Wawa Garden Bar stores drinks in two primary locations:
1. **Main Store/Warehouse** - Bulk storage for inventory
2. **Chillers** - Ready-to-serve drinks at the bar/restaurant

Staff regularly transfer drinks from the store to chillers to maintain service readiness. The current inventory system tracks total stock but doesn't differentiate between locations, making it difficult to:
- Know how many drinks are in each chiller vs. store
- Track transfer patterns and optimize stocking
- Identify location-specific discrepancies during inventory counts
- Prevent stockouts in service areas while having stock in storage

### Solution

Extend the existing inventory system to support multi-location tracking with:
- Location-based stock levels for each inventory item
- Stock transfer functionality between locations
- Location-aware inventory summaries and reports
- Full audit trail of all transfers
- Configurable location management

---

## Key Requirements

### 1. Location Management
- Define multiple storage locations (Store, Chiller 1, Chiller 2, etc.)
- Enable/disable location tracking per inventory item
- Set default locations for new stock and sales deductions
- Support flexible location configuration

### 2. Stock Transfers
- Transfer stock between any two locations
- Validate sufficient stock before transfer
- Record transfer details (who, when, why, reference number)
- Batch transfer support for efficiency
- Transfer history and audit trail

### 3. Location-Aware Operations
- Add stock to specific locations (receiving)
- Deduct from specific locations (sales)
- View stock distribution across locations
- Location-based low stock alerts
- Transfer recommendations based on sales patterns

### 4. Reporting & Analytics
- Daily inventory summary by location
- Transfer history reports
- Location utilization analytics
- Stock movement patterns
- Location-specific discrepancy tracking

### 5. User Interface
- Quick transfer dialog for staff
- Location breakdown in inventory dashboard
- Location filter and search
- Visual stock distribution indicators
- Mobile-friendly transfer interface

---

## Database Schema Changes

### 1. Update Inventory Interface

**File:** `/interfaces/inventory.interface.ts`

```typescript
export type LocationType = 'store' | 'chiller-1' | 'chiller-2' | 'chiller-3' | 'other';

export interface IInventoryLocation {
  location: LocationType | string;
  locationName?: string;
  currentStock: number;
  lastUpdated: Date;
  updatedBy?: Types.ObjectId;
  updatedByName?: string;
  notes?: string;
}

export interface IInventory {
  _id: Types.ObjectId;
  menuItemId: Types.ObjectId;
  currentStock: number;
  minimumStock: number;
  maximumStock: number;
  unit: string;
  status: StockStatus;
  lastRestocked?: Date;
  stockHistory: IStockHistory[];
  autoReorderEnabled: boolean;
  reorderQuantity: number;
  supplier?: string;
  costPerUnit: number;
  preventOrdersWhenOutOfStock: boolean;
  salesVelocity?: number;
  lastSaleDate?: Date;
  totalSales: number;
  totalWaste: number;
  totalRestocked: number;
  
  // NEW: Multi-location tracking
  trackByLocation: boolean;
  locations: IInventoryLocation[];
  defaultReceivingLocation?: string;
  defaultSalesLocation?: string;
  
  createdAt: Date;
  updatedAt: Date;
}
```

### 2. Update Stock History Interface

```typescript
export type StockHistoryCategory = 
  | 'sale' 
  | 'restock' 
  | 'waste' 
  | 'damage' 
  | 'adjustment' 
  | 'transfer'
  | 'other';

export interface IStockHistory {
  quantity: number;
  type: 'addition' | 'deduction' | 'adjustment';
  reason: string;
  performedBy: Types.ObjectId;
  timestamp: Date;
  category?: StockHistoryCategory;
  orderId?: Types.ObjectId;
  invoiceNumber?: string;
  supplier?: string;
  costPerUnit?: number;
  totalCost?: number;
  notes?: string;
  performedByName?: string;
  
  // NEW: Location-specific fields
  location?: string;
  fromLocation?: string;
  toLocation?: string;
  transferReference?: string;
}
```

### 3. Location Configuration Interface

**File:** `/interfaces/system-settings.interface.ts`

```typescript
export interface IInventoryLocationConfig {
  id: string;
  name: string;
  type: 'storage' | 'chiller' | 'other';
  isActive: boolean;
  description?: string;
  capacity?: number;
  displayOrder: number;
}

export interface IInventoryLocationsSettings {
  enabled: boolean;
  locations: IInventoryLocationConfig[];
  defaultReceivingLocation: string;
  defaultSalesLocation: string;
  requireTransferNotes: boolean;
  allowNegativeStock: boolean;
}
```

---

## Service Layer Implementation

### Key Methods for InventoryService

**File:** `/services/inventory-service.ts`

1. **transferStock()** - Transfer stock between locations
2. **batchTransferStock()** - Batch transfer multiple items
3. **getStockByLocation()** - Get stock for specific location
4. **addStockToLocation()** - Add stock to specific location
5. **deductStockFromLocation()** - Deduct from specific location
6. **getLocationBreakdown()** - Get stock distribution
7. **getTransferHistory()** - Get transfer history
8. **getLowStockByLocation()** - Location-based alerts
9. **enableLocationTracking()** - Enable for an item

---

## Implementation Phases

### Phase 1: Database & Core Services (3-4 days)
- Update interfaces and models
- Add location tracking methods to InventoryService
- Create SystemSettingsService location methods
- Write unit tests
- Create migration script

### Phase 2: Server Actions (1-2 days)
- Create location-actions.ts
- Add role-based access control
- Add error handling and validation
- Add audit logging

### Phase 3: UI Components (3-4 days)
- StockTransferDialog
- LocationBreakdownCard
- InventoryLocationsForm
- StockTransferClient page
- Update inventory dashboard

### Phase 4: Pages & Routes (2 days)
- /dashboard/inventory/transfer
- /dashboard/settings/locations
- Update existing inventory pages
- Add navigation links

### Phase 5: Integration (2-3 days)
- Update daily inventory summary
- Update order deduction logic
- Update financial reports
- Test complete workflow

### Phase 6: Testing & Documentation (2 days)
- End-to-end testing
- Mobile responsiveness
- Performance testing
- User documentation

---

## User Workflows

### Workflow 1: Daily Stock Transfer (Staff)
1. Open "Stock Transfer" page
2. Select items to transfer (e.g., 50 beers)
3. Choose "Store" → "Chiller 1"
4. Enter quantity and notes
5. Submit transfer
6. Stock levels updated

### Workflow 2: Receiving New Stock (Admin)
1. Receive delivery at store
2. Open inventory item
3. Click "Add Stock"
4. Select location: "Store"
5. Enter quantity, invoice, supplier
6. Stock added to store location

### Workflow 3: Daily Inventory Count (Staff)
1. Open "Daily Inventory Summary"
2. View current stock by location
3. Count physical stock per location
4. Enter actual counts
5. Submit for approval
6. Super-admin approves
7. Stock adjusted per location

### Workflow 4: Location Configuration (Super-Admin)
1. Open "Location Settings"
2. Enable location tracking
3. Add locations
4. Set defaults
5. Save configuration
6. Enable for specific items

---

## Technical Considerations

### Data Migration
- Existing items default to single location
- Gradual migration per item
- Backward compatibility maintained

### Performance
- Index on locations.location
- Cache location configuration
- Batch operations
- Pagination for history

### Data Integrity
- Transaction support
- Validation rules
- Audit trail
- Rollback mechanism

### Security
- Role-based access
- Audit logging
- Location ID validation
- Access control

---

## Success Metrics

1. **Operational Efficiency**
   - Stock transfer time reduced by 50%
   - Inventory accuracy improved by 30%
   - Stockout incidents reduced by 40%

2. **User Adoption**
   - 90%+ drinks using location tracking
   - 95%+ staff trained
   - Daily transfers logged

3. **Data Quality**
   - 100% audit trail
   - Zero data loss
   - Discrepancies identified

---

## Estimated Timeline

- **Total Development**: 13-17 days
- **Testing & QA**: 3-4 days
- **Documentation**: 2 days
- **Total**: ~3-4 weeks

---

## Dependencies

- Existing Inventory Management system
- Order Management system
- User authentication and roles
- Audit logging system
- System Settings infrastructure

---

## Future Enhancements

1. Mobile app for quick transfers
2. Barcode scanning
3. Auto-transfer suggestions (ML-based)
4. Location capacity management
5. Temperature monitoring integration
6. Expiry tracking by location
7. Photo evidence for transfers
8. Real-time location alerts
9. Transfer scheduling
10. Location performance analytics
