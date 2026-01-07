# Wawa Garden Bar Deliverables Strategy

## Executive Summary
This document outlines the strategic approach for delivering the Wawa Cafe Web App through IDE-based vibe coding, following Next.js 14+ App Router architecture with a Server-Component-first philosophy.

---

## Pre-Development Preparation

### 1. **Environment Setup** (Priority: CRITICAL)
- [ ] Initialize Next.js 14+ project with App Router
- [ ] Configure TypeScript with strict mode
- [ ] Set up ESLint with Airbnb style guide
- [ ] Configure Prettier for consistent formatting
- [ ] Install and configure Tailwind CSS
- [ ] Set up Shadcn UI components library
- [ ] Create `.env.local` with required environment variables

### 2. **Development Infrastructure** (Priority: CRITICAL)
- [ ] Set up MongoDB Atlas or local MongoDB instance
- [ ] Configure MongoDB connection in `/lib/mongodb.ts`
- [ ] Set up Zoho email service credentials
- [ ] Configure Monnify test API keys
- [ ] Set up Monnify payment methods (Card, Transfer, USSD, Phone Number)
- [ ] Create project file structure according to requirements

### 3. **Design System Preparation** (Priority: HIGH)
- [ ] Define color palette and design tokens
- [ ] Create Figma/design mockups for key screens
- [ ] Prepare Wawa Cafe brand assets (logos, fonts)
- [ ] Define responsive breakpoints
- [ ] Create loading skeleton templates
- [ ] Define animation and transition standards

### 4. **Data Architecture** (Priority: HIGH)
- [ ] Design complete MongoDB schema
- [ ] Create TypeScript interfaces for all entities
- [ ] Define Zod validation schemas
- [ ] Document API endpoint structure
- [ ] Plan real-time event architecture (Socket.io)

---

## Phase 1: Foundation (Week 1-2)

### Feature 1.1: Project Scaffold & Configuration
**Priority:** P0 - Blocker  
**Dependencies:** None  
**Prompt:**
```
Create a Next.js 14+ project with App Router, TypeScript strict mode, and the following structure:
- /app (with route groups for (auth), (customer), dashboard)
- /components (with /ui for shadcn and /shared for app components)
- /services, /models, /hooks, /interfaces, /lib
- Configure MongoDB connection in /lib/mongodb.ts
- Set up ESLint with Airbnb config and Prettier
- Install: shadcn-ui, radix-ui, tailwindcss, lucide-react, mongoose, zod, react-hook-form, tanstack-query, nuqs, zustand
- Create base layout with mobile-first responsive design
```

### Feature 1.2: Database Models & Interfaces
**Priority:** P0 - Blocker  
**Dependencies:** 1.1  
**Prompt:**
```
Create Mongoose models and TypeScript interfaces for:
1. User model with passwordless auth fields (email, verificationPin, sessionToken)
2. MenuItem model with categories, customizations, and pricing
3. Order model with status tracking and order types
4. Payment model supporting multiple payment methods
5. Rewards and RewardRules models for the random rewards system
6. Inventory model for stock management
All models in /models, interfaces in /interfaces, following TypeScript strict typing
```

### Feature 1.3: Authentication System (Passwordless)
**Priority:** P0 - Blocker  
**Dependencies:** 1.2  
**Prompt:**
```
Implement passwordless authentication system:
1. Create Server Actions for email/PIN authentication in /app/actions/auth
2. Set up iron-session for session management
3. Create auth API routes in /app/api/auth
4. Build email service using Zoho/Nodemailer for PIN delivery
5. Create AuthContext for client-side auth state
6. Implement guest checkout flow
Use Server Components by default, minimal 'use client' for PIN input form
```

### Feature 1.4: Base UI Components
**Priority:** P1 - Critical  
**Dependencies:** 1.1  
**Prompt:**
```
Set up Shadcn UI components and create shared components:
1. Install all necessary shadcn components (button, form, input, card, dialog, etc.)
2. Create responsive navigation component with mobile menu
3. Build loading skeletons for all major sections
4. Create error boundary components
5. Implement toast notification system
6. Build reusable form components with React Hook Form integration
All components must follow the mobile-first approach with Tailwind CSS
```

#### Role-Based Navigation & Access Control
**Priority:** P1 - Critical  
**Dependencies:** 1.3 (Authentication System)  
**Implementation Details:**

1. **Main Navigation Component (`/components/shared/main-nav.tsx`):**
   - Display links for: Home, Menu, Orders, Rewards (visible to all authenticated users)
   - Conditionally render "Dashboard" link only for users with role: `admin` or `super-admin`
   - Hide "Dashboard" link completely for users with role: `customer`
   - Use session data to determine user role
   - Implement responsive mobile menu with same role-based logic

2. **Dashboard Sidebar Navigation (`/components/features/admin/dashboard-nav.tsx`):**
   - Create role-based navigation items configuration:
     ```typescript
     const navItems = [
       { label: 'Overview', href: '/dashboard', roles: ['admin', 'super-admin'] },
       { label: 'Menu', href: '/dashboard/menu', roles: ['super-admin'] },
       { label: 'Orders', href: '/dashboard/orders', roles: ['admin', 'super-admin'] },
       { label: 'Customers', href: '/dashboard/customers', roles: ['super-admin'] },
       { label: 'Inventory', href: '/dashboard/inventory', roles: ['super-admin'] },
       { label: 'Rewards', href: '/dashboard/rewards', roles: ['super-admin'] },
       { label: 'Analytics', href: '/dashboard/analytics', roles: ['super-admin'] },
       { label: 'Audit Logs', href: '/dashboard/audit-logs', roles: ['super-admin'] },
       { label: 'Settings', href: '/dashboard/settings', roles: ['super-admin'] },
     ];
     ```
   - Filter navigation items based on current user's role
   - Hide restricted sections from admin users (Menu, Customers, Inventory, Rewards, Analytics, Audit Logs, Settings)

