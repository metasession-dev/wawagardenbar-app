'use server';

import { cookies } from 'next/headers';
import { getIronSession } from 'iron-session';
import { revalidatePath } from 'next/cache';
import { sessionOptions, SessionData } from '@/lib/session';
import { SupportTicketService } from '@/services/support-ticket-service';
import type { SupportTicketStatus } from '@/models/support-ticket-model';

const STAFF_ROLES = new Set(['csr', 'admin', 'super-admin']);

interface ActionResult {
  success: boolean;
  error?: string;
}

/**
 * @requirement REQ-064 — staff actions for the support queue.
 *
 * Both actions gate on a staff session role server-side; a forged client
 * call reaches the gate, not the data. The dashboard layout already
 * `requireRole`s the page surface; this is defence-in-depth for direct
 * action invocations.
 */
async function requireStaffSession(): Promise<
  { ok: true; userId: string } | { ok: false; error: string }
> {
  const cookieStore = await cookies();
  const session = await getIronSession<SessionData>(
    cookieStore,
    sessionOptions
  );
  if (!session.isLoggedIn || !session.userId) {
    return { ok: false, error: 'Not authenticated' };
  }
  if (!session.role || !STAFF_ROLES.has(session.role)) {
    return { ok: false, error: 'Forbidden' };
  }
  return { ok: true, userId: session.userId };
}

export async function addSupportReplyAction(
  ticketId: string,
  body: string
): Promise<ActionResult> {
  const gate = await requireStaffSession();
  if (!gate.ok) return { success: false, error: gate.error };

  if (!body || !body.trim()) {
    return { success: false, error: 'Reply body required' };
  }

  try {
    const updated = await SupportTicketService.addReply({
      ticketId,
      body: body.trim(),
      authorRole: 'staff',
      authorUserId: gate.userId,
    });
    if (!updated) return { success: false, error: 'Ticket not found' };
    revalidatePath(`/dashboard/support/${ticketId}`);
    revalidatePath('/dashboard/support');
    return { success: true };
  } catch (error) {
    console.error('[addSupportReplyAction]', error);
    return { success: false, error: 'Failed to add reply' };
  }
}

export async function updateSupportStatusAction(
  ticketId: string,
  status: SupportTicketStatus
): Promise<ActionResult> {
  const gate = await requireStaffSession();
  if (!gate.ok) return { success: false, error: gate.error };

  try {
    const updated = await SupportTicketService.updateStatus(ticketId, status);
    if (!updated) return { success: false, error: 'Ticket not found' };
    revalidatePath(`/dashboard/support/${ticketId}`);
    revalidatePath('/dashboard/support');
    return { success: true };
  } catch (error) {
    console.error('[updateSupportStatusAction]', error);
    return { success: false, error: 'Failed to update status' };
  }
}
