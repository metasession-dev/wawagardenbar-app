# Drinks Menu Seeding Documentation

## Overview

The `seed-drinks-menu.ts` script populates your database with **46 drink items** from the actual Wawa Garden Bar drinks menu, complete with inventory tracking.

## Quick Start

```bash
npx tsx scripts/seed-drinks-menu.ts
```

## What Gets Created

### Menu Items (46 total)

Each drink is created as a menu item with:
- ✅ Name and description
- ✅ Category and main category
- ✅ Price (₦300 - ₦35,000)
- ✅ Preparation time (5 minutes)
- ✅ Tags for filtering
- ✅ Availability status

### Inventory Records (46 total)

Each drink gets an inventory record with:
- ✅ Current stock level
- ✅ Minimum stock threshold
- ✅ Maximum stock capacity
- ✅ Unit type (bottles, cartons)
- ✅ Cost per unit (for profit tracking)
- ✅ "Prevent orders when out of stock" enabled

## Drink Categories

### Beer (Local) - 10 items
- Gulder (₦1,500)
- 33 (₦1,300)
- Guinness Small/Medium/Big Stout (₦1,200 - ₦2,000)
- Orijin Beer (₦1,500)
- Trophy Stout (₦1,300)
- Trophy (₦1,300)
- Goldberg (₦1,300)
- Star Radler (₦1,200)

### Beer (Imported) - 4 items
- Budweiser (₦1,500)
- Heineken (₦2,000)
- Desperados (₦1,500)
- Tiger (₦1,300)

### Bitters - 4 items
- Action Bitters Small/Big (₦1,500 / ₦5,000)
- Orijin Small/Big (₦1,500 / ₦5,000)

### Liqueur - 2 items
- Cream Best Small/Big (₦2,500 / ₦9,000)

### Pre-Mixed Spirit Drinks - 3 items
- Smirnoff Ice Small/Big (₦1,200 / ₦2,000)
- Black Bullet (₦3,000)

### Wine - 2 items
- 4th Street Wine (₦7,000)
- Baron (₦6,000)

### Whisky - 5 items
- Whiskey Best Small/Big (₦3,000 / ₦6,000)
- William Lawson (₦15,000)
- Jameson (₦35,000)
- Sierra Tequila (₦16,000)

### Energy Drinks - 3 items
- Power Horse (₦3,000)
- Super Commando Small (₦500)
- Fearless (₦1,000)

### Juice - 2 items
- 5 Alive Pulpy (₦1,500)
- Chi Active (₦2,500)

### Yoghurt - 2 items
- Hollandia Plain (₦2,500)
- Hollandia Vanilla (₦2,500)

### Soft Drinks - 4 items
- Coke (₦700)
- Pepsi (₦700)
- Fanta (₦700)
- Zobo (₦1,000)

### Malt - 1 item
- Maltina (₦1,000)

### Cider - 1 item
- Flying Fish (₦1,500)

### Water - 1 item
- C-Water (₦300)

### Tequila - 1 item
- Sierra Tequila (₦16,000)

## Stock Levels

Stock levels are set based on item type and popularity:

| Item Type | Initial Stock | Min | Max | Unit |
|-----------|--------------|-----|-----|------|
| Popular Beers | 120 | 15 | 120 | bottles |
| Standard Beers | 60-100 | 15 | 60-100 | bottles |
| Premium Spirits | 6 | 2 | 6 | bottles |
| Small Spirits | 24 | 2-4 | 24 | bottles |
| Soft Drinks | 60 | 6 | 60 | bottles |
| Energy Drinks | 60-64 | 4-6 | 60-64 | bottles |
| Juice/Yoghurt | 30 | 3-6 | 30 | bottles/cartons |
| Water | 120 | 24 | 120 | bottles |

## Cost Per Unit

Each item includes cost per unit for profit margin tracking:

**Example:**
- Heineken: ₦2,000 (selling price) - ₦1,050 (cost) = ₦950 profit per bottle
- Profit margin: 47.5%

## Usage Examples

