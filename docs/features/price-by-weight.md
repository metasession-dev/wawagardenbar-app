# Price by Weight Feature

## Overview

This feature allows menu items to be priced based on weight (per 100 grams) instead of a fixed price. Customers can specify the desired weight when adding items to their cart, and the total price is calculated dynamically.

## Use Cases

- **Protein items**: Fish, chicken, beef, goat meat
- **Bulk items**: Rice, beans, vegetables
- **Custom portions**: Items where customers want to specify exact quantities

## Database Schema Changes

### MenuItem Model Updates

Add new fields to the `IMenuItem` interface and `MenuItemModel`:

```typescript
interface IMenuItem {
  // ... existing fields
  
  // Pricing configuration
  pricingType: 'fixed' | 'by-weight';  // Default: 'fixed'
  pricePerUnit?: number;                // Price per 100 grams (only for by-weight items)
  minimumWeight?: number;               // Minimum weight in grams (e.g., 100)
  maximumWeight?: number;               // Maximum weight in grams (e.g., 5000)
  weightIncrement?: number;             // Weight increment in grams (e.g., 50, 100)
  
  // ... existing fields
}
```

**Field Descriptions:**

- `pricingType`: Determines if item has fixed price or priced by weight
- `pricePerUnit`: Price for 100 grams (e.g., ₦500 per 100g)
- `minimumWeight`: Minimum order weight (default: 100g)
- `maximumWeight`: Maximum order weight (default: 5000g)
- `weightIncrement`: Step value for weight selection (default: 50g)

### CartItem Interface Updates

Update the `CartItem` interface to support weight-based items:

```typescript
interface CartItem {
  cartItemId: string;
  id: string;
  name: string;
  price: number;                    // Calculated price based on weight
  quantity: number;
  image?: string;
  configuration?: ItemConfiguration;
  
  // New fields for weight-based pricing
  pricingType: 'fixed' | 'by-weight';
  weightInGrams?: number;           // Selected weight (only for by-weight items)
  pricePerUnit?: number;            // Price per 100g (for reference)
}
```

### Order Item Schema Updates

Update `IOrderItem` to store weight information:

```typescript
interface IOrderItem {
  // ... existing fields
  
  pricingType: 'fixed' | 'by-weight';
  weightInGrams?: number;
  pricePerUnit?: number;
  
  // ... existing fields
}
```

## Admin Dashboard Implementation

### Menu Item Form Updates

**Location:** `/components/features/admin/menu-item-form.tsx` and `/components/features/admin/menu-item-edit-form.tsx`

#### 1. Add Pricing Type Selection

```typescript
// Add to form schema
const formSchema = z.object({
  // ... existing fields
  
  pricingType: z.enum(['fixed', 'by-weight']).default('fixed'),
  price: z.number().min(0).optional(),
  pricePerUnit: z.number().min(0).optional(),
  minimumWeight: z.number().min(50).default(100).optional(),
  maximumWeight: z.number().min(100).default(5000).optional(),
  weightIncrement: z.number().min(10).default(50).optional(),
}).refine((data) => {
  // Ensure either price or pricePerUnit is set based on pricingType
  if (data.pricingType === 'fixed') {
    return data.price !== undefined && data.price > 0;
  } else {
    return data.pricePerUnit !== undefined && data.pricePerUnit > 0;
  }
}, {
  message: "Price is required based on pricing type",
  path: ["price"],
});
```

#### 2. UI Components

Add a new section in the form after the basic information:

