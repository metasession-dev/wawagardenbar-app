'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Download, Loader2 } from 'lucide-react';

/**
 * @requirement REQ-065 — Self-service data export (#117 P4 #19)
 *
 * Fires GET /api/user/export, builds a Blob from the JSON response,
 * and triggers a browser download. On 429 the toast surfaces the
 * retry-after so the user knows when to try again.
 */
export function DataExportButton() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    setLoading(true);
    try {
      const response = await fetch('/api/user/export');
      if (response.status === 429) {
        const body = await response.json().catch(() => ({}));
        toast({
          title: 'Please wait',
          description:
            typeof body.error === 'string'
              ? body.error
              : 'Rate limit — please wait a moment and try again.',
          variant: 'destructive',
        });
        return;
      }
      if (!response.ok) {
        toast({
          title: 'Export failed',
          description: 'Could not build your export. Please try again.',
          variant: 'destructive',
        });
        return;
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      // Pull filename from Content-Disposition if present; otherwise derive.
      const cd = response.headers.get('content-disposition') ?? '';
      const match = cd.match(/filename="([^"]+)"/);
      a.download = match ? match[1] : 'wawa-data.json';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);

      toast({
        title: 'Download started',
        description: 'Your data export is ready.',
      });
    } catch {
      toast({
        title: 'Export failed',
        description: 'Something went wrong. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button onClick={handleClick} disabled={loading} variant="outline">
      {loading ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      ) : (
        <Download className="mr-2 h-4 w-4" />
      )}
      Download my data
    </Button>
  );
}
