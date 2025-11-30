'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface DistanceDisplayProps {
  distance: number;
  className?: string;
  variant?: 'default' | 'compact' | 'inline';
  showLabel?: boolean;
}

/**
 * Responsive distance display component showing both miles and kilometers
 */
export function DistanceDisplay({ 
  distance, 
  className,
  variant = 'default',
  showLabel = true
}: DistanceDisplayProps) {
  const miles = distance || 0;
  const kilometers = miles * 1.60934;

  // Format numbers with proper localization
  const formattedMiles = miles.toLocaleString('en-US', { 
    maximumFractionDigits: miles < 100 ? 1 : 0,
    minimumFractionDigits: 0
  });
  const formattedKm = kilometers.toLocaleString('en-US', { 
    maximumFractionDigits: kilometers < 100 ? 1 : 0,
    minimumFractionDigits: 0
  });

  if (variant === 'inline') {
    return (
      <span className={cn('text-sm sm:text-base inline-flex items-baseline gap-1 flex-wrap', className)}>
        <span className="font-semibold whitespace-nowrap">{formattedMiles}</span>
        <span className="text-muted-foreground text-xs sm:text-sm whitespace-nowrap">mi</span>
        <span className="text-muted-foreground mx-1 sm:mx-1.5 hidden xs:inline">/</span>
        <span className="font-semibold whitespace-nowrap">{formattedKm}</span>
        <span className="text-muted-foreground text-xs sm:text-sm whitespace-nowrap">km</span>
      </span>
    );
  }

  if (variant === 'compact') {
    return (
      <div className={cn('flex flex-col gap-0.5', className)}>
        <div className="text-xs sm:text-sm font-semibold whitespace-nowrap">
          {formattedMiles} <span className="text-muted-foreground font-normal">mi</span>
        </div>
        <div className="text-xs text-muted-foreground whitespace-nowrap">
          {formattedKm} km
        </div>
      </div>
    );
  }

  // Default variant - responsive layout
  return (
    <div className={cn('flex flex-col gap-1 min-w-0', className)}>
      {showLabel && (
        <span className="text-xs sm:text-sm text-muted-foreground font-medium whitespace-nowrap">Distance</span>
      )}
      <div className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-2 flex-wrap">
        <div className="flex items-baseline gap-1 whitespace-nowrap">
          <span className="text-sm sm:text-base font-semibold text-foreground">{formattedMiles}</span>
          <span className="text-xs sm:text-sm text-muted-foreground">mi</span>
        </div>
        <span className="hidden sm:inline text-muted-foreground">/</span>
        <div className="flex items-baseline gap-1 whitespace-nowrap">
          <span className="text-sm sm:text-base font-semibold text-foreground">{formattedKm}</span>
          <span className="text-xs sm:text-sm text-muted-foreground">km</span>
        </div>
      </div>
    </div>
  );
}

