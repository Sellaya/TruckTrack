/**
 * Currency utilities for dual currency tracking (USD and CAD)
 * Uses Frankfurter.dev API for real-time exchange rates
 */

export type Currency = 'USD' | 'CAD';

export interface CurrencySettings {
  primaryCurrency: Currency;
  exchangeRate: number; // CAD to USD rate (e.g., 1.35 means 1 CAD = 1.35 USD)
}

interface ExchangeRateCache {
  rate: number;
  timestamp: number;
  direction: 'USD_TO_CAD' | 'CAD_TO_USD';
}

// Cache duration: 1 hour (3600000 ms)
const CACHE_DURATION = 60 * 60 * 1000;
const DEFAULT_EXCHANGE_RATE = 1.35; // Fallback rate

// Fetch USD to CAD rate from API
export async function fetchUSDToCADRate(): Promise<number> {
  try {
    const response = await fetch('https://api.frankfurter.dev/v1/latest?base=USD&symbols=CAD');
    if (!response.ok) {
      throw new Error('Failed to fetch USD to CAD rate');
    }
    const data = await response.json();
    return data.rates?.CAD || DEFAULT_EXCHANGE_RATE;
  } catch (error) {
    console.error('Error fetching USD to CAD rate:', error);
    return DEFAULT_EXCHANGE_RATE;
  }
}

// Fetch CAD to USD rate from API
export async function fetchCADToUSDRate(): Promise<number> {
  try {
    const response = await fetch('https://api.frankfurter.dev/v1/latest?base=CAD&symbols=USD');
    if (!response.ok) {
      throw new Error('Failed to fetch CAD to USD rate');
    }
    const data = await response.json();
    return data.rates?.USD || 1 / DEFAULT_EXCHANGE_RATE;
  } catch (error) {
    console.error('Error fetching CAD to USD rate:', error);
    return 1 / DEFAULT_EXCHANGE_RATE;
  }
}

// Get cached exchange rate or fetch new one
async function getCachedOrFetchRate(direction: 'USD_TO_CAD' | 'CAD_TO_USD'): Promise<number> {
  if (typeof window === 'undefined') {
    return direction === 'USD_TO_CAD' ? DEFAULT_EXCHANGE_RATE : 1 / DEFAULT_EXCHANGE_RATE;
  }

  const cacheKey = `exchangeRate_${direction}`;
  const cached = localStorage.getItem(cacheKey);
  
  if (cached) {
    try {
      const cache: ExchangeRateCache = JSON.parse(cached);
      const now = Date.now();
      
      // Return cached rate if still valid
      if (now - cache.timestamp < CACHE_DURATION) {
        return cache.rate;
      }
    } catch (e) {
      // Invalid cache, fetch new rate
    }
  }

  // Fetch new rate
  let rate: number;
  if (direction === 'USD_TO_CAD') {
    rate = await fetchUSDToCADRate();
  } else {
    rate = await fetchCADToUSDRate();
  }

  // Cache the new rate
  const cache: ExchangeRateCache = {
    rate,
    timestamp: Date.now(),
    direction,
  };
  localStorage.setItem(cacheKey, JSON.stringify(cache));

  return rate;
}

// Get exchange rate (CAD to USD) - for backward compatibility
export async function getExchangeRateAsync(): Promise<number> {
  // CAD to USD rate = 1 / (USD to CAD rate)
  const usdToCad = await getCachedOrFetchRate('USD_TO_CAD');
  return 1 / usdToCad;
}

// Get CAD to USD rate synchronously (uses cached value or default)
export function getCADToUSDRate(): number {
  if (typeof window === 'undefined') {
    return 1 / DEFAULT_EXCHANGE_RATE;
  }

  // Try to get cached CAD to USD rate
  const cacheKey = 'exchangeRate_CAD_TO_USD';
  const cached = localStorage.getItem(cacheKey);
  
  if (cached) {
    try {
      const cache: ExchangeRateCache = JSON.parse(cached);
      // Return cached rate even if expired (will be refreshed on next async call)
      return cache.rate;
    } catch (e) {
      // Invalid cache
    }
  }

  // Fallback to default (1 CAD = ~0.74 USD, so 1/1.35)
  return 1 / DEFAULT_EXCHANGE_RATE;
}

// Get USD to CAD rate synchronously (uses cached value or default)
export function getUSDToCADRate(): number {
  if (typeof window === 'undefined') {
    return DEFAULT_EXCHANGE_RATE;
  }

  // Try to get cached USD to CAD rate
  const cacheKey = 'exchangeRate_USD_TO_CAD';
  const cached = localStorage.getItem(cacheKey);
  
  if (cached) {
    try {
      const cache: ExchangeRateCache = JSON.parse(cached);
      return cache.rate;
    } catch (e) {
      // Invalid cache
    }
  }

  // Fallback to default
  return DEFAULT_EXCHANGE_RATE;
}

