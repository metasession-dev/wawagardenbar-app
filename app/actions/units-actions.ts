'use server';

import { SystemSettingsService } from '@/services/system-settings-service';

/**
 * @requirement REQ-033 - App-wide Unit-of-Measurement registry
 *
 * Read-only fetch of the UoM registry for client-side dropdown sources.
 * No auth gate — the registry is needed by every form that has a unit
 * field (Expense, MenuItem). Writes are gated separately by
 * `updateUnitsOfMeasurementAction` in `app/dashboard/settings/actions.ts`.
 */
export async function getUnitsOfMeasurementAction() {
  try {
    const units = await SystemSettingsService.getUnitsOfMeasurement();
    return { success: true as const, units };
  } catch (error) {
    console.error('Error fetching units of measurement:', error);
    return {
      success: false as const,
      error:
        error instanceof Error
          ? error.message
          : 'Failed to fetch units of measurement',
      units: [],
    };
  }
}
