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

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(amount);

export function RevenueSection({ report }: RevenueSectionProps) {
  return (
    <div className="space-y-4">
      {report.categories.map((category) => (
        <Card key={category.slug}>
          <CardHeader>
            <CardTitle>{category.label} Revenue</CardTitle>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(category.revenue.totalRevenue)}
            </div>
          </CardHeader>
          <CardContent>
            {category.revenue.items.length ? (
              <Table>
                <TableHeader><TableRow><TableHead>Item</TableHead><TableHead className="text-right">Quantity</TableHead><TableHead className="text-right">Price</TableHead><TableHead className="text-right">Total</TableHead></TableRow></TableHeader>
                <TableBody>
                  {category.revenue.items.map((item, index) => (
                    <TableRow key={`${item.name}-${index}`}><TableCell className="font-medium">{item.name}</TableCell><TableCell className="text-right">{item.quantity}</TableCell><TableCell className="text-right">{formatCurrency(item.price)}</TableCell><TableCell className="text-right font-semibold">{formatCurrency(item.total)}</TableCell></TableRow>
                  ))}
                  <TableRow className="bg-muted/50"><TableCell colSpan={3} className="font-bold">Total {category.label} Revenue</TableCell><TableCell className="text-right font-bold text-green-600">{formatCurrency(category.revenue.totalRevenue)}</TableCell></TableRow>
                </TableBody>
              </Table>
            ) : <p className="py-4 text-center text-sm text-muted-foreground">No {category.label.toLowerCase()} items sold</p>}
          </CardContent>
        </Card>
      ))}

      <Card className="border-2 border-primary">
        <CardHeader><CardTitle>Total Revenue Summary</CardTitle></CardHeader>
        <CardContent><div className="space-y-2">
          {report.categories.map((category) => <div key={category.slug} className="flex items-center justify-between"><span className="text-muted-foreground">{category.label} Revenue:</span><span className="font-semibold">{formatCurrency(category.revenue.totalRevenue)}</span></div>)}
          <div className="mt-2 border-t pt-2"><div className="flex items-center justify-between"><span className="text-lg font-bold">Total Revenue:</span><span className="text-2xl font-bold text-primary">{formatCurrency(report.revenue.totalRevenue)}</span></div></div>
        </div></CardContent>
      </Card>
    </div>
  );
}
