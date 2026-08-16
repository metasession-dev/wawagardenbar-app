/**
 * Service-level coverage for the paginated tabs list + stats query.
 *
 * Mongoose chain is mocked: `TabModel.find(q).sort().skip().limit().lean()`
 * resolves to the rows; `countDocuments(q)` resolves to the total;
 * `aggregate(pipeline)` resolves to the orders-sum aggregate.
 *
 * Asserts:
 * - `listAllTabsWithFilters` passes skip + limit through to the chain
 * - returned shape is `{ tabs, total }`
 * - `getTabStats` runs three counts in parallel and returns the live
 *   totals (independent of any filter/page state)
 *
 * Ref: Tabs Management performance work.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/mongodb', () => ({
  default: vi.fn(),
  connectDB: vi.fn(),
}));

const limitSpy = vi.fn();
const skipSpy = vi.fn();
const sortSpy = vi.fn();
const leanSpy = vi.fn();
const findSpy = vi.fn();
const countDocumentsSpy = vi.fn();
const aggregateSpy = vi.fn();

function resetChain(rows: unknown[]) {
  // Build a chainable mock that exposes the spies as call sites but
  // ultimately resolves the .lean() to the provided rows.
  leanSpy.mockResolvedValue(rows);
  limitSpy.mockReturnValue({ lean: leanSpy });
  skipSpy.mockReturnValue({ limit: limitSpy, lean: leanSpy });
  sortSpy.mockReturnValue({ skip: skipSpy, lean: leanSpy });
  findSpy.mockReturnValue({ sort: sortSpy });
}

vi.mock('@/models/tab-model', () => ({
  default: {
    find: (...args: unknown[]) => findSpy(...args),
    countDocuments: (...args: unknown[]) => countDocumentsSpy(...args),
    aggregate: (...args: unknown[]) => aggregateSpy(...args),
  },
}));

import { TabService } from '@/services/tab-service';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('TabService.listAllTabsWithFilters — pagination', () => {
  it('passes skip + limit to the chain and returns { tabs, total }', async () => {
    const stubRows = [{ _id: 'a' }, { _id: 'b' }];
    resetChain(stubRows);
    countDocumentsSpy.mockResolvedValue(42);

    const result = await TabService.listAllTabsWithFilters({
      statuses: ['open'],
      skip: 50,
      limit: 25,
    });

    expect(findSpy).toHaveBeenCalledWith({ status: { $in: ['open'] } });
    expect(sortSpy).toHaveBeenCalledWith({ openedAt: -1 });
    expect(skipSpy).toHaveBeenCalledWith(50);
    expect(limitSpy).toHaveBeenCalledWith(25);
    expect(countDocumentsSpy).toHaveBeenCalledWith({
      status: { $in: ['open'] },
    });
    expect(result.tabs).toHaveLength(2);
    expect(result.total).toBe(42);
  });

  it('legacy callers without pagination still get the whole result set', async () => {
    const stubRows = new Array(10).fill(null).map((_, i) => ({ _id: i }));
    resetChain(stubRows);
    countDocumentsSpy.mockResolvedValue(10);

    const result = await TabService.listAllTabsWithFilters({});

    // No skip/limit on the chain when neither is provided.
    expect(skipSpy).not.toHaveBeenCalled();
    expect(limitSpy).not.toHaveBeenCalled();
    expect(result.tabs).toHaveLength(10);
    expect(result.total).toBe(10);
  });

  it('reconciled filter narrows the count query the same way as the find query', async () => {
    resetChain([]);
    countDocumentsSpy.mockResolvedValue(0);

    await TabService.listAllTabsWithFilters({
      reconciled: 'reconciled',
      skip: 0,
      limit: 25,
    });

    expect(findSpy).toHaveBeenCalledWith({ reconciled: true });
    expect(countDocumentsSpy).toHaveBeenCalledWith({ reconciled: true });
  });

  it('date-range filter applies to both find and countDocuments', async () => {
    resetChain([]);
    countDocumentsSpy.mockResolvedValue(0);

    const startDate = new Date('2026-05-01T00:00:00Z');
    const endDate = new Date('2026-05-15T00:00:00Z');
    await TabService.listAllTabsWithFilters({
      startDate,
      endDate,
      skip: 0,
      limit: 25,
    });

    const findCallArgs = findSpy.mock.calls[0][0];
    const countCallArgs = countDocumentsSpy.mock.calls[0][0];
    expect(findCallArgs).toMatchObject({
      openedAt: { $gte: startDate },
    });
    expect(countCallArgs).toMatchObject({
      openedAt: { $gte: startDate },
    });
  });

  // REQ-099 AC2 — "Written off" filter, independent of status checkboxes.
  it('writtenOffOnly with no statuses filters strictly on paymentStatus', async () => {
    resetChain([]);
    countDocumentsSpy.mockResolvedValue(0);

    await TabService.listAllTabsWithFilters({
      writtenOffOnly: true,
      skip: 0,
      limit: 25,
    });

    expect(findSpy).toHaveBeenCalledWith({ paymentStatus: 'written-off' });
    expect(countDocumentsSpy).toHaveBeenCalledWith({
      paymentStatus: 'written-off',
    });
  });

  // REQ-099 AC2 — checking "Written off" alongside status checkboxes is
  // additive (OR), not exclusive — it doesn't require "Closed" to also be
  // checked to surface written-off tabs.
  it('writtenOffOnly with statuses selected ORs paymentStatus in, not ANDs it', async () => {
    resetChain([]);
    countDocumentsSpy.mockResolvedValue(0);

    await TabService.listAllTabsWithFilters({
      statuses: ['open'],
      writtenOffOnly: true,
      skip: 0,
      limit: 25,
    });

    const expectedQuery = {
      $or: [{ status: { $in: ['open'] } }, { paymentStatus: 'written-off' }],
    };
    expect(findSpy).toHaveBeenCalledWith(expectedQuery);
    expect(countDocumentsSpy).toHaveBeenCalledWith(expectedQuery);
  });

  // REQ-099 AC3 — existing "Closed" filter behaviour is unchanged when the
  // new "Written off" filter is not used (regression guard).
  it('writtenOffOnly unset leaves the existing statuses-only query unchanged', async () => {
    resetChain([]);
    countDocumentsSpy.mockResolvedValue(0);

    await TabService.listAllTabsWithFilters({
      statuses: ['closed'],
      skip: 0,
      limit: 25,
    });

    expect(findSpy).toHaveBeenCalledWith({ status: { $in: ['closed'] } });
    expect(countDocumentsSpy).toHaveBeenCalledWith({
      status: { $in: ['closed'] },
    });
  });
});

describe('TabService.getTabStats', () => {
  it('returns the three live totals computed in parallel', async () => {
    countDocumentsSpy
      .mockResolvedValueOnce(1566) // totalTabs
      .mockResolvedValueOnce(132); // totalOpenTabs
    aggregateSpy.mockResolvedValueOnce([{ _id: null, sum: 2368 }]);

    const stats = await TabService.getTabStats();

    expect(stats).toEqual({
      totalTabs: 1566,
      totalOpenTabs: 132,
      totalOrders: 2368,
    });

    // First countDocuments is the unfiltered total.
    expect(countDocumentsSpy.mock.calls[0][0]).toEqual({});
    // Second is the open-only filter.
    expect(countDocumentsSpy.mock.calls[1][0]).toEqual({ status: 'open' });
    // Aggregate sums orders.length across every tab.
    expect(aggregateSpy).toHaveBeenCalled();
  });

  it('handles the empty-database case (no orders aggregate row)', async () => {
    countDocumentsSpy.mockResolvedValueOnce(0).mockResolvedValueOnce(0);
    aggregateSpy.mockResolvedValueOnce([]);

    const stats = await TabService.getTabStats();

    expect(stats).toEqual({
      totalTabs: 0,
      totalOpenTabs: 0,
      totalOrders: 0,
    });
  });
});
