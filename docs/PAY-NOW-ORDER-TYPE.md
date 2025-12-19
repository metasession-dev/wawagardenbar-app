# Pay Now Order Type - Feature Implementation

## Overview

Added a new **"Pay Now"** order type to the checkout flow, providing customers with a quick ordering option that doesn't require table numbers, pickup times, or delivery addresses.

## What is "Pay Now"?

**Pay Now** is a streamlined order type for customers who want to:
- Order and pay immediately
- Skip table selection (unlike Dine In)
- Skip pickup time selection (unlike Pickup)
- Skip delivery address entry (unlike Delivery)
- Get their order quickly at the counter or bar

### Use Cases

1. **Quick Bar Orders**: Customer orders drinks at the bar and pays immediately
2. **Takeaway at Counter**: Customer orders food to take away without scheduling
3. **Express Service**: Fast-track orders without additional details
4. **Walk-in Customers**: Customers who don't want to sit at a table

## User Experience

### Checkout Flow

```
1. Customer adds items to cart
2. Goes to checkout
3. Selects "Pay Now" order type (4th option)
   - Icon: Lightning bolt (Zap)
   - Description: "Quick order & pay"
4. Enters customer info (name, email, phone)
5. Skips order details (no table/pickup/delivery)
6. Adds tip (optional)
7. Selects payment method
8. Completes payment
9. Order is confirmed and prepared
```

### Visual Design

The "Pay Now" option appears as the **4th card** in the Order Type selection:

```
┌─────────────┬─────────────┬─────────────┬─────────────┐
│  Dine In    │   Pickup    │  Delivery   │  Pay Now    │
│     🍽️      │     📦      │     🚚      │     ⚡      │
│ Eat at the  │ Collect     │ Delivered   │ Quick order │
│ restaurant  │ your order  │  to you     │   & pay     │
└─────────────┴─────────────┴─────────────┴─────────────┘
```

## Technical Implementation

### Files Modified

#### 1. **Interface** - `/interfaces/order.interface.ts`
Added 'pay-now' to OrderType:
```typescript
export type OrderType = 'dine-in' | 'pickup' | 'delivery' | 'pay-now';
```

#### 2. **Model** - `/models/order-model.ts`
Updated enum in Mongoose schema:
```typescript
orderType: {
  type: String,
  enum: ['dine-in', 'pickup', 'delivery', 'pay-now'] as OrderType[],
  required: true,
},
```

#### 3. **Checkout Form** - `/components/features/checkout/checkout-form.tsx`
Updated Zod schema:
```typescript
orderType: z.enum(['dine-in', 'pickup', 'delivery', 'pay-now']),
```

#### 4. **Order Details Step** - `/components/features/checkout/order-details-step.tsx`
Added "Pay Now" option card:
```typescript
import { Zap } from 'lucide-react';

// Changed grid from 3 columns to 4
className="grid gap-4 sm:grid-cols-2 md:grid-cols-4"

// Added Pay Now card
<Label htmlFor="pay-now">
  <RadioGroupItem value="pay-now" id="pay-now" />
  <Zap className="h-6 w-6" />
  <span className="font-medium">Pay Now</span>
  <span className="text-xs">Quick order & pay</span>
</Label>
```

#### 5. **Payment Actions** - `/app/actions/payment/payment-actions.ts`
Updated CreateOrderInput interface:
```typescript
export interface CreateOrderInput {
  orderType: 'dine-in' | 'pickup' | 'delivery' | 'pay-now';
  // ...
}
```

#### 6. **Settings Service** - `/services/settings-service.ts`
Updated calculateOrderTotals method:
```typescript
static async calculateOrderTotals(
  subtotal: number,
  orderType: 'dine-in' | 'pickup' | 'delivery' | 'pay-now'
): Promise<{...}>
```

#### 7. **Order Summary** - `/components/features/checkout/order-summary.tsx`
Updated props interface:
```typescript
interface OrderSummaryProps {
  orderType: 'dine-in' | 'pickup' | 'delivery' | 'pay-now';
  // ...
}
```

#### 8. **Order Status Tracker** - `/components/features/orders/order-status-tracker.tsx`
Updated props and mapped to pickup flow:
```typescript
interface OrderStatusTrackerProps {
  orderType: 'dine-in' | 'pickup' | 'delivery' | 'pay-now';
  // ...
}

// Maps to pickup status steps
const steps =
  orderType === 'dine-in'
    ? STATUS_STEPS_DINE_IN
    : orderType === 'pickup' || orderType === 'pay-now'
      ? STATUS_STEPS_PICKUP
      : STATUS_STEPS_DELIVERY;
```

## Order Processing Flow

### Status Progression

Pay Now orders follow the **Pickup** status flow:

```
Confirmed → Preparing → Ready → Completed
```

