'use server';

/**
 * @requirement REQ-125 — admin switches for WhatsApp notifications
 * @srs REQ-SETTINGS-007, REQ-WA-016
 *
 * Read and update the WhatsApp notification switches. Admin and super-admin
 * only (customer sessions, customer-scoped keys, csr and kitchen are
 * rejected). Every change is audit-logged with who, which key, before and
 * after (ADR-014). Returns `{ success: false }` instead of redirecting so a
 * client form never gets a redirect for an expired session.
 */
import { revalidatePath } from 'next/cache';
import { getCurrentSession } from '@/lib/auth-middleware';
import { getPrimaryRole, hasPermission } from '@/lib/roles';
import { SystemSettingsService } from '@/services/system-settings-service';
import { AuditLogService } from '@/services/audit-log-service';
import type { WhatsAppSwitchSettings } from '@/lib/whatsapp-send-gate';

interface Result<T = undefined> {
  success: boolean;
  message?: string;
  data?: T;
}

const NOT_ALLOWED = { success: false, message: 'Not allowed.' } as const;

async function adminContext() {
  const session = await getCurrentSession();
  if (
    !session?.isLoggedIn ||
    !session.userId ||
    !hasPermission(session, ['admin', 'super-admin'])
  ) {
    return null;
  }
  return session;
}

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

export async function getWhatsAppNotificationSwitchesAction(): Promise<
  Result<WhatsAppSwitchSettings>
> {
  if (!(await adminContext())) return NOT_ALLOWED;
  const data = await SystemSettingsService.getWhatsAppNotificationSwitches();
  return { success: true, data };
}

export async function updateWhatsAppNotificationSwitchesAction(
  next: unknown
): Promise<Result<WhatsAppSwitchSettings>> {
  const session = await adminContext();
  if (!session) return NOT_ALLOWED;

  const { before, after } =
    await SystemSettingsService.updateWhatsAppNotificationSwitches(
      next,
      session.userId as string
    );

  const changes = diffSwitches(before, after);
  if (changes.length > 0) {
    try {
      await AuditLogService.createLog({
        userId: session.userId as string,
        userEmail: session.email || '',
        userRole: getPrimaryRole(session) || '',
        action: 'settings.whatsapp_notification_switches_updated',
        resource: 'system-settings',
        resourceId: 'whatsapp-notification-switches',
        details: { changes },
      });
    } catch (error) {
      // The setting is saved; an audit write failure must not hide that.
      console.error(
        '[WhatsAppSwitches] audit log failed:',
        error instanceof Error ? error.message : String(error)
      );
    }
  }

  revalidatePath('/dashboard/settings');
  return { success: true, data: after };
}
