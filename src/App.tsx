import React, { useState, useEffect } from 'react';
import { 
  ShoppingCart, Package, Receipt, Settings, Users, 
  FileSpreadsheet, ShieldCheck, Globe, Wallet
} from 'lucide-react';
import { 
  Product, Sale, StoreConfig, SyncStats, StockAdjustment, 
  CustomerCreditAccount, CreditTransaction, EcommerceOrder, 
  SokosEcommerceConfig, DukaExpense 
} from './types/pos';
import { LocalStorageDB, DEFAULT_STORE_CONFIG, DEFAULT_SOKOS_ECOMMERCE_CONFIG } from './services/storage';
import { syncEngine } from './services/syncEngine';
import { BrandLogo } from './components/BrandLogo';
import { DataConsciousBar } from './components/DataConsciousBar';
import { POSScreen } from './components/POSScreen';
import { InventoryManager } from './components/InventoryManager';
import { SalesHistory } from './components/SalesHistory';
import { CreditManager } from './components/CreditManager';
import { SokosEcommerceManager } from './components/SokosEcommerceManager';
import { DukaExpensesModal } from './components/DukaExpensesModal';
import { ThermalReceipt } from './components/ThermalReceipt';
import { StoreSettingsModal } from './components/StoreSettingsModal';
import { EodReportModal } from './components/EodReportModal';
import { AppFooter, NavTab } from './components/AppFooter';
import { DataPipelineModal } from './components/DataPipelineModal';
import { playScanBeep, playSuccessChime } from './services/sound';

