import { MongoClient, ObjectId } from 'mongodb';
import { sealData } from 'iron-session';
import type { BrowserContext, Page } from '@playwright/test';

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

// ─── Session-bake helpers (REQ-013 customer-flow specs) ────────────────────
//
// REQ-064 hardened the customer-flow surfaces (`/menu`, `/checkout`,
// `MenuItemDetailModal.handleAddToCart`) so the client-side `useAuth()`
// hook gates them: when `/api/auth/session` resolves without
// `isLoggedIn`, the modal redirects to `/login?redirect=/menu`. Admin
// storage state still produces a logged-in session for admin users
// (admin/super-admin/csr ARE users), but there's a small race:
// `useAuth()` fetches `/api/auth/session` on mount; if the user clicks
// `Add to Cart` before the fetch resolves, `session` is `undefined`
// and the gate redirects. The helpers below let a spec either:
//
//   (a) Spawn a separate browser context with a pre-baked CUSTOMER
//       iron-session cookie (real customer role, not an admin acting
//       as a customer), bypassing the PIN flow that's infeasible in CI
//       without a stub SMS / WhatsApp backend.
//
//   (b) Stay on the existing admin storage state but wait for
//       `/api/auth/session` to resolve before any auth-gated click,
//       closing the race window.
//
// Both paths produce a cryptographically-valid `iron-session` cookie
// that the Next.js process accepts identically to one minted by a
// real PIN-verify flow.

export interface SeededCustomerForSession {
  _id: string;
  phone: string;
  email: string;
  name: string;
}

/**
 * Seed a verified-customer user document directly into Mongo. Skips
 * Mongoose (and therefore Mongoose validation), matching the seed
 * pattern in `e2e/helpers/main-category-report-seed.ts`. Defaults
 * produce a unique phone + email + name per call.
 *
 * Unlike `waitForPin` + the verify-pin flow above, this seed assumes
 * the spec wants a FULLY VERIFIED customer ready to consume in
 * `bakeCustomerSessionCookie` — no PIN intercept required.
 */
export async function seedVerifiedCustomer(opts?: {
  phone?: string;
  email?: string;
  name?: string;
}): Promise<SeededCustomerForSession> {
  const stamp = Date.now().toString(36).slice(-8);
  const phone =
    opts?.phone ||
    `+234${Date.now().toString().slice(-9)}${Math.floor(Math.random() * 10)}`;
  const email = opts?.email || `e2e-customer-${stamp}@e2e.local`;
  const name = opts?.name || `E2E Customer ${stamp}`;

  const conn = mongoConn();
  const client = new MongoClient(conn.uri);
  try {
    await client.connect();
    const result = await client.db(conn.dbName).collection('users').insertOne({
      phone,
      email,
      name,
      firstName: 'E2E',
      lastName: 'Customer',
      role: 'customer',
      isAdmin: false,
      isGuest: false,
      phoneVerified: true,
      emailVerified: true,
      isVerified: true,
      accountStatus: 'active',
      lastLoginAt: new Date(),
      totalSpent: 0,
      totalOrders: 0,
      rewardsEarned: 0,
      loyaltyPoints: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    return { _id: String(result.insertedId), phone, email, name };
  } finally {
    await client.close();
  }
}

/**
 * Produce an `iron-session`-sealed cookie value for a seeded
 * customer. Same password as the running app (`SESSION_PASSWORD`),
 * same TTL as `lib/session.ts` (7 days), same shape as a real
 * PIN-verify-action mint. The returned string is ready for
 * `context.addCookies(...)`.
 */
export async function bakeCustomerSessionCookie(
  customer: SeededCustomerForSession
): Promise<string> {
  const password = process.env.SESSION_PASSWORD;
  if (!password) {
    throw new Error(
      'SESSION_PASSWORD env var is required to bake a customer session cookie. Set it before invoking the customer-auth setup or per-spec helper.'
    );
  }
  return sealData(
    {
      userId: customer._id,
      email: customer.email,
      phone: customer.phone,
      name: customer.name,
      role: 'customer' as const,
      isGuest: false,
      isLoggedIn: true,
      createdAt: Date.now(),
    },
    {
      password,
      ttl: 60 * 60 * 24 * 7, // matches lib/session.ts cookieOptions.maxAge
    }
  );
}

/**
 * Attach a baked customer session cookie to a Playwright browser
 * context. Use this when a spec needs a separate authenticated
 * customer alongside the existing admin storage state (e.g.
 * REQ-013's daily-report-payments where the admin creates the tab
 * but the customer adds the order).
 *
 * @param baseUrl the running app's URL — Playwright derives the
 *                cookie domain from it. Pass `process.env.BASE_URL ||
 *                'http://localhost:3000'` in most specs.
 */
export async function attachCustomerSessionToContext(
  context: BrowserContext,
  customer: SeededCustomerForSession,
  baseUrl: string
): Promise<void> {
  const cookieValue = await bakeCustomerSessionCookie(customer);
  const cookieName = process.env.SESSION_COOKIE_NAME || 'wawa_session';
  await context.addCookies([
    {
      name: cookieName,
      value: cookieValue,
      url: baseUrl,
      httpOnly: true,
      sameSite: 'Lax',
      expires: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7,
    },
  ]);
}

/**
 * Wait until `/api/auth/session` resolves on the current page. Used
 * by specs that hit customer-facing routes with admin storage state
 * — the race between the client-side `useAuth()` fetch and a user
 * click on `Add to Cart` causes the modal to read `session ===
 * undefined`, trip its logged-out branch, and redirect to /login.
 *
 * Non-throwing: if the session response was already cached or never
 * fires (e.g. a SSR-hydrated page), the timeout fallback simply
 * proceeds rather than failing the spec.
 */
export async function waitForAuthLoaded(
  page: Page,
  options?: { timeoutMs?: number }
): Promise<void> {
  const timeout = options?.timeoutMs ?? 10_000;
  await page
    .waitForResponse(
      (resp) =>
        resp.url().includes('/api/auth/session') &&
        (resp.status() === 200 || resp.status() === 304),
      { timeout }
    )
    .catch(() => {
      /* hydrated from cache or already settled — proceed */
    });
}

/**
 * Cleanup the seeded customer + any orders or tabs created under
 * their userId. Call from `afterAll` to keep UAT free of leaked
 * fixtures.
 */
export async function cleanupSeededCustomer(
  customer: SeededCustomerForSession
): Promise<void> {
  const conn = mongoConn();
  const client = new MongoClient(conn.uri);
  try {
    await client.connect();
    const db = client.db(conn.dbName);
    const userId = new ObjectId(customer._id);
    await db.collection('users').deleteOne({ _id: userId });
    await db.collection('orders').deleteMany({ userId });
    await db.collection('tabs').deleteMany({ userId });
  } finally {
    await client.close();
  }
}
