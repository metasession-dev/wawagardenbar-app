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

vi.mock('@/models', () => ({
  UserModel: {
    findOne: (...args: unknown[]) => mockFindOne(...args),
    create: vi.fn(),
    updateOne: vi.fn(),
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
