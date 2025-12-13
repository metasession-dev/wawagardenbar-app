import { test, expect } from '../../fixtures/auth.fixture';
import { TabHelper } from '../../helpers/tab.helper';

const OPEN_TAB = 'TAB-2101';
const SETTLING_TAB = 'TAB-2102';
const CLOSED_TAB = 'TAB-2103';

test.describe('Tab Management', () => {
  test('TAB-001: Filter tabs by status', async ({ adminPage }) => {
    const helper = new TabHelper(adminPage);
    await helper.goToTabsDashboard();
    await helper.waitForTabsReady();

    // Clear default filters
    await helper.clearAllFilters();

    // Filter by open status
    await helper.selectStatusFilter('open');
    await helper.expectTabVisible(OPEN_TAB);
    await helper.expectTabHidden(CLOSED_TAB);

    // Filter by closed status
    await helper.selectStatusFilter('open'); // Uncheck open
    await helper.selectStatusFilter('closed');
    await helper.expectTabVisible(CLOSED_TAB);
    await helper.expectTabHidden(OPEN_TAB);
  });

  test('TAB-002: Search tabs by table number or customer', async ({ adminPage }) => {
    const helper = new TabHelper(adminPage);
    await helper.goToTabsDashboard();
    await helper.waitForTabsReady();

    await helper.clearAllFilters();
    await helper.selectStatusFilter('open');
    await helper.selectStatusFilter('settling');
    await helper.selectStatusFilter('closed');

    // Search by tab number
    await helper.searchTabs(OPEN_TAB);
    await helper.expectTabVisible(OPEN_TAB);
    await helper.expectTabHidden(SETTLING_TAB);

    // Clear search
    await helper.searchTabs('');
    await adminPage.waitForTimeout(500);
    const tabCount = await adminPage.getByTestId('tab-card').count();
    expect(tabCount).toBeGreaterThan(1);
  });

  test('TAB-003: View tab details and order history', async ({ adminPage }) => {
    const helper = new TabHelper(adminPage);
    await helper.goToTabsDashboard();
    await helper.waitForTabsReady();

    await helper.clearAllFilters();
    await helper.selectStatusFilter('open');

    // Open tab details
    await helper.openTabDetails(OPEN_TAB);

    // Verify tab details page loaded
    await expect(adminPage.getByTestId('tab-details')).toBeVisible();
    await expect(adminPage.getByText(OPEN_TAB)).toBeVisible();

    // Verify orders list is visible
    await expect(adminPage.getByTestId('tab-orders-list')).toBeVisible();
  });

  test('TAB-004: Close an open tab', async ({ adminPage }) => {
    const helper = new TabHelper(adminPage);
    await helper.goToTabsDashboard();
    await helper.waitForTabsReady();

    await helper.clearAllFilters();
    await helper.selectStatusFilter('open');

    // Get initial tab count
    const initialCount = await adminPage.getByTestId('tab-card').count();

    // Close a tab
    await helper.closeTab(OPEN_TAB);

    // Wait for tab to be closed
    await adminPage.waitForTimeout(1000);

    // Verify tab is no longer in open tabs
    await helper.goToTabsDashboard();
    await helper.clearAllFilters();
    await helper.selectStatusFilter('open');
    const finalCount = await adminPage.getByTestId('tab-card').count();
    expect(finalCount).toBeLessThan(initialCount);
  });

  test('TAB-005: View tab total and payment status', async ({ adminPage }) => {
    const helper = new TabHelper(adminPage);
    await helper.goToTabsDashboard();
    await helper.waitForTabsReady();

    await helper.clearAllFilters();
    await helper.selectStatusFilter('open');
    await helper.selectStatusFilter('settling');

    // Check tab has a total amount
    const total = await helper.getTabTotal(OPEN_TAB);
    expect(total).toBeGreaterThan(0);

    // Verify payment status badge is visible
    const tabCard = adminPage.getByTestId(`tab-card-${OPEN_TAB}`);
    await expect(tabCard.getByTestId('tab-payment-status')).toBeVisible();
  });
});
