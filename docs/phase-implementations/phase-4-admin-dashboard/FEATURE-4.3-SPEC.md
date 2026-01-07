# Feature 4.3: Order Management Dashboard - Specification

**Priority:** P1 - Critical  
**Dependencies:** Feature 4.1 (User Management)  
**Status:** In Development  
**Created:** November 17, 2025

---

## Table of Contents

1. [Overview](#overview)
2. [Requirements](#requirements)
3. [User Stories](#user-stories)
4. [Technical Architecture](#technical-architecture)
5. [Implementation Plan](#implementation-plan)
6. [API Endpoints](#api-endpoints)
7. [Database Schema](#database-schema)
8. [UI Components](#ui-components)
9. [Real-time Features](#real-time-features)
10. [Testing Strategy](#testing-strategy)

---

## Overview

The Order Management Dashboard provides a comprehensive interface for restaurant staff to manage incoming orders, update order statuses, communicate with the kitchen, and analyze order data. The system includes real-time updates, filtering capabilities, batch operations, and a dedicated kitchen display system.

### Key Features

1. **Live Order Queue** - Real-time order list with status updates
2. **Kitchen Display System** - Dedicated view for kitchen staff
3. **Advanced Filtering** - Search and filter by multiple criteria
4. **Status Management** - Quick status updates with validation
5. **Batch Operations** - Process multiple orders simultaneously
6. **Order Analytics** - Performance metrics and insights
7. **Real-time Notifications** - Socket.io integration for live updates
8. **Order Details** - Comprehensive order information view

---

## Requirements

### Functional Requirements

#### FR1: Live Order Queue
- Display all active orders in real-time
- Show order status, type, customer info, and items
- Auto-refresh when new orders arrive
- Sort by date, status, or priority
- Color-coded status indicators

#### FR2: Kitchen Display System
- Dedicated full-screen view for kitchen
- Show only pending and preparing orders
- Large, readable text for kitchen environment
- Timer showing order age
- Audio/visual alerts for new orders
- One-click status updates

#### FR3: Order Filtering & Search
- Filter by:
  - Status (pending, preparing, ready, completed, cancelled)
  - Order type (dine-in, pickup, delivery)
  - Date range
  - Customer name/phone
  - Payment status
- Search by order ID or customer details
- Save filter presets
- Export filtered results

#### FR4: Order Status Management
- Quick status update buttons
- Status validation (prevent invalid transitions)
- Automatic inventory deduction on completion
- Status history tracking
- Bulk status updates
- Estimated completion time

#### FR5: Batch Operations
- Select multiple orders
- Bulk status updates
- Bulk print receipts
- Bulk export
- Bulk cancellation with reason

#### FR6: Order Analytics
- Today's orders count and revenue
- Average preparation time
- Orders by status breakdown
- Orders by type breakdown
- Peak hours analysis
- Popular items
- Revenue trends

### Non-Functional Requirements

#### NFR1: Performance
- Load 1000+ orders without lag
- Real-time updates within 500ms
- Virtualized lists for large datasets
- Optimistic UI updates

#### NFR2: Real-time Updates
- Socket.io for live order updates
- Automatic reconnection on disconnect
- Offline queue for updates
- Conflict resolution

#### NFR3: Usability
- Keyboard shortcuts for common actions
- Mobile-responsive design
- Accessible (WCAG 2.1 AA)
- Intuitive status transitions

#### NFR4: Security
- Role-based access (admin, kitchen staff)
- Audit logging for all changes
- Session validation
- Rate limiting on updates

---

## User Stories

### As an Admin
- I want to see all orders in real-time so I can monitor restaurant operations
- I want to filter orders by status so I can focus on specific stages
- I want to update order statuses so I can track progress
- I want to see order analytics so I can make business decisions
- I want to export order data so I can analyze trends

### As Kitchen Staff
- I want to see only pending orders so I can focus on cooking
- I want to mark orders as preparing so the team knows I'm working on them
- I want to mark orders as ready so servers can deliver them
- I want to hear alerts for new orders so I don't miss them
- I want to see order age so I can prioritize older orders

### As a Server
- I want to see ready orders so I can deliver them to customers
- I want to mark orders as completed so they're removed from the queue
- I want to see dine-in table numbers so I know where to deliver
- I want to update order notes so I can communicate with the kitchen

---

## Technical Architecture

### Frontend Stack
- **Framework:** Next.js 15 (App Router)
- **UI Library:** Shadcn UI + Radix UI
- **Styling:** Tailwind CSS
- **State Management:** Zustand (for real-time state)
- **Real-time:** Socket.io Client
- **Virtualization:** @tanstack/react-virtual
- **Forms:** React Hook Form + Zod

### Backend Stack
- **Runtime:** Node.js with Next.js API Routes
- **Database:** MongoDB with Mongoose
- **Real-time:** Socket.io Server
- **Authentication:** iron-session
- **Validation:** Zod schemas

### Real-time Architecture
```
┌─────────────┐         ┌──────────────┐         ┌─────────────┐
│   Client    │◄───────►│  Socket.io   │◄───────►│  MongoDB    │
│  (Browser)  │  WebSocket  Server     │   Watch  │  (Orders)   │
└─────────────┘         └──────────────┘         └─────────────┘
      │                        │
      │                        │
      ▼                        ▼
┌─────────────┐         ┌──────────────┐
│  Zustand    │         │   Server     │
│   Store     │         │   Actions    │
└─────────────┘         └──────────────┘
```

---

## Implementation Plan

### Phase 1: Core Order Queue (Priority: Critical)
**Files to Create:**
- `/app/dashboard/orders/page.tsx` - Main order queue page
- `/components/features/admin/order-queue.tsx` - Order list component
- `/components/features/admin/order-card.tsx` - Individual order card
- `/app/actions/admin/order-actions.ts` - Server actions for orders

**Features:**
- Display all orders
- Basic filtering (status, type)
- Status update buttons
- Order details view

**Estimated Time:** 3-4 hours

### Phase 2: Real-time Updates (Priority: Critical)
**Files to Create:**
- `/lib/socket-client.ts` - Socket.io client setup
- `/lib/socket-server.ts` - Socket.io server integration
- `/stores/order-store.ts` - Zustand store for real-time state

**Features:**
- Socket.io integration
- Real-time order updates
- Automatic reconnection
- Optimistic updates

**Estimated Time:** 2-3 hours

### Phase 3: Advanced Filtering & Search (Priority: High)
**Files to Create:**
- `/components/features/admin/order-filters.tsx` - Filter component
- `/components/features/admin/order-search.tsx` - Search component

**Features:**
- Multi-criteria filtering
- Search by order ID, customer
- Date range picker
- Filter presets
- Export functionality

**Estimated Time:** 2-3 hours

### Phase 4: Kitchen Display System (Priority: High)
**Files to Create:**
- `/app/dashboard/kitchen/page.tsx` - Kitchen display page
- `/components/features/kitchen/kitchen-order-card.tsx` - Kitchen-specific card
- `/components/features/kitchen/kitchen-timer.tsx` - Order age timer

**Features:**
- Full-screen layout
- Large text for visibility
- Audio alerts
- Auto-refresh
- Quick status updates

**Estimated Time:** 2-3 hours

### Phase 5: Batch Operations (Priority: Medium)
**Files to Create:**
- `/components/features/admin/order-batch-actions.tsx` - Batch action toolbar

**Features:**
- Multi-select orders
- Bulk status updates
- Bulk print
- Bulk export
- Bulk cancel

**Estimated Time:** 2 hours

### Phase 6: Order Analytics (Priority: Medium)
**Files to Create:**
- `/components/features/admin/order-analytics.tsx` - Analytics dashboard
- `/services/order-analytics-service.ts` - Analytics calculations

**Features:**
- Today's metrics
- Status breakdown
- Type breakdown
- Revenue trends
- Popular items
- Peak hours

**Estimated Time:** 2-3 hours

### Phase 7: Performance Optimization (Priority: Medium)
**Features:**
- Virtual scrolling for large lists
- Pagination
- Lazy loading
- Memoization
- Debounced search

**Estimated Time:** 1-2 hours

---

## API Endpoints

### Order Management

#### GET /api/orders
Get orders with filtering and pagination

**Query Parameters:**
```typescript
{
  status?: OrderStatus;
  type?: OrderType;
  startDate?: string;
  endDate?: string;
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: 'createdAt' | 'updatedAt' | 'total';
  sortOrder?: 'asc' | 'desc';
}
```

**Response:**
```typescript
{
  success: boolean;
  data: {
    orders: Order[];
    total: number;
    page: number;
    pages: number;
  };
}
```

#### GET /api/orders/:id
Get single order details

**Response:**
```typescript
{
  success: boolean;
  data: Order;
}
```

#### PATCH /api/orders/:id/status
Update order status

**Body:**
```typescript
{
  status: OrderStatus;
  note?: string;
}
```

#### POST /api/orders/batch
Batch update orders

**Body:**
```typescript
{
  orderIds: string[];
  action: 'updateStatus' | 'cancel' | 'print';
  data?: {
    status?: OrderStatus;
    cancelReason?: string;
  };
}
```

### Analytics

#### GET /api/orders/analytics
Get order analytics

**Query Parameters:**
```typescript
{
  startDate?: string;
  endDate?: string;
  groupBy?: 'day' | 'week' | 'month';
}
```

**Response:**
```typescript
{
  success: boolean;
  data: {
    totalOrders: number;
    totalRevenue: number;
    averageOrderValue: number;
    ordersByStatus: Record<OrderStatus, number>;
    ordersByType: Record<OrderType, number>;
    revenueByDay: Array<{ date: string; revenue: number }>;
    popularItems: Array<{ name: string; count: number }>;
    peakHours: Array<{ hour: number; count: number }>;
  };
}
```

---

## Database Schema

### Order Model Extensions

```typescript
interface IOrder {
  // ... existing fields
  
  // NEW: Kitchen display fields
  kitchenPriority?: 'normal' | 'urgent';
  estimatedCompletionTime?: Date;
  actualCompletionTime?: Date;
  preparationStartedAt?: Date;
  
  // NEW: Batch operation tracking
  batchId?: string;
  batchAction?: string;
  batchProcessedAt?: Date;
  
  // NEW: Analytics fields
  preparationDuration?: number; // in minutes
  totalDuration?: number; // from order to completion
}
```

### OrderStatusHistory Schema

```typescript
interface IOrderStatusHistory {
  status: OrderStatus;
  timestamp: Date;
  note?: string;
  updatedBy?: ObjectId;
  updatedByName?: string;
  duration?: number; // time in previous status
}
```

---

## UI Components

### Order Queue Page Layout

```
┌─────────────────────────────────────────────────────────┐
│  Orders Dashboard                          [Kitchen View]│
├─────────────────────────────────────────────────────────┤
│  📊 Analytics Cards (Today's Stats)                     │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐  │
│  │ Total    │ │ Pending  │ │ Preparing│ │ Revenue  │  │
│  │ 45       │ │ 12       │ │ 8        │ │ ₦125,000 │  │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘  │
├─────────────────────────────────────────────────────────┤
│  🔍 Filters & Search                                    │
│  [Status▼] [Type▼] [Date Range] [Search...] [Export]   │
├─────────────────────────────────────────────────────────┤
│  📋 Order Queue                    [☑ Select All]       │
│  ┌───────────────────────────────────────────────────┐ │
│  │ 🟡 #ORD-001  Dine-in  Table 5    12:30 PM         │ │
│  │    2x Jollof Rice, 1x Beer                        │ │
│  │    [Preparing] [Ready] [Complete]                 │ │
│  ├───────────────────────────────────────────────────┤ │
│  │ 🔴 #ORD-002  Delivery  John Doe  12:25 PM         │ │
│  │    1x Fried Rice, 2x Soft Drink                   │ │
│  │    [Preparing] [Ready] [Complete]                 │ │
│  └───────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

### Kitchen Display Layout

```
┌─────────────────────────────────────────────────────────┐
│  🍳 KITCHEN DISPLAY                    [Exit] [Settings]│
├─────────────────────────────────────────────────────────┤
│  ┌──────────────────────┐  ┌──────────────────────┐    │
│  │ 🔴 ORDER #001        │  │ 🟡 ORDER #003        │    │
│  │ ⏱️ 15 min ago        │  │ ⏱️ 5 min ago         │    │
│  │ Table 5 - Dine-in    │  │ Pickup - Jane        │    │
│  │                      │  │                      │    │
│  │ • 2x Jollof Rice     │  │ • 1x Fried Rice      │    │
│  │ • 1x Chicken         │  │ • 2x Plantain        │    │
│  │                      │  │                      │    │
│  │ [START PREPARING]    │  │ [MARK READY]         │    │
│  └──────────────────────┘  └──────────────────────┘    │
│  ┌──────────────────────┐  ┌──────────────────────┐    │
│  │ 🟢 ORDER #002        │  │ 🟡 ORDER #004        │    │
│  │ ⏱️ 8 min ago         │  │ ⏱️ 2 min ago         │    │
│  │ Delivery - Mike      │  │ Table 3 - Dine-in    │    │
│  │                      │  │                      │    │
│  │ • 3x Jollof Rice     │  │ • 1x Egusi Soup      │    │
│  │ • 1x Salad           │  │ • 2x Pounded Yam     │    │
│  │                      │  │                      │    │
│  │ [MARK READY]         │  │ [START PREPARING]    │    │
│  └──────────────────────┘  └──────────────────────┘    │
└─────────────────────────────────────────────────────────┘
```

---

## Real-time Features

### Socket.io Events

#### Server → Client Events

```typescript
// New order created
socket.emit('order:created', order);

// Order status updated
socket.emit('order:updated', { orderId, status, updatedBy });

// Order cancelled
socket.emit('order:cancelled', { orderId, reason });

// Batch operation completed
socket.emit('orders:batch-updated', { orderIds, action });

// Kitchen alert
socket.emit('kitchen:new-order', order);
```

#### Client → Server Events

```typescript
// Join order room
socket.emit('orders:subscribe');

// Leave order room
socket.emit('orders:unsubscribe');

// Join kitchen room
socket.emit('kitchen:subscribe');

// Acknowledge order
socket.emit('order:acknowledge', orderId);
```

### Zustand Store Structure

```typescript
interface OrderStore {
  orders: Order[];
  selectedOrders: string[];
  filters: OrderFilters;
  isConnected: boolean;
  
  // Actions
  setOrders: (orders: Order[]) => void;
  addOrder: (order: Order) => void;
  updateOrder: (orderId: string, updates: Partial<Order>) => void;
  removeOrder: (orderId: string) => void;
  toggleSelectOrder: (orderId: string) => void;
  selectAllOrders: () => void;
  clearSelection: () => void;
  setFilters: (filters: Partial<OrderFilters>) => void;
  setConnected: (connected: boolean) => void;
}
```

---

## Testing Strategy

### Unit Tests
- Order filtering logic
- Status validation
- Analytics calculations
- Batch operation logic

### Integration Tests
- Order CRUD operations
- Status updates with inventory
- Real-time event handling
- Filter combinations

### E2E Tests
- Create and update order flow
- Kitchen display workflow
- Batch operations
- Analytics accuracy

### Performance Tests
- Load 1000+ orders
- Real-time update latency
- Virtual scroll performance
- Socket.io connection stability

---

## Acceptance Criteria

### Must Have (P0)
- ✅ Display all orders in real-time
- ✅ Update order status
- ✅ Filter by status and type
- ✅ Search by order ID
- ✅ Kitchen display view
- ✅ Real-time updates via Socket.io

### Should Have (P1)
- ✅ Advanced filtering (date, customer)
- ✅ Batch status updates
- ✅ Order analytics dashboard
- ✅ Audio alerts for kitchen
- ✅ Export functionality

### Nice to Have (P2)
- Virtual scrolling
- Filter presets
- Bulk print receipts
- Peak hours analysis
- Keyboard shortcuts

---

## Timeline

**Total Estimated Time:** 14-20 hours

- **Phase 1:** Core Order Queue (3-4 hours)
- **Phase 2:** Real-time Updates (2-3 hours)
- **Phase 3:** Filtering & Search (2-3 hours)
- **Phase 4:** Kitchen Display (2-3 hours)
- **Phase 5:** Batch Operations (2 hours)
- **Phase 6:** Analytics (2-3 hours)
- **Phase 7:** Optimization (1-2 hours)

---

## Dependencies

### External Packages
```json
{
  "socket.io": "^4.7.0",
  "socket.io-client": "^4.7.0",
  "@tanstack/react-virtual": "^3.0.0",
  "date-fns": "^3.0.0",
  "zustand": "^4.5.0"
}
```

### Internal Dependencies
- Feature 4.1: User Management (for authentication)
- Feature 4.2.2: Inventory Management (for stock deduction)
- Order Model (existing)
- Email Service (for notifications)

---

## Security Considerations

1. **Authentication:** All endpoints require admin/kitchen staff role
2. **Authorization:** Kitchen staff can only update status, not cancel
3. **Rate Limiting:** Max 100 status updates per minute per user
4. **Audit Logging:** All order changes logged with user info
5. **Input Validation:** Zod schemas for all inputs
6. **SQL Injection:** Use Mongoose parameterized queries
7. **XSS Protection:** Sanitize all user inputs

---

## Performance Considerations

1. **Virtual Scrolling:** Use @tanstack/react-virtual for 1000+ orders
2. **Pagination:** Server-side pagination with cursor-based approach
3. **Caching:** Cache analytics for 5 minutes
4. **Debouncing:** Debounce search input (300ms)
5. **Memoization:** Memoize expensive calculations
6. **Lazy Loading:** Load order details on demand
7. **WebSocket Optimization:** Batch multiple updates

---

*Specification Version: 1.0*  
*Last Updated: November 17, 2025*
