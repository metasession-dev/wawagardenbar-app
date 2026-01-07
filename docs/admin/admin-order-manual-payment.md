# Admin Order Manual Payment Feature

## Overview

Admins need a separate payment/checkout flow from the customer-facing checkout process. This feature allows admins to process order payments directly from the dashboard using manual payment entry (cash, bank transfer, POS card) without going through the Monnify/Paystack gateway.

## Current State

- **Customer/Guest Checkout Flow**: `/checkout` route with Monnify/Paystack integration (Card, Transfer, USSD, Phone Number)
- **Admin Tab Payment**: Dashboard has manual payment entry for tabs (as shown in Image 2)
- **Admin Order Payment**: Currently redirects to customer checkout flow (needs separate admin flow)

## Requirements

### Functional Requirements

#### 1. Admin Order Payment Dialog
- **Location**: Dashboard Order Details page (`/dashboard/orders/[orderId]`)
- **Trigger**: "Process Payment" or "Customer Wants to Pay" button
- **Access Control**: Admin and Super-Admin roles only
- **Order Status**: Only for unpaid orders (paymentStatus: 'pending' or 'failed')

#### 2. Payment Method Options

##### Option 1: Manual Payment Entry (Default)
- **Payment Types**:
  - Cash
  - Bank Transfer
  - Card (POS)
- **Required Fields**:
  - Payment Type (radio selection)
  - Receipt/Reference Number (text input, required)
  - Comments (textarea, optional)
- **Behavior**:
  - Updates order status to 'paid' immediately
  - Records payment reference
  - Creates audit log entry
  - Triggers inventory deduction
  - Triggers reward calculation
  - Emits Socket.IO event for real-time updates

##### Option 2: Full Checkout Process
- **Redirect**: To customer checkout flow (`/orders/[orderId]/checkout`)
- **Use Case**: When admin wants to process payment via Monnify/Paystack gateway
- **Behavior**: Same as customer checkout but initiated by admin

#### 3. Order Payment Validation
- **Prevent Payment If**:
  - Order is already paid
  - Order is cancelled
  - Order is from a tab that is currently settling
- **Error Messages**:
  - "This order has already been paid"
  - "Cannot process payment for cancelled orders"
  - "Cannot process payment for orders in settling tabs. Please process payment through the tab."

#### 4. Post-Payment Actions
- Update order `paymentStatus` to 'paid'
- Set `paymentMethod` to selected type (cash/transfer/card)
- Set `paymentReference` to entered reference number
- Set `paidAt` timestamp
- Deduct inventory for order items
- Calculate and issue rewards (if applicable)
- Create audit log: `order.manual_payment`
- Emit Socket.IO event: `order:updated`
- Show success toast notification
- Refresh order details page

### Non-Functional Requirements

#### 1. Security
- Role-based access control (admin/super-admin only)
- Validate payment reference format
- Prevent duplicate payment processing
- Audit all manual payment actions

#### 2. User Experience
- Modal dialog (not full page)
- Clear visual distinction between manual and gateway payment
- Confirmation before processing payment
- Loading states during processing
- Error handling with clear messages
- Auto-close dialog on success

#### 3. Data Integrity
- Atomic payment processing
- Rollback on failure
- Prevent race conditions
- Maintain payment history

## Implementation Plan

### Phase 1: Backend Implementation

#### 1.1 Service Layer Updates

**File**: `/services/order-service.ts`

```typescript
/**
 * Complete order payment manually (cash, transfer, card)
 * Used by admins for in-person payments
 */
async completeOrderPaymentManually(
  orderId: string,
  paymentData: {
    paymentType: 'cash' | 'transfer' | 'card';
    paymentReference: string;
    comments?: string;
    processedByAdminId: string;
  }
): Promise<IOrder> {
  // 1. Validate order exists and is unpaid
  // 2. Check order is not from settling tab
  // 3. Update order payment status
  // 4. Trigger inventory deduction
  // 5. Calculate and issue rewards
  // 6. Create audit log
  // 7. Emit Socket.IO event
  // 8. Return updated order
}
```

#### 1.2 Server Actions

**File**: `/app/actions/admin/order-payment-actions.ts`

