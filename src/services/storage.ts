import { 
  Product, Sale, StockAdjustment, SyncQueueAction, StoreConfig, 
  SyncStats, CustomerCreditAccount, CreditTransaction, 
  EcommerceOrder, SokosEcommerceConfig, DukaExpense 
} from '../types/pos';

const STORAGE_KEYS = {
  PRODUCTS: 'sokos_pos_products_ke_v3',
  SALES: 'sokos_pos_sales_ke_v3',
  QUEUE: 'sokos_pos_sync_queue_ke_v3',
  ADJUSTMENTS: 'sokos_pos_adjustments_ke_v3',
  CONFIG: 'sokos_pos_store_config_ke_v3',
  STATS: 'sokos_pos_sync_stats_ke_v3',
  CREDIT_ACCOUNTS: 'sokos_pos_credit_accounts_ke_v3',
  CREDIT_TRANSACTIONS: 'sokos_pos_credit_transactions_ke_v3',
  ECOMMERCE_CONFIG: 'sokos_ecommerce_config_ke_v3',
  ECOMMERCE_ORDERS: 'sokos_ecommerce_orders_ke_v3',
  EXPENSES: 'sokos_duka_expenses_ke_v3',
  LAST_SYNC: 'sokos_pos_last_sync_timestamp',
};

export const DEFAULT_STORE_CONFIG: StoreConfig = {
  storeName: 'Sokos Market & Tech Hub',
  tagline: 'Duka Lako La Kila Siku • Fresh Retail & Wholesale',
  address: 'Plot 42, Biashara Street, Nairobi, Kenya',
  phone: '+254 712 345 678',
  email: 'info@sokosmarket.co.ke',
  taxId: 'P051283940X', // KRA PIN
  etimsCuNumber: 'KRA-ETIMS-KE01-84920',
  currencySymbol: 'KSh',
  taxRatePercent: 16.0, // Standard Kenyan VAT rate
  mpesaTillNumber: '542890', // Buy Goods & Services Till
  mpesaPaybillNumber: '400200',
  mpesaAccountName: 'SOKOS MARKET',
  allowDeniCredit: true,
  allowWholesalePricing: true,
  swahiliReceiptEnabled: true,
  receiptFooterMessage: 'Asante kwa kununua nasi. Karibu tena!',
  sokosPlatformUrl: 'https://sokos.co.ke/duka/biashara-mart',
};

export const DEFAULT_SOKOS_ECOMMERCE_CONFIG: SokosEcommerceConfig = {
  storeSlug: 'biashara-mart',
  isOnlineLive: true,
  estateCoverage: 'Nairobi CBD, South B, South C, Kilimani, Westlands, Upperhill',
  deliveryFeeKes: 150.0,
  estimatedMinutes: 35,
  minOrderKes: 300.0,
  lastSyncedTimestamp: Date.now() - 15 * 60000,
  totalProductsListed: 8,
  apiConnected: true,
};

