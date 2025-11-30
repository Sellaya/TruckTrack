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
import { useIsMobile } from "@/hooks/use-mobile"

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
  const isMobile = useIsMobile()
  
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
    // Default: today
    return format(new Date(), 'yyyy-MM-dd');
  }, [minDate]);

  // Handle native input change
  const handleNativeInputChange = React.useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    if (inputValue) {
      onChange(inputValue);
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
        // Compare dates by converting to time for accurate comparison
        return normalizedCheck.getTime() < normalizedMin.getTime();
      }
      
      // Default: disable past dates (but allow today and future)
      const today = normalizeDate(new Date());
      // Allow today and future dates, disable only past dates
      // Use getTime() for accurate comparison
      return normalizedCheck.getTime() < today.getTime();
    } catch (error) {
      // If there's an error, don't disable (allow selection)
      console.error('Error checking date disabled:', error);
      return false;
    }
  }, [minDate, normalizeDate]);

  // Use native date input on mobile for better UX and reliability
  if (isMobile) {
    return (
      <div className="relative w-full">
        <CalendarIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none z-10" />
        <input
          id={id}
          type="date"
          value={nativeInputValue}
          onChange={handleNativeInputChange}
          min={nativeMinDate}
          disabled={disabled}
          required={required}
          className={cn(
            "flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background",
            "file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground",
            "placeholder:text-muted-foreground",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
            "disabled:cursor-not-allowed disabled:opacity-50",
            "md:text-sm pl-9 pr-3",
            !nativeInputValue && "text-muted-foreground",
            className
          )}
        />
      </div>
    );
  }

  // Desktop: Use calendar popover
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          variant={"outline"}
          className={cn(
            "w-full justify-start text-left font-normal h-11",
            !date && "text-muted-foreground",
            className
          )}
          disabled={disabled}
          type="button"
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {date ? format(date, "PPP") : <span>{placeholder}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-auto p-0 shadow-lg z-[100]" 
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
