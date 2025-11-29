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

  // Normalize dates for comparison (remove time component)
  const normalizeDate = React.useCallback((d: Date): Date => {
    const normalized = new Date(d);
    normalized.setHours(0, 0, 0, 0);
    normalized.setMinutes(0, 0, 0);
    normalized.setSeconds(0, 0);
    normalized.setMilliseconds(0);
    return normalized;
  }, []);

  const handleDateSelect = React.useCallback((selectedDate: Date | undefined) => {
    console.log('Date selected:', selectedDate);
    if (selectedDate && !isNaN(selectedDate.getTime())) {
      // Format as yyyy-MM-dd for consistent storage
      const formattedDate = format(selectedDate, "yyyy-MM-dd");
      console.log('Formatted date:', formattedDate);
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
        className="w-auto p-0 shadow-lg" 
        align="start"
        side="bottom"
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
