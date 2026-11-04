import React, { useState } from 'react';
import { Wallet, Plus, X, Trash2, Banknote, Smartphone, Check } from 'lucide-react';
import { DukaExpense, StoreConfig } from '../types/pos';
import { playScanBeep } from '../services/sound';

interface DukaExpensesModalProps {
  isOpen: boolean;
  onClose: () => void;
  expenses: DukaExpense[];
  config: StoreConfig;
  cashierName: string;
  onAddExpense: (expense: DukaExpense) => void;
  onDeleteExpense: (id: string) => void;
}

export const DukaExpensesModal: React.FC<DukaExpensesModalProps> = ({
  isOpen,
  onClose,
  expenses,
  config,
  cashierName,
  onAddExpense,
  onDeleteExpense,
}) => {
  const [desc, setDesc] = useState('');
  const [amount, setAmount] = useState<number | ''>('');
  const [category, setCategory] = useState<DukaExpense['category']>('boda_transport');
  const [paidVia, setPaidVia] = useState<'cash' | 'mpesa'>('cash');
  const [receiptRef, setReceiptRef] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!desc.trim() || typeof amount !== 'number' || amount <= 0) return;

    const newExp: DukaExpense = {
      id: `exp-${Date.now()}`,
      description: desc.trim(),
      category,
      amount,
      paidVia,
      recordedBy: cashierName,
      receiptOrRef: receiptRef.trim() || undefined,
      timestamp: Date.now(),
    };

    onAddExpense(newExp);
    playScanBeep();
    setDesc('');
    setAmount('');
    setReceiptRef('');
  };

  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
  const cashExpenses = expenses.filter((e) => e.paidVia === 'cash').reduce((sum, e) => sum + e.amount, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col font-sans">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-amber-500/15 text-amber-400 flex items-center justify-center border border-amber-500/30">
              <Wallet className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base">Matumizi Ya Duka (Till Payouts)</h3>
              <p className="text-xs text-slate-400">Petty cash, boda delivery & daily supplier payouts</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Total Summary Strip */}
        <div className="p-3 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between font-mono text-xs">
          <span className="text-slate-400">Jumla ya Matumizi Leo:</span>
          <div className="flex items-center gap-3">
            <span className="text-amber-400 font-bold">
              {config.currencySymbol}{totalExpenses.toFixed(2)}
            </span>
            <span className="text-slate-500 text-[10px]">
              (Cash out of till: {config.currencySymbol}{cashExpenses.toFixed(0)})
            </span>
          </div>
        </div>

        {/* Content: Form & List */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {/* Add Expense Form */}
          <form onSubmit={handleSubmit} className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
            <span className="text-xs font-mono font-bold text-white block">
              + Toa Pesa Kwenye Till (Record Expense)
            </span>

            <div>
              <input
                type="text"
                required
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
                placeholder="Maelezo (e.g. Boda rider Kilimani delivery, KPLC tokens, Kanjo fee)..."
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] font-mono text-slate-400 block mb-1">Aina ya Matumizi</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as any)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
                >
                  <option value="boda_transport">Boda / Transport</option>
                  <option value="kanjo_license">Kanjo / Market Fee</option>
                  <option value="tokens_power">KPLC Stima Tokens</option>
                  <option value="stock_delivery">Supplier / Bread Crate</option>
                  <option value="staff_lunch">Chai / Staff Lunch</option>
                  <option value="cleaning_supplies">Cleaning & Bags</option>
                  <option value="other">Matumizi Mengine</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-mono text-slate-400 block mb-1">Kiasi ({config.currencySymbol}) *</label>
                <input
                  type="number"
                  step="1"
                  required
                  value={amount}
                  onChange={(e) => setAmount(e.target.value === '' ? '' : parseFloat(e.target.value))}
                  placeholder="KSh"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-between gap-2 pt-1">
              <div className="flex items-center gap-1.5 text-xs font-mono">
                <span className="text-slate-400 text-[11px]">Ililipwa:</span>
                <button
                  type="button"
                  onClick={() => setPaidVia('cash')}
                  className={`px-2 py-0.5 rounded text-[11px] font-semibold transition ${paidVia === 'cash' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400'}`}
                >
                  Cash Drawer
                </button>
                <button
                  type="button"
                  onClick={() => setPaidVia('mpesa')}
                  className={`px-2 py-0.5 rounded text-[11px] font-semibold transition ${paidVia === 'mpesa' ? 'bg-emerald-500 text-slate-950 font-bold' : 'text-slate-400'}`}
                >
                  M-Pesa Till
                </button>
              </div>

              <button
                type="submit"
                className="px-4 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs font-mono transition shadow-sm"
              >
                Hifadhi
              </button>
            </div>
          </form>

          {/* Expenses List */}
          <div className="space-y-1.5">
            <span className="text-xs font-mono text-slate-400 block uppercase tracking-wider text-[10px]">
              Orodha ya Matumizi Leo:
            </span>

            {expenses.length === 0 ? (
              <p className="text-xs text-slate-500 font-mono text-center py-4">
                Hakuna matumizi yaliyorekodiwa leo.
              </p>
            ) : (
              expenses.map((exp) => (
                <div
                  key={exp.id}
                  className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between text-xs font-mono"
                >
                  <div>
                    <p className="font-sans font-medium text-slate-200">{exp.description}</p>
                    <p className="text-[10px] text-slate-500">
                      {new Date(exp.timestamp).toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' })} · {exp.paidVia.toUpperCase()} · By {exp.recordedBy}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-amber-400">
                      -{config.currencySymbol}{exp.amount.toFixed(2)}
                    </span>
                    <button
                      onClick={() => onDeleteExpense(exp.id)}
                      className="text-slate-500 hover:text-red-400 p-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-800 bg-slate-900/90 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 text-slate-300 text-xs font-mono font-medium hover:bg-slate-700 transition"
          >
            Funga (Done)
          </button>
        </div>
      </div>
    </div>
  );
};
