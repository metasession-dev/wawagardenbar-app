# Admin Order Process - Separation of Admin and Customer Flows

## Overview

Admins and customers are fundamentally different user types in the Wawa Garden Bar system. This document outlines the requirements and implementation plan to properly separate admin order creation flows from customer order flows, ensuring admins can create orders and tabs on behalf of customers without being subject to customer-specific restrictions.

## Current State vs. Desired State

### Current Issues

1. **User Type Confusion**: The system currently treats admin users similarly to customer users in the checkout flow
2. **Tab Restrictions**: Admins may be incorrectly restricted by open tab logic that should only apply to customers
3. **Authentication Separation**: Admin users (created via dashboard) and customer users (created via login page) need clearer separation
4. **Order Creation Context**: When admins create orders, they're creating them FOR customers, not for themselves

### Desired State

1. **Clear User Type Separation**: Admin users and customer users are distinct entities with different capabilities
2. **Admin Flexibility**: Admins can create multiple orders and tabs without restrictions
3. **Customer Restrictions**: Customers remain subject to existing tab restrictions (one open tab at a time)
4. **Context-Aware Logic**: System understands when an admin is creating an order on behalf of a customer vs. a customer creating their own order

## User Type Definitions

### Admin Users
- **Created**: Via dashboard (`/dashboard/settings/admins`)
- **Authentication**: Username/password via `/admin/login`
- **Roles**: `admin` or `super-admin`
- **Database**: User model with `isAdmin: true`
- **Capabilities**:
  - Create orders on behalf of customers
  - Create tabs on behalf of customers
  - Process manual payments
  - Access dashboard
  - Not subject to tab restrictions
  - Can have multiple concurrent operations

### Customer Users
- **Created**: Via customer login page (`/login`) with email/PIN
- **Authentication**: Email/PIN verification
- **Roles**: `customer` (default)
- **Database**: User model with `isAdmin: false` or undefined
- **Capabilities**:
  - Create their own orders
  - Open/manage their own tabs
  - Subject to tab restrictions (one open tab at a time)
  - Cannot access dashboard
  - Standard customer checkout flow

## Requirements

### Functional Requirements

#### 1. Admin Order Creation Flow

**Location**: `/checkout` when accessed by admin users

**Behavior**:
- Admins should NOT be checked for existing open tabs
- Admins should NOT be restricted from creating multiple orders
- Admins should NOT be locked to specific tables
- Admin-created orders should record:
  - Customer information (name, email, phone)
  - Admin who created the order (createdBy field)
  - Whether order is for a tab or immediate payment

**Key Distinction**:
```typescript
// Current (incorrect):
if (user.role === 'admin') {
  // Check if admin has open tab - WRONG
  const existingTab = await getOpenTabForUser(user.id);
}

// Correct:
if (user.role === 'admin') {
  // Admins are never restricted by tabs
  // They create orders FOR customers, not for themselves
  // No tab checks needed
}
```

#### 2. Customer Order Creation Flow

**Location**: `/checkout` when accessed by customer users

**Behavior** (unchanged):
- Check for existing open tabs
- Restrict to one open tab at a time
- Lock to specific table if tab exists
- Standard customer checkout flow

#### 3. Tab Association Logic

**Current Problem**:
```typescript
// Order model
{
  userId: ObjectId, // Could be admin OR customer
  tabId: ObjectId,
  // No way to distinguish who the order is FOR
}
```

**Solution**:
```typescript
// Order model - Enhanced
{
  userId: ObjectId, // The customer this order is FOR
  createdBy: ObjectId, // The user who created it (admin or customer)
  createdByRole: 'admin' | 'super-admin' | 'customer',
  tabId: ObjectId,
  // Now we know: admin created this order for customer (userId)
}

// Tab model - Enhanced
{
  userId: ObjectId, // The customer this tab is FOR
  createdBy: ObjectId, // The user who created it (admin or customer)
  createdByRole: 'admin' | 'super-admin' | 'customer',
  // Now we know: admin created this tab for customer (userId)
}
```

#### 4. Tab Restriction Logic

**Rule**: Tab restrictions apply to CUSTOMERS, not ADMINS

```typescript
// Check for existing open tab
async function checkExistingTab(context: {
  userRole: string;
  userId: string;
  tableNumber?: string;
}) {
  // Admins are never restricted
  if (context.userRole === 'admin' || context.userRole === 'super-admin') {
    return { hasOpenTab: false, existingTab: null };
  }
  
  // Customers are subject to restrictions
  if (context.userRole === 'customer') {
    // Check if customer has an open tab
    const existingTab = await TabModel.findOne({
      userId: context.userId, // Customer's ID
      status: 'open',
    });
    
    return { 
      hasOpenTab: !!existingTab, 
      existingTab 
    };
  }
}
```