3. **Role-Based Middleware (`/middleware.ts`):**
   - Create middleware to protect dashboard routes
   - Check user session and role on all `/dashboard/*` routes
   - Redirect `customer` role users attempting to access dashboard to home page
   - Return 403 Forbidden for `admin` users attempting to access super-admin-only sections
   - Allow `super-admin` full access to all dashboard routes
   - Implement route protection matrix:
     ```typescript
     const routePermissions = {
       '/dashboard': ['admin', 'super-admin'],
       '/dashboard/menu': ['super-admin'],
       '/dashboard/orders': ['admin', 'super-admin'],
       '/dashboard/customers': ['super-admin'],
       '/dashboard/inventory': ['super-admin'],
       '/dashboard/rewards': ['super-admin'],
       '/dashboard/analytics': ['super-admin'],
       '/dashboard/audit-logs': ['super-admin'],
       '/dashboard/settings': ['super-admin'],
     };
     ```

4. **User Model Role Field (`/models/User.ts`):**
   - Add `role` field to User schema with enum: `['customer', 'admin', 'super-admin']`
   - Default role: `customer` for all new registrations
   - Only super-admin can modify user roles (via Settings > User Management)

5. **Session Management Updates (`/lib/session.ts`):**
   - Include user role in session data
   - Create helper functions:
     * `isAdmin(session)` - returns true for admin or super-admin
     * `isSuperAdmin(session)` - returns true for super-admin only
     * `hasPermission(session, route)` - checks if user can access specific route

6. **Error Pages:**
   - Create `/app/dashboard/forbidden/page.tsx` for 403 errors
   - Display clear message: "You don't have permission to access this section"
   - Provide link back to accessible dashboard sections

7. **Components to Create:**
   - `/components/shared/main-nav.tsx` (with role-based Dashboard link)
   - `/components/features/admin/dashboard-nav.tsx` (with filtered navigation)
   - `/components/features/admin/role-badge.tsx` (display user role)
   - `/lib/permissions.ts` (permission checking utilities)

8. **Server Actions & API Protection:**
   - Add role checks to all admin Server Actions
   - Verify user role before executing sensitive operations
   - Return appropriate error messages for unauthorized access attempts

**Testing Requirements:**
- Test navigation visibility for each role (customer, admin, super-admin)
- Verify middleware redirects work correctly
- Test direct URL access to restricted routes
- Confirm sidebar navigation filters correctly for admin vs super-admin
- Test role-based API endpoint protection

**Security Considerations:**
- Never expose role-checking logic to client-side only
- Always verify permissions on server-side (middleware, Server Actions, API routes)
- Log unauthorized access attempts for security monitoring
- Implement rate limiting on permission-denied responses

---

## Phase 2: Core Customer Experience (Week 3-4)

### Feature 2.1: Welcome & Order Type Selection
**Priority:** P1 - Critical  
**Dependencies:** Phase 1  
**Prompt:**
```
Create the welcome screen and order type selection:
1. Build RSC welcome page at /app/page.tsx with Wawa Cafe branding
2. Implement order type selection (Dine-in, Pickup, Delivery) using Server Components
3. For Dine-in: QR scanner component and table number input
4. For Delivery: Address input with radius validation
5. For Pickup: Time selection component
6. Use nuqs for URL state management of order type
Minimize client components, use Server Actions for form submissions
```

### Feature 2.2: Menu Display System
**Priority:** P1 - Critical  
**Dependencies:** 2.1  
**Prompt:**
```
Build the menu browsing system:
1. Create CategoryService in /services for menu data fetching
2. Build menu page at /app/menu using RSC with Suspense boundaries
3. Implement category navigation (Drinks: Beer/Wine/Soft, Food: Starters/Mains/Desserts)
4. Create MenuItem component with image optimization using Next.js Image
5. Build item detail modal with customization options
6. Implement availability checking and real-time stock updates
Use parallel data fetching, implement proper caching with revalidate
```

### Feature 2.3: Shopping Cart System
**Priority:** P1 - Critical  
**Dependencies:** 2.2  
**Prompt:**
```
Implement shopping cart functionality:
1. Create CartContext using Zustand for client-side cart state
2. Build cart sidebar component with item management
3. Implement Server Actions for cart operations (add, update, remove)
4. Create order summary component with pricing calculations
5. Add special instructions field for dietary requirements
6. Implement cart persistence using localStorage
Keep cart UI as RSC where possible, only interactive elements as client components
```

### Feature 2.4: Checkout & Payment Integration
**Priority:** P1 - Critical  
**Dependencies:** 2.3  
**Prompt:**
```
Build checkout and payment system using Monnify:
1. Create multi-step checkout flow using React Hook Form
2. Integrate Monnify SDK for one-time payments (https://developers.monnify.com/docs/collections/one-time-payment)
3. Implement four payment methods:
   - Pay with Card
   - Pay with Transfer
   - Pay with USSD
   - Pay with Phone Number
4. Build PaymentService in /services for Monnify API integration
5. Create webhook handler at /app/api/webhooks/monnify for payment confirmations
6. Implement payment security with encryption and proper API key management
7. Add payment method selection UI with clear instructions for each method
8. **Auto-save customer information during checkout:**
   - Capture email and phone at checkout (required fields)
   - Check if email exists in database
   - If new email: create guest profile with email, phone
   - If existing email: prompt to login to link order
   - For delivery orders: save address to user's addresses array
   - Show checkbox "Save this address for future orders" (checked by default)
Use Server Actions for payment initialization, minimize client-side payment logic
```

