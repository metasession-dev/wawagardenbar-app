/**
 * @requirement REQ-122 - Opening the linked item acknowledges it
 * @srs REQ-DASH-004
 *
 * Drop into a detail page. When a staff member opens the order or ticket
 * directly (not only through the bell), their alerts for it are acknowledged.
 */
'use client';

import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { acknowledgeByRefAction } from '@/app/actions/staff-notifications/staff-notification-actions';
import { STAFF_NOTIFICATIONS_KEY } from '@/hooks/use-staff-notifications';

export function AcknowledgeOnOpen({ refId }: { refId: string }) {
  const queryClient = useQueryClient();
  useEffect(() => {
    let cancelled = false;
    void acknowledgeByRefAction(refId).then((res) => {
      if (!cancelled && res.success && (res.data?.acknowledged ?? 0) > 0) {
        void queryClient.invalidateQueries({
          queryKey: STAFF_NOTIFICATIONS_KEY,
        });
      }
    });
    return () => {
      cancelled = true;
    };
  }, [refId, queryClient]);
  return null;
}
