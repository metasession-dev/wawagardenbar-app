import { expect, Locator, Page } from '@playwright/test';

type QueueTab = 'all' | 'active' | 'pending' | 'confirmed' | 'preparing' | 'ready' | 'completed';
type QuickAction = 'startPreparing' | 'markReady' | 'complete';

const QUICK_ACTION_LABELS: Record<QuickAction, RegExp> = {
  startPreparing: /start preparing/i,
  markReady: /mark ready/i,
  complete: /complete/i,
};

export class KitchenQueueHelper {
  private readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  private get queueCard(): Locator {
    return this.page.getByTestId('order-queue');
  }

  private get statsCards(): Locator {
    return this.page.locator('[data-testid="order-stats-card"]');
  }

  private get searchInput(): Locator {
    return this.page.getByPlaceholder('Search orders...');
  }

  private orderCard(orderNumber: string): Locator {
    return this.page.locator(`[data-testid="order-card"][data-order-number="${orderNumber}"]`);
  }

  async goToOrdersDashboard(): Promise<void> {
    await this.page.goto('/dashboard/orders');
  }

  async waitForQueueReady(): Promise<void> {
    await expect(this.queueCard).toBeVisible();
    await expect(this.statsCards.first()).toBeVisible();
  }

  async selectTab(tab: QueueTab): Promise<void> {
    const trigger = this.page.getByRole('tab', { name: new RegExp(tab, 'i') });
    await trigger.click();
  }

  async searchOrders(query: string): Promise<void> {
    await this.searchInput.fill(query);
    await this.page.waitForTimeout(400);
  }

  async clearSearch(): Promise<void> {
    await this.searchInput.fill('');
    await this.page.waitForTimeout(200);
  }

  async expectOrderVisible(orderNumber: string): Promise<void> {
    await expect(this.orderCard(orderNumber)).toBeVisible();
  }

  async expectOrderHidden(orderNumber: string): Promise<void> {
    await expect(this.orderCard(orderNumber)).toHaveCount(0);
  }

  async expectOrderStatus(orderNumber: string, status: string): Promise<void> {
    await expect(this.orderCard(orderNumber).getByTestId('order-status-badge')).toHaveText(
      new RegExp(status, 'i'),
    );
  }

  async getOrderStatus(orderNumber: string): Promise<string> {
    const badge = this.orderCard(orderNumber).getByTestId('order-status-badge');
    await badge.waitFor();
    const text = await badge.textContent();
    return (text || '').trim().toLowerCase();
  }

  async runQuickAction(orderNumber: string, action: QuickAction): Promise<void> {
    await this.orderCard(orderNumber).getByRole('button', { name: QUICK_ACTION_LABELS[action] }).click();
  }

  async expectOrderCount(count: number): Promise<void> {
    await expect(this.page.getByTestId('order-card')).toHaveCount(count);
  }
}
