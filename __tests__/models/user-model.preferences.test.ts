/**
 * @requirement REQ-053 — WhatsApp opt-in surface at signup + profile
 *
 * Schema-level coverage of the new WhatsApp fields on
 * `IPreferences.communicationPreferences`:
 *   - whatsappTransactional: defaults to `true` (consent for order updates,
 *     receipts, support replies).
 *   - whatsappMarketing:     defaults to `false` (no offers by default).
 *
 * Both fields are backwards-compatible: existing user docs persisted before
 * REQ-053 don't carry these keys; the Mongoose schema's `default` should
 * fill them in at read time, and the next save persists them.
 *
 * The Mongoose model is exercised in pure-validation mode (no DB connection)
 * via `model.validate()` and the constructor; no `connectDB` mock needed.
 */
import { describe, it, expect } from 'vitest';
import mongoose from 'mongoose';

// Import the model lazily so test failures during initial schema authoring
// surface as "expected ... received undefined" rather than swallowed
// module-load errors.
async function loadUserModel() {
  const mod = await import('@/models/user-model');
  // `models/user-model.ts` uses a default export.
  return mod.default;
}

describe('REQ-053: communicationPreferences.whatsapp* defaults', () => {
  it('AC1 — a brand-new User doc has whatsappTransactional === true', async () => {
    const UserModel = await loadUserModel();
    const doc = new UserModel({
      phone: '+2347000000001',
      role: 'customer',
    });
    expect(
      doc.preferences?.communicationPreferences?.whatsappTransactional
    ).toBe(true);
  });

  it('AC1 — a brand-new User doc has whatsappMarketing === false', async () => {
    const UserModel = await loadUserModel();
    const doc = new UserModel({
      phone: '+2347000000002',
      role: 'customer',
    });
    expect(doc.preferences?.communicationPreferences?.whatsappMarketing).toBe(
      false
    );
  });

  it('AC1 — existing channel defaults (email/sms/push) unchanged', async () => {
    const UserModel = await loadUserModel();
    const doc = new UserModel({
      phone: '+2347000000003',
      role: 'customer',
    });
    const cp = doc.preferences?.communicationPreferences;
    expect(cp?.email).toBe(true);
    expect(cp?.sms).toBe(false);
    expect(cp?.push).toBe(false);
  });

  it('AC6 — explicit overrides are honoured at construction time', async () => {
    const UserModel = await loadUserModel();
    const doc = new UserModel({
      phone: '+2347000000004',
      role: 'customer',
      preferences: {
        communicationPreferences: {
          whatsappTransactional: false,
          whatsappMarketing: true,
        },
      },
    });
    expect(
      doc.preferences?.communicationPreferences?.whatsappTransactional
    ).toBe(false);
    expect(doc.preferences?.communicationPreferences?.whatsappMarketing).toBe(
      true
    );
  });

  // REQ-063 ── explicit-consent split for marketing emails
  it('REQ-063 AC2 — emailMarketing defaults to false', async () => {
    const UserModel = await loadUserModel();
    const doc = new UserModel({
      phone: '+2347000000005',
      role: 'customer',
    });
    expect(doc.preferences?.communicationPreferences?.emailMarketing).toBe(
      false
    );
  });

  it('REQ-063 AC2 — emailMarketing explicit override is honoured', async () => {
    const UserModel = await loadUserModel();
    const doc = new UserModel({
      phone: '+2347000000006',
      role: 'customer',
      preferences: {
        communicationPreferences: {
          emailMarketing: true,
        },
      },
    });
    expect(doc.preferences?.communicationPreferences?.emailMarketing).toBe(
      true
    );
  });

  it('REQ-063 AC3 — communicationPreferencesUpdatedAt accepts a Date', async () => {
    const UserModel = await loadUserModel();
    const stamp = new Date('2026-06-03T12:00:00Z');
    const doc = new UserModel({
      phone: '+2347000000007',
      role: 'customer',
      preferences: {
        communicationPreferencesUpdatedAt: stamp,
      },
    });
    expect(
      doc.preferences?.communicationPreferencesUpdatedAt?.toISOString()
    ).toBe(stamp.toISOString());
  });

  // Clean up any mongoose registration side effects between test runs.
  afterAll(async () => {
    await mongoose.disconnect().catch(() => undefined);
  });
});

// Vitest's `afterAll` is hoisted; import it from the same module surface so
// the global isn't required.
import { afterAll } from 'vitest';
