import { Types } from 'mongoose';

export type OrderType = 'dine-in' | 'pickup' | 'delivery' | 'pay-now';

export type PortionSize = 'full' | 'half' | 'quarter';

export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'preparing'
  | 'ready'
  | 'out-for-delivery'
  | 'delivered'
  | 'completed'
  | 'cancelled';

export interface IOrderItem {
  menuItemId: Types.ObjectId;
  name: string;
  price: number;
  quantity: number;
  portionSize: PortionSize;
  portionMultiplier: number;
  customizations: {
    name: string;
    option: string;
    price: number;
  }[];
  specialInstructions?: string;
  subtotal: number;
  costPerUnit: number;
  totalCost: number;
  grossProfit: number;
  profitMargin: number;
}

export interface IDeliveryDetails {
  address: {
    street: string;
    street2?: string;
    city: string;
    state: string;
    postalCode?: string;
    country: string;
  };
  deliveryInstructions?: string;
  estimatedDeliveryTime?: Date;
  actualDeliveryTime?: Date;
}

export interface IPickupDetails {
  preferredPickupTime: Date;
  actualPickupTime?: Date;
}

export interface IDineInDetails {
  tableNumber: string;
  qrCodeScanned: boolean;
}

export interface IOrder {
  _id: Types.ObjectId;
  orderNumber: string;
  idempotencyKey: string;
  userId?: Types.ObjectId;
  createdBy?: Types.ObjectId;
  createdByRole?: 'admin' | 'super-admin' | 'customer';
  guestEmail?: string;
  guestName?: string;
  guestPhone?: string;
  orderType: OrderType;
  status: OrderStatus;
  tabId?: Types.ObjectId;
  items: IOrderItem[];
  subtotal: number;
  serviceFee: number;
  tax: number;
  deliveryFee: number;
  discount: number;
  tipAmount: number;
  total: number;
  totalCost: number;
  grossProfit: number;
  profitMargin: number;
  operationalCosts: {
    delivery?: number;
    packaging?: number;
    processing?: number;
  };
  paymentId?: Types.ObjectId;
  paymentReference?: string;
  transactionReference?: string;
  paymentMethod?: 'card' | 'transfer' | 'ussd' | 'phone' | 'cash';
  paymentStatus?: 'pending' | 'paid' | 'failed' | 'cancelled' | 'refunded';
  paidAt?: Date;
  deliveryDetails?: IDeliveryDetails;
  pickupDetails?: IPickupDetails;
  dineInDetails?: IDineInDetails;
  specialInstructions?: string;
  estimatedWaitTime: number;
  actualWaitTime?: number;
  statusHistory: {
    status: OrderStatus;
    timestamp: Date;
    note?: string;
  }[];
  rating?: number;
  review?: string;
  inventoryDeducted: boolean;
  inventoryDeductedAt?: Date;
  inventoryDeductedBy?: Types.ObjectId;
  estimatedCompletionTime?: Date;
  preparationStartedAt?: Date;
  kitchenPriority?: 'normal' | 'urgent';
  pointsUsed: number;
  pointsValue: number;
  itemsPaidWithPoints: Array<{
    itemId: Types.ObjectId;
    pointsUsed: number;
  }>;
  appliedRewards: Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}
