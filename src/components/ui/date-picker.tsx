"use client"

import * as React from "react"
import { format } from "date-fns"
import { Calendar as CalendarIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

interface DatePickerProps {
  value?: string
  onChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
  className?: string
  id?: string
  required?: boolean
  minDate?: Date // Minimum selectable date
}

// Check if device is mobile/tablet - more reliable detection
function useIsMobileDevice() {
  // Default to mobile on first render to avoid flash of desktop version
  const [isMobile, setIsMobile] = React.useState<boolean>(() => {
    // SSR-safe: assume mobile initially if we can check
    if (typeof window !== 'undefined') {
      return window.innerWidth < 1024
    }
    return true // Default to mobile on server
  })

  React.useEffect(() => {
    const checkMobile = () => {
      // Use screen width as primary indicator - tablets and phones
      const width = window.innerWidth
      const isSmallScreen = width < 1024
      
      // Also check for touch capability
      const isTouchDevice = 'ontouchstart' in window || 
                           (navigator.maxTouchPoints && navigator.maxTouchPoints > 0) ||
                           ('msMaxTouchPoints' in navigator && (navigator as any).msMaxTouchPoints > 0)
      
      // Check user agent as additional hint
      const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera
      const isMobileUA = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent.toLowerCase())
      
      // Use small screen OR (touch device and mobile UA) OR (touch device on small screens)
      setIsMobile(isSmallScreen || isMobileUA || (isTouchDevice && width < 1280))
    }

    // Check immediately
    checkMobile()
    
    // Listen for resize and orientation changes
    window.addEventListener('resize', checkMobile, { passive: true })
    window.addEventListener('orientationchange', checkMobile, { passive: true })
    
    return () => {
      window.removeEventListener('resize', checkMobile)
      window.removeEventListener('orientationchange', checkMobile)
    }
  }, [])

  return isMobile
}

export function DatePicker({
  value,
  onChange,
  placeholder = "Pick a date",
  disabled = false,
  className,
  id,
  required,
  minDate,
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false)
  const isMobile = useIsMobileDevice()
  
  // Parse date value - handle both ISO string and yyyy-MM-dd format
  const date = React.useMemo(() => {
    if (!value) return undefined;
    try {
      // Try parsing as yyyy-MM-dd format first
      if (value.includes('-') && !value.includes('T')) {
        const parts = value.split('-');
        if (parts.length === 3) {
          const year = parseInt(parts[0], 10);
          const month = parseInt(parts[1], 10) - 1; // Month is 0-indexed
          const day = parseInt(parts[2], 10);
          const dateObj = new Date(year, month, day);
          if (!isNaN(dateObj.getTime())) {
            return dateObj;
          }
        }
      }
      // Try parsing as ISO string
      const parsed = new Date(value);
      if (!isNaN(parsed.getTime())) {
        return parsed;
      }
      return undefined;
    } catch {
      return undefined;
    }
  }, [value]);

  // Format date for native input (yyyy-MM-dd)
  const nativeInputValue = React.useMemo(() => {
    if (!date) return '';
    return format(date, 'yyyy-MM-dd');
  }, [date]);

  // Get min date for native input
  const nativeMinDate = React.useMemo(() => {
    if (minDate) {
      return format(minDate, 'yyyy-MM-dd');
    }
    return undefined;
  }, [minDate]);

  // Handle native input change
  const handleNativeInputChange = React.useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    if (inputValue) {
      onChange(inputValue);
    } else {
      onChange('');
    }
  }, [onChange]);

  // Normalize dates for comparison (remove time component)
  const normalizeDate = React.useCallback((d: Date): Date => {
    const normalized = new Date(d);
    normalized.setHours(0, 0, 0, 0);
    normalized.setMinutes(0, 0);
    normalized.setSeconds(0);
    normalized.setMilliseconds(0);
    return normalized;
  }, []);

  const handleDateSelect = React.useCallback((selectedDate: Date | undefined) => {
    if (selectedDate && !isNaN(selectedDate.getTime())) {
      // Format as yyyy-MM-dd for consistent storage
      const formattedDate = format(selectedDate, "yyyy-MM-dd");
      onChange(formattedDate);
      // Close popover after a short delay to ensure state updates
      setTimeout(() => {
        setOpen(false);
      }, 100);
    }
  }, [onChange]);

  const isDateDisabled = React.useCallback((dateToCheck: Date): boolean => {
    try {
      if (isNaN(dateToCheck.getTime())) {
        return true;
      }
      
      const normalizedCheck = normalizeDate(dateToCheck);
      
      if (minDate) {
        const normalizedMin = normalizeDate(minDate);
        // Disable dates before minDate (allow minDate and after)
        return normalizedCheck.getTime() < normalizedMin.getTime();
      }
      
      return false;
    } catch (error) {
      console.error('Error checking date disabled:', error);
      return false;
    }
  }, [minDate, normalizeDate]);

  // ALWAYS use native date input on mobile/tablet for best UX
  if (isMobile) {
    return (
      <div className="relative w-full">
        <input
          id={id}
          type="date"
          value={nativeInputValue}
          onChange={handleNativeInputChange}
          min={nativeMinDate}
          disabled={disabled}
          required={required}
          className={cn(
            // Monday.com inspired styling - clean and modern
            "flex h-11 w-full rounded-lg border border-gray-300 bg-white",
            "px-4 py-2.5 text-base font-medium text-gray-900",
            "focus:outline-none focus:ring-2 focus:ring-[#0073ea]/20 focus:border-[#0073ea]",
            "disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-gray-50",
            "transition-all duration-200",
            // Mobile-specific improvements
            "touch-manipulation", // Better touch handling
            "[color-scheme:light]", // Better mobile date picker appearance
            disabled && "bg-gray-50",
            className
          )}
          placeholder={placeholder}
        />
      </div>
    );
  }

  // Desktop: Use Monday.com styled button with calendar popover
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          variant={"outline"}
          className={cn(
            // Monday.com inspired button styling
            "w-full justify-start text-left font-medium h-11",
            "rounded-lg border-gray-300 bg-white hover:bg-gray-50",
            "text-gray-900 hover:text-gray-900",
            "focus:outline-none focus:ring-2 focus:ring-[#0073ea] focus:border-[#0073ea]",
            "transition-all duration-200",
            !date && "text-gray-400",
            className
          )}
          disabled={disabled}
          type="button"
        >
          <CalendarIcon className="mr-2 h-4 w-4 text-gray-500" />
          {date ? format(date, "MMM d, yyyy") : <span>{placeholder}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-auto p-0 shadow-lg z-[100] rounded-xl border-gray-200" 
        align="start"
        side="bottom"
        sideOffset={4}
      >
        <Calendar
          mode="single"
          selected={date}
          onSelect={handleDateSelect}
          disabled={isDateDisabled}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  )
}
