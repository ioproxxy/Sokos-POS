import React, { useState, useMemo, useEffect } from 'react';
import { 
  Search, Barcode, ShoppingCart, Trash2, Plus, Minus,
  Banknote, Smartphone, Check, User, Phone,
  AlertTriangle, Tag, RefreshCw, Clipboard, CheckCircle2, Split,
  UserCheck, UserPlus, ChevronDown, X, ArrowLeft, ChevronRight
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { Product, CartItem, Sale, StoreConfig, PaymentMethod, CustomerCreditAccount } from '../types/pos';
import { playScanBeep, playSuccessChime, playWarningTone } from '../services/sound';
import { 
  parseMpesaSms, generateMpesaReceiptCode, calculateEtimsBreakdown, 
  getKenyanCashSuggestions 
} from '../services/kenyaBusinessLogic';
import { BarcodeScannerModal } from './BarcodeScannerModal';

interface POSScreenProps {
  products: Product[];
  config: StoreConfig;
  creditAccounts: CustomerCreditAccount[];
  onCompleteSale: (sale: Sale) => void;
  onAddNewCustomer?: (account: CustomerCreditAccount) => void;
  cashierName?: string;
  onRequestRestock?: (product: Product) => void;
  onCartCountChange?: (count: number) => void;
}

export const POSScreen: React.FC<POSScreenProps> = ({
  products,
  config,
  creditAccounts,
  onCompleteSale,
  onAddNewCustomer,
  cashierName = 'Cashier 01',
  onCartCountChange,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isWholesaleMode, setIsWholesaleMode] = useState(false);
  const [mobileTab, setMobileTab] = useState<'catalog' | 'checkout'>('catalog');

  // Notify parent of total cart count
  useEffect(() => {
    const totalCount = cart.reduce((sum, item) => sum + item.quantity, 0);
    onCartCountChange?.(totalCount);
  }, [cart, onCartCountChange]);

  // -------------------------------------------------------------
  // Customer Identification State (Front & Center)
  // -------------------------------------------------------------
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerCreditAccount | null>(null);
  const [isCustomerSelectorOpen, setIsCustomerSelectorOpen] = useState(false);
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');
  const [isCreatingCustomerInline, setIsCreatingCustomerInline] = useState(false);
  const [newCustName, setNewCustName] = useState('');
  const [newCustPhone, setNewCustPhone] = useState('');

  // -------------------------------------------------------------
  // Payment Station State (Directly Integrated)
  // -------------------------------------------------------------
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('mpesa'); // M-Pesa default for Kenya
  const [paymentReference, setPaymentReference] = useState('');
  const [amountTendered, setAmountTendered] = useState<number | ''>('');
  const [overallDiscountPercent, setOverallDiscountPercent] = useState<number>(0);

  // M-Pesa Specific
  const [mpesaMode, setMpesaMode] = useState<'stk_push' | 'sms_paste' | 'manual'>('stk_push');
  const [mpesaPhone, setMpesaPhone] = useState('');
  const [stkStatus, setStkStatus] = useState<'idle' | 'sending' | 'prompt_sent' | 'success' | 'failed'>('idle');
  const [stkCountdown, setStkCountdown] = useState(12);
  const [pastedSms, setPastedSms] = useState('');
  const [smsFeedback, setSmsFeedback] = useState<string | null>(null);

  // Split Payment (Cash + M-Pesa)
  const [splitCashAmount, setSplitCashAmount] = useState<number | ''>('');
  const [splitMpesaAmount, setSplitMpesaAmount] = useState<number | ''>('');
  const [splitMpesaRef, setSplitMpesaRef] = useState('');

  // Sync phone when customer changes
  useEffect(() => {
    if (selectedCustomer) {
      setMpesaPhone(selectedCustomer.phone);
    } else {
      setMpesaPhone('');
    }
  }, [selectedCustomer]);

  // Categories list
  const categories = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => set.add(p.category));
    return ['All', ...Array.from(set)];
  }, [products]);

  // Filtered products
  const filteredProducts = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return products.filter((p) => {
      const matchesCat = selectedCategory === 'All' || p.category === selectedCategory;
      const matchesQuery =
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.barcode.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q);
      return matchesCat && matchesQuery;
    });
  }, [products, selectedCategory, searchQuery]);

  // Dynamic pricing (Retail vs Wholesale)
  const getItemPrice = (product: Product, quantity: number, globalWholesale: boolean): { price: number; isWholesale: boolean } => {
    if (globalWholesale && product.wholesalePrice) {
      return { price: product.wholesalePrice, isWholesale: true };
    }
    if (product.wholesaleMinQty && quantity >= product.wholesaleMinQty && product.wholesalePrice) {
      return { price: product.wholesalePrice, isWholesale: true };
    }
    return { price: product.price, isWholesale: false };
  };

  // Add product to cart
  const addToCart = (product: Product) => {
    if (product.stock <= 0) {
      playWarningTone();
      return;
    }

    playScanBeep();
    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        if (existing.quantity >= product.stock) {
          playWarningTone();
          return prev;
        }
        const newQty = existing.quantity + 1;
        const { price, isWholesale } = getItemPrice(product, newQty, isWholesaleMode);
        return prev.map((item) =>
          item.product.id === product.id
            ? { ...item, quantity: newQty, appliedPrice: price, isWholesaleRate: isWholesale }
            : item
        );
      }
      const { price, isWholesale } = getItemPrice(product, 1, isWholesaleMode);
      return [...prev, { product, quantity: 1, appliedPrice: price, isWholesaleRate: isWholesale, discountPercent: 0 }];
    });
  };

  // Update cart prices on wholesale toggle
  useEffect(() => {
    setCart((prev) =>
      prev.map((item) => {
        const { price, isWholesale } = getItemPrice(item.product, item.quantity, isWholesaleMode);
        return {
          ...item,
          appliedPrice: price,
          isWholesaleRate: isWholesale,
        };
      })
    );
  }, [isWholesaleMode]);

  // Barcode scanned callback
  const handleBarcodeScanned = (scannedCode: string) => {
    const code = scannedCode.trim().toLowerCase();
    const product = products.find(
      (p) => p.barcode.toLowerCase() === code || p.sku.toLowerCase() === code
    );

    if (product) {
      addToCart(product);
    } else {
      playWarningTone();
      setSearchQuery(scannedCode);
    }
  };

  // Steppers
  const updateQuantity = (productId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.product.id === productId) {
            const newQty = item.quantity + delta;
            if (newQty <= 0) return null;
            if (newQty > item.product.stock) {
              playWarningTone();
              return item;
            }
            const { price, isWholesale } = getItemPrice(item.product, newQty, isWholesaleMode);
            return { ...item, quantity: newQty, appliedPrice: price, isWholesaleRate: isWholesale };
          }
          return item;
        })
        .filter(Boolean) as CartItem[]
    );
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.product.id !== productId));
  };

  const clearCart = () => {
    setCart([]);
  };

  // Financial Calculations
  const subtotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.appliedPrice * item.quantity, 0);
  }, [cart]);

  const discountAmount = useMemo(() => {
    return (subtotal * overallDiscountPercent) / 100;
  }, [subtotal, overallDiscountPercent]);

  const taxAmount = useMemo(() => {
    const netTotal = Math.max(0, subtotal - discountAmount);
    return Math.round((netTotal * (config.taxRatePercent / (100 + config.taxRatePercent))) * 100) / 100;
  }, [subtotal, discountAmount, config.taxRatePercent]);

  const grandTotal = useMemo(() => {
    return Math.max(0, subtotal - discountAmount);
  }, [subtotal, discountAmount]);

  // Quick cash buttons for Kenyan denominations
  const quickCashOptions = useMemo(() => {
    return getKenyanCashSuggestions(grandTotal);
  }, [grandTotal]);

  const changeDue = useMemo(() => {
    if (typeof amountTendered !== 'number') return 0;
    return Math.max(0, amountTendered - grandTotal);
  }, [amountTendered, grandTotal]);

  // Update split default amounts when grand total changes
  useEffect(() => {
    if (grandTotal > 0) {
      const half = Math.floor(grandTotal / 2);
      setSplitCashAmount(half);
      setSplitMpesaAmount(grandTotal - half);
      if (typeof amountTendered === 'number' && amountTendered < grandTotal) {
        setAmountTendered(grandTotal);
      }
    }
  }, [grandTotal]);

  // Filtered customer credit accounts for search
  const filteredCustomers = useMemo(() => {
    const q = customerSearchQuery.toLowerCase().trim();
    if (!q) return creditAccounts;
    return creditAccounts.filter(
      (c) => c.name.toLowerCase().includes(q) || c.phone.includes(q) || (c.location && c.location.toLowerCase().includes(q))
    );
  }, [creditAccounts, customerSearchQuery]);

  // Handle Inline Add Customer
  const handleCreateCustomerInline = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustName.trim() || !newCustPhone.trim()) return;

    const newCustomer: CustomerCreditAccount = {
      id: `cred-${Date.now()}`,
      name: newCustName.trim(),
      phone: newCustPhone.trim(),
      creditLimit: 5000,
      currentBalance: 0,
      status: 'active',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    if (onAddNewCustomer) {
      onAddNewCustomer(newCustomer);
    }
    setSelectedCustomer(newCustomer);
    setIsCreatingCustomerInline(false);
    setIsCustomerSelectorOpen(false);
    setNewCustName('');
    setNewCustPhone('');
    playSuccessChime();
  };

  // STK Push Simulation
  const handleTriggerStkPush = () => {
    const targetPhone = mpesaPhone.trim() || selectedCustomer?.phone || '';
    if (targetPhone.length < 9) {
      alert('Tafadhali weka nambari sahihi ya simu ya Safaricom (e.g. 0712345678)');
      return;
    }

    setStkStatus('sending');
    setTimeout(() => {
      setStkStatus('prompt_sent');
      setStkCountdown(10);

      const interval = setInterval(() => {
        setStkCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            const code = generateMpesaReceiptCode();
            setPaymentReference(code);
            setStkStatus('success');
            playSuccessChime();
            return 0;
          }
          return prev - 1;
        });
      }, 700);
    }, 1000);
  };

  // Parse SMS
  const handleParseSms = () => {
    const res = parseMpesaSms(pastedSms);
    if (res.success && res.code) {
      setPaymentReference(res.code);
      setSmsFeedback(`Imethibitishwa: ${res.code} (${config.currencySymbol} ${res.amount || grandTotal})`);
      playScanBeep();
    } else {
      setSmsFeedback(res.error || 'Nambari ya M-Pesa haikutambuliwa.');
      playWarningTone();
    }
  };

  // Complete Checkout
  const handleCompletePayment = () => {
    if (cart.length === 0) {
      playWarningTone();
      return;
    }

    // Check credit constraints
    if (paymentMethod === 'credit') {
      if (!selectedCustomer) {
        setIsCustomerSelectorOpen(true);
        alert('Tafadhali tambulisha au chagua mteja wa deni kabla ya kukamilisha!');
        return;
      }
      if (selectedCustomer.currentBalance + grandTotal > selectedCustomer.creditLimit) {
        if (!window.confirm(`Onyo: Mteja anavuka kiwango chake cha deni (Limit: ${config.currencySymbol} ${selectedCustomer.creditLimit}). Je, unataka kuendelea?`)) {
          return;
        }
      }
    }

    const receiptNumber = `SOK-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(1000 + Math.random() * 9000)}`;
    const etimsInfo = calculateEtimsBreakdown(cart, discountAmount);

    let mpesaDetails = undefined;
    if (paymentMethod === 'mpesa') {
      mpesaDetails = {
        mpesaReceipt: paymentReference || generateMpesaReceiptCode(),
        phone: mpesaPhone || selectedCustomer?.phone || '0700000000',
        tillOrPaybill: config.mpesaTillNumber,
        mode: mpesaMode,
        verifiedAt: Date.now(),
      };
    }

    let splitPaymentDetails = undefined;
    if (paymentMethod === 'split') {
      splitPaymentDetails = {
        cashAmount: typeof splitCashAmount === 'number' ? splitCashAmount : 0,
        mpesaAmount: typeof splitMpesaAmount === 'number' ? splitMpesaAmount : 0,
        mpesaReceipt: splitMpesaRef.trim().toUpperCase() || generateMpesaReceiptCode(),
      };
    }

    const newSale: Sale = {
      id: `sale-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      receiptNumber,
      items: cart.map((item) => ({
        productId: item.product.id,
        name: item.product.name,
        barcode: item.product.barcode,
        unitPrice: item.appliedPrice,
        isWholesale: item.isWholesaleRate,
        quantity: item.quantity,
        discountPercent: item.discountPercent || 0,
        subtotal: item.appliedPrice * item.quantity,
        vatClassification: item.product.vatClassification || 'A',
      })),
      subtotal,
      discountTotal: discountAmount,
      taxRate: config.taxRatePercent,
      taxTotal: taxAmount,
      grandTotal,
      paymentMethod,
      paymentReference: paymentReference.trim() || (paymentMethod === 'mpesa' ? mpesaDetails?.mpesaReceipt : undefined),
      mpesaDetails,
      splitPayment: splitPaymentDetails,
      amountTendered: paymentMethod === 'cash' ? (typeof amountTendered === 'number' ? amountTendered : grandTotal) : grandTotal,
      changeDue: paymentMethod === 'cash' ? changeDue : 0,
      customerName: selectedCustomer ? selectedCustomer.name : undefined,
      customerPhone: selectedCustomer ? selectedCustomer.phone : (mpesaPhone.trim() || undefined),
      creditCustomerId: paymentMethod === 'credit' ? selectedCustomer?.id : undefined,
      cashierName,
      timestamp: Date.now(),
      syncStatus: 'pending',
      etimsInfo,
      isWholesaleOrder: isWholesaleMode,
    };

    // Confetti
    try {
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.7 },
        colors: ['#10b981', '#059669', '#34d399', '#f59e0b'],
      });
    } catch {}

    playSuccessChime();
    onCompleteSale(newSale);

    // Reset register
    setCart([]);
    setPaymentReference('');
    setPastedSms('');
    setSmsFeedback(null);
    setStkStatus('idle');
  };

  return (
    <div className="flex-1 flex flex-col lg:flex-row overflow-hidden bg-slate-950 font-sans">
      {/* Mobile Top Segmented View Switcher (< lg) */}
      <div className="lg:hidden flex items-center justify-between p-2 bg-slate-900 border-b border-slate-800 flex-shrink-0">
        <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 w-full">
          <button
            onClick={() => setMobileTab('catalog')}
            className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-mono font-medium transition ${
              mobileTab === 'catalog'
                ? 'bg-slate-800 text-emerald-400 font-bold shadow-sm'
                : 'text-slate-400'
            }`}
          >
            Bidhaa ({products.length})
          </button>
          <button
            onClick={() => setMobileTab('checkout')}
            className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-mono font-medium flex items-center justify-center gap-1.5 transition ${
              mobileTab === 'checkout'
                ? 'bg-emerald-600 text-white font-bold shadow-sm'
                : 'text-slate-400'
            }`}
          >
            <span>Kikapu & Malipo</span>
            {cart.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-slate-950 text-emerald-300 text-[10px] font-black">
                {cart.reduce((s, i) => s + i.quantity, 0)}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* =========================================================================
          LEFT COLUMN: CATALOG & BARCODE SEARCH (JAPANESE MINIMALIST DESIGN)
      ========================================================================= */}
      <div className={`flex-1 flex-col min-w-0 border-r border-slate-800/80 bg-slate-950 ${mobileTab === 'catalog' ? 'flex' : 'hidden lg:flex'}`}>
        {/* Tranquil Top Toolbar */}
        <div className="p-3 sm:p-4 border-b border-slate-800/80 bg-slate-900/40 flex flex-col sm:flex-row gap-2.5 items-center justify-between">
          {/* Minimalist Search */}
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search product, barcode, or SKU..."
              className="w-full bg-slate-900/90 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500/80 transition font-sans"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-500 hover:text-slate-300"
              >
                Clear
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            {/* Minimalist Japanese Segmented Switch: Retail vs Wholesale */}
            <div className="flex items-center p-0.5 rounded-xl bg-slate-900 border border-slate-800 text-xs font-mono">
              <button
                onClick={() => setIsWholesaleMode(false)}
                className={`px-3 py-1.5 rounded-lg transition ${
                  !isWholesaleMode
                    ? 'bg-slate-800 text-emerald-400 font-bold shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Retail (Rejareja)
              </button>
              <button
                onClick={() => setIsWholesaleMode(true)}
                className={`px-3 py-1.5 rounded-lg transition ${
                  isWholesaleMode
                    ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Wholesale (Jumla)
              </button>
            </div>

            {/* Barcode Scanner Button */}
            <button
              onClick={() => setIsScannerOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700/80 text-emerald-400 text-xs font-mono font-semibold transition shrink-0"
              title="Open Barcode Camera Scanner"
            >
              <Barcode className="w-4 h-4" />
              <span className="hidden sm:inline">Scan Barcode</span>
            </button>
          </div>
        </div>

        {/* Minimalist Category Filter Bar */}
        <div className="px-3 sm:px-4 py-2 border-b border-slate-800/60 bg-slate-900/20 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1 rounded-lg text-xs font-mono whitespace-nowrap transition ${
                selectedCategory === cat
                  ? 'bg-emerald-500/15 text-emerald-300 font-semibold border border-emerald-500/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Duka Fast Keys: Loose unbarcoded everyday staples */}
        <div className="px-3 sm:px-4 py-1.5 border-b border-slate-800/60 bg-slate-900/40 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500 shrink-0 mr-1">
            Vitu Vya Haraka:
          </span>
          {products.filter(p => p.isQuickItem).map((qp) => (
            <button
              key={qp.id}
              onClick={() => addToCart(qp)}
              className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700/80 text-xs font-mono text-slate-200 hover:text-emerald-300 transition flex items-center gap-1.5 shrink-0 shadow-sm"
              title={`1-tap add ${qp.name}`}
            >
              <span>{qp.quickIcon || '📦'}</span>
              <span>{qp.name.split(' ')[0]}</span>
              <span className="text-emerald-400 font-bold">{config.currencySymbol}{qp.price.toFixed(0)}</span>
            </button>
          ))}
        </div>

        {/* Catalog Grid */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-2.5 sm:gap-3">
            {filteredProducts.map((p) => {
              const isOutOfStock = p.stock <= 0;
              const isLowStock = p.stock > 0 && p.stock <= p.minStockAlert;
              const inCart = cart.find((i) => i.product.id === p.id);
              const displayPrice = isWholesaleMode && p.wholesalePrice ? p.wholesalePrice : p.price;

              return (
                <button
                  key={p.id}
                  onClick={() => addToCart(p)}
                  disabled={isOutOfStock}
                  className={`text-left p-3.5 rounded-xl border transition flex flex-col justify-between group ${
                    isOutOfStock
                      ? 'bg-slate-900/30 border-slate-800/40 opacity-50 cursor-not-allowed'
                      : 'bg-slate-900/70 border-slate-800/80 hover:border-emerald-500/40 hover:bg-slate-900 hover:shadow-md'
                  }`}
                >
                  {/* Category and stock metadata as clean unboxed text */}
                  <div className="flex items-center justify-between text-[10px] text-slate-500 mb-2">
                    <span className="font-mono uppercase tracking-wider truncate mr-1">
                      {p.category}
                    </span>
                    <span className="shrink-0 font-mono">
                      {isOutOfStock ? (
                        <span className="text-red-400 font-medium">Out of Stock</span>
                      ) : isLowStock ? (
                        <span className="text-amber-400 font-medium">Low: {p.stock} {p.unit}</span>
                      ) : (
                        <span>{p.stock} {p.unit}</span>
                      )}
                    </span>
                  </div>

                  {/* Product Name & SKU */}
                  <div className="flex-1 my-1">
                    <p className="font-medium text-xs sm:text-sm text-slate-100 group-hover:text-emerald-300 line-clamp-2 leading-snug">
                      {p.name}
                    </p>
                    <p className="text-[10px] text-slate-500 font-mono mt-1">
                      {p.barcode}
                    </p>
                  </div>

                  {/* Price & Cart Indicator */}
                  <div className="flex items-baseline justify-between mt-3 pt-2 border-t border-slate-800/60">
                    <div className="font-mono tabular-nums">
                      <span className="text-[10px] text-slate-400 mr-1">{config.currencySymbol}</span>
                      <span className="text-sm sm:text-base font-bold text-white">
                        {displayPrice.toFixed(2)}
                      </span>
                      {isWholesaleMode && p.wholesalePrice && (
                        <span className="text-[9px] text-amber-400 block">Jumla</span>
                      )}
                    </div>

                    {inCart && (
                      <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-mono text-xs font-bold">
                        ×{inCart.quantity}
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Sticky Mobile Cart Floating Dock (appears on mobile when items are in cart) */}
        {cart.length > 0 && (
          <div className="lg:hidden p-3 bg-slate-900/95 backdrop-blur-md border-t border-slate-800 flex items-center justify-between gap-3 shadow-lg flex-shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center font-bold font-mono text-sm">
                {cart.reduce((s, i) => s + i.quantity, 0)}
              </div>
              <div>
                <p className="text-[10px] text-slate-400 uppercase font-mono tracking-wider">Kikapu (Cart)</p>
                <p className="text-sm font-bold text-emerald-400 font-mono">
                  {config.currencySymbol} {grandTotal.toLocaleString()}
                </p>
              </div>
            </div>
            <button
              onClick={() => setMobileTab('checkout')}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs font-mono shadow-md transition"
            >
              <span>Lipa (Checkout)</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* =========================================================================
          RIGHT COLUMN: REGISTER STATION & INSTANT CHECKOUT (THE JAPANESE MINIMALIST REGISTER)
      ========================================================================= */}
      <div className={`w-full lg:w-[420px] bg-slate-900/90 flex-col border-t lg:border-t-0 lg:border-l border-slate-800/80 h-full overflow-y-auto ${mobileTab === 'checkout' ? 'flex' : 'hidden lg:flex'}`}>
        {/* Mobile Header: Back to Products */}
        <div className="lg:hidden p-2.5 bg-slate-950 border-b border-slate-800 flex items-center justify-between flex-shrink-0">
          <button
            onClick={() => setMobileTab('catalog')}
            className="text-xs text-slate-300 hover:text-white flex items-center gap-1.5 font-mono"
          >
            <ArrowLeft className="w-4 h-4 text-emerald-400" />
            <span>Ongeza Bidhaa (Add Items)</span>
          </button>
          <span className="text-xs font-mono font-bold text-emerald-400">
            {config.currencySymbol} {grandTotal.toLocaleString()}
          </span>
        </div>

        {/* ----------------- 1. CUSTOMER IDENTIFICATION MODULE (PROMINENT AT TOP) ----------------- */}
        <div className="p-3 border-b border-slate-800/80 bg-slate-950/60 relative">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
              Customer Identification (Mteja)
            </span>
            <button
              onClick={() => setIsCustomerSelectorOpen(!isCustomerSelectorOpen)}
              className="text-xs text-emerald-400 hover:text-emerald-300 font-mono font-medium flex items-center gap-1"
            >
              <span>{selectedCustomer ? 'Change Customer' : 'Identify Customer'}</span>
              <ChevronDown className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Active Customer Card */}
          <div
            onClick={() => setIsCustomerSelectorOpen(true)}
            className="mt-2 p-2.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 cursor-pointer flex items-center justify-between transition"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shrink-0">
                <User className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-slate-100 truncate">
                  {selectedCustomer ? selectedCustomer.name : 'Walk-in Customer (Mteja wa kawaida)'}
                </p>
                <p className="text-[11px] text-slate-400 font-mono truncate">
                  {selectedCustomer ? (
                    <>
                      <span>{selectedCustomer.phone}</span>
                      {selectedCustomer.currentBalance > 0 && (
                        <span className="text-amber-400 ml-1.5">
                          • Debt: {config.currencySymbol}{selectedCustomer.currentBalance.toFixed(0)}
                        </span>
                      )}
                    </>
                  ) : (
                    'No account linked • Tap to identify or add'
                  )}
                </p>
              </div>
            </div>

            {selectedCustomer && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedCustomer(null);
                }}
                className="text-slate-500 hover:text-slate-300 p-1"
                title="Reset to Walk-in"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Customer Selection Drawer / Dropdown */}
          {isCustomerSelectorOpen && (
            <div className="absolute top-full left-2 right-2 mt-1 z-30 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden p-3 animate-in fade-in max-h-72 flex flex-col">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <span className="text-xs font-bold text-white">Select or Add Customer</span>
                <button
                  onClick={() => {
                    setIsCustomerSelectorOpen(false);
                    setIsCreatingCustomerInline(false);
                  }}
                  className="text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {!isCreatingCustomerInline ? (
                <>
                  <div className="my-2">
                    <input
                      type="text"
                      value={customerSearchQuery}
                      onChange={(e) => setCustomerSearchQuery(e.target.value)}
                      placeholder="Search customer name or phone..."
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 font-sans"
                    />
                  </div>

                  <div className="overflow-y-auto space-y-1 flex-1 pr-1">
                    {/* Default Walk-in Option */}
                    <button
                      onClick={() => {
                        setSelectedCustomer(null);
                        setIsCustomerSelectorOpen(false);
                      }}
                      className="w-full text-left p-2 rounded-lg bg-slate-950 hover:bg-slate-800 transition flex items-center justify-between text-xs"
                    >
                      <span className="text-slate-300">Walk-in Customer (Mteja wa kawaida)</span>
                      <span className="text-[10px] text-slate-500 font-mono">Default</span>
                    </button>

                    {/* Registered Customers */}
                    {filteredCustomers.map((cust) => (
                      <button
                        key={cust.id}
                        onClick={() => {
                          setSelectedCustomer(cust);
                          setIsCustomerSelectorOpen(false);
                        }}
                        className="w-full text-left p-2 rounded-lg bg-slate-950 hover:bg-slate-800 transition flex items-center justify-between text-xs group"
                      >
                        <div className="truncate mr-2">
                          <p className="font-medium text-white group-hover:text-emerald-400 truncate">
                            {cust.name}
                          </p>
                          <p className="text-[10px] text-slate-400 font-mono">{cust.phone}</p>
                        </div>
                        <div className="text-right text-[10px] font-mono shrink-0">
                          {cust.currentBalance > 0 ? (
                            <span className="text-amber-400 font-bold">
                              Deni: {config.currencySymbol}{cust.currentBalance.toFixed(0)}
                            </span>
                          ) : (
                            <span className="text-emerald-400">0 Debt</span>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>

                  {/* Add Customer Button */}
                  <div className="pt-2 border-t border-slate-800 mt-2">
                    <button
                      onClick={() => setIsCreatingCustomerInline(true)}
                      className="w-full py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-emerald-400 text-xs font-mono font-medium flex items-center justify-center gap-1.5 transition"
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                      <span>+ Register New Customer</span>
                    </button>
                  </div>
                </>
              ) : (
                /* Inline New Customer Creation Form */
                <form onSubmit={handleCreateCustomerInline} className="space-y-2 py-2">
                  <div>
                    <label className="text-[10px] text-slate-400 font-mono block">Customer Full Name *</label>
                    <input
                      type="text"
                      required
                      value={newCustName}
                      onChange={(e) => setNewCustName(e.target.value)}
                      placeholder="e.g. John Kamau"
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 font-mono block">Phone Number (Safaricom) *</label>
                    <input
                      type="tel"
                      required
                      value={newCustPhone}
                      onChange={(e) => setNewCustPhone(e.target.value)}
                      placeholder="0712345678"
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs font-mono text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div className="flex gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setIsCreatingCustomerInline(false)}
                      className="w-1/3 py-1.5 bg-slate-800 rounded-lg text-xs text-slate-300"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="flex-1 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-xs transition"
                    >
                      Save Customer
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}
        </div>

        {/* ----------------- 2. ACTIVE CART TICKET (ORDER LIST) ----------------- */}
        <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
          {cart.length === 0 ? (
            <div className="h-full min-h-[120px] flex flex-col items-center justify-center text-center p-4 text-slate-500">
              <ShoppingCart className="w-7 h-7 text-slate-700 mb-1" />
              <p className="text-xs text-slate-400 font-medium">Cart is Empty</p>
              <p className="text-[10px] text-slate-500 max-w-[200px] mt-0.5">
                Select items from the catalog or scan barcode to add.
              </p>
            </div>
          ) : (
            cart.map((item) => (
              <div
                key={item.product.id}
                className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800/80 flex items-center justify-between gap-2 transition"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-xs text-slate-200 truncate">
                    {item.product.name}
                  </p>
                  <p className="text-[11px] font-mono text-slate-400 tabular-nums">
                    {config.currencySymbol} {item.appliedPrice.toFixed(2)}
                    {item.isWholesaleRate && <span className="text-amber-400 ml-1 font-bold">Jumla</span>}
                  </p>
                </div>

                {/* Tactile Japanese Steppers */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => updateQuantity(item.product.id, -1)}
                    className="w-6 h-6 rounded-lg bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-300 transition"
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                  <span className="w-5 text-center font-mono font-bold text-xs text-white tabular-nums">
                    {item.quantity}
                  </span>
                  <button
                    onClick={() => updateQuantity(item.product.id, 1)}
                    disabled={item.quantity >= item.product.stock}
                    className="w-6 h-6 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-30 flex items-center justify-center text-slate-300 transition"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>

                {/* Line Total */}
                <div className="w-16 text-right font-mono font-bold text-xs text-white tabular-nums shrink-0">
                  {config.currencySymbol} {(item.appliedPrice * item.quantity).toFixed(2)}
                </div>

                <button
                  onClick={() => removeFromCart(item.product.id)}
                  className="text-slate-500 hover:text-red-400 p-1 transition"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))
          )}
        </div>

        {/* ----------------- 3. INTEGRATED PAYMENT STATION & TOTALS ----------------- */}
        <div className="p-3.5 border-t border-slate-800/90 bg-slate-950/90 space-y-3">
          {/* Subtotal & VAT Breakdown */}
          <div className="space-y-1 text-xs font-mono text-slate-400">
            <div className="flex justify-between">
              <span>Subtotal:</span>
              <span className="tabular-nums text-slate-300">{config.currencySymbol} {subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>KRA VAT 16% (Incl.):</span>
              <span className="tabular-nums text-slate-300">{config.currencySymbol} {taxAmount.toFixed(2)}</span>
            </div>
          </div>

          {/* Grand Total Header */}
          <div className="flex items-baseline justify-between pt-1 border-t border-slate-800/80">
            <span className="text-xs font-mono uppercase tracking-wider text-slate-400">
              Total Due (Jumla Kuu):
            </span>
            <span className="text-xl sm:text-2xl font-black font-mono text-emerald-400 tabular-nums">
              {config.currencySymbol} {grandTotal.toFixed(2)}
            </span>
          </div>

          {/* Payment Method Selector Tiles */}
          <div>
            <label className="block text-[10px] font-mono uppercase tracking-wider text-slate-400 mb-1.5">
              Payment Method (Njia ya Malipo)
            </label>
            <div className="grid grid-cols-4 gap-1.5">
              <button
                type="button"
                onClick={() => setPaymentMethod('mpesa')}
                className={`py-2 px-1 rounded-xl border text-center transition flex flex-col items-center gap-1 ${
                  paymentMethod === 'mpesa'
                    ? 'bg-emerald-950/80 border-emerald-500 text-emerald-300 font-bold shadow-sm'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span className="text-[10px] font-mono">M-PESA</span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('cash')}
                className={`py-2 px-1 rounded-xl border text-center transition flex flex-col items-center gap-1 ${
                  paymentMethod === 'cash'
                    ? 'bg-emerald-950/80 border-emerald-500 text-emerald-300 font-bold shadow-sm'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                <Banknote className="w-3.5 h-3.5" />
                <span className="text-[10px] font-mono">Cash</span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('split')}
                className={`py-2 px-1 rounded-xl border text-center transition flex flex-col items-center gap-1 ${
                  paymentMethod === 'split'
                    ? 'bg-emerald-950/80 border-emerald-500 text-emerald-300 font-bold shadow-sm'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                <Split className="w-3.5 h-3.5" />
                <span className="text-[10px] font-mono">Split</span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('credit')}
                className={`py-2 px-1 rounded-xl border text-center transition flex flex-col items-center gap-1 ${
                  paymentMethod === 'credit'
                    ? 'bg-amber-950/80 border-amber-500 text-amber-300 font-bold shadow-sm'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                <User className="w-3.5 h-3.5" />
                <span className="text-[10px] font-mono">Deni</span>
              </button>
            </div>
          </div>

          {/* ACTIVE PAYMENT METHOD CONTROLS INLINE */}
          {/* 1. M-PESA CONTROLS */}
          {paymentMethod === 'mpesa' && (
            <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-2 text-xs">
              <div className="flex justify-between items-center text-[11px] text-slate-400 font-mono">
                <span>Buy Goods Till: <strong className="text-emerald-400">{config.mpesaTillNumber}</strong></span>
                <div className="flex gap-1">
                  <button
                    onClick={() => setMpesaMode('stk_push')}
                    className={`px-2 py-0.5 rounded transition ${mpesaMode === 'stk_push' ? 'bg-slate-800 text-emerald-400 font-bold' : 'text-slate-500'}`}
                  >
                    STK Push
                  </button>
                  <button
                    onClick={() => setMpesaMode('sms_paste')}
                    className={`px-2 py-0.5 rounded transition ${mpesaMode === 'sms_paste' ? 'bg-slate-800 text-emerald-400 font-bold' : 'text-slate-500'}`}
                  >
                    SMS Paste
                  </button>
                </div>
              </div>

              {mpesaMode === 'stk_push' ? (
                <div className="space-y-1.5">
                  <div className="flex gap-1.5">
                    <input
                      type="tel"
                      value={mpesaPhone}
                      onChange={(e) => setMpesaPhone(e.target.value)}
                      placeholder="Customer Safaricom Phone (0712...)"
                      className="flex-1 bg-slate-950 border border-slate-700/80 rounded-lg px-2.5 py-1.5 text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                    />
                    <button
                      type="button"
                      onClick={handleTriggerStkPush}
                      disabled={stkStatus === 'sending' || stkStatus === 'prompt_sent' || cart.length === 0}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white rounded-lg text-xs font-bold transition flex items-center gap-1 shrink-0"
                    >
                      {stkStatus === 'sending' || stkStatus === 'prompt_sent' ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Smartphone className="w-3.5 h-3.5" />
                      )}
                      <span>STK Prompt</span>
                    </button>
                  </div>

                  {stkStatus === 'prompt_sent' && (
                    <div className="p-2 rounded-lg bg-emerald-950/60 border border-emerald-500/40 text-[11px] font-mono text-emerald-300 animate-pulse flex justify-between items-center">
                      <span>Prompt delivered. Customer entering PIN ({stkCountdown}s)...</span>
                      <RefreshCw className="w-3 h-3 animate-spin" />
                    </div>
                  )}

                  {stkStatus === 'success' && (
                    <div className="p-2 rounded-lg bg-emerald-950 border border-emerald-500/80 text-[11px] font-mono text-emerald-300 flex justify-between items-center">
                      <span className="flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        Ref: <strong className="text-white">{paymentReference}</strong>
                      </span>
                      <span>Confirmed</span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-1.5">
                  <textarea
                    rows={1}
                    value={pastedSms}
                    onChange={(e) => setPastedSms(e.target.value)}
                    placeholder="Paste Safaricom confirmation SMS here..."
                    className="w-full bg-slate-950 border border-slate-700/80 rounded-lg p-2 text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                  <button
                    type="button"
                    onClick={handleParseSms}
                    className="w-full py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-[11px] font-mono transition"
                  >
                    Verify SMS Code
                  </button>
                  {smsFeedback && (
                    <p className="text-[10px] font-mono text-emerald-400">{smsFeedback}</p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* 2. CASH CONTROLS */}
          {paymentMethod === 'cash' && (
            <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-2 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-[11px] font-mono text-slate-400">Cash Tendered:</span>
                <input
                  type="number"
                  value={amountTendered}
                  onChange={(e) => setAmountTendered(e.target.value === '' ? '' : parseFloat(e.target.value))}
                  className="w-32 bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1 text-sm font-mono font-bold text-white text-right focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Fast Banknote Buttons */}
              <div className="flex flex-wrap gap-1">
                {quickCashOptions.map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => setAmountTendered(opt)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-mono font-semibold transition ${
                      amountTendered === opt
                        ? 'bg-emerald-500 text-slate-950 font-bold'
                        : 'bg-slate-950 text-slate-300 hover:bg-slate-800 border border-slate-800'
                    }`}
                  >
                    {config.currencySymbol}{opt.toFixed(0)}
                  </button>
                ))}
              </div>

              {/* Change Due Highlight */}
              <div className="flex justify-between items-center pt-1 border-t border-slate-800 text-xs font-mono">
                <span className="text-slate-400">Change Due (Chenji):</span>
                <span className={`font-bold ${changeDue > 0 ? 'text-emerald-400' : 'text-slate-300'}`}>
                  {config.currencySymbol} {changeDue.toFixed(2)}
                </span>
              </div>
            </div>
          )}

          {/* 3. SPLIT CONTROLS */}
          {paymentMethod === 'split' && (
            <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-2 text-xs font-mono">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-[10px] text-slate-400 block mb-1">Cash Part</span>
                  <input
                    type="number"
                    value={splitCashAmount}
                    onChange={(e) => {
                      const c = parseFloat(e.target.value) || 0;
                      setSplitCashAmount(c);
                      setSplitMpesaAmount(Math.max(0, grandTotal - c));
                    }}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-xs text-white"
                  />
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block mb-1">M-Pesa Part</span>
                  <input
                    type="number"
                    value={splitMpesaAmount}
                    onChange={(e) => {
                      const m = parseFloat(e.target.value) || 0;
                      setSplitMpesaAmount(m);
                      setSplitCashAmount(Math.max(0, grandTotal - m));
                    }}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-xs text-emerald-400 font-bold"
                  />
                </div>
              </div>
              <input
                type="text"
                value={splitMpesaRef}
                onChange={(e) => setSplitMpesaRef(e.target.value.toUpperCase())}
                placeholder="M-Pesa Ref (e.g. SLD984X7K2)"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-[11px] text-white uppercase"
              />
            </div>
          )}

          {/* 4. STORE CREDIT (DENI) CONTROLS */}
          {paymentMethod === 'credit' && (
            <div className="p-3 rounded-xl bg-amber-950/40 border border-amber-500/40 space-y-1.5 text-xs font-mono">
              {selectedCustomer ? (
                <>
                  <div className="flex justify-between text-slate-300">
                    <span>Mteja:</span>
                    <span className="font-bold text-white">{selectedCustomer.name}</span>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span>Current Debt:</span>
                    <span className="text-amber-400 font-bold">{config.currencySymbol}{selectedCustomer.currentBalance.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-slate-300 pt-1 border-t border-amber-500/20">
                    <span>New Balance:</span>
                    <span className="text-emerald-400 font-bold">{config.currencySymbol}{(selectedCustomer.currentBalance + grandTotal).toFixed(2)}</span>
                  </div>
                </>
              ) : (
                <div className="text-center py-1">
                  <p className="text-amber-300 text-xs">No Customer Identified!</p>
                  <button
                    type="button"
                    onClick={() => setIsCustomerSelectorOpen(true)}
                    className="mt-1 text-xs text-white underline hover:text-amber-200"
                  >
                    Select Customer for Credit
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ----------------- 4. THE PRIMARY CHECKOUT BUTTON (DIRECT, UNMISSABLE) ----------------- */}
          <button
            type="button"
            onClick={handleCompletePayment}
            disabled={cart.length === 0}
            className="w-full py-3.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-30 disabled:cursor-not-allowed text-white font-bold text-sm sm:text-base flex items-center justify-between shadow-lg transition"
          >
            <div className="flex items-center gap-2">
              <Check className="w-5 h-5 text-white" />
              <span>Complete Payment (Lipa Sasa)</span>
            </div>
            <span className="font-mono tabular-nums text-emerald-100 font-black">
              {config.currencySymbol} {grandTotal.toFixed(2)}
            </span>
          </button>
        </div>
      </div>

      {/* Barcode Scanner Modal */}
      <BarcodeScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScan={handleBarcodeScanned}
        products={products}
        title="POS Barcode Scanner"
        subtitle="Aim camera at item or click a quick simulator barcode"
      />
    </div>
  );
};
