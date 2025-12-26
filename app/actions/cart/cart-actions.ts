'use server';

export interface CartActionResult {
  success: boolean;
  message?: string;
  data?: unknown;
}

export interface CartTotalsResult {
  success: boolean;
  message?: string;
  data?: {
    subtotal: number;
    serviceFee: number;
    deliveryFee: number;
    tax: number;
    total: number;
  };
}

/**
 * Validate item availability before adding to cart
 */
export async function validateCartItem(
  itemId: string,
  quantity: number,
  portionSize: 'full' | 'half' = 'full'
): Promise<CartActionResult> {
  try {
    const { InventoryService } = await import('@/services');
    const { connectDB } = await import('@/lib/mongodb');
    
    await connectDB();
    
    // Use InventoryService.checkAvailability with portion size support
    const availability = await InventoryService.checkAvailability(itemId, quantity, portionSize);

    if (!availability.available) {
      return {
        success: false,
        message: availability.message || 'This item is currently unavailable',
      };
    }

    return {
      success: true,
      data: availability,
    };
  } catch (error) {
    console.error('Error validating cart item:', error);
    return {
      success: false,
      message: 'Failed to validate item availability',
    };
  }
}

/**
 * Validate entire cart before checkout
 */
export async function validateCart(items: Array<{ id: string; quantity: number }>): Promise<CartActionResult> {
  try {
    const validationResults = await Promise.all(
      items.map(async (item) => {
        const result = await validateCartItem(item.id, item.quantity);
        return {
          itemId: item.id,
          ...result,
        };
      })
    );

    const failedItems = validationResults.filter((result) => !result.success);

    if (failedItems.length > 0) {
      return {
        success: false,
        message: 'Some items in your cart are no longer available',
        data: failedItems,
      };
    }

    return {
      success: true,
      message: 'All items are available',
    };
  } catch (error) {
    console.error('Error validating cart:', error);
    return {
      success: false,
      message: 'Failed to validate cart',
    };
  }
}

/**
 * Calculate cart totals with delivery fee
 * Uses SettingsService for dynamic fee calculation
 */
export async function calculateCartTotals(
  subtotal: number,
  orderType: 'dine-in' | 'pickup' | 'delivery'
): Promise<CartTotalsResult> {
  try {
    const { SettingsService } = await import('@/services');
    
    // Calculate all fees using SettingsService
    const totals = await SettingsService.calculateOrderTotals(subtotal, orderType);

    return {
      success: true,
      data: totals,
    };
  } catch (error) {
    console.error('Error calculating cart totals:', error);
    return {
      success: false,
      message: 'Failed to calculate totals',
    };
  }
}

/**
 * Check minimum order requirement
 */
export async function checkMinimumOrder(
  subtotal: number,
  orderType: 'dine-in' | 'pickup' | 'delivery'
): Promise<CartActionResult> {
  const minimumOrders = {
    'dine-in': 0,
    pickup: 1000,
    delivery: 2000,
  };

  const minimum = minimumOrders[orderType];

  if (subtotal < minimum) {
    return {
      success: false,
      message: `Minimum order for ${orderType} is ₦${minimum.toLocaleString()}`,
      data: { minimum, current: subtotal, remaining: minimum - subtotal },
    };
  }

  return {
    success: true,
    message: 'Minimum order met',
  };
}