export const INITIAL_PRODUCTS: Product[] = [
  {
    id: 'prod-001',
    barcode: '600100100101',
    sku: 'SOK-UNGA-01',
    name: 'Dola Premium Maize Meal Flour (2kg)',
    category: 'Cooking & Pantry',
    price: 195.0,
    wholesalePrice: 180.0,
    wholesaleMinQty: 12,
    costPrice: 165.0,
    stock: 48,
    minStockAlert: 12,
    unit: 'pack',
    vatClassification: 'C', // Zero-rated
    publishedOnSokos: true,
    onlinePrice: 195.0,
    onlineDescription: 'Grade 1 fortified unga for sweet ugali. Instant estate delivery.',
    updatedAt: Date.now() - 3600000,
    isPopular: true
  },
  {
    id: 'prod-002',
    barcode: '600100100102',
    sku: 'SOK-MILK-02',
    name: 'Fresha Whole Pasteurized Milk (500ml Pouch)',
    category: 'Dairy & Chilled',
    price: 65.0,
    wholesalePrice: 58.0,
    wholesaleMinQty: 10,
    costPrice: 52.0,
    stock: 35,
    minStockAlert: 15,
    unit: 'pouch',
    vatClassification: 'D', // Exempt
    publishedOnSokos: true,
    onlinePrice: 65.0,
    onlineDescription: 'Fresh chilled milk from Githunguri Dairy.',
    updatedAt: Date.now() - 3600000,
    isPopular: true
  },
  {
    id: 'prod-003',
    barcode: '600100100103',
    sku: 'SOK-TEA-03',
    name: 'Ketepa Fahari Ya Kenya Tea Bags (100s)',
    category: 'Beverages',
    price: 240.0,
    wholesalePrice: 215.0,
    wholesaleMinQty: 6,
    costPrice: 185.0,
    stock: 24,
    minStockAlert: 8,
    unit: 'box',
    vatClassification: 'A',
    publishedOnSokos: true,
    onlinePrice: 240.0,
    updatedAt: Date.now() - 3600000,
    isPopular: true
  },
  {
    id: 'prod-004',
    barcode: '600100100104',
    sku: 'SOK-RICE-04',
    name: 'Daawat Pishori Pure Basmati Rice (2kg)',
    category: 'Cooking & Pantry',
    price: 520.0,
    wholesalePrice: 485.0,
    wholesaleMinQty: 6,
    costPrice: 440.0,
    stock: 18,
    minStockAlert: 6,
    unit: 'pack',
    vatClassification: 'A',
    publishedOnSokos: true,
    onlinePrice: 520.0,
    updatedAt: Date.now() - 3600000,
    isPopular: true
  },
  {
    id: 'prod-005',
    barcode: '600100100105',
    sku: 'SOK-OIL-05',
    name: 'Rina Fortified Pure Vegetable Cooking Oil (1L)',
    category: 'Cooking & Pantry',
    price: 330.0,
    wholesalePrice: 305.0,
    wholesaleMinQty: 6,
    costPrice: 280.0,
    stock: 6,
    minStockAlert: 10,
    unit: 'bottle',
    vatClassification: 'A',
    publishedOnSokos: true,
    onlinePrice: 330.0,
    updatedAt: Date.now() - 3600000,
    isPopular: true
  },
  {
    id: 'prod-006',
    barcode: '600100100106',
    sku: 'SOK-SOAP-06',
    name: 'Menengai White Laundry Bar Soap (800g)',
    category: 'Household & Cleaning',
    price: 185.0,
    wholesalePrice: 165.0,
    wholesaleMinQty: 10,
    costPrice: 150.0,
    stock: 40,
    minStockAlert: 10,
    unit: 'bar',
    vatClassification: 'A',
    publishedOnSokos: true,
    onlinePrice: 185.0,
    updatedAt: Date.now() - 3600000,
    isPopular: true
  },
  {
    id: 'prod-007',
    barcode: '600100100107',
    sku: 'SOK-COF-07',
    name: 'Java House Kenya AA Medium Roast Coffee (375g)',
    category: 'Beverages',
    price: 980.0,
    wholesalePrice: 910.0,
    wholesaleMinQty: 4,
    costPrice: 820.0,
    stock: 12,
    minStockAlert: 4,
    unit: 'pack',
    vatClassification: 'A',
    publishedOnSokos: true,
    onlinePrice: 980.0,
    updatedAt: Date.now() - 3600000,
    isPopular: false
  },
  {
    id: 'prod-008',
    barcode: '600100100108',
    sku: 'SOK-WAT-08',
    name: 'Keringet Natural Spring Water (500ml)',
    category: 'Beverages',
    price: 50.0,
    wholesalePrice: 42.0,
    wholesaleMinQty: 24,
    costPrice: 35.0,
    stock: 72,
    minStockAlert: 24,
    unit: 'bottle',
    vatClassification: 'A',
    publishedOnSokos: true,
    onlinePrice: 50.0,
    updatedAt: Date.now() - 3600000,
    isPopular: true
  },
  {
    id: 'prod-009',
    barcode: '600100100109',
    sku: 'SOK-SUG-09',
    name: 'Kabras Pure White Cane Sugar (1kg)',
    category: 'Cooking & Pantry',
    price: 180.0,
    wholesalePrice: 165.0,
    wholesaleMinQty: 10,
    costPrice: 155.0,
    stock: 4,
    minStockAlert: 15,
    unit: 'pack',
    vatClassification: 'A',
    publishedOnSokos: false,
    updatedAt: Date.now() - 3600000,
    isPopular: true
  },
  {
    id: 'prod-010',
    barcode: '600100100110',
    sku: 'SOK-BAT-10',
    name: 'Tiger Head AAA Heavy Duty Batteries (4-Pack)',
    category: 'Electronics & Hardware',
    price: 120.0,
    wholesalePrice: 100.0,
    wholesaleMinQty: 12,
    costPrice: 80.0,
    stock: 15,
    minStockAlert: 6,
    unit: 'pack',
    vatClassification: 'A',
    publishedOnSokos: false,
    updatedAt: Date.now() - 3600000,
    isPopular: false
  },
  // REALISTIC LOOSE UNBARCODED DUKA STAPLES (FAST TOUCH KEYS)
  {
    id: 'prod-quick-01',
    barcode: 'DUKA-EGG-01',
    sku: 'DUKA-EGG',
    name: 'Mayai Safi ya Kienyeji (Fresh Farm Egg)',
    category: 'Daily Duka Staples',
    price: 20.0,
    wholesalePrice: 18.0,
    costPrice: 15.0,
    stock: 90,
    minStockAlert: 30,
    unit: 'pcs',
    vatClassification: 'D',
    isQuickItem: true,
    quickIcon: '🥚',
    publishedOnSokos: true,
    onlinePrice: 22.0,
    updatedAt: Date.now() - 3600000,
  },
  {
    id: 'prod-quick-02',
    barcode: 'DUKA-MANDAZI-02',
    sku: 'DUKA-MAND',
    name: 'KDF Mandazi Tamu (Fried Doughnut)',
    category: 'Daily Duka Staples',
    price: 20.0,
    wholesalePrice: 17.0,
    costPrice: 14.0,
    stock: 45,
    minStockAlert: 15,
    unit: 'pcs',
    vatClassification: 'A',
    isQuickItem: true,
    quickIcon: '🍩',
    publishedOnSokos: false,
    updatedAt: Date.now() - 3600000,
  },
  {
    id: 'prod-quick-03',
    barcode: 'DUKA-SUKUMA-03',
    sku: 'DUKA-SUK',
    name: 'Sukuma Wiki Greens Bunch (Fresh Cut)',
    category: 'Daily Duka Staples',
    price: 30.0,
    costPrice: 18.0,
    stock: 25,
    minStockAlert: 10,
    unit: 'bunch',
    vatClassification: 'D',
    isQuickItem: true,
    quickIcon: '🥬',
    publishedOnSokos: true,
    onlinePrice: 35.0,
    updatedAt: Date.now() - 3600000,
  },
  {
    id: 'prod-quick-04',
    barcode: 'DUKA-KIBERITI-04',
    sku: 'DUKA-KIB',
    name: 'Kiberiti Matchbox (Single Box)',
    category: 'Daily Duka Staples',
    price: 10.0,
    costPrice: 6.0,
    stock: 80,
    minStockAlert: 20,
    unit: 'box',
    vatClassification: 'A',
    isQuickItem: true,
    quickIcon: '🔥',
    publishedOnSokos: false,
    updatedAt: Date.now() - 3600000,
  },
  {
    id: 'prod-quick-05',
    barcode: 'DUKA-BREAD-HALF-05',
    sku: 'DUKA-BRD-HALF',
    name: 'Broadways White Bread (Half Loaf 200g)',
    category: 'Daily Duka Staples',
    price: 35.0,
    costPrice: 28.0,
    stock: 14,
    minStockAlert: 6,
    unit: 'half',
    vatClassification: 'C',
    isQuickItem: true,
    quickIcon: '🍞',
    publishedOnSokos: true,
    onlinePrice: 35.0,
    updatedAt: Date.now() - 3600000,
  },
  {
    id: 'prod-quick-06',
    barcode: 'DUKA-ROYCO-06',
    sku: 'DUKA-ROYCO',
    name: 'Royco Mchuzi Mix Beef (25g Sachet)',
    category: 'Daily Duka Staples',
    price: 15.0,
    costPrice: 10.0,
    stock: 60,
    minStockAlert: 20,
    unit: 'sachet',
    vatClassification: 'A',
    isQuickItem: true,
    quickIcon: '🍲',
    publishedOnSokos: true,
    onlinePrice: 15.0,
    updatedAt: Date.now() - 3600000,
  }
];

