export interface WhatsAppResult {
  success: boolean;
  message?: string;
  errorCode?: string;
  messageId?: string;
  details?: any;
}

interface WhatsAppMessageResponse {
  messaging_product: string;
  contacts: Array<{
    input: string;
    wa_id: string;
  }>;
  messages: Array<{
    id: string;
  }>;
}

interface WhatsAppErrorResponse {
  error: {
    message: string;
    type: string;
    code: number;
    error_data?: {
      details: string;
    };
    error_subcode?: number;
    fbtrace_id: string;
  };
}

/**
 * WhatsApp Cloud API Service
 * Handles sending verification PINs and other messages via WhatsApp Business API
 */
export class WhatsAppService {
  private static get phoneNumberId(): string {
    return process.env.WHATSAPP_PHONE_NUMBER_ID || '';
  }

  private static get accessToken(): string {
    return process.env.WHATSAPP_ACCESS_TOKEN || '';
  }

  private static get apiVersion(): string {
    return process.env.WHATSAPP_API_VERSION || 'v18.0';
  }

  private static get apiUrl(): string {
    const baseUrl =
      process.env.WHATSAPP_API_URL || 'https://graph.facebook.com';
    return `${baseUrl}/${this.apiVersion}/${this.phoneNumberId}/messages`;
  }

  private static get webhookVerifyToken(): string {
    return process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN || '';
  }

  private static get isEnabled(): boolean {
    return process.env.ENABLE_WHATSAPP_NOTIFICATIONS === 'true';
  }

  /**
   * Send a message using WhatsApp template
   */
  static async sendMessage(
    to: string,
    templateName: string,
    parameters: string[]
  ): Promise<WhatsAppResult> {
    if (!this.isEnabled) {
      console.warn('WhatsApp service is disabled');
      return {
        success: false,
        message: 'WhatsApp service is currently disabled',
        errorCode: 'SERVICE_DISABLED',
      };
    }

    if (!this.accessToken || !this.phoneNumberId) {
      console.error('WhatsApp API credentials are missing');
      return {
        success: false,
        message: 'WhatsApp service is not configured properly',
        errorCode: 'MISSING_CREDENTIALS',
      };
    }

    try {
      // Format phone number (ensure it starts with country code, no +)
      const formattedPhone = to.replace(/\D/g, '');

      const payload = {
        messaging_product: 'whatsapp',
        to: formattedPhone,
        type: 'template',
        template: {
          name: templateName,
          language: {
            code: 'en',
          },
          components: [
            {
              type: 'body',
              parameters: parameters.map((param) => ({
                type: 'text',
                text: param,
              })),
            },
          ],
        },
      };

      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.accessToken}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        const errorData = data as WhatsAppErrorResponse;
        console.error('WhatsApp API Error:', errorData);

        // Handle specific error codes
        if (errorData.error.code === 131026) {
          return {
            success: false,
            message: 'This phone number is not registered on WhatsApp',
            errorCode: 'NOT_ON_WHATSAPP',
            details: errorData,
          };
        }

        if (errorData.error.code === 131047) {
          return {
            success: false,
            message: 'Message template not found or not approved',
            errorCode: 'TEMPLATE_NOT_FOUND',
            details: errorData,
          };
        }

        if (errorData.error.code === 131048) {
          return {
            success: false,
            message: 'Template parameter count mismatch',
            errorCode: 'TEMPLATE_PARAM_ERROR',
            details: errorData,
          };
        }

        if (errorData.error.code === 4) {
          return {
            success: false,
            message: 'WhatsApp API rate limit exceeded',
            errorCode: 'QUOTA_EXCEEDED',
            details: errorData,
          };
        }

        if (errorData.error.code === 100) {
          return {
            success: false,
            message: 'Invalid phone number format',
            errorCode: 'INVALID_PHONE',
            details: errorData,
          };
        }

        // Generic error
        return {
          success: false,
          message: errorData.error.message || 'Failed to send WhatsApp message',
          errorCode: 'API_ERROR',
          details: errorData,
        };
      }

