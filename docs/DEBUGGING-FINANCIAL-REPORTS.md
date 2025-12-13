# Debugging Financial Reports Issue

## Current Status
Financial reports are still showing ₦0.00 despite having paid orders.

## Changes Made
1. ✅ Fixed query to use `paidAt` instead of `createdAt`
2. ✅ Added debug logging to identify the issue

## Debug Logging Added

The financial report service now logs:
- Date range being queried
- Total paid orders in database
- Sample of paid orders with their `paidAt` values
- Number of orders matching the date range

## Next Steps

### 1. Run Dev Server
```bash
npm run dev
```

### 2. Generate Report
- Navigate to `/dashboard/reports/daily`
- Click "Today" or "Generate Report"

### 3. Check Console Output
Look for logs like:
```
📊 Generating report for date range: { startDate: '...', endDate: '...' }
📊 Total paid orders in database: X
Sample paid orders: [...]
📊 Found X paid orders for this date range
```

## Possible Issues to Check

### Issue 1: Missing `paidAt` Field
**Symptom**: Paid orders exist but `paidAt` is `null` or `undefined`

**Solution**: Orders need to be re-paid or manually updated:
```javascript
// Update existing paid orders to set paidAt
db.orders.updateMany(
  { paymentStatus: 'paid', paidAt: { $exists: false } },
  { $set: { paidAt: new Date() } }
)
```

### Issue 2: Timezone Mismatch
**Symptom**: Orders exist but dates don't match

**Solution**: Check if `paidAt` is in a different timezone:
```javascript
// Check order paidAt values
db.orders.find({ paymentStatus: 'paid' }).forEach(o => {
  print(`Order ${o._id}: paidAt = ${o.paidAt}`)
})
```

### Issue 3: Date Range Issue
**Symptom**: Report is looking at wrong date

**Solution**: Verify the date being passed to the report:
- Check browser timezone
- Verify date picker is sending correct date
- Check `startOfDay` and `endOfDay` calculations

## Manual Database Check

### Check Paid Orders
```javascript
db.orders.find({
  paymentStatus: 'paid'
}).forEach(order => {
  print(`Order: ${order.orderNumber}`)
  print(`  Total: ₦${order.total}`)
  print(`  Created: ${order.createdAt}`)
  print(`  Paid At: ${order.paidAt}`)
  print(`  Status: ${order.status}`)
  print('---')
})
```

### Check Tab Orders
```javascript
db.tabs.find({
  status: 'closed',
  paymentStatus: 'paid'
}).forEach(tab => {
  print(`Tab: ${tab.tabNumber}`)
  print(`  Total: ₦${tab.total}`)
  print(`  Paid At: ${tab.paidAt}`)
  print(`  Orders: ${tab.orders.length}`)
  print('---')
})
```

## Expected Console Output

### If Working Correctly
```
📊 Generating report for date range: {
  startDate: '2025-12-13T00:00:00.000Z',
  endDate: '2025-12-13T23:59:59.999Z'
}
📊 Total paid orders in database: 1
Sample paid orders: [{
  id: '693da71495c4a64dd7e50776',
  total: 20000,
  paidAt: 2025-12-13T19:28:00.000Z,
  createdAt: 2025-12-13T19:30:00.000Z
}]
📊 Found 1 paid orders for this date range
```

### If paidAt is Missing
```
📊 Total paid orders in database: 1
Sample paid orders: [{
  id: '693da71495c4a64dd7e50776',
  total: 20000,
  paidAt: null,  // ❌ PROBLEM!
  createdAt: 2025-12-13T19:30:00.000Z
}]
📊 Found 0 paid orders for this date range
```

## Quick Fix Script

If `paidAt` is missing on existing orders, run this:

```javascript
// In MongoDB shell or via script
const OrderModel = require('./models/order-model');

async function fixPaidOrders() {
  const result = await OrderModel.updateMany(
    {
      paymentStatus: 'paid',
      paidAt: { $exists: false }
    },
    {
      $set: { paidAt: new Date() }
    }
  );
  
  console.log(`Updated ${result.modifiedCount} orders`);
}

fixPaidOrders();
```

---

**Status**: 🔍 Investigating  
**Next Action**: Check console logs after generating report
