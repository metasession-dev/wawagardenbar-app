# Feature 4.2.2: Automatic Inventory Management & Sales Integration - SPECIFICATION

**Status:** 📋 Specification (Not Yet Implemented)  
**Priority:** P1 - Critical  
**Dependencies:** Feature 4.2 (Menu & Inventory Management), Feature 3.3 (Order Processing)  
**Date:** November 16, 2025

---

## 📋 Overview

This feature creates a fully integrated inventory management system that automatically tracks stock levels based on sales, provides manual adjustment capabilities, and generates comprehensive analytics. The system links menu items directly to inventory records and automatically deducts stock when orders are completed.

---

## 🎯 Business Requirements

### Problem Statement
Currently, the inventory system is separate from the ordering system. Stock levels must be manually updated, which leads to:
- **Inaccurate stock levels** - Stock doesn't reflect actual sales
- **Manual overhead** - Admins must manually track and update inventory
- **Stockouts** - No automatic alerts when items run low
- **Lost sales** - Items may be ordered when out of stock
- **No analytics** - Can't track waste, turnover, or profit margins

### Solution
Implement automatic inventory management that:
1. **Links inventory to menu items** - Each menu item can have inventory tracking
2. **Auto-deducts stock on sales** - Inventory updates when orders complete
3. **Tracks all stock movements** - Complete audit trail of changes
4. **Alerts on low stock** - Automatic notifications to admins
5. **Provides analytics** - Stock turnover, waste, profit margins

---

## ✅ Functional Requirements

### 1. Inventory Initialization During Menu Item Creation

**When creating a menu item, admins can:**
- Toggle "Track Inventory" checkbox
- If enabled, set initial inventory:
  - **Current Stock** (e.g., 50 portions)
  - **Minimum Stock** (e.g., 10 portions - triggers low stock alert)
  - **Maximum Stock** (e.g., 100 portions - reorder target)
  - **Unit** (portions, bottles, pieces, kg, liters, etc.)
  - **Cost Per Unit** (for profit tracking)
  - **Supplier** (optional)
  - **Auto-reorder Enabled** (yes/no)
  - **Reorder Quantity** (how much to reorder)

**Business Rules:**
- Inventory tracking is **optional** per menu item
- Items without inventory tracking can still be ordered
- Inventory can be added to existing menu items later
- One inventory record per menu item (1:1 relationship)

---

### 2. Automatic Stock Deduction on Order Completion

**Trigger:** When order status changes to `"completed"`

**Process:**
1. Loop through all items in the order
2. For each item with inventory tracking:
   - Deduct quantity from `currentStock`
   - Create stock history entry:
     ```typescript
     {
       type: 'deduction',
       quantity: -orderItem.quantity,
       reason: 'Sale',
       orderId: order._id,
       performedBy: 'system',
       timestamp: new Date(),
     }
     ```
3. Update inventory status:
   - If `currentStock === 0` → status = `'out-of-stock'`
   - If `currentStock <= minimumStock` → status = `'low-stock'`
   - Otherwise → status = `'in-stock'`
4. Trigger alerts if low stock or out of stock
5. Log audit entry

**Business Rules:**
- Stock deduction happens **only on order completion**
- If order is cancelled, stock is **not deducted**
- If order is refunded, stock should be **added back** (manual or automatic)
- Items without inventory tracking are not affected
- **Optional:** Prevent orders if item is out of stock (configurable setting)

---

### 3. Manual Stock Adjustment Interface

**Location:** `/app/dashboard/inventory/[id]`

**Features:**

#### A. Add Stock (Restocking)
```typescript
{
  type: 'addition',
  quantity: +50,
  reason: 'Restocking from supplier',
  supplier: 'ABC Food Suppliers',
  costPerUnit: 1200,
  totalCost: 60000,
  invoiceNumber: 'INV-2024-001',
  performedBy: userId,
  timestamp: new Date(),
}
```

#### B. Deduct Stock (Waste/Damage)
```typescript
{
  type: 'deduction',
  quantity: -5,
  reason: 'Spoilage',
  category: 'waste', // waste, damage, theft, other
  notes: 'Items expired on 2024-11-15',
  performedBy: userId,
  timestamp: new Date(),
}
```

#### C. Adjust Stock (Inventory Count Correction)
```typescript
{
  type: 'adjustment',
  quantity: +3, // or -3
  previousStock: 47,
  newStock: 50,
  reason: 'Physical inventory count correction',
  performedBy: userId,
  timestamp: new Date(),
}
```

**UI Components:**
- Stock adjustment form with reason dropdown
- Stock history table (paginated)
- Current stock level display
- Quick actions: Add 10, Add 50, Set to Max
- Confirmation dialogs for all changes

---

### 4. Stock Movement Tracking

**All stock changes are logged with:**
- **Type:** addition, deduction, adjustment
- **Quantity:** positive or negative number
- **Reason:** Free text or predefined categories
- **Reference:** Order ID, Invoice Number, etc.
- **Performed By:** User ID and name
- **Timestamp:** Date and time
- **Additional Data:** Supplier, cost, notes

