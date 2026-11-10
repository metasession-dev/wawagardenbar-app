/**
 * @requirement REQ-120 — AC5
 * @srs REQ-ORDMGT-019
 */
import { describe, it, expect } from 'vitest';
import {
  runOrderOriginMigration,
  NEEDS_CUSTOMER_ORIGIN,
  NEEDS_STAFF_ORIGIN,
} from '@/lib/order-origin-migration';

type Doc = { createdByRole?: string; origin?: string };

function fakeModel(docs: Doc[]) {
  const matches = (d: Doc, f: any): boolean => {
    if (f === NEEDS_CUSTOMER_ORIGIN)
      return (
        d.origin === undefined &&
        (d.createdByRole === undefined || d.createdByRole === 'customer')
      );
    if (f === NEEDS_STAFF_ORIGIN)
      return (
        d.origin === undefined &&
        d.createdByRole !== undefined &&
        d.createdByRole !== 'customer'
      );
    return false;
  };
  return {
    async countDocuments(f: any) {
      return docs.filter((d) => matches(d, f)).length;
    },
    async updateMany(f: any, u: any) {
      const hit = docs.filter((d) => matches(d, f));
      hit.forEach((d) => (d.origin = u.$set.origin));
      return { modifiedCount: hit.length };
    },
  };
}

describe('runOrderOriginMigration', () => {
  const seed = (): Doc[] => [
    { createdByRole: 'customer' },
    { createdByRole: undefined },
    { createdByRole: 'csr' },
    { createdByRole: 'admin' },
    { createdByRole: 'csr', origin: 'customer' },
  ];

  it('dry run counts and writes nothing', async () => {
    const docs = seed();
    const r = await runOrderOriginMigration(fakeModel(docs), { apply: false });
    expect(r).toEqual({ customer: 2, staff: 2, applied: false });
    expect(docs.filter((d) => d.origin).length).toBe(1);
  });

  it('apply maps customer → customer, others → staff, keeps existing origin', async () => {
    const docs = seed();
    const r = await runOrderOriginMigration(fakeModel(docs), { apply: true });
    expect(r).toEqual({ customer: 2, staff: 2, applied: true });
    expect(docs.map((d) => d.origin)).toEqual([
      'customer',
      'customer',
      'staff',
      'staff',
      'customer',
    ]);
  });

  it('is idempotent', async () => {
    const docs = seed();
    const model = fakeModel(docs);
    await runOrderOriginMigration(model, { apply: true });
    const again = await runOrderOriginMigration(model, { apply: true });
    expect(again).toEqual({ customer: 0, staff: 0, applied: true });
  });
});
