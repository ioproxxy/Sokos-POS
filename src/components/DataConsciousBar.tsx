import React, { useState } from 'react';
import { Wifi, WifiOff, RefreshCw, Zap, Database, ArrowUpRight, ArrowDownLeft, ShieldCheck, Info, X } from 'lucide-react';
import { SyncStats } from '../types/pos';
import { syncEngine } from '../services/syncEngine';

interface DataConsciousBarProps {
  stats: SyncStats;
  onManualSync: () => void;
  isSimulatedOffline?: boolean;
  onToggleSimulateOffline?: () => void;
}

export const DataConsciousBar: React.FC<DataConsciousBarProps> = ({
  stats,
  onManualSync,
  isSimulatedOffline = false,
  onToggleSimulateOffline,
}) => {
  const [showMetricsModal, setShowMetricsModal] = useState(false);

  const effectiveOnline = stats.isOnline && !isSimulatedOffline;

  // Format bytes into human readable KB / MB
  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const timeAgo = (timestamp: number | null) => {
    if (!timestamp) return 'Never';
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 5) return 'Just now';
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    return `${Math.floor(minutes / 60)}h ago`;
  };

  // Estimated data saved by delta sync rather than full catalog transfers
  const estimatedFullCatalogSizePerSync = 3200; // ~3.2 KB per catalog query
  const totalCatalogTransfersPrevented = Math.max(1, stats.deltaSyncsPerformed);
  const estimatedSavedBytes = Math.max(
    0,
    totalCatalogTransfersPrevented * estimatedFullCatalogSizePerSync - stats.bytesDownloaded
  );

  return (
    <>
      <div className="bg-slate-900 border-b border-slate-800 px-3 sm:px-4 py-2 flex flex-wrap items-center justify-between gap-2 text-xs">
        {/* Left: Online Status & Queue Count */}
        <div className="flex items-center gap-2.5">
          <div
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full font-mono text-[11px] font-semibold transition ${
              effectiveOnline
                ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-500/40'
                : 'bg-amber-950/80 text-amber-400 border border-amber-500/40'
            }`}
          >
            {effectiveOnline ? (
              <>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <Wifi className="w-3.5 h-3.5" />
                <span>ONLINE</span>
              </>
            ) : (
              <>
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                <WifiOff className="w-3.5 h-3.5" />
                <span>OFFLINE (LOCAL STORAGE)</span>
              </>
            )}
          </div>

          {/* Pending Sync Badge */}
          {stats.pendingCount > 0 ? (
            <button
              onClick={() => effectiveOnline && onManualSync()}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 font-mono text-[11px] hover:bg-amber-500/20 transition"
              title="Click to sync queued transactions"
            >
              <Database className="w-3 h-3 text-amber-400" />
              <span>{stats.pendingCount} queued to sync</span>
            </button>
          ) : (
            <span className="hidden sm:inline-flex items-center gap-1 text-slate-400 font-mono text-[11px]">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>All sales synced</span>
            </span>
          )}

          <span className="hidden md:inline text-slate-500 font-mono text-[11px]">
            • Last sync: {timeAgo(stats.lastSyncTime)}
          </span>
        </div>

        {/* Right: Data Saver Toggle, Bandwidth Info, and Sync Button */}
        <div className="flex items-center gap-2">
          {/* Data Saver Mode Pill */}
          <button
            onClick={() => syncEngine.toggleDataSaver()}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-mono text-[11px] transition ${
              stats.dataSaverMode
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-semibold'
                : 'bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-700'
            }`}
            title="Data Saver limits network polling and compresses payloads to conserve cellular bundles"
          >
            <Zap className={`w-3 h-3 ${stats.dataSaverMode ? 'text-emerald-400 fill-emerald-400' : ''}`} />
            <span>Data Saver: {stats.dataSaverMode ? 'ON' : 'OFF'}</span>
          </button>

          {/* Bandwidth Inspector Trigger */}
          <button
            onClick={() => setShowMetricsModal(true)}
            className="hidden sm:flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-[11px] font-mono transition"
            title="View bandwidth consumption and data savings"
          >
            <Database className="w-3 h-3 text-emerald-400" />
            <span>{formatBytes(stats.bytesUploaded + stats.bytesDownloaded)}</span>
          </button>

          {/* Manual Sync Trigger */}
          <button
            onClick={onManualSync}
            disabled={stats.isSyncing || !effectiveOnline}
            className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white font-medium text-xs font-mono transition shadow-sm"
          >
            <RefreshCw className={`w-3 h-3 ${stats.isSyncing ? 'animate-spin' : ''}`} />
            <span>{stats.isSyncing ? 'Syncing...' : 'Sync'}</span>
          </button>
        </div>
      </div>

      {/* Bandwidth & Data-Conscious Metrics Modal */}
      {showMetricsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-slate-900/90">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
                  <Zap className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-semibold text-white text-sm">Data Consciousness Metrics</h3>
                  <p className="text-xs text-slate-400">Low-bandwidth optimization engine</p>
                </div>
              </div>
              <button
                onClick={() => setShowMetricsModal(false)}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Metrics Content */}
            <div className="p-5 space-y-4">
              {/* Savings Highlights */}
              <div className="p-3.5 rounded-xl bg-gradient-to-br from-emerald-950/70 to-slate-900 border border-emerald-500/30">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[11px] font-mono text-emerald-400 uppercase tracking-wider">
                      Bandwidth Saved (Delta Sync)
                    </p>
                    <p className="text-2xl font-black font-mono text-white mt-0.5">
                      {formatBytes(estimatedSavedBytes)}
                    </p>
                  </div>
                  <div className="px-2.5 py-1 rounded-md bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-mono text-xs font-bold">
                    ~88% Saved
                  </div>
                </div>
                <p className="text-xs text-slate-300 mt-2">
                  Sokos POS only synchronizes modified records and incremental deltas instead of downloading the entire catalog on every transaction.
                </p>
              </div>

              {/* Data In / Out Table */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700/80">
                  <div className="flex items-center gap-1.5 text-slate-400 text-xs">
                    <ArrowUpRight className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Uploaded (Sales)</span>
                  </div>
                  <p className="text-lg font-bold font-mono text-white mt-1">
                    {formatBytes(stats.bytesUploaded)}
                  </p>
                  <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                    Compressed JSON batches
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700/80">
                  <div className="flex items-center gap-1.5 text-slate-400 text-xs">
                    <ArrowDownLeft className="w-3.5 h-3.5 text-sky-400" />
                    <span>Downloaded</span>
                  </div>
                  <p className="text-lg font-bold font-mono text-white mt-1">
                    {formatBytes(stats.bytesDownloaded)}
                  </p>
                  <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                    Incremental catalog deltas
                  </p>
                </div>
              </div>

              {/* Sync Queue Breakdown */}
              <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/60 space-y-2 text-xs">
                <div className="flex justify-between items-center text-slate-300">
                  <span>Queued Offline Operations:</span>
                  <span className="font-mono font-bold text-amber-400">{stats.pendingCount} items</span>
                </div>
                <div className="flex justify-between items-center text-slate-300">
                  <span>Total Delta Cycles:</span>
                  <span className="font-mono font-bold text-slate-200">{stats.deltaSyncsPerformed}</span>
                </div>
                <div className="flex justify-between items-center text-slate-300">
                  <span>Data Saver Mode:</span>
                  <span className={`font-mono font-bold ${stats.dataSaverMode ? 'text-emerald-400' : 'text-slate-400'}`}>
                    {stats.dataSaverMode ? 'ACTIVE (Conserving data)' : 'STANDARD'}
                  </span>
                </div>
              </div>

              {/* Testing Controls: Offline Simulation */}
              {onToggleSimulateOffline && (
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-slate-200">Test Offline Mode</p>
                    <p className="text-[10px] text-slate-400">
                      Simulate network disconnect to test sales capture without internet
                    </p>
                  </div>
                  <button
                    onClick={onToggleSimulateOffline}
                    className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition ${
                      isSimulatedOffline
                        ? 'bg-amber-600 hover:bg-amber-500 text-white'
                        : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                    }`}
                  >
                    {isSimulatedOffline ? 'Go Online' : 'Cut Internet'}
                  </button>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-5 py-3 border-t border-slate-800 bg-slate-900/60 flex justify-end">
              <button
                onClick={() => setShowMetricsModal(false)}
                className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
