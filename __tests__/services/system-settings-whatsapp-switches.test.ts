/**
 * @requirement REQ-125 (AC2) — switch settings: defaults ON, unknown keys
 * dropped, locked templates have no key, cache invalidated on save.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/mongodb', () => ({ connectDB: vi.fn() }));

const findOne = vi.fn();
const findOneAndUpdate = vi.fn();
vi.mock('@/models/system-settings-model', () => ({
  default: {
    findOne: (...a: unknown[]) => findOne(...a),
    findOneAndUpdate: (...a: unknown[]) => findOneAndUpdate(...a),
  },
}));

import {
  SystemSettingsService,
  normaliseWhatsAppSwitches,
} from '@/services/system-settings-service';
import {
  invalidateWhatsAppSwitchCache,
  isTemplateSuppressed,
} from '@/lib/whatsapp-send-gate';

const ADMIN = '65a1b2c3d4e5f6a7b8c9d0ff';

beforeEach(() => {
  findOne.mockReset();
  findOneAndUpdate.mockReset().mockResolvedValue({});
  invalidateWhatsAppSwitchCache();
});

describe('normaliseWhatsAppSwitches', () => {
  it('defaults to master ON and no switches', () => {
    expect(normaliseWhatsAppSwitches(undefined)).toEqual({
      masterEnabled: true,
      switches: {},
    });
  });

  it('drops unknown keys and non-boolean values; the PIN has no key', () => {
    expect(
      normaliseWhatsAppSwitches({
        masterEnabled: false,
        switches: {
          receipt: false,
          verification_pin: false,
          nonsense: false,
          staff_alert: 'no',
        },
      })
    ).toEqual({ masterEnabled: false, switches: { receipt: false } });
  });
});

describe('SystemSettingsService WhatsApp switches', () => {
  it('reads defaults when no document exists', async () => {
    findOne.mockReturnValue({ lean: () => Promise.resolve(null) });
    expect(
      await SystemSettingsService.getWhatsAppNotificationSwitches()
    ).toEqual({ masterEnabled: true, switches: {} });
  });

  it('saves with change history and returns before and after', async () => {
    findOne.mockReturnValue({
      lean: () =>
        Promise.resolve({ value: { masterEnabled: true, switches: {} } }),
    });
    const { before, after } =
      await SystemSettingsService.updateWhatsAppNotificationSwitches(
        { masterEnabled: true, switches: { payment_reminder: false } },
        ADMIN
      );
    expect(before.switches).toEqual({});
    expect(after.switches).toEqual({ payment_reminder: false });
    const [filter, update] = findOneAndUpdate.mock.calls[0];
    expect(filter).toEqual({ key: 'whatsapp-notification-switches' });
    expect(update.$push.changeHistory.reason).toMatch(/WhatsApp/);
  });

  it('takes effect after a save without waiting for the cache TTL', async () => {
    findOne.mockReturnValue({
      lean: () =>
        Promise.resolve({ value: { masterEnabled: true, switches: {} } }),
    });
    expect(await isTemplateSuppressed('payment_link')).toBe(false);
    findOne.mockReturnValue({
      lean: () =>
        Promise.resolve({
          value: { masterEnabled: true, switches: { payment_reminder: false } },
        }),
    });
    await SystemSettingsService.updateWhatsAppNotificationSwitches(
      { masterEnabled: true, switches: { payment_reminder: false } },
      ADMIN
    );
    expect(await isTemplateSuppressed('payment_link')).toBe(true);
  });
});
