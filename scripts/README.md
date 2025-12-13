# Database Scripts

This directory contains scripts for seeding and managing the database.

## Menu Seeding

### Prerequisites

1. Ensure your `.env.local` file has the `MONGODB_URI` variable set
2. Install dependencies: `npm install`

### Drinks Menu Seeding (Complete Bar Menu)

Seeds 46 drink items with full inventory tracking from the actual drinks menu.

```bash
npx tsx scripts/seed-drinks-menu.ts
```

**What it includes:**
- **46 drink items** across multiple categories
- **Full inventory tracking** for all items
- **Categories**: Beer (local/imported), Wine, Whisky, Tequila, Bitters, Liqueur, Energy Drinks, Soft Drinks, Juice, Yoghurt, Malt, Water, Cider, Pre-Mixed Spirits
- **Price range**: ₦300 - ₦35,000
- **Stock levels**: Automatically set based on item type
- **Cost per unit**: Included for profit tracking

**Features:**
- Creates menu items with descriptions and tags
- Sets up inventory records with min/max stock levels
- Configures cost per unit for each item
- Enables "prevent orders when out of stock"
- Shows category breakdown after seeding

### Test Menu Seeding (Sample Items)

Seeds a smaller set of test items for development:

```bash
npm run seed:menu
```

### What it does

The seed script will:
1. Connect to your MongoDB database
2. **Clear all existing menu items** (comment out the `deleteMany` line if you want to keep existing items)
3. Insert 22 menu items across the following categories:
   - **Food (Main Courses)**: 5 items
   - **Drinks (Beer - Local)**: 5 items
   - **Drinks (Beer - Imported)**: 3 items
   - **Drinks (Soft Drinks)**: 9 items

### Menu Items Included

#### Food
- Cow Tail Pepper Soup (₦3,500)
- Asun (₦2,000)
- Jollof Rice (₦500/portion with double portion option)
- Grilled Chicken (₦2,500)
- Noodles with Eggs (₦2,000 with customization options)

#### Drinks - Beer (Local)
- Big Stout (₦2,000)
- Small Stout (₦1,200)
- Trophy Lager (₦1,200)
- Goldberg Lager (₦1,200)
- Maltina (₦1,000)

#### Drinks - Beer (Imported)
- Heineken (₦1,500)
- Big Smirnoff Ice (₦1,500)
- Small Smirnoff Ice (₦1,200)

#### Drinks - Soft Drinks
- 5 Alive Pulpy Orange (₦1,500)
- 5 Alive Active (₦2,500)
- Power Horse Energy Drink (₦3,000)
- Commando Energy Drink Small (₦500)
- Pepsi (₦700)
- Coca-Cola (₦700)
- Sweetened Yogurt (₦2,500)
- Vanilla Yogurt (₦2,500)

### Customization Options

Some items include customization options:
- **Jollof Rice**: Single or Double portion
- **Noodles with Eggs**: Single/Double noodles, Single/Double eggs

### Modifying the Script

To keep existing menu items instead of clearing them:

1. Open `/scripts/seed-menu.ts`
2. Comment out or remove these lines:
   ```typescript
   console.log('Clearing existing menu items...');
   await MenuItemModel.deleteMany({});
   console.log('Existing menu items cleared');
   ```

To add more items or modify existing ones, edit the `menuItems` array in `/scripts/seed-menu.ts`.

### Troubleshooting

**Error: MONGODB_URI environment variable is not set**
- Ensure your `.env.local` file exists and contains `MONGODB_URI`

**Error: Cannot find module 'tsx'**
- Run `npm install` to install all dependencies including tsx

**Connection timeout**
- Check your MongoDB connection string
- Ensure your IP is whitelisted in MongoDB Atlas (if using cloud)

## User Data Deletion

### Usage

To delete all orders and tabs for a specific user:

```bash
npm run delete:user-data <email>
```

**Example:**
```bash
npm run delete:user-data adekunle@gmail.com
```

