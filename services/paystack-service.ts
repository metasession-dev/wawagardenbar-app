import crypto from 'crypto';
import { SystemSettingsService } from './system-settings-service';

interface PaystackInitializeRequest {
  email: string;
  amount: number; // in kobo
  reference: string;
  callback_url?: string;
  metadata?: any;
  currency?: string;
  channels?: string[];
}

interface PaystackInitializeResponse {
  status: boolean;
  message: string;
  data: {
    authorization_url: string;
    access_code: string;
    reference: string;
  };
}

interface PaystackVerifyResponse {
  status: boolean;
  message: string;
  data: {
    id: number;
    domain: string;
    status: string;
    reference: string;
    amount: number;
    message: string | null;
    gateway_response: string;
    paid_at: string;
    created_at: string;
    channel: string;
    currency: string;
    ip_address: string;
    metadata: any;
  };
}

/**
 * Service for Paystack API integration
 */
export class PaystackService {
  private static readonly BASE_URL = 'https://api.paystack.co';

  /**
   * Get configuration from SystemSettings
   */
  private static async getConfig() {
    const settings = await SystemSettingsService.getPaymentSettings();

    // We skip the enabled check here because PaymentService already routes based on activeProvider
    // and sometimes the internal enabled flag might be out of sync or confusing.
    // if (!settings.paystack.enabled) {
    //   throw new Error('Paystack payment is disabled');
    // }

    if (!settings.paystack.secretKey) {
      throw new Error('Paystack secret key is not configured');
    }

    return {
      secretKey: settings.paystack.secretKey,
      publicKey: settings.paystack.publicKey,
    };
  }

  /**
   * Initialize a payment transaction
   */
  static async initializeTransaction(
    params: PaystackInitializeRequest
  ): Promise<PaystackInitializeResponse> {
    const config = await this.getConfig();

    const response = await fetch(`${this.BASE_URL}/transaction/initialize`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.secretKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    });

    const data = await response.json();

    if (!response.ok || !data.status) {
      throw new Error(
        data.message || 'Failed to initialize Paystack transaction'
      );
    }

    return data;
  }

  /**
   * Verify a transaction
   */
  static async verifyTransaction(
    reference: string
  ): Promise<PaystackVerifyResponse> {
    const config = await this.getConfig();

    const response = await fetch(
      `${this.BASE_URL}/transaction/verify/${encodeURIComponent(reference)}`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${config.secretKey}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const data = await response.json();

    if (!response.ok || !data.status) {
      throw new Error(data.message || 'Failed to verify Paystack transaction');
    }

    return data;
  }

  /**
   * Generate unique transaction reference
   */
  static generateReference(orderId: string): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `WG-PAY-${orderId}-${timestamp}-${random}`;
  }

  /**
   * REQ-123 (AC3) — validate the webhook signature over the RAW request body.
   * Paystack signs the exact bytes it sends; re-serialising a parsed body can
   * change them. Compared in constant time; a missing or malformed signature
   * is simply false.
   */
  static async validateWebhookSignature(
    rawBody: string,
    signature: string
  ): Promise<boolean> {
    if (!signature) return false;
    const config = await this.getConfig();

    const expected = crypto
      .createHmac('sha512', config.secretKey)
      .update(rawBody)
      .digest('hex');

    const a = Buffer.from(expected, 'utf8');
    const b = Buffer.from(signature, 'utf8');
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  }

  /**
   * REQ-123 (AC2) — Paystack requires an email. A customer account may have
   * none (WhatsApp-only sign-in), so derive a deterministic placeholder from
   * the phone number. The domain receives no mail.
   */
  static placeholderEmail(phone: string): string {
    const digits = (phone || '').replace(/\D/g, '') || 'unknown';
    return `${digits}@customers.wawagardenbar.com`;
  }
}
