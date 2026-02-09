# Manual Price Override Feature

## Overview

This feature allows staff members to manually override the price of menu items when creating orders. This is useful for:
- Special discounts or promotions
- Price adjustments for loyal customers
- Correcting pricing errors
- Handling special circumstances (e.g., damaged items, partial portions)
- Testing or demo purposes

## Feature Requirements

### 1. Menu Item Configuration

**Toggle Field: `allowManualPriceOverride`**
- Location: Menu Item Edit/Create Form
- Type: Boolean toggle switch
- Default: `false` (disabled)
- Permissions: Admin and Super-Admin only
- Applies to: Both new and existing menu items

**UI Placement:**
- Add to the "Pricing & Availability" section of the menu item form
- Position: After the price field, before portion options
- Label: "Allow Manual Price Override"
- Description: "Enable staff to enter custom prices for this item when creating orders"

### 2. Order Creation Flow (Staff/Admin)

**Price Override UI:**
- Only visible when:
  - User has admin/super-admin role
  - Menu item has `allowManualPriceOverride = true`
  - Creating a new order (not applicable to customer self-checkout)

**Override Interface:**
- Display original price prominently
- Provide input field for custom price
- Show price difference (increase/decrease)
- Require confirmation for significant price changes (>50% deviation)
- Validate minimum price (cannot be negative)
- Optional: Add reason/note field for audit trail

### 3. Order Item Data Structure

**New Fields in `IOrderItem`:**
```typescript
{
  price: number;                    // Actual price used (original or overridden)
  originalPrice?: number;           // Original menu item price (if overridden)
  priceOverridden: boolean;         // Flag indicating if price was manually set
  priceOverrideReason?: string;     // Optional reason for override
  priceOverriddenBy?: Types.ObjectId; // Admin who overrode the price
  priceOverriddenAt?: Date;         // Timestamp of override
}
```

### 4. Display & Reporting

**Order Details Display:**
- Show both original and overridden prices
- Visual indicator (badge/icon) for overridden items
- Display override reason if provided
- Show who performed the override and when

