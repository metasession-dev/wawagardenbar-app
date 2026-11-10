/**
 * @requirement REQ-120 — settings control for customer-order validation specs
 *
 * Drives shop-wide ordering settings (business hours, minimum order, delivery
 * radius, hourly cap) straight in Mongo and restores them afterwards. The app
 * reads settings uncached when `ENABLE_E2E_PIN_INTERCEPT=true` (the CI default),
 * so a change is visible to the very next request.
 *
 * Specs that use this must run alone (see `customer-order-validation` in
 * `AGGREGATE_SPECS`, playwright.config.ts): settings are shared state.
 */
import { withMongo } from './db-assertions';

export type SettingsPatch = Record<string, unknown>;

const DAYS = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
] as const;

export function allDaysOpen(): SettingsPatch {
  return {
    businessHours: Object.fromEntries(
      DAYS.map((d) => [d, { open: '00:00', close: '23:59', closed: false }])
    ),
  };
}

export function allDaysClosed(): SettingsPatch {
  return {
    businessHours: Object.fromEntries(
      DAYS.map((d) => [d, { open: '00:00', close: '23:59', closed: true }])
    ),
  };
}

/** The current value (or absence) of each top-level key about to be changed. */
export async function snapshotSettings(
  keys: string[]
): Promise<Record<string, unknown>> {
  return withMongo(async (db) => {
    const doc = (await db.collection('settings').findOne({})) ?? {};
    return Object.fromEntries(keys.map((k) => [k, (doc as any)[k]]));
  });
}

export async function applySettings(patch: SettingsPatch): Promise<void> {
  await withMongo(async (db) => {
    await db
      .collection('settings')
      .updateOne({}, { $set: patch }, { upsert: true });
  });
}

/** Put back what `snapshotSettings` captured; absent keys are unset. */
export async function restoreSettings(
  snapshot: Record<string, unknown>
): Promise<void> {
  const set: Record<string, unknown> = {};
  const unset: Record<string, ''> = {};
  for (const [k, v] of Object.entries(snapshot)) {
    if (v === undefined) unset[k] = '';
    else set[k] = v;
  }
  await withMongo(async (db) => {
    const update: Record<string, unknown> = {};
    if (Object.keys(set).length) update.$set = set;
    if (Object.keys(unset).length) update.$unset = unset;
    if (Object.keys(update).length) {
      await db.collection('settings').updateOne({}, update);
    }
  });
}
