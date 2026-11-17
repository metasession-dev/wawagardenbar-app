'use server';

/**
 * @requirement REQ-122 - Staff notifications, alert numbers and escalation
 * @srs REQ-DASH-004, REQ-DASH-005, REQ-DASH-006, REQ-AUTHA-008, REQ-SETTINGS-006
 *
 * Server actions behind the dashboard bell, the Needs-attention panel, the
 * on-shift toggle, the staff alert number and the Staff alerts settings. Every
 * action reads the session itself and returns `{ success: false }` rather than
 * redirecting, so a polling client never gets a redirect for an expired
 * session. Reads are scoped to the caller's roles (ADR-009, ADR-011).
 */
import { revalidatePath } from 'next/cache';
import { getCurrentSession } from '@/lib/auth-middleware';
import { getRoles, hasPermission, isStaff } from '@/lib/roles';
import {
  StaffNotificationService,
  type StaffNotificationView,
} from '@/services/staff-notification-service';
import { StaffAlertNumberService } from '@/services/staff-alert-number-service';
import type { StaffAlertRules } from '@/lib/staff-alerts/staff-alert-rules';
import type { StaffViewer } from '@/lib/staff-alerts/staff-alert-rules';

interface Result<T = undefined> {
  success: boolean;
  message?: string;
  data?: T;
}

async function viewerFromSession(): Promise<{
  viewer: StaffViewer;
  userId: string;
  roles: string[];
} | null> {
  const session = await getCurrentSession();
  if (!session?.isLoggedIn || !session.userId || !isStaff(session)) return null;
  const roles = getRoles(session) as string[];
  return {
    viewer: { id: session.userId, roles },
    userId: session.userId,
    roles,
  };
}

const NOT_ALLOWED = { success: false, message: 'Not allowed.' } as const;

// ---- bell and panel ----

export async function listMyNotificationsAction(
  options: { limit?: number; oldestFirst?: boolean } = {}
): Promise<Result<{ items: StaffNotificationView[]; count: number }>> {
  const ctx = await viewerFromSession();
  if (!ctx) return NOT_ALLOWED;
  const [items, count] = await Promise.all([
    StaffNotificationService.listForViewer(ctx.viewer, {
      limit: Math.min(Math.max(options.limit ?? 50, 1), 100),
      oldestFirst: options.oldestFirst,
    }),
    StaffNotificationService.countForViewer(ctx.viewer),
  ]);
  return { success: true, data: { items, count } };
}

export async function acknowledgeNotificationAction(
  id: string
): Promise<Result> {
  const ctx = await viewerFromSession();
  if (!ctx) return NOT_ALLOWED;
  const ok = await StaffNotificationService.acknowledge(id, ctx.viewer);
  return ok
    ? { success: true }
    : { success: false, message: 'Notification not found.' };
}

export async function acknowledgeAllNotificationsAction(): Promise<
  Result<{ acknowledged: number }>
> {
  const ctx = await viewerFromSession();
  if (!ctx) return NOT_ALLOWED;
  const acknowledged = await StaffNotificationService.acknowledgeAll(
    ctx.viewer
  );
  return { success: true, data: { acknowledged } };
}

/** REQ-DASH-004 — opening the linked item acknowledges it. */
export async function acknowledgeByRefAction(
  refId: string
): Promise<Result<{ acknowledged: number }>> {
  const ctx = await viewerFromSession();
  if (!ctx) return NOT_ALLOWED;
  const acknowledged = await StaffNotificationService.acknowledgeByRef(
    String(refId),
    ctx.viewer
  );
  return { success: true, data: { acknowledged } };
}

// ---- own alert number and shift ----

export async function getMyAlertSettingsAction(): Promise<
  Result<{
    alertPhone: string | null;
    alertPhoneVerified: boolean;
    alertsEnabled: boolean;
    onShift: boolean;
  }>
> {
  const ctx = await viewerFromSession();
  if (!ctx) return NOT_ALLOWED;
  const mine = await StaffAlertNumberService.getMine(ctx.userId);
  return mine ? { success: true, data: mine } : NOT_ALLOWED;
}

export async function setOnShiftAction(onShift: boolean): Promise<Result> {
  const ctx = await viewerFromSession();
  if (!ctx) return NOT_ALLOWED;
  return StaffAlertNumberService.setOnShift(ctx.userId, Boolean(onShift));
}

export async function setMyAlertsEnabledAction(
  enabled: boolean
): Promise<Result> {
  const ctx = await viewerFromSession();
  if (!ctx) return NOT_ALLOWED;
  return StaffAlertNumberService.setAlertsEnabled(ctx.userId, Boolean(enabled));
}

export async function saveMyAlertPhoneAction(phone: string): Promise<Result> {
  const ctx = await viewerFromSession();
  if (!ctx) return NOT_ALLOWED;
  return StaffAlertNumberService.setAlertPhone(ctx.userId, phone);
}

export async function sendMyAlertPinAction(): Promise<Result> {
  const ctx = await viewerFromSession();
  if (!ctx) return NOT_ALLOWED;
  return StaffAlertNumberService.requestVerification(ctx.userId);
}

export async function verifyMyAlertPinAction(pin: string): Promise<Result> {
  const ctx = await viewerFromSession();
  if (!ctx) return NOT_ALLOWED;
  return StaffAlertNumberService.verify(ctx.userId, pin);
}

export async function removeMyAlertPhoneAction(): Promise<Result> {
  const ctx = await viewerFromSession();
  if (!ctx) return NOT_ALLOWED;
  return StaffAlertNumberService.removeAlertPhone(ctx.userId);
}

// ---- admin ----

/** Admins set another staff member's number (unverified); the member verifies it. */
export async function setStaffAlertPhoneAction(
  staffUserId: string,
  phone: string
): Promise<Result> {
  const ctx = await viewerFromSession();
  if (!ctx || !hasPermission({ roles: ctx.roles }, ['admin', 'super-admin'])) {
    return NOT_ALLOWED;
  }
  const result = await StaffAlertNumberService.setAlertPhone(
    staffUserId,
    phone
  );
  if (result.success) revalidatePath('/dashboard/settings/admins');
  return result;
}

export async function getStaffAlertRulesAction(): Promise<
  Result<StaffAlertRules>
> {
  const ctx = await viewerFromSession();
  if (!ctx || !hasPermission({ roles: ctx.roles }, ['admin', 'super-admin'])) {
    return NOT_ALLOWED;
  }
  return { success: true, data: await StaffNotificationService.getRules() };
}

export async function listStaffOptionsAction(): Promise<
  Result<Array<{ id: string; label: string; roles: string[] }>>
> {
  const ctx = await viewerFromSession();
  if (!ctx || !hasPermission({ roles: ctx.roles }, ['admin', 'super-admin'])) {
    return NOT_ALLOWED;
  }
  return {
    success: true,
    data: await StaffNotificationService.listStaffOptions(),
  };
}

export async function updateStaffAlertRulesAction(
  rules: unknown
): Promise<Result<StaffAlertRules>> {
  const ctx = await viewerFromSession();
  if (!ctx || !hasPermission({ roles: ctx.roles }, ['admin', 'super-admin'])) {
    return NOT_ALLOWED;
  }
  const saved = await StaffNotificationService.updateRules(rules, ctx.userId);
  revalidatePath('/dashboard/settings');
  return { success: true, data: saved };
}
