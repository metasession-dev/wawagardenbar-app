# Rewards System Implementation Specification

## Document Overview
**Version:** 1.0  
**Date:** November 19, 2025  
**Status:** Implementation Required

---

## 1. Executive Summary

This document outlines the complete implementation requirements for the Wawa Cafe rewards system, including automatic reward application, points management, and menu item points redemption.

---

## 2. Current Implementation Gaps

### 2.1 Customer Rewards Page Display
**Issue:** Reward descriptions don't match dashboard templates  
**Current State:** Custom descriptions with spend thresholds and probabilities  
**Required State:** Match exact template display format from `/dashboard/rewards/templates`

### 2.2 Automatic Reward Application
**Issue:** Rewards are not automatically applied at checkout  
**Current State:** Rewards are issued but require manual application  
**Required State:** Automatic application when thresholds are met

### 2.3 Maximum Redemptions Per User
**Issue:** Not enforced  
**Current State:** Users can potentially redeem unlimited rewards  
**Required State:** Enforce `maxRedemptionsPerUser` from reward rules

### 2.4 Points System
**Issue:** Not fully implemented  
**Current State:** Points are awarded but cannot be spent  
**Required State:** Full points earning, spending, and redemption system

### 2.5 Menu Item Points Value
**Issue:** Not implemented  
**Current State:** Menu items don't have points values  
**Required State:** Optional points value per menu item

---

## 3. Detailed Requirements

### 3.1 Customer Rewards Page (`/profile/rewards`)

#### 3.1.1 "Types of Rewards Available" Section

**Display Format (Match Templates):**
```
┌─────────────────────────────────────────┐
│ [Icon]  Template Badge                  │
│                                         │
│ Reward Name                             │
│ Description text                        │
│                                         │
│ Threshold:    ₦X,XXX / No minimum      │
│ Value:        XX% / ₦XXX / XXX pts     │
│ Probability:  XX%                       │
│ Validity:     XX days                   │
└─────────────────────────────────────────┘
```

**Rules:**
- Show ONLY active reward rules (`isActive: true`)
- Filter by `maxRedemptionsPerUser`:
  - If set, check user's redemption count for that rule
  - Hide rule if user has reached max redemptions
- Use same icons as templates:
  - `Percent` - discount-percentage
  - `DollarSign` - discount-fixed
  - `Gift` - free-item
  - `Star` - loyalty-points
- Display in 2-column grid (md:grid-cols-2)
- Empty state: "No rewards campaigns currently running"

**Data to Display:**
- **Name:** `rule.name`
- **Description:** `rule.description`
- **Threshold:** `rule.spendThreshold` (0 = "No minimum")
- **Value:** Based on `rule.rewardType`:
  - `discount-percentage`: `{rewardValue}%`
  - `discount-fixed`: `₦{rewardValue}`
  - `loyalty-points`: `{rewardValue} pts`
  - `free-item`: "Free Item"
- **Probability:** `rule.probability * 100%` (convert decimal to percentage)
- **Validity:** `rule.validityDays days`

**Remove:**
- "Use Template" button
- Template badge (replace with active indicator if needed)

---

### 3.2 Automatic Reward Application at Checkout

#### 3.2.1 Threshold Detection

**When:** During checkout, after cart total is calculated  
**Process:**
1. Calculate order subtotal (before fees/tax)
2. Query active reward rules where `spendThreshold <= subtotal`
3. Filter rules by user eligibility:
   - Check `maxRedemptionsPerUser` against user's redemption history
   - Exclude rules user has already maxed out
4. For each eligible rule:
   - Apply probability check (`Math.random() < rule.probability`)
   - If passes, create reward and apply to order

#### 3.2.2 Reward Application Logic

**Automatic Application:**
- When reward is created, immediately apply to current order
- Update order totals in real-time
- Show applied rewards in cart summary

**Cart Display:**
```
Subtotal:           ₦5,000
Applied Rewards:    -₦500 (10% Discount)
Service Fee:        ₦100
Tax:                ₦345
─────────────────────────────
Total:              ₦4,945
```

**Multiple Rewards:**
- Allow stacking of different reward types
- Apply in order: percentage discounts → fixed discounts → points
- Track each reward separately in order

#### 3.2.3 Database Updates

**When Reward Applied:**
1. Create reward record with `status: 'active'`
2. Link to order: `orderId` field
3. Set `redeemedAt` timestamp
4. Update `status` to `'redeemed'`
5. Set `redeemedInOrderId`

