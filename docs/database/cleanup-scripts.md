# Database Cleanup Scripts Documentation

## Overview

Three TypeScript scripts for cleaning up database collections (Menu Items, Inventory, Tabs, Orders) with varying levels of safety and automation.

## Scripts Created

### 1. cleanup-database.ts
**Full cleanup with safety confirmation**

**Location:** `/scripts/cleanup-database.ts`

**Features:**
- ✅ Shows current database counts
- ✅ Requires typing "DELETE" to confirm
- ✅ Deletes all menu items, inventory, tabs, and orders
- ✅ Displays deletion summary
- ✅ Verifies cleanup completed

**Usage:**
```bash
npx tsx scripts/cleanup-database.ts
```

**Example Output:**
```
🗑️  Database Cleanup Script

⚠️  WARNING: This will DELETE ALL data!

✅ Connected to database

📊 Current database contents:
   Menu Items: 45
   Inventory: 30
   Tabs: 12
   Orders: 156
   TOTAL: 243 documents

⚠️  Are you sure you want to DELETE ALL this data? Type "DELETE" to confirm: DELETE

🗑️  Starting cleanup...

✅ Cleanup complete!

📊 Deleted:
   Menu Items: 45
   Inventory: 30
   Tabs: 12
   Orders: 156
   TOTAL: 243 documents

✅ Database is now clean!
```

---

### 2. selective-cleanup.ts
**Interactive cleanup - choose what to delete**

**Location:** `/scripts/selective-cleanup.ts`

**Features:**
- ✅ Shows counts for each collection
- ✅ Interactive prompts for each collection type
- ✅ Only deletes selected collections
- ✅ Requires "DELETE" confirmation
- ✅ Summary of deletions

**Usage:**
```bash
npx tsx scripts/selective-cleanup.ts
```

**Example Output:**
```
🗑️  Selective Database Cleanup

✅ Connected to database

📊 Current database contents:
   1. Menu Items: 45
   2. Inventory: 30
   3. Tabs: 12
   4. Orders: 156

What would you like to delete?
Delete Menu Items? (y/n): n
Delete Inventory? (y/n): n
Delete Tabs? (y/n): y
Delete Orders? (y/n): y

⚠️  You are about to delete: Tabs, Orders
Type "DELETE" to confirm: DELETE

🗑️  Deleting...

✅ Deleted 12 tabs
✅ Deleted 156 orders

✅ Cleanup complete! Deleted 168 total documents.
```

---

### 3. quick-cleanup.ts
**Fast cleanup without confirmation (DANGEROUS!)**

**Location:** `/scripts/quick-cleanup.ts`

**Features:**
- ⚠️ NO confirmation required
- ⚡ Immediate deletion
- 📊 Shows before/after counts
- ✅ Verifies cleanup

**Usage:**
```bash
npx tsx scripts/quick-cleanup.ts
```

**Example Output:**
```
⚡ Quick Database Cleanup (No Confirmation)

📊 Before cleanup:
   Menu Items: 45
   Inventory: 30
   Tabs: 12
   Orders: 156

🗑️  Deleting all data...

✅ Deleted:
   Menu Items: 45
   Inventory: 30
   Tabs: 12
   Orders: 156

✅ Total deleted: 243 documents

✅ Database is now clean!
```

---

## Comparison Table

| Feature | cleanup-database.ts | selective-cleanup.ts | quick-cleanup.ts |
|---------|-------------------|---------------------|------------------|
| **Confirmation** | ✅ Yes (type "DELETE") | ✅ Yes (interactive + "DELETE") | ❌ No |
| **Collections** | All | Choose individually | All |
| **Speed** | Normal | Normal | Fast |
| **Safety** | High | High | Low |
| **Best For** | Manual reset | Partial cleanup | Automated tests |

---

## What Gets Deleted

All scripts can delete the following collections:

### Menu Items
- All dishes, drinks, and food items
- Customization options
- Pricing information
- Images and descriptions

### Inventory
- All inventory tracking records
- Stock levels
- Cost per unit
- Supplier information

### Tabs
- All open tabs
- All closed tabs
- Tab payment information
- Tab order associations

