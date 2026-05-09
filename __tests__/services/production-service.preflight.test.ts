/**
 * @requirement REQ-034 — AC10
 * Production pre-flight blocks if any ingredient is short
 * (after unit conversion).
 *
 * STUB: filled in during Phase B tests-first commit.
 */
import { describe, it } from 'vitest';

describe.skip('REQ-034 AC10 — Production pre-flight', () => {
  it('passes when every ingredient has currentStock ≥ required', () => {});
  it('blocks when any ingredient short — error includes ingredient names + needed/available', () => {});
  it('applies unit conversion before comparing (recipe g vs inventory kg)', () => {});
  it('does not write any deductions when blocked', () => {});
});