**User Redemption Tracking:**
- Track redemption count per rule per user
- New collection or add to existing:
```typescript
{
  userId: ObjectId,
  ruleId: ObjectId,
  redemptionCount: number,
  lastRedeemedAt: Date
}
```

---

### 3.3 Maximum Redemptions Per User

#### 3.3.1 Enforcement Points

**1. Reward Eligibility Check:**
```typescript
async function isUserEligibleForRule(
  userId: string,
  ruleId: string,
  rule: IRewardRule
): Promise<boolean> {
  // If no max set, always eligible
  if (!rule.maxRedemptionsPerUser) return true;
  
  // Count user's redemptions for this rule
  const redemptionCount = await Reward.countDocuments({
    userId,
    ruleId,
    status: { $in: ['redeemed', 'active'] }
  });
  
  return redemptionCount < rule.maxRedemptionsPerUser;
}
```

**2. Customer Rewards Page:**
- Filter out rules where user has reached max
- Show remaining redemptions: "X of Y uses remaining"

**3. Checkout:**
- Skip rules where user has maxed out
- Don't create rewards for ineligible rules

#### 3.3.2 UI Indicators

**On Rewards Page:**
```
┌─────────────────────────────────────────┐
│ [Icon]  Active                          │
│                                         │
│ High Spender ₦500 Off                   │
│ Reward customers who spend ₦5,000+     │
│                                         │
│ Threshold:    ₦5,000                    │
│ Value:        ₦500                      │
│ Probability:  50%                       │
│ Validity:     30 days                   │
│                                         │
│ ⓘ 2 of 5 uses remaining                │
└─────────────────────────────────────────┘
```

---

### 3.4 Points System Implementation

#### 3.4.1 Points Balance Management

**User Model Updates:**
```typescript
interface IUser {
  // ... existing fields
  loyaltyPoints: number; // Current points balance
  totalPointsEarned: number; // Lifetime earned
  totalPointsSpent: number; // Lifetime spent
}
```

**Points Transactions:**
- Track all points movements
- New collection: `PointsTransaction`
```typescript
interface IPointsTransaction {
  _id: ObjectId;
  userId: ObjectId;
  type: 'earned' | 'spent' | 'expired' | 'adjusted';
  amount: number; // Positive for earned, negative for spent
  orderId?: ObjectId;
  rewardId?: ObjectId;
  description: string;
  balanceAfter: number;
  createdAt: Date;
}
```

#### 3.4.2 Earning Points

**When:** Reward with `rewardType: 'loyalty-points'` is issued

**Process:**
1. Create reward record
2. Add points to user's `loyaltyPoints`
3. Update `totalPointsEarned`
4. Create transaction record:
```typescript
{
  type: 'earned',
  amount: rewardValue,
  orderId: orderId,
  rewardId: rewardId,
  description: `Earned ${rewardValue} points from order`,
  balanceAfter: user.loyaltyPoints
}
```

**Display:**
- Show points earned in order confirmation
- Update points balance in real-time
- Show transaction in points history

#### 3.4.3 Spending Points

**Eligibility:**
- Menu items with `pointsValue > 0`
- User has sufficient points balance
- During checkout only

**Conversion Rate:**
- **Configurable on Rewards Management page**
- Default: **100 points = ₦1**
- Menu item `pointsValue` = points required to redeem
- Rate stored in system settings

**Example (with default 100:1 rate):**
```typescript
// Menu Item
{
  name: "Chocolate Cake",
  price: 1500,
  pointsValue: 150000, // 150,000 points = ₦1,500 (100 points = ₦1)
  pointsRedeemable: true
}

// With custom rate (e.g., 50 points = ₦1)
{
  name: "Chocolate Cake",
  price: 1500,
  pointsValue: 75000, // 75,000 points = ₦1,500 (50 points = ₦1)
  pointsRedeemable: true
}
```

---

### 3.5 Menu Item Points Configuration

#### 3.5.1 Database Schema Updates

**MenuItem Model:**
```typescript
interface IMenuItem {
  // ... existing fields
  pointsValue?: number; // Points required to redeem (optional)
  pointsRedeemable: boolean; // Can be purchased with points
}
```

**Default Values:**
- `pointsValue`: `undefined` (not redeemable)
- `pointsRedeemable`: `false`

