/**
 * Centralized business-timezone-aware time helpers.
 *
 * Admin-configured daily windows (Business Hours, Show Price Window, Happy
 * Hour Window) are stored as bare "HH:mm" strings with no timezone
 * attached. Comparing them against `new Date()`'s local getters ties their
 * meaning to whatever timezone the Node process happens to be running in —
 * for a containerized deployment that's typically UTC, regardless of where
 * the actual business operates. `BUSINESS_TIMEZONE` (an IANA zone name,
 * e.g. "Africa/Lagos") decouples the two: every comparison and "current
 * business day" calculation below uses this configured zone, no matter
 * which timezone the host/pod/server itself is set to.
 */

const DEFAULT_BUSINESS_TIMEZONE = 'Africa/Lagos';

export function getBusinessTimeZone(): string {
  return process.env.BUSINESS_TIMEZONE || DEFAULT_BUSINESS_TIMEZONE;
}

const DAY_KEYS = [
  'sunday',
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
] as const;
export type DayKey = (typeof DAY_KEYS)[number];

function partsFor(date: Date, timeZone: string): Record<string, number> {
  const formatted = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(date);
  const get = (type: string) =>
    Number(formatted.find((p) => p.type === type)?.value);
  // hour12: false renders midnight as "24" in some ICU builds — normalize.
  return {
    year: get('year'),
    month: get('month'),
    day: get('day'),
    hour: get('hour') % 24,
    minute: get('minute'),
    second: get('second'),
  };
}

/** "HH:mm" as it currently is in the configured business timezone. */
export function getCurrentBusinessHHMM(date: Date = new Date()): string {
  const { hour, minute } = partsFor(date, getBusinessTimeZone());
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

/** The weekday key as it currently is in the business timezone. */
export function getCurrentBusinessDayKey(date: Date = new Date()): DayKey {
  const weekday = new Intl.DateTimeFormat('en-US', {
    timeZone: getBusinessTimeZone(),
    weekday: 'long',
  })
    .format(date)
    .toLowerCase();
  return weekday as DayKey;
}

/** Calendar year/month(1-12)/day as they currently are in the business timezone. */
export function getCurrentBusinessDateParts(date: Date = new Date()): {
  year: number;
  month: number;
  day: number;
} {
  const { year, month, day } = partsFor(date, getBusinessTimeZone());
  return { year, month, day };
}

/**
 * Converts a business-local wall-clock "HH:mm" on a given business-local
 * calendar day into the correct absolute Date instant, accounting for the
 * configured timezone's UTC offset — without a hard dependency on a
 * timezone library, using an Intl round-trip: guess the instant assuming
 * UTC, see what that instant actually reads as in the business timezone,
 * then correct by the difference.
 */
export function businessLocalToInstant(
  year: number,
  month: number,
  day: number,
  hhmm: string
): Date {
  const [hh, mm] = hhmm.split(':').map(Number);
  const target = Date.UTC(year, month - 1, day, hh, mm, 0, 0);
  const utcGuess = new Date(target);
  const timeZone = getBusinessTimeZone();
  const observed = partsFor(utcGuess, timeZone);
  const observedAsUtc = Date.UTC(
    observed.year,
    observed.month - 1,
    observed.day,
    observed.hour,
    observed.minute,
    observed.second
  );
  const diff = target - observedAsUtc;
  return new Date(utcGuess.getTime() + diff);
}
