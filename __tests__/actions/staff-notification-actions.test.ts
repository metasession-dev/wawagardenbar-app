/**
 * @requirement REQ-122 — AC2, AC4, AC5, AC6
 * @srs REQ-DASH-004, REQ-DASH-006, REQ-AUTHA-008, REQ-SETTINGS-006
 *
 * The actions behind the bell, the on-shift toggle, the alert number and the
 * Staff alerts rules: staff only for reads and acknowledgement, admin only for
 * rules and for setting someone else's number, never a redirect (R-66).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const getCurrentSession = vi.hoisted(() => vi.fn());
vi.mock('@/lib/auth-middleware', () => ({ getCurrentSession }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

const N = vi.hoisted(() => ({
  listForViewer: vi.fn(),
  countForViewer: vi.fn(),
  acknowledge: vi.fn(),
  acknowledgeAll: vi.fn(),
  acknowledgeByRef: vi.fn(),
  getRules: vi.fn(),
  updateRules: vi.fn(),
}));
vi.mock('@/services/staff-notification-service', () => ({
  StaffNotificationService: N,
}));
const A = vi.hoisted(() => ({
  getMine: vi.fn(),
  setOnShift: vi.fn(),
  setAlertPhone: vi.fn(),
  requestVerification: vi.fn(),
  verify: vi.fn(),
  removeAlertPhone: vi.fn(),
}));
vi.mock('@/services/staff-alert-number-service', () => ({
  StaffAlertNumberService: A,
}));

import {
  acknowledgeAllNotificationsAction,
  acknowledgeByRefAction,
  acknowledgeNotificationAction,
  getMyAlertSettingsAction,
  getStaffAlertRulesAction,
  listMyNotificationsAction,
  saveMyAlertPhoneAction,
  sendMyAlertPinAction,
  setOnShiftAction,
  setStaffAlertPhoneAction,
  updateStaffAlertRulesAction,
  verifyMyAlertPinAction,
} from '@/app/actions/staff-notifications/staff-notification-actions';

const session = (roles: string[], over: Record<string, unknown> = {}) => ({
  isLoggedIn: true,
  userId: 'u1',
  role: roles[0],
  roles,
  ...over,
});

const NOT_ALLOWED = { success: false, message: 'Not allowed.' };

beforeEach(() => {
  vi.clearAllMocks();
  getCurrentSession.mockResolvedValue(session(['csr']));
  N.listForViewer.mockResolvedValue([]);
  N.countForViewer.mockResolvedValue(0);
  N.acknowledge.mockResolvedValue(true);
  N.acknowledgeAll.mockResolvedValue(2);
  N.acknowledgeByRef.mockResolvedValue(1);
  N.getRules.mockResolvedValue({ order: {} });
  N.updateRules.mockResolvedValue({ order: {} });
  A.getMine.mockResolvedValue({
    alertPhone: null,
    alertPhoneVerified: false,
    alertsEnabled: true,
    onShift: false,
  });
  for (const fn of [
    A.setOnShift,
    A.setAlertPhone,
    A.requestVerification,
    A.verify,
    A.removeAlertPhone,
  ]) {
    fn.mockResolvedValue({ success: true, message: 'ok' });
  }
});

describe('nobody but staff reads or acknowledges alerts', () => {
  it.each([
    ['no session', null],
    ['a guest', { isGuest: true, guestId: 'g' }],
    ['a customer', session(['customer'])],
    ['a logged-out staff cookie', session(['csr'], { isLoggedIn: false })],
    ['a session with no user id', session(['csr'], { userId: undefined })],
  ])('refuses %s without redirecting', async (_name, s) => {
    getCurrentSession.mockResolvedValue(s);
    expect(await listMyNotificationsAction()).toEqual(NOT_ALLOWED);
    expect(
      await acknowledgeNotificationAction('665a00000000000000000001')
    ).toEqual(NOT_ALLOWED);
    expect(await acknowledgeAllNotificationsAction()).toEqual(NOT_ALLOWED);
    expect(await acknowledgeByRefAction('o1')).toEqual(NOT_ALLOWED);
    expect(await setOnShiftAction(true)).toEqual(NOT_ALLOWED);
    expect(await getMyAlertSettingsAction()).toEqual(NOT_ALLOWED);
    expect(N.listForViewer).not.toHaveBeenCalled();
    expect(N.acknowledge).not.toHaveBeenCalled();
  });
});

describe('AC2: reads are scoped to the caller roles', () => {
  it('passes the caller id and all of their roles, with a bounded page size', async () => {
    getCurrentSession.mockResolvedValue(session(['csr', 'manager']));
    N.listForViewer.mockResolvedValue([{ id: 'n1' }]);
    N.countForViewer.mockResolvedValue(7);
    const r = await listMyNotificationsAction({
      limit: 5000,
      oldestFirst: true,
    });
    expect(r).toEqual({
      success: true,
      data: { items: [{ id: 'n1' }], count: 7 },
    });
    expect(N.listForViewer).toHaveBeenCalledWith(
      { id: 'u1', roles: expect.arrayContaining(['csr', 'manager']) },
      { limit: 100, oldestFirst: true }
    );
  });

  it('acknowledges through the same viewer scope, and reports an unknown item', async () => {
    expect(
      (await acknowledgeNotificationAction('665a00000000000000000001')).success
    ).toBe(true);
    expect(N.acknowledge.mock.calls[0][1]).toEqual({
      id: 'u1',
      roles: ['csr'],
    });
    N.acknowledge.mockResolvedValue(false);
    expect(
      await acknowledgeNotificationAction('665a00000000000000000009')
    ).toMatchObject({
      success: false,
    });
    expect(await acknowledgeAllNotificationsAction()).toEqual({
      success: true,
      data: { acknowledged: 2 },
    });
    expect((await acknowledgeByRefAction('order-1')).data).toEqual({
      acknowledged: 1,
    });
  });
});

describe('AC4 and AC5: own alert number and shift', () => {
  it('a staff member changes only their own number, never another user id', async () => {
    await saveMyAlertPhoneAction('0801 234 5678');
    await sendMyAlertPinAction();
    await verifyMyAlertPinAction('123456');
    await setOnShiftAction(true);
    expect(A.setAlertPhone).toHaveBeenCalledWith('u1', '0801 234 5678');
    expect(A.requestVerification).toHaveBeenCalledWith('u1');
    expect(A.verify).toHaveBeenCalledWith('u1', '123456');
    expect(A.setOnShift).toHaveBeenCalledWith('u1', true);
  });
});

describe('AC6: only admins edit rules or set another member number', () => {
  it.each([['csr'], ['kitchen'], ['manager']])(
    '%s is refused',
    async (role) => {
      getCurrentSession.mockResolvedValue(session([role]));
      expect(await getStaffAlertRulesAction()).toEqual(NOT_ALLOWED);
      expect(await updateStaffAlertRulesAction({ order: {} })).toEqual(
        NOT_ALLOWED
      );
      expect(await setStaffAlertPhoneAction('s2', '+2348012345678')).toEqual(
        NOT_ALLOWED
      );
      expect(N.updateRules).not.toHaveBeenCalled();
      expect(A.setAlertPhone).not.toHaveBeenCalled();
    }
  );

  it.each([['admin'], ['super-admin']])('%s can', async (role) => {
    getCurrentSession.mockResolvedValue(session([role]));
    expect((await getStaffAlertRulesAction()).success).toBe(true);
    expect((await updateStaffAlertRulesAction({ order: {} })).success).toBe(
      true
    );
    expect(N.updateRules).toHaveBeenCalledWith({ order: {} }, 'u1');
    expect(
      (await setStaffAlertPhoneAction('s2', '+2348012345678')).success
    ).toBe(true);
    expect(A.setAlertPhone).toHaveBeenCalledWith('s2', '+2348012345678');
  });

  it('a user holding csr and admin counts as admin (any-of roles)', async () => {
    getCurrentSession.mockResolvedValue(session(['csr', 'admin']));
    expect((await updateStaffAlertRulesAction({ order: {} })).success).toBe(
      true
    );
  });
});
