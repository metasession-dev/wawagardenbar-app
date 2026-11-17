/**
 * @requirement REQ-121 — AC2, AC3
 * @srs REQ-CHECKOUT-015, REQ-CHECKOUT-016
 *
 * Checkout saves a first name once (no last name needed) and saves a delivery
 * address automatically without adding the same street on every order.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/mongodb', () => ({ connectDB: vi.fn() }));
const findById = vi.hoisted(() => vi.fn());
vi.mock('@/models/user-model', () => ({ default: { findById } }));

import { UserService } from '@/services/user-service';

function user(addresses: any[] = []) {
  const doc: any = {
    addresses,
    email: undefined,
    save: vi.fn().mockResolvedValue(undefined),
  };
  return doc;
}

const ADDRESS = {
  streetAddress: '12 Allen Avenue',
  city: 'Lagos',
  state: 'Lagos',
  postalCode: '',
  deliveryInstructions: 'Landmark: Near the mall',
};

beforeEach(() => vi.clearAllMocks());

describe('updateProfileFromCheckout', () => {
  it('saves a first name alone and sets the display name (AC2)', async () => {
    const doc = user();
    findById.mockResolvedValue(doc);
    await UserService.updateProfileFromCheckout({
      userId: 'u1',
      firstName: ' Ada ',
    });
    expect(doc.firstName).toBe('Ada');
    expect(doc.name).toBe('Ada');
    expect(doc.lastName).toBeUndefined();
    expect(doc.save).toHaveBeenCalledOnce();
  });

  it('still joins first and last name when both are given', async () => {
    const doc = user();
    findById.mockResolvedValue(doc);
    await UserService.updateProfileFromCheckout({
      userId: 'u1',
      firstName: 'Ada',
      lastName: 'Obi',
    });
    expect(doc.name).toBe('Ada Obi');
  });

  it('adds a new address as the default when it is the first one (AC3)', async () => {
    const doc = user();
    findById.mockResolvedValue(doc);
    await UserService.updateProfileFromCheckout({
      userId: 'u1',
      address: ADDRESS,
      saveAddress: true,
    });
    expect(doc.addresses).toHaveLength(1);
    expect(doc.addresses[0]).toMatchObject({
      streetAddress: '12 Allen Avenue',
      isDefault: true,
      country: 'Nigeria',
    });
  });

  it('does not add the same street twice, only refreshes it (AC3)', async () => {
    const doc = user([
      {
        streetAddress: ' 12 allen avenue ',
        city: 'LAGOS',
        state: 'Lagos',
        isDefault: true,
        lastUsedAt: new Date('2026-01-01'),
      },
    ]);
    findById.mockResolvedValue(doc);
    await UserService.updateProfileFromCheckout({
      userId: 'u1',
      address: ADDRESS,
      saveAddress: true,
    });
    expect(doc.addresses).toHaveLength(1);
    expect(doc.addresses[0].lastUsedAt.getTime()).toBeGreaterThan(
      new Date('2026-01-01').getTime()
    );
    expect(doc.addresses[0].deliveryInstructions).toBe(
      'Landmark: Near the mall'
    );
  });

  it('adds a different street as a second, non-default address (AC3)', async () => {
    const doc = user([
      {
        streetAddress: '5 Ring Road',
        city: 'Lagos',
        state: 'Lagos',
        isDefault: true,
      },
    ]);
    findById.mockResolvedValue(doc);
    await UserService.updateProfileFromCheckout({
      userId: 'u1',
      address: ADDRESS,
      saveAddress: true,
    });
    expect(doc.addresses).toHaveLength(2);
    expect(doc.addresses[1].isDefault).toBe(false);
  });

  it('does not touch addresses when saving is off', async () => {
    const doc = user();
    findById.mockResolvedValue(doc);
    await UserService.updateProfileFromCheckout({
      userId: 'u1',
      address: ADDRESS,
      saveAddress: false,
    });
    expect(doc.addresses).toHaveLength(0);
  });
});
