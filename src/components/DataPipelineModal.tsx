/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Sokos Data Pipeline Hub (Google Sheets & CSV)
 * Pipelines live sales transactions, inventory valuation, daily payouts,
 * and customer credit balances to Google Spreadsheets and CSV files.
 */

import React, { useState, useEffect } from 'react';
import { 
  X, FileSpreadsheet, Download, CheckCircle, ExternalLink, 
  RefreshCw, Copy, Check, Layers, AlertCircle, Sparkles, 
  FileText, ShieldCheck, Database, LogOut, ArrowRight, Eye
} from 'lucide-react';
import { 
  googleSignIn, googleSignOut, initAuth, getAccessToken, 
  googleSheetsService, PipelineResult, AuthState 
} from '../services/googleSheetsService';
import { csvExportService } from '../services/csvExportService';
import { Product, Sale, DukaExpense, CustomerCreditAccount, StoreConfig, EodZReport } from '../types/pos';

interface DataPipelineModalProps {
  isOpen: boolean;
  onClose: () => void;
  sales: Sale[];
  inventory: Product[];
  expenses: DukaExpense[];
  creditAccounts: CustomerCreditAccount[];
  config: StoreConfig;
  currentZReport?: EodZReport | null;
}

interface SavedPipelineRecord {
  id: string;
  spreadsheetId: string;
  spreadsheetUrl: string;
  title: string;
  timestamp: number;
  salesCount: number;
  inventoryCount: number;
}