### Feature 2.5: Customer Profile Management System
**Priority:** P1 - Critical  
**Dependencies:** 2.4  
**Status:** 🆕 NEW FEATURE  
**Prompt:**
```
Build comprehensive customer profile management system:

PART 1: User Model Enhancement (/models/user-model.ts)
1. Extend User schema with:
   - Basic info: firstName, lastName, phone, profilePicture
   - Addresses array (subdocuments):
     * addressId, label, streetAddress, city, state, postalCode
     * deliveryInstructions, isDefault, coordinates, lastUsedAt
   - Preferences: dietaryRestrictions, favoriteItems, communicationPreferences
   - Metadata: profileCompletionPercentage, lastLoginAt
   - Guest conversion: guestOrderIds, claimedAt
2. Add validation for phone numbers (with country code)
3. Add method to calculate profile completion percentage
4. Add method to get default address
5. Add indexes on email, phone, addresses.isDefault

PART 2: Profile Service (/services/profile-service.ts)
1. Create ProfileService with methods:
   - getUserProfile(userId): Get complete profile
   - updateProfile(userId, data): Update basic info
   - uploadProfilePicture(userId, file): Handle image upload
   - addAddress(userId, address): Add new address
   - updateAddress(userId, addressId, data): Update address
   - deleteAddress(userId, addressId): Remove address
   - setDefaultAddress(userId, addressId): Set default
   - getAddresses(userId): Get all addresses
   - calculateProfileCompletion(user): Calculate percentage
   - claimGuestOrders(userId, email): Link guest orders to account
2. Implement proper validation and error handling
3. Ensure only one default address at a time

PART 3: Profile Actions (/app/actions/profile/profile-actions.ts)
1. Create Server Actions:
   - updateProfileAction(formData): Update profile info
   - addAddressAction(addressData): Add new address
   - updateAddressAction(addressId, data): Update address
   - deleteAddressAction(addressId): Delete address
   - setDefaultAddressAction(addressId): Set default
   - uploadProfilePictureAction(formData): Upload picture
2. Include proper authentication checks
3. Add audit logging for profile changes
4. Return success/error states for UI feedback

PART 4: Profile Page (/app/(customer)/profile/page.tsx)
1. Create tabbed profile interface:
   - Personal Info tab: name, email, phone, profile picture
   - Addresses tab: list of addresses with add/edit/delete
   - Order History tab: past orders with reorder button
   - Preferences tab: dietary restrictions, favorites
   - Security tab: change email, manage sessions
2. Show profile completion percentage with progress bar
3. Highlight missing fields with prompts
4. Use Server Components for data fetching
5. Client components only for interactive forms

PART 5: Profile Edit Forms (/components/features/profile/)
1. Create form components:
   - PersonalInfoForm: edit name, phone, picture
   - AddressForm: add/edit address with all fields
   - PreferencesForm: dietary restrictions, communication
2. Use React Hook Form with Zod validation
3. Implement optimistic UI updates
4. Show loading states and success/error toasts
5. Address form includes:
   - Label input (Home, Work, etc.)
   - Street address, city, state, postal code
   - Delivery instructions textarea
   - Set as default checkbox
   - Coordinates (optional, for future map integration)

PART 6: Checkout Integration
1. Update checkout flow to:
   - Pre-fill email, phone from user profile
   - Show saved addresses dropdown for delivery orders
   - Allow quick address selection or "Add new address"
   - Auto-save new addresses with user confirmation
   - For guests: create profile on first order
2. Add "Save for future orders" checkbox (default checked)
3. After order: prompt guest users to create account

PART 7: Guest Conversion Flow
1. After guest completes order:
   - Show banner: "Create account to track orders and earn rewards"
   - One-click signup using email from order
   - Send PIN to email for verification
   - On verification: link all guest orders to new account
2. Update order records with userId
3. Transfer addresses to user profile
4. Award welcome reward for account creation

Technical Requirements:
- Use Server Components for all profile pages
- Client components only for forms and interactive elements
- Implement proper error boundaries
- Add loading skeletons for async operations
- Use Suspense for data fetching
- Validate all inputs with Zod
- Sanitize user inputs to prevent XSS
- Implement rate limiting on profile updates
- Add audit logging for sensitive changes (email, address)
- Optimize images with Next.js Image component
- Use optimistic updates for better UX
```

---

## Phase 3: Order Management & Tracking (Week 5-6)

### Feature 3.1: Order Processing System
**Priority:** P1 - Critical  
**Dependencies:** Phase 2  
**Prompt:**
```
Create order processing workflow:
1. Build OrderService in /services for order CRUD operations
2. Implement Server Actions for order creation and updates
3. Create order confirmation page with dynamic wait time estimation
4. Build order status tracking component (Received → Preparing → Ready → Delivered)
5. Set up Socket.io integration for real-time status updates
6. Create order history page at /app/orders
Use RSC for order display, WebSocket client component for real-time updates only
```

### Feature 3.2: Random Rewards System
**Priority:** P2 - High  
**Dependencies:** 3.1  
**Prompt:**
```
Implement the random rewards system:
1. Create RewardsService with configurable spend thresholds
2. Build reward calculation logic with random benefit selection
3. Implement reward types: discounts, free items, loyalty points
4. Create reward notification component
5. Build reward redemption flow at checkout
6. Add rewards tracking to user profile
Use Server Actions for reward calculations to prevent client-side manipulation
```

