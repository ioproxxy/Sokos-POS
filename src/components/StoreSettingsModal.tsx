import React, { useState } from 'react';
import { Settings, Save, RotateCcw, X, Building, DollarSign, Smartphone, FileText, CheckSquare } from 'lucide-react';
import { StoreConfig } from '../types/pos';

interface StoreSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: StoreConfig;
  onSaveConfig: (newConfig: StoreConfig) => void;
  onResetDemoData: () => void;
}

export const StoreSettingsModal: React.FC<StoreSettingsModalProps> = ({
  isOpen,
  onClose,
  config,
  onSaveConfig,
  onResetDemoData,
}) => {
  const [formData, setFormData] = useState<StoreConfig>({ ...config });

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveConfig(formData);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
              <Settings className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base">Store & Kenya SME Settings</h3>
              <p className="text-xs text-slate-400">M-Pesa, KRA eTIMS, Currency & Deni</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto flex-1">
          {/* Business Info */}
          <div className="space-y-3">
            <h4 className="text-xs font-mono uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
              <Building className="w-3.5 h-3.5" />
              Store Identity
            </h4>

            <div>
              <label className="block text-xs font-mono text-slate-400 mb-1">Store / Duka Name</label>
              <input
                type="text"
                required
                value={formData.storeName}
                onChange={(e) => setFormData({ ...formData, storeName: e.target.value })}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-mono text-slate-400 mb-1">Tagline / Kaulimbiu</label>
              <input
                type="text"
                value={formData.tagline}
                onChange={(e) => setFormData({ ...formData, tagline: e.target.value })}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-mono text-slate-400 mb-1">Location / Address</label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-slate-400 mb-1">Phone (Safaricom)</label>
                <input
                  type="text"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>
          </div>

          {/* M-PESA Configuration */}
          <div className="space-y-3 pt-3 border-t border-slate-800">
            <h4 className="text-xs font-mono uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
              <Smartphone className="w-3.5 h-3.5" />
              Safaricom M-Pesa Setup
            </h4>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-mono text-slate-400 mb-1">Buy Goods Till No.</label>
                <input
                  type="text"
                  value={formData.mpesaTillNumber}
                  onChange={(e) => setFormData({ ...formData, mpesaTillNumber: e.target.value })}
                  placeholder="542890"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono font-bold text-emerald-400 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-slate-400 mb-1">Paybill Number</label>
                <input
                  type="text"
                  value={formData.mpesaPaybillNumber}
                  onChange={(e) => setFormData({ ...formData, mpesaPaybillNumber: e.target.value })}
                  placeholder="400200"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>
          </div>

          {/* KRA eTIMS Tax Compliance */}
          <div className="space-y-3 pt-3 border-t border-slate-800">
            <h4 className="text-xs font-mono uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5" />
              Kenya Revenue Authority (KRA) eTIMS
            </h4>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-mono text-slate-400 mb-1">KRA PIN Number</label>
                <input
                  type="text"
                  value={formData.taxId}
                  onChange={(e) => setFormData({ ...formData, taxId: e.target.value.toUpperCase() })}
                  placeholder="P051283940X"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono font-bold text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-slate-400 mb-1">eTIMS CU Serial No.</label>
                <input
                  type="text"
                  value={formData.etimsCuNumber}
                  onChange={(e) => setFormData({ ...formData, etimsCuNumber: e.target.value })}
                  placeholder="KRA-ETIMS-KE01-84920"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-mono text-slate-400 mb-1">Currency Symbol</label>
                <input
                  type="text"
                  value={formData.currencySymbol}
                  onChange={(e) => setFormData({ ...formData, currencySymbol: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono font-bold text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-slate-400 mb-1">Standard VAT Rate (%)</label>
                <input
                  type="number"
                  step="0.1"
                  value={formData.taxRatePercent}
                  onChange={(e) => setFormData({ ...formData, taxRatePercent: parseFloat(e.target.value) || 16 })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono font-bold text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>
          </div>

          {/* SME Features Toggles */}
          <div className="space-y-2 pt-3 border-t border-slate-800">
            <h4 className="text-xs font-mono uppercase tracking-wider text-emerald-400 mb-2">
              SME Business Features
            </h4>

            <label className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-950 border border-slate-800 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.allowDeniCredit}
                onChange={(e) => setFormData({ ...formData, allowDeniCredit: e.target.checked })}
                className="w-4 h-4 rounded text-emerald-600 focus:ring-0"
              />
              <span className="text-xs text-slate-200 font-mono">
                Ruhusu Mali ya Deni (Enable Customer Credit Ledger)
              </span>
            </label>

            <label className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-950 border border-slate-800 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.allowWholesalePricing}
                onChange={(e) => setFormData({ ...formData, allowWholesalePricing: e.target.checked })}
                className="w-4 h-4 rounded text-emerald-600 focus:ring-0"
              />
              <span className="text-xs text-slate-200 font-mono">
                Bei ya Jumla (Enable Wholesale vs Retail Pricing)
              </span>
            </label>
          </div>

          {/* Reset Demo */}
          <div className="p-3.5 rounded-xl bg-red-950/30 border border-red-500/30 flex justify-between items-center mt-3">
            <div>
              <p className="text-xs font-bold text-red-300">Weka Upya Demo Data</p>
              <p className="text-[10px] text-red-400/80">
                Rudisha bidhaa za kawaida za Kenya (Unga, Maziwa, Chai n.k.)
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                if (window.confirm('Je, unataka kurudisha bidhaa za demo za Kenya?')) {
                  onResetDemoData();
                  onClose();
                }
              }}
              className="px-3 py-1.5 rounded-lg bg-red-900/80 hover:bg-red-800 text-red-200 text-xs font-medium flex items-center gap-1 transition"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Rudisha
            </button>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="w-1/3 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition"
            >
              Ghairi
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md transition"
            >
              <Save className="w-4 h-4" />
              <span>Hifadhi Mipangilio</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
