import mongoose, { Schema, Model } from 'mongoose';
import {
  IMenuItem,
  ICustomization,
  ICustomizationOption,
  MenuMainCategory,
} from '../interfaces';

const customizationOptionSchema = new Schema<ICustomizationOption>(
  {
    name: { type: String, required: true },
    price: { type: Number, required: true, min: 0 },
    available: { type: Boolean, default: true },
  },
  { _id: false }
);

const customizationSchema = new Schema<ICustomization>(
  {
    name: { type: String, required: true },
    required: { type: Boolean, default: false },
    options: { type: [customizationOptionSchema], default: [] },
  },
  { _id: false }
);

const menuItemSchema = new Schema<IMenuItem>(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    mainCategory: {
      type: String,
      enum: ['drinks', 'food'] as MenuMainCategory[],
      required: true,
    },
    category: {
      type: String,
      required: true,
    },
    price: { type: Number, required: true, min: 0 },
    costPerUnit: { type: Number, required: true, min: 0, default: 0 },
    images: { type: [String], default: [] },
    customizations: { type: [customizationSchema], default: [] },
    isAvailable: { type: Boolean, default: true },
    preparationTime: { type: Number, required: true, min: 0 },
    servingSize: { type: String },
    tags: { type: [String], default: [] },
    allergens: { type: [String], default: [] },
    nutritionalInfo: {
      calories: { type: Number, min: 0 },
      protein: { type: Number, min: 0 },
      carbs: { type: Number, min: 0 },
      fat: { type: Number, min: 0 },
      spiceLevel: { 
        type: String, 
        enum: ['none', 'mild', 'medium', 'hot', 'extra-hot'],
        default: 'none'
      },
    },
    slug: { type: String, unique: true, sparse: true },
    metaDescription: { type: String },
    trackInventory: { type: Boolean, default: false },
    inventoryId: {
      type: Schema.Types.ObjectId,
      ref: 'Inventory',
      required: false,
    },
    pointsValue: { type: Number, required: false, min: 0 },
    pointsRedeemable: { type: Boolean, default: false },
    portionOptions: {
      halfPortionEnabled: { type: Boolean, default: false },
      halfPortionSurcharge: { type: Number, default: 0, min: 0 },
      quarterPortionEnabled: { type: Boolean, default: false },
      quarterPortionSurcharge: { type: Number, default: 0, min: 0 },
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual field for half portion price
menuItemSchema.virtual('halfPortionPrice').get(function() {
  return Math.round(this.price * 0.5);
});

// Virtual field for quarter portion price
menuItemSchema.virtual('quarterPortionPrice').get(function() {
  return Math.round(this.price * 0.25);
});

menuItemSchema.index({ name: 'text', description: 'text', tags: 'text' });
menuItemSchema.index({ mainCategory: 1, category: 1 });
menuItemSchema.index({ isAvailable: 1, mainCategory: 1 });

const MenuItemModel: Model<IMenuItem> =
  mongoose.models.MenuItem ||
  mongoose.model<IMenuItem>('MenuItem', menuItemSchema);

export default MenuItemModel;