export const INITIAL_CREDIT_ACCOUNTS: CustomerCreditAccount[] = [
  {
    id: 'cred-001',
    name: 'Mama Boi (Grace Wanjiku)',
    phone: '0722334455',
    idNumber: '24892019',
    location: 'Plot 12, Biashara Lane',
    creditLimit: 5000.0,
    currentBalance: 1450.0,
    status: 'active',
    notes: 'Regular customer, pays weekly via M-Pesa.',
    createdAt: Date.now() - 30 * 86400000,
    updatedAt: Date.now() - 2 * 86400000,
  },
  {
    id: 'cred-002',
    name: 'Baba Kevin (Peter Omondi)',
    phone: '0733889900',
    idNumber: '19827361',
    location: 'Stage ya Boda, Shop 3',
    creditLimit: 3000.0,
    currentBalance: 650.0,
    status: 'active',
    notes: 'Boda rider, clears debt on Friday evening.',
    createdAt: Date.now() - 15 * 86400000,
    updatedAt: Date.now() - 86400000,
  },
  {
    id: 'cred-003',
    name: 'Mama Brian (Fatuma Hassan)',
    phone: '0711447788',
    idNumber: '29837482',
    location: 'Near Primary School Gate',
    creditLimit: 8000.0,
    currentBalance: 0.0,
    status: 'active',
    notes: 'Prompt payer, good credit standing.',
    createdAt: Date.now() - 40 * 86400000,
    updatedAt: Date.now() - 5 * 86400000,
  }
];