```tsx
{/* Pricing Configuration */}
<div className="space-y-4">
  <h3 className="text-lg font-semibold">Pricing Configuration</h3>
  
  <FormField
    control={form.control}
    name="pricingType"
    render={({ field }) => (
      <FormItem>
        <FormLabel>Pricing Type</FormLabel>
        <Select onValueChange={field.onChange} defaultValue={field.value}>
          <FormControl>
            <SelectTrigger>
              <SelectValue placeholder="Select pricing type" />
            </SelectTrigger>
          </FormControl>
          <SelectContent>
            <SelectItem value="fixed">Fixed Price</SelectItem>
            <SelectItem value="by-weight">Price by Weight</SelectItem>
          </SelectContent>
        </Select>
        <FormDescription>
          Choose how this item should be priced
        </FormDescription>
        <FormMessage />
      </FormItem>
    )}
  />

  {/* Conditional rendering based on pricingType */}
  {form.watch('pricingType') === 'fixed' && (
    <FormField
      control={form.control}
      name="price"
      render={({ field }) => (
        <FormItem>
          <FormLabel>Price (₦)</FormLabel>
          <FormControl>
            <Input
              type="number"
              step="0.01"
              placeholder="0.00"
              {...field}
              onChange={(e) => field.onChange(parseFloat(e.target.value))}
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  )}

  {form.watch('pricingType') === 'by-weight' && (
    <>
      <FormField
        control={form.control}
        name="pricePerUnit"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Price per 100 grams (₦)</FormLabel>
            <FormControl>
              <Input
                type="number"
                step="0.01"
                placeholder="0.00"
                {...field}
                onChange={(e) => field.onChange(parseFloat(e.target.value))}
              />
            </FormControl>
            <FormDescription>
              Enter the price for 100 grams of this item
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <FormField
          control={form.control}
          name="minimumWeight"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Minimum Weight (g)</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  placeholder="100"
                  {...field}
                  onChange={(e) => field.onChange(parseInt(e.target.value))}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="maximumWeight"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Maximum Weight (g)</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  placeholder="5000"
                  {...field}
                  onChange={(e) => field.onChange(parseInt(e.target.value))}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="weightIncrement"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Weight Step (g)</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  placeholder="50"
                  {...field}
                  onChange={(e) => field.onChange(parseInt(e.target.value))}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      {/* Price Preview */}
      {form.watch('pricePerUnit') && (
        <div className="p-4 bg-muted rounded-lg">
          <p className="text-sm font-medium mb-2">Price Examples:</p>
          <ul className="text-sm space-y-1">
            <li>100g = ₦{form.watch('pricePerUnit')?.toFixed(2)}</li>
            <li>200g = ₦{(form.watch('pricePerUnit') * 2)?.toFixed(2)}</li>
            <li>500g = ₦{(form.watch('pricePerUnit') * 5)?.toFixed(2)}</li>
            <li>1000g (1kg) = ₦{(form.watch('pricePerUnit') * 10)?.toFixed(2)}</li>
          </ul>
        </div>
      )}
    </>
  )}
</div>
```

### Menu Items List Display

**Location:** `/app/dashboard/menu/page.tsx`

Update the table to show pricing type:

```tsx
<TableCell>
  {item.pricingType === 'fixed' 
    ? `₦${item.price?.toFixed(2)}`
    : `₦${item.pricePerUnit?.toFixed(2)}/100g`
  }
</TableCell>
```

## Customer Frontend Implementation

### Menu Item Card Updates

**Location:** `/components/features/menu/menu-item-card.tsx`

Update the card to display pricing information:

```tsx
<div className="mt-2">
  {item.pricingType === 'fixed' ? (
    <p className="text-lg font-bold">₦{item.price.toFixed(2)}</p>
  ) : (
    <div>
      <p className="text-lg font-bold">₦{item.pricePerUnit.toFixed(2)}</p>
      <p className="text-xs text-muted-foreground">per 100 grams</p>
    </div>
  )}
</div>
```

### Menu Item Detail Modal Updates

**Location:** `/components/features/menu/menu-item-detail-modal.tsx`

#### 1. Add Weight Selection Component

Create a new component for weight selection:

