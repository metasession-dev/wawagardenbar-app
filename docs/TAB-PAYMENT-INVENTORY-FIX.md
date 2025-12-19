# Tab Payment Inventory Deduction Fix

## Problem

When completing tab payments manually via the dashboard (Manual Payment Entry), inventory was not being deducted even though:
- Tab status changed to "closed"
- Payment status changed to "paid"
- Orders changed to "confirmed"
- Payment was recorded with reference number

**Result**: Inventory remained unchanged, showing "No sales yet" and "0 bottles" total restocked.

## Root Cause

The `TabService.completeTabPaymentManually()` and `TabService.markTabPaid()` methods were updating tab and order statuses but **not calling inventory deduction**.

### Code Analysis

**Before Fix** - `/services/tab-service.ts`:

```typescript
static async completeTabPaymentManually(params) {
  // ... validation ...
  
  // Update tab status
  tab.status = 'closed';
  tab.paymentStatus = 'paid';
  await tab.save();
  
  // Update orders
  await OrderModel.updateMany(
    { _id: { $in: tab.orders } },
    { $set: { paymentStatus: 'paid', status: 'confirmed' } }
  );
  
  // ❌ No inventory deduction!
  
  return tab;
}
```

### Why This Happened

Tab payments have a different flow than single orders:
1. **Single Order Payment** (webhook) → Deducts inventory ✅
2. **Tab Payment** (manual/webhook) → Did NOT deduct inventory ❌

The tab payment methods were missing the inventory deduction logic that exists in the order payment webhooks.

## Solution

Added inventory deduction to **both** tab payment methods:

### 1. Manual Tab Payment (`completeTabPaymentManually`)
Used when admin processes payment via dashboard with cash/transfer/card.

### 2. Webhook Tab Payment (`markTabPaid`)
Used when customer pays tab via payment gateway (Monnify/Paystack).

### Implementation

**After Fix** - `/services/tab-service.ts`:

```typescript
// Update orders
await OrderModel.updateMany(
  { _id: { $in: tab.orders } },
  { $set: { paymentStatus: 'paid', status: 'confirmed' } }
);

// ✅ Deduct inventory for all orders in the tab
const InventoryService = (await import('./inventory-service')).default;
for (const orderId of tab.orders) {
  try {
    const order = await OrderModel.findById(orderId);
    if (order && !order.inventoryDeducted) {
      await InventoryService.deductStockForOrder(orderId.toString());
      order.inventoryDeducted = true;
      order.inventoryDeductedAt = new Date();
      await order.save();
      console.log('Inventory deducted for order:', orderId);
    }
  } catch (error) {
    console.error('Error deducting inventory for order:', orderId, error);
    // Continue processing other orders even if one fails
  }
}
```

## What Was Fixed

### Files Modified

**`/services/tab-service.ts`** - Two methods updated:

1. **`markTabPaid()`** (lines 273-325)
   - Used by payment webhooks
   - Now deducts inventory for all orders in tab

2. **`completeTabPaymentManually()`** (lines 503-600)
   - Used by admin manual payments
   - Now deducts inventory for all orders in tab

## How It Works Now

### Manual Tab Payment Flow

```
Admin clicks "Customer Wants to Pay Tab"
    ↓
Selects payment method (Cash/Transfer/Card)
    ↓
Enters payment reference
    ↓
Clicks "Complete Payment & Close Tab"
    ↓
TabService.completeTabPaymentManually() called
    ↓
Tab status → "closed"
Payment status → "paid"
    ↓
All orders in tab → "confirmed" + "paid"
    ↓
✅ For each order:
   - Check if inventory already deducted
   - If not: deduct stock
   - Mark order.inventoryDeducted = true
   - Log success/errors
    ↓
Inventory Updated:
   - Stock reduced
   - Total sales incremented
   - Last sale date updated
   - Stock history recorded
```

### Webhook Tab Payment Flow

```
Customer pays tab via payment gateway
    ↓
Webhook received (Monnify/Paystack)
    ↓
TabService.markTabPaid() called
    ↓
Tab status → "closed"
Payment status → "paid"
    ↓
All orders in tab → "confirmed" + "paid"
    ↓
✅ For each order:
   - Deduct inventory
   - Mark inventoryDeducted = true
    ↓
Inventory Updated
```

## Safety Features

### 1. Idempotency
```typescript
if (order && !order.inventoryDeducted) {
  // Only deduct if not already done
}
```
Prevents double deduction if method is called multiple times.

