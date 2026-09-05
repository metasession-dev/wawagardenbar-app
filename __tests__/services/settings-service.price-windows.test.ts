/**
 * @requirement REQ-102 — Time-window price resolution (happy-hour > show > default)
 *
 * Coverage of the three new SettingsService helpers:
 *   - isShowPriceActive
 *   - isHappyHourActive
 *   - resolveActivePriceField (ADR-004's centralized precedence)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/mongodb', () => ({
  default: vi.fn(),
  connectDB: vi.fn(),
}));

const mockFindOne = vi.fn();

vi.mock('@/models/settings-model', () => ({
  default: {
    findOne: (...a: unknown[]) => mockFindOne(...a),
    create: vi.fn(),
  },
}));

function makeSettings(overrides: Record<string, unknown> = {}) {
  return {
    showPriceWindow: { enabled: false, start: '00:00', end: '00:00' },
    happyHourWindow: { enabled: false, start: '00:00', end: '00:00' },
    ...overrides,
  };
}

beforeEach(() => {
  mockFindOne.mockReset();
  return import('@/services/settings-service').then((mod) => {
    mod.SettingsService.clearCache();
  });
});

describe('REQ-102 SettingsService.isShowPriceActive', () => {
  it('returns false when the window is disabled', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-01T18:00:00'));
    mockFindOne.mockResolvedValue(
      makeSettings({
        showPriceWindow: { enabled: false, start: '17:00', end: '19:00' },
      })
    );
    const { SettingsService } = await import('@/services/settings-service');
    expect(await SettingsService.isShowPriceActive()).toBe(false);
    vi.useRealTimers();
  });

  it('returns true when enabled and current time is within the window', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-01T18:00:00'));
    mockFindOne.mockResolvedValue(
      makeSettings({
        showPriceWindow: { enabled: true, start: '17:00', end: '19:00' },
      })
    );
    const { SettingsService } = await import('@/services/settings-service');
    expect(await SettingsService.isShowPriceActive()).toBe(true);
    vi.useRealTimers();
  });

  it('returns false when enabled but current time is outside the window', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-01T20:00:00'));
    mockFindOne.mockResolvedValue(
      makeSettings({
        showPriceWindow: { enabled: true, start: '17:00', end: '19:00' },
      })
    );
    const { SettingsService } = await import('@/services/settings-service');
    expect(await SettingsService.isShowPriceActive()).toBe(false);
    vi.useRealTimers();
  });
});

describe('REQ-102 SettingsService.isHappyHourActive', () => {
  it('returns true when enabled and current time is within the window', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-01T16:30:00'));
    mockFindOne.mockResolvedValue(
      makeSettings({
        happyHourWindow: { enabled: true, start: '16:00', end: '17:00' },
      })
    );
    const { SettingsService } = await import('@/services/settings-service');
    expect(await SettingsService.isHappyHourActive()).toBe(true);
    vi.useRealTimers();
  });
});

describe('REQ-102 SettingsService.resolveActivePriceField — precedence (AC3-AC4)', () => {
  it('returns "price" when neither window is active', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-01T10:00:00'));
    mockFindOne.mockResolvedValue(makeSettings());
    const { SettingsService } = await import('@/services/settings-service');
    expect(await SettingsService.resolveActivePriceField()).toBe('price');
    vi.useRealTimers();
  });

  it('returns "showPrice" when only the show-price window is active', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-01T18:00:00'));
    mockFindOne.mockResolvedValue(
      makeSettings({
        showPriceWindow: { enabled: true, start: '17:00', end: '19:00' },
        happyHourWindow: { enabled: false, start: '00:00', end: '00:00' },
      })
    );
    const { SettingsService } = await import('@/services/settings-service');
    expect(await SettingsService.resolveActivePriceField()).toBe('showPrice');
    vi.useRealTimers();
  });

  it('returns "happyHourPrice" when only the happy-hour window is active', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-01T16:30:00'));
    mockFindOne.mockResolvedValue(
      makeSettings({
        showPriceWindow: { enabled: false, start: '00:00', end: '00:00' },
        happyHourWindow: { enabled: true, start: '16:00', end: '17:00' },
      })
    );
    const { SettingsService } = await import('@/services/settings-service');
    expect(await SettingsService.resolveActivePriceField()).toBe(
      'happyHourPrice'
    );
    vi.useRealTimers();
  });

  it('returns "happyHourPrice" when both windows are simultaneously active (happy-hour wins)', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-01T17:30:00'));
    mockFindOne.mockResolvedValue(
      makeSettings({
        showPriceWindow: { enabled: true, start: '16:00', end: '19:00' },
        happyHourWindow: { enabled: true, start: '17:00', end: '18:00' },
      })
    );
    const { SettingsService } = await import('@/services/settings-service');
    expect(await SettingsService.resolveActivePriceField()).toBe(
      'happyHourPrice'
    );
    vi.useRealTimers();
  });
});