### Feature 3.3: Customer Communication
**Priority:** P2 - High  
**Dependencies:** 3.1  
**Prompt:**
```
Build customer communication features:
1. Implement email notifications using Server Actions
2. Create in-app notification system with toast messages
3. Build order modification request component
4. Implement order cancellation with refund logic
5. Create contact/support form with issue categories
6. Add order rating and feedback system
Keep all email sending server-side, use optimistic UI updates for better UX
```

---

## Phase 4: Admin Dashboard (Week 7-8)

### Feature 4.1: Admin Authentication & Layout
**Priority:** P1 - Critical  
**Dependencies:** Phase 1  
**Prompt:**
```
Create admin dashboard foundation:
1. Build admin layout at /app/dashboard/layout.tsx
2. Implement role-based authentication middleware
3. Create admin navigation sidebar at /components/features/admin/dashboard-nav.tsx
4. Build dashboard home with key metrics overview
5. Implement admin user management
6. Set up audit logging for admin actions
Use route groups for admin routes, implement proper authorization checks
```

### Feature 4.2: Menu & Inventory Management
**Priority:** P1 - Critical  
**Dependencies:** 4.1  
**Prompt:**
```
Build comprehensive admin menu and inventory system:

PART 1: Menu Items List (/app/dashboard/menu) - ✅ COMPLETED
Implemented features:
✅ Table view with image thumbnails, name, category, price, prep time, status
✅ Statistics cards (Total Items, Available, Unavailable with food/drinks breakdown)
✅ Quick actions dropdown (Edit, Upload Image, Mark Available/Unavailable, Delete)
✅ "Add New Item" button
✅ Server Actions: createMenuItemAction, toggleMenuItemAvailabilityAction, deleteMenuItemAction, uploadMenuImageAction
✅ Inventory tracking integration (optional track inventory toggle with stock levels)

Outstanding features to add:
- Search functionality (by name, category)
- Filter by category, status (available/unavailable)
- Sort by name, price, category, created date
- Pagination or infinite scroll
- Bulk actions (bulk status update, bulk delete)

PART 2: Edit Menu Item Page (/app/dashboard/menu/[itemId]/edit) - 
Build comprehensive menu item edit page:

1. **Page Structure:**
   - Use Server Component for initial data fetch via MenuService.getItemById()
   - Breadcrumb navigation (Dashboard > Menu > Edit Item)
   - Form with React Hook Form and Zod validation
   - Auto-save draft functionality (optional)
   - Unsaved changes warning

2. **Basic Information Section:**
   - Item name (required, text input)
   - Description (textarea, rich text optional)
   - Category selection (dropdown: drinks, food, starters, mains, desserts)
   - Subcategory (conditional based on category)
   - Price (required, number input with ₦ symbol)
   - Preparation time (number input in minutes)
   - Serving size (text input, e.g., "1 bottle", "1 plate")

3. **Image Management:**
   - Current image display with preview
   - Upload new image button (Server Action with FormData)
   - Image requirements display (max size, dimensions, formats)
   - Crop/resize functionality (optional)
   - Delete image option
   - Save to /public/uploads/menu-items/

4. **Availability & Status:**
   - Available toggle (boolean)
   - Out of stock toggle (boolean)
   - Availability schedule (optional: specific days/times)
   - Display order/priority (number for sorting)

5. **Customization Options:**
   - Add customization groups (e.g., "Size", "Add-ons", "Extras")
   - Each group has:
     * Name (e.g., "Size")
     * Type (single-select, multi-select)
     * Required/Optional toggle
     * Options array with name and price modifier
   - Drag-and-drop reordering
   - Add/remove options dynamically

6. **Inventory Tracking Management:**
   - "Track Inventory" toggle (enable/disable inventory tracking)
   - If enabled, show editable fields:
     * Current stock (number input, required when tracking enabled)
     * Minimum stock threshold (number input)
     * Maximum stock (number input)
     * Unit type (text input: portions, bottles, pieces, kg, liters, etc.)
     * Cost per unit (number input for profit tracking)
     * Supplier (text input)
     * Prevent orders when out of stock (toggle)
     * Link to full inventory details & history (if inventory record exists)
   - When saving:
     * If tracking enabled and no inventory exists: create new inventory record
     * If tracking enabled and inventory exists: update inventory record
     * If tracking disabled and inventory exists: keep inventory but mark as inactive
   - All inventory fields are editable directly from the menu item form

7. **Dietary & Allergen Information:**
   - Dietary tags (vegetarian, vegan, gluten-free, dairy-free, etc.)
   - Allergen warnings (multi-select checkboxes)
   - Spice level (dropdown: mild, medium, hot, extra hot)
   - Calories (optional number input)

8. **SEO & Metadata:**
   - SEO-friendly slug (auto-generated from name, editable)
   - Meta description
   - Tags/keywords (comma-separated)

9. **Action Buttons:**
   - Save Changes (primary button)
   - Save & Continue Editing
   - Cancel (with unsaved changes warning)
   - Delete Item (destructive, with confirmation dialog)
   - Preview Item (show how it appears to customers)
   - Duplicate Item (create copy)

10. **Audit Trail Section:**
    - Created by and timestamp
    - Last modified by and timestamp
    - View full edit history (link to audit logs)

11. **Components to Create:**
    - /app/dashboard/menu/[itemId]/edit/page.tsx
    - /components/features/admin/menu-item-form.tsx
    - /components/features/admin/menu-image-upload.tsx
    - /components/features/admin/customization-options-builder.tsx
    - /components/features/admin/dietary-tags-selector.tsx
    - /components/features/admin/delete-menu-item-dialog.tsx

12. **Server Actions Needed:**
    - updateMenuItemAction (update item details)
    - uploadMenuItemImageAction (handle image upload)
    - deleteMenuItemImageAction (remove image)
    - deleteMenuItemAction (soft delete item)
    - duplicateMenuItemAction (create copy)

13. **Validation Rules:**
    - Name: required, 3-100 characters
    - Price: required, positive number
    - Category: required, valid enum value
    - Image: max 5MB, jpg/png/webp only
    - Customization options: at least one option if group is required

14. **Error Handling:**
    - Form validation errors inline
    - Server action errors with toast notifications
    - Image upload errors with retry option
    - Conflict resolution if item was edited by another admin

15. **Performance:**
    - Optimistic UI updates
    - Image optimization on upload
    - Debounced auto-save
    - Lazy load customization builder

PART 3: Create Menu Item Page (/app/dashboard/menu/new) - ✅ COMPLETED
Implemented features:
✅ Menu item creation form with React Hook Form and Zod validation
✅ Basic fields: name, description, mainCategory, category, price, preparationTime
✅ Availability toggle (isAvailable)
✅ Inventory tracking integration:
   - Track inventory toggle
   - Stock levels (currentStock, minimumStock, maximumStock)
   - Unit type, cost per unit, supplier
   - Prevent orders when out of stock option
✅ Tags support (comma-separated)
✅ Server Action: createMenuItemAction
✅ Success/error toast notifications
✅ Redirect to menu list after creation

Outstanding features to add:
- Image upload during creation (currently only available after creation via table actions)
- Customization options builder
- Dietary tags and allergen information
- SEO metadata fields
- Rich text editor for description
- Preview functionality
- Auto-save draft
- Redirect to edit page after creation (currently redirects to list)

PART 4: Additional Features - ❌ NOT BUILT
1. Bulk import/export functionality (CSV/JSON)
2. Category management interface
3. Real-time inventory tracking dashboard
4. Low stock alerts and automatic reordering suggestions

Use Server Components for data fetching, React Hook Form for form handling, 
Zod for validation, Server Actions for mutations, and maintain consistency 
with existing admin UI patterns.
```

