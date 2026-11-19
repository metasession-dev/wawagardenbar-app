/**
 * @requirement REQ-122 - Staff notifications (ADR-011)
 * @srs REQ-DASH-004, REQ-DASH-005
 *
 * Reads the caller's own unacknowledged notifications through an authenticated,
 * role-scoped action. The socket event is only a signal to refetch; it carries
 * no content (R-66). A 30-second poll covers a dropped socket and a page that
 * was asleep, so an alert is never lost to a missed event.
 */
'use client';

import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getSocket } from '@/lib/socket-client';
import { listMyNotificationsAction } from '@/app/actions/staff-notifications/staff-notification-actions';
import type { StaffNotificationView } from '@/services/staff-notification-service';

export const STAFF_NOTIFICATIONS_KEY = ['staff-notifications'] as const;
const POLL_MS = 30_000;

export interface StaffNotificationsData {
  items: StaffNotificationView[];
  count: number;
}

export function useStaffNotifications(
  options: { oldestFirst?: boolean; limit?: number } = {}
) {
  const { oldestFirst = false, limit = 50 } = options;
  return useQuery<StaffNotificationsData>({
    queryKey: [...STAFF_NOTIFICATIONS_KEY, { oldestFirst, limit }],
    queryFn: async () => {
      const res = await listMyNotificationsAction({ oldestFirst, limit });
      if (!res.success || !res.data) return { items: [], count: 0 };
      return res.data;
    },
    refetchInterval: POLL_MS,
    refetchOnWindowFocus: true,
  });
}

/**
 * Subscribe to the content-free `staff-notification` signal and refetch every
 * notification query when it arrives. Mount once (the dashboard bell does).
 */
export function useStaffNotificationSignal(): void {
  const queryClient = useQueryClient();
  useEffect(() => {
    const socket = getSocket();
    const refresh = () =>
      queryClient.invalidateQueries({ queryKey: STAFF_NOTIFICATIONS_KEY });
    socket.emit('staff-notifications:subscribe');
    socket.on('staff-notification', refresh);
    // A reconnect re-joins the room, which the server forgot.
    socket.on('connect', () => socket.emit('staff-notifications:subscribe'));
    return () => {
      socket.emit('staff-notifications:unsubscribe');
      socket.off('staff-notification', refresh);
    };
  }, [queryClient]);
}
