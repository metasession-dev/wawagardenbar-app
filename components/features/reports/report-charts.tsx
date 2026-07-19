'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { DailySummaryReport } from '@/services/financial-report-service';

interface ReportChartsProps { report: DailySummaryReport; }
const COLORS = ['#16a34a', '#2563eb', '#ea580c', '#db2777', '#0891b2', '#7c3aed'];

export function ReportCharts({ report }: ReportChartsProps) {
  const formatCurrency = (amount: number) => new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', notation: 'compact' }).format(amount);
  const renderBars = (data: { label: string; value: number; color: string }[]) => {
    const max = Math.max(0, ...data.map((entry) => entry.value));
    return <div className="space-y-4">{data.map((entry) => { const percent = max ? Math.max(0, entry.value / max * 100) : 0; return <div key={entry.label} className="space-y-1"><div className="flex items-center justify-between text-sm"><span className="font-medium">{entry.label}</span><span className="font-semibold">{formatCurrency(entry.value)}</span></div><div className="h-6 overflow-hidden rounded bg-muted"><div className="h-full transition-all" style={{ width: `${percent}%`, backgroundColor: entry.color }} /></div></div>; })}</div>;
  };
  const categoryData = report.categories.map((category, index) => ({ label: category.label, revenue: category.revenue.totalRevenue, costs: category.costs.totalCost, profit: category.grossProfit, color: COLORS[index % COLORS.length] }));
  return <div className="space-y-6"><div className="grid gap-4 md:grid-cols-2"><Card><CardHeader><CardTitle>Revenue by Main Category</CardTitle></CardHeader><CardContent>{renderBars(categoryData.map(({ label, revenue, color }) => ({ label, value: revenue, color })))}</CardContent></Card><Card><CardHeader><CardTitle>Costs by Main Category</CardTitle></CardHeader><CardContent>{renderBars(categoryData.map(({ label, costs, color }) => ({ label, value: costs, color })))}</CardContent></Card></div><Card><CardHeader><CardTitle>Gross Profit by Main Category</CardTitle></CardHeader><CardContent>{renderBars(categoryData.map(({ label, profit, color }) => ({ label, value: profit, color })))}</CardContent></Card><Card><CardHeader><CardTitle>Financial Overview</CardTitle></CardHeader><CardContent>{renderBars([{ label: 'Total Revenue', value: report.revenue.totalRevenue, color: '#2563eb' }, { label: 'Total Costs (COGS)', value: report.costs.totalDirectCosts, color: '#ea580c' }, { label: 'Gross Profit', value: report.grossProfit.total, color: '#16a34a' }, { label: 'Operating Expenses', value: report.operatingExpenses.totalExpenses, color: '#dc2626' }, { label: report.netProfit >= 0 ? 'Net Profit' : 'Net Loss', value: Math.abs(report.netProfit), color: report.netProfit >= 0 ? '#059669' : '#dc2626' }])}</CardContent></Card></div>;
}
