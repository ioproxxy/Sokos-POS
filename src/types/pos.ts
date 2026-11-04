export type VatClassification = 'A' | 'B' | 'C' | 'D'; // KRA eTIMS: A=16% Standard, B=8% Fuel, C=0% Zero-rated, D=Exempt

export interface Product {
  id: string;
  barcode: string;
  sku: string;
  name: string;
  category: string;
  price: number; // Retail price (Bei ya Rejareja)
  wholesalePrice?: number; // Wholesale price (Bei ya Jumla)
  wholesaleMinQty?: number; // e.g. 6 or 12 units for wholesale rate
  costPrice: number;
  stock: number;
  minStockAlert: number;
  unit: string; // 'pcs' | 'kg' | 'pack' | 'box' | 'bottle' | 'carton' | 'bale'
  vatClassification: VatClassification;
  updatedAt: number;
  description?: string;
  isPopular?: boolean;
  // Sokos.co.ke E-Commerce sync fields
  publishedOnSokos?: boolean;
  onlinePrice?: number;
  onlineDescription?: string;
  // Fast duka staple keys (loose items without barcode e.g. eggs, mandazi)
  isQuickItem?: boolean;
  quickIcon?: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
  appliedPrice: number; // dynamically calculated (retail vs wholesale)
  isWholesaleRate?: boolean;
  discountPercent?: number;
}

export type PaymentMethod = 'cash' | 'mpesa' | 'card' | 'credit' | 'split';

export interface MpesaDetails {
  mpesaReceipt: string; // e.g. "SLD984X7K2"
  phone: string; // "254712345678"
  senderName?: string;
  tillOrPaybill: string;
  accountNumber?: string;
  mode: 'stk_push' | 'sms_paste' | 'manual';
  verifiedAt: number;
}

export interface SplitPayment {
  cashAmount: number;
  mpesaAmount: number;
  mpesaReceipt?: string;
  mpesaPhone?: string;
}

export interface EtimsInfo {
  kraControlNumber: string; // e.g. "01102930294829"
  cuSerialNumber: string; // e.g. "KRA-ETIMS-KE01-84920"
  qrVerificationUrl: string;
  vatA_16: number; // 16% taxable amount
  taxA_16: number; // Tax collected on 16%
  vatB_8: number; // 8% taxable amount
  taxB_8: number;
  vatC_0: number; // Zero-rated
  vatD_Exempt: number; // Exempt
}

export interface Sale {
  id: string;
  receiptNumber: string;
  items: {
    productId: string;
    name: string;
    barcode: string;
    unitPrice: number;
    isWholesale?: boolean;
    quantity: number;
    discountPercent: number;
    subtotal: number;
    vatClassification: VatClassification;
  }[];
  subtotal: number;
  discountTotal: number;
  taxRate: number; // Default 16% VAT
  taxTotal: number;
  grandTotal: number;
  paymentMethod: PaymentMethod;
  paymentReference?: string;
  mpesaDetails?: MpesaDetails;
  splitPayment?: SplitPayment;
  amountTendered: number;
  changeDue: number;
  customerName?: string;
  customerPhone?: string;
  creditCustomerId?: string; // If sold on Deni / Store Credit
  cashierName: string;
  timestamp: number;
  syncStatus: 'synced' | 'pending' | 'offline';
  etimsInfo?: EtimsInfo;
  isWholesaleOrder?: boolean;
  notes?: string;
  source?: 'pos' | 'sokos_ecommerce';
}

export interface CustomerCreditAccount {
  id: string;
  name: string;
  phone: string;
  idNumber?: string;
  location?: string;
  creditLimit: number;
  currentBalance: number; // Total outstanding debt
  status: 'active' | 'blocked';
  notes?: string;
  createdAt: number;
  updatedAt: number;
}

export interface CreditTransaction {
  id: string;
  customerId: string;
  customerName: string;
  type: 'DEBT_ISSUED' | 'PAYMENT_RECEIVED';
  amount: number;
  runningBalanceAfter: number;
  saleId?: string;
  receiptNumber?: string;
  paymentMethod?: 'cash' | 'mpesa';
  mpesaReference?: string;
  notes?: string;
  timestamp: number;
}

// ----------------------------------------------------------------------
// SOKOS.CO.KE E-COMMERCE PLATFORM INTEGRATION TYPES
// ----------------------------------------------------------------------

export interface EcommerceOrderItem {
  productId: string;
  name: string;
  unitPrice: number;
  quantity: number;
  subtotal: number;
}

