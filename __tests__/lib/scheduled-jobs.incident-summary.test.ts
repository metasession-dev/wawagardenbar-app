/**
 * @requirement REQ-088 — Daily incident summary cron
 *
 * AC9: runDailyIncidentSummaryJob sends WhatsApp/email digest to admins
 *      when unresolved incidents exist; no-op when count is 0.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/mongodb', () => ({
  default: vi.fn(),
  connectDB: vi.fn().mockResolvedValue(undefined),
}));

const mockGetUnresolvedSummary = vi.fn();
const mockNotificationSend = vi.fn();
const mockUserFind = vi.fn();

vi.mock('@/services/incident-event-service', () => ({
  IncidentEventService: {
    getUnresolvedSummary: (...a: unknown[]) => mockGetUnresolvedSummary(...a),
  },
}));

vi.mock('@/services/notification-service', () => ({
  NotificationService: {
    send: (...a: unknown[]) => mockNotificationSend(...a),
  },
}));

vi.mock('@/models/user-model', () => ({
  default: {
    find: (...a: unknown[]) => mockUserFind(...a),
  },
}));

vi.mock('@/services/rewards-service', () => ({
  RewardsService: { expireOldRewards: vi.fn() },
}));

vi.mock('@/services/instagram-service', () => ({
  InstagramService: { processInstagramRewards: vi.fn() },
}));

vi.mock('@/services/inventory-service', () => ({
  default: { reconcileMissedDeductions: vi.fn() },
}));

vi.mock('@/services/order-service', () => ({
  OrderService: { scanStalePaidOrders: vi.fn() },
}));

beforeEach(() => {
  mockGetUnresolvedSummary.mockReset();
  mockNotificationSend.mockReset();
  mockUserFind.mockReset();
});

describe('REQ-088 runDailyIncidentSummaryJob', () => {
  it('AC9 — no-op when total incidents is 0', async () => {
    mockGetUnresolvedSummary.mockResolvedValue({ total: 0, byKind: [] });
    const { runDailyIncidentSummaryJob } = await import('@/lib/scheduled-jobs');
    await runDailyIncidentSummaryJob();
    expect(mockUserFind).not.toHaveBeenCalled();
    expect(mockNotificationSend).not.toHaveBeenCalled();
  });

  it('AC9 — sends notification to admin users when incidents exist', async () => {
    mockGetUnresolvedSummary.mockResolvedValue({
      total: 3,
      byKind: [
        { kind: 'inventory_deduction_failed' as const, count: 2 },
        { kind: 'points_award_failed' as const, count: 1 },
      ],
    });
    mockUserFind.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      lean: vi
        .fn()
        .mockResolvedValue([{ email: 'admin@wawa.com', phone: '+1234567890' }]),
    });
    mockNotificationSend.mockResolvedValue({});
    const { runDailyIncidentSummaryJob } = await import('@/lib/scheduled-jobs');
    await runDailyIncidentSummaryJob();
    expect(mockNotificationSend).toHaveBeenCalledTimes(1);
    const sendArg = mockNotificationSend.mock.calls[0][0];
    expect(sendArg.templateKey).toBe('incident_summary');
    expect(sendArg.userId).toBe('admin@wawa.com');
  });

  it('AC9 — skips when no admin users found', async () => {
    mockGetUnresolvedSummary.mockResolvedValue({
      total: 1,
      byKind: [{ kind: 'inventory_deduction_failed' as const, count: 1 }],
    });
    mockUserFind.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      lean: vi.fn().mockResolvedValue([]),
    });
    const { runDailyIncidentSummaryJob } = await import('@/lib/scheduled-jobs');
    await runDailyIncidentSummaryJob();
    expect(mockNotificationSend).not.toHaveBeenCalled();
  });

  it('AC9 — does not crash when NotificationService.send throws', async () => {
    mockGetUnresolvedSummary.mockResolvedValue({
      total: 1,
      byKind: [{ kind: 'reward_grant_failed' as const, count: 1 }],
    });
    mockUserFind.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      lean: vi
        .fn()
        .mockResolvedValue([{ email: 'admin@wawa.com', phone: '+1234567890' }]),
    });
    mockNotificationSend.mockRejectedValue(new Error('Send failed'));
    const { runDailyIncidentSummaryJob } = await import('@/lib/scheduled-jobs');
    await expect(runDailyIncidentSummaryJob()).resolves.toBeUndefined();
  });
});
