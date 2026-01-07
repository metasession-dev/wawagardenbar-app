# Playwright Test Requirements - Wawa Garden Bar

## Overview

This document outlines comprehensive end-to-end (E2E) testing requirements for the Wawa Garden Bar food ordering platform using Playwright. Tests will cover critical user journeys, admin workflows, payment flows, and real-time features.

---

## Test Environment Setup

### Prerequisites
- Node.js 18+
- MongoDB test database
- Test environment variables
- Monnify sandbox credentials
- Test user accounts (customer, admin, super-admin)

### Test Data Requirements
- Seeded menu items (food and drinks)
- Test user accounts with different roles
- Sample inventory data
- Test payment credentials
- Mock email/SMS services

---

## Test Categories

### 1. Authentication & Authorization Tests

#### 1.1 Customer Authentication
**Priority: Critical**

**Test Cases:**
- [ ] **AUTH-001**: User can request PIN via email
  - Navigate to `/login`
  - Enter valid email address
  - Verify PIN request success message
  - Check email delivery (mock)
  
- [ ] **AUTH-002**: User can login with valid PIN
  - Request PIN for test user
  - Enter correct 4-digit PIN
  - Verify redirect to home page
  - Verify session is created
  
- [ ] **AUTH-003**: User cannot login with invalid PIN
  - Request PIN
  - Enter incorrect PIN
  - Verify error message displayed
  - Verify no session created
  
- [ ] **AUTH-004**: Guest checkout flow
  - Add items to cart as guest
  - Proceed to checkout
  - Complete order without authentication
  - Verify order created with guest email

#### 1.2 Admin Authentication
**Priority: Critical**

**Test Cases:**
- [ ] **AUTH-005**: Admin can login via `/admin/login`
  - Navigate to admin login
  - Enter admin credentials
  - Verify redirect to dashboard
  - Verify admin role in session
  
- [ ] **AUTH-006**: Super-admin can access all dashboard sections
  - Login as super-admin
  - Verify access to Menu Management
  - Verify access to Inventory
  - Verify access to Rewards Configuration
  - Verify access to Settings
  
- [ ] **AUTH-007**: Admin has restricted dashboard access
  - Login as admin
  - Verify access to Order Management
  - Verify NO access to Menu Management
  - Verify NO access to Inventory
  - Verify redirect to forbidden page on restricted access

#### 1.3 Role-Based Access Control
**Priority: Critical**

**Test Cases:**
- [ ] **AUTH-008**: Customer cannot access dashboard routes
  - Login as customer
  - Attempt to navigate to `/dashboard`
  - Verify redirect to home or forbidden page
  
- [ ] **AUTH-009**: Unauthenticated users redirected to login
  - Clear session
  - Attempt to access protected route
  - Verify redirect to `/login`

---

### 2. Menu & Product Browsing Tests

#### 2.1 Menu Display
**Priority: High**

**Test Cases:**
- [ ] **MENU-001**: Menu page loads with categories
  - Navigate to `/menu`
  - Verify food category displayed
  - Verify drink category displayed
  - Verify menu items have images, names, prices
  
- [ ] **MENU-002**: Filter menu by category
  - Navigate to menu
  - Click "Food" filter
  - Verify only food items displayed
  - Click "Drinks" filter
  - Verify only drink items displayed
  
- [ ] **MENU-003**: Search menu items
  - Navigate to menu
  - Enter search term
  - Verify filtered results
  - Verify no results message for invalid search

#### 2.2 Menu Item Details
**Priority: Medium**

**Test Cases:**
- [ ] **MENU-004**: View menu item details
  - Click on menu item
  - Verify modal/page shows full details
  - Verify description, price, customization options
  - Verify add to cart button
  
- [ ] **MENU-005**: Customize menu item
  - Open menu item details
  - Select customization options (size, add-ons)
  - Verify price updates with customizations
  - Add to cart
  - Verify cart reflects customizations

