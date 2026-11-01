import mongoose, { Schema, Model } from 'mongoose';
import { Types } from 'mongoose';

export type PointsTransactionType = 'earned' | 'spent' | 'expired' | 'adjusted';

export interface IPointsTransaction {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  type: PointsTransactionType;
  amount: number; // Positive for earned, negative for spent
  orderId?: Types.ObjectId;
  rewardId?: Types.ObjectId;
  description: string;
  balanceAfter: number;
  createdAt: Date;
}

const pointsTransactionSchema = new Schema<IPointsTransaction>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    type: {
      type: String,
      enum: [
        'earned',
        'spent',
        'expired',
        'adjusted',
      ] as PointsTransactionType[],
      required: true,
    },
    amount: { type: Number, required: true },
    orderId: { type: Schema.Types.ObjectId, ref: 'Order' },
    rewardId: { type: Schema.Types.ObjectId, ref: 'Reward' },
    description: { type: String, required: true },
    balanceAfter: { type: Number, required: true },
    createdAt: { type: Date, default: Date.now },
  },
  {
    timestamps: false, // We only need createdAt
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

pointsTransactionSchema.index({ userId: 1, createdAt: -1 });
pointsTransactionSchema.index({ orderId: 1 });
pointsTransactionSchema.index({ rewardId: 1 });

const PointsTransactionModel: Model<IPointsTransaction> =
  mongoose.models.PointsTransaction ||
  mongoose.model<IPointsTransaction>(
    'PointsTransaction',
    pointsTransactionSchema
  );

export default PointsTransactionModel;
