/**
 * @requirement REQ-115 — one parameter builder per WhatsApp template.
 *
 * Each builder returns the header/body/button variables for its template,
 * in the order the template's `{{n}}` placeholders expect. The template
 * definitions live in `docs/whatsapp-templates/<name>.json`; the contract
 * test (`__tests__/lib/whatsapp-template-contract.test.ts`) checks that
 * every builder returns exactly as many variables as its template declares.
 */
import { format } from 'date-fns';
import type { WhatsAppTemplateParams } from '@/lib/whatsapp';
import { getCurrentBusinessDayKey } from '@/lib/business-time';

const TIME_FORMAT = 'h:mm a';
const REPLY_MAX_CHARS = 700;

type DayHours = { open: string; close: string; closed: boolean };
export interface BusinessHoursLike {
  [day: string]: DayHours;
}

function formatHHmm(hhmm: string): string {
  const [h, m] = hhmm.split(':').map((n) => parseInt(n, 10));
  if (Number.isNaN(h) || Number.isNaN(m)) return hhmm;
  return format(new Date(2000, 0, 1, h, m), TIME_FORMAT);
}

export function firstNameOrFallback(name?: string | null): string {
  const first = (name ?? '').trim().split(/\s+/)[0];
  return first || 'there';
}

/** `welcome_new_user` = [today's opening time, today's closing time]. */
export function welcomeNewUserParams(
  businessHours: BusinessHoursLike,
  now: Date = new Date()
): WhatsAppTemplateParams {
  const today = businessHours[getCurrentBusinessDayKey(now)];
  const open =
    today && !today.closed ? formatHHmm(today.open) : 'our opening time';
  const close = today && !today.closed ? formatHHmm(today.close) : 'closing';
  return { bodyParams: [open, close] };
}

/** `welcome_back` = [customer first name, fallback `there`]. */
export function welcomeBackParams(user: {
  firstName?: string | null;
  name?: string | null;
}): WhatsAppTemplateParams {
  return { bodyParams: [firstNameOrFallback(user.firstName ?? user.name)] };
}

/** `support_reply` = header [ticket number], body [first name, subject, reply]. */
export function supportReplyParams(input: {
  ticketNumber: string;
  customerName?: string | null;
  subject: string;
  reply: string;
}): WhatsAppTemplateParams {
  // Meta rejects newlines/tabs and 4+ consecutive spaces inside a variable.
  const clean = (text: string) =>
    text
      .replace(/[\r\n\t]+/g, ' ')
      .replace(/ {4,}/g, '   ')
      .trim();
  const reply = clean(input.reply);
  return {
    headerParams: [input.ticketNumber],
    bodyParams: [
      firstNameOrFallback(input.customerName),
      clean(input.subject),
      reply.length > REPLY_MAX_CHARS
        ? `${reply.slice(0, REPLY_MAX_CHARS - 1)}…`
        : reply,
    ],
  };
}

/** `account_recovery` = [last four digits of the phone on file]. */
export function accountRecoveryParams(
  phoneOnFile: string
): WhatsAppTemplateParams {
  return { bodyParams: [phoneOnFile.replace(/\D/g, '').slice(-4)] };
}

/** `order_confirmation` = [order number, total, estimated time]. */
export function orderConfirmationParams(input: {
  orderNumber: string;
  total: string;
  estimatedTime: string;
}): WhatsAppTemplateParams {
  return { bodyParams: [input.orderNumber, input.total, input.estimatedTime] };
}

/** `order_status_update` = [order number, status text]. */
export function orderStatusUpdateParams(input: {
  orderNumber: string;
  statusText: string;
}): WhatsAppTemplateParams {
  return { bodyParams: [input.orderNumber, input.statusText] };
}

/** `receipt` = header [order number], body [items, total, payment method, points], URL button [order number]. */
export function receiptParams(input: {
  orderNumber: string;
  itemsList: string;
  total: string;
  paymentMethod: string;
  pointsEarned: string;
}): WhatsAppTemplateParams {
  return {
    headerParams: [input.orderNumber],
    bodyParams: [
      input.itemsList,
      input.total,
      input.paymentMethod,
      input.pointsEarned,
    ],
    buttonParams: [{ index: 0, params: [input.orderNumber] }],
  };
}

/** `reward_earned` = [first name, points earned, new balance, naira equivalent]. */
export function rewardEarnedParams(input: {
  firstName?: string | null;
  pointsEarned: string;
  newBalance: string;
  nairaEquivalent: string;
}): WhatsAppTemplateParams {
  return {
    bodyParams: [
      firstNameOrFallback(input.firstName),
      input.pointsEarned,
      input.newBalance,
      input.nairaEquivalent,
    ],
  };
}

/** `reward_expiring_soon` = [first name, expiring points, days remaining, naira equivalent]. */
export function rewardExpiringSoonParams(input: {
  firstName?: string | null;
  expiringPoints: string;
  daysRemaining: string;
  nairaEquivalent: string;
}): WhatsAppTemplateParams {
  return {
    bodyParams: [
      firstNameOrFallback(input.firstName),
      input.expiringPoints,
      input.daysRemaining,
      input.nairaEquivalent,
    ],
  };
}

/** `payment_link` = body [first name, amount, expires in hours], URL button [payment url]. */
export function paymentLinkParams(input: {
  firstName?: string | null;
  amount: string;
  paymentUrl: string;
  expiresInHours: string;
}): WhatsAppTemplateParams {
  return {
    bodyParams: [
      firstNameOrFallback(input.firstName),
      input.amount,
      input.expiresInHours,
    ],
    buttonParams: [{ index: 0, params: [input.paymentUrl] }],
  };
}

/** `payment_confirmation` = [amount, card last four]. */
export function paymentConfirmationParams(input: {
  amount: string;
  cardLast4: string;
}): WhatsAppTemplateParams {
  return { bodyParams: [input.amount, input.cardLast4] };
}

/** `bank_transfer_details` = [amount, account number, account name, bank name, expires in hours]. */
export function bankTransferDetailsParams(input: {
  amount: string;
  accountNumber: string;
  accountName: string;
  bankName: string;
  expiresInHours: string;
}): WhatsAppTemplateParams {
  return {
    bodyParams: [
      input.amount,
      input.accountNumber,
      input.accountName,
      input.bankName,
      input.expiresInHours,
    ],
  };
}