---

### 3. Shopping Cart Tests

#### 3.1 Cart Operations
**Priority: Critical**

**Test Cases:**
- [ ] **CART-001**: Add item to cart
  - Browse menu
  - Click "Add to Cart" on item
  - Verify cart count increases
  - Verify item appears in cart
  
- [ ] **CART-002**: Update item quantity in cart
  - Add item to cart
  - Open cart
  - Increase quantity
  - Verify total price updates
  - Decrease quantity
  - Verify total updates
  
- [ ] **CART-003**: Remove item from cart
  - Add multiple items to cart
  - Click remove on one item
  - Verify item removed
  - Verify cart total updates
  
- [ ] **CART-004**: Clear entire cart
  - Add multiple items
  - Click "Clear Cart"
  - Verify confirmation dialog
  - Confirm clear
  - Verify cart is empty
  
- [ ] **CART-005**: Cart persists across sessions
  - Add items to cart
  - Refresh page
  - Verify cart items still present
  - Logout and login
  - Verify cart items persist (for authenticated users)

---

### 4. Checkout & Order Placement Tests

#### 4.1 Dine-In Orders
**Priority: Critical**

**Test Cases:**
- [ ] **ORDER-001**: Place dine-in order with table number
  - Select "Dine-In" order type
  - Add items to cart
  - Proceed to checkout
  - Enter table number
  - Complete order
  - Verify order confirmation
  
- [ ] **ORDER-002**: Open a tab for dine-in
  - Select dine-in
  - Choose "Open Tab" option
  - Enter table number
  - Place first order
  - Verify tab created
  - Add more items to tab
  - Verify items added to existing tab

#### 4.2 Pickup Orders
**Priority: Critical**

**Test Cases:**
- [ ] **ORDER-003**: Place pickup order
  - Select "Pickup" order type
  - Add items to cart
  - Proceed to checkout
  - Enter customer details
  - Select pickup time
  - Complete order
  - Verify order confirmation with pickup details

#### 4.3 Delivery Orders
**Priority: Critical**

**Test Cases:**
- [ ] **ORDER-004**: Place delivery order with valid address
  - Select "Delivery" order type
  - Add items to cart
  - Proceed to checkout
  - Enter delivery address
  - Verify address validation
  - Complete order
  - Verify delivery fee calculated
  
- [ ] **ORDER-005**: Delivery order with saved address
  - Login as user with saved address
  - Select delivery
  - Verify saved addresses displayed
  - Select saved address
  - Complete order
  - Verify correct address used

#### 4.4 Special Instructions
**Priority: Medium**

**Test Cases:**
- [ ] **ORDER-006**: Add special instructions to order
  - Proceed to checkout
  - Enter special instructions (e.g., "No onions")
  - Complete order
  - Verify instructions saved in order details

---

### 5. Payment Integration Tests

#### 5.1 Monnify Payment Flow
**Priority: Critical**

**Test Cases:**
- [ ] **PAY-001**: Initiate payment with card
  - Complete checkout
  - Select "Pay with Card"
  - Verify Monnify modal opens
  - Enter test card details
  - Complete payment
  - Verify redirect to success page
  - Verify order status updated to "paid"
  
- [ ] **PAY-002**: Payment with bank transfer
  - Complete checkout
  - Select "Pay with Transfer"
  - Verify account details displayed
  - Simulate transfer completion (webhook)
  - Verify order status updated
  
- [ ] **PAY-003**: Failed payment handling
  - Initiate payment
  - Simulate payment failure
  - Verify error message displayed
  - Verify order status remains "pending"
  - Verify user can retry payment
  
- [ ] **PAY-004**: Payment webhook verification
  - Place order
  - Trigger Monnify webhook (test)
  - Verify order status updated
  - Verify payment reference saved
  - Verify customer notified

---

### 6. Order Tracking & Status Tests

#### 6.1 Customer Order Tracking
**Priority: High**

