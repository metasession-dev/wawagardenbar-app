import { MongoClient } from 'mongodb';

/**
 * Read a customer's current 4-digit verification PIN straight from Mongo.
 *
 * The PIN is normally delivered via SMS/WhatsApp/email (all stubbed in test),
 * and `User.verificationPin` is `select: false`, so the app never exposes it.
 * For the passwordless-login smoke test we read it directly from the test DB —
 * the same disposable Mongo the seed step + dev server use (MONGODB_URI /
 * MONGODB_DB_NAME). Match on a digit-substring of the phone so we don't depend
 * on how `sanitizePhone` reformats it. Polls because the send action writes async.
 */
export async function getVerificationPinByPhone(
  phoneDigits: string,
  { timeoutMs = 8000, intervalMs = 250 }: { timeoutMs?: number; intervalMs?: number } = {}
): Promise<string | null> {
  const uri =
    process.env.MONGODB_URI ||
    process.env.MONGODB_WAWAGARDENBAR_APP_URI ||
    'mongodb://localhost:27017';
  const dbName = process.env.MONGODB_DB_NAME || 'wawagardenbar_test';

  const client = new MongoClient(uri);
  try {
    await client.connect();
    const users = client.db(dbName).collection('users');
    const deadline = Date.now() + timeoutMs;
    do {
      const user = await users.findOne(
        { phone: { $regex: phoneDigits } },
        { projection: { verificationPin: 1 } }
      );
      const pin = user?.verificationPin as string | undefined;
      if (pin) return pin;
      await new Promise((r) => setTimeout(r, intervalMs));
    } while (Date.now() < deadline);
    return null;
  } finally {
    await client.close();
  }
}

/**
 * A unique Nigerian-format phone for a fresh test customer. Returns the full
 * number to type and the unique digit-substring to look the user up by.
 */
export function uniquePhone(): { phone: string; digits: string } {
  const digits = String(Date.now()).slice(-8) + String(Math.floor(Math.random() * 10));
  return { phone: `+2348${digits}`, digits };
}