### Feature 4.2.2: Automatic Inventory Management & Sales Integration
**Priority:** P1 - Critical  
**Dependencies:** 4.2, 3.3 (Order Processing)  
**Prompt:**
```
Build automatic inventory management linked to menu items and sales:
1. Add inventory initialization when creating menu items
   - Optional "Track Inventory" toggle in menu item form
   - Initial stock level input (currentStock, minimumStock, maximumStock)
   - Unit selection (portions, bottles, pieces, kg, liters)
   - Cost per unit for profit tracking
2. Implement automatic stock deduction on order completion
   - Deduct inventory when order status changes to "completed"
   - Create stock history entry with order reference
   - Trigger low stock alerts if below minimum threshold
   - Prevent orders if item is out of stock (optional setting)
3. Build manual stock adjustment interface at /app/dashboard/inventory/[id]
   - Add stock (restocking) with reason and supplier info
   - Deduct stock (waste/damage) with reason
   - Adjust stock (inventory count correction)
   - View complete stock history with timestamps and user info
4. Create stock movement tracking
   - Log all stock changes (sales, restocking, waste, adjustments)
   - Track who made changes (admin user)
   - Record timestamps and reasons
   - Generate stock movement reports
5. Implement automatic low stock notifications
   - Email alerts to admins when stock reaches minimum
   - Dashboard notifications for low/out of stock items
   - Suggested reorder quantities based on sales velocity
6. Add inventory analytics
   - Stock turnover rate per item
   - Waste tracking and cost analysis
   - Most/least popular items by stock movement
   - Profit margin analysis (selling price vs cost)
Use Server Actions for all stock mutations, implement optimistic locking for concurrent updates, 
add audit logging for all inventory changes
```

