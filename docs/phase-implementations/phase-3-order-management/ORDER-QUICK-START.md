# Order Processing - Quick Start Guide

## For Developers

### Creating an Order

```typescript
import { createOrderAction } from '@/app/actions/order/order-actions';

// Example: Create a dine-in order
const result = await createOrderAction({
  orderType: 'dine-in',
  items: [
    {
      menuItemId: new Types.ObjectId('...'),
      name: 'Grilled Chicken',
      price: 2500,
      quantity: 2,
      customizations: [],
      specialInstructions: 'No onions',
      subtotal: 5000
    }
  ],
  subtotal: 5000,
  tax: 375,
  deliveryFee: 0,
  discount: 0,
  total: 5375,
  dineInDetails: {
    tableNumber: '12',
    qrCodeScanned: true
  }
});

if (result.success) {
  // Redirect to order tracking page
  router.push(`/orders/${result.data.orderId}`);
}
```

### Tracking an Order (Client Component)

```typescript
'use client';

import { RealTimeOrderTracker } from '@/components/features/orders';

export function OrderTrackingPage({ order }) {
  return <RealTimeOrderTracker order={order} />;
}
```

### Updating Order Status (Admin/Kitchen)

```typescript
import { updateOrderStatusAction } from '@/app/actions/order/order-actions';

// Update to preparing
await updateOrderStatusAction(
  orderId,
  'preparing',
  'Chef has started cooking'
);

// Update to ready
await updateOrderStatusAction(
  orderId,
  'ready',
  'Order is ready for pickup'
);
```

### Getting User Orders

```typescript
import { getUserOrdersAction } from '@/app/actions/order/order-actions';

const result = await getUserOrdersAction({
  limit: 10,
  skip: 0,
  status: 'completed' // optional filter
});

if (result.success) {
  const { orders, total } = result.data;
  // Display orders
}
```

### Using WebSocket Hook

```typescript
'use client';

import { useOrderSocket } from '@/hooks';

export function MyComponent({ orderId }) {
  const { isConnected, lastUpdate } = useOrderSocket({
    orderId,
    onStatusUpdate: (update) => {
      console.log('New status:', update.status);
      // Update UI
    }
  });

  return (
    <div>
      {isConnected ? '🟢 Live' : '🔴 Offline'}
    </div>
  );
}
```

## Order Status Flow

```
Customer Places Order
        ↓
    [pending] ← Payment processing
        ↓
  [confirmed] ← Payment successful
        ↓
  [preparing] ← Kitchen starts cooking
        ↓
     [ready] ← Food is ready
        ↓
  [delivered] ← Served to customer (dine-in)
  [completed] ← Customer picked up (pickup)
        ↓
 [out-for-delivery] → [delivered] (delivery only)
```

## Common Patterns

### 1. Create Order from Cart

```typescript
const cartItems = useCartStore(state => state.items);
const total = useCartStore(state => state.getTotalPrice());

const orderResult = await createOrderAction({
  orderType: selectedOrderType,
  items: cartItems.map(item => ({
    menuItemId: item.id,
    name: item.name,
    price: item.price,
    quantity: item.quantity,
    customizations: [],
    specialInstructions: item.specialInstructions,
    subtotal: item.price * item.quantity
  })),
  subtotal: total,
  tax: total * 0.075, // 7.5% VAT
  deliveryFee: selectedOrderType === 'delivery' ? 500 : 0,
  discount: 0,
  total: calculateTotal(),
  // ... type-specific details
});
```

### 2. Display Order History

```typescript
// Server Component
export default async function OrderHistoryPage() {
  const { orders } = await getUserOrdersAction({ limit: 20 });
  
  return (
    <div>
      {orders.map(order => (
        <OrderCard key={order._id} order={order} />
      ))}
    </div>
  );
}
```

### 3. Real-Time Kitchen Dashboard

```typescript
'use client';

import { useOrderSocket } from '@/hooks';
import { useEffect, useState } from 'react';

export function KitchenDashboard() {
  const [orders, setOrders] = useState([]);
  
  const { socket } = useOrderSocket();
  
  useEffect(() => {
    if (!socket) return;
    
    // Join kitchen room
    socket.emit('join-kitchen');
    
    // Listen for new orders
    socket.on('new-order', (order) => {
      setOrders(prev => [order, ...prev]);
    });
    
    // Listen for updates
    socket.on('order-update', (update) => {
      setOrders(prev => prev.map(o => 
        o.orderId === update.orderId 
          ? { ...o, status: update.status }
          : o
      ));
    });
    
    return () => {
      socket.emit('leave-kitchen');
    };
  }, [socket]);
  
  return (
    <div>
      {orders.map(order => (
        <KitchenOrderCard key={order.orderId} order={order} />
      ))}
    </div>
  );
}
```

