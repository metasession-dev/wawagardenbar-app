import { Page, Locator } from '@playwright/test';

export class CartHelper {
  private readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  private get cartButton(): Locator {
    return this.page.getByTestId('cart-button');
  }

  private get cartCount(): Locator {
    return this.page.getByTestId('cart-count');
  }

  async openCart(): Promise<void> {
    await this.cartButton.click();
  }

  async getCartItemCount(): Promise<number> {
    if (!(await this.cartCount.isVisible())) {
      return 0;
    }
    const text = await this.cartCount.textContent();
    return parseInt(text || '0', 10);
  }

  async addItemToCart(slug: string): Promise<void> {
    // Wait for any existing modal to close first
    await this.page.waitForTimeout(300);
    
    // Click menu item to open detail modal
    await this.page.getByTestId(`menu-item-${slug}`).click();
    
    // Wait for modal to open
    const dialog = this.page.locator('[role="dialog"]');
    await dialog.waitFor({ state: 'visible', timeout: 5000 });
    
    // Click Add to Cart button
    await this.page.getByRole('button', { name: /add to cart/i }).click();
    
    // Wait for modal to close completely
    await dialog.waitFor({ state: 'hidden', timeout: 5000 });
    
    // Additional wait for cart state to update
    await this.page.waitForTimeout(300);
  }

  async clearCart(): Promise<void> {
    const currentCount = await this.getCartItemCount();
    if (currentCount === 0) {
      return; // Cart is already empty
    }
    
    await this.openCart();
    
    // Remove all items individually since there's no "Clear Cart" button
    const removeButtons = this.page.getByRole('button', { name: /remove/i });
    const count = await removeButtons.count();
    
    for (let i = 0; i < count; i++) {
      // Always click the first remove button since the list updates after each removal
      await removeButtons.first().click();
      await this.page.waitForTimeout(200); // Wait for item to be removed
    }
    
    // Close the cart sheet after clearing
    const continueShoppingButton = this.page.getByRole('button', { name: /continue shopping/i });
    if (await continueShoppingButton.isVisible()) {
      await continueShoppingButton.click();
    } else {
      // If cart is empty, close via Escape key
      await this.page.keyboard.press('Escape');
    }
    
    await this.page.waitForTimeout(300);
  }

  async proceedToCheckout(): Promise<void> {
    await this.openCart();
    await this.page.getByRole('button', { name: /checkout/i }).click();
  }
}
