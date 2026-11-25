/**
 * @requirement REQ-126 (AC3, AC4) — an order-status enquiry escalates the open
 * ticket to urgent instead of duplicating it, and the staff alert says so.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/mongodb', () => ({
  default: vi.fn(),
  connectDB: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('@/services/notification-service', () => ({
  NotificationService: { send: vi.fn() },
}));
vi.mock('@/lib/email', () => ({
  sendSupportTicketEmail: vi.fn().mockResolvedValue(undefined),
}));
const raiseForSupportTicket = vi.hoisted(() => vi.fn());
vi.mock('@/services/staff-notification-service', () => ({
  StaffNotificationService: { raiseForSupportTicket },
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
  },
}));
vi.mock('@/models/incoming-message-model', () => ({ default: {} }));
vi.mock('@/models', () => ({ UserModel: {} }));

import {
  ORDER_STATUS_ALERT_TITLE,
  SupportTicketService,
} from '@/services/support-ticket-service';

const lean = (v: unknown) => ({
  sort: vi.fn().mockReturnThis(),
  lean: vi.fn().mockResolvedValue(v),
});

beforeEach(() => {
  raiseForSupportTicket.mockReset().mockResolvedValue(undefined);
  mockCreate.mockReset();
  mockFindOne.mockReset();
  mockUpdateOne.mockReset().mockResolvedValue({});
  mockFindByIdAndUpdate.mockReset();
});

describe('createFromWhatsAppInbound with kind order_status', () => {
  it('a new ticket is urgent, subject-tagged and the alert title says order status enquiry', async () => {
    mockFindOne.mockReturnValue(lean(null));
    mockCreate.mockResolvedValue({ _id: 't1', ticketNumber: 'TKT-1' });
    await SupportTicketService.createFromWhatsAppInbound({
      from: '+2348011112222',
      body: 'where is my order',
      userId: 'u1',
      urgent: true,
      kind: 'order_status',
    });
    expect(mockCreate.mock.calls[0][0]).toMatchObject({
      priority: 'urgent',
      subject: `${ORDER_STATUS_ALERT_TITLE}: where is my order`,
    });
    expect(raiseForSupportTicket).toHaveBeenCalledWith(expect.anything(), {
      title: ORDER_STATUS_ALERT_TITLE,
    });
  });

  it('an open ticket is raised to urgent with an SLA and no second ticket is created', async () => {
    const existing = { _id: 't9', ticketNumber: 'TKT-9', status: 'open' };
    mockFindOne.mockReturnValue(lean(existing));
    mockFindByIdAndUpdate.mockReturnValue({
      lean: vi.fn().mockResolvedValue({ ...existing, priority: 'urgent' }),
    });
    await SupportTicketService.createFromWhatsAppInbound({
      from: '+2348011112222',
      body: 'status',
      userId: 'u1',
      urgent: true,
      kind: 'order_status',
    });
    expect(mockCreate).not.toHaveBeenCalled();
    const update = mockFindByIdAndUpdate.mock.calls[0][1];
    expect(update.$set.priority).toBe('urgent');
    expect(update.$set.slaDueAt).toBeInstanceOf(Date);
    expect(update.$push.replies.body).toBe('status');
    expect(raiseForSupportTicket).toHaveBeenCalledWith(
      expect.objectContaining({ _id: 't9' }),
      { title: ORDER_STATUS_ALERT_TITLE }
    );
  });

  it('an ordinary message passes no alert title', async () => {
    mockFindOne.mockReturnValue(lean(null));
    mockCreate.mockResolvedValue({ _id: 't2', ticketNumber: 'TKT-2' });
    await SupportTicketService.createFromWhatsAppInbound({
      from: '+2348011112222',
      body: 'hello',
      userId: 'u1',
    });
    expect(raiseForSupportTicket).toHaveBeenCalledWith(expect.anything(), {});
  });
});
