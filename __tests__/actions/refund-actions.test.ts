/**
 * @requirement REQ-PAY-014 (REQ-128 AC3, AC4, AC6) — staff refund server actions
 * Only manager, admin and super-admin; a csr, kitchen user or customer is
 * refused on the server whatever the UI shows.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const session = vi.hoisted(() => ({ current: {} as Record<string, unknown> }));
vi.mock('next/headers', () => ({ cookies: async () => ({}) }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('iron-session', () => ({
  getIronSession: async () => session.current,
}));

const requestRefund = vi.hoisted(() => vi.fn());
const approve = vi.hoisted(() => vi.fn());
const reject = vi.hoisted(() => vi.fn());
vi.mock('@/services/refund-service', () => ({
  RefundService: {
    requestRefund,
    approveRefundRequest: approve,
    rejectRefundRequest: reject,
  },
  toKobo: (n: number) => Math.round(n * 100),
}));

import {
  approveRefundRequestAction,
  refundOrderAction,
  rejectRefundRequestAction,
} from '@/app/actions/admin/refund-actions';

const as = (roles: string[], extra: Record<string, unknown> = {}) => {
  session.current = {
    isLoggedIn: true,
    userId: '65a1b2c3d4e5f6a7b8c9d0e4',
    email: 's@example.com',
    role: roles[0],
    roles,
    ...extra,
  };
};

beforeEach(() => {
  vi.clearAllMocks();
  requestRefund.mockResolvedValue({ ok: true, refund: { _id: 'r1' } });
  approve.mockResolvedValue({ ok: true, refund: { _id: 'r1' } });
  reject.mockResolvedValue({ ok: true });
});

describe.each(['csr', 'kitchen', 'customer'])('[AC4] %s is refused', (role) => {
  beforeEach(() => as([role]));
  it('refund, approve and reject all return Unauthorized and call nothing', async () => {
    expect(
      await refundOrderAction({ orderId: 'o', mode: 'full', reason: 'x' })
    ).toMatchObject({ success: false, error: 'Unauthorized' });
    expect(
      await approveRefundRequestAction({ ticketId: 't', mode: 'full' })
    ).toMatchObject({ success: false, error: 'Unauthorized' });
    expect(
      await rejectRefundRequestAction({ ticketId: 't', reason: 'x' })
    ).toMatchObject({ success: false, error: 'Unauthorized' });
    expect(requestRefund).not.toHaveBeenCalled();
    expect(approve).not.toHaveBeenCalled();
    expect(reject).not.toHaveBeenCalled();
  });
});

it('[AC4] a signed-out visitor is refused', async () => {
  session.current = { isLoggedIn: false };
  expect(
    await refundOrderAction({ orderId: 'o', mode: 'full', reason: 'x' })
  ).toMatchObject({ success: false });
  expect(requestRefund).not.toHaveBeenCalled();
});

describe.each([['manager'], ['admin'], ['super-admin']])(
  '%s may refund',
  (role) => {
    beforeEach(() => as([role]));

    it('[AC4] partial refund of ₦2,000 with a reason (audit actor passed on)', async () => {
      const r = await refundOrderAction({
        orderId: 'o1',
        mode: 'partial',
        amountNaira: 2000,
        reason: 'Missing item',
      });
      expect(r.success).toBe(true);
      expect(requestRefund).toHaveBeenCalledWith(
        expect.objectContaining({
          orderId: 'o1',
          type: 'partial',
          amountKobo: 200000,
          reason: 'Missing item',
          source: 'staff',
          approvedBy: expect.objectContaining({
            userId: '65a1b2c3d4e5f6a7b8c9d0e4',
            role,
          }),
        })
      );
    });

    it('a reason is required, and a partial needs a positive amount', async () => {
      expect(
        await refundOrderAction({ orderId: 'o', mode: 'full', reason: '  ' })
      ).toMatchObject({ success: false });
      expect(
        await refundOrderAction({
          orderId: 'o',
          mode: 'partial',
          amountNaira: 0,
          reason: 'x',
        })
      ).toMatchObject({ success: false });
      expect(
        await refundOrderAction({
          orderId: 'o',
          mode: 'partial',
          amountNaira: NaN,
          reason: 'x',
        })
      ).toMatchObject({ success: false });
      expect(requestRefund).not.toHaveBeenCalled();
    });

    it('[AC3] approves a request as a partial, and rejects with a reason', async () => {
      expect(
        (
          await approveRefundRequestAction({
            ticketId: 't',
            mode: 'partial',
            amountNaira: 2000,
          })
        ).success
      ).toBe(true);
      expect(approve).toHaveBeenCalledWith(
        expect.objectContaining({ ticketId: 't', partialAmountKobo: 200000 })
      );
      expect(
        (
          await rejectRefundRequestAction({
            ticketId: 't',
            reason: 'Already served',
          })
        ).success
      ).toBe(true);
      expect(reject).toHaveBeenCalledWith(
        expect.objectContaining({ reason: 'Already served' })
      );
      expect(
        await rejectRefundRequestAction({ ticketId: 't', reason: '' })
      ).toMatchObject({ success: false });
    });

    it('a service refusal is returned as an error', async () => {
      requestRefund.mockResolvedValueOnce({
        ok: false,
        code: 'exceeds_balance',
        error: 'too much',
      });
      expect(
        await refundOrderAction({ orderId: 'o', mode: 'full', reason: 'x' })
      ).toEqual({ success: false, error: 'too much' });
    });
  }
);

it('[AC4] access is the union of roles: a csr who is also a manager may refund', async () => {
  as(['csr', 'manager']);
  expect(
    (await refundOrderAction({ orderId: 'o', mode: 'full', reason: 'x' }))
      .success
  ).toBe(true);
});
