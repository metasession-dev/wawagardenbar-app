# Operational Scripts Guide

This document provides comprehensive guidance on using operational scripts for database management, seeding, admin operations, and maintenance.

**Table of Contents:**
- [Admin & User Management](#admin--user-management)
- [Data Seeding](#data-seeding)
- [Data Deletion](#data-deletion)
- [Maintenance & Utilities](#maintenance--utilities)
- [Diagnostic Scripts](#diagnostic-scripts)
- [Best Practices](#best-practices)

---

## Admin & User Management

### Create Super Admin
**Script:** `scripts/create-super-admin.ts`

**Purpose:** Creates the initial super-admin user for the system.

**Usage:**
```bash
# Local
npx tsx scripts/create-super-admin.ts

# Production
docker exec -it food_app npx tsx scripts/create-super-admin.ts
```

**Environment Variables:**
- `SUPER_ADMIN_EMAIL` - Admin email (default: ade@wawagardenbar.com)
- `SUPER_ADMIN_PASSWORD` - Admin password (default: 7XvuvpUi8d4UR90U!)
- `SUPER_ADMIN_USERNAME` - Username (default: superadmin)
- `SUPER_ADMIN_FIRST_NAME` - First name (default: Super)
- `SUPER_ADMIN_LAST_NAME` - Last name (default: Admin)

**When to Use:**
- First-time deployment
- After deleting all users
- Creating additional super-admin accounts

---

### Update Admin Credentials
**Script:** `scripts/update-admin-credentials.ts`

**Purpose:** Updates existing admin user credentials.

**Usage:**
```bash
npx tsx scripts/update-admin-credentials.ts
```

---

## Data Seeding

### Seed Drinks Menu
**Script:** `scripts/seed-drinks-menu.ts`

**Purpose:** Populates the database with 46 drink items including beers, wines, and soft drinks with inventory tracking.

**Usage:**
```bash
# Local
npx tsx scripts/seed-drinks-menu.ts

# Production
docker exec -it food_app npx tsx scripts/seed-drinks-menu.ts
```

**What It Creates:**
- 46 menu items across drink categories
- Inventory records for each item
- Proper category assignments
- Stock levels and tracking

---

### Seed Food Menu
**Script:** `scripts/seed-food-menu.ts`

**Purpose:** Populates the database with 16 Nigerian food items with inventory tracking.

**Usage:**
```bash
# Local
npx tsx scripts/seed-food-menu.ts

# Production
docker exec -it food_app npx tsx scripts/seed-food-menu.ts
```

**What It Creates:**
- 16 food menu items (soups, swallow, rice dishes, etc.)
- Inventory records for each item
- Proper categorization
- Stock levels and tracking

---

### Seed Test Users
**Script:** `scripts/seed-test-users.ts`

**Purpose:** Creates test users for development and testing.

**Usage:**
```bash
npx tsx scripts/seed-test-users.ts
```

**When to Use:**
- Development environment setup
- Testing user flows
- Demo environments

---

## Data Deletion

### Delete Specific Order
**Script:** `scripts/delete-order.ts`

**Purpose:** Deletes a specific order with proper cleanup of inventory, customer stats, payments, and tabs.

**Usage:**
```bash
# Local
npx tsx scripts/delete-order.ts <orderId>

# Production
docker exec -it food_app npx tsx scripts/delete-order.ts <orderId>
```

**What It Does:**
1. Deletes the order record
2. Restores inventory (returns items to stock)
3. Updates customer statistics (totalSpent, totalOrders)
4. Removes payment records
5. Updates tab totals if applicable

**Finding Order IDs:**
```bash
# List recent orders
docker exec -it food_app npx tsx -e "
import { connectDB } from './lib/mongodb';
import OrderModel from './models/order-model';
await connectDB();
const orders = await OrderModel.find().sort({ createdAt: -1 }).limit(10);
orders.forEach(o => console.log(\`\${o.orderNumber} - \${o._id}\`));
process.exit(0);
"
```

**When to Use:**
- Test orders cleanup
- Duplicate orders
- Orders with incorrect data
- Development environment cleanup

**When NOT to Use:**
- For refunds (use refund process)
- For cancellations (use cancel feature)
- For modifications (use edit)

---

### Delete All Users
**Script:** `scripts/delete-all-users.ts`

**Purpose:** Removes all user records from the database.

**Usage:**
```bash
# Local
npx tsx scripts/delete-all-users.ts

# Production
docker exec -it food_app npx tsx scripts/delete-all-users.ts
```

**⚠️ Warning:** This deletes ALL users including admins. Run `create-super-admin.ts` afterwards.

---

### Delete All Menu Items
**Script:** `scripts/delete-all-menu-items.ts`

**Purpose:** Removes all menu item records.

**Usage:**
```bash
# Local
npx tsx scripts/delete-all-menu-items.ts

# Production
docker exec -it food_app npx tsx scripts/delete-all-menu-items.ts
```

**Note:** Run seeding scripts afterwards to repopulate menu.

---

### Delete All Inventory
**Script:** `scripts/delete-all-inventory.ts`

**Purpose:** Removes all inventory records.

**Usage:**
```bash
# Local
npx tsx scripts/delete-all-inventory.ts

# Production
docker exec -it food_app npx tsx scripts/delete-all-inventory.ts
```

**Note:** Inventory will be recreated when seeding menu items.

---

### Delete All Orders
**Script:** `scripts/delete-all-orders.ts`

**Purpose:** Removes all order records.

**Usage:**
```bash
# Local
npx tsx scripts/delete-all-orders.ts

# Production
docker exec -it food_app npx tsx scripts/delete-all-orders.ts
```

**⚠️ Warning:** This affects all historical data and reports.

---

### Delete Food Menu
**Script:** `scripts/delete-food-menu.ts`

**Purpose:** Deletes specific food menu items and their inventory.

**Usage:**
```bash
npx tsx scripts/delete-food-menu.ts
```

---

### Delete User Data
**Script:** `scripts/delete-user-data.ts`

**Purpose:** Deletes specific user data (GDPR compliance).

**Usage:**
```bash
npx tsx scripts/delete-user-data.ts <userId>
```

---

## Maintenance & Utilities

### Clean Orphaned Inventory
**Script:** `scripts/clean-orphaned-inventory.ts`

**Purpose:** Finds and deletes inventory records without corresponding menu items.

**Usage:**
```bash
# Local
npx tsx scripts/clean-orphaned-inventory.ts

# Production
docker exec -it food_app npx tsx scripts/clean-orphaned-inventory.ts
```

**When to Use:**
- After deleting menu items
- Database cleanup
- Fixing data inconsistencies

---

### Link Menu & Inventory
**Script:** `scripts/link-menu-inventory.ts`

**Purpose:** Links menu items with their inventory records bidirectionally.

**Usage:**
```bash
npx tsx scripts/link-menu-inventory.ts
```

**When to Use:**
- After data migration
- Fixing broken relationships
- Database maintenance

---

### Fix Tab Orders
**Script:** `scripts/fix-tab-orders.ts`

**Purpose:** Fixes inconsistencies in tab-order relationships.

**Usage:**
```bash
npx tsx scripts/fix-tab-orders.ts
```

---

### Fix Email Index
**Script:** `scripts/fix-email-index.ts`

**Purpose:** Fixes duplicate email index issues in the database.

**Usage:**
```bash
npx tsx scripts/fix-email-index.ts
```

---

### Migrate Profitability Data
**Script:** `scripts/migrate-profitability-data.ts`

**Purpose:** Migrates and calculates profitability data for existing orders.

**Usage:**
```bash
npx tsx scripts/migrate-profitability-data.ts
```

---

### Cleanup Database
**Script:** `scripts/cleanup-database.ts`

**Purpose:** Comprehensive database cleanup.

**Usage:**
```bash
npx tsx scripts/cleanup-database.ts
```

---

### Quick Cleanup
**Script:** `scripts/quick-cleanup.ts`

**Purpose:** Quick cleanup of test data.

**Usage:**
```bash
npx tsx scripts/quick-cleanup.ts
```

---

### Selective Cleanup
**Script:** `scripts/selective-cleanup.ts`

**Purpose:** Selective cleanup with options.

**Usage:**
```bash
npx tsx scripts/selective-cleanup.ts
```

---

## Diagnostic Scripts

### Check Admin Permissions
**Script:** `scripts/check-admin-permissions.ts`

**Purpose:** Verifies admin user permissions.

**Usage:**
```bash
npx tsx scripts/check-admin-permissions.ts
```

---

### Check Inventory Tracking
**Script:** `scripts/check-inventory-tracking.ts`

**Purpose:** Verifies inventory tracking is enabled for menu items.

**Usage:**
```bash
npx tsx scripts/check-inventory-tracking.ts
```

---

### Check Paid Orders
**Script:** `scripts/check-paid-orders.ts`

**Purpose:** Lists all paid orders.

**Usage:**
```bash
npx tsx scripts/check-paid-orders.ts
```

---

### Check Tab Orders
**Script:** `scripts/check-tab-orders.ts`

**Purpose:** Verifies tab-order relationships.

**Usage:**
```bash
npx tsx scripts/check-tab-orders.ts
```

---

### Verify Cost Data
**Script:** `scripts/verify-cost-data.ts`

**Purpose:** Verifies cost and profitability calculations.

**Usage:**
```bash
npx tsx scripts/verify-cost-data.ts
```

---

### Verify Payment
**Script:** `scripts/verify-payment.ts`

**Purpose:** Verifies payment status and data.

**Usage:**
```bash
npx tsx scripts/verify-payment.ts <paymentReference>
```

---

## Common Workflows

### Fresh Database Setup (Production)
```bash
# Step 1: Delete existing data
docker exec -it food_app npx tsx scripts/delete-all-users.ts
docker exec -it food_app npx tsx scripts/delete-all-menu-items.ts
docker exec -it food_app npx tsx scripts/delete-all-inventory.ts
docker exec -it food_app npx tsx scripts/delete-all-orders.ts

# Step 2: Create super admin
docker exec -it food_app npx tsx scripts/create-super-admin.ts

# Step 3: Seed menu data
docker exec -it food_app npx tsx scripts/seed-drinks-menu.ts
docker exec -it food_app npx tsx scripts/seed-food-menu.ts

# Step 4: Verify
docker exec -it food_app npx tsx scripts/check-inventory-tracking.ts
```

### Database Maintenance
```bash
# Clean orphaned records
docker exec -it food_app npx tsx scripts/clean-orphaned-inventory.ts

# Fix relationships
docker exec -it food_app npx tsx scripts/link-menu-inventory.ts
docker exec -it food_app npx tsx scripts/fix-tab-orders.ts

# Verify data integrity
docker exec -it food_app npx tsx scripts/verify-cost-data.ts
```

---

## Best Practices

### Before Running Scripts

1. **Backup your database** - Always backup before destructive operations
2. **Test in development first** - Understand the impact before production
3. **Verify environment variables** - Ensure all required variables are set
4. **Check database connectivity** - Confirm connection before running

### During Execution

1. **Monitor output** - Watch for errors and warnings
2. **Don't interrupt** - Let scripts complete fully
3. **Check logs** - Review application logs for issues
4. **Verify results** - Confirm expected outcomes

### After Running Scripts

1. **Verify data** - Check that changes are correct
2. **Test functionality** - Ensure app works as expected
3. **Document changes** - Record what was done and why
4. **Monitor metrics** - Watch for unexpected behavior

### Security

1. **Never commit credentials** - Keep passwords out of version control
2. **Use environment variables** - Store sensitive data securely
3. **Limit access** - Only authorized personnel should run scripts
4. **Audit trail** - Log who ran what and when

---

## Troubleshooting

### Connection Errors
```bash
# Verify environment variables
docker exec -it food_app printenv | grep MONGODB

# Test database connection
docker exec -it food_app npx tsx -e "
import { connectDB } from './lib/mongodb';
await connectDB();
console.log('✅ Connected');
process.exit(0);
"
```

### Permission Errors
- Ensure Docker container has proper permissions
- Check file ownership in mounted volumes
- Verify user running commands has access

### Script Failures
1. Check the error message carefully
2. Review script output for warnings
3. Verify all dependencies are installed
4. Check database state before retrying

---

## Support

For issues or questions:
1. Check script output for detailed error messages
2. Review this documentation
3. Check application logs: `docker logs food_app`
4. Verify database connectivity and environment variables
5. Test in development environment first
