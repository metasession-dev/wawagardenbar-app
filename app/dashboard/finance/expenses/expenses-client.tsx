'use client';

import { useState, useEffect } from 'react';
import { startOfMonth, endOfMonth, subDays } from 'date-fns';
import { Plus, Download, TrendingUp, TrendingDown, DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DatePickerWithRange } from '@/components/ui/date-range-picker';
import { ExpenseForm } from '@/components/features/finance/expense-form';
import { ExpenseList } from '@/components/features/finance/expense-list';
import {
  getExpensesAction,
  getExpenseSummaryAction,
} from '@/app/actions/finance/expense-actions';
import { toast } from '@/hooks/use-toast';
import { DateRange } from 'react-day-picker';

interface ExpensesPageClientProps {
  userRole?: string;
}

export function ExpensesPageClient({ userRole }: ExpensesPageClientProps) {
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date()),
  });
  const [expenses, setExpenses] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [editingExpense, setEditingExpense] = useState<any>(null);

  useEffect(() => {
    if (dateRange?.from && dateRange?.to) {
      fetchData();
    }
  }, [dateRange]);

  const fetchData = async () => {
    if (!dateRange?.from || !dateRange?.to) return;

    setIsLoading(true);
    try {
      // Ensure end date includes the full day (23:59:59.999)
      const endOfDay = new Date(dateRange.to);
      endOfDay.setHours(23, 59, 59, 999);

      const [expensesResult, summaryResult] = await Promise.all([
        getExpensesAction(dateRange.from, endOfDay),
        getExpenseSummaryAction(dateRange.from, endOfDay),
      ]);

      if (expensesResult.success && expensesResult.expenses) {
        setExpenses(expensesResult.expenses);
      }

      if (summaryResult.success && summaryResult.summary) {
        setSummary(summaryResult.summary);
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to fetch expenses',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (expense: any) => {
    setEditingExpense(expense);
    setShowExpenseForm(true);
  };

  const handleFormClose = () => {
    setShowExpenseForm(false);
    setEditingExpense(null);
  };

  const handleFormSuccess = () => {
    fetchData();
  };

  const handleQuickDateRange = (days: number) => {
    const to = new Date();
    const from = subDays(to, days - 1);
    setDateRange({ from, to });
  };

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Direct Costs</CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ₦{summary?.totalDirectCosts?.toLocaleString('en-NG', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              }) || '0.00'}
            </div>
            <p className="text-xs text-muted-foreground">
              Cost of goods sold (COGS)
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Operating Expenses
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ₦{summary?.totalOperatingExpenses?.toLocaleString('en-NG', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              }) || '0.00'}
            </div>
            <p className="text-xs text-muted-foreground">
              Business running costs
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ₦{summary?.totalExpenses?.toLocaleString('en-NG', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              }) || '0.00'}
            </div>
            <p className="text-xs text-muted-foreground">
              {summary?.expenseCount || 0} expense{summary?.expenseCount !== 1 ? 's' : ''}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Actions Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <DatePickerWithRange value={dateRange} onChange={setDateRange} />
          <div className="flex gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleQuickDateRange(7)}
            >
              7D
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleQuickDateRange(30)}
            >
              30D
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                setDateRange({
                  from: startOfMonth(new Date()),
                  to: endOfMonth(new Date()),
                })
              }
            >
              MTD
            </Button>
          </div>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" size="sm" disabled>
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
          <Button onClick={() => setShowExpenseForm(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Expense
          </Button>
        </div>
      </div>

      {/* Expenses List */}
      <Card>
        <CardHeader>
          <CardTitle>Expense Records</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-muted-foreground">Loading expenses...</div>
            </div>
          ) : (
            <ExpenseList
              expenses={expenses}
              onEdit={handleEdit}
              onRefresh={fetchData}
              userRole={userRole}
            />
          )}
        </CardContent>
      </Card>

      {/* Expense Form Dialog */}
      <ExpenseForm
        open={showExpenseForm}
        onOpenChange={handleFormClose}
        onSuccess={handleFormSuccess}
        expense={editingExpense}
      />
    </div>
  );
}
