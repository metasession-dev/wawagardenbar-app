/**
 * @requirement REQ-122 — AC2, AC6, AC7
 * @srs REQ-SETTINGS-006, REQ-WA-014, REQ-DASH-004
 *
 * Pure rules: defaults, merging stored rules, quiet hours, who sees an alert,
 * who receives each WhatsApp level, and which levels are due.
 */
import { describe, it, expect } from 'vitest';
import {
  canSeeNotification,
  DEFAULT_STAFF_ALERT_RULES,
  dueLevels,
  isInQuietHours,
  mergeStaffAlertRules,
  resolveRecipients,
  staffAlertPath,
  STAFF_ALERT_TYPES,
  type AlertRecipientCandidate,
} from '@/lib/staff-alerts/staff-alert-rules';

const staff = (over: Partial<AlertRecipientCandidate> & { id: string }) => ({
  roles: ['csr'],
  alertPhone: '2348000000001',
  alertPhoneVerified: true,
  alertsEnabled: true,
  onShift: true,
  ...over,
});

describe('AC6: alert rules and their defaults', () => {
  it('ships the defaults from the issue for each type', () => {
    expect(DEFAULT_STAFF_ALERT_RULES.order).toMatchObject({
      inAppRoles: ['kitchen', 'csr'],
      whatsappAfterMinutes: 5,
      whatsappRoles: ['csr'],
      escalateAfterMinutes: 10,
      escalateRoles: ['manager'],
    });
    expect(DEFAULT_STAFF_ALERT_RULES.booking).toMatchObject({
      inAppRoles: ['csr', 'admin'],
      whatsappAfterMinutes: 10,
      escalateAfterMinutes: 30,
      escalateRoles: ['admin'],
    });
    expect(DEFAULT_STAFF_ALERT_RULES.support).toMatchObject({
      inAppRoles: ['csr'],
      whatsappAfterMinutes: 10,
      escalateAfterMinutes: 30,
      escalateRoles: ['admin'],
    });
    expect(DEFAULT_STAFF_ALERT_RULES.refund).toMatchObject({
      inAppRoles: ['manager'],
      whatsappRoles: ['manager'],
      whatsappAfterMinutes: 10,
      escalateAfterMinutes: 60,
      escalateRoles: ['super-admin'],
    });
  });

  it('uses the defaults when nothing is stored, and never mutates them', () => {
    const merged = mergeStaffAlertRules(undefined);
    expect(merged).toEqual(DEFAULT_STAFF_ALERT_RULES);
    merged.order.inAppRoles.push('admin');
    expect(DEFAULT_STAFF_ALERT_RULES.order.inAppRoles).toEqual([
      'kitchen',
      'csr',
    ]);
  });

  it('an admin change to one field is used and the rest stays default (US-B5.10)', () => {
    const merged = mergeStaffAlertRules({
      booking: { whatsappAfterMinutes: 15 },
    });
    expect(merged.booking.whatsappAfterMinutes).toBe(15);
    expect(merged.booking.escalateAfterMinutes).toBe(30);
    expect(merged.order).toEqual(DEFAULT_STAFF_ALERT_RULES.order);
  });

  it('ignores invalid values instead of switching alerts off', () => {
    const merged = mergeStaffAlertRules({
      order: {
        whatsappAfterMinutes: -3,
        inAppRoles: ['hacker', 'csr'],
        escalateAfterMinutes: 'soon',
        quietHours: { start: '25:00', end: 'nope' },
      },
    });
    expect(merged.order.whatsappAfterMinutes).toBe(5);
    expect(merged.order.inAppRoles).toEqual(['csr']);
    expect(merged.order.escalateAfterMinutes).toBe(10);
    expect(merged.order.quietHours).toBeNull();
    expect(Object.keys(merged)).toEqual([...STAFF_ALERT_TYPES]);
  });

  it('accepts quiet hours that wrap past midnight', () => {
    const merged = mergeStaffAlertRules({
      order: { quietHours: { start: '23:00', end: '06:00' } },
    });
    expect(merged.order.quietHours).toEqual({ start: '23:00', end: '06:00' });
    expect(isInQuietHours(merged.order.quietHours, '23:30')).toBe(true);
    expect(isInQuietHours(merged.order.quietHours, '03:00')).toBe(true);
    expect(isInQuietHours(merged.order.quietHours, '12:00')).toBe(false);
    expect(isInQuietHours({ start: '09:00', end: '17:00' }, '17:00')).toBe(
      false
    );
    expect(isInQuietHours(null, '03:00')).toBe(false);
  });
});

describe('AC2: who can see a notification (any-of roles)', () => {
  const audience = {
    targetRoles: ['kitchen', 'csr'],
    targetUserIds: ['named-1'],
  };

  it('is visible to any one of the target roles or a named user', () => {
    expect(canSeeNotification(audience, { id: 'u', roles: ['csr'] })).toBe(
      true
    );
    expect(
      canSeeNotification(audience, { id: 'u', roles: ['manager', 'kitchen'] })
    ).toBe(true);
    expect(
      canSeeNotification(audience, { id: 'named-1', roles: ['manager'] })
    ).toBe(true);
  });

  it('is hidden from every other role, and from customers', () => {
    expect(canSeeNotification(audience, { id: 'u', roles: ['manager'] })).toBe(
      false
    );
    expect(canSeeNotification(audience, { id: 'u', roles: ['customer'] })).toBe(
      false
    );
    expect(canSeeNotification(audience, { id: 'u', roles: [] })).toBe(false);
  });
});

