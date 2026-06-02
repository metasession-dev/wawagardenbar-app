/**
 * @requirement REQ-062 — Customer trust polish (P1 #6 receipt itemization)
 *
 * `sendOrderConfirmationEmail` extended with subtotal/tax/serviceFee/
 * deliveryFee/tip/pointsEarned/paymentMethod. The HTML body must render
 * the new fields between items and total.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockTransporterSend = vi.fn();
vi.mock('nodemailer', () => ({
  default: {
    createTransport: () => ({ sendMail: mockTransporterSend }),
  },
}));

beforeEach(() => {
  mockTransporterSend.mockReset().mockResolvedValue({ messageId: 'm1' });
  // Provide minimal SMTP env so the email module's transport doesn't bail.
  process.env.SMTP_HOST = 'smtp.test';
  process.env.SMTP_PORT = '587';
  process.env.SMTP_USER = 'user';
  process.env.SMTP_PASS = 'pass';
});

describe('REQ-062 sendOrderConfirmationEmail — itemization (P1 #6)', () => {
  it('AC2 — HTML body contains the new breakdown fields when passed', async () => {
    const { sendOrderConfirmationEmail } = await import('@/lib/email');
    await sendOrderConfirmationEmail('cust@example.com', {
      orderNumber: 'WGB-042',
      orderType: 'pickup',
      items: [{ name: 'Jollof Rice', quantity: 2, price: 4000 }],
      subtotal: 4000,
      tax: 300,
      serviceFee: 80,
      deliveryFee: 0,
      tip: 200,
      pointsEarned: 40,
      paymentMethod: 'card',
      total: 4580,
      estimatedWaitTime: 30,
    });
    expect(mockTransporterSend).toHaveBeenCalledTimes(1);
    const sentArg = mockTransporterSend.mock.calls[0][0] as { html: string };
    const html = sentArg.html;
    // Each new field must surface in the rendered HTML body.
    expect(html).toContain('Subtotal');
    expect(html).toContain('Service Fee');
    expect(html).toContain('Tax');
    expect(html).toContain('Tip');
    expect(html).toContain('Points Earned');
    expect(html).toContain('Payment Method');
    expect(html).toContain('card');
  });
});
