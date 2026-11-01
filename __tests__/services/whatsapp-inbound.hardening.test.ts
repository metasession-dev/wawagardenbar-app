/**
 * @requirement REQ-116 — inbound hardening: insert-first dedup (AC4), STOP /
 * START consent (AC6), per-phone rate limit (AC7), outbound retry + Incident
 * (AC8).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/mongodb', () => ({
  default: vi.fn(),
  connectDB: vi.fn().mockResolvedValue(undefined),
}));

const mockFindOne = vi.fn();
const mockUpdateOne = vi.fn();
vi.mock('@/models', () => ({
  UserModel: {
    findOne: (...a: unknown[]) => mockFindOne(...a),
    updateOne: (...a: unknown[]) => mockUpdateOne(...a),
    create: vi.fn(),
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

vi.mock('@/services/notification-service', () => ({
  NotificationService: { send: vi.fn() },
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

const mockRecordIncident = vi.fn();
vi.mock('@/services/incident-event-service', () => ({
  IncidentEventService: {
    recordIncident: (...a: unknown[]) => mockRecordIncident(...a),
  },
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

const text = (body: string, id = 'wamid.1', from = '2348012345678') => ({
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
    mockUpdateOne,
    mockIncomingCreate,
    mockIncomingUpdate,
    mockSendText,
    mockSendMessage,
    mockTicket,
    mockRecordIncident,
  ]) {
    m.mockReset();
  }
  mockFindOne.mockResolvedValue(USER);
  mockUpdateOne.mockResolvedValue({});
  mockIncomingCreate.mockResolvedValue({});
  mockIncomingUpdate.mockResolvedValue({});
  mockSendText.mockResolvedValue({ success: true });
  mockTicket.mockResolvedValue({ _id: 't' });
  const mod = await svc();
  mod.resetRateLimits();
  mod.retryConfig.sleep = vi.fn().mockResolvedValue(undefined);
});

describe('REQ-116 AC4 insert-first idempotency', () => {
  it('AC4 — inserts the row before any side effect', async () => {
    const { WhatsAppInboundService } = await svc();
    await WhatsAppInboundService.handle(text('my order is late'), {});
    const insertOrder = mockIncomingCreate.mock.invocationCallOrder[0];
    expect(insertOrder).toBeLessThan(mockFindOne.mock.invocationCallOrder[0]);
    expect(insertOrder).toBeLessThan(mockTicket.mock.invocationCallOrder[0]);
  });

  it('AC4 — a duplicate wamid (E11000) causes no ticket, send or consent write', async () => {
    mockIncomingCreate.mockRejectedValue(
      Object.assign(new Error('dup'), { code: 11000 })
    );
    const { WhatsAppInboundService } = await svc();
    const result = await WhatsAppInboundService.handle(text('STOP'), {});
    expect(result).toBe('duplicate');
    expect(mockTicket).not.toHaveBeenCalled();
    expect(mockSendText).not.toHaveBeenCalled();
    expect(mockUpdateOne).not.toHaveBeenCalled();
    expect(mockFindOne).not.toHaveBeenCalled();
  });
});

describe('REQ-116 AC6 STOP / START', () => {
  it('AC6 — STOP sets marketing=false and does not touch transactional', async () => {
    const { WhatsAppInboundService } = await svc();
    const result = await WhatsAppInboundService.handle(text('STOP'), {});
    const set = mockUpdateOne.mock.calls[0][1].$set;
    expect(set['preferences.communicationPreferences.whatsappMarketing']).toBe(
      false
    );
    expect(
      'preferences.communicationPreferences.whatsappTransactional' in set
    ).toBe(false);
    expect(mockSendText.mock.calls[0][1]).toMatch(/orders and bookings/);
    expect(result).toBe('persisted_opt_out');
  });

  it.each(['START', 'subscribe', 'Opt-in', ' start '])(
    'AC6 — %s sets marketing=true, stamps the timestamp and source',
    async (word) => {
      const { WhatsAppInboundService } = await svc();
      const result = await WhatsAppInboundService.handle(text(word), {});
      const set = mockUpdateOne.mock.calls[0][1].$set;
      expect(
        set['preferences.communicationPreferences.whatsappMarketing']
      ).toBe(true);
      expect(
        set['preferences.communicationPreferencesUpdatedAt']
      ).toBeInstanceOf(Date);
      expect(set['preferences.communicationPreferencesSource']).toBe(
        'whatsapp_inbound'
      );
      expect(mockSendText.mock.calls[0][1]).toMatch(/subscribed/);
      expect(result).toBe('persisted_opt_in');
    }
  );

  it('AC6 — a sentence containing start is not an opt-in', async () => {
    const { WhatsAppInboundService } = await svc();
    expect(
      WhatsAppInboundService.classifyMessageIntent(text('when do you start'))
    ).toBe('support_text');
  });
});

describe('REQ-116 AC7 per-phone rate limit', () => {
  it('AC7 — the 21st message in the window is stored with no side effect', async () => {
    const { WhatsAppInboundService } = await svc();
    for (let i = 1; i <= 20; i++) {
      await WhatsAppInboundService.handle(text('hi', `wamid.${i}`), {});
    }
    expect(mockTicket).toHaveBeenCalledTimes(20);
    const result = await WhatsAppInboundService.handle(
      text('hi', 'wamid.21'),
      {}
    );
    expect(result).toBe('rate_limited');
    expect(mockTicket).toHaveBeenCalledTimes(20);
    expect(mockIncomingCreate).toHaveBeenCalledTimes(21);
    expect(mockIncomingUpdate.mock.calls.at(-1)?.[1].$set.actionTaken).toBe(
      'rate_limited'
    );
  });

  it('AC7 — the window slides and other phones are unaffected', async () => {
    const { isRateLimited, RATE_LIMIT_MAX, RATE_LIMIT_WINDOW_MS } = await svc();
    for (let i = 0; i < RATE_LIMIT_MAX; i++) isRateLimited('a', 1000);
    expect(isRateLimited('a', 1001)).toBe(true);
    expect(isRateLimited('b', 1001)).toBe(false);
    expect(isRateLimited('a', 1001 + RATE_LIMIT_WINDOW_MS + 1)).toBe(false);
  });

  it('AC7 — STOP is honoured even when the phone is over its limit', async () => {
    const { WhatsAppInboundService, isRateLimited } = await svc();
    for (let i = 0; i < 25; i++) isRateLimited('2348012345678');
    await WhatsAppInboundService.handle(text('STOP'), {});
    expect(mockUpdateOne).toHaveBeenCalledTimes(1);
  });
});

describe('REQ-116 AC8 outbound retry', () => {
  it('AC8 — retries 3 times with 1s/5s/30s then records an Incident', async () => {
    mockSendText.mockResolvedValue({ success: false, errorCode: 'API_ERROR' });
    const mod = await svc();
    await mod.WhatsAppInboundService.handle(text('STOP'), {});
    expect(mockSendText).toHaveBeenCalledTimes(4);
    expect(
      (mod.retryConfig.sleep as ReturnType<typeof vi.fn>).mock.calls.map(
        (c) => c[0]
      )
    ).toEqual([1000, 5000, 30000]);
    expect(mockRecordIncident).toHaveBeenCalledTimes(1);
    expect(mockRecordIncident.mock.calls[0][0]).toMatchObject({
      kind: 'notification_delivery_failed',
    });
  });

  it('AC8 — a transient failure that recovers raises no Incident', async () => {
    mockSendText
      .mockResolvedValueOnce({ success: false, errorCode: 'QUOTA_EXCEEDED' })
      .mockResolvedValueOnce({ success: true });
    const { WhatsAppInboundService } = await svc();
    await WhatsAppInboundService.handle(text('STOP'), {});
    expect(mockSendText).toHaveBeenCalledTimes(2);
    expect(mockRecordIncident).not.toHaveBeenCalled();
  });

  it('AC8 — a permanent failure is not retried', async () => {
    mockSendText.mockResolvedValue({
      success: false,
      errorCode: 'NOT_ON_WHATSAPP',
    });
    const { WhatsAppInboundService } = await svc();
    await WhatsAppInboundService.handle(text('STOP'), {});
    expect(mockSendText).toHaveBeenCalledTimes(1);
    expect(mockRecordIncident).not.toHaveBeenCalled();
  });
});
