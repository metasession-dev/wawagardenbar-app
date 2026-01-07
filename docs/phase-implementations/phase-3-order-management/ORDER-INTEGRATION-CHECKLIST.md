# Order System Integration Checklist

## Pre-Integration Verification

### ✅ Completed Components
- [x] OrderService with CRUD operations
- [x] Server Actions for order management
- [x] Socket.io server setup
- [x] Real-time tracking components
- [x] Order confirmation page
- [x] Order history page
- [x] WebSocket client hook

### 🔧 Ready for Integration
- [ ] Payment system connection
- [ ] Cart system connection
- [ ] User authentication flow
- [ ] Guest checkout flow
- [ ] Kitchen dashboard UI
- [ ] Admin order management

## Integration Steps

### 1. Payment System Integration

#### Update Payment Actions
File: `/app/actions/payment/payment-actions.ts`

```typescript
import { OrderService } from '@/services';
import { emitOrderStatusUpdate } from '@/lib/socket-server';

// After successful payment verification
export async function handlePaymentSuccess(
  orderId: string,
  paymentReference: string,
  transactionReference: string
) {
  // Update order payment status
  const order = await OrderService.updatePaymentStatus(orderId, {
    paymentStatus: 'paid',
    paymentReference,
    transactionReference,
    paidAt: new Date()
  });

  if (order) {
    // Emit real-time update
    emitOrderStatusUpdate(
      orderId,
      'confirmed',
      order.estimatedWaitTime,
      'Payment confirmed. Your order is being prepared.'
    );
  }

  return order;
}
```

**Checklist:**
- [ ] Import OrderService in payment actions
- [ ] Call `updatePaymentStatus` after successful payment
- [ ] Emit WebSocket event for status update
- [ ] Redirect user to order tracking page
- [ ] Handle payment failure (keep order as pending)
- [ ] Test with Monnify sandbox

#### Update Webhook Handler
File: `/app/api/webhooks/monnify/route.ts`

```typescript
import { OrderService } from '@/services';
import { emitOrderStatusUpdate, emitNewOrderToKitchen } from '@/lib/socket-server';

export async function POST(request: Request) {
  const payload = await request.json();
  
  // Verify webhook signature
  // ... existing verification code ...
  
  if (payload.eventType === 'SUCCESSFUL_TRANSACTION') {
    const orderId = payload.metaData?.orderId;
    
    if (orderId) {
      const order = await OrderService.updatePaymentStatus(orderId, {
        paymentStatus: 'paid',
        paymentReference: payload.paymentReference,
        transactionReference: payload.transactionReference,
        paidAt: new Date(payload.paidOn)
      });

      if (order) {
        // Notify customer
        emitOrderStatusUpdate(
          orderId,
          'confirmed',
          order.estimatedWaitTime,
          'Payment confirmed'
        );

        // Notify kitchen
        emitNewOrderToKitchen({
          orderId: order._id.toString(),
          orderNumber: order.orderNumber,
          orderType: order.orderType,
          itemCount: order.items.length,
          total: order.total
        });
      }
    }
  }
  
  return Response.json({ success: true });
}
```

**Checklist:**
- [ ] Add orderId to payment metadata
- [ ] Update webhook to call OrderService
- [ ] Emit WebSocket events on payment success
- [ ] Handle payment failures
- [ ] Test webhook with Monnify test events

### 2. Cart System Integration

#### Update Checkout Flow
File: `/components/features/checkout/checkout-form.tsx` (or similar)

