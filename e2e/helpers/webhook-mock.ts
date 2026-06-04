/**
 * @requirement REQ-069 — Payments + webhooks E2E coverage (sub-issue #294)
 *
 * Webhook mock helpers — generate HMAC-SHA512 signatures matching the
 * paystack + monnify route handlers' verification logic, then POST the
 * synthetic webhook to the running app.
 *
 * Signature contracts (must match the server EXACTLY or the route returns 401):
 *   - paystack: `crypto.createHmac('sha512', secret).update(JSON.stringify(payload)).digest('hex')`
 *     header: `x-paystack-signature`. The parsed object is RE-SERIALIZED before signing,
 *     so the wire bytes must match `JSON.stringify(payload)` exactly.
 *   - monnify:  `crypto.createHmac('sha512', secret).update(rawPayloadString).digest('hex')`
 *     header: `monnify-signature`. The raw bytes sent over the wire are signed directly.
 *
 * Source-of-truth for the contracts:
 *   - `services/paystack-service.ts:validateWebhookSignature` (lines 133–145)
 *   - `services/monnify-service.ts:validateWebhookSignature` (lines 109–116)
 *   - `app/api/webhooks/paystack/route.ts:20` (header name)
 *   - `app/api/webhooks/monnify/route.ts:22` (header name)
 *
 * The mock helpers do NOT mock the verification — they SIGN with the real
 * secret. That's intentional: it proves the HTTP layer + signature path is
 * wired end-to-end, not just the in-process business logic.
 */
import crypto from 'crypto';
import { MongoClient } from 'mongodb';

export type WebhookProvider = 'paystack' | 'monnify';

/**
 * Generate a paystack `x-paystack-signature` header value for the given payload.
 * Object is re-serialized before hashing — mirrors the route handler exactly.
 */
export function signPaystackPayload(
  payload: Record<string, unknown>,
  secret: string
): string {
  return crypto
    .createHmac('sha512', secret)
    .update(JSON.stringify(payload))
    .digest('hex');
}

/**
 * Generate a monnify `monnify-signature` header value. Signs the raw
 * payload string directly — mirrors the route handler.
 */
export function signMonnifyPayload(rawPayload: string, secret: string): string {
  return crypto.createHmac('sha512', secret).update(rawPayload).digest('hex');
}

/**
 * POST a synthetic webhook to the running app. Returns the fetch Response so
 * tests can assert status code + body. Uses `node`'s fetch — no Playwright
 * dependency, runs in any test runner.
 */
export async function sendWebhook(opts: {
  baseUrl: string;
  provider: WebhookProvider;
  rawBody: string;
  signature: string;
}): Promise<{ status: number; body: unknown }> {
  const path =
    opts.provider === 'paystack'
      ? '/api/webhooks/paystack'
      : '/api/webhooks/monnify';
  const signatureHeader =
    opts.provider === 'paystack' ? 'x-paystack-signature' : 'monnify-signature';

  const res = await fetch(`${opts.baseUrl.replace(/\/$/, '')}${path}`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      [signatureHeader]: opts.signature,
    },
    body: opts.rawBody,
  });
  let body: unknown;
  try {
    body = await res.json();
  } catch {
    body = await res.text();
  }
  return { status: res.status, body };
}

/**
 * Read the paystack secret from the UAT/prod systemsettings document.
 * Paystack stores the secret in SystemSettings.paystack.secretKey (DB-backed,
 * not env-backed), so the test must read the same source the server's
 * `PaystackService.getConfig()` reads.
 *
 * Mongo-based; needs the UAT (or test-target) MONGODB_URI in env.
 */
export async function readPaystackSecretFromMongo(
  uri: string,
  dbName: string
): Promise<string> {
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const row = await client
      .db(dbName)
      .collection('systemsettings')
      .findOne({ key: 'payment' });
    const secret = (
      (row?.value as { paystack?: { secretKey?: string } })?.paystack
        ?.secretKey ?? ''
    ).trim();
    if (!secret) {
      throw new Error(
        'paystack.secretKey not set in SystemSettings — cannot sign synthetic webhooks. Configure via dashboard/settings or seed before running the spec.'
      );
    }
    return secret;
  } finally {
    await client.close();
  }
}

/**
 * Read the monnify secret. Monnify uses the env var `MONNIFY_SECRET_KEY`
 * read at class-init time, so the test must use the SAME env var the
 * server's MonnifyService picked up.
 */
export function readMonnifySecretFromEnv(): string {
  const secret = (process.env.MONNIFY_SECRET_KEY ?? '').trim();
  if (!secret) {
    throw new Error(
      'MONNIFY_SECRET_KEY not set — cannot sign synthetic webhooks. Add it to .env.local matching the UAT server env.'
    );
  }
  return secret;
}
