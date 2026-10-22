/**
 * @requirement REQ-056 — WhatsApp inbound-message router
 *
 * Classifier coverage: customer state + message intent. Pure functions
 * (no DB writes) — state classifier reads UserModel, intent classifier
 * is fully payload-driven.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/mongodb', () => ({
  default: vi.fn(),
  connectDB: vi.fn(),
}));

const mockFindOne = vi.fn();
const mockOrderFindOne = vi.fn();
const mockOrderSelect = vi.fn();

vi.mock('@/models', () => ({
  UserModel: {
    findOne: (...args: unknown[]) => mockFindOne(...args),
    create: vi.fn(),
    updateOne: vi.fn(),
  },
  OrderModel: {
    findOne: (...args: unknown[]) => mockOrderFindOne(...args),
  },
}));

const ACTIVE_USER = {
  _id: { toString: () => '65a1b2c3d4e5f6a7b8c9d0aa' },
  phone: '+2348012345678',
  phoneVerified: true,
  lastLoginAt: new Date(),
  accountStatus: 'active',
};

const DORMANT_USER = {
  _id: { toString: () => '65a1b2c3d4e5f6a7b8c9d0bb' },
  phone: '+2348012345678',
  phoneVerified: true,
  lastLoginAt: new Date(Date.now() - 31 * 24 * 60 * 60 * 1000),
  accountStatus: 'active',
};

const SIGNING_UP_USER = {
  _id: { toString: () => '65a1b2c3d4e5f6a7b8c9d0cc' },
  phone: '+2348012345678',
  phoneVerified: false,
  lastLoginAt: undefined,
  accountStatus: 'active',
};

const DORMANT_NEVER_LOGGED_IN = {
  _id: { toString: () => '65a1b2c3d4e5f6a7b8c9d0dd' },
  phone: '+2348012345678',
  phoneVerified: true,
  lastLoginAt: undefined,
  accountStatus: 'active',
};

beforeEach(() => {
  mockFindOne.mockReset();
  mockOrderFindOne.mockReset();
  mockOrderSelect.mockReset();
  mockOrderFindOne.mockReturnValue({ select: mockOrderSelect });
});

describe('REQ-056 classifyCustomerState', () => {
  it('AC2 — no user → "new" with user: null', async () => {
    mockFindOne.mockResolvedValue(null);
    const { WhatsAppInboundService } = await import(
      '@/services/whatsapp-inbound-service'
    );
    const result =
      await WhatsAppInboundService.classifyCustomerState('+2348012345678');
    expect(result.state).toBe('new');
    expect(result.user).toBeNull();
  });

  it('AC2 — user with phoneVerified false → "signing_up"', async () => {
    mockFindOne.mockResolvedValue(SIGNING_UP_USER);
    const { WhatsAppInboundService } = await import(
      '@/services/whatsapp-inbound-service'
    );
    const result =
      await WhatsAppInboundService.classifyCustomerState('+2348012345678');
    expect(result.state).toBe('signing_up');
    expect(result.user).toBe(SIGNING_UP_USER);
  });

  it('AC2 — phoneVerified true + recent lastLoginAt → "active"', async () => {
    mockFindOne.mockResolvedValue(ACTIVE_USER);
    const { WhatsAppInboundService } = await import(
      '@/services/whatsapp-inbound-service'
    );
    const result =
      await WhatsAppInboundService.classifyCustomerState('+2348012345678');
    expect(result.state).toBe('active');
  });

  it('AC2 — phoneVerified true + lastLoginAt 31d ago → "dormant"', async () => {
    mockFindOne.mockResolvedValue(DORMANT_USER);
    const { WhatsAppInboundService } = await import(
      '@/services/whatsapp-inbound-service'
    );
    const result =
      await WhatsAppInboundService.classifyCustomerState('+2348012345678');
    expect(result.state).toBe('dormant');
  });

  it('AC2 — phoneVerified true + lastLoginAt undefined → "dormant"', async () => {
    mockFindOne.mockResolvedValue(DORMANT_NEVER_LOGGED_IN);
    const { WhatsAppInboundService } = await import(
      '@/services/whatsapp-inbound-service'
    );
    const result =
      await WhatsAppInboundService.classifyCustomerState('+2348012345678');
    expect(result.state).toBe('dormant');
  });

  it('AC2 — deleted-account users skipped (filter excludes deleted)', async () => {
    // findOne is expected to be called with accountStatus $ne 'deleted',
    // so a deleted user simply never returns — same path as "no user".
    mockFindOne.mockResolvedValue(null);
    const { WhatsAppInboundService } = await import(
      '@/services/whatsapp-inbound-service'
    );
    const result =
      await WhatsAppInboundService.classifyCustomerState('+2348012345678');
    expect(result.state).toBe('new');
    // Verify the filter actually excluded deleted accounts.
    expect(mockFindOne).toHaveBeenCalled();
    const filter = mockFindOne.mock.calls[0][0] as Record<string, unknown>;
    expect(filter.accountStatus).toEqual({ $ne: 'deleted' });
  });
});

describe('REQ-056 classifyMessageIntent', () => {
  it('AC3 — "STOP" → "opt_out"', async () => {
    const { WhatsAppInboundService } = await import(
      '@/services/whatsapp-inbound-service'
    );
    const intent = WhatsAppInboundService.classifyMessageIntent({
      type: 'text',
      text: { body: 'STOP' },
    });
    expect(intent).toBe('opt_out');
  });

  it('AC3 — "stop  " (whitespace + lowercase) → "opt_out"', async () => {
    const { WhatsAppInboundService } = await import(
      '@/services/whatsapp-inbound-service'
    );
    const intent = WhatsAppInboundService.classifyMessageIntent({
      type: 'text',
      text: { body: 'stop  ' },
    });
    expect(intent).toBe('opt_out');
  });

  it('AC3 — "unsubscribe" → "opt_out"', async () => {
    const { WhatsAppInboundService } = await import(
      '@/services/whatsapp-inbound-service'
    );
    const intent = WhatsAppInboundService.classifyMessageIntent({
      type: 'text',
      text: { body: 'unsubscribe' },
    });
    expect(intent).toBe('opt_out');
  });

  it('AC3 — "opt out" / "opt-out" → "opt_out"', async () => {
    const { WhatsAppInboundService } = await import(
      '@/services/whatsapp-inbound-service'
    );
    expect(
      WhatsAppInboundService.classifyMessageIntent({
        type: 'text',
        text: { body: 'opt out' },
      })
    ).toBe('opt_out');
    expect(
      WhatsAppInboundService.classifyMessageIntent({
        type: 'text',
        text: { body: 'opt-out' },
      })
    ).toBe('opt_out');
  });

  it('AC3 — text body "💬 Chat with Staff" → "chat_with_staff"', async () => {
    const { WhatsAppInboundService } = await import(
      '@/services/whatsapp-inbound-service'
    );
    const intent = WhatsAppInboundService.classifyMessageIntent({
      type: 'text',
      text: { body: '💬 Chat with Staff' },
    });
    expect(intent).toBe('chat_with_staff');
  });

  it('AC3 — interactive button_reply title "💬 Chat with Staff" → "chat_with_staff"', async () => {
    const { WhatsAppInboundService } = await import(
      '@/services/whatsapp-inbound-service'
    );
    const intent = WhatsAppInboundService.classifyMessageIntent({
      type: 'interactive',
      interactive: {
        type: 'button_reply',
        button_reply: { id: 'chat_with_staff', title: '💬 Chat with Staff' },
      },
    });
    expect(intent).toBe('chat_with_staff');
  });

  it('AC3 — arbitrary text → "support_text"', async () => {
    const { WhatsAppInboundService } = await import(
      '@/services/whatsapp-inbound-service'
    );
    const intent = WhatsAppInboundService.classifyMessageIntent({
      type: 'text',
      text: { body: 'hi can I get a menu' },
    });
    expect(intent).toBe('support_text');
  });
});

describe('REQ-111 detectAccountRecoverySignal', () => {
  const MATCHED_USER = {
    _id: { toString: () => '65a1b2c3d4e5f6a7b8c9d0ff' },
    phone: '+2348099998888',
    email: 'customer@example.com',
    accountStatus: 'active',
  };

  it('AC1 — email in message body resolves to the matching account', async () => {
    mockFindOne.mockResolvedValue(MATCHED_USER);
    const { WhatsAppInboundService } = await import(
      '@/services/whatsapp-inbound-service'
    );
    const result = await WhatsAppInboundService.detectAccountRecoverySignal(
      "Hi, it's me, customer@example.com, I lost my old phone"
    );
    expect(result).toBe(MATCHED_USER);
    const filter = mockFindOne.mock.calls[0][0] as Record<string, unknown>;
    expect(filter.email).toBe('customer@example.com');
    expect(mockOrderFindOne).not.toHaveBeenCalled();
  });

  it('AC1 — email match is lowercased before the lookup', async () => {
    mockFindOne.mockResolvedValue(MATCHED_USER);
    const { WhatsAppInboundService } = await import(
      '@/services/whatsapp-inbound-service'
    );
    await WhatsAppInboundService.detectAccountRecoverySignal(
      'Customer@Example.COM is my account'
    );
    const filter = mockFindOne.mock.calls[0][0] as Record<string, unknown>;
    expect(filter.email).toBe('customer@example.com');
  });

  it('AC2 — order number (WG + 10 digits) in message body resolves via the order to its user', async () => {
    mockFindOne.mockReset();
    // No email in the body, so the first UserModel.findOne call is skipped
    // entirely; the order-number path does its own UserModel.findOne by id.
    mockOrderSelect.mockResolvedValue({ userId: MATCHED_USER._id });
    mockFindOne.mockResolvedValue(MATCHED_USER);
    const { WhatsAppInboundService } = await import(
      '@/services/whatsapp-inbound-service'
    );
    const result = await WhatsAppInboundService.detectAccountRecoverySignal(
      'My order WG2610200001 never arrived'
    );
    expect(result).toBe(MATCHED_USER);
    expect(mockOrderFindOne).toHaveBeenCalledWith({
      orderNumber: 'WG2610200001',
    });
    const userFilter = mockFindOne.mock.calls[0][0] as Record<string, unknown>;
    expect(userFilter._id).toBe(MATCHED_USER._id);
  });

  it('order number not found → returns null, no User lookup by id', async () => {
    mockOrderSelect.mockResolvedValue(null);
    const { WhatsAppInboundService } = await import(
      '@/services/whatsapp-inbound-service'
    );
    const result = await WhatsAppInboundService.detectAccountRecoverySignal(
      'My order WG2610200099 never arrived'
    );
    expect(result).toBeNull();
  });

  it('no identifying token in body → returns null without any DB lookup', async () => {
    const { WhatsAppInboundService } = await import(
      '@/services/whatsapp-inbound-service'
    );
    const result =
      await WhatsAppInboundService.detectAccountRecoverySignal('hi there');
    expect(result).toBeNull();
    expect(mockFindOne).not.toHaveBeenCalled();
    expect(mockOrderFindOne).not.toHaveBeenCalled();
  });

  it('null body → returns null without any DB lookup', async () => {
    const { WhatsAppInboundService } = await import(
      '@/services/whatsapp-inbound-service'
    );
    const result =
      await WhatsAppInboundService.detectAccountRecoverySignal(null);
    expect(result).toBeNull();
    expect(mockFindOne).not.toHaveBeenCalled();
  });

  it('email present but resolves to no account → falls through to order-number check', async () => {
    mockFindOne.mockResolvedValueOnce(null); // email lookup finds nobody
    mockOrderSelect.mockResolvedValue({ userId: MATCHED_USER._id });
    mockFindOne.mockResolvedValueOnce(MATCHED_USER); // order->user lookup
    const { WhatsAppInboundService } = await import(
      '@/services/whatsapp-inbound-service'
    );
    const result = await WhatsAppInboundService.detectAccountRecoverySignal(
      'unknown@example.com but also my order WG2610200001'
    );
    expect(result).toBe(MATCHED_USER);
  });
});