```typescript
'use client';

import { useCartStore } from '@/stores/cart-store';
import { createOrderAction } from '@/app/actions/order/order-actions';
import { useRouter } from 'next/navigation';

export function CheckoutForm() {
  const router = useRouter();
  const cartItems = useCartStore(state => state.items);
  const clearCart = useCartStore(state => state.clearCart);
  
  const handleCheckout = async (formData: CheckoutFormData) => {
    // Create order
    const orderResult = await createOrderAction({
      orderType: formData.orderType,
      items: cartItems.map(item => ({
        menuItemId: item.id,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        customizations: [],
        specialInstructions: item.specialInstructions,
        subtotal: item.price * item.quantity
      })),
      subtotal: calculateSubtotal(),
      tax: calculateTax(),
      deliveryFee: formData.orderType === 'delivery' ? 500 : 0,
      discount: 0,
      total: calculateTotal(),
      guestEmail: formData.email,
      guestName: formData.name,
      guestPhone: formData.phone,
      deliveryDetails: formData.orderType === 'delivery' ? {
        address: formData.address,
        deliveryInstructions: formData.instructions
      } : undefined,
      pickupDetails: formData.orderType === 'pickup' ? {
        preferredPickupTime: formData.pickupTime
      } : undefined,
      dineInDetails: formData.orderType === 'dine-in' ? {
        tableNumber: formData.tableNumber,
        qrCodeScanned: formData.qrScanned
      } : undefined
    });

    if (orderResult.success) {
      // Initialize payment with orderId
      const paymentResult = await initializePayment({
        orderId: orderResult.data.orderId,
        amount: calculateTotal(),
        customerEmail: formData.email,
        customerName: formData.name
      });

      if (paymentResult.success) {
        // Clear cart
        clearCart();
        
        // Redirect to payment
        window.location.href = paymentResult.data.checkoutUrl;
      }
    }
  };

  return (
    <form onSubmit={handleCheckout}>
      {/* Form fields */}
    </form>
  );
}
```

**Checklist:**
- [ ] Import createOrderAction in checkout component
- [ ] Map cart items to order items format
- [ ] Calculate totals (subtotal, tax, delivery fee)
- [ ] Create order before initializing payment
- [ ] Pass orderId to payment initialization
- [ ] Clear cart after successful order creation
- [ ] Handle order creation errors
- [ ] Test complete checkout flow

### 3. User Authentication Integration

#### Update Order Actions for Authenticated Users
Already implemented! The actions automatically detect logged-in users via session.

**Verify:**
- [ ] Session is properly set after login
- [ ] Orders are associated with userId when logged in
- [ ] Order history shows user's orders only
- [ ] Guest orders work without authentication

#### Add Order History Link to User Menu
File: `/components/shared/navigation/user-menu.tsx` (or similar)

```typescript
import Link from 'next/link';

export function UserMenu() {
  return (
    <DropdownMenu>
      <DropdownMenuContent>
        <DropdownMenuItem asChild>
          <Link href="/orders/history">
            <Package className="mr-2 h-4 w-4" />
            Order History
          </Link>
        </DropdownMenuItem>
        {/* Other menu items */}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
```

**Checklist:**
- [ ] Add "Order History" link to user menu
- [ ] Add "Track Order" option
- [ ] Show order count badge (optional)
- [ ] Test navigation flow

### 4. Guest Order Tracking

#### Create Guest Order Tracking Page
File: `/app/(customer)/track-order/page.tsx`

```typescript
'use client';

import { useState } from 'react';
import { getOrderByNumberAction } from '@/app/actions/order/order-actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function TrackOrderPage() {
  const [orderNumber, setOrderNumber] = useState('');
  const [email, setEmail] = useState('');
  const [order, setOrder] = useState(null);

  const handleTrack = async () => {
    const result = await getOrderByNumberAction(orderNumber, email);
    if (result.success) {
      setOrder(result.data);
    }
  };

  return (
    <div>
      <h1>Track Your Order</h1>
      <Input
        placeholder="Order Number (e.g., WG2411160001)"
        value={orderNumber}
        onChange={(e) => setOrderNumber(e.target.value)}
      />
      <Input
        type="email"
        placeholder="Email Address"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <Button onClick={handleTrack}>Track Order</Button>
      
      {order && <RealTimeOrderTracker order={order} />}
    </div>
  );
}
```

**Checklist:**
- [ ] Create guest order tracking page
- [ ] Add form for order number and email
- [ ] Validate inputs
- [ ] Display order tracking on success
- [ ] Handle "order not found" errors
- [ ] Add link to track order in footer/header

### 5. Kitchen Dashboard (Future)

#### Create Kitchen Dashboard Page
File: `/app/dashboard/kitchen/page.tsx`