**Test Cases:**
- [ ] **TRACK-001**: View order status in real-time
  - Place order
  - Navigate to order tracking page
  - Verify current status displayed
  - Admin updates status
  - Verify customer sees update without refresh (Socket.IO)
  
- [ ] **TRACK-002**: View order history
  - Login as customer with past orders
  - Navigate to `/orders/history`
  - Verify all past orders listed
  - Verify order details accessible
  - Verify status badges correct
  
- [ ] **TRACK-003**: Reorder from history
  - View order history
  - Click "Reorder" on past order
  - Verify items added to cart
  - Verify customizations preserved

#### 6.2 Order Status Transitions
**Priority: Critical**

**Test Cases:**
- [ ] **TRACK-004**: Order status flow (Pending → Confirmed → Preparing → Ready → Completed)
  - Place order
  - Admin confirms order
  - Verify status updates to "Confirmed"
  - Admin marks "Preparing"
  - Verify status updates
  - Admin marks "Ready"
  - Verify customer notified
  - Admin marks "Completed"
  - Verify final status

---

### 7. Admin Dashboard Tests

#### 7.1 Menu Management
**Priority: High**

**Test Cases:**
- [ ] **ADMIN-001**: Create new menu item
  - Login as super-admin
  - Navigate to `/dashboard/menu/new`
  - Fill in menu item details
  - Upload image
  - Set price and category
  - Save item
  - Verify item appears in menu list
  
- [ ] **ADMIN-002**: Edit existing menu item
  - Navigate to menu management
  - Click edit on item
  - Update details
  - Save changes
  - Verify changes reflected
  
- [ ] **ADMIN-003**: Delete menu item
  - Navigate to menu management
  - Click delete on item
  - Confirm deletion
  - Verify item removed from list
  
- [ ] **ADMIN-004**: Toggle menu item availability
  - Navigate to menu management
  - Toggle item availability
  - Verify status updated
  - Verify item hidden/shown on customer menu

#### 7.2 Order Management
**Priority: Critical**

**Test Cases:**
- [ ] **ADMIN-005**: View order queue
  - Login as admin
  - Navigate to `/dashboard/orders`
  - Verify pending orders displayed
  - Verify order details visible
  
- [ ] **ADMIN-006**: Update order status
  - View order queue
  - Click on order
  - Update status to "Preparing"
  - Verify status updated
  - Verify customer notified (Socket.IO)
  
- [ ] **ADMIN-007**: Search and filter orders
  - Navigate to order management
  - Search by order number
  - Verify correct order displayed
  - Filter by status
  - Verify filtered results
  
- [ ] **ADMIN-008**: Export orders to CSV
  - Navigate to order management
  - Click "Export to CSV"
  - Verify file downloads
  - Verify CSV contains correct data

#### 7.3 Inventory Management
**Priority: High**

**Test Cases:**
- [ ] **ADMIN-009**: Update inventory stock levels
  - Login as super-admin
  - Navigate to `/dashboard/inventory`
  - Select item
  - Update stock quantity
  - Save changes
  - Verify stock updated
  
- [ ] **ADMIN-010**: Low stock alerts
  - Set item stock below minimum
  - Verify low stock alert displayed
  - Verify item marked in inventory list
  
- [ ] **ADMIN-011**: Inventory deduction on order
  - Note current stock level
  - Place order with tracked item
  - Verify stock decremented
  - Verify inventory history updated

#### 7.4 Customer Management
**Priority: Medium**

**Test Cases:**
- [ ] **ADMIN-012**: View customer list
  - Login as super-admin
  - Navigate to `/dashboard/customers`
  - Verify customer list displayed
  - Verify search functionality
  
- [ ] **ADMIN-013**: View customer order history
  - Click on customer
  - Verify order history displayed
  - Verify customer details visible

#### 7.5 Rewards Management
**Priority: High**