**Kitchen Display:**
- No changes needed (kitchen doesn't need to see pricing)
- Continue showing item name, quantity, customizations

**Financial Reports:**
- Track overridden prices separately
- Show revenue impact of overrides
- Include override statistics (count, total discount/markup)
- Filter/sort by overridden items

### 5. Audit & Security

**Audit Logging:**
- Log all price override actions
- Include: admin user, menu item, original price, new price, reason, timestamp
- Action type: `order.price_override`

**Permissions:**
- Only admin and super-admin roles can override prices
- Customer checkout flow never shows override option
- API validation to prevent unauthorized overrides

**Validation Rules:**
- Price cannot be negative
- Price must be a valid number
- Optional: Set maximum discount percentage (configurable)
- Optional: Require approval for overrides above threshold

## Implementation Plan

### Phase 1: Database Schema Updates

#### 1.1 Update Menu Item Interface & Model
**File:** `/interfaces/menu-item.interface.ts`
```typescript
export interface IMenuItem {
  // ... existing fields
  allowManualPriceOverride: boolean;
}
```

**File:** `/models/menu-item-model.ts`
```typescript
const menuItemSchema = new Schema<IMenuItem>({
  // ... existing fields
  allowManualPriceOverride: { type: Boolean, default: false },
});
```

#### 1.2 Update Order Item Interface & Model
**File:** `/interfaces/order.interface.ts`
```typescript
export interface IOrderItem {
  // ... existing fields
  originalPrice?: number;
  priceOverridden: boolean;
  priceOverrideReason?: string;
  priceOverriddenBy?: Types.ObjectId;
  priceOverriddenAt?: Date;
}
```

**File:** `/models/order-model.ts`
```typescript
const orderItemSchema = new Schema({
  // ... existing fields
  originalPrice: { type: Number, required: false },
  priceOverridden: { type: Boolean, default: false },
  priceOverrideReason: { type: String, required: false },
  priceOverriddenBy: { type: Schema.Types.ObjectId, ref: 'User', required: false },
  priceOverriddenAt: { type: Date, required: false },
});
```

#### 1.3 Add Audit Log Action Type
**File:** `/interfaces/audit-log.interface.ts`
```typescript
export type AuditAction = 
  // ... existing actions
  | 'order.price_override';
```

### Phase 2: Admin UI - Menu Item Form

#### 2.1 Update Menu Item Create Form
**File:** `/components/features/admin/menu-item-form.tsx`

**Changes:**
1. Add `allowManualPriceOverride` to schema:
```typescript
const menuItemSchema = z.object({
  // ... existing fields
  allowManualPriceOverride: z.boolean(),
});
```

2. Add to default values:
```typescript
defaultValues: {
  // ... existing defaults
  allowManualPriceOverride: false,
}
```

3. Add UI component in the form (after price field):
```typescript
<div className="space-y-2">
  <div className="flex items-center justify-between">
    <div className="space-y-0.5">
      <Label htmlFor="allowManualPriceOverride">Allow Manual Price Override</Label>
      <p className="text-sm text-muted-foreground">
        Enable staff to enter custom prices for this item when creating orders
      </p>
    </div>
    <Switch
      id="allowManualPriceOverride"
      checked={watch('allowManualPriceOverride')}
      onCheckedChange={(checked) => setValue('allowManualPriceOverride', checked)}
    />
  </div>
</div>
```

4. Update form submission to include the field:
```typescript
formData.append('allowManualPriceOverride', data.allowManualPriceOverride.toString());
```

#### 2.2 Update Menu Item Edit Form
**File:** `/components/features/admin/menu-item-edit-form.tsx`

Apply same changes as 2.1 above, plus:
- Add to default values from existing menu item:
```typescript
defaultValues: {
  // ... existing defaults
  allowManualPriceOverride: menuItem.allowManualPriceOverride || false,
}
```

#### 2.3 Update Menu Actions
**File:** `/app/actions/admin/menu-actions.ts`

**In `createMenuItemAction`:**
```typescript
const allowManualPriceOverride = formData.get('allowManualPriceOverride') === 'true';

const menuItem = await MenuItemModel.create({
  // ... existing fields
  allowManualPriceOverride,
});
```

**In `updateMenuItemAction`:**
```typescript
const allowManualPriceOverride = formData.get('allowManualPriceOverride') === 'true';
menuItem.allowManualPriceOverride = allowManualPriceOverride;
```

### Phase 3: Cart Store - Price Override Support

#### 3.1 Update Cart Item Interface
**File:** `/stores/cart-store.ts`

**Add to CartItem interface:**
```typescript
interface CartItem {
  // ... existing fields
  originalPrice?: number;
  priceOverridden: boolean;
  priceOverrideReason?: string;
  customPrice?: number;
}
```

**Add action to override price:**
```typescript
overrideItemPrice: (cartItemId: string, newPrice: number, reason?: string) => {
  set((state) => ({
    items: state.items.map((item) =>
      item.cartItemId === cartItemId
        ? {
            ...item,
            originalPrice: item.originalPrice || item.price,
            price: newPrice,
            priceOverridden: true,
            priceOverrideReason: reason,
            customPrice: newPrice,
          }
        : item
    ),
  }));
},

resetItemPrice: (cartItemId: string) => {
  set((state) => ({
    items: state.items.map((item) =>
      item.cartItemId === cartItemId && item.originalPrice
        ? {
            ...item,
            price: item.originalPrice,
            priceOverridden: false,
            priceOverrideReason: undefined,
            customPrice: undefined,
            originalPrice: undefined,
          }
        : item
    ),
  }));
},
```

### Phase 4: UI Components - Price Override

#### 4.1 Create Price Override Dialog Component
**File:** `/components/features/admin/price-override-dialog.tsx`

```typescript
'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { DollarSign, AlertTriangle } from 'lucide-react';

const priceOverrideSchema = z.object({
  newPrice: z.number().min(0, 'Price cannot be negative'),
  reason: z.string().optional(),
});

type PriceOverrideFormData = z.infer<typeof priceOverrideSchema>;

interface PriceOverrideDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  itemName: string;
  originalPrice: number;
  currentPrice: number;
  onConfirm: (newPrice: number, reason?: string) => void;
}

export function PriceOverrideDialog({
  open,
  onOpenChange,
  itemName,
  originalPrice,
  currentPrice,
  onConfirm,
}: PriceOverrideDialogProps) {
  const [showWarning, setShowWarning] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    reset,
  } = useForm<PriceOverrideFormData>({
    resolver: zodResolver(priceOverrideSchema),
    defaultValues: {
      newPrice: currentPrice,
      reason: '',
    },
  });

  const newPrice = watch('newPrice');
  const priceDifference = newPrice - originalPrice;
  const percentageChange = ((priceDifference / originalPrice) * 100).toFixed(1);
  const isSignificantChange = Math.abs(parseFloat(percentageChange)) > 50;

  const onSubmit = (data: PriceOverrideFormData) => {
    if (isSignificantChange && !showWarning) {
      setShowWarning(true);
      return;
    }

    onConfirm(data.newPrice, data.reason);
    reset();
    setShowWarning(false);
    onOpenChange(false);
  };

  const handleCancel = () => {
    reset();
    setShowWarning(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Override Price</DialogTitle>
          <DialogDescription>
            Set a custom price for <strong>{itemName}</strong>
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Original Price Display */}
          <div className="bg-muted p-3 rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Original Price:</span>
              <span className="font-semibold">₦{originalPrice.toLocaleString()}</span>
            </div>
          </div>

          {/* New Price Input */}
          <div className="space-y-2">
            <Label htmlFor="newPrice">New Price (₦)</Label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="newPrice"
                type="number"
                step="0.01"
                className="pl-9"
                {...register('newPrice', { valueAsNumber: true })}
              />
            </div>
            {errors.newPrice && (
              <p className="text-sm text-destructive">{errors.newPrice.message}</p>
            )}
          </div>

          {/* Price Difference Display */}
          {newPrice !== originalPrice && (
            <div className={`p-3 rounded-lg ${
              priceDifference > 0 ? 'bg-orange-50 border border-orange-200' : 'bg-green-50 border border-green-200'
            }`}>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">
                  {priceDifference > 0 ? 'Markup' : 'Discount'}:
                </span>
                <span className={`font-semibold ${
                  priceDifference > 0 ? 'text-orange-700' : 'text-green-700'
                }`}>
                  {priceDifference > 0 ? '+' : ''}₦{priceDifference.toLocaleString()} ({percentageChange}%)
                </span>
              </div>
            </div>
          )}

          {/* Warning for significant changes */}
          {isSignificantChange && showWarning && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                This is a significant price change ({percentageChange}%). Please confirm this is intentional.
              </AlertDescription>
            </Alert>
          )}

          {/* Reason Input */}
          <div className="space-y-2">
            <Label htmlFor="reason">Reason (Optional)</Label>
            <Textarea
              id="reason"
              placeholder="e.g., Special discount for loyal customer, damaged item, promotion..."
              rows={3}
              {...register('reason')}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleCancel}>
              Cancel
            </Button>
            <Button type="submit">
              {showWarning ? 'Confirm Override' : 'Apply Override'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
```

#### 4.2 Update Cart Sidebar Component
**File:** `/components/features/cart/cart-sidebar.tsx`

**Add price override button for admin users:**
```typescript
import { useAuth } from '@/hooks/use-auth';
import { PriceOverrideDialog } from '@/components/features/admin/price-override-dialog';
import { DollarSign } from 'lucide-react';

// Inside component:
const { user } = useAuth();
const isAdmin = user?.role === 'admin' || user?.role === 'super-admin';
const [overrideDialogOpen, setOverrideDialogOpen] = useState(false);
const [selectedItem, setSelectedItem] = useState<CartItem | null>(null);

// For each cart item, add override button if admin and item allows override:
{isAdmin && item.allowManualPriceOverride && (
  <Button
    variant="ghost"
    size="sm"
    onClick={() => {
      setSelectedItem(item);
      setOverrideDialogOpen(true);
    }}
  >
    <DollarSign className="h-4 w-4 mr-1" />
    {item.priceOverridden ? 'Edit Price' : 'Override Price'}
  </Button>
)}

// Add dialog:
<PriceOverrideDialog
  open={overrideDialogOpen}
  onOpenChange={setOverrideDialogOpen}
  itemName={selectedItem?.name || ''}
  originalPrice={selectedItem?.originalPrice || selectedItem?.price || 0}
  currentPrice={selectedItem?.price || 0}
  onConfirm={(newPrice, reason) => {
    if (selectedItem) {
      overrideItemPrice(selectedItem.cartItemId, newPrice, reason);
    }
  }}
/>
```

#### 4.3 Update Order Summary Component
**File:** `/components/features/checkout/order-summary.tsx`

**Add visual indicator for overridden prices:**
```typescript
{item.priceOverridden && (
  <div className="flex items-center gap-1 text-xs text-orange-600">
    <DollarSign className="h-3 w-3" />
    <span>Price Overridden</span>
    {item.originalPrice && (
      <span className="line-through text-muted-foreground">
        ₦{item.originalPrice.toLocaleString()}
      </span>
    )}
  </div>
)}
```

### Phase 5: Order Creation - Backend Integration

#### 5.1 Update Order Creation Action
**File:** `/app/actions/payment/payment-actions.ts` or `/app/actions/order/order-actions.ts`

**In `createOrder` function:**
```typescript
// Validate price overrides (admin only)
if (session.role !== 'admin' && session.role !== 'super-admin') {
  // Ensure no items have price overrides from non-admin users
  const hasOverrides = orderData.items.some(item => item.priceOverridden);
  if (hasOverrides) {
    return { success: false, error: 'Unauthorized price override attempt' };
  }
}

// Enrich items with override metadata
const enrichedItems = orderData.items.map(item => ({
  ...item,
  priceOverriddenBy: item.priceOverridden ? new Types.ObjectId(session.userId) : undefined,
  priceOverriddenAt: item.priceOverridden ? new Date() : undefined,
}));

// Create audit logs for overridden items
for (const item of enrichedItems) {
  if (item.priceOverridden) {
    await AuditLogService.createLog({
      userId: session.userId,
      userEmail: session.email || '',
      userRole: session.role,
      action: 'order.price_override',
      resource: 'order-item',
      resourceId: item.menuItemId.toString(),
      details: {
        itemName: item.name,
        originalPrice: item.originalPrice,
        newPrice: item.price,
        difference: item.price - (item.originalPrice || 0),
        reason: item.priceOverrideReason,
      },
    });
  }
}
```

### Phase 6: Display & Reporting

#### 6.1 Update Order Details Page
**File:** `/app/dashboard/orders/[orderId]/page.tsx`

**Add override indicator in order items list:**
```typescript
{item.priceOverridden && (
  <div className="mt-2 p-2 bg-orange-50 border border-orange-200 rounded text-sm">
    <div className="flex items-center gap-2 text-orange-700 font-medium">
      <DollarSign className="h-4 w-4" />
      <span>Price Overridden</span>
    </div>
    <div className="mt-1 space-y-1 text-xs text-muted-foreground">
      <div>Original: ₦{item.originalPrice?.toLocaleString()}</div>
      <div>Override: ₦{item.price.toLocaleString()}</div>
      <div>Difference: {item.price > (item.originalPrice || 0) ? '+' : ''}₦{(item.price - (item.originalPrice || 0)).toLocaleString()}</div>
      {item.priceOverrideReason && (
        <div>Reason: {item.priceOverrideReason}</div>
      )}
      {item.priceOverriddenAt && (
        <div>
          Overridden: {new Date(item.priceOverriddenAt).toLocaleString()}
        </div>
      )}
    </div>
  </div>
)}
```

#### 6.2 Update Financial Reports
**File:** `/services/financial-report-service.ts`

**Add price override tracking:**
```typescript
// In generateDailySummary or similar methods:
const priceOverrideStats = await Order.aggregate([
  { $match: dateQuery },
  { $unwind: '$items' },
  { $match: { 'items.priceOverridden': true } },
  {
    $group: {
      _id: null,
      totalOverrides: { $sum: 1 },
      totalDiscount: {
        $sum: {
          $subtract: ['$items.originalPrice', '$items.price']
        }
      },
      totalMarkup: {
        $sum: {
          $cond: [
            { $gt: ['$items.price', '$items.originalPrice'] },
            { $subtract: ['$items.price', '$items.originalPrice'] },
            0
          ]
        }
      },
    }
  }
]);

// Add to report output:
{
  priceOverrides: {
    count: priceOverrideStats[0]?.totalOverrides || 0,
    totalDiscount: priceOverrideStats[0]?.totalDiscount || 0,
    totalMarkup: priceOverrideStats[0]?.totalMarkup || 0,
    netImpact: (priceOverrideStats[0]?.totalMarkup || 0) - (priceOverrideStats[0]?.totalDiscount || 0),
  }
}
```

#### 6.3 Create Price Override Report Component
**File:** `/components/features/reports/price-override-section.tsx`

```typescript
interface PriceOverrideSectionProps {
  overrideStats: {
    count: number;
    totalDiscount: number;
    totalMarkup: number;
    netImpact: number;
  };
}

export function PriceOverrideSection({ overrideStats }: PriceOverrideSectionProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Price Overrides</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Total Overrides</p>
            <p className="text-2xl font-bold">{overrideStats.count}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Total Discounts</p>
            <p className="text-2xl font-bold text-red-600">
              -₦{overrideStats.totalDiscount.toLocaleString()}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Total Markups</p>
            <p className="text-2xl font-bold text-green-600">
              +₦{overrideStats.totalMarkup.toLocaleString()}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Net Impact</p>
            <p className={`text-2xl font-bold ${
              overrideStats.netImpact >= 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              {overrideStats.netImpact >= 0 ? '+' : ''}₦{overrideStats.netImpact.toLocaleString()}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
```

### Phase 7: Testing & Validation

#### 7.1 Unit Tests
- Test price override validation (negative prices, non-numeric values)
- Test permission checks (only admin/super-admin)
- Test audit log creation
- Test cart store price override actions

#### 7.2 Integration Tests
- Test complete order flow with overridden prices
- Test financial report calculations with overrides
- Test order details display with override information

#### 7.3 E2E Tests (Playwright)
```typescript
test('Admin can override menu item price', async ({ page }) => {
  // Login as admin
  // Add item to cart
  // Click override price button
  // Enter new price and reason
  // Verify price is updated in cart
  // Complete checkout
  // Verify order shows overridden price
  // Verify audit log created
});

test('Customer cannot override prices', async ({ page }) => {
  // Login as customer
  // Add item to cart
  // Verify no override button visible
  // Attempt API call to override (should fail)
});

test('Price override appears in financial reports', async ({ page }) => {
  // Create order with overridden price
  // Navigate to financial reports
  // Verify override statistics displayed
});
```

## Migration Strategy

### Database Migration Script
**File:** `/scripts/add-price-override-fields.ts`

```typescript
import { connectDB } from '@/lib/mongodb';
import MenuItemModel from '@/models/menu-item-model';
import Order from '@/models/order-model';

async function migrate() {
  await connectDB();

  // Add allowManualPriceOverride to all existing menu items
  await MenuItemModel.updateMany(
    { allowManualPriceOverride: { $exists: false } },
    { $set: { allowManualPriceOverride: false } }
  );

  // Add price override fields to all existing order items
  await Order.updateMany(
    {},
    {
      $set: {
        'items.$[].priceOverridden': false,
      }
    }
  );

  console.log('Migration completed successfully');
}

migrate().catch(console.error);
```

**Run with:**
```bash
npm run migrate:price-override
```

**Add to package.json:**
```json
{
  "scripts": {
    "migrate:price-override": "tsx scripts/add-price-override-fields.ts"
  }
}
```

## Security Considerations

1. **Authorization:**
   - Only admin and super-admin can override prices
   - Validate role on both frontend and backend
   - Prevent API manipulation

2. **Audit Trail:**
   - Log all price overrides
   - Include who, when, what, why
   - Immutable audit logs

3. **Validation:**
   - Prevent negative prices
   - Optional: Set maximum discount/markup limits
   - Require confirmation for large changes

4. **Data Integrity:**
   - Always preserve original price
   - Calculate totals correctly with overridden prices
   - Ensure financial reports account for overrides

## Configuration Options

**System Settings (Optional):**
```typescript
{
  priceOverride: {
    enabled: boolean;                    // Global toggle
    maxDiscountPercentage?: number;      // e.g., 90 (max 90% discount)
    maxMarkupPercentage?: number;        // e.g., 200 (max 200% markup)
    requireReasonAbove?: number;         // Require reason for changes > X%
    requireApprovalAbove?: number;       // Require super-admin approval > X%
  }
}
```

## Future Enhancements

1. **Approval Workflow:**
   - Require super-admin approval for large overrides
   - Pending override queue

2. **Preset Discounts:**
   - Quick discount buttons (10%, 25%, 50%)
   - Saved discount reasons

3. **Customer-Facing Discounts:**
   - Allow customers to see discounted prices
   - Promotional pricing

4. **Analytics:**
   - Most overridden items
   - Override trends over time
   - Staff override patterns

5. **Bulk Override:**
   - Apply same override to multiple items
   - Category-wide discounts

## Documentation Updates

1. **Admin Guide:**
   - How to enable price override for menu items
   - How to override prices when creating orders
   - Best practices and guidelines

2. **Staff Training:**
   - When to use price overrides
   - How to document reasons
   - Approval thresholds

3. **API Documentation:**
   - New fields in order creation endpoint
   - Price override validation rules

## Success Metrics

- Number of items with override enabled
- Frequency of price overrides
- Average override amount (discount/markup)
- Impact on revenue
- Staff adoption rate
- Audit compliance (reasons provided)

## Rollout Plan

1. **Phase 1 (Week 1):** Database schema updates, migration
2. **Phase 2 (Week 2):** Admin UI for menu item configuration
3. **Phase 3 (Week 3):** Cart and checkout integration
4. **Phase 4 (Week 4):** Order display and reporting
5. **Phase 5 (Week 5):** Testing and bug fixes
6. **Phase 6 (Week 6):** Staff training and documentation
7. **Phase 7 (Week 7):** Production deployment and monitoring

## Support & Maintenance

- Monitor audit logs for misuse
- Review override patterns monthly
- Update validation rules as needed
- Gather staff feedback for improvements
