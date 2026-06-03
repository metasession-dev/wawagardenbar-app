/**
 * @requirement REQ-064 — support-actions RBAC gates
 *
 * Defence-in-depth: the dashboard layout already requireRole's the page
 * surface, but direct action invocations (forged client calls) must also
 * be rejected. Both actions gate on session role server-side.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/mongodb', () => ({
  default: vi.fn(),
  connectDB: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/lib/session', () => ({
  sessionOptions: {},
  SessionData: {},
}));

const mockSession: {
  isLoggedIn?: boolean;
  userId?: string;
  role?: string;
} = {};

vi.mock('iron-session', () => ({
  getIronSession: vi
    .fn()
    .mockImplementation(() => Promise.resolve(mockSession)),
}));

vi.mock('next/headers', () => ({
  cookies: vi.fn().mockResolvedValue({}),
}));

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

const mockAddReply = vi.fn();
const mockUpdateStatus = vi.fn();

vi.mock('@/services/support-ticket-service', () => ({
  SupportTicketService: {
    addReply: (...a: unknown[]) => mockAddReply(...a),
    updateStatus: (...a: unknown[]) => mockUpdateStatus(...a),
  },
}));

beforeEach(() => {
  mockAddReply.mockReset();
  mockUpdateStatus.mockReset();
  Object.keys(mockSession).forEach((k) => {
    delete (mockSession as Record<string, unknown>)[k];
  });
});

describe('REQ-064 support-actions RBAC', () => {
  it('addSupportReplyAction — unauthenticated rejected', async () => {
    // mockSession is empty → !isLoggedIn

    const { addSupportReplyAction } = await import(
      '@/app/actions/dashboard/support-actions'
    );
    const result = await addSupportReplyAction('ticket-1', 'hello');
    expect(result.success).toBe(false);
    expect(result.error).toBe('Not authenticated');
    expect(mockAddReply).not.toHaveBeenCalled();
  });

  it('addSupportReplyAction — customer role rejected', async () => {
    mockSession.isLoggedIn = true;
    mockSession.userId = 'customer-1';
    mockSession.role = 'customer';

    const { addSupportReplyAction } = await import(
      '@/app/actions/dashboard/support-actions'
    );
    const result = await addSupportReplyAction('ticket-1', 'hello');
    expect(result.success).toBe(false);
    expect(result.error).toBe('Forbidden');
    expect(mockAddReply).not.toHaveBeenCalled();
  });

  it('addSupportReplyAction — csr role accepted', async () => {
    mockSession.isLoggedIn = true;
    mockSession.userId = 'staff-1';
    mockSession.role = 'csr';
    mockAddReply.mockResolvedValue({ _id: 'ticket-1' });

    const { addSupportReplyAction } = await import(
      '@/app/actions/dashboard/support-actions'
    );
    const result = await addSupportReplyAction('ticket-1', 'hello');
    expect(result.success).toBe(true);
    expect(mockAddReply).toHaveBeenCalledTimes(1);
    expect(mockAddReply.mock.calls[0][0]).toMatchObject({
      ticketId: 'ticket-1',
      body: 'hello',
      authorRole: 'staff',
      authorUserId: 'staff-1',
    });
  });

  it('updateSupportStatusAction — admin role accepted', async () => {
    mockSession.isLoggedIn = true;
    mockSession.userId = 'admin-1';
    mockSession.role = 'admin';
    mockUpdateStatus.mockResolvedValue({ _id: 'ticket-1' });

    const { updateSupportStatusAction } = await import(
      '@/app/actions/dashboard/support-actions'
    );
    const result = await updateSupportStatusAction('ticket-1', 'resolved');
    expect(result.success).toBe(true);
    expect(mockUpdateStatus).toHaveBeenCalledWith('ticket-1', 'resolved');
  });
});