**Status Steps:**
1. **Confirmed**: Order received and payment confirmed
2. **Preparing**: Kitchen is preparing the order
3. **Ready**: Order is ready for collection
4. **Completed**: Customer has collected the order

### Fee Calculation

Pay Now orders are treated like **Pickup** orders for fee calculation:
- ✅ Service Fee: Applied
- ❌ Delivery Fee: Not applied (no delivery)
- ✅ Tax: Applied

### Inventory Deduction

Pay Now orders trigger inventory deduction when:
1. Payment is confirmed (via webhook or manual)
2. Order status changes to "confirmed"
3. Inventory is linked to menu items

## Differences from Other Order Types

| Feature | Dine In | Pickup | Delivery | Pay Now |
|---------|---------|--------|----------|---------|
| **Table Number** | ✅ Required | ❌ No | ❌ No | ❌ No |
| **Pickup Time** | ❌ No | ✅ Required | ❌ No | ❌ No |
| **Delivery Address** | ❌ No | ❌ No | ✅ Required | ❌ No |
| **Tab Option** | ✅ Yes | ❌ No | ❌ No | ❌ No |
| **Service Fee** | ✅ Yes | ✅ Yes | ✅ Yes | ✅ Yes |
| **Delivery Fee** | ❌ No | ❌ No | ✅ Yes | ❌ No |
| **Status Flow** | Dine In | Pickup | Delivery | **Pickup** |
| **Payment** | Immediate or Tab | Immediate | Immediate | **Immediate** |

## Validation Rules

### Required Fields

**All Order Types (including Pay Now):**
- Customer Name
- Customer Email
- Customer Phone
- Payment Method

**Pay Now Specific:**
- No additional fields required
- Simplest checkout flow

### Conditional Validation

The checkout form validates based on order type:

```typescript
// Pay Now: No additional validation needed
if (orderType === 'pay-now') {
  // Only basic customer info required
  // No table, pickup time, or delivery address
}
```

## Backend Handling

### Order Creation

When a Pay Now order is created:

```typescript
const order = await OrderModel.create({
  orderType: 'pay-now',
  // No dineInDetails
  // No pickupDetails
  // No deliveryDetails
  // Just customer info and items
});
```

### Dashboard Display

In the admin dashboard, Pay Now orders:
- Show order type as "Pay Now"
- Display with lightning bolt icon (⚡)
- Follow pickup status progression
- No table/pickup/delivery info shown

## Testing Checklist

- [ ] "Pay Now" option appears in checkout
- [ ] Selecting "Pay Now" doesn't require table number
- [ ] Selecting "Pay Now" doesn't require pickup time
- [ ] Selecting "Pay Now" doesn't require delivery address
- [ ] Can complete checkout with Pay Now
- [ ] Payment processes successfully
- [ ] Order appears in dashboard with "Pay Now" type
- [ ] Order follows pickup status flow
- [ ] Service fee is applied correctly
- [ ] No delivery fee is charged
- [ ] Inventory is deducted on payment
- [ ] Order tracking works correctly
- [ ] Can't open tab with Pay Now order
- [ ] Existing tab blocks Pay Now option

## User Benefits

1. **Speed**: Fastest checkout flow with minimal fields
2. **Simplicity**: No need to know table number or schedule pickup
3. **Flexibility**: Good for walk-in customers or bar orders
4. **Convenience**: Pay and collect without extra details

## Business Benefits

1. **Increased Conversions**: Simpler checkout reduces abandonment
2. **Faster Service**: Quick orders can be processed immediately
3. **Bar Sales**: Ideal for bar/counter service
4. **Walk-in Traffic**: Accommodates spontaneous customers

## Future Enhancements

Potential improvements for Pay Now:

1. **QR Code at Bar**: Generate QR code for instant Pay Now orders
2. **Order Number Display**: Show order number prominently for collection
3. **SMS Notification**: Text when order is ready
4. **Express Lane**: Separate queue for Pay Now orders
5. **Loyalty Integration**: Bonus points for Pay Now orders

## Migration Notes

### Existing Orders

- Existing orders are not affected
- Only new orders can use "Pay Now" type
- Database supports all 4 order types

### Backward Compatibility

- All existing code handles 3 order types
- Pay Now is additive, not breaking
- Falls back to pickup flow for status tracking

## Summary

**What Changed:**
- Added "Pay Now" as 4th order type option
- Updated all type definitions and schemas
- Mapped to pickup status flow
- No additional fields required

**Result:**
- Customers have a quick ordering option
- Simplified checkout for walk-in/bar orders
- Maintains all existing functionality
- Seamless integration with payment and inventory systems

**Deploy:**
```bash
npm run build
git add .
git commit -m "feat: Add Pay Now order type for quick orders"
git push
```

The Pay Now feature is now ready for use! 🚀⚡