#### 3.5.2 Admin Dashboard - Menu Item Form

**New Fields in Edit/Create Form:**

```
┌─────────────────────────────────────────┐
│ Points Redemption Settings              │
├─────────────────────────────────────────┤
│                                         │
│ ☐ Allow points redemption               │
│                                         │
│ Points Value (optional)                 │
│ ┌─────────────────────────────────┐    │
│ │ 150000                          │    │
│ └─────────────────────────────────┘    │
│ ⓘ Points required to redeem this item  │
│   Current rate: {rate} points = ₦1     │
│                                         │
│ Auto-calculate:                         │
│ [Calculate from Price] button           │
│ (Sets pointsValue = price × {rate})     │
└─────────────────────────────────────────┘
```

**Validation:**
- If `pointsRedeemable` is true, `pointsValue` is required
- `pointsValue` must be positive integer
- Show conversion: "₦{price} = {price × conversionRate} points"
- Conversion rate fetched from system settings

**Location in Form:**
- After "Pricing" section
- Before "Inventory" section

---

### 3.6 Checkout Points Redemption

#### 3.6.1 Points Redemption UI

**Cart Summary Section:**
```
┌─────────────────────────────────────────┐
│ Your Points: 50,000 pts (= ₦500)       │
├─────────────────────────────────────────┤
│                                         │
│ Items Eligible for Points:              │
│                                         │
│ ☐ Chocolate Cake                        │
│   150,000 pts (₦1,500)                  │
│   You need 100,000 more points          │
│                                         │
│ ☑ Soft Drink                            │
│   30,000 pts (₦300)                     │
│   [Use Points] [Use Money]              │
│                                         │
└─────────────────────────────────────────┘
```

**Rules:**
- Show points balance at top
- List only items where `pointsRedeemable: true`
- Disable items where user lacks points
- Allow mixed payment (some items with points, some with money)
- Show remaining points after selection

#### 3.6.2 Order Calculation

**With Points Redemption:**
```
Subtotal (Money):       ₦4,700
Points Redeemed:        30,000 pts (-₦300)
Applied Rewards:        -₦500
─────────────────────────────
Subtotal After Discounts: ₦3,900
Service Fee (2%):       ₦78
Tax (7.5%):             ₦293
─────────────────────────────
Total:                  ₦4,271

Points Used:            30,000
Points Remaining:       20,000
```

**Order Record:**
```typescript
interface IOrder {
  // ... existing fields
  pointsUsed: number;
  pointsValue: number; // Naira equivalent
  itemsPaidWithPoints: Array<{
    itemId: string;
    pointsUsed: number;
  }>;
}
```

#### 3.6.3 Points Deduction Process

**On Order Confirmation:**
1. Validate user still has sufficient points
2. Deduct points from `user.loyaltyPoints`
3. Update `user.totalPointsSpent`
4. Create transaction record:
```typescript
{
  type: 'spent',
  amount: -30000,
  orderId: orderId,
  description: `Spent 30,000 points on order items`,
  balanceAfter: user.loyaltyPoints
}
```
5. Update order with points details
6. Show confirmation with new balance

---

### 3.7 Rewards Management - Points Conversion Rate Configuration

#### 3.7.1 Configuration UI Location

**Page:** `/dashboard/rewards` (Main Rewards Dashboard)  
**Section:** New "Points Settings" card/tab

**UI Design:**
```
┌─────────────────────────────────────────────────────────┐
│ Points Conversion Settings                              │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ Points to Naira Conversion Rate                         │
│ ┌─────────────────────────────────────────────────┐    │
│ │ 100                                             │    │
│ └─────────────────────────────────────────────────┘    │
│ points = ₦1                                             │
│                                                         │
│ ⓘ This rate determines how many loyalty points         │
│   equal ₦1 when customers redeem points for items.     │
│                                                         │
│ Examples with current rate:                             │
│ • 1,000 points = ₦10                                    │
│ • 10,000 points = ₦100                                  │
│ • 100,000 points = ₦1,000                               │
│                                                         │
│ Impact:                                                 │
│ • Menu items with points redemption will update        │
│ • Existing points balances remain unchanged            │
│ • Only affects future redemptions                      │
│                                                         │
│ [Save Changes]  [Reset to Default (100)]                │
│                                                         │
│ Last updated: Nov 19, 2025 by admin@wawa.com           │
└─────────────────────────────────────────────────────────┘
```

