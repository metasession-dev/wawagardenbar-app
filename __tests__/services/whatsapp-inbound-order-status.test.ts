/**
 * @requirement REQ-126 (AC1–AC6) — what the router does with an order request
 * and a status enquiry, in each customer state.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/mongodb', () => ({
  default: vi.fn(),
  connectDB: vi.fn().mockResolvedValue(undefined),
}));

const mockCreateFromInbound = vi.fn();
vi.mock('@/services/support-ticket-service', () => ({
  SupportTicketService: {
    createFromWhatsAppInbound: (...a: unknown[]) => mockCreateFromInbound(...a),
  },
}));

const mockNotificationSend = vi.fn();
vi.mock('@/services/notification-service', () => ({
  NotificationService: {
    send: (...a: unknown[]) => mockNotificationSend(...a),
  },
}));

const mockSendText = vi.fn();
vi.mock('@/lib/whatsapp', () => ({
  WhatsAppService: { sendTextMessage: (...a: unknown[]) => mockSendText(...a) },
}));

const mockUserFindOne = vi.fn();
const mockUserCreate = vi.fn();
const mockUserUpdate = vi.fn();
const mockUserExists = vi.fn();
vi.mock('@/models', () => ({
  UserModel: {
    findOne: (...a: unknown[]) => mockUserFindOne(...a),
    create: (...a: unknown[]) => mockUserCreate(...a),
    updateOne: (...a: unknown[]) => mockUserUpdate(...a),
    exists: (...a: unknown[]) => mockUserExists(...a),
  },
  OrderModel: { findOne: vi.fn() },
}));

const mockIncomingCreate = vi.fn();
const mockIncomingUpdate = vi.fn();
vi.mock('@/models/incoming-message-model', async () => {
  const actual: typeof import('@/models/incoming-message-model') =
    await vi.importActual('@/models/incoming-message-model');
  return {
    ...actual,
    default: {
      create: (...a: unknown[]) => mockIncomingCreate(...a),
      updateOne: (...a: unknown[]) => mockIncomingUpdate(...a),
    },
  };
});

const ACTIVE = {
  _id: { toString: () => 'user-1' },
  phone: '+2348011112222',
  phoneVerified: true,
  lastLoginAt: new Date(),
};
const DORMANT = {
  ...ACTIVE,
  lastLoginAt: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000),
};

let n = 0;
const msg = (body: string) => ({
  from: '+2348011112222',
  id: `wamid.${++n}`,
  type: 'text' as const,
  text: { body },
});

async function handle(body: string) {
  const { WhatsAppInboundService, resetRateLimits } = await import(
    '@/services/whatsapp-inbound-service'
  );
  resetRateLimits();
  return WhatsAppInboundService.handle(msg(body) as never, {});
}

beforeEach(() => {
  vi.stubEnv('NEXT_PUBLIC_APP_URL', 'https://app.wawagardenbar.com');
  mockCreateFromInbound
    .mockReset()
    .mockResolvedValue({ ticketNumber: 'TKT-1' });
  mockNotificationSend.mockReset();
  mockSendText.mockReset().mockResolvedValue({ success: true });
  mockUserFindOne.mockReset().mockResolvedValue(ACTIVE);
  mockUserCreate
    .mockReset()
    .mockResolvedValue({ _id: { toString: () => 'new-1' } });
  mockUserUpdate.mockReset();
  mockUserExists.mockReset().mockResolvedValue(null);
  mockIncomingCreate.mockReset().mockResolvedValue({});
  mockIncomingUpdate.mockReset().mockResolvedValue({});
});

describe('order request (AC1)', () => {
  it.each([
    ['active', ACTIVE],
    ['dormant', DORMANT],
    ['new', null],
  ])('%s customer: menu link sent, no ticket, no welcome', async (_s, user) => {
    mockUserFindOne.mockResolvedValue(user);
    const action = await handle('order');
    expect(mockSendText).toHaveBeenCalledTimes(1);
    expect(mockSendText.mock.calls[0][1]).toContain(
      'https://app.wawagardenbar.com/menu'
    );
    expect(mockCreateFromInbound).not.toHaveBeenCalled();
    expect(mockNotificationSend).not.toHaveBeenCalled();
    expect(action).toBe('order_link_sent');
  });

  it('records the order_start intent on the audit row', async () => {
    await handle('menu please');
    expect(mockIncomingCreate.mock.calls[0][0]).toMatchObject({
      classifiedIntent: 'order_start',
    });
  });

  it('an opted-out customer still gets the reply (STOP clears marketing only)', async () => {
    mockUserFindOne.mockResolvedValue({
      ...ACTIVE,
      preferences: { communicationPreferences: { whatsappMarketing: false } },
    });
    await handle('order');
    expect(mockSendText).toHaveBeenCalledTimes(1);
  });
});

describe('status enquiry (AC2, AC3, AC6)', () => {
  it.each(['status', 'where is my order', 'WG2611250001'])(
    '"%s" raises an urgent ticket tagged order_status and sends only the acknowledgement',
    async (body) => {
      const action = await handle(body);
      expect(mockCreateFromInbound).toHaveBeenCalledTimes(1);
      expect(mockCreateFromInbound.mock.calls[0][0]).toMatchObject({
        urgent: true,
        kind: 'order_status',
        userId: 'user-1',
      });
      expect(mockSendText).toHaveBeenCalledTimes(1);
      const reply = mockSendText.mock.calls[0][1] as string;
      expect(reply).toMatch(/team will message you shortly/);
      // No order data by text: nothing order-like, no link, no number.
      expect(reply).not.toMatch(
        /WG\d{10}|https?:\/\/|₦|preparing|ready|delivered/i
      );
      expect(action).toBe('order_status_ticketed');
    }
  );

  it("another customer's order number gets the same reply and echoes nothing", async () => {
    await handle('WG2611259999');
    const reply = mockSendText.mock.calls[0][1] as string;
    expect(reply).not.toContain('WG2611259999');
    expect(mockNotificationSend).not.toHaveBeenCalled();
  });

  it('works in every state, including a new customer', async () => {
    mockUserFindOne.mockResolvedValue(null);
    await handle('status');
    expect(mockCreateFromInbound).toHaveBeenCalledTimes(1);
    expect(mockNotificationSend).not.toHaveBeenCalled();
  });

  it('a ticket-create failure still sends the acknowledgement and queues for staff', async () => {
    mockCreateFromInbound.mockRejectedValue(new Error('db boom'));
    const action = await handle('status');
    expect(mockSendText).toHaveBeenCalledTimes(1);
    expect(action).toBe('queued_for_staff');
  });

  it('ordinary support text is unchanged (ordinary ticket, not urgent)', async () => {
    await handle('My delivery was cold');
    expect(mockCreateFromInbound.mock.calls[0][0]).toMatchObject({
      urgent: false,
    });
    expect(mockCreateFromInbound.mock.calls[0][0].kind).toBeUndefined();
    expect(mockSendText).not.toHaveBeenCalled();
  });
});
