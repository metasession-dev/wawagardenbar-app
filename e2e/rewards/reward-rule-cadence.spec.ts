/**
 * @requirement REQ-046 - IG cadence schema + admin reward-rule form
 *
 * E2E coverage for the reward-rule form's "a blank optional field must not
 * block Save" behaviour. Authored via the e2e-test-engineer skill to automate
 * the UAT flow that surfaced defects D3-D5 (see compliance/evidence/REQ-046/
 * defects.md):
 *   AC1 (D3+D4+D5) - a Social rule with every optional field left blank
 *     (cadence Posts required / Window days, the untouched Period Type
 *     default, Max Redemptions) saves successfully.
 *   AC2 - a Social rule with a valid "3 posts in 7 days" cadence saves.
 *   AC3 (D3) - entering 0 in a cadence field is rejected with a toast that
 *     names the nested sub-field (socialConfig.postsRequired), and no rule
 *     is created.
 *   AC4 (D5) - a Transaction rule (no socialConfig) with Max Redemptions
 *     left blank still saves (the same optional-field fix on the other rule
 *     type).
 *
 * Authenticated as super-admin. Created rules carry a unique timestamped name
 * and are removed in afterEach so a shared UAT database is left clean; in CI
 * the mongo service is ephemeral so cleanup is a harmless no-op.
 */
import { test as base, expect, Page } from '@playwright/test';
import path from 'path';
import { evidenceShot } from '../helpers/evidence';

const SUPER_ADMIN_FILE = path.join(__dirname, '../../.auth/super-admin.json');
const REQ = 'REQ-046';
const RUN = Date.now();

async function isAuthenticated(page: Page): Promise<boolean> {
  try {
    await page.goto('/dashboard/orders');
    await page.waitForLoadState('networkidle');
    return page.url().includes('/dashboard');
  } catch {
    return false;
  }
}

const superAdminTest = base.extend({ storageState: SUPER_ADMIN_FILE });
superAdminTest.beforeEach(async ({ page }, testInfo) => {
  if (!(await isAuthenticated(page))) {
    testInfo.skip(true, 'Super-admin login failed - skipping');
  }
});

// Names created in a test are pushed here and removed by afterEach. afterEach
// runs (and clears the list) after every test, so within a worker the list
// only ever holds the current test's rule.
const created: string[] = [];

async function gotoNewRule(page: Page) {
  await page.goto('/dashboard/rewards/rules/new', { waitUntil: 'domcontentloaded' });
  await expect(
    page.getByRole('heading', { name: /Create Reward Rule/i })
  ).toBeVisible();
}

async function fillCommon(page: Page, name: string) {
  created.push(name);
  await page.locator('#name').fill(name);
  await page
    .locator('#description')
    .fill('E2E REQ-046 optional-field regression rule');
}

async function selectInstagram(page: Page) {
  await page.getByText('Instagram Engagement').click();
  await expect(page.getByText('Instagram Configuration')).toBeVisible();
}

async function fillRequiredSocial(page: Page) {
  // Dotted ids (socialConfig.*) must be matched by attribute, not as #id.class.
  await page.locator('[id="socialConfig.hashtag"]').fill('#wawae2e');
  await page.locator('[id="socialConfig.minViews"]').fill('0');
  await page.locator('[id="socialConfig.maxPostsPerPeriod"]').fill('5');
  await page.locator('[id="socialConfig.pointsAwarded"]').fill('100');
}

async function submit(page: Page) {
  await page.getByRole('button', { name: /Create Rule/i }).click();
}

// Redirect to the rules list is the form's success signal (the page only
// pushes there when createRewardRuleAction returns success).
async function expectSaved(page: Page) {
  await page.waitForURL(/\/dashboard\/rewards\/rules$/, { timeout: 15000 });
}

superAdminTest.describe('REQ-046: reward-rule form - blank optional fields save', () => {
  superAdminTest(
    'AC1: Social rule with all optional fields blank saves (D3+D4+D5)',
    async ({ page }) => {
      const name = `REQ-046 E2E blank-optionals ${RUN}`;
      await gotoNewRule(page);
      await selectInstagram(page);
      await fillCommon(page, name);
      await fillRequiredSocial(page);
      // Deliberately leave blank: cadence (postsRequired, windowDays) and Max
      // Redemptions; and do NOT open the Period Type select (accept "Weekly").
      await submit(page);
      await expectSaved(page);
      await evidenceShot(page, REQ, 'AC1-all-optional-blank-saved');
    }
  );

  superAdminTest(
    'AC2: Social rule with a valid 3-posts/7-days cadence saves',
    async ({ page }) => {
      const name = `REQ-046 E2E cadence-3-7 ${RUN}`;
      await gotoNewRule(page);
      await selectInstagram(page);
      await fillCommon(page, name);
      await fillRequiredSocial(page);
      await page.locator('[id="socialConfig.postsRequired"]').fill('3');
      await page.locator('[id="socialConfig.windowDays"]').fill('7');
      await submit(page);
      await expectSaved(page);
      await evidenceShot(page, REQ, 'AC2-valid-cadence-saved');
    }
  );

  superAdminTest(
    'AC3: 0 in a cadence field is rejected and names the nested field',
    async ({ page }) => {
      const name = `REQ-046 E2E invalid-cadence ${RUN}`;
      await gotoNewRule(page);
      await selectInstagram(page);
      await fillCommon(page, name);
      await fillRequiredSocial(page);
      await page.locator('[id="socialConfig.postsRequired"]').fill('0');
      await submit(page);
      await expect(
        page.getByText("Couldn't save: form has errors")
      ).toBeVisible({ timeout: 10000 });
      await expect(page.getByText(/socialConfig\.postsRequired/)).toBeVisible();
      await expect(page).toHaveURL(/\/rules\/new$/);
      await evidenceShot(page, REQ, 'AC3-invalid-cadence-nested-error');
      created.pop(); // nothing was created
    }
  );

  superAdminTest(
    'AC4: Transaction rule with Max Redemptions blank saves (D5 regression)',
    async ({ page }) => {
      const name = `REQ-046 E2E txn-unlimited ${RUN}`;
      await gotoNewRule(page);
      // Trigger Type defaults to Transaction Based; reward type/value/validity
      // carry working defaults. Leave Max Redemptions blank (the D5 path).
      await fillCommon(page, name);
      await submit(page);
      await expectSaved(page);
      await evidenceShot(page, REQ, 'AC4-transaction-unlimited-saved');
    }
  );

  superAdminTest.afterEach(async ({ page }) => {
    // Best-effort cleanup; never fails a test. CI's mongo service is
    // ephemeral, so a missed delete there is harmless.
    for (const name of created) {
      try {
        await page.goto('/dashboard/rewards/rules', {
          waitUntil: 'domcontentloaded',
          timeout: 8000,
        });
        const row = page.locator('tr', { hasText: name });
        if ((await row.count().catch(() => 0)) === 0) continue;
        await row.first().locator('button').last().click();
        await page.getByRole('menuitem', { name: /Delete/i }).click();
        await page.getByRole('button', { name: /Delete Rule/i }).click();
        await expect(page.getByText(name)).toHaveCount(0, { timeout: 8000 });
      } catch {
        /* best-effort */
      }
    }
    created.length = 0;
  });
});
