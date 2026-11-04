import express from 'express';
import type { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const isProduction = process.env.NODE_ENV === 'production';

// Support standard JSON parsing with lean limits
app.use(express.json({ limit: '1mb' }));

// Initial seed products for Sokos POS (Kenyan SME Retail & Grocery store with real barcodes)
const SEED_PRODUCTS = [
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
    vatClassification: 'C', // Zero-rated basic food
    updatedAt: Date.now() - 3600000,
    description: 'Fortified premium maize flour for ugali.',
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
    updatedAt: Date.now() - 3600000,
    description: 'Fresh nutritious daily dairy milk.',
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
    vatClassification: 'A', // 16% standard VAT
    updatedAt: Date.now() - 3600000,
    description: 'Rich highland black tea with full aroma.',
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
    updatedAt: Date.now() - 3600000,
    description: 'Aromatic aged long grain premium rice.',
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
    updatedAt: Date.now() - 3600000,
    description: 'Cholesterol-free refined vegetable cooking oil.',
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
    updatedAt: Date.now() - 3600000,
    description: 'Long-lasting powerful stain-fighting bar soap.',
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
    updatedAt: Date.now() - 3600000,
    description: 'Hand-picked Kenyan AA gourmet washed Arabica beans.',
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
    updatedAt: Date.now() - 3600000,
    description: 'Refreshing pure mineral bottled spring water.',
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
    updatedAt: Date.now() - 3600000,
    description: 'Locally grown premium sweet white sugar.',
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
    updatedAt: Date.now() - 3600000,
    description: 'Reliable power for remotes, torches, and radios.',
    isPopular: false
  }
];

// Server state store
let inventory = JSON.parse(JSON.stringify(SEED_PRODUCTS));
let salesHistory: any[] = [];
let adjustmentsHistory: any[] = [];
let serverStartTime = Date.now();

// -------------------------------------------------------------
// API Endpoints
// -------------------------------------------------------------

// Health check with server timestamp
app.get('/api/health', (req: Request, res: Response) => {
  res.json({
    status: 'online',
    serverTime: Date.now(),
    uptimeSeconds: Math.floor((Date.now() - serverStartTime) / 1000),
    inventoryCount: inventory.length,
    salesCount: salesHistory.length,
  });
});

// Full or Delta Inventory Pull
// If ?since=timestamp is provided, only return products updated after that time!
app.get('/api/inventory', (req: Request, res: Response) => {
  const since = req.query.since ? parseInt(req.query.since as string, 10) : 0;
  
  if (since > 0) {
    const delta = inventory.filter((item: any) => item.updatedAt > since);
    const fullPayloadSize = JSON.stringify(inventory).length;
    const deltaPayloadSize = JSON.stringify(delta).length;
    
    return res.json({
      isDelta: true,
      since,
      serverTime: Date.now(),
      products: delta,
      totalCatalogSize: inventory.length,
      bytesTransferred: deltaPayloadSize,
      bytesSaved: Math.max(0, fullPayloadSize - deltaPayloadSize),
    });
  }

  res.json({
    isDelta: false,
    serverTime: Date.now(),
    products: inventory,
    totalCatalogSize: inventory.length,
  });
});

