import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { DailySummaryReport } from '@/services/financial-report-service';

interface RevenueSectionProps {
  report: DailySummaryReport;
}

export function RevenueSection({ report }: RevenueSectionProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
    }).format(amount);
  };

  return (
    <div className="space-y-4">
      {/* Food Revenue */}
      <Card>
        <CardHeader>
          <CardTitle>Food Revenue</CardTitle>
          <div className="text-2xl font-bold text-green-600">
            {formatCurrency(report.revenue.food.totalRevenue)}
          </div>
        </CardHeader>
        <CardContent>
          {report.revenue.food.items.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead className="text-right">Quantity</TableHead>
                  <TableHead className="text-right">Price</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {report.revenue.food.items.map((item, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell className="text-right">
                      {item.quantity}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(item.price)}
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      {formatCurrency(item.total)}
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow className="bg-muted/50">
                  <TableCell colSpan={3} className="font-bold">
                    Total Food Revenue
                  </TableCell>
                  <TableCell className="text-right font-bold text-green-600">
                    {formatCurrency(report.revenue.food.totalRevenue)}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">
              No food items sold
            </p>
          )}
        </CardContent>
      </Card>

      {/* Drink Revenue */}
      <Card>
        <CardHeader>
          <CardTitle>Drink Revenue</CardTitle>
          <div className="text-2xl font-bold text-blue-600">
            {formatCurrency(report.revenue.drink.totalRevenue)}
          </div>
        </CardHeader>
        <CardContent>
          {report.revenue.drink.items.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead className="text-right">Quantity</TableHead>
                  <TableHead className="text-right">Price</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {report.revenue.drink.items.map((item, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell className="text-right">
                      {item.quantity}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(item.price)}
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      {formatCurrency(item.total)}
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow className="bg-muted/50">
                  <TableCell colSpan={3} className="font-bold">
                    Total Drink Revenue
                  </TableCell>
                  <TableCell className="text-right font-bold text-blue-600">
                    {formatCurrency(report.revenue.drink.totalRevenue)}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">
              No drinks sold
            </p>
          )}
        </CardContent>
      </Card>

      {/* Other Revenue (non-food/non-drinks categories) */}
      {report.revenue.other.totalRevenue > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Other Revenue</CardTitle>
            <div className="text-2xl font-bold text-purple-600">
              {formatCurrency(report.revenue.other.totalRevenue)}
            </div>
          </CardHeader>
          <CardContent>
            {report.revenue.other.items.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead className="text-right">Quantity</TableHead>
                    <TableHead className="text-right">Price</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {report.revenue.other.items.map((item, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell className="text-right">
                        {item.quantity}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(item.price)}
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        {formatCurrency(item.total)}
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="bg-muted/50">
                    <TableCell colSpan={3} className="font-bold">
                      Total Other Revenue
                    </TableCell>
                    <TableCell className="text-right font-bold text-purple-600">
                      {formatCurrency(report.revenue.other.totalRevenue)}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                No other items sold
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Total Revenue Summary */}
      <Card className="border-2 border-primary">
        <CardHeader>
          <CardTitle>Total Revenue Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Food Revenue:</span>
              <span className="font-semibold">
                {formatCurrency(report.revenue.food.totalRevenue)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Drink Revenue:</span>
              <span className="font-semibold">
                {formatCurrency(report.revenue.drink.totalRevenue)}
              </span>
            </div>
            {report.revenue.other.totalRevenue > 0 && (
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Other Revenue:</span>
                <span className="font-semibold">
                  {formatCurrency(report.revenue.other.totalRevenue)}
                </span>
              </div>
            )}
            <div className="border-t pt-2 mt-2">
              <div className="flex justify-between items-center">
                <span className="text-lg font-bold">Total Revenue:</span>
                <span className="text-2xl font-bold text-primary">
                  {formatCurrency(report.revenue.totalRevenue)}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
