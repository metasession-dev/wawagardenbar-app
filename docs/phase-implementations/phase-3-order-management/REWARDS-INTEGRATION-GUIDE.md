# Rewards System Integration Guide

## Quick Start

### 1. Calculate Reward After Order Creation

In your order creation flow (after payment confirmation):

```typescript
import { calculateRewardAction } from '@/app/actions/rewards/rewards-actions';

// After order is created and paid
const orderResult = await createOrder(orderData);

if (orderResult.success && session.userId) {
  // Calculate reward (server-side only)
  const rewardResult = await calculateRewardAction(
    orderResult.data.orderId,
    orderData.total
  );
  
  if (rewardResult.success && rewardResult.data?.reward) {
    // Show reward notification to user
    return {
      ...orderResult,
      reward: rewardResult.data.reward,
    };
  }
}
```

### 2. Display Reward Notification

In your order confirmation page:

```typescript
'use client';

import { RewardNotification } from '@/components/features/rewards';

export function OrderConfirmation({ order, reward }) {
  return (
    <>
      {/* Order details */}
      <OrderDetails order={order} />
      
      {/* Reward notification */}
      <RewardNotification
        reward={reward}
        autoClose={true}
        autoCloseDelay={8000}
      />
    </>
  );
}
```

### 3. Add Reward Selector to Checkout

In your checkout form:

```typescript
'use client';

import { RewardSelector } from '@/components/features/rewards';

export function CheckoutForm() {
  const [selectedReward, setSelectedReward] = useState(null);
  const [discountAmount, setDiscountAmount] = useState(0);
  const subtotal = calculateSubtotal();
  
  return (
    <>
      {/* Customer info, order details, etc. */}
      
      {/* Reward selector */}
      <RewardSelector
        subtotal={subtotal}
        onRewardSelect={(reward, discount) => {
          setSelectedReward(reward);
          setDiscountAmount(discount);
        }}
        selectedRewardId={selectedReward?._id.toString()}
      />
      
      {/* Order summary with discount */}
      <OrderSummary
        subtotal={subtotal}
        discount={discountAmount}
        total={subtotal - discountAmount + fees}
      />
    </>
  );
}
```

### 4. Redeem Reward After Payment

After successful payment:

```typescript
import { redeemRewardAction } from '@/app/actions/rewards/rewards-actions';

// After payment is confirmed
if (selectedReward) {
  await redeemRewardAction(
    selectedReward._id.toString(),
    orderId
  );
}
```

---

## Creating Reward Rules (Admin)

### Example Rules

**10% Off for Orders Over ₦5,000:**
```typescript
await RewardsService.createRewardRule({
  name: "10% Discount Reward",
  description: "Get 10% off your next order",
  isActive: true,
  spendThreshold: 5000,
  rewardType: "discount-percentage",
  rewardValue: 10,
  probability: 0.3,  // 30% chance
  validityDays: 30,
  maxRedemptionsPerUser: 5,
});
```

**₦500 Off for Orders Over ₦3,000:**
```typescript
await RewardsService.createRewardRule({
  name: "₦500 Cash Discount",
  description: "Get ₦500 off your next order",
  isActive: true,
  spendThreshold: 3000,
  rewardType: "discount-fixed",
  rewardValue: 500,
  probability: 0.2,  // 20% chance
  validityDays: 14,
});
```

**Free Item Reward:**
```typescript
await RewardsService.createRewardRule({
  name: "Free Dessert",
  description: "Get a free dessert on your next order",
  isActive: true,
  spendThreshold: 10000,
  rewardType: "free-item",
  rewardValue: 0,
  freeItemId: dessertMenuItemId,
  probability: 0.15,  // 15% chance
  validityDays: 7,
});
```

**Loyalty Points:**
```typescript
await RewardsService.createRewardRule({
  name: "500 Loyalty Points",
  description: "Earn 500 loyalty points",
  isActive: true,
  spendThreshold: 2000,
  rewardType: "loyalty-points",
  rewardValue: 500,  // 500 points = ₦5
  probability: 0.5,  // 50% chance
  validityDays: 90,
});
```

---

## API Reference

### Server Actions

```typescript
// Calculate reward (after order)
calculateRewardAction(orderId: string, spendAmount: number)

// Get user's active rewards
getUserActiveRewardsAction()

// Get reward history
getUserRewardHistoryAction(limit?: number, skip?: number)

// Validate reward code
validateRewardCodeAction(code: string)

// Redeem reward
redeemRewardAction(rewardId: string, orderId: string)

// Calculate discount amount
calculateDiscountAmountAction(rewardId: string, subtotal: number)

// Get reward statistics
getUserRewardStatsAction()
```

### Service Methods

```typescript
// Admin: Create reward rule
RewardsService.createRewardRule(ruleData)

// Admin: Get all rules
RewardsService.getAllRewardRules()

// Admin: Update rule
RewardsService.updateRewardRule(ruleId, updates)

// Admin: Delete rule
RewardsService.deleteRewardRule(ruleId)

// Admin: Get statistics
RewardsService.getRewardStatistics()

// Maintenance: Expire old rewards
RewardsService.expireOldRewards()
```

---

## Testing Checklist

- [ ] Create test reward rule with 100% probability
- [ ] Place order meeting spend threshold
- [ ] Verify reward notification appears
- [ ] Check reward in `/profile/rewards`
- [ ] Add items to cart
- [ ] Go to checkout
- [ ] Select reward
- [ ] Verify discount applied
- [ ] Complete payment
- [ ] Verify reward marked as redeemed
- [ ] Check reward history shows redeemed status

---

## Cron Job Setup

Add to your cron jobs (daily):

```bash
# Expire old rewards daily at 2 AM
0 2 * * * curl -X POST https://your-domain.com/api/cron/expire-rewards
```

Or use Vercel Cron:

```json
{
  "crons": [
    {
      "path": "/api/cron/expire-rewards",
      "schedule": "0 2 * * *"
    }
  ]
}
```

Create the API route:

```typescript
// /app/api/cron/expire-rewards/route.ts
import { RewardsService } from '@/services';

export async function POST() {
  const count = await RewardsService.expireOldRewards();
  return Response.json({ expired: count });
}
```

---

## Troubleshooting

### Reward Not Appearing
- Check spend threshold is met
- Verify reward rule is active
- Check probability (not 100% = might not trigger)
- Verify user hasn't exceeded max redemptions

### Discount Not Calculating
- Ensure reward is active
- Check reward hasn't expired
- Verify subtotal is correct
- Check reward type matches expected

### Redemption Failing
- Verify reward belongs to user
- Check reward status is 'active'
- Ensure reward hasn't expired
- Verify order ID is valid

---

*Integration guide created: November 16, 2025*
