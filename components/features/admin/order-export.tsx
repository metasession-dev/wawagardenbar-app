'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { Download, FileText, FileSpreadsheet, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { Order } from '@/stores/order-store';

interface OrderExportProps {
  orders: Order[];
  filename?: string;
}

/**
 * Order export component
 * Export orders to CSV or JSON
 */
export function OrderExport({ orders, filename = 'orders' }: OrderExportProps) {
  const [isExporting, setIsExporting] = useState(false);
  const { toast } = useToast();

  function exportToCSV() {
    setIsExporting(true);
    try {
      // CSV headers
      const headers = [
        'Order Number',
        'Date',
        'Status',
        'Type',
        'Customer Name',
        'Customer Email',
        'Customer Phone',
        'Items',
        'Total',
        'Payment Status',
        'Table Number',
        'Special Instructions',
      ];

      // CSV rows
      const rows = orders.map((order) => [
        order.orderNumber,
        format(new Date(order.createdAt), 'yyyy-MM-dd HH:mm:ss'),
        order.status,
        order.orderType,
        order.customer.name,
        order.customer.email || '',
        order.customer.phone || '',
        order.items
          .map((item: any) => `${item.quantity}x ${item.name}`)
          .join('; '),
        order.total,
        order.paymentStatus || 'pending',
        order.tableNumber || '',
        order.specialInstructions || '',
      ]);

      // Create CSV content
      const csvContent = [
        headers.join(','),
        ...rows.map((row) =>
          row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')
        ),
      ].join('\n');

      // Download file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute(
        'download',
        `${filename}_${format(new Date(), 'yyyy-MM-dd')}.csv`
      );
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast({
        title: 'Success',
        description: `Exported ${orders.length} orders to CSV`,
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to export orders',
        variant: 'destructive',
      });
    } finally {
      setIsExporting(false);
    }
  }

  function exportToJSON() {
    setIsExporting(true);
    try {
      // Create JSON content
      const jsonContent = JSON.stringify(orders, null, 2);

      // Download file
      const blob = new Blob([jsonContent], { type: 'application/json' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute(
        'download',
        `${filename}_${format(new Date(), 'yyyy-MM-dd')}.json`
      );
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast({
        title: 'Success',
        description: `Exported ${orders.length} orders to JSON`,
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to export orders',
        variant: 'destructive',
      });
    } finally {
      setIsExporting(false);
    }
  }

  if (orders.length === 0) {
    return (
      <Button variant="outline" size="sm" disabled>
        <Download className="h-4 w-4 mr-2" />
        Export
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" disabled={isExporting}>
          {isExporting ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Download className="h-4 w-4 mr-2" />
          )}
          Export ({orders.length})
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={exportToCSV}>
          <FileSpreadsheet className="h-4 w-4 mr-2" />
          Export as CSV
        </DropdownMenuItem>
        <DropdownMenuItem onClick={exportToJSON}>
          <FileText className="h-4 w-4 mr-2" />
          Export as JSON
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
