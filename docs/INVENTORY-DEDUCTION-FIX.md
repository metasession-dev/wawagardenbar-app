# Inventory Deduction Issue - Root Cause & Fix

## Problem

Inventory is not being deducted when orders are completed and paid, even though:
- Orders show as "Completed" with payment status "Paid"
- Inventory shows "No sales yet" and "0 bottles" total restocked
- Stock levels remain unchanged after sales

## Root Cause

The inventory deduction system requires **two conditions** to be met for each menu item:

1. **`trackInventory`** must be set to `true`
2. **`inventoryId`** must be populated with the corresponding inventory record ID

### Code Reference

From `/services/inventory-service.ts` (line 28-31):

```typescript
// Skip if item doesn't track inventory
if (!menuItem?.trackInventory || !menuItem.inventoryId) {
  continue; // Inventory is NOT deducted
}
```

### What's Happening

When you created inventory records (either manually or via the seed script), the inventory records were created but the **menu items were not updated** to:
- Enable `trackInventory = true`
- Link to the inventory via `inventoryId`

So when orders are paid:
1. ✅ Payment webhook is triggered
2. ✅ `InventoryService.deductStockForOrder()` is called
3. ❌ Each item is skipped because `trackInventory` is false or `inventoryId` is missing
4. ❌ No inventory is deducted

## How Inventory Deduction Works

### Payment Flow

```
Order Created (pending)
    ↓
Payment Successful (webhook)
    ↓
Order Status → "confirmed"
Payment Status → "paid"
    ↓
InventoryService.deductStockForOrder() called
    ↓
For each order item:
  - Check if trackInventory = true
  - Check if inventoryId exists
  - If both true: deduct stock
  - If either false: skip item
    ↓
Inventory Updated (if configured)
```

### Webhook Code

From `/app/api/webhooks/monnify/route.ts` (lines 96-106):

```typescript
// Deduct inventory immediately after payment confirmation
if (!order.inventoryDeducted) {
  try {
    await InventoryService.deductStockForOrder(order._id.toString());
    order.inventoryDeducted = true;
    order.inventoryDeductedAt = new Date();
    console.log('Inventory deducted for order:', order._id);
  } catch (error) {
    console.error('Error deducting inventory for order:', order._id, error);
  }
}
```

## Solution

### Option 1: Run Fix Script (Recommended)

Use the automated script to link all menu items to their inventory:

```bash
# Local development
npx tsx scripts/link-menu-inventory.ts

# Production Docker
docker exec -it food_app npx tsx scripts/link-menu-inventory.ts
```

This script will:
- Find all inventory records
- Link each to its corresponding menu item
- Enable `trackInventory = true`
- Set `inventoryId` to the inventory record ID

### Option 2: Manual Fix via Dashboard

For each menu item:

1. Go to **Dashboard → Menu**
2. Click **Edit** on a menu item
3. Scroll to **Inventory Tracking** section
4. Toggle **"Track Inventory"** to ON
5. The system should auto-link to existing inventory
6. Click **Save**

### Option 3: Database Update (Advanced)

If you need to manually update via MongoDB:

```javascript
// Find inventory for a menu item
const inventory = await InventoryModel.findOne({ menuItemId: 'MENU_ITEM_ID' });

// Update the menu item
await MenuItemModel.findByIdAndUpdate('MENU_ITEM_ID', {
  trackInventory: true,
  inventoryId: inventory._id
});
```

## Diagnostic Script

To check which items are properly configured:

```bash
# Local
npx tsx scripts/check-inventory-tracking.ts

# Production
docker exec -it food_app npx tsx scripts/check-inventory-tracking.ts
```

This will show:
- Items with `trackInventory` enabled
- Items with `inventoryId` set
- Items fully configured (both)
- Issues that need fixing

## Verification

After running the fix script:

### 1. Check Menu Items

```bash
# In MongoDB or via script
db.menuitems.find({ trackInventory: true }).count()
```

Should match the number of items with inventory.

### 2. Place a Test Order

1. Create a test order for a drink (e.g., Guinness)
2. Complete payment
3. Check inventory:
   - Stock should be reduced
   - "Total Sales" should increase
   - "Last Sale" date should be updated
   - Stock history should show the deduction

### 3. Check Order Record

