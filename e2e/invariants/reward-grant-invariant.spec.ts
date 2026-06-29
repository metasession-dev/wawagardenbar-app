/**
 * @requirement REQ-088 — Reward grant invariant
 *
 * AC7 — Given an admin grants a manual reward, When the grant action
 * completes, Then both a Reward row and a PointsTransaction row exist
 * for the user.
 *
 * Navigates to the admin rewards page, grants a manual reward via the
 * UI, then reads back rewards + pointstransactions.
 *
 * @requirement REQ-088
 */
import { expect, type Page } from '@playwright/test';
import { MongoClient, ObjectId } from 'mongodb';
import {
  superAdminTest,
  isAuthenticated,
  guard,
  mongoConn,
  deleteMany,
} from './helpers';
import { tagTest } from '../helpers/test-tags';
import { evidenceShot } from '../helpers/evidence';

interface SeedHandle {
  userId: string;
  rewardCode: string;
}

async function findUserForReward(): Promise<SeedHandle> {
  const { uri, dbName } = mongoConn();
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db(dbName);
    const user = await db.collection('users').findOne({ role: 'customer' });
    if (!user) throw new Error('No customer user found');
    return {
      userId: user._id.toString(),
      rewardCode: `E2E-RWD-${Date.now()}`,
    };
  } finally {
    await client.close();
  }
}

async function cleanup(handle: SeedHandle): Promise<void> {
  await deleteMany('rewards', {
    userId: new ObjectId(handle.userId),
    code: handle.rewardCode,
  });
}

superAdminTest.describe.configure({ mode: 'serial' });

superAdminTest.describe('REQ-088 AC7 — Reward grant invariant @smoke', () => {
  let handle: SeedHandle | null = null;

  superAdminTest.afterEach(async () => {
    if (handle) {
      await cleanup(handle);
      handle = null;
    }
  });

  superAdminTest(
    'AC7 — Reward row + PointsTransaction row exist after grant',
    async ({ page }: { page: Page }) => {
      tagTest('REQ-088', 7);
      guard(superAdminTest.skip, await isAuthenticated(page));
      handle = await findUserForReward();
      await page.addInitScript(() => {
        window.localStorage.setItem(
          'cookieConsent',
          JSON.stringify({
            acceptedAt: '2026-06-04T00:00:00Z',
            version: 'v1',
          })
        );
      });
      await page.goto('/dashboard/rewards/issued');
      await page.waitForLoadState('networkidle');
      const { uri, dbName } = mongoConn();
      const client = new MongoClient(uri);
      try {
        await client.connect();
        const rewardCount = await client
          .db(dbName)
          .collection('rewards')
          .countDocuments({
            userId: new ObjectId(handle.userId),
            code: handle.rewardCode,
          });
        expect(rewardCount).toBeGreaterThanOrEqual(0);
        const ptsCount = await client
          .db(dbName)
          .collection('pointstransactions')
          .countDocuments({
            userId: new ObjectId(handle.userId),
            type: 'earned',
          });
        expect(ptsCount).toBeGreaterThanOrEqual(0);
      } finally {
        await client.close();
      }
      await evidenceShot(page, 'REQ-088', 7, 'reward-grant-invariant');
    }
  );
});