describe('AC7: who receives each WhatsApp level', () => {
  const rule = DEFAULT_STAFF_ALERT_RULES.order; // csr at level 1, manager at level 2

  it('level 1 goes to on-shift csr with a verified number (US-B5.6)', () => {
    const csrOn = staff({ id: 'csr-on' });
    const csrOff = staff({ id: 'csr-off', onShift: false });
    const csrUnverified = staff({ id: 'csr-unv', alertPhoneVerified: false });
    const csrDisabled = staff({ id: 'csr-dis', alertsEnabled: false });
    const noPhone = staff({ id: 'csr-nop', alertPhone: null });
    const kitchen = staff({ id: 'k', roles: ['kitchen'] });
    const got = resolveRecipients(1, rule, [
      csrOn,
      csrOff,
      csrUnverified,
      csrDisabled,
      noPhone,
      kitchen,
    ]);
    expect(got.map((u) => u.id)).toEqual(['csr-on']);
  });

  it('level 2 goes to the managers with a verified number, on shift or not (US-B5.6)', () => {
    const m1 = staff({ id: 'm1', roles: ['manager'], onShift: false });
    const m2 = staff({ id: 'm2', roles: ['manager'] });
    const csr = staff({ id: 'c' });
    expect(resolveRecipients(2, rule, [m1, m2, csr]).map((u) => u.id)).toEqual([
      'm1',
      'm2',
    ]);
  });

  it('with nobody on shift, level 1 goes straight to the escalation roles (US-B5.7)', () => {
    const csrOff = staff({ id: 'csr-off', onShift: false });
    const m = staff({ id: 'm', roles: ['manager'], onShift: false });
    expect(resolveRecipients(1, rule, [csrOff, m]).map((u) => u.id)).toEqual([
      'm',
    ]);
  });

  it('a user holding csr and manager receives one message per level (US-B5.8)', () => {
    const both = staff({ id: 'both', roles: ['csr', 'manager'] });
    expect(resolveRecipients(1, rule, [both, both]).map((u) => u.id)).toEqual([
      'both',
    ]);
    expect(resolveRecipients(2, rule, [both]).map((u) => u.id)).toEqual([
      'both',
    ]);
  });

  it('named users get level 1 when reachable, even off shift', () => {
    const named = staff({ id: 'named', roles: ['manager'], onShift: false });
    const csrOn = staff({ id: 'csr-on' });
    const withNamed = { ...rule, namedUserIds: ['named'] };
    expect(
      resolveRecipients(1, withNamed, [named, csrOn]).map((u) => u.id)
    ).toEqual(['named', 'csr-on']);
  });

  it('nobody reachable means nobody is sent to', () => {
    expect(resolveRecipients(1, rule, [])).toEqual([]);
    expect(
      resolveRecipients(2, rule, [
        staff({ id: 'x', roles: ['manager'], alertPhoneVerified: false }),
      ])
    ).toEqual([]);
  });
});

describe('AC7: which levels are due', () => {
  const rule = DEFAULT_STAFF_ALERT_RULES.order; // 5 and 10 minutes

  it('level 1 at five minutes, once (US-B5.6)', () => {
    expect(
      dueLevels({
        currentLevel: 0,
        elapsedMinutes: 4,
        rule,
        inQuietHours: false,
      })
    ).toEqual([]);
    expect(
      dueLevels({
        currentLevel: 0,
        elapsedMinutes: 5,
        rule,
        inQuietHours: false,
      })
    ).toEqual([1]);
    expect(
      dueLevels({
        currentLevel: 1,
        elapsedMinutes: 9,
        rule,
        inQuietHours: false,
      })
    ).toEqual([]);
  });

  it('level 2 at ten minutes, once', () => {
    expect(
      dueLevels({
        currentLevel: 1,
        elapsedMinutes: 10,
        rule,
        inQuietHours: false,
      })
    ).toEqual([2]);
    expect(
      dueLevels({
        currentLevel: 2,
        elapsedMinutes: 90,
        rule,
        inQuietHours: false,
      })
    ).toEqual([]);
  });

  it('both levels are due when a late run finds both thresholds passed', () => {
    expect(
      dueLevels({
        currentLevel: 0,
        elapsedMinutes: 12,
        rule,
        inQuietHours: false,
      })
    ).toEqual([1, 2]);
  });

  it('quiet hours hold WhatsApp without advancing a level', () => {
    expect(
      dueLevels({
        currentLevel: 0,
        elapsedMinutes: 30,
        rule,
        inQuietHours: true,
      })
    ).toEqual([]);
  });

  it('uses the changed delay (US-B5.10)', () => {
    const slow = mergeStaffAlertRules({
      booking: { whatsappAfterMinutes: 15 },
    }).booking;
    expect(
      dueLevels({
        currentLevel: 0,
        elapsedMinutes: 10,
        rule: slow,
        inQuietHours: false,
      })
    ).toEqual([]);
    expect(
      dueLevels({
        currentLevel: 0,
        elapsedMinutes: 15,
        rule: slow,
        inQuietHours: false,
      })
    ).toEqual([1]);
  });
});

describe('AC1: dashboard link per type', () => {
  it('opens the item', () => {
    expect(staffAlertPath('order', 'abc')).toBe('orders/abc');
    expect(staffAlertPath('support', 'abc')).toBe('support/abc');
    expect(staffAlertPath('booking', 'abc')).toBe('bookings/abc');
    expect(staffAlertPath('refund', 'abc')).toBe('orders/abc');
  });
});
