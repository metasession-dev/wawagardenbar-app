'use client';

/**
 * @requirement REQ-106 - Cash deposits page client.
 */
import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CashDepositForm } from '@/components/features/finance/cash-deposit-form';
import { CashDepositList } from '@/components/features/finance/cash-deposit-list';

interface DepositsClientProps {
  userRole: string;
}

export function DepositsClient({ userRole }: DepositsClientProps) {
  const [showForm, setShowForm] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Cash Deposits</h1>
          <p className="text-muted-foreground">
            Record and track cash moved from the till into the bank.
          </p>
        </div>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Record Deposit
        </Button>
      </div>

      <CashDepositList key={refreshKey} userRole={userRole} />

      <CashDepositForm
        open={showForm}
        onOpenChange={setShowForm}
        onSuccess={() => setRefreshKey((k) => k + 1)}
      />
    </div>
  );
}
