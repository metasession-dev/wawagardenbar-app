import { Page, expect } from '@playwright/test';

export class TabHelper {
  constructor(private readonly page: Page) {}

  async goToTabsDashboard(): Promise<void> {
    await this.page.goto('/dashboard/orders/tabs');
  }

  async waitForTabsReady(): Promise<void> {
    await this.page.waitForSelector('[data-testid="tabs-dashboard"]', { timeout: 10000 });
  }

  async selectStatusFilter(status: 'open' | 'settling' | 'closed'): Promise<void> {
    const checkbox = this.page.getByRole('checkbox', { name: new RegExp(status, 'i') });
    await checkbox.click();
  }

  async clearAllFilters(): Promise<void> {
    const clearButton = this.page.getByRole('button', { name: /clear all/i });
    if (await clearButton.isVisible()) {
      await clearButton.click();
    }
  }

  async searchTabs(query: string): Promise<void> {
    const searchInput = this.page.getByPlaceholder(/search tabs/i);
    await searchInput.fill(query);
    await this.page.waitForTimeout(500); // Debounce
  }

  async expectTabVisible(tabNumber: string): Promise<void> {
    await expect(this.page.locator(`[data-testid="tab-card"][data-tab-number="${tabNumber}"]`)).toBeVisible();
  }

  async expectTabHidden(tabNumber: string): Promise<void> {
    await expect(this.page.locator(`[data-testid="tab-card"][data-tab-number="${tabNumber}"]`)).toHaveCount(0);
  }

  async expectTabStatus(tabNumber: string, status: string): Promise<void> {
    const tabCard = this.page.locator(`[data-testid="tab-card"][data-tab-number="${tabNumber}"]`);
    await expect(tabCard.getByTestId('tab-status-badge')).toHaveText(
      new RegExp(status, 'i')
    );
  }

  async openTabDetails(tabNumber: string): Promise<void> {
    const tabCard = this.page.locator(`[data-testid="tab-card"][data-tab-number="${tabNumber}"]`);
    await tabCard.getByRole('button', { name: /view details/i }).click();
  }

  async closeTab(tabNumber: string): Promise<void> {
    await this.openTabDetails(tabNumber);
    await this.page.getByRole('button', { name: /close tab/i }).click();
    await this.page.getByRole('button', { name: /confirm/i }).click();
  }

  async addOrderToTab(tabNumber: string): Promise<void> {
    await this.openTabDetails(tabNumber);
    await this.page.getByRole('button', { name: /add order/i }).click();
  }

  async expectTabCount(count: number): Promise<void> {
    await expect(this.page.getByTestId('tab-card')).toHaveCount(count);
  }

  async getTabTotal(tabNumber: string): Promise<number> {
    const tabCard = this.page.locator(`[data-testid="tab-card"][data-tab-number="${tabNumber}"]`);
    const totalText = await tabCard.getByTestId('tab-total').textContent();
    return parseFloat((totalText || '0').replace(/[^0-9.]/g, ''));
  }
}
