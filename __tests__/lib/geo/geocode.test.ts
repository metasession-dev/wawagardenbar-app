/**
 * @requirement REQ-061 — Checkout operational gates (P2 #13)
 *
 * Google Maps Geocoding API wrapper. Fail-open posture: every failure
 * mode (missing key, network failure, no results, rate limit) returns
 * `null` so the calling code can fall back to "skip distance check"
 * instead of crashing the customer flow.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const ORIGINAL_FETCH = global.fetch;
const ORIGINAL_ENV = process.env.GOOGLE_MAPS_API_KEY;

beforeEach(() => {
  vi.resetModules();
});

afterEach(() => {
  global.fetch = ORIGINAL_FETCH;
  if (ORIGINAL_ENV === undefined) {
    delete process.env.GOOGLE_MAPS_API_KEY;
  } else {
    process.env.GOOGLE_MAPS_API_KEY = ORIGINAL_ENV;
  }
});

describe('REQ-061 geocodeAddress', () => {
  it('returns null when GOOGLE_MAPS_API_KEY is missing', async () => {
    delete process.env.GOOGLE_MAPS_API_KEY;
    const fetchSpy = vi.fn();
    global.fetch = fetchSpy as unknown as typeof fetch;
    const { geocodeAddress } = await import('@/lib/geo/geocode');
    const result = await geocodeAddress('123 Main St, Lagos');
    expect(result).toBeNull();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('returns { lat, lng } on a successful response', async () => {
    process.env.GOOGLE_MAPS_API_KEY = 'test-key';
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          status: 'OK',
          results: [{ geometry: { location: { lat: 6.5244, lng: 3.3792 } } }],
        }),
    } as unknown as Response) as unknown as typeof fetch;
    const { geocodeAddress } = await import('@/lib/geo/geocode');
    const result = await geocodeAddress('Lagos');
    expect(result).toEqual({ lat: 6.5244, lng: 3.3792 });
  });

  it('returns null when Google responds with no results', async () => {
    process.env.GOOGLE_MAPS_API_KEY = 'test-key';
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ status: 'ZERO_RESULTS', results: [] }),
    } as unknown as Response) as unknown as typeof fetch;
    const errSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { geocodeAddress } = await import('@/lib/geo/geocode');
    const result = await geocodeAddress('Nowhere');
    expect(result).toBeNull();
    errSpy.mockRestore();
  });

  it('returns null on network failure', async () => {
    process.env.GOOGLE_MAPS_API_KEY = 'test-key';
    global.fetch = vi
      .fn()
      .mockRejectedValue(new Error('network down')) as unknown as typeof fetch;
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { geocodeAddress } = await import('@/lib/geo/geocode');
    const result = await geocodeAddress('Lagos');
    expect(result).toBeNull();
    expect(errSpy).toHaveBeenCalled();
    errSpy.mockRestore();
  });
});
