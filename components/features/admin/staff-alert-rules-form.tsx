/**
 * @requirement REQ-122 - Staff alert rules in Settings
 * @srs REQ-SETTINGS-006
 *
 * Settings, Notifications, "Staff alerts": per alert type, who sees it in the
 * dashboard, how long before the first WhatsApp message and to whom, how long
 * before escalation and to whom, named users, and quiet hours (WhatsApp is held;
 * in-app alerts continue).
 */
'use client';

import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { updateStaffAlertRulesAction } from '@/app/actions/staff-notifications/staff-notification-actions';
import { STAFF_ROLES, type StaffRole } from '@/interfaces/user.interface';
import {
  STAFF_ALERT_LABELS,
  STAFF_ALERT_TYPES,
  type StaffAlertRule,
  type StaffAlertRules,
  type StaffAlertType,
} from '@/lib/staff-alerts/staff-alert-rules';

interface StaffOption {
  id: string;
  label: string;
  roles: string[];
}

interface RolePickerProps {
  legend: string;
  value: StaffRole[];
  onChange: (roles: StaffRole[]) => void;
  idPrefix: string;
}

function RolePicker({ legend, value, onChange, idPrefix }: RolePickerProps) {
  return (
    <fieldset className="space-y-2">
      <legend className="text-sm font-medium">{legend}</legend>
      <div className="flex flex-wrap gap-4">
        {STAFF_ROLES.map((role) => (
          <div key={role} className="flex items-center gap-2">
            <Checkbox
              id={`${idPrefix}-${role}`}
              checked={value.includes(role)}
              onCheckedChange={(checked) =>
                onChange(
                  checked === true
                    ? [...value, role]
                    : value.filter((r) => r !== role)
                )
              }
            />
            <Label
              htmlFor={`${idPrefix}-${role}`}
              className="text-sm font-normal"
            >
              {role}
            </Label>
          </div>
        ))}
      </div>
    </fieldset>
  );
}

interface StaffAlertRulesFormProps {
  initialRules: StaffAlertRules;
  staff: StaffOption[];
}

export function StaffAlertRulesForm({
  initialRules,
  staff,
}: StaffAlertRulesFormProps) {
  const { toast } = useToast();
  const [rules, setRules] = useState<StaffAlertRules>(initialRules);
  const [saving, setSaving] = useState(false);

  function patch(type: StaffAlertType, changes: Partial<StaffAlertRule>) {
    setRules((prev) => ({ ...prev, [type]: { ...prev[type], ...changes } }));
  }

  async function save() {
    setSaving(true);
    try {
      const res = await updateStaffAlertRulesAction(rules);
      if (res.success && res.data) {
        setRules(res.data);
        toast({ title: 'Staff alert rules saved' });
      } else {
        toast({
          title: res.message ?? 'Could not save the rules',
          variant: 'destructive',
        });
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card data-testid="staff-alert-rules">
      <CardHeader>
        <CardTitle>Staff alerts</CardTitle>
        <CardDescription>
          Who sees each alert in the dashboard, and when a WhatsApp message goes
          to on-shift staff and then to an escalation role. Quiet hours hold the
          WhatsApp messages; in-app alerts continue.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-8">
        {STAFF_ALERT_TYPES.map((type) => {
          const rule = rules[type];
          return (
            <section
              key={type}
              className="space-y-4 rounded-md border p-4"
              aria-label={STAFF_ALERT_LABELS[type]}
            >
              <h3 className="font-medium">{STAFF_ALERT_LABELS[type]}</h3>

              <RolePicker
                legend="Shown in the dashboard to"
                idPrefix={`${type}-inapp`}
                value={rule.inAppRoles}
                onChange={(inAppRoles) => patch(type, { inAppRoles })}
              />

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label htmlFor={`${type}-wa-after`}>
                    WhatsApp after (minutes)
                  </Label>
                  <Input
                    id={`${type}-wa-after`}
                    type="number"
                    min={0}
                    value={rule.whatsappAfterMinutes}
                    onChange={(e) =>
                      patch(type, {
                        whatsappAfterMinutes: Number(e.target.value),
                      })
                    }
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor={`${type}-esc-after`}>
                    Escalate after (minutes)
                  </Label>
                  <Input
                    id={`${type}-esc-after`}
                    type="number"
                    min={0}
                    value={rule.escalateAfterMinutes}
                    onChange={(e) =>
                      patch(type, {
                        escalateAfterMinutes: Number(e.target.value),
                      })
                    }
                  />
                </div>
              </div>

              <RolePicker
                legend="WhatsApp to on-shift"
                idPrefix={`${type}-wa`}
                value={rule.whatsappRoles}
                onChange={(whatsappRoles) => patch(type, { whatsappRoles })}
              />
              <RolePicker
                legend="Escalate to"
                idPrefix={`${type}-esc`}
                value={rule.escalateRoles}
                onChange={(escalateRoles) => patch(type, { escalateRoles })}
              />

              {staff.length > 0 && (
                <fieldset className="space-y-2">
                  <legend className="text-sm font-medium">
                    Always include
                  </legend>
                  <div className="flex flex-wrap gap-4">
                    {staff.map((member) => (
                      <div key={member.id} className="flex items-center gap-2">
                        <Checkbox
                          id={`${type}-named-${member.id}`}
                          checked={rule.namedUserIds.includes(member.id)}
                          onCheckedChange={(checked) =>
                            patch(type, {
                              namedUserIds:
                                checked === true
                                  ? [...rule.namedUserIds, member.id]
                                  : rule.namedUserIds.filter(
                                      (id) => id !== member.id
                                    ),
                            })
                          }
                        />
                        <Label
                          htmlFor={`${type}-named-${member.id}`}
                          className="text-sm font-normal"
                        >
                          {member.label}
                        </Label>
                      </div>
                    ))}
                  </div>
                </fieldset>
              )}

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label htmlFor={`${type}-quiet-start`}>
                    Quiet hours start
                  </Label>
                  <Input
                    id={`${type}-quiet-start`}
                    type="time"
                    value={rule.quietHours?.start ?? ''}
                    onChange={(e) =>
                      patch(type, {
                        quietHours: e.target.value
                          ? {
                              start: e.target.value,
                              end: rule.quietHours?.end ?? '06:00',
                            }
                          : null,
                      })
                    }
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor={`${type}-quiet-end`}>Quiet hours end</Label>
                  <Input
                    id={`${type}-quiet-end`}
                    type="time"
                    value={rule.quietHours?.end ?? ''}
                    disabled={!rule.quietHours}
                    onChange={(e) =>
                      patch(type, {
                        quietHours: rule.quietHours
                          ? {
                              start: rule.quietHours.start,
                              end: e.target.value,
                            }
                          : null,
                      })
                    }
                  />
                </div>
              </div>
            </section>
          );
        })}

        <Button onClick={save} disabled={saving}>
          {saving ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          Save staff alert rules
        </Button>
      </CardContent>
    </Card>
  );
}
