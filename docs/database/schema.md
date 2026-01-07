# Database Schema Documentation

## Overview

This document describes the MongoDB database schema for the Wawa Garden Bar application. All models use Mongoose ODM with TypeScript strict typing.

---

## Collections

### 1. Users Collection

**Model:** `UserModel`  
**Interface:** `IUser`  
**File:** `/models/user-model.ts`

Stores user account information for both registered users and guest checkout data.

#### Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `_id` | ObjectId | Auto | Unique user identifier |
| `name` | String | No | User's full name |
| `email` | String | Yes | Unique email address (lowercase, indexed) |
| `emailVerified` | Boolean | Yes | Email verification status (default: false) |
| `phone` | String | No | Contact phone number |
| `verificationPin` | String | No | 4-digit PIN for passwordless auth (select: false) |
| `pinExpiresAt` | Date | No | PIN expiration timestamp (select: false) |
| `sessionToken` | String | No | Current session token (select: false, indexed) |
| `addresses` | Array<IAddress> | No | Saved delivery addresses |
| `paymentMethods` | Array<IPaymentMethod> | No | Saved payment methods |
| `totalSpent` | Number | Yes | Lifetime spending total (default: 0) |
| `rewardsEarned` | Number | Yes | Total rewards earned (default: 0) |
| `orderCount` | Number | Yes | Total number of orders (default: 0) |
| `isGuest` | Boolean | Yes | Guest user flag (default: false) |
| `lastLoginAt` | Date | No | Last login timestamp |
| `createdAt` | Date | Auto | Account creation timestamp |
| `updatedAt` | Date | Auto | Last update timestamp |

#### Nested Schemas

**IAddress:**
- `street`: String (required)
- `city`: String (required)
- `state`: String (required)
- `postalCode`: String (required)
- `country`: String (default: 'Nigeria')
- `isDefault`: Boolean (default: false)

**IPaymentMethod:**
- `type`: 'card' | 'transfer' | 'ussd' | 'phone'
- `details`: String (encrypted reference)
- `isDefault`: Boolean

#### Indexes
- `email` (unique)
- `sessionToken`
- `createdAt` (descending)

#### Methods
- `incrementOrderCount()`: Increment user's order count
- `addToTotalSpent(amount)`: Add to user's total spending

---

### 2. MenuItems Collection

**Model:** `MenuItemModel`  
**Interface:** `IMenuItem`  
**File:** `/models/menu-item-model.ts`

Stores menu items with categories, pricing, and customization options.

#### Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `_id` | ObjectId | Auto | Unique menu item identifier |
| `name` | String | Yes | Item name (indexed) |
| `description` | String | Yes | Item description |
| `mainCategory` | 'drinks' \| 'food' | Yes | Main category (indexed) |
| `category` | MenuCategory | Yes | Specific category (indexed) |
| `price` | Number | Yes | Base price (min: 0) |
| `images` | String[] | No | Array of image URLs |
| `customizations` | Array<ICustomization> | No | Available customizations |
| `isAvailable` | Boolean | Yes | Availability status (default: true, indexed) |
| `preparationTime` | Number | Yes | Prep time in minutes |
| `tags` | String[] | No | Searchable tags (indexed) |
| `allergens` | String[] | No | Allergen information |
| `nutritionalInfo` | Object | No | Nutritional data |
| `createdAt` | Date | Auto | Creation timestamp |
| `updatedAt` | Date | Auto | Last update timestamp |

#### Menu Categories

**Drinks:**
- `beer-local`
- `beer-imported`
- `beer-craft`
- `wine`
- `soft-drinks`

**Food:**
- `starters`
- `main-courses`
- `desserts`

#### Nested Schemas

**ICustomization:**
- `name`: String (e.g., "Size", "Extras")
- `required`: Boolean
- `options`: Array<ICustomizationOption>

**ICustomizationOption:**
- `name`: String (e.g., "Large", "Extra Cheese")
- `price`: Number (additional cost)
- `available`: Boolean

#### Indexes
- Text search on `name`, `description`, `tags`
- Compound: `mainCategory` + `category`
- Compound: `isAvailable` + `mainCategory`

---

### 3. Orders Collection

**Model:** `OrderModel`  
**Interface:** `IOrder`  
**File:** `/models/order-model.ts`

Stores customer orders with status tracking and order type details.

#### Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `_id` | ObjectId | Auto | Unique order identifier |
| `orderNumber` | String | Yes | Human-readable order number (unique, indexed) |
| `userId` | ObjectId | No | Reference to User (indexed) |
| `guestEmail` | String | No | Guest customer email |
| `guestName` | String | No | Guest customer name |
| `guestPhone` | String | No | Guest customer phone |
| `orderType` | OrderType | Yes | 'dine-in' \| 'pickup' \| 'delivery' (indexed) |
| `status` | OrderStatus | Yes | Current order status (indexed) |
| `items` | Array<IOrderItem> | Yes | Ordered items |
| `subtotal` | Number | Yes | Items subtotal |
| `tax` | Number | Yes | Tax amount (default: 0) |
| `deliveryFee` | Number | Yes | Delivery fee (default: 0) |
| `discount` | Number | Yes | Discount amount (default: 0) |
| `total` | Number | Yes | Final total |
| `paymentId` | ObjectId | No | Reference to Payment |
| `deliveryDetails` | IDeliveryDetails | No | Delivery-specific data |
| `pickupDetails` | IPickupDetails | No | Pickup-specific data |
| `dineInDetails` | IDineInDetails | No | Dine-in-specific data |
| `specialInstructions` | String | No | Customer notes |
| `estimatedWaitTime` | Number | Yes | Estimated time in minutes |
| `actualWaitTime` | Number | No | Actual time in minutes |
| `statusHistory` | Array | Yes | Status change log |
| `rating` | Number | No | Customer rating (1-5) |
| `review` | String | No | Customer review |
| `createdAt` | Date | Auto | Order creation timestamp |
| `updatedAt` | Date | Auto | Last update timestamp |

#### Order Status Flow
1. `pending` → Order created
2. `confirmed` → Payment confirmed
3. `preparing` → Kitchen preparing
4. `ready` → Ready for pickup/delivery
5. `out-for-delivery` → (Delivery only)
6. `delivered` → Delivered to customer
7. `completed` → Order finalized
8. `cancelled` → Order cancelled

#### Indexes
- `orderNumber` (unique)
- Compound: `userId` + `createdAt` (descending)
- Compound: `status` + `orderType`
- `createdAt` (descending)
- `guestEmail`

---

### 4. Payments Collection

**Model:** `PaymentModel`  
**Interface:** `IPayment`  
**File:** `/models/payment-model.ts`

Stores payment transactions with Monnify integration data.

#### Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `_id` | ObjectId | Auto | Unique payment identifier |
| `orderId` | ObjectId | Yes | Reference to Order (indexed) |
| `userId` | ObjectId | No | Reference to User (indexed) |
| `amount` | Number | Yes | Payment amount |
| `currency` | String | Yes | Currency code (default: 'NGN') |
| `paymentMethod` | PaymentMethod | Yes | Payment method used (indexed) |
| `status` | PaymentStatus | Yes | Payment status (indexed) |
| `paymentReference` | String | Yes | Unique payment reference (indexed) |
| `transactionReference` | String | No | Monnify transaction ref (indexed) |
| `monnifyResponse` | IMonnifyResponse | No | Full Monnify response |
| `webhookData` | Object | No | Webhook payload |
| `failureReason` | String | No | Failure description |
| `refundAmount` | Number | No | Refunded amount |
| `refundReason` | String | No | Refund reason |
| `refundedAt` | Date | No | Refund timestamp |
| `paidAt` | Date | No | Payment completion time (indexed) |
| `metadata` | Object | Yes | Customer and order info |
| `createdAt` | Date | Auto | Creation timestamp |
| `updatedAt` | Date | Auto | Last update timestamp |

#### Payment Methods
- `card` - Credit/Debit card
- `transfer` - Bank transfer
- `ussd` - USSD payment
- `phone` - Phone number payment

#### Payment Status
- `pending` - Initiated
- `processing` - In progress
- `paid` - Successfully paid
- `failed` - Payment failed
- `cancelled` - Cancelled by user
- `refunded` - Fully refunded
- `partially-refunded` - Partially refunded

#### Indexes
- `paymentReference` (unique)
- `transactionReference`
- `orderId`
- Compound: `status` + `createdAt` (descending)
- `metadata.customerEmail`

---

### 5. RewardRules Collection

**Model:** `RewardRuleModel`  
**Interface:** `IRewardRule`  
**File:** `/models/reward-rule-model.ts`

Defines rules for the random rewards system.

#### Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `_id` | ObjectId | Auto | Unique rule identifier |
| `name` | String | Yes | Rule name |
| `description` | String | Yes | Rule description |
| `isActive` | Boolean | Yes | Active status (default: true, indexed) |
| `spendThreshold` | Number | Yes | Minimum spend to trigger |
| `rewardType` | RewardType | Yes | Type of reward |
| `rewardValue` | Number | Yes | Reward value/amount |
| `freeItemId` | ObjectId | No | Reference to MenuItem (for free items) |
| `probability` | Number | Yes | Probability (0-1) |
| `maxRedemptionsPerUser` | Number | No | Max uses per user |
| `validityDays` | Number | Yes | Reward validity period |
| `startDate` | Date | No | Rule start date |
| `endDate` | Date | No | Rule end date |
| `createdAt` | Date | Auto | Creation timestamp |
| `updatedAt` | Date | Auto | Last update timestamp |

#### Reward Types
- `discount-percentage` - Percentage discount
- `discount-fixed` - Fixed amount discount
- `free-item` - Free menu item
- `loyalty-points` - Loyalty points

#### Methods
- `isCurrentlyActive()`: Check if rule is currently active

#### Indexes
- Compound: `isActive` + `spendThreshold`
- Compound: `startDate` + `endDate`

