'use client';

import { useEffect, useState } from 'react';
import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * @requirement REQ-061 — Business-hours gate at checkout (P2 #12).
 *
 * Renders a warning + "Schedule for opening" CTA when the bar is closed
 * right now. Reads `/api/settings/business-hours-status` for current
 * open/closed state + next-open suggestion. Renders nothing while the
 * fetch is in flight (no flash of "closed" before the data lands).
 *
 * `onScheduleForOpen(isoLocal)` is called when the customer clicks the
 * CTA — parent should set the pickupTime form value to the suggested
 * slot.
 */
interface BusinessHoursBannerProps {
  onScheduleForOpen?: (isoLocal: string) => void;
}

interface BusinessHoursStatus {
  isOpen: boolean;
  nextOpenIso: string | null;
  message: string;
}

export function BusinessHoursBanner({
  onScheduleForOpen,
}: BusinessHoursBannerProps) {
  const [status, setStatus] = useState<BusinessHoursStatus | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/settings/business-hours-status')
      .then((res) => (res.ok ? res.json() : null))
      .then((body) => {
        if (cancelled || !body?.success || !body.data) return;
        setStatus(body.data);
      })
      .catch(() => {
        // Fail-open: don't show the banner on fetch failure
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!status || status.isOpen) {
    return null;
  }

  return (
    <div className="mb-4 rounded-lg border border-yellow-200 bg-yellow-50 p-4 dark:border-yellow-900 dark:bg-yellow-950">
      <div className="flex gap-3">
        <AlertCircle className="h-5 w-5 flex-shrink-0 text-yellow-600 dark:text-yellow-400 mt-0.5" />
        <div className="flex-1 space-y-2">
          <p className="text-sm font-medium text-yellow-900 dark:text-yellow-100">
            We&apos;re closed right now
          </p>
          <p className="text-sm text-yellow-800 dark:text-yellow-200">
            {status.message}
          </p>
          {status.nextOpenIso && onScheduleForOpen && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onScheduleForOpen(status.nextOpenIso!)}
              className="border-yellow-300 hover:bg-yellow-100 dark:border-yellow-700 dark:hover:bg-yellow-900"
            >
              Schedule for opening
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
