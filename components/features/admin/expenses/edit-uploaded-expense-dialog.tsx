'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Edit } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { updateUploadedExpenseAction } from '@/app/actions/expenses/csv-import-actions';
import { format } from 'date-fns';
import {
  DIRECT_COST_CATEGORIES,
  OPERATING_EXPENSE_CATEGORIES,
} from '@/interfaces/expense.interface';

interface EditUploadedExpenseDialogProps {
  expense: any;
  onSuccess: () => void;
}

export function EditUploadedExpenseDialog({
  expense,
  onSuccess,
}: EditUploadedExpenseDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    date: format(new Date(expense.date), 'yyyy-MM-dd'),
    description: expense.description,
    amount: expense.amount,
    transactionFee: expense.transactionFee,
    expenseType: expense.expenseType || '',
    category: expense.category || '',
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      const result = await updateUploadedExpenseAction(expense._id, {
        date: formData.date,
        description: formData.description,
        amount: Number(formData.amount),
        transactionFee: Number(formData.transactionFee),
        expenseType: formData.expenseType as 'direct-cost' | 'operating-expense',
        category: formData.category,
      });

      if (result.success) {
        toast({
          title: 'Success',
          description: 'Expense updated successfully',
        });
        setOpen(false);
        onSuccess();
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to update expense',
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
      setLoading(false);
    }
  }

  const categories =
    formData.expenseType === 'direct-cost'
      ? DIRECT_COST_CATEGORIES
      : formData.expenseType === 'operating-expense'
      ? OPERATING_EXPENSE_CATEGORIES
      : [];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <Edit className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Uploaded Expense</DialogTitle>
          <DialogDescription>
            Update expense details before approval
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="date">Date</Label>
              <Input
                id="date"
                type="date"
                value={formData.date}
                onChange={(e) =>
                  setFormData({ ...formData, date: e.target.value })
                }
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="amount">Amount (₦)</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.amount}
                  onChange={(e) =>
                    setFormData({ ...formData, amount: Number(e.target.value) })
                  }
                  required
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="transactionFee">Transaction Fee (₦)</Label>
                <Input
                  id="transactionFee"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.transactionFee}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      transactionFee: Number(e.target.value),
                    })
                  }
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="expenseType">Expense Type</Label>
              <Select
                value={formData.expenseType}
                onValueChange={(value) =>
                  setFormData({ ...formData, expenseType: value, category: '' })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select expense type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="direct-cost">Direct Cost</SelectItem>
                  <SelectItem value="operating-expense">
                    Operating Expense
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {formData.expenseType && (
              <div className="grid gap-2">
                <Label htmlFor="category">Category</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) =>
                    setFormData({ ...formData, category: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Original CSV Data Reference */}
            <div className="border-t pt-4">
              <h4 className="text-sm font-medium mb-2">Original CSV Data</h4>
              <div className="text-xs text-muted-foreground space-y-1">
                <p>
                  <span className="font-medium">Transaction Ref:</span>{' '}
                  {expense.referenceNumber}
                </p>
                {expense.originalData?.narration && (
                  <p>
                    <span className="font-medium">Narration:</span>{' '}
                    {expense.originalData.narration}
                  </p>
                )}
                {expense.originalData?.settlementDebit && (
                  <p>
                    <span className="font-medium">Settlement Debit:</span> ₦
                    {expense.originalData.settlementDebit.toLocaleString()}
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
