/**
 * @requirement REQ-125 (AC7, AC8) — switch actions are admin/super-admin only
 * and every change is audit-logged with who, key, before and after.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

const mockSession = vi.fn();
vi.mock('@/lib/auth-middleware', () => ({
  getCurrentSession: (...a: unknown[]) => mockSession(...a),
}));

const mockUpdate = vi.fn();
const mockGet = vi.fn();
vi.mock('@/services/system-settings-service', () => ({
  SystemSettingsService: {
    updateWhatsAppNotificationSwitches: (...a: unknown[]) => mockUpdate(...a),
    getWhatsAppNotificationSwitches: (...a: unknown[]) => mockGet(...a),
  },
}));

const mockAudit = vi.fn();
vi.mock('@/services/audit-log-service', () => ({
  AuditLogService: { createLog: (...a: unknown[]) => mockAudit(...a) },
}));

import {
  diffSwitches,
  getWhatsAppNotificationSwitchesAction,
  updateWhatsAppNotificationSwitchesAction,
} from '@/app/actions/admin/whatsapp-notification-switch-actions';

const ADMIN_ID = '65a1b2c3d4e5f6a7b8c9d0ff';
const staff = (roles: string[]) => ({
  isLoggedIn: true,
  userId: ADMIN_ID,
  email: 'a@example.com',
  role: roles[0],
  roles,
});

beforeEach(() => {
  mockSession.mockReset();
  mockUpdate.mockReset();
  mockGet.mockReset();
  mockAudit.mockReset().mockResolvedValue({});
});

describe('role gate (AC8)', () => {
  it.each([
    ['csr', staff(['csr'])],
    ['kitchen', staff(['kitchen'])],
    [
      'customer',
      {
        isLoggedIn: true,
        userId: ADMIN_ID,
        role: 'customer',
        roles: ['customer'],
      },
    ],
    ['no session', null],
    ['logged out', { isLoggedIn: false }],
  ])('rejects %s on read and write', async (_name, session) => {
    mockSession.mockResolvedValue(session);
    expect((await getWhatsAppNotificationSwitchesAction()).success).toBe(false);
    expect(
      (await updateWhatsAppNotificationSwitchesAction({ masterEnabled: false }))
        .success
    ).toBe(false);
    expect(mockUpdate).not.toHaveBeenCalled();
    expect(mockAudit).not.toHaveBeenCalled();
  });

  it.each([['admin'], ['super-admin']])('allows %s', async (role) => {
    mockSession.mockResolvedValue(staff([role]));
    mockGet.mockResolvedValue({ masterEnabled: true, switches: {} });
    expect((await getWhatsAppNotificationSwitchesAction()).success).toBe(true);
  });
});

describe('audit (AC7)', () => {
  it('records who, which key, before and after', async () => {
    mockSession.mockResolvedValue(staff(['admin']));
    mockUpdate.mockResolvedValue({
      before: { masterEnabled: true, switches: {} },
      after: { masterEnabled: true, switches: { staff_alert: false } },
    });
    const result = await updateWhatsAppNotificationSwitchesAction({
      masterEnabled: true,
      switches: { staff_alert: false },
    });
    expect(result.success).toBe(true);
    expect(mockAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: ADMIN_ID,
        action: 'settings.whatsapp_notification_switches_updated',
        details: {
          changes: [{ key: 'staff_alert', before: true, after: false }],
        },
      })
    );
  });

  it('writes no audit entry when nothing changed', async () => {
    mockSession.mockResolvedValue(staff(['super-admin']));
    const same = { masterEnabled: true, switches: {} };
    mockUpdate.mockResolvedValue({ before: same, after: same });
    await updateWhatsAppNotificationSwitchesAction(same);
    expect(mockAudit).not.toHaveBeenCalled();
  });

  it('still reports success when the audit write fails', async () => {
    mockSession.mockResolvedValue(staff(['admin']));
    mockUpdate.mockResolvedValue({
      before: { masterEnabled: true, switches: {} },
      after: { masterEnabled: false, switches: {} },
    });
    mockAudit.mockRejectedValue(new Error('audit down'));
    expect(
      (await updateWhatsAppNotificationSwitchesAction({ masterEnabled: false }))
        .success
    ).toBe(true);
  });
});

describe('diffSwitches', () => {
  it('reports the master switch and treats a missing key as ON', () => {
    expect(
      diffSwitches(
        { masterEnabled: true, switches: {} },
        { masterEnabled: false, switches: { receipt: false } }
      )
    ).toEqual([
      { key: 'master', before: true, after: false },
      { key: 'receipt', before: true, after: false },
    ]);
  });
});