#### 5. Admin Checkout Flow Modifications

**Customer Info Step**:
- Admin enters customer's information (not their own)
- Fields: Customer Name, Customer Email, Customer Phone
- Optional: Link to existing customer profile

**Order Details Step**:
- Admin selects order type (dine-in, pickup, delivery)
- For dine-in: Admin selects table number (no restrictions)
- No checks for admin's open tabs

**Tab Options Step** (Dine-in only):
- Admin decides if customer is:
  - **Pay Now**: Order paid immediately
  - **New Tab**: Create new tab for customer
  - **Existing Tab**: Add to customer's existing tab (if any)
- Check for customer's open tabs (not admin's)
- If customer has open tab, show option to add to it

**Payment Step**:
- Admin sees admin payment options:
  - Manual Payment Entry (cash, transfer, card)
  - Full Checkout Process (gateway)
- Customer sees standard gateway options

### Non-Functional Requirements

#### 1. Data Integrity

- Orders must clearly indicate who they're FOR (userId) vs. who created them (createdBy)
- Tabs must clearly indicate ownership (customer) vs. creator (admin)
- Audit logs must track admin actions on behalf of customers

#### 2. Security

- Admins cannot access customer-only routes
- Customers cannot access admin-only routes
- Tab restrictions enforced at service layer, not just UI
- Proper authorization checks on all endpoints

#### 3. Backward Compatibility

- Existing orders without `createdBy` field default to `userId`
- Existing tabs without `createdBy` field default to `userId`
- Migration script to populate historical data

## Implementation Plan

### Phase 1: Database Schema Updates

#### 1.1 Update Order Interface and Model

**File**: `/interfaces/order.interface.ts`

```typescript
export interface IOrder {
  // ... existing fields
  userId?: Types.ObjectId; // Customer this order is FOR
  createdBy?: Types.ObjectId; // User who created the order
  createdByRole?: 'admin' | 'super-admin' | 'customer';
  // ... rest of fields
}
```

**File**: `/models/order-model.ts`

```typescript
const orderSchema = new Schema({
  // ... existing fields
  userId: { type: Schema.Types.ObjectId, ref: 'User' },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  createdByRole: { 
    type: String, 
    enum: ['admin', 'super-admin', 'customer'],
    default: 'customer'
  },
  // ... rest of fields
});
```

#### 1.2 Update Tab Interface and Model

**File**: `/interfaces/tab.interface.ts`

```typescript
export interface ITab {
  // ... existing fields
  userId?: Types.ObjectId; // Customer this tab is FOR
  createdBy?: Types.ObjectId; // User who created the tab
  createdByRole?: 'admin' | 'super-admin' | 'customer';
  // ... rest of fields
}
```

**File**: `/models/tab-model.ts`

```typescript
const tabSchema = new Schema({
  // ... existing fields
  userId: { type: Schema.Types.ObjectId, ref: 'User' },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  createdByRole: { 
    type: String, 
    enum: ['admin', 'super-admin', 'customer'],
    default: 'customer'
  },
  // ... rest of fields
});
```

### Phase 2: Service Layer Updates

#### 2.1 Update OrderService

**File**: `/services/order-service.ts`

```typescript
class OrderService {
  static async createOrder(params: {
    // ... existing params
    createdBy: string; // User creating the order
    createdByRole: 'admin' | 'super-admin' | 'customer';
  }): Promise<IOrder> {
    // ... existing logic
    
    const order = await Order.create({
      // ... existing fields
      userId: params.userId, // Customer
      createdBy: params.createdBy, // Creator (admin or customer)
      createdByRole: params.createdByRole,
    });
    
    return order;
  }
}
```

#### 2.2 Update TabService

**File**: `/services/tab-service.ts`

```typescript
class TabService {
  static async createTab(params: {
    // ... existing params
    createdBy: string; // User creating the tab
    createdByRole: 'admin' | 'super-admin' | 'customer';
  }): Promise<ITab> {
    // ... existing logic
    
    const tab = await TabModel.create({
      // ... existing fields
      userId: params.userId, // Customer
      createdBy: params.createdBy, // Creator (admin or customer)
      createdByRole: params.createdByRole,
    });
    
    return tab;
  }
  
  /**
   * Get open tab for a specific customer
   * Used by admins to check if customer has open tab
   */
  static async getOpenTabForCustomer(customerId: string): Promise<ITab | null> {
    await connectDB();
    
    const tab = await TabModel.findOne({
      userId: customerId, // Customer's ID
      status: 'open',
    });
    
    return tab ? tab.toObject() : null;
  }
}
```

