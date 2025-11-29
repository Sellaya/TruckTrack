import type { ExtractedReceiptData, Currency } from '../types';

// Google Cloud Vision API endpoint
const VISION_API_URL = 'https://vision.googleapis.com/v1/images:annotate';

// Check if Google Cloud Vision API key is configured
function getVisionApiKey(): string | null {
  const apiKey = process.env.GOOGLE_CLOUD_VISION_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_CLOUD_VISION_API_KEY;
  if (!apiKey || apiKey === 'your_google_cloud_vision_api_key_here') {
    return null;
  }
  return apiKey;
}

/**
 * Download image from URL and convert to base64
 * Works in both Node.js (server-side) and browser environments
 */
async function downloadImageAsBase64(imageUrl: string): Promise<string> {
  try {
    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error(`Failed to download image: ${response.status} ${response.statusText}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    
    // Convert ArrayBuffer to base64
    // Use Buffer in Node.js, or btoa in browser
    let base64: string;
    if (typeof Buffer !== 'undefined') {
      // Node.js environment
      base64 = Buffer.from(arrayBuffer).toString('base64');
    } else {
      // Browser environment - convert Uint8Array to base64
      const bytes = new Uint8Array(arrayBuffer);
      let binary = '';
      for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      base64 = btoa(binary);
    }
    
    return base64;
  } catch (error) {
    console.error('Error downloading image:', error);
    throw new Error('Failed to download image for OCR processing');
  }
}

/**
 * Call Google Cloud Vision API for text detection
 */
async function detectText(imageBase64: string, apiKey: string): Promise<string[]> {
  const url = `${VISION_API_URL}?key=${apiKey}`;
  
  const requestBody = {
    requests: [
      {
        image: {
          content: imageBase64,
        },
        features: [
          {
            type: 'TEXT_DETECTION',
            maxResults: 10,
          },
        ],
      },
    ],
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Vision API error:', response.status, errorText);
      throw new Error(`Vision API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    if (!data.responses || !data.responses[0]) {
      throw new Error('Invalid response from Vision API');
    }

    const textAnnotations = data.responses[0].textAnnotations;
    if (!textAnnotations || textAnnotations.length === 0) {
      return [];
    }

    // Extract all text blocks (skip the first one which is the full text)
    const textBlocks = textAnnotations.slice(1).map((annotation: any) => annotation.description);
    
    // Also get the full text from the first annotation
    const fullText = textAnnotations[0]?.description || '';
    
    return [fullText, ...textBlocks];
  } catch (error) {
    console.error('Error calling Vision API:', error);
    throw error;
  }
}

/**
 * Extract amount from OCR text
 * Looks for patterns like $XXX.XX, CAD XXX.XX, USD XXX.XX
 */
function extractAmount(textBlocks: string[]): { amount: number | null; currency: Currency } {
  // Combine all text blocks for better matching
  const fullText = textBlocks.join(' ').toUpperCase();
  
  // Patterns to match:
  // - $123.45
  // - CAD 123.45
  // - USD 123.45
  // - TOTAL: $123.45
  // - AMOUNT: CAD 123.45
  
  const amountPatterns = [
    /(?:TOTAL|AMOUNT|PAID|CHARGE|BALANCE|DUE)[\s:]*[\$]?[\s]*(?:CAD|USD|US\$)?[\s]*([\d,]+\.?\d{0,2})/gi,
    /[\$](?:CAD|USD|US\$)?[\s]*([\d,]+\.?\d{0,2})/g,
    /(?:CAD|USD|US\$)[\s]+([\d,]+\.?\d{0,2})/gi,
    /([\d,]+\.?\d{2})(?:\s*(?:CAD|USD))?/g,
  ];

  let currency: Currency = 'USD'; // Default
  let maxAmount = 0;

  for (const pattern of amountPatterns) {
    const matches = [...fullText.matchAll(pattern)];
    for (const match of matches) {
      const amountStr = match[1]?.replace(/,/g, '');
      const amount = parseFloat(amountStr);
      
      if (!isNaN(amount) && amount > maxAmount && amount < 1000000) {
        maxAmount = amount;
        
        // Detect currency
        const matchText = match[0].toUpperCase();
        if (matchText.includes('CAD') || matchText.includes('CAN')) {
          currency = 'CAD';
        } else if (matchText.includes('USD') || matchText.includes('US$')) {
          currency = 'USD';
        } else if (matchText.includes('$') && !matchText.includes('CAD')) {
          // Default to USD for $ symbol
          currency = 'USD';
        }
      }
    }
  }

  return {
    amount: maxAmount > 0 ? maxAmount : null,
    currency,
  };
}

/**
 * Extract vendor name from OCR text
 * Usually the first line or largest text block
 */
function extractVendor(textBlocks: string[]): string | null {
  if (textBlocks.length === 0) return null;

  // The full text is usually the first block
  const fullText = textBlocks[0];
  if (!fullText) return null;

  // Split into lines and find the first substantial line
  const lines = fullText.split('\n').filter(line => line.trim().length > 0);
  
  for (const line of lines) {
    const trimmed = line.trim();
    // Skip common receipt header elements
    if (
      trimmed.length < 3 ||
      trimmed.match(/^(RECEIPT|INVOICE|ORDER|DATE|TIME|TRANSACTION|REF|REFERENCE|CARD|PAYMENT|TOTAL|AMOUNT|SUBTOTAL|TAX|HST|GST|TIP|GRATUITY|CHANGE|CASH|DEBIT|CREDIT)/i)
    ) {
      continue;
    }
    
    // Return first substantial line that looks like a vendor name
    if (trimmed.length > 2 && trimmed.length < 100) {
      return trimmed;
    }
  }

  // Fallback: return first non-empty line
  return lines[0] || null;
}

/**
 * Extract date from OCR text
 * Looks for patterns like YYYY-MM-DD, MM/DD/YYYY, DD/MM/YYYY, etc.
 */
function extractDate(textBlocks: string[]): string | null {
  const fullText = textBlocks.join(' ');
  
  // Date patterns
  const datePatterns = [
    /(\d{4})[-/](\d{1,2})[-/](\d{1,2})/, // YYYY-MM-DD, YYYY/MM/DD
    /(\d{1,2})[-/](\d{1,2})[-/](\d{4})/, // MM/DD/YYYY, DD/MM/YYYY
    /(\d{1,2})[-/](\d{1,2})[-/](\d{2})/, // MM/DD/YY
    /([A-Za-z]{3})[\s]+(\d{1,2}),[\s]+(\d{4})/, // Jan 15, 2024
    /(\d{1,2})[\s]+([A-Za-z]{3})[\s]+(\d{4})/, // 15 Jan 2024
  ];

  for (const pattern of datePatterns) {
    const matches = fullText.match(pattern);
    if (matches) {
      try {
        // Try to parse and format as ISO string
        const dateStr = matches[0];
        let date: Date;

        // Handle different formats
        if (dateStr.includes(',')) {
          // Format like "Jan 15, 2024"
          date = new Date(dateStr);
        } else {
          // Try parsing different formats
          const parts = dateStr.split(/[-/]/);
          if (parts.length === 3) {
            // Determine format (YYYY-MM-DD vs MM/DD/YYYY)
            if (parts[0].length === 4) {
              // YYYY-MM-DD
              date = new Date(`${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`);
            } else {
              // MM/DD/YYYY or DD/MM/YYYY - assume MM/DD/YYYY for North America
              date = new Date(`${parts[2]}-${parts[0].padStart(2, '0')}-${parts[1].padStart(2, '0')}`);
            }
          } else {
            date = new Date(dateStr);
          }
        }

        if (!isNaN(date.getTime())) {
          return date.toISOString();
        }
      } catch (error) {
        // Continue to next pattern
        continue;
      }
    }
  }

  return null;
}

/**
 * Extract location/address from OCR text
 * Looks for province/state codes: ON, QC, BC, AB, etc.
 */
function extractLocation(textBlocks: string[]): string | null {
  const fullText = textBlocks.join(' ');
  
  // Canadian provinces
  const canadianProvinces = ['ON', 'QC', 'BC', 'AB', 'MB', 'SK', 'NS', 'NB', 'NL', 'PE', 'YT', 'NT', 'NU'];
  // US states (common ones)
  const usStates = ['CA', 'NY', 'TX', 'FL', 'IL', 'PA', 'OH', 'GA', 'NC', 'MI'];
  
  const allCodes = [...canadianProvinces, ...usStates];
  
  for (const code of allCodes) {
    // Look for code pattern with context (e.g., "Toronto, ON" or "123 Main St, ON")
    const pattern = new RegExp(`([A-Za-z\\s]+(?:,\\s*)?${code}\\b)`, 'i');
    const match = fullText.match(pattern);
    if (match) {
      // Extract the location string (up to 100 chars)
      let location = match[0].trim();
      if (location.length > 100) {
        location = location.substring(0, 100);
      }
      return location;
    }
  }

  return null;
}

/**
 * Auto-categorize expense based on vendor name
 */
function categorizeExpense(vendor: string | null): string {
  if (!vendor) return 'other';

  const vendorUpper = vendor.toUpperCase();

  // Fuel vendors
  if (
    vendorUpper.includes('PETRO') ||
    vendorUpper.includes('SHELL') ||
    vendorUpper.includes('ESSO') ||
    vendorUpper.includes('HUSKY') ||
    vendorUpper.includes('MOBIL') ||
    vendorUpper.includes('EXXON') ||
    vendorUpper.includes('BP ') ||
    vendorUpper.includes('CHEVRON') ||
    vendorUpper.includes('CITGO') ||
    vendorUpper.includes('SUNOCO') ||
    vendorUpper.includes('TA ') ||
    vendorUpper.includes('LOVES') ||
    vendorUpper.includes('FLYING J') ||
    vendorUpper.includes('GAS') ||
    vendorUpper.includes('FUEL')
  ) {
    return 'Fuel';
  }

  // Meal/food vendors
  if (
    vendorUpper.includes('TIM HORTONS') ||
    vendorUpper.includes("TIM'S") ||
    vendorUpper.includes("TIMHORTONS") ||
    vendorUpper.includes("MCDONALD") ||
    vendorUpper.includes("SUBWAY") ||
    vendorUpper.includes("BURGER KING") ||
    vendorUpper.includes("WENDY'S") ||
    vendorUpper.includes("WENDYS") ||
    vendorUpper.includes("TACO BELL") ||
    vendorUpper.includes("KFC") ||
    vendorUpper.includes("PIZZA") ||
    vendorUpper.includes("RESTAURANT") ||
    vendorUpper.includes("DINER") ||
    vendorUpper.includes("CAFE") ||
    vendorUpper.includes("COFFEE")
  ) {
    return 'Food';
  }

  // Tolls
  if (
    vendorUpper.includes('407 ETR') ||
    vendorUpper.includes('407ETR') ||
    vendorUpper.includes('TOLL') ||
    vendorUpper.includes('HIGHWAY') ||
    vendorUpper.includes('ETR') ||
    vendorUpper.includes('TURNPIKE')
  ) {
    return 'Tolls';
  }

  // Maintenance/repair
  if (
    vendorUpper.includes('REPAIR') ||
    vendorUpper.includes('SERVICE') ||
    vendorUpper.includes('TIRE') ||
    vendorUpper.includes('PARTS') ||
    vendorUpper.includes('AUTO') ||
    vendorUpper.includes('MECHANIC') ||
    vendorUpper.includes('GARAGE') ||
    vendorUpper.includes('LUBE') ||
    vendorUpper.includes('OIL CHANGE')
  ) {
    return 'Maintenance';
  }

  // Lodging
  if (
    vendorUpper.includes('HOTEL') ||
    vendorUpper.includes('MOTEL') ||
    vendorUpper.includes('INN') ||
    vendorUpper.includes('LODGING')
  ) {
    return 'Lodging';
  }

  // Parking
  if (
    vendorUpper.includes('PARKING') ||
    vendorUpper.includes('LOT')
  ) {
    return 'Parking';
  }

  return 'Other';
}

/**
 * Process receipt image using Google Cloud Vision API
 * Extracts structured data from receipt image
 */
export async function processReceiptImage(imageUrl: string): Promise<ExtractedReceiptData> {
  const apiKey = getVisionApiKey();
  
  if (!apiKey) {
    console.warn('Google Cloud Vision API key not configured. Set GOOGLE_CLOUD_VISION_API_KEY environment variable.');
    return {};
  }

  try {
    // Download image and convert to base64
    const imageBase64 = await downloadImageAsBase64(imageUrl);

    // Call Vision API for text detection
    const textBlocks = await detectText(imageBase64, apiKey);

    if (textBlocks.length === 0) {
      console.warn('No text detected in image');
      return {};
    }

    // Extract structured data
    const { amount, currency } = extractAmount(textBlocks);
    const vendor = extractVendor(textBlocks);
    const date = extractDate(textBlocks);
    const location = extractLocation(textBlocks);
    const category = categorizeExpense(vendor);

    const result: ExtractedReceiptData = {
      amount: amount || undefined,
      vendor: vendor || undefined,
      date: date || undefined,
      category: category || undefined,
      location: location || undefined,
      currency: currency || undefined,
    };

    return result;
  } catch (error) {
    console.error('Error processing receipt image:', error);
    // Return partial data if available, or empty object
    return {};
  }
}

