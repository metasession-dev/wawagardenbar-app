import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { recordWebhookEvent } from '@/lib/webhook-idempotency';
import Order from '@/models/order-model';
import TabModel from '@/models/tab-model';
import { MonnifyService } from '@/services/monnify-service';
import { PaymentService } from '@/services/payment-service';
import { InventoryService, RewardsService, TabService } from '@/services';
import { MonnifyWebhookPayload } from '@/interfaces/payment';
import { deriveBusinessDate } from '@/lib/business-date';
import { SystemSettingsService } from '@/services/system-settings-service';

/**
 * Monnify Webhook Handler
 * Receives payment notifications from Monnify
 * Documentation: https://developers.monnify.com/docs/collections/webhooks
 */
export async function POST(request: NextRequest) {
  try {
    // Get raw body for signature verification
    const rawBody = await request.text();
    const signature = request.headers.get('monnify-signature') || '';

    // Verify webhook signature
    if (!MonnifyService.validateWebhookSignature(rawBody, signature)) {
      console.error('Invalid webhook signature');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    // Parse webhook payload
    const webhookData = JSON.parse(rawBody);

    // Monnify sends data in eventData wrapper
    const payload: MonnifyWebhookPayload = webhookData.eventData || webhookData;

    console.log('Monnify webhook received:', {
      eventType: webhookData.eventType,
      paymentReference: payload.paymentReference,
      status: payload.paymentStatus,
      amount: payload.amountPaid,
    });

    // Connect to database
    await connectDB();

    // Idempotency guard (REQ-049 / #117 P0 #1) — runs AFTER signature
    // verification, BEFORE any side effect (inventory deduction, reward
    // issuance, tab close). A duplicate delivery returns 200 with no
    // business-logic execution.
    const eventId = String(
      payload.transactionReference ?? payload.paymentReference ?? ''
    );
    if (eventId) {
      const dedup = await recordWebhookEvent({
        provider: 'monnify',
        eventId,
        paymentReference: String(payload.paymentReference ?? ''),
        eventType: String(webhookData.eventType ?? ''),
      });
      if (dedup === 'duplicate') {
        console.warn(
          `[REQ-049] Monnify replay ignored: event=${eventId} ref=${payload.paymentReference}`
        );
        return NextResponse.json(
          { message: 'Event already processed' },
          { status: 200 }
        );
      }
    }

    // Find order by payment reference
    const order = await Order.findOne({
      paymentReference: payload.paymentReference,
    });

    // If no order found, try to find tab
    const tab = !order
      ? await TabModel.findOne({
          paymentReference: payload.paymentReference,
        })
      : null;

    if (!order && !tab) {
      console.error(
        'Order or Tab not found for payment reference:',
        payload.paymentReference
      );
      return NextResponse.json(
        { error: 'Order or Tab not found' },
        { status: 404 }
      );
    }

    // Map Monnify status to order status
    const statusMap: Record<
      string,
      'pending' | 'paid' | 'failed' | 'cancelled' | 'refunded'
    > = {
      PAID: 'paid',
      OVERPAID: 'paid',
      FAILED: 'failed',
      CANCELLED: 'cancelled',
      PENDING: 'pending',
      PARTIALLY_PAID: 'pending',
      EXPIRED: 'failed',
    };

    // Handle order payment
    if (order) {
      // Update order with payment information
      order.paymentStatus = statusMap[payload.paymentStatus] || 'pending';
      order.transactionReference = payload.transactionReference;
      order.paidAt = payload.paidOn ? new Date(payload.paidOn) : undefined;

      // Update order status based on payment
      if (PaymentService.isPaymentSuccessful(payload.paymentStatus)) {
        order.status = 'confirmed';
        const cutoff = await SystemSettingsService.getBusinessDayCutoff();
        order.businessDate = deriveBusinessDate(new Date(), cutoff);

        // Add to status history
        order.statusHistory.push({
          status: 'confirmed',
          timestamp: new Date(),
          note: `Payment confirmed via ${MonnifyService.getPaymentMethodName(payload.paymentMethod)}`,
        });

        console.log('Order confirmed:', order._id);

        // Deduct inventory immediately after payment confirmation
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
            // Continue processing - don't fail webhook due to inventory issues
          }
        }

        // Calculate and issue reward if user is logged in
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
            // Continue processing - don't fail webhook due to reward issues
          }
        }
      } else if (payload.paymentStatus === 'FAILED') {
        order.status = 'cancelled';

        order.statusHistory.push({
          status: 'cancelled',
          timestamp: new Date(),
          note: 'Payment failed',
        });

        console.log('Order cancelled due to payment failure:', order._id);
      }

      await order.save();
    }

    // Handle tab payment
    if (tab) {
      if (PaymentService.isPaymentSuccessful(payload.paymentStatus)) {
        await TabService.markTabPaid(
          tab._id.toString(),
          payload.paymentReference,
          payload.transactionReference
        );

        console.log('Tab closed and marked as paid:', tab._id);

        // Calculate and issue reward if user is logged in
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
            // Continue processing - don't fail webhook due to reward issues
          }
        }
      } else if (payload.paymentStatus === 'FAILED') {
        tab.paymentStatus = 'failed';
        tab.status = 'open'; // Reopen tab if payment failed
        await tab.save();

        console.log('Tab payment failed, reopened tab:', tab._id);
      }
    }

    // TODO: Send confirmation email/SMS to customer
    // TODO: Notify kitchen/admin of new order

    return NextResponse.json({
      success: true,
      message: 'Webhook processed successfully',
    });
  } catch (error) {
    console.error('Error processing Monnify webhook:', error);
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
    message: 'Monnify webhook endpoint is active',
  });
}
