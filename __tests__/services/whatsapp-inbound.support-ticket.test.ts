/**
 * @requirement REQ-064 — WhatsApp inbound → support ticket bridge
 *
 * AC3: When REQ-056's `WhatsAppInboundService.handle` reaches the
 * non-welcome branch (returning user / active state with `support_text`
 * intent), it must auto-create a SupportTicket via
 * `SupportTicketService.createFromWhatsAppInbound` and tag the
 * IncomingMessage row with `actionTaken: 'ticketed'`.
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

const mockSendTextMessage = vi.fn();
vi.mock('@/lib/whatsapp', () => ({
  WhatsAppService: {
    sendTextMessage: (...a: unknown[]) => mockSendTextMessage(...a),
  },
}));

const mockUserFindOne = vi.fn();
const mockUserUpdate = vi.fn();
const mockUserCreate = vi.fn();
vi.mock('@/models', () => ({
  UserModel: {
    findOne: (...a: unknown[]) => mockUserFindOne(...a),
    updateOne: (...a: unknown[]) => mockUserUpdate(...a),
    create: (...a: unknown[]) => mockUserCreate(...a),
  },
}));

const mockIncomingCreate = vi.fn();
vi.mock('@/models/incoming-message-model', async () => {
  // Re-export the type union for the handler's import surface.
  const actual: typeof import('@/models/incoming-message-model') =
    await vi.importActual('@/models/incoming-message-model');
  return {
    ...actual,
    default: {
      create: (...a: unknown[]) => mockIncomingCreate(...a),
    },
  };
});

beforeEach(() => {
  mockCreateFromInbound.mockReset();
  mockNotificationSend.mockReset();
  mockSendTextMessage.mockReset();
  mockUserFindOne.mockReset();
  mockUserCreate.mockReset();
  mockIncomingCreate.mockReset();
});

describe('REQ-064 WhatsApp inbound → support ticket bridge (AC3)', () => {
  it('active-state + non-welcome intent creates a SupportTicket and stamps actionTaken=ticketed', async () => {
    // Existing active user (phoneVerified) → no welcome, no opt-out → support
    // intent → ticket auto-create branch.
    mockUserFindOne.mockResolvedValue({
      _id: { toString: () => 'user-99' },
      phone: '+2348011112222',
      phoneVerified: true,
      lastLoginAt: new Date(),
    });
    mockCreateFromInbound.mockResolvedValue({
      _id: 'new-ticket',
      ticketNumber: 'TKT-x',
    });

    const { WhatsAppInboundService } = await import(
      '@/services/whatsapp-inbound-service'
    );

    await WhatsAppInboundService.handle(
      {
        from: '+2348011112222',
        id: 'wamid.abc',
        type: 'text',
        text: { body: 'My delivery is late' },
      },
      {}
    );

    expect(mockCreateFromInbound).toHaveBeenCalledTimes(1);
    expect(mockCreateFromInbound.mock.calls[0][0]).toMatchObject({
      from: '+2348011112222',
      body: 'My delivery is late',
      userId: 'user-99',
    });

    // IncomingMessage row tagged 'ticketed'.
    expect(mockIncomingCreate).toHaveBeenCalledTimes(1);
    expect(mockIncomingCreate.mock.calls[0][0]).toMatchObject({
      actionTaken: 'ticketed',
      classifiedIntent: 'support_text',
    });
  });

  it('ticket-create failure: falls back to queued_for_staff (audit still persists)', async () => {
    mockUserFindOne.mockResolvedValue({
      _id: { toString: () => 'user-99' },
      phone: '+2348011112222',
      phoneVerified: true,
      lastLoginAt: new Date(),
    });
    mockCreateFromInbound.mockRejectedValue(new Error('db boom'));

    const { WhatsAppInboundService } = await import(
      '@/services/whatsapp-inbound-service'
    );

    await WhatsAppInboundService.handle(
      {
        from: '+2348011112222',
        id: 'wamid.def',
        type: 'text',
        text: { body: 'support text' },
      },
      {}
    );

    expect(mockIncomingCreate).toHaveBeenCalledTimes(1);
    expect(mockIncomingCreate.mock.calls[0][0]).toMatchObject({
      actionTaken: 'queued_for_staff',
    });
  });
});
