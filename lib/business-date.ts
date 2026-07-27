/**
 * @requirement REQ-025 - Business day cutoff utility
 *
 * Derives the correct business day for a given UTC instant, based on a
 * wall-clock cutoff time expressed in WAT (UTC+1).
 *
 * Orders/tabs paid or closed before the cutoff are attributed to the
 * previous calendar day. At or after the cutoff they go to the current day.
 */

/** WAT is UTC+1 */
const WAT_OFFSET_MS = 60 * 60 * 1000;

/**
 * Derive the business date (midnight UTC of the attributed calendar day)
 * for a given UTC instant and WAT cutoff string.
 *
 * @param now - UTC Date representing the current time
 * @param cutoffTime - Wall-clock cutoff in WAT as "HH:MM" (e.g. "15:00")
 * @returns Midnight UTC of the business day the instant belongs to
 */
export function deriveBusinessDate(now: Date, cutoffTime: string): Date {
  const parts = cutoffTime.split(':');
  const cutoffHour = parseInt(parts[0], 10);
  const cutoffMinute = parseInt(parts[1], 10);

  if (isNaN(cutoffHour) || isNaN(cutoffMinute)) {
    return deriveBusinessDate(now, '15:00');
  }

  const nowWAT = new Date(now.getTime() + WAT_OFFSET_MS);
  const watHour = nowWAT.getUTCHours();
  const watMinute = nowWAT.getUTCMinutes();

  const isBeforeCutoff =
    watHour < cutoffHour ||
    (watHour === cutoffHour && watMinute < cutoffMinute);

  const businessWAT = new Date(nowWAT);
  businessWAT.setUTCHours(0, 0, 0, 0);

  if (isBeforeCutoff) {
    businessWAT.setUTCDate(businessWAT.getUTCDate() - 1);
  }

  return new Date(businessWAT.getTime() - WAT_OFFSET_MS);
}

/**
 * Returns true if the current time is before the cutoff — indicating the
 * admin attribution checkbox should be shown (pre-checked).
 *
 * @param now - UTC Date representing the current time
 * @param cutoffTime - Wall-clock cutoff in WAT as "HH:MM"
 */
export function shouldShowPreviousDayCheckbox(
  now: Date,
  cutoffTime: string
): boolean {
  const parts = cutoffTime.split(':');
  const cutoffHour = parseInt(parts[0], 10);
  const cutoffMinute = parseInt(parts[1], 10);

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

/**
 * Returns the label for the previous business day checkbox,
 * e.g. "Fri 11 Apr" for a date of April 11 2026.
 */
export function previousBusinessDayLabel(
  now: Date,
  cutoffTime: string
): string {
  const businessDate = deriveBusinessDate(now, cutoffTime);
  const watDate = new Date(businessDate.getTime() + WAT_OFFSET_MS);
  return watDate.toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  });
}

/**
 * REQ-051 — Range of the business day containing `date`.
 *
 * Returns the inclusive range [start, end] of the business day that
 * contains the WAT clock-time of `date`, given the cutoff. The start is
 * the business day's midnight WAT expressed as UTC; the end is one
 * millisecond before the next business day begins (24h − 1ms after start).
 *
 * Use this to build "current business day" report queries —
 * `FinancialReportService.generateDailySummary` is the canonical caller.
 * It corrects a class of bug where calendar-day query ranges returned
 * ₦0.00 for any DFR opened before the cutoff, even after a busy night.
 */
export function businessDayRange(
  date: Date,
  cutoffTime: string
): { start: Date; end: Date } {
  const start = deriveBusinessDate(date, cutoffTime);
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000 - 1);
  return { start, end };
}

/**
 * REQ-094 — Normalise a user-selected WAT calendar date to its persisted
 * UTC range. Unlike `businessDayRange`, this does not apply the operational
 * cutoff; it is for date-only records such as inventory snapshots and report
 * range selectors.
 */
export function watCalendarDayRange(date: Date): { start: Date; end: Date } {
  const watDate = new Date(date.getTime() + WAT_OFFSET_MS);
  watDate.setUTCHours(0, 0, 0, 0);
  const start = new Date(watDate.getTime() - WAT_OFFSET_MS);
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000 - 1);
  return { start, end };
}

/** REQ-094 - Stable YYYY-MM-DD key for a WAT calendar date. */
export function watCalendarDateKey(date: Date): string {
  const watDate = new Date(date.getTime() + WAT_OFFSET_MS);
  return watDate.toISOString().slice(0, 10);
}

/** Validate and parse a WAT business-date label without host-timezone drift. */
function parseBusinessDateLabel(label: string): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(label);
  if (!match) throw new Error(`Invalid business date label: ${label}`);

  const date = new Date(
    Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 12)
  );
  if (watCalendarDateKey(date) !== label) {
    throw new Error(`Invalid business date label: ${label}`);
  }
  return date;
}

/** Return the persisted UTC midnight value for a WAT business-date label. */
export function businessDateValueForLabel(label: string): Date {
  const watDate = parseBusinessDateLabel(label);
  watDate.setUTCHours(0, 0, 0, 0);
  return new Date(watDate.getTime() - WAT_OFFSET_MS);
}

/** Return the operational business-date label containing an instant. */
export function businessDateLabelForInstant(
  instant: Date,
  cutoffTime: string
): string {
  return watCalendarDateKey(deriveBusinessDate(instant, cutoffTime));
}

/** Return a business-date label offset by a number of calendar days. */
export function addBusinessDateLabels(label: string, days: number): string {
  const date = parseBusinessDateLabel(label);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

/** Return the UTC instant at which a labelled business day begins. */
function businessDayCutoffInstant(label: string, cutoffTime: string): Date {
  const date = parseBusinessDateLabel(label);
  const [hourText, minuteText] = cutoffTime.split(':');
  const hour = Number(hourText);
  const minute = Number(minuteText);
  if (!Number.isInteger(hour) || !Number.isInteger(minute)) {
    return businessDayCutoffInstant(label, '15:00');
  }

  date.setUTCHours(hour, minute, 0, 0);
  return new Date(date.getTime() - WAT_OFFSET_MS);
}

/** Return a representative instant at the configured cutoff for a label. */
export function businessDateAtCutoff(label: string, cutoffTime: string): Date {
  return businessDayCutoffInstant(label, cutoffTime);
}

export interface BusinessDateQueryRange {
  /** Bounds for persisted businessDate values. */
  businessDateStart: Date;
  businessDateEnd: Date;
  /** Actual cutoff-to-cutoff bounds for legacy paidAt fallback records. */
  legacyStart: Date;
  legacyEnd: Date;
}

/** Resolve inclusive business-date labels into modern and legacy query bounds. */
export function businessDateQueryRange(
  startLabel: string,
  endLabel: string,
  cutoffTime: string
): BusinessDateQueryRange {
  const start = businessDateValueForLabel(startLabel);
  const end = businessDateValueForLabel(endLabel);
  if (start > end) throw new Error('Business date range must not be reversed');

  const nextDay = addBusinessDateLabels(endLabel, 1);
  return {
    businessDateStart: start,
    businessDateEnd: new Date(end.getTime() + 24 * 60 * 60 * 1000 - 1),
    legacyStart: businessDayCutoffInstant(startLabel, cutoffTime),
    legacyEnd: new Date(
      businessDayCutoffInstant(nextDay, cutoffTime).getTime() - 1
    ),
  };
}