// Batch Synchronization Endpoint (Data Conscious Delta Sync)
// Accepts queued offline sales, stock adjustments, and product upserts
app.post('/api/sync', (req: Request, res: Response) => {
  const { actions = [], clientLastSync = 0 } = req.body;
  const processedActionIds: string[] = [];
  const modifiedProductIds = new Set<string>();

  for (const action of actions) {
    try {
      if (action.type === 'SALE_CREATE') {
        const sale = action.payload;
        // Verify not duplicate
        if (!salesHistory.some(s => s.id === sale.id)) {
          salesHistory.unshift({
            ...sale,
            syncStatus: 'synced',
            syncedAt: Date.now(),
          });

          // Deduct stock for each line item on server
          if (Array.isArray(sale.items)) {
            for (const line of sale.items) {
              const product = inventory.find((p: any) => p.id === line.productId || p.barcode === line.barcode);
              if (product) {
                const prev = product.stock;
                product.stock = Math.max(0, product.stock - (line.quantity || 1));
                product.updatedAt = Date.now();
                modifiedProductIds.add(product.id);

                adjustmentsHistory.unshift({
                  id: `adj-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
                  productId: product.id,
                  productName: product.name,
                  previousStock: prev,
                  newStock: product.stock,
                  changeDelta: -(line.quantity || 1),
                  reason: 'sale',
                  timestamp: Date.now(),
                  syncStatus: 'synced',
                });
              }
            }
          }
        }
        processedActionIds.push(action.id);
      } else if (action.type === 'STOCK_ADJUST') {
        const adj = action.payload;
        const product = inventory.find((p: any) => p.id === adj.productId);
        if (product) {
          product.stock = adj.newStock;
          product.updatedAt = Date.now();
          modifiedProductIds.add(product.id);
          adjustmentsHistory.unshift({
            ...adj,
            syncStatus: 'synced',
            timestamp: Date.now(),
          });
        }
        processedActionIds.push(action.id);
      } else if (action.type === 'PRODUCT_UPSERT') {
        const pData = action.payload;
        const existingIdx = inventory.findIndex((p: any) => p.id === pData.id || (pData.barcode && p.barcode === pData.barcode));
        const updatedProduct = {
          ...pData,
          updatedAt: Date.now(),
        };

        if (existingIdx >= 0) {
          inventory[existingIdx] = updatedProduct;
        } else {
          inventory.push(updatedProduct);
        }
        modifiedProductIds.add(updatedProduct.id);
        processedActionIds.push(action.id);
      } else if (action.type === 'PRODUCT_DELETE') {
        const pId = action.payload?.id;
        inventory = inventory.filter((p: any) => p.id !== pId);
        processedActionIds.push(action.id);
      }
    } catch (err) {
      console.error('Error processing sync action:', action, err);
    }
  }

  // Return server timestamp and any products that changed since client's last sync
  const serverTime = Date.now();
  const deltaProducts = inventory.filter((p: any) => p.updatedAt > clientLastSync);

  res.json({
    success: true,
    processedActionIds,
    serverTimestamp: serverTime,
    deltaProducts,
    totalSalesOnServer: salesHistory.length,
    totalProductsOnServer: inventory.length,
  });
});

// Single Direct Sale Capture
app.post('/api/sales', (req: Request, res: Response) => {
  const sale = req.body;
  if (!sale || !sale.id) {
    return res.status(400).json({ error: 'Invalid sale object' });
  }

  // Add to sales
  salesHistory.unshift({
    ...sale,
    syncStatus: 'synced',
    syncedAt: Date.now(),
  });

  // Deduct inventory
  if (Array.isArray(sale.items)) {
    for (const item of sale.items) {
      const prod = inventory.find((p: any) => p.id === item.productId || p.barcode === item.barcode);
      if (prod) {
        prod.stock = Math.max(0, prod.stock - item.quantity);
        prod.updatedAt = Date.now();
      }
    }
  }

  res.json({ success: true, sale, serverTime: Date.now() });
});

// Get Sales History
app.get('/api/sales', (req: Request, res: Response) => {
  const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;
  res.json({
    sales: salesHistory.slice(0, limit),
    totalCount: salesHistory.length,
  });
});

// Sokos.co.ke E-Commerce Endpoints
let ecommerceOrders: any[] = [
  {
    id: 'sokos-ord-101',
    orderNumber: 'SK-2026-9042',
    customerName: 'Amina Wanjiku',
    customerPhone: '+254 722 411 902',
    deliveryAddress: 'Green Valley Court, Hse 4B, South B, Nairobi',
    estateOrArea: 'South B, Nairobi',
    items: [
      { productId: 'prod-001', name: 'Dola Premium Maize Meal Flour (2kg)', unitPrice: 195.0, quantity: 2, subtotal: 390.0 },
      { productId: 'prod-002', name: 'Fresha Whole Pasteurized Milk (500ml Pouch)', unitPrice: 65.0, quantity: 3, subtotal: 195.0 },
      { productId: 'prod-quick-01', name: 'Mayai Safi ya Kienyeji (Fresh Farm Egg)', unitPrice: 22.0, quantity: 6, subtotal: 132.0 },
    ],
    subtotal: 717.0,
    deliveryFee: 150.0,
    total: 867.0,
    paymentMethod: 'mpesa',
    paymentStatus: 'paid_mpesa',
    mpesaCode: 'SLG492KX12',
    orderStatus: 'new',
    createdAt: Date.now() - 18 * 60000,
    notes: 'Please call boda rider when reaching Golden Gate gate.',
  },
  {
    id: 'sokos-ord-102',
    orderNumber: 'SK-2026-9043',
    customerName: 'Kevin Otieno',
    customerPhone: '+254 733 891 024',
    deliveryAddress: 'Wood Avenue Towers, Apt 7C, Kilimani',
    estateOrArea: 'Kilimani, Nairobi',
    items: [
      { productId: 'prod-004', name: 'Daawat Pishori Pure Basmati Rice (2kg)', unitPrice: 520.0, quantity: 1, subtotal: 520.0 },
      { productId: 'prod-005', name: 'Rina Fortified Pure Vegetable Cooking Oil (1L)', unitPrice: 330.0, quantity: 1, subtotal: 330.0 },
    ],
    subtotal: 850.0,
    deliveryFee: 180.0,
    total: 1030.0,
    paymentMethod: 'cash_on_delivery',
    paymentStatus: 'pending_cod',
    orderStatus: 'accepted',
    createdAt: Date.now() - 45 * 60000,
    notes: 'Customer will pay boda with M-Pesa on arrival.',
  }
];

let dukaExpenses: any[] = [
  {
    id: 'exp-001',
    description: 'Boda Delivery for Online Orders (Westlands & South B)',
    category: 'boda_transport',
    amount: 300,
    paidVia: 'cash',
    recordedBy: 'Cashier 01 (Nairobi)',
    receiptOrRef: 'Rider Juma 0722***',
    timestamp: Date.now() - 2 * 3600000,
  },
  {
    id: 'exp-002',
    description: 'Kanjo Market Daily Trading Stamp / Cess',
    category: 'kanjo_license',
    amount: 100,
    paidVia: 'cash',
    recordedBy: 'Cashier 01 (Nairobi)',
    receiptOrRef: 'NCC-TICKET-8921',
    timestamp: Date.now() - 5 * 3600000,
  }
];

// Get E-Commerce Orders
app.get('/api/ecommerce/orders', (req: Request, res: Response) => {
  res.json({
    orders: ecommerceOrders,
    count: ecommerceOrders.length,
    newCount: ecommerceOrders.filter(o => o.orderStatus === 'new').length,
  });
});

// Update E-Commerce Order Status
app.patch('/api/ecommerce/orders/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const { status } = req.body;
  const order = ecommerceOrders.find(o => o.id === id);
  if (!order) {
    return res.status(404).json({ error: 'Order not found' });
  }

  const prevStatus = order.orderStatus;
  order.orderStatus = status;

  // If newly accepted, deduct physical inventory
  if (prevStatus === 'new' && (status === 'accepted' || status === 'dispatched')) {
    for (const item of order.items) {
      const prod = inventory.find((p: any) => p.id === item.productId);
      if (prod) {
        prod.stock = Math.max(0, prod.stock - item.quantity);
        prod.updatedAt = Date.now();
      }
    }
  }

  res.json({ success: true, order });
});

// Sync Catalog To Sokos.co.ke
app.post('/api/ecommerce/sync-catalog', (req: Request, res: Response) => {
  const { catalog = [], storeSlug = 'biashara-mart' } = req.body;
  const payloadSize = JSON.stringify(catalog).length;
  
  // Update inventory items with published flags and online prices
  for (const item of catalog) {
    const existing = inventory.find((p: any) => p.id === item.id);
    if (existing) {
      existing.publishedOnSokos = item.publishedOnSokos;
      existing.onlinePrice = item.onlinePrice;
      existing.onlineDescription = item.onlineDescription;
      existing.updatedAt = Date.now();
    }
  }

  res.json({
    success: true,
    message: `Catalog successfully synced to sokos.co.ke/${storeSlug}`,
    publishedCount: catalog.filter((c: any) => c.publishedOnSokos).length,
    bytesTransferred: payloadSize,
    timestamp: Date.now(),
  });
});

// Simulate Incoming Order from Sokos.co.ke
app.post('/api/ecommerce/simulate-order', (req: Request, res: Response) => {
  const orderId = `sokos-ord-${Date.now()}`;
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  const areas = [
    { area: 'Kilimani, Dennis Pritt Rd', fee: 180 },
    { area: 'South B, Sana Sana', fee: 150 },
    { area: 'Westlands, Mpaka Rd', fee: 200 },
    { area: 'Kileleshwa, Kandara Rd', fee: 180 },
    { area: 'Langata, Dam Estate', fee: 220 },
  ];
  const chosenArea = areas[Math.floor(Math.random() * areas.length)];
  const names = ['Faith Muthoni', 'Brian Kiprono', 'Winnie Akinyi', 'David Mwangi', 'Sarah Njeri'];
  const chosenName = names[Math.floor(Math.random() * names.length)];
  
  // Pick 2 published products
  const publishedProds = inventory.filter((p: any) => p.publishedOnSokos);
  const picked = publishedProds.length >= 2 ? [publishedProds[0], publishedProds[1]] : inventory.slice(0, 2);

  const items = picked.map((p: any) => ({
    productId: p.id,
    name: p.name,
    unitPrice: p.onlinePrice || p.price,
    quantity: Math.floor(Math.random() * 2) + 1,
    subtotal: (p.onlinePrice || p.price) * (Math.floor(Math.random() * 2) + 1),
  }));

  const subtotal = items.reduce((sum: number, i: any) => sum + i.subtotal, 0);
  const newOrder = {
    id: orderId,
    orderNumber: `SK-2026-${randomSuffix}`,
    customerName: chosenName,
    customerPhone: `+254 7${Math.floor(10000000 + Math.random() * 90000000)}`,
    deliveryAddress: `${chosenArea.area}, Apt ${Math.floor(Math.random() * 20) + 1}`,
    estateOrArea: chosenArea.area,
    items,
    subtotal,
    deliveryFee: chosenArea.fee,
    total: subtotal + chosenArea.fee,
    paymentMethod: 'mpesa',
    paymentStatus: 'paid_mpesa',
    mpesaCode: `SLK${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
    orderStatus: 'new',
    createdAt: Date.now(),
    notes: 'Order placed via Sokos.co.ke mobile web app.',
  };

  ecommerceOrders.unshift(newOrder);
  res.json({ success: true, order: newOrder });
});

// Duka Expenses Endpoints
app.get('/api/duka-expenses', (req: Request, res: Response) => {
  res.json({ expenses: dukaExpenses, total: dukaExpenses.reduce((s, e) => s + e.amount, 0) });
});

app.post('/api/duka-expenses', (req: Request, res: Response) => {
  const expense = req.body;
  if (!expense || !expense.description || !expense.amount) {
    return res.status(400).json({ error: 'Invalid expense object' });
  }
  dukaExpenses.unshift(expense);
  res.json({ success: true, expense });
});

app.delete('/api/duka-expenses/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  dukaExpenses = dukaExpenses.filter(e => e.id !== id);
  res.json({ success: true });
});

// Reset Demo Data
app.post('/api/reset', (req: Request, res: Response) => {
  inventory = JSON.parse(JSON.stringify(SEED_PRODUCTS));
  salesHistory = [];
  adjustmentsHistory = [];
  res.json({ success: true, message: 'Catalog and sales reset to initial state', products: inventory });
});

// -------------------------------------------------------------
// Vite Dev Server / Static Production Server
// -------------------------------------------------------------
async function startServer() {
  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath));
      app.get('*', (req: Request, res: Response) => {
        res.sendFile(path.join(distPath, 'index.html'));
      });
    }
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🌿 Sokos POS Server running at http://0.0.0.0:${PORT}`);
  });
}

startServer().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
