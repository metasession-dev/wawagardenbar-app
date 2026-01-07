# Feature 4.2.2: Troubleshooting Guide

**Last Updated:** November 17, 2025

---

## 🔧 Common Issues and Solutions

### Issue 1: Params is a Promise Error (Next.js 15)

**Symptom:** Error: `Route "/dashboard/inventory/[id]" used params.id. params is a Promise and must be unwrapped with await`

**Cause:** Next.js 15 changed dynamic route params to be async Promises.

**Solution:** Already fixed in the code. The params are now properly awaited:

```typescript
// ✅ Correct (Next.js 15)
interface Props {
  params: Promise<{ id: string }>;
}

export default async function Page({ params }: Props) {
  const { id } = await params;
  // Use id here
}

// ❌ Old way (Next.js 14)
interface Props {
  params: { id: string };
}

export default async function Page({ params }: Props) {
  const id = params.id;
  // Use id here
}
```

If you see this error, the fix has already been applied. Just refresh your browser.

---

### Issue 2: 404 Error on Inventory Detail Page

**Symptom:** Clicking "View Details" on an inventory item shows a 404 page.

**Cause:** Next.js dev server hasn't picked up the new route.

**Solution:**

1. **Restart the Next.js dev server:**
   ```bash
   # Stop the current server (Ctrl+C)
   # Then restart:
   npm run dev
   ```

2. **Clear Next.js cache (if restart doesn't work):**
   ```bash
   rm -rf .next
   npm run dev
   ```

3. **Verify the route exists:**
   - Check that `/app/dashboard/inventory/[id]/page.tsx` exists
   - File should be in the correct location

4. **Check browser console for errors:**
   - Open DevTools (F12)
   - Look for any JavaScript errors
   - Check Network tab for failed requests

**Expected Behavior:**
- URL should be: `/dashboard/inventory/[inventory-id]`
- Page should load with inventory details
- Should show stock cards, adjustment buttons, and history table

---

### Issue 2: TypeScript Errors in IDE

**Symptom:** Red squiggly lines in IDE showing property errors.

**Cause:** TypeScript can't infer the exact type from the action result.

**Solution:**
- These are type inference warnings, not runtime errors
- The code will work correctly at runtime
- Already fixed with `as any` type assertion
- Can be improved later with proper interface definitions

**To Properly Fix (Optional):**
Create a proper interface:
```typescript
interface InventoryDetailData {
  _id: string;
  menuItemId: {
    _id: string;
    name: string;
    mainCategory: string;
    category: string;
    price: number;
  } | null;
  currentStock: number;
  minimumStock: number;
  maximumStock: number;
  unit: string;
  status: string;
  costPerUnit: number;
  supplier: string;
  totalSales: number;
  totalWaste: number;
  totalRestocked: number;
  lastRestocked?: string;
  lastSaleDate?: string;
  stockHistory: Array<{
    quantity: number;
    type: string;
    reason: string;
    category?: string;
    timestamp: string;
    performedByName?: string;
    notes?: string;
    supplier?: string;
    invoiceNumber?: string;
  }>;
}
```

Then use:
```typescript
const inventory = result.data as InventoryDetailData;
```

---

### Issue 3: Stock Not Deducting on Order Completion

**Symptom:** Order is completed but stock doesn't decrease.

**Possible Causes & Solutions:**

1. **Item doesn't have inventory tracking enabled:**
   - Check menu item has `trackInventory: true`
   - Verify `inventoryId` is linked

2. **Order status not set to "completed":**
   - Check order status in database
   - Use `updateOrderStatusAction` or `completeOrderAndDeductStockAction`

3. **Stock already deducted:**
   - Check `inventoryDeducted: true` on order
   - System is idempotent - won't deduct twice

4. **Error during deduction:**
   - Check server logs for errors
   - Look for inventory service errors
   - Verify database connection

**Manual Fix:**
```typescript
// Use the deduct stock action manually
await deductStockAction(inventoryId, {
  quantity: orderQuantity,
  reason: `Manual deduction for order #${orderId}`,
  category: 'other',
  notes: 'Correcting missed automatic deduction'
});
```

---

### Issue 4: Email Alerts Not Received

**Symptom:** Stock is low but no email received.

**Checklist:**

1. **Check environment variables:**
   ```bash
   # .env.local should have:
   ADMIN_ALERT_EMAIL=admin@wawagardenbar.com
   LOW_STOCK_ALERT_ENABLED=true
   
   # SMTP settings:
   SMTP_HOST=smtp.zoho.com
   SMTP_PORT=465
   SMTP_USER=your-email@domain.com
   SMTP_PASSWORD=your-password
   ```

2. **Verify SMTP configuration:**
   - Check `/lib/email.ts` transporter settings
   - Test with a simple email send

3. **Check spam/junk folder:**
   - Emails might be filtered
   - Add sender to safe list

4. **Check server logs:**
   ```bash
   # Look for email errors
   grep "email" logs/server.log
   ```

5. **Test email manually:**
   ```typescript
   // Create a test script
   import { sendLowStockAlertEmail } from '@/lib/email';
   
   await sendLowStockAlertEmail({
     name: 'Test Item',
     currentStock: 5,
     minimumStock: 10,
     unit: 'units',
     // ... other fields
   });
   ```

---

### Issue 5: Stock Adjustment Dialogs Not Opening

**Symptom:** Clicking Add/Deduct/Adjust buttons does nothing.

**Solutions:**

1. **Check browser console:**
   - Look for JavaScript errors
   - Check if Dialog component is imported

2. **Verify component imports:**
   ```typescript
   import { Dialog, DialogContent, ... } from '@/components/ui/dialog';
   ```

3. **Check if shadcn dialog is installed:**
   ```bash
   npx shadcn@latest add dialog
   ```

4. **Clear browser cache:**
   - Hard refresh: Ctrl+Shift+R (Windows/Linux) or Cmd+Shift+R (Mac)

---

### Issue 6: Stock History Not Showing

**Symptom:** Stock history table is empty or shows "No stock movements recorded yet".

**Possible Causes:**

1. **No stock movements yet:**
   - Newly created item with no adjustments
   - No orders completed yet

2. **Data not being saved:**
   - Check if stock adjustments are creating history entries
   - Verify `stockHistory` array in database

3. **Serialization issue:**
   - Check `getInventoryDetailsAction` is properly serializing history
   - Verify dates are converted to ISO strings

**Debug:**
```typescript
// Check in MongoDB
db.inventories.findOne({ _id: ObjectId('...') })
// Should have stockHistory array with entries
```

---

### Issue 7: Progress Component Not Found

**Symptom:** Error: `Cannot find module '@/components/ui/progress'`

**Solution:**
```bash
npx shadcn@latest add progress
```

This installs the Progress component from shadcn/ui.

---

### Issue 8: Inventory Table Not Showing Items

**Symptom:** Inventory page loads but shows "No inventory items found".

**Possible Causes:**

1. **No items with inventory tracking:**
   - Create menu items with `trackInventory: true`
   - Or enable tracking on existing items

2. **Database connection issue:**
   - Check MongoDB connection
   - Verify `MONGODB_URI` in .env

3. **Populate not working:**
   - Check if `menuItemId` is properly populated
   - Verify menu items exist in database

**Debug:**
```typescript
// Check in MongoDB
db.inventories.find().count()
// Should return number of inventory items

