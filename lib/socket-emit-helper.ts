/**
 * Helper to emit socket events from server actions
 * Uses internal API route to trigger socket emissions
 * @requirement REQ-083 — top-level `status` propagated in order-updated payload
 */

const INTERNAL_API_SECRET = process.env.INTERNAL_API_SECRET || 'dev-secret-key';
const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

export async function emitSocketEvent(event: string, data: any): Promise<void> {
  try {
    const response = await fetch(`${BASE_URL}/api/internal/socket/emit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-internal-auth': INTERNAL_API_SECRET,
      },
      body: JSON.stringify({ event, data }),
    });

    if (!response.ok) {
      console.error('Failed to emit socket event:', await response.text());
    }
  } catch (error) {
    console.error('Error emitting socket event:', error);
  }
}

export async function emitBatchUpdateEvent(
  orderIds: string[],
  action: string
): Promise<void> {
  await emitSocketEvent('batch-update', { orderIds, action });
}

export async function emitOrderStatusUpdateEvent(
  orderId: string,
  status: string,
  estimatedTime?: number,
  note?: string
): Promise<void> {
  await emitSocketEvent('order-status-update', {
    orderId,
    status,
    estimatedTime,
    note,
  });
}

export async function emitOrderCreatedEvent(order: any): Promise<void> {
  await emitSocketEvent('order-created', { order });
}

export async function emitOrderUpdatedEvent(
  orderId: string,
  updates: any,
  action: string,
  updatedBy?: string
): Promise<void> {
  await emitSocketEvent('order-updated', {
    orderId,
    updates,
    status: updates?.status,
    action,
    updatedBy,
  });
}

export async function emitOrderCancelledEvent(
  orderId: string,
  reason: string
): Promise<void> {
  await emitSocketEvent('order-cancelled', { orderId, reason });
}
