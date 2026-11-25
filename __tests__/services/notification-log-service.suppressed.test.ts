/**
 * @requirement REQ-125 (AC7) — suppressed sends are filterable in the log.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/mongodb', () => ({ connectDB: vi.fn() }));

const find = vi.fn();
vi.mock('@/models/notification-log-model', () => ({
  default: { find: (...a: unknown[]) => find(...a) },
  NOTIFICATION_LOG_STATUS_ORDER: {},
}));

import { NotificationLogService } from '@/services/notification-log-service';

function chain(rows: unknown[]) {
  const c = {
    sort: vi.fn(() => c),
    limit: vi.fn(() => c),
    lean: vi.fn(() => Promise.resolve(rows)),
  };
  return c;
}

beforeEach(() => find.mockReset());

describe('NotificationLogService.listByErrorCode', () => {
  it('queries by errorCode, newest first, capped', async () => {
    const c = chain([{ templateKey: 'payment_link' }]);
    find.mockReturnValue(c);
    const rows = await NotificationLogService.listByErrorCode(
      'suppressed_admin_disabled',
      { limit: 9999 }
    );
    expect(find).toHaveBeenCalledWith({
      errorCode: 'suppressed_admin_disabled',
    });
    expect(c.sort).toHaveBeenCalledWith({ createdAt: -1 });
    expect(c.limit).toHaveBeenCalledWith(500);
    expect(rows).toHaveLength(1);
  });

  it('adds a since filter', async () => {
    const c = chain([]);
    find.mockReturnValue(c);
    const since = new Date('2026-11-25T00:00:00Z');
    await NotificationLogService.listByErrorCode('suppressed_admin_disabled', {
      since,
    });
    expect(find).toHaveBeenCalledWith({
      errorCode: 'suppressed_admin_disabled',
      createdAt: { $gte: since },
    });
  });
});