#### 2.3 Create Tab Restriction Helper

**File**: `/lib/tab-restrictions.ts`

```typescript
import { TabService } from '@/services/tab-service';

export interface TabRestrictionContext {
  userRole: 'admin' | 'super-admin' | 'customer';
  userId: string; // Current user's ID
  customerId?: string; // Customer ID (for admin creating order)
  tableNumber?: string;
}

export interface TabRestrictionResult {
  isRestricted: boolean;
  existingTab: ITab | null;
  message?: string;
}

/**
 * Check if user is restricted by existing tabs
 * Admins are never restricted
 * Customers are restricted to one open tab
 */
export async function checkTabRestrictions(
  context: TabRestrictionContext
): Promise<TabRestrictionResult> {
  // Admins are never restricted
  if (context.userRole === 'admin' || context.userRole === 'super-admin') {
    // If admin is creating order for customer, check customer's tabs
    if (context.customerId) {
      const customerTab = await TabService.getOpenTabForCustomer(context.customerId);
      return {
        isRestricted: false, // Admin not restricted, but customer has tab
        existingTab: customerTab,
        message: customerTab 
          ? `Customer has an open tab at Table ${customerTab.tableNumber}`
          : undefined,
      };
    }
    
    return {
      isRestricted: false,
      existingTab: null,
    };
  }
  
  // Customers are subject to restrictions
  if (context.userRole === 'customer') {
    const existingTab = await TabService.listOpenTabs(context.userId);
    
    if (existingTab.length > 0) {
      return {
        isRestricted: true,
        existingTab: existingTab[0],
        message: `You have an open tab at Table ${existingTab[0].tableNumber}`,
      };
    }
  }
  
  return {
    isRestricted: false,
    existingTab: null,
  };
}
```

### Phase 3: Server Actions Updates

#### 3.1 Update Order Creation Actions

**File**: `/app/actions/payment/payment-actions.ts`

```typescript
export async function createOrder(params: {
  // ... existing params
}) {
  const session = await getSession();
  
  // ... existing logic
  
  const order = await OrderService.createOrder({
    // ... existing params
    userId: params.customerInfo.userId || undefined, // Customer ID (if known)
    createdBy: session.userId, // Current user (admin or customer)
    createdByRole: session.role || 'customer',
  });
  
  return { success: true, data: { orderId: order._id.toString() } };
}
```

#### 3.2 Update Tab Creation Actions

**File**: `/app/actions/tabs/tab-actions.ts`

```typescript
export async function createTabAction(params: {
  // ... existing params
  customerId?: string; // Optional: specific customer ID
}) {
  const session = await getSession();
  
  // ... existing logic
  
  const tab = await TabService.createTab({
    // ... existing params
    userId: params.customerId || session.userId, // Customer or current user
    createdBy: session.userId, // Current user (admin or customer)
    createdByRole: session.role || 'customer',
  });
  
  return { success: true, data: { tab } };
}
```

### Phase 4: Checkout Flow Updates

#### 4.1 Update CheckoutForm Component

**File**: `/components/features/checkout/checkout-form.tsx`

**Changes**:
1. Remove admin tab restriction checks
2. Add customer ID tracking for admin-created orders
3. Pass creator context to order/tab creation

```typescript
export function CheckoutForm() {
  const { user, role } = useAuth();
  const isAdmin = role === 'admin' || role === 'super-admin';
  
  // ... existing state
  
  // Check tab restrictions based on user role
  useEffect(() => {
    async function checkRestrictions() {
      if (isAdmin) {
        // Admins are never restricted
        setExistingTab(null);
        setIsTableLocked(false);
        return;
      }
      
      // Check customer restrictions
      if (user?.id) {
        const result = await checkTabRestrictions({
          userRole: 'customer',
          userId: user.id,
        });
        
        setExistingTab(result.existingTab);
        setIsTableLocked(result.isRestricted);
      }
    }
    
    checkRestrictions();
  }, [user, isAdmin]);
  
  // ... rest of component
}
```

#### 4.2 Update TabOptionsStep Component

**File**: `/components/features/checkout/tab-options-step.tsx`

**Changes**:
1. For admins: Check if CUSTOMER has open tab (not admin)
2. Show appropriate messaging for admin vs. customer context

```typescript
export function TabOptionsStep({ form, isAdmin }: TabOptionsStepProps) {
  // ... existing logic
  
  // Check for customer's open tab (if admin is creating order)
  useEffect(() => {
    if (isAdmin) {
      // Admin creating order - check customer's tabs
      // This requires customer identification logic
      // Could be based on email entered in customer info step
    } else {
      // Customer creating order - check their own tabs
      // Existing logic
    }
  }, [isAdmin]);
  
  // ... rest of component
}
```

