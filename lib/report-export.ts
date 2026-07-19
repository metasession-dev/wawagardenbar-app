import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { format } from 'date-fns';
import type {
  DailySummaryReport,
  MainCategoryReport,
} from '@/services/financial-report-service';

/**
 * Format currency for display
 */
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
  }).format(amount);
}

/**
 * Export report as PDF
 */
export function exportReportAsPDF(
  report: DailySummaryReport,
  reportType: 'single' | 'range' = 'single'
) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();

  // Title
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('Wawa Garden Bar', pageWidth / 2, 15, { align: 'center' });

  doc.setFontSize(16);
  doc.text('Daily Financial Report', pageWidth / 2, 25, { align: 'center' });

  // Date
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  const dateText =
    reportType === 'single'
      ? format(new Date(report.date), 'MMMM dd, yyyy')
      : `Report Period: ${format(new Date(report.date), 'MMM dd, yyyy')}`;
  doc.text(dateText, pageWidth / 2, 32, { align: 'center' });

  let yPos = 45;

  // Key Metrics Summary
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Financial Summary', 14, yPos);
  yPos += 10;

  const summaryData = [
    ['Total Revenue', formatCurrency(report.revenue.totalRevenue)],
    ['Cost of Goods Sold', formatCurrency(report.costs.totalDirectCosts)],
    ['Gross Profit', formatCurrency(report.grossProfit.total)],
    ['Gross Profit Margin', `${report.metrics.grossProfitMargin.toFixed(1)}%`],
    [
      'Operating Overhead',
      formatCurrency(report.operatingExpenses.totalOperatingExpenses),
    ],
    ['Net Profit/Loss', formatCurrency(report.netProfit)],
    ['Net Profit Margin', `${report.metrics.netProfitMargin.toFixed(1)}%`],
    ['Orders Processed', report.metrics.orderCount.toString()],
  ];

  autoTable(doc, {
    startY: yPos,
    head: [['Metric', 'Value']],
    body: summaryData,
    theme: 'grid',
    headStyles: { fillColor: [41, 128, 185], fontStyle: 'bold' },
    styles: { fontSize: 10 },
  });

  yPos = (doc as any).lastAutoTable.finalY + 15;

  // Revenue Breakdown
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Revenue Breakdown', 14, yPos);
  yPos += 10;

  const revenueData = report.categories.flatMap((category) =>
    category.revenue.items.map((item) => [
      item.name, category.label, item.quantity.toString(),
      formatCurrency(item.price), formatCurrency(item.total),
    ])
  );

  if (revenueData.length > 0) {
    autoTable(doc, {
      startY: yPos,
      head: [['Item', 'Category', 'Qty', 'Price', 'Total']],
      body: revenueData,
      theme: 'striped',
      headStyles: { fillColor: [46, 204, 113] },
      styles: { fontSize: 9 },
    });
    yPos = (doc as any).lastAutoTable.finalY + 15;
  }

  // Check if we need a new page
  if (yPos > 250) {
    doc.addPage();
    yPos = 20;
  }

  // Cost Breakdown
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Cost of Goods Sold', 14, yPos);
  yPos += 10;

  const costData = report.categories.flatMap((category) =>
    category.costs.items.map((item) => [
      item.name, category.label, item.quantity.toString(),
      formatCurrency(item.costPerUnit), formatCurrency(item.total),
    ])
  );

  if (costData.length > 0) {
    autoTable(doc, {
      startY: yPos,
      head: [['Item', 'Category', 'Qty', 'Cost/Unit', 'Total Cost']],
      body: costData,
      theme: 'striped',
      headStyles: { fillColor: [230, 126, 34] },
      styles: { fontSize: 9 },
    });
    yPos = (doc as any).lastAutoTable.finalY + 15;
  }

  // Check if we need a new page
  if (yPos > 250) {
    doc.addPage();
    yPos = 20;
  }

  // Operating Expenses (Cash Flow)
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Expenses Breakdown (Cash Flow)', 14, yPos);
  yPos += 10;

  const expenseData = [
    ...report.operatingExpenses.directCosts.map((exp) => [
      exp.category.replace('-', ' '),
      exp.description,
      'Direct Cost (Inventory)',
      formatCurrency(exp.amount),
    ]),
    ...report.operatingExpenses.operatingCosts.map((exp) => [
      exp.category.replace('-', ' '),
      exp.description,
      'Operating Overhead',
      formatCurrency(exp.amount),
    ]),
  ];

  if (expenseData.length > 0) {
    autoTable(doc, {
      startY: yPos,
      head: [['Category', 'Description', 'Type', 'Amount']],
      body: expenseData,
      theme: 'striped',
      headStyles: { fillColor: [231, 76, 60] },
      styles: { fontSize: 9 },
    });
    yPos = (doc as any).lastAutoTable.finalY + 15;
  }

  // REQ-035 — Tips received by method.
  if (report.tipsBreakdown && report.tipsBreakdown.total > 0) {
    if (yPos > 250) {
      doc.addPage();
      yPos = 20;
    }
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Tips Received by Method', 14, yPos);
    yPos += 10;

    const tipsRows: Array<[string, string, string]> = [];
    const total = report.tipsBreakdown.total || 1;
    const pushIfPositive = (label: string, amount: number) => {
      if (amount > 0) {
        tipsRows.push([
          label,
          formatCurrency(amount),
          `${((amount / total) * 100).toFixed(1)}%`,
        ]);
      }
    };
    pushIfPositive('Cash', report.tipsBreakdown.cash);
    pushIfPositive('POS / Card', report.tipsBreakdown.card);
    pushIfPositive('Transfer', report.tipsBreakdown.transfer);
    pushIfPositive('USSD', report.tipsBreakdown.ussd);
    pushIfPositive('Phone', report.tipsBreakdown.phone);
    pushIfPositive('Unspecified', report.tipsBreakdown.unspecified);
    tipsRows.push([
      'Total Tips',
      formatCurrency(report.tipsBreakdown.total),
      '100.0%',
    ]);

    autoTable(doc, {
      startY: yPos,
      head: [['Method', 'Amount', '% of total tips']],
      body: tipsRows,
      theme: 'grid',
      headStyles: { fillColor: [217, 119, 6] },
      styles: { fontSize: 9 },
    });
  }

  // Footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(
      `Page ${i} of ${pageCount}`,
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 10,
      { align: 'center' }
    );
    doc.text(
      `Generated on ${format(new Date(), 'MMM dd, yyyy HH:mm')}`,
      pageWidth - 14,
      doc.internal.pageSize.getHeight() - 10,
      { align: 'right' }
    );
  }

  // Save the PDF
  const fileName = `daily-report-${format(new Date(report.date), 'yyyy-MM-dd')}.pdf`;
  doc.save(fileName);
}

