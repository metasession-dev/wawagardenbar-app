'use client';

import { useEffect, useMemo, useState } from 'react';
import { format } from 'date-fns';
import { MoreHorizontal, Pencil, Trash2, Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from '@/hooks/use-toast';
import { deleteExpenseAction } from '@/app/actions/finance/expense-actions';
import { ExpenseType } from '@/interfaces/expense.interface';
import { matchesExpenseSearch } from '@/lib/expense-search';
import { listAllTagsAction } from '@/app/actions/finance/tag-actions';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

/**
 * @requirement REQ-029 — Extended search fields (notes, referenceNumber) are
 * required on this shape so the shared matchesExpenseSearch predicate can
 * consult them.
 */
export interface Expense {
  _id: string;
  date: Date;
  expenseType: ExpenseType;
  category: string;
  description: string;
  quantity?: number;
  unit?: string;
  amount: number;
  supplier?: string;
  receiptReference?: string;
  referenceNumber?: string;
  notes?: string;
  // REQ-104 — tags carried over from the originating pending-expense line
  // item at transfer time.
  tagIds?: string[];
  // REQ-105 — previously fetched but never surfaced in the edit dialog.
  transactionFee?: number;
  linkedInventoryId?: string;
  pendingGroupId?: string;
  createdAt?: string;
  updatedAt?: string;
  createdBy: {
    firstName: string;
    lastName: string;
    email: string;
  } | null;
}

interface ExpenseListProps {
  expenses: Expense[];
  onEdit: (expense: Expense) => void;
  onRefresh: () => void;
  userRole?: string;
  /**
   * @requirement REQ-032 — controlled selection for the bulk
   * "Create pending group from selected" action. When `selectedIds` is
   * undefined, the checkbox column is hidden (preserves legacy callers).
   */
  selectedIds?: Set<string>;
  onSelectionChange?: (next: Set<string>) => void;
  /**
   * @requirement REQ-107 — reports the currently-filtered subset back to the
   * parent so summary totals can be computed from what's actually shown,
   * not from an unfiltered date-range-only server query.
   */
  onFilteredChange?: (filtered: Expense[]) => void;
}

export function ExpenseList({
  expenses,
  onEdit,
  onRefresh,
  userRole,
  selectedIds,
  onSelectionChange,
  onFilteredChange,
}: ExpenseListProps) {
  const selectionEnabled = selectedIds !== undefined && !!onSelectionChange;
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [deleteExpenseId, setDeleteExpenseId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  // REQ-104 — tag filter: a set of selected tag IDs; empty = no filter.
  const [tagFilter, setTagFilter] = useState<Set<string>>(new Set());
  const [tagNames, setTagNames] = useState<Record<string, string>>({});

  useEffect(() => {
    listAllTagsAction().then((result) => {
      if (result.success && result.tags) {
        const map: Record<string, string> = {};
        for (const t of result.tags as { _id: string; name: string }[]) {
          map[t._id] = t.name;
        }
        setTagNames(map);
      }
    });
  }, []);

  // Get unique categories from expenses
  const categories = Array.from(
    new Set(expenses.map((expense) => expense.category))
  ).sort();

  // REQ-104 — unique tag IDs actually present on the current expense set,
  // mirroring how `categories` above is derived from the data rather than
  // a separate registry fetch.
  const availableTagIds = Array.from(
    new Set(expenses.flatMap((expense) => expense.tagIds ?? []))
  ).sort((a, b) => (tagNames[a] ?? '').localeCompare(tagNames[b] ?? ''));

  // Filter expenses — REQ-029: shared predicate covers description, notes,
  // supplier, receiptReference, referenceNumber, and exact-amount match.
  // `category` is intentionally not in the shared predicate (it has its own
  // dropdown filter below); keep the legacy category-substring fallback so
  // typing a category name in the search still narrows the list as before.
  const filteredExpenses = useMemo(
    () =>
      expenses.filter((expense) => {
        const termLower = searchTerm.toLowerCase();
        const matchesSearch =
          matchesExpenseSearch(expense, searchTerm) ||
          (termLower !== '' &&
            expense.category.toLowerCase().includes(termLower));

        const matchesType =
          typeFilter === 'all' || expense.expenseType === typeFilter;

        const matchesCategory =
          categoryFilter === 'all' || expense.category === categoryFilter;

        const matchesTags =
          tagFilter.size === 0 ||
          (expense.tagIds ?? []).some((id) => tagFilter.has(id));

        return matchesSearch && matchesType && matchesCategory && matchesTags;
      }),
    [expenses, searchTerm, typeFilter, categoryFilter, tagFilter]
  );

  // REQ-107 — keep the parent's summary totals in sync with what's actually
  // filtered/displayed here, instead of an unfiltered date-range-only total.
  useEffect(() => {
    onFilteredChange?.(filteredExpenses);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredExpenses]);

  const handleDelete = async () => {
    if (!deleteExpenseId) return;

    setIsDeleting(true);
    try {
      const result = await deleteExpenseAction(deleteExpenseId);

      if (result.success) {
        toast({
          title: 'Expense deleted',
          description: 'The expense has been deleted successfully.',
        });
        onRefresh();
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to delete expense',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'An unexpected error occurred',
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
      setDeleteExpenseId(null);
    }
  };

  const clearFilters = () => {
    setSearchTerm('');
    setTypeFilter('all');
    setCategoryFilter('all');
    setTagFilter(new Set());
  };

  const hasActiveFilters =
    searchTerm !== '' ||
    typeFilter !== 'all' ||
    categoryFilter !== 'all' ||
    tagFilter.size > 0;

  function toggleTagFilter(tagId: string) {
    setTagFilter((prev) => {
      const next = new Set(prev);
      if (next.has(tagId)) next.delete(tagId);
      else next.add(tagId);
      return next;
    });
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 items-center gap-2">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search description, supplier, reference, amount..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8"
            />
          </div>

          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Expense type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="direct-cost">Direct Cost</SelectItem>
              <SelectItem value="operating-expense">
                Operating Expense
              </SelectItem>
            </SelectContent>
          </Select>

          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map((category) => (
                <SelectItem key={category} value={category}>
                  {category}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* REQ-104 — tag multi-select filter. */}
          {availableTagIds.length > 0 && (
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="h-10 w-[160px] justify-between"
                >
                  Tags
                  {tagFilter.size > 0 && (
                    <Badge variant="secondary" className="ml-2">
                      {tagFilter.size}
                    </Badge>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-56 p-2" align="start">
                <div className="max-h-56 space-y-1 overflow-y-auto">
                  {availableTagIds.map((tagId) => (
                    <label
                      key={tagId}
                      className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent"
                    >
                      <Checkbox
                        checked={tagFilter.has(tagId)}
                        onCheckedChange={() => toggleTagFilter(tagId)}
                      />
                      {tagNames[tagId] ?? tagId}
                    </label>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
          )}

          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="h-10"
            >
              <X className="mr-2 h-4 w-4" />
              Clear
            </Button>
          )}
        </div>
      </div>

      {/* Results count */}
      <div className="text-sm text-muted-foreground">
        Showing {filteredExpenses.length} of {expenses.length} expenses
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              {selectionEnabled && (
                <TableHead className="w-[40px]">
                  <Checkbox
                    aria-label="Select all visible expenses"
                    checked={
                      filteredExpenses.length > 0 &&
                      filteredExpenses.every((e) => selectedIds!.has(e._id))
                    }
                    onCheckedChange={(checked) => {
                      const next = new Set(selectedIds);
                      if (checked) {
                        filteredExpenses.forEach((e) => next.add(e._id));
                      } else {
                        filteredExpenses.forEach((e) => next.delete(e._id));
                      }
                      onSelectionChange!(next);
                    }}
                  />
                </TableHead>
              )}
              <TableHead>Date</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Quantity</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead>Recorded By</TableHead>
              <TableHead className="w-[70px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredExpenses.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={selectionEnabled ? 9 : 8}
                  className="text-center py-8"
                >
                  <div className="text-muted-foreground">
                    {hasActiveFilters
                      ? 'No expenses match your filters'
                      : 'No expenses recorded yet'}
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filteredExpenses.map((expense) => (
                <TableRow key={expense._id}>
                  {selectionEnabled && (
                    <TableCell>
                      <Checkbox
                        aria-label={`Select expense ${expense.description}`}
                        checked={selectedIds!.has(expense._id)}
                        onCheckedChange={(checked) => {
                          const next = new Set(selectedIds);
                          if (checked) {
                            next.add(expense._id);
                          } else {
                            next.delete(expense._id);
                          }
                          onSelectionChange!(next);
                        }}
                      />
                    </TableCell>
                  )}
                  <TableCell className="whitespace-nowrap">
                    {format(new Date(expense.date), 'MMM dd, yyyy')}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        expense.expenseType === 'direct-cost'
                          ? 'default'
                          : 'secondary'
                      }
                    >
                      {expense.expenseType === 'direct-cost'
                        ? 'Direct Cost'
                        : 'Operating'}
                    </Badge>
                  </TableCell>
                  <TableCell className="max-w-[150px] truncate">
                    {expense.category}
                  </TableCell>
                  <TableCell className="max-w-[200px]">
                    <div className="truncate">{expense.description}</div>
                    {expense.supplier && (
                      <div className="text-xs text-muted-foreground truncate">
                        {expense.supplier}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    {expense.quantity && expense.unit
                      ? `${expense.quantity} ${expense.unit}`
                      : '-'}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    ₦
                    {expense.amount.toLocaleString('en-NG', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {expense.createdBy
                      ? `${expense.createdBy.firstName} ${expense.createdBy.lastName}`
                      : 'Unknown User'}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                        >
                          <span className="sr-only">Open menu</span>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        {userRole === 'super-admin' && (
                          <DropdownMenuItem onClick={() => onEdit(expense)}>
                            <Pencil className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                        )}
                        {userRole === 'super-admin' && (
                          <DropdownMenuItem
                            onClick={() => setDeleteExpenseId(expense._id)}
                            className="text-destructive"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        )}
                        {userRole !== 'super-admin' && (
                          <DropdownMenuItem disabled>
                            No actions available
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={deleteExpenseId !== null}
        onOpenChange={(open) => !open && setDeleteExpenseId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Expense</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this expense? This action cannot
              be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
