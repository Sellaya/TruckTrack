'use client';

import { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MapPin, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { searchCities, formatCityLocation, type CityLocation, getGeoDBAPIKey } from '@/lib/address-autocomplete';

interface CityAutocompleteProps {
  value: string;
  onChange: (value: string, location?: CityLocation) => void;
  placeholder?: string;
  label?: string;
}

export function CityAutocomplete({
  value,
  onChange,
  placeholder = 'Search city...',
  label,
}: CityAutocompleteProps) {
  const [open, setOpen] = useState(false);
  const [cities, setCities] = useState<CityLocation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<CityLocation | null>(null);
  const debounceRef = useRef<NodeJS.Timeout>();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Clear previous debounce
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    // If value is empty or too short, clear results
    if (!value || value.length < 2) {
      setCities([]);
      setOpen(false);
      return;
    }

    // Debounce API calls
    setIsLoading(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const apiKey = getGeoDBAPIKey();
        const results = await searchCities(value, apiKey);
        setCities(results);
        setOpen(results.length > 0);
      } catch (error) {
        console.error('Error searching cities:', error);
        setCities([]);
      } finally {
        setIsLoading(false);
      }
    }, 300);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [value]);

  const handleSelect = (city: CityLocation) => {
    const formatted = formatCityLocation(city);
    setSelectedLocation(city);
    onChange(formatted, city);
    setOpen(false);
    // Focus back to input after selection
    setTimeout(() => {
      inputRef.current?.focus();
    }, 0);
  };

  const handleInputFocus = () => {
    // Open popover if there are results
    if (cities.length > 0) {
      setOpen(true);
    }
  };

  const handleInputMouseDown = (e: React.MouseEvent<HTMLInputElement>) => {
    // Prevent PopoverTrigger from interfering with input focus
    e.stopPropagation();
    
    // Immediately focus and select the input
    const input = e.currentTarget;
    requestAnimationFrame(() => {
      input.focus();
      input.select();
    });
  };

  const handleInputClick = (e: React.MouseEvent<HTMLInputElement>) => {
    // Prevent PopoverTrigger from handling the click
    e.stopPropagation();
    
    // Focus and select the input
    const input = e.currentTarget;
    input.focus();
    input.select();
    
    // Open popover if there are results
    if (cities.length > 0) {
      setOpen(true);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <div className="w-full">
        {label && (
          <label className="text-sm font-medium mb-1 block">{label}</label>
        )}
        <PopoverTrigger asChild>
          <div className="relative">
            <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none z-10" />
            <Input
              ref={inputRef}
              value={value}
              onChange={(e) => onChange(e.target.value)}
              placeholder={placeholder}
              className="pl-9"
              onFocus={handleInputFocus}
              onMouseDown={handleInputMouseDown}
              onClick={handleInputClick}
            />
            {isLoading && (
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
                <div className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            )}
          </div>
        </PopoverTrigger>
      </div>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <ScrollArea className="h-[300px]">
          {isLoading && (
            <div className="flex items-center justify-center p-4">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              <span className="ml-2 text-sm text-muted-foreground">Searching...</span>
            </div>
          )}
          {!isLoading && cities.length === 0 && (
            <div className="p-4 text-sm text-muted-foreground text-center">
              No cities found. Try a different search.
            </div>
          )}
          {!isLoading && cities.length > 0 && (
            <div className="p-1">
              <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                Cities
              </div>
              {cities.map((city) => {
                const formatted = formatCityLocation(city);
                const isSelected = selectedLocation?.name === city.name && 
                                   selectedLocation?.state === city.state;
                return (
                  <div
                    key={`${city.name}-${city.state}-${city.country}`}
                    onClick={() => handleSelect(city)}
                    className={cn(
                      'relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none',
                      'hover:bg-accent hover:text-accent-foreground',
                      isSelected && 'bg-accent text-accent-foreground'
                    )}
                  >
                    <div className="flex flex-col flex-1">
                      <span className="font-medium">{city.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {city.state}, {city.country}
                        {city.latitude && city.longitude && (
                          <span className="ml-2">
                            ({city.latitude.toFixed(4)}, {city.longitude.toFixed(4)})
                          </span>
                        )}
                        {city.type && (
                          <span className="ml-2 text-xs">• {city.type}</span>
                        )}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}

