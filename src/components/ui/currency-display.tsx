'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { formatCurrency, convertCurrency, getCADToUSDRate, getUSDToCADRate } from '@/lib/currency';
import type { Currency } from '@/lib/types';

interface CurrencyDisplayProps {
  amount: number;
  originalCurrency: Currency;
  className?: string;
  variant?: 'default' | 'compact' | 'inline' | 'dual';
  showLabel?: boolean;
  cadToUsdRate?: number;
  usdToCadRate?: number;
}

/**
 * Responsive currency display component showing both CAD and USD
 * Removes redundancy and uses black color only
 */
export function CurrencyDisplay({ 
  amount, 
  originalCurrency,
  className,
  variant = 'default',
  showLabel = false,
  cadToUsdRate,
  usdToCadRate
}: CurrencyDisplayProps) {
  const cadToUsd = cadToUsdRate || getCADToUSDRate();
  const usdToCad = usdToCadRate || getUSDToCADRate();
  
  // Calculate amounts in both currencies
  const cadAmount = originalCurrency === 'CAD' ? amount : convertCurrency(amount, 'USD', 'CAD', cadToUsd, usdToCad);
  const usdAmount = originalCurrency === 'USD' ? amount : convertCurrency(amount, 'CAD', 'USD', cadToUsd, usdToCad);
  
  // Format without currency symbol (just numbers)
  const cadFormatted = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(cadAmount);
  
  const usdFormatted = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(usdAmount);

  if (variant === 'inline') {
    return (
      <span className={cn('text-sm sm:text-base text-foreground inline-flex items-baseline gap-1 flex-wrap', className)}>
        <span className="font-semibold whitespace-nowrap">{cadFormatted}</span>
        <span className="text-foreground text-xs sm:text-sm whitespace-nowrap">CAD</span>
        <span className="text-foreground mx-1 sm:mx-1.5">/</span>
        <span className="font-semibold whitespace-nowrap">{usdFormatted}</span>
        <span className="text-foreground text-xs sm:text-sm whitespace-nowrap">USD</span>
      </span>
    );
  }

  if (variant === 'compact') {
    return (
      <div className={cn('flex flex-col gap-0.5', className)}>
        <div className="text-xs sm:text-sm font-semibold text-foreground whitespace-nowrap">
          {cadFormatted} <span className="text-foreground font-normal">CAD</span>
        </div>
        <div className="text-xs text-foreground whitespace-nowrap">
          {usdFormatted} USD
        </div>
      </div>
    );
  }

  if (variant === 'dual') {
    // Shows CAD and USD side by side with numbers only
    return (
      <div className={cn('flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-2 flex-wrap', className)}>
        <div className="flex items-baseline gap-1 whitespace-nowrap">
          <span className="text-sm sm:text-base font-semibold text-foreground">{cadFormatted}</span>
          <span className="text-xs sm:text-sm text-foreground">CAD</span>
        </div>
        <span className="hidden sm:inline text-foreground">/</span>
        <div className="flex items-baseline gap-1 whitespace-nowrap">
          <span className="text-sm sm:text-base font-semibold text-foreground">{usdFormatted}</span>
          <span className="text-xs sm:text-sm text-foreground">USD</span>
        </div>
      </div>
    );
  }

  // Default variant - responsive layout with label
  return (
    <div className={cn('flex flex-col gap-1 min-w-0', className)}>
      {showLabel && (
        <span className="text-xs sm:text-sm text-foreground font-medium whitespace-nowrap">Amount</span>
      )}
      <div className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-2 flex-wrap">
        <div className="flex items-baseline gap-1 whitespace-nowrap">
          <span className="text-sm sm:text-base font-semibold text-foreground">{cadFormatted}</span>
          <span className="text-xs sm:text-sm text-foreground">CAD</span>
        </div>
        <span className="hidden sm:inline text-foreground">/</span>
        <div className="flex items-baseline gap-1 whitespace-nowrap">
          <span className="text-sm sm:text-base font-semibold text-foreground">{usdFormatted}</span>
          <span className="text-xs sm:text-sm text-foreground">USD</span>
        </div>
      </div>
    </div>
  );
}

/**
 * Display grand total in primary currency with both CAD and USD shown
 */
interface GrandTotalDisplayProps {
  cadAmount: number;
  usdAmount: number;
  primaryCurrency: Currency;
  className?: string;
  variant?: 'default' | 'compact';
  cadToUsdRate?: number;
  usdToCadRate?: number;
}

export function GrandTotalDisplay({
  cadAmount,
  usdAmount,
  primaryCurrency,
  className,
  variant = 'default',
  cadToUsdRate,
  usdToCadRate
}: GrandTotalDisplayProps) {
  const cadToUsd = cadToUsdRate || getCADToUSDRate();
  const usdToCad = usdToCadRate || getUSDToCADRate();
  
  // Convert both to primary currency
  const cadInPrimary = convertCurrency(cadAmount, 'CAD', primaryCurrency, cadToUsd, usdToCad);
  const usdInPrimary = convertCurrency(usdAmount, 'USD', primaryCurrency, cadToUsd, usdToCad);
  const grandTotal = cadInPrimary + usdInPrimary;
  
  // Format numbers
  const cadFormatted = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(cadAmount);
  
  const usdFormatted = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(usdAmount);
  
  const grandTotalFormatted = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(grandTotal);

  if (variant === 'compact') {
    return (
      <div className={cn('flex flex-col gap-1', className)}>
        <div className="flex flex-wrap gap-1 sm:gap-2 items-baseline text-xs sm:text-sm">
          <span className="text-foreground whitespace-nowrap">{cadFormatted} CAD</span>
          {cadAmount > 0 && usdAmount > 0 && <span className="text-foreground">/</span>}
          <span className="text-foreground whitespace-nowrap">{usdFormatted} USD</span>
        </div>
        <div className="text-base sm:text-lg font-bold text-foreground">
          {grandTotalFormatted} {primaryCurrency}
        </div>
      </div>
    );
  }

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <div className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-2 flex-wrap">
        {cadAmount > 0 && (
          <div className="flex items-baseline gap-1 whitespace-nowrap">
            <span className="text-sm sm:text-base font-semibold text-foreground">{cadFormatted}</span>
            <span className="text-xs sm:text-sm text-foreground">CAD</span>
          </div>
        )}
        {cadAmount > 0 && usdAmount > 0 && (
          <span className="hidden sm:inline text-foreground">/</span>
        )}
        {usdAmount > 0 && (
          <div className="flex items-baseline gap-1 whitespace-nowrap">
            <span className="text-sm sm:text-base font-semibold text-foreground">{usdFormatted}</span>
            <span className="text-xs sm:text-sm text-foreground">USD</span>
          </div>
        )}
      </div>
      <div className="flex items-baseline gap-2 pt-1 border-t border-border/50">
        <span className="text-xs sm:text-sm text-foreground font-medium">Grand Total:</span>
        <span className="text-lg sm:text-xl font-bold text-foreground">{grandTotalFormatted}</span>
        <span className="text-xs sm:text-sm text-foreground">{primaryCurrency}</span>
      </div>
    </div>
  );
}


