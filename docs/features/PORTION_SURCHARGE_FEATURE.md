# Portion Surcharge Feature

## Overview

The Portion Surcharge feature allows administrators to add a fixed surcharge amount to half (50%) and quarter (25%) portion sizes when creating or editing menu items. This provides flexibility in pricing portion sizes beyond simple percentage-based calculations.

## Feature Description

When a menu item has portion options enabled (half or quarter portions), administrators can now specify an optional fixed surcharge that will be added to the calculated portion price.

### Pricing Formula

**Without Surcharge:**
- Half Portion Price = Full Price × 50%
- Quarter Portion Price = Full Price × 25%

**With Surcharge:**
- Half Portion Price = (Full Price × 50%) + Half Portion Surcharge
- Quarter Portion Price = (Full Price × 25%) + Quarter Portion Surcharge

### Example

For a menu item with a full price of ₦10,000:

**Without Surcharge:**
- Full Portion: ₦10,000
- Half Portion: ₦5,000
- Quarter Portion: ₦2,500

**With Surcharge (Half: ₦500, Quarter: ₦300):**
- Full Portion: ₦10,000
- Half Portion: ₦5,500 (₦5,000 + ₦500)
- Quarter Portion: ₦2,800 (₦2,500 + ₦300)

## User Interface

### Admin Menu Item Forms

#### Creating a New Menu Item

1. Navigate to **Dashboard → Menu → New Item**
2. Fill in basic menu item details (name, category, price, etc.)
3. Scroll to the **Portion Options** section (only visible for food items)
4. Enable **Half Portion (50%)** or **Quarter Portion (25%)** using the toggle switch
5. When enabled, a **Surcharge (optional)** input field appears
6. Enter the fixed surcharge amount (e.g., 500 for ₦500)
7. The calculated portion price is displayed below, showing the formula used

**UI Elements:**
- **Toggle Switch**: Enable/disable portion option
- **Surcharge Input**: Numeric input field (min: 0, step: 50)
- **Price Preview**: Shows calculated price with breakdown
  - Example: "₦5,500" with subtitle "50% of full price + ₦500 surcharge"

#### Editing an Existing Menu Item

1. Navigate to **Dashboard → Menu**
2. Click on a menu item to edit
3. Scroll to the **Portion Options** section
4. Modify surcharge values as needed
5. The price preview updates in real-time as you type

### Customer-Facing Display

#### Menu Item Card

When browsing the menu, items with portion options display:
- **"from ₦X,XXX"** badge showing the lowest available price (including surcharge)
- The lowest price is calculated as the quarter portion price (if enabled) or half portion price

#### Menu Item Detail Modal

When viewing item details:
1. **Portion Size Selector** displays all available options with prices:
   - Full Portion: ₦10,000
   - Half Portion (50%): ₦5,500
   - Quarter Portion (25%): ₦2,800
2. Prices shown include the surcharge
3. Selected portion affects the total price calculation

## Technical Implementation

### Database Schema

**Menu Item Model** (`models/menu-item-model.ts`):

```typescript
portionOptions: {
  halfPortionEnabled: { type: Boolean, default: false },
  halfPortionSurcharge: { type: Number, default: 0, min: 0 },
  quarterPortionEnabled: { type: Boolean, default: false },
  quarterPortionSurcharge: { type: Number, default: 0, min: 0 },
}
```

### Interface Definition

**IMenuItem Interface** (`interfaces/menu-item.interface.ts`):

```typescript
portionOptions: {
  halfPortionEnabled: boolean;
  halfPortionSurcharge: number;
  quarterPortionEnabled: boolean;
  quarterPortionSurcharge: number;
};
```

### Price Calculation Logic

**Menu Item Detail Modal** (`components/features/menu/menu-item-detail-modal.tsx`):

```typescript
useEffect(() => {
  if (item.portionOptions?.halfPortionEnabled && portionSize === 'half') {
    const basePrice = Math.round(item.price * 0.5);
    const surcharge = item.portionOptions?.halfPortionSurcharge || 0;
    setAdjustedPrice(basePrice + surcharge);
  } else if (item.portionOptions?.quarterPortionEnabled && portionSize === 'quarter') {
    const basePrice = Math.round(item.price * 0.25);
    const surcharge = item.portionOptions?.quarterPortionSurcharge || 0;
    setAdjustedPrice(basePrice + surcharge);
  } else {
    setAdjustedPrice(item.price);
  }
}, [portionSize, item.price, item.portionOptions]);
```

### Server Actions

**Create Menu Item** (`app/actions/admin/menu-actions.ts`):

