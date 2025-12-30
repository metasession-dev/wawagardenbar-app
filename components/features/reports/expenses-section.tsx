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
import type { DailySummaryReport } from '@/services/financial-report-service';

interface ExpensesSectionProps {
  report: DailySummaryReport;
}

export function ExpensesSection({ report }: ExpensesSectionProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
    }).format(amount);
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      'inventory-purchase': 'bg-blue-500',
      'utilities': 'bg-yellow-500',
      'salaries': 'bg-purple-500',
      'maintenance': 'bg-orange-500',
      'marketing': 'bg-pink-500',
      'transportation': 'bg-green-500',
      'supplies': 'bg-cyan-500',
      'other': 'bg-gray-500',
    };
    return colors[category] || 'bg-gray-500';
  };

  return (
    <div className="space-y-4">
      {/* Direct Costs */}
      <Card>
        <CardHeader>
          <div className="flex flex-col space-y-1.5">
            <CardTitle>Direct Costs (Inventory Purchases)</CardTitle>
            <p className="text-sm text-muted-foreground">
              Cash spent on ingredients and stock. Not deducted from Net Profit (COGS is used instead).
            </p>
          </div>
          <div className="text-2xl font-bold text-blue-600">
            {formatCurrency(report.operatingExpenses.totalDirectCosts)}
          </div>
        </CardHeader>
        <CardContent>
          {report.operatingExpenses.directCosts.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Category</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {report.operatingExpenses.directCosts.map((expense, index) => (
                  <TableRow key={index}>
                    <TableCell>
                      <Badge className={getCategoryColor(expense.category)}>
                        {expense.category.replace('-', ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium">{expense.description}</TableCell>
                    <TableCell className="text-right font-semibold">
                      {formatCurrency(expense.amount)}
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow className="bg-muted/50">
                  <TableCell colSpan={2} className="font-bold">
                    Total Direct Costs
                  </TableCell>
                  <TableCell className="text-right font-bold text-blue-600">
                    {formatCurrency(report.operatingExpenses.totalDirectCosts)}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">
              No direct costs recorded
            </p>
          )}
        </CardContent>
      </Card>

      {/* Operating Costs */}
      <Card>
        <CardHeader>
          <CardTitle>Operating Expenses</CardTitle>
          <div className="text-2xl font-bold text-orange-600">
            {formatCurrency(report.operatingExpenses.totalOperatingExpenses)}
          </div>
        </CardHeader>
        <CardContent>
          {report.operatingExpenses.operatingCosts.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Category</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {report.operatingExpenses.operatingCosts.map((expense, index) => (
                  <TableRow key={index}>
                    <TableCell>
                      <Badge className={getCategoryColor(expense.category)}>
                        {expense.category.replace('-', ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium">{expense.description}</TableCell>
                    <TableCell className="text-right font-semibold">
                      {formatCurrency(expense.amount)}
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow className="bg-muted/50">
                  <TableCell colSpan={2} className="font-bold">
                    Total Operating Expenses
                  </TableCell>
                  <TableCell className="text-right font-bold text-orange-600">
                    {formatCurrency(report.operatingExpenses.totalOperatingExpenses)}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">
              No operating expenses recorded
            </p>
          )}
        </CardContent>
      </Card>

      {/* Total Expenses Summary */}
      <Card className="border-2 border-red-500">
        <CardHeader>
          <div className="flex flex-col space-y-1.5">
            <CardTitle>Total Cash Outflow</CardTitle>
            <p className="text-sm text-muted-foreground">
              Total money spent today (Purchases + Overhead).
            </p>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Direct Costs:</span>
              <span className="font-semibold">
                {formatCurrency(report.operatingExpenses.totalDirectCosts)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Operating Expenses:</span>
              <span className="font-semibold">
                {formatCurrency(report.operatingExpenses.totalOperatingExpenses)}
              </span>
            </div>
            <div className="border-t pt-2 mt-2">
              <div className="flex justify-between items-center">
                <span className="text-lg font-bold">Total Expenses:</span>
                <span className="text-2xl font-bold text-red-600">
                  {formatCurrency(report.operatingExpenses.totalExpenses)}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Expense Breakdown by Category */}
      <Card>
        <CardHeader>
          <CardTitle>Expense Breakdown by Category</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {(() => {
              const allExpenses = [
                ...report.operatingExpenses.directCosts,
                ...report.operatingExpenses.operatingCosts,
              ];
              
              const categoryTotals = allExpenses.reduce((acc, expense) => {
                acc[expense.category] = (acc[expense.category] || 0) + expense.amount;
                return acc;
              }, {} as Record<string, number>);

              const sortedCategories = Object.entries(categoryTotals)
                .sort(([, a], [, b]) => b - a);

              return sortedCategories.length > 0 ? (
                sortedCategories.map(([category, total]) => {
                  const percentage = (total / report.operatingExpenses.totalExpenses) * 100;
                  return (
                    <div key={category} className="space-y-1">
                      <div className="flex justify-between items-center text-sm">
                        <span className="font-medium capitalize">
                          {category.replace('-', ' ')}
                        </span>
                        <span className="font-semibold">{formatCurrency(total)}</span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div
                          className="bg-primary rounded-full h-2 transition-all"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                      <div className="text-xs text-muted-foreground text-right">
                        {percentage.toFixed(1)}% of total expenses
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No expenses to display
                </p>
              );
            })()}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
