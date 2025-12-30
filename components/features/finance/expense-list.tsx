'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import {
  MoreHorizontal,
  Pencil,
  Trash2,
  Search,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
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

interface Expense {
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
}

export function ExpenseList({ expenses, onEdit, onRefresh, userRole }: ExpenseListProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [deleteExpenseId, setDeleteExpenseId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Get unique categories from expenses
  const categories = Array.from(
    new Set(expenses.map((expense) => expense.category))
  ).sort();

  // Filter expenses
  const filteredExpenses = expenses.filter((expense) => {
    const matchesSearch =
      expense.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      expense.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
      expense.supplier?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesType =
      typeFilter === 'all' || expense.expenseType === typeFilter;

    const matchesCategory =
      categoryFilter === 'all' || expense.category === categoryFilter;

    return matchesSearch && matchesType && matchesCategory;
  });

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
  };

  const hasActiveFilters =
    searchTerm !== '' || typeFilter !== 'all' || categoryFilter !== 'all';

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 items-center gap-2">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search expenses..."
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
              <SelectItem value="operating-expense">Operating Expense</SelectItem>
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
                <TableCell colSpan={8} className="text-center py-8">
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
                    ₦{expense.amount.toLocaleString('en-NG', {
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
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
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
              Are you sure you want to delete this expense? This action cannot be
              undone.
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