### 2. Error Handling
```typescript
try {
  await InventoryService.deductStockForOrder(orderId.toString());
} catch (error) {
  console.error('Error deducting inventory for order:', orderId, error);
  // Continue processing other orders
}
```
One failed order doesn't block the entire tab payment.

### 3. Logging
```typescript
console.log('Inventory deducted for order:', orderId);
console.error('Error deducting inventory for order:', orderId, error);
```
Clear audit trail in server logs.

## Expected Behavior After Fix

### When Tab is Paid (Manual or Webhook):

1. **Tab Status**
   - Status: "closed"
   - Payment Status: "paid"
   - Payment Reference: recorded
   - Paid At: timestamp

2. **All Orders in Tab**
   - Status: "confirmed"
   - Payment Status: "paid"
   - Paid At: timestamp
   - ✅ `inventoryDeducted`: true
   - ✅ `inventoryDeductedAt`: timestamp

3. **Inventory for Each Item**
   - ✅ Current Stock: reduced by quantity
   - ✅ Total Sales: incremented
   - ✅ Last Sale: updated to payment date
   - ✅ Stock History: deduction entry added
   - ✅ Status: updated (in-stock/low-stock/out-of-stock)

## Verification Steps

### Test Manual Tab Payment

1. **Create a tab** with drinks (e.g., Table 1)
2. **Add orders** to the tab (e.g., 1x Action Bitters)
3. **Note current inventory** (e.g., 6 bottles)
4. **Pay the tab** via dashboard:
   - Click "Customer Wants to Pay Tab"
   - Select "Cash"
   - Enter reference: "CASH001"
   - Click "Complete Payment & Close Tab"
5. **Check inventory**:
   - Should show 5 bottles (6 - 1)
   - Total Sales: 1
   - Last Sale: today
6. **Check order**:
   - Status: "confirmed"
   - Payment Status: "paid"
   - `inventoryDeducted`: true

### Test Webhook Tab Payment

1. Create a tab and add orders
2. Customer pays via payment gateway
3. Webhook processes payment
4. Verify inventory is deducted

### Check Server Logs

Look for these log messages:
```
Inventory deducted for order: 675e...
Inventory deducted for tab order: 675e...
```

Or error messages if something fails:
```
Error deducting inventory for order: 675e... [error details]
```

## Important Notes

### ⚠️ Past Orders

Orders completed **before this fix** will NOT have inventory deducted retroactively. This is by design to prevent data corruption.

If you need to manually adjust inventory for past sales:
1. Go to Dashboard → Inventory
2. Click on the item
3. Use "Deduct Stock" button
4. Enter quantity and reason: "Manual adjustment for past sales"

### ✅ Future Orders

All tab payments (manual and webhook) from now on will automatically deduct inventory.

### 🔗 Prerequisites

This fix assumes menu items are properly linked to inventory. If not, run:
```bash
npx tsx scripts/link-menu-inventory.ts
```

See `INVENTORY-DEDUCTION-FIX.md` for details.

## Testing Checklist

After deploying this fix:

- [ ] Create test tab with 1 order (1x item)
- [ ] Note current inventory count
- [ ] Pay tab manually via dashboard
- [ ] Verify inventory reduced by 1
- [ ] Check order has `inventoryDeducted = true`
- [ ] Verify "Total Sales" incremented
- [ ] Verify "Last Sale" date updated
- [ ] Check stock history shows deduction
- [ ] Test with multiple orders in one tab
- [ ] Test with multiple items per order
- [ ] Test with quantity > 1
- [ ] Verify error handling (try with non-tracked item)
- [ ] Check server logs for success messages

## Related Issues

This fix addresses the same root cause as the single order payment issue, but for tab payments specifically.

### Related Fixes:
1. **Single Order Payments** - Already working (webhooks deduct inventory)
2. **Tab Payments** - Fixed in this update
3. **Menu Item Linking** - Separate fix (see `INVENTORY-DEDUCTION-FIX.md`)

## Deployment

```bash
# Build
npm run build

# Commit
git add .
git commit -m "fix: Add inventory deduction for manual and webhook tab payments"
git push

# Deploy to production
docker-compose pull && docker-compose up -d --force-recreate
```

## Summary

**Problem**: Tab payments (manual and webhook) didn't deduct inventory
**Solution**: Added inventory deduction loop to both tab payment methods
**Result**: All tab payments now automatically deduct inventory
**Safety**: Idempotent, error-tolerant, with logging
**Impact**: Future tab payments will correctly update inventory
