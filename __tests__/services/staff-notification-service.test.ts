/**
 * @requirement REQ-122 — AC1, AC2, AC3
 * @srs REQ-DASH-003, REQ-DASH-004, REQ-DASH-005
 *
 * Raising an alert (rule-driven audience, one per item, staff orders excluded,
 * never throws), role-scoped reads and acknowledgement, and a content-free
 * socket signal. US-B5.3, US-B5.4, US-B5.9.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/mongodb', () => ({ connectDB: vi.fn() }));

const M = vi.hoisted(() => ({
  findOne: vi.fn(),
  create: vi.fn(),
  find: vi.fn(),
  countDocuments: vi.fn(),
  findOneAndUpdate: vi.fn(),
  updateMany: vi.fn(),
}));
vi.mock('@/models/staff-notification-model', () => ({ default: M }));
const settingsFindOne = vi.hoisted(() => vi.fn());
vi.mock('@/models/system-settings-model', () => ({
  default: { findOne: settingsFindOne, findOneAndUpdate: vi.fn() },
}));
vi.mock('@/models/user-model', () => ({ default: {} }));
vi.mock('@/lib/whatsapp', () => ({ WhatsAppService: {} }));
vi.mock('@/services/notification-log-service', () => ({
  NotificationLogService: {},
}));
const emitSocketEvent = vi.hoisted(() => vi.fn());
vi.mock('@/lib/socket-emit-helper', () => ({ emitSocketEvent }));

import { StaffNotificationService } from '@/services/staff-notification-service';

const leanOf = (rows: unknown[]) => ({
  sort: () => ({ limit: () => ({ lean: async () => rows }) }),
});

beforeEach(() => {
  vi.clearAllMocks();
  settingsFindOne.mockResolvedValue(null);
  M.findOne.mockReturnValue({ lean: async () => null });
  M.create.mockImplementation(async (d: Record<string, unknown>) => ({
    ...d,
    _id: 'n1',
  }));
});

describe('AC1: raising an alert', () => {
  it('[US-B5.3] a paid customer order raises one order notification for the rule roles', async () => {
    await StaffNotificationService.raiseForPaidOrder({
      _id: 'order-1',
      orderNumber: 'WG2611160001',
      origin: 'customer',
    });
    expect(M.create).toHaveBeenCalledOnce();
    expect(M.create.mock.calls[0][0]).toMatchObject({
      type: 'order',
      refModel: 'Order',
      refId: 'order-1',
      reference: 'WG2611160001',
      title: 'New order WG2611160001',
      link: '/dashboard/orders/order-1',
      targetRoles: ['kitchen', 'csr'],
      escalationLevel: 0,
    });
  });

  it('a staff-created order raises nothing', async () => {
    await StaffNotificationService.raiseForPaidOrder({
      _id: 'o',
      origin: 'staff',
    });
    await StaffNotificationService.raiseForPaidOrder({ _id: 'o' });
    expect(M.create).not.toHaveBeenCalled();
  });

  it('uses the admin-changed audience', async () => {
    settingsFindOne.mockResolvedValue({
      value: { order: { inAppRoles: ['manager'], namedUserIds: ['u9'] } },
    });
    await StaffNotificationService.raiseForPaidOrder({
      _id: 'o',
      origin: 'customer',
    });
    expect(M.create.mock.calls[0][0]).toMatchObject({
      targetRoles: ['manager'],
      targetUserIds: ['u9'],
    });
  });

  it('a support ticket raises a support notification linking to the ticket', async () => {
    await StaffNotificationService.raiseForSupportTicket({
      _id: 't1',
      ticketNumber: 'TKT-1',
    });
    expect(M.create.mock.calls[0][0]).toMatchObject({
      type: 'support',
      refModel: 'SupportTicket',
      link: '/dashboard/support/t1',
      targetRoles: ['csr'],
    });
  });

  it('a retried payment webhook does not alert twice, even after staff acknowledged', async () => {
    M.findOne.mockReturnValue({
      lean: async () => ({ _id: 'old', acknowledgedAt: new Date() }),
    });
    await StaffNotificationService.raiseForPaidOrder({
      _id: 'o',
      origin: 'customer',
    });
    expect(M.create).not.toHaveBeenCalled();
    // For an order the lookup does not filter on acknowledgement.
    expect(M.findOne.mock.calls[0][0]).not.toHaveProperty('acknowledgedAt');
  });

  it('a support ticket alerts again after an acknowledged one, but not while one is open', async () => {
    await StaffNotificationService.raiseForSupportTicket({ _id: 't1' });
    expect(M.findOne.mock.calls[0][0]).toMatchObject({
      type: 'support',
      acknowledgedAt: null,
    });
    M.findOne.mockReturnValue({ lean: async () => ({ _id: 'open' }) });
    M.create.mockClear();
    await StaffNotificationService.raiseForSupportTicket({ _id: 't1' });
    expect(M.create).not.toHaveBeenCalled();
  });

  it('never throws, so a payment or ticket flow cannot fail because an alert failed', async () => {
    M.create.mockRejectedValue(new Error('db down'));
    await expect(
      StaffNotificationService.raiseForPaidOrder({
        _id: 'o',
        origin: 'customer',
      })
    ).resolves.toBeUndefined();
    await expect(
      StaffNotificationService.raise('order', {
        refModel: 'Order',
        refId: 'o',
        reference: 'x',
      })
    ).resolves.toBeNull();
  });

  it('signals the dashboard with an id and a type only, never content', async () => {
    await StaffNotificationService.raiseForPaidOrder({
      _id: 'order-1',
      orderNumber: 'WG2611160001',
      origin: 'customer',
    });
    // Fired without being awaited so it can never slow the payment path.
    await vi.waitFor(() =>
      expect(emitSocketEvent).toHaveBeenCalledWith('staff-notification', {
        id: 'n1',
        type: 'order',
      })
    );
  });
});

describe('AC2 and AC3: reads and acknowledgement are scoped to the caller', () => {
  const csr = { id: 'u1', roles: ['csr'] };

  it('[US-B5.3] lists only what the caller can see, with minutes waiting', async () => {
    const now = new Date('2026-11-16T12:10:00.000Z');
    M.find.mockReturnValue(
      leanOf([
        {
          _id: 'n1',
          type: 'order',
          title: 'New order WG1',
          link: '/dashboard/orders/o1',
          createdAt: new Date('2026-11-16T12:00:00.000Z'),
        },
      ])
    );
    const items = await StaffNotificationService.listForViewer(csr, {}, now);
    expect(M.find.mock.calls[0][0]).toEqual({
      acknowledgedAt: null,
      $or: [{ targetRoles: { $in: ['csr'] } }, { targetUserIds: 'u1' }],
    });
    expect(items).toEqual([
      {
        id: 'n1',
        type: 'order',
        title: 'New order WG1',
        link: '/dashboard/orders/o1',
        createdAt: '2026-11-16T12:00:00.000Z',
        minutesWaiting: 10,
      },
    ]);
  });

  it('[US-B5.4] the Needs-attention list is oldest first', async () => {
    const sort = vi.fn(() => ({ limit: () => ({ lean: async () => [] }) }));
    M.find.mockReturnValue({ sort });
    await StaffNotificationService.listForViewer(csr, { oldestFirst: true });
    expect(sort).toHaveBeenCalledWith({ createdAt: 1 });
    await StaffNotificationService.listForViewer(csr, {});
    expect(sort).toHaveBeenLastCalledWith({ createdAt: -1 });
  });

  it('counts with the same visibility filter', async () => {
    M.countDocuments.mockResolvedValue(3);
    expect(await StaffNotificationService.countForViewer(csr)).toBe(3);
    expect(M.countDocuments.mock.calls[0][0]).toMatchObject({
      acknowledgedAt: null,
    });
  });

  it('[US-B5.9] acknowledges an item the caller can see and records who and when', async () => {
    M.findOneAndUpdate.mockResolvedValue({ _id: 'n1' });
    const now = new Date('2026-11-16T12:05:00.000Z');
    const ok = await StaffNotificationService.acknowledge(
      '665a00000000000000000001',
      csr,
      now
    );
    expect(ok).toBe(true);
    const [query, update] = M.findOneAndUpdate.mock.calls[0];
    expect(query).toMatchObject({
      _id: '665a00000000000000000001',
      acknowledgedAt: null,
      $or: [{ targetRoles: { $in: ['csr'] } }, { targetUserIds: 'u1' }],
    });
    expect(update).toEqual({
      $set: { acknowledgedAt: now, acknowledgedBy: 'u1' },
    });
  });

  it('cannot acknowledge an item outside the caller scope, or a malformed id', async () => {
    M.findOneAndUpdate.mockResolvedValue(null);
    expect(
      await StaffNotificationService.acknowledge('665a00000000000000000001', {
        id: 'u2',
        roles: ['kitchen'],
      })
    ).toBe(false);
    expect(await StaffNotificationService.acknowledge('not-an-id', csr)).toBe(
      false
    );
  });

  it('acknowledge all and acknowledge-by-item are limited to the caller scope', async () => {
    M.updateMany.mockResolvedValue({ modifiedCount: 2 });
    expect(await StaffNotificationService.acknowledgeAll(csr)).toBe(2);
    expect(M.updateMany.mock.calls[0][0]).toMatchObject({
      acknowledgedAt: null,
      $or: expect.any(Array),
    });
    await StaffNotificationService.acknowledgeByRef('order-1', csr);
    expect(M.updateMany.mock.calls[1][0]).toMatchObject({
      refId: 'order-1',
      acknowledgedAt: null,
    });
  });
});
