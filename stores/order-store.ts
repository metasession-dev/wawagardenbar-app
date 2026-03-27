import { create } from 'zustand';

export interface OrderFilters {
  status?: string;
  type?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
  paymentStatus?: string;
}

export interface Order {
  _id: string;
  orderNumber: string;
  orderType: string;
  status: string;
  customer: {
    name: string;
    email?: string;
    phone?: string;
  };
  items: any[];
  total: number;
  paymentStatus?: string;
  tableNumber?: string;
  deliveryAddress?: any;
  specialInstructions?: string;
  createdAt: string;
  updatedAt: string;
  statusHistory?: any[];
  estimatedCompletionTime?: string;
  preparationStartedAt?: string;
  tabId?: string;
  reconciled?: boolean;
  reconciledAt?: string;
}

interface OrderStore {
  orders: Order[];
  selectedOrders: string[];
  filters: OrderFilters;
  isConnected: boolean;

  // Actions
  setOrders: (orders: Order[]) => void;
  addOrder: (order: Order) => void;
  updateOrder: (orderId: string, updates: Partial<Order>) => void;
  removeOrder: (orderId: string) => void;
  toggleSelectOrder: (orderId: string) => void;
  selectAllOrders: () => void;
  clearSelection: () => void;
  setFilters: (filters: Partial<OrderFilters>) => void;
  clearFilters: () => void;
  setConnected: (connected: boolean) => void;
}

/**
 * Order store for managing order state
 * Used for real-time updates and UI state
 */
export const useOrderStore = create<OrderStore>((set) => ({
  orders: [],
  selectedOrders: [],
  filters: {},
  isConnected: false,

  setOrders: (orders) => set({ orders }),

  addOrder: (order) =>
    set((state) => ({
      orders: [order, ...state.orders],
    })),

  updateOrder: (orderId, updates) =>
    set((state) => ({
      orders: state.orders.map((o) =>
        o._id === orderId ? { ...o, ...updates } : o
      ),
    })),

  removeOrder: (orderId) =>
    set((state) => ({
      orders: state.orders.filter((o) => o._id !== orderId),
      selectedOrders: state.selectedOrders.filter((id) => id !== orderId),
    })),

  toggleSelectOrder: (orderId) =>
    set((state) => ({
      selectedOrders: state.selectedOrders.includes(orderId)
        ? state.selectedOrders.filter((id) => id !== orderId)
        : [...state.selectedOrders, orderId],
    })),

  selectAllOrders: () =>
    set((state) => ({
      selectedOrders: state.orders.map((o) => o._id),
    })),

  clearSelection: () => set({ selectedOrders: [] }),

  setFilters: (filters) =>
    set((state) => ({
      filters: { ...state.filters, ...filters },
    })),

  clearFilters: () => set({ filters: {} }),

  setConnected: (connected) => set({ isConnected: connected }),
}));
