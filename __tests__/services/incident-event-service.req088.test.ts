/**
 * @requirement REQ-088 — IncidentEventService new kinds + getUnresolvedSummary
 *
 * AC8: recordIncident accepts new kinds (points_award_failed,
 *      notification_delivery_failed, reward_grant_failed, webhook_replay_mismatch)
 * AC9: getUnresolvedSummary returns grouped count by kind
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/mongodb', () => ({
  default: vi.fn(),
  connectDB: vi.fn().mockResolvedValue(undefined),
}));

const mockCreate = vi.fn();
const mockAggregate = vi.fn();

vi.mock('@/models/incident-event-model', () => ({
  default: {
    create: (...a: unknown[]) => mockCreate(...a),
    aggregate: (...a: unknown[]) => mockAggregate(...a),
  },
}));

vi.mock('@/models/order-model', () => ({
  default: {
    find: vi.fn(),
  },
}));

beforeEach(() => {
  mockCreate.mockReset();
  mockAggregate.mockReset();
});

describe('REQ-088 IncidentEventService.recordIncident — new kinds', () => {
  it('AC8 — accepts points_award_failed kind', async () => {
    mockCreate.mockResolvedValue({ _id: 'ie-pts-1' });
    const { IncidentEventService } = await import(
      '@/services/incident-event-service'
    );
    await IncidentEventService.recordIncident({
      kind: 'points_award_failed',
      entityId: 'order-1',
      summary: 'Points reversal failed',
      errorDetails: { message: 'User not found' },
    });
    expect(mockCreate).toHaveBeenCalledTimes(1);
    expect(mockCreate.mock.calls[0][0].kind).toBe('points_award_failed');
  });

  it('AC8 — accepts notification_delivery_failed kind', async () => {
    mockCreate.mockResolvedValue({ _id: 'ie-notif-1' });
    const { IncidentEventService } = await import(
      '@/services/incident-event-service'
    );
    await IncidentEventService.recordIncident({
      kind: 'notification_delivery_failed',
      entityId: 'user-1',
      summary: 'NotificationLog recordAttempt failed',
      errorDetails: { templateKey: 'order_confirmation' },
    });
    expect(mockCreate.mock.calls[0][0].kind).toBe(
      'notification_delivery_failed'
    );
  });

  it('AC8 — accepts reward_grant_failed kind', async () => {
    mockCreate.mockResolvedValue({ _id: 'ie-rwd-1' });
    const { IncidentEventService } = await import(
      '@/services/incident-event-service'
    );
    await IncidentEventService.recordIncident({
      kind: 'reward_grant_failed',
      entityId: 'order-1',
      summary: 'Reward calculation failed',
      errorDetails: { message: 'Rule not found' },
    });
    expect(mockCreate.mock.calls[0][0].kind).toBe('reward_grant_failed');
  });

  it('AC8 — accepts webhook_replay_mismatch kind', async () => {
    mockCreate.mockResolvedValue({ _id: 'ie-wh-1' });
    const { IncidentEventService } = await import(
      '@/services/incident-event-service'
    );
    await IncidentEventService.recordIncident({
      kind: 'webhook_replay_mismatch',
      entityId: 'evt-123',
      summary: 'Duplicate side-effect detected on replay',
      errorDetails: { eventId: 'evt-123' },
    });
    expect(mockCreate.mock.calls[0][0].kind).toBe('webhook_replay_mismatch');
  });
});

describe('REQ-088 IncidentEventService.getUnresolvedSummary', () => {
  it('AC9 — returns grouped count by kind sorted descending', async () => {
    mockAggregate.mockResolvedValue([
      { _id: 'inventory_deduction_failed', count: 5 },
      { _id: 'points_award_failed', count: 3 },
      { _id: 'reward_grant_failed', count: 1 },
    ]);
    const { IncidentEventService } = await import(
      '@/services/incident-event-service'
    );
    const summary = await IncidentEventService.getUnresolvedSummary(24);
    expect(summary.total).toBe(9);
    expect(summary.byKind).toHaveLength(3);
    expect(summary.byKind[0]).toEqual({
      kind: 'inventory_deduction_failed',
      count: 5,
    });
    expect(summary.byKind[1]).toEqual({
      kind: 'points_award_failed',
      count: 3,
    });
  });

  it('AC9 — returns empty summary when no incidents exist', async () => {
    mockAggregate.mockResolvedValue([]);
    const { IncidentEventService } = await import(
      '@/services/incident-event-service'
    );
    const summary = await IncidentEventService.getUnresolvedSummary(24);
    expect(summary.total).toBe(0);
    expect(summary.byKind).toHaveLength(0);
  });

  it('AC9 — passes the withinHours window to the $match stage', async () => {
    mockAggregate.mockResolvedValue([]);
    const { IncidentEventService } = await import(
      '@/services/incident-event-service'
    );
    await IncidentEventService.getUnresolvedSummary(48);
    const pipeline = mockAggregate.mock.calls[0][0];
    const matchStage = pipeline[0].$match;
    expect(matchStage).toBeDefined();
    expect(matchStage.createdAt.$gte).toBeDefined();
    const sinceMs = matchStage.createdAt.$gte.getTime();
    const expectedMs = Date.now() - 48 * 60 * 60 * 1000;
    expect(Math.abs(sinceMs - expectedMs)).toBeLessThan(5000);
  });
});