export const INITIAL_ECOMMERCE_ORDERS: EcommerceOrder[] = [
  {
    id: 'ord-sk-9042',
    orderNumber: 'SK-2026-9042',
    customerName: 'Brenda Muthoni',
    customerPhone: '0728192837',
    deliveryAddress: 'House 4B, Wood Avenue Court, Kilimani',
    estateOrArea: 'Kilimani, Nairobi',
    items: [
      { productId: 'prod-001', name: 'Dola Premium Maize Meal Flour (2kg)', unitPrice: 195.0, quantity: 2, subtotal: 390.0 },
      { productId: 'prod-002', name: 'Fresha Whole Pasteurized Milk (500ml Pouch)', unitPrice: 65.0, quantity: 4, subtotal: 260.0 },
      { productId: 'prod-004', name: 'Daawat Pishori Pure Basmati Rice (2kg)', unitPrice: 520.0, quantity: 1, subtotal: 520.0 },
    ],
    subtotal: 1170.0,
    deliveryFee: 150.0,
    total: 1320.0,
    paymentMethod: 'mpesa',
    paymentStatus: 'paid_mpesa',
    mpesaCode: 'SLD910K3X7',
    orderStatus: 'new',
    createdAt: Date.now() - 18 * 60000, // 18 minutes ago
    notes: 'Gate code 4490, please ring bell upon arrival.',
  },
  {
    id: 'ord-sk-9043',
    orderNumber: 'SK-2026-9043',
    customerName: 'Kevin Otieno',
    customerPhone: '0719876543',
    deliveryAddress: 'Block C Apt 12, Golden Gate Estate, South B',
    estateOrArea: 'South B, Nairobi',
    items: [
      { productId: 'prod-005', name: 'Rina Fortified Pure Vegetable Cooking Oil (1L)', unitPrice: 330.0, quantity: 1, subtotal: 330.0 },
      { productId: 'prod-quick-01', name: 'Mayai Safi ya Kienyeji (Fresh Farm Egg)', unitPrice: 22.0, quantity: 6, subtotal: 132.0 },
      { productId: 'prod-003', name: 'Ketepa Fahari Ya Kenya Tea Bags (100s)', unitPrice: 240.0, quantity: 1, subtotal: 240.0 },
    ],
    subtotal: 702.0,
    deliveryFee: 150.0,
    total: 852.0,
    paymentMethod: 'mpesa',
    paymentStatus: 'paid_mpesa',
    mpesaCode: 'RK849201L9',
    orderStatus: 'accepted',
    createdAt: Date.now() - 42 * 60000, // 42 mins ago
    notes: 'Leave with security guard if not answering.',
  }
];

