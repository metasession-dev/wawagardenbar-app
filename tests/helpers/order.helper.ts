import { Page } from '@playwright/test';

type OrderType = 'dine-in' | 'pickup' | 'delivery';

interface DeliveryDetails {
  readonly address: string;
  readonly phone: string;
  readonly landmark?: string;
  readonly deliveryInstructions?: string;
}

export class OrderHelper {
  private readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async selectOrderType(type: OrderType): Promise<void> {
    await this.page.getByTestId(`order-type-${type}`).click();
  }

  async setDineInTable(tableNumber: string): Promise<void> {
    await this.page.getByLabel('Table Number').fill(tableNumber);
    await this.page.getByRole('button', { name: /continue to menu/i }).click();
  }

  async setPickupTime(optionLabel: string): Promise<void> {
    await this.page.getByLabel('Pickup Time').click();
    await this.page.getByRole('option', { name: optionLabel }).click();
    await this.page.getByRole('button', { name: /continue to menu/i }).click();
  }

  async setDeliveryDetails(details: DeliveryDetails): Promise<void> {
    await this.page.getByLabel('Street Address').fill(details.address);
    if (details.landmark) {
      await this.page.getByLabel('Nearby Landmark').fill(details.landmark);
    }
    await this.page.getByLabel('Phone Number').fill(details.phone);
    if (details.deliveryInstructions) {
      await this.page.getByLabel('Delivery Instructions').fill(details.deliveryInstructions);
    }
    await this.page.getByRole('button', { name: /continue to menu/i }).click();
  }

  async getOrderNumber(): Promise<string> {
    const orderNumberText = await this.page.getByTestId('order-number').textContent();
    return orderNumberText?.replace('Order #', '').trim() ?? '';
  }
}