### Feature 4.3: Order Management Dashboard
**Priority:** P1 - Critical  
**Dependencies:** 4.1  
**Prompt:**
```
Create comprehensive order management system with queue and detail pages:

PART 1: Order Queue (/app/dashboard/orders) - COMPLETED ✅
1. Live order queue with real-time Socket.IO updates
2. Order filtering by status tabs (All, Active, Pending, Confirmed, Preparing, Ready, Completed)
3. Search functionality (order number, customer name, items)
4. Batch operations (bulk status updates, cancellation)
5. Quick action buttons on order cards
6. Statistics cards (Total, Pending, Preparing, Completed, Revenue)
7. Export to CSV functionality

PART 2: Order Details Page (/app/dashboard/orders/[orderId]) - TO BE BUILT
Build comprehensive order details page at /app/dashboard/orders/[orderId]:

1. **Page Structure & Layout:**
   - Use Server Component for initial data fetch via OrderService.getOrderById()
   - Implement breadcrumb navigation (Dashboard > Orders > Order #XXX)
   - Create responsive layout with sidebar for actions and main content area
   - Add "Back to Orders" button with router.back()

2. **Order Header Section:**
   - Display order number prominently (e.g., "Order #WGB21854528")
   - Show current status with colored badge (use same colors as order-card.tsx)
   - Display order type icon and label (Dine-in/Pickup/Delivery)
   - Show table number for dine-in orders
   - Display creation timestamp and time elapsed
   - Show estimated completion time if available

3. **Customer Information Card:**
   - Customer name with user icon
   - Email with mailto: link
   - Phone with tel: link
   - For delivery orders: full delivery address with map icon
   - Guest vs Registered user indicator

4. **Order Items Section:**
   - Table/list view of all items with:
     * Item name and image thumbnail
     * Quantity
     * Unit price
     * Customizations/modifications (if any)
     * Subtotal per item
   - Show subtotal, tax (if applicable), delivery fee (if applicable)
   - Display total amount prominently

5. **Special Instructions:**
   - Display special instructions in a highlighted card if present
   - Show dietary requirements or preferences

6. **Payment Information Card:**
   - Payment method (Card, Transfer, USSD, etc.)
   - Payment status badge (Pending/Paid/Failed)
   - Payment reference number
   - Transaction timestamp
   - Amount paid

7. **Order Timeline/Status History:**
   - Vertical timeline showing all status changes
   - Each entry shows: status, timestamp, user who made change, optional note
   - Use icons for each status (Clock, CheckCircle, Truck, etc.)
   - Highlight current status

8. **Status Management Actions:**
   - Action buttons based on current status (same logic as order-card.tsx)
   - "Start Preparing" for pending/confirmed orders
   - "Mark as Ready" for preparing orders
   - "Complete Order" for ready orders
   - "Cancel Order" button with confirmation dialog
   - Add note to order functionality with textarea and submit

9. **Additional Actions:**
   - Print receipt button (opens print dialog with formatted receipt)
   - Refresh order button (manual refresh)
   - Contact customer dropdown (Email/Call options)

10. **Real-time Updates:**
    - Implement useOrderSocket hook to listen for order updates
    - Auto-refresh order data when status changes
    - Show toast notifications for updates
    - Update UI optimistically for better UX

11. **Components to Create:**
    - /app/dashboard/orders/[orderId]/page.tsx (main page)
    - /components/features/admin/order-details-header.tsx
    - /components/features/admin/order-customer-info.tsx
    - /components/features/admin/order-items-table.tsx
    - /components/features/admin/order-payment-info.tsx
    - /components/features/admin/order-timeline.tsx
    - /components/features/admin/order-actions-sidebar.tsx
    - /components/features/admin/add-order-note-dialog.tsx
    - /components/features/admin/cancel-order-dialog.tsx

12. **Server Actions Needed:**
    - updateOrderStatusAction (already exists)
    - addOrderNoteAction (create new)
    - cancelOrderAction (already exists)

13. **Styling Requirements:**
    - Use Shadcn UI components (Card, Badge, Button, Dialog, Separator)
    - Maintain consistent spacing and typography
    - Responsive design (stack on mobile, sidebar on desktop)
    - Use color coding for statuses matching order-card.tsx
    - Add loading states with Skeleton components

14. **Error Handling:**
    - Show 404 page if order not found
    - Handle permission errors (admin only)
    - Display error toasts for failed actions
    - Implement retry logic for failed updates

15. **Performance Considerations:**
    - Use React.Suspense for async components
    - Implement skeleton loaders
    - Optimize image loading for item thumbnails
    - Cache order data appropriately

Use existing OrderService, Socket.IO integration, and maintain consistency with order-card.tsx styling and logic.
```

### Feature 4.4: Analytics & Reporting
**Priority:** P2 - High  
**Dependencies:** 4.1, 4.2, 4.3  
**Prompt:**
```
Build analytics dashboard:
1. Create AnalyticsService for data aggregation
2. Build sales reports with date range filters
3. Implement popular items analysis
4. Create peak hours heatmap
5. Build revenue tracking with payment method breakdown
6. Add customer retention metrics
Use server-side data processing, implement data visualization with lightweight charts
```

### Feature 4.4: Rewards Management Dashboard
**Priority:** P1 - Critical  
**Dependencies:** 3.2 (Random Rewards System)  
**Prompt:**
```
Create comprehensive rewards management dashboard:
1. Build reward rules CRUD interface at /dashboard/rewards/rules
   - Create/edit/delete reward rules with full form
   - Configure: spend threshold, reward type, value, probability, validity
   - Toggle active/inactive status, bulk actions
   - Duplicate rules for quick setup
2. Implement analytics dashboard at /dashboard/rewards
   - Statistics cards: active rules, issued, redeemed, rate, value
   - Charts: issued over time, by type, redemption rate by rule
   - Top performing rules table
3. Create issued rewards tracking at /dashboard/rewards/issued
   - Paginated table with all issued rewards
   - Filters: status, type, date range
   - Search by user email or reward code
   - Manual expiration, export to CSV
4. Add reward rule templates at /dashboard/rewards/templates
   - Pre-configured templates (first order, high spender, loyalty, free item)
   - One-click application with customization
   - Save custom templates
5. Implement server actions for all reward rule operations
   - createRewardRuleAction, updateRewardRuleAction, deleteRewardRuleAction
   - getRewardStatisticsAction, getIssuedRewardsAction
6. Build responsive UI with data tables, forms, and charts
Use Server Actions for all mutations, RSC for data display, secure admin-only access
```

### Feature 4.4.1: Customer Rewards Dashboard (Guest-Facing)
**Priority:** P1 - Critical  
**Dependencies:** 3.2 (Random Rewards System)  
**Status:** ✅ COMPLETE (Implemented in Feature 3.2)  
**Prompt:**
```
Create customer-facing rewards dashboard at /profile/rewards:
1. Build statistics overview section
   - Display 4 metric cards: Active Rewards, Total Earned, Total Savings (₦), Loyalty Points
   - Show loyalty points conversion rate (100 points = ₦1)
   - Use icons for visual appeal (Gift, TrendingUp, Award)
2. Implement Active Rewards tab
   - Display all active (non-expired, non-redeemed) rewards
   - Show reward cards with:
     * Reward type icon and title (e.g., "10% Discount", "₦500 Off")
     * Unique reward code in monospace font
     * Expiry date with visual warnings (red badge if expires ≤3 days)
     * Action buttons: "Use Now" (→ /menu), "Apply at Checkout" (→ /checkout)
   - Use gradient background for reward cards (primary/5 to primary/10)
   - Empty state with "Browse Menu" CTA when no active rewards
3. Create Reward History tab
   - Display paginated list of all rewards (active, redeemed, expired)
   - Show reward history cards with:
     * Reward type and value
     * Reward code and earned date
     * Status badge (Active/Redeemed/Expired with appropriate colors)
     * Redeemed date if applicable
   - Empty state with helpful message
4. Implement authentication check
   - Redirect to /login?redirect=/profile/rewards if not authenticated
   - Use iron-session for session management
5. Fetch data from RewardsService
   - getUserActiveRewards(userId) - active rewards only
   - getUserRewardHistory(userId, options) - all rewards with pagination
   - getUserRewardStats(userId) - statistics for cards
6. Build responsive layout
   - Mobile-first design with responsive grid
   - Statistics cards: 1 col mobile, 2 cols tablet, 4 cols desktop
   - Active rewards: 1 col mobile, 2 cols desktop
   - Use Tabs component for Active/History switching
Use Server Components for data fetching, client components only for interactive tabs
```

