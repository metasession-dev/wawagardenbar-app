# Half-Portion Feature Implementation Plan

## Overview

This document outlines the requirements and implementation plan for adding a **half-portion option** to food menu items in the Wawa Garden Bar application. This feature allows customers to order half portions of selected food items at half the price, with corresponding half inventory deduction.

---

## Business Requirements

### Functional Requirements

1. **Admin Configuration**
   - Admins can enable/disable half-portion option for individual food menu items
   - Only food category items (`mainCategory: 'food'`) can have half-portion enabled
   - Drinks category items should not have this option available
   - Configuration should be part of the menu item edit form

2. **Customer Experience**
   - When viewing a menu item with half-portion enabled, customers see a portion size selector
   - Two options: "Full Portion" (default) and "Half Portion"
   - Half portion displays at exactly 50% of the full price
   - Clear visual indication of portion size selection
   - Portion size selection appears before quantity selection

3. **Pricing**
   - Half portion = 50% of full menu item price
   - Price calculation: `halfPortionPrice = Math.round(fullPrice * 0.5)`
   - All fees (service fee, tax, delivery fee) calculated on the adjusted subtotal
   - Discounts and rewards apply to the adjusted price

4. **Inventory Management**
   - Half portion deducts 0.5 units from inventory
   - Full portion deducts 1.0 unit from inventory (existing behavior)
   - Inventory tracking respects fractional quantities
   - Stock availability checks consider fractional deductions
   - Low stock alerts factor in half-portion orders

5. **Order Processing**
   - Order items store portion size information
   - Kitchen/admin dashboard displays portion size clearly
   - Order receipts show portion size
   - Financial reports calculate profit margins correctly for half portions

---

## Technical Requirements

### 1. Database Schema Changes

#### Menu Item Interface & Model
**File:** `/interfaces/menu-item.interface.ts`

```typescript
export interface IMenuItem {
  // ... existing fields
  halfPortionEnabled: boolean;  // NEW: Enable half-portion option for this item
  halfPortionPrice?: number;    // NEW: Calculated field (price * 0.5)
}
```

**File:** `/models/menu-item-model.ts`

```typescript
const menuItemSchema = new Schema<IMenuItem>(
  {
    // ... existing fields
    halfPortionEnabled: { 
      type: Boolean, 
      default: false 
    },
  },
  // ... rest of schema
);

// Add virtual field for half portion price
menuItemSchema.virtual('halfPortionPrice').get(function() {
  return Math.round(this.price * 0.5);
});
```

#### Order Item Interface & Model
**File:** `/interfaces/order.interface.ts`

```typescript
export type PortionSize = 'full' | 'half';

export interface IOrderItem {
  menuItemId: Types.ObjectId;
  name: string;
  price: number;                    // Price per unit (adjusted for portion)
  quantity: number;                 // Number of portions ordered
  portionSize: PortionSize;         // NEW: 'full' or 'half'
  portionMultiplier: number;        // NEW: 1.0 for full, 0.5 for half
  customizations: {
    name: string;
    option: string;
    price: number;
  }[];
  specialInstructions?: string;
  subtotal: number;                 // price * quantity
  costPerUnit: number;
  totalCost: number;                // costPerUnit * quantity * portionMultiplier
  grossProfit: number;
  profitMargin: number;
}
```

**File:** `/models/order-model.ts`

```typescript
const orderItemSchema = new Schema<IOrderItem>(
  {
    // ... existing fields
    portionSize: {
      type: String,
      enum: ['full', 'half'],
      default: 'full',
    },
    portionMultiplier: {
      type: Number,
      default: 1.0,
      min: 0.5,
      max: 1.0,
    },
  },
  { _id: false }
);
```

#### Cart Store Interface
**File:** `/stores/cart-store.ts`

```typescript
export interface CartItem {
  id: string;
  name: string;
  price: number;                    // Adjusted price based on portion
  quantity: number;
  portionSize?: PortionSize;        // NEW: 'full' or 'half'
  portionMultiplier?: number;       // NEW: 1.0 or 0.5
  image?: string;
  category: string;
  specialInstructions?: string;
  preparationTime: number;
}
```

---

### 2. Frontend Components

