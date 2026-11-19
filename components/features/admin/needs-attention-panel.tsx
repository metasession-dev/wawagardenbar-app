/**
 * @requirement REQ-122 - Needs-attention panel
 * @srs REQ-DASH-005
 *
 * Unacknowledged items the caller can see, oldest first, with the minutes each
 * has waited.
 */
'use client';

import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useStaffNotifications } from '@/hooks/use-staff-notifications';

export function NeedsAttentionPanel() {
  const { data, isLoading } = useStaffNotifications({ oldestFirst: true });
  const items = data?.items ?? [];

  if (!isLoading && items.length === 0) return null;

  return (
    <Card data-testid="needs-attention">
      <CardHeader>
        <CardTitle>Needs attention</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="divide-y">
          {items.map((item) => (
            <li
              key={item.id}
              className="flex items-center justify-between gap-4 py-2"
            >
              <Link
                href={item.link}
                className="truncate text-sm font-medium hover:underline"
              >
                {item.title}
              </Link>
              <span
                className="shrink-0 text-xs text-muted-foreground"
                data-testid="needs-attention-wait"
              >
                {item.minutesWaiting} min waiting
              </span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
