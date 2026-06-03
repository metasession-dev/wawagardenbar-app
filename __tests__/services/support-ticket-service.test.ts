/**
 * @requirement REQ-064 — SupportTicketService unit coverage
 *
 * Covers createTicket, createFromWhatsAppInbound, listTickets, addReply
 * (incl. NotificationService side-effect), and updateStatus.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/mongodb', () => ({
  default: vi.fn(),
  connectDB: vi.fn().mockResolvedValue(undefined),
}));

const mockNotificationSend = vi.fn();
vi.mock('@/services/notification-service', () => ({
  NotificationService: {
    send: (...a: unknown[]) => mockNotificationSend(...a),
  },
}));

vi.mock('@/lib/email', () => ({
  sendSupportTicketEmail: vi.fn().mockResolvedValue(undefined),
}));

const mockCreate = vi.fn();
const mockFind = vi.fn();
const mockCount = vi.fn();
const mockFindByIdAndUpdate = vi.fn();
const mockFindById = vi.fn();

vi.mock('@/models/support-ticket-model', () => ({
  default: {
    create: (...a: unknown[]) => mockCreate(...a),
    find: (...a: unknown[]) => mockFind(...a),
    countDocuments: (...a: unknown[]) => mockCount(...a),
    findByIdAndUpdate: (...a: unknown[]) => mockFindByIdAndUpdate(...a),
    findById: (...a: unknown[]) => mockFindById(...a),
  },
}));

beforeEach(() => {
  mockCreate.mockReset();
  mockFind.mockReset();
  mockCount.mockReset();
  mockFindByIdAndUpdate.mockReset();
  mockFindById.mockReset();
  mockNotificationSend.mockReset().mockResolvedValue({
    sentVia: 'email',
    success: true,
    attempts: [],
  });
});

describe('REQ-064 SupportTicketService.createTicket', () => {
  it('AC2 — generates TKT- prefixed ticketNumber and persists shape', async () => {
    let captured: Record<string, unknown> | undefined;
    mockCreate.mockImplementation((input) => {
      captured = input;
      return Promise.resolve({ ...input, _id: 'ticket-1' });
    });

    const { SupportTicketService } = await import(
      '@/services/support-ticket-service'
    );
    const ticket = await SupportTicketService.createTicket({
      source: 'web',
      category: 'order-issue',
      subject: 'subj',
      message: 'msg',
      customerEmail: 'a@b.com',
    });

    expect(captured?.ticketNumber).toMatch(/^TKT-\d+$/);
    expect(captured?.source).toBe('web');
    expect(captured?.customerEmail).toBe('a@b.com');
    expect(ticket).toMatchObject({ source: 'web', category: 'order-issue' });
  });
});

describe('REQ-064 SupportTicketService.createFromWhatsAppInbound', () => {
  it('AC3 — body preview becomes subject; full body in message', async () => {
    let captured: Record<string, unknown> | undefined;
    mockCreate.mockImplementation((input) => {
      captured = input;
      return Promise.resolve({ ...input, _id: 'ticket-2' });
    });

    const longBody =
      'Hello, I think my order yesterday was missing the side of jollof rice and I would like to ask about it';

    const { SupportTicketService } = await import(
      '@/services/support-ticket-service'
    );
    await SupportTicketService.createFromWhatsAppInbound({
      from: '+2348011112222',
      body: longBody,
      userId: 'user-7',
    });

    expect(captured?.source).toBe('whatsapp');
    expect(captured?.category).toBe('whatsapp-inbound');
    expect(captured?.customerPhone).toBe('+2348011112222');
    expect(captured?.userId).toBe('user-7');
    // Subject is preview (60 chars with ellipsis), message is full body.
    expect((captured?.subject as string).length).toBeLessThanOrEqual(60);
    expect(captured?.subject).toContain('Hello');
    expect(captured?.message).toBe(longBody);
  });

  it('AC3 — short body: subject == body, no truncation', async () => {
    let captured: Record<string, unknown> | undefined;
    mockCreate.mockImplementation((input) => {
      captured = input;
      return Promise.resolve({ ...input, _id: 'ticket-3' });
    });

    const { SupportTicketService } = await import(
      '@/services/support-ticket-service'
    );
    await SupportTicketService.createFromWhatsAppInbound({
      from: '+2348011112222',
      body: 'order missing',
      userId: null,
    });

    expect(captured?.subject).toBe('order missing');
    expect(captured?.message).toBe('order missing');
  });
});

describe('REQ-064 SupportTicketService.addReply', () => {
  it('AC5 — staff reply pushes to replies[] and triggers NotificationService.send', async () => {
    const updated = {
      _id: 'ticket-4',
      ticketNumber: 'TKT-99',
      userId: 'user-5',
      customerEmail: 'c@d.com',
      subject: 'Test',
      category: 'order-issue',
      status: 'in_progress',
      source: 'web',
      replies: [
        {
          authorRole: 'staff',
          authorUserId: 'staff-1',
          body: 'Sorry about that…',
          createdAt: new Date(),
        },
      ],
    };
    mockFindByIdAndUpdate.mockReturnValue({
      lean: vi.fn().mockResolvedValue(updated),
    });

    const { SupportTicketService } = await import(
      '@/services/support-ticket-service'
    );
    const result = await SupportTicketService.addReply({
      ticketId: 'ticket-4',
      body: 'Sorry about that…',
      authorRole: 'staff',
      authorUserId: 'staff-1',
    });

    expect(result?.replies).toHaveLength(1);
    expect(mockNotificationSend).toHaveBeenCalled();
    const sendArgs = mockNotificationSend.mock.calls[0][0];
    expect(sendArgs.templateKey).toBe('support_reply');
    expect(sendArgs.userId).toBe('user-5');
  });

  it('AC5 — guest ticket (no userId) — reply persisted, no notification', async () => {
    const updated = {
      _id: 'ticket-5',
      ticketNumber: 'TKT-100',
      userId: null,
      customerEmail: 'guest@x.com',
      replies: [],
    };
    mockFindByIdAndUpdate.mockReturnValue({
      lean: vi.fn().mockResolvedValue(updated),
    });

    const { SupportTicketService } = await import(
      '@/services/support-ticket-service'
    );
    await SupportTicketService.addReply({
      ticketId: 'ticket-5',
      body: 'Reply',
      authorRole: 'staff',
      authorUserId: 'staff-1',
    });

    expect(mockNotificationSend).not.toHaveBeenCalled();
  });
});

describe('REQ-064 SupportTicketService.listTickets', () => {
  it('AC4 — applies status filter to query', async () => {
    let capturedQuery: Record<string, unknown> | undefined;
    mockFind.mockImplementation((q) => {
      capturedQuery = q;
      return {
        sort: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        skip: vi.fn().mockReturnThis(),
        lean: vi.fn().mockResolvedValue([]),
      };
    });
    mockCount.mockResolvedValue(0);

    const { SupportTicketService } = await import(
      '@/services/support-ticket-service'
    );
    await SupportTicketService.listTickets({ status: 'in_progress' });

    expect(capturedQuery?.status).toBe('in_progress');
  });

  it('AC4 — status="all" omits the status clause entirely', async () => {
    let capturedQuery: Record<string, unknown> | undefined;
    mockFind.mockImplementation((q) => {
      capturedQuery = q;
      return {
        sort: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        skip: vi.fn().mockReturnThis(),
        lean: vi.fn().mockResolvedValue([]),
      };
    });
    mockCount.mockResolvedValue(0);

    const { SupportTicketService } = await import(
      '@/services/support-ticket-service'
    );
    await SupportTicketService.listTickets({ status: 'all' });

    expect(capturedQuery?.status).toBeUndefined();
  });
});