#### 3.7.2 Configuration Rules

**Validation:**
- Rate must be a positive integer
- Minimum: 1 point = ₦1
- Maximum: 1000 points = ₦1 (prevent extreme values)
- Default: 100 points = ₦1

**Change Impact:**
- Shows warning before saving if rate changes significantly
- Displays number of menu items with points redemption enabled
- Calculates impact on existing redeemable items

**Warning Dialog:**
```
┌─────────────────────────────────────────────────────────┐
│ ⚠️  Confirm Conversion Rate Change                      │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ You are changing the conversion rate from:              │
│ 100 points = ₦1  →  50 points = ₦1                     │
│                                                         │
│ Impact:                                                 │
│ • 12 menu items have points redemption enabled         │
│ • Customer points will be worth MORE                    │
│ • Items will cost FEWER points to redeem               │
│                                                         │
│ Example:                                                │
│ Item: Chocolate Cake (₦1,500)                           │
│ Old: 150,000 points → New: 75,000 points                │
│                                                         │
│ This change will affect all future redemptions.         │
│                                                         │
│ [Cancel]  [Confirm Change]                              │
└─────────────────────────────────────────────────────────┘
```

#### 3.7.3 Database Schema

**System Settings Collection:**
```typescript
interface ISystemSettings {
  _id: ObjectId;
  key: 'points-conversion-rate';
  value: number; // Points per 1 Naira
  description: string;
  updatedBy: ObjectId; // Admin user
  updatedAt: Date;
  previousValue?: number;
  changeHistory: Array<{
    value: number;
    changedBy: ObjectId;
    changedAt: Date;
    reason?: string;
  }>;
}
```

**Example Document:**
```typescript
{
  _id: ObjectId("..."),
  key: "points-conversion-rate",
  value: 100,
  description: "Number of loyalty points equal to ₦1",
  updatedBy: ObjectId("admin-user-id"),
  updatedAt: new Date("2025-11-19"),
  previousValue: 50,
  changeHistory: [
    {
      value: 100,
      changedBy: ObjectId("admin-user-id"),
      changedAt: new Date("2025-11-19"),
      reason: "Adjusted for better customer value"
    },
    {
      value: 50,
      changedBy: ObjectId("admin-user-id"),
      changedAt: new Date("2025-11-01"),
      reason: "Initial setup"
    }
  ]
}
```

#### 3.7.4 API Endpoints

**Get Conversion Rate:**
```typescript
GET /api/settings/points-conversion-rate
Response: {
  rate: 100,
  updatedAt: "2025-11-19T10:00:00Z",
  updatedBy: "admin@wawa.com"
}
```

**Update Conversion Rate:**
```typescript
POST /api/admin/settings/points-conversion-rate
Body: {
  rate: 100,
  reason?: "Optional reason for change"
}
Response: {
  success: true,
  rate: 100,
  previousRate: 50,
  affectedItems: 12
}
```

**Get Impact Analysis:**
```typescript
GET /api/admin/settings/points-conversion-rate/impact?newRate=50
Response: {
  currentRate: 100,
  newRate: 50,
  affectedMenuItems: 12,
  exampleChanges: [
    {
      itemName: "Chocolate Cake",
      price: 1500,
      currentPoints: 150000,
      newPoints: 75000
    }
  ],
  customerImpact: "Points will be worth MORE"
}
```

#### 3.7.5 Usage Throughout Application

**Menu Item Auto-Calculate:**
```typescript
// When admin clicks "Calculate from Price"
const conversionRate = await getPointsConversionRate(); // e.g., 100
const pointsValue = menuItem.price * conversionRate;
// For ₦1,500 item: 1500 × 100 = 150,000 points
```

**Customer Points Display:**
```typescript
// Show points value in naira
const conversionRate = await getPointsConversionRate();
const nairaValue = userPoints / conversionRate;
// 50,000 points ÷ 100 = ₦500
```

**Checkout Redemption:**
```typescript
// Calculate if user has enough points
const conversionRate = await getPointsConversionRate();
const requiredPoints = item.pointsValue; // Already stored
const userHasEnough = user.loyaltyPoints >= requiredPoints;
```

**Points Balance Display:**
```
Your Points: 50,000 pts (= ₦{50000 / conversionRate})
```

#### 3.7.6 Migration Considerations

