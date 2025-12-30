import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { format } from 'date-fns';
import type { DailySummaryReport } from '@/services/financial-report-service';

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
export function exportReportAsPDF(report: DailySummaryReport, reportType: 'single' | 'range' = 'single') {
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
  const dateText = reportType === 'single' 
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
    ['Operating Overhead', formatCurrency(report.operatingExpenses.totalOperatingExpenses)],
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

  const revenueData = [
    ...report.revenue.food.items.map(item => [
      item.name,
      'Food',
      item.quantity.toString(),
      formatCurrency(item.price),
      formatCurrency(item.total),
    ]),
    ...report.revenue.drink.items.map(item => [
      item.name,
      'Drink',
      item.quantity.toString(),
      formatCurrency(item.price),
      formatCurrency(item.total),
    ]),
  ];

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

  const costData = [
    ...report.costs.food.items.map(item => [
      item.name,
      'Food',
      item.quantity.toString(),
      formatCurrency(item.costPerUnit),
      formatCurrency(item.total),
    ]),
    ...report.costs.drink.items.map(item => [
      item.name,
      'Drink',
      item.quantity.toString(),
      formatCurrency(item.costPerUnit),
      formatCurrency(item.total),
    ]),
  ];

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
    ...report.operatingExpenses.directCosts.map(exp => [
      exp.category.replace('-', ' '),
      exp.description,
      'Direct Cost (Inventory)',
      formatCurrency(exp.amount),
    ]),
    ...report.operatingExpenses.operatingCosts.map(exp => [
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
export function exportReportAsExcel(report: DailySummaryReport, reportType: 'single' | 'range' = 'single') {
  const workbook = XLSX.utils.book_new();

  // Summary Sheet
  const summaryData = [
    ['Wawa Garden Bar - Daily Financial Report'],
    [reportType === 'single' 
      ? format(new Date(report.date), 'MMMM dd, yyyy')
      : `Report Period: ${format(new Date(report.date), 'MMM dd, yyyy')}`
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
    ['Food', report.revenue.food.totalRevenue, report.costs.food.totalCost, report.grossProfit.food],
    ['Drink', report.revenue.drink.totalRevenue, report.costs.drink.totalCost, report.grossProfit.drink],
  ];

  const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
  XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');

  // Revenue Sheet
  const revenueData = [
    ['Revenue Breakdown'],
    ['Item', 'Category', 'Quantity', 'Price', 'Total'],
    ...report.revenue.food.items.map(item => [
      item.name,
      'Food',
      item.quantity,
      item.price,
      item.total,
    ]),
    ...report.revenue.drink.items.map(item => [
      item.name,
      'Drink',
      item.quantity,
      item.price,
      item.total,
    ]),
    [],
    ['Total Revenue', '', '', '', report.revenue.totalRevenue],
  ];

  const revenueSheet = XLSX.utils.aoa_to_sheet(revenueData);
  XLSX.utils.book_append_sheet(workbook, revenueSheet, 'Revenue');

  // Costs Sheet
  const costsData = [
    ['Cost of Goods Sold'],
    ['Item', 'Category', 'Quantity', 'Cost/Unit', 'Total Cost'],
    ...report.costs.food.items.map(item => [
      item.name,
      'Food',
      item.quantity,
      item.costPerUnit,
      item.total,
    ]),
    ...report.costs.drink.items.map(item => [
      item.name,
      'Drink',
      item.quantity,
      item.costPerUnit,
      item.total,
    ]),
    [],
    ['Total COGS', '', '', '', report.costs.totalDirectCosts],
  ];

  const costsSheet = XLSX.utils.aoa_to_sheet(costsData);
  XLSX.utils.book_append_sheet(workbook, costsSheet, 'Costs');

  // Expenses Sheet
  const expensesData = [
    ['Expenses Breakdown (Cash Flow)'],
    ['Category', 'Description', 'Type', 'Amount'],
    ...report.operatingExpenses.directCosts.map(exp => [
      exp.category.replace('-', ' '),
      exp.description,
      'Direct Cost (Inventory)',
      exp.amount,
    ]),
    ...report.operatingExpenses.operatingCosts.map(exp => [
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

  // Save the Excel file
  const fileName = `daily-report-${format(new Date(report.date), 'yyyy-MM-dd')}.xlsx`;
  XLSX.writeFile(workbook, fileName);
}

/**
 * Export report as CSV
 */
export function exportReportAsCSV(report: DailySummaryReport, reportType: 'single' | 'range' = 'single') {
  const csvRows: string[] = [];

  // Header
  csvRows.push('Wawa Garden Bar - Daily Financial Report');
  csvRows.push(reportType === 'single' 
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
  csvRows.push(`Gross Profit Margin,${report.metrics.grossProfitMargin.toFixed(1)}%`);
  csvRows.push(`Operating Overhead,${report.operatingExpenses.totalOperatingExpenses}`);
  csvRows.push(`Net Profit/Loss,${report.netProfit}`);
  csvRows.push(`Net Profit Margin,${report.metrics.netProfitMargin.toFixed(1)}%`);
  csvRows.push(`Orders Processed,${report.metrics.orderCount}`);
  csvRows.push('');

  // Revenue
  csvRows.push('Revenue Breakdown');
  csvRows.push('Item,Category,Quantity,Price,Total');
  report.revenue.food.items.forEach(item => {
    csvRows.push(`"${item.name}",Food,${item.quantity},${item.price},${item.total}`);
  });
  report.revenue.drink.items.forEach(item => {
    csvRows.push(`"${item.name}",Drink,${item.quantity},${item.price},${item.total}`);
  });
  csvRows.push(`Total Revenue,,,${report.revenue.totalRevenue}`);
  csvRows.push('');

  // Costs
  csvRows.push('Cost of Goods Sold');
  csvRows.push('Item,Category,Quantity,Cost/Unit,Total Cost');
  report.costs.food.items.forEach(item => {
    csvRows.push(`"${item.name}",Food,${item.quantity},${item.costPerUnit},${item.total}`);
  });
  report.costs.drink.items.forEach(item => {
    csvRows.push(`"${item.name}",Drink,${item.quantity},${item.costPerUnit},${item.total}`);
  });
  csvRows.push(`Total COGS,,,,${report.costs.totalDirectCosts}`);
  csvRows.push('');

  // Expenses
  csvRows.push('Expenses Breakdown (Cash Flow)');
  csvRows.push('Category,Description,Type,Amount');
  report.operatingExpenses.directCosts.forEach(exp => {
    csvRows.push(`"${exp.category.replace('-', ' ')}","${exp.description}",Direct Cost (Inventory),${exp.amount}`);
  });
  report.operatingExpenses.operatingCosts.forEach(exp => {
    csvRows.push(`"${exp.category.replace('-', ' ')}","${exp.description}",Operating Overhead,${exp.amount}`);
  });
  csvRows.push(`Total Cash Outflow,,,${report.operatingExpenses.totalExpenses}`);

  // Create and download CSV
  const csvContent = csvRows.join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', `daily-report-${format(new Date(report.date), 'yyyy-MM-dd')}.csv`);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
