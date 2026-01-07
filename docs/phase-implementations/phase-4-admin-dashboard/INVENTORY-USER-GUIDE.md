# Inventory Management User Guide

**Wawa Garden Bar - Admin Dashboard**  
**Version:** 1.0  
**Last Updated:** November 17, 2025

---

## Table of Contents

1. [Overview](#overview)
2. [Creating Menu Items with Inventory](#creating-menu-items-with-inventory)
3. [Viewing Inventory Dashboard](#viewing-inventory-dashboard)
4. [Managing Stock Levels](#managing-stock-levels)
5. [Understanding Stock Alerts](#understanding-stock-alerts)
6. [Reading Stock History](#reading-stock-history)
7. [Best Practices](#best-practices)
8. [Troubleshooting](#troubleshooting)

---

## Overview

The Inventory Management System helps you track stock levels, manage restocking, monitor waste, and ensure you never run out of popular items. The system automatically deducts stock when orders are completed and sends alerts when items are running low.

### Key Features

- ✅ **Automatic Stock Deduction** - Stock is automatically reduced when orders are completed
- ✅ **Low Stock Alerts** - Email notifications when items reach minimum threshold
- ✅ **Manual Adjustments** - Add, deduct, or adjust stock levels
- ✅ **Complete History** - Track every stock movement with full audit trail
- ✅ **Analytics Ready** - Calculate sales velocity, turnover, and profit margins
- ✅ **Optional Tracking** - Choose which items to track

---

## Creating Menu Items with Inventory

### Step 1: Navigate to Menu Management

1. Log in to the admin dashboard
2. Click **Menu** in the sidebar
3. Click **Add New Menu Item** button

### Step 2: Fill in Basic Information

1. **Name** - Enter the item name (e.g., "Jollof Rice")
2. **Description** - Describe the item
3. **Main Category** - Select Food or Drinks
4. **Category** - Select specific category (e.g., Main Courses)
5. **Price** - Enter selling price in Naira
6. **Preparation Time** - Estimated cooking time in minutes
7. **Tags** - Add searchable tags (comma-separated)

### Step 3: Enable Inventory Tracking

1. Scroll to the **Inventory Tracking** section
2. Toggle the switch to **ON**
3. The inventory fields will appear

### Step 4: Configure Inventory Settings

**Required Fields:**
- **Initial Stock** - How many units you currently have (e.g., 50)
- **Unit** - Select measurement unit:
  - Portions (for plated meals)
  - Bottles (for drinks)
  - Pieces (for individual items)
  - Kilograms (for bulk items)
  - Liters (for liquids)
  - Units (generic)

**Optional Fields:**
- **Minimum Stock** - Alert threshold (default: 10)
  - You'll receive an email when stock falls below this level
- **Maximum Stock** - Target reorder level (default: 100)
  - Used for calculating reorder quantities
- **Cost Per Unit** - Your cost price (for profit tracking)
- **Supplier** - Default supplier name
- **Prevent Orders When Out of Stock** - Toggle to block orders when stock is 0

### Step 5: Save the Item

1. Click **Create Menu Item**
2. The system will:
   - Create the menu item
   - Create an inventory record
   - Link them together
   - Add initial stock to history
   - Log the action in audit trail

**Success!** Your item is now being tracked.

---

## Viewing Inventory Dashboard

### Accessing the Dashboard

1. Click **Inventory** in the sidebar
2. You'll see a table with all tracked items

### Understanding the Table

**Columns:**
- **Item Name** - Menu item name
- **Category** - Food/Drinks classification
- **Current Stock** - How many units you have now
- **Min/Max** - Minimum and maximum thresholds
- **Stock Level** - Visual progress bar showing percentage
- **Status** - Color-coded status badge:
  - 🟢 **In Stock** - Above minimum threshold
  - 🟡 **Low Stock** - At or below minimum threshold
  - 🔴 **Out of Stock** - Zero units remaining
- **Actions** - View Details button

### Viewing Item Details

1. Click **View Details** on any item
2. You'll see:
   - **Current stock** with status badge
   - **Total sales** (lifetime)
   - **Total waste** with cost
   - **Stock level percentage** with progress bar
   - **Supplier information**
   - **Cost and value data**
   - **Last restocked date**
   - **Last sale date**
   - **Stock adjustment buttons**
   - **Complete stock history**

---

## Managing Stock Levels

### Adding Stock (Restocking)

**When to use:** Receiving new inventory from suppliers

1. Go to inventory detail page
2. Click **Add Stock** button
3. Fill in the form:
   - **Quantity*** - How many units received (e.g., 50)
   - **Reason*** - Why you're adding stock (e.g., "Weekly restock")
   - **Supplier** - Who supplied the items
   - **Invoice Number** - Reference number
   - **Cost Per Unit** - What you paid per unit
   - **Notes** - Any additional information
4. Click **Add Stock**

**What happens:**
- Stock increases by the quantity
- `lastRestocked` date is updated
- `totalRestocked` counter increases
- Stock history entry is created
- Status is recalculated
- Audit log is created

### Deducting Stock (Waste/Damage)

**When to use:** Recording spoilage, damage, theft, or other losses

1. Go to inventory detail page
2. Click **Deduct Stock** button
3. Fill in the form:
   - **Quantity*** - How many units lost (e.g., 5)
   - **Category*** - Select reason:
     - Waste/Spoilage - Expired or spoiled items
     - Damage - Broken or damaged items
     - Theft - Stolen items
     - Other - Other reasons
   - **Reason*** - Specific explanation (e.g., "Items expired")
   - **Notes** - Additional details
4. Click **Deduct Stock**

**What happens:**
- Stock decreases by the quantity
- `totalWaste` counter increases
- Stock history entry is created
- Status is recalculated
- Low stock alert may be triggered
- Audit log is created

### Adjusting Stock (Corrections)

**When to use:** Physical inventory counts, corrections, discrepancies

1. Go to inventory detail page
2. Click **Adjust Stock** button
3. Fill in the form:
   - **Current Stock** - Shows current level (read-only)
   - **New Stock Level*** - What it should be (e.g., 45)
   - **Difference** - Automatically calculated
   - **Reason*** - Why you're adjusting (e.g., "Physical count")
4. Click **Adjust Stock**

**What happens:**
- Stock is set to the new level
- Difference is calculated automatically
- Stock history entry is created
- Status is recalculated
- Low stock alert may be triggered
- Audit log is created

---

## Understanding Stock Alerts

### Email Notifications

**When you receive an alert:**
- Item has reached or fallen below minimum stock
- Email is sent to `ADMIN_ALERT_EMAIL` (configured in .env)

**Email contains:**
- Item name
- Current stock level
- Minimum stock threshold
- Suggested reorder quantity
- Last restocked date
- Link to inventory dashboard

### Suggested Reorder Quantity

The system calculates this based on:
- **Sales velocity** - Average daily sales over last 30 days
- **Days until restock** - Assumed 7 days (configurable)
- **Current stock** - What you have now
- **Minimum stock** - Your safety threshold

**Formula:**
```
Suggested Reorder = (Velocity × Days) + Minimum - Current
```

**Example:**
- Sales velocity: 5 units/day
- Days until restock: 7 days
- Minimum stock: 10 units
- Current stock: 8 units

```
Suggested = (5 × 7) + 10 - 8 = 37 units
```

### Preventing Out-of-Stock Orders

If you enabled **"Prevent orders when out of stock"**:
- Customers cannot order the item when stock is 0
- Item appears as "Unavailable" in the menu
- Orders are automatically blocked

If disabled (default):
- Customers can still order even when stock is 0
- Useful for made-to-order items
- You'll still receive low stock alerts

---

## Reading Stock History

### Accessing History

1. Go to inventory detail page
2. Scroll to **Stock Movement History** section
3. View complete chronological list

### Understanding History Entries

**Columns:**
- **Date & Time** - When the change occurred
- **Type** - Movement type with icon:
  - 📈 **Addition** (green) - Stock added
  - 📉 **Deduction** (red) - Stock removed
  - ✏️ **Adjustment** (blue) - Stock corrected
- **Quantity** - Amount changed (+ or -)
- **Reason** - Why it changed
- **Performed By** - Who made the change (or "System")
- **Details** - Additional information:
  - Supplier name
  - Invoice number
  - Notes
  - Order reference (for sales)

### Special Entries

**Initial Stock:**
- Created when item is first set up
- Type: Addition
- Category: Restock
- Reason: "Initial stock"

**Automatic Sales:**
- Created when order is completed
- Type: Deduction
- Category: Sale
- Performed By: System
- Includes order reference

---

## Best Practices

### Setting Stock Levels

**Minimum Stock:**
- Set to 2-3 days of average sales
- Higher for slow-moving items
- Lower for fast-moving items
- Consider lead time from supplier

**Maximum Stock:**
- Set to 1-2 weeks of average sales
- Consider storage space
- Consider shelf life
- Avoid over-ordering

**Example for Jollof Rice:**
- Average sales: 20 portions/day
- Lead time: 2 days
- Shelf life: 1 day (made fresh)

```
Minimum: 20 × 2 = 40 portions
Maximum: 20 × 7 = 140 portions
```

### Regular Tasks

**Daily:**
- ✅ Check low stock alerts
- ✅ Review out-of-stock items
- ✅ Record any waste/damage

**Weekly:**
- ✅ Physical inventory count for high-value items
- ✅ Review stock history for anomalies
- ✅ Adjust min/max levels based on trends
- ✅ Place restock orders

**Monthly:**
- ✅ Full physical inventory count
- ✅ Review waste percentages
- ✅ Analyze sales velocity trends
- ✅ Update cost per unit prices
- ✅ Review profit margins

### Waste Reduction

**Track everything:**
- Record all waste with specific reasons
- Categorize properly (spoilage vs damage)
- Add notes for patterns

**Analyze trends:**
- Which items have high waste?
- What are the common reasons?
- Can you adjust ordering?

**Take action:**
- Reduce order quantities for high-waste items
- Improve storage conditions
- Train staff on proper handling
- Adjust menu based on waste data

---

## Troubleshooting

### Stock Not Deducting Automatically

**Problem:** Completed order but stock didn't decrease

**Solutions:**
1. Check if item has inventory tracking enabled
2. Verify item is linked to inventory record
3. Check order status is "completed"
4. Look for `inventoryDeducted: true` in order details
5. Check server logs for errors

**Manual fix:**
1. Go to inventory detail page
2. Click **Deduct Stock**
3. Enter quantity from order
4. Reason: "Manual deduction for order #[number]"
5. Add order number in notes

### Low Stock Alert Not Received

**Problem:** Stock is low but no email received

**Solutions:**
1. Check `ADMIN_ALERT_EMAIL` is set in .env
2. Verify SMTP settings are correct
3. Check spam/junk folder
4. Test email with `npm run test:email`
5. Check server logs for email errors

**Workaround:**
- Check inventory dashboard daily
- Look for yellow/red status badges

### Stock Count Discrepancy

**Problem:** Physical count doesn't match system

**Solutions:**
1. Do a complete physical count
2. Use **Adjust Stock** to correct
3. Document reason (e.g., "Monthly physical count")
4. Investigate cause:
   - Missing waste entries?
   - Unreported damage?
   - Theft?
   - System error?

### Cannot Create Menu Item with Inventory

**Problem:** Error when saving menu item

**Solutions:**
1. Check all required fields are filled
2. Verify initial stock is greater than 0
3. Ensure unit is selected
4. Check for duplicate item names
5. Review browser console for errors

---

## Support

### Getting Help

**Documentation:**
- Technical docs: `/docs/Phase 4: Admin Dashboard/`
- API docs: `/docs/API-DOCUMENTATION.md`
- Feature specs: `/docs/Phase 4: Admin Dashboard/FEATURE-4.2.2-SPEC.md`

**Contact:**
- Email: support@wawagardenbar.com
- Phone: [Your phone number]
- Hours: Monday-Friday, 9am-5pm

### Reporting Issues

When reporting a problem, include:
1. What you were trying to do
2. What happened instead
3. Error messages (if any)
4. Screenshots
5. Item name and ID
6. Date and time

---

## Appendix

### Keyboard Shortcuts

- `Ctrl/Cmd + K` - Quick search
- `Ctrl/Cmd + /` - Toggle sidebar
- `Esc` - Close dialogs

### Status Colors

- 🟢 Green - In stock (above minimum)
- 🟡 Yellow - Low stock (at or below minimum)
- 🔴 Red - Out of stock (zero units)

### Units Guide

| Unit | Best For | Example Items |
|------|----------|---------------|
| Portions | Plated meals | Jollof Rice, Fried Rice |
| Bottles | Bottled drinks | Beer, Wine, Soft Drinks |
| Pieces | Individual items | Chicken pieces, Samosas |
| Kilograms | Bulk ingredients | Rice, Flour |
| Liters | Liquid ingredients | Cooking oil, Milk |
| Units | Generic items | Plates, Cutlery |

---

**End of User Guide**

*For technical documentation, see FEATURE-4.2.2-SPEC.md*  
*For implementation details, see FEATURE-4.2.2-COMPLETE.md*
