/**
 * @requirement REQ-115 (AC5, ADR-006) — phone migration plan: normalise,
 * report duplicates, never merge.
 */
import { describe, it, expect } from 'vitest';
import { maskPhone, planPhoneMigration } from '@/lib/phone-migration';

describe('REQ-115 planPhoneMigration', () => {
  it('rewrites non-canonical phones and leaves canonical ones alone', () => {
    const plan = planPhoneMigration([
      { id: 'a', phone: '08012345678' },
      { id: 'b', phone: '+2348099998888' },
      { id: 'c', phone: '2348077776666' },
    ]);
    expect(plan.updates).toEqual([
      { id: 'a', before: '08012345678', after: '+2348012345678' },
      { id: 'c', before: '2348077776666', after: '+2348077776666' },
    ]);
    expect(plan.alreadyCanonical).toBe(1);
    expect(plan.duplicates).toEqual([]);
  });

  it('reports accounts that would collide and changes neither', () => {
    const plan = planPhoneMigration([
      { id: 'a', phone: '08012345678' },
      { id: 'b', phone: '+2348012345678' },
      { id: 'c', phone: '2348012345678' },
      { id: 'd', phone: '08055554444' },
    ]);
    expect(plan.duplicates).toHaveLength(1);
    expect(plan.duplicates[0].canonical).toBe('+2348012345678');
    expect(plan.duplicates[0].accounts.map((x) => x.id).sort()).toEqual([
      'a',
      'b',
      'c',
    ]);
    // Only the non-colliding account is rewritten.
    expect(plan.updates).toEqual([
      { id: 'd', before: '08055554444', after: '+2348055554444' },
    ]);
  });

  it('skips users without a phone and reports unusable values', () => {
    const plan = planPhoneMigration([
      { id: 'a', phone: '' },
      { id: 'b', phone: null },
      { id: 'c', phone: 'n/a' },
      { id: 'd', phone: '+2348012345678' },
    ]);
    expect(plan.unusable).toEqual([{ id: 'c', phone: 'n/a' }]);
    expect(plan.total).toBe(2);
    expect(plan.updates).toEqual([]);
  });

  it('is idempotent: planning on already-migrated data yields no updates', () => {
    const first = planPhoneMigration([{ id: 'a', phone: '08012345678' }]);
    const migrated = first.updates.map((u) => ({ id: u.id, phone: u.after }));
    expect(planPhoneMigration(migrated).updates).toEqual([]);
  });

  it('maskPhone keeps only the last four digits', () => {
    expect(maskPhone('+2348012345678')).toBe('*********5678');
    expect(maskPhone('12')).toBe('****');
  });
});