**Initial Setup:**
1. Create system setting with default rate (100)
2. No migration needed for existing data
3. Existing menu items with `pointsValue` remain unchanged
4. Only affects new calculations

**When Rate Changes:**
1. Existing menu item `pointsValue` fields are NOT automatically updated
2. Admin must manually update menu items if desired
3. Or provide bulk update tool:
   ```
   [Recalculate All Menu Item Points]
   Updates all items with pointsRedeemable=true
   based on current price × new conversion rate
   ```

---

## 4. Implementation Phases

### Phase 1: Customer Rewards Page Fix
**Priority:** High  
**Effort:** Low  
**Tasks:**
1. Update RewardRuleCard component to match template format
2. Remove custom descriptions
3. Add probability percentage conversion
4. Test display with active rules

### Phase 2: Maximum Redemptions Enforcement
**Priority:** High  
**Effort:** Medium  
**Tasks:**
1. Create redemption tracking system
2. Add eligibility check function
3. Filter rewards page by eligibility
4. Update checkout to respect limits
5. Add UI indicators for remaining uses

### Phase 3: Automatic Reward Application
**Priority:** High  
**Effort:** High  
**Tasks:**
1. Add threshold detection to checkout
2. Implement automatic reward creation
3. Apply rewards to cart in real-time
4. Update cart UI to show applied rewards
5. Handle multiple rewards stacking
6. Test with various scenarios

### Phase 4: Points Balance Management
**Priority:** Medium  
**Effort:** Medium  
**Tasks:**
1. Update User model with points fields
2. Create PointsTransaction collection
3. Implement points earning logic
4. Add transaction tracking
5. Create points history UI
6. Test points earning flow

### Phase 5: Menu Item Points Configuration
**Priority:** Medium  
**Effort:** Medium  
**Tasks:**
1. Update MenuItem model
2. Add fields to menu item form
3. Add auto-calculate functionality
4. Update menu item display
5. Test admin configuration

### Phase 6: Checkout Points Redemption
**Priority:** Medium  
**Effort:** High  
**Tasks:**
1. Add points redemption UI to checkout
2. Implement item eligibility check
3. Add points calculation logic
4. Handle mixed payment
5. Implement points deduction
6. Update order records
7. Test full redemption flow

### Phase 7: Points Conversion Rate Configuration
**Priority:** Medium  
**Effort:** Low  
**Tasks:**
1. Create SystemSettings model
2. Add points conversion rate setting
3. Create configuration UI on rewards dashboard
4. Implement rate update API
5. Add impact analysis endpoint
6. Update menu item form to use dynamic rate
7. Update all points calculations to use setting
8. Add change history tracking
9. Test rate changes and impact

---

## 5. Database Schema Changes

### 5.0 SystemSettings Model (New)
```typescript
const systemSettingsSchema = new Schema({
  key: { 
    type: String, 
    required: true, 
    unique: true,
    enum: ['points-conversion-rate', 'service-fee', 'tax-rate'] 
  },
  value: { type: Schema.Types.Mixed, required: true },
  description: { type: String },
  updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  updatedAt: { type: Date, default: Date.now },
  previousValue: { type: Schema.Types.Mixed },
  changeHistory: [{
    value: { type: Schema.Types.Mixed },
    changedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    changedAt: { type: Date },
    reason: { type: String }
  }]
});
```

### 5.1 User Model
```typescript
// Add to existing IUser interface
loyaltyPoints: { type: Number, default: 0 }
totalPointsEarned: { type: Number, default: 0 }
totalPointsSpent: { type: Number, default: 0 }
```

### 5.2 MenuItem Model
```typescript
// Add to existing IMenuItem interface
pointsValue: { type: Number, required: false }
pointsRedeemable: { type: Boolean, default: false }
```

### 5.3 Order Model
```typescript
// Add to existing IOrder interface
pointsUsed: { type: Number, default: 0 }
pointsValue: { type: Number, default: 0 }
itemsPaidWithPoints: [{
  itemId: { type: Schema.Types.ObjectId, ref: 'MenuItem' },
  pointsUsed: { type: Number }
}]
```