```typescript
const halfPortionSurcharge = parseFloat(formData.get('halfPortionSurcharge') as string) || 0;
const quarterPortionSurcharge = parseFloat(formData.get('quarterPortionSurcharge') as string) || 0;

const menuItem = await MenuItemModel.create({
  // ... other fields
  portionOptions: {
    halfPortionEnabled,
    halfPortionSurcharge,
    quarterPortionEnabled,
    quarterPortionSurcharge,
  },
});
```

## Use Cases

### 1. Packaging Costs
Add a surcharge to cover the cost of smaller packaging for portion sizes.

**Example:**
- Full portion uses a large container (included in base price)
- Half/quarter portions use smaller containers that cost extra
- Surcharge: ₦200 for half, ₦100 for quarter

### 2. Preparation Overhead
Account for additional preparation time or complexity for smaller portions.

**Example:**
- Smaller portions require more precise measuring
- Surcharge: ₦300 for both half and quarter portions

### 3. Minimum Profitability
Ensure smaller portions maintain minimum profit margins.

**Example:**
- Full price: ₦8,000 (profit margin: 40%)
- Half at 50%: ₦4,000 (profit margin drops to 25%)
- Add ₦800 surcharge to maintain 35% margin

### 4. Premium Customization
Charge extra for the convenience of smaller portion sizes.

**Example:**
- Full portion: Standard pricing
- Half/quarter portions: Premium service
- Surcharge: ₦500 for half, ₦250 for quarter

## Business Rules

1. **Optional Feature**: Surcharges are completely optional (default: ₦0)
2. **Non-Negative**: Surcharge values must be ≥ 0
3. **Independent**: Half and quarter surcharges are set independently
4. **Food Items Only**: Portion options only available for food category items
5. **Transparent Pricing**: Customers see the final price including surcharge

## Admin Guidelines

### Best Practices

1. **Be Transparent**: Ensure surcharges are reasonable and justifiable
2. **Consistency**: Apply similar surcharge logic across similar items
3. **Test Pricing**: Verify calculated prices make sense before publishing
4. **Monitor Sales**: Track if surcharges affect portion size selection
5. **Customer Communication**: Consider adding notes about portion sizes in item descriptions

### Common Mistakes to Avoid

1. **Excessive Surcharges**: Don't make portion prices disproportionate
   - ❌ Bad: Full ₦5,000, Half ₦4,500 (₦2,500 + ₦2,000 surcharge)
   - ✅ Good: Full ₦5,000, Half ₦2,800 (₦2,500 + ₦300 surcharge)

2. **Forgetting to Update**: When changing full price, review surcharges
   - If full price increases 20%, consider adjusting surcharges proportionally

3. **Inconsistent Application**: Apply surcharges consistently within categories
   - If all rice dishes have ₦300 half portion surcharge, maintain consistency

## Migration Notes

### Existing Menu Items

All existing menu items will have surcharge values default to ₦0, maintaining current pricing behavior. No action is required unless you want to add surcharges.

### Database Migration

The schema update is backward compatible:
- New fields: `halfPortionSurcharge` and `quarterPortionSurcharge`
- Default values: 0
- Existing `halfPortionEnabled` and `quarterPortionEnabled` fields remain unchanged

## Support & Troubleshooting

### Common Issues

**Q: Surcharge not showing in customer view?**
- Ensure the portion option is enabled (toggle switch is ON)
- Verify surcharge value is saved (check edit form)
- Clear browser cache and reload

**Q: Price calculation seems incorrect?**
- Formula: (Base Price × Portion %) + Surcharge
- Check if rounding is applied (prices are rounded to nearest whole number)
- Verify surcharge is entered in Naira (not kobo)

**Q: Can I set different surcharges for different items?**
- Yes, each menu item has independent surcharge settings
- Set surcharges individually when creating/editing items

**Q: Can I remove a surcharge after setting it?**
- Yes, edit the item and set surcharge to 0
- Or disable the portion option entirely

## Future Enhancements

Potential improvements for future versions:

1. **Percentage-Based Surcharges**: Allow surcharges as percentages instead of fixed amounts
2. **Bulk Surcharge Updates**: Apply surcharges to multiple items at once
3. **Surcharge Templates**: Save common surcharge configurations for reuse
4. **Analytics**: Track surcharge impact on sales and revenue
5. **Customer Notifications**: Highlight surcharge amounts in cart/checkout

## Version History

- **v1.0** (January 2026): Initial implementation of portion surcharge feature
  - Added surcharge fields to menu item schema
  - Updated admin forms with surcharge inputs
  - Integrated surcharge calculations in pricing logic
  - Updated customer-facing displays
