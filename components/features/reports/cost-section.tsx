import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { DailySummaryReport } from '@/services/financial-report-service';

interface CostSectionProps { report: DailySummaryReport; }
const formatCurrency = (amount: number) => new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(amount);

export function CostSection({ report }: CostSectionProps) {
  return <div className="space-y-4">
    {report.categories.map((category) => <Card key={category.slug}>
      <CardHeader><CardTitle>{category.label} Costs (COGS)</CardTitle><div className="text-2xl font-bold text-orange-600">{formatCurrency(category.costs.totalCost)}</div></CardHeader>
      <CardContent>{category.costs.items.length ? <Table><TableHeader><TableRow><TableHead>Item</TableHead><TableHead className="text-right">Quantity</TableHead><TableHead className="text-right">Cost/Unit</TableHead><TableHead className="text-right">Total Cost</TableHead></TableRow></TableHeader><TableBody>
        {category.costs.items.map((item, index) => <TableRow key={`${item.name}-${index}`}><TableCell className="font-medium">{item.name}</TableCell><TableCell className="text-right">{item.quantity}</TableCell><TableCell className="text-right">{formatCurrency(item.costPerUnit)}</TableCell><TableCell className="text-right font-semibold">{formatCurrency(item.total)}</TableCell></TableRow>)}
        <TableRow className="bg-muted/50"><TableCell colSpan={3} className="font-bold">Total {category.label} Cost</TableCell><TableCell className="text-right font-bold text-orange-600">{formatCurrency(category.costs.totalCost)}</TableCell></TableRow>
      </TableBody></Table> : <p className="py-4 text-center text-sm text-muted-foreground">No {category.label.toLowerCase()} costs recorded</p>}</CardContent>
    </Card>)}
    <Card className="border-2 border-orange-500"><CardHeader><CardTitle>Total Cost of Goods Sold (COGS)</CardTitle></CardHeader><CardContent><div className="space-y-2">
      {report.categories.map((category) => <div key={category.slug} className="flex items-center justify-between"><span className="text-muted-foreground">{category.label} Costs:</span><span className="font-semibold">{formatCurrency(category.costs.totalCost)}</span></div>)}
      <div className="mt-2 border-t pt-2"><div className="flex items-center justify-between"><span className="text-lg font-bold">Total Direct Costs:</span><span className="text-2xl font-bold text-orange-600">{formatCurrency(report.costs.totalDirectCosts)}</span></div></div>
    </div></CardContent></Card>
    <Card className="border-green-500 bg-green-50 dark:bg-green-950"><CardHeader><CardTitle>Gross Profit Analysis</CardTitle></CardHeader><CardContent><div className="space-y-3">
      {report.categories.map((category) => <div key={category.slug} className="flex items-center justify-between"><span className="text-sm">{category.label} Gross Profit:</span><span className="font-semibold text-green-600">{formatCurrency(category.grossProfit)}</span></div>)}
      <div className="border-t border-green-300 pt-2"><div className="flex items-center justify-between"><span className="font-bold">Total Gross Profit:</span><span className="text-xl font-bold text-green-600">{formatCurrency(report.grossProfit.total)}</span></div><div className="mt-1 text-right text-sm text-muted-foreground">{report.metrics.grossProfitMargin.toFixed(1)}% margin</div></div>
    </div></CardContent></Card>
  </div>;
}
