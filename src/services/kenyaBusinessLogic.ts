import { EtimsInfo, VatClassification, CartItem } from '../types/pos';

// ----------------------------------------------------------------------
// M-PESA LOGIC & SMS PARSER FOR KENYAN SMES
// ----------------------------------------------------------------------

export interface ParsedMpesaSms {
  success: boolean;
  code?: string;
  amount?: number;
  senderName?: string;
  senderPhone?: string;
  rawText: string;
  error?: string;
}

/**
 * Parses raw Safaricom M-Pesa customer payment confirmation SMS messages
 * Handles standard Kenyan formats:
 * - "SLD984X7K2 Confirmed. Ksh450.00 paid to SOKOS MARKET on 29/10/26 at 2:30 PM..."
 * - "RK89128301 Confirmed. You have received Ksh1,200.00 from JOHN MWANGI 0712345678 on 29/10/26..."
 * - "TAD8912345 Confirmed. Ksh300.00 sent to Till 542890..."
 */
export function parseMpesaSms(sms: string): ParsedMpesaSms {
  const text = sms.trim();
  if (!text) {
    return { success: false, rawText: text, error: 'Empty SMS text provided' };
  }

  // Regex for standard 10-char M-Pesa transaction reference (e.g., SLD984X7K2 or RK12093481)
  const codeMatch = text.match(/^([A-Z0-9]{8,12})\s+(?:Confirmed|confirmed)/i) ||
                    text.match(/(?:Ref|Code|Receipt)[\s:]*([A-Z0-9]{8,12})/i) ||
                    text.match(/\b([A-Z0-9]{10})\b/);

  // Regex for Kenyan Shillings amount (e.g. Ksh450.00 or Ksh 1,250 or KES 500)
  const amountMatch = text.match(/(?:Ksh|KES)\.?\s*([\d,]+(?:\.\d{1,2})?)/i);

  // Regex for sender name / phone
  const phoneMatch = text.match(/(?:from|by)\s+([A-Z\s]+)?\s*(2547\d{8}|07\d{8}|01\d{8})/i) ||
                     text.match(/\b(07\d{8}|01\d{8}|2547\d{8}|2541\d{8})\b/);

  const code = codeMatch ? codeMatch[1].toUpperCase() : undefined;
  let amount: number | undefined;

  if (amountMatch) {
    const cleanNum = amountMatch[1].replace(/,/g, '');
    amount = parseFloat(cleanNum);
  }

  let senderPhone = phoneMatch ? (phoneMatch[2] || phoneMatch[1]) : undefined;
  if (senderPhone && senderPhone.startsWith('0')) {
    senderPhone = '254' + senderPhone.slice(1);
  }

  let senderName: string | undefined;
  const nameMatch = text.match(/(?:from|by)\s+([A-Z\s]{3,30})\s+(?:07|01|254)/i);
  if (nameMatch) {
    senderName = nameMatch[1].trim();
  }

  if (code && amount !== undefined) {
    return {
      success: true,
      code,
      amount,
      senderName,
      senderPhone,
      rawText: text,
    };
  }

  // If user just pasted the 10-character code directly (e.g. "SLD984X7K2")
  if (text.length >= 8 && text.length <= 12 && /^[A-Z0-9]+$/i.test(text)) {
    return {
      success: true,
      code: text.toUpperCase(),
      rawText: text,
    };
  }

  return {
    success: false,
    rawText: text,
    error: 'Could not detect standard M-Pesa confirmation code or amount. Please check the SMS or enter manually.',
  };
}

/**
 * Generate a realistic Safaricom M-Pesa transaction code
 * (e.g. SLD984X7K2)
 */
export function generateMpesaReceiptCode(): string {
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const prefix = letters[Math.floor(Math.random() * letters.length)] +
                 letters[Math.floor(Math.random() * letters.length)] +
                 letters[Math.floor(Math.random() * letters.length)];
  const digits = Math.floor(100 + Math.random() * 900);
  const suffix = letters[Math.floor(Math.random() * letters.length)] +
                 letters[Math.floor(Math.random() * letters.length)] +
                 letters[Math.floor(Math.random() * letters.length)] +
                 Math.floor(Math.random() * 10);
  return `${prefix}${digits}${suffix}`;
}

// ----------------------------------------------------------------------
// KENYA REVENUE AUTHORITY (KRA) eTIMS COMPLIANCE LOGIC
// ----------------------------------------------------------------------

