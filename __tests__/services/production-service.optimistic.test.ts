/**
 * @requirement REQ-034 — AC11
 * Production deducts ingredients via optimistic $inc with currentStock
 * guard. On any failure mid-batch, runs reversal pass over already-
 * deducted ingredients. No withTransaction (Mongo standalone).
 *
 * STUB: filled in during Phase B tests-first commit.
 */
import { describe, it } from 'vitest';

describe.skip('REQ-034 AC11 — Production optimistic deduction', () => {
  describe('happy path', () => {
    it('deducts each ingredient via $inc with currentStock guard', () => {});
    it('adds actualYield portions to MenuItem inventory at end', () => {});
    it('emits N+1 StockMovement rows (N deductions + 1 yield addition) tagged with productionId', () => {});
    it('persists Production with ingredientsDeducted snapshot in inventory units', () => {});
  });

  describe('race condition', () => {
    it('treats updateOne 0-modified as ingredient short → abort', () => {});
    it('does not deduct subsequent ingredients after a short detected', () => {});
  });

  describe('reversal pass on partial failure', () => {
    it('reverses already-deducted ingredients with category:production type:addition StockMovements', () => {});
    it('rolls back the MenuItem yield addition if it landed', () => {});
    it('Production status remains aborted (not stored as completed)', () => {});
  });
});
