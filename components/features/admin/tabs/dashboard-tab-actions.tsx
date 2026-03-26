'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { CreditCard, CheckCircle2 } from 'lucide-react';
import { AdminPayTabDialog } from './admin-pay-tab-dialog';

interface DashboardTabActionsProps {
  tabId: string;
  tabNumber: string;
  tableNumber: string;
  total: number;
  outstandingBalance: number;
  status: string;
}

/**
 * Client component for tab action buttons on dashboard tab details page
 */
export function DashboardTabActions({
  tabId,
  tabNumber,
  tableNumber,
  total,
  outstandingBalance,
  status,
}: DashboardTabActionsProps) {
  const [showPayDialog, setShowPayDialog] = useState(false);

  if (status === 'closed') {
    return (
      <Button
        size="lg"
        variant="secondary"
        disabled
        className="w-full cursor-not-allowed opacity-80"
      >
        <CheckCircle2 className="mr-2 h-5 w-5 text-green-600" />
        Tab Paid
      </Button>
    );
  }

  if (status !== 'open') {
    return null;
  }

  return (
    <>
      <Button
        size="lg"
        onClick={() => setShowPayDialog(true)}
        className="w-full"
      >
        <CreditCard className="mr-2 h-5 w-5" />
        Customer Wants to Pay Tab
      </Button>

      <AdminPayTabDialog
        tabId={tabId}
        tabNumber={tabNumber}
        tableNumber={tableNumber}
        total={total}
        outstandingBalance={outstandingBalance}
        open={showPayDialog}
        onOpenChange={setShowPayDialog}
      />
    </>
  );
}