```typescript
'use server';

import { requireAdmin } from '@/lib/auth-helpers';
import { OrderService } from '@/services/order-service';
import { revalidatePath } from 'next/cache';

export async function completeOrderPaymentManuallyAction(
  orderId: string,
  paymentData: {
    paymentType: 'cash' | 'transfer' | 'card';
    paymentReference: string;
    comments?: string;
  }
) {
  const session = await requireAdmin();

  const result = await OrderService.completeOrderPaymentManually(orderId, {
    ...paymentData,
    processedByAdminId: session.userId,
  });

  revalidatePath(`/dashboard/orders/${orderId}`);
  revalidatePath('/dashboard/orders');

  return { success: true, order: result };
}
```

#### 1.3 Audit Log Updates

**File**: `/interfaces/audit-log.interface.ts`

Add new audit action type:
```typescript
| 'order.manual_payment'
```

### Phase 2: UI Components

#### 2.1 Admin Pay Order Dialog

**File**: `/components/features/admin/orders/admin-pay-order-dialog.tsx`

```typescript
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { CreditCard, Banknote, Building2, ExternalLink } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { completeOrderPaymentManuallyAction } from '@/app/actions/admin/order-payment-actions';

interface AdminPayOrderDialogProps {
  orderId: string;
  orderNumber: string;
  totalAmount: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function AdminPayOrderDialog({
  orderId,
  orderNumber,
  totalAmount,
  open,
  onOpenChange,
  onSuccess,
}: AdminPayOrderDialogProps) {
  // Component implementation
  // - Payment method selection (Manual Entry vs Full Checkout)
  // - Manual entry form (payment type, reference, comments)
  // - Form validation
  // - Submit handler
  // - Loading states
  // - Error handling
}
```

#### 2.2 Order Actions Sidebar Update

**File**: `/components/features/admin/orders/order-actions-sidebar.tsx`

Add "Process Payment" button:
```typescript
{order.paymentStatus !== 'paid' && (
  <Button
    onClick={() => setShowPaymentDialog(true)}
    className="w-full"
    variant="default"
  >
    <CreditCard className="mr-2 h-4 w-4" />
    Process Payment
  </Button>
)}
```

### Phase 3: Integration

#### 3.1 Order Details Page Update

**File**: `/app/dashboard/orders/[orderId]/page.tsx`

```typescript
// Add payment dialog state and handler
const [showPaymentDialog, setShowPaymentDialog] = useState(false);

// Pass to OrderActionsSidebar
<OrderActionsSidebar
  order={order}
  onPaymentClick={() => setShowPaymentDialog(true)}
/>

// Add dialog component
<AdminPayOrderDialog
  orderId={order._id}
  orderNumber={order.orderNumber}
  totalAmount={order.total}
  open={showPaymentDialog}
  onOpenChange={setShowPaymentDialog}
  onSuccess={handlePaymentSuccess}
/>
```

#### 3.2 Tab Integration Check

**File**: `/services/order-service.ts`

Add validation to prevent payment of orders in settling tabs:
```typescript
// Check if order belongs to a settling tab
if (order.tabId) {
  const tab = await TabService.getTabById(order.tabId);
  if (tab.status === 'settling') {
    throw new Error('Cannot process payment for orders in settling tabs. Please process payment through the tab.');
  }
}
```

### Phase 4: Testing

#### 4.1 Unit Tests
- Service method validation
- Payment type validation
- Reference number validation
- Tab status check
- Inventory deduction trigger
- Reward calculation trigger
- Audit log creation

#### 4.2 Integration Tests
- Complete payment flow
- Error handling
- Rollback on failure
- Socket.IO event emission
- Revalidation paths

#### 4.3 E2E Tests (Playwright)
- Admin login
- Navigate to order details
- Click "Process Payment"
- Select manual payment entry
- Fill payment details
- Submit payment
- Verify order status updated
- Verify audit log created
- Verify inventory deducted

## UI/UX Design

### Payment Dialog Layout

