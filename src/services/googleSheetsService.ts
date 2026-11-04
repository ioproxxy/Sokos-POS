/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Google Sheets Integration & Data Pipeline Service
 * Authenticates with Google Workspace OAuth using Firebase Auth SDK,
 * manages in-memory tokens, and pipelines POS data directly to Google Sheets.
 */

import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getAuth, signInWithPopup, GoogleAuthProvider, 
  onAuthStateChanged, User, signOut 
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';
import { Product, Sale, DukaExpense, CustomerCreditAccount, StoreConfig } from '../types/pos';

// Initialize Firebase App instance
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);

// Configure Google OAuth provider with required Workspace scopes
export const googleProvider = new GoogleAuthProvider();
googleProvider.addScope('https://www.googleapis.com/auth/spreadsheets');
googleProvider.addScope('https://www.googleapis.com/auth/drive.file');
// Prompt user to select account if needed
googleProvider.setCustomParameters({
  prompt: 'select_account',
});

// IN-MEMORY TOKEN CACHING ONLY (MANDATORY: Never write to localStorage)
let cachedAccessToken: string | null = null;
let isSigningIn = false;

export interface AuthState {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
}

/**
 * Initialize auth listener on mount
 */
export const initAuth = (
  onAuthChange: (state: AuthState) => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user && cachedAccessToken) {
      onAuthChange({
        user,
        accessToken: cachedAccessToken,
        isAuthenticated: true,
      });
    } else {
      // If user is returned by listener on reload but token wasn't cached in memory
      onAuthChange({
        user,
        accessToken: cachedAccessToken,
        isAuthenticated: !!cachedAccessToken,
      });
    }
  });
};

/**
 * Interactive Sign-in with Google popup
 */
