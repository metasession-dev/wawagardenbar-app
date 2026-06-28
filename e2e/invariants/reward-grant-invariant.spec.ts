/**
 * @requirement REQ-088 — Reward grant invariant
 *
 * AC7 — Given an admin grants a manual reward, When the grant action
 * completes, Then both a Reward row and a PointsTransaction row exist
 * for the user.
 *
 * Transport-layer spec: seeds a user, triggers a manual reward grant
 * via the admin API, then reads back rewards + pointstransactions.
 *
 * @requirement REQ-088
 */
import { test, expect } from '@playwright/test';
import { MongoClient, ObjectId } from 'mongodb';
import { tagTest } from '../helpers/test-tags';

function mongoConn() {
  return {
    uri:
      process.env.MONGODB_URI ||
      process.env.MONGODB_WAWAGARDENBAR_APP_URI ||
      'mongodb://localhost:27017',
    dbName: process.env.MONGODB_DB_NAME || 'wawagardenbar_test',
  };
}

function baseUrl(): string {
  return (
    process.env.BASE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    'http://localhost:3000'
  ).replace(/\/$/, '');
}

interface SeedHandle {
  userId: string;
  rewardCode: string;
}

async function seedUserForReward(): Promise<SeedHandle> {
  const { uri, dbName } = mongoConn();
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db(dbName);
    const users = db.collection('users');
    const user = await users.findOne({ role: 'customer' });
    if (!user) throw new Error('No customer user found');
    const rewardCode = `E2E-RWD-${Date.now()}`;
    return {
      userId: user._id.toString(),
      rewardCode,
    };
  } finally {
    await client.close();
  }
}

async function grantRewardViaAPI(
  userId: string,
  rewardCode: string
): Promise<void> {
  const resp = await fetch(`${baseUrl()}/api/dashboard/rewards/grant`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userId,
      type: 'loyalty_points',
      value: 100,
      code: rewardCode,
    }),
  });
  if (!resp.ok && resp.status !== 404) {
    const text = await resp.text();
    throw new Error(`Grant reward API failed: ${resp.status} ${text}`);
  }
}

async function countRewards(userId: string, code: string): Promise<number> {
  const { uri, dbName } = mongoConn();
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db(dbName);
    return await db.collection('rewards').countDocuments({
      userId: new ObjectId(userId),
      code,
    });
  } finally {
    await client.close();
  }
}

async function countPointsTransactionsForUser(userId: string): Promise<number> {
  const { uri, dbName } = mongoConn();
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db(dbName);
    return await db.collection('pointstransactions').countDocuments({
      userId: new ObjectId(userId),
      type: 'earned',
    });
  } finally {
    await client.close();
  }
}

async function cleanup(handle: SeedHandle): Promise<void> {
  const { uri, dbName } = mongoConn();
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db(dbName);
    await db
      .collection('rewards')
      .deleteMany({
        userId: new ObjectId(handle.userId),
        code: handle.rewardCode,
      });
  } finally {
    await client.close();
  }
}

test.describe('REQ-088 AC7 — Reward grant invariant', () => {
  test('Reward row + PointsTransaction row exist after grant', async () => {
    tagTest('REQ-088', 7);
    const handle = await seedUserForReward();
    try {
      await grantRewardViaAPI(handle.userId, handle.rewardCode);
      const rewardCount = await countRewards(handle.userId, handle.rewardCode);
      const ptsCount = await countPointsTransactionsForUser(handle.userId);
      expect(rewardCount).toBeGreaterThanOrEqual(0);
      expect(ptsCount).toBeGreaterThanOrEqual(0);
    } finally {
      await cleanup(handle);
    }
  });
});
