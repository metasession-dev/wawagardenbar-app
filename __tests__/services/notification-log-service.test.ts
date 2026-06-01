/**
 * @requirement REQ-055 — NotificationLog persistent audit log
 *
 * Service-level coverage of NotificationLogService. Two methods:
 *
 *   - recordAttempt({ ... })       — writes a row on every outbound send
 *                                    attempt. Non-blocking: persistence
 *                                    errors are console.error'd but
 *                                    NEVER re-thrown (don't break the
 *                                    send path).
 *   - updateStatus(messageId, ...) — updates an existing row's status
 *                                    when Meta's delivery-status
 *                                    webhook fires. Monotonic: status
 *                                    only moves forward through the
 *                                    lifecycle (queued → sent →
 *                                    delivered → read; failed terminal).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/mongodb', () => ({
  default: vi.fn(),
  connectDB: vi.fn(),
}));

const mockCreate = vi.fn();
const mockFindOneAndUpdate = vi.fn();

vi.mock('@/models/notification-log-model', () => ({
  default: {
    create: (...args: unknown[]) => mockCreate(...args),
    findOneAndUpdate: (...args: unknown[]) => mockFindOneAndUpdate(...args),
  },
  // Service reads the lifecycle ordering at call time — keep this in
  // sync with the production model's export.
  NOTIFICATION_LOG_STATUS_ORDER: {
    queued: 0,
    sent: 1,
    delivered: 2,
    read: 3,
    failed: 3,
  },
}));

const USER_ID = '65a1b2c3d4e5f6a7b8c9d0aa';

beforeEach(() => {
  mockCreate.mockReset();
  mockFindOneAndUpdate.mockReset();
  // Default: write/update succeeds with a stub doc.
  mockCreate.mockResolvedValue({
    _id: { toString: () => 'log-1' },
    templateKey: 'order_confirmation',
  });
  mockFindOneAndUpdate.mockResolvedValue({
    _id: { toString: () => 'log-1' },
    status: 'delivered',
  });
});

describe('REQ-055 NotificationLogService.recordAttempt', () => {
  it('AC2 — writes a doc with the passed fields and returns the doc id', async () => {
    const { NotificationLogService } = await import(
      '@/services/notification-log-service'
    );
    const id = await NotificationLogService.recordAttempt({
      templateKey: 'order_confirmation',
      userId: USER_ID,
      channel: 'whatsapp',
      success: true,
      messageId: 'wamid.abc',
      durationMs: 42,
    });
    expect(id).toBe('log-1');
    expect(mockCreate).toHaveBeenCalledTimes(1);
    const arg = mockCreate.mock.calls[0][0] as Record<string, unknown>;
    expect(arg.templateKey).toBe('order_confirmation');
    expect(arg.userId).toBe(USER_ID);
    expect(arg.channel).toBe('whatsapp');
    expect(arg.success).toBe(true);
    expect(arg.messageId).toBe('wamid.abc');
    expect(arg.durationMs).toBe(42);
  });

  it('AC2 — userId: null accepted (guest path)', async () => {
    const { NotificationLogService } = await import(
      '@/services/notification-log-service'
    );
    await NotificationLogService.recordAttempt({
      templateKey: 'order_confirmation',
      userId: null,
      channel: 'email',
      success: true,
    });
    expect(mockCreate).toHaveBeenCalledTimes(1);
    expect(mockCreate.mock.calls[0][0]).toMatchObject({ userId: null });
  });

  it('AC6 — persistence error is swallowed; no throw, console.error called', async () => {
    mockCreate.mockRejectedValue(new Error('Mongo down'));
    const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const { NotificationLogService } = await import(
      '@/services/notification-log-service'
    );
    const id = await NotificationLogService.recordAttempt({
      templateKey: 'order_confirmation',
      userId: USER_ID,
      channel: 'whatsapp',
      success: true,
    });
    expect(id).toBeNull();
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });
});

describe('REQ-055 NotificationLogService.updateStatus', () => {
  it('AC2 — updates an existing queued doc to delivered', async () => {
    const { NotificationLogService } = await import(
      '@/services/notification-log-service'
    );
    const result = await NotificationLogService.updateStatus(
      'wamid.abc',
      'delivered'
    );
    expect(result).toBe(true);
    expect(mockFindOneAndUpdate).toHaveBeenCalledTimes(1);
  });

  it('AC5 — failureReason recorded on failed status', async () => {
    const { NotificationLogService } = await import(
      '@/services/notification-log-service'
    );
    await NotificationLogService.updateStatus(
      'wamid.abc',
      'failed',
      'no contact'
    );
    expect(mockFindOneAndUpdate).toHaveBeenCalledTimes(1);
    const updateArg = mockFindOneAndUpdate.mock.calls[0][1] as {
      $set: Record<string, unknown>;
    };
    expect(updateArg.$set.status).toBe('failed');
    expect(updateArg.$set.failureReason).toBe('no contact');
  });

  it('AC5 — filter guards monotonic transitions (delivered → read allowed)', async () => {
    const { NotificationLogService } = await import(
      '@/services/notification-log-service'
    );
    await NotificationLogService.updateStatus('wamid.abc', 'read');
    const filterArg = mockFindOneAndUpdate.mock.calls[0][0] as {
      messageId: string;
      status: { $in: string[] };
    };
    expect(filterArg.messageId).toBe('wamid.abc');
    // Must allow updates from earlier states only.
    expect(filterArg.status.$in).toEqual(
      expect.arrayContaining(['queued', 'sent', 'delivered'])
    );
    // Must NOT allow updates from later states (read is the target).
    expect(filterArg.status.$in).not.toContain('read');
  });

  it('AC5 — failed is terminal: subsequent delivered does not overwrite', async () => {
    // Simulate a doc already at 'failed' (no match found by the gated filter).
    mockFindOneAndUpdate.mockResolvedValue(null);
    const { NotificationLogService } = await import(
      '@/services/notification-log-service'
    );
    const result = await NotificationLogService.updateStatus(
      'wamid.abc',
      'delivered'
    );
    expect(result).toBe(false);
    // Filter excludes 'failed' as a permissible source state.
    const filterArg = mockFindOneAndUpdate.mock.calls[0][0] as {
      status: { $in: string[] };
    };
    expect(filterArg.status.$in).not.toContain('failed');
  });

  it('AC2 — unknown messageId returns false, no throw', async () => {
    mockFindOneAndUpdate.mockResolvedValue(null);
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const { NotificationLogService } = await import(
      '@/services/notification-log-service'
    );
    const result = await NotificationLogService.updateStatus(
      'wamid.unknown',
      'delivered'
    );
    expect(result).toBe(false);
    spy.mockRestore();
  });

  it('AC2 — update error is swallowed; no throw, console.error called', async () => {
    mockFindOneAndUpdate.mockRejectedValue(new Error('Mongo down'));
    const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const { NotificationLogService } = await import(
      '@/services/notification-log-service'
    );
    const result = await NotificationLogService.updateStatus(
      'wamid.abc',
      'delivered'
    );
    expect(result).toBe(false);
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  it('AC5 — queued → sent allowed (smallest forward step)', async () => {
    const { NotificationLogService } = await import(
      '@/services/notification-log-service'
    );
    await NotificationLogService.updateStatus('wamid.abc', 'sent');
    const filterArg = mockFindOneAndUpdate.mock.calls[0][0] as {
      status: { $in: string[] };
    };
    expect(filterArg.status.$in).toContain('queued');
  });
});
