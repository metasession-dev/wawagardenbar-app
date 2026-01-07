# User Profile Auto-Population Implementation Plan

## Overview
Implement progressive profile enhancement where user profiles are automatically populated during authentication and checkout flows, with special handling for tab-based orders to minimize checkout friction.

---

## Phase 1: Profile Auto-Population on Authentication

### 1.1 Update Authentication Flow
**Files to modify:**
- `/app/api/auth/verify-pin/route.ts`
- `/services/user-service.ts`

**Tasks:**
- [ ] Modify PIN verification endpoint to create/update user profile on successful authentication
- [ ] On first login (new user):
  - Create user document with email only
  - Set `isGuest: false`
  - Initialize empty arrays for addresses, preferences
- [ ] On returning user login:
  - Update `lastLoginAt` timestamp
  - Return existing profile data

**Implementation Details:**
```typescript
// In verify-pin route/service
async function handleSuccessfulLogin(email: string) {
  let user = await UserModel.findOne({ email });
  
  if (!user) {
    // First time login - create minimal profile
    user = await UserModel.create({
      email,
      emailVerified: true,
      isGuest: false,
      lastLoginAt: new Date(),
    });
  } else {
    // Returning user - update last login
    user.lastLoginAt = new Date();
    await user.save();
  }
  
  return user;
}
```

---

## Phase 2: Checkout Form Auto-Population

### 2.1 Create Checkout Form Component
**Files to create/modify:**
- `/components/checkout/checkout-form.tsx`
- `/hooks/use-checkout-form.ts`

**Tasks:**
- [ ] Create reusable checkout form component
- [ ] Implement form pre-population logic:
  - Fetch user profile data on component mount
  - Pre-fill name, phone, email fields if available
  - Pre-select default address for delivery orders
  - Show "Use saved address" dropdown for delivery orders
- [ ] Add "Save for future orders" checkboxes (checked by default):
  - "Save phone number"
  - "Save delivery address"

**Implementation Details:**
```typescript
// useCheckoutForm hook
export function useCheckoutForm(orderType: OrderType) {
  const { user } = useAuth();
  const form = useForm({
    defaultValues: {
      name: user?.name || '',
      email: user?.email || '',
      phone: user?.phone || '',
      address: user?.getDefaultAddress() || null,
      savePhone: true,
      saveAddress: orderType === 'delivery',
    },
  });
  
  return form;
}
```

### 2.2 Update Checkout API Endpoint
**Files to modify:**
- `/app/api/orders/create/route.ts`
- `/services/order-service.ts`
- `/services/user-service.ts`

**Tasks:**
- [ ] Add profile update logic to order creation flow
- [ ] After successful order creation, update user profile:
  - Save phone number if `savePhone: true` and phone provided
  - Save delivery address if `saveAddress: true` and address provided
  - Set address as default if it's the first address

**Implementation Details:**
```typescript
// In order creation service
async function updateProfileFromCheckout(
  userId: string,
  checkoutData: CheckoutData
) {
  const updates: Partial<IUser> = {};
  
  // Update phone if provided and save requested
  if (checkoutData.phone && checkoutData.savePhone) {
    updates.phone = checkoutData.phone;
  }
  
  // Update name if provided
  if (checkoutData.firstName && checkoutData.lastName) {
    updates.firstName = checkoutData.firstName;
    updates.lastName = checkoutData.lastName;
  }
  
  // Add delivery address if provided and save requested
  if (checkoutData.address && checkoutData.saveAddress) {
    const user = await UserModel.findById(userId);
    const isFirstAddress = user.addresses.length === 0;
    
    user.addresses.push({
      ...checkoutData.address,
      isDefault: isFirstAddress,
      lastUsedAt: new Date(),
    });
    
    await user.save();
  }
  
  return UserModel.findByIdAndUpdate(userId, updates, { new: true });
}
```

---

## Phase 3: Tab-Based Checkout Optimization

### 3.1 Modify Tab Opening Flow
**Files to modify:**
- `/app/api/tabs/open/route.ts`
- `/services/tab-service.ts`
- `/components/tabs/open-tab-form.tsx`

**Tasks:**
- [ ] Update tab opening endpoint to accept customer details
- [ ] Store customer info in tab document:
  - `customerName`
  - `customerEmail`
  - `customerPhone`
- [ ] Create "Open Tab" form component:
  - Pre-populate with user profile data if logged in
  - Collect minimal info: name, email, phone
  - Save to user profile after tab opened (if logged in)

**Implementation Details:**
```typescript
// Tab schema addition
interface ITab {
  // ... existing fields
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
}

// Open tab service
async function openTab(data: OpenTabData) {
  const tab = await TabModel.create({
    tableNumber: data.tableNumber,
    userId: data.userId,
    customerName: data.customerName,
    customerEmail: data.customerEmail,
    customerPhone: data.customerPhone,
    status: 'open',
    openedAt: new Date(),
  });
  
  // Update user profile if logged in
  if (data.userId) {
    await updateProfileFromTabOpen(data.userId, data);
  }
  
  return tab;
}
```

### 3.2 Modify Add-to-Tab Flow
**Files to modify:**
- `/app/api/tabs/add-order/route.ts`
- `/services/tab-service.ts`
- `/components/tabs/add-to-tab-button.tsx`

**Tasks:**
- [ ] Update add-to-tab endpoint to skip checkout form
- [ ] Validate that tab exists and is open
- [ ] Add order to tab without requiring customer details
- [ ] Use customer details already stored in tab document

