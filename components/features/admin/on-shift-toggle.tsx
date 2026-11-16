/**
 * @requirement REQ-122 - On-shift toggle
 * @srs REQ-DASH-006
 *
 * Beside the bell. On shift decides who gets the first WhatsApp alert, and it
 * only counts for a member with a verified alert number.
 */
'use client';

import Link from 'next/link';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  getMyAlertSettingsAction,
  setOnShiftAction,
} from '@/app/actions/staff-notifications/staff-notification-actions';

const KEY = ['staff-alert-settings'] as const;

export function OnShiftToggle() {
  const queryClient = useQueryClient();
  const { data } = useQuery({
    queryKey: KEY,
    queryFn: async () => {
      const res = await getMyAlertSettingsAction();
      return res.success ? (res.data ?? null) : null;
    },
  });
  if (!data) return null;

  return (
    <div className="flex items-center gap-2">
      <Switch
        id="on-shift"
        checked={data.onShift}
        aria-label="On shift"
        data-testid="on-shift-toggle"
        onCheckedChange={async (checked) => {
          const res = await setOnShiftAction(checked);
          if (!res.success) {
            toast.error(res.message ?? 'Could not change your shift.');
          } else if (checked && !data.alertPhoneVerified) {
            toast.message(
              'You are on shift, but WhatsApp alerts need a verified number.',
              {
                action: {
                  label: 'Add number',
                  onClick: () => window.location.assign('/dashboard/account'),
                },
              }
            );
          }
          await queryClient.invalidateQueries({ queryKey: KEY });
        }}
      />
      <Label htmlFor="on-shift" className="cursor-pointer text-sm">
        On shift
      </Label>
      {!data.alertPhoneVerified && (
        <Link
          href="/dashboard/account"
          className="text-xs text-muted-foreground underline"
        >
          Verify number
        </Link>
      )}
    </div>
  );
}