---

### 6. Rewards Collection

**Model:** `RewardModel`  
**Interface:** `IReward`  
**File:** `/models/reward-model.ts`

Stores individual rewards earned by users.

#### Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `_id` | ObjectId | Auto | Unique reward identifier |
| `userId` | ObjectId | Yes | Reference to User (indexed) |
| `ruleId` | ObjectId | Yes | Reference to RewardRule |
| `orderId` | ObjectId | Yes | Order that triggered reward |
| `rewardType` | RewardType | Yes | Type of reward |
| `rewardValue` | Number | Yes | Reward value |
| `freeItemId` | ObjectId | No | Reference to MenuItem |
| `status` | RewardStatus | Yes | Reward status (indexed) |
| `code` | String | Yes | Unique redemption code (indexed) |
| `expiresAt` | Date | Yes | Expiration date (indexed) |
| `redeemedAt` | Date | No | Redemption timestamp |
| `redeemedInOrderId` | ObjectId | No | Order where redeemed |
| `createdAt` | Date | Auto | Creation timestamp |
| `updatedAt` | Date | Auto | Last update timestamp |

#### Reward Status
- `pending` - Awaiting activation
- `active` - Available for use
- `redeemed` - Used
- `expired` - Expired

#### Methods
- `isExpired()`: Check if reward is expired
- `canBeRedeemed()`: Check if reward can be used

#### Indexes
- Compound: `userId` + `status`
- `code` (unique)
- Compound: `expiresAt` + `status`

---

### 7. Inventory Collection

**Model:** `InventoryModel`  
**Interface:** `IInventory`  
**File:** `/models/inventory-model.ts`

Tracks stock levels for menu items.

#### Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `_id` | ObjectId | Auto | Unique inventory identifier |
| `menuItemId` | ObjectId | Yes | Reference to MenuItem (unique, indexed) |
| `currentStock` | Number | Yes | Current stock level |
| `minimumStock` | Number | Yes | Low stock threshold |
| `maximumStock` | Number | Yes | Maximum stock capacity |
| `unit` | String | Yes | Unit of measurement |
| `status` | StockStatus | Yes | Stock status (indexed) |
| `lastRestocked` | Date | No | Last restock timestamp |
| `stockHistory` | Array<IStockHistory> | Yes | Stock change log |
| `autoReorderEnabled` | Boolean | Yes | Auto-reorder flag |
| `reorderQuantity` | Number | Yes | Reorder amount |
| `supplier` | String | No | Supplier name |
| `costPerUnit` | Number | Yes | Cost per unit |
| `createdAt` | Date | Auto | Creation timestamp |
| `updatedAt` | Date | Auto | Last update timestamp |

#### Stock Status
- `in-stock` - Adequate stock
- `low-stock` - Below minimum threshold
- `out-of-stock` - No stock available

#### Methods
- `addStock(quantity, reason, performedBy)`: Add stock
- `deductStock(quantity, reason, performedBy)`: Remove stock
- `adjustStock(newQuantity, reason, performedBy)`: Adjust stock

#### Indexes
- `menuItemId` (unique)
- `status`
- `currentStock`

---

## Relationships

```
User (1) ----< (N) Order
User (1) ----< (N) Reward
User (1) ----< (N) Payment

MenuItem (1) ----< (N) OrderItem
MenuItem (1) ---- (1) Inventory
MenuItem (1) ----< (N) RewardRule (for free items)

Order (1) ---- (1) Payment
Order (1) ----< (N) Reward (triggering order)

RewardRule (1) ----< (N) Reward
```

---

## Usage Examples

### Creating a User
```typescript
import { UserModel } from '@/models';

const user = await UserModel.create({
  email: 'customer@example.com',
  name: 'John Doe',
  emailVerified: false,
});
```

### Creating a Menu Item
```typescript
import { MenuItemModel } from '@/models';

const menuItem = await MenuItemModel.create({
  name: 'Craft Beer',
  description: 'Local craft beer',
  mainCategory: 'drinks',
  category: 'beer-craft',
  price: 1500,
  preparationTime: 5,
  isAvailable: true,
});
```

### Creating an Order
```typescript
import { OrderModel } from '@/models';

const order = await OrderModel.create({
  orderNumber: 'ORD-2025-001',
  userId: user._id,
  orderType: 'dine-in',
  status: 'pending',
  items: [...],
  subtotal: 5000,
  total: 5000,
  estimatedWaitTime: 20,
});
```

---

## Best Practices

1. **Always use TypeScript interfaces** when working with models
2. **Use indexes** for frequently queried fields
3. **Populate references** only when needed to avoid performance issues
4. **Use transactions** for operations affecting multiple collections
5. **Validate data** with Zod schemas before saving to database
6. **Use select: false** for sensitive fields (passwords, tokens)
7. **Implement soft deletes** if needed (add `deletedAt` field)
8. **Use pre/post hooks** for business logic (e.g., status updates)

---

*Last updated: November 13, 2025*