export const INITIAL_EXPENSES: DukaExpense[] = [
  {
    id: 'exp-01',
    description: 'Boda rider parcel delivery (South B courier token)',
    category: 'boda_transport',
    amount: 150.0,
    paidVia: 'cash',
    recordedBy: 'Cashier 01',
    timestamp: Date.now() - 3 * 3600000,
  },
  {
    id: 'exp-02',
    description: 'Nairobi City County (Kanjo) Daily Market License',
    category: 'kanjo_license',
    amount: 50.0,
    paidVia: 'cash',
    recordedBy: 'Cashier 01',
    receiptOrRef: 'KANJO-REC-892',
    timestamp: Date.now() - 5 * 3600000,
  }
];

export class LocalStorageDB {
  static getProducts(): Product[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.PRODUCTS);
      if (!data) {
        localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(INITIAL_PRODUCTS));
        return INITIAL_PRODUCTS;
      }
      return JSON.parse(data);
    } catch {
      return INITIAL_PRODUCTS;
    }
  }

  static saveProducts(products: Product[]): void {
    try {
      localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(products));
    } catch (e) {
      console.error('Storage full or error saving products', e);
    }
  }

  static getSales(): Sale[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.SALES);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  static saveSales(sales: Sale[]): void {
    try {
      localStorage.setItem(STORAGE_KEYS.SALES, JSON.stringify(sales));
    } catch (e) {
      console.error('Storage error saving sales', e);
    }
  }

  static getCreditAccounts(): CustomerCreditAccount[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.CREDIT_ACCOUNTS);
      if (!data) {
        localStorage.setItem(STORAGE_KEYS.CREDIT_ACCOUNTS, JSON.stringify(INITIAL_CREDIT_ACCOUNTS));
        return INITIAL_CREDIT_ACCOUNTS;
      }
      return JSON.parse(data);
    } catch {
      return INITIAL_CREDIT_ACCOUNTS;
    }
  }

  static saveCreditAccounts(accounts: CustomerCreditAccount[]): void {
    try {
      localStorage.setItem(STORAGE_KEYS.CREDIT_ACCOUNTS, JSON.stringify(accounts));
    } catch (e) {
      console.error('Error saving credit accounts', e);
    }
  }

  static getCreditTransactions(): CreditTransaction[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.CREDIT_TRANSACTIONS);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  static saveCreditTransactions(txs: CreditTransaction[]): void {
    try {
      localStorage.setItem(STORAGE_KEYS.CREDIT_TRANSACTIONS, JSON.stringify(txs));
    } catch (e) {
      console.error('Error saving credit transactions', e);
    }
  }

  static getSokosEcommerceConfig(): SokosEcommerceConfig {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.ECOMMERCE_CONFIG);
      return data ? { ...DEFAULT_SOKOS_ECOMMERCE_CONFIG, ...JSON.parse(data) } : DEFAULT_SOKOS_ECOMMERCE_CONFIG;
    } catch {
      return DEFAULT_SOKOS_ECOMMERCE_CONFIG;
    }
  }

  static saveSokosEcommerceConfig(config: SokosEcommerceConfig): void {
    try {
      localStorage.setItem(STORAGE_KEYS.ECOMMERCE_CONFIG, JSON.stringify(config));
    } catch (e) {
      console.error('Error saving ecommerce config', e);
    }
  }

  static getEcommerceOrders(): EcommerceOrder[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.ECOMMERCE_ORDERS);
      if (!data) {
        localStorage.setItem(STORAGE_KEYS.ECOMMERCE_ORDERS, JSON.stringify(INITIAL_ECOMMERCE_ORDERS));
        return INITIAL_ECOMMERCE_ORDERS;
      }
      return JSON.parse(data);
    } catch {
      return INITIAL_ECOMMERCE_ORDERS;
    }
  }

  static saveEcommerceOrders(orders: EcommerceOrder[]): void {
    try {
      localStorage.setItem(STORAGE_KEYS.ECOMMERCE_ORDERS, JSON.stringify(orders));
    } catch (e) {
      console.error('Error saving ecommerce orders', e);
    }
  }

  static getDukaExpenses(): DukaExpense[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.EXPENSES);
      if (!data) {
        localStorage.setItem(STORAGE_KEYS.EXPENSES, JSON.stringify(INITIAL_EXPENSES));
        return INITIAL_EXPENSES;
      }
      return JSON.parse(data);
    } catch {
      return INITIAL_EXPENSES;
    }
  }

  static saveDukaExpenses(expenses: DukaExpense[]): void {
    try {
      localStorage.setItem(STORAGE_KEYS.EXPENSES, JSON.stringify(expenses));
    } catch (e) {
      console.error('Error saving expenses', e);
    }
  }

  static getSyncQueue(): SyncQueueAction[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.QUEUE);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  static saveSyncQueue(queue: SyncQueueAction[]): void {
    try {
      localStorage.setItem(STORAGE_KEYS.QUEUE, JSON.stringify(queue));
    } catch (e) {
      console.error('Storage error saving sync queue', e);
    }
  }

  static getStoreConfig(): StoreConfig {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.CONFIG);
      return data ? { ...DEFAULT_STORE_CONFIG, ...JSON.parse(data) } : DEFAULT_STORE_CONFIG;
    } catch {
      return DEFAULT_STORE_CONFIG;
    }
  }

  static saveStoreConfig(config: StoreConfig): void {
    try {
      localStorage.setItem(STORAGE_KEYS.CONFIG, JSON.stringify(config));
    } catch (e) {
      console.error('Storage error saving config', e);
    }
  }

  static getLastSyncTime(): number {
    try {
      const t = localStorage.getItem(STORAGE_KEYS.LAST_SYNC);
      return t ? parseInt(t, 10) : 0;
    } catch {
      return 0;
    }
  }

  static setLastSyncTime(time: number): void {
    try {
      localStorage.setItem(STORAGE_KEYS.LAST_SYNC, time.toString());
    } catch {}
  }

  static getSyncStats(): SyncStats {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.STATS);
      const defaults: SyncStats = {
        isOnline: navigator.onLine,
        isSyncing: false,
        pendingCount: 0,
        lastSyncTime: LocalStorageDB.getLastSyncTime() || null,
        bytesUploaded: 0,
        bytesDownloaded: 0,
        deltaSyncsPerformed: 0,
        dataSaverMode: false,
        serverConnected: true,
        sokosEcommerceSyncTime: Date.now() - 15 * 60000,
      };
      return data ? { ...defaults, ...JSON.parse(data) } : defaults;
    } catch {
      return {
        isOnline: navigator.onLine,
        isSyncing: false,
        pendingCount: 0,
        lastSyncTime: null,
        bytesUploaded: 0,
        bytesDownloaded: 0,
        deltaSyncsPerformed: 0,
        dataSaverMode: false,
        serverConnected: true,
        sokosEcommerceSyncTime: null,
      };
    }
  }

  static saveSyncStats(stats: Partial<SyncStats>): void {
    try {
      const current = LocalStorageDB.getSyncStats();
      localStorage.setItem(STORAGE_KEYS.STATS, JSON.stringify({ ...current, ...stats }));
    } catch {}
  }

  static resetAll(): void {
    localStorage.removeItem(STORAGE_KEYS.PRODUCTS);
    localStorage.removeItem(STORAGE_KEYS.SALES);
    localStorage.removeItem(STORAGE_KEYS.QUEUE);
    localStorage.removeItem(STORAGE_KEYS.ADJUSTMENTS);
    localStorage.removeItem(STORAGE_KEYS.CREDIT_ACCOUNTS);
    localStorage.removeItem(STORAGE_KEYS.CREDIT_TRANSACTIONS);
    localStorage.removeItem(STORAGE_KEYS.ECOMMERCE_ORDERS);
    localStorage.removeItem(STORAGE_KEYS.ECOMMERCE_CONFIG);
    localStorage.removeItem(STORAGE_KEYS.EXPENSES);
    localStorage.removeItem(STORAGE_KEYS.LAST_SYNC);
  }
}
