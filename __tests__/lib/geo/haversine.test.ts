/**
 * @requirement REQ-061 — Checkout operational gates (P2 #13)
 *
 * Haversine great-circle distance — pure function, no external deps.
 * Used to validate customer delivery addresses against the bar's
 * configured deliveryRadius (kilometres).
 */
import { describe, it, expect } from 'vitest';
import { haversineKm } from '@/lib/geo/haversine';

describe('REQ-061 haversineKm', () => {
  it('returns 0 km for same point', () => {
    expect(haversineKm(6.5244, 3.3792, 6.5244, 3.3792)).toBe(0);
  });

  it('returns ~111 km for 1° latitude difference at the equator', () => {
    // 1° latitude ≈ 111.195 km regardless of longitude.
    const km = haversineKm(0, 0, 1, 0);
    expect(km).toBeGreaterThan(110);
    expect(km).toBeLessThan(112);
  });

  it('returns ~10 km for two known Lagos-area points', () => {
    // Lagos Island (6.4541° N, 3.3947° E) → Lekki Phase 1 (6.4350° N, 3.4720° E).
    // Approx 9 km via Google's measurement.
    const km = haversineKm(6.4541, 3.3947, 6.435, 3.472);
    expect(km).toBeGreaterThan(8);
    expect(km).toBeLessThan(12);
  });
});
