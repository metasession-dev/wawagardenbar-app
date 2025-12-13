import type { Page } from '@playwright/test';
import { test, expect } from '../../fixtures/auth.fixture';
import { CartHelper } from '../../helpers/cart.helper';

async function completeCustomerInfo(page: Page) {
  await page.getByLabel('Full Name').fill('Delivery Test User');
  await page.getByLabel('Email Address').fill('delivery@example.com');
  await page.getByLabel('Phone Number').fill('+234 822 000 0000');
  await page.getByRole('button', { name: 'Next' }).click();
}

test.describe('Delivery Orders', () => {
  test('ORDER-202: Customer can checkout for delivery and reach payment screen', async ({ customerPage }) => {
    const cart = new CartHelper(customerPage);

    await customerPage.goto('/menu');
    await cart.clearCart();
    await cart.addItemToCart('chicken-wings');
    await cart.addItemToCart('chapman');
    await cart.proceedToCheckout();

    await completeCustomerInfo(customerPage);

    await customerPage.getByLabel('Delivery').click();
    await customerPage.getByPlaceholder('e.g., 123 Main Street').fill('42 Admiralty Way');
    await customerPage.getByPlaceholder('e.g., Apt 4B, Suite 200, Floor 3').fill('Suite 9B');
    await customerPage.getByPlaceholder('e.g., Lagos').first().fill('Lagos');
    await customerPage.getByPlaceholder('e.g., Lagos').last().fill('Lagos');
    await customerPage.getByPlaceholder('e.g., 100001').fill('100001');
    await customerPage.getByPlaceholder('e.g., Nigeria').fill('Nigeria');
    await customerPage.getByPlaceholder('e.g., Near City Mall').fill('Near Mega Mall');
    await customerPage.getByPlaceholder('Any special instructions for the delivery driver...').fill('Call when outside');

    await customerPage.getByRole('button', { name: 'Next' }).click();
    await customerPage.getByRole('button', { name: 'Next' }).click();

    await customerPage.getByLabel('Card Payment').click();
    await customerPage.getByRole('button', { name: /Proceed to Payment/i }).click();

    await customerPage.waitForURL('**/payments/mock**');
    const url = customerPage.url();
    expect(url).toContain('/payments/mock');
    expect(new URL(url).searchParams.get('reference')).not.toBeNull();
  });
});