export const googleSignIn = async (): Promise<{ user: User; accessToken: string }> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, googleProvider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Google OAuth token could not be obtained.');
    }

    cachedAccessToken = credential.accessToken;
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    console.error('Google Sign-In Error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

/**
 * Retrieve cached token in memory
 */
export const getAccessToken = async (): Promise<string | null> => {
  return cachedAccessToken;
};

/**
 * Sign out and clear in-memory token
 */
export const googleSignOut = async (): Promise<void> => {
  try {
    await signOut(auth);
  } finally {
    cachedAccessToken = null;
  }
};

// --------------------------------------------------------------------------
// GOOGLE SHEETS API OPERATIONS
// --------------------------------------------------------------------------

export interface PipelineResult {
  spreadsheetId: string;
  spreadsheetUrl: string;
  title: string;
  salesPushed: number;
  inventoryPushed: number;
  expensesPushed: number;
  creditPushed: number;
  timestamp: number;
}

export const googleSheetsService = {
  /**
   * Create a new styled, multi-tab POS Spreadsheet in the user's Google Drive / Sheets
   */
  async createFullPosSpreadsheet(params: {
    storeConfig: StoreConfig;
    sales: Sale[];
    inventory: Product[];
    expenses: DukaExpense[];
    creditAccounts: CustomerCreditAccount[];
    customTitle?: string;
  }): Promise<PipelineResult> {
    const token = await getAccessToken();
    if (!token) {
      throw new Error('Please sign in with Google first to access your Google Sheets.');
    }

    const { storeConfig, sales, inventory, expenses, creditAccounts } = params;
    const now = new Date();
    const dateFormatted = now.toLocaleDateString('en-KE', { year: 'numeric', month: 'short', day: '2-digit' });
    const sheetTitle = params.customTitle || `${storeConfig.storeName} — POS Pipeline (${dateFormatted})`;

    // 1. Create Spreadsheet with initial tabs
    const createPayload = {
      properties: {
        title: sheetTitle,
        locale: 'en_KE',
        timeZone: 'Africa/Nairobi',
      },
      sheets: [
        {
          properties: {
            title: 'Overview & Summary',
            gridProperties: { rowCount: 30, columnCount: 10, frozenRowCount: 1 },
            tabColor: { red: 0.02, green: 0.6, blue: 0.4 }, // Emerald green
          },
        },
        {
          properties: {
            title: 'Sales Transactions',
            gridProperties: { rowCount: Math.max(50, sales.length + 10), columnCount: 18, frozenRowCount: 1 },
            tabColor: { red: 0.1, green: 0.5, blue: 0.9 }, // Blue
          },
        },
        {
          properties: {
            title: 'Inventory & Valuation',
            gridProperties: { rowCount: Math.max(50, inventory.length + 10), columnCount: 15, frozenRowCount: 1 },
            tabColor: { red: 0.95, green: 0.6, blue: 0.1 }, // Amber
          },
        },
        {
          properties: {
            title: 'Daily Expenses',
            gridProperties: { rowCount: Math.max(30, expenses.length + 10), columnCount: 8, frozenRowCount: 1 },
            tabColor: { red: 0.9, green: 0.3, blue: 0.3 }, // Red
          },
        },
        {
          properties: {
            title: 'Customer Credit (Deni)',
            gridProperties: { rowCount: Math.max(30, creditAccounts.length + 10), columnCount: 9, frozenRowCount: 1 },
            tabColor: { red: 0.6, green: 0.3, blue: 0.9 }, // Purple
          },
        },
      ],
    };

    const createRes = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(createPayload),
    });

    if (!createRes.ok) {
      const err = await createRes.json().catch(() => ({}));
      throw new Error(err.error?.message || `Failed to create Google Spreadsheet (HTTP ${createRes.status})`);
    }

    const createdSheet = await createRes.json();
    const spreadsheetId: string = createdSheet.spreadsheetId;
    const spreadsheetUrl: string = createdSheet.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;

    // 2. Prepare Data Rows for each tab
    // 2A. Overview & Summary
    const totalSalesKes = sales.reduce((s, x) => s + x.grandTotal, 0);
    const totalInventoryValueKes = inventory.reduce((s, p) => s + (p.stock * p.costPrice), 0);
    const totalOutstandingDebtKes = creditAccounts.reduce((s, c) => s + c.currentBalance, 0);
    const totalExpensesKes = expenses.reduce((s, e) => s + e.amount, 0);
    const cashSales = sales.filter(s => s.paymentMethod === 'cash').reduce((s, x) => s + x.grandTotal, 0);
    const mpesaSales = sales.filter(s => s.paymentMethod === 'mpesa').reduce((s, x) => s + x.grandTotal, 0);

    const summaryValues = [
      ['KPI / BUSINESS METRIC', 'VALUE / AMOUNT (KES)', 'NOTES & CONTEXT'],
      ['Store Name', storeConfig.storeName, 'Trading Name'],
      ['KRA PIN & eTIMS CU', `${storeConfig.taxId} • ${storeConfig.etimsCuNumber}`, 'Tax Compliance'],
      ['Data Pipeline Generated (EAT)', now.toLocaleString('en-KE'), 'Automated Sokos POS Export'],
      ['Total Completed Sales (Count)', sales.length, 'All historical recorded receipts'],
      ['Gross Sales Turnover (KES)', totalSalesKes, 'Total revenue captured'],
      ['— Total Cash Collected (KES)', cashSales, 'Direct cash in till'],
      ['— Total M-Pesa Collected (KES)', mpesaSales, 'Buy Goods Till / Paybill'],
      ['Stock Catalog Items (Count)', inventory.length, 'Active product variants'],
      ['Total Stock Inventory Value at Cost (KES)', totalInventoryValueKes, 'Total capital held in goods'],
      ['Total Petty Cash / Expenses (KES)', totalExpensesKes, 'Recorded shop payouts'],
      ['Active Credit Debtors (Count)', creditAccounts.filter(c => c.currentBalance > 0).length, 'Customers with outstanding debt'],
      ['Total Outstanding Customer Deni (KES)', totalOutstandingDebtKes, 'Credit owed by customers'],
    ];

    // 2B. Sales Transactions
    const salesHeaders = [
      'Receipt No',
      'Date & Time (EAT)',
      'Customer Name',
      'Customer Phone',
      'Payment Method',
      'M-Pesa Reference / Code',
      'Cashier',
      'Items Count',
      'Items Purchased Summary',
      'Subtotal (KES)',
      'Discount (KES)',
      'KRA VAT (KES)',
      'Grand Total (KES)',
      'Amount Tendered (KES)',
      'Change Given (KES)',
      'Sync Status',
      'eTIMS Serial',
      'Notes'
    ];

    const salesRows = sales.map(s => {
      const dateStr = new Date(s.timestamp).toLocaleString('en-KE');
      const itemsSummary = s.items.map(i => `${i.name} (x${i.quantity})`).join('; ');
      const totalItemsCount = s.items.reduce((sum, i) => sum + i.quantity, 0);
      const mpesaCode = s.mpesaDetails?.mpesaReceipt || s.splitPayment?.mpesaReceipt || s.paymentReference || '';

      return [
        s.receiptNumber,
        dateStr,
        s.customerName || 'Walk-in Customer',
        s.customerPhone || 'N/A',
        s.paymentMethod.toUpperCase(),
        mpesaCode,
        s.cashierName || 'Cashier 01',
        totalItemsCount,
        itemsSummary,
        s.subtotal,
        s.discountTotal,
        s.taxTotal,
        s.grandTotal,
        s.amountTendered,
        s.changeDue,
        s.syncStatus,
        s.etimsInfo?.cuSerialNumber || 'N/A',
        s.notes || ''
      ];
    });

    // 2C. Inventory & Valuation
    const inventoryHeaders = [
      'Barcode',
      'SKU',
      'Item Name',
      'Category',
      'Stock Level',
      'Unit',
      'Cost Price (KES)',
      'Retail Price (KES)',
      'Wholesale Price (KES)',
      'Stock Valuation at Cost (KES)',
      'Min Alert',
      'Stock Status',
      'VAT Class',
      'Sokos.co.ke Listed',
      'Last Updated'
    ];

    const inventoryRows = inventory.map(p => {
      const valuation = p.stock * p.costPrice;
      const stockStatus = p.stock <= 0 ? 'OUT OF STOCK' : p.stock <= p.minStockAlert ? 'LOW STOCK' : 'IN STOCK';
      return [
        p.barcode,
        p.sku,
        p.name,
        p.category,
        p.stock,
        p.unit,
        p.costPrice,
        p.price,
        p.wholesalePrice || p.price,
        valuation,
        p.minStockAlert,
        stockStatus,
        p.vatClassification,
        p.publishedOnSokos ? 'YES' : 'NO',
        new Date(p.updatedAt).toLocaleString('en-KE')
      ];
    });

    // 2D. Daily Expenses
    const expenseHeaders = [
      'Date & Time',
      'Expense Description',
      'Category',
      'Paid Via',
      'Amount (KES)',
      'Reference / Ticket',
      'Recorded By'
    ];

    const expenseRows = expenses.map(e => [
      new Date(e.timestamp).toLocaleString('en-KE'),
      e.description,
      e.category.replace('_', ' ').toUpperCase(),
      e.paidVia.toUpperCase(),
      e.amount,
      e.receiptOrRef || 'N/A',
      e.recordedBy
    ]);

    // 2E. Customer Credit
    const creditHeaders = [
      'Customer Name',
      'Phone Number',
      'National ID / Location',
      'Credit Limit (KES)',
      'Current Outstanding Debt (KES)',
      'Status',
      'Account Created',
      'Last Activity'
    ];

    const creditRows = creditAccounts.map(c => [
      c.name,
      c.phone,
      c.idNumber || c.location || 'N/A',
      c.creditLimit,
      c.currentBalance,
      c.status.toUpperCase(),
      new Date(c.createdAt).toLocaleDateString('en-KE'),
      new Date(c.updatedAt).toLocaleDateString('en-KE')
    ]);

    // 3. Batch Update Values across all 5 sheets
    const batchValuesPayload = {
      valueInputOption: 'USER_ENTERED',
      data: [
        {
          range: "'Overview & Summary'!A1",
          values: summaryValues,
        },
        {
          range: "'Sales Transactions'!A1",
          values: [salesHeaders, ...salesRows],
        },
        {
          range: "'Inventory & Valuation'!A1",
          values: [inventoryHeaders, ...inventoryRows],
        },
        {
          range: "'Daily Expenses'!A1",
          values: [expenseHeaders, ...expenseRows],
        },
        {
          range: "'Customer Credit (Deni)'!A1",
          values: [creditHeaders, ...creditRows],
        },
      ],
    };

    const valuesRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(batchValuesPayload),
      }
    );

    if (!valuesRes.ok) {
      console.warn('Batch update values warning:', await valuesRes.text());
    }

    // 4. Batch Style Formatting (Emerald Headers, Bold first rows, Auto-resize)
    try {
      const sheetsList = createdSheet.sheets || [];
      const requests = sheetsList.map((s: any) => {
        const sheetId = s.properties.sheetId;
        return {
          repeatCell: {
            range: {
              sheetId,
              startRowIndex: 0,
              endRowIndex: 1,
            },
            cell: {
              userEnteredFormat: {
                backgroundColor: { red: 0.03, green: 0.45, blue: 0.32 }, // Forest/Emerald
                textFormat: {
                  foregroundColor: { red: 1, green: 1, blue: 1 },
                  bold: true,
                  fontSize: 10,
                },
              },
            },
            fields: 'userEnteredFormat(backgroundColor,textFormat)',
          },
        };
      });

      await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ requests }),
      });
    } catch (e) {
      console.warn('Formatting non-fatal error:', e);
    }

    return {
      spreadsheetId,
      spreadsheetUrl,
      title: sheetTitle,
      salesPushed: sales.length,
      inventoryPushed: inventory.length,
      expensesPushed: expenses.length,
      creditPushed: creditAccounts.length,
      timestamp: Date.now(),
    };
  },

  /**
   * Append newly captured sales to an existing Google Spreadsheet
   */
  async appendSalesToSpreadsheet(
    spreadsheetId: string,
    newSales: Sale[]
  ): Promise<{ rowsAppended: number; spreadsheetUrl: string }> {
    const token = await getAccessToken();
    if (!token) {
      throw new Error('Please sign in with Google first.');
    }

    if (newSales.length === 0) {
      return { rowsAppended: 0, spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit` };
    }

    const rows = newSales.map(s => {
      const dateStr = new Date(s.timestamp).toLocaleString('en-KE');
      const itemsSummary = s.items.map(i => `${i.name} (x${i.quantity})`).join('; ');
      const totalItemsCount = s.items.reduce((sum, i) => sum + i.quantity, 0);
      const mpesaCode = s.mpesaDetails?.mpesaReceipt || s.splitPayment?.mpesaReceipt || s.paymentReference || '';

      return [
        s.receiptNumber,
        dateStr,
        s.customerName || 'Walk-in Customer',
        s.customerPhone || 'N/A',
        s.paymentMethod.toUpperCase(),
        mpesaCode,
        s.cashierName || 'Cashier 01',
        totalItemsCount,
        itemsSummary,
        s.subtotal,
        s.discountTotal,
        s.taxTotal,
        s.grandTotal,
        s.amountTendered,
        s.changeDue,
        s.syncStatus,
        s.etimsInfo?.cuSerialNumber || 'N/A',
        s.notes || ''
      ];
    });

    const range = encodeURIComponent("'Sales Transactions'!A:R");
    const appendRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}:append?valueInputOption=USER_ENTERED`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ values: rows }),
      }
    );

    if (!appendRes.ok) {
      const err = await appendRes.json().catch(() => ({}));
      throw new Error(err.error?.message || `Failed to append sales rows (HTTP ${appendRes.status})`);
    }

    return {
      rowsAppended: rows.length,
      spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`,
    };
  },

  /**
   * Verify spreadsheet access and fetch metadata
   */
  async getSpreadsheetInfo(spreadsheetId: string): Promise<{ title: string; sheets: string[] }> {
    const token = await getAccessToken();
    if (!token) {
      throw new Error('Please sign in with Google first.');
    }

    const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=properties.title,sheets.properties.title`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) {
      throw new Error('Could not access spreadsheet. Please check the Spreadsheet ID and permissions.');
    }

    const data = await res.json();
    const sheets = (data.sheets || []).map((s: any) => s.properties?.title || '');
    return {
      title: data.properties?.title || 'Google Spreadsheet',
      sheets,
    };
  }
};