      const successData = data as WhatsAppMessageResponse;

      return {
        success: true,
        message: 'WhatsApp message sent successfully',
        messageId: successData.messages[0]?.id,
      };
    } catch (error) {
      console.error('WhatsApp Service Error:', error);
      return {
        success: false,
        message: 'An unexpected error occurred while sending WhatsApp message',
        errorCode: 'UNKNOWN_ERROR',
        details: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Send a free-form text message via WhatsApp.
   *
   * @requirement REQ-056 — Used by the inbound router for STOP opt-out
   * confirmations. Meta allows free-form replies inside the 24-hour
   * customer-service window that opens when a customer messages us, so
   * a STOP confirmation does not need a template approval. Same error
   * mapping shape as `sendMessage` so callers don't need to branch.
   */
  static async sendTextMessage(
    to: string,
    body: string
  ): Promise<WhatsAppResult> {
    if (!this.isEnabled) {
      console.warn('WhatsApp service is disabled');
      return {
        success: false,
        message: 'WhatsApp service is currently disabled',
        errorCode: 'SERVICE_DISABLED',
      };
    }

    if (!this.accessToken || !this.phoneNumberId) {
      console.error('WhatsApp API credentials are missing');
      return {
        success: false,
        message: 'WhatsApp service is not configured properly',
        errorCode: 'MISSING_CREDENTIALS',
      };
    }

    try {
      const formattedPhone = to.replace(/\D/g, '');
      const payload = {
        messaging_product: 'whatsapp',
        to: formattedPhone,
        type: 'text',
        text: { body },
      };

      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.accessToken}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        const errorData = data as WhatsAppErrorResponse;
        console.error('WhatsApp text-message API Error:', errorData);
        return {
          success: false,
          message: errorData.error?.message || 'Failed to send WhatsApp text',
          errorCode: 'API_ERROR',
          details: errorData,
        };
      }

      const successData = data as WhatsAppMessageResponse;
      return {
        success: true,
        message: 'WhatsApp text sent successfully',
        messageId: successData.messages[0]?.id,
      };
    } catch (error) {
      console.error('WhatsApp text-message Service Error:', error);
      return {
        success: false,
        message: 'An unexpected error occurred while sending WhatsApp text',
        errorCode: 'UNKNOWN_ERROR',
        details: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Send Verification PIN via WhatsApp
   */
  static async sendVerificationPinWhatsApp(
    phone: string,
    pin: string
  ): Promise<WhatsAppResult> {
    const templateName =
      process.env.WHATSAPP_PIN_TEMPLATE_NAME || 'verification_pin';
    return this.sendMessage(phone, templateName, [pin]);
  }

  /**
   * Verify webhook request from WhatsApp
   * @param mode - Webhook mode (should be 'subscribe')
   * @param token - Verification token
   * @param _challenge - Challenge string (returned by caller, not used here)
   */
  static verifyWebhook(
    mode: string,
    token: string,
    _challenge: string
  ): boolean {
    if (mode === 'subscribe' && token === this.webhookVerifyToken) {
      console.log('WhatsApp webhook verified successfully');
      return true;
    }
    console.warn('WhatsApp webhook verification failed');
    return false;
  }

  /**
   * Handle incoming webhook events from WhatsApp
   */
  static async handleWebhook(payload: any): Promise<void> {
    try {
      console.log(
        'WhatsApp webhook received:',
        JSON.stringify(payload, null, 2)
      );

      // Check if this is a status update
      if (payload.entry?.[0]?.changes?.[0]?.value?.statuses) {
        const statuses = payload.entry[0].changes[0].value.statuses;

        for (const status of statuses) {
          const messageId = status.id;
          const statusType = status.status; // sent, delivered, read, failed
          const timestamp = status.timestamp;
          const recipientId = status.recipient_id;

          console.log('Message status update:', {
            messageId,
            statusType,
            timestamp,
            recipientId,
          });

          // Handle failed messages
          if (statusType === 'failed') {
            const errorCode = status.errors?.[0]?.code;
            const errorTitle = status.errors?.[0]?.title;
            console.error('WhatsApp message failed:', {
              messageId,
              errorCode,
              errorTitle,
            });

            // TODO: Implement retry logic or notification to admin
          }

          // Handle delivered messages
          if (statusType === 'delivered') {
            console.log('WhatsApp message delivered successfully:', messageId);
          }

          // Handle read messages
          if (statusType === 'read') {
            console.log('WhatsApp message read by user:', messageId);
          }

          // REQ-055 — reconcile NotificationLog row by messageId.
          // Lazy import avoids a circular: lib/whatsapp ↔ services depend
          // on each other through NotificationService. The lazy load also
          // means the WA module remains importable in test contexts
          // without the model boundary mocked.
          try {
            const { NotificationLogService } = await import(
              '@/services/notification-log-service'
            );
            const failureReason =
              statusType === 'failed'
                ? (status.errors?.[0]?.title ?? null)
                : null;
            await NotificationLogService.updateStatus(
              messageId,
              statusType,
              failureReason
            );
          } catch (error) {
            // Persistence failures are already swallowed inside
            // NotificationLogService; this outer catch protects against
            // import errors in misconfigured environments.
            console.warn(
              '[WhatsApp] NotificationLog status update skipped:',
              error instanceof Error ? error.message : String(error)
            );
          }
        }
      }

      // Check if this is an incoming message (user reply)
      if (payload.entry?.[0]?.changes?.[0]?.value?.messages) {
        const value = payload.entry[0].changes[0].value;
        const messages = value.messages;

        for (const message of messages) {
          const from = message.from;
          const messageId = message.id;
          const messageType = message.type;
          const timestamp = message.timestamp;

          console.log('Incoming WhatsApp message:', {
            from,
            messageId,
            messageType,
            timestamp,
          });

          // REQ-056 — route inbound through the state-machine. Lazy
          // import avoids the lib/whatsapp ↔ services circular (the
          // inbound service depends on NotificationService, which
          // depends back on this module). Same pattern REQ-055 uses
          // for NotificationLog status updates above.
          try {
            const { WhatsAppInboundService } = await import(
              '@/services/whatsapp-inbound-service'
            );
            await WhatsAppInboundService.handle(message, value);
          } catch (error) {
            console.warn(
              '[WhatsApp] inbound routing skipped:',
              error instanceof Error ? error.message : String(error)
            );
          }
        }
      }
    } catch (error) {
      console.error('Error processing WhatsApp webhook:', error);
      throw error;
    }
  }

  /**
   * Send Order Confirmation via WhatsApp
   */
  static async sendOrderConfirmationWhatsApp(
    phone: string,
    orderNumber: string,
    total: number,
    estimatedTime?: number
  ): Promise<WhatsAppResult> {
    // This would use a different template for order confirmations
    // For now, we'll keep it simple and focus on PIN verification
    const templateName = 'order_confirmation';
    const params = [
      orderNumber,
      `₦${total.toLocaleString()}`,
      estimatedTime ? `${estimatedTime} minutes` : 'Soon',
    ];
    return this.sendMessage(phone, templateName, params);
  }

  /**
   * Send Order Status Update via WhatsApp
   */
  static async sendOrderStatusWhatsApp(
    phone: string,
    orderNumber: string,
    status: string
  ): Promise<WhatsAppResult> {
    const templateName = 'order_status_update';
    const statusMap: Record<string, string> = {
      preparing: 'being prepared',
      ready: 'ready for pickup',
      'out-for-delivery': 'out for delivery',
      delivered: 'delivered',
      cancelled: 'cancelled',
    };

    const statusText = statusMap[status] || status.replace('-', ' ');
    const params = [orderNumber, statusText];
    return this.sendMessage(phone, templateName, params);
  }
}
