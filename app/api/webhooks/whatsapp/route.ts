import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { WhatsAppService } from '@/lib/whatsapp';

/**
 * REQ-116 (AC2) — validate Meta's x-hub-signature-256 header against an HMAC
 * of the raw body. Length is checked before `timingSafeEqual`, which throws on
 * unequal-length buffers.
 */
function validateWhatsAppSignature(
  rawBody: string,
  signatureHeader: string,
  appSecret: string
): boolean {
  if (!signatureHeader?.startsWith('sha256=')) return false;
  const expected = Buffer.from(
    `sha256=${crypto
      .createHmac('sha256', appSecret)
      .update(rawBody, 'utf8')
      .digest('hex')}`
  );
  const received = Buffer.from(signatureHeader);
  if (received.length !== expected.length) return false;
  return crypto.timingSafeEqual(received, expected);
}

/**
 * GET endpoint for WhatsApp webhook verification
 * Meta will send a GET request to verify the webhook URL
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const mode = searchParams.get('hub.mode');
    const token = searchParams.get('hub.verify_token');
    const challenge = searchParams.get('hub.challenge');

    // REQ-116 (AC3) — never log the verify token.
    console.log('WhatsApp webhook verification request:', { mode });

    if (mode && token && challenge) {
      const isValid = WhatsAppService.verifyWebhook(mode, token, challenge);

      if (isValid) {
        console.log('WhatsApp webhook verified successfully');
        return new NextResponse(challenge, {
          status: 200,
          headers: {
            'Content-Type': 'text/plain',
          },
        });
      }
    }

    console.warn('WhatsApp webhook verification failed');
    return new NextResponse('Forbidden', { status: 403 });
  } catch (error) {
    console.error('WhatsApp webhook verification error:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

/**
 * POST endpoint for receiving WhatsApp webhook events
 * Meta will send POST requests for message status updates and incoming messages
 */
export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    const signatureHeader = request.headers.get('x-hub-signature-256') ?? '';

    // REQ-116 (AC1) — fail closed: without the app secret nothing can be
    // authenticated, so process nothing.
    const appSecret = process.env.WHATSAPP_APP_SECRET;
    if (!appSecret) {
      console.error(
        '[WhatsApp] WHATSAPP_APP_SECRET is not set — webhook events rejected'
      );
      return new NextResponse('Service Unavailable', { status: 503 });
    }

    if (!validateWhatsAppSignature(rawBody, signatureHeader, appSecret)) {
      console.warn('[WhatsApp] Invalid webhook signature — request rejected');
      return new NextResponse('Forbidden', { status: 403 });
    }

    const payload = JSON.parse(rawBody);

    console.log('WhatsApp webhook event received');

    // Process the webhook asynchronously
    await WhatsAppService.handleWebhook(payload);

    // Always return 200 OK to acknowledge receipt
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('WhatsApp webhook processing error:', error);

    // Still return 200 to prevent Meta from retrying
    // Log the error for investigation
    return NextResponse.json(
      {
        success: false,
        error: 'Webhook processing failed',
      },
      { status: 200 }
    );
  }
}
