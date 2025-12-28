import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface CartItem {
  cartItemId: string; // Unique identifier for the cart entry
  id: string; // Menu Item ID
  name: string;
  price: number;
  quantity: number;
  portionSize?: 'full' | 'half';
  portionMultiplier?: number;
  image?: string;
  category: string;
  specialInstructions?: string;
  preparationTime: number;
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
  addItem: (item: Omit<CartItem, 'quantity' | 'cartItemId'> & { quantity?: number }) => void;
  removeItem: (cartItemId: string) => void;
  updateQuantity: (cartItemId: string, quantity: number) => void;
  updateInstructions: (cartItemId: string, instructions: string) => void;
  updatePortionSize: (cartItemId: string, portionSize: 'full' | 'half', adjustedPrice: number) => void;
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
        const existingItem = get().items.find(
          (i) => i.id === item.id && 
                 i.portionSize === (item.portionSize || 'full') &&
                 i.specialInstructions === item.specialInstructions
        );
        
        if (existingItem) {
          // Update quantity if item already exists with same portion and instructions
          set((state) => ({
            items: state.items.map((i) =>
              i.cartItemId === existingItem.cartItemId
                ? { ...i, quantity: i.quantity + (item.quantity || 1) }
                : i
            ),
          }));
        } else {
          // Add new item
          set((state) => ({
            items: [
              ...state.items,
              {
                ...item,
                cartItemId: generateId(),
                quantity: item.quantity || 1,
                portionSize: item.portionSize || 'full',
                portionMultiplier: item.portionSize === 'half' ? 0.5 : 1.0,
              },
            ],
          }));
        }
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
                  portionMultiplier: portionSize === 'half' ? 0.5 : 1.0,
                  price: adjustedPrice,
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
        return get().items.reduce(
          (total, item) => total + item.price * item.quantity,
          0
        );
      },

      getItemCount: (itemId) => {
        return get().items
          .filter((i) => i.id === itemId)
          .reduce((total, item) => total + item.quantity, 0);
      },
    }),
    {
      name: 'wawa-cart-storage',
      // Only persist items and tableNumber, not UI state
      partialize: (state) => ({ items: state.items, tableNumber: state.tableNumber }),
      version: 1,
      migrate: (persistedState: any, version) => {
        if (version === 0) {
          // Migration from version 0 to 1: Add cartItemId to existing items
          return {
            ...persistedState,
            items: persistedState.items.map((item: any) => ({
              ...item,
              cartItemId: item.cartItemId || generateId(),
            })),
          };
        }
        return persistedState;
      },
    }
  )
);
