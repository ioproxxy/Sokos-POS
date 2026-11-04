import React, { useState, useMemo } from 'react';
import { 
  Receipt, Search, Filter, Calendar, Printer, RotateCcw, 
  CheckCircle2, Clock, Smartphone, Banknote, CreditCard, DollarSign, 
  ArrowUpRight, Download, FileSpreadsheet, Check
} from 'lucide-react';
import { Sale, StoreConfig } from '../types/pos';
import { csvExportService } from '../services/csvExportService';

interface SalesHistoryProps {
  sales: Sale[];
  config: StoreConfig;
  onViewReceipt: (sale: Sale) => void;
  onVoidSale: (saleId: string) => void;
  onOpenDataPipeline?: () => void;
}

export const SalesHistory: React.FC<SalesHistoryProps> = ({
  sales,
  config,
  onViewReceipt,
  onVoidSale,
  onOpenDataPipeline,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [methodFilter, setMethodFilter] = useState('all');
  const [isCsvDownloaded, setIsCsvDownloaded] = useState(false);

  // Summary Metrics
  const summary = useMemo(() => {
    let totalRevenue = 0;
    let cashTotal = 0;
    let mobileTotal = 0;
    let cardTotal = 0;

    sales.forEach((s) => {
      totalRevenue += s.grandTotal;
      if (s.paymentMethod === 'cash') cashTotal += s.grandTotal;
      if (s.paymentMethod === 'mpesa') mobileTotal += s.grandTotal;
      if (s.paymentMethod === 'card') cardTotal += s.grandTotal;
      if (s.paymentMethod === 'split' && s.splitPayment) {
        cashTotal += s.splitPayment.cashAmount;
        mobileTotal += s.splitPayment.mpesaAmount;
      }
    });

    const averageBasket = sales.length > 0 ? totalRevenue / sales.length : 0;

    return {
      totalRevenue,
      totalOrders: sales.length,
      averageBasket,
      cashTotal,
      mobileTotal,
      cardTotal,
    };
  }, [sales]);

  // Filtered sales
  const filteredSales = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return sales.filter((s) => {
      const matchesMethod = methodFilter === 'all' || s.paymentMethod === methodFilter;
      const matchesQuery =
        !q ||
        s.receiptNumber.toLowerCase().includes(q) ||
        (s.customerName && s.customerName.toLowerCase().includes(q)) ||
        (s.customerPhone && s.customerPhone.includes(q)) ||
        (s.paymentReference && s.paymentReference.toLowerCase().includes(q));

      return matchesMethod && matchesQuery;
    });
  }, [sales, searchQuery, methodFilter]);

  return (
    <div className="flex-1 flex flex-col bg-slate-950 overflow-y-auto">
      {/* ----------------- REVENUE SUMMARY BAR ----------------- */}
      <div className="p-4 sm:p-5 border-b border-slate-800 bg-slate-900/60">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {/* Total Revenue */}
          <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800">
            <div className="flex items-center justify-between text-slate-400 text-xs">
              <span>Total Revenue</span>
              <DollarSign className="w-4 h-4 text-emerald-400" />
            </div>
            <p className="text-xl sm:text-2xl font-bold font-mono text-emerald-400 mt-1">
              {config.currencySymbol}{summary.totalRevenue.toFixed(2)}
            </p>
            <p className="text-[10px] text-slate-500 font-mono mt-0.5">
              Across {summary.totalOrders} transactions
            </p>
          </div>

          {/* Average Basket */}
          <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800">
            <div className="flex items-center justify-between text-slate-400 text-xs">
              <span>Avg. Basket Size</span>
              <ArrowUpRight className="w-4 h-4 text-sky-400" />
            </div>
            <p className="text-xl sm:text-2xl font-bold font-mono text-white mt-1">
              {config.currencySymbol}{summary.averageBasket.toFixed(2)}
            </p>
            <p className="text-[10px] text-slate-500 font-mono mt-0.5">
              Per customer receipt
            </p>
          </div>

          {/* Mobile Money Share */}
          <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800">
            <div className="flex items-center justify-between text-slate-400 text-xs">
              <span>Mobile Money</span>
              <Smartphone className="w-4 h-4 text-teal-400" />
            </div>
            <p className="text-xl sm:text-2xl font-bold font-mono text-teal-300 mt-1">
              {config.currencySymbol}{summary.mobileTotal.toFixed(2)}
            </p>
            <p className="text-[10px] text-slate-500 font-mono mt-0.5">
              M-Pesa & Mobile wallets
            </p>
          </div>

          {/* Cash Collected */}
          <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800">
            <div className="flex items-center justify-between text-slate-400 text-xs">
              <span>Cash Register</span>
              <Banknote className="w-4 h-4 text-emerald-400" />
            </div>
            <p className="text-xl sm:text-2xl font-bold font-mono text-white mt-1">
              {config.currencySymbol}{summary.cashTotal.toFixed(2)}
            </p>
            <p className="text-[10px] text-slate-500 font-mono mt-0.5">
              Physical cash collected
            </p>
          </div>
        </div>
      </div>

      {/* ----------------- SEARCH & FILTERS ----------------- */}
      <div className="p-3 sm:p-4 border-b border-slate-800 flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-between bg-slate-900/30">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search receipt #, customer name, or reference..."
            className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-400 font-mono focus:outline-none focus:border-emerald-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={methodFilter}
            onChange={(e) => setMethodFilter(e.target.value)}
            className="bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 font-mono focus:outline-none focus:border-emerald-500"
          >
            <option value="all">Njia Zote (All Methods)</option>
            <option value="mpesa">M-PESA Only</option>
            <option value="cash">Pesa Mkononi (Cash)</option>
            <option value="credit">Mali ya Deni (Credit)</option>
            <option value="split">Split (Cash + M-Pesa)</option>
            <option value="card">Card Only</option>
          </select>

          {/* Export to CSV */}
          <button
            onClick={() => {
              csvExportService.exportSalesToCsv(filteredSales, config.storeName);
              setIsCsvDownloaded(true);
              setTimeout(() => setIsCsvDownloaded(false), 2500);
            }}
            disabled={filteredSales.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 font-mono text-xs border border-slate-700 transition"
            title="Download Sales CSV"
          >
            {isCsvDownloaded ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Download className="w-3.5 h-3.5 text-emerald-400" />}
            <span className="hidden sm:inline">{isCsvDownloaded ? 'Exported!' : 'Export CSV'}</span>
          </button>

          {/* Pipeline to Google Sheets */}
          {onOpenDataPipeline && (
            <button
              onClick={onOpenDataPipeline}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-950/70 hover:bg-emerald-900/70 text-emerald-300 font-mono text-xs font-semibold border border-emerald-700/60 transition"
              title="Pipeline Sales to Google Spreadsheets"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden sm:inline">Sheets Pipeline</span>
            </button>
          )}
        </div>
      </div>

      {/* ----------------- TRANSACTIONS LIST / TABLE ----------------- */}
      <div className="flex-1 overflow-x-auto p-3 sm:p-4">
        {filteredSales.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center text-center p-6 text-slate-400">
            <Receipt className="w-12 h-12 text-slate-700 mb-2" />
            <p className="text-sm font-medium text-slate-300">No transactions recorded yet</p>
            <p className="text-xs text-slate-500 mt-1 max-w-xs">
              Complete sales in the POS Checkout tab to generate customer receipts and capture transaction records.
            </p>
          </div>
        ) : (
          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
            <table className="w-full text-left text-xs font-mono border-collapse">
              <thead>
                <tr className="bg-slate-950/80 text-slate-400 border-b border-slate-800 uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-3 sm:px-4">Receipt #</th>
                  <th className="py-3 px-3">Date & Time</th>
                  <th className="py-3 px-3">Items</th>
                  <th className="py-3 px-3">Customer</th>
                  <th className="py-3 px-3">Payment</th>
                  <th className="py-3 px-3">Total</th>
                  <th className="py-3 px-3">Sync</th>
                  <th className="py-3 px-3 sm:px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {filteredSales.map((sale) => {
                  const dateStr = new Date(sale.timestamp).toLocaleString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  });

                  return (
                    <tr key={sale.id} className="hover:bg-slate-850/60 transition group">
                      {/* Receipt Number */}
                      <td className="py-3 px-3 sm:px-4 font-bold text-slate-200">
                        {sale.receiptNumber}
                      </td>

                      {/* Date */}
                      <td className="py-3 px-3 text-slate-400">
                        {dateStr}
                      </td>

                      {/* Items Count & Snippet */}
                      <td className="py-3 px-3 text-slate-300">
                        <span>{sale.items.reduce((s, i) => s + i.quantity, 0)} units</span>
                        <span className="text-[10px] text-slate-500 block truncate max-w-[120px]">
                          {sale.items[0]?.name}
                          {sale.items.length > 1 && ` +${sale.items.length - 1} more`}
                        </span>
                      </td>

                      {/* Customer */}
                      <td className="py-3 px-3 text-slate-300">
                        {sale.customerName ? (
                          <div>
                            <span className="font-sans font-medium text-white">{sale.customerName}</span>
                            {sale.customerPhone && (
                              <span className="text-[10px] text-slate-500 block">{sale.customerPhone}</span>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-500">Walk-in</span>
                        )}
                      </td>

                      {/* Payment Method */}
                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 rounded bg-slate-800 text-[11px] font-semibold text-slate-300 uppercase">
                          {sale.paymentMethod.replace('_', ' ')}
                        </span>
                        {sale.paymentReference && (
                          <span className="text-[10px] text-teal-400 block mt-0.5">
                            {sale.paymentReference}
                          </span>
                        )}
                      </td>

                      {/* Grand Total */}
                      <td className="py-3 px-3 font-bold text-white text-sm">
                        {config.currencySymbol}{sale.grandTotal.toFixed(2)}
                      </td>

                      {/* Sync Status */}
                      <td className="py-3 px-3">
                        {sale.syncStatus === 'synced' ? (
                          <span className="flex items-center gap-1 text-[11px] text-emerald-400">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Synced</span>
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-[11px] text-amber-400">
                            <Clock className="w-3.5 h-3.5" />
                            <span>Pending</span>
                          </span>
                        )}
                      </td>

                      {/* Action buttons */}
                      <td className="py-3 px-3 sm:px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* View & Print Receipt */}
                          <button
                            onClick={() => onViewReceipt(sale)}
                            className="px-2.5 py-1 rounded-lg bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-500/40 text-emerald-300 text-[11px] font-medium flex items-center gap-1 transition"
                            title="Print / View Receipt"
                          >
                            <Printer className="w-3.5 h-3.5" />
                            <span>Receipt</span>
                          </button>

                          {/* Void Sale */}
                          <button
                            onClick={() => {
                              if (window.confirm(`Void sale ${sale.receiptNumber}? Items will be returned to inventory stock.`)) {
                                onVoidSale(sale.id);
                              }
                            }}
                            className="p-1 rounded-lg bg-slate-800 hover:bg-red-950 hover:text-red-400 text-slate-400 transition"
                            title="Void / Refund Sale (Restores Stock)"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
