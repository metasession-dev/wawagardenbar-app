/**
 * @requirement REQ-104
 */
import mongoose, { Schema, Model } from 'mongoose';
import { ITag } from '../interfaces/tag.interface';

const TagSchema = new Schema<ITag>(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true },
    /**
     * REQ-104 — Soft-delete marker, mirrors the `archivedAt` pattern from
     * `models/inventory-model.ts` / `models/menu-item-model.ts`. When set,
     * the tag stays queryable by `_id` (existing PendingExpenseGroup/Expense
     * references keep resolving and displaying correctly) but is filtered
     * out of the create-combobox and the archive list's "active" view.
     */
    archivedAt: { type: Date },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

TagSchema.index({ archivedAt: 1 });

export const TagModel: Model<ITag> =
  mongoose.models.Tag || mongoose.model<ITag>('Tag', TagSchema);
