# Menu System Testing Guide

## 🚀 Quick Start

### 1. Start Development Server
```bash
npm run dev
```

### 2. Visit Menu Page
```
http://localhost:3000/menu
```

---

## ⚠️ Important: Database Setup Required

The menu system requires MongoDB with menu items and inventory data.

### Option 1: Use Existing Data
If you already have menu items in your database, the menu will display them automatically.

### Option 2: Create Sample Data

Create a seed script to populate test data:

```typescript
// scripts/seed-menu.ts
import { connectDB } from '@/lib/mongodb';
import MenuItem from '@/models/menu-item-model';
import Inventory from '@/models/inventory-model';

async function seedMenu() {
  await connectDB();

  // Create sample menu items
  const burger = await MenuItem.create({
    name: 'Classic Burger',
    description: 'Juicy beef patty with lettuce, tomato, and special sauce',
    mainCategory: 'food',
    category: 'mains',
    price: 2500,
    images: ['/placeholder.svg?height=400&width=400'],
    isAvailable: true,
    preparationTime: 15,
    tags: ['popular', 'beef'],
    allergens: ['gluten', 'dairy'],
    nutritionalInfo: {
      calories: 650,
      protein: 30,
      carbs: 45,
      fat: 35,
    },
  });

  // Create inventory for burger
  await Inventory.create({
    menuItemId: burger._id,
    currentStock: 20,
    minimumStock: 5,
    status: 'in-stock',
  });

  console.log('Sample menu items created!');
}

seedMenu();
```

---

## 🧪 Test Scenarios

### Scenario 1: Browse All Items

1. Visit `/menu`
2. **Expected:**
   - See loading skeleton briefly
   - See all menu items in grid
   - See category navigation tabs
   - Items display with images, prices, descriptions

### Scenario 2: Filter by Main Category

1. Click "Drinks" tab
2. **Expected:**
   - URL changes to `/menu?mainCategory=drinks`
   - Only drink items display
   - Drink subcategories show (Beer, Wine, etc.)

3. Click "Food" tab
4. **Expected:**
   - URL changes to `/menu?mainCategory=food`
   - Only food items display
   - Food subcategories show (Starters, Mains, Desserts)

### Scenario 3: Filter by Subcategory

1. Click "Drinks" tab
2. Click "Beer" filter button
3. **Expected:**
   - URL changes to `/menu?category=beer`
   - Only beer items display
   - "Beer" button is highlighted
   - "Filtered by: Beer" badge appears

### Scenario 4: View Item Details

1. Click on any menu item card
2. **Expected:**
   - Modal opens with full item details
   - See large image
   - See nutritional information
   - See allergen warnings
   - See preparation time
   - See quantity selector
   - See special instructions field

### Scenario 5: Add to Cart (Placeholder)

1. Open item detail modal
2. Change quantity to 2
3. Add special instructions: "No onions"
4. Click "Add to Cart"
5. **Expected:**
   - Toast notification: "Added to Cart"
   - Modal closes
   - (Cart functionality will be in Phase 2.3)

### Scenario 6: Stock Status Display

**In Stock:**
- Item displays normally
- No stock badges
- "Add to Cart" button enabled

**Low Stock:**
- Yellow "Low Stock" badge on card
- Warning in modal: "Only X left"
- Quantity limited to available stock

**Out of Stock:**
- "Out of Stock" overlay on card image
- Card slightly faded (60% opacity)
- "Add to Cart" button disabled
- Modal shows "Out of Stock" warning

### Scenario 7: Mobile Responsiveness

1. Resize browser to mobile width (<640px)
2. **Expected:**
   - Items display in single column
   - Category tabs stack properly
   - Filter buttons wrap to multiple rows
   - Modal is full-screen
   - Touch-friendly button sizes

### Scenario 8: Image Optimization

1. Open DevTools Network tab
2. Reload menu page
3. **Expected:**
   - Images load as WebP format
   - Responsive images (different sizes for different screens)
   - Images lazy load as you scroll
   - Placeholder shown while loading

---

## 🔍 What to Check

### Visual Elements

- [ ] Menu items display in grid layout
- [ ] Images are properly sized and cropped
- [ ] Prices are formatted as ₦2,500
- [ ] Tags display as badges
- [ ] Stock status badges are visible
- [ ] Hover effects work on cards
- [ ] Modal opens smoothly

### Functionality

- [ ] Category tabs change URL
- [ ] Filter buttons work
- [ ] Active filters are highlighted
- [ ] Item cards are clickable
- [ ] Modal opens/closes properly
- [ ] Quantity selector works
- [ ] Special instructions textarea works
- [ ] Add to Cart shows toast

### Performance

- [ ] Page loads quickly
- [ ] Loading skeleton appears first
- [ ] Images load progressively
- [ ] No layout shift
- [ ] Smooth transitions

### Responsive Design

- [ ] Works on mobile (< 640px)
- [ ] Works on tablet (640-1024px)
- [ ] Works on desktop (> 1024px)
- [ ] Touch targets are large enough
- [ ] Text is readable on all sizes

---

## 🐛 Troubleshooting

### Issue: No Items Display

**Possible Causes:**
1. No menu items in database
2. MongoDB connection error
3. All items have `isAvailable: false`

**Solutions:**
1. Check MongoDB connection in `.env.local`
2. Run seed script to create sample data
3. Check browser console for errors
4. Check server logs for database errors

### Issue: Images Not Loading

**Possible Causes:**
1. Image URLs are invalid
2. Next.js Image domains not configured
3. Images don't exist

**Solutions:**
1. Use placeholder images: `/placeholder.svg?height=400&width=400`
2. Configure `next.config.js` for external image domains
3. Check image URLs in database

### Issue: Stock Status Not Showing

**Possible Causes:**
1. No inventory records in database
2. Inventory not linked to menu items

**Solutions:**
1. Create inventory records for menu items
2. Ensure `menuItemId` matches menu item `_id`
3. Check inventory status values

### Issue: Categories Not Filtering

**Possible Causes:**
1. Category values don't match
2. URL params not working

**Solutions:**
1. Check category values in database match filter buttons
2. Check browser console for navigation errors
3. Verify `nuqs` is properly configured in Providers

---

## 📊 Expected Behavior Summary

| Action | Expected Result |
|--------|----------------|
| Visit `/menu` | Show all items, loading skeleton first |
| Click "Drinks" | Filter to drinks only |
| Click "Beer" | Filter to beer only, URL: `/menu?category=beer` |
| Click item card | Open detail modal |
| Change quantity | Update total price |
| Add to cart | Show toast, close modal |
| Out of stock item | Disabled button, overlay on image |
| Low stock item | Yellow badge, quantity limit |
| Mobile view | Single column, full-screen modal |

---

## ✅ Checklist Before Moving to Phase 2.3

- [ ] Menu page loads successfully
- [ ] Items display in grid
- [ ] Category filtering works
- [ ] Item details modal works
- [ ] Stock status displays correctly
- [ ] Images are optimized
- [ ] Mobile responsive
- [ ] No console errors
- [ ] Performance is good (< 2s load)

---

## 🚀 Next: Phase 2.3 - Shopping Cart

Once menu browsing is working, you'll implement:
- Cart state management (Zustand)
- Add/remove items from cart
- Cart sidebar
- Cart persistence (localStorage)
- Order summary

---

*Testing guide created: November 14, 2025*
