import type { Page } from '@playwright/test';
import { test, expect } from '../../fixtures/auth.fixture';
import { CartHelper } from '../../helpers/cart.helper';

function formatDateTimeForInput(minutesFromNow: number = 60): string {
  const date = new Date(Date.now() + minutesFromNow * 60 * 1000);
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  const hours = `${date.getHours()}`.padStart(2, '0');
  const minutes = `${date.getMinutes()}`.padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

async function completeCustomerInfo(page: Page) {
  await page.getByLabel('Full Name').fill('Pickup Test User');
  await page.getByLabel('Email Address').fill('pickup@example.com');
  await page.getByLabel('Phone Number').fill('+234 811 000 0000');
  await page.getByRole('button', { name: 'Next' }).click();
}

test.describe('Pickup Orders', () => {
  test('ORDER-201: Customer can complete pickup checkout and reach payment', async ({ customerPage }) => {
    const cart = new CartHelper(customerPage);

    await customerPage.goto('/menu');
    await cart.clearCart();
    await cart.addItemToCart('jollof-rice');
    await cart.addItemToCart('star-beer');
    await cart.proceedToCheckout();

    await completeCustomerInfo(customerPage);

    await customerPage.getByLabel('Pickup').click();
    const pickupTimeValue = formatDateTimeForInput(75);
    await customerPage.fill('input[type="datetime-local"]', pickupTimeValue);

    await customerPage.getByRole('button', { name: 'Next' }).click();
    await customerPage.getByRole('button', { name: 'Next' }).click();

    await customerPage.getByLabel('Card Payment').click();
    await customerPage.getByRole('button', { name: /Proceed to Payment/i }).click();

    await customerPage.waitForURL('**/payments/mock**');
    const currentUrl = customerPage.url();
    expect(currentUrl).toContain('/payments/mock');
    expect(new URL(currentUrl).searchParams.get('reference')).toBeTruthy();
  });
});