### Basic Seeding
```bash
npx tsx scripts/seed-drinks-menu.ts
```

### With Cleanup First
```bash
# Clear existing drinks first
npx tsx scripts/cleanup-database.ts

# Then seed drinks
npx tsx scripts/seed-drinks-menu.ts
```

### Selective Cleanup + Seed
```bash
# Delete only menu items and inventory
npx tsx scripts/selective-cleanup.ts
# Answer 'y' for Menu Items and Inventory

# Seed drinks
npx tsx scripts/seed-drinks-menu.ts
```

## Output Example

```
🍺 Seeding Drinks Menu and Inventory

✅ Connected to database

📦 Creating 46 drink items...

✅ Created menu item: Gulder (₦1,500)
   📊 Created inventory: 120 bottles

✅ Created menu item: Heineken (₦2,000)
   📊 Created inventory: 120 bottles

... (44 more items)

✅ Seeding complete!

📊 Summary:
   Menu items created: 46
   Inventory records created: 46
   Total drinks: 46

📋 Category Breakdown:
   Beer (local): 10 items
   Whisky: 5 items
   Beer (imported): 4 items
   Bitters: 4 items
   Soft Drink: 4 items
   Energy Drink: 3 items
   Pre-Mixed Spirit Drink: 3 items
   Wine: 2 items
   Liqueur: 2 items
   Juice: 2 items
   Yoghurt: 2 items
   Cider: 1 items
   Malt: 1 items
   Tequila: 1 items
   Water: 1 items
   Healthy Soft Drink: 1 items
```

## Customization

### Keep Existing Items

To add drinks without deleting existing items, the script is already configured to NOT delete by default.

### Clear Before Seeding

To clear drinks before seeding, uncomment these lines in the script:

```typescript
// Uncomment these lines:
console.log('🗑️  Clearing existing drinks...');
await MenuItemModel.deleteMany({ mainCategory: 'Drinks' });
await InventoryModel.deleteMany({});
console.log('✅ Cleared existing drinks\n');
```

### Modify Drinks

Edit the `drinksMenu` array in `/scripts/seed-drinks-menu.ts` to:
- Change prices
- Adjust stock levels
- Update descriptions
- Add/remove items
- Modify categories

## Data Source

All drink data is sourced from `/docs/drinks menu.md` which contains the official Wawa Garden Bar drinks menu with:
- Accurate pricing
- Stock levels
- Cost per unit
- Category classifications

## Integration

After seeding, drinks will:
- ✅ Appear in the menu page (`/menu`)
- ✅ Be available for ordering
- ✅ Show in inventory management (`/dashboard/inventory`)
- ✅ Track stock levels automatically
- ✅ Prevent orders when out of stock
- ✅ Calculate profit margins in reports

## Troubleshooting

### Error: Duplicate key error
**Cause:** Items with same name already exist  
**Solution:** Run cleanup script first or enable the delete lines in the seed script

### Error: Environment variable not defined
**Cause:** Missing `.env.local` file  
**Solution:** Ensure `.env.local` exists with `MONGODB_WAWAGARDENBAR_APP_URI`

### Items not showing in menu
**Cause:** Items might be marked as unavailable  
**Solution:** Check `available` field in database or re-run seed script

### Inventory not tracking
**Cause:** Inventory records not created  
**Solution:** Verify inventory records exist in database, re-run seed script

## Related Scripts

- `cleanup-database.ts` - Clear all data before seeding
- `selective-cleanup.ts` - Clear only menu items and inventory
- `seed-menu.ts` - Seed test menu items (smaller set)

## Best Practices

1. **Backup first** - Always backup production data before seeding
2. **Test environment** - Test seeding in development first
3. **Verify data** - Check menu and inventory after seeding
4. **Update prices** - Keep the script updated with current prices
5. **Monitor stock** - Adjust initial stock levels based on actual usage

---

**Created:** December 13, 2025  
**Source:** `/docs/drinks menu.md`  
**Items:** 46 drinks  
**Status:** ✅ Ready to use
