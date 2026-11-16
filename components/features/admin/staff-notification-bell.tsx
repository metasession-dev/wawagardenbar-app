/**
 * @requirement REQ-122 - Dashboard bell, sound, toast and acknowledge
 * @srs REQ-DASH-004
 *
 * Bell in the dashboard top bar: the caller's unread count, a live list, a
 * sound and a toast for an alert that is new to this user, the count in the
 * tab title, and Acknowledge / Acknowledge all. Opening an item acknowledges it.
 */
'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useQueryClient } from '@tanstack/react-query';
import { Bell } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  STAFF_NOTIFICATIONS_KEY,
  useStaffNotificationSignal,
  useStaffNotifications,
} from '@/hooks/use-staff-notifications';
import {
  acknowledgeAllNotificationsAction,
  acknowledgeNotificationAction,
} from '@/app/actions/staff-notifications/staff-notification-actions';

function ageLabel(minutes: number): string {
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  return `${hours} h ${minutes % 60} min`;
}

export function StaffNotificationBell() {
  const queryClient = useQueryClient();
  const { data } = useStaffNotifications();
  const [open, setOpen] = useState(false);
  const known = useRef<Set<string> | null>(null);
  const baseTitle = useRef<string | null>(null);
  const count = data?.count ?? 0;
  const items = data?.items ?? [];

  useStaffNotificationSignal();

  // Sound and toast only for an item that is new to THIS user: the signal is
  // broadcast to every staff member, but the list is filtered to their roles.
  useEffect(() => {
    if (!data) return;
    const ids = new Set(data.items.map((i) => i.id));
    if (known.current !== null) {
      const fresh = data.items.filter((i) => !known.current!.has(i.id));
      if (fresh.length > 0) {
        try {
          void new Audio('/sounds/new-order.mp3').play().catch(() => {});
        } catch {
          // Autoplay can be blocked until the user interacts; the toast still shows.
        }
        toast(fresh[0].title, {
          description:
            fresh.length > 1 ? `and ${fresh.length - 1} more` : undefined,
          action: {
            label: 'Open',
            onClick: () => window.location.assign(fresh[0].link),
          },
        });
      }
    }
    known.current = ids;
  }, [data]);

  // The unread count in the browser tab title.
  useEffect(() => {
    if (baseTitle.current === null) {
      baseTitle.current = document.title.replace(/^\(\d+\)\s*/, '');
    }
    document.title =
      count > 0 ? `(${count}) ${baseTitle.current}` : baseTitle.current;
    return () => {
      if (baseTitle.current !== null) document.title = baseTitle.current;
    };
  }, [count]);

  const refresh = () =>
    queryClient.invalidateQueries({ queryKey: STAFF_NOTIFICATIONS_KEY });

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          aria-label={`Notifications, ${count} unread`}
          data-testid="staff-bell"
        >
          <Bell className="h-5 w-5" />
          {count > 0 && (
            <span
              data-testid="staff-bell-count"
              className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1 text-xs font-medium text-destructive-foreground"
            >
              {count > 99 ? '99+' : count}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-96 p-0">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <p className="text-sm font-medium">Notifications</p>
          {count > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={async () => {
                await acknowledgeAllNotificationsAction();
                await refresh();
              }}
            >
              Acknowledge all
            </Button>
          )}
        </div>
        {items.length === 0 ? (
          <p className="px-4 py-6 text-center text-sm text-muted-foreground">
            Nothing needs your attention.
          </p>
        ) : (
          <ul
            className="max-h-96 divide-y overflow-y-auto"
            data-testid="staff-bell-list"
          >
            {items.map((item) => (
              <li key={item.id} className="flex items-start gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <Link
                    href={item.link}
                    className="block truncate text-sm font-medium hover:underline"
                    onClick={async () => {
                      // Opening the linked item acknowledges it.
                      setOpen(false);
                      await acknowledgeNotificationAction(item.id);
                      void refresh();
                    }}
                  >
                    {item.title}
                  </Link>
                  <p className="text-xs text-muted-foreground">
                    Waiting {ageLabel(item.minutesWaiting)}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={async () => {
                    await acknowledgeNotificationAction(item.id);
                    await refresh();
                  }}
                >
                  Acknowledge
                </Button>
              </li>
            ))}
          </ul>
        )}
      </PopoverContent>
    </Popover>
  );
}
