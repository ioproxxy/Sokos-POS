import React, { useState } from 'react';
import { 
  ShoppingCart, Package, Globe, Users, Receipt, 
  Wallet, FileSpreadsheet, Settings, RefreshCw, 
  ChevronUp, X, ShieldCheck, Wifi, WifiOff, Sparkles, Check
} from 'lucide-react';
import { StoreConfig, SyncStats } from '../types/pos';

export type NavTab = 'pos' | 'inventory' | 'ecommerce' | 'credit' | 'sales';

interface AppFooterProps {
  activeTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  cartCount?: number;
  lowStockCount?: number;
  newOrdersCount?: number;
  activeDebtorsCount?: number;
  todayExpensesTotal?: number;
  config: StoreConfig;
  syncStats: SyncStats;
  isSimulatedOffline: boolean;
  onOpenExpenses: () => void;
  onOpenEodReport: () => void;
  onOpenSettings: () => void;
  onManualSync: () => void;
  onOpenDataPipeline: () => void;
}

export const AppFooter: React.FC<AppFooterProps> = ({
  activeTab,
  onSelectTab,
  cartCount = 0,
  lowStockCount = 0,
  newOrdersCount = 0,
  activeDebtorsCount = 0,
  todayExpensesTotal = 0,
  config,
  syncStats,
  isSimulatedOffline,
  onOpenExpenses,
  onOpenEodReport,
  onOpenSettings,
  onManualSync,
  onOpenDataPipeline,
}) => {
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);

  return (
    <>
      {/* ----------------- MOBILE MORE ACTIONS BOTTOM SHEET ----------------- */}
      {isMoreMenuOpen && (
        <div 
          className="fixed inset-0 z-40 bg-slate-950/80 backdrop-blur-sm flex flex-col justify-end md:hidden animate-in fade-in"
          onClick={() => setIsMoreMenuOpen(false)}
        >
          <div 
            className="bg-slate-900 border-t border-slate-700/80 rounded-t-2xl p-4 pb-safe space-y-3 shadow-2xl animate-in slide-in-from-bottom-5"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Sheet Handle & Header */}
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-300">
                  Duka Tools & Quick Actions
                </span>
              </div>
              <button
                onClick={() => setIsMoreMenuOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Quick Action Grid */}
            <div className="grid grid-cols-2 gap-2.5 pt-1">
              {/* Matumizi ya Till */}
              <button
                onClick={() => {
                  setIsMoreMenuOpen(false);
                  onOpenExpenses();
                }}
                className="flex items-center gap-3 p-3 rounded-xl bg-slate-800/90 hover:bg-slate-800 border border-slate-700/70 text-left transition"
              >
                <div className="w-9 h-9 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center shrink-0">
                  <Wallet className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-white leading-tight">Matumizi ya Till</p>
                  <p className="text-[10px] text-amber-400 font-mono mt-0.5">
                    {todayExpensesTotal > 0 ? `-KSh ${todayExpensesTotal.toLocaleString()}` : 'Record payouts'}
                  </p>
                </div>
              </button>

              {/* Z-Report */}
              <button
                onClick={() => {
                  setIsMoreMenuOpen(false);
                  onOpenEodReport();
                }}
                className="flex items-center gap-3 p-3 rounded-xl bg-slate-800/90 hover:bg-slate-800 border border-slate-700/70 text-left transition"
              >
                <div className="w-9 h-9 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shrink-0">
                  <FileSpreadsheet className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-white leading-tight">Z-Report & Balance</p>
                  <p className="text-[10px] text-slate-400 font-mono mt-0.5">Daily cash balancing</p>
                </div>
              </button>

              {/* Force Cloud Sync */}
              <button
                onClick={() => {
                  setIsMoreMenuOpen(false);
                  onManualSync();
                }}
                className="flex items-center gap-3 p-3 rounded-xl bg-slate-800/90 hover:bg-slate-800 border border-slate-700/70 text-left transition"
              >
                <div className="w-9 h-9 rounded-lg bg-cyan-500/15 border border-cyan-500/30 text-cyan-400 flex items-center justify-center shrink-0">
                  <RefreshCw className={`w-4 h-4 ${syncStats.isSyncing ? 'animate-spin' : ''}`} />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-white leading-tight">Cloud Sync</p>
                  <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                    {syncStats.pendingCount > 0 ? `${syncStats.pendingCount} pending` : 'Up to date'}
                  </p>
                </div>
              </button>

              {/* Settings */}
              <button
                onClick={() => {
                  setIsMoreMenuOpen(false);
                  onOpenSettings();
                }}
                className="flex items-center gap-3 p-3 rounded-xl bg-slate-800/90 hover:bg-slate-800 border border-slate-700/70 text-left transition"
              >
                <div className="w-9 h-9 rounded-lg bg-purple-500/15 border border-purple-500/30 text-purple-400 flex items-center justify-center shrink-0">
                  <Settings className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-white leading-tight">Mipangilio</p>
                  <p className="text-[10px] text-slate-400 font-mono mt-0.5">Store & KRA PIN</p>
                </div>
              </button>

              {/* Data Pipelines (Sheets & CSV) */}
              <button
                onClick={() => {
                  setIsMoreMenuOpen(false);
                  onOpenDataPipeline();
                }}
                className="flex items-center gap-3 p-3 rounded-xl bg-slate-800/90 hover:bg-slate-800 border border-emerald-500/30 text-left transition col-span-2"
              >
                <div className="w-9 h-9 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center shrink-0">
                  <FileSpreadsheet className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-white leading-tight flex items-center gap-1.5">
                    <span>Data Pipelines</span>
                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-950 text-emerald-400 border border-emerald-800">
                      Sheets & CSV
                    </span>
                  </p>
                  <p className="text-[10px] text-emerald-300 font-mono mt-0.5">Stream sales, stock & accounting</p>
                </div>
              </button>
            </div>

            {/* Store & eTIMS Badge */}
            <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-[11px] text-slate-400 font-mono flex items-center justify-between">
              <span className="truncate">{config.storeName}</span>
              <span className="text-emerald-400 font-semibold shrink-0">CU: {config.etimsCuNumber.slice(-8)}</span>
            </div>
          </div>
        </div>
      )}

      {/* ----------------- PRIMARY APP FOOTER (DETERMINISTICALLY VISIBLE) ----------------- */}
      <footer className="w-full bg-slate-900/95 backdrop-blur-md border-t border-slate-800 text-slate-300 flex-shrink-0 z-30 pb-safe shadow-[0_-4px_20px_rgba(0,0,0,0.5)]">
        {/* ==================== MOBILE BOTTOM BAR (< md) ==================== */}
        <div className="flex md:hidden items-stretch justify-around px-1 py-1.5 min-h-[58px]">
          {/* 1. POS / Mauzo */}
          <button
            onClick={() => onSelectTab('pos')}
            className={`flex-1 flex flex-col items-center justify-center py-1 px-1 rounded-xl relative transition-all ${
              activeTab === 'pos'
                ? 'text-emerald-400 font-bold bg-emerald-950/40'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <div className="relative">
              <ShoppingCart className="w-5 h-5" />
              {cartCount > 0 && (
                <span className="absolute -top-1.5 -right-2 min-w-[16px] h-4 px-1 rounded-full bg-emerald-500 text-slate-950 text-[10px] font-black flex items-center justify-center">
                  {cartCount}
                </span>
              )}
            </div>
            <span className="text-[10px] font-medium tracking-tight mt-1">Mauzo</span>
          </button>

          {/* 2. Bidhaa (Stock) */}
          <button
            onClick={() => onSelectTab('inventory')}
            className={`flex-1 flex flex-col items-center justify-center py-1 px-1 rounded-xl relative transition-all ${
              activeTab === 'inventory'
                ? 'text-emerald-400 font-bold bg-emerald-950/40'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <div className="relative">
              <Package className="w-5 h-5" />
              {lowStockCount > 0 && (
                <span className="absolute -top-1.5 -right-2 min-w-[16px] h-4 px-1 rounded-full bg-amber-500 text-slate-950 text-[10px] font-black flex items-center justify-center">
                  {lowStockCount}
                </span>
              )}
            </div>
            <span className="text-[10px] font-medium tracking-tight mt-1">Bidhaa</span>
          </button>

          {/* 3. Sokos.co.ke */}
          <button
            onClick={() => onSelectTab('ecommerce')}
            className={`flex-1 flex flex-col items-center justify-center py-1 px-1 rounded-xl relative transition-all ${
              activeTab === 'ecommerce'
                ? 'text-cyan-400 font-bold bg-cyan-950/40'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <div className="relative">
              <Globe className="w-5 h-5 text-cyan-400" />
              {newOrdersCount > 0 && (
                <span className="absolute -top-1.5 -right-2.5 px-1 rounded-full bg-cyan-400 text-slate-950 text-[9px] font-black flex items-center justify-center animate-pulse">
                  {newOrdersCount}
                </span>
              )}
            </div>
            <span className="text-[10px] font-medium tracking-tight mt-1">Sokos.co.ke</span>
          </button>

          {/* 4. Deni (Credit) */}
          <button
            onClick={() => onSelectTab('credit')}
            className={`flex-1 flex flex-col items-center justify-center py-1 px-1 rounded-xl relative transition-all ${
              activeTab === 'credit'
                ? 'text-emerald-400 font-bold bg-emerald-950/40'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <div className="relative">
              <Users className="w-5 h-5" />
              {activeDebtorsCount > 0 && (
                <span className="absolute -top-1.5 -right-2 min-w-[16px] h-4 px-1 rounded-full bg-amber-500 text-slate-950 text-[10px] font-black flex items-center justify-center">
                  {activeDebtorsCount}
                </span>
              )}
            </div>
            <span className="text-[10px] font-medium tracking-tight mt-1">Deni</span>
          </button>

          {/* 5. Risiti (Sales) */}
          <button
            onClick={() => onSelectTab('sales')}
            className={`flex-1 flex flex-col items-center justify-center py-1 px-1 rounded-xl transition-all ${
              activeTab === 'sales'
                ? 'text-emerald-400 font-bold bg-emerald-950/40'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Receipt className="w-5 h-5" />
            <span className="text-[10px] font-medium tracking-tight mt-1">Risiti</span>
          </button>

          {/* 6. More / Zaidi Drawer Toggle */}
          <button
            onClick={() => setIsMoreMenuOpen(!isMoreMenuOpen)}
            className={`flex-1 flex flex-col items-center justify-center py-1 px-1 rounded-xl transition-all ${
              isMoreMenuOpen
                ? 'text-emerald-400 bg-slate-800'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Duka Tools (Matumizi, Z-Report, Settings)"
          >
            <ChevronUp className={`w-5 h-5 transition-transform duration-200 ${isMoreMenuOpen ? 'rotate-180 text-emerald-400' : ''}`} />
            <span className="text-[10px] font-medium tracking-tight mt-1">Zaidi</span>
          </button>
        </div>

        {/* ==================== DESKTOP STATUS & INFO FOOTER (md+) ==================== */}
        <div className="hidden md:flex items-center justify-between px-4 py-2 text-xs font-mono border-t border-slate-800/80">
          {/* Left: Brand Identity & Location */}
          <div className="flex items-center gap-3 text-slate-400">
            <span className="flex items-center gap-1.5 text-slate-200 font-medium">
              <span className="text-emerald-400 font-bold">🌿 Sokos POS</span>
              <span className="text-slate-600">•</span>
              <span className="text-slate-300 font-sans">{config.storeName}</span>
            </span>
            <span className="text-slate-600">•</span>
            <span className="text-slate-500 text-[11px] truncate max-w-[200px]">{config.address}</span>
          </div>

          {/* Center: Sokos.co.ke & eTIMS Compliance */}
          <div className="flex items-center gap-3">
            {/* Sokos.co.ke Storefront Indicator */}
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-slate-950 border border-slate-800">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse"></span>
              <span className="text-[11px] text-slate-300">
                Sokos.co.ke: <span className="text-cyan-400 font-bold">Live</span>
              </span>
            </div>

            {/* KRA eTIMS CU */}
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-slate-950 border border-slate-800 text-[11px] text-slate-300">
              <ShieldCheck className="w-3 h-3 text-emerald-400" />
              <span>eTIMS: <span className="text-emerald-400">{config.etimsCuNumber.slice(-8)}</span></span>
            </div>
          </div>

          {/* Right: Bandwidth Stats & Fast Action Shortcuts */}
          <div className="flex items-center gap-3">
            {/* Data Conscious Transfer Indicator */}
            <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
              {isSimulatedOffline || !syncStats.isOnline ? (
                <span className="flex items-center gap-1 text-amber-400">
                  <WifiOff className="w-3 h-3" />
                  <span>Offline (Queued: {syncStats.pendingCount})</span>
                </span>
              ) : (
                <span className="flex items-center gap-1 text-emerald-400">
                  <Wifi className="w-3 h-3" />
                  <span>Data Saver: {((syncStats.bytesUploaded + syncStats.bytesDownloaded) / 1024).toFixed(1)} KB</span>
                </span>
              )}
            </div>

            {/* Till Expenses Quick Payout Button */}
            <button
              onClick={onOpenExpenses}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 text-[11px] transition"
              title="Record Duka Till Expenses"
            >
              <Wallet className="w-3 h-3 text-amber-400" />
              <span>Matumizi</span>
              {todayExpensesTotal > 0 && (
                <span className="text-[10px] font-bold text-amber-400">
                  (-{todayExpensesTotal})
                </span>
              )}
            </button>

            {/* Z-Report Quick Button */}
            <button
              onClick={onOpenEodReport}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-slate-700 text-[11px] transition"
              title="Daily End of Day Balancing"
            >
              <FileSpreadsheet className="w-3 h-3 text-emerald-400" />
              <span>Z-Report</span>
            </button>

            {/* Data Pipeline (Sheets & CSV) Quick Button */}
            <button
              onClick={onOpenDataPipeline}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-950/60 hover:bg-emerald-900/60 text-emerald-300 border border-emerald-700/60 text-[11px] font-semibold transition"
              title="Pipeline POS Data to Google Sheets and CSV"
            >
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div>
              <span>Pipelines (Sheets & CSV)</span>
            </button>
          </div>
        </div>
      </footer>
    </>
  );
};
