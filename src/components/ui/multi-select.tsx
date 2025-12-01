"use client";

import * as React from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Check, ChevronDown, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface MultiSelectOption {
  value: string;
  label: string;
}

interface MultiSelectProps {
  options: MultiSelectOption[];
  selected: string[];
  onSelectionChange: (selected: string[]) => void;
  placeholder?: string;
  label?: string;
  className?: string;
  maxDisplay?: number;
}

export function MultiSelect({
  options,
  selected,
  onSelectionChange,
  placeholder = "Select options...",
  label,
  className,
  maxDisplay = 2,
}: MultiSelectProps) {
  const [open, setOpen] = React.useState(false);

  const handleToggle = (value: string) => {
    const newSelected = selected.includes(value)
      ? selected.filter((s) => s !== value)
      : [...selected, value];
    onSelectionChange(newSelected);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelectionChange([]);
  };

  const selectedOptions = options.filter((opt) => selected.includes(opt.value));
  const displayText =
    selected.length === 0
      ? placeholder
      : selected.length <= maxDisplay
      ? selectedOptions.map((opt) => opt.label).join(", ")
      : `${selected.length} selected`;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "h-9 justify-between min-w-[200px] text-left font-normal",
            !selected.length && "text-muted-foreground",
            className
          )}
        >
          <span className="truncate flex-1">{displayText}</span>
          <div className="flex items-center gap-1 ml-2">
            {selected.length > 0 && (
              <X
                className="h-4 w-4 opacity-50 hover:opacity-100"
                onClick={handleClear}
              />
            )}
            <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
          </div>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <div className="max-h-[300px] overflow-y-auto">
          {label && (
            <div className="px-3 py-2 border-b">
              <p className="text-sm font-semibold">{label}</p>
            </div>
          )}
          <div className="p-1">
            {options.map((option) => (
              <div
                key={option.value}
                className="flex items-center space-x-2 rounded-sm px-2 py-1.5 hover:bg-accent cursor-pointer"
                onClick={() => handleToggle(option.value)}
              >
                <Checkbox
                  checked={selected.includes(option.value)}
                  onCheckedChange={() => handleToggle(option.value)}
                />
                <label
                  className="flex-1 text-sm font-normal cursor-pointer"
                  onClick={(e) => e.preventDefault()}
                >
                  {option.label}
                </label>
              </div>
            ))}
          </div>
          {selected.length > 0 && (
            <div className="px-3 py-2 border-t flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                {selected.length} selected
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onSelectionChange([])}
                className="h-7 text-xs"
              >
                Clear all
              </Button>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}





