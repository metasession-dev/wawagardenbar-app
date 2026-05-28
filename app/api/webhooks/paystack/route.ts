import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { recordWebhookEvent } from '@/lib/webhook-idempotency';
import Order from '@/models/order-model';
import TabModel from '@/models/tab-model';
import { PaystackService } from '@/services/paystack-service';
import { InventoryService, RewardsService, TabService } from '@/services';
import { deriveBusinessDate } from '@/lib/business-date';
import { SystemSettingsService } from '@/services/system-settings-service';

/**
 * Paystack Webhook Handler
 * Receives payment notifications from Paystack
 * Documentation: https://paystack.com/docs/payments/webhooks/
 */
export async function POST(request: NextRequest) {
  try {
    // Get raw body for signature verification
    const rawBody = await request.text();
    const signature = request.headers.get('x-paystack-signature') || '';

    // Verify webhook signature
    if (
      !(await PaystackService.validateWebhookSignature(
        JSON.parse(rawBody),
        signature
      ))
    ) {
      console.error('Invalid Paystack webhook signature');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    // Parse webhook payload
    const webhookData = JSON.parse(rawBody);
    const { event, data } = webhookData;

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

    // Idempotency guard (REQ-049 / #117 P0 #1) — runs AFTER signature
    // verification and the non-`charge.success` filter, BEFORE any side
    // effect (inventory deduction, reward issuance, tab close). A duplicate
    // delivery returns 200 with no business-logic execution.
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

    // Find order by payment reference
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

    // Handle order payment
    if (order) {
      if (data.status === 'success') {
        // Update order with payment information
        order.paymentStatus = 'paid';
        order.transactionReference = data.id.toString();
        order.paidAt = data.paid_at ? new Date(data.paid_at) : new Date();
        const cutoff = await SystemSettingsService.getBusinessDayCutoff();
        order.businessDate = deriveBusinessDate(new Date(), cutoff);

        // Update order status
        order.status = 'confirmed';

        // Add to status history
        order.statusHistory.push({
          status: 'confirmed',
          timestamp: new Date(),
          note: `Payment confirmed via Paystack (${data.channel})`,
        });

        console.log('Order confirmed via Paystack:', order._id);

        // Deduct inventory
        if (!order.inventoryDeducted) {
          try {
            await InventoryService.deductStockForOrder(order._id.toString());
            order.inventoryDeducted = true;
            order.inventoryDeductedAt = new Date();
            console.log('Inventory deducted for order:', order._id);
          } catch (error) {
            console.error(
              'Error deducting inventory for order:',
              order._id,
              error
            );
          }
        }

        // Issue reward
        if (order.userId) {
          try {
            const reward = await RewardsService.calculateReward(
              order.userId.toString(),
              order._id.toString(),
              order.total
            );

            if (reward) {
              console.log(
                'Reward issued for order:',
                order._id,
                'Reward code:',
                reward.code
              );
            }
          } catch (error) {
            console.error(
              'Error calculating reward for order:',
              order._id,
              error
            );
          }
        }
      } else {
        // Payment failed or other status
        order.paymentStatus = 'failed';
        order.statusHistory.push({
          status: 'cancelled', // Or keep pending/failed?
          timestamp: new Date(),
          note: `Paystack payment status: ${data.status}`,
        });
      }

      await order.save();
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
