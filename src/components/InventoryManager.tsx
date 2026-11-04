import React, { useState, useMemo } from 'react';
import { 
  Package, AlertTriangle, Plus, Search, Barcode, Edit3, 
  Trash2, ArrowUpDown, Filter, Printer, Check, X, ShieldAlert, TrendingUp, Download, FileSpreadsheet
} from 'lucide-react';
import { Product, StoreConfig, StockAdjustment } from '../types/pos';
import { ProductBarcodeLabel } from './ProductBarcodeLabel';
import { BarcodeScannerModal } from './BarcodeScannerModal';
import { csvExportService } from '../services/csvExportService';

interface InventoryManagerProps {
  products: Product[];
  config: StoreConfig;
  onSaveProduct: (product: Product, isNew: boolean) => void;
  onDeleteProduct: (productId: string) => void;
  onAdjustStock: (adjustment: Omit<StockAdjustment, 'id' | 'timestamp' | 'syncStatus'>) => void;
  onOpenDataPipeline?: () => void;
}

export const InventoryManager: React.FC<InventoryManagerProps> = ({
  products,
  config,
  onSaveProduct,
  onDeleteProduct,
  onAdjustStock,
  onOpenDataPipeline,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isCsvDownloaded, setIsCsvDownloaded] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [stockStatusFilter, setStockStatusFilter] = useState<'all' | 'low' | 'out' | 'healthy'>('all');

  // Scanner modal for quick inventory barcode lookup
  const [isScannerOpen, setIsScannerOpen] = useState(false);

  // Modal states
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isNewProductModalOpen, setIsNewProductModalOpen] = useState(false);
  const [adjustingProduct, setAdjustingProduct] = useState<Product | null>(null);
  const [showPrintableLabelsModal, setShowPrintableLabelsModal] = useState(false);

  // Adjustment form state
  const [adjustmentDelta, setAdjustmentDelta] = useState<number>(10);
  const [adjustmentReason, setAdjustmentReason] = useState<StockAdjustment['reason']>('restock');
  const [adjustmentNote, setAdjustmentNote] = useState('');

  // Product edit form state
  const [formProduct, setFormProduct] = useState<Partial<Product>>({});

  // Summary Metrics
  const metrics = useMemo(() => {
    let totalItems = products.length;
    let totalStockUnits = 0;
    let lowStockCount = 0;
    let outOfStockCount = 0;
    let totalCostValue = 0;
    let totalRetailValue = 0;

    for (const p of products) {
      totalStockUnits += p.stock;
      totalCostValue += p.costPrice * p.stock;
      totalRetailValue += p.price * p.stock;
      if (p.stock <= 0) {
        outOfStockCount++;
      } else if (p.stock <= p.minStockAlert) {
        lowStockCount++;
      }
    }

    return {
      totalItems,
      totalStockUnits,
      lowStockCount,
      outOfStockCount,
      totalCostValue,
      totalRetailValue,
    };
  }, [products]);

  // Categories
  const categories = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => set.add(p.category));
    return ['All', ...Array.from(set)];
  }, [products]);

  // Filtered List
  const filteredProducts = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return products.filter((p) => {
      const matchesCat = categoryFilter === 'All' || p.category === categoryFilter;
      const matchesQuery =
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.barcode.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q);

      let matchesStock = true;
      if (stockStatusFilter === 'low') {
        matchesStock = p.stock > 0 && p.stock <= p.minStockAlert;
      } else if (stockStatusFilter === 'out') {
        matchesStock = p.stock <= 0;
      } else if (stockStatusFilter === 'healthy') {
        matchesStock = p.stock > p.minStockAlert;
      }

      return matchesCat && matchesQuery && matchesStock;
    });
  }, [products, categoryFilter, searchQuery, stockStatusFilter]);

  // Handle barcode scanned from inventory lookup
  const handleInventoryScan = (code: string) => {
    const p = products.find((item) => item.barcode === code || item.sku.toLowerCase() === code.toLowerCase());
    if (p) {
      setSearchQuery('');
      setCategoryFilter('All');
      setStockStatusFilter('all');
      setAdjustingProduct(p);
      setIsScannerOpen(false);
    } else {
      setSearchQuery(code);
      setIsScannerOpen(false);
    }
  };

  // Open modal to add product
  const handleOpenAddProduct = () => {
    // Generate clean barcode
    const randomBarcode = `600100${Math.floor(100000 + Math.random() * 900000)}`;
    setFormProduct({
      id: `prod-${Date.now()}`,
      barcode: randomBarcode,
      sku: `SOK-${Math.floor(100 + Math.random() * 900)}`,
      name: '',
      category: 'Beverages',
      price: 150.0,
      wholesalePrice: 135.0,
      wholesaleMinQty: 6,
      costPrice: 110.0,
      stock: 24,
      minStockAlert: 6,
      unit: 'pack',
      vatClassification: 'A',
    });
    setIsNewProductModalOpen(true);
  };

  // Open modal to edit existing product
  const handleOpenEditProduct = (p: Product) => {
    setFormProduct({ ...p });
    setEditingProduct(p);
  };

  const handleSaveProductSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formProduct.name || !formProduct.barcode) return;

    const saved: Product = {
      id: formProduct.id || `prod-${Date.now()}`,
      barcode: formProduct.barcode.trim(),
      sku: formProduct.sku?.trim() || `SKU-${Date.now().toString().slice(-4)}`,
      name: formProduct.name.trim(),
      category: formProduct.category || 'General',
      price: Number(formProduct.price) || 0,
      wholesalePrice: formProduct.wholesalePrice ? Number(formProduct.wholesalePrice) : undefined,
      wholesaleMinQty: formProduct.wholesaleMinQty ? Number(formProduct.wholesaleMinQty) : undefined,
      costPrice: Number(formProduct.costPrice) || 0,
      stock: Number(formProduct.stock) || 0,
      minStockAlert: Number(formProduct.minStockAlert) || 5,
      unit: formProduct.unit || 'pcs',
      vatClassification: formProduct.vatClassification || 'A',
      updatedAt: Date.now(),
      description: formProduct.description || '',
    };

    onSaveProduct(saved, isNewProductModalOpen);
    setIsNewProductModalOpen(false);
    setEditingProduct(null);
  };

  // Submit stock adjustment
  const handleStockAdjustmentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustingProduct) return;

    const previousStock = adjustingProduct.stock;
    const newStock = Math.max(0, previousStock + adjustmentDelta);

    onAdjustStock({
      productId: adjustingProduct.id,
      productName: adjustingProduct.name,
      previousStock,
      newStock,
      changeDelta: adjustmentDelta,
      reason: adjustmentReason,
      note: adjustmentNote.trim() || undefined,
    });

    setAdjustingProduct(null);
    setAdjustmentDelta(10);
    setAdjustmentNote('');
  };

  return (
    <div className="flex-1 flex flex-col bg-slate-950 overflow-y-auto">
      {/* ----------------- TOP METRICS CARDS ----------------- */}
      <div className="p-4 sm:p-5 border-b border-slate-800 bg-slate-900/60">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {/* Total Catalog Items */}
          <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800">
            <div className="flex items-center justify-between text-slate-400 text-xs">
              <span>Catalog SKUs</span>
              <Package className="w-4 h-4 text-emerald-400" />
            </div>
            <p className="text-xl sm:text-2xl font-bold font-mono text-white mt-1">
              {metrics.totalItems}
            </p>
            <p className="text-[10px] text-slate-500 font-mono mt-0.5">
              {metrics.totalStockUnits} total inventory units
            </p>
          </div>

          {/* Low Stock Warning Card */}
          <button
            onClick={() => setStockStatusFilter(stockStatusFilter === 'low' ? 'all' : 'low')}
            className={`p-3.5 rounded-xl border text-left transition ${
              stockStatusFilter === 'low'
                ? 'bg-amber-950/60 border-amber-500 text-amber-200'
                : 'bg-slate-900 border-slate-800 hover:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between text-xs text-amber-400">
              <span>Low Stock Alerts</span>
              <AlertTriangle className="w-4 h-4 text-amber-400 animate-pulse" />
            </div>
            <p className="text-xl sm:text-2xl font-bold font-mono text-amber-300 mt-1">
              {metrics.lowStockCount}
            </p>
            <p className="text-[10px] text-amber-400/80 font-mono mt-0.5">
              {metrics.outOfStockCount > 0 ? `${metrics.outOfStockCount} items out of stock` : 'Requires restocking'}
            </p>
          </button>

          {/* Inventory Valuation */}
          <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800">
            <div className="flex items-center justify-between text-slate-400 text-xs">
              <span>Retail Value</span>
              <TrendingUp className="w-4 h-4 text-emerald-400" />
            </div>
            <p className="text-xl sm:text-2xl font-bold font-mono text-white mt-1">
              {config.currencySymbol}{metrics.totalRetailValue.toFixed(0)}
            </p>
            <p className="text-[10px] text-slate-500 font-mono mt-0.5">
              Cost: {config.currencySymbol}{metrics.totalCostValue.toFixed(0)}
            </p>
          </div>

          {/* Quick Action Button: Add Product */}
          <div className="flex flex-col gap-1.5">
            <button
              onClick={handleOpenAddProduct}
              className="py-1.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs flex items-center justify-center gap-1.5 transition shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add New Product</span>
            </button>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setShowPrintableLabelsModal(true)}
                className="flex-1 py-1 px-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-medium flex items-center justify-center gap-1 transition border border-slate-700"
                title="Print Barcode Shelf Tags"
              >
                <Printer className="w-3 h-3 text-emerald-400" />
                <span>Barcodes</span>
              </button>

              <button
                onClick={() => {
                  csvExportService.exportInventoryToCsv(products, config.storeName);
                  setIsCsvDownloaded(true);
                  setTimeout(() => setIsCsvDownloaded(false), 2500);
                }}
                className="flex-1 py-1 px-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-medium flex items-center justify-center gap-1 transition border border-slate-700"
                title="Download Inventory Valuation CSV"
              >
                <Download className="w-3 h-3 text-emerald-400" />
                <span>{isCsvDownloaded ? 'Saved!' : 'CSV'}</span>
              </button>

              {onOpenDataPipeline && (
                <button
                  onClick={onOpenDataPipeline}
                  className="py-1 px-2 rounded-lg bg-emerald-950 hover:bg-emerald-900 text-emerald-300 text-[11px] font-medium flex items-center justify-center gap-1 transition border border-emerald-700/60"
                  title="Pipeline to Google Sheets"
                >
                  <FileSpreadsheet className="w-3 h-3 text-emerald-400" />
                  <span>Sheets</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ----------------- SEARCH & FILTERS BAR ----------------- */}
      <div className="p-3 sm:p-4 border-b border-slate-800 flex flex-col md:flex-row gap-2.5 items-stretch md:items-center justify-between bg-slate-900/30">
        <div className="flex flex-1 gap-2 items-center">
          {/* Search Bar */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name, SKU, or barcode..."
              className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-400 font-mono focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Barcode Scanner Quick Lookup */}
          <button
            onClick={() => setIsScannerOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-mono transition"
            title="Scan item to find in inventory"
          >
            <Barcode className="w-4 h-4 text-emerald-400" />
            <span className="hidden sm:inline">Scan to Find</span>
          </button>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
          {/* Category Dropdown */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 font-mono focus:outline-none focus:border-emerald-500"
          >
            {categories.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          {/* Stock Status Pills */}
          <div className="flex rounded-lg bg-slate-800 p-0.5 border border-slate-700 text-xs font-mono">
            <button
              onClick={() => setStockStatusFilter('all')}
              className={`px-2 py-1 rounded-md transition ${stockStatusFilter === 'all' ? 'bg-emerald-600 text-white font-bold' : 'text-slate-400 hover:text-white'}`}
            >
              All
            </button>
            <button
              onClick={() => setStockStatusFilter('low')}
              className={`px-2 py-1 rounded-md transition ${stockStatusFilter === 'low' ? 'bg-amber-600 text-white font-bold' : 'text-slate-400 hover:text-white'}`}
            >
              Low Stock
            </button>
            <button
              onClick={() => setStockStatusFilter('out')}
              className={`px-2 py-1 rounded-md transition ${stockStatusFilter === 'out' ? 'bg-red-600 text-white font-bold' : 'text-slate-400 hover:text-white'}`}
            >
              Out
            </button>
          </div>
        </div>
      </div>

      {/* ----------------- INVENTORY TABLE ----------------- */}
      <div className="flex-1 overflow-x-auto p-3 sm:p-4">
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
          <table className="w-full text-left text-xs font-mono border-collapse">
            <thead>
              <tr className="bg-slate-950/80 text-slate-400 border-b border-slate-800 uppercase tracking-wider text-[10px]">
                <th className="py-3 px-3 sm:px-4">Product & Barcode</th>
                <th className="py-3 px-3">Category</th>
                <th className="py-3 px-3">Cost</th>
                <th className="py-3 px-3">Price</th>
                <th className="py-3 px-3">Margin</th>
                <th className="py-3 px-3">Stock Level</th>
                <th className="py-3 px-3 sm:px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {filteredProducts.map((p) => {
                const margin = p.price > 0 ? (((p.price - p.costPrice) / p.price) * 100).toFixed(0) : '0';
                const isLow = p.stock > 0 && p.stock <= p.minStockAlert;
                const isOut = p.stock <= 0;

                return (
                  <tr key={p.id} className="hover:bg-slate-850/60 transition group">
                    {/* Name, SKU, Barcode */}
                    <td className="py-3 px-3 sm:px-4">
                      <div className="font-sans font-semibold text-slate-100 text-xs sm:text-sm">
                        {p.name}
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                        <span className="text-emerald-400 font-bold">{p.sku}</span>
                        <span>•</span>
                        <span>{p.barcode}</span>
                      </div>
                    </td>

                    {/* Category */}
                    <td className="py-3 px-3 text-slate-300">
                      <span className="px-2 py-0.5 rounded bg-slate-800 text-[11px] text-slate-300">
                        {p.category}
                      </span>
                    </td>

                    {/* Cost */}
                    <td className="py-3 px-3 text-slate-400">
                      {config.currencySymbol}{p.costPrice.toFixed(2)}
                    </td>

                    {/* Price */}
                    <td className="py-3 px-3 text-white font-bold">
                      {config.currencySymbol}{p.price.toFixed(2)}
                    </td>

                    {/* Margin */}
                    <td className="py-3 px-3 text-emerald-400">
                      +{margin}%
                    </td>

                    {/* Stock Level with Alert Badge */}
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2">
                        <span className={`font-bold text-xs ${
                          isOut ? 'text-red-400' : isLow ? 'text-amber-400' : 'text-slate-100'
                        }`}>
                          {p.stock} {p.unit}
                        </span>

                        {isOut ? (
                          <span className="px-1.5 py-0.5 rounded bg-red-950 text-red-400 border border-red-500/30 text-[9px] font-bold">
                            OUT
                          </span>
                        ) : isLow ? (
                          <span className="px-1.5 py-0.5 rounded bg-amber-950 text-amber-400 border border-amber-500/30 text-[9px] font-bold flex items-center gap-0.5">
                            <AlertTriangle className="w-2.5 h-2.5" />
                            Alert &le;{p.minStockAlert}
                          </span>
                        ) : (
                          <span className="text-slate-500 text-[10px]">
                            (&ge;{p.minStockAlert})
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-3 sm:px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* Quick Stock Adjustment */}
                        <button
                          onClick={() => setAdjustingProduct(p)}
                          className="px-2 py-1 rounded-lg bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-500/40 text-emerald-300 text-[11px] font-medium flex items-center gap-1 transition"
                          title="Restock or Adjust Inventory"
                        >
                          <ArrowUpDown className="w-3 h-3" />
                          <span>Adjust</span>
                        </button>

                        {/* Edit */}
                        <button
                          onClick={() => handleOpenEditProduct(p)}
                          className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                          title="Edit Product"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>

                        {/* Delete */}
                        <button
                          onClick={() => {
                            if (window.confirm(`Delete product "${p.name}"?`)) {
                              onDeleteProduct(p.id);
                            }
                          }}
                          className="p-1 rounded-lg bg-slate-800 hover:bg-red-950 hover:text-red-400 text-slate-400 transition"
                          title="Delete Product"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ----------------- QUICK STOCK ADJUSTMENT MODAL ----------------- */}
      {adjustingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
              <div className="flex items-center gap-2">
                <ArrowUpDown className="w-4 h-4 text-emerald-400" />
                <div>
                  <h3 className="font-bold text-white text-sm">Adjust Stock Level</h3>
                  <p className="text-xs text-slate-400">{adjustingProduct.name}</p>
                </div>
              </div>
              <button
                onClick={() => setAdjustingProduct(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleStockAdjustmentSubmit} className="p-5 space-y-4">
              {/* Current Stock Display */}
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex justify-between items-center font-mono">
                <span className="text-xs text-slate-400">Current In Stock:</span>
                <span className="text-base font-bold text-white">
                  {adjustingProduct.stock} {adjustingProduct.unit}
                </span>
              </div>

              {/* Adjustment Reason */}
              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-slate-400 mb-1">
                  Reason for Adjustment
                </label>
                <select
                  value={adjustmentReason}
                  onChange={(e) => setAdjustmentReason(e.target.value as any)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
                >
                  <option value="restock">📦 Restock / New Delivery (+)</option>
                  <option value="inventory_audit">📝 Physical Audit / Count Correction</option>
                  <option value="spoilage_damage">⚠️ Damaged / Expired / Spoilage (-)</option>
                  <option value="customer_return">🔄 Customer Return (+)</option>
                </select>
              </div>

              {/* Adjustment Delta (+/-) */}
              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-slate-400 mb-1">
                  Stock Change (+/- Units)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={adjustmentDelta}
                    onChange={(e) => setAdjustmentDelta(parseInt(e.target.value, 10) || 0)}
                    className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-base font-mono font-bold text-white focus:outline-none focus:border-emerald-500"
                  />
                  <div className="flex gap-1">
                    {[-5, +5, +10, +25, +50].map((d) => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => setAdjustmentDelta(d)}
                        className={`px-2 py-1.5 rounded-lg text-xs font-mono transition ${
                          adjustmentDelta === d ? 'bg-emerald-600 text-white font-bold' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                        }`}
                      >
                        {d > 0 ? `+${d}` : d}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex justify-between items-center text-xs font-mono mt-2 text-slate-400">
                  <span>Projected New Stock:</span>
                  <span className="font-bold text-emerald-400 text-sm">
                    {Math.max(0, adjustingProduct.stock + adjustmentDelta)} {adjustingProduct.unit}
                  </span>
                </div>
              </div>

              {/* Audit Note */}
              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-slate-400 mb-1">
                  Audit Reference Note (Optional)
                </label>
                <input
                  type="text"
                  value={adjustmentNote}
                  onChange={(e) => setAdjustmentNote(e.target.value)}
                  placeholder="e.g. Delivery PO #8942 or Shelf recount"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 font-mono focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setAdjustingProduct(null)}
                  className="w-1/3 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md transition"
                >
                  <Check className="w-4 h-4" />
                  <span>Update Stock & Sync</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ----------------- ADD / EDIT PRODUCT MODAL ----------------- */}
      {(isNewProductModalOpen || editingProduct) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden my-auto">
            <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
              <h3 className="font-bold text-white text-sm">
                {isNewProductModalOpen ? 'Add New Product' : 'Edit Product'}
              </h3>
              <button
                onClick={() => {
                  setIsNewProductModalOpen(false);
                  setEditingProduct(null);
                }}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveProductSubmit} className="p-5 space-y-3">
              {/* Product Name */}
              <div>
                <label className="block text-xs font-mono text-slate-400 mb-1">Product Name *</label>
                <input
                  type="text"
                  required
                  value={formProduct.name || ''}
                  onChange={(e) => setFormProduct({ ...formProduct, name: e.target.value })}
                  placeholder="e.g. Organic Rooibos Tea"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Barcode & Auto-generate */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-xs font-mono text-slate-400">Barcode *</label>
                  <button
                    type="button"
                    onClick={() => {
                      const rand = `600100${Math.floor(100000 + Math.random() * 900000)}`;
                      setFormProduct({ ...formProduct, barcode: rand });
                    }}
                    className="text-[10px] text-emerald-400 hover:underline font-mono"
                  >
                    Generate Barcode
                  </button>
                </div>
                <div className="relative">
                  <Barcode className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="text"
                    required
                    value={formProduct.barcode || ''}
                    onChange={(e) => setFormProduct({ ...formProduct, barcode: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* SKU & Category */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-mono text-slate-400 mb-1">SKU</label>
                  <input
                    type="text"
                    value={formProduct.sku || ''}
                    onChange={(e) => setFormProduct({ ...formProduct, sku: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono text-slate-400 mb-1">Category</label>
                  <input
                    type="text"
                    value={formProduct.category || ''}
                    onChange={(e) => setFormProduct({ ...formProduct, category: e.target.value })}
                    placeholder="Beverages"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Pricing: Cost vs Sell */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-mono text-slate-400 mb-1">
                    Cost Price ({config.currencySymbol})
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formProduct.costPrice ?? ''}
                    onChange={(e) => setFormProduct({ ...formProduct, costPrice: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono text-slate-400 mb-1">
                    Selling Price ({config.currencySymbol}) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={formProduct.price ?? ''}
                    onChange={(e) => setFormProduct({ ...formProduct, price: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono font-bold text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Stock Levels & Unit */}
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-xs font-mono text-slate-400 mb-1">Stock</label>
                  <input
                    type="number"
                    value={formProduct.stock ?? ''}
                    onChange={(e) => setFormProduct({ ...formProduct, stock: parseInt(e.target.value, 10) || 0 })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono text-slate-400 mb-1">Min Alert</label>
                  <input
                    type="number"
                    value={formProduct.minStockAlert ?? ''}
                    onChange={(e) => setFormProduct({ ...formProduct, minStockAlert: parseInt(e.target.value, 10) || 5 })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono text-slate-400 mb-1">Unit</label>
                  <select
                    value={formProduct.unit || 'pcs'}
                    onChange={(e) => setFormProduct({ ...formProduct, unit: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-2 py-2 text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
                  >
                    <option value="pcs">pcs</option>
                    <option value="pack">pack</option>
                    <option value="box">box</option>
                    <option value="bottle">bottle</option>
                    <option value="kg">kg</option>
                  </select>
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => {
                    setIsNewProductModalOpen(false);
                    setEditingProduct(null);
                  }}
                  className="w-1/3 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md transition"
                >
                  <Check className="w-4 h-4" />
                  <span>Save Product</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ----------------- PRINTABLE BARCODE SHELF TAGS MODAL ----------------- */}
      {showPrintableLabelsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden my-auto max-h-[90vh] flex flex-col">
            <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/90 print:hidden">
              <div className="flex items-center gap-2">
                <Printer className="w-4 h-4 text-emerald-400" />
                <h3 className="font-bold text-white text-sm">Printable Barcode Shelf Tags</h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-medium flex items-center gap-1.5 transition"
                >
                  <Printer className="w-3.5 h-3.5" />
                  Print Sheet
                </button>
                <button
                  onClick={() => setShowPrintableLabelsModal(false)}
                  className="text-slate-400 hover:text-white p-1"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto bg-slate-950/50 print:bg-white print:p-0">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 print:grid-cols-3 print:gap-2">
                {products.map((p) => (
                  <div
                    key={p.id}
                    className="p-3 bg-white text-black rounded-lg border border-gray-300 shadow-sm flex flex-col items-center justify-between text-center print:break-inside-avoid"
                  >
                    <div className="w-full">
                      <p className="font-bold text-xs truncate uppercase tracking-tight">{p.name}</p>
                      <div className="flex justify-between items-center text-[10px] text-gray-600 font-mono mt-0.5">
                        <span>{p.sku}</span>
                        <span className="font-extrabold text-black text-xs">
                          {config.currencySymbol}{p.price.toFixed(2)}
                        </span>
                      </div>
                    </div>

                    <div className="my-1 w-full flex justify-center">
                      <ProductBarcodeLabel
                        barcode={p.barcode}
                        height={32}
                        width={1.2}
                        fontSize={9}
                      />
                    </div>

                    <span className="text-[8px] font-mono text-gray-500 uppercase tracking-widest">
                      {config.storeName}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Barcode Scanner Modal for Quick Lookup */}
      <BarcodeScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScan={handleInventoryScan}
        products={products}
        title="Inventory Barcode Lookup"
        subtitle="Scan any item barcode to jump to stock adjustment"
      />
    </div>
  );
};