**Stock History Schema:**
```typescript
interface IStockHistory {
  quantity: number;
  type: 'addition' | 'deduction' | 'adjustment';
  reason: string;
  category?: 'sale' | 'restock' | 'waste' | 'damage' | 'adjustment';
  orderId?: ObjectId;
  invoiceNumber?: string;
  supplier?: string;
  costPerUnit?: number;
  totalCost?: number;
  notes?: string;
  performedBy: ObjectId;
  performedByName?: string;
  timestamp: Date;
}
```

**Reports:**
- Stock movement by date range
- Stock movement by type (sales, waste, restocking)
- Stock movement by user (who made changes)
- Export to CSV/Excel

---

### 5. Automatic Low Stock Notifications

**Triggers:**
- When `currentStock <= minimumStock` after any stock change
- When `currentStock === 0` (out of stock)

**Notification Channels:**

#### A. Email Alerts
```typescript
To: admin@wawagardenbar.com
Subject: Low Stock Alert: Jollof Rice
Body:
  Item: Jollof Rice
  Current Stock: 8 portions
  Minimum Stock: 10 portions
  Suggested Reorder: 50 portions
  Last Restocked: 3 days ago
  
  [View Inventory] [Reorder Now]
```

#### B. Dashboard Notifications
- Badge on inventory menu item (red dot)
- Notification panel in admin header
- Toast notification when admin logs in
- Low stock items highlighted in inventory table

#### C. Suggested Reorder Quantities
Based on:
- Sales velocity (average daily sales)
- Days until next restock (configurable)
- Maximum stock level
- Current stock level

**Formula:**
```typescript
const avgDailySales = totalSalesPast30Days / 30;
const daysUntilRestock = 7; // configurable
const suggestedReorder = (avgDailySales * daysUntilRestock) + minimumStock - currentStock;
```

---

### 6. Inventory Analytics

**Metrics to Track:**

#### A. Stock Turnover Rate
```typescript
// How many times stock is sold and replaced in a period
stockTurnoverRate = totalSalesQuantity / averageStock;

// Example: 
// Total sales in 30 days: 300 portions
// Average stock: 50 portions
// Turnover rate: 6 times per month
```

#### B. Waste Tracking
- Total waste quantity by item
- Waste cost (quantity × costPerUnit)
- Waste percentage (waste / total stock movements)
- Waste by reason (spoilage, damage, theft)
- Waste trends over time

#### C. Popular Items by Stock Movement
- Most sold items (highest deduction quantity)
- Fastest moving items (highest turnover rate)
- Slow-moving items (low turnover rate)
- Dead stock (no movement in X days)

#### D. Profit Margin Analysis
```typescript
// Per item profit margin
const revenue = sellingPrice × quantitySold;
const cost = costPerUnit × quantitySold;
const profit = revenue - cost;
const profitMargin = (profit / revenue) × 100;

// Example:
// Jollof Rice: ₦2,500 selling price, ₦900 cost
// Sold 100 portions
// Revenue: ₦250,000
// Cost: ₦90,000
// Profit: ₦160,000
// Margin: 64%
```

**Dashboard Widgets:**
- Top 10 most profitable items
- Top 10 highest turnover items
- Items with highest waste
- Items below minimum stock
- Stock value by category (food vs drinks)

---

## 🔧 Technical Implementation

### Database Schema Updates

#### Inventory Model (Existing - Update)
```typescript
interface IInventory {
  menuItemId: ObjectId; // 1:1 with MenuItem
  currentStock: number;
  minimumStock: number;
  maximumStock: number;
  unit: string; // 'portions', 'bottles', 'pieces', 'kg', 'liters'
  status: 'in-stock' | 'low-stock' | 'out-of-stock';
  lastRestocked?: Date;
  stockHistory: IStockHistory[]; // Array of all stock movements
  autoReorderEnabled: boolean;
  reorderQuantity: number;
  supplier?: string;
  costPerUnit: number;
  
  // NEW FIELDS:
  trackInventory: boolean; // Enable/disable tracking
  preventOrdersWhenOutOfStock: boolean; // Block orders if stock = 0
  salesVelocity?: number; // Average daily sales (calculated)
  lastSaleDate?: Date; // Last time item was sold
  totalSales?: number; // Lifetime sales quantity
  totalWaste?: number; // Lifetime waste quantity
  totalRestocked?: number; // Lifetime restocked quantity
}
```

#### MenuItem Model (Update)
```typescript
interface IMenuItem {
  // ... existing fields
  
  // NEW FIELDS:
  trackInventory: boolean; // Does this item have inventory tracking?
  inventoryId?: ObjectId; // Reference to Inventory record
}
```

#### Order Model (Update)
```typescript
interface IOrder {
  // ... existing fields
  
  // NEW FIELD:
  inventoryDeducted: boolean; // Has stock been deducted for this order?
  inventoryDeductedAt?: Date; // When was stock deducted?
}
```

---

### Server Actions

#### 1. Create Inventory When Creating Menu Item
```typescript
// app/actions/admin/menu-actions.ts
export async function createMenuItemWithInventoryAction(
  menuData: FormData,
  inventoryData?: {
    trackInventory: boolean;
    currentStock: number;
    minimumStock: number;
    maximumStock: number;
    unit: string;
    costPerUnit: number;
    supplier?: string;
  }
): Promise<ActionResult>
```

#### 2. Deduct Stock on Order Completion
```typescript
// app/actions/order/complete-order-action.ts
export async function completeOrderAndDeductStockAction(
  orderId: string
): Promise<ActionResult>
```

