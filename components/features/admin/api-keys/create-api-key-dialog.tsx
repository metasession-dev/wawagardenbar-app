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
import {
  API_KEY_SCOPE_LABELS,
  API_KEY_ROLE_SCOPES,
  API_KEY_ROLE_LABELS,
  API_KEY_ROLE_DESCRIPTIONS,
} from '@/constants/api-key-scopes';
import { ApiKeyScope, ApiKeyRole } from '@/interfaces/api-key.interface';

const ALL_SCOPES = Object.keys(API_KEY_SCOPE_LABELS) as ApiKeyScope[];
const ALL_ROLES = Object.keys(API_KEY_ROLE_LABELS) as ApiKeyRole[];

const schema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  role: z.string().optional(),
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
  const [showCustomScopes, setShowCustomScopes] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', role: '', scopes: ['menu:read'], rateLimit: 60 },
  });

  const selectedRole = form.watch('role');

  function handleRoleSelect(role: ApiKeyRole): void {
    const scopes = API_KEY_ROLE_SCOPES[role];
    form.setValue('role', role);
    form.setValue('scopes', scopes);
    setShowCustomScopes(false);
  }

  function handleCustomSelect(): void {
    form.setValue('role', '');
    setShowCustomScopes(true);
  }

  async function onSubmit(values: FormValues): Promise<void> {
    setIsSubmitting(true);
    try {
      const role = values.role as ApiKeyRole | undefined;
      const result = await createApiKeyAction({
        name: values.name,
        role: role || undefined,
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
    setShowCustomScopes(false);
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
              <Label>Role</Label>
              <div className="grid gap-2">
                {ALL_ROLES.map((role) => (
                  <button
                    key={role}
                    type="button"
                    onClick={() => handleRoleSelect(role)}
                    className={`rounded-md border p-3 text-left transition-colors ${
                      selectedRole === role
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">
                        {API_KEY_ROLE_LABELS[role]}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {API_KEY_ROLE_SCOPES[role].length} scopes
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {API_KEY_ROLE_DESCRIPTIONS[role]}
                    </p>
                  </button>
                ))}
                <button
                  type="button"
                  onClick={handleCustomSelect}
                  className={`rounded-md border p-3 text-left transition-colors ${
                    showCustomScopes && !selectedRole
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Custom</span>
                    <span className="text-xs text-muted-foreground">
                      Select individual scopes
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Choose exactly which API scopes this key can access
                  </p>
                </button>
              </div>
              {form.formState.errors.scopes && (
                <p className="text-xs text-destructive">{form.formState.errors.scopes.message}</p>
              )}
            </div>

            {showCustomScopes && (
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
              </div>
            )}

            {selectedRole && (
              <div className="rounded-md border bg-muted/50 p-3">
                <p className="mb-2 text-xs font-medium text-muted-foreground">
                  Scopes for {API_KEY_ROLE_LABELS[selectedRole as ApiKeyRole]}:
                </p>
                <div className="flex flex-wrap gap-1">
                  {form.watch('scopes').map((scope) => (
                    <span
                      key={scope}
                      className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary"
                    >
                      {scope}
                    </span>
                  ))}
                </div>
              </div>
            )}

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