export const DataPipelineModal: React.FC<DataPipelineModalProps> = ({
  isOpen,
  onClose,
  sales,
  inventory,
  expenses,
  creditAccounts,
  config,
  currentZReport,
}) => {
  const [activeTab, setActiveTab] = useState<'sheets' | 'csv' | 'history'>('sheets');
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    accessToken: null,
    isAuthenticated: false,
  });
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  const [isPipelining, setIsPipelining] = useState(false);
  const [pipelineProgress, setPipelineProgress] = useState<string>('');
  const [lastPipelineResult, setLastPipelineResult] = useState<PipelineResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  
  // Existing sheet append state
  const [appendSheetInput, setAppendSheetInput] = useState('');
  const [isVerifyingSheet, setIsVerifyingSheet] = useState(false);
  const [verifiedSheetTitle, setVerifiedSheetTitle] = useState<string | null>(null);

  // Mandatory confirmation dialog state for mutating / creating Workspace data
  const [pendingConfirmation, setPendingConfirmation] = useState<{
    type: 'create_sheet' | 'append_sheet';
    summaryText: string;
  } | null>(null);

  // Local storage recent pipelines
  const [savedPipelines, setSavedPipelines] = useState<SavedPipelineRecord[]>(() => {
    try {
      const data = localStorage.getItem('sokos_recent_sheets_pipelines');
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  });

  // Track CSV download feedback
  const [csvDownloadedType, setCsvDownloadedType] = useState<string | null>(null);

  // Listen to Auth state
  useEffect(() => {
    const unsubscribe = initAuth((state) => {
      setAuthState(state);
    });
    return () => unsubscribe();
  }, []);

  if (!isOpen) return null;

  // Extract Spreadsheet ID from raw input or full Google Sheets URL
  const extractSpreadsheetId = (input: string): string => {
    const trimmed = input.trim();
    const match = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    return match ? match[1] : trimmed;
  };

  const handleGoogleLogin = async () => {
    setErrorMsg(null);
    setIsAuthLoading(true);
    try {
      const result = await googleSignIn();
      setAuthState({
        user: result.user,
        accessToken: result.accessToken,
        isAuthenticated: true,
      });
    } catch (err: any) {
      setErrorMsg(err.message || 'Google authentication was cancelled or failed.');
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleGoogleLogout = async () => {
    try {
      await googleSignOut();
      setAuthState({ user: null, accessToken: null, isAuthenticated: false });
    } catch (err: any) {
      console.error(err);
    }
  };

  // Step 1: Prompt explicit confirmation dialog before Google Sheets creation
  const handleInitiateCreateSheet = () => {
    setErrorMsg(null);
    if (!authState.isAuthenticated) {
      setErrorMsg('Please sign in with Google first.');
      return;
    }
    setPendingConfirmation({
      type: 'create_sheet',
      summaryText: `Create a new Google Spreadsheet containing ${sales.length} sales records, ${inventory.length} inventory items, ${expenses.length} duka expenses, and ${creditAccounts.length} customer credit accounts in your Google Drive?`,
    });
  };

  // Step 2: User confirmed destructive / mutating operation
  const handleExecuteConfirmedAction = async () => {
    if (!pendingConfirmation) return;
    const action = pendingConfirmation.type;
    setPendingConfirmation(null);

    if (action === 'create_sheet') {
      setIsPipelining(true);
      setPipelineProgress('Connecting to Google Sheets API...');
      setErrorMsg(null);
      try {
        setPipelineProgress('Creating 5 workbook tabs (Summary, Sales, Inventory, Expenses, Deni)...');
        const result = await googleSheetsService.createFullPosSpreadsheet({
          storeConfig: config,
          sales,
          inventory,
          expenses,
          creditAccounts,
        });

        setLastPipelineResult(result);
        setPipelineProgress('Formatting headers & currency columns...');

        // Save to local pipeline history
        const newRecord: SavedPipelineRecord = {
          id: `pipe-${Date.now()}`,
          spreadsheetId: result.spreadsheetId,
          spreadsheetUrl: result.spreadsheetUrl,
          title: result.title,
          timestamp: result.timestamp,
          salesCount: result.salesPushed,
          inventoryCount: result.inventoryPushed,
        };
        const updated = [newRecord, ...savedPipelines.slice(0, 9)];
        setSavedPipelines(updated);
        try {
          localStorage.setItem('sokos_recent_sheets_pipelines', JSON.stringify(updated));
        } catch {}

      } catch (err: any) {
        setErrorMsg(err.message || 'Failed to pipeline data to Google Sheets.');
      } finally {
        setIsPipelining(false);
        setPipelineProgress('');
      }
    } else if (action === 'append_sheet') {
      const sheetId = extractSpreadsheetId(appendSheetInput);
      if (!sheetId) {
        setErrorMsg('Please provide a valid Spreadsheet ID or URL.');
        return;
      }

      setIsPipelining(true);
      setPipelineProgress('Appending new sales rows to spreadsheet...');
      setErrorMsg(null);
      try {
        const res = await googleSheetsService.appendSalesToSpreadsheet(sheetId, sales);
        setPipelineProgress(`Successfully appended ${res.rowsAppended} rows!`);
        setTimeout(() => setPipelineProgress(''), 3000);
      } catch (err: any) {
        setErrorMsg(err.message || 'Failed to append sales rows to existing spreadsheet.');
      } finally {
        setIsPipelining(false);
      }
    }
  };

  const handleVerifyExistingSheet = async () => {
    const sheetId = extractSpreadsheetId(appendSheetInput);
    if (!sheetId) {
      setErrorMsg('Please enter a Google Spreadsheet URL or ID.');
      return;
    }
    setIsVerifyingSheet(true);
    setErrorMsg(null);
    setVerifiedSheetTitle(null);
    try {
      const info = await googleSheetsService.getSpreadsheetInfo(sheetId);
      setVerifiedSheetTitle(info.title);
    } catch (err: any) {
      setErrorMsg(err.message || 'Could not verify spreadsheet access.');
    } finally {
      setIsVerifyingSheet(false);
    }
  };

  const handleCopyLink = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  // CSV Export Handlers
  const handleExportSalesCsv = () => {
    const res = csvExportService.exportSalesToCsv(sales, config.storeName);
    setCsvDownloadedType('sales');
    setTimeout(() => setCsvDownloadedType(null), 3000);
  };

  const handleExportInventoryCsv = () => {
    const res = csvExportService.exportInventoryToCsv(inventory, config.storeName);
    setCsvDownloadedType('inventory');
    setTimeout(() => setCsvDownloadedType(null), 3000);
  };

  const handleExportExpensesCsv = () => {
    const res = csvExportService.exportExpensesToCsv(expenses);
    setCsvDownloadedType('expenses');
    setTimeout(() => setCsvDownloadedType(null), 3000);
  };

  const handleExportCreditCsv = () => {
    const res = csvExportService.exportCreditLedgerToCsv(creditAccounts);
    setCsvDownloadedType('credit');
    setTimeout(() => setCsvDownloadedType(null), 3000);
  };

  const handleExportZReportCsv = () => {
    if (currentZReport) {
      csvExportService.exportZReportToCsv(currentZReport, expenses);
      setCsvDownloadedType('zreport');
      setTimeout(() => setCsvDownloadedType(null), 3000);
    }
  };

  const handleExportAllCsvBundle = () => {
    csvExportService.exportSalesToCsv(sales, config.storeName);
    setTimeout(() => csvExportService.exportInventoryToCsv(inventory, config.storeName), 200);
    setTimeout(() => csvExportService.exportExpensesToCsv(expenses), 400);
    setTimeout(() => csvExportService.exportCreditLedgerToCsv(creditAccounts), 600);
    setCsvDownloadedType('all_bundle');
    setTimeout(() => setCsvDownloadedType(null), 3000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
      <div 
        className="w-full max-w-3xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl flex flex-col max-h-[92dvh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ===================== MODAL HEADER ===================== */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-800 bg-slate-900/90 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <span>Data Pipeline Hub</span>
                <span className="text-[10px] uppercase font-mono font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-950/80 text-emerald-300 border border-emerald-800/80">
                  CSV & Sheets
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Pipeline sales transactions, stock valuations, and accounting directly to Google Spreadsheets and CSV files.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ===================== NAVIGATION TABS ===================== */}
        <div className="flex items-center border-b border-slate-800 px-4 sm:px-5 bg-slate-950/50 shrink-0">
          <button
            onClick={() => setActiveTab('sheets')}
            className={`flex items-center gap-2 py-3 px-3 text-xs font-semibold border-b-2 transition ${
              activeTab === 'sheets'
                ? 'border-emerald-500 text-emerald-400 bg-emerald-950/20'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <div className="w-3.5 h-3.5 rounded-sm bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <span className="text-[9px] font-bold">G</span>
            </div>
            <span>Google Spreadsheets (Live Cloud)</span>
          </button>

          <button
            onClick={() => setActiveTab('csv')}
            className={`flex items-center gap-2 py-3 px-3 text-xs font-semibold border-b-2 transition ${
              activeTab === 'csv'
                ? 'border-emerald-500 text-emerald-400 bg-emerald-950/20'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Download className="w-3.5 h-3.5" />
            <span>CSV Direct Downloads (Offline)</span>
          </button>

          <button
            onClick={() => setActiveTab('history')}
            className={`flex items-center gap-2 py-3 px-3 text-xs font-semibold border-b-2 transition ${
              activeTab === 'history'
                ? 'border-emerald-500 text-emerald-400 bg-emerald-950/20'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Saved Pipelines ({savedPipelines.length})</span>
          </button>
        </div>

        {/* ===================== MODAL CONTENT BODY ===================== */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-5">
          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-rose-950/60 border border-rose-800/80 text-rose-300 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-semibold text-rose-200">Error</p>
                <p className="mt-0.5 leading-relaxed">{errorMsg}</p>
              </div>
              <button 
                onClick={() => setErrorMsg(null)}
                className="text-rose-400 hover:text-rose-200 text-xs font-mono"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* ----------------- TAB 1: GOOGLE SPREADSHEETS ----------------- */}
          {activeTab === 'sheets' && (
            <div className="space-y-5">
              {/* Google Authentication Box */}
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  {authState.isAuthenticated && authState.user?.photoURL ? (
                    <img 
                      src={authState.user.photoURL} 
                      alt="User avatar" 
                      className="w-10 h-10 rounded-full border border-emerald-500/50" 
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400 font-bold">
                      G
                    </div>
                  )}
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-white">
                        {authState.isAuthenticated ? (authState.user?.displayName || 'Google Account Connected') : 'Google Account Not Connected'}
                      </span>
                      {authState.isAuthenticated ? (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-950 text-emerald-400 border border-emerald-800">
                          <CheckCircle className="w-2.5 h-2.5" /> Connected
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-800 text-slate-400">
                          Required for Sheets API
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                      {authState.isAuthenticated ? authState.user?.email : 'Sign in to allow Sokos POS to create and update your spreadsheets.'}
                    </p>
                  </div>
                </div>

                <div>
                  {authState.isAuthenticated ? (
                    <button
                      onClick={handleGoogleLogout}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-xs font-medium transition"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Sign Out</span>
                    </button>
                  ) : (
                    <button
                      onClick={handleGoogleLogin}
                      disabled={isAuthLoading}
                      className="inline-flex items-center gap-2.5 px-4 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-800 font-semibold text-xs transition shadow hover:shadow-md cursor-pointer disabled:opacity-50"
                    >
                      <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="w-4 h-4">
                        <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                        <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                        <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                        <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                        <path fill="none" d="M0 0h48v48H0z"></path>
                      </svg>
                      <span>{isAuthLoading ? 'Authenticating...' : 'Sign in with Google'}</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Action A: Primary Generator */}
              <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-slate-800/80 to-slate-900 border border-slate-700 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                      <h3 className="text-sm font-bold text-white">
                        Full POS Accounting & Inventory Workbook
                      </h3>
                    </div>
                    <p className="text-xs text-slate-300 mt-1 max-w-xl">
                      Automatically generates a formatted 5-tab Google Spreadsheet in your Google Drive with frozen headers, currency formatting, and complete SME business records.
                    </p>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-[11px] font-mono text-emerald-400 bg-emerald-950/60 border border-emerald-800/60 px-2.5 py-1 rounded-lg">
                      {sales.length} Sales • {inventory.length} Items
                    </span>
                  </div>
                </div>

                {/* Tab Breakdown Badges */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-1 text-[11px]">
                  <div className="p-2 rounded-lg bg-slate-950/70 border border-slate-800">
                    <p className="font-semibold text-slate-200">1. Summary</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">KPIs, turnover, cash</p>
                  </div>
                  <div className="p-2 rounded-lg bg-slate-950/70 border border-slate-800">
                    <p className="font-semibold text-slate-200">2. Sales</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">Receipts & M-Pesa refs</p>
                  </div>
                  <div className="p-2 rounded-lg bg-slate-950/70 border border-slate-800">
                    <p className="font-semibold text-slate-200">3. Inventory</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">Stock & valuation (KES)</p>
                  </div>
                  <div className="p-2 rounded-lg bg-slate-950/70 border border-slate-800">
                    <p className="font-semibold text-slate-200">4. Expenses</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">Kanjo, boda, tokens</p>
                  </div>
                  <div className="p-2 rounded-lg bg-slate-950/70 border border-slate-800 col-span-2 sm:col-span-1">
                    <p className="font-semibold text-slate-200">5. Deni Credit</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">Customer balances</p>
                  </div>
                </div>

                {/* Create Button & Progress */}
                <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
                  <button
                    onClick={handleInitiateCreateSheet}
                    disabled={isPipelining || !authState.isAuthenticated}
                    className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs shadow-lg shadow-emerald-950/50 transition cursor-pointer"
                  >
                    {isPipelining ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Pipelining Data...</span>
                      </>
                    ) : (
                      <>
                        <FileSpreadsheet className="w-4 h-4" />
                        <span>Create Google Spreadsheet</span>
                      </>
                    )}
                  </button>

                  {!authState.isAuthenticated && (
                    <span className="text-[11px] text-amber-400 font-mono">
                      * Sign in above to activate Google Sheets API
                    </span>
                  )}

                  {pipelineProgress && (
                    <span className="text-xs font-mono text-emerald-400 animate-pulse">
                      {pipelineProgress}
                    </span>
                  )}
                </div>

                {/* Success Banner if just created */}
                {lastPipelineResult && (
                  <div className="p-4 rounded-xl bg-emerald-950/70 border border-emerald-800 text-xs text-emerald-200 space-y-2.5 animate-in fade-in">
                    <div className="flex items-center justify-between">
                      <span className="font-bold flex items-center gap-1.5 text-emerald-300">
                        <CheckCircle className="w-4 h-4 text-emerald-400" />
                        Spreadsheet Created Successfully!
                      </span>
                      <span className="text-[10px] font-mono text-emerald-400">
                        {new Date(lastPipelineResult.timestamp).toLocaleTimeString('en-KE')}
                      </span>
                    </div>

                    <p className="text-xs text-slate-300 truncate">
                      Title: <span className="text-white font-medium">{lastPipelineResult.title}</span>
                    </p>

                    <div className="flex items-center gap-2 pt-1">
                      <a
                        href={lastPipelineResult.spreadsheetUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>Open in Google Sheets ↗</span>
                      </a>

                      <button
                        onClick={() => handleCopyLink(lastPipelineResult.spreadsheetUrl)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono transition"
                      >
                        {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedLink ? 'Copied' : 'Copy Link'}</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Action B: Append to Existing Sheet */}
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                    Append Sales to Existing Google Spreadsheet
                  </h4>
                </div>
                <p className="text-xs text-slate-400">
                  Have an ongoing ledger spreadsheet? Paste its link or ID below to stream current sales into the <code>'Sales Transactions'</code> tab.
                </p>

                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    value={appendSheetInput}
                    onChange={(e) => setAppendSheetInput(e.target.value)}
                    placeholder="https://docs.google.com/spreadsheets/d/1BxiMVs.../edit or Spreadsheet ID"
                    className="flex-1 px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 font-mono"
                  />
                  <button
                    onClick={handleVerifyExistingSheet}
                    disabled={isVerifyingSheet || !appendSheetInput.trim() || !authState.isAuthenticated}
                    className="px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 text-xs font-semibold transition"
                  >
                    {isVerifyingSheet ? 'Checking...' : 'Verify Sheet'}
                  </button>
                  <button
                    onClick={() => {
                      setPendingConfirmation({
                        type: 'append_sheet',
                        summaryText: `Append ${sales.length} sales rows to spreadsheet "${verifiedSheetTitle || extractSpreadsheetId(appendSheetInput)}"?`,
                      });
                    }}
                    disabled={isPipelining || !appendSheetInput.trim() || !authState.isAuthenticated}
                    className="px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white text-xs font-bold transition flex items-center justify-center gap-1.5"
                  >
                    <span>Append Sales Rows</span>
                  </button>
                </div>

                {verifiedSheetTitle && (
                  <div className="p-2 rounded bg-slate-900 border border-cyan-800/60 text-xs text-cyan-300 flex items-center gap-2">
                    <CheckCircle className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Verified: <strong>{verifiedSheetTitle}</strong></span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ----------------- TAB 2: CSV DIRECT DOWNLOADS ----------------- */}
          {activeTab === 'csv' && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                    Instant CSV Pipelines (UTF-8 BOM Formatted)
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Works offline. Formatted for Excel, Google Sheets, Numbers, or any BI accounting tool.
                  </p>
                </div>

                <button
                  onClick={handleExportAllCsvBundle}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download All 4 CSVs</span>
                </button>
              </div>

              {csvDownloadedType && (
                <div className="p-3 rounded-lg bg-emerald-950/70 border border-emerald-800 text-emerald-300 text-xs flex items-center gap-2 animate-in fade-in">
                  <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>CSV file downloaded successfully to your device!</span>
                </div>
              )}

              {/* CSV Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* 1. Sales */}
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between hover:border-slate-700 transition">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-emerald-400" />
                      <h4 className="text-xs font-bold text-white">Sales Transactions</h4>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Receipt numbers, items, M-Pesa refs, KRA VAT, totals.
                    </p>
                    <span className="inline-block text-[10px] font-mono text-emerald-400">
                      {sales.length} rows recorded
                    </span>
                  </div>

                  <button
                    onClick={handleExportSalesCsv}
                    className="p-2.5 rounded-xl bg-slate-800 hover:bg-emerald-600 text-slate-300 hover:text-white transition"
                    title="Download Sales CSV"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                </div>

                {/* 2. Inventory */}
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between hover:border-slate-700 transition">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Database className="w-4 h-4 text-amber-400" />
                      <h4 className="text-xs font-bold text-white">Inventory & Valuation</h4>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Barcodes, SKUs, stock counts, cost prices & selling margins.
                    </p>
                    <span className="inline-block text-[10px] font-mono text-amber-400">
                      {inventory.length} items cataloged
                    </span>
                  </div>

                  <button
                    onClick={handleExportInventoryCsv}
                    className="p-2.5 rounded-xl bg-slate-800 hover:bg-amber-600 text-slate-300 hover:text-white transition"
                    title="Download Inventory CSV"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                </div>

                {/* 3. Duka Expenses */}
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between hover:border-slate-700 transition">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Layers className="w-4 h-4 text-rose-400" />
                      <h4 className="text-xs font-bold text-white">Duka Expenses & Payouts</h4>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Till petty cash: Boda riders, Kanjo cess, power tokens.
                    </p>
                    <span className="inline-block text-[10px] font-mono text-rose-400">
                      {expenses.length} expense entries
                    </span>
                  </div>

                  <button
                    onClick={handleExportExpensesCsv}
                    className="p-2.5 rounded-xl bg-slate-800 hover:bg-rose-600 text-slate-300 hover:text-white transition"
                    title="Download Expenses CSV"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                </div>

                {/* 4. Customer Credit (Deni) */}
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between hover:border-slate-700 transition">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-purple-400" />
                      <h4 className="text-xs font-bold text-white">Customer Credit (Deni)</h4>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Customer names, contact numbers, credit limits & debt balances.
                    </p>
                    <span className="inline-block text-[10px] font-mono text-purple-400">
                      {creditAccounts.length} customer ledgers
                    </span>
                  </div>

                  <button
                    onClick={handleExportCreditCsv}
                    className="p-2.5 rounded-xl bg-slate-800 hover:bg-purple-600 text-slate-300 hover:text-white transition"
                    title="Download Credit Ledger CSV"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                </div>

                {/* 5. End of Day Z-Report (if available) */}
                {currentZReport && (
                  <div className="p-4 rounded-xl bg-slate-950 border border-emerald-900/60 sm:col-span-2 flex items-center justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                        <h4 className="text-xs font-bold text-white">End-of-Day Z-Report Reconciliation</h4>
                      </div>
                      <p className="text-[11px] text-slate-400">
                        Opening float, cash & M-Pesa totals, payouts, expected till balance for {currentZReport.dateStr}.
                      </p>
                    </div>

                    <button
                      onClick={handleExportZReportCsv}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download Z-Report CSV</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ----------------- TAB 3: PIPELINE HISTORY ----------------- */}
          {activeTab === 'history' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                  Previously Generated Google Spreadsheets
                </h3>
                {savedPipelines.length > 0 && (
                  <button
                    onClick={() => {
                      setSavedPipelines([]);
                      localStorage.removeItem('sokos_recent_sheets_pipelines');
                    }}
                    className="text-[11px] text-slate-500 hover:text-slate-300 font-mono"
                  >
                    Clear History
                  </button>
                )}
              </div>

              {savedPipelines.length === 0 ? (
                <div className="p-8 text-center text-slate-500 text-xs border border-dashed border-slate-800 rounded-xl">
                  No spreadsheets generated yet. Use the "Google Spreadsheets" tab to create your first pipeline workbook!
                </div>
              ) : (
                <div className="space-y-2">
                  {savedPipelines.map((rec) => (
                    <div
                      key={rec.id}
                      className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between hover:border-slate-700 transition"
                    >
                      <div className="space-y-0.5 min-w-0">
                        <p className="text-xs font-bold text-white truncate max-w-sm">
                          {rec.title}
                        </p>
                        <p className="text-[11px] text-slate-400 font-mono">
                          {new Date(rec.timestamp).toLocaleString('en-KE')} • {rec.salesCount} Sales • {rec.inventoryCount} Products
                        </p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <a
                          href={rec.spreadsheetUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-emerald-400 text-xs font-medium transition"
                        >
                          <ExternalLink className="w-3 h-3" />
                          <span>Open Sheet</span>
                        </a>

                        <button
                          onClick={() => handleCopyLink(rec.spreadsheetUrl)}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
                          title="Copy Link"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ===================== MODAL FOOTER ===================== */}
        <div className="p-3.5 sm:p-4 border-t border-slate-800 bg-slate-950/70 flex items-center justify-between text-[11px] font-mono text-slate-500 shrink-0">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
            <span>Data-Conscious Transport</span>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition"
          >
            Close
          </button>
        </div>
      </div>

      {/* ===================== MANDATORY CONFIRMATION DIALOG ===================== */}
      {/* Required by workspace-integration/SKILL.md: Never execute destructive/mutating operations without explicit user confirmation */}
      {pendingConfirmation && (
        <div 
          className="fixed inset-0 z-60 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in"
          onClick={() => setPendingConfirmation(null)}
        >
          <div 
            className="w-full max-w-md bg-slate-900 border border-emerald-500/40 rounded-2xl p-5 space-y-4 shadow-2xl animate-in zoom-in-95"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-white">
                  Confirm Google Spreadsheets Export
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {pendingConfirmation.summaryText}
                </p>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-[11px] text-slate-400 font-mono space-y-1">
              <p>• Data target: Your Google Drive & Sheets account</p>
              <p>• Scopes: spreadsheets, drive.file</p>
              <p>• Token: Stored securely in-memory only</p>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-1">
              <button
                onClick={() => setPendingConfirmation(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleExecuteConfirmedAction}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-950/50 transition cursor-pointer"
              >
                Yes, Create / Export
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