### Orders
- All dine-in orders
- All pickup orders
- All delivery orders
- Order payment information
- Order status history

---

## What Does NOT Get Deleted

These scripts do NOT delete:
- ❌ User accounts
- ❌ Customer profiles
- ❌ Rewards and loyalty points
- ❌ System settings
- ❌ Admin accounts
- ❌ Audit logs
- ❌ Expenses

---

## Safety Guidelines

### ✅ DO:
1. **Backup first** - Always backup production data before cleanup
2. **Use confirmation scripts** - Use `cleanup-database.ts` or `selective-cleanup.ts` for manual operations
3. **Test environment** - Run cleanup scripts in development/test environments
4. **Verify counts** - Check the counts before confirming deletion
5. **Read output** - Review the deletion summary

### ❌ DON'T:
1. **Don't use quick-cleanup in production** - It has no safety checks
2. **Don't skip backups** - Always backup before major deletions
3. **Don't ignore warnings** - Pay attention to confirmation prompts
4. **Don't run blindly** - Understand what will be deleted

---

## Use Cases

### Development
```bash
# Reset database for fresh start
npx tsx scripts/cleanup-database.ts
```

### Testing
```bash
# Quick cleanup between test runs
npx tsx scripts/quick-cleanup.ts
```

### Partial Cleanup
```bash
# Remove only orders and tabs, keep menu
npx tsx scripts/selective-cleanup.ts
```

### Production Migration
```bash
# NEVER use quick-cleanup
# Always use cleanup-database.ts with backup
# Better: Use selective-cleanup.ts to preserve menu items
```

---

## Technical Details

### Dependencies
- `dotenv` - Load environment variables
- `readline` - Interactive prompts (cleanup-database.ts, selective-cleanup.ts)
- MongoDB models:
  - `MenuItemModel`
  - `InventoryModel`
  - `TabModel`
  - `OrderModel`

### Environment Variables
Requires `.env.local` with:
```
MONGODB_WAWAGARDENBAR_APP_URI=mongodb://...
```

### Error Handling
All scripts include:
- Database connection error handling
- Deletion error handling
- Graceful exit on errors
- Error messages with details

---

## Troubleshooting

### Error: Environment variable not defined
**Solution:** Ensure `.env.local` exists with `MONGODB_WAWAGARDENBAR_APP_URI`

### Error: Cannot connect to database
**Solution:** 
- Check MongoDB connection string
- Verify database is running
- Check network/firewall settings

### Script hangs on confirmation
**Solution:** Type exactly "DELETE" (all caps) and press Enter

### Deletion count doesn't match
**Solution:**
- Some documents may have been deleted during the process
- Check for database constraints or triggers
- Verify final counts with manual query

---

## Examples

### Example 1: Full Reset
```bash
$ npx tsx scripts/cleanup-database.ts

🗑️  Database Cleanup Script
⚠️  WARNING: This will DELETE ALL data!

✅ Connected to database

📊 Current database contents:
   Menu Items: 45
   Inventory: 30
   Tabs: 12
   Orders: 156
   TOTAL: 243 documents

⚠️  Are you sure you want to DELETE ALL this data? Type "DELETE" to confirm: DELETE

✅ Cleanup complete!
```

### Example 2: Selective Cleanup
```bash
$ npx tsx scripts/selective-cleanup.ts

Delete Menu Items? (y/n): n
Delete Inventory? (y/n): n
Delete Tabs? (y/n): y
Delete Orders? (y/n): y

Type "DELETE" to confirm: DELETE

✅ Deleted 168 total documents.
```

### Example 3: Quick Cleanup
```bash
$ npx tsx scripts/quick-cleanup.ts

⚡ Quick Database Cleanup (No Confirmation)

✅ Total deleted: 243 documents
✅ Database is now clean!
```

---

## Related Scripts

- `seed-menu.ts` - Seed database with menu items
- `delete-user-data.ts` - Delete specific user's data
- `fix-tab-orders.ts` - Fix orders in closed tabs
- `check-paid-orders.ts` - Check paid orders status

---

**Created:** December 13, 2025  
**Author:** Cascade AI Assistant  
**Status:** ✅ Ready for use
