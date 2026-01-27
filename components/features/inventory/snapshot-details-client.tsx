'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { ArrowLeft, CheckCircle, XCircle, AlertTriangle, Edit, Save, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import {
  approveSnapshotAction,
  rejectSnapshotAction,
  updateSnapshotItemsAction,
} from '@/app/actions/inventory/snapshot-actions';
import type { IInventorySnapshot, IInventorySnapshotItem } from '@/interfaces/inventory-snapshot.interface';

interface SnapshotDetailsClientProps {
  snapshot: IInventorySnapshot;
}

export function SnapshotDetailsClient({ snapshot: initialSnapshot }: SnapshotDetailsClientProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [snapshot, setSnapshot] = useState(initialSnapshot);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editedItems, setEditedItems] = useState<IInventorySnapshotItem[]>(initialSnapshot.items);
  const [isApproveDialogOpen, setIsApproveDialogOpen] = useState(false);
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
  const [notes, setNotes] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const currentItems = isEditMode ? editedItems : snapshot.items;
  const totalItems = currentItems.length;
  const noChangeItems = currentItems.filter((i) => !i.staffConfirmed && i.staffAdjustedCount === undefined).length;
  const confirmedItems = currentItems.filter((i) => i.staffConfirmed && i.staffAdjustedCount === undefined).length;
  const adjustmentItems = currentItems.filter((i) => i.staffAdjustedCount !== undefined).length;

  function handleEditToggle() {
    if (isEditMode) {
      // Cancel editing
      setEditedItems(snapshot.items);
      setIsEditMode(false);
    } else {
      setIsEditMode(true);
    }
  }

  function handleItemChange(menuItemName: string, field: keyof IInventorySnapshotItem, value: any) {
    setEditedItems(prev => prev.map(item => {
      if (item.menuItemName === menuItemName) {
        const updated = { ...item, [field]: value };
        
        // Recalculate discrepancy and requiresAdjustment
        if (field === 'staffAdjustedCount') {
          const adjustedCount = value === '' || value === undefined ? undefined : Number(value);
          updated.staffAdjustedCount = adjustedCount;
          updated.discrepancy = adjustedCount !== undefined ? adjustedCount - item.systemInventoryCount : 0;
          updated.requiresAdjustment = adjustedCount !== undefined;
          updated.staffConfirmed = false;
        } else if (field === 'staffConfirmed') {
          updated.staffConfirmed = value;
          if (value) {
            updated.staffAdjustedCount = undefined;
            updated.discrepancy = 0;
            updated.requiresAdjustment = false;
          }
        }
        
        return updated;
      }
      return item;
    }));
  }

  async function handleSaveChanges() {
    setIsLoading(true);
    try {
      const result = await updateSnapshotItemsAction(snapshot._id, editedItems);
      
      if (result.success && result.data) {
        setSnapshot(result.data);
        setEditedItems(result.data.items);
        setIsEditMode(false);
        toast({
          title: 'Success',
          description: 'Snapshot changes saved successfully',
        });
        router.refresh();
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to save changes',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error saving changes:', error);
      toast({
        title: 'Error',
        description: 'Failed to save changes',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }

  async function handleApprove() {
    setIsLoading(true);
    try {
      const result = await approveSnapshotAction(snapshot._id, notes || undefined);

      if (result.success) {
        toast({
          title: 'Success',
          description: 'Snapshot approved and inventory updated',
        });
        router.push('/dashboard/inventory/snapshots');
        router.refresh();
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to approve snapshot',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error approving snapshot:', error);
      toast({
        title: 'Error',
        description: 'Failed to approve snapshot',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
      setIsApproveDialogOpen(false);
    }
  }

  async function handleReject() {
    if (!notes.trim()) {
      toast({
        title: 'Error',
        description: 'Please provide a reason for rejection',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    try {
      const result = await rejectSnapshotAction(snapshot._id, notes);

      if (result.success) {
        toast({
          title: 'Success',
          description: 'Snapshot rejected',
        });
        router.push('/dashboard/inventory/snapshots');
        router.refresh();
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to reject snapshot',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error rejecting snapshot:', error);
      toast({
        title: 'Error',
        description: 'Failed to reject snapshot',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
      setIsRejectDialogOpen(false);
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

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold">Snapshot Details</h1>
          <p className="text-muted-foreground">
            {format(new Date(snapshot.snapshotDate), 'MMMM dd, yyyy')}
          </p>
        </div>
        {getStatusBadge(snapshot.status)}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Snapshot Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-sm text-muted-foreground">Category</p>
              <Badge variant="outline" className={snapshot.mainCategory === 'food' ? 'bg-orange-50 text-orange-700 border-orange-200' : 'bg-blue-50 text-blue-700 border-blue-200'}>
                {snapshot.mainCategory === 'food' ? 'Food' : 'Drinks'}
              </Badge>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Submitted By</p>
              <p className="font-medium">{snapshot.submittedByName}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Submitted At</p>
              <p className="font-medium">
                {format(new Date(snapshot.submittedAt), 'MMM dd, yyyy HH:mm')}
              </p>
            </div>
            {snapshot.reviewedByName && (
              <>
                <div>
                  <p className="text-sm text-muted-foreground">Reviewed By</p>
                  <p className="font-medium">{snapshot.reviewedByName}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Reviewed At</p>
                  <p className="font-medium">
                    {format(new Date(snapshot.reviewedAt!), 'MMM dd, yyyy HH:mm')}
                  </p>
                </div>
              </>
            )}
            {snapshot.reviewNotes && (
              <div>
                <p className="text-sm text-muted-foreground">Review Notes</p>
                <p className="font-medium">{snapshot.reviewNotes}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Summary Statistics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Total Items</p>
                <p className="text-2xl font-bold">{totalItems}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">No Change</p>
                <p className="text-2xl font-bold text-gray-600">{noChangeItems}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Confirmed (No Change)</p>
                <p className="text-2xl font-bold text-green-600">{confirmedItems}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Adjusted</p>
                <p className="text-2xl font-bold text-amber-600">{adjustmentItems}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {adjustmentItems > 0 && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
              <div>
                <p className="font-medium text-amber-900">
                  {adjustmentItems} item{adjustmentItems !== 1 ? 's' : ''} require inventory
                  adjustment
                </p>
                <p className="text-sm text-amber-700 mt-1">
                  Review the adjusted counts carefully before approving. Approving will update
                  the inventory records.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Inventory Items</CardTitle>
            {snapshot.status === 'pending' && (
              <div className="flex gap-2">
                {isEditMode ? (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleEditToggle}
                      disabled={isLoading}
                    >
                      <X className="h-4 w-4 mr-2" />
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleSaveChanges}
                      disabled={isLoading}
                    >
                      <Save className="h-4 w-4 mr-2" />
                      Save Changes
                    </Button>
                  </>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleEditToggle}
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Edit Snapshot
                  </Button>
                )}
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Menu Item</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">Sales</TableHead>
                  <TableHead className="text-right">System Count</TableHead>
                  {isEditMode && <TableHead className="text-center">Confirm No Change</TableHead>}
                  <TableHead className="text-right">{isEditMode ? 'Adjusted Count (Edit)' : 'Adjusted Count'}</TableHead>
                  <TableHead className="text-right">Discrepancy</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead>{isEditMode ? 'Notes (Edit)' : 'Notes'}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {currentItems.map((item) => {
                  const hasAdjustment = item.staffAdjustedCount !== undefined;
                  const isConfirmed = item.staffConfirmed && !hasAdjustment;
                  const noChange = !item.staffConfirmed && !hasAdjustment;
                  
                  return (
                    <TableRow
                      key={item.menuItemId}
                      className={
                        hasAdjustment ? 'bg-amber-50' : 
                        isConfirmed ? 'bg-green-50' : 
                        noChange ? 'bg-gray-50' : ''
                      }
                    >
                      <TableCell className="font-medium">{item.menuItemName}</TableCell>
                      <TableCell>{item.category}</TableCell>
                      <TableCell className="text-right">{item.todaySalesCount}</TableCell>
                      <TableCell className="text-right">{item.systemInventoryCount}</TableCell>
                      {isEditMode && (
                        <TableCell className="text-center">
                          <Checkbox
                            checked={item.staffConfirmed}
                            onCheckedChange={(checked) => 
                              handleItemChange(item.menuItemName, 'staffConfirmed', checked)
                            }
                            disabled={hasAdjustment}
                          />
                        </TableCell>
                      )}
                      <TableCell className="text-right">
                        {isEditMode ? (
                          <Input
                            type="number"
                            value={item.staffAdjustedCount ?? ''}
                            onChange={(e) => 
                              handleItemChange(item.menuItemName, 'staffAdjustedCount', e.target.value)
                            }
                            className="w-24 text-right"
                            placeholder="-"
                            disabled={item.staffConfirmed}
                          />
                        ) : item.staffAdjustedCount !== undefined ? (
                          <span className="font-medium">{item.staffAdjustedCount}</span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {item.discrepancy !== 0 ? (
                          <span
                            className={`font-medium ${
                              item.discrepancy > 0 ? 'text-green-600' : 'text-red-600'
                            }`}
                          >
                            {item.discrepancy > 0 ? '+' : ''}
                            {item.discrepancy}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">0</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {item.staffAdjustedCount !== undefined ? (
                          <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                            Adjusted
                          </Badge>
                        ) : item.staffConfirmed ? (
                          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                            Confirmed
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-gray-50 text-gray-600 border-gray-200">
                            No change
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {isEditMode ? (
                          <Input
                            value={item.staffNotes || ''}
                            onChange={(e) => 
                              handleItemChange(item.menuItemName, 'staffNotes', e.target.value)
                            }
                            className="w-full"
                            placeholder="Add notes..."
                          />
                        ) : item.staffNotes ? (
                          item.staffNotes
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {snapshot.status === 'pending' && (
        <Card>
          <CardHeader>
            <CardTitle>Review Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              <Button
                onClick={() => setIsApproveDialogOpen(true)}
                disabled={isLoading}
                className="flex-1"
              >
                <CheckCircle className="mr-2 h-4 w-4" />
                Approve Snapshot
              </Button>
              <Button
                variant="destructive"
                onClick={() => setIsRejectDialogOpen(true)}
                disabled={isLoading}
                className="flex-1"
              >
                <XCircle className="mr-2 h-4 w-4" />
                Reject Snapshot
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Dialog open={isApproveDialogOpen} onOpenChange={setIsApproveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve Snapshot</DialogTitle>
            <DialogDescription>
              This will update the inventory records for {adjustmentItems} item
              {adjustmentItems !== 1 ? 's' : ''}. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="approve-notes">Notes (Optional)</Label>
              <Textarea
                id="approve-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add any notes about this approval..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsApproveDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleApprove} disabled={isLoading}>
              {isLoading ? 'Approving...' : 'Approve'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isRejectDialogOpen} onOpenChange={setIsRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Snapshot</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting this snapshot. The staff member will be
              notified.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="reject-notes">Reason for Rejection *</Label>
              <Textarea
                id="reject-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Explain why this snapshot is being rejected..."
                rows={4}
                required
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRejectDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={isLoading || !notes.trim()}
            >
              {isLoading ? 'Rejecting...' : 'Reject'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
