import mongoose, { Schema, Model } from 'mongoose';

/**
 * Backs `OrderService.generateOrderNumber()`'s atomic per-day sequence.
 * `_id` is the order number's date key (YYMMDD, matching the `WG<YYMMDD>NNNN`
 * format) so each calendar day gets its own counter document.
 */
export interface IOrderNumberCounter {
  _id: string;
  seq: number;
}

const orderNumberCounterSchema = new Schema<IOrderNumberCounter>(
  {
    _id: { type: String, required: true },
    seq: { type: Number, required: true, default: 0 },
  },
  { versionKey: false }
);

const OrderNumberCounterModel: Model<IOrderNumberCounter> =
  mongoose.models.OrderNumberCounter ||
  mongoose.model<IOrderNumberCounter>(
    'OrderNumberCounter',
    orderNumberCounterSchema
  );

export default OrderNumberCounterModel;
