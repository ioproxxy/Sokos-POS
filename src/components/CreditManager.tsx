import React, { useState, useMemo } from 'react';
import { 
  Users, DollarSign, Plus, Phone, AlertCircle, CheckCircle2, 
  Search, ArrowDownRight, ArrowUpRight, MessageSquare, Smartphone, 
  Banknote, X, Check, FileText
} from 'lucide-react';
import { CustomerCreditAccount, CreditTransaction, StoreConfig } from '../types/pos';
import { playSuccessChime } from '../services/sound';

interface CreditManagerProps {
  accounts: CustomerCreditAccount[];
  transactions: CreditTransaction[];
  config: StoreConfig;
  onAddAccount: (account: CustomerCreditAccount) => void;
  onRecordPayment: (transaction: Omit<CreditTransaction, 'id' | 'timestamp'>) => void;
}

export const CreditManager: React.FC<CreditManagerProps> = ({
  accounts,
  transactions,
  config,
  onAddAccount,
  onRecordPayment,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAccount, setSelectedAccount] = useState<CustomerCreditAccount | null>(null);
  
  // Modals
  const [isAddCustomerOpen, setIsAddCustomerOpen] = useState(false);
  const [isRepaymentModalOpen, setIsRepaymentModalOpen] = useState(false);
  const [repaymentAccount, setRepaymentAccount] = useState<CustomerCreditAccount | null>(null);

  // Repayment form
  const [repayAmount, setRepayAmount] = useState<number | ''>('');
  const [repayMethod, setRepayMethod] = useState<'cash' | 'mpesa'>('mpesa');
  const [repayMpesaRef, setRepayMpesaRef] = useState('');
  const [repayNotes, setRepayNotes] = useState('');

  // Add customer form
  const [newCustomerName, setNewCustomerName] = useState('');
  const [newCustomerPhone, setNewCustomerPhone] = useState('');
  const [newCustomerIdNumber, setNewCustomerIdNumber] = useState('');
  const [newCustomerLocation, setNewCustomerLocation] = useState('');
  const [newCustomerLimit, setNewCustomerLimit] = useState<number>(3000);
  const [newCustomerNotes, setNewCustomerNotes] = useState('');

  // Metrics
  const metrics = useMemo(() => {
    let totalOutstanding = 0;
    let debtorsCount = 0;
    accounts.forEach((a) => {
      totalOutstanding += a.currentBalance;
      if (a.currentBalance > 0) debtorsCount++;
    });
    return {
      totalOutstanding,
      debtorsCount,
      totalAccounts: accounts.length,
    };
  }, [accounts]);

  // Filtered accounts
  const filteredAccounts = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return accounts.filter((a) => {
      return (
        !q ||
        a.name.toLowerCase().includes(q) ||
        a.phone.includes(q) ||
        (a.location && a.location.toLowerCase().includes(q))
      );
    });
  }, [accounts, searchQuery]);

  // Handle Repayment Submission
  const handleRepaymentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!repaymentAccount || typeof repayAmount !== 'number' || repayAmount <= 0) return;

    const newBalance = Math.max(0, repaymentAccount.currentBalance - repayAmount);

    onRecordPayment({
      customerId: repaymentAccount.id,
      customerName: repaymentAccount.name,
      type: 'PAYMENT_RECEIVED',
      amount: repayAmount,
      runningBalanceAfter: newBalance,
      paymentMethod: repayMethod,
      mpesaReference: repayMethod === 'mpesa' ? repayMpesaRef.trim().toUpperCase() : undefined,
      notes: repayNotes.trim() || undefined,
    });

    playSuccessChime();
    setIsRepaymentModalOpen(false);
    setRepayAmount('');
    setRepayMpesaRef('');
    setRepayNotes('');
  };

  // Handle Add Customer Submission
  const handleAddCustomerSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustomerName.trim() || !newCustomerPhone.trim()) return;

    const newAcc: CustomerCreditAccount = {
      id: `cred-${Date.now()}`,
      name: newCustomerName.trim(),
      phone: newCustomerPhone.trim(),
      idNumber: newCustomerIdNumber.trim() || undefined,
      location: newCustomerLocation.trim() || undefined,
      creditLimit: newCustomerLimit || 3000,
      currentBalance: 0,
      status: 'active',
      notes: newCustomerNotes.trim() || undefined,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    onAddAccount(newAcc);
    setIsAddCustomerOpen(false);
    setNewCustomerName('');
    setNewCustomerPhone('');
    setNewCustomerIdNumber('');
    setNewCustomerLocation('');
    setNewCustomerNotes('');
  };

  // WhatsApp reminder generator
  const sendWhatsAppReminder = (account: CustomerCreditAccount) => {
    const text = encodeURIComponent(
      `Hujambo ${account.name},\nSalamu kutoka ${config.storeName}.\nTunakukumbusha salio lako la deni la dukani ni ${config.currencySymbol} ${account.currentBalance.toFixed(2)}.\nUnaweza kulipa kupitia M-Pesa Buy Goods Till: ${config.mpesaTillNumber}.\nAsante sana kwa uaminifu wako!`
    );
    const cleanPhone = account.phone.replace(/[^0-9]/g, '');
    const internationalPhone = cleanPhone.startsWith('0') ? '254' + cleanPhone.slice(1) : cleanPhone;
    window.open(`https://wa.me/${internationalPhone}?text=${text}`, '_blank');
  };

  return (
    <div className="flex-1 flex flex-col bg-slate-950 overflow-y-auto">
      {/* ----------------- TOP STATS CARDS ----------------- */}
      <div className="p-4 sm:p-5 border-b border-slate-800 bg-slate-900/60">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {/* Total Outstanding Debt */}
          <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800">
            <div className="flex items-center justify-between text-slate-400 text-xs font-mono">
              <span>Jumla Ya Deni (Owed)</span>
              <DollarSign className="w-4 h-4 text-amber-400" />
            </div>
            <p className="text-xl sm:text-2xl font-bold font-mono text-amber-300 mt-1">
              {config.currencySymbol}{metrics.totalOutstanding.toFixed(2)}
            </p>
            <p className="text-[10px] text-slate-500 font-mono mt-0.5">
              Across {metrics.debtorsCount} active debtor(s)
            </p>
          </div>

          {/* Active Debtors */}
          <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800">
            <div className="flex items-center justify-between text-slate-400 text-xs font-mono">
              <span>Wateja Wa Deni</span>
              <Users className="w-4 h-4 text-emerald-400" />
            </div>
            <p className="text-xl sm:text-2xl font-bold font-mono text-white mt-1">
              {metrics.debtorsCount} / {metrics.totalAccounts}
            </p>
            <p className="text-[10px] text-slate-500 font-mono mt-0.5">
              Registered credit accounts
            </p>
          </div>

          {/* Till Reminder info */}
          <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800">
            <div className="flex items-center justify-between text-slate-400 text-xs font-mono">
              <span>M-Pesa Till for Debt</span>
              <Smartphone className="w-4 h-4 text-teal-400" />
            </div>
            <p className="text-xl sm:text-2xl font-bold font-mono text-teal-300 mt-1">
              {config.mpesaTillNumber}
            </p>
            <p className="text-[10px] text-slate-500 font-mono mt-0.5">
              Buy Goods & Services Till
            </p>
          </div>

          {/* Add New Customer */}
          <div className="flex flex-col justify-center">
            <button
              onClick={() => setIsAddCustomerOpen(true)}
              className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md transition"
            >
              <Plus className="w-4 h-4" />
              <span>Sajili Mteja Mpya</span>
            </button>
          </div>
        </div>
      </div>

      {/* ----------------- SEARCH BAR ----------------- */}
      <div className="p-3 sm:p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/30">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search customer by name, phone, or location..."
            className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-400 font-mono focus:outline-none focus:border-emerald-500"
          />
        </div>
      </div>

      {/* ----------------- ACCOUNTS TABLE ----------------- */}
      <div className="flex-1 overflow-x-auto p-3 sm:p-4">
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
          <table className="w-full text-left text-xs font-mono border-collapse">
            <thead>
              <tr className="bg-slate-950/80 text-slate-400 border-b border-slate-800 uppercase tracking-wider text-[10px]">
                <th className="py-3 px-3 sm:px-4">Customer Name</th>
                <th className="py-3 px-3">Phone & Location</th>
                <th className="py-3 px-3">Credit Limit</th>
                <th className="py-3 px-3">Current Debt (Salio)</th>
                <th className="py-3 px-3 sm:px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {filteredAccounts.map((account) => {
                const hasDebt = account.currentBalance > 0;
                const isNearLimit = account.currentBalance >= account.creditLimit * 0.85;

                return (
                  <tr key={account.id} className="hover:bg-slate-850/60 transition group">
                    {/* Name */}
                    <td className="py-3 px-3 sm:px-4">
                      <div className="font-sans font-semibold text-white text-xs sm:text-sm">
                        {account.name}
                      </div>
                      {account.notes && (
                        <span className="text-[10px] text-slate-400 truncate max-w-xs block mt-0.5">
                          {account.notes}
                        </span>
                      )}
                    </td>

                    {/* Phone & Location */}
                    <td className="py-3 px-3 text-slate-300">
                      <div className="flex items-center gap-1 text-slate-200">
                        <Phone className="w-3 h-3 text-emerald-400" />
                        <span>{account.phone}</span>
                      </div>
                      {account.location && (
                        <span className="text-[10px] text-slate-500 block mt-0.5">
                          {account.location}
                        </span>
                      )}
                    </td>

                    {/* Credit Limit */}
                    <td className="py-3 px-3 text-slate-400">
                      {config.currencySymbol}{account.creditLimit.toFixed(0)}
                    </td>

                    {/* Outstanding Debt */}
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-1.5">
                        <span className={`font-bold text-sm ${hasDebt ? 'text-amber-400' : 'text-emerald-400'}`}>
                          {config.currencySymbol}{account.currentBalance.toFixed(2)}
                        </span>

                        {isNearLimit && (
                          <span className="px-1.5 py-0.2 rounded bg-red-950 text-red-400 border border-red-500/30 text-[9px] font-bold">
                            NEAR LIMIT
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-3 sm:px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* Repay Debt Button */}
                        {hasDebt && (
                          <button
                            onClick={() => {
                              setRepaymentAccount(account);
                              setRepayAmount(account.currentBalance);
                              setIsRepaymentModalOpen(true);
                            }}
                            className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold flex items-center gap-1 transition shadow-sm"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Lipa Deni</span>
                          </button>
                        )}

                        {/* WhatsApp Reminder */}
                        {hasDebt && (
                          <button
                            onClick={() => sendWhatsAppReminder(account)}
                            className="p-1.5 rounded-lg bg-teal-950 hover:bg-teal-900 border border-teal-500/40 text-teal-300 transition"
                            title="Tuma Ukumbusho WhatsApp"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ----------------- LIPA DENI (REPAYMENT) MODAL ----------------- */}
      {isRepaymentModalOpen && repaymentAccount && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                <div>
                  <h3 className="font-bold text-white text-sm">Pokea Malipo Ya Deni</h3>
                  <p className="text-xs text-slate-400">{repaymentAccount.name}</p>
                </div>
              </div>
              <button
                onClick={() => setIsRepaymentModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleRepaymentSubmit} className="p-5 space-y-4">
              {/* Balance card */}
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex justify-between items-center font-mono">
                <span className="text-xs text-slate-400">Salio La Deni Hivi Sasa:</span>
                <span className="text-base font-bold text-amber-400">
                  {config.currencySymbol}{repaymentAccount.currentBalance.toFixed(2)}
                </span>
              </div>

              {/* Payment Method */}
              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-slate-400 mb-1.5">
                  Njia Ya Malipo (Payment Method)
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setRepayMethod('mpesa')}
                    className={`py-2 px-3 rounded-xl border flex items-center justify-center gap-1.5 text-xs font-semibold transition ${
                      repayMethod === 'mpesa'
                        ? 'bg-emerald-950/80 border-emerald-500 text-white'
                        : 'bg-slate-800 border-slate-700 text-slate-400'
                    }`}
                  >
                    <Smartphone className="w-4 h-4 text-emerald-400" />
                    <span>M-PESA (Till / Paybill)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setRepayMethod('cash')}
                    className={`py-2 px-3 rounded-xl border flex items-center justify-center gap-1.5 text-xs font-semibold transition ${
                      repayMethod === 'cash'
                        ? 'bg-emerald-950/80 border-emerald-500 text-white'
                        : 'bg-slate-800 border-slate-700 text-slate-400'
                    }`}
                  >
                    <Banknote className="w-4 h-4 text-emerald-400" />
                    <span>Pesa Mkononi (Cash)</span>
                  </button>
                </div>
              </div>

              {/* Amount input */}
              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-slate-400 mb-1">
                  Kiasi Kilicholipwa ({config.currencySymbol})
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={repayAmount}
                  onChange={(e) => setRepayAmount(e.target.value === '' ? '' : parseFloat(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-base font-mono font-bold text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Mpesa reference */}
              {repayMethod === 'mpesa' && (
                <div>
                  <label className="block text-xs font-mono uppercase tracking-wider text-slate-400 mb-1">
                    M-Pesa Transaction Code (e.g. SLD984X7K2)
                  </label>
                  <input
                    type="text"
                    value={repayMpesaRef}
                    onChange={(e) => setRepayMpesaRef(e.target.value)}
                    placeholder="SLD984X7K2"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono uppercase text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              )}

              {/* Notes */}
              <div>
                <label className="block text-xs font-mono text-slate-400 mb-1">Maelezo (Notes)</label>
                <input
                  type="text"
                  value={repayNotes}
                  onChange={(e) => setRepayNotes(e.target.value)}
                  placeholder="e.g. Partial repayment via Till 542890"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
                />
              </div>

              {/* Submit Buttons */}
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsRepaymentModalOpen(false)}
                  className="w-1/3 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition"
                >
                  Ghairi (Cancel)
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md transition"
                >
                  <Check className="w-4 h-4" />
                  <span>Kamilisha Malipo</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ----------------- SAJILI MTEJA MPYA MODAL ----------------- */}
      {isAddCustomerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
              <h3 className="font-bold text-white text-sm">Sajili Mteja Mpya Wa Deni</h3>
              <button
                onClick={() => setIsAddCustomerOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddCustomerSubmit} className="p-5 space-y-3">
              <div>
                <label className="block text-xs font-mono text-slate-400 mb-1">Jina La Mteja (Full Name) *</label>
                <input
                  type="text"
                  required
                  value={newCustomerName}
                  onChange={(e) => setNewCustomerName(e.target.value)}
                  placeholder="e.g. Mama Boi (Grace Wanjiku)"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-slate-400 mb-1">Nambari Ya Simu (Phone) *</label>
                <input
                  type="tel"
                  required
                  value={newCustomerPhone}
                  onChange={(e) => setNewCustomerPhone(e.target.value)}
                  placeholder="0712345678"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-mono text-slate-400 mb-1">Nambari Ya Kitambulisho (ID)</label>
                  <input
                    type="text"
                    value={newCustomerIdNumber}
                    onChange={(e) => setNewCustomerIdNumber(e.target.value)}
                    placeholder="24892019"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono text-slate-400 mb-1">Kiwango Cha Deni (Limit KSh)</label>
                  <input
                    type="number"
                    value={newCustomerLimit}
                    onChange={(e) => setNewCustomerLimit(parseInt(e.target.value, 10) || 1000)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono text-slate-400 mb-1">Mahali / Makazi (Location)</label>
                <input
                  type="text"
                  value={newCustomerLocation}
                  onChange={(e) => setNewCustomerLocation(e.target.value)}
                  placeholder="e.g. Plot 12, Biashara Lane"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddCustomerOpen(false)}
                  className="w-1/3 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition"
                >
                  Ghairi
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md transition"
                >
                  <Check className="w-4 h-4" />
                  <span>Sajili Mteja</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