```typescript
'use client';

import { useEffect, useState } from 'react';
import { useOrderSocket } from '@/hooks';
import { getActiveOrdersAction, updateOrderStatusAction } from '@/app/actions/order/order-actions';

export default function KitchenDashboard() {
  const [orders, setOrders] = useState([]);
  const { socket } = useOrderSocket();

  useEffect(() => {
    // Load initial orders
    getActiveOrdersAction().then(result => {
      if (result.success) {
        setOrders(result.data);
      }
    });

    // Listen for new orders
    if (socket) {
      socket.emit('join-kitchen');
      
      socket.on('new-order', (order) => {
        setOrders(prev => [order, ...prev]);
      });

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
    }
  }, [socket]);

  const handleStatusUpdate = async (orderId: string, status: string) => {
    await updateOrderStatusAction(orderId, status);
  };

  return (
    <div>
      <h1>Kitchen Dashboard</h1>
      {orders.map(order => (
        <KitchenOrderCard
          key={order.orderId}
          order={order}
          onUpdateStatus={handleStatusUpdate}
        />
      ))}
    </div>
  );
}
```

**Checklist:**
- [ ] Create kitchen dashboard page
- [ ] Add authentication for kitchen staff
- [ ] Display active orders
- [ ] Add status update buttons
- [ ] Show order details
- [ ] Add sound notifications for new orders
- [ ] Test real-time updates

## Testing Checklist

### Unit Tests
- [ ] OrderService.createOrder()
- [ ] OrderService.updateOrderStatus()
- [ ] OrderService.calculateEstimatedWaitTime()
- [ ] Order number generation
- [ ] Status validation

### Integration Tests
- [ ] Create order → Initialize payment → Confirm payment
- [ ] WebSocket event emissions
- [ ] Order status updates
- [ ] Order cancellation flow
- [ ] Guest vs authenticated user flows

### E2E Tests
- [ ] Complete checkout flow
- [ ] Real-time order tracking
- [ ] Order history pagination
- [ ] Kitchen dashboard updates
- [ ] Multiple simultaneous orders

### Manual Testing
- [ ] Create order from cart
- [ ] Track order in real-time
- [ ] Update status from kitchen
- [ ] Cancel order
- [ ] View order history
- [ ] Guest order tracking
- [ ] Payment success/failure flows

## Deployment Checklist

### Environment Variables
- [ ] Set MONGODB_URI in production
- [ ] Set SESSION_PASSWORD (32+ characters)
- [ ] Set NEXT_PUBLIC_APP_URL
- [ ] Set PORT if needed
- [ ] Configure Monnify production keys

### Database
- [ ] Run database migrations if needed
- [ ] Create indexes for orders collection
- [ ] Test MongoDB connection
- [ ] Set up backup strategy

### Server
- [ ] Deploy custom server (server.ts)
- [ ] Verify WebSocket support
- [ ] Test Socket.io connections
- [ ] Configure CORS for production
- [ ] Set up SSL certificates

### Monitoring
- [ ] Set up error logging
- [ ] Monitor WebSocket connections
- [ ] Track order creation rate
- [ ] Monitor database performance
- [ ] Set up alerts for failures

## Post-Deployment Verification

- [ ] Create test order in production
- [ ] Verify payment integration
- [ ] Test real-time updates
- [ ] Check order history
- [ ] Test guest order tracking
- [ ] Verify WebSocket connections
- [ ] Check email notifications (if implemented)
- [ ] Test on mobile devices
- [ ] Verify performance metrics

## Known Limitations & Future Enhancements

### Current Limitations
- No order modification after creation
- No GPS tracking for delivery
- No push notifications
- No order scheduling
- Kitchen dashboard not yet implemented

### Planned Enhancements
- [ ] Order modification before confirmation
- [ ] GPS tracking for delivery orders
- [ ] Push notifications (web and mobile)
- [ ] Order scheduling for future dates
- [ ] Advanced analytics dashboard
- [ ] Customer loyalty integration
- [ ] Multi-language support
- [ ] Printer integration for kitchen

## Support & Documentation

- **Full Documentation:** [ORDER-PROCESSING-WORKFLOW.md](../ORDER-PROCESSING-WORKFLOW.md)
- **Quick Start:** [ORDER-QUICK-START.md](./ORDER-QUICK-START.md)
- **Feature Summary:** [FEATURE-ORDER-PROCESSING-COMPLETE.md](../FEATURE-ORDER-PROCESSING-COMPLETE.md)

## Contact

For questions or issues:
1. Check documentation files
2. Review server logs
3. Test WebSocket connections
4. Verify database queries
5. Check order status history

---

**Last Updated:** November 16, 2024
**Status:** Ready for Integration Testing