#### 3. Manual Stock Adjustments
```typescript
// app/actions/admin/inventory-actions.ts
export async function addStockAction(
  inventoryId: string,
  data: {
    quantity: number;
    reason: string;
    supplier?: string;
    costPerUnit?: number;
    invoiceNumber?: string;
  }
): Promise<ActionResult>

export async function deductStockAction(
  inventoryId: string,
  data: {
    quantity: number;
    reason: string;
    category: 'waste' | 'damage' | 'theft' | 'other';
    notes?: string;
  }
): Promise<ActionResult>

export async function adjustStockAction(
  inventoryId: string,
  data: {
    newStock: number;
    reason: string;
  }
): Promise<ActionResult>
```

---

### Services

#### InventoryService (New)
```typescript
// services/inventory-service.ts
class InventoryService {
  // Deduct stock for completed order
  static async deductStockForOrder(orderId: string): Promise<void>
  
  // Add stock (restocking)
  static async addStock(inventoryId: string, data: AddStockData): Promise<void>
  
  // Deduct stock (waste/damage)
  static async deductStock(inventoryId: string, data: DeductStockData): Promise<void>
  
  // Adjust stock (correction)
  static async adjustStock(inventoryId: string, newStock: number, reason: string): Promise<void>
  
  // Check if item is available for ordering
  static async isItemAvailable(menuItemId: string, quantity: number): Promise<boolean>
  
  // Get low stock items
  static async getLowStockItems(): Promise<IInventory[]>
  
  // Get out of stock items
  static async getOutOfStockItems(): Promise<IInventory[]>
  
  // Calculate sales velocity
  static async calculateSalesVelocity(inventoryId: string, days: number): Promise<number>
  
  // Get suggested reorder quantity
  static async getSuggestedReorderQuantity(inventoryId: string): Promise<number>
  
  // Get stock movement report
  static async getStockMovementReport(filters: ReportFilters): Promise<StockMovement[]>
  
  // Get inventory analytics
  static async getInventoryAnalytics(dateRange: DateRange): Promise<InventoryAnalytics>
}
```

---

### Integration Points

#### 1. Order Completion Hook
```typescript
// When order status changes to 'completed'
async function onOrderComplete(orderId: string) {
  // Deduct inventory
  await InventoryService.deductStockForOrder(orderId);
  
  // Check for low stock and send alerts
  const lowStockItems = await InventoryService.getLowStockItems();
  if (lowStockItems.length > 0) {
    await NotificationService.sendLowStockAlert(lowStockItems);
  }
  
  // Update order record
  await OrderModel.updateOne(
    { _id: orderId },
    { inventoryDeducted: true, inventoryDeductedAt: new Date() }
  );
}
```

#### 2. Order Validation (Optional)
```typescript
// Before allowing order to be placed
async function validateOrderItems(items: OrderItem[]) {
  for (const item of items) {
    const available = await InventoryService.isItemAvailable(
      item.menuItemId,
      item.quantity
    );
    
    if (!available) {
      throw new Error(`${item.name} is out of stock`);
    }
  }
}
```

---

## 📊 UI/UX Requirements

### 1. Menu Item Form (Update)
**Location:** `/app/dashboard/menu/new` and `/app/dashboard/menu/[id]`

**New Section: Inventory Tracking**
```
┌─────────────────────────────────────────┐
│ Inventory Tracking                      │
├─────────────────────────────────────────┤
│ ☑ Track inventory for this item        │
│                                         │
│ Initial Stock:     [50] [portions ▼]   │
│ Minimum Stock:     [10]                 │
│ Maximum Stock:     [100]                │
│ Cost Per Unit:     ₦ [900]              │
│ Supplier:          [ABC Suppliers]      │
│                                         │
│ ☑ Enable auto-reorder                  │
│ Reorder Quantity:  [50]                 │
│ ☐ Prevent orders when out of stock     │
└─────────────────────────────────────────┘
```

### 2. Inventory Detail Page (New)
**Location:** `/app/dashboard/inventory/[id]`

**Layout:**
```
┌─────────────────────────────────────────────────────────┐
│ Jollof Rice - Inventory Management                     │
├─────────────────────────────────────────────────────────┤
│ Current Stock: 47 portions                              │
│ Status: ⚠️ Low Stock                                    │
│ Last Restocked: 3 days ago                              │
│                                                         │
│ [Add Stock] [Deduct Stock] [Adjust Stock]              │
├─────────────────────────────────────────────────────────┤
│ Stock History                                           │
│ ┌─────────────────────────────────────────────────────┐│
│ │ Date       │ Type      │ Qty │ Reason    │ By      ││
│ ├───────────────────────────────────────────────────────┤│
│ │ Nov 16 3pm │ Deduction │ -2  │ Sale      │ System  ││
│ │ Nov 16 2pm │ Deduction │ -1  │ Sale      │ System  ││
│ │ Nov 15 9am │ Addition  │ +50 │ Restock   │ Admin   ││
│ │ Nov 14 5pm │ Deduction │ -3  │ Waste     │ Admin   ││
│ └─────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────┘
```

### 3. Inventory Analytics Dashboard (New)
**Location:** `/app/dashboard/inventory/analytics`

**Widgets:**
- Stock Turnover Rate (chart)
- Waste Analysis (pie chart)
- Profit Margin by Item (bar chart)
- Low Stock Alerts (list)
- Sales Velocity Trends (line chart)
- Top Performers (table)

