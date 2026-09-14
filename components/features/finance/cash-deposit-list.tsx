'use client';

/**
 * @requirement REQ-106 - Cash deposit list, modeled on
 * pending-expense-group-list.tsx: status-grouped, super-admin-gated
 * Approve/Transfer.
 */
import { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, Clock, Send, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';
import {
  listCashDepositsAction,
  approveCashDepositAction,
  deleteCashDepositAction,
} from '@/app/actions/finance/cash-deposit-actions';
import { CashDepositTransferDialog } from './cash-deposit-transfer-dialog';
import { ICashDeposit } from '@/interfaces/cash-deposit.interface';

interface CashDepositListProps {
  userRole: string;
}

function statusBadge(status: string) {
  if (status === 'approved')
    return (
      <Badge className="bg-green-100 text-green-800 border-green-200">
        Approved
      </Badge>
    );
  if (status === 'transferred')
    return (
      <Badge className="bg-slate-100 text-slate-800 border-slate-200">
        Transferred
      </Badge>
    );
  return (
    <Badge
      variant="outline"
      className="text-amber-700 border-amber-300 bg-amber-50"
    >
      Pending
    </Badge>
  );
}

export function CashDepositList({ userRole }: CashDepositListProps) {
  const isSuperAdmin = userRole === 'super-admin';
  const [deposits, setDeposits] = useState<ICashDeposit[]>([]);
  const [loading, setLoading] = useState(true);
  const [transferOpen, setTransferOpen] = useState(false);
  const [transferDepositId, setTransferDepositId] = useState<string | null>(
    null
  );
  const [transferAmount, setTransferAmount] = useState(0);

  const fetchDeposits = useCallback(async () => {
    setLoading(true);
    const result = await listCashDepositsAction();
    if (result.success && result.deposits) setDeposits(result.deposits);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchDeposits();
  }, [fetchDeposits]);

  async function handleApprove(depositId: string) {
    const result = await approveCashDepositAction(depositId);
    if (result.success) {
      toast({ title: 'Deposit approved' });
      fetchDeposits();
    } else {
      toast({
        title: 'Error',
        description: result.error,
        variant: 'destructive',
      });
    }
  }

  async function handleDelete(depositId: string) {
    const result = await deleteCashDepositAction(depositId);
    if (result.success) {
      toast({ title: 'Deposit deleted' });
      fetchDeposits();
    } else {
      toast({
        title: 'Error',
        description: result.error,
        variant: 'destructive',
      });
    }
  }

  function openTransfer(deposit: ICashDeposit) {
    setTransferDepositId(deposit._id.toString());
    setTransferAmount(deposit.amount);
    setTransferOpen(true);
  }

  if (loading)
    return (
      <div className="py-8 text-center text-muted-foreground">
        Loading cash deposits...
      </div>
    );

  if (deposits.length === 0) {
    return (
      <div className="py-16 text-center text-muted-foreground">
        <Clock className="h-10 w-10 mx-auto mb-3 opacity-30" />
        <p className="text-lg font-medium">No cash deposits</p>
        <p className="text-sm">Recorded deposits will appear here.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {deposits.map((deposit) => (
        <Card key={deposit._id.toString()}>
          <CardContent className="flex items-center justify-between gap-4 py-4">
            <div>
              <p className="font-medium">
                {new Date(deposit.date).toLocaleDateString('en-NG')}
              </p>
              {deposit.reference && (
                <p className="text-sm text-muted-foreground">
                  Ref: {deposit.reference}
                </p>
              )}
              {deposit.notes && (
                <p className="text-sm text-muted-foreground">{deposit.notes}</p>
              )}
            </div>
            <div className="flex items-center gap-2 ml-auto flex-wrap">
              {statusBadge(deposit.status)}
              <span className="text-sm font-semibold">
                ₦
                {deposit.amount.toLocaleString('en-NG', {
                  minimumFractionDigits: 2,
                })}
              </span>
              {deposit.status !== 'transferred' && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-muted-foreground hover:text-destructive"
                  onClick={() => handleDelete(deposit._id.toString())}
                  title="Delete"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
              {isSuperAdmin && deposit.status === 'pending' && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleApprove(deposit._id.toString())}
                >
                  <CheckCircle2 className="h-4 w-4 mr-1" /> Approve
                </Button>
              )}
              {isSuperAdmin && deposit.status === 'approved' && (
                <Button size="sm" onClick={() => openTransfer(deposit)}>
                  <Send className="h-4 w-4 mr-1" /> Confirm Deposit
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ))}

      <CashDepositTransferDialog
        depositId={transferDepositId}
        amount={transferAmount}
        open={transferOpen}
        onOpenChange={setTransferOpen}
        onSuccess={fetchDeposits}
      />
    </div>
  );
}