**Implementation Notes:**
- Page location: `/app/(customer)/profile/rewards/page.tsx`
- Uses RewardsService methods for all data operations
- Fully responsive with mobile-first approach
- Includes back navigation to profile page
- Statistics show real-time data from database
- Reward codes are displayed prominently for easy reference
- Expiry warnings help users prioritize reward usage
- Empty states encourage user engagement

### Feature 4.5: Settings & Configuration
**Priority:** P2 - High  
**Dependencies:** 4.1  
**Prompt:**
```
Create settings management:
1. Build restaurant hours configuration
2. Implement delivery radius settings
3. Create payment method toggles
4. Add email template management
5. Implement feature flags for A/B testing
Store settings in database, use Server Actions for updates
```

---

## Phase 5: Optimization & Polish (Week 9-10)

### Feature 5.1: Performance Optimization
**Priority:** P1 - Critical  
**Dependencies:** All previous phases  
**Prompt:**
```
Optimize application performance:
1. Implement route prefetching strategies
2. Add image optimization with WebP and lazy loading
3. Optimize bundle size with dynamic imports
4. Implement Redis caching for frequently accessed data
5. Add CDN integration for static assets
6. Optimize database queries with proper indexing
Focus on Core Web Vitals (LCP, CLS, FID), use Lighthouse for benchmarking
```

### Feature 5.2: SEO & Metadata
**Priority:** P2 - High  
**Dependencies:** Phase 2  
**Prompt:**
```
Implement SEO optimizations:
1. Add dynamic metadata generation for all pages
2. Create XML sitemap at /app/sitemap.xml
3. Implement JSON-LD structured data for menu items
4. Add OpenGraph tags for social sharing
5. Create robots.txt with proper crawling rules
6. Implement canonical URLs for duplicate content
Use Next.js metadata API, ensure all pages are SEO-friendly
```

### Feature 5.3: Progressive Web App
**Priority:** P3 - Medium  
**Dependencies:** Phase 2, 3  
**Prompt:**
```
Convert to Progressive Web App:
1. Create web app manifest
2. Implement service worker for offline functionality
3. Add push notification support
4. Create app install prompt
5. Implement background sync for orders
6. Add offline menu browsing capability
Ensure PWA scores 100 in Lighthouse PWA audit
```

---

## Phase 6: Testing & Deployment (Week 11-12)

### Feature 6.1: Testing Implementation
**Priority:** P1 - Critical  
**Dependencies:** All features  
**Prompt:**
```
Implement comprehensive testing:
1. Set up Jest/Vitest for unit testing
2. Create component tests for all UI components
3. Write integration tests for API routes and Server Actions
4. Implement E2E tests with Playwright for critical user flows
5. Add payment gateway testing in sandbox mode
6. Create load testing scripts for peak hour simulation
Aim for 80% code coverage, focus on critical business logic
```

### Feature 6.2: Deployment Setup
**Priority:** P1 - Critical  
**Dependencies:** 6.1  
**Prompt:**
```
Prepare for production deployment:
1. Configure environment variables for production
2. Set up CI/CD pipeline with GitHub Actions
3. Configure Vercel/Netlify deployment
4. Implement monitoring with Sentry or similar
5. Set up backup strategies for database
6. Create deployment documentation
Ensure zero-downtime deployments, implement rollback procedures
```

---

## Success Metrics & KPIs

1. **Performance Metrics:**
   - Page Load Time < 2 seconds
   - Time to Interactive < 3 seconds
   - Lighthouse Score > 90

2. **Business Metrics:**
   - Order Completion Rate > 85%
   - Payment Success Rate > 95%
   - Cart Abandonment Rate < 20%

3. **User Experience Metrics:**
   - Customer Satisfaction Score > 4.5/5
   - Average Order Processing Time < 15 minutes
   - Mobile Conversion Rate > 3%

---

## Risk Mitigation Strategies

1. **Technical Risks:**
   - Maintain fallback payment methods
   - Implement graceful degradation for features
   - Create comprehensive error handling

2. **Business Risks:**
   - Soft launch with limited menu items
   - Beta test with staff before public launch
   - Maintain manual order backup system

3. **Security Risks:**
   - Regular security audits
   - Implement rate limiting
   - Use secure session management

---

## Development Best Practices Checklist

- [ ] All code follows Airbnb Style Guide
- [ ] TypeScript strict mode enabled
- [ ] No use of `any` type
- [ ] Interfaces preferred over types
- [ ] Server Components used by default
- [ ] Minimal `use client` directives
- [ ] All forms use React Hook Form
- [ ] Validation with Zod schemas
- [ ] Server Actions for mutations
- [ ] TanStack Query for client fetching
- [ ] Proper Suspense boundaries
- [ ] Mobile-first responsive design
- [ ] Accessibility standards met
- [ ] Performance budgets maintained
- [ ] Security best practices followed

