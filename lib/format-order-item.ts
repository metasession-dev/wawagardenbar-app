/**
 * Format order item quantity with portion size
 * Examples:
 * - Full portion: "1x"
 * - Half portion: "1/2x"
 * - Quarter portion: "1/4x"
 * - Multiple half portions: "2 × 1/2x" or "1x" (if quantity is 2 halves = 1 full)
 */
export function formatQuantityWithPortion(quantity: number, portionSize: 'full' | 'half' | 'quarter'): string {
  if (portionSize === 'full') {
    return `${quantity}x`;
  }
  
  if (portionSize === 'half') {
    return `${quantity} × 1/2x`;
  }
  
  if (portionSize === 'quarter') {
    return `${quantity} × 1/4x`;
  }
  
  return `${quantity}x`;
}

/**
 * Format order item display with portion size
 * Examples:
 * - "1x Catfish Peppersoup"
 * - "1 × 1/2x Catfish Peppersoup"
 * - "2 × 1/4x Catfish Peppersoup"
 */
export function formatOrderItemDisplay(quantity: number, name: string, portionSize: 'full' | 'half' | 'quarter'): string {
  const quantityStr = formatQuantityWithPortion(quantity, portionSize);
  return `${quantityStr} ${name}`;
}
