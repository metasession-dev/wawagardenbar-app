/**
 * @requirement REQ-122 — AC4, AC5
 * @srs REQ-AUTHA-008, REQ-DASH-006
 *
 * A staff alert number: saved unverified, verified with a WhatsApp PIN that
 * also records consent, refused when it belongs to a customer or to another
 * verified staff member, and never stored in the clear. US-B5.5.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('@/lib/mongodb', () => ({ connectDB: vi.fn() }));

const U = vi.hoisted(() => ({
  findOne: vi.fn(),
  exists: vi.fn(),
  updateOne: vi.fn(),
}));
vi.mock('@/models/user-model', () => ({ default: U }));
const sendPin = vi.hoisted(() => vi.fn());
vi.mock('@/lib/whatsapp', () => ({
  WhatsAppService: { sendVerificationPinWhatsApp: sendPin },
}));

import { StaffAlertNumberService } from '@/services/staff-alert-number-service';
import { hashPin } from '@/lib/auth-utils';

/** `findOne().select()` is awaited directly by some callers and `.lean()`ed by others. */
function findOneReturns(doc: unknown) {
  U.findOne.mockReturnValue({
    select: () => {
      const q: any = Promise.resolve(doc);
      q.lean = async () => doc;
      return q;
    },
  });
}

function staffDoc(over: Record<string, unknown> = {}) {
  const doc: Record<string, any> = {
    alertPhone: '+2348012345678',
    alertPhoneVerified: false,
    alertPinRequestCount: 0,
    save: vi.fn().mockResolvedValue(undefined),
    ...over,
  };
  return doc;
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv('SESSION_PASSWORD', 'a'.repeat(32));
  U.exists.mockResolvedValue(null);
  U.updateOne.mockResolvedValue({});
  sendPin.mockResolvedValue({ success: true });
});
afterEach(() => vi.unstubAllEnvs());

describe('AC4: saving the number', () => {
  it('saves a normalised number unverified and clears any earlier verification', async () => {
    findOneReturns({ _id: 's1', alertPhone: '+2348000000000' });
    const r = await StaffAlertNumberService.setAlertPhone(
      's1',
      '0801 234 5678'
    );
    expect(r.success).toBe(true);
    const [, update] = U.updateOne.mock.calls[0];
    expect(update.$set).toEqual({
      alertPhone: '+2348012345678',
      alertPhoneVerified: false,
    });
    expect(update.$unset).toHaveProperty('alertConsentAt');
    expect(update.$unset).toHaveProperty('alertPinHash');
  });

  it('does nothing when the number is unchanged', async () => {
    findOneReturns({ _id: 's1', alertPhone: '+2348012345678' });
    const r = await StaffAlertNumberService.setAlertPhone(
      's1',
      '+234 801 234 5678'
    );
    expect(r.success).toBe(true);
    expect(U.updateOne).not.toHaveBeenCalled();
  });

  it('refuses an invalid number', async () => {
    const r = await StaffAlertNumberService.setAlertPhone('s1', '12');
    expect(r).toMatchObject({ success: false });
    expect(U.updateOne).not.toHaveBeenCalled();
  });

  it('refuses a number that does not normalise to an international number', async () => {
    findOneReturns({ _id: 's1' });
    // 12 digits starting 0803: too long for a Nigerian local number, so it would
    // otherwise be stored as "+0803...".
    for (const bad of ['080312345678', '0000000000', '+0 80312345678']) {
      const r = await StaffAlertNumberService.setAlertPhone('s1', bad);
      expect(r).toMatchObject({
        success: false,
        message: 'Enter a valid phone number.',
      });
    }
    expect(U.updateOne).not.toHaveBeenCalled();
  });

  it('refuses a number that belongs to a customer account', async () => {
    findOneReturns({ _id: 's1' });
    U.exists.mockResolvedValueOnce({ _id: 'customer-1' });
    const r = await StaffAlertNumberService.setAlertPhone(
      's1',
      '+2348012345678'
    );
    expect(r.message).toMatch(/customer account/i);
    expect(U.updateOne).not.toHaveBeenCalled();
  });

  it('refuses a number already verified for another staff member', async () => {
    findOneReturns({ _id: 's1' });
    U.exists.mockResolvedValueOnce(null).mockResolvedValueOnce({ _id: 's2' });
    const r = await StaffAlertNumberService.setAlertPhone(
      's1',
      '+2348012345678'
    );
    expect(r.message).toMatch(/another staff member/i);
  });

  it('only staff accounts can have an alert number', async () => {
    findOneReturns(null);
    const r = await StaffAlertNumberService.setAlertPhone(
      'c1',
      '+2348012345678'
    );
    expect(r).toMatchObject({
      success: false,
      message: 'Staff account not found.',
    });
  });
});