---

## 🔐 Security & Permissions

**Authorization:**
- All inventory actions require `admin` or `super-admin` role
- Audit logging for all stock changes
- Optimistic locking to prevent concurrent update conflicts

**Validation:**
- Stock quantities must be non-negative
- Reasons are required for all manual adjustments
- Cost per unit must be positive

---

## 🧪 Testing Requirements

### Unit Tests
- InventoryService methods
- Stock calculation logic
- Sales velocity calculations
- Reorder quantity suggestions

### Integration Tests
- Order completion → stock deduction flow
- Low stock alert triggering
- Stock adjustment with audit logging

### E2E Tests
- Create menu item with inventory
- Complete order and verify stock deduction
- Manual stock adjustment
- View stock history

---

## 📈 Success Metrics

**Key Performance Indicators:**
- **Stock Accuracy:** >95% match between system and physical count
- **Stockout Prevention:** <5% of orders affected by stockouts
- **Waste Reduction:** Track and reduce waste by 20%
- **Admin Time Saved:** 80% reduction in manual inventory updates
- **Alert Response Time:** Admins restock within 24 hours of low stock alert

---

## 🚀 Implementation Phases

### Phase 1: Core Integration (Week 1)
- Add inventory fields to menu item form
- Implement automatic stock deduction on order completion
- Basic stock history tracking

### Phase 2: Manual Adjustments (Week 2)
- Build inventory detail page
- Implement add/deduct/adjust stock actions
- Stock history display

### Phase 3: Alerts & Notifications (Week 3)
- Low stock email alerts
- Dashboard notifications
- Suggested reorder quantities

### Phase 4: Analytics (Week 4)
- Stock turnover calculations
- Waste tracking
- Profit margin analysis
- Analytics dashboard

---

## 📝 Notes & Considerations

### Design Decisions

**Why optional inventory tracking?**
- Not all items need inventory tracking (e.g., made-to-order items)
- Flexibility for different business models
- Gradual adoption possible

**Why deduct on completion, not on order placement?**
- Orders can be cancelled before completion
- More accurate reflection of actual sales
- Prevents premature stock depletion

**Why track cost per unit?**
- Enables profit margin analysis
- Helps with pricing decisions
- Tracks inventory value

### Future Enhancements
- Multi-location inventory tracking
- Ingredient-level tracking (recipes)
- Predictive reordering with ML
- Integration with supplier systems
- Barcode/QR code scanning for stock counts
- Mobile app for inventory management

---

## 🔄 Changes Required to Existing Feature 4.2 Implementation

This section details all modifications needed to the already implemented Feature 4.2 files to support Feature 4.2.2.

### 📝 Summary of Changes

**Files to Modify:** 7 files  
**Files to Create:** 8 new files  
**Database Models to Update:** 3 models  
**New Server Actions:** 4 actions  
**New Services:** 1 service  

---

### 1. Database Models (3 files to modify)

#### A. `/models/menu-item-model.ts` - Add Inventory Tracking Fields

**Current Schema:**
```typescript
interface IMenuItem {
  name: string;
  description: string;
  mainCategory: 'food' | 'drinks';
  category: string;
  price: number;
  images: string[];
  isAvailable: boolean;
  preparationTime: number;
  tags: string[];
  allergens?: string[];
  customizations?: ICustomization[];
}
```

**Required Changes:**
```typescript
interface IMenuItem {
  // ... existing fields
  
  // NEW FIELDS FOR FEATURE 4.2.2:
  trackInventory: boolean; // Enable/disable inventory tracking for this item
  inventoryId?: mongoose.Types.ObjectId; // Reference to Inventory record
}
```

**Schema Update:**
```typescript
// Add to menuItemSchema
trackInventory: { 
  type: Boolean, 
  default: false 
},
inventoryId: { 
  type: Schema.Types.ObjectId, 
  ref: 'Inventory',
  required: false 
}
```

**Migration Notes:**
- Existing menu items will have `trackInventory: false` by default
- No breaking changes - backward compatible

---

#### B. `/models/inventory-model.ts` - Add Sales Integration Fields

**Current Schema:**
```typescript
interface IInventory {
  menuItemId: ObjectId;
  currentStock: number;
  minimumStock: number;
  maximumStock: number;
  unit: string;
  status: 'in-stock' | 'low-stock' | 'out-of-stock';
  lastRestocked?: Date;
  stockHistory: IStockHistory[];
  autoReorderEnabled: boolean;
  reorderQuantity: number;
  supplier?: string;
  costPerUnit: number;
}
```

**Required Changes:**
```typescript
interface IInventory {
  // ... existing fields
  
  // NEW FIELDS FOR FEATURE 4.2.2:
  preventOrdersWhenOutOfStock: boolean; // Block orders if stock = 0
  salesVelocity?: number; // Average daily sales (calculated)
  lastSaleDate?: Date; // Last time item was sold
  totalSales: number; // Lifetime sales quantity
  totalWaste: number; // Lifetime waste quantity
  totalRestocked: number; // Lifetime restocked quantity
}
```

