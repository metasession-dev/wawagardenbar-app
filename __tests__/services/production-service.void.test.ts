/**
 * @requirement REQ-034 — AC13
 * Voiding a production reverses every linked StockMovement.
 * Within 24h: super-admin only, reasonNote optional.
 * Past 24h: super-admin only, reasonNote required (persisted on reversals).
 *
 * STUB: filled in during Phase B tests-first commit.
 */
import { describe, it } from 'vitest';

describe.skip('REQ-034 AC13 — Production void', () => {
  describe('within 24h', () => {
    it('super-admin can void without reasonNote', () => {});
    it('admin role is BLOCKED', () => {});
    it('kitchen role is BLOCKED', () => {});
    it('reverses every deduction StockMovement (creates additions)', () => {});
    it('reverses the MenuItem yield addition (creates a deduction)', () => {});
    it('Production.status flips to voided', () => {});
  });

  describe('past 24h', () => {
    it('super-admin must provide reasonNote (rejects without)', () => {});
    it('reasonNote persisted on every reversal StockMovement', () => {});
    it('Production.reasonNote persisted on the production row too', () => {});
  });

  describe('idempotency', () => {
    it('voiding an already-voided production is a no-op', () => {});
  });
});
