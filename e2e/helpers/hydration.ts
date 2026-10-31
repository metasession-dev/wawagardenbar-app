/**
 * @requirement REQ-116 (AC14) — wait for React to hydrate a client component.
 *
 * `page.goto()` resolves on `load`, which on a cold dev server fires before
 * hydration. A `fill()` in that window sets the DOM value; React then
 * hydrates the controlled input and resets it to its initial state, so the
 * form saves without the value (#932: the save succeeded and the toast showed,
 * but the posted config had no `startDate`). React attaches `__reactProps$…`
 * to a DOM node once it is hydrated, so wait for that on the control itself.
 */
import type { Page } from '@playwright/test';

export async function waitForHydration(
  page: Page,
  selector: string,
  timeout = 30_000
): Promise<void> {
  await page.waitForFunction(
    (sel) => {
      const el = document.querySelector(sel);
      return (
        !!el && Object.keys(el).some((key) => key.startsWith('__reactProps'))
      );
    },
    selector,
    { timeout }
  );
}