**Schema Update:**
```typescript
// Add to inventorySchema
preventOrdersWhenOutOfStock: { 
  type: Boolean, 
  default: false 
},
salesVelocity: { 
  type: Number, 
  default: 0 
},
lastSaleDate: { 
  type: Date 
},
totalSales: { 
  type: Number, 
  default: 0 
},
totalWaste: { 
  type: Number, 
  default: 0 
},
totalRestocked: { 
  type: Number, 
  default: 0 
}
```

**Update IStockHistory Interface:**
```typescript
interface IStockHistory {
  quantity: number;
  type: 'addition' | 'deduction' | 'adjustment';
  reason: string;
  performedBy: ObjectId;
  timestamp: Date;
  
  // NEW FIELDS:
  category?: 'sale' | 'restock' | 'waste' | 'damage' | 'adjustment';
  orderId?: ObjectId; // Reference to order if type = 'deduction' from sale
  invoiceNumber?: string; // For restocking
  supplier?: string; // For restocking
  costPerUnit?: number; // For restocking
  totalCost?: number; // For restocking
  notes?: string; // Additional notes
  performedByName?: string; // Cache user name for reports
}
```

---

#### C. `/models/order-model.ts` - Add Inventory Deduction Tracking

**Current Schema:**
```typescript
interface IOrder {
  // ... existing order fields
}
```

**Required Changes:**
```typescript
interface IOrder {
  // ... existing fields
  
  // NEW FIELDS FOR FEATURE 4.2.2:
  inventoryDeducted: boolean; // Has stock been deducted?
  inventoryDeductedAt?: Date; // When was stock deducted?
  inventoryDeductedBy?: ObjectId; // Who triggered deduction (usually system)
}
```

**Schema Update:**
```typescript
// Add to orderSchema
inventoryDeducted: { 
  type: Boolean, 
  default: false 
},
inventoryDeductedAt: { 
  type: Date 
},
inventoryDeductedBy: { 
  type: Schema.Types.ObjectId, 
  ref: 'User' 
}
```

---

### 2. Server Actions (1 file to modify, 4 files to create)

#### A. `/app/actions/admin/menu-actions.ts` - Modify Existing Actions

**Current `createMenuItemAction`:**
```typescript
export async function createMenuItemAction(formData: FormData) {
  // ... existing validation
  
  const menuItem = await MenuItemModel.create({
    name,
    description,
    // ... other fields
  });
  
  // ... audit log
  return { success: true, menuItem };
}
```

**Required Changes:**
```typescript
export async function createMenuItemAction(
  formData: FormData,
  inventoryData?: {
    trackInventory: boolean;
    currentStock?: number;
    minimumStock?: number;
    maximumStock?: number;
    unit?: string;
    costPerUnit?: number;
    supplier?: string;
    autoReorderEnabled?: boolean;
    reorderQuantity?: number;
    preventOrdersWhenOutOfStock?: boolean;
  }
) {
  // ... existing validation
  
  const menuItem = await MenuItemModel.create({
    name,
    description,
    // ... other fields
    trackInventory: inventoryData?.trackInventory || false,
  });
  
  // NEW: Create inventory record if tracking is enabled
  if (inventoryData?.trackInventory && inventoryData.currentStock !== undefined) {
    const inventory = await InventoryModel.create({
      menuItemId: menuItem._id,
      currentStock: inventoryData.currentStock,
      minimumStock: inventoryData.minimumStock || 10,
      maximumStock: inventoryData.maximumStock || 100,
      unit: inventoryData.unit || 'units',
      costPerUnit: inventoryData.costPerUnit || 0,
      supplier: inventoryData.supplier,
      autoReorderEnabled: inventoryData.autoReorderEnabled || false,
      reorderQuantity: inventoryData.reorderQuantity || 0,
      preventOrdersWhenOutOfStock: inventoryData.preventOrdersWhenOutOfStock || false,
      totalSales: 0,
      totalWaste: 0,
      totalRestocked: inventoryData.currentStock, // Initial stock counts as restock
      stockHistory: [{
        quantity: inventoryData.currentStock,
        type: 'addition',
        reason: 'Initial stock',
        category: 'restock',
        performedBy: session.userId,
        performedByName: session.email,
        timestamp: new Date(),
      }],
    });
    
    // Link inventory to menu item
    menuItem.inventoryId = inventory._id;
    await menuItem.save();
  }
  
  // ... audit log
  return { success: true, menuItem };
}
```

---

#### B. `/app/actions/admin/inventory-actions.ts` - NEW FILE

Create new file with manual stock adjustment actions:

```typescript
'use server';

import { revalidatePath } from 'next/cache';
import { getSession } from '@/lib/session';
import { connectDB } from '@/lib/mongodb';
import InventoryModel from '@/models/inventory-model';
import MenuItemModel from '@/models/menu-item-model';
import AuditLogModel from '@/models/audit-log-model';

/**
 * Add stock (restocking)
 */
export async function addStockAction(
  inventoryId: string,
  data: {
    quantity: number;
    reason: string;
    supplier?: string;
    costPerUnit?: number;
    invoiceNumber?: string;
    notes?: string;
  }
) {
  // ... auth check
  // ... validation
  // ... add stock using inventory.addStock() method
  // ... update totalRestocked
  // ... create audit log
  // ... check if stock is now above minimum (clear alerts)
  // ... revalidate paths
}

/**
 * Deduct stock (waste/damage)
 */
export async function deductStockAction(
  inventoryId: string,
  data: {
    quantity: number;
    reason: string;
    category: 'waste' | 'damage' | 'theft' | 'other';
    notes?: string;
  }
) {
  // ... auth check
  // ... validation
  // ... deduct stock using inventory.deductStock() method
  // ... update totalWaste
  // ... create audit log
  // ... check for low stock alerts
  // ... revalidate paths
}

/**
 * Adjust stock (inventory count correction)
 */
export async function adjustStockAction(
  inventoryId: string,
  data: {
    newStock: number;
    reason: string;
  }
) {
  // ... auth check
  // ... validation
  // ... adjust stock using inventory.adjustStock() method
  // ... create audit log
  // ... revalidate paths
}
```

