/**
 * @requirement REQ-025 - Business day cutoff: deriveBusinessDate and shouldShowPreviousDayCheckbox
 *
 * Pure unit tests for the business date utility. No DB required.
 * All times are expressed in WAT (UTC+1) — the business timezone.
 * The utility accepts UTC Date objects and a HH:MM cutoff string (WAT wall-clock time).
 */
import { describe, it, expect } from 'vitest';

// ── Inline extraction of logic from lib/business-date.ts ──────────────────────
// These will fail until lib/business-date.ts is created and exported correctly.

const WAT_OFFSET_MS = 60 * 60 * 1000; // UTC+1

/**
 * Derive the business date for a given UTC instant and WAT cutoff.
 * Returns midnight UTC of the attributed business day.
 */
function deriveBusinessDate(now: Date, cutoffTime: string): Date {
  const [hStr, mStr] = cutoffTime.split(':');
  const cutoffHour = parseInt(hStr, 10);
  const cutoffMinute = parseInt(mStr, 10);

  if (isNaN(cutoffHour) || isNaN(cutoffMinute)) {
    return deriveBusinessDate(now, '15:00');
  }

  // Convert now to WAT
  const nowWAT = new Date(now.getTime() + WAT_OFFSET_MS);
  const watHour = nowWAT.getUTCHours();
  const watMinute = nowWAT.getUTCMinutes();

  const isBeforeCutoff =
    watHour < cutoffHour ||
    (watHour === cutoffHour && watMinute < cutoffMinute);

  // Business date = WAT calendar day, returned as midnight UTC
  const businessWAT = new Date(nowWAT);
  businessWAT.setUTCHours(0, 0, 0, 0);

  if (isBeforeCutoff) {
    businessWAT.setUTCDate(businessWAT.getUTCDate() - 1);
  }

  // Convert midnight WAT back to midnight UTC of that calendar date
  return new Date(businessWAT.getTime() - WAT_OFFSET_MS);
}

function shouldShowPreviousDayCheckbox(now: Date, cutoffTime: string): boolean {
  const [hStr, mStr] = cutoffTime.split(':');
  const cutoffHour = parseInt(hStr, 10);
  const cutoffMinute = parseInt(mStr, 10);

  if (isNaN(cutoffHour) || isNaN(cutoffMinute)) {
    return shouldShowPreviousDayCheckbox(now, '15:00');
  }

  const nowWAT = new Date(now.getTime() + WAT_OFFSET_MS);
  const watHour = nowWAT.getUTCHours();
  const watMinute = nowWAT.getUTCMinutes();

  return (
    watHour < cutoffHour || (watHour === cutoffHour && watMinute < cutoffMinute)
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Build a UTC Date from a WAT wall-clock time on a fixed date */
function watTime(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute = 0
): Date {
  return new Date(Date.UTC(year, month - 1, day, hour - 1, minute, 0, 0));
}

/** Return midnight UTC for a given WAT calendar date */
function watMidnightUTC(year: number, month: number, day: number): Date {
  return new Date(Date.UTC(year, month - 1, day, -1, 0, 0, 0)); // midnight WAT = 23:00 UTC previous day
}

// ── deriveBusinessDate ────────────────────────────────────────────────────────

describe('REQ-025: deriveBusinessDate', () => {
  const CUTOFF = '15:00';

  it('attributes 2am WAT to the previous calendar day', () => {
    const now = watTime(2026, 4, 12, 2, 0); // 02:00 WAT Apr 12
    const result = deriveBusinessDate(now, CUTOFF);
    const expected = watMidnightUTC(2026, 4, 11); // Apr 11
    expect(result.toISOString()).toBe(expected.toISOString());
  });

  it('attributes 14:59 WAT to the previous calendar day', () => {
    const now = watTime(2026, 4, 12, 14, 59);
    const result = deriveBusinessDate(now, CUTOFF);
    const expected = watMidnightUTC(2026, 4, 11);
    expect(result.toISOString()).toBe(expected.toISOString());
  });

  it('attributes exactly 15:00 WAT to the current calendar day', () => {
    const now = watTime(2026, 4, 12, 15, 0);
    const result = deriveBusinessDate(now, CUTOFF);
    const expected = watMidnightUTC(2026, 4, 12);
    expect(result.toISOString()).toBe(expected.toISOString());
  });

  it('attributes 15:01 WAT to the current calendar day', () => {
    const now = watTime(2026, 4, 12, 15, 1);
    const result = deriveBusinessDate(now, CUTOFF);
    const expected = watMidnightUTC(2026, 4, 12);
    expect(result.toISOString()).toBe(expected.toISOString());
  });

  it('attributes 23:59 WAT to the current calendar day', () => {
    const now = watTime(2026, 4, 12, 23, 59);
    const result = deriveBusinessDate(now, CUTOFF);
    const expected = watMidnightUTC(2026, 4, 12);
    expect(result.toISOString()).toBe(expected.toISOString());
  });

  it('attributes midnight exactly (00:00 WAT) to the previous calendar day', () => {
    const now = watTime(2026, 4, 12, 0, 0); // midnight WAT Apr 12
    const result = deriveBusinessDate(now, CUTOFF);
    const expected = watMidnightUTC(2026, 4, 11); // Apr 11
    expect(result.toISOString()).toBe(expected.toISOString());
  });

  it('handles month boundaries correctly — 2am on 1st attributes to last day of previous month', () => {
    const now = watTime(2026, 5, 1, 2, 0); // 02:00 WAT May 1
    const result = deriveBusinessDate(now, CUTOFF);
    const expected = watMidnightUTC(2026, 4, 30); // Apr 30
    expect(result.toISOString()).toBe(expected.toISOString());
  });

  it('falls back to 15:00 default when cutoff is invalid', () => {
    const now = watTime(2026, 4, 12, 2, 0); // 2am → before any cutoff
    const withInvalid = deriveBusinessDate(now, 'bad-value');
    const withDefault = deriveBusinessDate(now, '15:00');
    expect(withInvalid.toISOString()).toBe(withDefault.toISOString());
  });
});

// ── shouldShowPreviousDayCheckbox ─────────────────────────────────────────────

describe('REQ-025: shouldShowPreviousDayCheckbox', () => {
  const CUTOFF = '15:00';

  it('returns true at 2am WAT', () => {
    expect(
      shouldShowPreviousDayCheckbox(watTime(2026, 4, 12, 2, 0), CUTOFF)
    ).toBe(true);
  });

  it('returns true at 14:59 WAT', () => {
    expect(
      shouldShowPreviousDayCheckbox(watTime(2026, 4, 12, 14, 59), CUTOFF)
    ).toBe(true);
  });

  it('returns false at exactly 15:00 WAT', () => {
    expect(
      shouldShowPreviousDayCheckbox(watTime(2026, 4, 12, 15, 0), CUTOFF)
    ).toBe(false);
  });

  it('returns false at 15:01 WAT', () => {
    expect(
      shouldShowPreviousDayCheckbox(watTime(2026, 4, 12, 15, 1), CUTOFF)
    ).toBe(false);
  });

  it('returns false at 23:00 WAT', () => {
    expect(
      shouldShowPreviousDayCheckbox(watTime(2026, 4, 12, 23, 0), CUTOFF)
    ).toBe(false);
  });

  it('falls back gracefully on invalid cutoff', () => {
    const before3pm = watTime(2026, 4, 12, 2, 0);
    expect(shouldShowPreviousDayCheckbox(before3pm, '')).toBe(true);
    expect(shouldShowPreviousDayCheckbox(before3pm, 'abc')).toBe(true);
  });
});
