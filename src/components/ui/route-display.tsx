'use client';

import React from 'react';
import { MapPin, ArrowRight } from 'lucide-react';
import type { RouteStop, Location } from '@/lib/types';
import { cn } from '@/lib/utils';

type RouteDisplayProps = {
  stops: RouteStop[];
  origin?: string;
  destination?: string;
  originLocation?: Location;
  destinationLocation?: Location;
  className?: string;
  variant?: 'compact' | 'default';
  maxStops?: number; // Maximum number of stops to show before truncating
};

export function RouteDisplay({
  stops,
  origin,
  destination,
  originLocation,
  destinationLocation,
  className,
  variant = 'default',
  maxStops = 5,
}: RouteDisplayProps) {
  // Build stops array from stops prop or legacy origin/destination
  const routeStops: RouteStop[] = [];
  
  if (stops && stops.length > 0) {
    // Use stops array if provided
    routeStops.push(...stops);
  } else if (origin && destination) {
    // Fall back to legacy origin/destination
    if (originLocation) {
      routeStops.push({
        displayName: origin,
        location: originLocation,
      });
    }
    if (destinationLocation) {
      routeStops.push({
        displayName: destination,
        location: destinationLocation,
      });
    }
  }

  if (routeStops.length === 0) {
    return (
      <div className={cn("flex items-center gap-1 text-muted-foreground", className)}>
        <MapPin className="h-3 w-3" />
        <span className="text-xs">Route TBD</span>
      </div>
    );
  }

  const displayStops = variant === 'compact' && routeStops.length > maxStops
    ? [
        routeStops[0],
        { displayName: `+${routeStops.length - 2} stops`, location: routeStops[0].location },
        routeStops[routeStops.length - 1],
      ]
    : routeStops;

  if (variant === 'compact') {
    return (
      <div className={cn("flex items-center gap-1 flex-wrap", className)}>
        {displayStops.map((stop, index) => (
          <React.Fragment key={index}>
            <span className="text-xs font-medium text-foreground truncate max-w-[120px]">
              {stop.displayName}
            </span>
            {index < displayStops.length - 1 && (
              <ArrowRight className="h-3 w-3 text-muted-foreground flex-shrink-0" />
            )}
          </React.Fragment>
        ))}
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col gap-1", className)}>
      {displayStops.map((stop, index) => (
        <div key={index} className="flex items-start gap-2">
          {index < displayStops.length - 1 ? (
            <ArrowRight className="h-3.5 w-3.5 text-muted-foreground mt-0.5 flex-shrink-0" />
          ) : (
            <MapPin className="h-3.5 w-3.5 text-primary mt-0.5 flex-shrink-0" />
          )}
          <span className="text-sm text-foreground">{stop.displayName}</span>
        </div>
      ))}
    </div>
  );
}