## Environment Setup

```bash
# 1. Install dependencies (already done)
npm install

# 2. Set environment variables
cp .env.example .env.local

# Add to .env.local:
MONGODB_URI=mongodb://localhost:27017/wawa-garden-bar
SESSION_PASSWORD=your-32-character-secret-key-here
NEXT_PUBLIC_APP_URL=http://localhost:3000
PORT=3000

# 3. Start development server with Socket.io
npm run dev

# Server will start on http://localhost:3000
# WebSocket available at ws://localhost:3000/api/socket
```

## Testing

### Manual Testing

```bash
# 1. Create a test order
# Visit: http://localhost:3000/menu
# Add items to cart and checkout

# 2. Track the order
# Visit: http://localhost:3000/orders/{orderId}
# You should see real-time updates

# 3. Update status (as admin)
# Use the kitchen dashboard or call the action directly
```

### Programmatic Testing

```typescript
// Test order creation
import { OrderService } from '@/services';

const order = await OrderService.createOrder({
  orderType: 'dine-in',
  items: [/* ... */],
  subtotal: 5000,
  tax: 375,
  deliveryFee: 0,
  discount: 0,
  total: 5375,
  dineInDetails: {
    tableNumber: '5',
    qrCodeScanned: true
  }
});

console.log('Order created:', order.orderNumber);

// Test status update
const updated = await OrderService.updateOrderStatus(
  order._id.toString(),
  'preparing',
  'Started cooking'
);

console.log('Status updated:', updated.status);
```

## Troubleshooting

### WebSocket Not Connecting

```typescript
// Check if server is running with custom server
// Should see: "Server listening at http://localhost:3000"

// Test connection manually
import { io } from 'socket.io-client';

const socket = io({ path: '/api/socket' });

socket.on('connect', () => {
  console.log('✅ Connected:', socket.id);
});

socket.on('connect_error', (error) => {
  console.error('❌ Connection error:', error);
});
```

### Orders Not Updating

1. Check MongoDB connection
2. Verify server logs for errors
3. Check WebSocket emissions in server actions
4. Ensure revalidatePath is called

### Status Not Changing

1. Verify user authentication
2. Check order status validation rules
3. Review status history in database
4. Check WebSocket events in browser console

## API Reference

### Server Actions

- `createOrderAction(input)` - Create new order
- `updateOrderStatusAction(orderId, status, note?)` - Update status
- `cancelOrderAction(orderId, reason?)` - Cancel order
- `addOrderReviewAction(orderId, rating, review?)` - Add review
- `getUserOrdersAction(options?)` - Get user orders
- `getOrderAction(orderId)` - Get single order
- `getOrderByNumberAction(orderNumber, email?)` - Track by number
- `getActiveOrdersAction(orderType?)` - Get active orders

### Service Methods

- `OrderService.createOrder(data)` - Create order
- `OrderService.getOrderById(id)` - Get by ID
- `OrderService.getOrderByNumber(number)` - Get by number
- `OrderService.updateOrderStatus(id, status, note?)` - Update status
- `OrderService.cancelOrder(id, reason?)` - Cancel order
- `OrderService.addReview(id, rating, review?)` - Add review
- `OrderService.getActiveOrders(type?)` - Get active orders
- `OrderService.getOrderStats(start?, end?)` - Get statistics

### WebSocket Events

**Client → Server:**
- `join-order` - Join order room
- `leave-order` - Leave order room
- `join-kitchen` - Join kitchen room
- `leave-kitchen` - Leave kitchen room

**Server → Client:**
- `order-status-update` - Status changed
- `new-order` - New order created (kitchen)
- `order-update` - Order updated (kitchen)

## Best Practices

1. **Always validate input** before calling Server Actions
2. **Use Server Components** for initial data fetching
3. **Use Client Components** only for WebSocket and interactivity
4. **Handle errors gracefully** with user-friendly messages
5. **Revalidate paths** after mutations for cache consistency
6. **Emit WebSocket events** for all status changes
7. **Track status history** for debugging and analytics
8. **Use TypeScript** for type safety
9. **Test WebSocket** connections in production environment
10. **Monitor performance** with order statistics

## Quick Links

- [Full Documentation](../ORDER-PROCESSING-WORKFLOW.md)
- [Feature Complete Summary](../FEATURE-ORDER-PROCESSING-COMPLETE.md)
- [Order Interface](../interfaces/order.interface.ts)
- [Order Model](../models/order-model.ts)
- [Order Service](../services/order-service.ts)
- [Order Actions](../app/actions/order/order-actions.ts)