/**
 * Export report as Excel
 */
export function exportReportAsExcel(
  report: DailySummaryReport,
  reportType: 'single' | 'range' = 'single'
) {
  const workbook = XLSX.utils.book_new();

  // Summary Sheet
  const summaryData = [
    ['Wawa Garden Bar - Daily Financial Report'],
    [
      reportType === 'single'
        ? format(new Date(report.date), 'MMMM dd, yyyy')
        : `Report Period: ${format(new Date(report.date), 'MMM dd, yyyy')}`,
    ],
    [],
    ['Financial Summary'],
    ['Metric', 'Value'],
    ['Total Revenue', report.revenue.totalRevenue],
    ['Cost of Goods Sold', report.costs.totalDirectCosts],
    ['Gross Profit', report.grossProfit.total],
    ['Gross Profit Margin', `${report.metrics.grossProfitMargin.toFixed(1)}%`],
    ['Operating Overhead', report.operatingExpenses.totalOperatingExpenses],
    ['Net Profit/Loss', report.netProfit],
    ['Net Profit Margin', `${report.metrics.netProfitMargin.toFixed(1)}%`],
    ['Orders Processed', report.metrics.orderCount],
    [],
    ['Category Breakdown'],
    ['Category', 'Revenue', 'Cost', 'Gross Profit'],
    ...report.categories.map((category) => [
      category.label,
      category.revenue.totalRevenue,
      category.costs.totalCost,
      category.grossProfit,
    ]),
  ];

  const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
  XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');

  // Revenue Sheet
  const revenueData = [
    ['Revenue Breakdown'],
    ['Item', 'Category', 'Quantity', 'Price', 'Total'],
    ...report.categories.flatMap((category) => category.revenue.items.map((item) => [
      item.name, category.label, item.quantity, item.price, item.total,
    ])),
    [],
    ['Total Revenue', '', '', '', report.revenue.totalRevenue],
  ];

  const revenueSheet = XLSX.utils.aoa_to_sheet(revenueData);
  XLSX.utils.book_append_sheet(workbook, revenueSheet, 'Revenue');

  // Costs Sheet
  const costsData = [
    ['Cost of Goods Sold'],
    ['Item', 'Category', 'Quantity', 'Cost/Unit', 'Total Cost'],
    ...report.categories.flatMap((category) => category.costs.items.map((item) => [
      item.name, category.label, item.quantity, item.costPerUnit, item.total,
    ])),
    [],
    ['Total COGS', '', '', '', report.costs.totalDirectCosts],
  ];

  const costsSheet = XLSX.utils.aoa_to_sheet(costsData);
  XLSX.utils.book_append_sheet(workbook, costsSheet, 'Costs');

  // Expenses Sheet
  const expensesData = [
    ['Expenses Breakdown (Cash Flow)'],
    ['Category', 'Description', 'Type', 'Amount'],
    ...report.operatingExpenses.directCosts.map((exp) => [
      exp.category.replace('-', ' '),
      exp.description,
      'Direct Cost (Inventory)',
      exp.amount,
    ]),
    ...report.operatingExpenses.operatingCosts.map((exp) => [
      exp.category.replace('-', ' '),
      exp.description,
      'Operating Overhead',
      exp.amount,
    ]),
    [],
    ['Total Cash Outflow', '', '', report.operatingExpenses.totalExpenses],
  ];

  const expensesSheet = XLSX.utils.aoa_to_sheet(expensesData);
  XLSX.utils.book_append_sheet(workbook, expensesSheet, 'Expenses');

  // REQ-035 — Tips Sheet (only when there are tips to report).
  if (report.tipsBreakdown && report.tipsBreakdown.total > 0) {
    const total = report.tipsBreakdown.total || 1;
    const tipsRows: Array<[string, number | string, string]> = [];
    const pushIfPositive = (label: string, amount: number) => {
      if (amount > 0) {
        tipsRows.push([
          label,
          amount,
          `${((amount / total) * 100).toFixed(1)}%`,
        ]);
      }
    };
    pushIfPositive('Cash', report.tipsBreakdown.cash);
    pushIfPositive('POS / Card', report.tipsBreakdown.card);
    pushIfPositive('Transfer', report.tipsBreakdown.transfer);
    pushIfPositive('USSD', report.tipsBreakdown.ussd);
    pushIfPositive('Phone', report.tipsBreakdown.phone);
    pushIfPositive('Unspecified', report.tipsBreakdown.unspecified);

    const tipsData: Array<Array<string | number>> = [
      ['Tips Received by Method'],
      ['Method', 'Amount', '% of total tips'],
      ...tipsRows,
      [],
      ['Total Tips', report.tipsBreakdown.total, '100.0%'],
    ];
    const tipsSheet = XLSX.utils.aoa_to_sheet(tipsData);
    XLSX.utils.book_append_sheet(workbook, tipsSheet, 'Tips');
  }

  // Save the Excel file
  const fileName = `daily-report-${format(new Date(report.date), 'yyyy-MM-dd')}.xlsx`;
  XLSX.writeFile(workbook, fileName);
}

