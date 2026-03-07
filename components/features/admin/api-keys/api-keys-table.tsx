'use client';

import { useState, useTransition } from 'react';
import { format } from 'date-fns';
import { MoreHorizontal, ShieldOff, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { revokeApiKeyAction, deleteApiKeyAction } from '@/app/actions/admin/api-key-actions';
import { API_KEY_SCOPE_LABELS, API_KEY_ROLE_LABELS } from '@/constants/api-key-scopes';
import { IApiKeyPublic, ApiKeyScope, ApiKeyRole } from '@/interfaces/api-key.interface';
import { toast } from 'sonner';

interface ApiKeysTableProps {
  keys: IApiKeyPublic[];
  onRefresh: () => void;
}

type ConfirmAction = { type: 'revoke' | 'delete'; keyId: string; name: string } | null;

export function ApiKeysTable({ keys, onRefresh }: ApiKeysTableProps) {
  const [confirmAction, setConfirmAction] = useState<ConfirmAction>(null);
  const [isPending, startTransition] = useTransition();

  function handleRevoke(keyId: string): void {
    startTransition(async () => {
      const result = await revokeApiKeyAction(keyId);
      if (result.success) {
        toast.success('API key revoked');
        onRefresh();
      } else {
        toast.error(result.error ?? 'Failed to revoke key');
      }
      setConfirmAction(null);
    });
  }

  function handleDelete(keyId: string): void {
    startTransition(async () => {
      const result = await deleteApiKeyAction(keyId);
      if (result.success) {
        toast.success('API key deleted');
        onRefresh();
      } else {
        toast.error(result.error ?? 'Failed to delete key');
      }
      setConfirmAction(null);
    });
  }

  function isExpired(key: IApiKeyPublic): boolean {
    if (!key.expiresAt) return false;
    return new Date(key.expiresAt) < new Date();
  }

  function getStatusBadge(key: IApiKeyPublic): JSX.Element {
    if (!key.isActive) return <Badge variant="secondary">Revoked</Badge>;
    if (isExpired(key)) return <Badge variant="destructive">Expired</Badge>;
    return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Active</Badge>;
  }

  if (keys.length === 0) {
    return (
      <div className="rounded-md border border-dashed p-8 text-center">
        <p className="text-sm text-muted-foreground">
          No API keys yet. Create one to allow external access.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Prefix</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Scopes</TableHead>
              <TableHead>Rate Limit</TableHead>
              <TableHead>Last Used</TableHead>
              <TableHead>Expires</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {keys.map((key) => (
              <TableRow key={key._id} className={!key.isActive ? 'opacity-50' : undefined}>
                <TableCell className="font-medium">{key.name}</TableCell>
                <TableCell>
                  <code className="rounded bg-muted px-1 py-0.5 text-xs">{key.keyPrefix}…</code>
                </TableCell>
                <TableCell>
                  {key.role ? (
                    <Badge variant="secondary" className="text-xs">
                      {API_KEY_ROLE_LABELS[key.role as ApiKeyRole]}
                    </Badge>
                  ) : (
                    <span className="text-xs text-muted-foreground">Custom</span>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {key.scopes.map((scope) => (
                      <Badge key={scope} variant="outline" className="text-xs">
                        {API_KEY_SCOPE_LABELS[scope as ApiKeyScope]}
                      </Badge>
                    ))}
                  </div>
                </TableCell>
                <TableCell className="text-sm">{key.rateLimit}/min</TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {key.lastUsedAt
                    ? format(new Date(key.lastUsedAt), 'MMM d, yyyy')
                    : 'Never'}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {key.expiresAt
                    ? format(new Date(key.expiresAt), 'MMM d, yyyy')
                    : 'Never'}
                </TableCell>
                <TableCell>{getStatusBadge(key)}</TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4" />
                        <span className="sr-only">Actions</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {key.isActive && (
                        <>
                          <DropdownMenuItem
                            className="text-amber-600"
                            onClick={() =>
                              setConfirmAction({ type: 'revoke', keyId: key._id, name: key.name })
                            }
                          >
                            <ShieldOff className="mr-2 h-4 w-4" />
                            Revoke
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                        </>
                      )}
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={() =>
                          setConfirmAction({ type: 'delete', keyId: key._id, name: key.name })
                        }
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <AlertDialog
        open={confirmAction !== null}
        onOpenChange={(v) => { if (!v) setConfirmAction(null); }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmAction?.type === 'revoke' ? 'Revoke API Key' : 'Delete API Key'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction?.type === 'revoke'
                ? `Revoking "${confirmAction?.name}" will immediately stop all requests using this key. You cannot undo this.`
                : `Permanently deleting "${confirmAction?.name}" will remove it from the database. This cannot be undone.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className={confirmAction?.type === 'delete' ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90' : 'bg-amber-600 hover:bg-amber-700'}
              disabled={isPending}
              onClick={() => {
                if (!confirmAction) return;
                if (confirmAction.type === 'revoke') handleRevoke(confirmAction.keyId);
                else handleDelete(confirmAction.keyId);
              }}
            >
              {isPending
                ? 'Processing...'
                : confirmAction?.type === 'revoke'
                ? 'Revoke Key'
                : 'Delete Key'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