### What it does

The script will:
1. Find the user by email address
2. Delete all orders associated with the user (both registered and guest orders)
3. Delete all tabs associated with the user (both registered and guest tabs)
4. Provide a summary of deleted items

### Safety Features

- Validates that the user exists before proceeding
- Shows a summary of what will be deleted before execution
- Handles both registered users (by userId) and guest orders (by email)
- Properly closes database connection

### Output Example

```
🗑️  Deleting data for user: adekunle@gmail.com (ID: 507f1f77bcf86cd799439011)
📦 Deleted 5 orders
📋 Deleted 2 tabs
📦 Deleted 3 guest orders with email adekunle@gmail.com
📋 Deleted 1 guest tabs with email adekunle@gmail.com

✅ User data deletion completed successfully!

📊 Summary for adekunle@gmail.com:
   - Orders: 5 (registered) + 3 (guest)
   - Tabs: 2 (registered) + 1 (guest)
```

## Database Cleanup Scripts

### 1. Full Cleanup (With Confirmation)

Deletes ALL menu items, inventory, tabs, and orders with safety confirmation.

```bash
npx tsx scripts/cleanup-database.ts
```

**Features:**
- Shows current database counts before deletion
- Requires typing "DELETE" to confirm
- Displays summary of deleted items
- Verifies cleanup was successful

**Use when:** You want to completely reset the database with safety checks.

---

### 2. Selective Cleanup (Interactive)

Choose which collections to delete with interactive prompts.

```bash
npx tsx scripts/selective-cleanup.ts
```

**Features:**
- Shows counts for each collection
- Lets you choose what to delete (Menu Items, Inventory, Tabs, Orders)
- Requires confirmation before deletion
- Only deletes selected collections

**Use when:** You want to clean specific collections but keep others.

---

### 3. Quick Cleanup (No Confirmation)

⚠️ **WARNING:** Immediately deletes ALL data without confirmation!

```bash
npx tsx scripts/quick-cleanup.ts
```

**Features:**
- No confirmation required
- Fast execution
- Shows before/after counts
- Verifies cleanup

**Use when:** 
- Running automated tests
- You're absolutely sure you want to delete everything
- Development environment only

---

### Cleanup Script Comparison

| Script | Confirmation | Collections | Speed | Use Case |
|--------|-------------|-------------|-------|----------|
| `cleanup-database.ts` | ✅ Yes (type "DELETE") | All | Normal | Safe manual cleanup |
| `selective-cleanup.ts` | ✅ Yes (interactive) | Choose | Normal | Partial cleanup |
| `quick-cleanup.ts` | ❌ No | All | Fast | Automated testing |

---

### What Gets Deleted

All cleanup scripts can delete:
- **Menu Items** - All dishes, drinks, and food items
- **Inventory** - All inventory tracking records
- **Tabs** - All open and closed tabs
- **Orders** - All orders (dine-in, pickup, delivery)

**Note:** User accounts, rewards, and settings are NOT deleted by these scripts.

---

### Safety Tips

1. **Always backup** before running cleanup scripts in production
2. **Use confirmation scripts** (`cleanup-database.ts` or `selective-cleanup.ts`) for manual cleanup
3. **Reserve quick-cleanup** for test environments only
4. **Check counts** before confirming deletion
5. **Verify** the cleanup completed successfully

---

### Example Usage

**Reset entire database:**
```bash
npx tsx scripts/cleanup-database.ts
# Type "DELETE" when prompted
```

**Delete only orders and tabs:**
```bash
npx tsx scripts/selective-cleanup.ts
# Answer 'n' for Menu Items
# Answer 'n' for Inventory  
# Answer 'y' for Tabs
# Answer 'y' for Orders
# Type "DELETE" to confirm
```

**Quick cleanup for testing:**
```bash
npx tsx scripts/quick-cleanup.ts
# No confirmation needed - deletes immediately
```