**Test Cases:**
- [ ] **ADMIN-014**: Create reward rule
  - Navigate to `/dashboard/rewards/rules/new`
  - Set spend threshold
  - Set reward type and value
  - Set probability
  - Save rule
  - Verify rule created
  
- [ ] **ADMIN-015**: View issued rewards
  - Navigate to `/dashboard/rewards/issued`
  - Verify list of issued rewards
  - Filter by status
  - Search by customer email
  
- [ ] **ADMIN-016**: Manually issue reward
  - Navigate to `/dashboard/rewards/issue`
  - Select customer
  - Select reward type
  - Issue reward
  - Verify reward appears in customer account

#### 7.6 Financial Reports
**Priority: High**

**Test Cases:**
- [ ] **ADMIN-017**: Generate daily financial report
  - Navigate to `/dashboard/reports/daily`
  - Select date
  - Click "Generate Report"
  - Verify report displays:
    - Total revenue
    - COGS
    - Gross profit
    - Operating expenses
    - Net profit
  
- [ ] **ADMIN-018**: Export report as PDF
  - Generate daily report
  - Click "Export as PDF"
  - Verify PDF downloads
  - Verify PDF contains all sections
  
- [ ] **ADMIN-019**: Export report as Excel
  - Generate daily report
  - Click "Export as Excel"
  - Verify Excel file downloads
  - Verify multiple sheets present
  
- [ ] **ADMIN-020**: Export report as CSV
  - Generate daily report
  - Click "Export as CSV"
  - Verify CSV downloads
  - Verify data format correct

#### 7.7 Expense Management
**Priority: Medium**

**Test Cases:**
- [ ] **ADMIN-021**: Create expense entry
  - Navigate to `/dashboard/finance/expenses`
  - Click "Add Expense"
  - Fill in expense details
  - Select category
  - Save expense
  - Verify expense appears in list
  
- [ ] **ADMIN-022**: Filter expenses by date range
  - Navigate to expenses
  - Select date range
  - Verify filtered expenses displayed
  
- [ ] **ADMIN-023**: View expense analytics
  - Navigate to expenses
  - Verify total expenses displayed
  - Verify category breakdown shown

---

### 8. Rewards System Tests

#### 8.1 Customer Rewards
**Priority: High**

**Test Cases:**
- [ ] **REWARD-001**: Earn reward on qualifying order
  - Place order above threshold
  - Complete payment
  - Verify reward issued (based on probability)
  - Verify reward appears in customer dashboard
  
- [ ] **REWARD-002**: View active rewards
  - Login as customer
  - Navigate to `/profile/rewards`
  - Verify active rewards displayed
  - Verify reward codes visible
  - Verify expiry dates shown
  
- [ ] **REWARD-003**: Apply reward at checkout
  - Have active reward
  - Add items to cart
  - Proceed to checkout
  - Enter reward code
  - Verify discount applied
  - Complete order
  - Verify reward marked as redeemed
  
- [ ] **REWARD-004**: Expired rewards handling
  - Have expired reward
  - Attempt to apply at checkout
  - Verify error message
  - Verify reward not applied
  
- [ ] **REWARD-005**: Loyalty points accumulation
  - Place order
  - Verify points earned
  - View points balance in profile
  - Verify points calculation correct (100 points = ₦1)

---

### 9. Real-Time Features Tests

#### 9.1 Socket.IO Integration
**Priority: Critical**

**Test Cases:**
- [ ] **SOCKET-001**: Real-time order status updates
  - Customer places order
  - Admin updates status
  - Verify customer sees update without refresh
  - Verify notification displayed
  
- [ ] **SOCKET-002**: Kitchen display updates
  - Admin views kitchen display
  - New order placed
  - Verify order appears in kitchen display
  - Verify sound notification plays
  
- [ ] **SOCKET-003**: Multiple concurrent users
  - Open multiple browser sessions
  - Place order in one session
  - Verify all admin sessions see new order
  - Update status in one admin session
  - Verify all sessions updated

