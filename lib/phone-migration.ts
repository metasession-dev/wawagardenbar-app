/**
 * @requirement REQ-115 (AC5, ADR-006) — plan for normalising stored phones.
 *
 * Pure function: given the stored users, work out which phones change to the
 * canonical E.164 form, which cannot be changed because two accounts would
 * collide, and which are unusable. It never merges or deletes anything; the
 * script `scripts/migrate-normalize-phones.ts` applies `updates` only.
 */
import { normalizePhone } from '@/lib/auth-utils';

export interface PhoneRecord {
  id: string;
  phone: string | null | undefined;
}

export interface PhoneUpdate {
  id: string;
  before: string;
  after: string;
}

export interface PhoneDuplicateGroup {
  canonical: string;
  accounts: { id: string; phone: string }[];
}

export interface PhoneMigrationPlan {
  updates: PhoneUpdate[];
  duplicates: PhoneDuplicateGroup[];
  alreadyCanonical: number;
  unusable: { id: string; phone: string }[];
  total: number;
}

export function planPhoneMigration(records: PhoneRecord[]): PhoneMigrationPlan {
  const groups = new Map<string, { id: string; phone: string }[]>();
  const unusable: PhoneMigrationPlan['unusable'] = [];
  let withoutPhone = 0;

  for (const record of records) {
    const phone = (record.phone ?? '').trim();
    if (!phone) {
      withoutPhone++;
      continue;
    }
    const canonical = normalizePhone(phone);
    if (!canonical) {
      unusable.push({ id: record.id, phone });
      continue;
    }
    const group = groups.get(canonical) ?? [];
    group.push({ id: record.id, phone });
    groups.set(canonical, group);
  }

  const updates: PhoneUpdate[] = [];
  const duplicates: PhoneDuplicateGroup[] = [];
  let alreadyCanonical = 0;

  for (const [canonical, accounts] of groups) {
    if (accounts.length > 1) {
      // Report only; a wrong merge would hand one person's data to another.
      duplicates.push({ canonical, accounts });
      continue;
    }
    const [account] = accounts;
    if (account.phone === canonical) alreadyCanonical++;
    else
      updates.push({ id: account.id, before: account.phone, after: canonical });
  }

  return {
    updates,
    duplicates,
    alreadyCanonical,
    unusable,
    total: records.length - withoutPhone,
  };
}

/** Masks all but the last 4 digits, so reports can be kept as evidence. */
export function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  return digits.length <= 4
    ? '****'
    : `${'*'.repeat(digits.length - 4)}${digits.slice(-4)}`;
}
