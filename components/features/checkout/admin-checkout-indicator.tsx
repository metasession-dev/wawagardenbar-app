'use client';

import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ShieldCheck, Info } from 'lucide-react';

interface AdminCheckoutIndicatorProps {
  currentStep?: string;
}

export function AdminCheckoutIndicator({ currentStep }: AdminCheckoutIndicatorProps) {
  return (
    <div className="space-y-4 mb-6">
      {/* Admin Badge */}
      <div className="flex items-center gap-2">
        <Badge variant="secondary" className="bg-blue-100 text-blue-800 border-blue-200">
          <ShieldCheck className="h-3 w-3 mr-1" />
          Creating Order as Admin
        </Badge>
      </div>

      {/* Contextual Information */}
      <Alert className="border-blue-200 bg-blue-50">
        <Info className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-sm text-blue-900">
          {currentStep === 'Customer Info' && (
            <>
              <strong>Customer Information:</strong> Enter the customer's details (not your own).
            </>
          )}
          {currentStep === 'Order Details' && (
            <>
              <strong>Admin Privileges:</strong> You can select any table without restrictions.
            </>
          )}
          {currentStep === 'Payment Options' && (
            <>
              <strong>Tab Management:</strong> You can create tabs or add to existing tabs for any customer.
            </>
          )}
          {currentStep === 'Payment' && (
            <>
              <strong>Payment Options:</strong> You have access to manual payment entry (cash, transfer, card) or standard gateway.
            </>
          )}
          {!currentStep && (
            <>
              <strong>Admin Mode:</strong> You are creating this order on behalf of a customer. No tab restrictions apply to you.
            </>
          )}
        </AlertDescription>
      </Alert>
    </div>
  );
}