export interface EcommerceOrder {
  id: string;
  orderNumber: string; // e.g. "SK-2026-9042"
  customerName: string;
  customerPhone: string;
  deliveryAddress: string;
  estateOrArea: string; // e.g. "South B, Golden Gate", "Kilimani, Wood Avenue", "Roysambu Lumumba Dr"
  items: EcommerceOrderItem[];
  subtotal: number;
  deliveryFee: number;
  total: number;
  paymentMethod: 'mpesa' | 'cash_on_delivery';
  paymentStatus: 'paid_mpesa' | 'pending_cod';
  mpesaCode?: string;
  orderStatus: 'new' | 'accepted' | 'dispatched' | 'delivered' | 'cancelled';
  createdAt: number;
  dispatchedAt?: number;
  notes?: string;
}

export interface SokosEcommerceConfig {
  storeSlug: string; // e.g. "sokos.co.ke/biashara-mini-mart"
  isOnlineLive: boolean; // Accept online orders toggle
  estateCoverage: string; // e.g. "Nairobi CBD, South B, Westlands, Kilimani"
  deliveryFeeKes: number; // e.g. 150 KSh boda fee
  estimatedMinutes: number; // e.g. 35 mins
  minOrderKes: number; // e.g. 300 KSh
  lastSyncedTimestamp: number;
  totalProductsListed: number;
  apiConnected: boolean;
}

// ----------------------------------------------------------------------
// REALISTIC DUKA DAILY EXPENSES / PETTY CASH (MATUMIZI YA TILL)
// ----------------------------------------------------------------------

export interface DukaExpense {
  id: string;
  description: string;
  category: 'boda_transport' | 'stock_delivery' | 'kanjo_license' | 'tokens_power' | 'staff_lunch' | 'cleaning_supplies' | 'other';
  amount: number;
  paidVia: 'cash' | 'mpesa';
  recordedBy: string;
  receiptOrRef?: string;
  timestamp: number;
}

export interface StockAdjustment {
  id: string;
  productId: string;
  productName: string;
  previousStock: number;
  newStock: number;
  changeDelta: number;
  reason: 'sale' | 'restock' | 'spoilage_damage' | 'inventory_audit' | 'customer_return' | 'sokos_ecommerce_sale';
  timestamp: number;
  syncStatus: 'synced' | 'pending';
  note?: string;
}

export interface SyncQueueAction {
  id: string;
  type: 'SALE_CREATE' | 'STOCK_ADJUST' | 'PRODUCT_UPSERT' | 'PRODUCT_DELETE' | 'CREDIT_UPDATE' | 'EXPENSE_RECORD' | 'ECOMMERCE_ORDER_UPDATE' | 'SOKOS_CATALOG_SYNC';
  payload: any;
  timestamp: number;
  attempts: number;
}

export interface StoreConfig {
  storeName: string;
  tagline: string;
  address: string;
  phone: string;
  email: string;
  taxId: string; // KRA PIN (e.g. P051283940X)
  etimsCuNumber: string; // KRA eTIMS CU Serial Number
  currencySymbol: string; // 'KSh'
  taxRatePercent: number; // 16% standard VAT
  mpesaTillNumber: string; // Buy Goods Till Number (e.g. 542890)
  mpesaPaybillNumber: string; // Paybill (e.g. 400200)
  mpesaAccountName: string; // Account Name for Paybill
  allowDeniCredit: boolean;
  allowWholesalePricing: boolean;
  swahiliReceiptEnabled: boolean;
  receiptFooterMessage: string;
  // Sokos.co.ke e-commerce connection
  sokosPlatformUrl: string;
}

export interface SyncStats {
  isOnline: boolean;
  isSyncing: boolean;
  pendingCount: number;
  lastSyncTime: number | null;
  bytesUploaded: number;
  bytesDownloaded: number;
  deltaSyncsPerformed: number;
  dataSaverMode: boolean;
  serverConnected: boolean;
  sokosEcommerceSyncTime: number | null;
  lastError?: string;
}

export interface EodZReport {
  id: string;
  dateStr: string;
  generatedAt: number;
  cashierName: string;
  openingCashFloat: number;
  totalSalesCount: number;
  grossSalesKes: number;
  netSalesKes: number;
  cashSalesKes: number;
  mpesaSalesKes: number;
  creditSalesKes: number;
  cardSalesKes: number;
  ecommerceSalesKes: number;
  debtRepaymentsCollectedKes: number;
  totalCashInDrawer: number;
  totalExpensesPaidOutKes: number;
  expectedFinalCashInTill: number;
  vatCollectedKes: number;
  discountsGivenKes: number;
}
