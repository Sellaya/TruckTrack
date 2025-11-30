'use client';

import React, { useState, useEffect } from 'react';
import { Plus, X, GripVertical, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CityAutocomplete } from '@/components/ui/city-autocomplete';
import type { CityLocation } from '@/lib/address-autocomplete';
import type { RouteStop, Location } from '@/lib/types';
import { cn } from '@/lib/utils';

type MultiStopRouteInputProps = {
  stops: RouteStop[];
  onChange: (stops: RouteStop[]) => void;
  className?: string;
  minStops?: number;
  maxStops?: number;
};

export function MultiStopRouteInput({
  stops,
  onChange,
  className,
  minStops = 2,
  maxStops = 20,
}: MultiStopRouteInputProps) {
  const [localStops, setLocalStops] = useState<RouteStop[]>(stops.length > 0 ? stops : [
    { displayName: '', location: { city: '', state: '', country: '' } },
    { displayName: '', location: { city: '', state: '', country: '' } },
  ]);

  useEffect(() => {
    if (stops.length > 0) {
      setLocalStops(stops);
    }
  }, [stops]);

  const handleStopChange = (index: number, displayName: string, location: CityLocation | null) => {
    const newStops = [...localStops];
    if (location) {
      const loc: Location = {
        city: location.name,
        state: location.state,
        country: location.country,
        latitude: location.latitude,
        longitude: location.longitude,
      };
      newStops[index] = {
        displayName: displayName,
        location: loc,
      };
    } else {
      newStops[index] = {
        displayName: displayName,
        location: { city: '', state: '', country: '' },
      };
    }
    setLocalStops(newStops);
    onChange(newStops);
  };

  const addStop = () => {
    if (localStops.length < maxStops) {
      const newStops = [
        ...localStops,
        { displayName: '', location: { city: '', state: '', country: '' } },
      ];
      setLocalStops(newStops);
      onChange(newStops);
    }
  };

  const removeStop = (index: number) => {
    if (localStops.length > minStops) {
      const newStops = localStops.filter((_, i) => i !== index);
      setLocalStops(newStops);
      onChange(newStops);
    }
  };

  return (
    <div className={cn("space-y-2", className)}>
      {localStops.map((stop, index) => (
        <div key={index} className="flex items-start gap-2">
          <div className="flex-1 min-w-0">
            <CityAutocomplete
              value={stop.displayName}
              onChange={(value, location) => handleStopChange(index, value, location)}
              placeholder={
                index === 0
                  ? "Start city..."
                  : index === localStops.length - 1
                  ? "Final destination..."
                  : `Stop ${index + 1}...`
              }
              label={
                index === 0
                  ? "Origin *"
                  : index === localStops.length - 1
                  ? "Final Destination *"
                  : `Stop ${index + 1}`
              }
            />
          </div>
          {localStops.length > minStops && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => removeStop(index)}
              className="mt-7 h-9 w-9 flex-shrink-0 text-destructive hover:text-destructive hover:bg-destructive/10"
              disabled={localStops.length <= minStops}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      ))}
      
      {localStops.length < maxStops && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addStop}
          className="w-full gap-2 mt-2"
        >
          <Plus className="h-4 w-4" />
          Add Stop
        </Button>
      )}
      
      {localStops.length >= maxStops && (
        <p className="text-xs text-muted-foreground text-center mt-1">
          Maximum {maxStops} stops reached
        </p>
      )}
    </div>
  );
}

