# Order Processing Workflow - Complete Implementation

## Overview

A comprehensive order processing system with real-time updates using Socket.io, Server Components, and Server Actions following Next.js App Router best practices.

## Architecture

### Backend Services

#### OrderService (`/services/order-service.ts`)
Complete CRUD operations for orders:
- `createOrder()` - Create new orders with automatic order number generation
- `getOrderById()` - Retrieve order by ID
- `getOrderByNumber()` - Retrieve order by order number
- `getOrdersByUserId()` - Get user's order history with pagination
- `getOrdersByGuestEmail()` - Get guest orders by email
- `updateOrderStatus()` - Update order status with history tracking
- `updatePaymentStatus()` - Update payment information
- `cancelOrder()` - Cancel orders with validation
- `addReview()` - Add ratings and reviews to completed orders
- `getActiveOrders()` - Get active orders for kitchen dashboard
- `getOrderStats()` - Get order statistics and analytics

**Features:**
- Automatic order number generation (format: `WG{YYMMDD}{sequence}`)
- Dynamic wait time estimation based on queue and order type
- Status history tracking
- Comprehensive validation

### Server Actions (`/app/actions/order/order-actions.ts`)

All order mutations are handled via Server Actions:

1. **createOrderAction** - Create new orders
   - Validates customer info (user or guest)
   - Validates order type specific details
   - Emits WebSocket events to kitchen
   - Returns order ID and order number

2. **updateOrderStatusAction** - Update order status (admin/kitchen)
   - Requires authentication
   - Emits real-time updates to customers
   - Notifies kitchen dashboard

3. **cancelOrderAction** - Cancel orders
   - Validates ownership
   - Only allows cancellation of pending/confirmed orders
   - Emits cancellation events

4. **addOrderReviewAction** - Add reviews to completed orders
   - Validates ownership
   - Only for completed orders
   - Rating 1-5 with optional review text

5. **getUserOrdersAction** - Get user's order history
   - Requires authentication
   - Supports pagination
   - Status filtering

6. **getOrderAction** - Get single order with ownership verification

7. **getOrderByNumberAction** - Get order by number (for guest tracking)
   - Email verification for guest orders

8. **getActiveOrdersAction** - Get active orders (admin/kitchen)

### Real-Time Updates

#### Socket.io Server (`/lib/socket-server.ts`)

WebSocket server for real-time order updates:

**Rooms:**
- `order-{orderId}` - Individual order tracking
- `kitchen` - Kitchen dashboard updates

**Events:**
- `order-status-update` - Status changes for specific orders
- `new-order` - New order notifications to kitchen
- `order-update` - Order updates to kitchen

**Functions:**
- `initSocketServer()` - Initialize Socket.io with Next.js server
- `emitOrderStatusUpdate()` - Emit status updates to customers
- `emitNewOrderToKitchen()` - Notify kitchen of new orders
- `emitOrderUpdateToKitchen()` - Notify kitchen of order changes

#### Custom Server (`/server.ts`)

Next.js custom server with Socket.io integration:
- Runs on port 3000 (configurable via PORT env)
- Handles both HTTP and WebSocket connections
- Development and production modes

**Scripts:**
```json
{
  "dev": "tsx watch server.ts",
  "start": "NODE_ENV=production tsx server.ts"
}
```

### Client Components

#### useOrderSocket Hook (`/hooks/use-order-socket.ts`)

Client-side WebSocket management:
- Auto-connects to Socket.io server
- Manages order room subscriptions
- Handles connection state
- Provides real-time update callbacks

**Usage:**
```typescript
const { isConnected, joinOrder, leaveOrder } = useOrderSocket({
  orderId: 'order-id',
  onStatusUpdate: (update) => {
    // Handle status update
  }
});
```

#### OrderStatusTracker (`/components/features/orders/order-status-tracker.tsx`)

Visual status tracking component:
- Different flows for dine-in, pickup, and delivery
- Animated progress indicators
- Status-specific icons and descriptions
- Responsive design

**Status Flows:**
- **Dine-in:** Received → Preparing → Ready → Delivered
- **Pickup:** Received → Preparing → Ready → Completed
- **Delivery:** Received → Preparing → Ready → On the Way → Delivered

#### RealTimeOrderTracker (`/components/features/orders/real-time-order-tracker.tsx`)

Complete order tracking with WebSocket integration:
- Real-time status updates
- Connection status indicator
- Estimated wait time display
- Order items summary
- Delivery/pickup/dine-in details
- Last update notes

### Pages

#### Order Confirmation Page (`/app/(customer)/orders/[orderId]/page.tsx`)

Server Component for order tracking:
- Fetches order data server-side
- Displays success message for confirmed orders
- Real-time tracking via RealTimeOrderTracker
- Receipt download option
- Help and support links
- Cancel order option (for eligible orders)

**Features:**
- SEO-optimized with dynamic metadata
- Suspense boundaries for loading states
- Responsive layout

#### Order History Page (`/app/(customer)/orders/history/page.tsx`)

User's order history:
- Requires authentication
- Paginated order list
- Status badges
- Quick actions (view details, reorder, review)
- Empty state with CTA
- Responsive card layout

**Features:**
- Server-side data fetching
- Order filtering by status
- Load more pagination
- Review prompts for completed orders

## Order Status Flow

```
pending → confirmed → preparing → ready → delivered/completed
                                      ↓
                              out-for-delivery (delivery only)
                                      ↓
                                  delivered
```

**Cancellable:** Only `pending` and `confirmed` statuses

## Wait Time Estimation