// Get exchange rate (CAD to USD) - for backward compatibility
export function getExchangeRate(): number {
  return getCADToUSDRate();
}

// Set exchange rate manually (for settings override)
export function setExchangeRate(rate: number): void {
  if (typeof window !== 'undefined') {
    const cache: ExchangeRateCache = {
      rate,
      timestamp: Date.now(),
      direction: 'CAD_TO_USD',
    };
    localStorage.setItem('exchangeRate_CAD_TO_USD', JSON.stringify(cache));
  }
}

// Refresh exchange rates from API
export async function refreshExchangeRates(): Promise<{ usdToCad: number; cadToUsd: number }> {
  const [usdToCad, cadToUsd] = await Promise.all([
    getCachedOrFetchRate('USD_TO_CAD'),
    getCachedOrFetchRate('CAD_TO_USD'),
  ]);
  
  return { usdToCad, cadToUsd };
}

// Get primary currency from settings
export function getPrimaryCurrency(): Currency {
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem('primaryCurrency');
    return (stored as Currency) || 'CAD';
  }
  return 'CAD';
}

// Set primary currency
export function setPrimaryCurrency(currency: Currency): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem('primaryCurrency', currency);
  }
}

// Convert amount from one currency to another (synchronous - uses cached rates)
export function convertCurrency(
  amount: number,
  fromCurrency: Currency,
  toCurrency: Currency,
  cadToUsdRate?: number,
  usdToCadRate?: number
): number {
  if (fromCurrency === toCurrency) {
    return amount;
  }

  // Use provided rates or get from cache
  const cadToUsd = cadToUsdRate || getCADToUSDRate();
  const usdToCad = usdToCadRate || getUSDToCADRate();

  if (fromCurrency === 'CAD' && toCurrency === 'USD') {
    // 1 CAD = cadToUsd USD
    return amount * cadToUsd;
  }

  if (fromCurrency === 'USD' && toCurrency === 'CAD') {
    // 1 USD = usdToCad CAD
    return amount * usdToCad;
  }

  return amount;
}

// Convert amount asynchronously with fresh API rates
export async function convertCurrencyAsync(
  amount: number,
  fromCurrency: Currency,
  toCurrency: Currency
): Promise<number> {
  if (fromCurrency === toCurrency) {
    return amount;
  }

  if (fromCurrency === 'CAD' && toCurrency === 'USD') {
    const cadToUsdRate = await getCachedOrFetchRate('CAD_TO_USD');
    return amount * cadToUsdRate;
  }

  if (fromCurrency === 'USD' && toCurrency === 'CAD') {
    const usdToCadRate = await getCachedOrFetchRate('USD_TO_CAD');
    return amount * usdToCadRate;
  }

  return amount;
}

// Format currency with symbol
export function formatCurrency(amount: number, currency: Currency): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(amount);
}

// Format dual currency display
export function formatDualCurrency(
  amount: number,
  originalCurrency: Currency,
  primaryCurrency: Currency = getPrimaryCurrency(),
  cadToUsdRate?: number,
  usdToCadRate?: number
): string {
  if (originalCurrency === primaryCurrency) {
    return formatCurrency(amount, originalCurrency);
  }

  const convertedAmount = convertCurrency(amount, originalCurrency, primaryCurrency, cadToUsdRate, usdToCadRate);
  return `${formatCurrency(amount, originalCurrency)} (${formatCurrency(convertedAmount, primaryCurrency)})`;
}

// Format for display with both currencies always shown
export function formatBothCurrencies(
  amount: number,
  originalCurrency: Currency,
  cadToUsdRate?: number,
  usdToCadRate?: number
): { usd: string; cad: string; original: Currency } {
  // Get rates if not provided
  const cadToUsd = cadToUsdRate || getCADToUSDRate();
  const usdToCad = usdToCadRate || getUSDToCADRate();
  
  // Calculate amounts in both currencies
  const usdAmount = originalCurrency === 'USD' ? amount : convertCurrency(amount, 'CAD', 'USD', cadToUsd, usdToCad);
  const cadAmount = originalCurrency === 'CAD' ? amount : convertCurrency(amount, 'USD', 'CAD', cadToUsd, usdToCad);

  return {
    usd: formatCurrency(usdAmount, 'USD'),
    cad: formatCurrency(cadAmount, 'CAD'),
    original: originalCurrency,
  };
}

