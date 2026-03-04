import {
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  startOfQuarter,
  endOfQuarter,
  startOfYear,
  endOfYear,
  subDays,
  subWeeks,
  subMonths,
  subQuarters,
  subYears,
} from 'date-fns';

/**
 * Supported period presets for summary endpoints.
 * - `today` / `yesterday` — single day
 * - `this-week` / `last-week` — ISO week (Mon–Sun)
 * - `this-month` / `last-month`
 * - `this-quarter` / `last-quarter`
 * - `this-year` / `last-year`
 * - `last-7-days` / `last-30-days` / `last-90-days` — rolling windows
 * - `custom` — requires explicit startDate + endDate query params
 */
export type PeriodPreset =
  | 'today'
  | 'yesterday'
  | 'this-week'
  | 'last-week'
  | 'this-month'
  | 'last-month'
  | 'this-quarter'
  | 'last-quarter'
  | 'this-year'
  | 'last-year'
  | 'last-7-days'
  | 'last-30-days'
  | 'last-90-days'
  | 'custom';

export interface DateRange {
  startDate: Date;
  endDate: Date;
  label: string;
}

const VALID_PRESETS: PeriodPreset[] = [
  'today',
  'yesterday',
  'this-week',
  'last-week',
  'this-month',
  'last-month',
  'this-quarter',
  'last-quarter',
  'this-year',
  'last-year',
  'last-7-days',
  'last-30-days',
  'last-90-days',
  'custom',
];

/**
 * Check whether a value is a valid period preset.
 */
export function isValidPeriod(value: string | null): value is PeriodPreset {
  return value !== null && VALID_PRESETS.includes(value as PeriodPreset);
}

/**
 * Resolve a period preset (or custom range) into concrete start/end dates.
 */
export function resolveDateRange(
  period: PeriodPreset,
  customStart?: Date,
  customEnd?: Date
): DateRange {
  const now = new Date();

  switch (period) {
    case 'today':
      return { startDate: startOfDay(now), endDate: endOfDay(now), label: 'Today' };
    case 'yesterday': {
      const d = subDays(now, 1);
      return { startDate: startOfDay(d), endDate: endOfDay(d), label: 'Yesterday' };
    }
    case 'this-week':
      return {
        startDate: startOfWeek(now, { weekStartsOn: 1 }),
        endDate: endOfWeek(now, { weekStartsOn: 1 }),
        label: 'This Week',
      };
    case 'last-week': {
      const d = subWeeks(now, 1);
      return {
        startDate: startOfWeek(d, { weekStartsOn: 1 }),
        endDate: endOfWeek(d, { weekStartsOn: 1 }),
        label: 'Last Week',
      };
    }
    case 'this-month':
      return { startDate: startOfMonth(now), endDate: endOfMonth(now), label: 'This Month' };
    case 'last-month': {
      const d = subMonths(now, 1);
      return { startDate: startOfMonth(d), endDate: endOfMonth(d), label: 'Last Month' };
    }
    case 'this-quarter':
      return { startDate: startOfQuarter(now), endDate: endOfQuarter(now), label: 'This Quarter' };
    case 'last-quarter': {
      const d = subQuarters(now, 1);
      return { startDate: startOfQuarter(d), endDate: endOfQuarter(d), label: 'Last Quarter' };
    }
    case 'this-year':
      return { startDate: startOfYear(now), endDate: endOfYear(now), label: 'This Year' };
    case 'last-year': {
      const d = subYears(now, 1);
      return { startDate: startOfYear(d), endDate: endOfYear(d), label: 'Last Year' };
    }
    case 'last-7-days':
      return { startDate: startOfDay(subDays(now, 6)), endDate: endOfDay(now), label: 'Last 7 Days' };
    case 'last-30-days':
      return { startDate: startOfDay(subDays(now, 29)), endDate: endOfDay(now), label: 'Last 30 Days' };
    case 'last-90-days':
      return { startDate: startOfDay(subDays(now, 89)), endDate: endOfDay(now), label: 'Last 90 Days' };
    case 'custom': {
      if (!customStart || !customEnd) {
        throw new Error('Custom period requires startDate and endDate');
      }
      return { startDate: startOfDay(customStart), endDate: endOfDay(customEnd), label: 'Custom Range' };
    }
    default:
      return { startDate: startOfDay(now), endDate: endOfDay(now), label: 'Today' };
  }
}

/**
 * Parse period and date params from a URLSearchParams instance.
 * Falls back to `today` if no period is provided.
 */
export function parsePeriodParams(searchParams: URLSearchParams): DateRange {
  const periodRaw = searchParams.get('period');
  const period: PeriodPreset = isValidPeriod(periodRaw) ? periodRaw : 'today';

  const startDateStr = searchParams.get('startDate');
  const endDateStr = searchParams.get('endDate');
  const customStart = startDateStr ? new Date(startDateStr) : undefined;
  const customEnd = endDateStr ? new Date(endDateStr) : undefined;

  if (
    period === 'custom' &&
    (!customStart || !customEnd || isNaN(customStart.getTime()) || isNaN(customEnd.getTime()))
  ) {
    throw new Error('Custom period requires valid startDate and endDate (ISO 8601)');
  }

  return resolveDateRange(period, customStart, customEnd);
}
