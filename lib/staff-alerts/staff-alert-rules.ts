/**
 * @requirement REQ-122 - Staff notifications, alert numbers and escalation
 * @srs REQ-SETTINGS-006, REQ-WA-014, REQ-DASH-004
 *
 * Pure rules for staff alerts: the per-type rules and their defaults, quiet
 * hours, who can see a notification, and who receives each WhatsApp level.
 * No I/O, so the escalation behaviour is unit-tested with plain data (ADR-011).
 */
import type { StaffRole } from '@/interfaces/user.interface';
import { STAFF_ROLES } from '@/interfaces/user.interface';

export const STAFF_ALERT_TYPES = [
  'order',
  'booking',
  'event',
  'support',
  'refund',
  'system',
] as const;
export type StaffAlertType = (typeof STAFF_ALERT_TYPES)[number];

export interface QuietHours {
  /** "HH:mm" in the business time zone. */
  start: string;
  end: string;
}

export interface StaffAlertRule {
  /** Roles that see the notification in the dashboard. */
  inAppRoles: StaffRole[];
  /** Minutes unacknowledged before the first WhatsApp level. */
  whatsappAfterMinutes: number;
  /** Roles that receive the first WhatsApp level (only when on shift). */
  whatsappRoles: StaffRole[];
  /** Minutes unacknowledged before the escalation level. */
  escalateAfterMinutes: number;
  escalateRoles: StaffRole[];
  /** Users who always see the notification and get the first WhatsApp level. */
  namedUserIds: string[];
  /** WhatsApp is held during quiet hours; in-app alerts continue. */
  quietHours: QuietHours | null;
}

export type StaffAlertRules = Record<StaffAlertType, StaffAlertRule>;

/** REQ-SETTINGS-006 — the defaults from the WA-12 spec. */
export const DEFAULT_STAFF_ALERT_RULES: StaffAlertRules = {
  order: {
    inAppRoles: ['kitchen', 'csr'],
    whatsappAfterMinutes: 5,
    whatsappRoles: ['csr'],
    escalateAfterMinutes: 10,
    escalateRoles: ['manager'],
    namedUserIds: [],
    quietHours: null,
  },
  booking: {
    inAppRoles: ['csr', 'admin'],
    whatsappAfterMinutes: 10,
    whatsappRoles: ['csr'],
    escalateAfterMinutes: 30,
    escalateRoles: ['admin'],
    namedUserIds: [],
    quietHours: null,
  },
  event: {
    inAppRoles: ['csr', 'admin'],
    whatsappAfterMinutes: 10,
    whatsappRoles: ['csr'],
    escalateAfterMinutes: 30,
    escalateRoles: ['admin'],
    namedUserIds: [],
    quietHours: null,
  },
  support: {
    inAppRoles: ['csr'],
    whatsappAfterMinutes: 10,
    whatsappRoles: ['csr'],
    escalateAfterMinutes: 30,
    escalateRoles: ['admin'],
    namedUserIds: [],
    quietHours: null,
  },
  refund: {
    inAppRoles: ['manager'],
    whatsappAfterMinutes: 10,
    whatsappRoles: ['manager'],
    escalateAfterMinutes: 60,
    escalateRoles: ['super-admin'],
    namedUserIds: [],
    quietHours: null,
  },
  system: {
    inAppRoles: ['admin', 'super-admin'],
    whatsappAfterMinutes: 15,
    whatsappRoles: ['admin'],
    escalateAfterMinutes: 60,
    escalateRoles: ['super-admin'],
    namedUserIds: [],
    quietHours: null,
  },
};

function cloneRule(rule: StaffAlertRule): StaffAlertRule {
  return {
    ...rule,
    inAppRoles: [...rule.inAppRoles],
    whatsappRoles: [...rule.whatsappRoles],
    escalateRoles: [...rule.escalateRoles],
    namedUserIds: [...rule.namedUserIds],
    quietHours: rule.quietHours ? { ...rule.quietHours } : null,
  };
}

const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;

function cleanRoles(value: unknown, fallback: StaffRole[]): StaffRole[] {
  if (!Array.isArray(value)) return fallback;
  return value.filter((r): r is StaffRole =>
    (STAFF_ROLES as readonly string[]).includes(r as string)
  );
}

function cleanMinutes(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0
    ? Math.floor(value)
    : fallback;
}

/**
 * REQ-SETTINGS-006 — stored rules over the defaults. Anything missing or
 * invalid falls back to the default for that field, so a partial or corrupt
 * document can never switch alerts off by accident.
 */
export function mergeStaffAlertRules(stored: unknown): StaffAlertRules {
  const out = {} as StaffAlertRules;
  const source =
    stored && typeof stored === 'object'
      ? (stored as Partial<Record<StaffAlertType, Partial<StaffAlertRule>>>)
      : {};
  for (const type of STAFF_ALERT_TYPES) {
    const base = cloneRule(DEFAULT_STAFF_ALERT_RULES[type]);
    const s = source[type];
    if (!s || typeof s !== 'object') {
      out[type] = base;
      continue;
    }
    const q = s.quietHours;
    out[type] = {
      inAppRoles: cleanRoles(s.inAppRoles, base.inAppRoles),
      whatsappAfterMinutes: cleanMinutes(
        s.whatsappAfterMinutes,
        base.whatsappAfterMinutes
      ),
      whatsappRoles: cleanRoles(s.whatsappRoles, base.whatsappRoles),
      escalateAfterMinutes: cleanMinutes(
        s.escalateAfterMinutes,
        base.escalateAfterMinutes
      ),
      escalateRoles: cleanRoles(s.escalateRoles, base.escalateRoles),
      namedUserIds: Array.isArray(s.namedUserIds)
        ? s.namedUserIds.filter((id): id is string => typeof id === 'string')
        : base.namedUserIds,
      quietHours:
        q && HHMM.test(q.start) && HHMM.test(q.end)
          ? { start: q.start, end: q.end }
          : s.quietHours === null
            ? null
            : base.quietHours,
    };
  }
  return out;
}