---

#### C. `/app/actions/order/complete-order-action.ts` - NEW FILE

Create new file for order completion with inventory deduction:

```typescript
'use server';

import { connectDB } from '@/lib/mongodb';
import OrderModel from '@/models/order-model';
import InventoryService from '@/services/inventory-service';

/**
 * Complete order and deduct inventory
 */
export async function completeOrderAndDeductStockAction(orderId: string) {
  await connectDB();
  
  // Get order
  const order = await OrderModel.findById(orderId);
  if (!order) {
    return { success: false, error: 'Order not found' };
  }
  
  // Update order status to completed
  order.status = 'completed';
  order.completedAt = new Date();
  
  // Deduct inventory if not already done
  if (!order.inventoryDeducted) {
    await InventoryService.deductStockForOrder(orderId);
    
    order.inventoryDeducted = true;
    order.inventoryDeductedAt = new Date();
    order.inventoryDeductedBy = 'system'; // or session.userId
  }
  
  await order.save();
  
  return { success: true };
}
```

---

### 3. Services (1 new file to create)

#### `/services/inventory-service.ts` - NEW FILE

Create comprehensive inventory service:

```typescript
import mongoose from 'mongoose';
import InventoryModel from '@/models/inventory-model';
import MenuItemModel from '@/models/menu-item-model';
import OrderModel from '@/models/order-model';
import { sendLowStockAlertEmail } from '@/lib/email';

class InventoryService {
  /**
   * Deduct stock for completed order
   */
  static async deductStockForOrder(orderId: string): Promise<void> {
    const order = await OrderModel.findById(orderId).populate('items.menuItemId');
    
    if (!order) {
      throw new Error('Order not found');
    }
    
    // Loop through order items
    for (const item of order.items) {
      const menuItem = await MenuItemModel.findById(item.menuItemId);
      
      // Skip if item doesn't track inventory
      if (!menuItem?.trackInventory || !menuItem.inventoryId) {
        continue;
      }
      
      // Get inventory record
      const inventory = await InventoryModel.findById(menuItem.inventoryId);
      
      if (!inventory) {
        continue;
      }
      
      // Deduct stock
      inventory.deductStock(
        item.quantity,
        'Sale',
        new mongoose.Types.ObjectId('system')
      );
      
      // Add order reference to stock history
      const lastHistory = inventory.stockHistory[inventory.stockHistory.length - 1];
      lastHistory.category = 'sale';
      lastHistory.orderId = order._id;
      
      // Update sales tracking
      inventory.totalSales += item.quantity;
      inventory.lastSaleDate = new Date();
      
      await inventory.save();
      
      // Check for low stock and send alerts
      if (inventory.status === 'low-stock' || inventory.status === 'out-of-stock') {
        await this.sendLowStockAlert(inventory);
      }
    }
  }
  
  /**
   * Check if item is available for ordering
   */
  static async isItemAvailable(
    menuItemId: string,
    quantity: number
  ): Promise<boolean> {
    const menuItem = await MenuItemModel.findById(menuItemId);
    
    // If not tracking inventory, always available
    if (!menuItem?.trackInventory || !menuItem.inventoryId) {
      return true;
    }
    
    const inventory = await InventoryModel.findById(menuItem.inventoryId);
    
    if (!inventory) {
      return true;
    }
    
    // If preventOrdersWhenOutOfStock is enabled, check stock
    if (inventory.preventOrdersWhenOutOfStock) {
      return inventory.currentStock >= quantity;
    }
    
    return true;
  }
  
  /**
   * Get low stock items
   */
  static async getLowStockItems() {
    return InventoryModel.find({ status: 'low-stock' })
      .populate('menuItemId', 'name mainCategory category');
  }
  
  /**
   * Calculate sales velocity (average daily sales)
   */
  static async calculateSalesVelocity(
    inventoryId: string,
    days: number = 30
  ): Promise<number> {
    const inventory = await InventoryModel.findById(inventoryId);
    
    if (!inventory) {
      return 0;
    }
    
    // Get sales from stock history in the last X days
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    
    const salesHistory = inventory.stockHistory.filter(
      (h) => h.category === 'sale' && h.timestamp >= cutoffDate
    );
    
    const totalSales = salesHistory.reduce((sum, h) => sum + Math.abs(h.quantity), 0);
    const velocity = totalSales / days;
    
    // Update cached velocity
    inventory.salesVelocity = velocity;
    await inventory.save();
    
    return velocity;
  }
  
  /**
   * Get suggested reorder quantity
   */
  static async getSuggestedReorderQuantity(inventoryId: string): Promise<number> {
    const inventory = await InventoryModel.findById(inventoryId);
    
    if (!inventory) {
      return 0;
    }
    
    // Calculate based on sales velocity
    const velocity = await this.calculateSalesVelocity(inventoryId);
    const daysUntilRestock = 7; // configurable
    
    const suggestedReorder = 
      (velocity * daysUntilRestock) + 
      inventory.minimumStock - 
      inventory.currentStock;
    
    return Math.max(0, Math.ceil(suggestedReorder));
  }
  
  /**
   * Send low stock alert
   */
  private static async sendLowStockAlert(inventory: any): Promise<void> {
    const menuItem = await MenuItemModel.findById(inventory.menuItemId);
    const suggestedReorder = await this.getSuggestedReorderQuantity(inventory._id);
    
    await sendLowStockAlertEmail({
      itemName: menuItem.name,
      currentStock: inventory.currentStock,
      minimumStock: inventory.minimumStock,
      unit: inventory.unit,
      suggestedReorder,
      lastRestocked: inventory.lastRestocked,
    });
  }
}

export default InventoryService;
```

