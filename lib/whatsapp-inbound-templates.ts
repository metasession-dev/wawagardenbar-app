/**
 * @requirement REQ-056 — WhatsApp inbound-message router
 *
 * Maps an inbound customer state to the welcome template the router
 * should send when the intent doesn't override (i.e. for chat_with_staff
 * and support_text intents — opt_out always wins).
 *
 * `null` means "no template — handle free-form / staff queue", used for
 * the `active` state where the customer is already engaged and a
 * template send would feel impersonal.
 *
 * Keep this in sync with `lib/notification-templates.ts:TEMPLATE_CATEGORIES`
 * (the entries here must be present there too).
 */
import type { IncomingCustomerState } from '@/models/incoming-message-model';

export const INBOUND_WELCOME_TEMPLATE: Record<
  IncomingCustomerState,
  string | null
> = {
  new: 'welcome_new_user',
  signing_up: 'welcome_new_user',
  active: null, // free-form / staff handles it
  dormant: 'welcome_back',
};
