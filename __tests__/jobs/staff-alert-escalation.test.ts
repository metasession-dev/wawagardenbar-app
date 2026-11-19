/**
 * @requirement REQ-122 — AC6, AC7
 * @srs REQ-WA-014, REQ-SETTINGS-006
 *
 * The escalation run, end to end against an in-memory store that implements
 * the atomic level claim: each WhatsApp level is sent once, with an on-shift
 * fallback to the escalation roles, one message per user per level, quiet
 * hours, an acknowledged item stops, a failed send does not repeat.
 * US-B5.6, US-B5.7, US-B5.8, US-B5.10.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('@/lib/mongodb', () => ({ connectDB: vi.fn() }));

type Doc = Record<string, any>;
const store: Doc[] = [];
let users: Doc[] = [];
let storedRules: unknown = null;
let hhmm = '12:00';

vi.mock('@/models/staff-notification-model', () => {
  const lt = (value: number, bound: { $lt: number }) => value < bound.$lt;
  return {
    default: {
      find: (q: Doc) => {
        let rows = store.filter(
          (d) =>
            d.acknowledgedAt == null && lt(d.escalationLevel, q.escalationLevel)
        );
        const chain = {
          sort: () => {
            rows = [...rows].sort(
              (a, b) => a.createdAt.getTime() - b.createdAt.getTime()
            );
            return chain;
          },
          limit: () => chain,
          lean: async () => rows.map((r) => ({ ...r })),
        };
        return chain;
      },
      // Atomic claim: returns the document as it was, or null when the
      // conditions no longer hold (acknowledged, or the level is taken).
      findOneAndUpdate: async (q: Doc, update: { $set: Doc }) => {
        const doc = store.find(
          (d) =>
            d._id === q._id &&
            d.acknowledgedAt == null &&
            lt(d.escalationLevel, q.escalationLevel)
        );
        if (!doc) return null;
        const before = { ...doc };
        Object.assign(doc, update.$set);
        return before;
      },
    },
  };
});
vi.mock('@/models/user-model', () => ({
  default: {
    find: () => ({
      select: () => ({ lean: async () => users }),
    }),
  },
}));
vi.mock('@/models/system-settings-model', () => ({
  default: {
    findOne: async () => (storedRules ? { value: storedRules } : null),
  },
}));
const sendMessage = vi.hoisted(() => vi.fn());
vi.mock('@/lib/whatsapp', () => ({ WhatsAppService: { sendMessage } }));
const recordAttempt = vi.hoisted(() => vi.fn());
vi.mock('@/services/notification-log-service', () => ({
  NotificationLogService: { recordAttempt },
}));
vi.mock('@/lib/business-time', () => ({
  getCurrentBusinessHHMM: () => hhmm,
}));

import { StaffNotificationService } from '@/services/staff-notification-service';
import { runStaffAlertEscalationJob } from '@/lib/scheduled-jobs';

const T0 = new Date('2026-11-16T12:00:00.000Z');
const minutesAfter = (m: number) => new Date(T0.getTime() + m * 60_000);

function notification(over: Doc = {}): Doc {
  return {
    _id: `n${store.length + 1}`,
    type: 'order',
    refId: 'order-1',
    reference: 'WG2611160001',
    createdAt: T0,
    acknowledgedAt: null,
    escalationLevel: 0,
    ...over,
  };
}

const user = (id: string, roles: string[], over: Doc = {}): Doc => ({
  _id: id,
  roles,
  alertPhone: `234800000${id.length}${id}`,
  alertPhoneVerified: true,
  alertsEnabled: true,
  onShift: true,
  ...over,
});

const recipients = () => sendMessage.mock.calls.map((c) => c[0]);

beforeEach(() => {
  vi.clearAllMocks();
  store.length = 0;
  users = [];
  storedRules = null;
  hhmm = '12:00';
  sendMessage.mockResolvedValue({ success: true, messageId: 'wamid.1' });
});

afterEach(() => vi.useRealTimers());

describe('AC7: levels are sent once', () => {
  it('[US-B5.6] sends level 1 to the on-shift csr at 5 minutes and level 2 to each manager at 10', async () => {
    store.push(notification());
    users = [
      user('1', ['csr']),
      user('2', ['manager'], { onShift: false }),
      user('3', ['manager']),
    ];

    await StaffNotificationService.runEscalation(minutesAfter(4));
    expect(sendMessage).not.toHaveBeenCalled();

    await StaffNotificationService.runEscalation(minutesAfter(5));
    expect(recipients()).toEqual([users[0].alertPhone]);

    sendMessage.mockClear();
    await StaffNotificationService.runEscalation(minutesAfter(10));
    expect(recipients().sort()).toEqual(
      [users[1].alertPhone, users[2].alertPhone].sort()
    );
    expect(store[0].escalationLevel).toBe(2);
  });

  it('sends the staff_alert template with label, reference, minutes and the dashboard path', async () => {
    store.push(notification());
    users = [user('1', ['csr'])];
    await StaffNotificationService.runEscalation(minutesAfter(6));
    expect(sendMessage).toHaveBeenCalledWith(
      users[0].alertPhone,
      'staff_alert',
      {
        bodyParams: ['New order', 'WG2611160001', '6'],
        buttonParams: [{ index: 0, params: ['orders/order-1'] }],
      }
    );
    expect(recordAttempt).toHaveBeenCalledWith(
      expect.objectContaining({
        templateKey: 'staff_alert',
        userId: '1',
        channel: 'whatsapp',
        success: true,
      })
    );
  });

  it('never repeats a level on later runs, and a duplicate run in the same tick sends nothing', async () => {
    store.push(notification());
    users = [user('1', ['csr'])];
    await Promise.all([
      StaffNotificationService.runEscalation(minutesAfter(5)),
      StaffNotificationService.runEscalation(minutesAfter(5)),
    ]);
    await StaffNotificationService.runEscalation(minutesAfter(8));
    expect(sendMessage).toHaveBeenCalledTimes(1);
  });

  it('a late run that finds both thresholds passed sends each level once', async () => {
    store.push(notification());
    users = [user('1', ['csr']), user('2', ['manager'])];
    await StaffNotificationService.runEscalation(minutesAfter(30));
    expect(recipients().sort()).toEqual(
      [users[0].alertPhone, users[1].alertPhone].sort()
    );
    await StaffNotificationService.runEscalation(minutesAfter(31));
    expect(sendMessage).toHaveBeenCalledTimes(2);
  });

  it('is what the scheduled job runs', async () => {
    store.push(notification({ createdAt: new Date(Date.now() - 6 * 60_000) }));
    users = [user('1', ['csr'])];
    const result = await runStaffAlertEscalationJob();
    expect(result).toEqual({ checked: 1, sent: 1 });
  });
});

describe('AC7: fallback, dedup and stop', () => {
  it('[US-B5.7] with nobody on shift the first WhatsApp alert goes to the escalation roles', async () => {
    store.push(notification());
    users = [
      user('1', ['csr'], { onShift: false }),
      user('2', ['manager'], { onShift: false }),
    ];
    await StaffNotificationService.runEscalation(minutesAfter(5));
    expect(recipients()).toEqual([users[1].alertPhone]);
  });

  it('[US-B5.8] a csr and manager gets one message per level, not two', async () => {
    store.push(notification());
    users = [user('1', ['csr', 'manager'])];
    await StaffNotificationService.runEscalation(minutesAfter(5));
    await StaffNotificationService.runEscalation(minutesAfter(10));
    expect(sendMessage).toHaveBeenCalledTimes(2);
  });

  it('[US-B5.9] an acknowledged item stops escalating', async () => {
    store.push(notification());
    users = [user('1', ['csr']), user('2', ['manager'])];
    await StaffNotificationService.runEscalation(minutesAfter(5));
    store[0].acknowledgedAt = minutesAfter(6);
    store[0].acknowledgedBy = '1';
    await StaffNotificationService.runEscalation(minutesAfter(11));
    expect(sendMessage).toHaveBeenCalledTimes(1);
  });

  it('skips unverified numbers and staff who turned alerts off', async () => {
    store.push(notification());
    users = [
      user('1', ['csr'], { alertPhoneVerified: false }),
      user('2', ['csr'], { alertsEnabled: false }),
    ];
    await StaffNotificationService.runEscalation(minutesAfter(5));
    expect(sendMessage).not.toHaveBeenCalled();
    // The level is still claimed: nobody was reachable, and it is not retried every minute.
    expect(store[0].escalationLevel).toBe(1);
  });
});

describe('AC6: configured rules and quiet hours', () => {
  it('[US-B5.10] uses the admin-changed delay for the type', async () => {
    store.push(
      notification({ type: 'booking', refId: 'b1', reference: 'BK-0042' })
    );
    storedRules = { booking: { whatsappAfterMinutes: 15 } };
    users = [user('1', ['csr'])];
    await StaffNotificationService.runEscalation(minutesAfter(12));
    expect(sendMessage).not.toHaveBeenCalled();
    await StaffNotificationService.runEscalation(minutesAfter(15));
    expect(sendMessage).toHaveBeenCalledTimes(1);
    expect(sendMessage.mock.calls[0][2].bodyParams[0]).toBe(
      'New booking request'
    );
  });

  it('holds WhatsApp during quiet hours and sends once they end', async () => {
    store.push(notification());
    storedRules = { order: { quietHours: { start: '22:00', end: '06:00' } } };
    users = [user('1', ['csr'])];
    hhmm = '23:00';
    await StaffNotificationService.runEscalation(minutesAfter(20));
    expect(sendMessage).not.toHaveBeenCalled();
    expect(store[0].escalationLevel).toBe(0);
    hhmm = '06:30';
    await StaffNotificationService.runEscalation(minutesAfter(25));
    expect(sendMessage).toHaveBeenCalledTimes(1);
  });
});

describe('failures never break the run', () => {
  it('a failed send (template not approved yet) is logged once and not retried every minute', async () => {
    sendMessage.mockResolvedValue({
      success: false,
      errorCode: 'TEMPLATE_NOT_FOUND',
      message: 'template missing',
    });
    store.push(notification());
    users = [user('1', ['csr'])];
    const first = await StaffNotificationService.runEscalation(minutesAfter(5));
    await StaffNotificationService.runEscalation(minutesAfter(6));
    expect(first.sent).toBe(0);
    expect(sendMessage).toHaveBeenCalledTimes(1);
    expect(recordAttempt).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        errorCode: 'TEMPLATE_NOT_FOUND',
      })
    );
  });

  it('a send that throws does not stop the other recipients or the run', async () => {
    sendMessage
      .mockRejectedValueOnce(new Error('network'))
      .mockResolvedValue({ success: true });
    store.push(notification());
    users = [user('1', ['csr']), user('2', ['csr'])];
    const result = await StaffNotificationService.runEscalation(
      minutesAfter(5)
    );
    expect(result.sent).toBe(1);
    expect(sendMessage).toHaveBeenCalledTimes(2);
  });
});