---

### 4. Components (2 files to modify, 3 files to create)

#### A. `/components/features/admin/menu-item-form.tsx` - MODIFY

**Add Inventory Section to Form:**

```typescript
// Add state for inventory tracking
const [trackInventory, setTrackInventory] = useState(false);

// Add form fields
<div className="space-y-4">
  <h3 className="text-lg font-semibold">Inventory Tracking</h3>
  
  <div className="flex items-center space-x-2">
    <Switch
      checked={trackInventory}
      onCheckedChange={setTrackInventory}
    />
    <Label>Track inventory for this item</Label>
  </div>
  
  {trackInventory && (
    <div className="grid grid-cols-2 gap-4 pl-6">
      <div>
        <Label>Initial Stock</Label>
        <Input type="number" name="currentStock" />
      </div>
      
      <div>
        <Label>Unit</Label>
        <Select name="unit">
          <option value="portions">Portions</option>
          <option value="bottles">Bottles</option>
          <option value="pieces">Pieces</option>
          <option value="kg">Kilograms</option>
          <option value="liters">Liters</option>
        </Select>
      </div>
      
      <div>
        <Label>Minimum Stock</Label>
        <Input type="number" name="minimumStock" defaultValue="10" />
      </div>
      
      <div>
        <Label>Maximum Stock</Label>
        <Input type="number" name="maximumStock" defaultValue="100" />
      </div>
      
      <div>
        <Label>Cost Per Unit (₦)</Label>
        <Input type="number" name="costPerUnit" step="0.01" />
      </div>
      
      <div>
        <Label>Supplier</Label>
        <Input type="text" name="supplier" />
      </div>
      
      <div className="col-span-2">
        <div className="flex items-center space-x-2">
          <Switch name="preventOrdersWhenOutOfStock" />
          <Label>Prevent orders when out of stock</Label>
        </div>
      </div>
    </div>
  )}
</div>
```

---

#### B. `/components/features/admin/inventory-table.tsx` - MODIFY

**Add Action Column:**

```typescript
// Add actions column to table
<TableCell>
  <DropdownMenu>
    <DropdownMenuTrigger asChild>
      <Button variant="ghost" size="sm">
        <MoreHorizontal className="h-4 w-4" />
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent>
      <DropdownMenuItem onClick={() => router.push(`/dashboard/inventory/${item._id}`)}>
        <Package className="mr-2 h-4 w-4" />
        View Details
      </DropdownMenuItem>
      <DropdownMenuItem onClick={() => handleAddStock(item._id)}>
        <Plus className="mr-2 h-4 w-4" />
        Add Stock
      </DropdownMenuItem>
      <DropdownMenuItem onClick={() => handleDeductStock(item._id)}>
        <Minus className="mr-2 h-4 w-4" />
        Deduct Stock
      </DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
</TableCell>
```

---

#### C. `/components/features/admin/stock-adjustment-dialog.tsx` - NEW FILE

Create dialog for stock adjustments (add/deduct/adjust).

---

#### D. `/components/features/admin/stock-history-table.tsx` - NEW FILE

Create table component to display stock movement history.

---

#### E. `/components/features/admin/inventory-analytics.tsx` - NEW FILE

Create analytics dashboard component with charts.

---

### 5. Pages (1 file to create)

#### `/app/dashboard/inventory/[id]/page.tsx` - NEW FILE

Create inventory detail page:

```typescript
export default async function InventoryDetailPage({ params }: Props) {
  const inventory = await InventoryModel.findById(params.id)
    .populate('menuItemId');
  
  return (
    <div>
      <PageHeader
        title={`${inventory.menuItemId.name} - Inventory`}
        description="Manage stock levels and view history"
      />
      
      {/* Current Stock Stats */}
      <StockStatsCards inventory={inventory} />
      
      {/* Stock Adjustment Actions */}
      <StockAdjustmentActions inventoryId={params.id} />
      
      {/* Stock History Table */}
      <StockHistoryTable history={inventory.stockHistory} />
    </div>
  );
}
```

---

### 6. Integration with Order Processing

#### Modify Order Status Update Logic

**Location:** Wherever order status is updated to "completed"

**Add:**
```typescript
// When order status changes to 'completed'
if (newStatus === 'completed' && !order.inventoryDeducted) {
  await InventoryService.deductStockForOrder(order._id);
  order.inventoryDeducted = true;
  order.inventoryDeductedAt = new Date();
}
```