#### A. Menu Item Detail Modal
**File:** `/components/features/menu/menu-item-detail-modal.tsx`

**Changes Required:**
1. Add portion size selector (Radio Group or Toggle)
2. Display adjusted price based on portion selection
3. Update total price calculation
4. Pass portion size to cart when adding item

**New State:**
```typescript
const [portionSize, setPortionSize] = useState<PortionSize>('full');
const [adjustedPrice, setAdjustedPrice] = useState(item.price);

// Update price when portion changes
useEffect(() => {
  if (item.halfPortionEnabled && portionSize === 'half') {
    setAdjustedPrice(Math.round(item.price * 0.5));
  } else {
    setAdjustedPrice(item.price);
  }
}, [portionSize, item.price, item.halfPortionEnabled]);
```

**UI Addition (before quantity selector):**
```tsx
{item.mainCategory === 'food' && item.halfPortionEnabled && (
  <div>
    <Label className="mb-2 block">Portion Size</Label>
    <RadioGroup value={portionSize} onValueChange={(value) => setPortionSize(value as PortionSize)}>
      <div className="flex items-center space-x-2">
        <RadioGroupItem value="full" id="full" />
        <Label htmlFor="full" className="font-normal">
          Full Portion - {formatPrice(item.price)}
        </Label>
      </div>
      <div className="flex items-center space-x-2">
        <RadioGroupItem value="half" id="half" />
        <Label htmlFor="half" className="font-normal">
          Half Portion - {formatPrice(Math.round(item.price * 0.5))}
        </Label>
      </div>
    </RadioGroup>
  </div>
)}
```

#### B. Cart Item Component
**File:** `/components/features/cart/cart-item.tsx`

**Changes Required:**
1. Display portion size badge if not full
2. Show adjusted price
3. Update item total calculation

**UI Addition:**
```tsx
<div>
  <h4 className="font-medium leading-tight">
    {item.name}
    {item.portionSize === 'half' && (
      <Badge variant="secondary" className="ml-2">Half Portion</Badge>
    )}
  </h4>
  <p className="text-sm text-muted-foreground">{item.category}</p>
</div>
```

#### C. Menu Item Card
**File:** `/components/features/menu/menu-item.tsx`

**Changes Required:**
1. Display badge if half-portion is available
2. Show "from" price if half-portion enabled

**UI Addition:**
```tsx
<Badge variant="outline" className="shrink-0">
  {item.halfPortionEnabled ? `from ${formatPrice(Math.round(item.price * 0.5))}` : formatPrice(item.price)}
</Badge>
```

---

### 3. Admin Dashboard Components

#### A. Menu Item Form
**File:** `/components/features/admin/menu-item-form.tsx`

**Changes Required:**
1. Add "Enable Half Portion" checkbox
2. Show only for food category items
3. Display calculated half-portion price (read-only)

**Form Schema Addition:**
```typescript
const formSchema = z.object({
  // ... existing fields
  halfPortionEnabled: z.boolean().default(false),
});
```

**UI Addition (in Availability Settings section):**
```tsx
{watchMainCategory === 'food' && (
  <div className="space-y-4 rounded-lg border p-4">
    <h3 className="font-semibold">Portion Options</h3>
    
    <FormField
      control={form.control}
      name="halfPortionEnabled"
      render={({ field }) => (
        <FormItem className="flex flex-row items-start space-x-3 space-y-0">
          <FormControl>
            <Checkbox
              checked={field.value}
              onCheckedChange={field.onChange}
            />
          </FormControl>
          <div className="space-y-1 leading-none">
            <FormLabel>Enable Half Portion</FormLabel>
            <FormDescription>
              Allow customers to order half portions at 50% price
            </FormDescription>
          </div>
        </FormItem>
      )}
    />
    
    {watchHalfPortionEnabled && (
      <div className="rounded-md bg-muted p-3">
        <p className="text-sm">
          <span className="font-medium">Half Portion Price:</span>{' '}
          {formatPrice(Math.round(watchPrice * 0.5))}
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          Automatically calculated as 50% of full price
        </p>
      </div>
    )}
  </div>
)}
```

#### B. Order Items Display
**File:** `/components/features/admin/order-items-table.tsx`

