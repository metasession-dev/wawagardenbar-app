import mongoose, { Schema, Model } from 'mongoose';
import {
  IOrder,
  IOrderItem,
  IDeliveryDetails,
  IPickupDetails,
  IDineInDetails,
  OrderType,
  OrderStatus,
} from '../interfaces';

const orderItemSchema = new Schema<IOrderItem>(
  {
    menuItemId: {
      type: Schema.Types.ObjectId,
      ref: 'MenuItem',
      required: true,
    },
    name: { type: String, required: true },
    price: { type: Number, required: true, min: 0 },
    quantity: { type: Number, required: true, min: 1 },
    portionSize: {
      type: String,
      enum: ['full', 'half'],
      default: 'full',
    },
    portionMultiplier: {
      type: Number,
      default: 1.0,
      min: 0.5,
      max: 1.0,
    },
    customizations: [
      {
        name: { type: String, required: true },
        option: { type: String, required: true },
        price: { type: Number, required: true, min: 0 },
      },
    ],
    specialInstructions: { type: String },
    subtotal: { type: Number, required: true, min: 0 },
    costPerUnit: { type: Number, required: true, min: 0, default: 0 },
    totalCost: { type: Number, required: true, min: 0, default: 0 },
    grossProfit: { type: Number, required: true, default: 0 },
    profitMargin: { type: Number, required: true, default: 0 },
  },
  { _id: false }
);

const deliveryDetailsSchema = new Schema<IDeliveryDetails>(
  {
    address: {
      street: { type: String, required: true },
      street2: { type: String, required: false },
      city: { type: String, required: true },
      state: { type: String, required: true },
      postalCode: { type: String, required: false },
      country: { type: String, required: true },
    },
    deliveryInstructions: { type: String },
    estimatedDeliveryTime: { type: Date },
    actualDeliveryTime: { type: Date },
  },
  { _id: false }
);

const pickupDetailsSchema = new Schema<IPickupDetails>(
  {
    preferredPickupTime: { type: Date, required: true },
    actualPickupTime: { type: Date },
  },
  { _id: false }
);

const dineInDetailsSchema = new Schema<IDineInDetails>(
  {
    tableNumber: { type: String, required: true },
    qrCodeScanned: { type: Boolean, default: false },
  },
  { _id: false }
);

const orderSchema = new Schema<IOrder>(
  {
    orderNumber: {
      type: String,
      required: true,
      unique: true,
    },
    idempotencyKey: {
      type: String,
      required: true,
      unique: true,
    },
    userId: { type: Schema.Types.ObjectId, ref: 'User' },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    createdByRole: {
      type: String,
      enum: ['admin', 'super-admin', 'customer'],
      default: 'customer',
    },
    guestEmail: { type: String, lowercase: true, trim: true },
    guestName: { type: String, trim: true },
    guestPhone: { type: String, trim: true },
    tabId: { type: Schema.Types.ObjectId, ref: 'Tab' },
    orderType: {
      type: String,
      enum: ['dine-in', 'pickup', 'delivery', 'pay-now'] as OrderType[],
      required: true,
    },
    status: {
      type: String,
      enum: [
        'pending',
        'confirmed',
        'preparing',
        'ready',
        'out-for-delivery',
        'delivered',
        'completed',
        'cancelled',
      ] as OrderStatus[],
      default: 'pending',
    },
    items: { type: [orderItemSchema], required: true },
    subtotal: { type: Number, required: true, min: 0 },
    serviceFee: { type: Number, default: 0, min: 0 },
    tax: { type: Number, default: 0, min: 0 },
    deliveryFee: { type: Number, default: 0, min: 0 },
    discount: { type: Number, default: 0, min: 0 },
    tipAmount: { type: Number, default: 0, min: 0 },
    total: { type: Number, required: true, min: 0 },
    totalCost: { type: Number, default: 0, min: 0 },
    grossProfit: { type: Number, default: 0 },
    profitMargin: { type: Number, default: 0 },
    operationalCosts: {
      delivery: { type: Number, default: 0, min: 0 },
      packaging: { type: Number, default: 0, min: 0 },
      processing: { type: Number, default: 0, min: 0 },
    },
    paymentId: { type: Schema.Types.ObjectId, ref: 'Payment' },
    paymentReference: { type: String },
    transactionReference: { type: String },
    paymentMethod: {
      type: String,
      enum: ['card', 'transfer', 'ussd', 'phone', 'cash'],
    },
    paymentStatus: {
      type: String,
      enum: ['pending', 'paid', 'failed', 'cancelled', 'refunded'],
      default: 'pending',
    },
    paidAt: { type: Date },
    deliveryDetails: { type: deliveryDetailsSchema },
    pickupDetails: { type: pickupDetailsSchema },
    dineInDetails: { type: dineInDetailsSchema },
    specialInstructions: { type: String },
    estimatedWaitTime: { type: Number, required: true, min: 0 },
    actualWaitTime: { type: Number, min: 0 },
    statusHistory: [
      {
        status: {
          type: String,
          enum: [
            'pending',
            'confirmed',
            'preparing',
            'ready',
            'out-for-delivery',
            'delivered',
            'completed',
            'cancelled',
          ] as OrderStatus[],
          required: true,
        },
        timestamp: { type: Date, default: Date.now },
        note: { type: String },
      },
    ],
    rating: { type: Number, min: 1, max: 5 },
    review: { type: String },
    inventoryDeducted: { type: Boolean, default: false },
    inventoryDeductedAt: { type: Date },
    inventoryDeductedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    estimatedCompletionTime: { type: Date },
    preparationStartedAt: { type: Date },
    kitchenPriority: {
      type: String,
      enum: ['normal', 'urgent'],
      default: 'normal',
    },
    pointsUsed: { type: Number, default: 0, min: 0 },
    pointsValue: { type: Number, default: 0, min: 0 },
    itemsPaidWithPoints: [
      {
        itemId: { type: Schema.Types.ObjectId, ref: 'MenuItem' },
        pointsUsed: { type: Number },
      },
    ],
    appliedRewards: [{ type: Schema.Types.ObjectId, ref: 'Reward' }],
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

orderSchema.index({ userId: 1, createdAt: -1 });
orderSchema.index({ status: 1, orderType: 1 });
orderSchema.index({ createdAt: -1 });
orderSchema.index({ guestEmail: 1 });

orderSchema.pre('save', function preSave(next) {
  if (this.isNew) {
    this.statusHistory = [
      {
        status: this.status,
        timestamp: new Date(),
      },
    ];
  }
  next();
});

const OrderModel: Model<IOrder> =
  mongoose.models.Order || mongoose.model<IOrder>('Order', orderSchema);

export default OrderModel;
