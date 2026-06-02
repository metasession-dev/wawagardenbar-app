/**
 * @requirement REQ-059 — InstagramPostCredit ledger model
 *
 * Sliding-window credit ledger backing the IG-4 award trigger. One row
 * per (userId, ruleId, postId) tuple; status starts `pending` and flips
 * to `awarded` once the cadence threshold is reached.
 */
import { describe, it, expect, afterAll } from 'vitest';
import mongoose, { Types } from 'mongoose';

async function loadModel() {
  const mod = await import('@/models/instagram-post-credit-model');
  return mod.default;
}

describe('REQ-059 InstagramPostCredit model', () => {
  const USER_OID = new Types.ObjectId();
  const RULE_OID = new Types.ObjectId();

  it('AC1 — status defaults to "pending"', async () => {
    const Model = await loadModel();
    const doc = new Model({
      userId: USER_OID,
      ruleId: RULE_OID,
      postId: 'media-1',
      postedAt: new Date(),
    });
    expect(doc.status).toBe('pending');
  });

  it('AC1 — awardedAt defaults to null', async () => {
    const Model = await loadModel();
    const doc = new Model({
      userId: USER_OID,
      ruleId: RULE_OID,
      postId: 'media-2',
      postedAt: new Date(),
    });
    expect(doc.awardedAt).toBeNull();
  });

  it('AC1 — required fields throw validation error if missing', async () => {
    const Model = await loadModel();
    const doc = new Model({});
    const err = doc.validateSync();
    expect(err).toBeDefined();
    expect(err?.errors).toHaveProperty('userId');
    expect(err?.errors).toHaveProperty('ruleId');
    expect(err?.errors).toHaveProperty('postId');
    expect(err?.errors).toHaveProperty('postedAt');
  });

  it('AC1 — status enum rejects invalid values', async () => {
    const Model = await loadModel();
    const doc = new Model({
      userId: USER_OID,
      ruleId: RULE_OID,
      postId: 'media-3',
      postedAt: new Date(),
      status: 'queued', // not in the enum
    });
    const err = doc.validateSync();
    expect(err).toBeDefined();
    expect(err?.errors).toHaveProperty('status');
  });

  it('AC1 — explicit awardedAt accepted', async () => {
    const Model = await loadModel();
    const now = new Date();
    const doc = new Model({
      userId: USER_OID,
      ruleId: RULE_OID,
      postId: 'media-4',
      postedAt: new Date(),
      status: 'awarded',
      awardedAt: now,
    });
    const err = doc.validateSync();
    expect(err).toBeUndefined();
    expect(doc.awardedAt).toEqual(now);
  });

  it('AC1 — indexes registered: unique postId + compound (userId, ruleId, postedAt)', async () => {
    const Model = await loadModel();
    const indexes = Model.schema.indexes();
    // Compound (userId, ruleId, postedAt: -1) for the window-count query
    const compound = indexes.find(
      ([fields]) =>
        (fields as Record<string, number>).userId === 1 &&
        (fields as Record<string, number>).ruleId === 1 &&
        (fields as Record<string, number>).postedAt === -1
    );
    expect(compound).toBeDefined();
    // Unique postId is declared via the path option `unique: true`; appears
    // as an `_id`-like single-key index when listed.
    const postIdPath = Model.schema.path('postId');
    expect(
      (postIdPath as unknown as { options: { unique?: boolean } }).options
        .unique
    ).toBe(true);
  });

  afterAll(async () => {
    await mongoose.disconnect().catch(() => undefined);
  });
});
