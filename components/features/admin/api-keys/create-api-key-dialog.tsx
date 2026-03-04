'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Copy, Check, AlertTriangle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { createApiKeyAction } from '@/app/actions/admin/api-key-actions';
import { API_KEY_SCOPE_LABELS } from '@/constants/api-key-scopes';
import { ApiKeyScope } from '@/interfaces/api-key.interface';

const ALL_SCOPES = Object.keys(API_KEY_SCOPE_LABELS) as ApiKeyScope[];

const schema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  scopes: z.array(z.string()).min(1, 'At least one scope is required'),
  expiresAt: z.string().optional(),
  rateLimit: z.coerce.number().min(1).max(1000).default(60),
});

type FormValues = z.infer<typeof schema>;

interface CreateApiKeyDialogProps {
  onCreated: () => void;
}

export function CreateApiKeyDialog({ onCreated }: CreateApiKeyDialogProps) {
  const [open, setOpen] = useState(false);
  const [plainKey, setPlainKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', scopes: ['menu:read'], rateLimit: 60 },
  });

  async function onSubmit(values: FormValues): Promise<void> {
    setIsSubmitting(true);
    try {
      const result = await createApiKeyAction({
        name: values.name,
        scopes: values.scopes as ApiKeyScope[],
        expiresAt: values.expiresAt ? new Date(values.expiresAt) : undefined,
        rateLimit: values.rateLimit,
      });

      if (result.success && result.plainKey) {
        setPlainKey(result.plainKey);
        onCreated();
      } else {
        form.setError('root', { message: result.error ?? 'Failed to create key' });
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleCopy(): void {
    if (!plainKey) return;
    navigator.clipboard.writeText(plainKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleClose(): void {
    setOpen(false);
    setPlainKey(null);
    form.reset();
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); else setOpen(true); }}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="mr-2 h-4 w-4" />
          New API Key
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{plainKey ? 'API Key Created' : 'Create API Key'}</DialogTitle>
        </DialogHeader>

        {plainKey ? (
          <div className="space-y-4">
            <Alert className="border-amber-200 bg-amber-50">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-amber-800">
                Copy this key now. It will not be shown again.
              </AlertDescription>
            </Alert>

            <div className="flex items-center gap-2 rounded-md border bg-muted p-3">
              <code className="flex-1 break-all text-xs">{plainKey}</code>
              <Button variant="ghost" size="icon" onClick={handleCopy}>
                {copied ? (
                  <Check className="h-4 w-4 text-green-600" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>

            <Button className="w-full" onClick={handleClose}>
              Done
            </Button>
          </div>
        ) : (
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="name">Key Name</Label>
              <Input
                id="name"
                placeholder="e.g. Mobile App Integration"
                {...form.register('name')}
              />
              {form.formState.errors.name && (
                <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Scopes</Label>
              <div className="grid grid-cols-2 gap-2">
                {ALL_SCOPES.map((scope) => (
                  <div key={scope} className="flex items-center gap-2">
                    <Checkbox
                      id={scope}
                      checked={form.watch('scopes').includes(scope)}
                      onCheckedChange={(checked) => {
                        const current = form.getValues('scopes');
                        form.setValue(
                          'scopes',
                          checked
                            ? [...current, scope]
                            : current.filter((s) => s !== scope)
                        );
                      }}
                    />
                    <Label htmlFor={scope} className="text-xs font-normal">
                      {API_KEY_SCOPE_LABELS[scope]}
                    </Label>
                  </div>
                ))}
              </div>
              {form.formState.errors.scopes && (
                <p className="text-xs text-destructive">{form.formState.errors.scopes.message}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="rateLimit">Rate Limit (req/min)</Label>
                <Input
                  id="rateLimit"
                  type="number"
                  min={1}
                  max={1000}
                  {...form.register('rateLimit')}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="expiresAt">Expires At (optional)</Label>
                <Input
                  id="expiresAt"
                  type="date"
                  min={new Date().toISOString().split('T')[0]}
                  {...form.register('expiresAt')}
                />
              </div>
            </div>

            {form.formState.errors.root && (
              <p className="text-xs text-destructive">{form.formState.errors.root.message}</p>
            )}

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Creating...' : 'Create Key'}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
