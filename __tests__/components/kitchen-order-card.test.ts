/**
 * @requirement REQ-KITCHEN-010, REQ-KITCHEN-011 (REQ-124 AC4, AC5)
 * Renders the kitchen card to static markup (client hooks mocked).
 */
import { describe, it, expect, vi } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: vi.fn() }) }));
vi.mock('@/app/actions/admin/order-management-actions', () => ({
  updateOrderStatusAction: vi.fn(),
}));

import { KitchenOrderCard } from '@/components/features/kitchen/kitchen-order-card';
import { toKitchenOrder } from '@/lib/serving-label';

const base = {
  _id: 'o1',
  orderNumber: 'WG1',
  orderType: 'dine-in',
  status: 'preparing',
  paymentStatus: 'paid',
  createdAt: new Date().toISOString(),
  items: [{ name: 'Goat Stew', quantity: 1, customizations: [] }],
};
const render = (order: Record<string, unknown>) =>
  renderToStaticMarkup(createElement(KitchenOrderCard, { order: toKitchenOrder(order as never) }));

describe('KitchenOrderCard serving check', () => {
  it('[US-B1.5] header reads "Table 7 · Ada" and shows no phone, email or full name', () => {
    const html = render({
      ...base,
      tableNumber: '7',
      servingName: 'Ada Obi',
      customer: { name: 'Ada Obi', email: 'ada@example.com', phone: '2348012345678' },
    });
    expect(html).toContain('data-testid="serving-header"');
    expect(html).toContain('Table 7 · Ada');
    expect(html).not.toMatch(/Obi|ada@example\.com|2348012345678/);
  });

  it('[US-B1.6] a tab order reads "Table 3 · Tunde"; with no name, "No name"', () => {
    expect(render({ ...base, tableNumber: '3', servingName: 'Tunde', customer: { name: 'Guest' } })).toContain(
      'Table 3 · Tunde'
    );
    expect(render({ ...base, tableNumber: '3', customer: { name: 'Guest' } })).toContain('Table 3 · No name');
  });

  it('[US-B1.7] a delivery order shows the address and instructions', () => {
    const html = render({
      ...base,
      orderType: 'delivery',
      servingName: 'Ada Obi',
      customer: { name: 'Ada Obi' },
      deliveryAddress: { street: '12 Bode St', city: 'Ikeja', state: 'Lagos', country: 'NG' },
      deliveryInstructions: 'Call at the gate',
    });
    expect(html).toContain('Delivery · Ada');
    expect(html).toContain('data-testid="kitchen-delivery-details"');
    expect(html).toContain('12 Bode St, Ikeja, Lagos');
    expect(html).toContain('Call at the gate');
  });

  it('a non-delivery order shows no delivery block', () => {
    expect(render({ ...base, customer: { name: 'Ada' } })).not.toContain('kitchen-delivery-details');
  });
});
