/**
 * @requirement REQ-WA-012 — Window-aware support reply (REQ-118, AC2)
 * @requirement REQ-WA-013 — Human-handoff SLA (REQ-118, AC3)
 *
 * Pure helpers shared by the support service and the staff dashboard so the
 * server and the UI cannot disagree about which mode a reply will use.
 */

/** WhatsApp's customer-service window: free-form messages are allowed for 24h after the customer's last message. */
export const REPLY_WINDOW_MS = 24 * 60 * 60 * 1000;
/** A resolved ticket is reopened when the customer replies within 72 hours. */
export const REOPEN_WINDOW_MS = 72 * 60 * 60 * 1000;
/** "Chat with staff" gives staff fifteen minutes. */
export const HANDOFF_SLA_MS = 15 * 60 * 1000;

export type ReplyMode = 'free_form' | 'template';

export function getReplyMode(
  lastInboundAt: Date | string | null | undefined,
  now: number = Date.now()
): ReplyMode {
  if (!lastInboundAt) return 'template';
  const last = new Date(lastInboundAt).getTime();
  if (Number.isNaN(last)) return 'template';
  return now - last < REPLY_WINDOW_MS ? 'free_form' : 'template';
}

export const REPLY_MODE_LABEL: Record<ReplyMode, string> = {
  free_form: 'Free message',
  template: "Template message — the customer hasn't messaged in 24h",
};

const ACTIVE_STATUSES = new Set(['open', 'in_progress', 'awaiting_customer']);

export function isSlaOverdue(
  ticket: { status: string; slaDueAt?: Date | string | null },
  now: number = Date.now()
): boolean {
  if (!ticket.slaDueAt || !ACTIVE_STATUSES.has(ticket.status)) return false;
  return new Date(ticket.slaDueAt).getTime() < now;
}