```tsx
// components/features/menu/weight-selector.tsx
'use client';

import { useState } from 'react';
import { Minus, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface WeightSelectorProps {
  pricePerUnit: number;
  minimumWeight: number;
  maximumWeight: number;
  weightIncrement: number;
  onWeightChange: (weight: number, calculatedPrice: number) => void;
}

export function WeightSelector({
  pricePerUnit,
  minimumWeight,
  maximumWeight,
  weightIncrement,
  onWeightChange,
}: WeightSelectorProps) {
  const [weight, setWeight] = useState(minimumWeight);

  const calculatePrice = (weightInGrams: number) => {
    return (weightInGrams / 100) * pricePerUnit;
  };

  const handleWeightChange = (newWeight: number) => {
    // Ensure weight is within bounds
    const boundedWeight = Math.max(
      minimumWeight,
      Math.min(maximumWeight, newWeight)
    );
    setWeight(boundedWeight);
    onWeightChange(boundedWeight, calculatePrice(boundedWeight));
  };

  const increment = () => {
    handleWeightChange(weight + weightIncrement);
  };

  const decrement = () => {
    handleWeightChange(weight - weightIncrement);
  };

  const handleInputChange = (value: string) => {
    const numValue = parseInt(value) || minimumWeight;
    handleWeightChange(numValue);
  };

  return (
    <div className="space-y-4">
      <div>
        <Label>Select Weight (grams)</Label>
        <div className="flex items-center gap-2 mt-2">
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={decrement}
            disabled={weight <= minimumWeight}
          >
            <Minus className="h-4 w-4" />
          </Button>

          <Input
            type="number"
            value={weight}
            onChange={(e) => handleInputChange(e.target.value)}
            min={minimumWeight}
            max={maximumWeight}
            step={weightIncrement}
            className="text-center"
          />

          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={increment}
            disabled={weight >= maximumWeight}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          Min: {minimumWeight}g | Max: {maximumWeight}g | Step: {weightIncrement}g
        </p>
      </div>

      {/* Quick Selection Buttons */}
      <div className="flex flex-wrap gap-2">
        {[100, 200, 500, 1000].map((quickWeight) => (
          quickWeight >= minimumWeight && quickWeight <= maximumWeight && (
            <Button
              key={quickWeight}
              type="button"
              variant={weight === quickWeight ? "default" : "outline"}
              size="sm"
              onClick={() => handleWeightChange(quickWeight)}
            >
              {quickWeight >= 1000 ? `${quickWeight / 1000}kg` : `${quickWeight}g`}
            </Button>
          )
        ))}
      </div>

      {/* Price Display */}
      <div className="p-4 bg-muted rounded-lg">
        <div className="flex justify-between items-center">
          <span className="text-sm font-medium">Total Price:</span>
          <span className="text-2xl font-bold">
            ₦{calculatePrice(weight).toFixed(2)}
          </span>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          {weight}g × ₦{pricePerUnit.toFixed(2)}/100g
        </p>
      </div>
    </div>
  );
}
```

#### 2. Update Menu Item Detail Modal

```tsx
// In menu-item-detail-modal.tsx
const [selectedWeight, setSelectedWeight] = useState<number | undefined>();
const [calculatedPrice, setCalculatedPrice] = useState<number>(item.price || 0);

const handleWeightChange = (weight: number, price: number) => {
  setSelectedWeight(weight);
  setCalculatedPrice(price);
};

const handleAddToCart = () => {
  if (item.pricingType === 'by-weight' && !selectedWeight) {
    toast.error('Please select a weight');
    return;
  }

  addItem({
    cartItemId: crypto.randomUUID(),
    id: item.id,
    name: item.name,
    price: calculatedPrice,
    quantity: 1,
    image: item.image,
    configuration: selectedConfiguration,
    pricingType: item.pricingType,
    weightInGrams: selectedWeight,
    pricePerUnit: item.pricePerUnit,
  });

  toast.success('Added to cart');
  onClose();
};

// In the modal JSX
{item.pricingType === 'by-weight' ? (
  <WeightSelector
    pricePerUnit={item.pricePerUnit!}
    minimumWeight={item.minimumWeight || 100}
    maximumWeight={item.maximumWeight || 5000}
    weightIncrement={item.weightIncrement || 50}
    onWeightChange={handleWeightChange}
  />
) : (
  <div className="text-2xl font-bold">₦{item.price.toFixed(2)}</div>
)}
```

### Cart Display Updates

**Location:** `/components/features/cart/cart-sidebar.tsx` and `/components/features/checkout/order-summary.tsx`

Update cart item display to show weight information:

```tsx
<div className="flex justify-between">
  <div>
    <p className="font-medium">{item.name}</p>
    {item.pricingType === 'by-weight' && item.weightInGrams && (
      <p className="text-xs text-muted-foreground">
        {item.weightInGrams}g @ ₦{item.pricePerUnit?.toFixed(2)}/100g
      </p>
    )}
    <p className="text-sm text-muted-foreground">Qty: {item.quantity}</p>
  </div>
  <p className="font-medium">₦{(item.price * item.quantity).toFixed(2)}</p>
</div>
```

## Service Layer Updates

### Order Service

**Location:** `/services/order-service.ts`

Update order creation to handle weight-based items:

```typescript
async createOrder(orderData: CreateOrderInput): Promise<IOrder> {
  // ... existing code
  
  // Process items and calculate totals
  const processedItems = orderData.items.map((item) => {
    let itemPrice = item.price;
    
    // Recalculate price for weight-based items to ensure accuracy
    if (item.pricingType === 'by-weight' && item.weightInGrams && item.pricePerUnit) {
      itemPrice = (item.weightInGrams / 100) * item.pricePerUnit;
    }
    
    return {
      ...item,
      price: itemPrice,
      subtotal: itemPrice * item.quantity,
    };
  });
  
  // ... continue with order creation
}
```

### Inventory Service