```javascript
const order = await OrderModel.findById('ORDER_ID');
console.log('Inventory deducted:', order.inventoryDeducted); // Should be true
console.log('Deducted at:', order.inventoryDeductedAt); // Should have timestamp
```

## Expected Behavior After Fix

### When Order is Paid:

1. **Order Status** → "confirmed"
2. **Payment Status** → "paid"
3. **Inventory Deduction**:
   - Stock reduced by quantity ordered
   - Status updated (in-stock/low-stock/out-of-stock)
   - Stock history entry added
   - Total sales incremented
   - Last sale date updated
4. **Order Marked**:
   - `inventoryDeducted` = true
   - `inventoryDeductedAt` = timestamp

### Inventory Display:

- **Current Stock**: Reduced by sales
- **Total Sales**: Shows lifetime sales count
- **Last Sale**: Shows most recent sale date
- **Stock History**: Shows all deductions with order IDs

## Files Involved

### Scripts Created:
1. **`/scripts/check-inventory-tracking.ts`** - Diagnostic tool
2. **`/scripts/link-menu-inventory.ts`** - Automated fix

### Core Files:
1. **`/services/inventory-service.ts`** - Deduction logic
2. **`/app/api/webhooks/monnify/route.ts`** - Payment webhook
3. **`/app/api/webhooks/paystack/route.ts`** - Payment webhook
4. **`/models/menu-item-model.ts`** - Menu item schema
5. **`/models/inventory-model.ts`** - Inventory schema

## Common Issues

### Issue 1: Script Says "Already Linked" But Still Not Working

**Cause**: The link might be one-way (inventory → menu) but not both ways.

**Fix**: Check both:
```javascript
// Menu item should have
menuItem.trackInventory === true
menuItem.inventoryId === inventory._id

// Inventory should have
inventory.menuItemId === menuItem._id
```

### Issue 2: Some Items Work, Others Don't

**Cause**: Only some items are properly configured.

**Fix**: Run diagnostic script to identify which items need fixing.

### Issue 3: Inventory Deducted But Not Showing

**Cause**: Frontend might be cached.

**Fix**: 
- Hard refresh (Ctrl+Shift+R)
- Check database directly
- Verify `inventoryDeducted` flag on order

### Issue 4: Deduction Happens Twice

**Cause**: Webhook called multiple times or manual completion.

**Fix**: The code checks `order.inventoryDeducted` flag to prevent double deduction.

## Prevention

To prevent this issue in the future:

### When Creating Menu Items:

1. **Always enable "Track Inventory"** if the item has stock
2. **Link to inventory record** immediately
3. **Verify the link** before saving

### When Seeding Data:

Update your seed scripts to:
```typescript
// Create inventory
const inventory = await InventoryModel.create({ ... });

// Create menu item WITH inventory link
const menuItem = await MenuItemModel.create({
  name: 'Guinness',
  trackInventory: true,
  inventoryId: inventory._id,
  // ... other fields
});

// Update inventory with menu item reference
inventory.menuItemId = menuItem._id;
await inventory.save();
```

### When Editing Menu Items:

- Don't disable "Track Inventory" unless you really want to stop tracking
- If you delete inventory, also update the menu item

## Testing Checklist

After applying the fix:

- [ ] Run diagnostic script - all items should be "fully configured"
- [ ] Place test order for tracked item
- [ ] Complete payment
- [ ] Verify inventory reduced
- [ ] Check order has `inventoryDeducted = true`
- [ ] Verify stock history shows deduction
- [ ] Check "Total Sales" incremented
- [ ] Verify "Last Sale" date updated
- [ ] Test with multiple items in one order
- [ ] Test with quantity > 1
- [ ] Verify low stock alerts trigger when appropriate

## Support

If inventory is still not deducting after running the fix:

1. Check server logs for errors during webhook processing
2. Verify webhook is being called (check payment provider logs)
3. Check `order.inventoryDeducted` flag in database
4. Verify menu item has both `trackInventory` and `inventoryId`
5. Check inventory record exists and has correct `menuItemId`

## Summary

**Problem**: Menu items not linked to inventory records
**Solution**: Run `link-menu-inventory.ts` script
**Result**: Future orders will automatically deduct inventory
**Note**: Past orders won't retroactively deduct (by design)