### Phase 5: UI/UX Updates

#### 5.1 Admin Checkout Indicators

**Add visual indicators when admin is creating orders**:
- Badge: "Creating order as Admin"
- Customer info section: "Customer Information" (not "Your Information")
- Clear distinction that admin is acting on behalf of customer

#### 5.2 Tab Restriction Messaging

**Customer View**:
- "You have an open tab at Table 5"
- "Close your tab or add to it"

**Admin View**:
- "Customer has an open tab at Table 5"
- "You can create a new tab or add to existing tab"
- No restrictions on admin actions

### Phase 6: Migration Script

#### 6.1 Backfill Historical Data

**File**: `/scripts/migrate-order-creator-fields.ts`

```typescript
import { connectDB } from '@/lib/mongodb';
import Order from '@/models/order-model';
import TabModel from '@/models/tab-model';

async function migrateOrderCreatorFields() {
  await connectDB();
  
  // Update orders without createdBy field
  await Order.updateMany(
    { createdBy: { $exists: false } },
    { 
      $set: { 
        createdBy: '$userId', // Default to userId
        createdByRole: 'customer' // Assume customer
      } 
    }
  );
  
  // Update tabs without createdBy field
  await TabModel.updateMany(
    { createdBy: { $exists: false } },
    { 
      $set: { 
        createdBy: '$userId', // Default to userId
        createdByRole: 'customer' // Assume customer
      } 
    }
  );
  
  console.log('Migration complete');
}

migrateOrderCreatorFields();
```

### Phase 7: Testing Plan

#### 7.1 Unit Tests

- `TabService.getOpenTabForCustomer()` - returns correct customer tab
- `checkTabRestrictions()` - admins never restricted
- `checkTabRestrictions()` - customers properly restricted
- Order creation with `createdBy` field
- Tab creation with `createdBy` field

#### 7.2 Integration Tests

- Admin creates order for customer with open tab
- Admin creates multiple orders without restrictions
- Customer creates order with open tab (should be restricted)
- Customer creates order without open tab (should succeed)

#### 7.3 E2E Tests (Playwright)

**Test: Admin Order Creation**
1. Login as admin
2. Navigate to checkout
3. Enter customer information
4. Select dine-in with table number
5. Verify no tab restrictions shown
6. Create order successfully
7. Verify order has correct `createdBy` and `userId` fields

**Test: Customer Order Creation**
1. Login as customer
2. Create order with tab
3. Attempt to create second order
4. Verify restriction message shown
5. Verify forced to add to existing tab

## Security Considerations

### 1. Authorization Checks

- All admin-specific actions must verify `requireAdmin()` middleware
- Customer-specific actions must verify customer role
- Tab operations must verify ownership or admin privileges

### 2. Data Validation

- Validate `createdBy` matches session user
- Validate `createdByRole` matches session role
- Prevent role escalation attempts

### 3. Audit Logging

- Log all admin actions on behalf of customers
- Track order/tab creator in audit logs
- Monitor for suspicious patterns

## Rollout Plan

### Phase 1: Database & Backend (Week 1)
- Update interfaces and models
- Update service layer
- Create migration script
- Run migration on staging

### Phase 2: Server Actions (Week 1-2)
- Update order creation actions
- Update tab creation actions
- Add tab restriction helper
- Unit tests

### Phase 3: Frontend Updates (Week 2)
- Update checkout flow
- Update tab options step
- Add admin indicators
- Integration tests

### Phase 4: Testing & QA (Week 2-3)
- Unit tests
- Integration tests
- E2E tests
- Manual testing

### Phase 5: Deployment (Week 3)
- Deploy to staging
- Run migration script
- Smoke tests
- Deploy to production
- Monitor for issues

## Success Criteria

1. ✅ Admins can create multiple orders without tab restrictions
2. ✅ Customers remain subject to existing tab restrictions
3. ✅ Orders clearly indicate creator vs. customer
4. ✅ Tabs clearly indicate creator vs. customer
5. ✅ No breaking changes to customer flow
6. ✅ All tests passing
7. ✅ Audit logs properly tracking admin actions

## Customer Impact

**Zero Impact** - Customer flow remains completely unchanged:
- Same login process
- Same checkout flow
- Same tab restrictions
- Same payment options
- Same order tracking

## Notes

- This change primarily affects admin workflows
- Customer experience is preserved exactly as-is
- Clear separation of concerns between admin and customer contexts
- Improved data integrity with creator tracking
- Better audit trail for compliance
