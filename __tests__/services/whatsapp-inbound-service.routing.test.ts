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
const mockOrderFindOne = vi.fn();
const mockOrderSelect = vi.fn();

vi.mock('@/models', () => ({
  UserModel: {
    findOne: (...args: unknown[]) => mockFindOne(...args),
    create: (...args: unknown[]) => mockCreate(...args),
    updateOne: (...args: unknown[]) => mockUpdateOne(...args),
  },
  OrderModel: {
    findOne: (...args: unknown[]) => mockOrderFindOne(...args),
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
const mockSendMessage = vi.fn();

vi.mock('@/lib/whatsapp', () => ({
  WhatsAppService: {
    sendTextMessage: (...args: unknown[]) => mockSendTextMessage(...args),
    sendMessage: (...args: unknown[]) => mockSendMessage(...args),
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

const OPEN_ALL_DAY = { open: '09:00', close: '22:00', closed: false };
vi.mock('@/services/settings-service', () => ({
  SettingsService: {
    getSettings: vi.fn().mockResolvedValue({
      businessHours: {
        monday: OPEN_ALL_DAY,
        tuesday: OPEN_ALL_DAY,
        wednesday: OPEN_ALL_DAY,
        thursday: OPEN_ALL_DAY,
        friday: OPEN_ALL_DAY,
        saturday: OPEN_ALL_DAY,
        sunday: OPEN_ALL_DAY,
      },
    }),
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

const MISMATCHED_ACCOUNT = {
  _id: { toString: () => '65a1b2c3d4e5f6a7b8c9d0ff' },
  phone: '+2348099998888', // different from PHONE (the inbound sender)
  email: 'customer@example.com',
  preferences: { communicationPreferences: { whatsappTransactional: true } },
  accountStatus: 'active',
};

beforeEach(() => {
  mockFindOne.mockReset();
  mockCreate.mockReset();
  mockUpdateOne.mockReset();
  mockIncomingMessageCreate.mockReset();
  mockNotificationSend.mockReset();
  mockSendTextMessage.mockReset();
  mockSendMessage.mockReset();
  mockOrderFindOne.mockReset();
  mockOrderSelect.mockReset();

  mockNotificationSend.mockResolvedValue({
    sentVia: 'whatsapp',
    success: true,
    attempts: [],
  });
  mockSendTextMessage.mockResolvedValue({ success: true });
  mockSendMessage.mockResolvedValue({ success: true });
  mockIncomingMessageCreate.mockResolvedValue({
    _id: { toString: () => 'inbound-1' },
  });
  mockUpdateOne.mockResolvedValue({ acknowledged: true, modifiedCount: 1 });
  mockCreate.mockResolvedValue(NEW_USER_CREATED);
  mockOrderFindOne.mockReturnValue({ select: mockOrderSelect });
  mockOrderSelect.mockResolvedValue(null);
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
    expect(result).toBe('welcome_new_user_sent');
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

describe('REQ-111 WhatsAppInboundService.handle — account_recovery routing', () => {
  it('AC1 — unrecognized phone + email in body matching a different account → account_recovery via WhatsAppService.sendMessage, not NotificationService.send', async () => {
    mockFindOne.mockReset();
    mockFindOne.mockResolvedValueOnce(null); // classifyCustomerState: no user on file
    mockFindOne.mockResolvedValueOnce(MISMATCHED_ACCOUNT); // detector: email match
    const { WhatsAppInboundService } = await import(
      '@/services/whatsapp-inbound-service'
    );
    const result = await WhatsAppInboundService.handle(
      inboundText("Hi it's customer@example.com, I lost my phone"),
      {}
    );
    expect(mockCreate).not.toHaveBeenCalled(); // auto-create skipped for phone_mismatch
    expect(mockNotificationSend).not.toHaveBeenCalled();
    expect(mockSendMessage).toHaveBeenCalledTimes(1);
    expect(mockSendMessage).toHaveBeenCalledWith(
      '2348012345678',
      'account_recovery',
      { bodyParams: ['8888'] }
    );
    expect(result).toBe('account_recovery_sent');
    const persisted = mockIncomingMessageCreate.mock.calls[0][0] as Record<
      string,
      unknown
    >;
    expect(persisted.classifiedState).toBe('phone_mismatch');
    expect(persisted.userId).toBe(MISMATCHED_ACCOUNT._id.toString());
  });

  it('AC2 — unrecognized phone + matching order number in body → same account_recovery outcome', async () => {
    mockFindOne.mockReset();
    mockFindOne.mockResolvedValueOnce(null); // classifyCustomerState
    mockOrderSelect.mockResolvedValue({ userId: MISMATCHED_ACCOUNT._id });
    mockFindOne.mockResolvedValueOnce(MISMATCHED_ACCOUNT); // order -> user lookup
    const { WhatsAppInboundService } = await import(
      '@/services/whatsapp-inbound-service'
    );
    const result = await WhatsAppInboundService.handle(
      inboundText('My order WG2610200001 never arrived'),
      {}
    );
    expect(result).toBe('account_recovery_sent');
    expect(mockSendMessage).toHaveBeenCalledWith(
      '2348012345678',
      'account_recovery',
      { bodyParams: ['8888'] }
    );
  });

  it('AC3 — resolved account has the SAME phone as the sender → not a mismatch, falls through to ordinary new-customer handling', async () => {
    const SAME_PHONE_ACCOUNT = {
      ...MISMATCHED_ACCOUNT,
      // REQ-115 — normalizePhone() canonicalises both sides to +234…, so a
      // stored number without the '+' is still recognised as the sender.
      phone: '2348012345678',
    };
    mockFindOne.mockReset();
    mockFindOne.mockResolvedValueOnce(null); // classifyCustomerState: no user on file
    mockFindOne.mockResolvedValueOnce(SAME_PHONE_ACCOUNT); // detector: email match, same phone
    const { WhatsAppInboundService } = await import(
      '@/services/whatsapp-inbound-service'
    );
    const result = await WhatsAppInboundService.handle(
      inboundText("Hi it's customer@example.com"),
      {}
    );
    expect(mockSendMessage).not.toHaveBeenCalled();
    expect(mockCreate).toHaveBeenCalledTimes(1); // ordinary auto-create still runs
    expect(mockNotificationSend.mock.calls[0][0]).toMatchObject({
      templateKey: 'welcome_new_user',
    });
    expect(result).toBe('welcome_new_user_sent');
    const persisted = mockIncomingMessageCreate.mock.calls[0][0] as Record<
      string,
      unknown
    >;
    expect(persisted.classifiedState).toBe('new');
  });

  it('AC4 — brand-new phone, no identifying signal in body → unchanged "new" behaviour (regression)', async () => {
    mockFindOne.mockResolvedValue(null);
    const { WhatsAppInboundService } = await import(
      '@/services/whatsapp-inbound-service'
    );
    const result = await WhatsAppInboundService.handle(inboundText('hi'), {});
    expect(mockSendMessage).not.toHaveBeenCalled();
    expect(mockCreate).toHaveBeenCalledTimes(1);
    expect(result).toBe('welcome_new_user_sent');
  });

  it('phone_mismatch send is skipped when the matched account has opted out of transactional WhatsApp', async () => {
    const OPTED_OUT_ACCOUNT = {
      ...MISMATCHED_ACCOUNT,
      preferences: {
        communicationPreferences: { whatsappTransactional: false },
      },
    };
    mockFindOne.mockReset();
    mockFindOne.mockResolvedValueOnce(null);
    mockFindOne.mockResolvedValueOnce(OPTED_OUT_ACCOUNT);
    const { WhatsAppInboundService } = await import(
      '@/services/whatsapp-inbound-service'
    );
    const result = await WhatsAppInboundService.handle(
      inboundText("Hi it's customer@example.com"),
      {}
    );
    expect(mockSendMessage).not.toHaveBeenCalled();
    expect(result).toBe('noop');
  });

  it('REQ-115 D8 — a resolved sendMessage failure is tagged account_recovery_failed:<errorCode>, not _sent', async () => {
    mockFindOne.mockReset();
    mockFindOne.mockResolvedValueOnce(null);
    mockFindOne.mockResolvedValueOnce(MISMATCHED_ACCOUNT);
    mockSendMessage.mockResolvedValue({
      success: false,
      errorCode: 'SERVICE_DISABLED',
    });
    const { WhatsAppInboundService } = await import(
      '@/services/whatsapp-inbound-service'
    );
    const result = await WhatsAppInboundService.handle(
      inboundText("Hi it's customer@example.com"),
      {}
    );
    expect(result).toBe('account_recovery_failed:SERVICE_DISABLED');
  });

  it('WhatsAppService.sendMessage throwing is tagged account_recovery_failed:EXCEPTION, does not throw out of handle()', async () => {
    mockFindOne.mockReset();
    mockFindOne.mockResolvedValueOnce(null);
    mockFindOne.mockResolvedValueOnce(MISMATCHED_ACCOUNT);
    mockSendMessage.mockRejectedValue(new Error('network error'));
    const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const { WhatsAppInboundService } = await import(
      '@/services/whatsapp-inbound-service'
    );
    const result = await WhatsAppInboundService.handle(
      inboundText("Hi it's customer@example.com"),
      {}
    );
    expect(result).toBe('account_recovery_failed:EXCEPTION');
    spy.mockRestore();
  });
});

describe('REQ-115 WhatsAppInboundService.handle — template params, outcomes, phone format', () => {
  it('[US-01.4] a failed welcome send ends actionTaken in _failed:<errorCode>', async () => {
    mockFindOne.mockResolvedValue(null);
    mockNotificationSend.mockResolvedValue({
      sentVia: 'none',
      success: false,
      attempts: [
        {
          channel: 'whatsapp',
          success: false,
          error: 'Template parameter count mismatch',
          errorCode: 'TEMPLATE_PARAM_ERROR',
        },
      ],
    });
    const { WhatsAppInboundService } = await import(
      '@/services/whatsapp-inbound-service'
    );
    const result = await WhatsAppInboundService.handle(
      inboundText('hello'),
      {}
    );
    expect(result).toBe('welcome_new_user_failed:TEMPLATE_PARAM_ERROR');
    expect(mockIncomingMessageCreate.mock.calls[0][0]).toMatchObject({
      actionTaken: 'welcome_new_user_failed:TEMPLATE_PARAM_ERROR',
    });
  });

  it('[US-01.4] a send that never reached WhatsApp (no consent / no phone) is _failed:NOT_SENT', async () => {
    mockFindOne.mockResolvedValue(null);
    mockNotificationSend.mockResolvedValue({
      sentVia: 'none',
      success: false,
      attempts: [],
    });
    const { WhatsAppInboundService } = await import(
      '@/services/whatsapp-inbound-service'
    );
    const result = await WhatsAppInboundService.handle(
      inboundText('hello'),
      {}
    );
    expect(result).toBe('welcome_new_user_failed:NOT_SENT');
  });

  it('[US-01.4] a throwing send is tagged _failed:EXCEPTION', async () => {
    mockFindOne.mockResolvedValue(null);
    mockNotificationSend.mockRejectedValue(new Error('boom'));
    const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const { WhatsAppInboundService } = await import(
      '@/services/whatsapp-inbound-service'
    );
    const result = await WhatsAppInboundService.handle(
      inboundText('hello'),
      {}
    );
    expect(result).toBe('welcome_new_user_failed:EXCEPTION');
    spy.mockRestore();
  });

  it('AC1 — welcome_new_user is sent with [opening time, closing time]', async () => {
    mockFindOne.mockResolvedValue(null);
    const { WhatsAppInboundService } = await import(
      '@/services/whatsapp-inbound-service'
    );
    await WhatsAppInboundService.handle(inboundText('hello'), {});
    expect(mockNotificationSend.mock.calls[0][0].whatsapp).toEqual({
      params: ['9:00 AM', '10:00 PM'],
    });
  });

  it('AC1 — welcome_back is sent with [first name]', async () => {
    mockFindOne.mockResolvedValue({ ...DORMANT_USER, firstName: 'Ada' });
    const { WhatsAppInboundService } = await import(
      '@/services/whatsapp-inbound-service'
    );
    await WhatsAppInboundService.handle(inboundText('hello'), {});
    expect(mockNotificationSend.mock.calls[0][0]).toMatchObject({
      templateKey: 'welcome_back',
      whatsapp: { params: ['Ada'] },
    });
  });

  it('AC1 — welcome_back falls back to "there" when the customer has no name', async () => {
    mockFindOne.mockResolvedValue(DORMANT_USER);
    const { WhatsAppInboundService } = await import(
      '@/services/whatsapp-inbound-service'
    );
    await WhatsAppInboundService.handle(inboundText('hello'), {});
    expect(mockNotificationSend.mock.calls[0][0].whatsapp).toEqual({
      params: ['there'],
    });
  });

  it('[US-01.5] the lookup matches the sender in every stored phone format', async () => {
    mockFindOne.mockResolvedValue(ACTIVE_USER);
    mockTicketFromInbound.mockResolvedValue({
      _id: 't-1',
      ticketNumber: 'TKT-1',
    });
    const { WhatsAppInboundService } = await import(
      '@/services/whatsapp-inbound-service'
    );
    await WhatsAppInboundService.handle(inboundText('hi'), {});
    const filter = mockFindOne.mock.calls[0][0];
    expect(filter.phone.$in).toEqual(
      expect.arrayContaining(['+2348012345678', '2348012345678', '08012345678'])
    );
    expect(mockCreate).not.toHaveBeenCalled(); // existing user, no duplicate
  });

  it('[US-01.5] an auto-created user is stored with the canonical phone', async () => {
    mockFindOne.mockResolvedValue(null);
    const { WhatsAppInboundService } = await import(
      '@/services/whatsapp-inbound-service'
    );
    await WhatsAppInboundService.handle(inboundText('hello'), {});
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({ phone: '+2348012345678' })
    );
  });
});
