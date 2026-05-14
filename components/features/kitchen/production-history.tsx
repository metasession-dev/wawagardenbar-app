'use client';

/**
 * REQ-034 — Production history + super-admin Void.
 */
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Ban, Loader2 } from 'lucide-react';
import { voidProductionAction } from '@/app/actions/kitchen/production-actions';
import type { UserRole } from '@/interfaces/user.interface';

interface ProductionRow {
  _id: string;
  recipeId: string;
  performedAt: string;
  performedByName?: string;
  batchCount: number;
  expectedYield: number;
  actualYield: number;
  yieldVariance: number;
  status: 'completed' | 'voided';
  reasonNote?: string;
  ingredientsDeducted: Array<{
    name?: string;
    quantityInInventoryUnit: number;
    inventoryUnitId: string;
  }>;
}

const VOID_WINDOW_MS = 24 * 60 * 60 * 1000;

export function ProductionHistory({
  productions,
  currentRole,
}: {
  productions: ProductionRow[];
  currentRole?: UserRole;
}) {
  const router = useRouter();
  const [voidTarget, setVoidTarget] = useState<ProductionRow | null>(null);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isSuperAdmin = currentRole === 'super-admin';

  function openVoid(row: ProductionRow) {
    setVoidTarget(row);
    setReason('');
    setError(null);
  }

  async function confirmVoid() {
    if (!voidTarget) return;
    setBusy(true);
    setError(null);
    const result = await voidProductionAction({
      productionId: voidTarget._id,
      reasonNote: reason.trim() === '' ? undefined : reason,
    });
    setBusy(false);
    if (!result.success) {
      setError(result.error);
      return;
    }
    setVoidTarget(null);
    router.refresh();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent productions</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>When</TableHead>
              <TableHead>By</TableHead>
              <TableHead>Batches</TableHead>
              <TableHead>Yield (act / exp)</TableHead>
              <TableHead>Variance</TableHead>
              <TableHead>Status</TableHead>
              {isSuperAdmin && (
                <TableHead className="text-right">Actions</TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {productions.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={isSuperAdmin ? 7 : 6}
                  className="text-center text-muted-foreground"
                >
                  No production batches yet.
                </TableCell>
              </TableRow>
            ) : (
              productions.map((p) => {
                const performedAt = new Date(p.performedAt);
                const past24h =
                  Date.now() - performedAt.getTime() > VOID_WINDOW_MS;
                return (
                  <TableRow key={p._id}>
                    <TableCell>
                      {format(performedAt, 'yyyy-MM-dd HH:mm')}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {p.performedByName ?? '—'}
                    </TableCell>
                    <TableCell>{p.batchCount}</TableCell>
                    <TableCell>
                      {p.actualYield} / {p.expectedYield}
                    </TableCell>
                    <TableCell
                      className={
                        p.yieldVariance === 0
                          ? ''
                          : p.yieldVariance > 0
                            ? 'text-green-600'
                            : 'text-destructive'
                      }
                    >
                      {p.yieldVariance > 0 ? '+' : ''}
                      {p.yieldVariance}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          p.status === 'voided' ? 'secondary' : 'default'
                        }
                      >
                        {p.status}
                        {past24h && p.status === 'completed' ? ' • >24h' : ''}
                      </Badge>
                      {p.reasonNote && (
                        <div className="text-xs text-muted-foreground mt-1">
                          {p.reasonNote}
                        </div>
                      )}
                    </TableCell>
                    {isSuperAdmin && (
                      <TableCell className="text-right">
                        {p.status === 'completed' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openVoid(p)}
                          >
                            <Ban className="h-4 w-4 mr-1" /> Void
                          </Button>
                        )}
                      </TableCell>
                    )}
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </CardContent>

      <Dialog
        open={voidTarget !== null}
        onOpenChange={(o) => !o && setVoidTarget(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Void this production?</DialogTitle>
            <DialogDescription>
              Reverses every linked stock movement (audit-preserved). Past the
              24-hour window a reason is required.
            </DialogDescription>
          </DialogHeader>
          {error && (
            <Alert variant="destructive">
              <AlertDescription className="whitespace-pre-line">
                {error}
              </AlertDescription>
            </Alert>
          )}
          <Textarea
            placeholder="Reason (optional within 24h; required after)"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setVoidTarget(null)}
              disabled={busy}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmVoid} disabled={busy}>
              {busy ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Voiding…
                </>
              ) : (
                'Void production'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
