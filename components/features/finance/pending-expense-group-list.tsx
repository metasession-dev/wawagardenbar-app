'use client';

/**
 * @requirement REQ-026 - Pending expense group workflow
 */
import { useState, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import {
  CheckCircle2,
  Clock,
  Edit2,
  ChevronDown,
  ChevronRight,
  CreditCard,
  Layers,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  listPendingExpenseGroupsAction,
  approvePendingExpenseGroupAction,
  assignBatchAction,
  removeBatchAction,
} from '@/app/actions/finance/pending-expense-actions';
import { EditPendingGroupDialog } from './edit-pending-group-dialog';
import { TransferConfirmationDialog } from './transfer-confirmation-dialog';
import { toast } from '@/hooks/use-toast';
import { IPendingExpenseGroup } from '@/interfaces/pending-expense-group.interface';

interface PendingExpenseGroupListProps {
  userRole: string;
}

function statusBadge(status: string) {
  if (status === 'approved')
    return (
      <Badge className="bg-green-100 text-green-800 border-green-200">
        Approved
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

export function PendingExpenseGroupList({
  userRole,
}: PendingExpenseGroupListProps) {
  const isSuperAdmin = userRole === 'super-admin';
  const [groups, setGroups] = useState<IPendingExpenseGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [editingGroup, setEditingGroup] = useState<IPendingExpenseGroup | null>(
    null
  );
  const [transferOpen, setTransferOpen] = useState(false);
  const [transferGroupIds, setTransferGroupIds] = useState<string[]>([]);
  const [transferTotal, setTransferTotal] = useState(0);

  const fetchGroups = useCallback(async () => {
    setLoading(true);
    const result = await listPendingExpenseGroupsAction();
    if (result.success && result.groups) setGroups(result.groups);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchGroups();
  }, [fetchGroups]);

  function toggleExpand(id: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function selectAll() {
    setSelectedIds(new Set(groups.map((g) => g._id.toString())));
  }

  function clearSelection() {
    setSelectedIds(new Set());
  }

  async function handleApprove(groupId: string) {
    const result = await approvePendingExpenseGroupAction(groupId);
    if (result.success) {
      toast({ title: 'Approved', description: 'Expense group approved.' });
      fetchGroups();
    } else {
      toast({
        title: 'Error',
        description: result.error,
        variant: 'destructive',
      });
    }
  }

  async function handleAssignBatch() {
    if (selectedIds.size < 2) {
      toast({
        title: 'Select at least 2 groups to batch',
        variant: 'destructive',
      });
      return;
    }
    const ids = Array.from(selectedIds);
    const batchId = `BATCH-${Date.now()}`;
    const result = await assignBatchAction(ids, batchId);
    if (result.success) {
      toast({
        title: 'Batched',
        description: `${ids.length} groups added to payment batch.`,
      });
      clearSelection();
      fetchGroups();
    } else {
      toast({
        title: 'Error',
        description: result.error,
        variant: 'destructive',
      });
    }
  }

  async function handleRemoveBatch(groupIds: string[]) {
    const result = await removeBatchAction(groupIds);
    if (result.success) {
      toast({ title: 'Removed from batch' });
      fetchGroups();
    } else {
      toast({
        title: 'Error',
        description: result.error,
        variant: 'destructive',
      });
    }
  }

  function openTransferForSelected() {
    // Only pass approved groups — pending ones would fail server-side validation
    const approvedGroups = groups.filter(
      (g) => selectedIds.has(g._id.toString()) && g.status === 'approved'
    );
    const ids = approvedGroups.map((g) => g._id.toString());
    const total = approvedGroups.reduce((sum, g) => sum + g.totalAmount, 0);
    setTransferGroupIds(ids);
    setTransferTotal(total);
    setTransferOpen(true);
  }

  function openTransferForBatch(batchId: string) {
    const batchGroups = groups.filter((g) => g.paymentBatchId === batchId);
    const ids = batchGroups.map((g) => g._id.toString());
    const total = batchGroups.reduce((sum, g) => sum + g.totalAmount, 0);
    setTransferGroupIds(ids);
    setTransferTotal(total);
    setTransferOpen(true);
  }

  function openTransferForSingle(group: IPendingExpenseGroup) {
    setTransferGroupIds([group._id.toString()]);
    setTransferTotal(group.totalAmount);
    setTransferOpen(true);
  }

  if (loading)
    return (
      <div className="py-8 text-center text-muted-foreground">
        Loading pending expenses...
      </div>
    );
  if (groups.length === 0) {
    return (
      <div className="py-16 text-center text-muted-foreground">
        <Clock className="h-10 w-10 mx-auto mb-3 opacity-30" />
        <p className="text-lg font-medium">No pending expenses</p>
        <p className="text-sm">
          Submitted expenses awaiting approval will appear here.
        </p>
      </div>
    );
  }

  // Group by paymentBatchId
  const batches = new Map<string, IPendingExpenseGroup[]>();
  const ungrouped: IPendingExpenseGroup[] = [];
  for (const g of groups) {
    if (g.paymentBatchId) {
      const existing = batches.get(g.paymentBatchId) ?? [];
      batches.set(g.paymentBatchId, [...existing, g]);
    } else {
      ungrouped.push(g);
    }
  }

  const selectedApproved = groups.filter(
    (g) => selectedIds.has(g._id.toString()) && g.status === 'approved'
  );

  return (
    <div className="space-y-4">
      {/* Bulk action bar */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 rounded-lg border bg-muted/50 px-4 py-2.5">
          <span className="text-sm font-medium">
            {selectedIds.size} selected
          </span>
          <div className="flex gap-2 ml-auto">
            {isSuperAdmin && selectedIds.size >= 2 && (
              <Button size="sm" variant="outline" onClick={handleAssignBatch}>
                <Layers className="h-4 w-4 mr-1" /> Create Payment Batch
              </Button>
            )}
            {isSuperAdmin && selectedApproved.length > 0 && (
              <Button size="sm" onClick={openTransferForSelected}>
                <CreditCard className="h-4 w-4 mr-1" /> Confirm Transfer (
                {selectedApproved.length})
              </Button>
            )}
            <Button size="sm" variant="ghost" onClick={clearSelection}>
              <X className="h-4 w-4 mr-1" /> Clear
            </Button>
          </div>
        </div>
      )}

      {/* Payment batches */}
      {Array.from(batches.entries()).map(([batchId, batchGroups]) => {
        const batchTotal = batchGroups.reduce((s, g) => s + g.totalAmount, 0);
        const allApproved = batchGroups.every((g) => g.status === 'approved');
        return (
          <Card key={batchId} className="border-2 border-primary/20">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <Layers className="h-4 w-4 text-primary" />
                  <span className="text-sm font-semibold">Payment Batch</span>
                  <Badge variant="outline" className="text-xs font-mono">
                    {batchId}
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    ({batchGroups.length} groups)
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold">
                    ₦
                    {batchTotal.toLocaleString('en-NG', {
                      minimumFractionDigits: 2,
                    })}
                  </span>
                  {isSuperAdmin && (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          handleRemoveBatch(
                            batchGroups.map((g) => g._id.toString())
                          )
                        }
                      >
                        Ungroup
                      </Button>
                      {allApproved && (
                        <Button
                          size="sm"
                          onClick={() => openTransferForBatch(batchId)}
                        >
                          <CreditCard className="h-4 w-4 mr-1" /> Confirm
                          Transfer
                        </Button>
                      )}
                    </>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0 space-y-2">
              {batchGroups.map((group) => (
                <GroupRow
                  key={group._id.toString()}
                  group={group}
                  expanded={expandedIds.has(group._id.toString())}
                  selected={selectedIds.has(group._id.toString())}
                  isSuperAdmin={isSuperAdmin}
                  onToggleExpand={() => toggleExpand(group._id.toString())}
                  onToggleSelect={() => toggleSelect(group._id.toString())}
                  onEdit={() => setEditingGroup(group)}
                  onApprove={() => handleApprove(group._id.toString())}
                  onTransfer={() => openTransferForSingle(group)}
                />
              ))}
            </CardContent>
          </Card>
        );
      })}

      {/* Ungrouped */}
      {ungrouped.length > 0 && (
        <div className="space-y-2">
          {batches.size > 0 && (
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm font-medium text-muted-foreground">
                Ungrouped
              </span>
              {isSuperAdmin && ungrouped.length > 1 && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={selectAll}
                  className="text-xs h-7"
                >
                  Select all to batch
                </Button>
              )}
            </div>
          )}
          {ungrouped.map((group) => (
            <GroupRow
              key={group._id.toString()}
              group={group}
              expanded={expandedIds.has(group._id.toString())}
              selected={selectedIds.has(group._id.toString())}
              isSuperAdmin={isSuperAdmin}
              onToggleExpand={() => toggleExpand(group._id.toString())}
              onToggleSelect={() => toggleSelect(group._id.toString())}
              onEdit={() => setEditingGroup(group)}
              onApprove={() => handleApprove(group._id.toString())}
              onTransfer={() => openTransferForSingle(group)}
            />
          ))}
        </div>
      )}

      {/* Edit dialog */}
      {editingGroup && (
        <EditPendingGroupDialog
          group={editingGroup}
          open={!!editingGroup}
          onOpenChange={(v) => {
            if (!v) setEditingGroup(null);
          }}
          onSuccess={() => {
            setEditingGroup(null);
            fetchGroups();
          }}
        />
      )}

      {/* Transfer dialog */}
      <TransferConfirmationDialog
        groupIds={transferGroupIds}
        totalAmount={transferTotal}
        open={transferOpen}
        onOpenChange={setTransferOpen}
        onSuccess={fetchGroups}
      />
    </div>
  );
}

// ── GroupRow sub-component ─────────────────────────────────────────────────────

interface GroupRowProps {
  group: IPendingExpenseGroup;
  expanded: boolean;
  selected: boolean;
  isSuperAdmin: boolean;
  onToggleExpand: () => void;
  onToggleSelect: () => void;
  onEdit: () => void;
  onApprove: () => void;
  onTransfer: () => void;
}

function GroupRow({
  group,
  expanded,
  selected,
  isSuperAdmin,
  onToggleExpand,
  onToggleSelect,
  onEdit,
  onApprove,
  onTransfer,
}: GroupRowProps) {
  return (
    <Card className="border shadow-sm">
      <CardContent className="pt-3 pb-3">
        <div className="flex items-center gap-3 flex-wrap">
          <Checkbox
            checked={selected}
            onCheckedChange={onToggleSelect}
            aria-label="Select group"
          />
          <button
            type="button"
            onClick={onToggleExpand}
            className="flex items-center gap-1 text-muted-foreground hover:text-foreground"
          >
            {expanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-medium">
                {format(new Date(group.date), 'dd MMM yyyy')}
              </span>
              <Badge variant="secondary" className="text-xs">
                {group.expenseType === 'direct-cost' ? 'Direct Cost' : 'OpEx'}
              </Badge>
              <span className="text-sm text-muted-foreground">
                {group.category}
              </span>
              <span className="text-xs text-muted-foreground">
                · {group.items.length} item{group.items.length !== 1 ? 's' : ''}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 ml-auto flex-wrap">
            {statusBadge(group.status)}
            <span className="text-sm font-semibold">
              ₦
              {group.totalAmount.toLocaleString('en-NG', {
                minimumFractionDigits: 2,
              })}
            </span>
            <Button size="sm" variant="ghost" onClick={onEdit} title="Edit">
              <Edit2 className="h-4 w-4" />
            </Button>
            {isSuperAdmin && group.status === 'pending' && (
              <Button size="sm" variant="outline" onClick={onApprove}>
                <CheckCircle2 className="h-4 w-4 mr-1" /> Approve
              </Button>
            )}
            {isSuperAdmin && group.status === 'approved' && (
              <Button size="sm" onClick={onTransfer}>
                <CreditCard className="h-4 w-4 mr-1" /> Transfer
              </Button>
            )}
          </div>
        </div>

        {expanded && (
          <div className="mt-3 rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead>Unit</TableHead>
                  <TableHead className="text-right">Unit Cost</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {group.items.map((item, i) => (
                  <TableRow key={i}>
                    <TableCell>{item.description}</TableCell>
                    <TableCell className="text-right">
                      {item.quantity}
                    </TableCell>
                    <TableCell>{item.unit}</TableCell>
                    <TableCell className="text-right">
                      ₦
                      {item.unitCost.toLocaleString('en-NG', {
                        minimumFractionDigits: 2,
                      })}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      ₦
                      {item.totalCost.toLocaleString('en-NG', {
                        minimumFractionDigits: 2,
                      })}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {group.notes && (
              <div className="px-4 py-2 border-t text-sm text-muted-foreground">
                <span className="font-medium">Notes:</span> {group.notes}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
