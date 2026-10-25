/**
 * @requirement REQ-115 (AC10) — shared helper for simulating Meta WhatsApp
 * webhook deliveries in e2e specs.
 *
 * `postSignedWebhook` HMAC-SHA256-signs the exact request body with
 * `WHATSAPP_APP_SECRET` (header `x-hub-signature-256`), the same scheme the
 * route verifies. When the secret is not set in the spec's environment the
 * route skips verification (local dev), so a placeholder signature is sent.
 *
 * Transport-layer helper: no `page` object needed.
 */
import { createHmac } from 'crypto';
import type { APIRequestContext } from '@playwright/test';

export type MetaInboundType = 'text' | 'button' | 'interactive';

export interface MetaInboundOptions {
  /** Sender as Meta sends it: digits only, no leading `+`. */
  from: string;
  body: string;
  /** `wamid.…` message id; make it unique per delivery. */
  id: string;
  /** Message type. Defaults to `text`. */
  type?: MetaInboundType;
  /** For `button` / `interactive` messages: the reply's payload / id. */
  buttonPayload?: string;
  /** Sender's WhatsApp profile name. */
  profileName?: string;
}

function inboundMessage(opts: MetaInboundOptions) {
  const base = {
    from: opts.from,
    id: opts.id,
    timestamp: String(Math.floor(Date.now() / 1000)),
  };
  switch (opts.type ?? 'text') {
    case 'button':
      return {
        ...base,
        type: 'button',
        button: { payload: opts.buttonPayload ?? opts.body, text: opts.body },
      };
    case 'interactive':
      return {
        ...base,
        type: 'interactive',
        interactive: {
          type: 'button_reply',
          button_reply: {
            id: opts.buttonPayload ?? opts.body,
            title: opts.body,
          },
        },
      };
    default:
      return { ...base, type: 'text', text: { body: opts.body } };
  }
}

/** A Meta `messages` webhook envelope for one inbound customer message. */
export function metaInboundPayload(opts: MetaInboundOptions) {
  return {
    object: 'whatsapp_business_account',
    entry: [
      {
        id: '0',
        changes: [
          {
            field: 'messages',
            value: {
              messaging_product: 'whatsapp',
              metadata: {
                display_phone_number: '15550100000',
                phone_number_id: '0',
              },
              contacts: [
                {
                  profile: { name: opts.profileName ?? 'E2E Customer' },
                  wa_id: opts.from,
                },
              ],
              messages: [inboundMessage(opts)],
            },
          },
        ],
      },
    ],
  };
}

export type MetaStatus = 'sent' | 'delivered' | 'read' | 'failed';

export interface MetaStatusOptions {
  /** The `wamid` of the outbound message the status is about. */
  messageId: string;
  status: MetaStatus;
  /** Recipient, digits only. */
  recipientId: string;
  /** For `failed`: Meta error code and title. */
  errorCode?: number;
  errorTitle?: string;
}

/** A Meta `messages` webhook envelope carrying one delivery-status update. */
export function metaStatusPayload(opts: MetaStatusOptions) {
  return {
    object: 'whatsapp_business_account',
    entry: [
      {
        id: '0',
        changes: [
          {
            field: 'messages',
            value: {
              messaging_product: 'whatsapp',
              metadata: {
                display_phone_number: '15550100000',
                phone_number_id: '0',
              },
              statuses: [
                {
                  id: opts.messageId,
                  status: opts.status,
                  timestamp: String(Math.floor(Date.now() / 1000)),
                  recipient_id: opts.recipientId,
                  ...(opts.status === 'failed'
                    ? {
                        errors: [
                          {
                            code: opts.errorCode ?? 131026,
                            title: opts.errorTitle ?? 'Message undeliverable',
                          },
                        ],
                      }
                    : {}),
                },
              ],
            },
          },
        ],
      },
    ],
  };
}

/** `sha256=<hex>` HMAC of `rawBody` with `WHATSAPP_APP_SECRET`. */
export function signWebhookBody(rawBody: string, secret: string): string {
  return `sha256=${createHmac('sha256', secret).update(rawBody).digest('hex')}`;
}

/**
 * POST a payload to `/api/webhooks/whatsapp`, signed with
 * `WHATSAPP_APP_SECRET` when it is set. Returns the HTTP status.
 */
export async function postSignedWebhook(
  request: APIRequestContext,
  payload: unknown
): Promise<number> {
  const rawBody = JSON.stringify(payload);
  const secret = process.env.WHATSAPP_APP_SECRET;
  const signature = secret
    ? signWebhookBody(rawBody, secret)
    : 'sha256=0000000000000000000000000000000000000000000000000000000000000000';
  const response = await request.post('/api/webhooks/whatsapp', {
    headers: {
      'content-type': 'application/json',
      'x-hub-signature-256': signature,
    },
    data: rawBody,
  });
  return response.status();
}
