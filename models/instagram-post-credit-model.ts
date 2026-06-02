/**
 * @requirement REQ-059 — InstagramPostCredit sliding-window credit ledger
 *
 * One row per (userId, ruleId, postId) tuple. The cadence accumulator for
 * #117's IG-4 sliding-window award trigger: a customer's `pending` credits
 * within a rule's rolling `windowDays` reach `postsRequired` → award fires
 * + credits flip to `awarded` with `awardedAt` stamped.
 *
 * Race-safe via unique `postId` index — concurrent ticks attempting to
 * insert the same media id get an E11000 the service catches as no-op.
 *
 * Replaces the previous naive description-regex dedup against
 * `PointsTransaction.description` (kept as REQ-059 AC3 fallback during
 * the transition period).
 */
import {
  Schema,
  model,
  models,
  type Model,
  type Document,
  type Types,
} from 'mongoose';

export type InstagramPostCreditStatus = 'pending' | 'awarded';

export interface IInstagramPostCredit extends Document {
  userId: Types.ObjectId;
  ruleId: Types.ObjectId;
  postId: string;
  postedAt: Date;
  status: InstagramPostCreditStatus;
  awardedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const instagramPostCreditSchema = new Schema<IInstagramPostCredit>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    ruleId: {
      type: Schema.Types.ObjectId,
      ref: 'RewardRule',
      required: true,
      index: true,
    },
    postId: { type: String, required: true, unique: true },
    postedAt: { type: Date, required: true, index: true },
    status: {
      type: String,
      required: true,
      enum: ['pending', 'awarded'],
      default: 'pending',
    },
    awardedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

// Compound index drives the sliding-window count query:
//   countDocuments({ userId, ruleId, status: 'pending',
//                    postedAt: { $gte: windowStart } })
// Sort descending on postedAt so the most-recent posts are scanned first.
instagramPostCreditSchema.index({ userId: 1, ruleId: 1, postedAt: -1 });

const InstagramPostCreditModel: Model<IInstagramPostCredit> =
  (models.InstagramPostCredit as Model<IInstagramPostCredit>) ||
  model<IInstagramPostCredit>('InstagramPostCredit', instagramPostCreditSchema);

export default InstagramPostCreditModel;
