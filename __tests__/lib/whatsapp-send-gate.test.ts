/**
 * @requirement REQ-125 (AC2, AC3, AC4) — the one gate in the WhatsApp send path.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const mockGetSwitches = vi.fn();
vi.mock('@/services/system-settings-service', () => ({
  SystemSettingsService: {
    getWhatsAppNotificationSwitches: (...a: unknown[]) => mockGetSwitches(...a),
  },
}));

import {
  SUPPRESSED_ADMIN_DISABLED,
  invalidateWhatsAppSwitchCache,
  isSuppressedBySettings,
  isTemplateSuppressed,
} from '@/lib/whatsapp-send-gate';
import { WhatsAppService } from '@/lib/whatsapp';

describe('isSuppressedBySettings', () => {
  it('sends everything when nothing is saved (default ON)', () => {
    const s = { masterEnabled: true, switches: {} };
    expect(isSuppressedBySettings('order_status_update_v2', s)).toBe(false);
    expect(isSuppressedBySettings('payment_link', s)).toBe(false);
  });

  it('suppresses only the switched-off entry', () => {
    const s = { masterEnabled: true, switches: { payment_reminder: false } };
    expect(isSuppressedBySettings('payment_link', s)).toBe(true);
    expect(isSuppressedBySettings('receipt', s)).toBe(false);
  });

  it('suppresses every catalogued template when the master switch is off', () => {
    const s = { masterEnabled: false, switches: {} };
    for (const t of ['order_confirmation', 'staff_alert', 'support_reply']) {
      expect(isSuppressedBySettings(t, s)).toBe(true);
    }
  });

  it('never suppresses the sign-in PIN, even with master off and a hand-edited setting', () => {
    const s = {
      masterEnabled: false,
      switches: { verification_pin: false } as Record<string, boolean>,
    };
    expect(isSuppressedBySettings('verification_pin', s)).toBe(false);
  });

  it('does not suppress a template that is in no catalogue entry', () => {
    expect(
      isSuppressedBySettings('some_new_template', {
        masterEnabled: false,
        switches: {},
      })
    ).toBe(false);
  });
});

describe('isTemplateSuppressed', () => {
  beforeEach(() => {
    invalidateWhatsAppSwitchCache();
    mockGetSwitches.mockReset();
  });

  it('does not read settings for the PIN', async () => {
    mockGetSwitches.mockResolvedValue({ masterEnabled: false, switches: {} });
    expect(await isTemplateSuppressed('verification_pin')).toBe(false);
    expect(mockGetSwitches).not.toHaveBeenCalled();
  });

  it('fails open when the settings read throws', async () => {
    mockGetSwitches.mockRejectedValue(new Error('db down'));
    expect(await isTemplateSuppressed('order_confirmation')).toBe(false);
  });

  it('caches the read and re-reads after invalidation', async () => {
    mockGetSwitches.mockResolvedValue({
      masterEnabled: true,
      switches: { receipt: false },
    });
    expect(await isTemplateSuppressed('receipt')).toBe(true);
    expect(await isTemplateSuppressed('receipt')).toBe(true);
    expect(mockGetSwitches).toHaveBeenCalledTimes(1);
    invalidateWhatsAppSwitchCache();
    mockGetSwitches.mockResolvedValue({ masterEnabled: true, switches: {} });
    expect(await isTemplateSuppressed('receipt')).toBe(false);
    expect(mockGetSwitches).toHaveBeenCalledTimes(2);
  });
});

describe('WhatsAppService.sendMessage gate', () => {
  const fetchMock = vi.fn();
  beforeEach(() => {
    invalidateWhatsAppSwitchCache();
    mockGetSwitches.mockReset();
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
    vi.stubEnv('ENABLE_WHATSAPP_NOTIFICATIONS', 'true');
    vi.stubEnv('WHATSAPP_ACCESS_TOKEN', 'token');
    vi.stubEnv('WHATSAPP_PHONE_NUMBER_ID', '123');
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it('returns SUPPRESSED_ADMIN_DISABLED and never calls Meta for a switched-off template', async () => {
    mockGetSwitches.mockResolvedValue({
      masterEnabled: true,
      switches: { payment_reminder: false },
    });
    const result = await WhatsAppService.sendMessage(
      '+2347000000001',
      'payment_link',
      ['a', 'b']
    );
    expect(result.success).toBe(false);
    expect(result.errorCode).toBe(SUPPRESSED_ADMIN_DISABLED);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('still sends the PIN with the master switch off', async () => {
    mockGetSwitches.mockResolvedValue({ masterEnabled: false, switches: {} });
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ messages: [{ id: 'wamid.1' }] }),
    });
    const result = await WhatsAppService.sendMessage(
      '+2347000000001',
      'verification_pin',
      ['123456']
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(result.errorCode).not.toBe(SUPPRESSED_ADMIN_DISABLED);
  });
});
