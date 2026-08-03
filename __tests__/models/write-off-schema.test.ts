/**
 * @requirement REQ-098 AC1 — `'written-off'` is a valid `paymentStatus`
 * value on both Tab and Order, additive alongside the existing values;
 * no existing value or behaviour changes. Also covers the ADR-003
 * `writeOff` subdocument shape.
 *
 * Mirrors `__tests__/models/incident-event-model.test.ts`'s
 * `validateSync()`-only pattern — no live DB connection needed for
 * schema-shape assertions.
 */
import { describe, it, expect, afterAll } from 'vitest';
import mongoose, { Types } from 'mongoose';

async function loadTabModel() {
  const mod = await import('@/models/tab-model');
  return mod.default;
}

async function loadOrderModel() {
  const mod = await import('@/models/order-model');
  return mod.default;
}

describe('REQ-098 AC1 — Tab.paymentStatus + writeOff subdocument', () => {
  it('accepts every existing paymentStatus value unchanged', async () => {
    const Tab = await loadTabModel();
    for (const value of ['pending', 'paid', 'failed']) {
      const doc = new Tab({
        tabNumber: 'TAB-1',
        tableNumber: 'A1',
        paymentStatus: value,
      });
      expect(doc.validateSync()?.errors.paymentStatus).toBeUndefined();
    }
  });

  it('accepts the new written-off value', async () => {
    const Tab = await loadTabModel();
    const doc = new Tab({
      tabNumber: 'TAB-1',
      tableNumber: 'A1',
      paymentStatus: 'written-off',
    });
    expect(doc.validateSync()?.errors.paymentStatus).toBeUndefined();
    expect(doc.paymentStatus).toBe('written-off');
  });

  it('rejects an unknown paymentStatus value', async () => {
    const Tab = await loadTabModel();
    const doc = new Tab({
      tabNumber: 'TAB-1',
      tableNumber: 'A1',
      paymentStatus: 'bogus-status',
    });
    expect(doc.validateSync()?.errors.paymentStatus).toBeDefined();
  });

  it('accepts a fully-populated writeOff subdocument', async () => {
    const Tab = await loadTabModel();
    const doc = new Tab({
      tabNumber: 'TAB-1',
      tableNumber: 'A1',
      paymentStatus: 'written-off',
      writeOff: {
        amount: 12000,
        reason: 'Dormant since Dec 2025.',
        writtenOffBy: new Types.ObjectId(),
        writtenOffAt: new Date(),
      },
    });
    expect(doc.validateSync()).toBeUndefined();
    expect(doc.writeOff?.amount).toBe(12000);
    expect(doc.writeOff?.reason).toBe('Dormant since Dec 2025.');
  });

  it('leaves writeOff fields unset by default (no migration needed for existing docs)', async () => {
    const Tab = await loadTabModel();
    const doc = new Tab({ tabNumber: 'TAB-1', tableNumber: 'A1' });
    expect(doc.validateSync()).toBeUndefined();
    expect(doc.writeOff?.reason).toBeUndefined();
    expect(doc.writeOff?.writtenOffAt).toBeUndefined();
  });
});

describe('REQ-098 AC1 — Order.paymentStatus + writeOff subdocument', () => {
  it('accepts every existing paymentStatus value unchanged', async () => {
    const Order = await loadOrderModel();
    for (const value of [
      'pending',
      'paid',
      'failed',
      'cancelled',
      'refunded',
    ]) {
      const doc = new Order({ paymentStatus: value });
      expect(doc.validateSync()?.errors.paymentStatus).toBeUndefined();
    }
  });

  it('accepts the new written-off value', async () => {
    const Order = await loadOrderModel();
    const doc = new Order({ paymentStatus: 'written-off' });
    expect(doc.validateSync()?.errors.paymentStatus).toBeUndefined();
    expect(doc.paymentStatus).toBe('written-off');
  });

  it('rejects an unknown paymentStatus value', async () => {
    const Order = await loadOrderModel();
    const doc = new Order({ paymentStatus: 'bogus-status' });
    expect(doc.validateSync()?.errors.paymentStatus).toBeDefined();
  });

  it('accepts a fully-populated writeOff subdocument', async () => {
    const Order = await loadOrderModel();
    const doc = new Order({
      paymentStatus: 'written-off',
      writeOff: {
        amount: 5000,
        reason: 'Part of a dormant tab write-off.',
        writtenOffBy: new Types.ObjectId(),
        writtenOffAt: new Date(),
      },
    });
    expect(doc.writeOff?.amount).toBe(5000);
  });
});

afterAll(async () => {
  await mongoose.disconnect().catch(() => undefined);
});
