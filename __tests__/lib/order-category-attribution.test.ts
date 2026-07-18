/** @requirement REQ-094 - legacy attribution migration semantics. */
import { describe, expect, it } from 'vitest';
import { legacyCategoryAttribution } from '@/lib/order-category-attribution';

describe('legacyCategoryAttribution', () => {
  it('marks historical metadata derived from the current menu as legacy fallback', () => {
    expect(
      legacyCategoryAttribution(
        {},
        { mainCategory: 'drinks', category: 'beer' }
      )
    ).toEqual({
      mainCategoryAtSale: 'drinks',
      categoryAtSale: 'beer',
      categoryAtSaleSource: 'legacy_current_menu_fallback',
    });
  });

  it('is idempotent and does not overwrite immutable sale-time evidence', () => {
    expect(
      legacyCategoryAttribution(
        { mainCategoryAtSale: 'food', categoryAtSale: 'rice' },
        { mainCategory: 'drinks', category: 'beer' }
      )
    ).toBeUndefined();
  });

  it('does not invent attribution when current menu metadata is unavailable', () => {
    expect(legacyCategoryAttribution({}, null)).toBeUndefined();
    expect(legacyCategoryAttribution({}, { category: 'beer' })).toBeUndefined();
  });
});
