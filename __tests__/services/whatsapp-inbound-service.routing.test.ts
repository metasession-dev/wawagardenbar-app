/**
 * @requirement REQ-056 — WhatsApp inbound-message router
 *
 * Router orchestration coverage: state × intent → action matrix, STOP
 * compliance persistence, auto-User-create for new phones, safety
 * (persistence + outbound failures swallowed).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/mongodb', () => ({
  default: vi.fn(),
  connectDB: vi.fn(),
}));

const mockFindOne = vi.fn();
const mockCreate = vi.fn();
const mockUpdateOne = vi.fn();

vi.mock('@/models', () => ({
  UserModel: {
    findOne: (...args: unknown[]) => mockFindOne(...args),
    create: (...args: unknown[]) => mockCreate(...args),
    updateOne: (...args: unknown[]) => mockUpdateOne(...args),
  },
}));

const mockIncomingMessageCreate = vi.fn();

vi.mock('@/models/incoming-message-model', () => ({
  default: {
    create: (...args: unknown[]) => mockIncomingMessageCreate(...args),
  },
}));

const mockNotificationSend = vi.fn();

vi.mock('@/services/notification-service', () => ({
  NotificationService: {
    send: (...args: unknown[]) => mockNotificationSend(...args),
  },
}));

const mockSendTextMessage = vi.fn();

vi.mock('@/lib/whatsapp', () => ({
  WhatsAppService: {
    sendTextMessage: (...args: unknown[]) => mockSendTextMessage(...args),
  },
}));

// REQ-064 — the inbound router now lazy-imports SupportTicketService to
// auto-create tickets on the support branch. Mock it so AC4 (and any other
// support-branch test) doesn't await a real Mongo write.
const mockTicketFromInbound = vi.fn();
vi.mock('@/services/support-ticket-service', () => ({
  SupportTicketService: {
    createFromWhatsAppInbound: (...a: unknown[]) => mockTicketFromInbound(...a),
  },
}));

const PHONE = '+2348012345678';

const ACTIVE_USER = {
  _id: { toString: () => '65a1b2c3d4e5f6a7b8c9d0aa' },
  phone: PHONE,
  phoneVerified: true,
  lastLoginAt: new Date(),
  accountStatus: 'active',
};

const SIGNING_UP_USER = {
  _id: { toString: () => '65a1b2c3d4e5f6a7b8c9d0cc' },
  phone: PHONE,
  phoneVerified: false,
  lastLoginAt: undefined,
  accountStatus: 'active',
};

const DORMANT_USER = {
  _id: { toString: () => '65a1b2c3d4e5f6a7b8c9d0bb' },
  phone: PHONE,
  phoneVerified: true,
  lastLoginAt: new Date(Date.now() - 31 * 24 * 60 * 60 * 1000),
  accountStatus: 'active',
};

const NEW_USER_CREATED = {
  _id: { toString: () => '65a1b2c3d4e5f6a7b8c9d0ee' },
  phone: PHONE,
  phoneVerified: false,
  accountStatus: 'active',
};

import type { MetaInboundMessage } from '@/services/whatsapp-inbound-service';

function inboundText(body: string, messageId = 'wamid.r1'): MetaInboundMessage {
  return { from: '2348012345678', id: messageId, type: 'text', text: { body } };
}

function inboundButton(
  id: string,
  title: string,
  messageId = 'wamid.r2'
): MetaInboundMessage {
  return {
    from: '2348012345678',
    id: messageId,
    type: 'interactive',
    interactive: { type: 'button_reply', button_reply: { id, title } },
  };
}

beforeEach(() => {
  mockFindOne.mockReset();
  mockCreate.mockReset();
  mockUpdateOne.mockReset();
  mockIncomingMessageCreate.mockReset();
  mockNotificationSend.mockReset();
  mockSendTextMessage.mockReset();

  mockNotificationSend.mockResolvedValue({
    sentVia: 'whatsapp',
    success: true,
    attempts: [],
  });
  mockSendTextMessage.mockResolvedValue({ success: true });
  mockIncomingMessageCreate.mockResolvedValue({
    _id: { toString: () => 'inbound-1' },
  });
  mockUpdateOne.mockResolvedValue({ acknowledged: true, modifiedCount: 1 });
  mockCreate.mockResolvedValue(NEW_USER_CREATED);
});

describe('REQ-056 WhatsAppInboundService.handle — routing matrix', () => {
  it('AC4 — new + support_text → auto-create User, send welcome_new_user', async () => {
    mockFindOne.mockResolvedValue(null);
    const { WhatsAppInboundService } = await import(
      '@/services/whatsapp-inbound-service'
    );
    const result = await WhatsAppInboundService.handle(
      inboundText('hello'),
      {}
    );
    expect(mockCreate).toHaveBeenCalledTimes(1);
    expect(mockNotificationSend).toHaveBeenCalledTimes(1);
    expect(mockNotificationSend.mock.calls[0][0]).toMatchObject({
      templateKey: 'welcome_new_user',
    });
    expect(result).toBe('sent_welcome_new_user');
  });

  it('AC4 — signing_up + support_text → no auto-create, sends welcome_new_user', async () => {
    mockFindOne.mockResolvedValue(SIGNING_UP_USER);
    const { WhatsAppInboundService } = await import(
      '@/services/whatsapp-inbound-service'
    );
    await WhatsAppInboundService.handle(inboundText('hi'), {});
    expect(mockCreate).not.toHaveBeenCalled();
    expect(mockNotificationSend.mock.calls[0][0]).toMatchObject({
      templateKey: 'welcome_new_user',
    });
  });

  it('AC4 — active + support_text → REQ-064: auto-creates SupportTicket and tags ticketed', async () => {
    mockFindOne.mockResolvedValue(ACTIVE_USER);
    mockTicketFromInbound.mockResolvedValue({
      _id: 't-1',
      ticketNumber: 'TKT-1',
    });
    const { WhatsAppInboundService } = await import(
      '@/services/whatsapp-inbound-service'
    );
    const result = await WhatsAppInboundService.handle(
      inboundText('whats my balance?'),
      {}
    );
    expect(mockNotificationSend).not.toHaveBeenCalled();
    expect(mockTicketFromInbound).toHaveBeenCalledTimes(1);
    expect(result).toBe('ticketed');
  });

  it('AC4 — dormant + chat_with_staff → sends welcome_back', async () => {
    mockFindOne.mockResolvedValue(DORMANT_USER);
    const { WhatsAppInboundService } = await import(
      '@/services/whatsapp-inbound-service'
    );
    await WhatsAppInboundService.handle(
      inboundButton('chat_with_staff', '💬 Chat with Staff'),
      {}
    );
    expect(mockNotificationSend.mock.calls[0][0]).toMatchObject({
      templateKey: 'welcome_back',
    });
  });

  it('AC5 — active + opt_out → persists both whatsapp flags = false; sends free-form confirm', async () => {
    mockFindOne.mockResolvedValue(ACTIVE_USER);
    const { WhatsAppInboundService } = await import(
      '@/services/whatsapp-inbound-service'
    );
    const result = await WhatsAppInboundService.handle(inboundText('STOP'), {});
    expect(mockUpdateOne).toHaveBeenCalledTimes(1);
    const filter = mockUpdateOne.mock.calls[0][0] as Record<string, unknown>;
    const update = mockUpdateOne.mock.calls[0][1] as {
      $set: Record<string, unknown>;
    };
    expect(filter._id).toBe(ACTIVE_USER._id);
    expect(
      update.$set['preferences.communicationPreferences.whatsappTransactional']
    ).toBe(false);
    expect(
      update.$set['preferences.communicationPreferences.whatsappMarketing']
    ).toBe(false);
    expect(mockSendTextMessage).toHaveBeenCalledTimes(1);
    expect(mockNotificationSend).not.toHaveBeenCalled();
    expect(result).toBe('persisted_opt_out');
  });

  it('AC5 — new + opt_out → auto-creates User, then persists opt-out flags on the new doc', async () => {
    mockFindOne.mockResolvedValue(null);
    const { WhatsAppInboundService } = await import(
      '@/services/whatsapp-inbound-service'
    );
    await WhatsAppInboundService.handle(inboundText('STOP'), {});
    expect(mockCreate).toHaveBeenCalledTimes(1);
    expect(mockUpdateOne).toHaveBeenCalledTimes(1);
    const filter = mockUpdateOne.mock.calls[0][0] as Record<string, unknown>;
    expect(filter._id).toBe(NEW_USER_CREATED._id);
  });

  it('AC5 — opt_out persists even when outbound free-form confirmation fails', async () => {
    mockFindOne.mockResolvedValue(ACTIVE_USER);
    mockSendTextMessage.mockResolvedValue({
      success: false,
      message: 'SERVICE_DISABLED',
    });
    const { WhatsAppInboundService } = await import(
      '@/services/whatsapp-inbound-service'
    );
    const result = await WhatsAppInboundService.handle(inboundText('STOP'), {});
    expect(mockUpdateOne).toHaveBeenCalledTimes(1);
    expect(result).toBe('persisted_opt_out');
  });

  it('AC6 — new state UserModel.create called with phone, phoneVerified false, isGuest false', async () => {
    mockFindOne.mockResolvedValue(null);
    const { WhatsAppInboundService } = await import(
      '@/services/whatsapp-inbound-service'
    );
    await WhatsAppInboundService.handle(inboundText('hi'), {});
    expect(mockCreate).toHaveBeenCalledTimes(1);
    const arg = mockCreate.mock.calls[0][0] as Record<string, unknown>;
    expect(arg.phone).toBeTruthy();
    expect(arg.phoneVerified).toBe(false);
    expect(arg.isGuest).toBe(false);
  });

  it('AC7 — IncomingMessage.create rejecting does not throw out of handle()', async () => {
    mockFindOne.mockResolvedValue(ACTIVE_USER);
    mockTicketFromInbound.mockResolvedValue({ _id: 't-2' });
    mockIncomingMessageCreate.mockRejectedValue(new Error('Mongo down'));
    const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const { WhatsAppInboundService } = await import(
      '@/services/whatsapp-inbound-service'
    );
    await expect(
      WhatsAppInboundService.handle(inboundText('hello'), {})
    ).resolves.not.toThrow();
    spy.mockRestore();
  });

  it('AC7 — NotificationService.send rejecting does not throw out of handle()', async () => {
    mockFindOne.mockResolvedValue(SIGNING_UP_USER);
    mockNotificationSend.mockRejectedValue(new Error('boom'));
    const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const { WhatsAppInboundService } = await import(
      '@/services/whatsapp-inbound-service'
    );
    await expect(
      WhatsAppInboundService.handle(inboundText('hi'), {})
    ).resolves.not.toThrow();
    spy.mockRestore();
  });
});
