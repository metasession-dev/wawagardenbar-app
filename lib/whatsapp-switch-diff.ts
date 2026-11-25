/**
 * @requirement REQ-125 (AC7) — what changed between two switch states, for the
 * audit entry. Lives outside the server-actions file: a `'use server'` file may
 * only export async functions.
 */
import type { WhatsAppSwitchSettings } from '@/lib/whatsapp-send-gate';

/** Keys whose value differs, as `{ key, before, after }` (missing means ON). */
export function diffSwitches(
  before: WhatsAppSwitchSettings,
  after: WhatsAppSwitchSettings
): Array<{ key: string; before: boolean; after: boolean }> {
  const changes: Array<{ key: string; before: boolean; after: boolean }> = [];
  if (before.masterEnabled !== after.masterEnabled) {
    changes.push({
      key: 'master',
      before: before.masterEnabled,
      after: after.masterEnabled,
    });
  }
  const keys = new Set([
    ...Object.keys(before.switches),
    ...Object.keys(after.switches),
  ]);
  for (const key of keys) {
    const b = before.switches[key] ?? true;
    const a = after.switches[key] ?? true;
    if (a !== b) changes.push({ key, before: b, after: a });
  }
  return changes;
}