```
┌─────────────────────────────────────────────┐
│ Process Order Payment                    [X]│
│ Complete payment for Order #ORD-001         │
├─────────────────────────────────────────────┤
│                                             │
│ Payment Method                              │
│                                             │
│ ○ Manual Payment Entry                  [i] │
│   Enter payment details for cash, bank      │
│   transfer, or POS card payments.           │
│                                             │
│ ○ Full Checkout Process                [↗] │
│   Complete checkout with payment gateway    │
│   (Card, Transfer, USSD).                   │
│                                             │
│ ─────────────────────────────────────────── │
│                                             │
│ [If Manual Payment Entry selected]          │
│                                             │
│ Payment Type *                              │
│ ○ Cash  ○ Bank Transfer  ○ Card (POS)      │
│                                             │
│ Receipt Number *                            │
│ [Enter receipt number...]                   │
│                                             │
│ Comments (Optional)                         │
│ [Add any additional notes...]               │
│                                             │
├─────────────────────────────────────────────┤
│                          [Cancel] [Complete]│
└─────────────────────────────────────────────┘
```

### Button States

**Process Payment Button**:
- Visible: Order is unpaid
- Hidden: Order is paid or cancelled
- Disabled: Order is from settling tab (with tooltip)

**Complete Payment Button**:
- Enabled: All required fields filled
- Loading: "Processing..."
- Success: Dialog closes, toast shown

## Database Schema Changes

No schema changes required. Existing Order model supports:
- `paymentStatus`: 'pending' | 'paid' | 'failed'
- `paymentMethod`: 'card' | 'transfer' | 'ussd' | 'phone' | 'cash'
- `paymentReference`: string
- `paidAt`: Date

## API Endpoints

No new API endpoints required. Uses server actions:
- `completeOrderPaymentManuallyAction`

## Security Considerations

1. **Role-Based Access**:
   - Only admin and super-admin can access
   - Validate role on server action

2. **Payment Reference Validation**:
   - Minimum length: 3 characters
   - Maximum length: 100 characters
   - Alphanumeric and special characters allowed

3. **Idempotency**:
   - Check order payment status before processing
   - Prevent double payment

4. **Audit Trail**:
   - Log all manual payment actions
   - Include admin ID, timestamp, payment details

## Error Handling

### Validation Errors
- "Payment reference is required"
- "Payment reference must be at least 3 characters"
- "Please select a payment type"

### Business Logic Errors
- "This order has already been paid"
- "Cannot process payment for cancelled orders"
- "Cannot process payment for orders in settling tabs"

### System Errors
- "Failed to process payment. Please try again."
- "Network error. Please check your connection."

## Success Messages

- Toast: "Payment processed successfully"
- Description: "Order #ORD-001 has been marked as paid"

## Rollout Plan

### Phase 1: Development (Week 1)
- Backend implementation
- Service layer updates
- Server actions

### Phase 2: UI Development (Week 1-2)
- Dialog component
- Form validation
- Integration with order details

### Phase 3: Testing (Week 2)
- Unit tests
- Integration tests
- E2E tests

### Phase 4: Deployment (Week 3)
- Staging deployment
- Admin testing
- Production deployment

## Future Enhancements

1. **Payment Receipt Generation**:
   - Generate PDF receipt for manual payments
   - Email receipt to customer

2. **Payment History**:
   - View all manual payments
   - Filter by payment type
   - Export to CSV/Excel

3. **Refund Support**:
   - Process refunds for manual payments
   - Partial refund support

4. **Payment Verification**:
   - Upload payment proof (image/PDF)
   - Link to bank transaction

5. **Multi-Currency Support**:
   - Support USD, EUR, etc.
   - Exchange rate tracking

## Related Features

- **Tab Manual Payment**: `/components/features/admin/tabs/admin-pay-tab-dialog.tsx`
- **Customer Checkout**: `/app/checkout/page.tsx`
- **Order Management**: `/app/dashboard/orders/[orderId]/page.tsx`
- **Audit Logs**: `/app/dashboard/settings/audit-logs/page.tsx`

## References

- Tab Payment Implementation: See `admin-pay-tab-dialog.tsx`
- Order Service: `/services/order-service.ts`
- Payment Service: `/services/payment-service.ts`
- Audit Log Service: `/services/audit-log-service.ts`