---

### 10. Profile Management Tests

#### 10.1 Customer Profile
**Priority: Medium**

**Test Cases:**
- [ ] **PROFILE-001**: Update profile information
  - Login as customer
  - Navigate to `/profile`
  - Update name, phone
  - Save changes
  - Verify changes saved
  
- [ ] **PROFILE-002**: Add delivery address
  - Navigate to profile
  - Click "Add Address"
  - Fill in address details
  - Save address
  - Verify address appears in list
  
- [ ] **PROFILE-003**: Set default address
  - Have multiple addresses
  - Set one as default
  - Verify default badge displayed
  - Proceed to checkout
  - Verify default address pre-selected
  
- [ ] **PROFILE-004**: Delete address
  - Navigate to profile
  - Click delete on address
  - Confirm deletion
  - Verify address removed

---

### 11. Tab Management Tests

#### 11.1 Customer Tab Operations
**Priority: High**

**Test Cases:**
- [ ] **TAB-001**: Open new tab
  - Select dine-in
  - Choose "Open Tab"
  - Enter table number
  - Place first order
  - Verify tab created
  
- [ ] **TAB-002**: Add items to existing tab
  - Have open tab
  - Add more items
  - Verify items added to tab
  - Verify tab total updated
  
- [ ] **TAB-003**: View tab details
  - Navigate to `/orders/tabs`
  - Click on active tab
  - Verify all orders in tab displayed
  - Verify total amount correct
  
- [ ] **TAB-004**: Close and pay tab
  - Have open tab with items
  - Click "Close Tab"
  - Proceed to payment
  - Complete payment
  - Verify tab closed
  - Verify all orders marked as paid

#### 11.2 Admin Tab Management
**Priority: High**

**Test Cases:**
- [ ] **TAB-005**: Admin views all active tabs
  - Login as admin
  - Navigate to `/dashboard/orders/tabs`
  - Verify all open tabs displayed
  - Verify table numbers shown
  
- [ ] **TAB-006**: Admin closes customer tab
  - View active tabs
  - Select tab
  - Close tab
  - Verify tab status updated

---

### 12. Error Handling & Edge Cases

#### 12.1 Network Errors
**Priority: Medium**

**Test Cases:**
- [ ] **ERROR-001**: Handle offline mode
  - Disconnect network
  - Attempt to place order
  - Verify error message displayed
  - Reconnect network
  - Verify retry functionality
  
- [ ] **ERROR-002**: API timeout handling
  - Simulate slow API response
  - Verify loading state displayed
  - Verify timeout error after threshold
  - Verify retry option available

#### 12.2 Validation Errors
**Priority: Medium**

**Test Cases:**
- [ ] **ERROR-003**: Form validation on checkout
  - Proceed to checkout with empty cart
  - Verify error message
  - Add items, leave required fields empty
  - Verify inline validation errors
  
- [ ] **ERROR-004**: Invalid email format
  - Enter invalid email in login
  - Verify validation error
  - Enter valid email
  - Verify error cleared

#### 12.3 Stock Availability
**Priority: High**

**Test Cases:**
- [ ] **ERROR-005**: Out of stock item handling
  - Admin sets item stock to 0
  - Customer attempts to add to cart
  - Verify "Out of Stock" message
  - Verify add to cart button disabled
  
- [ ] **ERROR-006**: Insufficient stock for order
  - Item has stock of 2
  - Attempt to order quantity of 5
  - Verify error message
  - Verify maximum quantity enforced

---

### 13. Performance Tests

#### 13.1 Load Time
**Priority: Medium**

**Test Cases:**
- [ ] **PERF-001**: Menu page loads within 3 seconds
  - Navigate to menu
  - Measure load time
  - Verify < 3 seconds
  
- [ ] **PERF-002**: Dashboard loads within 2 seconds
  - Login as admin
  - Navigate to dashboard
  - Measure load time
  - Verify < 2 seconds

