/**
 * @requirement REQ-104 - Expense tags: create, archive, attach, filter
 *
 * Pins the contract of `TagService`:
 *   - createTag: case-insensitive find-or-create by slug; unarchives an
 *     archived match instead of colliding on the unique index.
 *   - listActiveTags / listAllTags — filter by archivedAt.
 *   - archiveTag / restoreTag — idempotency guards.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/mongodb', () => ({
  connectDB: vi.fn(),
}));

const mockFindOne = vi.fn();
const mockCreate = vi.fn();
const mockFind = vi.fn();
const mockFindById = vi.fn();
const mockUpdateOne = vi.fn();

vi.mock('@/models/tag-model', () => ({
  TagModel: {
    findOne: (...args: unknown[]) => mockFindOne(...args),
    create: (...args: unknown[]) => mockCreate(...args),
    find: (...args: unknown[]) => mockFind(...args),
    findById: (...args: unknown[]) => mockFindById(...args),
    updateOne: (...args: unknown[]) => mockUpdateOne(...args),
  },
}));

import { TagService } from '@/services/tag-service';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('REQ-104: TagService.createTag', () => {
  it('creates a new tag when no matching slug exists', async () => {
    mockFindOne.mockResolvedValue(null);
    const created = { toObject: () => ({ name: 'Fuel', slug: 'fuel' }) };
    mockCreate.mockResolvedValue(created);

    const result = await TagService.createTag({
      name: 'Fuel',
      createdBy: 'user1',
    });

    expect(mockFindOne).toHaveBeenCalledWith({ slug: 'fuel' });
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Fuel',
        slug: 'fuel',
        createdBy: 'user1',
      })
    );
    expect(result).toEqual({ name: 'Fuel', slug: 'fuel' });
  });

  it('is case-insensitive — "fuel" and "Fuel" derive the same slug', async () => {
    mockFindOne.mockResolvedValue(null);
    mockCreate.mockResolvedValue({ toObject: () => ({}) });

    await TagService.createTag({ name: '  Fuel  ', createdBy: 'user1' });

    expect(mockFindOne).toHaveBeenCalledWith({ slug: 'fuel' });
  });

  it('returns the existing active tag instead of creating a duplicate', async () => {
    const existing = {
      archivedAt: undefined,
      save: vi.fn(),
      toObject: () => ({ name: 'Fuel', slug: 'fuel' }),
    };
    mockFindOne.mockResolvedValue(existing);

    const result = await TagService.createTag({
      name: 'Fuel',
      createdBy: 'user1',
    });

    expect(mockCreate).not.toHaveBeenCalled();
    expect(existing.save).not.toHaveBeenCalled();
    expect(result).toEqual({ name: 'Fuel', slug: 'fuel' });
  });

  it('unarchives an archived tag with the same slug instead of colliding', async () => {
    const existing = {
      archivedAt: new Date(),
      save: vi.fn().mockResolvedValue(undefined),
      toObject: () => ({ name: 'Fuel', slug: 'fuel' }),
    };
    mockFindOne.mockResolvedValue(existing);

    await TagService.createTag({ name: 'Fuel', createdBy: 'user1' });

    expect(existing.archivedAt).toBeUndefined();
    expect(existing.save).toHaveBeenCalled();
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('rejects an empty name', async () => {
    await expect(
      TagService.createTag({ name: '   ', createdBy: 'user1' })
    ).rejects.toThrow('Tag name cannot be empty');
  });
});

describe('REQ-104: TagService.listActiveTags / listAllTags', () => {
  function mockQuery(result: unknown[]) {
    return { sort: () => ({ lean: () => Promise.resolve(result) }) };
  }

  it('listActiveTags filters out archived tags', async () => {
    mockFind.mockReturnValue(mockQuery([{ name: 'Fuel' }]));
    const result = await TagService.listActiveTags();
    expect(mockFind).toHaveBeenCalledWith({ archivedAt: { $exists: false } });
    expect(result).toEqual([{ name: 'Fuel' }]);
  });

  it('listAllTags includes archived tags', async () => {
    mockFind.mockReturnValue(mockQuery([{ name: 'Fuel' }, { name: 'Old' }]));
    const result = await TagService.listAllTags();
    expect(mockFind).toHaveBeenCalledWith({});
    expect(result).toHaveLength(2);
  });
});

describe('REQ-104: TagService.archiveTag / restoreTag', () => {
  it('archives an active tag', async () => {
    const tag = {
      archivedAt: undefined,
      save: vi.fn().mockResolvedValue(undefined),
    };
    mockFindById.mockResolvedValue(tag);

    await TagService.archiveTag('tag1');

    expect(tag.archivedAt).toBeInstanceOf(Date);
    expect(tag.save).toHaveBeenCalled();
  });

  it('rejects archiving an already-archived tag', async () => {
    mockFindById.mockResolvedValue({ archivedAt: new Date() });
    await expect(TagService.archiveTag('tag1')).rejects.toThrow(
      'Tag is already archived'
    );
  });

  it('rejects archiving a non-existent tag', async () => {
    mockFindById.mockResolvedValue(null);
    await expect(TagService.archiveTag('missing')).rejects.toThrow(
      'Tag not found'
    );
  });

  it('restores an archived tag', async () => {
    mockUpdateOne.mockResolvedValue({ matchedCount: 1 });
    await TagService.restoreTag('tag1');
    expect(mockUpdateOne).toHaveBeenCalledWith(
      { _id: 'tag1' },
      { $unset: { archivedAt: '' } }
    );
  });

  it('rejects restoring a non-existent tag', async () => {
    mockUpdateOne.mockResolvedValue({ matchedCount: 0 });
    await expect(TagService.restoreTag('missing')).rejects.toThrow(
      'Tag not found'
    );
  });
});
