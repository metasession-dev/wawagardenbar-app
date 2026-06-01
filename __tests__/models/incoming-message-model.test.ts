/**
 * @requirement REQ-056 — WhatsApp inbound-message router
 *
 * Schema-level coverage of the new IncomingMessage model. Audit-trail
 * companion to REQ-055's NotificationLog, on the inbound direction.
 */
import { describe, it, expect, afterAll } from 'vitest';
import mongoose from 'mongoose';

async function loadModel() {
  const mod = await import('@/models/incoming-message-model');
  return mod.default;
}

describe('REQ-056 IncomingMessage model', () => {
  it('AC1 — receivedAt defaults to now-ish', async () => {
    const Model = await loadModel();
    const before = Date.now();
    const doc = new Model({
      from: '+2348012345678',
      messageType: 'text',
      messageId: 'wamid.in-001',
      classifiedState: 'new',
      classifiedIntent: 'support_text',
      actionTaken: 'sent_welcome_new_user',
    });
    const after = Date.now();
    expect(doc.receivedAt.getTime()).toBeGreaterThanOrEqual(before);
    expect(doc.receivedAt.getTime()).toBeLessThanOrEqual(after + 100);
  });

  it('AC1 — required fields throw validation error if missing', async () => {
    const Model = await loadModel();
    const doc = new Model({});
    const err = doc.validateSync();
    expect(err).toBeDefined();
    expect(err?.errors).toHaveProperty('from');
    expect(err?.errors).toHaveProperty('messageType');
    expect(err?.errors).toHaveProperty('messageId');
    expect(err?.errors).toHaveProperty('classifiedState');
    expect(err?.errors).toHaveProperty('classifiedIntent');
    expect(err?.errors).toHaveProperty('actionTaken');
  });

  it('AC1 — classifiedState enum rejects unknown values', async () => {
    const Model = await loadModel();
    const doc = new Model({
      from: '+2348012345678',
      messageType: 'text',
      messageId: 'wamid.in-002',
      classifiedState: 'ghost', // not in the enum
      classifiedIntent: 'support_text',
      actionTaken: 'noop',
    });
    const err = doc.validateSync();
    expect(err).toBeDefined();
    expect(err?.errors).toHaveProperty('classifiedState');
  });

  it('AC1 — classifiedIntent enum rejects unknown values', async () => {
    const Model = await loadModel();
    const doc = new Model({
      from: '+2348012345678',
      messageType: 'text',
      messageId: 'wamid.in-003',
      classifiedState: 'new',
      classifiedIntent: 'shouting', // not in the enum
      actionTaken: 'noop',
    });
    const err = doc.validateSync();
    expect(err).toBeDefined();
    expect(err?.errors).toHaveProperty('classifiedIntent');
  });

  it('AC1 — userId: null accepted (new customer, before auto-create)', async () => {
    const Model = await loadModel();
    const doc = new Model({
      from: '+2348012345678',
      messageType: 'text',
      messageId: 'wamid.in-004',
      classifiedState: 'new',
      classifiedIntent: 'support_text',
      actionTaken: 'sent_welcome_new_user',
      userId: null,
    });
    const err = doc.validateSync();
    expect(err).toBeUndefined();
    expect(doc.userId).toBeNull();
  });

  afterAll(async () => {
    await mongoose.disconnect().catch(() => undefined);
  });
});