### 5.4 New: PointsTransaction Model
```typescript
const pointsTransactionSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  type: { 
    type: String, 
    enum: ['earned', 'spent', 'expired', 'adjusted'], 
    required: true 
  },
  amount: { type: Number, required: true },
  orderId: { type: Schema.Types.ObjectId, ref: 'Order' },
  rewardId: { type: Schema.Types.ObjectId, ref: 'Reward' },
  description: { type: String, required: true },
  balanceAfter: { type: Number, required: true },
  createdAt: { type: Date, default: Date.now }
});
```

### 5.5 New: UserRewardRedemption Model (Optional)
```typescript
const userRewardRedemptionSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  ruleId: { type: Schema.Types.ObjectId, ref: 'RewardRule', required: true },
  redemptionCount: { type: Number, default: 0 },
  lastRedeemedAt: { type: Date }
});

// Compound index
userRewardRedemptionSchema.index({ userId: 1, ruleId: 1 }, { unique: true });
```

---

## 6. API Endpoints Required

### 6.1 Rewards
- `GET /api/rewards/eligible` - Get eligible rewards for user
- `POST /api/rewards/apply` - Apply reward to order
- `GET /api/rewards/user-redemptions/:ruleId` - Check user's redemption count

### 6.2 Points
- `GET /api/points/balance` - Get user's points balance
- `GET /api/points/transactions` - Get points transaction history
- `POST /api/points/redeem` - Redeem points for items
- `GET /api/points/eligible-items` - Get items user can redeem with points

### 6.3 Menu Items
- `PATCH /api/admin/menu-items/:id/points` - Update points configuration

### 6.4 System Settings
- `GET /api/settings/points-conversion-rate` - Get current conversion rate (public)
- `POST /api/admin/settings/points-conversion-rate` - Update conversion rate (admin)
- `GET /api/admin/settings/points-conversion-rate/impact` - Analyze impact of rate change (admin)

---

## 7. Testing Requirements

### 7.1 Unit Tests
- Eligibility check function
- Points calculation
- Reward application logic
- Max redemptions enforcement

### 7.2 Integration Tests
- Full checkout flow with rewards
- Points earning and spending
- Multiple rewards stacking
- Edge cases (insufficient points, max redemptions)

### 7.3 User Acceptance Testing
- Admin configures reward rules
- Customer views available rewards
- Customer places order and receives reward
- Reward automatically applies
- Customer earns and spends points
- Points balance updates correctly

---

## 8. Success Criteria

### 8.1 Customer Rewards Page
- ✅ Displays match template format exactly
- ✅ Only shows active, eligible rewards
- ✅ Respects max redemptions per user
- ✅ Shows remaining uses when applicable

### 8.2 Automatic Rewards
- ✅ Rewards apply automatically at checkout
- ✅ Cart shows applied rewards
- ✅ Multiple rewards can stack
- ✅ Max redemptions enforced

### 8.3 Points System
- ✅ Points earned and added to balance
- ✅ Points can be spent on eligible items
- ✅ Balance updates in real-time
- ✅ Transaction history tracked
- ✅ Conversion rate correct (100 pts = ₦1)

### 8.4 Menu Configuration
- ✅ Admin can set points value per item
- ✅ Auto-calculate works correctly
- ✅ Points items show in checkout
- ✅ Only eligible items can be redeemed

### 8.5 Points Conversion Rate
- ✅ Rate is configurable on rewards dashboard
- ✅ Changes show impact analysis
- ✅ Change history is tracked
- ✅ All calculations use dynamic rate
- ✅ Menu item auto-calculate uses current rate

---

## 9. Open Questions

1. **Points Expiration:** Should points expire after a certain period?
2. **Partial Points:** Can users use partial points + money for a single item?
3. **Points Transfer:** Can points be transferred between users?
4. **Minimum Points:** Is there a minimum points balance required?
5. **Points Refund:** What happens to points if order is cancelled?
6. **Reward Stacking Limits:** Maximum number of rewards per order?
7. **Points Display:** Show points value on menu items for all users or only logged-in?
8. **Rate Change Impact:** Should existing menu item points values auto-update when rate changes?
9. **Bulk Update Tool:** Provide tool to recalculate all menu item points after rate change?

---

## 10. Related Documents

- `/docs/requirements.md` - Original requirements
- `/docs/deliverables-strategy.md` - Implementation strategy
- `/app/dashboard/rewards/templates/page.tsx` - Template reference
- `/interfaces/reward.interface.ts` - Reward data structures

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-11-19 | System | Initial specification |
| 1.1 | 2025-11-19 | System | Added configurable points conversion rate |
