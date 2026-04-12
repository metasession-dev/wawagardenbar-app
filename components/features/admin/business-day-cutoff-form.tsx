'use client';

/**
 * @requirement REQ-025 - Business day cutoff configuration form (super-admin only)
 */
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { updateBusinessDayCutoffAction } from '@/app/dashboard/settings/actions';

interface BusinessDayCutoffFormProps {
  initialCutoff: string;
}

export function BusinessDayCutoffForm({
  initialCutoff,
}: BusinessDayCutoffFormProps) {
  const [cutoff, setCutoff] = useState(initialCutoff);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function handleSave() {
    setSaving(true);
    setError(null);
    setSaved(false);
    const result = await updateBusinessDayCutoffAction(cutoff);
    setSaving(false);
    if (result.success) {
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } else {
      setError(result.error ?? 'Failed to save');
    }
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <Label htmlFor="business-day-cutoff">Cutoff Time (WAT)</Label>
        <p className="text-sm text-muted-foreground">
          Orders and tabs closed <strong>before</strong> this time will prompt
          admin staff to attribute them to the previous business day. After this
          time they are attributed to today.
        </p>
      </div>
      <div className="flex items-center gap-3 max-w-xs">
        <Input
          id="business-day-cutoff"
          type="time"
          value={cutoff}
          onChange={(e) => setCutoff(e.target.value)}
          className="w-36"
        />
        <Button onClick={handleSave} disabled={saving} size="sm">
          {saving ? 'Saving…' : saved ? 'Saved ✓' : 'Save'}
        </Button>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <p className="text-xs text-muted-foreground">
        Current cutoff: <strong>{cutoff}</strong> WAT — admin checkbox is shown
        between <strong>00:00</strong> and <strong>{cutoff}</strong> WAT each
        day.
      </p>
    </div>
  );
}
