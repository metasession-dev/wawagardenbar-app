/**
 * Coverage for lib/business-time.ts — the fix for a real production bug:
 * server clock (UTC in a containerized deploy) vs. the operator's actual
 * business timezone caused Happy Hour / Show Price windows to silently
 * miss by exactly the UTC offset. These tests use fixed UTC instants and
 * a configured BUSINESS_TIMEZONE, proving the resolved wall-clock time
 * reflects the *business* zone, not whatever zone the test runner is in.
 */
import { describe, it, expect, afterEach } from 'vitest';
import {
  getCurrentBusinessHHMM,
  getCurrentBusinessDayKey,
  getCurrentBusinessDateParts,
  businessLocalToInstant,
} from '@/lib/business-time';

const ORIGINAL_TZ = process.env.BUSINESS_TIMEZONE;
afterEach(() => {
  if (ORIGINAL_TZ === undefined) {
    delete process.env.BUSINESS_TIMEZONE;
  } else {
    process.env.BUSINESS_TIMEZONE = ORIGINAL_TZ;
  }
});

describe('business-time: BUSINESS_TIMEZONE decouples window checks from the server clock', () => {
  it('07:30 UTC reads as 08:30 in Africa/Lagos (UTC+1, no DST)', () => {
    process.env.BUSINESS_TIMEZONE = 'Africa/Lagos';
    const utcInstant = new Date('2026-09-07T07:30:00Z');
    expect(getCurrentBusinessHHMM(utcInstant)).toBe('08:30');
  });

  it('the same instant reads as a different HH:mm under a different configured zone', () => {
    const utcInstant = new Date('2026-09-07T07:30:00Z');
    process.env.BUSINESS_TIMEZONE = 'UTC';
    expect(getCurrentBusinessHHMM(utcInstant)).toBe('07:30');
    process.env.BUSINESS_TIMEZONE = 'America/New_York'; // UTC-4 in September (EDT)
    expect(getCurrentBusinessHHMM(utcInstant)).toBe('03:30');
  });

  it('day-boundary crossing: 23:30 business-local is a different calendar day than UTC', () => {
    process.env.BUSINESS_TIMEZONE = 'Pacific/Auckland'; // UTC+12/+13
    // 23:30 UTC on the 6th is already the 7th in Auckland.
    const utcInstant = new Date('2026-09-06T23:30:00Z');
    const parts = getCurrentBusinessDateParts(utcInstant);
    expect(parts.day).toBe(7);
    expect(getCurrentBusinessDayKey(utcInstant)).not.toBe(
      getCurrentBusinessDayKey(new Date('2026-09-06T10:00:00Z'))
    );
  });

  it('businessLocalToInstant round-trips: "08:00" in Africa/Lagos is 07:00 UTC', () => {
    process.env.BUSINESS_TIMEZONE = 'Africa/Lagos';
    const instant = businessLocalToInstant(2026, 9, 7, '08:00');
    expect(instant.toISOString()).toBe('2026-09-07T07:00:00.000Z');
  });

  it('defaults to Africa/Lagos when BUSINESS_TIMEZONE is unset', () => {
    delete process.env.BUSINESS_TIMEZONE;
    const utcInstant = new Date('2026-09-07T07:30:00Z');
    expect(getCurrentBusinessHHMM(utcInstant)).toBe('08:30');
  });
});
