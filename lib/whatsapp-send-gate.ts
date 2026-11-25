/**
 * @requirement REQ-125 — admin switches for WhatsApp notifications
 * @srs REQ-WA-016
 *
 * The one gate in the WhatsApp send path (ADR-014). `WhatsAppService.sendMessage`
 * and the free-form support-reply path in `NotificationService.send` ask
 * `isTemplateSuppressed` before anything is sent.
 *
 * Rules, in order:
 *  1. A locked template (the sign-in PIN) is never suppressed and settings are
 *     not read for it.
 *  2. A template that is in no catalogue entry is never suppressed (a new
 *     template is sent until it is catalogued; the catalogue test prevents that).
 *  3. Settings are read through a short in-process cache. A read failure
 *     sends the message (fail open).
 *  4. The master switch off suppresses every catalogued template; otherwise
 *     only a switched-off entry is suppressed. No saved setting means ON.
 */
import {
  catalogueEntryForTemplate,
  isLockedTemplate,
} from '@/lib/whatsapp-notification-catalogue';

/** `WhatsAppResult.errorCode` for a send the admin has switched off. */
export const SUPPRESSED_ADMIN_DISABLED = 'SUPPRESSED_ADMIN_DISABLED';
/** `NotificationLog.errorCode` recorded for the same send. */
export const SUPPRESSED_LOG_CODE = 'suppressed_admin_disabled';

export interface WhatsAppSwitchSettings {
  masterEnabled: boolean;
  /** Catalogue key to enabled. A missing key means ON. */
  switches: Record<string, boolean>;
}

export const DEFAULT_WHATSAPP_SWITCHES: WhatsAppSwitchSettings = {
  masterEnabled: true,
  switches: {},
};

const CACHE_TTL_MS = 30_000;
let cached: { at: number; value: WhatsAppSwitchSettings } | null = null;

export function invalidateWhatsAppSwitchCache(): void {
  cached = null;
}

async function loadSettings(): Promise<WhatsAppSwitchSettings> {
  const now = Date.now();
  if (cached && now - cached.at < CACHE_TTL_MS) return cached.value;
  // Dynamic import: keeps this module free of the database layer at import
  // time and avoids a cycle through the settings service.
  const { SystemSettingsService } = await import(
    '@/services/system-settings-service'
  );
  const value = await SystemSettingsService.getWhatsAppNotificationSwitches();
  cached = { at: now, value };
  return value;
}

export function isSuppressedBySettings(
  templateName: string,
  settings: WhatsAppSwitchSettings
): boolean {
  if (isLockedTemplate(templateName)) return false;
  const entry = catalogueEntryForTemplate(templateName);
  if (!entry) return false;
  if (settings.masterEnabled === false) return true;
  return settings.switches?.[entry.key] === false;
}

export async function isTemplateSuppressed(
  templateName: string
): Promise<boolean> {
  if (isLockedTemplate(templateName)) return false;
  if (!catalogueEntryForTemplate(templateName)) return false;
  try {
    return isSuppressedBySettings(templateName, await loadSettings());
  } catch (error) {
    console.error(
      '[WhatsAppSendGate] settings read failed, sending:',
      error instanceof Error ? error.message : String(error)
    );
    return false;
  }
}