export function calculateEtimsBreakdown(items: CartItem[], discountTotal = 0): EtimsInfo {
  let totalGross = items.reduce((sum, item) => sum + item.appliedPrice * item.quantity, 0);
  const discountRatio = totalGross > 0 ? (totalGross - discountTotal) / totalGross : 1;

  let vatA_16 = 0; // Standard 16% VAT
  let vatB_8 = 0;  // 8% Fuel
  let vatC_0 = 0;  // Zero-rated
  let vatD_Exempt = 0; // Exempt

  items.forEach((item) => {
    const netLine = item.appliedPrice * item.quantity * discountRatio;
    const cat = item.product.vatClassification || 'A';

    if (cat === 'A') {
      vatA_16 += netLine;
    } else if (cat === 'B') {
      vatB_8 += netLine;
    } else if (cat === 'C') {
      vatC_0 += netLine;
    } else if (cat === 'D') {
      vatD_Exempt += netLine;
    }
  });

  // In Kenya, consumer prices are VAT inclusive (Tax fraction = 16/116 for Rate A)
  const taxA_16 = vatA_16 * (16 / 116);
  const taxB_8 = vatB_8 * (8 / 108);

  const timestampPart = Date.now().toString().slice(-8);
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  const kraControlNumber = `0110${timestampPart}${randomSuffix}`;
  const cuSerialNumber = `KRA-ETIMS-KE01-${randomSuffix}`;

  const qrVerificationUrl = `https://itax.kra.go.ke/etims/verify?cu=${cuSerialNumber}&ctrl=${kraControlNumber}&tot=${totalGross.toFixed(0)}`;

  return {
    kraControlNumber,
    cuSerialNumber,
    qrVerificationUrl,
    vatA_16: Math.round(vatA_16 * 100) / 100,
    taxA_16: Math.round(taxA_16 * 100) / 100,
    vatB_8: Math.round(vatB_8 * 100) / 100,
    taxB_8: Math.round(taxB_8 * 100) / 100,
    vatC_0: Math.round(vatC_0 * 100) / 100,
    vatD_Exempt: Math.round(vatD_Exempt * 100) / 100,
  };
}

// ----------------------------------------------------------------------
// KENYAN BANKNOTE & COIN DENOMINATION FAST CASH SUGGESTIONS
// ----------------------------------------------------------------------

export function getKenyanCashSuggestions(totalDue: number): number[] {
  const roundedDue = Math.ceil(totalDue);
  const suggestions = new Set<number>();
  suggestions.add(roundedDue);

  // Common Kenyan Banknotes: 50, 100, 200, 500, 1000
  // Coins: 10, 20
  const stepRounds = [
    Math.ceil(roundedDue / 10) * 10,
    Math.ceil(roundedDue / 50) * 50,
    Math.ceil(roundedDue / 100) * 100,
    Math.ceil(roundedDue / 200) * 200,
    Math.ceil(roundedDue / 500) * 500,
    Math.ceil(roundedDue / 1000) * 1000,
    roundedDue + 100,
    roundedDue + 500,
    roundedDue + 1000,
  ];

  stepRounds.forEach(val => {
    if (val >= roundedDue) {
      suggestions.add(val);
    }
  });

  return Array.from(suggestions).sort((a, b) => a - b).slice(0, 5);
}

// ----------------------------------------------------------------------
// SWAHILI BILINGUAL TERMINOLOGY FOR KENYAN RETAIL
// ----------------------------------------------------------------------

export const SWAHILI_TERMS = {
  receiptTitle: 'STAKABADHI YA MALIPO',
  taxInvoice: 'STAKABADHI YA USHURU (KRA eTIMS)',
  paymentMethod: 'NJIA YA MALIPO',
  cash: 'Pesa Mkononi (Cash)',
  mpesa: 'M-PESA',
  credit: 'Mali ya Deni (Store Credit)',
  split: 'Malipo ya Pamoja (Split: M-Pesa + Cash)',
  subtotal: 'Jumla Ndogo',
  vat: 'Ushuru (VAT 16%)',
  total: 'JUMLA KUU',
  tendered: 'Kiasi Kilichotolewa',
  changeDue: 'Chenji (Change)',
  servedBy: 'Ulihudumiwa na',
  customer: 'Mteja',
  wholesaleRate: 'Bei ya Jumla',
  retailRate: 'Bei ya Rejareja',
  thankYou: 'Asante kwa kununua nasi. Karibu tena!',
};