---

## Profile System Implementation Checklist

### Database & Models
- [ ] Extend User model with addresses array subdocument
- [ ] Add firstName, lastName, phone, profilePicture fields
- [ ] Add preferences object (dietaryRestrictions, favoriteItems, communicationPreferences)
- [ ] Add profileCompletionPercentage field
- [ ] Add guestOrderIds array for guest conversion
- [ ] Add indexes on email, phone, addresses.isDefault
- [ ] Create address subdocument schema with all fields
- [ ] Add validation for phone numbers (E.164 format)
- [ ] Add method to calculate profile completion percentage
- [ ] Add method to get default address

### Services Layer
- [ ] Create ProfileService class in /services/profile-service.ts
- [ ] Implement getUserProfile(userId) method
- [ ] Implement updateProfile(userId, data) method
- [ ] Implement uploadProfilePicture(userId, file) method
- [ ] Implement addAddress(userId, address) method
- [ ] Implement updateAddress(userId, addressId, data) method
- [ ] Implement deleteAddress(userId, addressId) method
- [ ] Implement setDefaultAddress(userId, addressId) method
- [ ] Implement getAddresses(userId) method
- [ ] Implement claimGuestOrders(userId, email) method
- [ ] Add validation to ensure only one default address
- [ ] Export ProfileService from /services/index.ts

### Server Actions
- [ ] Create /app/actions/profile/profile-actions.ts
- [ ] Implement updateProfileAction(formData)
- [ ] Implement addAddressAction(addressData)
- [ ] Implement updateAddressAction(addressId, data)
- [ ] Implement deleteAddressAction(addressId)
- [ ] Implement setDefaultAddressAction(addressId)
- [ ] Implement uploadProfilePictureAction(formData)
- [ ] Add authentication checks to all actions
- [ ] Add audit logging for profile changes
- [ ] Add rate limiting for sensitive operations

### Profile Pages
- [ ] Create /app/(customer)/profile/page.tsx (main profile page)
- [ ] Create /app/(customer)/profile/layout.tsx (profile layout with tabs)
- [ ] Create Personal Info tab component
- [ ] Create Addresses tab component
- [ ] Create Order History tab component
- [ ] Create Preferences tab component
- [ ] Create Security tab component
- [ ] Add profile completion progress bar
- [ ] Add missing field prompts
- [ ] Implement tab navigation with nuqs

### Profile Components
- [ ] Create /components/features/profile/personal-info-form.tsx
- [ ] Create /components/features/profile/address-form.tsx
- [ ] Create /components/features/profile/address-card.tsx
- [ ] Create /components/features/profile/preferences-form.tsx
- [ ] Create /components/features/profile/profile-picture-upload.tsx
- [ ] Create /components/features/profile/profile-completion-card.tsx
- [ ] Add Zod validation schemas for all forms
- [ ] Implement optimistic UI updates
- [ ] Add loading states and skeletons
- [ ] Add success/error toast notifications

### Checkout Integration
- [ ] Update checkout to pre-fill email from user profile
- [ ] Update checkout to pre-fill phone from user profile
- [ ] Add saved addresses dropdown for delivery orders
- [ ] Add "Use different address" option
- [ ] Add "Save this address" checkbox (default checked)
- [ ] Implement auto-save for new addresses after order
- [ ] Add address label prompt after saving
- [ ] For guests: create profile on first order
- [ ] Check if email exists before creating guest profile
- [ ] Prompt existing users to login when email matches

### Guest Conversion
- [ ] Create guest conversion banner component
- [ ] Show banner after guest order completion
- [ ] Implement one-click signup from banner
- [ ] Send PIN to email for verification
- [ ] Link guest orders to new account on verification
- [ ] Transfer saved addresses to user profile
- [ ] Award welcome reward for account creation
- [ ] Update order records with userId

### API Routes (if needed)
- [ ] Create /app/api/profile/route.ts (GET, PUT)
- [ ] Create /app/api/profile/addresses/route.ts (GET, POST)
- [ ] Create /app/api/profile/addresses/[id]/route.ts (PUT, DELETE)
- [ ] Add proper authentication middleware
- [ ] Add rate limiting
- [ ] Add input validation

### Testing
- [ ] Test profile creation on first login
- [ ] Test profile update with all fields
- [ ] Test adding multiple addresses
- [ ] Test setting default address
- [ ] Test deleting non-default address
- [ ] Test preventing deletion of default address
- [ ] Test address auto-save during checkout
- [ ] Test guest profile creation
- [ ] Test guest conversion flow
- [ ] Test profile completion percentage calculation
- [ ] Test profile picture upload
- [ ] Test email change with verification
- [ ] Test phone number validation

---

## Timeline Summary

- **Week 1-2:** Foundation & Infrastructure
- **Week 3-4:** Core Customer Experience + Profile Management
- **Week 5-6:** Order Management & Tracking
- **Week 7-8:** Admin Dashboard
- **Week 9-10:** Optimization & Polish
- **Week 11-12:** Testing & Deployment

**Total Estimated Duration:** 12 weeks for MVP

---

## Notes for Vibe Coding

1. **Start each session** by reviewing the current phase and feature
2. **Use the prompts** as conversation starters, adapt based on context
3. **Always verify** that generated code follows the rules in `.windsurf/rules`
4. **Test incrementally** after each feature implementation
5. **Commit frequently** with descriptive messages
6. **Document decisions** for future reference
7. **Prioritize RSC** and minimize client components
8. **Focus on mobile-first** responsive design
9. **Maintain type safety** throughout the codebase
10. **Keep performance** as a constant consideration

---

*This strategy document should be treated as a living document and updated as the project evolves.*
