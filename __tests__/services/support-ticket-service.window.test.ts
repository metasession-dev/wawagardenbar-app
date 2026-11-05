/**
 * @requirement REQ-118 (AC2, REQ-WA-012) — a staff reply goes out free-form
 * inside the customer's 24-hour window and as the support_reply template
 * outside it; the mode is decided on the server.
 */
import { getReplyMode, REPLY_MODE_LABEL } from '@/lib/support-reply-mode';
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

const TICKET = {
  _id: 't1',
  ticketNumber: 'TKT-99',
  userId: 'user-5',
  customerEmail: 'c@d.com',
  customerPhone: '2348012345678',
  subject: 'Late order',
  category: 'order-issue',
  lastCustomerMessageAt: null,
};

function replying() {
  mockFindByIdAndUpdate.mockReturnValue({
    lean: vi.fn().mockResolvedValue(TICKET),
  });
}

async function reply() {
  const s = await svc();
  return s.addReply({
    ticketId: 't1',
    body: 'We are on it',
    authorRole: 'staff',
    authorUserId: 'staff-1',
  });
}

describe('REQ-118 AC2: getReplyMode (pure)', () => {
  const now = Date.parse('2026-11-05T12:00:00Z');
  it('AC2 — free-form within 24 hours', () => {
    expect(getReplyMode(new Date(now - HOUR), now)).toBe('free_form');
    expect(getReplyMode(new Date(now - 23.9 * HOUR), now)).toBe('free_form');
  });
  it('AC2 — template at and beyond 24 hours', () => {
    expect(getReplyMode(new Date(now - 24 * HOUR), now)).toBe('template');
    expect(getReplyMode(new Date(now - 48 * HOUR), now)).toBe('template');
  });
  it('AC2 — template when the customer never messaged or the date is invalid', () => {
    expect(getReplyMode(null, now)).toBe('template');
    expect(getReplyMode('not-a-date', now)).toBe('template');
  });
  it('AC2 — the label tells staff which mode they are in', () => {
    expect(REPLY_MODE_LABEL.free_form).toBe('Free message');
    expect(REPLY_MODE_LABEL.template).toMatch(/Template message/);
    expect(REPLY_MODE_LABEL.template).toMatch(/24h/);
  });
});

describe('REQ-118 AC2: addReply', () => {
  it('AC2 [US-B4.1] — the customer messaged an hour ago: a free-form text is sent', async () => {
    replying();
    lastInbound(new Date(Date.now() - HOUR));
    await reply();
    const sent = mockSend.mock.calls[0][0];
    expect(sent.templateKey).toBe('support_reply');
    expect(sent.whatsapp.freeFormText).toBe('We are on it');
  });

  it('AC2 [US-B4.2] — the customer last messaged two days ago: the template is sent with its parameters', async () => {
    replying();
    lastInbound(new Date(Date.now() - 48 * HOUR));
    await reply();
    const sent = mockSend.mock.calls[0][0];
    expect(sent.whatsapp.freeFormText).toBeUndefined();
    expect(sent.whatsapp.headerParams).toEqual(['TKT-99']);
    expect(sent.whatsapp.params).toEqual(['Ada', 'Late order', 'We are on it']);
  });

  it("AC2 — with no inbound row the ticket's own lastCustomerMessageAt is the fallback", async () => {
    mockFindByIdAndUpdate.mockReturnValue({
      lean: vi.fn().mockResolvedValue({
        ...TICKET,
        lastCustomerMessageAt: new Date(Date.now() - 2 * HOUR),
      }),
    });
    lastInbound(null);
    await reply();
    expect(mockSend.mock.calls[0][0].whatsapp.freeFormText).toBe(
      'We are on it'
    );
  });

  it('AC2 — the lookup uses the phone in every stored form', async () => {
    replying();
    await reply();
    const filter = mockIncomingFindOne.mock.calls[0][0];
    expect(filter.from.$in).toEqual(
      expect.arrayContaining(['2348012345678', '+2348012345678'])
    );
  });

  it('AC2 — a ticket with no phone (web) falls back to the template path', async () => {
    mockFindByIdAndUpdate.mockReturnValue({
      lean: vi.fn().mockResolvedValue({ ...TICKET, customerPhone: null }),
    });
    await reply();
    expect(mockIncomingFindOne).not.toHaveBeenCalled();
    expect(mockSend.mock.calls[0][0].whatsapp.freeFormText).toBeUndefined();
  });

  it('AC2 — getReplyMode returns the mode and the last inbound time', async () => {
    const at = new Date(Date.now() - 3 * HOUR);
    lastInbound(at);
    const s = await svc();
    expect(await s.getReplyMode({ customerPhone: '2348012345678' })).toEqual({
      mode: 'free_form',
      lastInboundAt: at,
    });
  });
});
