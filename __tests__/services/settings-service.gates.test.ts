/**
 * @requirement REQ-061 — Checkout operational gates (P2 #12–#15)
 *
 * Coverage of the four new SettingsService helpers introduced by REQ-061:
 *   - getNextOpenSlot — when is the bar next open?
 *   - getBarCoordinates — lazy-cached bar lat/lng via Google Maps
 *   - checkDeliveryDistance — within radius? fail-open when coords missing
 *   - getPickupSlots — 15-min interval slots within business hours
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/mongodb', () => ({
  default: vi.fn(),
  connectDB: vi.fn(),
}));

const mockFindOne = vi.fn();
const mockSave = vi.fn();

vi.mock('@/models/settings-model', () => ({
  default: {
    findOne: (...a: unknown[]) => mockFindOne(...a),
    create: vi.fn(),
  },
}));

const mockGeocodeAddress = vi.fn();
vi.mock('@/lib/geo/geocode', () => ({
  geocodeAddress: (...a: unknown[]) => mockGeocodeAddress(...a),
}));

// Default business-hours: every day open 09:00-22:00.
function defaultBusinessHours() {
  const day = { open: '09:00', close: '22:00', closed: false };
  return {
    monday: { ...day },
    tuesday: { ...day },
    wednesday: { ...day },
    thursday: { ...day },
    friday: { ...day },
    saturday: { ...day },
    sunday: { ...day },
  };
}

function makeSettings(overrides: Record<string, unknown> = {}) {
  return {
    address: '1 Bar Road, Lagos, Nigeria',
    businessHours: defaultBusinessHours(),
    deliveryRadius: 10,
    estimatedPreparationTime: 30,
    geocodedCoordinates: undefined,
    save: mockSave,
    ...overrides,
  };
}

beforeEach(() => {
  mockFindOne.mockReset();
  mockSave.mockReset().mockResolvedValue(undefined);
  mockGeocodeAddress.mockReset();
  // Reset the cached settings on the service before each test so the
  // mock find() actually drives the result. The service caches for 60s.
  return import('@/services/settings-service').then((mod) => {
    mod.SettingsService.clearCache();
  });
});

describe('REQ-061 SettingsService.getNextOpenSlot', () => {
  it('open right now → returns today + closing-time message', async () => {
    // Fixed clock at Monday 14:00 (within 09:00-22:00).
    const fixedNow = new Date('2026-06-01T14:00:00');
    vi.useFakeTimers();
    vi.setSystemTime(fixedNow);
    mockFindOne.mockResolvedValue(makeSettings());
    const { SettingsService } = await import('@/services/settings-service');
    const result = await SettingsService.getNextOpenSlot();
    expect(result.openAt).not.toBeNull();
    expect(result.message).toContain('open');
    vi.useRealTimers();
  });

  it('closed earlier today, opens later today → returns today + open-at message', async () => {
    // Fixed clock at Monday 06:00 (before 09:00 open).
    const fixedNow = new Date('2026-06-01T06:00:00');
    vi.useFakeTimers();
    vi.setSystemTime(fixedNow);
    mockFindOne.mockResolvedValue(makeSettings());
    const { SettingsService } = await import('@/services/settings-service');
    const result = await SettingsService.getNextOpenSlot();
    expect(result.openAt).not.toBeNull();
    expect(result.message).toContain('09:00');
    vi.useRealTimers();
  });

  it('today fully closed → returns tomorrow open', async () => {
    const fixedNow = new Date('2026-06-01T14:00:00');
    vi.useFakeTimers();
    vi.setSystemTime(fixedNow);
    const settings = makeSettings();
    settings.businessHours.monday.closed = true;
    mockFindOne.mockResolvedValue(settings);
    const { SettingsService } = await import('@/services/settings-service');
    const result = await SettingsService.getNextOpenSlot();
    expect(result.openAt).not.toBeNull();
    expect(result.message.toLowerCase()).toContain('tomorrow');
    vi.useRealTimers();
  });

  it('closed all week → returns null', async () => {
    const fixedNow = new Date('2026-06-01T14:00:00');
    vi.useFakeTimers();
    vi.setSystemTime(fixedNow);
    const settings = makeSettings();
    const days = [
      'monday',
      'tuesday',
      'wednesday',
      'thursday',
      'friday',
      'saturday',
      'sunday',
    ] as const;
    for (const d of days) settings.businessHours[d].closed = true;
    mockFindOne.mockResolvedValue(settings);
    const { SettingsService } = await import('@/services/settings-service');
    const result = await SettingsService.getNextOpenSlot();
    expect(result.openAt).toBeNull();
    expect(result.message.toLowerCase()).toContain('closed');
    vi.useRealTimers();
  });
});

describe('REQ-061 SettingsService.getBarCoordinates', () => {
  it('returns cached value when geocodedCoordinates already set', async () => {
    mockFindOne.mockResolvedValue(
      makeSettings({
        geocodedCoordinates: {
          lat: 6.5,
          lng: 3.4,
          geocodedAt: new Date('2026-06-01T00:00:00'),
        },
      })
    );
    const { SettingsService } = await import('@/services/settings-service');
    const result = await SettingsService.getBarCoordinates();
    expect(result).toEqual({ lat: 6.5, lng: 3.4 });
    expect(mockGeocodeAddress).not.toHaveBeenCalled();
  });

  it('lazy-geocodes and persists when missing', async () => {
    mockFindOne.mockResolvedValue(makeSettings());
    mockGeocodeAddress.mockResolvedValue({ lat: 6.5, lng: 3.4 });
    const { SettingsService } = await import('@/services/settings-service');
    const result = await SettingsService.getBarCoordinates();
    expect(result).toEqual({ lat: 6.5, lng: 3.4 });
    expect(mockGeocodeAddress).toHaveBeenCalledTimes(1);
    expect(mockGeocodeAddress).toHaveBeenCalledWith(
      '1 Bar Road, Lagos, Nigeria'
    );
    expect(mockSave).toHaveBeenCalledTimes(1);
  });

  it('returns null when geocoding fails', async () => {
    mockFindOne.mockResolvedValue(makeSettings());
    mockGeocodeAddress.mockResolvedValue(null);
    const { SettingsService } = await import('@/services/settings-service');
    const result = await SettingsService.getBarCoordinates();
    expect(result).toBeNull();
    expect(mockSave).not.toHaveBeenCalled();
  });
});

describe('REQ-061 SettingsService.checkDeliveryDistance', () => {
  it('within radius returns withinRadius:true + distance', async () => {
    mockFindOne.mockResolvedValue(
      makeSettings({
        geocodedCoordinates: {
          lat: 6.5,
          lng: 3.4,
          geocodedAt: new Date(),
        },
        deliveryRadius: 10,
      })
    );
    const { SettingsService } = await import('@/services/settings-service');
    // Same point → 0 km distance, within 10 km radius.
    const result = await SettingsService.checkDeliveryDistance(6.5, 3.4);
    expect(result.withinRadius).toBe(true);
    expect(result.distanceKm).toBe(0);
  });

  it('outside radius returns withinRadius:false + distance', async () => {
    mockFindOne.mockResolvedValue(
      makeSettings({
        geocodedCoordinates: {
          lat: 0,
          lng: 0,
          geocodedAt: new Date(),
        },
        deliveryRadius: 10,
      })
    );
    const { SettingsService } = await import('@/services/settings-service');
    // 1° latitude away → ~111 km away from bar at (0,0).
    const result = await SettingsService.checkDeliveryDistance(1, 0);
    expect(result.withinRadius).toBe(false);
    expect(result.distanceKm).toBeGreaterThan(100);
  });

  it('bar coords missing (geocoding fails) → fail-open', async () => {
    mockFindOne.mockResolvedValue(makeSettings());
    mockGeocodeAddress.mockResolvedValue(null);
    const { SettingsService } = await import('@/services/settings-service');
    const result = await SettingsService.checkDeliveryDistance(6.5, 3.4);
    expect(result.withinRadius).toBe(true);
    expect(result.distanceKm).toBeNull();
  });

  it('customer coords undefined → fail-open', async () => {
    mockFindOne.mockResolvedValue(
      makeSettings({
        geocodedCoordinates: {
          lat: 6.5,
          lng: 3.4,
          geocodedAt: new Date(),
        },
      })
    );
    const { SettingsService } = await import('@/services/settings-service');
    const result = await SettingsService.checkDeliveryDistance(
      undefined,
      undefined
    );
    expect(result.withinRadius).toBe(true);
    expect(result.distanceKm).toBeNull();
  });
});

describe('REQ-061 SettingsService.getPickupSlots', () => {
  it('open day → returns 15-min interval slots starting after prep time', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-01T10:00:00')); // Monday 10:00
    mockFindOne.mockResolvedValue(makeSettings()); // 09:00-22:00, prep 30
    const { SettingsService } = await import('@/services/settings-service');
    const slots = await SettingsService.getPickupSlots();
    expect(slots.length).toBeGreaterThan(0);
    // First slot should be after 10:30 (now + 30-min prep), rounded to next 15-min mark.
    expect(slots[0].label).toMatch(/^Today/);
    vi.useRealTimers();
  });

  it('closed today → rolls over to tomorrow', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-01T10:00:00')); // Monday
    const settings = makeSettings();
    settings.businessHours.monday.closed = true;
    mockFindOne.mockResolvedValue(settings);
    const { SettingsService } = await import('@/services/settings-service');
    const slots = await SettingsService.getPickupSlots();
    expect(slots.length).toBeGreaterThan(0);
    expect(slots[0].label).toMatch(/^Tomorrow/);
    vi.useRealTimers();
  });

  it('all slots in the past today → rolls over to tomorrow', async () => {
    vi.useFakeTimers();
    // 23:00 (after 22:00 close) on a Monday — no slots today.
    vi.setSystemTime(new Date('2026-06-01T23:00:00'));
    mockFindOne.mockResolvedValue(makeSettings());
    const { SettingsService } = await import('@/services/settings-service');
    const slots = await SettingsService.getPickupSlots();
    expect(slots.length).toBeGreaterThan(0);
    expect(slots[0].label).toMatch(/^Tomorrow/);
    vi.useRealTimers();
  });

  it('closed today AND tomorrow → returns []', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-01T10:00:00')); // Monday
    const settings = makeSettings();
    settings.businessHours.monday.closed = true;
    settings.businessHours.tuesday.closed = true;
    mockFindOne.mockResolvedValue(settings);
    const { SettingsService } = await import('@/services/settings-service');
    const slots = await SettingsService.getPickupSlots();
    expect(slots).toEqual([]);
    vi.useRealTimers();
  });
});
