import { test, expect } from '../../fixtures/auth.fixture';
import { KitchenQueueHelper } from '../../helpers/kitchen-queue.helper';

const PENDING_ORDER = 'ORD-PENDING-2001';
const PREPARING_ORDER = 'ORD-PREPARING-2003';
const READY_ORDER = 'ORD-READY-2004';
const COMPLETED_ORDER = 'ORD-COMPLETED-2005';
const WORKFLOW_ORDER = 'ORD-PENDING-2100';

test.describe('Kitchen Order Queue', () => {
  test('KITCHEN-001: Filters show relevant orders per status', async ({ adminPage }) => {
    const helper = new KitchenQueueHelper(adminPage);
    await helper.goToOrdersDashboard();
    await helper.waitForQueueReady();

    await helper.selectTab('pending');
    await helper.expectOrderVisible(PENDING_ORDER);
    await helper.expectOrderHidden(READY_ORDER);

    await helper.selectTab('preparing');
    await helper.expectOrderVisible(PREPARING_ORDER);
    await helper.expectOrderHidden(PENDING_ORDER);

    await helper.selectTab('all');
  });

  test('KITCHEN-002: Search narrows results by order number', async ({ adminPage }) => {
    const helper = new KitchenQueueHelper(adminPage);
    await helper.goToOrdersDashboard();
    await helper.waitForQueueReady();

    await helper.selectTab('all');
    await helper.searchOrders(READY_ORDER);
    await helper.expectOrderVisible(READY_ORDER);
    await helper.expectOrderHidden(PENDING_ORDER);

    await helper.clearSearch();
    await adminPage.waitForTimeout(500);
    const orderCount = await adminPage.getByTestId('order-card').count();
    expect(orderCount).toBeGreaterThan(1);
  });

  test('KITCHEN-003: Pending order can be progressed to preparing', async ({ adminPage }) => {
    const helper = new KitchenQueueHelper(adminPage);
    await helper.goToOrdersDashboard();
    await helper.waitForQueueReady();

    await helper.selectTab('all');
    await helper.searchOrders(WORKFLOW_ORDER);
    await helper.expectOrderStatus(WORKFLOW_ORDER, 'pending');

    await helper.runQuickAction(WORKFLOW_ORDER, 'startPreparing');

    await expect
      .poll(async () => helper.getOrderStatus(WORKFLOW_ORDER), { timeout: 5000 })
      .toBe('preparing');
  });

  test('KITCHEN-004: Bulk status update for multiple orders', async ({ adminPage }) => {
    const helper = new KitchenQueueHelper(adminPage);
    await helper.goToOrdersDashboard();
    await helper.waitForQueueReady();

    await helper.selectTab('pending');
    
    // Select multiple orders
    const firstOrderCheckbox = adminPage.getByTestId(`order-checkbox-${PENDING_ORDER}`);
    await firstOrderCheckbox.check();
    
    // Verify bulk actions are available
    const bulkActionsButton = adminPage.getByRole('button', { name: /bulk actions/i });
    await expect(bulkActionsButton).toBeVisible();
    
    // Apply bulk action
    await bulkActionsButton.click();
    await adminPage.getByRole('menuitem', { name: /start preparing/i }).click();
    
    // Confirm action
    const confirmButton = adminPage.getByRole('button', { name: /confirm/i });
    if (await confirmButton.isVisible()) {
      await confirmButton.click();
    }
    
    // Wait for status update
    await adminPage.waitForTimeout(1000);
    
    // Verify order moved to preparing tab
    await helper.selectTab('preparing');
    await helper.expectOrderVisible(PENDING_ORDER);
  });

  test('KITCHEN-005: Cancel order with reason', async ({ adminPage }) => {
    const helper = new KitchenQueueHelper(adminPage);
    await helper.goToOrdersDashboard();
    await helper.waitForQueueReady();

    await helper.selectTab('all');
    await helper.searchOrders(READY_ORDER);
    await helper.expectOrderVisible(READY_ORDER);

    // Open order actions menu
    const orderCard = adminPage.locator(`[data-testid="order-card"][data-order-number="${READY_ORDER}"]`);
    const actionsButton = orderCard.getByRole('button', { name: /actions/i }).or(orderCard.getByRole('button', { name: /more/i }));
    await actionsButton.click();

    // Click cancel option
    await adminPage.getByRole('menuitem', { name: /cancel/i }).click();

    // Fill cancellation reason
    const reasonInput = adminPage.getByPlaceholder(/reason for cancellation/i);
    await reasonInput.fill('Customer requested cancellation');

    // Confirm cancellation
    await adminPage.getByRole('button', { name: /confirm cancel/i }).click();

    // Wait for cancellation to process
    await adminPage.waitForTimeout(1000);

    // Verify order is no longer in ready tab
    await helper.selectTab('ready');
    await helper.expectOrderHidden(READY_ORDER);
  });
});
