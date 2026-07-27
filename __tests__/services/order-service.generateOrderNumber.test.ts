/**
 * @requirement REQ-095 — OrderService.generateOrderNumber atomic sequence
 *
 * The previous implementation derived the sequence from
 * `Order.countDocuments()`: two concurrent calls could read the same
 * count before either inserted, colliding on the unique `orderNumber`
 * index — and because a failed insert never advances the count, every
 * subsequent call for the rest of the day recomputed the exact same
 * taken number, permanently blocking order creation until the calendar
 * date rolled over. Reproduced live during REQ-095 regression testing
 * (see compliance/evidence/REQ-095/test-execution-summary.md).
 *
 * Verifies the atomic-counter + retry-on-collision replacement:
 *   - the sequence comes from the counter's atomic `$inc` result, not
 *     a `countDocuments()` read
 *   - a number the counter doesn't yet know about (pre-existing legacy
 *     data) is skipped rather than returned
 *   - exhausting the retry budget throws rather than silently returning
 *     a colliding number
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/mongodb', () => ({
  default: vi.fn(),
  connectDB: vi.fn().mockResolvedValue(undefined),
}));

const mockFindOneAndUpdate = vi.fn();
vi.mock('@/models/order-number-counter-model', () => ({
  default: {
    findOneAndUpdate: (...a: unknown[]) => mockFindOneAndUpdate(...a),
  },
}));

const mockExists = vi.fn();
vi.mock('@/models/order-model', () => ({
  default: {
    exists: (...a: unknown[]) => mockExists(...a),
  },
}));

import { OrderService } from '@/services/order-service';

// `generateOrderNumber` is a private static method. TS `private` is a
// compile-time-only marker, so calling it through a loosely-typed
// reference is the standard way to unit-test it directly without
// dragging in the full `createOrder` dependency graph (MenuItemModel,
// PriceHistoryService, etc.), none of which is relevant to number
// generation.
const generateOrderNumber = (): Promise<string> =>
  (
    OrderService as unknown as { generateOrderNumber(): Promise<string> }
  ).generateOrderNumber();

describe('OrderService.generateOrderNumber', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns a WG<YYMMDD><seq> number seeded from the counter, not a count', async () => {
    mockFindOneAndUpdate.mockResolvedValueOnce({ seq: 7 });
    mockExists.mockResolvedValueOnce(false);

    const orderNumber = await generateOrderNumber();

    expect(mockFindOneAndUpdate).toHaveBeenCalledTimes(1);
    const [filter, update, options] = mockFindOneAndUpdate.mock.calls[0];
    expect(update).toEqual({ $inc: { seq: 1 } });
    expect(options).toMatchObject({ upsert: true, new: true });
    expect(orderNumber).toMatch(/^WG\d{6}0007$/);
    expect((filter as { _id: string })._id).toBe(orderNumber.slice(2, 8));
  });

  it('skips a sequence value that already exists and advances to the next', async () => {
    mockFindOneAndUpdate
      .mockResolvedValueOnce({ seq: 11 })
      .mockResolvedValueOnce({ seq: 12 });
    mockExists
      .mockResolvedValueOnce(true) // 0011 already taken (e.g. legacy data)
      .mockResolvedValueOnce(false); // 0012 is free

    const orderNumber = await generateOrderNumber();

    expect(mockFindOneAndUpdate).toHaveBeenCalledTimes(2);
    expect(mockExists).toHaveBeenCalledTimes(2);
    expect(orderNumber).toMatch(/0012$/);
  });

  it('throws after exhausting the retry budget rather than returning a colliding number', async () => {
    mockFindOneAndUpdate.mockResolvedValue({ seq: 1 });
    mockExists.mockResolvedValue(true); // always taken

    await expect(generateOrderNumber()).rejects.toThrow(/unique order number/i);
    expect(mockFindOneAndUpdate).toHaveBeenCalledTimes(5);
  });
});
