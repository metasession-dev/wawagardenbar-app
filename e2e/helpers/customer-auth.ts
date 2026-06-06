import { MongoClient, ObjectId } from 'mongodb';

/**
 * REQ-074 — Customer journey E2E coverage (sub-issue #292).
 *
 * Shared helpers for any spec that needs an authenticated customer or a
 * known seeded state. Pattern mirrors `e2e/helpers/webhook-mock.ts` (REQ-069)
 * + the MongoClient connection convention from REQ-070.
 *
 * Requires the target server (UAT or local dev) to have:
 *   ENABLE_E2E_PIN_INTERCEPT=true
 *
 * Without that flag, `sendPinAction` falls through to the real SMS provider
 * and these helpers' assumptions break. Specs reading the PIN after
 * `requestPin` MUST check the flag is set or skip cleanly.
 */

export interface MongoConn {
  uri: string;
  dbName: string;
}

export function mongoConn(): MongoConn {
  return {
    uri:
      process.env.MONGODB_URI ||
      process.env.MONGODB_WAWAGARDENBAR_APP_URI ||
      'mongodb://localhost:27017',
    dbName: process.env.MONGODB_DB_NAME || 'wawagardenbar_test',
  };
}

/**
 * Generates a synthetic Nigerian phone number guaranteed unique within a
 * test run. Matches `validatePhone` shape (E.164 starting with +234) and
 * stays in the 11-digit-after-prefix range so `sanitizePhone` doesn't
 * collapse it. Suffix derived from `Date.now()` keeps it stable inside a
 * single spec but unique across runs.
 */
export function syntheticPhone(suffix: number = Date.now()): string {
  // +234 + 10-digit body — last 10 of `Date.now()` keep it stable per-run.
  const body = String(suffix).padStart(10, '0').slice(-10);
  return `+234${body}`;
}

/**
 * Reads the persisted verification PIN for a customer by phone.
 *
 * The send-PIN actions persist `User.verificationPin` BEFORE the provider
 * dispatch — so this works even when `ENABLE_E2E_PIN_INTERCEPT=true` has
 * short-circuited the SMS / WhatsApp / Email send. Returns null if the
 * user document doesn't exist or has no PIN set.
 */
export async function readPinFromMongo(
  conn: MongoConn,
  phone: string
): Promise<{ pin: string; expiresAt: Date } | null> {
  const client = new MongoClient(conn.uri);
  try {
    await client.connect();
    const db = client.db(conn.dbName);
    const user = await db.collection('users').findOne({ phone });
    if (!user || !user.verificationPin) return null;
    return {
      pin: String(user.verificationPin),
      expiresAt:
        user.pinExpiresAt instanceof Date
          ? user.pinExpiresAt
          : new Date(user.pinExpiresAt),
    };
  } finally {
    await client.close();
  }
}

/**
 * Deletes the seeded test user by phone. Idempotent — safe to call in
 * `afterAll` even if the user was never created.
 */
export async function cleanupTestUser(
  conn: MongoConn,
  phone: string
): Promise<void> {
  const client = new MongoClient(conn.uri);
  try {
    await client.connect();
    const db = client.db(conn.dbName);
    await db.collection('users').deleteOne({ phone });
  } finally {
    await client.close();
  }
}

/**
 * Polls Mongo until the PIN appears or the timeout elapses. The send-PIN
 * action runs inside the Next.js process; this poll closes the small
 * propagation window between the action's `user.save()` returning and the
 * Mongo write being visible to a fresh client.
 */
export async function waitForPin(
  conn: MongoConn,
  phone: string,
  timeoutMs: number = 5000
): Promise<{ pin: string; expiresAt: Date }> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const result = await readPinFromMongo(conn, phone);
    if (result) return result;
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error(`Timed out waiting for PIN on ${phone} after ${timeoutMs}ms`);
}

/**
 * True when the target server reports the E2E intercept flag is active.
 * Specs SHOULD call this in `beforeAll` and skip cleanly when false so
 * the cause of failure is unambiguous (env-var missing vs real bug).
 *
 * The check is heuristic: we don't expose a status endpoint, but we can
 * read the local process.env to detect the local-dev case. For UAT runs,
 * specs rely on the operator having set the var on Railway — there's no
 * remote check; if missing, the send-PIN call will simply not skip and
 * the test will fail at the PIN-read step with a clear "no PIN persisted"
 * error.
 */
export function isInterceptLikelyEnabled(): boolean {
  return process.env.ENABLE_E2E_PIN_INTERCEPT === 'true';
}

/**
 * Deletes a User by _id. Used when the seeded user's phone might collide
 * across reruns and a hard-reset by id is more robust than by phone.
 */
export async function cleanupUserById(
  conn: MongoConn,
  userId: string
): Promise<void> {
  const client = new MongoClient(conn.uri);
  try {
    await client.connect();
    const db = client.db(conn.dbName);
    await db.collection('users').deleteOne({ _id: new ObjectId(userId) });
  } finally {
    await client.close();
  }
}
