import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  addItemToCartItems,
  computeCartTotal,
  type CartItem as HelperCartItem,
} from '@/lib/cart-store-helpers';

export interface CartItem extends HelperCartItem {
  // Local extensions on top of the pure-helper shape
  originalPrice?: number;
  priceOverridden?: boolean;
  priceOverrideReason?: string;
}

// Helper to generate unique IDs safely
function generateId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

interface CartStore {
  items: CartItem[];
  isOpen: boolean;
  tableNumber?: string;

  // Actions
  addItem: (
    item: Omit<CartItem, 'quantity' | 'cartItemId'> & { quantity?: number }
  ) => void;
  removeItem: (cartItemId: string) => void;
  updateQuantity: (cartItemId: string, quantity: number) => void;
  updateInstructions: (cartItemId: string, instructions: string) => void;
  updatePortionSize: (
    cartItemId: string,
    portionSize: 'full' | 'half' | 'quarter',
    adjustedPrice: number
  ) => void;
  overrideItemPrice: (
    cartItemId: string,
    newPrice: number,
    reason?: string
  ) => void;
  resetItemPrice: (cartItemId: string) => void;
  clearCart: () => void;
  toggleCart: () => void;
  openCart: () => void;
  closeCart: () => void;
  setTableNumber: (tableNumber: string) => void;

  // Computed values
  getTotalItems: () => number;
  getTotalPrice: () => number;
  getItemCount: (itemId: string) => number;
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      isOpen: false,
      tableNumber: undefined,

      addItem: (item) => {
        // Delegates merge-key + portion-defaulting logic to the pure helper.
        // The helper handles legacy items (no customizations) AND items with
        // customizations such that two Poundo+Egusi orders merge but
        // Poundo+Egusi vs Poundo+Ogbono get separate lines (REQ-031 D3).
        set((state) => ({
          items: addItemToCartItems(
            state.items as HelperCartItem[],
            item as HelperCartItem,
            generateId()
          ) as CartItem[],
        }));
      },

      removeItem: (cartItemId) => {
        set((state) => ({
          items: state.items.filter((item) => item.cartItemId !== cartItemId),
        }));
      },

      updateQuantity: (cartItemId, quantity) => {
        if (quantity <= 0) {
          get().removeItem(cartItemId);
          return;
        }

        set((state) => ({
          items: state.items.map((item) =>
            item.cartItemId === cartItemId ? { ...item, quantity } : item
          ),
        }));
      },

      updateInstructions: (cartItemId, instructions) => {
        set((state) => ({
          items: state.items.map((item) =>
            item.cartItemId === cartItemId
              ? { ...item, specialInstructions: instructions }
              : item
          ),
        }));
      },

      updatePortionSize: (cartItemId, portionSize, adjustedPrice) => {
        set((state) => ({
          items: state.items.map((item) =>
            item.cartItemId === cartItemId
              ? {
                  ...item,
                  portionSize,
                  portionMultiplier:
                    portionSize === 'half'
                      ? 0.5
                      : portionSize === 'quarter'
                        ? 0.25
                        : 1.0,
                  price: adjustedPrice,
                }
              : item
          ),
        }));
      },

      overrideItemPrice: (cartItemId, newPrice, reason) => {
        set((state) => ({
          items: state.items.map((item) =>
            item.cartItemId === cartItemId
              ? {
                  ...item,
                  originalPrice: item.originalPrice || item.price,
                  price: newPrice,
                  priceOverridden: true,
                  priceOverrideReason: reason,
                }
              : item
          ),
        }));
      },

      resetItemPrice: (cartItemId) => {
        set((state) => ({
          items: state.items.map((item) =>
            item.cartItemId === cartItemId && item.originalPrice
              ? {
                  ...item,
                  price: item.originalPrice,
                  priceOverridden: false,
                  priceOverrideReason: undefined,
                  originalPrice: undefined,
                }
              : item
          ),
        }));
      },

      clearCart: () => {
        set({ items: [], tableNumber: undefined });
      },

      toggleCart: () => {
        set((state) => ({ isOpen: !state.isOpen }));
      },

      openCart: () => {
        set({ isOpen: true });
      },

      closeCart: () => {
        set({ isOpen: false });
      },

      setTableNumber: (tableNumber) => {
        set({ tableNumber });
      },

      getTotalItems: () => {
        return get().items.reduce((total, item) => total + item.quantity, 0);
      },

      getTotalPrice: () => {
        // Delegates to pure helper that knows about customization surcharges
        // (REQ-031). Legacy items with no customizations sum to base × qty
        // exactly as before.
        return computeCartTotal(get().items as HelperCartItem[]);
      },

      getItemCount: (itemId) => {
        return get()
          .items.filter((i) => i.id === itemId)
          .reduce((total, item) => total + item.quantity, 0);
      },
    }),
    {
      name: 'wawa-cart-storage',
      // Only persist items and tableNumber, not UI state
      partialize: (state) => ({
        items: state.items,
        tableNumber: state.tableNumber,
      }),
      version: 2,
      migrate: (persistedState: any, version) => {
        let state = persistedState;
        if (version === 0) {
          // v0 → v1: Add cartItemId to existing items
          state = {
            ...state,
            items: state.items.map((item: any) => ({
              ...item,
              cartItemId: item.cartItemId || generateId(),
            })),
          };
        }
        // v1 → v2 (REQ-031): no item shape change required. The new merge key
        // includes customizations, but items without a customizations field
        // hash to (id|portion|instructions|) which matches the v1 key for the
        // same legacy line. So legacy carts continue to work unchanged; the
        // version bump is a marker, not a destructive migration.
        return state;
      },
    }
  )
);
