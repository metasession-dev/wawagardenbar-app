'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { format } from 'date-fns';
import { Check, X, Trash } from 'lucide-react';
import {
  listUploadedExpensesAction,
  approveUploadedExpenseAction,
  rejectUploadedExpenseAction,
  bulkApproveUploadedExpensesAction,
  bulkDeleteUploadedExpensesAction,
} from '@/app/actions/expenses/csv-import-actions';
import { useToast } from '@/hooks/use-toast';
import { EditUploadedExpenseDialog } from './edit-uploaded-expense-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export function UploadedExpensesList() {
  const [expenses, setExpenses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState<any>(null);
  const [statusFilter, setStatusFilter] = useState<'pending' | 'approved' | 'rejected'>('pending');
  const { toast } = useToast();

  async function fetchExpenses() {
    setLoading(true);
    const result = await listUploadedExpensesAction({ status: statusFilter }, page, 50);
    if (result.success && result.data) {
      setExpenses(result.data.expenses);
      setPagination(result.data.pagination);
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchExpenses();
  }, [page, statusFilter]);

  async function handleApprove(id: string) {
    const result = await approveUploadedExpenseAction(id);
    if (result.success) {
      toast({ title: 'Success', description: result.message });
      fetchExpenses();
    } else {
      toast({ title: 'Error', description: result.error, variant: 'destructive' });
    }
  }

  async function handleBulkApprove() {
    if (selectedIds.length === 0) return;
    const result = await bulkApproveUploadedExpensesAction(selectedIds);
    if (result.success) {
      toast({ title: 'Success', description: result.message });
      setSelectedIds([]);
      fetchExpenses();
    } else {
      toast({ title: 'Error', description: result.error, variant: 'destructive' });
    }
  }

  async function handleReject(id: string) {
    const result = await rejectUploadedExpenseAction(id);
    if (result.success) {
      toast({ title: 'Success', description: result.message });
      fetchExpenses();
    } else {
      toast({ title: 'Error', description: result.error, variant: 'destructive' });
    }
  }

  async function handleBulkDelete() {
    if (selectedIds.length === 0) return;
    const result = await bulkDeleteUploadedExpensesAction(selectedIds);
    if (result.success) {
      toast({ title: 'Success', description: result.message });
      setSelectedIds([]);
      fetchExpenses();
    } else {
      toast({ title: 'Error', description: result.error, variant: 'destructive' });
    }
  }

  function toggleSelectAll() {
    if (selectedIds.length === expenses.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(expenses.map((e) => e._id));
    }
  }

  function toggleSelect(id: string) {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((selectedId) => selectedId !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  }

  if (loading) {
    return <div>Loading expenses...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium">Status:</label>
          <Select value={statusFilter} onValueChange={(value: any) => setStatusFilter(value)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {selectedIds.length > 0 && statusFilter === 'pending' && (
          <div className="flex gap-2">
            <Button onClick={handleBulkApprove}>
              <Check className="mr-2 h-4 w-4" />
              Approve Selected ({selectedIds.length})
            </Button>
            <Button variant="destructive" onClick={handleBulkDelete}>
              <Trash className="mr-2 h-4 w-4" />
              Delete Selected ({selectedIds.length})
            </Button>
          </div>
        )}
      </div>

      {expenses.length === 0 ? (
        <div className="text-center py-12 border rounded-lg">
          <p className="text-muted-foreground">No {statusFilter} expenses found</p>
        </div>
      ) : (
        <>
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  {statusFilter === 'pending' && (
                    <TableHead className="w-[50px]">
                      <Checkbox
                        checked={selectedIds.length === expenses.length}
                        onCheckedChange={toggleSelectAll}
                      />
                    </TableHead>
                  )}
                  <TableHead>Date</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Fee</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  {statusFilter === 'pending' && <TableHead>Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {expenses.map((expense) => (
                  <TableRow key={expense._id}>
                    {statusFilter === 'pending' && (
                      <TableCell>
                        <Checkbox
                          checked={selectedIds.includes(expense._id)}
                          onCheckedChange={() => toggleSelect(expense._id)}
                        />
                      </TableCell>
                    )}
                    <TableCell>{format(new Date(expense.date), 'MMM dd, yyyy')}</TableCell>
                    <TableCell className="max-w-[300px] truncate">{expense.description}</TableCell>
                    <TableCell>₦{expense.amount.toLocaleString()}</TableCell>
                    <TableCell>₦{expense.transactionFee.toLocaleString()}</TableCell>
                    <TableCell>
                      {expense.category ? (
                        <Badge variant="outline">{expense.category}</Badge>
                      ) : (
                        <span className="text-muted-foreground text-sm">Not set</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {expense.expenseType ? (
                        <Badge variant="outline">{expense.expenseType}</Badge>
                      ) : (
                        <span className="text-muted-foreground text-sm">Not set</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          expense.status === 'approved'
                            ? 'default'
                            : expense.status === 'rejected'
                            ? 'destructive'
                            : 'secondary'
                        }
                      >
                        {expense.status}
                      </Badge>
                    </TableCell>
                    {statusFilter === 'pending' && (
                      <TableCell>
                        <div className="flex gap-2">
                          <EditUploadedExpenseDialog
                            expense={expense}
                            onSuccess={fetchExpenses}
                          />
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleApprove(expense._id)}
                            disabled={!expense.category || !expense.expenseType}
                            title={
                              !expense.category || !expense.expenseType
                                ? 'Set category and type before approving'
                                : 'Approve expense'
                            }
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleReject(expense._id)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {pagination && pagination.pages > 1 && (
            <div className="flex justify-between items-center">
              <p className="text-sm text-muted-foreground">
                Showing {expenses.length} of {pagination.total} expenses
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setPage(page - 1)}
                  disabled={page === 1}
                >
                  Previous
                </Button>
                <span className="flex items-center px-4">
                  Page {page} of {pagination.pages}
                </span>
                <Button
                  variant="outline"
                  onClick={() => setPage(page + 1)}
                  disabled={page === pagination.pages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