**Location:** `/services/inventory-service.ts`

Update inventory deduction for weight-based items:

```typescript
async deductInventoryForOrder(orderId: string): Promise<void> {
  const order = await OrderModel.findById(orderId).populate('items.menuItemId');
  
  for (const orderItem of order.items) {
    const menuItem = orderItem.menuItemId;
    
    if (menuItem.trackInventory) {
      let quantityToDeduct = orderItem.quantity;
      
      // For weight-based items, convert weight to inventory units
      if (menuItem.pricingType === 'by-weight' && orderItem.weightInGrams) {
        // Assuming inventory is tracked in kg or portions
        // Adjust based on your inventory unit type
        quantityToDeduct = orderItem.weightInGrams / 1000; // Convert to kg
      }
      
      await this.deductStock(menuItem._id, quantityToDeduct);
    }
  }
}
```

## Validation & Business Rules

### Price Calculation Validation

1. **Server-side validation**: Always recalculate price on the server to prevent tampering
2. **Minimum weight enforcement**: Reject orders below minimum weight
3. **Maximum weight enforcement**: Reject orders above maximum weight
4. **Weight increment validation**: Ensure weight is a valid increment

### Form Validation Rules

```typescript
// In menu item form
.refine((data) => {
  if (data.pricingType === 'by-weight') {
    return data.minimumWeight < data.maximumWeight;
  }
  return true;
}, {
  message: "Minimum weight must be less than maximum weight",
  path: ["minimumWeight"],
})
.refine((data) => {
  if (data.pricingType === 'by-weight') {
    return data.weightIncrement <= data.minimumWeight;
  }
  return true;
}, {
  message: "Weight increment must not exceed minimum weight",
  path: ["weightIncrement"],
});
```

## Migration Strategy

### Database Migration Script

Create a migration script to add new fields to existing menu items:

```typescript
// scripts/migrate-pricing-fields.ts
import { connectDB } from '@/lib/mongodb';
import { MenuItemModel } from '@/models/menu-item-model';

async function migratePricingFields() {
  await connectDB();
  
  const result = await MenuItemModel.updateMany(
    { pricingType: { $exists: false } },
    {
      $set: {
        pricingType: 'fixed',
        minimumWeight: 100,
        maximumWeight: 5000,
        weightIncrement: 50,
      },
    }
  );
  
  console.log(`Updated ${result.modifiedCount} menu items`);
}

migratePricingFields();
```

## Testing Checklist

### Admin Dashboard Tests

- [ ] Create menu item with fixed pricing
- [ ] Create menu item with weight-based pricing
- [ ] Edit existing item to change pricing type
- [ ] Validate price per unit field is required for weight-based items
- [ ] Validate minimum/maximum weight constraints
- [ ] Verify price examples display correctly

### Customer Frontend Tests

- [ ] Display fixed-price items correctly
- [ ] Display weight-based items with per-unit pricing
- [ ] Weight selector increments/decrements correctly
- [ ] Weight selector respects min/max bounds
- [ ] Quick selection buttons work
- [ ] Price calculation updates in real-time
- [ ] Cannot add to cart without selecting weight
- [ ] Cart displays weight information correctly
- [ ] Order summary shows weight details

### Backend Tests

- [ ] Order creation with weight-based items
- [ ] Price recalculation on server
- [ ] Inventory deduction for weight-based items
- [ ] Validation of weight constraints
- [ ] Payment calculation includes weight-based prices

## UI/UX Considerations

### Display Conventions

1. **Menu cards**: Show "₦X.XX/100g" for weight-based items
2. **Cart items**: Show weight and unit price (e.g., "500g @ ₦50/100g")
3. **Order history**: Display weight ordered for each item
4. **Kitchen display**: Show weight to prepare

### Mobile Responsiveness

- Weight selector should be touch-friendly
- Quick selection buttons should be easily tappable
- Price display should be prominent on mobile

### Accessibility

- Weight input should be keyboard accessible
- Screen readers should announce price changes
- Clear labels for all form fields

## Future Enhancements

1. **Multiple unit types**: Support pricing by kg, lbs, oz
2. **Bulk discounts**: Offer discounts for larger weights
3. **Weight presets**: Admin-defined common weights per item
4. **Inventory alerts**: Alert when weight-based items are low
5. **Analytics**: Track popular weight selections

## Related Documentation

- [Menu Management](./menu-management.md)
- [Shopping Cart System](./shopping-cart.md)
- [Order Processing](./order-processing.md)
- [Inventory Management](./inventory-management.md)
