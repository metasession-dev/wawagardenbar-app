/**
 * @requirement REQ-034 — AC16
 * Deactivating a recipe (isActive=false) hides it from the
 * "Make a batch" dropdown but past Production records still render
 * via their snapshot.
 *
 * STUB: filled in during Phase B tests-first commit.
 */
import { describe, it } from 'vitest';

describe.skip('REQ-034 AC16 — Recipe deactivation', () => {
  it('listActiveRecipes excludes isActive=false', () => {});
  it('deactivating preserves past Production.recipeId references', () => {});
  it('past Production renders ingredientsDeducted snapshot independent of recipe', () => {});
  it('voiding a past Production whose recipe is deactivated still works', () => {});
  it('reactivating a recipe re-adds it to the active list', () => {});
});
