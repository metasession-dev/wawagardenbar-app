/**
 * @requirement REQ-031 - End-to-end multi-inventory deduction for menu items with customization options
 *
 * Pure helpers for the admin customization builder's combined-price preview
 * (D10). Same data model as today (the menu-item schema stores `option.price`
 * as the surcharge), just a friendlier admin UX:
 *
 *   - Surcharge input with a live preview of the combined price
 *   - Optional "Enter combined price" mode where the surcharge is auto-derived
 *
 * Used by components/features/admin/customization-options-builder.tsx.
 */

function formatNaira(amount: number): string {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function deriveCombinedPricePreview({
  basePrice,
  surcharge,
  itemName,
  optionName,
}: {
  basePrice: number;
  surcharge: number;
  itemName: string;
  optionName: string;
}): string {
  return `${itemName} + ${optionName} = ${formatNaira(basePrice + surcharge)}`;
}

export function combinedToSurcharge(
  combinedPrice: number,
  basePrice: number
): number {
  return combinedPrice - basePrice;
}
