/**
 * @requirement REQ-089 — Verifies that the customer-facing CartItem component
 * does NOT render any price override UI.
 *
 * Covers AC5.
 */
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

const CART_ITEM_SOURCE = fs.readFileSync(
  path.resolve(__dirname, '../../components/features/cart/cart-item.tsx'),
  'utf-8'
);

describe('REQ-089 AC5 — CartItem has no price override UI', () => {
  it('does not contain "Override Price" button text', () => {
    expect(CART_ITEM_SOURCE).not.toMatch(/override.*price/i);
  });

  it('does not reference allowManualPriceOverride', () => {
    expect(CART_ITEM_SOURCE).not.toContain('allowManualPriceOverride');
  });

  it('does not reference priceOverridden', () => {
    expect(CART_ITEM_SOURCE).not.toContain('priceOverridden');
  });

  it('does not import PriceOverrideDialog', () => {
    expect(CART_ITEM_SOURCE).not.toMatch(/PriceOverrideDialog/i);
  });
});
