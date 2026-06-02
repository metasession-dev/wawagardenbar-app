/**
 * @requirement REQ-062 — Customer trust polish (P0 #5 SMS consent gate)
 *
 * `sendOrderConfirmationAction` previously called `SMSService.
 * sendOrderConfirmationSMS` directly, bypassing the user's
 * `communicationPreferences.sms` flag. REQ-062 routes SMS through
 * `NotificationService.send` so the existing `shouldSendSMS` gate
 * (which requires `cp.sms === true`) fires.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/mongodb', () => ({
  default: vi.fn(),
  connectDB: vi.fn(),
}));

vi.mock('@/lib/session', () => ({
  sessionOptions: {},
  SessionData: {},
}));

vi.mock('iron-session', () => ({
  getIronSession: vi.fn().mockResolvedValue({}),
}));

vi.mock('next/headers', () => ({
  cookies: vi.fn().mockResolvedValue({}),
}));

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

vi.mock('@/lib/socket-server', () => ({
  emitOrderStatusUpdate: vi.fn(),
  emitOrderChange: vi.fn(),
}));

const mockGetOrderById = vi.fn();
const mockGetNotificationSettings = vi.fn();
vi.mock('@/services', () => ({
  OrderService: { getOrderById: (...a: unknown[]) => mockGetOrderById(...a) },
  SystemSettingsService: {
    getNotificationSettings: (...a: unknown[]) =>
      mockGetNotificationSettings(...a),
  },
}));

vi.mock('@/models', () => ({
  UserModel: {
    findById: vi.fn().mockReturnValue({
      select: vi.fn().mockResolvedValue({ phone: '+2348012345678' }),
    }),
  },
}));

vi.mock('@/lib/email', () => ({
  sendOrderConfirmationEmail: vi.fn().mockResolvedValue(undefined),
  sendOrderStatusUpdateEmail: vi.fn(),
  sendOrderCancellationEmail: vi.fn(),
  sendSupportTicketEmail: vi.fn(),
}));

const mockSendSMS = vi.fn();
vi.mock('@/lib/sms', () => ({
  SMSService: {
    sendOrderConfirmationSMS: (...a: unknown[]) => mockSendSMS(...a),
  },
}));

const mockNotificationSend = vi.fn();
vi.mock('@/services/notification-service', () => ({
  NotificationService: {
    send: (...a: unknown[]) => mockNotificationSend(...a),
  },
}));

beforeEach(() => {
  mockGetOrderById.mockReset();
  mockGetNotificationSettings.mockReset();
  mockSendSMS.mockReset().mockResolvedValue({ success: true });
  mockNotificationSend.mockReset().mockResolvedValue({
    sentVia: 'whatsapp',
    success: true,
    attempts: [],
  });
});

function defaultOrder(overrides: Record<string, unknown> = {}) {
  return {
    _id: 'order-1',
    userId: 'user-1',
    orderNumber: 'WGB-001',
    orderType: 'pickup',
    items: [{ name: 'Burger', quantity: 1, subtotal: 5000, price: 5000 }],
    subtotal: 5000,
    tax: 0,
    serviceFee: 100,
    deliveryFee: 0,
    tip: 0,
    total: 5100,
    pointsEarned: 51,
    paymentMethod: 'card',
    estimatedWaitTime: 30,
    guestPhone: '+2348012345678',
    guestEmail: 'cust@example.com',
    ...overrides,
  };
}

describe('REQ-062 sendOrderConfirmationAction — SMS consent gate (P0 #5)', () => {
  it('AC1 — routes SMS through NotificationService.send with an sms closure', async () => {
    mockGetOrderById.mockResolvedValue(defaultOrder());
    mockGetNotificationSettings.mockResolvedValue({
      smsEnabled: true,
      channels: { orders: 'both' },
    });
    const { sendOrderConfirmationAction } = await import(
      '@/app/actions/communication/communication-actions'
    );
    const result = await sendOrderConfirmationAction('order-1');
    expect(result.success).toBe(true);
    // SMS must NOT be sent directly (the bypass path that REQ-062 closes).
    expect(mockSendSMS).not.toHaveBeenCalled();
    // NotificationService.send must be the single send point now.
    expect(mockNotificationSend).toHaveBeenCalled();
    // The sms closure must be present in the call args.
    const sendOpts = mockNotificationSend.mock.calls[0][0] as Record<
      string,
      unknown
    >;
    expect(sendOpts.sms).toBeTypeOf('function');
  });

  it('AC1 — order with no userId still works (guest path)', async () => {
    mockGetOrderById.mockResolvedValue(
      defaultOrder({ userId: undefined, guestEmail: 'guest@example.com' })
    );
    mockGetNotificationSettings.mockResolvedValue({
      smsEnabled: true,
      channels: { orders: 'both' },
    });
    const { sendOrderConfirmationAction } = await import(
      '@/app/actions/communication/communication-actions'
    );
    const result = await sendOrderConfirmationAction('order-1');
    expect(result.success).toBe(true);
    // For guests the userId on NotificationService.send is null; SMS is
    // skipped by the consent gate (guests can't opt in).
    expect(mockSendSMS).not.toHaveBeenCalled();
  });
});
