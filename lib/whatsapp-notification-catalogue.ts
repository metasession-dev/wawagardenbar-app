/**
 * @requirement REQ-125 — admin switches for WhatsApp notifications
 * @srs REQ-WA-016, REQ-SETTINGS-007
 *
 * The catalogue of WhatsApp notifications an admin can switch on or off, and
 * the short list of messages that can never be switched off. It is code, not
 * data, because the wording is reviewed with the change that introduces a
 * template (ADR-014). The settings UI reads the three texts from here, so a
 * label can never be missing: `__tests__/lib/whatsapp-notification-catalogue.test.ts`
 * fails when a template in `TEMPLATE_CATEGORIES` is neither listed here nor on
 * the locked list.
 */

export interface WhatsAppNotificationEntry {
  /** Stable key stored in settings. */
  key: string;
  /** Short name shown next to the switch. */
  label: string;
  group: string;
  /** Meta template names this switch controls (the sender passes one of these). */
  templates: readonly string[];
  /** What the message is for. */
  purpose: string;
  /** Why it matters. */
  why: string;
  /** What happens if it is switched off. */
  ifOff: string;
  /** Switching it off asks for confirmation that repeats `ifOff`. */
  highImpact?: boolean;
}

/**
 * Messages that are always sent and have no switch. The gate returns before it
 * reads settings for these, so a settings mistake or a master switch cannot
 * stop them. Sign-in is WhatsApp-only, so the PIN is the one that must never
 * be gated. Refund and cancellation messages (REQ-128) are on this list too.
 */
export const LOCKED_WHATSAPP_TEMPLATES: Readonly<
  Record<string, { label: string; reason: string }>
> = {
  verification_pin: {
    label: 'Sign-in PIN',
    reason:
      'Customers sign in only with a PIN sent on WhatsApp. Switching it off would lock every customer out.',
  },
  // REQ-128 — money and cancellation messages are always sent (ADR-015).
  order_cancelled: {
    label: 'Order cancelled',
    reason:
      'Tells a customer their order was cancelled and whether money is coming back. Switching it off would leave a paid customer without confirmation.',
  },
  refund_processed: {
    label: 'Refund processed',
    reason:
      'Tells a customer Paystack has processed their refund. Switching it off would leave them wondering where their money is.',
  },
};

export const WHATSAPP_NOTIFICATION_CATALOGUE: readonly WhatsAppNotificationEntry[] =
  [
    {
      key: 'order_confirmation',
      label: 'Order confirmation',
      group: 'Order updates',
      templates: ['order_confirmation', 'payment_confirmation'],
      purpose:
        'Tells the customer their order was received and the payment went through.',
      why: 'It reassures the customer straight away and gives them a record of the order.',
      ifOff:
        'Customers rely on the order page alone and may contact staff to ask whether the order went through.',
    },
    {
      key: 'order_status',
      label: 'Order status updates',
      group: 'Order updates',
      templates: ['order_status_update', 'order_status_update_v2'],
      purpose:
        'Messages the customer on each status change (confirmed, preparing, ready, out for delivery, delivered) with a Track order button.',
      why: 'Customers know when to collect or expect delivery, which cuts "where is my order" calls.',
      ifOff:
        'Customers must open the tracking page themselves. Expect more support enquiries, especially for delivery orders.',
      highImpact: true,
    },
    {
      key: 'receipt',
      label: 'Receipt',
      group: 'Order updates',
      templates: ['receipt'],
      purpose:
        'Sends the customer a receipt after payment, with a View receipt button.',
      why: 'It is the customer’s proof of payment.',
      ifOff:
        'No receipt is sent on WhatsApp. The receipt is still available on the order page.',
    },
    {
      key: 'payment_reminder',
      label: 'Payment reminder',
      group: 'Payments',
      templates: ['payment_link'],
      purpose:
        'One message about five minutes after an order is placed but not paid, with a link to pay.',
      why: 'It recovers checkouts the customer abandoned before the order expires.',
      ifOff:
        'Unpaid orders are still cancelled after 30 minutes, but the customer gets no warning, so more sales are lost.',
      highImpact: true,
    },
    {
      key: 'bank_transfer_details',
      label: 'Bank transfer details',
      group: 'Payments',
      templates: ['bank_transfer_details'],
      purpose: 'Sends bank account details for a transfer payment.',
      why: 'Customers now pay through Paystack only, so this message is rarely used.',
      ifOff: 'Nothing changes for customer orders today.',
    },
    {
      key: 'support_reply',
      label: 'Support replies',
      group: 'Support',
      templates: ['support_reply'],
      purpose:
        'Delivers staff replies to a customer’s support conversation, including replies after the 24-hour window.',
      why: 'The customer sees the answer on their phone without checking the site.',
      ifOff:
        'Replies are saved on the ticket but not delivered on WhatsApp. Customers must check the site or contact you again.',
    },
    {
      key: 'welcome',
      label: 'Welcome messages',
      group: 'Welcome and recovery',
      templates: ['welcome_new_user', 'welcome_back'],
      purpose:
        'Greets a new or returning customer who messages the business, with a link to the menu.',
      why: 'It points customers at the right place to order and book.',
      ifOff: 'Customers who message you get no welcome and no menu link.',
    },
    {
      key: 'account_recovery',
      label: 'Account recovery',
      group: 'Welcome and recovery',
      templates: ['account_recovery'],
      purpose:
        'Replies to a customer who messages from a different number than the one on their account.',
      why: 'It is how a customer with a changed number gets back into their account.',
      ifOff:
        'Customers who change number get no recovery message and will need to contact staff to regain access.',
      highImpact: true,
    },
    {
      key: 'staff_alert',
      label: 'Staff alerts',
      group: 'Staff',
      templates: ['staff_alert'],
      purpose:
        'Alerts on-shift staff on their own WhatsApp number about new orders, bookings, support messages and refund requests that nobody has acknowledged.',
      why: 'It is the escalation chain that stops unattended items being missed.',
      ifOff:
        'WhatsApp escalation stops. The in-app bell still shows alerts, but items can be missed when nobody is looking at the dashboard.',
      highImpact: true,
    },
    {
      key: 'incident_summary',
      label: 'Admin incident summaries',
      group: 'Staff',
      templates: ['incident_summary'],
      purpose: 'Sends admins a summary of incidents.',
      why: 'Admins hear about failures without opening the dashboard.',
      ifOff: 'Admins see incidents on the dashboard only.',
    },
    {
      key: 'rewards',
      label: 'Rewards messages',
      group: 'Rewards',
      templates: ['reward_earned', 'reward_expiring_soon'],
      purpose:
        'Tells customers they earned a reward or that one is about to expire. These are marketing messages and also need the customer’s marketing consent.',
      why: 'They bring customers back before rewards expire.',
      ifOff: 'No reward messages are sent on WhatsApp for anyone.',
    },
  ];

export function lockedTemplate(
  templateName: string
): { label: string; reason: string } | null {
  return LOCKED_WHATSAPP_TEMPLATES[templateName] ?? null;
}

export function isLockedTemplate(templateName: string): boolean {
  return lockedTemplate(templateName) !== null;
}

/** The catalogue entry whose switch controls this template, or null. */
export function catalogueEntryForTemplate(
  templateName: string
): WhatsAppNotificationEntry | null {
  return (
    WHATSAPP_NOTIFICATION_CATALOGUE.find((e) =>
      e.templates.includes(templateName)
    ) ?? null
  );
}

export function catalogueKeys(): string[] {
  return WHATSAPP_NOTIFICATION_CATALOGUE.map((e) => e.key);
}
