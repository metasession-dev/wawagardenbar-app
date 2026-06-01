/**
 * @requirement REQ-055 — NotificationLog persistent audit log
 *
 * Schema-level coverage of the new NotificationLog model. The model
 * persists every outbound transactional touch — both the original send
 * attempt and any subsequent delivery-status updates from Meta's
 * webhook. Forensic surface for "why didn't I get the message?" + the
 * data backing SMS-fallback cost sizing.
 */
import { describe, it, expect } from 'vitest';
import mongoose from 'mongoose';

async function loadModel() {
  const mod = await import('@/models/notification-log-model');
  return mod.default;
}

describe('REQ-055 NotificationLog model', () => {
  it('AC1 — status defaults to "queued"', async () => {
    const Model = await loadModel();
    const doc = new Model({
      templateKey: 'order_confirmation',
      userId: '65a1b2c3d4e5f6a7b8c9d0aa',
      channel: 'whatsapp',
      success: true,
    });
    expect(doc.status).toBe('queued');
  });

  it('AC1 — attemptedAt defaults to now-ish', async () => {
    const Model = await loadModel();
    const before = Date.now();
    const doc = new Model({
      templateKey: 'order_confirmation',
      userId: '65a1b2c3d4e5f6a7b8c9d0aa',
      channel: 'whatsapp',
      success: true,
    });
    const after = Date.now();
    expect(doc.attemptedAt.getTime()).toBeGreaterThanOrEqual(before);
    expect(doc.attemptedAt.getTime()).toBeLessThanOrEqual(after + 100);
  });

  it('AC1 — required fields throw validation error if missing', async () => {
    const Model = await loadModel();
    const doc = new Model({});
    const err = doc.validateSync();
    expect(err).toBeDefined();
    expect(err?.errors).toHaveProperty('templateKey');
    expect(err?.errors).toHaveProperty('channel');
    expect(err?.errors).toHaveProperty('success');
  });

  it('AC1 — status enum constraint rejects invalid values', async () => {
    const Model = await loadModel();
    const doc = new Model({
      templateKey: 'order_confirmation',
      userId: '65a1b2c3d4e5f6a7b8c9d0aa',
      channel: 'whatsapp',
      success: true,
      status: 'in_progress', // not in the enum
    });
    const err = doc.validateSync();
    expect(err).toBeDefined();
    expect(err?.errors).toHaveProperty('status');
  });

  it('AC1 — channel enum constraint rejects invalid values', async () => {
    const Model = await loadModel();
    const doc = new Model({
      templateKey: 'order_confirmation',
      userId: '65a1b2c3d4e5f6a7b8c9d0aa',
      channel: 'fax', // not in the enum
      success: true,
    });
    const err = doc.validateSync();
    expect(err).toBeDefined();
    expect(err?.errors).toHaveProperty('channel');
  });

  it('AC1 — userId: null accepted (guest path)', async () => {
    const Model = await loadModel();
    const doc = new Model({
      templateKey: 'order_confirmation',
      userId: null,
      channel: 'email',
      success: true,
    });
    const err = doc.validateSync();
    expect(err).toBeUndefined();
    expect(doc.userId).toBeNull();
  });

  afterAll(async () => {
    await mongoose.disconnect().catch(() => undefined);
  });
});

import { afterAll } from 'vitest';
