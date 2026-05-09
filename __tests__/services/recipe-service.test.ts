/**
 * @requirement REQ-034 — AC8
 * RecipeService validates: target menu item kind, ingredient kind,
 * no duplicate ingredients, yield > 0, ingredient unit shares dimension
 * with inventory unit (per REQ-033 registry).
 *
 * STUB: filled in during Phase B tests-first commit.
 */
import { describe, it } from 'vitest';

describe.skip('REQ-034 AC8 — RecipeService.create validation', () => {
  it('rejects if targetMenuItemId is not kind:menu-item', () => {});
  it('rejects if any ingredient inventoryId is not kind:kitchen-ingredient', () => {});
  it('rejects duplicate ingredient lines', () => {});
  it('rejects yield ≤ 0', () => {});
  it('rejects cross-dimension ingredient unit (kg vs ml)', () => {});
  it('accepts same-dimension ingredient unit (recipe in g, inventory in kg)', () => {});
  it('accepts strict-match count unit', () => {});
  it('rejects mismatched count unit (eggs vs cartons)', () => {});
  it('persists active=true by default', () => {});
});