Dynamic calculation based on:
- Base time: 5 minutes per item
- Queue time: 2 minutes per active order
- Order type modifiers:
  - Dine-in: No additional time
  - Pickup: +5 minutes buffer
  - Delivery: +30 minutes
- Minimum: 15 minutes

## Integration Points

### Payment Integration

Orders are created with `paymentStatus: 'pending'`. After successful payment:

```typescript
await OrderService.updatePaymentStatus(orderId, {
  paymentStatus: 'paid',
  paymentReference: 'ref',
  transactionReference: 'txn',
  paidAt: new Date()
});
```

This automatically updates order status to `confirmed` and emits WebSocket events.

### Cart Integration

Create orders from cart data:

```typescript
const result = await createOrderAction({
  orderType: 'dine-in',
  items: cartItems.map(item => ({
    menuItemId: item.id,
    name: item.name,
    price: item.price,
    quantity: item.quantity,
    customizations: [],
    specialInstructions: item.specialInstructions,
    subtotal: item.price * item.quantity
  })),
  subtotal: cartTotal,
  tax: calculateTax(cartTotal),
  deliveryFee: orderType === 'delivery' ? 500 : 0,
  discount: 0,
  total: finalTotal,
  // ... other details
});
```

## Testing

### Test Order Creation

```typescript
// Create test order
const order = await OrderService.createOrder({
  orderType: 'dine-in',
  items: [
    {
      menuItemId: new Types.ObjectId(),
      name: 'Test Item',
      price: 1000,
      quantity: 2,
      customizations: [],
      subtotal: 2000
    }
  ],
  subtotal: 2000,
  tax: 150,
  deliveryFee: 0,
  discount: 0,
  total: 2150,
  dineInDetails: {
    tableNumber: '5',
    qrCodeScanned: true
  }
});
```

### Test WebSocket Connection

```typescript
// Client-side
import { io } from 'socket.io-client';

const socket = io({ path: '/api/socket' });

socket.on('connect', () => {
  console.log('Connected');
  socket.emit('join-order', orderId);
});

socket.on('order-status-update', (update) => {
  console.log('Status update:', update);
});
```

### Test Status Updates

```typescript
// Update order status
await updateOrderStatusAction(
  orderId,
  'preparing',
  'Kitchen has started preparing your order'
);
```

## Environment Variables

Required for Socket.io:

```env
NEXT_PUBLIC_APP_URL=http://localhost:3000
PORT=3000
```

## Database Schema

Orders are stored in MongoDB with the following structure:

```typescript
{
  orderNumber: string,        // Unique: WG{YYMMDD}{seq}
  userId?: ObjectId,          // Optional for guest orders
  guestEmail?: string,
  guestName?: string,
  guestPhone?: string,
  orderType: 'dine-in' | 'pickup' | 'delivery',
  status: OrderStatus,
  items: OrderItem[],
  subtotal: number,
  tax: number,
  deliveryFee: number,
  discount: number,
  total: number,
  paymentStatus: 'pending' | 'paid' | 'failed' | 'cancelled' | 'refunded',
  estimatedWaitTime: number,  // in minutes
  statusHistory: [{
    status: OrderStatus,
    timestamp: Date,
    note?: string
  }],
  // Type-specific details
  deliveryDetails?: {...},
  pickupDetails?: {...},
  dineInDetails?: {...},
  // Timestamps
  createdAt: Date,
  updatedAt: Date
}
```

## API Routes

While most operations use Server Actions, you can create API routes for webhooks:

```typescript
// /app/api/orders/webhook/route.ts
export async function POST(request: Request) {
  const data = await request.json();
  
  // Update order status
  await OrderService.updateOrderStatus(
    data.orderId,
    data.status
  );
  
  // Emit WebSocket event
  emitOrderStatusUpdate(
    data.orderId,
    data.status
  );
  
  return Response.json({ success: true });
}
```

## Security Considerations

1. **Authentication:** All order actions verify user sessions
2. **Ownership:** Users can only access their own orders
3. **Validation:** All inputs are validated before processing
4. **Rate Limiting:** Consider adding rate limiting for order creation
5. **WebSocket Auth:** Socket.io connections should verify user sessions for sensitive operations

## Performance Optimizations

1. **Server Components:** Order pages use RSC for initial data fetching
2. **Suspense Boundaries:** Loading states for better UX
3. **Revalidation:** Strategic use of `revalidatePath()` for cache updates
4. **WebSocket:** Only real-time updates use client components
5. **Indexes:** MongoDB indexes on userId, status, createdAt for fast queries

## Future Enhancements

- [ ] Order modification (add/remove items before confirmation)
- [ ] Estimated delivery time tracking with GPS
- [ ] Push notifications for mobile apps
- [ ] Order scheduling (future orders)
- [ ] Batch order updates for kitchen efficiency
- [ ] Analytics dashboard with order metrics
- [ ] Customer loyalty points integration
- [ ] Multi-language support for order tracking

## Troubleshooting

### WebSocket Not Connecting

1. Check custom server is running: `npm run dev`
2. Verify Socket.io path: `/api/socket`
3. Check CORS configuration in `socket-server.ts`
4. Ensure port 3000 is not blocked

### Orders Not Updating

1. Verify MongoDB connection
2. Check server logs for errors
3. Ensure revalidatePath is called after updates
4. Verify WebSocket emissions in server actions

### Status Not Changing

1. Check order status validation in OrderService
2. Verify user has permission to update status
3. Check status history is being recorded
4. Ensure WebSocket events are being emitted

## Support

For issues or questions:
1. Check server logs for errors
2. Verify database connection
3. Test WebSocket connection separately
4. Review order status history for debugging
