'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { RefreshCw, CheckCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import {
  generateSnapshotDataAction,
  submitSnapshotAction,
  checkExistingSnapshotAction,
  resubmitSnapshotAction,
} from '@/app/actions/inventory/snapshot-actions';
import type { IInventorySnapshotItem, IInventorySnapshot } from '@/interfaces/inventory-snapshot.interface';

interface InventoryItemRow extends IInventorySnapshotItem {
  notes?: string;
}

export function InventorySummaryClient() {
  const router = useRouter();
  const { toast } = useToast();
  const [date, setDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [category, setCategory] = useState<'food' | 'drinks'>('food');
  const [items, setItems] = useState<InventoryItemRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [existingSnapshot, setExistingSnapshot] = useState<IInventorySnapshot | null>(null);

  useEffect(() => {
    checkExistingSnapshot();
  }, [date, category]);

  async function checkExistingSnapshot() {
    const result = await checkExistingSnapshotAction(date, category);
    if (result.success && result.data) {
      setExistingSnapshot(result.data);
      if (result.data.status === 'rejected') {
        setItems(result.data.items);
        toast({
          title: 'Snapshot Rejected',
          description: `This snapshot was rejected. Review the feedback and make adjustments before resubmitting.`,
          variant: 'destructive',
        });
      } else if (result.data.status === 'pending') {
        setItems(result.data.items);
        toast({
          title: 'Snapshot Pending Review',
          description: `A snapshot for ${format(new Date(date), 'MMM dd, yyyy')} is pending review.`,
          variant: 'default',
        });
      } else if (result.data.status === 'approved') {
        setItems(result.data.items);
        toast({
          title: 'Snapshot Approved',
          description: `This snapshot has been approved and cannot be edited.`,
          variant: 'default',
        });
      }
    } else {
      setExistingSnapshot(null);
      setItems([]);
    }
  }

  async function loadSnapshotData() {
    setIsLoading(true);
    try {
      const result = await generateSnapshotDataAction(
        date,
        category
      );

      if (result.success && result.data) {
        setItems(result.data);
        toast({
          title: 'Success',
          description: `Loaded ${result.data.length} items`,
        });
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to load inventory data',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error loading snapshot data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load inventory data',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }

  function handleConfirmToggle(itemId: string, confirmed: boolean) {
    setItems((prev) =>
      prev.map((item) =>
        item.menuItemId === itemId
          ? {
              ...item,
              staffConfirmed: confirmed,
              staffAdjustedCount: confirmed ? undefined : item.staffAdjustedCount,
              requiresAdjustment: !confirmed,
              discrepancy: confirmed ? 0 : item.discrepancy,
            }
          : item
      )
    );
  }

  function handleAdjustedCountChange(itemId: string, value: string) {
    const numValue = value === '' ? undefined : parseInt(value);
    setItems((prev) =>
      prev.map((item) => {
        if (item.menuItemId === itemId) {
          const discrepancy =
            numValue !== undefined ? numValue - item.systemInventoryCount : 0;
          return {
            ...item,
            staffConfirmed: false,
            staffAdjustedCount: numValue,
            requiresAdjustment: numValue !== undefined,
            discrepancy,
          };
        }
        return item;
      })
    );
  }

  function handleNotesChange(itemId: string, notes: string) {
    setItems((prev) =>
      prev.map((item) =>
        item.menuItemId === itemId ? { ...item, staffNotes: notes } : item
      )
    );
  }

  async function handleSubmit() {
    const unprocessedItemsWithSales = items.filter(
      (item) => 
        item.todaySalesCount > 0 && 
        !item.staffConfirmed && 
        item.staffAdjustedCount === undefined
    );

    if (unprocessedItemsWithSales.length > 0) {
      toast({
        title: 'Incomplete Data',
        description: `Please confirm or adjust all items with sales today. ${unprocessedItemsWithSales.length} items with sales remaining.`,
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    try {
      const snapshotData = {
        snapshotDate: date,
        items: items.map((item) => ({
          menuItemId: item.menuItemId,
          menuItemName: item.menuItemName,
          mainCategory: item.mainCategory,
          category: item.category,
          systemInventoryCount: item.systemInventoryCount,
          todaySalesCount: item.todaySalesCount,
          staffConfirmed: item.staffConfirmed,
          staffAdjustedCount: item.staffAdjustedCount,
          staffNotes: item.staffNotes,
          discrepancy: item.discrepancy,
          requiresAdjustment: item.requiresAdjustment,
        })),
      };

      const result = existingSnapshot?.status === 'rejected'
        ? await resubmitSnapshotAction(existingSnapshot._id, snapshotData)
        : await submitSnapshotAction(snapshotData, category);

      if (result.success) {
        toast({
          title: 'Success',
          description: existingSnapshot?.status === 'rejected' 
            ? 'Inventory snapshot resubmitted for review'
            : 'Inventory snapshot submitted for review',
        });
        router.push('/dashboard/orders');
        router.refresh();
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to submit snapshot',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error submitting snapshot:', error);
      toast({
        title: 'Error',
        description: 'Failed to submit snapshot',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }

  // Group items by subcategory for display
  const groupedItems = items.reduce((acc, item) => {
    const subcategory = item.category || 'Uncategorized';
    if (!acc[subcategory]) {
      acc[subcategory] = [];
    }
    acc[subcategory].push(item);
    return acc;
  }, {} as Record<string, InventoryItemRow[]>);

  const itemsWithSales = items.filter((item) => item.todaySalesCount > 0);
  const processedItemsWithSales = itemsWithSales.filter(
    (item) => item.staffConfirmed || item.staffAdjustedCount !== undefined
  ).length;
  const requiredItemsRemaining = itemsWithSales.length - processedItemsWithSales;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Snapshot Configuration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="date">Snapshot Date</Label>
              <Input
                id="date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                max={format(new Date(), 'yyyy-MM-dd')}
                min={format(new Date(Date.now() - 24 * 60 * 60 * 1000), 'yyyy-MM-dd')}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="category">Snapshot Category</Label>
              <Select value={category} onValueChange={(value: any) => setCategory(value)}>
                <SelectTrigger id="category">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="food">Food</SelectItem>
                  <SelectItem value="drinks">Drinks</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground">
                Food and drinks are reviewed separately. You can submit both on the same day.
              </p>
            </div>
          </div>

          {existingSnapshot && (
            <div className="space-y-3">
              <div className={`flex items-center gap-2 p-3 rounded-md ${
                existingSnapshot.status === 'rejected' 
                  ? 'bg-red-50 border border-red-200' 
                  : existingSnapshot.status === 'pending'
                  ? 'bg-blue-50 border border-blue-200'
                  : 'bg-green-50 border border-green-200'
              }`}>
                <AlertCircle className={`h-5 w-5 ${
                  existingSnapshot.status === 'rejected' 
                    ? 'text-red-600' 
                    : existingSnapshot.status === 'pending'
                    ? 'text-blue-600'
                    : 'text-green-600'
                }`} />
                <div className="flex-1">
                  <p className={`text-sm font-medium ${
                    existingSnapshot.status === 'rejected' 
                      ? 'text-red-800' 
                      : existingSnapshot.status === 'pending'
                      ? 'text-blue-800'
                      : 'text-green-800'
                  }`}>
                    {existingSnapshot.status === 'rejected' && 'Snapshot Rejected'}
                    {existingSnapshot.status === 'pending' && 'Snapshot Pending Review'}
                    {existingSnapshot.status === 'approved' && 'Snapshot Approved'}
                  </p>
                  {existingSnapshot.reviewNotes && (
                    <p className={`text-sm mt-1 ${
                      existingSnapshot.status === 'rejected' 
                        ? 'text-red-700' 
                        : existingSnapshot.status === 'pending'
                        ? 'text-blue-700'
                        : 'text-green-700'
                    }`}>
                      <strong>Reviewer Notes:</strong> {existingSnapshot.reviewNotes}
                    </p>
                  )}
                  {existingSnapshot.reviewedByName && (
                    <p className={`text-xs mt-1 ${
                      existingSnapshot.status === 'rejected' 
                        ? 'text-red-600' 
                        : existingSnapshot.status === 'pending'
                        ? 'text-blue-600'
                        : 'text-green-600'
                    }`}>
                      Reviewed by {existingSnapshot.reviewedByName} on {format(new Date(existingSnapshot.reviewedAt!), 'MMM dd, yyyy HH:mm')}
                    </p>
                  )}
                </div>
                <Badge variant="outline" className={`${
                  existingSnapshot.status === 'rejected' 
                    ? 'bg-red-100 text-red-700 border-red-300' 
                    : existingSnapshot.status === 'pending'
                    ? 'bg-blue-100 text-blue-700 border-blue-300'
                    : 'bg-green-100 text-green-700 border-green-300'
                }`}>
                  {existingSnapshot.status.toUpperCase()}
                </Badge>
              </div>
            </div>
          )}

          <Button 
            onClick={loadSnapshotData} 
            disabled={isLoading || (existingSnapshot !== null && existingSnapshot.status !== 'rejected')}
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            {existingSnapshot?.status === 'rejected' ? 'Reload Data' : 'Load Inventory Data'}
          </Button>
        </CardContent>
      </Card>

      {items.length > 0 && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Total Items</p>
                  <p className="text-2xl font-bold">{items.length}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Items with Sales</p>
                  <p className="text-2xl font-bold text-blue-600">{itemsWithSales.length}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Processed (Required)</p>
                  <p className="text-2xl font-bold text-green-600">{processedItemsWithSales}/{itemsWithSales.length}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Remaining (Required)</p>
                  <p className={`text-2xl font-bold ${requiredItemsRemaining > 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {requiredItemsRemaining}
                  </p>
                </div>
              </div>
              {requiredItemsRemaining > 0 && (
                <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
                  <p className="text-sm text-blue-800">
                    <strong>Note:</strong> Only items with sales today are required. Items without sales are optional but can be updated if needed.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Inventory Items ({items.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Menu Item</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead className="text-right">Today&apos;s Sales</TableHead>
                      <TableHead className="text-right">Current Inventory</TableHead>
                      <TableHead className="text-center">Confirmed</TableHead>
                      <TableHead className="text-right">Adjusted Count</TableHead>
                      <TableHead>Notes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Object.entries(groupedItems).map(([subcategory, subcategoryItems]) => (
                      <>
                        <TableRow key={`header-${subcategory}`} className="bg-muted/50">
                          <TableCell colSpan={7} className="font-semibold">
                            {subcategory}
                          </TableCell>
                        </TableRow>
                        {subcategoryItems.map((item) => (
                          <TableRow key={item.menuItemId} className={item.todaySalesCount > 0 ? 'bg-blue-50/30' : ''}>
                            <TableCell>
                              <div>
                                <p className="font-medium">{item.menuItemName}</p>
                                {item.todaySalesCount > 0 && (
                                  <Badge variant="outline" className="mt-1 bg-blue-100 text-blue-700 border-blue-300">
                                    Required
                                  </Badge>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>{item.category}</TableCell>
                            <TableCell className="text-right">
                              <span className={item.todaySalesCount > 0 ? 'font-semibold text-blue-600' : ''}>
                                {item.todaySalesCount}
                              </span>
                            </TableCell>
                            <TableCell className="text-right">{item.systemInventoryCount}</TableCell>
                            <TableCell className="text-center">
                              <Checkbox
                                checked={item.staffConfirmed}
                                onCheckedChange={(checked) =>
                                  handleConfirmToggle(item.menuItemId, checked as boolean)
                                }
                                disabled={existingSnapshot?.status === 'approved' || existingSnapshot?.status === 'pending'}
                              />
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-2">
                                <Input
                                  type="number"
                                  value={item.staffAdjustedCount ?? ''}
                                  onChange={(e) =>
                                    handleAdjustedCountChange(item.menuItemId, e.target.value)
                                  }
                                  placeholder="Adjust"
                                  className="w-24"
                                  disabled={item.staffConfirmed || existingSnapshot?.status === 'approved' || existingSnapshot?.status === 'pending'}
                                />
                                {item.discrepancy !== 0 && item.staffAdjustedCount !== undefined && (
                                  <span
                                    className={`text-xs font-medium min-w-[2rem] text-right ${
                                      item.discrepancy > 0 ? 'text-green-600' : 'text-red-600'
                                    }`}
                                  >
                                    {item.discrepancy > 0 ? '+' : ''}
                                    {item.discrepancy}
                                  </span>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Input
                                type="text"
                                value={item.staffNotes ?? ''}
                                onChange={(e) =>
                                  handleNotesChange(item.menuItemId, e.target.value)
                                }
                                placeholder="Add notes..."
                                disabled={existingSnapshot?.status === 'approved' || existingSnapshot?.status === 'pending'}
                              />
                            </TableCell>
                          </TableRow>
                        ))}
                      </>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <div className="mt-6 flex justify-end">
                <Button 
                  onClick={handleSubmit} 
                  disabled={isLoading || items.length === 0 || existingSnapshot?.status === 'approved' || existingSnapshot?.status === 'pending'}
                >
                  <CheckCircle className="mr-2 h-4 w-4" />
                  {existingSnapshot?.status === 'rejected' ? 'Resubmit for Review' : 'Submit for Review'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
