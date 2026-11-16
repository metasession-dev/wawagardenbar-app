/**
 * @requirement REQ-122 - Staff alert number with WhatsApp PIN verification and consent
 * @srs REQ-AUTHA-008, REQ-DASH-006
 *
 * A staff member's own account page: save the alert number, receive a WhatsApp
 * code, enter it to verify (which records consent), and switch alerts on or off.
 */
'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  getMyAlertSettingsAction,
  removeMyAlertPhoneAction,
  saveMyAlertPhoneAction,
  sendMyAlertPinAction,
  setMyAlertsEnabledAction,
  verifyMyAlertPinAction,
} from '@/app/actions/staff-notifications/staff-notification-actions';

const KEY = ['staff-alert-settings'] as const;

export function StaffAlertNumberCard() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: KEY,
    queryFn: async () => {
      const res = await getMyAlertSettingsAction();
      return res.success ? (res.data ?? null) : null;
    },
  });
  const [phone, setPhone] = useState('');
  const [pin, setPin] = useState('');
  const [busy, setBusy] = useState(false);

  async function run(
    action: () => Promise<{ success: boolean; message?: string }>
  ) {
    setBusy(true);
    try {
      const res = await action();
      if (res.success) toast.success(res.message ?? 'Done');
      else toast.error(res.message ?? 'Something went wrong');
      await queryClient.invalidateQueries({ queryKey: KEY });
      return res.success;
    } finally {
      setBusy(false);
    }
  }

  if (isLoading || !data) {
    return (
      <Card>
        <CardContent className="py-6 text-sm text-muted-foreground">
          Loading…
        </CardContent>
      </Card>
    );
  }

  return (
    <Card data-testid="alert-number-card">
      <CardHeader>
        <CardTitle>WhatsApp alerts</CardTitle>
        <CardDescription>
          Get a WhatsApp message when an order or a message waits too long. The
          number is used for staff alerts only and is separate from any customer
          account.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {data.alertPhone ? (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <span
                className="text-sm font-medium"
                data-testid="alert-number-value"
              >
                {data.alertPhone}
              </span>
              <span
                className={`rounded-full px-2 py-0.5 text-xs ${
                  data.alertPhoneVerified
                    ? 'bg-green-100 text-green-800'
                    : 'bg-yellow-100 text-yellow-800'
                }`}
                data-testid="alert-number-status"
              >
                {data.alertPhoneVerified ? 'Verified' : 'Not verified'}
              </span>
              <Button
                variant="ghost"
                size="sm"
                disabled={busy}
                onClick={() => void run(removeMyAlertPhoneAction)}
              >
                Remove
              </Button>
            </div>

            {!data.alertPhoneVerified && (
              <div className="space-y-3">
                <Button
                  variant="outline"
                  disabled={busy}
                  onClick={() => void run(sendMyAlertPinAction)}
                >
                  Send me a code on WhatsApp
                </Button>
                <div className="flex items-end gap-2">
                  <div className="space-y-1">
                    <Label htmlFor="alert-pin">6-digit code</Label>
                    <Input
                      id="alert-pin"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      maxLength={6}
                      value={pin}
                      onChange={(e) =>
                        setPin(e.target.value.replace(/\D/g, ''))
                      }
                    />
                  </div>
                  <Button
                    disabled={busy || pin.length !== 6}
                    onClick={async () => {
                      if (await run(() => verifyMyAlertPinAction(pin)))
                        setPin('');
                    }}
                  >
                    {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Verify
                  </Button>
                </div>
              </div>
            )}

            {data.alertPhoneVerified && (
              <div className="flex items-center gap-2">
                <Switch
                  id="alerts-enabled"
                  checked={data.alertsEnabled}
                  disabled={busy}
                  onCheckedChange={(checked) =>
                    void run(() => setMyAlertsEnabledAction(checked))
                  }
                />
                <Label htmlFor="alerts-enabled">Receive WhatsApp alerts</Label>
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-end gap-2">
            <div className="flex-1 space-y-1">
              <Label htmlFor="alert-phone">Your WhatsApp number</Label>
              <Input
                id="alert-phone"
                type="tel"
                placeholder="e.g. 0801 234 5678"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
            <Button
              disabled={busy || phone.trim().length < 10}
              onClick={async () => {
                if (await run(() => saveMyAlertPhoneAction(phone.trim())))
                  setPhone('');
              }}
            >
              Save number
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
