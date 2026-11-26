'use server';

/**
 * @requirement REQ-PAY-014 — Refunds are staff-gated (REQ-128, AC3, AC4)
 *
 * Staff entry points for refunds. Only `manager`, `admin` and `super-admin`
 * may refund or decide a refund request; a `csr`, kitchen user or customer
 * session is refused here, on the server, whatever the UI shows.
 */
import { cookies } from 'next/headers';
import { getIronSession } from 'iron-session';
import { revalidatePath } from 'next/cache';
import { sessionOptions, SessionData, hasAnyRole } from '@/lib/session';
import { getPrimaryRole } from '@/lib/roles';
import { REFUND_ROLES } from '@/lib/refund-roles';
import {
  RefundService,
  toKobo,
  type StaffActor,
} from '@/services/refund-service';

export interface RefundActionResult {
  success: boolean;
  message?: string;
  error?: string;
}

async function requireRefundStaff(): Promise<
  { ok: true; actor: StaffActor } | { ok: false; error: string }
> {
  const session = await getIronSession<SessionData>(
    await cookies(),
    sessionOptions
  );
  if (
    !session.isLoggedIn ||
    !session.userId ||
    !hasAnyRole(session, [...REFUND_ROLES])
  ) {
    return { ok: false, error: 'Unauthorized' };
  }
  return {
    ok: true,
    actor: {
      userId: session.userId,
      email: session.email || '',
      role: getPrimaryRole(session) ?? 'unknown',
    },
  };
}

function parseAmount(
  mode: 'full' | 'partial',
  amountNaira?: number
): { kobo?: number; error?: string } {
  if (mode === 'full') return {};
  if (
    amountNaira === undefined ||
    !Number.isFinite(amountNaira) ||
    amountNaira <= 0
  ) {
    return { error: 'Enter a refund amount greater than zero.' };
  }
  return { kobo: toKobo(amountNaira) };
}

/** AC4 — refund a paid Paystack order in full or in part, with a reason. */
export async function refundOrderAction(input: {
  orderId: string;
  mode: 'full' | 'partial';
  amountNaira?: number;
  reason: string;
}): Promise<RefundActionResult> {
  const auth = await requireRefundStaff();
  if (!auth.ok) return { success: false, error: auth.error };
  const reason = input.reason?.trim();
  if (!reason) return { success: false, error: 'A reason is required.' };
  const amount = parseAmount(input.mode, input.amountNaira);
  if (amount.error) return { success: false, error: amount.error };

  const result = await RefundService.requestRefund({
    orderId: input.orderId,
    type: input.mode,
    amountKobo: amount.kobo,
    reason,
    source: 'staff',
    requestedBy: auth.actor,
    approvedBy: auth.actor,
  });
  revalidatePath(`/dashboard/orders/${input.orderId}`);
  if (!result.ok) return { success: false, error: result.error };
  return {
    success: true,
    message:
      'Refund requested. The order shows as refunded once Paystack confirms.',
  };
}

/** AC3 — approve a customer's refund request (full, or a partial amount). */
export async function approveRefundRequestAction(input: {
  ticketId: string;
  mode: 'full' | 'partial';
  amountNaira?: number;
  note?: string;
}): Promise<RefundActionResult> {
  const auth = await requireRefundStaff();
  if (!auth.ok) return { success: false, error: auth.error };
  const amount = parseAmount(input.mode, input.amountNaira);
  if (amount.error) return { success: false, error: amount.error };

  const result = await RefundService.approveRefundRequest({
    ticketId: input.ticketId,
    actor: auth.actor,
    partialAmountKobo: amount.kobo,
    note: input.note,
  });
  revalidatePath(`/dashboard/support/${input.ticketId}`);
  revalidatePath('/dashboard/support');
  if (!result.ok) return { success: false, error: result.error };
  return { success: true, message: 'Refund approved and requested.' };
}

/** AC3 — reject a customer's refund request; the customer is told why. */
export async function rejectRefundRequestAction(input: {
  ticketId: string;
  reason: string;
}): Promise<RefundActionResult> {
  const auth = await requireRefundStaff();
  if (!auth.ok) return { success: false, error: auth.error };
  const reason = input.reason?.trim();
  if (!reason) return { success: false, error: 'A reason is required.' };

  const result = await RefundService.rejectRefundRequest({
    ticketId: input.ticketId,
    actor: auth.actor,
    reason,
  });
  revalidatePath(`/dashboard/support/${input.ticketId}`);
  revalidatePath('/dashboard/support');
  if (!result.ok) return { success: false, error: result.error };
  return { success: true, message: 'Request rejected and the customer told.' };
}
