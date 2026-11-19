import { NextRequest, NextResponse } from 'next/server';
import {
  emitOrderStatusUpdate,
  emitOrderCreated,
  emitOrderUpdated,
  emitOrderCancelled,
  emitBatchUpdate,
  emitStaffNotification,
} from '@/lib/socket-server';

/**
 * Internal API route for emitting socket events
 * This allows server actions to trigger socket emissions
 */
export async function POST(request: NextRequest) {
  try {
    // Verify this is an internal request
    const authHeader = request.headers.get('x-internal-auth');
    if (authHeader !== process.env.INTERNAL_API_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { event, data } = body;

    switch (event) {
      case 'order-status-update':
        emitOrderStatusUpdate(
          data.orderId,
          data.status,
          data.estimatedTime,
          data.note
        );
        break;

      case 'order-created':
        emitOrderCreated(data.order);
        break;

      case 'order-updated':
        emitOrderUpdated({
          orderId: data.orderId,
          updates: data.updates,
          action: data.action,
          status: data.status,
          updatedBy: data.updatedBy,
        });
        break;

      case 'order-cancelled':
        emitOrderCancelled({
          orderId: data.orderId,
          reason: data.reason,
        });
        break;

      case 'batch-update':
        emitBatchUpdate({
          orderIds: data.orderIds,
          action: data.action,
        });
        break;

      case 'staff-notification':
        // REQ-122 — content-free signal; clients refetch their own list.
        emitStaffNotification({ id: data.id, type: data.type });
        break;

      default:
        return NextResponse.json(
          { error: 'Unknown event type' },
          { status: 400 }
        );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error emitting socket event:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
