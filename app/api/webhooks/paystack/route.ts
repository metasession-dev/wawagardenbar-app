import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { recordWebhookEvent } from '@/lib/webhook-idempotency';
import Order from '@/models/order-model';
import TabModel from '@/models/tab-model';
import { PaystackService } from '@/services/paystack-service';
import { RewardsService, TabService } from '@/services';
import { OrderService } from '@/services/order-service';

/**
 * Paystack Webhook Handler
 * Receives payment notifications from Paystack
 * Documentation: https://paystack.com/docs/payments/webhooks/
 */
export async function POST(request: NextRequest) {
  try {
    // REQ-123 (AC3) — the signature covers the RAW body: read it once as text
    // and verify before anything is parsed.
    const rawBody = await request.text();
    const signature = request.headers.get('x-paystack-signature') || '';

    if (!(await PaystackService.validateWebhookSignature(rawBody, signature))) {
      console.error('Invalid Paystack webhook signature');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    let webhookData: { event?: string; data?: Record<string, any> };
    try {
      webhookData = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }
    const event = webhookData.event;
    const data = (webhookData.data ?? {}) as Record<string, any>;

    console.log('Paystack webhook received:', {
      event,
      reference: data.reference,
      status: data.status,
      amount: data.amount,
    });

    // We only care about successful charge events
    if (event !== 'charge.success') {
      return NextResponse.json({ message: 'Event ignored' }, { status: 200 });
    }

    // Connect to database
    await connectDB();

    // REQ-123 (AC3) — find the order (or tab) BEFORE writing the dedup row. An
    // unknown reference returns 404 and leaves no row, so Paystack's retry is
    // processed once the order exists.
    const order = await Order.findOne({
      paymentReference: data.reference,
    });

    // If no order found, try to find tab
    const tab = !order
      ? await TabModel.findOne({
          paymentReference: data.reference,
        })
      : null;

    if (!order && !tab) {
      console.error(
        'Order or Tab not found for payment reference:',
        data.reference
      );
      return NextResponse.json(
        { error: 'Order or Tab not found' },
        { status: 404 }
      );
    }

    // Idempotency guard (REQ-049 / #117 P0 #1) — runs AFTER signature
    // verification, the non-`charge.success` filter and the lookup, BEFORE any
    // side effect. A duplicate delivery returns 200 with no business logic.
    const eventId = String(
      (data as { id?: unknown }).id ?? data.reference ?? ''
    );
    if (eventId) {
      const dedup = await recordWebhookEvent({
        provider: 'paystack',
        eventId,
        paymentReference: String(data.reference ?? ''),
        eventType: String(event ?? ''),
      });
      if (dedup === 'duplicate') {
        console.warn(
          `[REQ-049] Paystack replay ignored: event=${eventId} ref=${data.reference}`
        );
        return NextResponse.json(
          { message: 'Event already processed' },
          { status: 200 }
        );
      }
    }

    // Handle order payment
    if (order) {
      if (data.status === 'success') {
        // REQ-123 (AC3) — the paid amount (kobo) must equal the order total.
        const expectedKobo = Math.round(order.total * 100);
        if (Number(data.amount) !== expectedKobo) {
          order.paymentStatus = 'payment_mismatch';
          order.statusHistory.push({
            status: order.status,
            timestamp: new Date(),
            note: `Payment amount mismatch: paid ${data.amount} kobo, expected ${expectedKobo} kobo`,
          });
          await order.save();
          try {
            const { IncidentEventService } = await import(
              '@/services/incident-event-service'
            );
            await IncidentEventService.recordIncident({
              kind: 'payment_mismatch',
              entityId: String(order._id),
              summary: `Paystack amount mismatch for order ${order.orderNumber}`,
              errorDetails: {
                paidKobo: Number(data.amount),
                expectedKobo,
                reference: String(data.reference ?? ''),
                transactionId: String(data.id ?? ''),
              },
            });
          } catch {
            // IncidentEvent write failure must not abort the webhook
          }
          return NextResponse.json({
            success: true,
            message: 'Amount mismatch recorded; order not confirmed',
          });
        }

        // REQ-123 (AC4) — one idempotent paid path (ADR-012): rewards, staff
        // alert, kitchen event and the customer's messages happen there.
        // REQ-066 — inventory deduction stays owned by
        // `OrderService.completeOrder` (kitchen-display completion).
        const paymentMethod =
          data.channel === 'card'
            ? 'card'
            : data.channel === 'bank_transfer' || data.channel === 'bank'
              ? 'transfer'
              : data.channel === 'ussd'
                ? 'ussd'
                : undefined;
        await OrderService.markOrderPaid(
          String(order._id),
          'paystack_webhook',
          {
            transactionReference: String(data.id ?? ''),
            paidAt: data.paid_at ? new Date(data.paid_at) : new Date(),
            paymentMethod,
            channel: data.channel,
          }
        );
        console.log('Order confirmed via Paystack:', order._id);
      } else if (order.paymentStatus !== 'paid') {
        // Payment failed or other status
        order.paymentStatus = 'failed';
        order.statusHistory.push({
          status: 'cancelled', // Or keep pending/failed?
          timestamp: new Date(),
          note: `Paystack payment status: ${data.status}`,
        });
        await order.save();
      }
    }

    // Handle tab payment
    if (tab) {
      if (data.status === 'success') {
        await TabService.markTabPaid(
          tab._id.toString(),
          data.reference,
          data.id.toString()
        );

        console.log('Tab closed and marked as paid via Paystack:', tab._id);

        // Issue reward
        if (tab.userId) {
          try {
            const reward = await RewardsService.calculateReward(
              tab.userId.toString(),
              tab._id.toString(),
              tab.total
            );

            if (reward) {
              console.log(
                'Reward issued for tab:',
                tab._id,
                'Reward code:',
                reward.code
              );
            }
          } catch (error) {
            console.error('Error calculating reward for tab:', tab._id, error);
            try {
              const { IncidentEventService } = await import(
                '@/services/incident-event-service'
              );
              await IncidentEventService.recordIncident({
                kind: 'reward_grant_failed',
                entityId: String(tab._id),
                summary: `Reward calculation failed for tab ${tab._id}`,
                errorDetails: {
                  message:
                    error instanceof Error ? error.message : String(error),
                  userId: String(tab.userId ?? ''),
                },
              });
            } catch {
              // IncidentEvent write failure must not abort the webhook
            }
          }
        }
      } else {
        tab.paymentStatus = 'failed';
        tab.status = 'open';
        await tab.save();

        console.log('Tab payment failed via Paystack, reopened tab:', tab._id);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Webhook processed successfully',
    });
  } catch (error) {
    console.error('Error processing Paystack webhook:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Health check endpoint
 */
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    message: 'Paystack webhook endpoint is active',
  });
}