**Changes Required:**
1. Display portion size in item name column
2. Show adjusted price

**UI Update:**
```tsx
<TableCell>
  <div className="font-medium">{item.name}</div>
  {item.portionSize === 'half' && (
    <Badge variant="secondary" className="mt-1">Half Portion</Badge>
  )}
  {item.specialInstructions && (
    <p className="text-xs text-muted-foreground mt-1">
      Note: {item.specialInstructions}
    </p>
  )}
</TableCell>
```

---

### 4. Service Layer Updates

#### A. Inventory Service
**File:** `/services/inventory-service.ts`

**Method:** `deductStockForOrder`

**Changes Required:**
```typescript
static async deductStockForOrder(orderId: string): Promise<void> {
  const order = await OrderModel.findById(orderId);

  if (!order) {
    throw new Error('Order not found');
  }

  for (const item of order.items) {
    const menuItem = await MenuItemModel.findById(item.menuItemId);

    if (!menuItem?.trackInventory || !menuItem.inventoryId) {
      continue;
    }

    const inventory = await InventoryModel.findById(menuItem.inventoryId);

    if (!inventory) {
      continue;
    }

    // UPDATED: Calculate actual quantity to deduct based on portion multiplier
    const actualQuantity = item.quantity * (item.portionMultiplier || 1.0);

    // Deduct stock with fractional support
    inventory.currentStock = Math.max(0, inventory.currentStock - actualQuantity);

    // Add stock history entry with portion info
    inventory.stockHistory.push({
      quantity: -actualQuantity,
      type: 'deduction',
      reason: item.portionSize === 'half' 
        ? `Sale (Half Portion)` 
        : 'Sale',
      performedBy: new mongoose.Types.ObjectId('000000000000000000000000'),
      timestamp: new Date(),
      category: 'sale',
      orderId: order._id,
      performedByName: 'System',
      notes: item.portionSize === 'half' 
        ? `${item.quantity}x half portions (${actualQuantity} units deducted)` 
        : undefined,
    } as any);

    // Update status based on stock level
    if (inventory.currentStock <= 0) {
      inventory.status = 'out-of-stock';
    } else if (inventory.currentStock <= inventory.minimumStock) {
      inventory.status = 'low-stock';
    } else {
      inventory.status = 'in-stock';
    }

    // Update sales tracking with actual quantity
    inventory.totalSales += actualQuantity;
    inventory.lastSaleDate = new Date();

    await inventory.save();

    // Check for low stock and send alerts
    if (
      inventory.status === 'low-stock' ||
      inventory.status === 'out-of-stock'
    ) {
      await this.sendLowStockAlert(inventory);
    }
  }
}
```

**Method:** `restoreStockForOrder`

**Changes Required:**
```typescript
static async restoreStockForOrder(orderId: string): Promise<void> {
  const order = await OrderModel.findById(orderId);

  if (!order) {
    throw new Error('Order not found');
  }

  if (!order.inventoryDeducted) {
    return;
  }

  for (const item of order.items) {
    const menuItem = await MenuItemModel.findById(item.menuItemId);

    if (!menuItem?.trackInventory || !menuItem.inventoryId) {
      continue;
    }

    const inventory = await InventoryModel.findById(menuItem.inventoryId);

    if (!inventory) {
      continue;
    }

    // UPDATED: Calculate actual quantity to restore based on portion multiplier
    const actualQuantity = item.quantity * (item.portionMultiplier || 1.0);

    // Restore stock
    inventory.currentStock += actualQuantity;

    // Add stock history entry
    inventory.stockHistory.push({
      quantity: actualQuantity,
      type: 'addition',
      reason: 'Order Cancelled - Stock Restored',
      performedBy: new mongoose.Types.ObjectId('000000000000000000000000'),
      timestamp: new Date(),
      category: 'adjustment',
      orderId: order._id,
      performedByName: 'System',
      notes: item.portionSize === 'half' 
        ? `${item.quantity}x half portions (${actualQuantity} units restored)` 
        : undefined,
    } as any);

    // Update status
    if (inventory.currentStock > inventory.minimumStock) {
      inventory.status = 'in-stock';
    } else if (inventory.currentStock > 0) {
      inventory.status = 'low-stock';
    }

    // Update sales tracking
    inventory.totalSales = Math.max(0, inventory.totalSales - actualQuantity);

    await inventory.save();
  }
}
```

