import React, { useState } from 'react';
import { 
  FileSpreadsheet, Printer, X, DollarSign, Smartphone, Banknote, 
  CreditCard, Users, ShieldCheck, CheckCircle2, AlertCircle, ShoppingBag, Wallet, Download
} from 'lucide-react';
import { Sale, StoreConfig, CreditTransaction, DukaExpense, EcommerceOrder, EodZReport } from '../types/pos';
import { csvExportService } from '../services/csvExportService';

interface EodReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  sales: Sale[];
  creditTransactions: CreditTransaction[];
  expenses: DukaExpense[];
  ecommerceOrders: EcommerceOrder[];
  config: StoreConfig;
  cashierName: string;
  onOpenDataPipeline?: () => void;
}

export const EodReportModal: React.FC<EodReportModalProps> = ({
  isOpen,
  onClose,
  sales,
  creditTransactions,
  expenses,
  ecommerceOrders,
  config,
  cashierName,
  onOpenDataPipeline,
}) => {
  const [openingFloat, setOpeningFloat] = useState<number>(2000); // Default KSh 2,000 opening float
  const [csvDownloaded, setCsvDownloaded] = useState(false);

  if (!isOpen) return null;

  // Filter for today's transactions (Kenyan business day)
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayStartTs = todayStart.getTime();

  const todaySales = sales.filter((s) => s.timestamp >= todayStartTs);
  const todayRepayments = creditTransactions.filter(
    (tx) => tx.type === 'PAYMENT_RECEIVED' && tx.timestamp >= todayStartTs
  );
  const todayExpenses = expenses.filter((e) => e.timestamp >= todayStartTs);
  const todayEcommerceOrders = ecommerceOrders.filter(
    (o) => o.createdAt >= todayStartTs && (o.orderStatus === 'delivered' || o.orderStatus === 'dispatched' || o.orderStatus === 'accepted')
  );

  // Financial calculations
  let grossSales = 0;
  let cashSales = 0;
  let mpesaSales = 0;
  let cardSales = 0;
  let creditSales = 0;
  let totalDiscounts = 0;
  let totalVat = 0;

  todaySales.forEach((s) => {
    grossSales += s.grandTotal;
    totalDiscounts += s.discountTotal || 0;
    totalVat += s.taxTotal || 0;

    if (s.paymentMethod === 'cash') {
      cashSales += s.grandTotal;
    } else if (s.paymentMethod === 'mpesa') {
      mpesaSales += s.grandTotal;
    } else if (s.paymentMethod === 'credit') {
      creditSales += s.grandTotal;
    } else if (s.paymentMethod === 'card') {
      cardSales += s.grandTotal;
    } else if (s.paymentMethod === 'split' && s.splitPayment) {
      cashSales += s.splitPayment.cashAmount;
      mpesaSales += s.splitPayment.mpesaAmount;
    }
  });

  // Online orders revenue
  let onlineEcommerceRevenue = 0;
  todayEcommerceOrders.forEach((o) => {
    onlineEcommerceRevenue += o.total;
    if (o.paymentStatus === 'paid_mpesa') {
      mpesaSales += o.total;
    }
  });

  // Cash repayments collected today
  let cashDebtRepayments = 0;
  let mpesaDebtRepayments = 0;
  todayRepayments.forEach((tx) => {
    if (tx.paymentMethod === 'cash') cashDebtRepayments += tx.amount;
    else if (tx.paymentMethod === 'mpesa') mpesaDebtRepayments += tx.amount;
  });

  // Daily till expenses paid out
  let totalExpensesPaid = 0;
  let cashExpensesPaid = 0;
  todayExpenses.forEach((e) => {
    totalExpensesPaid += e.amount;
    if (e.paidVia === 'cash') cashExpensesPaid += e.amount;
  });

  const expectedCashInTill = openingFloat + cashSales + cashDebtRepayments - cashExpensesPaid;
  const totalMpesaReconcile = mpesaSales + mpesaDebtRepayments;

  const handlePrint = () => {
    window.print();
  };

  const todayFormatted = new Date().toLocaleDateString('en-KE', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto animate-in fade-in font-sans">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col">
        {/* Header (Hidden in Print) */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/90 print:hidden">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
              <FileSpreadsheet className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base leading-tight">Daily Z-Report & EOD Balancing</h3>
              <p className="text-xs text-slate-400">In-Store, Sokos.co.ke Orders, Till Expenses & KRA eTIMS</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Action Toolbar */}
        <div className="p-3 bg-slate-950/60 border-b border-slate-800 flex items-center justify-between gap-2 print:hidden">
          <div className="flex items-center gap-2 text-xs font-mono">
            <span className="text-slate-400">Opening Cash Float:</span>
            <input
              type="number"
              value={openingFloat}
              onChange={(e) => setOpeningFloat(parseFloat(e.target.value) || 0)}
              className="w-24 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white font-bold font-mono focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                const zReportData: EodZReport = {
                  id: `Z-${Date.now()}`,
                  dateStr: todayFormatted,
                  generatedAt: Date.now(),
                  cashierName,
                  openingCashFloat: openingFloat,
                  totalSalesCount: todaySales.length,
                  grossSalesKes: grossSales,
                  netSalesKes: grossSales - totalDiscounts,
                  cashSalesKes: cashSales,
                  mpesaSalesKes: mpesaSales,
                  creditSalesKes: creditSales,
                  cardSalesKes: cardSales,
                  ecommerceSalesKes: onlineEcommerceRevenue,
                  debtRepaymentsCollectedKes: cashDebtRepayments,
                  totalCashInDrawer: openingFloat + cashSales + cashDebtRepayments,
                  totalExpensesPaidOutKes: totalExpensesPaid,
                  expectedFinalCashInTill: expectedCashInTill,
                  vatCollectedKes: totalVat,
                  discountsGivenKes: totalDiscounts,
                };
                csvExportService.exportZReportToCsv(zReportData, todayExpenses);
                setCsvDownloaded(true);
                setTimeout(() => setCsvDownloaded(false), 2500);
              }}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-mono text-xs flex items-center gap-1.5 border border-slate-700 transition"
              title="Download Z-Report CSV"
            >
              <Download className="w-3.5 h-3.5 text-emerald-400" />
              <span>{csvDownloaded ? 'Downloaded!' : 'Export CSV'}</span>
            </button>

            {onOpenDataPipeline && (
              <button
                onClick={() => {
                  onClose();
                  onOpenDataPipeline();
                }}
                className="px-3 py-1.5 rounded-lg bg-emerald-950/70 hover:bg-emerald-900/70 text-emerald-300 font-mono text-xs flex items-center gap-1.5 border border-emerald-700/60 transition"
                title="Pipeline to Google Spreadsheets"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                <span>Sheets Pipeline</span>
              </button>
            )}

            <button
              onClick={handlePrint}
              className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs font-mono flex items-center gap-1.5 transition"
            >
              <Printer className="w-3.5 h-3.5" />
              Print Z-Report
            </button>
          </div>
        </div>

        {/* Printable Z-Report Body */}
        <div className="p-4 sm:p-6 overflow-y-auto bg-slate-950/40 flex-1">
          <div
            id="thermal-receipt-print-area"
            className="bg-white text-black p-5 rounded-lg font-mono text-xs max-w-[340px] mx-auto border border-dashed border-gray-400 shadow-inner"
          >
            {/* Header */}
            <div className="text-center pb-2 border-b border-black">
              <h2 className="font-extrabold text-sm tracking-wider">{config.storeName.toUpperCase()}</h2>
              <p className="text-[10px] text-gray-700 font-bold">DAILY Z-REPORT / RIPOTI YA SIKU</p>
              <p className="text-[10px] text-gray-600">{config.address}</p>
              <p className="text-[10px] text-gray-600">KRA PIN: {config.taxId} | eTIMS: {config.etimsCuNumber}</p>
              <p className="text-[10px] text-gray-600">Till: {config.mpesaTillNumber} · Sokos: {config.sokosPlatformUrl.split('/').pop()}</p>
            </div>

            {/* Audit Metadata */}
            <div className="py-2 border-b border-dashed border-gray-400 text-[11px] space-y-0.5">
              <div className="flex justify-between">
                <span className="text-gray-600">REPORT DATE:</span>
                <span className="font-bold">{todayFormatted}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">TIME GENERATED:</span>
                <span>{new Date().toLocaleTimeString('en-KE')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">CASHIER:</span>
                <span className="font-semibold">{cashierName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">IN-STORE ORDERS:</span>
                <span className="font-bold">{todaySales.length} orders</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">SOKOS.CO.KE ORDERS:</span>
                <span className="font-bold">{todayEcommerceOrders.length} online orders</span>
              </div>
            </div>

            {/* Sales Summary Breakdown */}
            <div className="py-2 border-b border-black space-y-1 text-[11px]">
              <div className="font-bold text-[10px] pb-1 uppercase border-b border-gray-300">
                SALES REVENUE (MAPATO YA MAUZI)
              </div>
              <div className="flex justify-between">
                <span>IN-STORE SALES:</span>
                <span className="font-bold">{config.currencySymbol} {grossSales.toFixed(2)}</span>
              </div>
              {onlineEcommerceRevenue > 0 && (
                <div className="flex justify-between text-teal-800 font-semibold">
                  <span>SOKOS.CO.KE ONLINE:</span>
                  <span>{config.currencySymbol} {onlineEcommerceRevenue.toFixed(2)}</span>
                </div>
              )}
              {totalDiscounts > 0 && (
                <div className="flex justify-between text-gray-700">
                  <span>TOTAL DISCOUNTS:</span>
                  <span>-{config.currencySymbol} {totalDiscounts.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-gray-700">
                <span>KRA VAT 16% COLLECTED:</span>
                <span>{config.currencySymbol} {totalVat.toFixed(2)}</span>
              </div>
            </div>

            {/* Payment Methods Breakdown */}
            <div className="py-2 border-b border-black space-y-1 text-[11px]">
              <div className="font-bold text-[10px] pb-1 uppercase border-b border-gray-300">
                PAYMENT METHODS (NJIA ZA MALIPO)
              </div>
              <div className="flex justify-between">
                <span>CASH SALES:</span>
                <span>{config.currencySymbol} {cashSales.toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-bold">
                <span>M-PESA SALES (TILL):</span>
                <span>{config.currencySymbol} {mpesaSales.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-gray-700">
                <span>STORE CREDIT (DENI):</span>
                <span>{config.currencySymbol} {creditSales.toFixed(2)}</span>
              </div>
            </div>

            {/* Daily Till Payouts & Expenses */}
            {totalExpensesPaid > 0 && (
              <div className="py-2 border-b border-black space-y-1 text-[11px]">
                <div className="font-bold text-[10px] pb-1 uppercase border-b border-gray-300 text-red-800">
                  DAILY EXPENSES / MATUMIZI (-):
                </div>
                {todayExpenses.map((exp, idx) => (
                  <div key={idx} className="flex justify-between text-gray-700 text-[10px]">
                    <span className="truncate max-w-[180px]">{exp.description}</span>
                    <span>-{config.currencySymbol} {exp.amount.toFixed(2)}</span>
                  </div>
                ))}
                <div className="flex justify-between font-bold text-red-800 pt-0.5 border-t border-gray-200">
                  <span>TOTAL MATUMIZI:</span>
                  <span>-{config.currencySymbol} {totalExpensesPaid.toFixed(2)}</span>
                </div>
              </div>
            )}

            {/* Cash Drawer Reconciliation */}
            <div className="py-2 border-b border-black space-y-1.5 text-[11px] bg-gray-50 p-2 rounded my-1">
              <div className="font-bold text-[10px] uppercase text-black">
                CASH REGISTER RECONCILIATION
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Opening Cash Float:</span>
                <span>{config.currencySymbol} {openingFloat.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>+ Cash Sales Today:</span>
                <span>{config.currencySymbol} {cashSales.toFixed(2)}</span>
              </div>
              {cashDebtRepayments > 0 && (
                <div className="flex justify-between text-gray-600">
                  <span>+ Debt Repayments (Cash):</span>
                  <span>{config.currencySymbol} {cashDebtRepayments.toFixed(2)}</span>
                </div>
              )}
              {cashExpensesPaid > 0 && (
                <div className="flex justify-between text-red-700 font-medium">
                  <span>- Cash Expenses Paid Out:</span>
                  <span>-{config.currencySymbol} {cashExpensesPaid.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between font-extrabold text-xs pt-1 border-t border-gray-300">
                <span>EXPECTED CASH IN DRAWER:</span>
                <span>{config.currencySymbol} {expectedCashInTill.toFixed(2)}</span>
              </div>
            </div>

            {/* M-PESA Reconciliation */}
            <div className="py-2 border-b border-black space-y-1 text-[11px]">
              <div className="font-bold text-[10px] uppercase text-black">
                M-PESA STATEMENT RECONCILIATION
              </div>
              <div className="flex justify-between text-gray-700">
                <span>Till In-Store + Online:</span>
                <span>{config.currencySymbol} {mpesaSales.toFixed(2)}</span>
              </div>
              {mpesaDebtRepayments > 0 && (
                <div className="flex justify-between text-gray-700">
                  <span>+ Debt Repayments via M-Pesa:</span>
                  <span>{config.currencySymbol} {mpesaDebtRepayments.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-xs pt-0.5">
                <span>TOTAL M-PESA RECEIVED:</span>
                <span>{config.currencySymbol} {totalMpesaReconcile.toFixed(2)}</span>
              </div>
            </div>

            {/* Signatures */}
            <div className="pt-3 pb-1 text-[10px] text-gray-600 space-y-3">
              <div className="flex justify-between pt-2 border-t border-gray-300">
                <span>Cashier Signature: _________________</span>
              </div>
              <div className="flex justify-between">
                <span>Manager Signature: _________________</span>
              </div>
              <p className="text-center text-[9px] text-gray-400 pt-1">
                Generated via Sokos POS · sokos.co.ke
              </p>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 border-t border-slate-800 bg-slate-900/90 flex justify-end print:hidden">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono font-medium transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
