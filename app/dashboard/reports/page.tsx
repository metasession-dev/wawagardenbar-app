export const metadata = {
  title: 'Reports | Wawa Garden Bar',
  description: 'Financial and operational reports',
};

export default async function ReportsPage() {
  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Reports</h2>
          <p className="text-muted-foreground">
            View financial and operational reports
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* Daily Reports Card */}
        <a 
          href="/dashboard/reports/daily"
          className="rounded-lg border bg-card p-6 shadow-sm hover:shadow-md transition-shadow cursor-pointer hover:border-primary"
        >
          <h3 className="text-lg font-semibold mb-2">Daily Summary Report</h3>
          <p className="text-sm text-muted-foreground mb-4">
            View daily sales, expenses, and profit analysis
          </p>
          <div className="text-xs text-primary font-semibold">
            View Report →
          </div>
        </a>

        {/* Weekly Reports Card */}
        <div className="rounded-lg border bg-card p-6 shadow-sm hover:shadow-md transition-shadow">
          <h3 className="text-lg font-semibold mb-2">Weekly Report</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Weekly performance trends and comparisons
          </p>
          <div className="text-xs text-muted-foreground">
            Coming soon...
          </div>
        </div>

        {/* Monthly Reports Card */}
        <div className="rounded-lg border bg-card p-6 shadow-sm hover:shadow-md transition-shadow">
          <h3 className="text-lg font-semibold mb-2">Monthly Report</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Comprehensive monthly financial overview
          </p>
          <div className="text-xs text-muted-foreground">
            Coming soon...
          </div>
        </div>

        {/* Expense Analysis Card */}
        <div className="rounded-lg border bg-card p-6 shadow-sm hover:shadow-md transition-shadow">
          <h3 className="text-lg font-semibold mb-2">Expense Analysis</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Detailed breakdown of direct costs and operating expenses
          </p>
          <div className="text-xs text-muted-foreground">
            Coming soon...
          </div>
        </div>

        {/* Inventory Reports Card */}
        <a 
          href="/dashboard/reports/inventory"
          className="rounded-lg border bg-card p-6 shadow-sm hover:shadow-md transition-shadow cursor-pointer hover:border-primary"
        >
          <h3 className="text-lg font-semibold mb-2">Inventory Report</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Stock levels, usage, and reorder recommendations
          </p>
          <div className="text-xs text-primary font-semibold">
            View Report →
          </div>
        </a>

        {/* Sales Reports Card */}
        <div className="rounded-lg border bg-card p-6 shadow-sm hover:shadow-md transition-shadow">
          <h3 className="text-lg font-semibold mb-2">Sales Report</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Revenue analysis by category, time, and payment method
          </p>
          <div className="text-xs text-muted-foreground">
            Coming soon...
          </div>
        </div>

        {/* Profitability Report Card */}
        <a 
          href="/dashboard/reports/profitability"
          className="rounded-lg border bg-card p-6 shadow-sm hover:shadow-md transition-shadow cursor-pointer hover:border-primary"
        >
          <h3 className="text-lg font-semibold mb-2">Profitability Report</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Track revenue, costs, profit margins, and item performance
          </p>
          <div className="text-xs text-primary font-semibold">
            View Report →
          </div>
        </a>
      </div>

      <div className="rounded-lg border bg-muted/50 p-6 mt-6">
        <h3 className="text-lg font-semibold mb-2">📊 Reports Implementation</h3>
        <p className="text-sm text-muted-foreground mb-4">
          The reports system is currently under development. Each report will provide:
        </p>
        <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
          <li>Interactive date range selection</li>
          <li>Export to PDF and Excel</li>
          <li>Visual charts and graphs</li>
          <li>Comparative analysis (vs previous period)</li>
          <li>Detailed breakdowns by category</li>
        </ul>
        <p className="text-sm text-muted-foreground mt-4">
          In the meantime, you can use the <strong>Expenses</strong> page to track and analyze your business expenses.
        </p>
      </div>
    </div>
  );
}
