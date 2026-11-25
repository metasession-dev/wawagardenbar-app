'use client';

/**
 * @requirement REQ-125 — admin switches for WhatsApp notifications
 * @srs REQ-SETTINGS-007
 *
 * Settings, Notifications, "WhatsApp messages": a master switch and one switch
 * per catalogue entry. Every switch shows its purpose, why it matters and what
 * happens if it is off (all three come from the catalogue). The locked
 * messages are listed with the reason. Switching off a high-impact entry, or
 * the master switch, asks for confirmation that repeats the consequence.
 */
import { useState, useTransition } from 'react';
import { Lock } from 'lucide-react';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { updateWhatsAppNotificationSwitchesAction } from '@/app/actions/admin/whatsapp-notification-switch-actions';
import {
  LOCKED_WHATSAPP_TEMPLATES,
  WHATSAPP_NOTIFICATION_CATALOGUE,
  type WhatsAppNotificationEntry,
} from '@/lib/whatsapp-notification-catalogue';
import type { WhatsAppSwitchSettings } from '@/lib/whatsapp-send-gate';

const MASTER_OFF_TEXT =
  'No WhatsApp message will be sent except the locked ones (the sign-in PIN). That includes order updates, payment reminders, support replies and staff alerts, so staff escalation by WhatsApp stops too.';

interface Pending {
  title: string;
  consequence: string;
  apply: () => void;
}

interface Props {
  initialSettings: WhatsAppSwitchSettings;
}

export function WhatsAppNotificationSwitches({ initialSettings }: Props) {
  const [settings, setSettings] = useState(initialSettings);
  const [pending, setPending] = useState<Pending | null>(null);
  const [isSaving, startTransition] = useTransition();
  const { toast } = useToast();

  const isOn = (e: WhatsAppNotificationEntry) =>
    settings.switches[e.key] !== false;

  function save(
    next: WhatsAppSwitchSettings,
    previous: WhatsAppSwitchSettings
  ) {
    setSettings(next);
    startTransition(async () => {
      const result = await updateWhatsAppNotificationSwitchesAction(next);
      if (result.success && result.data) {
        setSettings(result.data);
        toast({ title: 'WhatsApp message settings saved' });
      } else {
        setSettings(previous);
        toast({
          title: 'Could not save the settings',
          description: result.message,
          variant: 'destructive',
        });
      }
    });
  }

  function setMaster(on: boolean) {
    const next = { ...settings, masterEnabled: on };
    const apply = () => save(next, settings);
    if (!on) {
      setPending({
        title: 'Switch off all WhatsApp messages?',
        consequence: MASTER_OFF_TEXT,
        apply,
      });
    } else {
      apply();
    }
  }

  function setEntry(entry: WhatsAppNotificationEntry, on: boolean) {
    const next = {
      ...settings,
      switches: { ...settings.switches, [entry.key]: on },
    };
    const apply = () => save(next, settings);
    if (!on && entry.highImpact) {
      setPending({
        title: `Switch off ${entry.label}?`,
        consequence: entry.ifOff,
        apply,
      });
    } else {
      apply();
    }
  }

  const groups = Array.from(
    new Set(WHATSAPP_NOTIFICATION_CATALOGUE.map((e) => e.group))
  );

  return (
    <Card data-testid="whatsapp-switches">
      <CardHeader>
        <CardTitle>WhatsApp messages</CardTitle>
        <CardDescription>
          Choose which WhatsApp messages the app sends. Each switch says what
          the message is for, why it matters and what happens if you switch it
          off. Changes apply within about 30 seconds and are recorded in the
          audit log.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-start justify-between gap-4 rounded-lg border p-4">
          <div className="space-y-1">
            <p className="text-base font-medium">All WhatsApp messages</p>
            <p className="text-sm text-muted-foreground">
              Master switch. When it is off, only the locked messages below are
              sent and the individual switches are disabled.
            </p>
          </div>
          <Switch
            aria-label="All WhatsApp messages"
            data-testid="whatsapp-master-switch"
            checked={settings.masterEnabled}
            disabled={isSaving}
            onCheckedChange={setMaster}
          />
        </div>

        {!settings.masterEnabled && (
          <div
            role="status"
            data-testid="whatsapp-master-off-banner"
            className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm"
          >
            WhatsApp messages are switched off. Only the locked messages are
            being sent.
          </div>
        )}

        {groups.map((group) => (
          <section key={group} className="space-y-3">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              {group}
            </h3>
            {WHATSAPP_NOTIFICATION_CATALOGUE.filter(
              (e) => e.group === group
            ).map((entry) => (
              <div
                key={entry.key}
                className="flex items-start justify-between gap-4 rounded-lg border p-4"
              >
                <div className="space-y-2 text-sm">
                  <p className="text-base font-medium">{entry.label}</p>
                  <p>
                    <span className="font-medium">What it is for: </span>
                    {entry.purpose}
                  </p>
                  <p>
                    <span className="font-medium">Why it matters: </span>
                    {entry.why}
                  </p>
                  <p>
                    <span className="font-medium">If you switch it off: </span>
                    {entry.ifOff}
                  </p>
                </div>
                <Switch
                  aria-label={entry.label}
                  data-testid={`whatsapp-switch-${entry.key}`}
                  checked={isOn(entry)}
                  disabled={isSaving || !settings.masterEnabled}
                  onCheckedChange={(on) => setEntry(entry, on)}
                />
              </div>
            ))}
          </section>
        ))}

        <section className="space-y-3">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Always on
          </h3>
          {Object.entries(LOCKED_WHATSAPP_TEMPLATES).map(([name, info]) => (
            <div
              key={name}
              data-testid={`whatsapp-locked-${name}`}
              className="flex items-start justify-between gap-4 rounded-lg border bg-muted/40 p-4"
            >
              <div className="space-y-1 text-sm">
                <p className="text-base font-medium">{info.label}</p>
                <p>{info.reason}</p>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Lock className="h-4 w-4" aria-hidden />
                <span>Locked on</span>
                <Switch
                  aria-label={`${info.label} (locked on)`}
                  checked
                  disabled
                />
              </div>
            </div>
          ))}
        </section>
      </CardContent>

      <AlertDialog
        open={pending !== null}
        onOpenChange={(open) => {
          if (!open) setPending(null);
        }}
      >
        <AlertDialogContent data-testid="whatsapp-confirm-dialog">
          <AlertDialogHeader>
            <AlertDialogTitle>{pending?.title}</AlertDialogTitle>
            <AlertDialogDescription>
              {pending?.consequence}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep it on</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                pending?.apply();
                setPending(null);
              }}
            >
              Switch it off
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
