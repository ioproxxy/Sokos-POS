/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * CSV Export Service for Sokos POS
 * Generates standards-compliant CSV with UTF-8 BOM for seamless
 * opening in Microsoft Excel, Google Sheets, Apple Numbers, and LibreOffice.
 */

import { Product, Sale, DukaExpense, CustomerCreditAccount, EodZReport } from '../types/pos';

function escapeCsvCell(val: any): string {
  if (val === null || val === undefined) return '""';
  const str = String(val);
  if (str.includes('"') || str.includes(',') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return `"${str}"`;
}

function triggerDownload(csvContent: string, fileName: string): void {
  // \uFEFF is UTF-8 BOM - guarantees Excel/Sheets open special chars properly
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', fileName);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export const csvExportService = {
  /**
   * Export all sales transactions to CSV
   */
  exportSalesToCsv(sales: Sale[], storeName: string = 'Sokos Market'): { rowCount: number; fileName: string; bytes: number } {
    const headers = [
      'Receipt No',
      'Date & Time (EAT)',
      'Customer Name',
      'Customer Phone',
      'Payment Method',
      'M-Pesa Code / Ref',
      'Cashier',
      'Items Count',
      'Items Summary',
      'Subtotal (KES)',
      'Discount (KES)',
      'KRA VAT (KES)',
      'Grand Total (KES)',
      'Amount Tendered (KES)',
      'Change (KES)',
      'Sync Status',
      'eTIMS CU Number',
      'Notes'
    ];

    const rows = sales.map(s => {
      const dateStr = new Date(s.timestamp).toLocaleString('en-KE', { 
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', second: '2-digit'
      });

      const itemsSummary = s.items.map(i => `${i.name} (x${i.quantity})`).join('; ');
      const totalItemsCount = s.items.reduce((sum, i) => sum + i.quantity, 0);
      const mpesaCode = s.mpesaDetails?.mpesaReceipt || s.splitPayment?.mpesaReceipt || s.paymentReference || '';

      return [
        s.receiptNumber,
        dateStr,
        s.customerName || 'Walk-in Customer',
        s.customerPhone || 'N/A',
        s.paymentMethod.toUpperCase(),
        mpesaCode,
        s.cashierName || 'Cashier 01',
        totalItemsCount,
        itemsSummary,
        s.subtotal.toFixed(2),
        s.discountTotal.toFixed(2),
        s.taxTotal.toFixed(2),
        s.grandTotal.toFixed(2),
        s.amountTendered.toFixed(2),
        s.changeDue.toFixed(2),
        s.syncStatus,
        s.etimsInfo?.cuSerialNumber || 'N/A',
        s.notes || ''
      ].map(escapeCsvCell).join(',');
    });

    const csvContent = [headers.map(escapeCsvCell).join(','), ...rows].join('\r\n');
    const dateStamp = new Date().toISOString().slice(0, 10);
    const fileName = `sokos_sales_${dateStamp}.csv`;

    triggerDownload(csvContent, fileName);
    return { rowCount: sales.length, fileName, bytes: new Blob([csvContent]).size };
  },

  /**
   * Export catalog inventory and stock valuation to CSV
   */
  exportInventoryToCsv(products: Product[], storeName: string = 'Sokos Market'): { rowCount: number; fileName: string; bytes: number } {
    const headers = [
      'Barcode',
      'SKU',
      'Item Name',
      'Category',
      'Current Stock',
      'Unit',
      'Cost Price (KES)',
      'Retail Selling Price (KES)',
      'Wholesale Price (KES)',
      'Total Valuation at Cost (KES)',
      'Min Stock Alert',
      'Stock Status',
      'KRA VAT Classification',
      'Published on Sokos.co.ke',
      'Last Updated'
    ];

    const rows = products.map(p => {
      const valuation = (p.stock * p.costPrice).toFixed(2);
      const stockStatus = p.stock <= 0 ? 'OUT OF STOCK' : p.stock <= p.minStockAlert ? 'LOW STOCK' : 'IN STOCK';
      const lastUpdated = new Date(p.updatedAt).toLocaleString('en-KE');

      return [
        p.barcode,
        p.sku,
        p.name,
        p.category,
        p.stock,
        p.unit,
        p.costPrice.toFixed(2),
        p.price.toFixed(2),
        (p.wholesalePrice || p.price).toFixed(2),
        valuation,
        p.minStockAlert,
        stockStatus,
        p.vatClassification,
        p.publishedOnSokos ? 'YES' : 'NO',
        lastUpdated
      ].map(escapeCsvCell).join(',');
    });

    const csvContent = [headers.map(escapeCsvCell).join(','), ...rows].join('\r\n');
    const dateStamp = new Date().toISOString().slice(0, 10);
    const fileName = `sokos_inventory_valuation_${dateStamp}.csv`;

    triggerDownload(csvContent, fileName);
    return { rowCount: products.length, fileName, bytes: new Blob([csvContent]).size };
  },

  /**
   * Export daily petty cash expenses and payouts to CSV
   */
  exportExpensesToCsv(expenses: DukaExpense[]): { rowCount: number; fileName: string; bytes: number } {
    const headers = [
      'Date & Time',
      'Expense Description',
      'Category',
      'Paid Via',
      'Amount (KES)',
      'Receipt / Boda / Ticket Ref',
      'Recorded By'
    ];

    const rows = expenses.map(e => {
      const dateStr = new Date(e.timestamp).toLocaleString('en-KE');
      return [
        dateStr,
        e.description,
        e.category.replace('_', ' ').toUpperCase(),
        e.paidVia.toUpperCase(),
        e.amount.toFixed(2),
        e.receiptOrRef || 'N/A',
        e.recordedBy
      ].map(escapeCsvCell).join(',');
    });

    const csvContent = [headers.map(escapeCsvCell).join(','), ...rows].join('\r\n');
    const dateStamp = new Date().toISOString().slice(0, 10);
    const fileName = `sokos_duka_expenses_${dateStamp}.csv`;

    triggerDownload(csvContent, fileName);
    return { rowCount: expenses.length, fileName, bytes: new Blob([csvContent]).size };
  },

  /**
   * Export customer credit / deni ledger
   */
  exportCreditLedgerToCsv(accounts: CustomerCreditAccount[]): { rowCount: number; fileName: string; bytes: number } {
    const headers = [
      'Customer Name',
      'Phone Number',
      'National ID / Location',
      'Credit Limit (KES)',
      'Current Outstanding Debt (KES)',
      'Account Status',
      'Created Date',
      'Last Updated'
    ];

    const rows = accounts.map(a => {
      return [
        a.name,
        a.phone,
        a.idNumber || a.location || 'N/A',
        a.creditLimit.toFixed(2),
        a.currentBalance.toFixed(2),
        a.status.toUpperCase(),
        new Date(a.createdAt).toLocaleDateString('en-KE'),
        new Date(a.updatedAt).toLocaleDateString('en-KE')
      ].map(escapeCsvCell).join(',');
    });

    const csvContent = [headers.map(escapeCsvCell).join(','), ...rows].join('\r\n');
    const dateStamp = new Date().toISOString().slice(0, 10);
    const fileName = `sokos_deni_credit_ledger_${dateStamp}.csv`;

    triggerDownload(csvContent, fileName);
    return { rowCount: accounts.length, fileName, bytes: new Blob([csvContent]).size };
  },

  /**
   * Export End of Day Z-Report to CSV
   */
  exportZReportToCsv(report: EodZReport, expenses: DukaExpense[]): { fileName: string; bytes: number } {
    const summaryRows = [
      ['SOKOS POS END OF DAY Z-REPORT (CASH RECONCILIATION)', ''],
      ['Report ID', report.id],
      ['Date', report.dateStr],
      ['Generated At', new Date(report.generatedAt).toLocaleString('en-KE')],
      ['Cashier', report.cashierName],
      ['', ''],
      ['FINANCIAL RECONCILIATION', 'AMOUNT (KES)'],
      ['Opening Cash Float', report.openingCashFloat.toFixed(2)],
      ['Gross Sales Turnover', report.grossSalesKes.toFixed(2)],
      ['Cash Sales Collected', report.cashSalesKes.toFixed(2)],
      ['M-Pesa Till Sales', report.mpesaSalesKes.toFixed(2)],
      ['Customer Credit (Deni) Sales', report.creditSalesKes.toFixed(2)],
      ['Card / Bank POS Sales', report.cardSalesKes.toFixed(2)],
      ['Online Sokos.co.ke Orders', report.ecommerceSalesKes.toFixed(2)],
      ['Debt Repayments Collected (Cash)', report.debtRepaymentsCollectedKes.toFixed(2)],
      ['Total Cash Drawer Inflow', report.totalCashInDrawer.toFixed(2)],
      ['Total Petty Cash Payouts / Expenses', (-report.totalExpensesPaidOutKes).toFixed(2)],
      ['EXPECTED FINAL DRAWER CASH', report.expectedFinalCashInTill.toFixed(2)],
      ['KRA VAT Collected', report.vatCollectedKes.toFixed(2)],
      ['Total Discounts Given', report.discountsGivenKes.toFixed(2)],
      ['', ''],
      ['DUKA EXPENSES BREAKDOWN IN THIS SHIFT', ''],
      ['Time', 'Description', 'Category', 'Paid Via', 'Amount (KES)', 'Ref']
    ];

    const expenseRows = expenses.map(e => [
      new Date(e.timestamp).toLocaleTimeString('en-KE'),
      e.description,
      e.category,
      e.paidVia,
      e.amount.toFixed(2),
      e.receiptOrRef || ''
    ]);

    const allLines = [
      ...summaryRows.map(r => r.map(escapeCsvCell).join(',')),
      ...expenseRows.map(r => r.map(escapeCsvCell).join(','))
    ];

    const csvContent = allLines.join('\r\n');
    const dateStamp = report.dateStr.replace(/[^a-zA-Z0-9]/g, '_');
    const fileName = `sokos_z_report_${dateStamp}.csv`;

    triggerDownload(csvContent, fileName);
    return { fileName, bytes: new Blob([csvContent]).size };
  }
};
