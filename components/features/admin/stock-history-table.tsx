'use client';

import { format } from 'date-fns';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Edit, ArrowRight, ArrowRightLeft } from 'lucide-react';

interface StockHistoryEntry {
  quantity: number;
  type: 'addition' | 'deduction' | 'adjustment' | 'transfer';
  reason: string;
  category?: string;
  timestamp: string;
  performedByName?: string;
  notes?: string;
  supplier?: string;
  invoiceNumber?: string;
  location?: string;
  fromLocation?: string;
  toLocation?: string;
  transferReference?: string;
}

interface Location {
  id: string;
  name: string;
  type: string;
  isActive: boolean;
  displayOrder: number;
}

interface Props {
  history: StockHistoryEntry[];
  unit: string;
  locations?: Location[];
}

/**
 * Stock history table component
 * Displays all stock movements with details
 */
export function StockHistoryTable({ history, unit, locations = [] }: Props) {
  // Function to get location name by ID
  const getLocationName = (id?: string): string => {
    if (!id) return '';
    const location = locations.find(loc => loc.id === id);
    return location?.name || id; // Return name if found, otherwise return the ID
  };
  if (!history || history.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No stock movements recorded yet
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date & Time</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Quantity</TableHead>
            <TableHead>Location</TableHead>
            <TableHead>Reason</TableHead>
            <TableHead>Performed By</TableHead>
            <TableHead>Details</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {history.map((entry, index) => (
            <TableRow key={index}>
              <TableCell className="font-medium">
                {format(new Date(entry.timestamp), 'MMM dd, yyyy HH:mm')}
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  {entry.type === 'addition' && (
                    <>
                      <TrendingUp className="h-4 w-4 text-green-600" />
                      <Badge variant="default" className="bg-green-600">
                        Addition
                      </Badge>
                    </>
                  )}
                  {entry.type === 'deduction' && (
                    <>
                      <TrendingDown className="h-4 w-4 text-red-600" />
                      <Badge variant="destructive">Deduction</Badge>
                    </>
                  )}
                  {entry.type === 'adjustment' && !entry.fromLocation && (
                    <>
                      <Edit className="h-4 w-4 text-blue-600" />
                      <Badge variant="secondary">Adjustment</Badge>
                    </>
                  )}
                  {entry.fromLocation && entry.toLocation && (
                    <>
                      <ArrowRightLeft className="h-4 w-4 text-purple-600" />
                      <Badge variant="secondary" className="bg-purple-600 text-white">
                        Transfer
                      </Badge>
                    </>
                  )}
                </div>
              </TableCell>
              <TableCell>
                <span
                  className={
                    entry.quantity > 0
                      ? 'text-green-600 font-semibold'
                      : 'text-red-600 font-semibold'
                  }
                >
                  {entry.quantity > 0 ? '+' : ''}
                  {entry.quantity} {unit}
                </span>
              </TableCell>
              <TableCell>
                {entry.location && (
                  <div className="font-medium">
                    {getLocationName(entry.location)}
                  </div>
                )}
                {entry.fromLocation && entry.toLocation && (
                  <div className="flex items-center text-sm text-muted-foreground">
                    <span>{getLocationName(entry.fromLocation)}</span>
                    <ArrowRight className="h-3 w-3 mx-1" />
                    <span>{getLocationName(entry.toLocation)}</span>
                  </div>
                )}
              </TableCell>
              <TableCell>
                {entry.reason}
                {entry.category && (
                  <Badge variant="outline" className="ml-2">
                    {entry.category}
                  </Badge>
                )}
              </TableCell>
              <TableCell>{entry.performedByName || 'System'}</TableCell>
              <TableCell>
                <div className="text-sm text-muted-foreground space-y-1">
                  {entry.supplier && <p>Supplier: {entry.supplier}</p>}
                  {entry.invoiceNumber && <p>Invoice: {entry.invoiceNumber}</p>}
                  {entry.notes && <p>{entry.notes}</p>}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
