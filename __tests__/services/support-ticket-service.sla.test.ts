/**
 * @requirement REQ-118 (AC3, REQ-WA-013) — "Chat with staff" makes the ticket
 * urgent with a fifteen-minute SLA; the queue sorts by SLA and flags overdue
 * tickets; a staff reply or resolution stops the clock.
 */
import { isSlaOverdue, HANDOFF_SLA_MS } from '@/lib/support-reply-mode';
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

const svc = async () =>
  (await import('@/services/support-ticket-service')).SupportTicketService;

describe('REQ-118 AC3: handoff SLA', () => {
  it('AC3 [US-A4.8] — a new urgent ticket has priority urgent and an SLA 15 minutes ahead', async () => {
    findOneReturns(null, null);
    const s = await svc();
    await s.createFromWhatsAppInbound({
      from: '2348012345678',
      body: '💬 Chat with Staff',
      userId: 'user-1',
      urgent: true,
    });
    expect(mockCreate.mock.calls[0][0].priority).toBe('urgent');
    const due = mockUpdateOne.mock.calls[0][1].$set.slaDueAt as Date;
    expect(due.getTime() - Date.now()).toBeGreaterThan(HANDOFF_SLA_MS - 5000);
    expect(due.getTime() - Date.now()).toBeLessThanOrEqual(HANDOFF_SLA_MS);
    expect(HANDOFF_SLA_MS).toBe(15 * 60 * 1000);
  });

  it('AC3 — an existing open ticket is escalated to urgent with a fresh SLA', async () => {
    const open = {
      _id: 't1',
      status: 'open',
      priority: 'normal',
      slaDueAt: null,
    };
    findOneReturns(open);
    mockFindByIdAndUpdate.mockReturnValue({
      lean: vi.fn().mockResolvedValue(open),
    });
    const s = await svc();
    await s.createFromWhatsAppInbound({
      from: '2348012345678',
      body: 'help',
      userId: null,
      urgent: true,
    });
    const set = mockFindByIdAndUpdate.mock.calls[0][1].$set;
    expect(set.priority).toBe('urgent');
    expect(set.slaDueAt).toBeInstanceOf(Date);
  });

  it('AC3 — an SLA that is already running is not extended by another tap', async () => {
    const soon = new Date(Date.now() + 60_000);
    const open = {
      _id: 't1',
      status: 'open',
      priority: 'urgent',
      slaDueAt: soon,
    };
    findOneReturns(open);
    mockFindByIdAndUpdate.mockReturnValue({
      lean: vi.fn().mockResolvedValue(open),
    });
    const s = await svc();
    await s.createFromWhatsAppInbound({
      from: '2348012345678',
      body: 'help',
      userId: null,
      urgent: true,
    });
    expect(
      mockFindByIdAndUpdate.mock.calls[0][1].$set.slaDueAt
    ).toBeUndefined();
  });

  it('AC3 — a normal message does not make the ticket urgent', async () => {
    findOneReturns(null, null);
    const s = await svc();
    await s.createFromWhatsAppInbound({
      from: '2348012345678',
      body: 'hello',
      userId: null,
    });
    expect(mockCreate.mock.calls[0][0].priority).toBe('normal');
    expect(mockUpdateOne.mock.calls[0][1].$set.slaDueAt).toBeUndefined();
  });

  it('AC3 — a staff reply stops the SLA clock', async () => {
    mockFindByIdAndUpdate.mockReturnValue({
      lean: vi.fn().mockResolvedValue({ _id: 't1', userId: null, replies: [] }),
    });
    const s = await svc();
    await s.addReply({
      ticketId: 't1',
      body: 'on it',
      authorRole: 'staff',
      authorUserId: 's1',
    });
    expect(mockFindByIdAndUpdate.mock.calls[0][1].$set).toEqual({
      slaDueAt: null,
    });
  });

  it('AC3 — a customer reply does not touch the SLA', async () => {
    mockFindByIdAndUpdate.mockReturnValue({
      lean: vi.fn().mockResolvedValue({ _id: 't1', userId: null, replies: [] }),
    });
    const s = await svc();
    await s.addReply({
      ticketId: 't1',
      body: 'thanks',
      authorRole: 'customer',
      authorUserId: null,
    });
    expect(mockFindByIdAndUpdate.mock.calls[0][1].$set).toBeUndefined();
  });

  it('AC3 — resolving or closing a ticket clears the SLA and stamps resolvedAt', async () => {
    mockFindByIdAndUpdate.mockReturnValue({
      lean: vi.fn().mockResolvedValue({}),
    });
    const s = await svc();
    await s.updateStatus('t1', 'resolved');
    const set = mockFindByIdAndUpdate.mock.calls[0][1].$set;
    expect(set.slaDueAt).toBeNull();
    expect(set.resolvedAt).toBeInstanceOf(Date);
    await s.updateStatus('t1', 'closed');
    expect(mockFindByIdAndUpdate.mock.calls[1][1].$set.resolvedAt).toBeNull();
  });
});

describe('REQ-118 AC3: queue ordering and overdue flag', () => {
  it('AC3 — listTickets sorts tickets with a running SLA first, soonest due first', async () => {
    const { default: Model } = await import('@/models/support-ticket-model');
    const aggregate = Model.aggregate as unknown as ReturnType<typeof vi.fn>;
    aggregate.mockClear();
    const s = await svc();
    await s.listTickets({ status: 'open' });
    const pipeline = aggregate.mock.calls[0][0] as Array<
      Record<string, unknown>
    >;
    const addFields = pipeline.find((p) => '$addFields' in p) as any;
    expect(addFields.$addFields._slaSort.$ifNull[0]).toBe('$slaDueAt');
    expect(pipeline.find((p) => '$sort' in p)).toEqual({
      $sort: { _slaSort: 1, createdAt: -1 },
    });
  });

  const now = Date.parse('2026-11-05T12:00:00Z');
  it('AC3 — isSlaOverdue flags an active ticket past its SLA', () => {
    expect(
      isSlaOverdue({ status: 'open', slaDueAt: new Date(now - 60_000) }, now)
    ).toBe(true);
    expect(
      isSlaOverdue({ status: 'in_progress', slaDueAt: new Date(now - 1) }, now)
    ).toBe(true);
  });
  it('AC3 — not overdue before the SLA, without one, or once finished', () => {
    expect(
      isSlaOverdue({ status: 'open', slaDueAt: new Date(now + 60_000) }, now)
    ).toBe(false);
    expect(isSlaOverdue({ status: 'open', slaDueAt: null }, now)).toBe(false);
    expect(
      isSlaOverdue(
        { status: 'resolved', slaDueAt: new Date(now - 60_000) },
        now
      )
    ).toBe(false);
    expect(
      isSlaOverdue({ status: 'closed', slaDueAt: new Date(now - 60_000) }, now)
    ).toBe(false);
  });
});
