/**
 * @requirement REQ-118 (AC1, REQ-WA-011) — one ongoing support conversation per
 * customer: inbound messages append to the open ticket, a resolved ticket
 * reopens within 72 hours, and a new ticket is created only otherwise.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/mongodb', () => ({
  default: vi.fn(),
  connectDB: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('@/lib/email', () => ({ sendSupportTicketEmail: vi.fn() }));

const mockSend = vi.fn();
vi.mock('@/services/notification-service', () => ({
  NotificationService: { send: (...a: unknown[]) => mockSend(...a) },
}));

const mockCreate = vi.fn();
const mockFindOne = vi.fn();
const mockUpdateOne = vi.fn();
const mockFindByIdAndUpdate = vi.fn();
vi.mock('@/models/support-ticket-model', () => ({
  default: {
    create: (...a: unknown[]) => mockCreate(...a),
    findOne: (...a: unknown[]) => mockFindOne(...a),
    updateOne: (...a: unknown[]) => mockUpdateOne(...a),
    findByIdAndUpdate: (...a: unknown[]) => mockFindByIdAndUpdate(...a),
    aggregate: vi.fn().mockResolvedValue([]),
    countDocuments: vi.fn().mockResolvedValue(0),
  },
}));

const mockIncomingFindOne = vi.fn();
vi.mock('@/models/incoming-message-model', () => ({
  default: { findOne: (...a: unknown[]) => mockIncomingFindOne(...a) },
}));

vi.mock('@/models', () => ({
  UserModel: {
    findById: () => ({
      select: vi.fn().mockReturnThis(),
      lean: vi.fn().mockResolvedValue({ firstName: 'Ada' }),
    }),
  },
}));

/** findOne(...).sort(...).lean() resolving the given values in order. */
function findOneReturns(...values: unknown[]) {
  const queue = [...values];
  mockFindOne.mockImplementation(() => ({
    sort: vi.fn().mockReturnThis(),
    lean: vi.fn().mockImplementation(async () => queue.shift() ?? null),
  }));
}

function lastInbound(when: Date | null) {
  mockIncomingFindOne.mockReturnValue({
    sort: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    lean: vi.fn().mockResolvedValue(when ? { receivedAt: when } : null),
  });
}

beforeEach(() => {
  mockSend.mockReset().mockResolvedValue({ success: true, attempts: [] });
  mockCreate.mockReset().mockImplementation(async (input) => ({
    ...input,
    _id: 'new-ticket',
  }));
  mockUpdateOne.mockReset().mockResolvedValue({});
  mockFindByIdAndUpdate.mockReset();
  mockFindOne.mockReset();
  mockIncomingFindOne.mockReset();
  lastInbound(null);
});

const HOUR = 3_600_000;
const svc = async () =>
  (await import('@/services/support-ticket-service')).SupportTicketService;

describe('REQ-118 AC1: threading', () => {
  it('AC1 — a message from a customer with an open ticket is appended to it, not a new ticket', async () => {
    const open = {
      _id: 't1',
      status: 'open',
      priority: 'normal',
      slaDueAt: null,
    };
    findOneReturns(open);
    mockFindByIdAndUpdate.mockReturnValue({
      lean: vi.fn().mockResolvedValue({ ...open, replies: [{}, {}, {}] }),
    });
    const s = await svc();
    await s.createFromWhatsAppInbound({
      from: '2348012345678',
      body: 'second message',
      userId: 'user-1',
    });
    expect(mockCreate).not.toHaveBeenCalled();
    const [id, update] = mockFindByIdAndUpdate.mock.calls[0];
    expect(id).toBe('t1');
    expect(update.$push.replies).toMatchObject({
      authorRole: 'customer',
      authorUserId: 'user-1',
      body: 'second message',
    });
    expect(update.$set.lastCustomerMessageAt).toBeInstanceOf(Date);
  });

  it('AC1 — the open-ticket lookup matches the phone in every stored form and the user id', async () => {
    findOneReturns(null, null);
    const s = await svc();
    await s.createFromWhatsAppInbound({
      from: '2348012345678',
      body: 'hello',
      userId: 'user-1',
    });
    const first = mockFindOne.mock.calls[0][0];
    expect(first.status).toEqual({ $nin: ['resolved', 'closed'] });
    expect(first.$or).toEqual(
      expect.arrayContaining([
        { userId: 'user-1' },
        {
          customerPhone: {
            $in: expect.arrayContaining(['+2348012345678', '2348012345678']),
          },
        },
      ])
    );
  });

  it("AC1 — a ticket resolved within 72 hours is reopened by the customer's reply", async () => {
    const resolved = {
      _id: 't2',
      status: 'resolved',
      priority: 'normal',
      slaDueAt: null,
    };
    findOneReturns(null, resolved);
    mockFindByIdAndUpdate.mockReturnValue({
      lean: vi.fn().mockResolvedValue({ ...resolved, status: 'open' }),
    });
    const s = await svc();
    await s.createFromWhatsAppInbound({
      from: '2348012345678',
      body: 'still broken',
      userId: null,
    });
    const second = mockFindOne.mock.calls[1][0];
    expect(second.status).toBe('resolved');
    const gte = second.resolvedAt.$gte as Date;
    expect((Date.now() - gte.getTime()) / HOUR).toBeCloseTo(72, 0);
    const update = mockFindByIdAndUpdate.mock.calls[0][1];
    expect(update.$set.status).toBe('open');
    expect(update.$set.resolvedAt).toBeNull();
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('AC1 — with no open and no recently resolved ticket a new ticket is created', async () => {
    findOneReturns(null, null);
    const s = await svc();
    const ticket = await s.createFromWhatsAppInbound({
      from: '2348012345678',
      body: 'My delivery is late',
      userId: 'user-1',
    });
    expect(mockCreate).toHaveBeenCalledTimes(1);
    expect(mockCreate.mock.calls[0][0]).toMatchObject({
      source: 'whatsapp',
      category: 'whatsapp-inbound',
      customerPhone: '2348012345678',
      subject: 'My delivery is late',
    });
    expect(ticket).toMatchObject({ _id: 'new-ticket' });
    const follow = mockUpdateOne.mock.calls[0][1];
    expect(follow.$set.lastCustomerMessageAt).toBeInstanceOf(Date);
  });

  it('AC1 — an awaiting-customer ticket moves back to in progress when the customer answers', async () => {
    const waiting = {
      _id: 't3',
      status: 'awaiting_customer',
      priority: 'normal',
      slaDueAt: null,
    };
    findOneReturns(waiting);
    mockFindByIdAndUpdate.mockReturnValue({
      lean: vi.fn().mockResolvedValue(waiting),
    });
    const s = await svc();
    await s.createFromWhatsAppInbound({
      from: '2348012345678',
      body: 'here you go',
      userId: null,
    });
    expect(mockFindByIdAndUpdate.mock.calls[0][1].$set.status).toBe(
      'in_progress'
    );
  });

  it('AC1 — a closed ticket is never reopened', async () => {
    findOneReturns(null, null);
    const s = await svc();
    await s.createFromWhatsAppInbound({
      from: '2348012345678',
      body: 'hi again',
      userId: null,
    });
    const second = mockFindOne.mock.calls[1][0];
    expect(second.status).toBe('resolved');
    expect(mockCreate).toHaveBeenCalledTimes(1);
  });
});
