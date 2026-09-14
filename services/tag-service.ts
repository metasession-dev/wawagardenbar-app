/**
 * @requirement REQ-104
 */
import { connectDB } from '@/lib/mongodb';
import { TagModel } from '@/models/tag-model';
import { ITag, CreateTagDTO } from '@/interfaces/tag.interface';

/**
 * Derive a slug from a free-text tag name for case-insensitive de-dupe.
 * Mirrors `deriveSlug` in `services/main-category-service.ts`.
 */
function deriveSlug(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64);
}

export class TagService {
  /**
   * Find-or-create by case-insensitive slug. If an archived tag with the
   * same slug exists, it is unarchived and returned instead of colliding
   * on the unique index — supports the combobox's "type a new name"
   * flow without racing duplicate creates.
   */
  static async createTag(data: CreateTagDTO): Promise<ITag> {
    await connectDB();

    const name = data.name.trim();
    if (name.length === 0) {
      throw new Error('Tag name cannot be empty');
    }

    const slug = deriveSlug(name);
    if (slug.length === 0) {
      throw new Error(
        'Tag name must contain at least one alphanumeric character'
      );
    }

    const existing = await TagModel.findOne({ slug });
    if (existing) {
      if (existing.archivedAt) {
        existing.archivedAt = undefined;
        await existing.save();
      }
      return existing.toObject();
    }

    const created = await TagModel.create({
      name,
      slug,
      createdBy: data.createdBy,
    });
    return created.toObject();
  }

  static async listActiveTags(): Promise<ITag[]> {
    await connectDB();
    const tags = await TagModel.find({ archivedAt: { $exists: false } })
      .sort({ name: 1 })
      .lean();
    return tags as unknown as ITag[];
  }

  static async listAllTags(): Promise<ITag[]> {
    await connectDB();
    const tags = await TagModel.find({}).sort({ name: 1 }).lean();
    return tags as unknown as ITag[];
  }

  static async archiveTag(tagId: string): Promise<void> {
    await connectDB();
    const tag = await TagModel.findById(tagId);
    if (!tag) {
      throw new Error('Tag not found');
    }
    if (tag.archivedAt) {
      throw new Error('Tag is already archived');
    }
    tag.archivedAt = new Date();
    await tag.save();
  }

  static async restoreTag(tagId: string): Promise<void> {
    await connectDB();
    const result = await TagModel.updateOne(
      { _id: tagId },
      { $unset: { archivedAt: '' } }
    );
    if (result.matchedCount === 0) {
      throw new Error('Tag not found');
    }
  }
}