export default function App() {
  const [activeTab, setActiveTab] = useState<NavTab>('pos');
  const [products, setProducts] = useState<Product[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [creditAccounts, setCreditAccounts] = useState<CustomerCreditAccount[]>([]);
  const [creditTransactions, setCreditTransactions] = useState<CreditTransaction[]>([]);
  const [ecommerceOrders, setEcommerceOrders] = useState<EcommerceOrder[]>([]);
  const [ecommerceConfig, setEcommerceConfig] = useState<SokosEcommerceConfig>(DEFAULT_SOKOS_ECOMMERCE_CONFIG);
  const [expenses, setExpenses] = useState<DukaExpense[]>([]);
  const [config, setConfig] = useState<StoreConfig>(DEFAULT_STORE_CONFIG);
  const [syncStats, setSyncStats] = useState<SyncStats>(syncEngine.getStats());
  const [cartCount, setCartCount] = useState<number>(0);

  // Modals
  const [activeReceiptSale, setActiveReceiptSale] = useState<Sale | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isEodReportOpen, setIsEodReportOpen] = useState(false);
  const [isExpensesOpen, setIsExpensesOpen] = useState(false);
  const [isDataPipelineOpen, setIsDataPipelineOpen] = useState(false);
  const [isSimulatedOffline, setIsSimulatedOffline] = useState(false);

  // Cashier profile
  const [cashierName] = useState('Cashier 01 (Nairobi)');

  // Load initial local data
  useEffect(() => {
    const loadedProducts = LocalStorageDB.getProducts();
    const loadedSales = LocalStorageDB.getSales();
    const loadedAccounts = LocalStorageDB.getCreditAccounts();
    const loadedTransactions = LocalStorageDB.getCreditTransactions();
    const loadedOrders = LocalStorageDB.getEcommerceOrders();
    const loadedEcommerceCfg = LocalStorageDB.getSokosEcommerceConfig();
    const loadedExpenses = LocalStorageDB.getDukaExpenses();
    const loadedConfig = LocalStorageDB.getStoreConfig();

    setProducts(loadedProducts);
    setSales(loadedSales);
    setCreditAccounts(loadedAccounts);
    setCreditTransactions(loadedTransactions);
    setEcommerceOrders(loadedOrders);
    setEcommerceConfig(loadedEcommerceCfg);
    setExpenses(loadedExpenses);
    setConfig(loadedConfig);

    // Initial background sync check
    syncEngine.syncNow(true).then((res) => {
      if (res.success && res.updatedProductsCount > 0) {
        setProducts(LocalStorageDB.getProducts());
      }
    });

    // Subscribe to sync state changes
    const unsubscribe = syncEngine.subscribe((stats) => {
      setSyncStats(stats);
      const freshProducts = LocalStorageDB.getProducts();
      setProducts(freshProducts);
    });

    return () => unsubscribe();
  }, []);

  // Low Stock Count for Badge
  const lowStockCount = products.filter(
    (p) => p.stock <= p.minStockAlert
  ).length;

  // Active Debtors Count
  const activeDebtorsCount = creditAccounts.filter(
    (a) => a.currentBalance > 0
  ).length;

  // Complete a sale (handles inventory deduction, credit account update if Deni, and sync)
  const handleCompleteSale = (newSale: Sale) => {
    // 1. Deduct stock locally
    const updatedProducts = products.map((prod) => {
      const lineItem = newSale.items.find(
        (i) => i.productId === prod.id || i.barcode === prod.barcode
      );
      if (lineItem) {
        return {
          ...prod,
          stock: Math.max(0, prod.stock - lineItem.quantity),
          updatedAt: Date.now(),
        };
      }
      return prod;
    });

    setProducts(updatedProducts);
    LocalStorageDB.saveProducts(updatedProducts);

    // 2. If sold on credit ("Deni"), update the customer credit account
    if (newSale.paymentMethod === 'credit' && newSale.creditCustomerId) {
      const updatedAccounts = creditAccounts.map((acc) => {
        if (acc.id === newSale.creditCustomerId) {
          const newBal = acc.currentBalance + newSale.grandTotal;
          return {
            ...acc,
            currentBalance: newBal,
            updatedAt: Date.now(),
          };
        }
        return acc;
      });

      setCreditAccounts(updatedAccounts);
      LocalStorageDB.saveCreditAccounts(updatedAccounts);

      // Log credit transaction
      const targetAcc = creditAccounts.find((a) => a.id === newSale.creditCustomerId);
      const newTx: CreditTransaction = {
        id: `ctx-${Date.now()}`,
        customerId: newSale.creditCustomerId,
        customerName: targetAcc?.name || 'Customer',
        type: 'DEBT_ISSUED',
        amount: newSale.grandTotal,
        runningBalanceAfter: (targetAcc?.currentBalance || 0) + newSale.grandTotal,
        saleId: newSale.id,
        receiptNumber: newSale.receiptNumber,
        timestamp: Date.now(),
      };

      const updatedTxs = [newTx, ...creditTransactions];
      setCreditTransactions(updatedTxs);
      LocalStorageDB.saveCreditTransactions(updatedTxs);
    }

    // 3. Save sale locally
    const updatedSales = [newSale, ...sales];
    setSales(updatedSales);
    LocalStorageDB.saveSales(updatedSales);

    // 4. Queue action in sync engine
    if (!isSimulatedOffline) {
      syncEngine.queueAction('SALE_CREATE', newSale);
    } else {
      const queue = LocalStorageDB.getSyncQueue();
      queue.push({
        id: `act-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
        type: 'SALE_CREATE',
        payload: newSale,
        timestamp: Date.now(),
        attempts: 0,
      });
      LocalStorageDB.saveSyncQueue(queue);
      syncEngine.updatePendingCount();
    }

    // 5. Open customer receipt
    setActiveReceiptSale(newSale);
  };

  // Adjust stock
  const handleAdjustStock = (
    adjustment: Omit<StockAdjustment, 'id' | 'timestamp' | 'syncStatus'>
  ) => {
    const fullAdj: StockAdjustment = {
      ...adjustment,
      id: `adj-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      timestamp: Date.now(),
      syncStatus: 'pending',
    };

    const updated = products.map((p) =>
      p.id === adjustment.productId
        ? { ...p, stock: adjustment.newStock, updatedAt: Date.now() }
        : p
    );
    setProducts(updated);
    LocalStorageDB.saveProducts(updated);

    if (!isSimulatedOffline) {
      syncEngine.queueAction('STOCK_ADJUST', fullAdj);
    } else {
      const queue = LocalStorageDB.getSyncQueue();
      queue.push({
        id: `act-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
        type: 'STOCK_ADJUST',
        payload: fullAdj,
        timestamp: Date.now(),
        attempts: 0,
      });
      LocalStorageDB.saveSyncQueue(queue);
      syncEngine.updatePendingCount();
    }
  };

  // Save product (Add/Edit)
  const handleSaveProduct = (product: Product, isNew: boolean) => {
    let updatedList: Product[];
    if (isNew) {
      updatedList = [product, ...products];
    } else {
      updatedList = products.map((p) => (p.id === product.id ? product : p));
    }

    setProducts(updatedList);
    LocalStorageDB.saveProducts(updatedList);

    if (!isSimulatedOffline) {
      syncEngine.queueAction('PRODUCT_UPSERT', product);
    }
  };

  // Delete product
  const handleDeleteProduct = (productId: string) => {
    const updated = products.filter((p) => p.id !== productId);
    setProducts(updated);
    LocalStorageDB.saveProducts(updated);

    if (!isSimulatedOffline) {
      syncEngine.queueAction('PRODUCT_DELETE', { id: productId });
    }
  };

  // Record Debt Repayment
  const handleRecordDebtPayment = (
    txData: Omit<CreditTransaction, 'id' | 'timestamp'>
  ) => {
    const newTx: CreditTransaction = {
      ...txData,
      id: `ctx-${Date.now()}`,
      timestamp: Date.now(),
    };

    // Update account balance
    const updatedAccounts = creditAccounts.map((acc) => {
      if (acc.id === txData.customerId) {
        return {
          ...acc,
          currentBalance: txData.runningBalanceAfter,
          updatedAt: Date.now(),
        };
      }
      return acc;
    });

    setCreditAccounts(updatedAccounts);
    LocalStorageDB.saveCreditAccounts(updatedAccounts);

    const updatedTxs = [newTx, ...creditTransactions];
    setCreditTransactions(updatedTxs);
    LocalStorageDB.saveCreditTransactions(updatedTxs);

    // Queue sync action
    syncEngine.queueAction('CREDIT_UPDATE', {
      customerId: txData.customerId,
      amountPaid: txData.amount,
      newBalance: txData.runningBalanceAfter,
      paymentMethod: txData.paymentMethod,
      mpesaRef: txData.mpesaReference,
    });
  };

  // Add new Credit Account
  const handleAddCreditAccount = (account: CustomerCreditAccount) => {
    const updated = [account, ...creditAccounts];
    setCreditAccounts(updated);
    LocalStorageDB.saveCreditAccounts(updated);
  };

  // Void Sale
  const handleVoidSale = (saleId: string) => {
    const targetSale = sales.find((s) => s.id === saleId);
    if (!targetSale) return;

    // Rollback stock
    const restoredProducts = [...products];
    for (const item of targetSale.items) {
      const idx = restoredProducts.findIndex((p) => p.id === item.productId || p.barcode === item.barcode);
      if (idx >= 0) {
        restoredProducts[idx] = {
          ...restoredProducts[idx],
          stock: restoredProducts[idx].stock + item.quantity,
          updatedAt: Date.now(),
        };
      }
    }
    setProducts(restoredProducts);
    LocalStorageDB.saveProducts(restoredProducts);

    // Rollback debt if sold on credit
    if (targetSale.paymentMethod === 'credit' && targetSale.creditCustomerId) {
      const updatedAccounts = creditAccounts.map((acc) => {
        if (acc.id === targetSale.creditCustomerId) {
          return {
            ...acc,
            currentBalance: Math.max(0, acc.currentBalance - targetSale.grandTotal),
            updatedAt: Date.now(),
          };
        }
        return acc;
      });
      setCreditAccounts(updatedAccounts);
      LocalStorageDB.saveCreditAccounts(updatedAccounts);
    }

    const updatedSales = sales.filter((s) => s.id !== saleId);
    setSales(updatedSales);
    LocalStorageDB.saveSales(updatedSales);
  };

  // -------------------------------------------------------------
  // SOKOS.CO.KE E-COMMERCE INTEGRATION HANDLERS
  // -------------------------------------------------------------

  const handleUpdateEcommerceConfig = (newCfg: SokosEcommerceConfig) => {
    setEcommerceConfig(newCfg);
    LocalStorageDB.saveSokosEcommerceConfig(newCfg);
  };

  const handleUpdateEcommerceOrderStatus = async (
    orderId: string,
    status: EcommerceOrder['orderStatus']
  ) => {
    const target = ecommerceOrders.find((o) => o.id === orderId);
    const prevStatus = target?.orderStatus;

    const updated = ecommerceOrders.map((o) =>
      o.id === orderId
        ? {
            ...o,
            orderStatus: status,
            dispatchedAt: status === 'dispatched' ? Date.now() : o.dispatchedAt,
          }
        : o
    );
    setEcommerceOrders(updated);
    LocalStorageDB.saveEcommerceOrders(updated);

    // If order is newly accepted or dispatched, deduct physical inventory
    if (target && prevStatus === 'new' && (status === 'accepted' || status === 'dispatched')) {
      const updatedProducts = products.map((prod) => {
        const lineItem = target.items.find((i) => i.productId === prod.id);
        if (lineItem) {
          return {
            ...prod,
            stock: Math.max(0, prod.stock - lineItem.quantity),
            updatedAt: Date.now(),
          };
        }
        return prod;
      });
      setProducts(updatedProducts);
      LocalStorageDB.saveProducts(updatedProducts);
    }

    try {
      await fetch(`/api/ecommerce/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
    } catch {}
  };

  const handleToggleProductOnline = (
    productId: string,
    isOnline: boolean,
    onlinePrice?: number
  ) => {
    const updated = products.map((p) => {
      if (p.id === productId) {
        return {
          ...p,
          publishedOnSokos: isOnline,
          onlinePrice: onlinePrice !== undefined ? onlinePrice : p.onlinePrice || p.price,
          updatedAt: Date.now(),
        };
      }
      return p;
    });
    setProducts(updated);
    LocalStorageDB.saveProducts(updated);

    if (!isSimulatedOffline) {
      const targetProd = updated.find((p) => p.id === productId);
      if (targetProd) {
        syncEngine.queueAction('PRODUCT_UPSERT', targetProd);
      }
    }
  };

  const handleSyncCatalogToSokos = async () => {
    const onlineItems = products.map((p) => ({
      id: p.id,
      name: p.name,
      barcode: p.barcode,
      sku: p.sku,
      category: p.category,
      price: p.price,
      onlinePrice: p.onlinePrice || p.price,
      onlineDescription: p.onlineDescription || p.description,
      stock: p.stock,
      unit: p.unit,
      publishedOnSokos: Boolean(p.publishedOnSokos),
      updatedAt: Date.now(),
    }));

    try {
      const res = await fetch('/api/ecommerce/sync-catalog', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storeSlug: ecommerceConfig.storeSlug,
          catalog: onlineItems,
        }),
      });

      const data = await res.json();
      const updatedCfg = {
        ...ecommerceConfig,
        lastSyncedTimestamp: Date.now(),
        totalProductsListed: onlineItems.filter((i) => i.publishedOnSokos).length,
      };
      setEcommerceConfig(updatedCfg);
      LocalStorageDB.saveSokosEcommerceConfig(updatedCfg);

      return {
        success: true,
        bytesTransferred: data.bytesTransferred || 2150,
        message: data.message || 'Synced to Sokos.co.ke',
      };
    } catch {
      const updatedCfg = {
        ...ecommerceConfig,
        lastSyncedTimestamp: Date.now(),
        totalProductsListed: onlineItems.filter((i) => i.publishedOnSokos).length,
      };
      setEcommerceConfig(updatedCfg);
      LocalStorageDB.saveSokosEcommerceConfig(updatedCfg);
      return {
        success: true,
        bytesTransferred: 1420,
        message: 'Catalog updated locally for Sokos.co.ke storefront',
      };
    }
  };

  const handleSimulateIncomingOrder = async () => {
    try {
      const res = await fetch('/api/ecommerce/simulate-order', { method: 'POST' });
      const data = await res.json();
      if (data.order) {
        const updated = [data.order, ...ecommerceOrders];
        setEcommerceOrders(updated);
        LocalStorageDB.saveEcommerceOrders(updated);
        playSuccessChime();
        return;
      }
    } catch {}

    // Fallback simulation
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const orderId = `sokos-ord-${Date.now()}`;
    const sampleProds = products.filter((p) => p.publishedOnSokos).slice(0, 2);
    const items = (sampleProds.length > 0 ? sampleProds : products.slice(0, 2)).map((p) => ({
      productId: p.id,
      name: p.name,
      unitPrice: p.onlinePrice || p.price,
      quantity: 2,
      subtotal: (p.onlinePrice || p.price) * 2,
    }));
    const subtotal = items.reduce((s, i) => s + i.subtotal, 0);
    const simulatedOrder: EcommerceOrder = {
      id: orderId,
      orderNumber: `SK-2026-${randomSuffix}`,
      customerName: 'Wambui Karanja',
      customerPhone: '+254 722 839 104',
      deliveryAddress: 'Riverside Park, Hse 12B, Westlands',
      estateOrArea: 'Westlands, Nairobi',
      items,
      subtotal,
      deliveryFee: 180,
      total: subtotal + 180,
      paymentMethod: 'mpesa',
      paymentStatus: 'paid_mpesa',
      mpesaCode: `SLK${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
      orderStatus: 'new',
      createdAt: Date.now(),
      notes: 'Online order from Sokos.co.ke app.',
    };
    const updated = [simulatedOrder, ...ecommerceOrders];
    setEcommerceOrders(updated);
    LocalStorageDB.saveEcommerceOrders(updated);
    playSuccessChime();
  };

  // -------------------------------------------------------------
  // DUKA EXPENSES HANDLERS (MATUMIZI YA TILL)
  // -------------------------------------------------------------

  const handleAddExpense = async (expense: DukaExpense) => {
    const updated = [expense, ...expenses];
    setExpenses(updated);
    LocalStorageDB.saveDukaExpenses(updated);

    try {
      await fetch('/api/duka-expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(expense),
      });
    } catch {}

    if (!isSimulatedOffline) {
      syncEngine.queueAction('EXPENSE_RECORD', expense);
    }
  };

  const handleDeleteExpense = async (expenseId: string) => {
    const updated = expenses.filter((e) => e.id !== expenseId);
    setExpenses(updated);
    LocalStorageDB.saveDukaExpenses(updated);

    try {
      await fetch(`/api/duka-expenses/${expenseId}`, { method: 'DELETE' });
    } catch {}
  };

  // Manual sync button
  const handleManualSync = async () => {
    if (isSimulatedOffline) {
      setIsSimulatedOffline(false);
    }
    await syncEngine.syncNow();
    setProducts(LocalStorageDB.getProducts());
    setSales(LocalStorageDB.getSales());
  };

  // Reset Demo Catalog
  const handleResetDemoData = async () => {
    try {
      await fetch('/api/reset', { method: 'POST' });
    } catch {}
    LocalStorageDB.resetAll();
    setProducts(LocalStorageDB.getProducts());
    setSales([]);
    setCreditAccounts(LocalStorageDB.getCreditAccounts());
    setCreditTransactions([]);
    setEcommerceOrders(LocalStorageDB.getEcommerceOrders());
    setEcommerceConfig(LocalStorageDB.getSokosEcommerceConfig());
    setExpenses(LocalStorageDB.getDukaExpenses());
    syncEngine.updatePendingCount();
  };

  // Counts for tabs & badges
  const newOrdersCount = ecommerceOrders.filter((o) => o.orderStatus === 'new').length;
  const todayStartTs = new Date().setHours(0, 0, 0, 0);
  const todayExpensesTotal = expenses
    .filter((e) => e.timestamp >= todayStartTs)
    .reduce((sum, e) => sum + e.amount, 0);

  return (
    <div className="flex flex-col h-[100dvh] w-screen bg-slate-950 text-slate-100 overflow-hidden font-sans">
      {/* ----------------- TOP BRAND & NAV BAR ----------------- */}
      <header className="bg-slate-900 border-b border-slate-800 px-3 sm:px-5 py-2.5 flex items-center justify-between gap-3 flex-shrink-0 z-20">
        <BrandLogo size="md" />

        {/* Desktop Navigation Tabs (On mobile, seamlessly presented in the ergonomic AppFooter) */}
        <nav className="hidden md:flex items-center gap-1 sm:gap-1.5 bg-slate-950/80 p-1 rounded-xl border border-slate-800 overflow-x-auto">
          <button
            onClick={() => setActiveTab('pos')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium font-mono transition shrink-0 ${
              activeTab === 'pos'
                ? 'bg-emerald-600 text-white font-bold shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <ShoppingCart className="w-3.5 h-3.5" />
            <span>Mauzo (POS)</span>
          </button>

          <button
            onClick={() => setActiveTab('inventory')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium font-mono relative transition shrink-0 ${
              activeTab === 'inventory'
                ? 'bg-emerald-600 text-white font-bold shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <Package className="w-3.5 h-3.5" />
            <span>Bidhaa</span>
            {lowStockCount > 0 && (
              <span className="ml-0.5 px-1.5 py-0.2 rounded-full bg-amber-500 text-slate-950 text-[10px] font-black">
                {lowStockCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('ecommerce')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium font-mono relative transition shrink-0 ${
              activeTab === 'ecommerce'
                ? 'bg-emerald-600 text-white font-bold shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <Globe className="w-3.5 h-3.5 text-cyan-400" />
            <span>Sokos.co.ke</span>
            {newOrdersCount > 0 && (
              <span className="ml-0.5 px-1.5 py-0.2 rounded-full bg-cyan-400 text-slate-950 text-[10px] font-black animate-pulse">
                {newOrdersCount} MPYA
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('credit')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium font-mono relative transition shrink-0 ${
              activeTab === 'credit'
                ? 'bg-emerald-600 text-white font-bold shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Mali Ya Deni</span>
            {activeDebtorsCount > 0 && (
              <span className="ml-0.5 px-1.5 py-0.2 rounded-full bg-amber-500 text-slate-950 text-[10px] font-black">
                {activeDebtorsCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('sales')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium font-mono transition shrink-0 ${
              activeTab === 'sales'
                ? 'bg-emerald-600 text-white font-bold shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <Receipt className="w-3.5 h-3.5" />
            <span>Risiti</span>
          </button>
        </nav>

        {/* Right Tools: Daily Matumizi, Z-Report & Settings */}
        <div className="flex items-center gap-2">
          {/* Matumizi ya Till (Expenses) Button */}
          <button
            onClick={() => setIsExpensesOpen(true)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-mono transition"
            title="Duka Till Expenses & Payouts (Matumizi)"
          >
            <Wallet className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">Matumizi</span>
            {todayExpensesTotal > 0 && (
              <span className="text-[10px] font-bold text-amber-400">
                -KSh {todayExpensesTotal.toLocaleString()}
              </span>
            )}
          </button>

          {/* Daily Z-Report Button */}
          <button
            onClick={() => setIsEodReportOpen(true)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-mono transition"
            title="End of Day Balancing & KRA Z-Report"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden sm:inline">Z-Report</span>
          </button>

          {/* Data Pipeline (Sheets & CSV) Button */}
          <button
            onClick={() => setIsDataPipelineOpen(true)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-emerald-950/70 hover:bg-emerald-900/70 text-emerald-300 border border-emerald-700/70 text-xs font-mono font-semibold transition shadow-sm"
            title="Pipeline POS Data to Google Spreadsheets and CSV"
          >
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div>
            <span className="hidden md:inline">Pipelines (Sheets & CSV)</span>
            <span className="md:hidden">Sheets</span>
          </button>

          {/* Settings Button */}
          <button
            onClick={() => setIsSettingsOpen(true)}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition"
            title="Store & Kenya SME Settings"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* ----------------- DATA-CONSCIOUS SYNC BAR ----------------- */}
      <DataConsciousBar
        stats={syncStats}
        onManualSync={handleManualSync}
        isSimulatedOffline={isSimulatedOffline}
        onToggleSimulateOffline={() => setIsSimulatedOffline(!isSimulatedOffline)}
      />

      {/* ----------------- ACTIVE TAB VIEW ----------------- */}
      <main className="flex-1 flex overflow-hidden relative">
        {activeTab === 'pos' && (
          <POSScreen
            products={products}
            config={config}
            creditAccounts={creditAccounts}
            onCompleteSale={handleCompleteSale}
            onAddNewCustomer={handleAddCreditAccount}
            cashierName={cashierName}
            onCartCountChange={(cnt) => setCartCount(cnt)}
          />
        )}

        {activeTab === 'inventory' && (
          <InventoryManager
            products={products}
            config={config}
            onSaveProduct={handleSaveProduct}
            onDeleteProduct={handleDeleteProduct}
            onAdjustStock={handleAdjustStock}
            onOpenDataPipeline={() => setIsDataPipelineOpen(true)}
          />
        )}

        {activeTab === 'ecommerce' && (
          <SokosEcommerceManager
            products={products}
            orders={ecommerceOrders}
            config={config}
            ecommerceConfig={ecommerceConfig}
            onUpdateEcommerceConfig={handleUpdateEcommerceConfig}
            onUpdateOrderStatus={handleUpdateEcommerceOrderStatus}
            onToggleProductOnline={handleToggleProductOnline}
            onSyncCatalogToSokos={handleSyncCatalogToSokos}
            onSimulateIncomingOrder={handleSimulateIncomingOrder}
          />
        )}

        {activeTab === 'credit' && (
          <CreditManager
            accounts={creditAccounts}
            transactions={creditTransactions}
            config={config}
            onAddAccount={handleAddCreditAccount}
            onRecordPayment={handleRecordDebtPayment}
          />
        )}

        {activeTab === 'sales' && (
          <SalesHistory
            sales={sales}
            config={config}
            onViewReceipt={(sale) => setActiveReceiptSale(sale)}
            onVoidSale={handleVoidSale}
            onOpenDataPipeline={() => setIsDataPipelineOpen(true)}
          />
        )}
      </main>

      {/* ----------------- PERSISTENT APP FOOTER (OPTIMIZED FOR MOBILE BROWSERS & DESKTOP) ----------------- */}
      <AppFooter
        activeTab={activeTab}
        onSelectTab={(tab) => setActiveTab(tab)}
        cartCount={cartCount}
        lowStockCount={lowStockCount}
        newOrdersCount={newOrdersCount}
        activeDebtorsCount={activeDebtorsCount}
        todayExpensesTotal={todayExpensesTotal}
        config={config}
        syncStats={syncStats}
        isSimulatedOffline={isSimulatedOffline}
        onOpenExpenses={() => setIsExpensesOpen(true)}
        onOpenEodReport={() => setIsEodReportOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onManualSync={handleManualSync}
        onOpenDataPipeline={() => setIsDataPipelineOpen(true)}
      />

      {/* ----------------- CUSTOMER THERMAL RECEIPT ----------------- */}
      {activeReceiptSale && (
        <ThermalReceipt
          sale={activeReceiptSale}
          config={config}
          isOpen={Boolean(activeReceiptSale)}
          onClose={() => setActiveReceiptSale(null)}
          onNewSale={() => {
            setActiveReceiptSale(null);
            setActiveTab('pos');
          }}
        />
      )}

      {/* ----------------- DUKA EXPENSES / PETTY CASH MODAL ----------------- */}
      <DukaExpensesModal
        isOpen={isExpensesOpen}
        onClose={() => setIsExpensesOpen(false)}
        expenses={expenses}
        config={config}
        cashierName={cashierName}
        onAddExpense={handleAddExpense}
        onDeleteExpense={handleDeleteExpense}
      />

      {/* ----------------- EOD Z-REPORT MODAL ----------------- */}
      <EodReportModal
        isOpen={isEodReportOpen}
        onClose={() => setIsEodReportOpen(false)}
        sales={sales}
        creditTransactions={creditTransactions}
        expenses={expenses}
        ecommerceOrders={ecommerceOrders}
        config={config}
        cashierName={cashierName}
        onOpenDataPipeline={() => setIsDataPipelineOpen(true)}
      />

      {/* ----------------- DATA PIPELINE HUB MODAL (GOOGLE SHEETS & CSV) ----------------- */}
      <DataPipelineModal
        isOpen={isDataPipelineOpen}
        onClose={() => setIsDataPipelineOpen(false)}
        sales={sales}
        inventory={products}
        expenses={expenses}
        creditAccounts={creditAccounts}
        config={config}
      />

      {/* ----------------- STORE SETTINGS MODAL ----------------- */}
      <StoreSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        config={config}
        onSaveConfig={(newConfig) => {
          setConfig(newConfig);
          LocalStorageDB.saveStoreConfig(newConfig);
        }}
        onResetDemoData={handleResetDemoData}
      />
    </div>
  );
}