**Method:** `checkAvailability`

**Changes Required:**
```typescript
static async checkAvailability(
  menuItemId: string, 
  quantity: number,
  portionSize: PortionSize = 'full'
): Promise<{ available: boolean; message?: string }> {
  const menuItem = await MenuItemModel.findById(menuItemId);

  if (!menuItem) {
    return { available: false, message: 'Menu item not found' };
  }

  if (!menuItem.isAvailable) {
    return { available: false, message: 'This item is currently unavailable' };
  }

  if (!menuItem.trackInventory || !menuItem.inventoryId) {
    return { available: true };
  }

  const inventory = await InventoryModel.findById(menuItem.inventoryId);

  if (!inventory) {
    return { available: true };
  }

  // UPDATED: Calculate actual quantity needed based on portion
  const portionMultiplier = portionSize === 'half' ? 0.5 : 1.0;
  const actualQuantityNeeded = quantity * portionMultiplier;

  if (inventory.preventOrdersWhenOutOfStock && inventory.currentStock < actualQuantityNeeded) {
    return { 
      available: false, 
      message: `Only ${inventory.currentStock} ${inventory.unit} available. You need ${actualQuantityNeeded} ${inventory.unit}.` 
    };
  }

  return { available: true };
}
```

#### B. Order Service
**File:** `/services/order-service.ts`

**Method:** `createOrder`

**Changes Required:**
Ensure order items include `portionSize` and `portionMultiplier` fields when creating orders from cart items.

```typescript
const orderItems: IOrderItem[] = items.map((item) => {
  const portionMultiplier = item.portionSize === 'half' ? 0.5 : 1.0;
  const adjustedPrice = item.portionSize === 'half' 
    ? Math.round(menuItemsMap.get(item.id)?.price * 0.5) 
    : menuItemsMap.get(item.id)?.price;

  return {
    menuItemId: new mongoose.Types.ObjectId(item.id),
    name: item.name,
    price: adjustedPrice,
    quantity: item.quantity,
    portionSize: item.portionSize || 'full',
    portionMultiplier: portionMultiplier,
    customizations: [],
    specialInstructions: item.specialInstructions,
    subtotal: adjustedPrice * item.quantity,
    costPerUnit: menuItemsMap.get(item.id)?.costPerUnit || 0,
    totalCost: (menuItemsMap.get(item.id)?.costPerUnit || 0) * item.quantity * portionMultiplier,
    grossProfit: 0, // Calculate later
    profitMargin: 0, // Calculate later
  };
});
```

---

### 5. Cart Store Updates

**File:** `/stores/cart-store.ts`

**Changes Required:**

```typescript
interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  portionSize?: PortionSize;
  portionMultiplier?: number;
  image?: string;
  category: string;
  specialInstructions?: string;
  preparationTime: number;
}

interface CartStore {
  items: CartItem[];
  isOpen: boolean;
  addItem: (item: Omit<CartItem, 'quantity'> & { quantity?: number }) => void;
  updateQuantity: (itemId: string, quantity: number) => void;
  updatePortionSize: (itemId: string, portionSize: PortionSize, adjustedPrice: number) => void; // NEW
  removeItem: (itemId: string) => void;
  updateInstructions: (itemId: string, instructions: string) => void;
  clearCart: () => void;
  openCart: () => void;
  closeCart: () => void;
  getTotal: () => number;
  getItemCount: () => number;
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      isOpen: false,

      addItem: (item) => {
        const items = get().items;
        const existingItemIndex = items.findIndex(
          (i) => i.id === item.id && 
                 i.portionSize === (item.portionSize || 'full') &&
                 i.specialInstructions === item.specialInstructions
        );

        if (existingItemIndex > -1) {
          const newItems = [...items];
          newItems[existingItemIndex].quantity += item.quantity || 1;
          set({ items: newItems });
        } else {
          set({
            items: [
              ...items,
              {
                ...item,
                quantity: item.quantity || 1,
                portionSize: item.portionSize || 'full',
                portionMultiplier: item.portionSize === 'half' ? 0.5 : 1.0,
              },
            ],
          });
        }
      },

      updatePortionSize: (itemId, portionSize, adjustedPrice) => {
        set({
          items: get().items.map((item) =>
            item.id === itemId
              ? {
                  ...item,
                  portionSize,
                  portionMultiplier: portionSize === 'half' ? 0.5 : 1.0,
                  price: adjustedPrice,
                }
              : item
          ),
        });
      },

      // ... rest of methods
    }),
    {
      name: 'cart-storage',
    }
  )
);
```