#### 13.2 Large Data Sets
**Priority: Low**

**Test Cases:**
- [ ] **PERF-003**: Handle 100+ menu items
  - Seed database with 100+ items
  - Navigate to menu
  - Verify pagination/virtualization works
  - Verify smooth scrolling
  
- [ ] **PERF-004**: Handle 1000+ orders in admin view
  - Seed database with 1000+ orders
  - Navigate to order management
  - Verify pagination works
  - Verify search is performant

---

### 14. Mobile Responsiveness Tests

#### 14.1 Mobile Navigation
**Priority: High**

**Test Cases:**
- [ ] **MOBILE-001**: Menu browsing on mobile
  - Set viewport to mobile (375x667)
  - Navigate to menu
  - Verify responsive layout
  - Verify touch interactions work
  
- [ ] **MOBILE-002**: Checkout flow on mobile
  - Add items to cart on mobile
  - Proceed to checkout
  - Verify form fields accessible
  - Complete order
  - Verify success page displays correctly

#### 14.2 Touch Interactions
**Priority: Medium**

**Test Cases:**
- [ ] **MOBILE-003**: Swipe gestures
  - Test swipe on image galleries
  - Test pull-to-refresh (if implemented)
  - Verify smooth animations

---

### 15. Accessibility Tests

#### 15.1 Keyboard Navigation
**Priority: Medium**

**Test Cases:**
- [ ] **A11Y-001**: Navigate menu with keyboard
  - Use Tab key to navigate
  - Verify focus indicators visible
  - Use Enter to select items
  - Verify all interactive elements accessible
  
- [ ] **A11Y-002**: Screen reader compatibility
  - Enable screen reader
  - Navigate through checkout flow
  - Verify ARIA labels present
  - Verify semantic HTML used

#### 15.2 Color Contrast
**Priority: Low**

**Test Cases:**
- [ ] **A11Y-003**: Verify WCAG AA compliance
  - Check color contrast ratios
  - Verify text readable
  - Verify focus states visible

---

## Test Data Requirements

### User Accounts
```typescript
// Test users to be seeded
const testUsers = [
  {
    email: 'customer@test.com',
    role: 'customer',
    name: 'Test Customer',
    phone: '+234 800 000 0001'
  },
  {
    email: 'admin@test.com',
    role: 'admin',
    name: 'Test Admin',
    phone: '+234 800 000 0002'
  },
  {
    email: 'superadmin@test.com',
    role: 'super-admin',
    name: 'Test Super Admin',
    phone: '+234 800 000 0003'
  }
];
```

### Menu Items
- Minimum 20 food items across categories
- Minimum 15 drink items across categories
- Items with various customization options
- Items with and without inventory tracking

### Orders
- Sample orders in various states (pending, confirmed, preparing, ready, completed)
- Orders with different payment statuses
- Orders with tabs
- Orders with rewards applied

---

## Success Criteria

### Test Coverage
- **Critical Paths**: 100% coverage
- **High Priority**: 95% coverage
- **Medium Priority**: 80% coverage
- **Low Priority**: 60% coverage

### Performance Benchmarks
- All pages load within 3 seconds
- API responses within 500ms
- Real-time updates within 1 second

### Reliability
- Tests must be deterministic (no flaky tests)
- Tests must clean up after themselves
- Tests must be independent and parallelizable

---

## Test Execution Strategy

### CI/CD Integration
- Run on every pull request
- Run on main branch commits
- Scheduled nightly runs with full suite

### Test Environments
- **Development**: Local with test database
- **Staging**: Pre-production environment
- **Production**: Smoke tests only (non-destructive)

### Reporting
- Generate HTML reports
- Track test metrics over time
- Alert on test failures
- Screenshot/video on failure

---

## Next Steps

See `PLAYWRIGHT-IMPLEMENTATION-PLAN.md` for detailed implementation roadmap.