describe('AC4: verifying with a WhatsApp PIN', () => {
  it('[US-B5.5] sends a code to the saved number and stores only its hash', async () => {
    const doc = staffDoc();
    findOneReturns(doc);
    const r = await StaffAlertNumberService.requestVerification('s1');
    expect(r.success).toBe(true);
    const [phone, pin] = sendPin.mock.calls[0];
    expect(phone).toBe('+2348012345678');
    expect(pin).toMatch(/^\d{6}$/);
    expect(doc.alertPinHash).toBe(hashPin(pin));
    expect(doc.alertPinHash).not.toContain(pin);
    expect(doc.alertPinExpiresAt.getTime()).toBeGreaterThan(Date.now());
    expect(doc.alertPinRequestCount).toBe(1);
  });

  it('under the e2e intercept the plain code is kept for tests and nothing is sent to Meta', async () => {
    vi.stubEnv('ENABLE_E2E_PIN_INTERCEPT', 'true');
    const doc = staffDoc();
    findOneReturns(doc);
    const r = await StaffAlertNumberService.requestVerification('s1');
    expect(r.success).toBe(true);
    expect(sendPin).not.toHaveBeenCalled();
    expect(doc.alertPin).toMatch(/^\d{6}$/);
    expect(doc.alertPinHash).toBe(hashPin(doc.alertPin));
  });

  it('outside the intercept the plain code is never stored', async () => {
    vi.stubEnv('ENABLE_E2E_PIN_INTERCEPT', 'false');
    const doc = staffDoc({ alertPin: '999999' });
    findOneReturns(doc);
    await StaffAlertNumberService.requestVerification('s1');
    expect(doc.alertPin).toBeUndefined();
  });

  it('needs a saved number first', async () => {
    findOneReturns(staffDoc({ alertPhone: undefined }));
    const r = await StaffAlertNumberService.requestVerification('s1');
    expect(r.message).toMatch(/save an alert number/i);
    expect(sendPin).not.toHaveBeenCalled();
  });

  it('allows five codes an hour and refuses the sixth', async () => {
    const now = new Date('2026-11-16T12:00:00.000Z');
    findOneReturns(
      staffDoc({
        alertPinRequestWindowStart: new Date(now.getTime() - 60_000),
        alertPinRequestCount: 5,
      })
    );
    const r = await StaffAlertNumberService.requestVerification('s1', now);
    expect(r.message).toMatch(/too many codes/i);
    expect(sendPin).not.toHaveBeenCalled();
  });

  it('starts a fresh hour after the window passes', async () => {
    const now = new Date('2026-11-16T12:00:00.000Z');
    const doc = staffDoc({
      alertPinRequestWindowStart: new Date(now.getTime() - 61 * 60_000),
      alertPinRequestCount: 5,
    });
    findOneReturns(doc);
    expect(
      (await StaffAlertNumberService.requestVerification('s1', now)).success
    ).toBe(true);
    expect(doc.alertPinRequestCount).toBe(1);
  });

  it('reports a WhatsApp failure without claiming the code was sent', async () => {
    findOneReturns(staffDoc());
    sendPin.mockResolvedValue({
      success: false,
      errorCode: 'SERVICE_DISABLED',
    });
    const r = await StaffAlertNumberService.requestVerification('s1');
    expect(r).toMatchObject({ success: false });
  });

  it('[US-B5.5] the right code verifies the number and records consent', async () => {
    const now = new Date('2026-11-16T12:00:00.000Z');
    const doc = staffDoc({
      alertPinHash: hashPin('123456'),
      alertPinExpiresAt: new Date(now.getTime() + 5 * 60_000),
      alertPinAttempts: 0,
      alertsEnabled: false,
    });
    findOneReturns(doc);
    const r = await StaffAlertNumberService.verify('s1', '123456', now);
    expect(r.success).toBe(true);
    expect(doc.alertPhoneVerified).toBe(true);
    expect(doc.alertConsentAt).toEqual(now);
    expect(doc.alertsEnabled).toBe(true);
    expect(doc.alertPinHash).toBeUndefined();
  });

  it('a wrong code counts an attempt and does not verify', async () => {
    const doc = staffDoc({
      alertPinHash: hashPin('123456'),
      alertPinExpiresAt: new Date(Date.now() + 60_000),
      alertPinAttempts: 0,
    });
    findOneReturns(doc);
    const r = await StaffAlertNumberService.verify('s1', '000000');
    expect(r.success).toBe(false);
    expect(doc.alertPinAttempts).toBe(1);
    expect(doc.alertPhoneVerified).toBe(false);
  });

  it('refuses an expired code, a malformed code and after five wrong tries', async () => {
    findOneReturns(
      staffDoc({
        alertPinHash: hashPin('123456'),
        alertPinExpiresAt: new Date(Date.now() - 1000),
      })
    );
    expect(
      (await StaffAlertNumberService.verify('s1', '123456')).message
    ).toMatch(/expired/i);

    expect((await StaffAlertNumberService.verify('s1', 'abc')).message).toMatch(
      /6-digit/
    );

    findOneReturns(
      staffDoc({
        alertPinHash: hashPin('123456'),
        alertPinExpiresAt: new Date(Date.now() + 60_000),
        alertPinAttempts: 5,
      })
    );
    const r = await StaffAlertNumberService.verify('s1', '123456');
    expect(r.message).toMatch(/too many wrong/i);
  });
});

describe('AC5: on shift', () => {
  it('sets the flag for a staff member only', async () => {
    const r = await StaffAlertNumberService.setOnShift('s1', true);
    expect(r.success).toBe(true);
    const [filter, update] = U.updateOne.mock.calls[0];
    expect(filter).toMatchObject({
      _id: 's1',
      roles: { $in: expect.any(Array) },
    });
    expect(update).toEqual({ $set: { onShift: true } });
  });

  it('removing the number also takes the member off shift', async () => {
    await StaffAlertNumberService.removeAlertPhone('s1');
    const [, update] = U.updateOne.mock.calls[0];
    expect(update.$set).toEqual({ alertPhoneVerified: false, onShift: false });
    expect(update.$unset).toHaveProperty('alertPhone');
  });
});
