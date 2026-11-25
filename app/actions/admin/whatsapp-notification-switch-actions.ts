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
import { diffSwitches } from '@/lib/whatsapp-switch-diff';

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
