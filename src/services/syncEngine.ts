import { LocalStorageDB } from './storage';
import { Product, Sale, StockAdjustment, SyncQueueAction, SyncStats } from '../types/pos';

type SyncListener = (stats: SyncStats) => void;

class SyncEngine {
  private listeners: Set<SyncListener> = new Set();
  private stats: SyncStats;
  private pollInterval: any = null;
  private isProcessingQueue = false;

  constructor() {
    this.stats = LocalStorageDB.getSyncStats();
    this.stats.isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
    this.updatePendingCount();

    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => this.handleNetworkChange(true));
      window.addEventListener('offline', () => this.handleNetworkChange(false));
    }

    this.startBackgroundSync();
  }

  public subscribe(listener: SyncListener): () => void {
    this.listeners.add(listener);
    listener(this.stats);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    LocalStorageDB.saveSyncStats(this.stats);
    this.listeners.forEach(fn => fn({ ...this.stats }));
  }

  private handleNetworkChange(isOnline: boolean) {
    this.stats.isOnline = isOnline;
    if (isOnline) {
      // Auto-trigger sync when back online
      this.syncNow();
    }
    this.notify();
  }

  public toggleDataSaver(enabled?: boolean): boolean {
    const newVal = enabled !== undefined ? enabled : !this.stats.dataSaverMode;
    this.stats.dataSaverMode = newVal;
    this.notify();
    // Reconfigure intervals based on data saver
    this.startBackgroundSync();
    return newVal;
  }

  public getStats(): SyncStats {
    return { ...this.stats };
  }

  public updatePendingCount() {
    const queue = LocalStorageDB.getSyncQueue();
    this.stats.pendingCount = queue.length;
    this.notify();
  }

  public startBackgroundSync() {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
    }

    // In data-saver mode: poll very sparingly (every 60s), otherwise every 15s
    const intervalMs = this.stats.dataSaverMode ? 60000 : 15000;
    this.pollInterval = setInterval(() => {
      if (this.stats.isOnline && !this.isProcessingQueue) {
        this.syncNow(true); // background silent sync
      }
    }, intervalMs);
  }

  /**
   * Queue an action to be synchronized
   */
  public queueAction(type: SyncQueueAction['type'], payload: any) {
    const queue = LocalStorageDB.getSyncQueue();
    const action: SyncQueueAction = {
      id: `act-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      type,
      payload,
      timestamp: Date.now(),
      attempts: 0,
    };
    queue.push(action);
    LocalStorageDB.saveSyncQueue(queue);
    this.updatePendingCount();

    // If online, immediately attempt sync
    if (this.stats.isOnline && !this.stats.dataSaverMode) {
      this.syncNow();
    }
  }

  /**
   * Primary sync loop - executes delta push & pull
   */
  public async syncNow(isBackground = false): Promise<{ success: boolean; message: string; updatedProductsCount: number }> {
    if (this.isProcessingQueue) {
      return { success: false, message: 'Sync already in progress', updatedProductsCount: 0 };
    }

    this.isProcessingQueue = true;
    this.stats.isSyncing = true;
    this.stats.lastError = undefined;
    this.notify();

    try {
      const queue = LocalStorageDB.getSyncQueue();
      const lastSync = LocalStorageDB.getLastSyncTime();

      const payload = {
        actions: queue,
        clientLastSync: lastSync,
      };

      const payloadString = JSON.stringify(payload);
      const payloadBytes = new TextEncoder().encode(payloadString).length;

      const response = await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: payloadString,
      });

      if (!response.ok) {
        throw new Error(`Server returned HTTP ${response.status}`);
      }

      const responseText = await response.text();
      const responseBytes = new TextEncoder().encode(responseText).length;
      const data = JSON.parse(responseText);

      // Track network bandwidth
      this.stats.bytesUploaded += payloadBytes;
      this.stats.bytesDownloaded += responseBytes;
      this.stats.deltaSyncsPerformed += 1;
      this.stats.serverConnected = true;
      this.stats.isOnline = true;

      // Filter out processed items from local queue
      if (Array.isArray(data.processedActionIds) && data.processedActionIds.length > 0) {
        const remainingQueue = queue.filter(item => !data.processedActionIds.includes(item.id));
        LocalStorageDB.saveSyncQueue(remainingQueue);
      }

      // Merge delta products returned from server
      let updatedCount = 0;
      if (Array.isArray(data.deltaProducts) && data.deltaProducts.length > 0) {
        const currentProducts = LocalStorageDB.getProducts();
        const productMap = new Map<string, Product>();
        currentProducts.forEach(p => productMap.set(p.id, p));

        for (const deltaItem of data.deltaProducts) {
          productMap.set(deltaItem.id, deltaItem);
          updatedCount++;
        }

        LocalStorageDB.saveProducts(Array.from(productMap.values()));
      }

      // Update last sync timestamp
      const serverTimestamp = data.serverTimestamp || Date.now();
      LocalStorageDB.setLastSyncTime(serverTimestamp);
      this.stats.lastSyncTime = serverTimestamp;
      this.updatePendingCount();

      return {
        success: true,
        message: `Synced ${data.processedActionIds?.length || 0} items. Received ${updatedCount} catalog updates.`,
        updatedProductsCount: updatedCount,
      };
    } catch (err: any) {
      console.warn('Sync failed (working offline):', err.message);
      this.stats.serverConnected = false;
      this.stats.lastError = err.message || 'Offline or server unreachable';
      return { success: false, message: err.message, updatedProductsCount: 0 };
    } finally {
      this.isProcessingQueue = false;
      this.stats.isSyncing = false;
      this.updatePendingCount();
    }
  }
}

export const syncEngine = new SyncEngine();
