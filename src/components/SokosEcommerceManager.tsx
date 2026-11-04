import React, { useState, useMemo } from 'react';
import { 
  Globe, ShoppingBag, RefreshCw, CheckCircle2, Clock, 
  MapPin, Phone, Truck, ArrowRight, ExternalLink, Sparkles, 
  Printer, Check, X, ShieldCheck, Tag, AlertCircle, Plus
} from 'lucide-react';
import { 
  Product, EcommerceOrder, SokosEcommerceConfig, StoreConfig 
} from '../types/pos';
import { playScanBeep, playSuccessChime } from '../services/sound';

interface SokosEcommerceManagerProps {
  products: Product[];
  orders: EcommerceOrder[];
  config: StoreConfig;
  ecommerceConfig: SokosEcommerceConfig;
  onUpdateEcommerceConfig: (cfg: SokosEcommerceConfig) => void;
  onUpdateOrderStatus: (orderId: string, status: EcommerceOrder['orderStatus']) => void;
  onToggleProductOnline: (productId: string, isOnline: boolean, onlinePrice?: number) => void;
  onSyncCatalogToSokos: () => Promise<{ success: boolean; bytesTransferred: number; message: string }>;
  onSimulateIncomingOrder: () => void;
}

export const SokosEcommerceManager: React.FC<SokosEcommerceManagerProps> = ({
  products,
  orders,
  config,
  ecommerceConfig,
  onUpdateEcommerceConfig,
  onUpdateOrderStatus,
  onToggleProductOnline,
  onSyncCatalogToSokos,
  onSimulateIncomingOrder,
}) => {
  const [activeTab, setActiveTab] = useState<'orders' | 'catalog' | 'settings'>('orders');
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);
  const [selectedOrderForSlip, setSelectedOrderForSlip] = useState<EcommerceOrder | null>(null);

  // Settings editing state
  const [editConfig, setEditConfig] = useState<SokosEcommerceConfig>({ ...ecommerceConfig });

  // Counts
  const newOrdersCount = orders.filter((o) => o.orderStatus === 'new').length;
  const inProgressCount = orders.filter((o) => o.orderStatus === 'accepted' || o.orderStatus === 'dispatched').length;
  const onlineProductsCount = products.filter((p) => p.publishedOnSokos).length;

  // Handle Catalog Sync Trigger
  const handleTriggerSync = async () => {
    setIsSyncing(true);
    setSyncFeedback(null);
    try {
      const res = await onSyncCatalogToSokos();
      playSuccessChime();
      setSyncFeedback(`Imefanikiwa! ${onlineProductsCount} bidhaa zimesasishwa mtandaoni kwenye Sokos.co.ke (${(res.bytesTransferred / 1024).toFixed(1)} KB delta).`);
    } catch (err: any) {
      setSyncFeedback('Hitilafu wakati wa kutuma mtandaoni. Jaribu tena.');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateEcommerceConfig(editConfig);
    playScanBeep();
    setSyncFeedback('Mipangilio ya Sokos.co.ke imehifadhiwa!');
  };

  return (
    <div className="flex-1 flex flex-col bg-slate-950 overflow-y-auto font-sans">
      {/* ----------------- TOP SOKOS.CO.KE STATUS HEADER ----------------- */}
      <div className="p-4 sm:p-5 border-b border-slate-800 bg-slate-900/70">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Storefront Link & Brand */}
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-950 to-slate-900 border border-emerald-500/40 text-emerald-400 flex items-center justify-center shrink-0 shadow-sm">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white tracking-tight">Sokos.co.ke E-Commerce Portal</h2>
                <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${
                  ecommerceConfig.isOnlineLive 
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' 
                    : 'bg-slate-800 text-slate-400 border border-slate-700'
                }`}>
                  {ecommerceConfig.isOnlineLive ? 'ONLINE STORE LIVE' : 'STORE CLOSED'}
                </span>
              </div>
              <p className="text-xs text-slate-400 font-mono mt-0.5 flex items-center gap-1.5">
                <span>Duka Link:</span>
                <a 
                  href={config.sokosPlatformUrl} 
                  target="_blank" 
                  rel="noreferrer" 
                  className="text-emerald-400 hover:underline flex items-center gap-0.5"
                >
                  <span>sokos.co.ke/{ecommerceConfig.storeSlug}</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </p>
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleTriggerSync}
              disabled={isSyncing}
              className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-mono text-xs font-bold flex items-center gap-1.5 transition shadow-sm"
              title="Push stock levels & prices to Sokos.co.ke"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? 'Inatuma...' : 'Sync Catalog to Sokos.co.ke'}</span>
            </button>

            <button
              onClick={onSimulateIncomingOrder}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-mono font-medium flex items-center gap-1.5 transition"
              title="Simulate customer placing order on Sokos.co.ke"
            >
              <Sparkles className="w-3.5 h-3.5 text-teal-400" />
              <span>+ Test Order (Nairobi)</span>
            </button>
          </div>
        </div>

        {/* Sync notification banner */}
        {syncFeedback && (
          <div className="mt-3 p-2.5 rounded-xl bg-emerald-950/80 border border-emerald-500/50 text-emerald-300 text-xs font-mono flex items-center justify-between animate-in fade-in">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{syncFeedback}</span>
            </div>
            <button onClick={() => setSyncFeedback(null)} className="text-emerald-400 hover:text-white">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Quick Tabs: Orders, Catalog, Settings */}
        <div className="flex items-center gap-2 mt-4 pt-3 border-t border-slate-800/80">
          <button
            onClick={() => setActiveTab('orders')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-mono font-semibold transition flex items-center gap-1.5 ${
              activeTab === 'orders'
                ? 'bg-emerald-600 text-white'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            <span>Online Orders</span>
            {newOrdersCount > 0 && (
              <span className="ml-1 px-1.5 py-0.2 rounded-full bg-amber-400 text-slate-950 text-[10px] font-black">
                {newOrdersCount} NEW
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('catalog')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-mono font-semibold transition flex items-center gap-1.5 ${
              activeTab === 'catalog'
                ? 'bg-emerald-600 text-white'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <Tag className="w-3.5 h-3.5" />
            <span>Sokos Catalog ({onlineProductsCount} Listed)</span>
          </button>

          <button
            onClick={() => setActiveTab('settings')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-mono font-semibold transition flex items-center gap-1.5 ${
              activeTab === 'settings'
                ? 'bg-emerald-600 text-white'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <span>Storefront Settings</span>
          </button>
        </div>
      </div>

      {/* ----------------- TAB 1: INCOMING SOKOS.CO.KE ORDERS ----------------- */}
      {activeTab === 'orders' && (
        <div className="p-4 sm:p-5 space-y-3">
          <div className="flex items-center justify-between text-xs font-mono text-slate-400">
            <span>Orders received from customers via Sokos.co.ke:</span>
            <span>{orders.length} total online order(s)</span>
          </div>

          {orders.length === 0 ? (
            <div className="p-12 text-center border border-dashed border-slate-800 rounded-2xl bg-slate-900/30 text-slate-400">
              <ShoppingBag className="w-10 h-10 text-slate-600 mx-auto mb-2" />
              <p className="text-sm font-semibold text-slate-300">Hakuna oda mpya mtandaoni</p>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                Customer orders placed on your Sokos.co.ke store link will instantly appear here with customer phone, estate, and M-Pesa status.
              </p>
              <button
                onClick={onSimulateIncomingOrder}
                className="mt-4 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition font-mono"
              >
                + Test Customer Order (Simulate)
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {orders.map((order) => {
                const dateStr = new Date(order.createdAt).toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' });
                const isNew = order.orderStatus === 'new';
                const isAccepted = order.orderStatus === 'accepted';
                const isDispatched = order.orderStatus === 'dispatched';
                const isDelivered = order.orderStatus === 'delivered';

                return (
                  <div
                    key={order.id}
                    className={`p-4 rounded-2xl border transition ${
                      isNew 
                        ? 'bg-slate-900/90 border-amber-500/50 shadow-[0_0_15px_rgba(245,158,11,0.1)]' 
                        : isDelivered 
                        ? 'bg-slate-900/40 border-slate-800 opacity-80'
                        : 'bg-slate-900/80 border-slate-800'
                    }`}
                  >
                    {/* Top Row: Order Number, Time, Status, Payment */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-slate-800 text-xs font-mono">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white text-sm">{order.orderNumber}</span>
                        <span className="text-slate-400">· {dateStr}</span>
                        {isNew && (
                          <span className="px-2 py-0.5 rounded-full bg-amber-500 text-slate-950 font-black text-[10px]">
                            NEW ORDER
                          </span>
                        )}
                        {isAccepted && (
                          <span className="px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-300 border border-teal-500/30 text-[10px] font-bold">
                            PACKING (INAPAKIWA)
                          </span>
                        )}
                        {isDispatched && (
                          <span className="px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-300 border border-sky-500/30 text-[10px] font-bold flex items-center gap-1">
                            <Truck className="w-3 h-3" />
                            BODA DISPATCHED
                          </span>
                        )}
                        {isDelivered && (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold">
                            DELIVERED
                          </span>
                        )}
                      </div>

                      {/* Payment Status */}
                      <div className="flex items-center gap-2">
                        {order.paymentStatus === 'paid_mpesa' ? (
                          <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-500/40 text-[11px] font-bold flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                            <span>M-PESA PAID ({order.mpesaCode})</span>
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded bg-slate-800 text-amber-300 border border-amber-500/40 text-[11px] font-bold">
                            PAY ON DELIVERY (COD)
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Middle: Customer Details & Items Ordered */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 py-3 text-xs">
                      {/* Customer & Location */}
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5 text-slate-200 font-semibold">
                          <span className="text-white">{order.customerName}</span>
                          <span className="text-slate-400 font-mono">({order.customerPhone})</span>
                        </div>
                        <div className="flex items-start gap-1.5 text-slate-400 font-mono">
                          <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                          <span>{order.deliveryAddress} · <strong className="text-slate-200">{order.estateOrArea}</strong></span>
                        </div>
                        {order.notes && (
                          <p className="text-[11px] text-slate-400 italic bg-slate-950/60 p-1.5 rounded border border-slate-800/80 mt-1">
                            Note: {order.notes}
                          </p>
                        )}
                      </div>

                      {/* Items List */}
                      <div className="bg-slate-950/50 rounded-xl p-2.5 border border-slate-800/80 space-y-1 font-mono text-[11px]">
                        <span className="text-slate-500 block uppercase text-[10px]">Package Items:</span>
                        {order.items.map((it, idx) => (
                          <div key={idx} className="flex justify-between text-slate-300">
                            <span>{it.quantity}x {it.name}</span>
                            <span className="text-white">{config.currencySymbol}{it.subtotal.toFixed(0)}</span>
                          </div>
                        ))}
                        <div className="pt-1 border-t border-slate-800 flex justify-between font-bold text-white text-xs">
                          <span className="text-slate-400 font-normal">Subtotal + Boda:</span>
                          <span className="text-emerald-400">{config.currencySymbol}{order.total.toFixed(2)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Bottom Action Controls */}
                    <div className="pt-2.5 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2">
                      <button
                        onClick={() => setSelectedOrderForSlip(order)}
                        className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono flex items-center gap-1.5 transition"
                      >
                        <Printer className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Print Boda Dispatch Slip</span>
                      </button>

                      <div className="flex items-center gap-2">
                        {isNew && (
                          <button
                            onClick={() => onUpdateOrderStatus(order.id, 'accepted')}
                            className="px-4 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs font-mono flex items-center gap-1 transition shadow-sm"
                          >
                            <Check className="w-4 h-4" />
                            <span>Accept & Pack (Deduct Stock)</span>
                          </button>
                        )}

                        {isAccepted && (
                          <button
                            onClick={() => onUpdateOrderStatus(order.id, 'dispatched')}
                            className="px-4 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs font-mono flex items-center gap-1 transition shadow-sm"
                          >
                            <Truck className="w-4 h-4" />
                            <span>Dispatch via Boda Rider</span>
                          </button>
                        )}

                        {isDispatched && (
                          <button
                            onClick={() => onUpdateOrderStatus(order.id, 'delivered')}
                            className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs font-mono flex items-center gap-1 transition shadow-sm"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                            <span>Mark Delivered (Imefika)</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ----------------- TAB 2: PRODUCT SYNC TO SOKOS.CO.KE ----------------- */}
      {activeTab === 'catalog' && (
        <div className="p-4 sm:p-5 space-y-3">
          <div className="flex items-center justify-between text-xs font-mono text-slate-400">
            <span>Manage products visible on your Sokos.co.ke online storefront:</span>
            <span>{onlineProductsCount} of {products.length} active online</span>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
            <table className="w-full text-left text-xs font-mono border-collapse">
              <thead>
                <tr className="bg-slate-950 text-slate-400 border-b border-slate-800 uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-4">Live on Sokos.co.ke</th>
                  <th className="py-3 px-3">Product Name</th>
                  <th className="py-3 px-3">Duka In-Store Price</th>
                  <th className="py-3 px-3">Online Price (KSh)</th>
                  <th className="py-3 px-3">Live Stock</th>
                  <th className="py-3 px-4 text-right">Online Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {products.map((p) => {
                  const isOnline = Boolean(p.publishedOnSokos);

                  return (
                    <tr key={p.id} className="hover:bg-slate-850/60 transition">
                      {/* Checkbox toggle */}
                      <td className="py-3 px-4">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={isOnline}
                            onChange={(e) => onToggleProductOnline(p.id, e.target.checked, p.onlinePrice || p.price)}
                            className="w-4 h-4 rounded text-emerald-600 focus:ring-0"
                          />
                          <span className={`text-[11px] font-bold ${isOnline ? 'text-emerald-400' : 'text-slate-500'}`}>
                            {isOnline ? 'Published' : 'Hidden'}
                          </span>
                        </label>
                      </td>

                      {/* Product Name */}
                      <td className="py-3 px-3">
                        <span className="font-sans font-semibold text-slate-100 text-xs sm:text-sm block">
                          {p.name}
                        </span>
                        <span className="text-[10px] text-slate-500">{p.sku} · {p.barcode}</span>
                      </td>

                      {/* Duka Price */}
                      <td className="py-3 px-3 text-slate-300">
                        {config.currencySymbol}{p.price.toFixed(2)}
                      </td>

                      {/* Online Price */}
                      <td className="py-3 px-3">
                        <input
                          type="number"
                          value={p.onlinePrice ?? p.price}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value) || p.price;
                            onToggleProductOnline(p.id, isOnline, val);
                          }}
                          className="w-24 bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
                        />
                      </td>

                      {/* Live Stock */}
                      <td className="py-3 px-3">
                        <span className={`font-bold ${p.stock <= p.minStockAlert ? 'text-amber-400' : 'text-slate-200'}`}>
                          {p.stock} {p.unit}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4 text-right">
                        {isOnline ? (
                          <span className="text-[10px] text-emerald-400 font-bold bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded">
                            Active Online
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-500">In-Store Only</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ----------------- TAB 3: SOKOS.CO.KE SETTINGS ----------------- */}
      {activeTab === 'settings' && (
        <div className="p-4 sm:p-5 max-w-xl">
          <form onSubmit={handleSaveSettings} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
            <h3 className="font-bold text-white text-sm pb-2 border-b border-slate-800">
              Sokos.co.ke Storefront Configuration
            </h3>

            {/* Live Store Toggle */}
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-white">Accept Online Orders</p>
                <p className="text-[10px] text-slate-400">Toggle whether your shop is visible and open for deliveries on Sokos.co.ke</p>
              </div>
              <input
                type="checkbox"
                checked={editConfig.isOnlineLive}
                onChange={(e) => setEditConfig({ ...editConfig, isOnlineLive: e.target.checked })}
                className="w-5 h-5 rounded text-emerald-600 focus:ring-0 cursor-pointer"
              />
            </div>

            {/* Store URL Slug */}
            <div>
              <label className="text-xs font-mono text-slate-400 block mb-1">Store Slug (URL)</label>
              <div className="flex items-center bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono text-white">
                <span className="text-slate-500">sokos.co.ke/</span>
                <input
                  type="text"
                  value={editConfig.storeSlug}
                  onChange={(e) => setEditConfig({ ...editConfig, storeSlug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })}
                  className="flex-1 bg-transparent text-emerald-400 font-bold focus:outline-none"
                />
              </div>
            </div>

            {/* Estate Coverage */}
            <div>
              <label className="text-xs font-mono text-slate-400 block mb-1">Estate & Area Delivery Coverage</label>
              <input
                type="text"
                value={editConfig.estateCoverage}
                onChange={(e) => setEditConfig({ ...editConfig, estateCoverage: e.target.value })}
                placeholder="e.g. South B, South C, Nairobi West, Kilimani"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-mono text-slate-400 block mb-1">Boda Delivery Fee (KSh)</label>
                <input
                  type="number"
                  value={editConfig.deliveryFeeKes}
                  onChange={(e) => setEditConfig({ ...editConfig, deliveryFeeKes: parseFloat(e.target.value) || 0 })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-emerald-500 font-bold"
                />
              </div>

              <div>
                <label className="text-xs font-mono text-slate-400 block mb-1">Est. Delivery Time (Mins)</label>
                <input
                  type="number"
                  value={editConfig.estimatedMinutes}
                  onChange={(e) => setEditConfig({ ...editConfig, estimatedMinutes: parseInt(e.target.value, 10) || 30 })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-mono text-slate-400 block mb-1">Minimum Order Amount (KSh)</label>
              <input
                type="number"
                value={editConfig.minOrderKes}
                onChange={(e) => setEditConfig({ ...editConfig, minOrderKes: parseFloat(e.target.value) || 200 })}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
              />
            </div>

            <button
              type="submit"
              className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs font-mono transition"
            >
              Hifadhi Mipangilio ya Sokos.co.ke
            </button>
          </form>
        </div>
      )}

      {/* ----------------- BODA BODA DISPATCH SLIP MODAL (PRINTABLE) ----------------- */}
      {selectedOrderForSlip && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden my-auto">
            <div className="px-5 py-3 border-b border-slate-800 flex items-center justify-between bg-slate-900/90 print:hidden">
              <span className="text-xs font-bold text-white">Boda Delivery Dispatch Slip</span>
              <button onClick={() => setSelectedOrderForSlip(null)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto bg-slate-950/50">
              <div
                id="thermal-receipt-print-area"
                className="bg-white text-black p-4 rounded-lg font-mono text-xs max-w-[300px] mx-auto border border-dashed border-gray-400"
              >
                <div className="text-center pb-2 border-b border-black">
                  <h3 className="font-extrabold text-sm">{config.storeName.toUpperCase()}</h3>
                  <p className="text-[10px] text-gray-700">SOKOS.CO.KE DISPATCH SLIP</p>
                  <p className="text-[10px] text-gray-600">ORDER NO: {selectedOrderForSlip.orderNumber}</p>
                </div>

                <div className="py-2 border-b border-dashed border-gray-400 space-y-1 text-[11px]">
                  <div><strong>MTEJA:</strong> {selectedOrderForSlip.customerName}</div>
                  <div><strong>SIMU:</strong> {selectedOrderForSlip.customerPhone}</div>
                  <div><strong>MAHALI:</strong> {selectedOrderForSlip.estateOrArea}</div>
                  <div><strong>ADDRESS:</strong> {selectedOrderForSlip.deliveryAddress}</div>
                  {selectedOrderForSlip.notes && (
                    <div><strong>NOTE:</strong> {selectedOrderForSlip.notes}</div>
                  )}
                </div>

                <div className="py-2 border-b border-black text-[11px]">
                  <div className="font-bold text-[10px] pb-1 uppercase">PACKAGE ITEMS:</div>
                  {selectedOrderForSlip.items.map((it, idx) => (
                    <div key={idx} className="flex justify-between">
                      <span>{it.quantity}x {it.name}</span>
                      <span>KSh {it.subtotal.toFixed(0)}</span>
                    </div>
                  ))}
                  <div className="pt-1 mt-1 border-t border-gray-300 flex justify-between font-bold">
                    <span>TOTAL ORDER:</span>
                    <span>KSh {selectedOrderForSlip.total.toFixed(2)}</span>
                  </div>
                </div>

                <div className="py-2 text-[10px] space-y-0.5 border-b border-dashed border-gray-400">
                  <div><strong>PAYMENT:</strong> {selectedOrderForSlip.paymentStatus === 'paid_mpesa' ? `PAID VIA M-PESA (${selectedOrderForSlip.mpesaCode})` : 'CASH ON DELIVERY (COLLECT FROM CUSTOMER)'}</div>
                </div>

                <div className="pt-2 text-center text-[9px] text-gray-500">
                  Rider Signature: __________________
                </div>
              </div>
            </div>

            <div className="px-5 py-3 border-t border-slate-800 bg-slate-900/90 flex justify-between print:hidden">
              <button
                onClick={() => setSelectedOrderForSlip(null)}
                className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 text-xs"
              >
                Close
              </button>
              <button
                onClick={() => window.print()}
                className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5"
              >
                <Printer className="w-3.5 h-3.5" />
                Print Slip
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