/**
 * Export report as CSV
 */
export function exportReportAsCSV(
  report: DailySummaryReport,
  reportType: 'single' | 'range' = 'single'
) {
  const csvRows: string[] = [];

  // Header
  csvRows.push('Wawa Garden Bar - Daily Financial Report');
  csvRows.push(
    reportType === 'single'
      ? format(new Date(report.date), 'MMMM dd, yyyy')
      : `Report Period: ${format(new Date(report.date), 'MMM dd, yyyy')}`
  );
  csvRows.push('');

  // Summary
  csvRows.push('Financial Summary');
  csvRows.push('Metric,Value');
  csvRows.push(`Total Revenue,${report.revenue.totalRevenue}`);
  csvRows.push(`Cost of Goods Sold,${report.costs.totalDirectCosts}`);
  csvRows.push(`Gross Profit,${report.grossProfit.total}`);
  csvRows.push(
    `Gross Profit Margin,${report.metrics.grossProfitMargin.toFixed(1)}%`
  );
  csvRows.push(
    `Operating Overhead,${report.operatingExpenses.totalOperatingExpenses}`
  );
  csvRows.push(`Net Profit/Loss,${report.netProfit}`);
  csvRows.push(
    `Net Profit Margin,${report.metrics.netProfitMargin.toFixed(1)}%`
  );
  csvRows.push(`Orders Processed,${report.metrics.orderCount}`);
  csvRows.push('');

  // Revenue
  csvRows.push('Revenue Breakdown');
  csvRows.push('Item,Category,Quantity,Price,Total');
  report.categories.forEach((category) => category.revenue.items.forEach((item) => {
    csvRows.push(`"${item.name}","${category.label}",${item.quantity},${item.price},${item.total}`);
  }));
  csvRows.push(`Total Revenue,,,${report.revenue.totalRevenue}`);
  csvRows.push('');

  // Costs
  csvRows.push('Cost of Goods Sold');
  csvRows.push('Item,Category,Quantity,Cost/Unit,Total Cost');
  report.categories.forEach((category) => category.costs.items.forEach((item) => {
    csvRows.push(`"${item.name}","${category.label}",${item.quantity},${item.costPerUnit},${item.total}`);
  }));
  csvRows.push(`Total COGS,,,,${report.costs.totalDirectCosts}`);
  csvRows.push('');

  // Expenses
  csvRows.push('Expenses Breakdown (Cash Flow)');
  csvRows.push('Category,Description,Type,Amount');
  report.operatingExpenses.directCosts.forEach((exp) => {
    csvRows.push(
      `"${exp.category.replace('-', ' ')}","${exp.description}",Direct Cost (Inventory),${exp.amount}`
    );
  });
  report.operatingExpenses.operatingCosts.forEach((exp) => {
    csvRows.push(
      `"${exp.category.replace('-', ' ')}","${exp.description}",Operating Overhead,${exp.amount}`
    );
  });
  csvRows.push(
    `Total Cash Outflow,,,${report.operatingExpenses.totalExpenses}`
  );

  // REQ-035 — Tips received by method.
  if (report.tipsBreakdown && report.tipsBreakdown.total > 0) {
    csvRows.push('');
    csvRows.push('Tips Received by Method');
    csvRows.push('Method,Amount,% of total tips');
    const total = report.tipsBreakdown.total || 1;
    const pushIfPositive = (label: string, amount: number) => {
      if (amount > 0) {
        csvRows.push(
          `${label},${amount},${((amount / total) * 100).toFixed(1)}%`
        );
      }
    };
    pushIfPositive('Cash', report.tipsBreakdown.cash);
    pushIfPositive('POS / Card', report.tipsBreakdown.card);
    pushIfPositive('Transfer', report.tipsBreakdown.transfer);
    pushIfPositive('USSD', report.tipsBreakdown.ussd);
    pushIfPositive('Phone', report.tipsBreakdown.phone);
    pushIfPositive('Unspecified', report.tipsBreakdown.unspecified);
    csvRows.push(`Total Tips,${report.tipsBreakdown.total},100.0%`);
  }

  // Create and download CSV
  const csvContent = csvRows.join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute(
    'download',
    `daily-report-${format(new Date(report.date), 'yyyy-MM-dd')}.csv`
  );
  link.style.visibility = 'hidden';

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// ────────────────────────────────────────────────────────────────────────────
// REQ-076 — Per-main-category report exports
// ────────────────────────────────────────────────────────────────────────────

/**
 * REQ-076 — Compute the date-range portion of a filename / header for a
 * per-main report. Same date for single-day; two dates joined for range.
 */
function mainCategoryDateLabel(report: MainCategoryReport): string {
  const start = report.startDate ?? report.date;
  const end = report.endDate ?? report.date;
  const startStr = format(start, 'yyyy-MM-dd');
  const endStr = format(end, 'yyyy-MM-dd');
  return startStr === endStr ? startStr : `${startStr}-${endStr}`;
}

/**
 * REQ-076 — Filename for a per-main-category export. Pattern:
 *   `main-category-report-{slug}-{YYYY-MM-DD}[-{YYYY-MM-DD}].{ext}`
 */
export function mainCategoryReportFilename(
  report: MainCategoryReport,
  extension: 'pdf' | 'xlsx' | 'csv'
): string {
  return `main-category-report-${report.mainCategorySlug}-${mainCategoryDateLabel(
    report
  )}.${extension}`;
}

/**
 * REQ-076 — Per-main-category report PDF export. Mirrors the structure
 * of `exportReportAsPDF` (title, header, items tables, summary block)
 * but scoped to one main and without payment / tip sections.
 */
export function exportMainCategoryReportAsPDF(
  report: MainCategoryReport
): void {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();

  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('Wawa Garden Bar', pageWidth / 2, 15, { align: 'center' });

  doc.setFontSize(14);
  doc.text(`${report.mainCategoryLabel} Report`, pageWidth / 2, 24, {
    align: 'center',
  });

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Period: ${mainCategoryDateLabel(report)}`, pageWidth / 2, 31, {
    align: 'center',
  });

  // Summary cards
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('Summary', 14, 44);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(`Revenue: ${formatCurrency(report.revenue.totalRevenue)}`, 14, 52);
  doc.text(`Cost: ${formatCurrency(report.costs.totalCost)}`, 14, 58);
  doc.text(`Gross Profit: ${formatCurrency(report.grossProfit)}`, 14, 64);
  doc.text(`Margin: ${report.grossProfitMargin.toFixed(2)}%`, 14, 70);
  doc.text(`Items sold: ${report.revenue.itemCount}`, 14, 76);
  doc.text(`Orders: ${report.orderCount}`, 14, 82);

  // Revenue table
  autoTable(doc, {
    startY: 90,
    head: [['Item', 'Qty', 'Unit Price', 'Line Total']],
    body: report.revenue.items.map((i) => [
      i.name,
      i.quantity,
      formatCurrency(i.price),
      formatCurrency(i.total),
    ]),
    headStyles: { fillColor: [22, 160, 133] },
    margin: { left: 14, right: 14 },
  });

  // Costs table — start after the revenue table
  const finalY =
    (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable
      ?.finalY ?? 90;
  autoTable(doc, {
    startY: finalY + 6,
    head: [['Item', 'Qty', 'Cost/Unit', 'Line Total']],
    body: report.costs.items.map((i) => [
      i.name,
      i.quantity,
      formatCurrency(i.costPerUnit),
      formatCurrency(i.total),
    ]),
    headStyles: { fillColor: [192, 57, 43] },
    margin: { left: 14, right: 14 },
  });

  // Honesty footer
  const pageHeight = doc.internal.pageSize.getHeight();
  doc.setFontSize(8);
  doc.setTextColor(120);
  doc.text(
    'Note: Payments + tips are aggregate-only (see Daily Report). Multi-main orders count toward each main’s report.',
    14,
    pageHeight - 10
  );

  doc.save(mainCategoryReportFilename(report, 'pdf'));
}

/**
 * REQ-076 — Per-main-category report Excel export. 3 sheets: Summary,
 * Revenue, Costs.
 */
export function exportMainCategoryReportAsExcel(
  report: MainCategoryReport
): void {
  const wb = XLSX.utils.book_new();

  // Sheet 1: Summary
  const summary = [
    ['Wawa Garden Bar'],
    [`${report.mainCategoryLabel} Report`],
    [`Period: ${mainCategoryDateLabel(report)}`],
    [],
    ['Metric', 'Value'],
    ['Revenue', report.revenue.totalRevenue],
    ['Cost', report.costs.totalCost],
    ['Gross Profit', report.grossProfit],
    ['Margin (%)', Number(report.grossProfitMargin.toFixed(2))],
    ['Items sold', report.revenue.itemCount],
    ['Orders', report.orderCount],
    [],
    [
      'Note: Payments + tips are aggregate-only (see Daily Report). Multi-main orders count toward each main’s report.',
    ],
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(summary), 'Summary');

  // Sheet 2: Revenue
  const revenueRows: Array<Array<string | number>> = [
    ['Item', 'Qty', 'Unit Price', 'Line Total'],
    ...report.revenue.items.map((i) => [i.name, i.quantity, i.price, i.total]),
  ];
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.aoa_to_sheet(revenueRows),
    'Revenue'
  );

  // Sheet 3: Costs
  const costRows: Array<Array<string | number>> = [
    ['Item', 'Qty', 'Cost/Unit', 'Line Total'],
    ...report.costs.items.map((i) => [
      i.name,
      i.quantity,
      i.costPerUnit,
      i.total,
    ]),
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(costRows), 'Costs');

  XLSX.writeFile(wb, mainCategoryReportFilename(report, 'xlsx'));
}

/**
 * REQ-076 — Per-main-category report CSV export. Returns the CSV
 * string in tests that don't need a file write. The browser download
 * path runs only when `download === true`.
 *
 * The CSV string content is the same in both modes — tests assert on
 * it directly without mocking the browser DOM.
 */
export function buildMainCategoryReportCSV(report: MainCategoryReport): string {
  const lines: string[] = [];
  lines.push('Wawa Garden Bar');
  lines.push(`${report.mainCategoryLabel} Report`);
  lines.push(`Period,${mainCategoryDateLabel(report)}`);
  lines.push('');
  lines.push('Metric,Value');
  lines.push(`Revenue,${report.revenue.totalRevenue}`);
  lines.push(`Cost,${report.costs.totalCost}`);
  lines.push(`Gross Profit,${report.grossProfit}`);
  lines.push(`Margin (%),${report.grossProfitMargin.toFixed(2)}`);
  lines.push(`Items sold,${report.revenue.itemCount}`);
  lines.push(`Orders,${report.orderCount}`);
  lines.push('');
  lines.push('Revenue items');
  lines.push('Item,Qty,Unit Price,Line Total');
  for (const i of report.revenue.items) {
    lines.push(`${i.name},${i.quantity},${i.price},${i.total}`);
  }
  lines.push('');
  lines.push('Cost items');
  lines.push('Item,Qty,Cost/Unit,Line Total');
  for (const i of report.costs.items) {
    lines.push(`${i.name},${i.quantity},${i.costPerUnit},${i.total}`);
  }
  lines.push('');
  lines.push(
    'Note: Payments + tips are aggregate-only (see Daily Report). Multi-main orders count toward each main’s report.'
  );
  return lines.join('\n');
}

export function exportMainCategoryReportAsCSV(
  report: MainCategoryReport
): void {
  const csv = buildMainCategoryReportCSV(report);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = mainCategoryReportFilename(report, 'csv');
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