/** True when `hhmm` is inside the quiet window (which may wrap past midnight). */
export function isInQuietHours(
  quiet: QuietHours | null,
  hhmm: string
): boolean {
  if (!quiet) return false;
  const { start, end } = quiet;
  if (start === end) return false;
  return start < end
    ? hhmm >= start && hhmm < end
    : hhmm >= start || hhmm < end;
}

export interface NotificationAudience {
  targetRoles: readonly string[];
  targetUserIds: readonly string[];
}

export interface StaffViewer {
  id: string;
  roles: readonly string[];
}

/**
 * REQ-DASH-004 — a user sees a notification when any of their roles is a
 * target role, or their id is a target user (any-of roles, ADR-009).
 */
export function canSeeNotification(
  audience: NotificationAudience,
  viewer: StaffViewer
): boolean {
  if (audience.targetUserIds.includes(viewer.id)) return true;
  return viewer.roles.some((role) => audience.targetRoles.includes(role));
}

export interface AlertRecipientCandidate {
  id: string;
  roles: readonly string[];
  alertPhone?: string | null;
  alertPhoneVerified?: boolean;
  alertsEnabled?: boolean;
  onShift?: boolean;
}

function reachable(user: AlertRecipientCandidate): boolean {
  return Boolean(
    user.alertPhone && user.alertPhoneVerified && user.alertsEnabled !== false
  );
}

function holdsAny(user: AlertRecipientCandidate, roles: readonly string[]) {
  return user.roles.some((role) => roles.includes(role));
}

function uniqueById<T extends { id: string }>(users: T[]): T[] {
  const seen = new Set<string>();
  return users.filter((u) => (seen.has(u.id) ? false : (seen.add(u.id), true)));
}

/** Level 1 is the first WhatsApp alert; level 2 is the escalation alert. */
export type EscalationLevel = 1 | 2;

/**
 * REQ-WA-014 — who gets the WhatsApp message for a level.
 *
 * Level 1: on-shift users with a verified number holding a `whatsappRoles`
 * role, plus named users. When nobody qualifies it goes straight to the
 * escalation roles (reachable users, on shift or not).
 * Level 2: reachable users holding an `escalateRoles` role.
 * A user matching several roles appears once.
 */
export function resolveRecipients(
  level: EscalationLevel,
  rule: StaffAlertRule,
  staff: readonly AlertRecipientCandidate[]
): AlertRecipientCandidate[] {
  const escalation = () =>
    uniqueById(
      staff.filter((u) => reachable(u) && holdsAny(u, rule.escalateRoles))
    );
  if (level === 2) return escalation();

  const primary = uniqueById(
    staff.filter(
      (u) =>
        reachable(u) &&
        (rule.namedUserIds.includes(u.id) ||
          (u.onShift === true && holdsAny(u, rule.whatsappRoles)))
    )
  );
  return primary.length > 0 ? primary : escalation();
}

export interface DueLevelsInput {
  currentLevel: number;
  elapsedMinutes: number;
  rule: StaffAlertRule;
  inQuietHours: boolean;
}

/**
 * REQ-WA-014 — the levels due now, each once. Quiet hours hold WhatsApp
 * without advancing the level, so the alert goes out when they end.
 */
export function dueLevels(input: DueLevelsInput): EscalationLevel[] {
  if (input.inQuietHours) return [];
  const due: EscalationLevel[] = [];
  if (
    input.currentLevel < 1 &&
    input.elapsedMinutes >= input.rule.whatsappAfterMinutes
  ) {
    due.push(1);
  }
  if (
    input.currentLevel < 2 &&
    input.elapsedMinutes >= input.rule.escalateAfterMinutes
  ) {
    due.push(2);
  }
  return due;
}

/** Whole minutes an item has waited (REQ-DASH-005). */
export function minutesWaiting(createdAt: Date, now: Date): number {
  return Math.max(0, Math.floor((now.getTime() - createdAt.getTime()) / 60000));
}

/** REQ-DASH-003 — the label shown in the bell and sent as the template's first variable. */
export const STAFF_ALERT_LABELS: Record<StaffAlertType, string> = {
  order: 'New order',
  booking: 'New booking request',
  event: 'New event request',
  support: 'Support message',
  refund: 'Refund request',
  system: 'System alert',
};

/**
 * Dashboard path (without a leading slash) that opens an item. The same path
 * fills the `staff_alert` template's URL button (`/dashboard/{{1}}`).
 */
export function staffAlertPath(type: StaffAlertType, refId: string): string {
  switch (type) {
    case 'order':
    case 'refund':
      return `orders/${refId}`;
    case 'support':
      return `support/${refId}`;
    case 'booking':
    case 'event':
      return `bookings/${refId}`;
    case 'system':
      return 'incidents';
  }
}
