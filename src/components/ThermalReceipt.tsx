import React, { useState } from 'react';
import { Printer, Share2, Copy, Check, X, Smartphone, MessageSquare, Download, Sparkles, ShieldCheck } from 'lucide-react';
import { Sale, StoreConfig } from '../types/pos';
import { ProductBarcodeLabel } from './ProductBarcodeLabel';

interface ThermalReceiptProps {
  sale: Sale;
  config: StoreConfig;
  isOpen: boolean;
  onClose: () => void;
  onNewSale?: () => void;
}

export const ThermalReceipt: React.FC<ThermalReceiptProps> = ({
  sale,
  config,
  isOpen,
  onClose,
  onNewSale,
}) => {
  const [copied, setCopied] = useState(false);
  const [customerPhoneInput, setCustomerPhoneInput] = useState(sale.customerPhone || '');
  const [showShareOptions, setShowShareOptions] = useState(false);

  if (!isOpen) return null;

  const formattedDate = new Date(sale.timestamp).toLocaleString('en-KE', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  // Construct Kenyan text receipt for SMS/WhatsApp
  const constructPlainTextReceipt = () => {
    let text = `🌿 ${config.storeName.toUpperCase()}\n`;
    text += `${config.tagline}\n`;
    text += `${config.address}\n`;
    text += `KRA PIN: ${config.taxId} | CU: ${config.etimsCuNumber}\n`;
    text += `Till No: ${config.mpesaTillNumber}\n`;
    text += `--------------------------------\n`;
    text += `STAKABADHI / RECEIPT: ${sale.receiptNumber}\n`;
    if (sale.etimsInfo) {
      text += `KRA eTIMS CTRL: ${sale.etimsInfo.kraControlNumber}\n`;
    }
    text += `TAREHE / DATE: ${formattedDate}\n`;
    text += `CASHIER: ${sale.cashierName}\n`;
    if (sale.customerName) text += `MTEJA / CUSTOMER: ${sale.customerName}\n`;
    text += `--------------------------------\n`;
    text += `BIDHAA / ITEMS:\n`;

    sale.items.forEach((item) => {
      text += `${item.name.substring(0, 22)} [${item.vatClassification || 'A'}]\n`;
      text += `  ${item.quantity} x ${config.currencySymbol} ${item.unitPrice.toFixed(2)} = ${config.currencySymbol} ${item.subtotal.toFixed(2)}\n`;
    });

    text += `--------------------------------\n`;
    text += `JUMLA NDOGO / SUBTOTAL: ${config.currencySymbol} ${sale.subtotal.toFixed(2)}\n`;
    if (sale.discountTotal > 0) {
      text += `PUNGUZO / DISCOUNT: -${config.currencySymbol} ${sale.discountTotal.toFixed(2)}\n`;
    }
    text += `VAT (16% INCL): ${config.currencySymbol} ${sale.taxTotal.toFixed(2)}\n`;
    text += `JUMLA KUU / TOTAL: ${config.currencySymbol} ${sale.grandTotal.toFixed(2)}\n`;
    text += `--------------------------------\n`;

    if (sale.paymentMethod === 'mpesa') {
      text += `MALIPO: M-PESA TILL (${config.mpesaTillNumber})\n`;
      text += `M-PESA REF: ${sale.paymentReference || sale.mpesaDetails?.mpesaReceipt || 'CONFIRMED'}\n`;
    } else if (sale.paymentMethod === 'cash') {
      text += `MALIPO: PESA MKONONI (CASH)\n`;
      text += `ZILIZOTOLEWA: ${config.currencySymbol} ${sale.amountTendered.toFixed(2)}\n`;
      text += `CHENJI / CHANGE: ${config.currencySymbol} ${sale.changeDue.toFixed(2)}\n`;
    } else if (sale.paymentMethod === 'credit') {
      text += `MALIPO: MALI YA DENI (STORE CREDIT)\n`;
    } else if (sale.paymentMethod === 'split' && sale.splitPayment) {
      text += `MALIPO YA PAMOJA:\n`;
      text += `  Cash: ${config.currencySymbol} ${sale.splitPayment.cashAmount.toFixed(2)}\n`;
      text += `  M-Pesa: ${config.currencySymbol} ${sale.splitPayment.mpesaAmount.toFixed(2)} (${sale.splitPayment.mpesaReceipt || ''})\n`;
    }

    text += `--------------------------------\n`;
    text += `${config.receiptFooterMessage}\n`;
    text += `Powered by Sokos POS (Kenya Data-Conscious)\n`;
    return text;
  };

  const handlePrint = () => {
    window.print();
  };

  const handleCopy = () => {
    const text = constructPlainTextReceipt();
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleWhatsAppShare = () => {
    const text = encodeURIComponent(constructPlainTextReceipt());
    const phone = customerPhoneInput.replace(/[^0-9]/g, '');
    const intPhone = phone.startsWith('0') ? '254' + phone.slice(1) : phone;
    const url = intPhone ? `https://wa.me/${intPhone}?text=${text}` : `https://wa.me/?text=${text}`;
    window.open(url, '_blank');
  };

  const handleSmsShare = () => {
    const text = encodeURIComponent(constructPlainTextReceipt());
    const phone = customerPhoneInput.replace(/[^0-9]/g, '');
    window.location.href = `sms:${phone}?body=${text}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden my-auto max-h-[95vh] flex flex-col">
        {/* Modal Top Bar (Hidden in Print) */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-800 bg-slate-900/90 print:hidden">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <h3 className="font-semibold text-white text-sm">Stakabadhi Ya KRA eTIMS</h3>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Action Controls Bar */}
        <div className="p-3 bg-slate-950/50 border-b border-slate-800 flex flex-wrap items-center gap-2 print:hidden">
          <button
            onClick={handlePrint}
            className="flex-1 min-w-[100px] py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs flex items-center justify-center gap-1.5 transition shadow-sm"
          >
            <Printer className="w-4 h-4" />
            Print 58/80mm
          </button>

          <button
            onClick={handleCopy}
            className="py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium flex items-center gap-1.5 transition"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            {copied ? 'Copied' : 'Copy'}
          </button>

          <button
            onClick={() => setShowShareOptions(!showShareOptions)}
            className="py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium flex items-center gap-1.5 transition"
          >
            <Share2 className="w-4 h-4 text-emerald-400" />
            WhatsApp
          </button>
        </div>

        {/* Digital Share Expandable Drawer */}
        {showShareOptions && (
          <div className="px-4 py-3 bg-slate-900 border-b border-slate-800 space-y-2 animate-in fade-in print:hidden">
            <div className="flex items-center gap-2">
              <input
                type="tel"
                value={customerPhoneInput}
                onChange={(e) => setCustomerPhoneInput(e.target.value)}
                placeholder="Simu ya Mteja (0712345678)"
                className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-slate-500 font-mono focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleWhatsAppShare}
                className="flex-1 py-1.5 bg-emerald-700 hover:bg-emerald-600 text-white rounded-lg text-xs font-medium flex items-center justify-center gap-1 transition"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                Tuma WhatsApp
              </button>
              <button
                onClick={handleSmsShare}
                className="flex-1 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium flex items-center justify-center gap-1 transition"
              >
                <Smartphone className="w-3.5 h-3.5" />
                Tuma SMS
              </button>
            </div>
          </div>
        )}

        {/* ----------------- RECEIPT BODY (PRINTABLE AREA) ----------------- */}
        <div className="p-4 sm:p-5 bg-slate-900/60 overflow-y-auto flex-1">
          <div
            id="thermal-receipt-print-area"
            className="bg-white text-black p-5 rounded-lg font-mono text-xs leading-relaxed max-w-[340px] mx-auto border border-dashed border-gray-400 shadow-inner"
          >
            {/* Header Brand */}
            <div className="text-center pb-2 border-b border-black">
              <div className="flex items-center justify-center gap-1.5 mb-1">
                <span className="text-base">🌿</span>
                <span className="font-extrabold text-sm tracking-widest text-black">
                  {config.storeName.toUpperCase()}
                </span>
              </div>
              <p className="text-[10px] uppercase font-bold text-gray-700">{config.tagline}</p>
              <p className="text-[10px] text-gray-600">{config.address}</p>
              <p className="text-[10px] text-gray-600">Simu: {config.phone}</p>
              <p className="text-[10px] text-gray-800 font-bold">KRA PIN: {config.taxId}</p>
              <p className="text-[10px] text-gray-800">eTIMS CU: {config.etimsCuNumber}</p>
              <p className="text-[10px] text-emerald-800 font-bold">M-PESA TILL: {config.mpesaTillNumber}</p>
            </div>

            {/* Receipt Metadata */}
            <div className="py-2 text-[11px] border-b border-dashed border-gray-400 space-y-0.5">
              <div className="flex justify-between font-bold">
                <span className="text-gray-600">INVOICE NO:</span>
                <span>{sale.receiptNumber}</span>
              </div>
              {sale.etimsInfo && (
                <div className="flex justify-between text-[10px]">
                  <span className="text-gray-600">CONTROL NO:</span>
                  <span className="font-bold">{sale.etimsInfo.kraControlNumber}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-600">DATE & TIME:</span>
                <span>{formattedDate}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">CASHIER:</span>
                <span>{sale.cashierName}</span>
              </div>
              {sale.customerName && (
                <div className="flex justify-between">
                  <span className="text-gray-600">CUSTOMER:</span>
                  <span className="font-semibold">{sale.customerName}</span>
                </div>
              )}
            </div>

            {/* Itemized Line Table */}
            <div className="py-2 border-b border-black">
              <div className="flex justify-between font-bold text-[10px] pb-1 border-b border-gray-300">
                <span className="w-1/2">ITEM / RATE</span>
                <span className="w-1/4 text-center">QTY</span>
                <span className="w-1/4 text-right">TOTAL</span>
              </div>

              <div className="divide-y divide-gray-100 py-1 space-y-1">
                {sale.items.map((item, idx) => (
                  <div key={idx} className="pt-1">
                    <div className="flex justify-between font-semibold text-[11px] leading-tight">
                      <span>{item.name}</span>
                      <span className="text-[9px] text-gray-500 font-normal">
                        [{item.vatClassification || 'A'}]
                      </span>
                    </div>
                    <div className="flex justify-between text-[10px] text-gray-600">
                      <span>
                        {item.quantity} @ {config.currencySymbol} {item.unitPrice.toFixed(2)}
                        {item.isWholesale && ' (Jumla)'}
                        {item.discountPercent > 0 && ` (-${item.discountPercent}%)`}
                      </span>
                      <span className="font-bold text-black text-right">
                        {config.currencySymbol} {item.subtotal.toFixed(2)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Totals Calculation */}
            <div className="py-2 space-y-1 border-b border-black text-[11px]">
              <div className="flex justify-between text-gray-700">
                <span>SUBTOTAL (Net):</span>
                <span>{config.currencySymbol} {(sale.subtotal - sale.taxTotal).toFixed(2)}</span>
              </div>

              {sale.discountTotal > 0 && (
                <div className="flex justify-between text-emerald-800 font-medium">
                  <span>DISCOUNT:</span>
                  <span>-{config.currencySymbol} {sale.discountTotal.toFixed(2)}</span>
                </div>
              )}

              <div className="flex justify-between text-gray-700">
                <span>KRA VAT (16% Included):</span>
                <span>{config.currencySymbol} {sale.taxTotal.toFixed(2)}</span>
              </div>

              <div className="flex justify-between text-base font-extrabold pt-1 border-t border-dashed border-gray-400">
                <span>JUMLA KUU / TOTAL:</span>
                <span>{config.currencySymbol} {sale.grandTotal.toFixed(2)}</span>
              </div>
            </div>

            {/* Payment Details */}
            <div className="py-2 text-[10px] border-b border-dashed border-gray-400 space-y-0.5">
              <div className="flex justify-between">
                <span className="text-gray-600">METHOD:</span>
                <span className="font-bold uppercase">
                  {sale.paymentMethod === 'mpesa' ? 'M-PESA (TILL)' :
                   sale.paymentMethod === 'cash' ? 'PESA MKONONI (CASH)' :
                   sale.paymentMethod === 'credit' ? 'MALI YA DENI (CREDIT)' :
                   sale.paymentMethod === 'split' ? 'SPLIT (CASH + M-PESA)' : sale.paymentMethod}
                </span>
              </div>

              {/* M-PESA Reference Code */}
              {(sale.paymentReference || sale.mpesaDetails) && (
                <div className="flex justify-between font-bold text-emerald-800">
                  <span>M-PESA REF:</span>
                  <span className="font-mono">{sale.paymentReference || sale.mpesaDetails?.mpesaReceipt}</span>
                </div>
              )}

              {/* Split details */}
              {sale.paymentMethod === 'split' && sale.splitPayment && (
                <>
                  <div className="flex justify-between text-gray-600">
                    <span>Cash Paid:</span>
                    <span>{config.currencySymbol} {sale.splitPayment.cashAmount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>M-Pesa Paid:</span>
                    <span>{config.currencySymbol} {sale.splitPayment.mpesaAmount.toFixed(2)}</span>
                  </div>
                </>
              )}

              {/* Cash Tendered & Change */}
              {sale.paymentMethod === 'cash' && (
                <>
                  <div className="flex justify-between text-gray-600">
                    <span>CASH TENDERED:</span>
                    <span>{config.currencySymbol} {sale.amountTendered.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-bold">
                    <span>CHANGE DUE (CHENJI):</span>
                    <span>{config.currencySymbol} {sale.changeDue.toFixed(2)}</span>
                  </div>
                </>
              )}
            </div>

            {/* KRA eTIMS Tax Rates Breakdown Table */}
            {sale.etimsInfo && (
              <div className="py-1.5 border-b border-black text-[9px] text-gray-600 space-y-0.5">
                <div className="font-bold uppercase text-[9px] text-black">
                  KRA eTIMS TAX ANALYSIS:
                </div>
                <div className="flex justify-between">
                  <span>Rate A - 16% (Standard):</span>
                  <span>{config.currencySymbol} {sale.etimsInfo.taxA_16.toFixed(2)}</span>
                </div>
                {sale.etimsInfo.vatC_0 > 0 && (
                  <div className="flex justify-between">
                    <span>Rate C - 0% (Zero-rated):</span>
                    <span>{config.currencySymbol} {sale.etimsInfo.vatC_0.toFixed(2)}</span>
                  </div>
                )}
                {sale.etimsInfo.vatD_Exempt > 0 && (
                  <div className="flex justify-between">
                    <span>Rate D - Exempt:</span>
                    <span>{config.currencySymbol} {sale.etimsInfo.vatD_Exempt.toFixed(2)}</span>
                  </div>
                )}
              </div>
            )}

            {/* Barcode & eTIMS Verification Code */}
            <div className="pt-2 pb-1 text-center flex flex-col items-center">
              <ProductBarcodeLabel
                barcode={sale.receiptNumber.replace(/[^0-9A-Z]/g, '')}
                height={28}
                width={1.1}
                fontSize={8}
              />
              <span className="text-[8px] text-gray-500 font-mono mt-0.5">
                eTIMS Sign: {sale.etimsInfo?.cuSerialNumber || 'KRA-VALIDATED'}
              </span>
            </div>

            {/* Footer Message */}
            <div className="text-center pt-2 text-[10px] text-gray-700 border-t border-gray-200 mt-1">
              <p className="font-semibold">{config.receiptFooterMessage}</p>
              <p className="text-[8px] text-gray-400 mt-0.5">
                Sokos POS • Hakuna kurudisha bidhaa bila risiti
              </p>
            </div>
          </div>
        </div>

        {/* Modal Bottom Buttons */}
        <div className="px-5 py-3 border-t border-slate-800 bg-slate-900/90 flex items-center justify-between print:hidden">
          <span className="text-xs text-slate-400">
            Hali: <span className="text-emerald-400 font-mono font-bold">KRA eTIMS OK</span>
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition"
            >
              Funga
            </button>
            {onNewSale && (
              <button
                onClick={() => {
                  onClose();
                  onNewSale();
                }}
                className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1 transition shadow-sm"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Mauzo Mengine (Next)
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
