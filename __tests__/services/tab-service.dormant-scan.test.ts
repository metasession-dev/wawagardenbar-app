/**
 * @requirement REQ-098 AC5 — TabService.scanDormantOpenTabs.
 *
 * Mirrors `services/order-service.ts`'s `scanStalePaidOrders` structure
 * and its 24h-dedup contract (`IncidentEventService.dedupRecent`).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/mongodb', () => ({
  default: vi.fn(),
  connectDB: vi.fn(),
}));

const TAB_ID_A = '65a1b2c3d4e5f6a7b8c9d0aa';
const TAB_ID_B = '65a1b2c3d4e5f6a7b8c9d0bb';

const mockTabFind = vi.fn();
const mockDedupRecent = vi.fn();
const mockRecordIncident = vi.fn().mockResolvedValue(undefined);

vi.mock('@/models/tab-model', () => ({
  default: {
    find: (...args: unknown[]) => mockTabFind(...args),
  },
}));

vi.mock('@/services/incident-event-service', () => ({
  IncidentEventService: {
    dedupRecent: (...args: unknown[]) => mockDedupRecent(...args),
    recordIncident: (...args: unknown[]) => mockRecordIncident(...args),
  },
}));

import { TabService } from '@/services/tab-service';

function chainable<T>(rows: T[]) {
  return {
    sort: () => ({
      limit: () => ({
        lean: () => Promise.resolve(rows),
      }),
    }),
  };
}

beforeEach(() => {
  mockTabFind.mockReset();
  mockDedupRecent.mockReset();
  mockDedupRecent.mockResolvedValue(false);
  mockRecordIncident.mockReset();
  mockRecordIncident.mockResolvedValue(undefined);
});

describe('TabService.scanDormantOpenTabs — AC5', () => {
  it('records a dormant_open_tab incident for each open tab older than the threshold', async () => {
    const openedAt = new Date(Date.now() - 30 * 60 * 60 * 1000); // 30h ago
    mockTabFind.mockReturnValue(
      chainable([
        {
          _id: { toString: () => TAB_ID_A },
          tabNumber: 'TAB-A1-1',
          tableNumber: 'A1',
          openedAt,
        },
      ])
    );

    const result = await TabService.scanDormantOpenTabs({
      thresholdHours: 24,
    });

    expect(mockTabFind).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'open' })
    );
    expect(mockRecordIncident).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: 'dormant_open_tab',
        entityId: TAB_ID_A,
      })
    );
    expect(result).toEqual({ scanned: 1, flagged: 1, skippedAsDup: 0 });
  });

  it('dedups per 24h window — does not re-flag an already-recorded dormant tab', async () => {
    const openedAt = new Date(Date.now() - 48 * 60 * 60 * 1000);
    mockTabFind.mockReturnValue(
      chainable([
        {
          _id: { toString: () => TAB_ID_B },
          tabNumber: 'TAB-B1-2',
          tableNumber: 'B1',
          openedAt,
        },
      ])
    );
    mockDedupRecent.mockResolvedValue(true);

    const result = await TabService.scanDormantOpenTabs({
      thresholdHours: 24,
    });

    expect(mockRecordIncident).not.toHaveBeenCalled();
    expect(result).toEqual({ scanned: 1, flagged: 0, skippedAsDup: 1 });
  });

  it('never mutates the tab — read-only scan', async () => {
    mockTabFind.mockReturnValue(chainable([]));

    await TabService.scanDormantOpenTabs({ thresholdHours: 24 });

    // The scan only ever calls TabModel.find — no update/save method is
    // invoked anywhere in scanDormantOpenTabs.
    expect(mockTabFind).toHaveBeenCalledTimes(1);
  });
});
