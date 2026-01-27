'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { Eye, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { getSnapshotHistoryAction } from '@/app/actions/inventory/snapshot-actions';
import type { IInventorySnapshot } from '@/interfaces/inventory-snapshot.interface';

export function SnapshotsListClient() {
  const router = useRouter();
  const { toast } = useToast();
  const [snapshots, setSnapshots] = useState<IInventorySnapshot[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>(
    'all'
  );
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'food' | 'drinks'>('all');
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);

  useEffect(() => {
    loadSnapshots();
  }, [statusFilter, categoryFilter, page]);

  async function loadSnapshots() {
    setIsLoading(true);
    try {
      const result = await getSnapshotHistoryAction({
        status: statusFilter === 'all' ? undefined : statusFilter,
        mainCategory: categoryFilter === 'all' ? undefined : categoryFilter,
        page,
        limit: 50,
      });

      if (result.success && result.data) {
        setSnapshots(result.data.snapshots);
        setTotal(result.data.total);
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to load snapshots',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error loading snapshots:', error);
      toast({
        title: 'Error',
        description: 'Failed to load snapshots',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }

  function getStatusBadge(status: string) {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">Pending</Badge>;
      case 'approved':
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Approved</Badge>;
      case 'rejected':
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">Rejected</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  }

  const pendingCount = snapshots.filter((s) => s.status === 'pending').length;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Filter Snapshots</CardTitle>
            {pendingCount > 0 && statusFilter === 'pending' && (
              <Badge variant="destructive">{pendingCount} Pending Review</Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <Select
                value={statusFilter}
                onValueChange={(value: any) => {
                  setStatusFilter(value);
                  setPage(1);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="pending">Pending Only</SelectItem>
                  <SelectItem value="approved">Approved Only</SelectItem>
                  <SelectItem value="rejected">Rejected Only</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1">
              <Select
                value={categoryFilter}
                onValueChange={(value: any) => {
                  setCategoryFilter(value);
                  setPage(1);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Filter by category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="food">Food Only</SelectItem>
                  <SelectItem value="drinks">Drinks Only</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={loadSnapshots} disabled={isLoading}>
              <Filter className="mr-2 h-4 w-4" />
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            Snapshots ({total})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : snapshots.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No snapshots found
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Snapshot Date</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Submitted By</TableHead>
                    <TableHead>Submitted At</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Total Items</TableHead>
                    <TableHead className="text-right">Adjustments</TableHead>
                    <TableHead>Reviewed By</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {snapshots.map((snapshot) => {
                    const adjustmentCount = snapshot.items.filter(
                      (i) => i.requiresAdjustment
                    ).length;
                    return (
                      <TableRow key={snapshot._id}>
                        <TableCell className="font-medium">
                          {format(new Date(snapshot.snapshotDate), 'MMM dd, yyyy')}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={snapshot.mainCategory === 'food' ? 'bg-orange-50 text-orange-700 border-orange-200' : 'bg-blue-50 text-blue-700 border-blue-200'}>
                            {snapshot.mainCategory === 'food' ? 'Food' : 'Drinks'}
                          </Badge>
                        </TableCell>
                        <TableCell>{snapshot.submittedByName}</TableCell>
                        <TableCell>
                          {format(new Date(snapshot.submittedAt), 'MMM dd, yyyy HH:mm')}
                        </TableCell>
                        <TableCell>{getStatusBadge(snapshot.status)}</TableCell>
                        <TableCell className="text-right">{snapshot.items.length}</TableCell>
                        <TableCell className="text-right">
                          {adjustmentCount > 0 ? (
                            <span className="text-amber-600 font-medium">
                              {adjustmentCount}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">0</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {snapshot.reviewedByName || (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              router.push(`/dashboard/inventory/snapshots/${snapshot._id}`)
                            }
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            View
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
