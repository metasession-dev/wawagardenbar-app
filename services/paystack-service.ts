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

  /** REQ-128 — the simulated refund id used with an `sk_test_e2e_` secret. */
  static e2eRefundId(reference: string): string {
    let h = 0;
    for (let i = 0; i < reference.length; i++) {
      h = (h * 31 + reference.charCodeAt(i)) >>> 0;
    }
    return String(9_000_000_000 + h);
  }

  /**
   * REQ-128 (AC1) — ask Paystack to refund a transaction.
   *
   * `amountKobo` omitted = full refund of the transaction. Paystack answers
   * with a `pending` refund; the final outcome arrives as a `refund.processed`
   * or `refund.failed` webhook. Never log the secret key.
   */
  static async createRefund(params: {
    reference: string;
    amountKobo?: number;
    reason: string;
  }): Promise<{ refundId: string; status: string }> {
    const config = await this.getConfig();

    // REQ-128 — e2e seam. The e2e stack installs a Paystack secret that starts
    // with `sk_test_e2e_` (never a real key) and no refund call leaves the
    // process: the response Paystack would give is simulated. The refund id is
    // derived from the reference so a spec can send the matching webhook.
    if (config.secretKey.startsWith('sk_test_e2e_')) {
      return {
        refundId: PaystackService.e2eRefundId(params.reference),
        status: 'pending',
      };
    }

    const body: Record<string, unknown> = {
      transaction: params.reference,
      currency: 'NGN',
      customer_note: params.reason.slice(0, 200),
      merchant_note: params.reason.slice(0, 200),
    };
    if (params.amountKobo !== undefined) {
      body.amount = params.amountKobo;
    }

    const response = await fetch(`${this.BASE_URL}/refund`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.secretKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok || !data?.status) {
      throw new Error(data?.message || 'Failed to create Paystack refund');
    }

    const refund = (data.data ?? {}) as {
      id?: number | string;
      status?: string;
    };
    return {
      refundId: refund.id !== undefined ? String(refund.id) : '',
      status: String(refund.status ?? 'pending'),
    };
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
