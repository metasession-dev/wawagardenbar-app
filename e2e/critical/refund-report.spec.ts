/**
 * @requirement REQ-128 — Refunds report (WA-11, #973, AC6)
 * @requirement SRS REQ-FIN-010
 *
 * Refund rows are seeded into a past date window nothing else writes to, so the
 * page's totals can be compared with exact sums: processed total, by type and
 * by approver. An admin may open the page; a csr is sent away.
 */
import { test, expect } from '@playwright/test';
import { ObjectId } from 'mongodb';
import { tagTest } from '../helpers/test-tags';
import { evidenceShot } from '../helpers/evidence';
import { withMongo } from '../helpers/db-assertions';
import {
  createStaff,
  deleteStaff,
  loginAsStaff,
  isRefused,
  type ThrowawayStaff,
} from '../helpers/staff-roles';

test.describe.configure({ mode: 'serial' });

test.describe('[REQ-128] refunds report', () => {
  let admin: ThrowawayStaff;
  let csr: ThrowawayStaff;
  let approverA: ThrowawayStaff;
  const refundIds: ObjectId[] = [];
  const day = (d: number) => new Date(Date.UTC(2020, 0, d, 12));

  test.beforeAll(async () => {
    admin = await createStaff('refund-report-admin', ['admin']);
    csr = await createStaff('refund-report-csr', ['csr']);
    approverA = await createStaff('refund-report-mgr', ['manager']);
    const orderId = new ObjectId();
    const row = (
      d: number,
      amountKobo: number,
      type: 'full' | 'partial',
      status: 'processed' | 'pending' | 'failed',
      approvedBy: ObjectId | null
    ) => {
      const _id = new ObjectId();
      refundIds.push(_id);
      return {
        _id,
        orderId,
        orderNumber: 'WG2001010001',
        amountKobo,
        type,
        status,
        source: 'staff',
        requestedBy: approvedBy,
        approvedBy,
        reason: 'e2e report seed',
        createdAt: day(d),
        updatedAt: day(d),
      };
    };
    await withMongo((db) =>
      db
        .collection('refunds')
        .insertMany([
          row(2, 500000, 'full', 'processed', new ObjectId(approverA.id)),
          row(3, 200000, 'partial', 'processed', new ObjectId(approverA.id)),
          row(4, 100000, 'partial', 'processed', null),
          row(5, 300000, 'partial', 'pending', new ObjectId(approverA.id)),
          row(6, 50000, 'partial', 'failed', new ObjectId(approverA.id)),
        ])
    );
  });

  test.afterAll(async () => {
    await withMongo((db) =>
      db.collection('refunds').deleteMany({ _id: { $in: refundIds } })
    );
    await deleteStaff(admin.id, csr.id, approverA.id);
  });

  test('[REQ-128][AC6] [US-B3.3] the report totals match the refund rows: processed, by type and by approver', async ({
    browser,
  }) => {
    tagTest('REQ-128', 6);
    const { context, page } = await loginAsStaff(browser, admin);
    try {
      await page.goto('/dashboard/refunds?from=2020-01-01&to=2020-01-31');
      const report = page.getByTestId('refunds-report');
      await expect(report).toBeVisible();
      // processed: 5,000 + 2,000 + 1,000 = 8,000 over three refunds
      await expect(page.getByTestId('refunds-total')).toHaveText('₦8,000');
      await expect(report.getByText('3 refunds')).toBeVisible();
      await expect(page.getByTestId('refunds-type-full')).toContainText(
        '₦5,000 (1)'
      );
      await expect(page.getByTestId('refunds-type-partial')).toContainText(
        '₦3,000 (2)'
      );
      // pending and failed are shown apart and are not counted as money returned
      await expect(report.getByText('₦3,000').first()).toBeVisible();
      await expect(report.getByText('1 waiting for Paystack')).toBeVisible();
      await expect(report.getByText('1 need attention')).toBeVisible();
      const approvers = page.getByTestId('refunds-approver');
      await expect(approvers).toHaveCount(2);
      await expect(
        approvers.filter({ hasText: 'Automatic (customer cancel)' })
      ).toContainText('₦1,000 (1)');
      await expect(approvers.filter({ hasNotText: 'Automatic' })).toContainText(
        '₦7,000 (2)'
      );
      await evidenceShot(page, 'REQ-128', 6, 'refunds-report');
    } finally {
      await context.close();
    }
  });

  test('[REQ-128][AC4][AC6] a csr is sent away from the refunds report', async ({
    browser,
  }) => {
    tagTest('REQ-128', [4, 6]);
    const { context, page } = await loginAsStaff(browser, csr);
    try {
      expect(await isRefused(page, '/dashboard/refunds')).toBe(true);
    } finally {
      await context.close();
    }
  });
});