---

### 7. Email Notifications

#### Add to `/lib/email.ts`

```typescript
export async function sendLowStockAlertEmail(data: {
  itemName: string;
  currentStock: number;
  minimumStock: number;
  unit: string;
  suggestedReorder: number;
  lastRestocked?: Date;
}) {
  const mailOptions = {
    from: process.env.EMAIL_FROM,
    to: process.env.ADMIN_ALERT_EMAIL,
    subject: `Low Stock Alert: ${data.itemName}`,
    html: `
      <h2>Low Stock Alert</h2>
      <p><strong>Item:</strong> ${data.itemName}</p>
      <p><strong>Current Stock:</strong> ${data.currentStock} ${data.unit}</p>
      <p><strong>Minimum Stock:</strong> ${data.minimumStock} ${data.unit}</p>
      <p><strong>Suggested Reorder:</strong> ${data.suggestedReorder} ${data.unit}</p>
      ${data.lastRestocked ? `<p><strong>Last Restocked:</strong> ${data.lastRestocked.toLocaleDateString()}</p>` : ''}
      
      <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard/inventory">View Inventory</a>
    `,
  };
  
  await transporter.sendMail(mailOptions);
}
```

---

### 8. Environment Variables

#### Add to `.env.local`

```bash
# Admin Alerts
ADMIN_ALERT_EMAIL=admin@wawagardenbar.com
LOW_STOCK_ALERT_ENABLED=true
```

---

## 📋 Implementation Checklist

### Phase 1: Database & Core Integration
- [ ] Update MenuItem model with `trackInventory` and `inventoryId` fields
- [ ] Update Inventory model with sales tracking fields
- [ ] Update Order model with inventory deduction tracking
- [ ] Update IStockHistory interface with new fields
- [ ] Run database migration (if needed)
- [ ] Test model changes

### Phase 2: Menu Item Creation with Inventory
- [ ] Modify `createMenuItemAction` to accept inventory data
- [ ] Add inventory section to `MenuItemForm` component
- [ ] Test creating menu item with inventory
- [ ] Test creating menu item without inventory
- [ ] Verify inventory record is created and linked

### Phase 3: Automatic Stock Deduction
- [ ] Create `InventoryService` with `deductStockForOrder` method
- [ ] Create `completeOrderAndDeductStockAction`
- [ ] Integrate with order completion workflow
- [ ] Test stock deduction on order completion
- [ ] Verify stock history is created
- [ ] Test low stock alert triggering

### Phase 4: Manual Stock Adjustments
- [ ] Create `inventory-actions.ts` with add/deduct/adjust actions
- [ ] Create `StockAdjustmentDialog` component
- [ ] Create inventory detail page at `/dashboard/inventory/[id]`
- [ ] Create `StockHistoryTable` component
- [ ] Test all manual adjustment flows
- [ ] Verify audit logging

### Phase 5: Alerts & Notifications
- [ ] Implement `sendLowStockAlertEmail` function
- [ ] Add low stock alert logic to inventory service
- [ ] Create dashboard notification component
- [ ] Test email alerts
- [ ] Test dashboard notifications
- [ ] Implement suggested reorder calculations

### Phase 6: Analytics
- [ ] Implement sales velocity calculation
- [ ] Implement stock turnover calculation
- [ ] Create waste tracking reports
- [ ] Create profit margin analysis
- [ ] Build analytics dashboard page
- [ ] Add export functionality

### Phase 7: Testing & Documentation
- [ ] Write unit tests for InventoryService
- [ ] Write integration tests for stock deduction
- [ ] Write E2E tests for complete flow
- [ ] Update API documentation
- [ ] Create user guide for admins
- [ ] Update FEATURE-4.2.2-COMPLETE.md

---

## 🎯 Testing Scenarios

### Test Case 1: Create Menu Item with Inventory
1. Go to `/dashboard/menu/new`
2. Fill in menu item details
3. Toggle "Track Inventory" ON
4. Set initial stock: 50 portions
5. Set minimum: 10, maximum: 100
6. Set cost per unit: ₦900
7. Submit form
8. Verify menu item created
9. Verify inventory record created
10. Verify inventory linked to menu item

### Test Case 2: Automatic Stock Deduction
1. Create order with 2x Jollof Rice
2. Complete payment
3. Update order status to "completed"
4. Verify stock deducted by 2
5. Verify stock history entry created with order reference
6. Verify `totalSales` incremented by 2
7. Verify `lastSaleDate` updated

### Test Case 3: Low Stock Alert
1. Set item stock to 8 (below minimum of 10)
2. Verify status changes to "low-stock"
3. Verify email sent to admin
4. Verify dashboard notification appears
5. Verify suggested reorder quantity calculated

### Test Case 4: Manual Stock Adjustment
1. Go to `/dashboard/inventory/[id]`
2. Click "Add Stock"
3. Enter quantity: 50
4. Enter reason: "Weekly restock"
5. Enter supplier: "ABC Suppliers"
6. Submit
7. Verify stock increased by 50
8. Verify stock history entry created
9. Verify `totalRestocked` incremented

---

*Section added: November 17, 2025*  
*Comprehensive modification guide for Feature 4.2 implementation*
