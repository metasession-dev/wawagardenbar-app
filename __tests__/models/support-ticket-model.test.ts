/**
 * @requirement REQ-064 — SupportTicket model defaults
 */
import { describe, it, expect, afterAll } from 'vitest';
import mongoose from 'mongoose';

async function loadModel() {
  const mod = await import('@/models/support-ticket-model');
  return mod.default;
}

describe('REQ-064 SupportTicket model — defaults', () => {
  it('AC1 — new doc defaults: status open, priority normal, replies []', async () => {
    const SupportTicket = await loadModel();
    const doc = new SupportTicket({
      ticketNumber: 'TKT-test-1',
      source: 'web',
      category: 'order-issue',
      subject: 'Subject',
      message: 'Body of the message',
    });
    expect(doc.status).toBe('open');
    expect(doc.priority).toBe('normal');
    expect(doc.replies).toHaveLength(0);
    expect(doc.userId).toBeNull();
    expect(doc.assignedTo).toBeNull();
  });

  it('AC1 — accepts whatsapp source + whatsapp-inbound category', async () => {
    const SupportTicket = await loadModel();
    const doc = new SupportTicket({
      ticketNumber: 'TKT-test-2',
      source: 'whatsapp',
      category: 'whatsapp-inbound',
      subject: 'Preview',
      message: 'Full body',
      customerPhone: '+2348011112222',
    });
    expect(doc.source).toBe('whatsapp');
    expect(doc.category).toBe('whatsapp-inbound');
    expect(doc.customerPhone).toBe('+2348011112222');
  });

  it('AC1 — invalid status enum is rejected at validation', async () => {
    const SupportTicket = await loadModel();
    const doc = new SupportTicket({
      ticketNumber: 'TKT-test-3',
      source: 'web',
      category: 'order-issue',
      subject: 'Subject',
      message: 'Body',
      status: 'bogus',
    });
    const err = doc.validateSync();
    expect(err).toBeDefined();
    expect(err?.errors.status).toBeDefined();
  });

  afterAll(async () => {
    await mongoose.disconnect().catch(() => undefined);
  });
});
