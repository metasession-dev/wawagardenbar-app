/**
 * @requirement REQ-122 — AC8
 * @srs REQ-WA-015, REQ-WA-005
 *
 * A message from a verified staff alert number is not a customer: no welcome,
 * no ticket, no account. The only reply is the fixed thanks message.
 * US-B5.11.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/mongodb', () => ({
  default: vi.fn(),
  connectDB: vi.fn().mockResolvedValue(undefined),
}));

const mockFindOne = vi.fn();
const mockExists = vi.fn();
const mockCreateUser = vi.fn();
vi.mock('@/models', () => ({
  UserModel: {
    findOne: (...a: unknown[]) => mockFindOne(...a),
    exists: (...a: unknown[]) => mockExists(...a),
    updateOne: vi.fn(),
    create: (...a: unknown[]) => mockCreateUser(...a),
  },
  OrderModel: { findOne: vi.fn() },
}));

const mockIncomingCreate = vi.fn();
const mockIncomingUpdate = vi.fn();
vi.mock('@/models/incoming-message-model', () => ({
  default: {
    create: (...a: unknown[]) => mockIncomingCreate(...a),
    updateOne: (...a: unknown[]) => mockIncomingUpdate(...a),
  },
}));

const mockSend = vi.fn();
vi.mock('@/services/notification-service', () => ({
  NotificationService: { send: (...a: unknown[]) => mockSend(...a) },
}));

const mockSendText = vi.fn();
const mockSendMessage = vi.fn();
vi.mock('@/lib/whatsapp', () => ({
  WhatsAppService: {
    sendTextMessage: (...a: unknown[]) => mockSendText(...a),
    sendMessage: (...a: unknown[]) => mockSendMessage(...a),
  },
}));

const mockTicket = vi.fn();
vi.mock('@/services/support-ticket-service', () => ({
  SupportTicketService: {
    createFromWhatsAppInbound: (...a: unknown[]) => mockTicket(...a),
  },
}));
vi.mock('@/services/incident-event-service', () => ({
  IncidentEventService: { recordIncident: vi.fn() },
}));
vi.mock('@/services/settings-service', () => ({
  SettingsService: { getSettings: vi.fn().mockResolvedValue({}) },
}));

const USER = {
  _id: { toString: () => 'user-1' },
  phone: '+2348012345678',
  phoneVerified: true,
  lastLoginAt: new Date(),
  accountStatus: 'active',
};

const text = (body: string, id = 'wamid.1', from = '2348099990000') => ({
  from,
  id,
  type: 'text',
  text: { body },
});

async function svc() {
  return import('@/services/whatsapp-inbound-service');
}

beforeEach(async () => {
  for (const m of [
    mockFindOne,
    mockExists,
    mockCreateUser,
    mockIncomingCreate,
    mockIncomingUpdate,
    mockSend,
    mockSendText,
    mockSendMessage,
    mockTicket,
  ]) {
    m.mockReset();
  }
  mockFindOne.mockResolvedValue(USER);
  mockIncomingCreate.mockResolvedValue({});
  mockIncomingUpdate.mockResolvedValue({});
  mockSendText.mockResolvedValue({ success: true });
  mockTicket.mockResolvedValue({ _id: 't' });
  const mod = await svc();
  mod.resetRateLimits();
  mod.retryConfig.sleep = vi.fn().mockResolvedValue(undefined);
});

describe('AC8: verified staff numbers are not customers', () => {
  it('[US-B5.11] sends only the fixed reply and creates no ticket, welcome or account', async () => {
    mockExists.mockResolvedValue({ _id: 'staff-1' });
    const { WhatsAppInboundService, STAFF_NUMBER_REPLY_TEXT } = await svc();
    const result = await WhatsAppInboundService.handle(
      text('Hello, is anyone there?'),
      {}
    );

    expect(result).toBe('staff_number');
    expect(mockSendText).toHaveBeenCalledTimes(1);
    expect(mockSendText).toHaveBeenCalledWith(
      '2348099990000',
      STAFF_NUMBER_REPLY_TEXT
    );
    expect(STAFF_NUMBER_REPLY_TEXT).toBe(
      'Thanks, please open the dashboard to handle alerts.'
    );
    expect(mockTicket).not.toHaveBeenCalled();
    expect(mockSendMessage).not.toHaveBeenCalled();
    expect(mockSend).not.toHaveBeenCalled();
    expect(mockCreateUser).not.toHaveBeenCalled();
    expect(mockFindOne).not.toHaveBeenCalled();
    expect(mockIncomingUpdate.mock.calls[0][1].$set).toMatchObject({
      actionTaken: 'staff_number_ack',
      userId: null,
    });
  });

  it('only a verified number of a staff account counts', async () => {
    mockExists.mockResolvedValue({ _id: 'staff-1' });
    const { WhatsAppInboundService } = await svc();
    await WhatsAppInboundService.handle(text('hi'), {});
    const query = mockExists.mock.calls[0][0];
    expect(query.alertPhoneVerified).toBe(true);
    expect(query.roles.$in).toEqual(
      expect.arrayContaining([
        'csr',
        'kitchen',
        'manager',
        'admin',
        'super-admin',
      ])
    );
    expect(query.alertPhone.$in).toEqual(
      expect.arrayContaining(['+2348099990000'])
    );
  });

  it('a number that is not a verified staff number is routed as a customer', async () => {
    mockExists.mockResolvedValue(null);
    const { WhatsAppInboundService } = await svc();
    const result = await WhatsAppInboundService.handle(
      text('my order is late'),
      {}
    );
    expect(result).not.toBe('staff_number');
    expect(mockTicket).toHaveBeenCalledOnce();
  });

  it('a failed staff-number lookup falls back to customer routing instead of dropping the message', async () => {
    mockExists.mockRejectedValue(new Error('db down'));
    const { WhatsAppInboundService } = await svc();
    const result = await WhatsAppInboundService.handle(
      text('my order is late'),
      {}
    );
    expect(result).not.toBe('staff_number');
    expect(mockTicket).toHaveBeenCalledOnce();
  });

  it('a duplicate delivery still produces no reply (insert-first dedup comes first)', async () => {
    mockExists.mockResolvedValue({ _id: 'staff-1' });
    mockIncomingCreate.mockRejectedValue(
      Object.assign(new Error('dup'), { code: 11000 })
    );
    const { WhatsAppInboundService } = await svc();
    expect(await WhatsAppInboundService.handle(text('hi'), {})).toBe(
      'duplicate'
    );
    expect(mockSendText).not.toHaveBeenCalled();
  });
});
