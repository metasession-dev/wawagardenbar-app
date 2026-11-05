/**
 * REQ-117 (AC3, AC9) — customer-facing sign-in messages. Kept out of the
 * `'use server'` action files, which may only export async functions.
 */
export const NOT_ON_WHATSAPP_MESSAGE =
  "This number isn't on WhatsApp. To order, please use the counter or call us.";

export const WHATSAPP_UNAVAILABLE_MESSAGE =
  'Online ordering is temporarily unavailable. Please order at the counter or call us.';
