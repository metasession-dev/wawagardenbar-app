/**
 * @requirement REQ-066 — IncidentEventModel persistent silent-fail audit
 *
 * AC3: persists `kind`, `entityId`, `summary`, optional `errorDetails`,
 * timestamps. Indexes on `(kind, createdAt: -1)` and `(entityId, createdAt: -1)`.
 */
import { describe, it, expect, afterAll } from 'vitest';
import mongoose from 'mongoose';

async function loadModel() {
  const mod = await import('@/models/incident-event-model');
  return mod.default;
}

describe('REQ-066 IncidentEventModel — schema', () => {
  it('AC3 — required fields enforced (kind, entityId, summary)', async () => {
    const IncidentEvent = await loadModel();
    const doc = new IncidentEvent({});
    const err = doc.validateSync();
    expect(err).toBeDefined();
    expect(err?.errors.kind).toBeDefined();
    expect(err?.errors.entityId).toBeDefined();
    expect(err?.errors.summary).toBeDefined();
  });

  it('AC3 — valid construction passes validateSync', async () => {
    const IncidentEvent = await loadModel();
    const doc = new IncidentEvent({
      kind: 'inventory_deduction_failed',
      entityId: 'order-1',
      summary: 'deductStockForOrder threw',
      errorDetails: { stack: 'Error: ...' },
    });
    expect(doc.validateSync()).toBeUndefined();
    expect(doc.kind).toBe('inventory_deduction_failed');
    expect(doc.entityId).toBe('order-1');
  });

  it('AC3 — rejects unknown kind values', async () => {
    const IncidentEvent = await loadModel();
    const doc = new IncidentEvent({
      kind: 'unknown_bogus_kind',
      entityId: 'order-1',
      summary: 's',
    });
    const err = doc.validateSync();
    expect(err).toBeDefined();
    expect(err?.errors.kind).toBeDefined();
  });

  afterAll(async () => {
    await mongoose.disconnect().catch(() => undefined);
  });
});