---

### 6. Validation & Server Actions

#### A. Cart Validation
**File:** `/app/actions/cart/cart-actions.ts`

**Update:** `validateCartItem`

```typescript
export async function validateCartItem(
  menuItemId: string,
  quantity: number,
  portionSize: PortionSize = 'full'
): Promise<{ success: boolean; message?: string }> {
  try {
    await connectDB();

    const menuItem = await MenuItemModel.findById(menuItemId);

    if (!menuItem) {
      return { success: false, message: 'Menu item not found' };
    }

    if (!menuItem.isAvailable) {
      return { success: false, message: 'This item is currently unavailable' };
    }

    // Validate half-portion is enabled if requested
    if (portionSize === 'half' && !menuItem.halfPortionEnabled) {
      return { success: false, message: 'Half portion is not available for this item' };
    }

    // Check inventory availability with portion size
    const availability = await InventoryService.checkAvailability(
      menuItemId,
      quantity,
      portionSize
    );

    if (!availability.available) {
      return { success: false, message: availability.message };
    }

    return { success: true };
  } catch (error) {
    console.error('Error validating cart item:', error);
    return { success: false, message: 'Failed to validate item' };
  }
}
```

---

### 7. Migration Script

**File:** `/scripts/add-half-portion-field.ts`

```typescript
import { config } from 'dotenv';
import { resolve } from 'path';

const envPath = resolve(process.cwd(), '.env.local');
config({ path: envPath });

import { connectDB } from '@/lib/mongodb';
import MenuItemModel from '@/models/menu-item-model';

async function addHalfPortionField() {
  try {
    console.log('🔧 Connecting to database...');
    await connectDB();

    console.log('📝 Adding halfPortionEnabled field to menu items...');

    const result = await MenuItemModel.updateMany(
      { halfPortionEnabled: { $exists: false } },
      { $set: { halfPortionEnabled: false } }
    );

    console.log(`✅ Updated ${result.modifiedCount} menu items`);

    console.log('\n✨ Migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

addHalfPortionField();
```

**Add to package.json:**
```json
{
  "scripts": {
    "migrate:half-portion": "tsx scripts/add-half-portion-field.ts"
  }
}
```

---

## Implementation Phases

### Phase 1: Database & Backend (Week 1)
- [ ] Update interfaces for menu items and order items
- [ ] Update Mongoose models with new fields
- [ ] Run migration script to add `halfPortionEnabled` field
- [ ] Update InventoryService methods for fractional quantities
- [ ] Update OrderService to handle portion size
- [ ] Update cart validation actions

### Phase 2: Admin Dashboard (Week 1-2)
- [ ] Update menu item form with half-portion toggle
- [ ] Add half-portion price display (calculated)
- [ ] Update menu items table to show half-portion status
- [ ] Update order items display to show portion size
- [ ] Test admin workflows

### Phase 3: Customer Frontend (Week 2)
- [ ] Update MenuItemDetailModal with portion selector
- [ ] Update cart store with portion size support
- [ ] Update CartItem component to display portion
- [ ] Update MenuItem card to show "from" price
- [ ] Update checkout flow to preserve portion info

### Phase 4: Testing & QA (Week 3)
- [ ] Unit tests for inventory calculations
- [ ] Integration tests for order flow
- [ ] E2E tests for customer journey
- [ ] Test edge cases (stock availability, cancellations)
- [ ] Performance testing with fractional inventory

### Phase 5: Documentation & Deployment (Week 3)
- [ ] Update API documentation
- [ ] Create user guide for admins
- [ ] Update customer help documentation
- [ ] Deploy to staging
- [ ] User acceptance testing
- [ ] Deploy to production

