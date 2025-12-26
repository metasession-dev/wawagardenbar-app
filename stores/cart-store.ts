import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface CartItem {
  id: string;
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

interface CartStore {
  items: CartItem[];
  isOpen: boolean;
  tableNumber?: string;
  
  // Actions
  addItem: (item: Omit<CartItem, 'quantity'> & { quantity?: number }) => void;
  removeItem: (itemId: string) => void;
  updateQuantity: (itemId: string, quantity: number) => void;
  updateInstructions: (itemId: string, instructions: string) => void;
  updatePortionSize: (itemId: string, portionSize: 'full' | 'half', adjustedPrice: number) => void;
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
              i.id === item.id && 
              i.portionSize === (item.portionSize || 'full') &&
              i.specialInstructions === item.specialInstructions
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
                quantity: item.quantity || 1,
                portionSize: item.portionSize || 'full',
                portionMultiplier: item.portionSize === 'half' ? 0.5 : 1.0,
              },
            ],
          }));
        }
      },

      removeItem: (itemId) => {
        set((state) => ({
          items: state.items.filter((item) => item.id !== itemId),
        }));
      },

      updateQuantity: (itemId, quantity) => {
        if (quantity <= 0) {
          get().removeItem(itemId);
          return;
        }

        set((state) => ({
          items: state.items.map((item) =>
            item.id === itemId ? { ...item, quantity } : item
          ),
        }));
      },

      updateInstructions: (itemId, instructions) => {
        set((state) => ({
          items: state.items.map((item) =>
            item.id === itemId
              ? { ...item, specialInstructions: instructions }
              : item
          ),
        }));
      },

      updatePortionSize: (itemId, portionSize, adjustedPrice) => {
        set((state) => ({
          items: state.items.map((item) =>
            item.id === itemId
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
        const item = get().items.find((i) => i.id === itemId);
        return item?.quantity || 0;
      },
    }),
    {
      name: 'wawa-cart-storage',
      // Only persist items and tableNumber, not UI state
      partialize: (state) => ({ items: state.items, tableNumber: state.tableNumber }),
    }
  )
);