db.inventories.find().pretty()
// Should show inventory documents
```

---

### Issue 9: Authentication Errors

**Symptom:** "Unauthorized" error when accessing inventory pages.

**Solutions:**

1. **Verify you're logged in as admin:**
   - Check session in browser DevTools
   - Role should be 'admin' or 'super-admin'

2. **Check auth middleware:**
   - Verify `requireAdmin()` is working
   - Check session configuration

3. **Re-login:**
   - Log out and log back in
   - Clear cookies and try again

---

### Issue 10: Build Errors

**Symptom:** `npm run build` fails with errors.

**Common Fixes:**

1. **TypeScript errors:**
   ```bash
   npm run type-check
   ```
   Fix any type errors shown

2. **Missing dependencies:**
   ```bash
   npm install
   ```

3. **Clear cache and rebuild:**
   ```bash
   rm -rf .next
   npm run build
   ```

4. **Check for unused imports:**
   - Remove any unused imports
   - ESLint will show warnings

---

## 🔍 Debugging Tools

### Check Database Directly

```javascript
// MongoDB Shell
use wawagardenbar

// Check inventories
db.inventories.find().pretty()

// Check menu items with tracking
db.menuitems.find({ trackInventory: true }).pretty()

// Check orders with inventory deduction
db.orders.find({ inventoryDeducted: true }).pretty()
```

### Check Server Logs

```bash
# If using PM2
pm2 logs

# If using npm run dev
# Logs appear in terminal

# Check for specific errors
grep "inventory" logs/error.log
grep "stock" logs/error.log
```

### Browser DevTools

1. **Console Tab:**
   - JavaScript errors
   - Network request failures
   - Component warnings

2. **Network Tab:**
   - API request/response
   - Status codes
   - Response data

3. **Application Tab:**
   - Cookies (session)
   - Local storage
   - Session storage

---

## 📞 Getting Help

If you're still experiencing issues:

1. **Check documentation:**
   - FEATURE-4.2.2-SPEC.md
   - INVENTORY-USER-GUIDE.md
   - FEATURE-4.2.2-COMPLETE.md

2. **Review code:**
   - Check implementation files
   - Compare with specification

3. **Contact support:**
   - Email: support@wawagardenbar.com
   - Include:
     - Error messages
     - Screenshots
     - Steps to reproduce
     - Browser and OS info

---

## ✅ Quick Checklist

Before reporting an issue, verify:

- [ ] Next.js dev server is running
- [ ] Server has been restarted after adding new routes
- [ ] All dependencies are installed (`npm install`)
- [ ] Environment variables are set correctly
- [ ] Database connection is working
- [ ] You're logged in as admin
- [ ] Browser cache is cleared
- [ ] No console errors in browser
- [ ] MongoDB is running
- [ ] SMTP settings are correct (for emails)

---

**Most Common Fix:** Restart the Next.js dev server! 🔄

Many issues, especially 404 errors on new routes, are resolved by simply restarting the development server.

```bash
# Stop server (Ctrl+C)
npm run dev
```

---

*Last Updated: November 17, 2025*