---

## Edge Cases & Considerations

### 1. Inventory Management
- **Fractional Stock:** Ensure inventory system handles decimal quantities (0.5, 1.5, etc.)
- **Low Stock Alerts:** Alert thresholds should consider half-portions
- **Reordering:** Auto-reorder calculations should account for fractional sales velocity

### 2. Pricing
- **Rounding:** Always round half-price to nearest whole number to avoid ₦0.50 amounts
- **Customizations:** Customization prices remain full price regardless of portion size
- **Discounts:** Percentage discounts apply to adjusted price

### 3. Kitchen Operations
- **Display:** Kitchen display should clearly show "HALF PORTION" in large text
- **Preparation:** Staff training required for portion sizing
- **Quality Control:** Ensure consistent half-portion sizes

### 4. Financial Reporting
- **Profit Margins:** Calculate correctly using `portionMultiplier` for COGS
- **Revenue Reports:** Track full vs half portion sales separately
- **Analytics:** Dashboard metrics should differentiate portion types

### 5. User Experience
- **Default Selection:** Full portion should always be default
- **Mobile View:** Portion selector should be touch-friendly
- **Accessibility:** Screen readers should announce portion selection
- **Visual Clarity:** Use icons (🍽️ full, ½ half) for quick recognition

---

## Testing Checklist

### Unit Tests
- [ ] Half-portion price calculation
- [ ] Inventory deduction with portion multiplier
- [ ] Order total calculation with mixed portions
- [ ] Stock availability check with half portions

### Integration Tests
- [ ] Add half-portion item to cart
- [ ] Checkout with mixed full/half portions
- [ ] Inventory deduction on order completion
- [ ] Stock restoration on order cancellation

### E2E Tests
- [ ] Customer selects half portion and completes order
- [ ] Admin enables half-portion for food item
- [ ] Kitchen receives order with half-portion notation
- [ ] Financial report shows correct profit for half portions

### Edge Case Tests
- [ ] Order 0.5 units when only 0.3 units in stock
- [ ] Cancel order with half portions (restore inventory)
- [ ] Apply discount to half-portion item
- [ ] Multiple half portions in single order

---

## Success Metrics

### Business Metrics
- **Adoption Rate:** % of orders containing half portions
- **Revenue Impact:** Change in average order value
- **Customer Satisfaction:** Feedback on portion flexibility
- **Waste Reduction:** Decrease in food waste

### Technical Metrics
- **Performance:** No degradation in order processing time
- **Accuracy:** 100% accuracy in inventory deduction
- **Error Rate:** < 0.1% errors in half-portion orders

---

## Rollout Strategy

### Soft Launch (Week 1)
- Enable for 5-10 popular food items
- Monitor closely for issues
- Gather customer feedback

### Gradual Expansion (Week 2-3)
- Enable for all applicable food items
- Train kitchen staff
- Update marketing materials

### Full Launch (Week 4)
- Announce feature to all customers
- Monitor analytics dashboard
- Iterate based on feedback

---

## Support & Maintenance

### Admin Training
- How to enable half-portion for items
- Understanding inventory impact
- Reading reports with portion data

### Customer Support
- FAQ: What is half portion?
- FAQ: Which items offer half portions?
- FAQ: Can I mix full and half portions?

### Monitoring
- Daily inventory accuracy checks
- Weekly portion sales analysis
- Monthly customer feedback review

---

## Future Enhancements

### Phase 2 Features (Future)
- **Custom Portion Sizes:** 1/4, 1/3, 2/3 portions
- **Portion Combos:** Mix different portion sizes in meal deals
- **Smart Suggestions:** Recommend half portions based on order history
- **Portion Presets:** Save favorite portion preferences

---

## Conclusion

This implementation plan provides a comprehensive roadmap for adding half-portion functionality to the Wawa Garden Bar application. The feature enhances customer flexibility, reduces food waste, and maintains accurate inventory tracking while ensuring seamless integration with existing systems.

**Estimated Timeline:** 3-4 weeks
**Estimated Effort:** 60-80 developer hours
**Risk Level:** Low-Medium (well-defined requirements, clear implementation path)