**Implementation Details:**
```typescript
// Add order to tab (no checkout form needed)
async function addOrderToTab(tabId: string, orderData: OrderData) {
  const tab = await TabModel.findById(tabId);
  
  if (!tab || tab.status !== 'open') {
    throw new Error('Tab not found or closed');
  }
  
  // Create order with tab's customer details
  const order = await OrderModel.create({
    ...orderData,
    tabId: tab._id,
    userId: tab.userId,
    customerName: tab.customerName,
    customerEmail: tab.customerEmail,
    customerPhone: tab.customerPhone,
    orderType: 'dine-in',
    status: 'pending',
  });
  
  // Add order to tab
  tab.orders.push(order._id);
  tab.totalAmount += order.total;
  await tab.save();
  
  return order;
}
```

### 3.3 Modify Tab Closing Flow
**Files to modify:**
- `/app/api/tabs/close/route.ts`
- `/services/tab-service.ts`
- `/components/tabs/close-tab-form.tsx`

**Tasks:**
- [ ] Create tab closing checkout form
- [ ] Pre-populate with tab's customer details
- [ ] Allow customer to update payment details only
- [ ] Process payment for entire tab total
- [ ] Update all orders in tab to "paid" status

**Implementation Details:**
```typescript
// Close tab checkout form
export function CloseTabForm({ tabId }: { tabId: string }) {
  const { data: tab } = useQuery(['tab', tabId], () => fetchTab(tabId));
  
  const form = useForm({
    defaultValues: {
      customerName: tab?.customerName || '',
      customerEmail: tab?.customerEmail || '',
      customerPhone: tab?.customerPhone || '',
      paymentMethod: 'card',
      tip: 0,
    },
  });
  
  // Only show customer details as read-only
  // Focus on payment method and tip selection
  
  return <CheckoutForm form={form} mode="tab-close" />;
}
```

---

## Phase 4: UI/UX Enhancements

### 4.1 Update Checkout Flow UI
**Files to modify:**
- `/app/checkout/page.tsx`
- `/components/checkout/checkout-stepper.tsx`

**Tasks:**
- [ ] Add visual indicators for pre-filled fields
- [ ] Show "Using saved information" message
- [ ] Add "Edit" buttons for pre-filled fields
- [ ] Highlight "Save for future" checkboxes

### 4.2 Create Address Selector Component
**Files to create:**
- `/components/checkout/address-selector.tsx`

**Tasks:**
- [ ] Display saved addresses in dropdown/cards
- [ ] Show "Add new address" option
- [ ] Mark default address
- [ ] Show last used date for each address
- [ ] Quick edit/delete actions

---

## Phase 5: Testing & Validation

### 5.1 Unit Tests
**Files to create:**
- `/services/__tests__/user-service.test.ts`

**Test Cases:**
- [ ] Profile creation on first login
- [ ] Profile update after checkout
- [ ] Address auto-save logic
- [ ] Tab customer details persistence

### 5.2 Integration Tests
**Files to create:**
- `/app/api/__tests__/checkout-flow.test.ts`
- `/app/api/__tests__/tab-flow.test.ts`

**Test Cases:**
- [ ] Complete guest checkout with auto-save
- [ ] Authenticated user checkout with pre-fill
- [ ] Open tab with customer details
- [ ] Add multiple orders to tab without re-entering details
- [ ] Close tab with payment

### 5.3 E2E Tests
**Files to create:**
- `/e2e/profile-auto-population.spec.ts`
- `/e2e/tab-checkout-flow.spec.ts`

**Test Scenarios:**
- [ ] New user first login → checkout → profile updated
- [ ] Returning user checkout → form pre-filled
- [ ] Open tab → add orders → close tab (single checkout)
- [ ] Guest order → create account → profile claimed

---

## Implementation Order

### Sprint 1: Core Profile Auto-Population (Week 1)
1. Update authentication flow to create minimal profiles
2. Implement profile update logic in checkout
3. Add auto-save checkboxes to checkout form
4. Update checkout API to save profile data

### Sprint 2: Checkout Form Enhancement (Week 2)
1. Create reusable checkout form component
2. Implement form pre-population logic
3. Add address selector component
4. Add visual enhancements to checkout

### Sprint 3: Tab Optimization (Week 3)
1. Modify tab opening to collect customer details
2. Update add-to-tab flow to skip checkout
3. Implement tab closing checkout form
4. Test complete tab flow

### Sprint 4: Testing & Refinement (Week 4)
1. Write unit and integration tests
2. Conduct E2E testing
3. Bug fixes and refinements
4. Performance optimization

---

## Success Criteria

- [ ] New users have profile created automatically on first login
- [ ] Checkout form pre-populates with saved user data
- [ ] Phone numbers and addresses are saved after first checkout
- [ ] Tab customers only see checkout form when opening and closing tabs
- [ ] All tests pass with >80% coverage
- [ ] No regression in existing checkout flows

---

## Rollback Plan

If issues arise during implementation:
1. Feature flag: `ENABLE_PROFILE_AUTO_POPULATION`
2. Database migration scripts to revert schema changes
3. Fallback to manual profile entry
4. Monitoring alerts for profile update failures

---

## Future Enhancements

- [ ] Smart address suggestions using Google Places API
- [ ] Phone number verification via SMS
- [ ] Bulk address import for corporate users
