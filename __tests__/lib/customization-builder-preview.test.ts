/**
 * @requirement REQ-031 - End-to-end multi-inventory deduction for menu items with customization options
 *
 * Pure-helper tests for the admin customization builder's combined-price
 * preview (D10). Same data model as today (surcharge stored on the option),
 * just a friendlier admin UX showing the combined price live and supporting
 * a switch to "Enter combined price" input mode that auto-derives the
 * surcharge.
 *
 * Used by components/features/admin/customization-options-builder.tsx.
 */
import { describe, it, expect } from 'vitest';
import {
  deriveCombinedPricePreview,
  combinedToSurcharge,
} from '@/lib/customization-builder-preview';

describe('REQ-031: deriveCombinedPricePreview (AC14)', () => {
  it('formats base + surcharge into a Naira-formatted preview string', () => {
    expect(
      deriveCombinedPricePreview({
        basePrice: 2000,
        surcharge: 500,
        itemName: 'Poundo',
        optionName: 'Egusi',
      })
    ).toBe('Poundo + Egusi = ₦2,500');
  });

  it('formats zero-surcharge preview (option is included at base price)', () => {
    expect(
      deriveCombinedPricePreview({
        basePrice: 2000,
        surcharge: 0,
        itemName: 'Poundo',
        optionName: 'Ogbono',
      })
    ).toBe('Poundo + Ogbono = ₦2,000');
  });

  it('uses NGN locale formatting with thousand separators', () => {
    expect(
      deriveCombinedPricePreview({
        basePrice: 12000,
        surcharge: 3500,
        itemName: 'Premium Suya',
        optionName: 'Extra Beef',
      })
    ).toBe('Premium Suya + Extra Beef = ₦15,500');
  });
});

describe('REQ-031: combinedToSurcharge (input-mode toggle)', () => {
  it('derives surcharge from combined price (admin enters ₦2,500 → stored as 500)', () => {
    expect(combinedToSurcharge(2500, 2000)).toBe(500);
  });

  it('returns 0 when combined equals base (option included)', () => {
    expect(combinedToSurcharge(2000, 2000)).toBe(0);
  });
});
