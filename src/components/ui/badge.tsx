import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center justify-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 whitespace-nowrap",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-[#0073ea] text-white shadow-sm hover:bg-[#0058c2] focus:ring-[#0073ea]",
        secondary:
          "border-gray-200 bg-gray-100 text-gray-700 hover:bg-gray-200 focus:ring-gray-400",
        destructive:
          "border-transparent bg-red-100 text-red-700 hover:bg-red-200 focus:ring-red-400 shadow-sm",
        outline: 
          "border-gray-300 bg-transparent text-gray-700 hover:bg-gray-50 focus:ring-gray-400",
        success:
          "border-transparent bg-green-100 text-green-700 hover:bg-green-200 focus:ring-green-400 shadow-sm",
        warning:
          "border-transparent bg-orange-100 text-orange-700 hover:bg-orange-200 focus:ring-orange-400 shadow-sm",
        info:
          "border-transparent bg-blue-100 text-blue-700 hover:bg-blue-200 focus:ring-blue-400 shadow-sm",
        // Monday.com-inspired status variants
        "status-upcoming":
          "border-blue-200 bg-blue-100 text-blue-700 hover:bg-blue-200 focus:ring-blue-400 shadow-sm",
        "status-in-progress":
          "border-orange-200 bg-orange-100 text-orange-700 hover:bg-orange-200 focus:ring-orange-400 shadow-sm",
        "status-completed":
          "border-green-200 bg-green-100 text-green-700 hover:bg-green-200 focus:ring-green-400 shadow-sm",
        "status-on-hold":
          "border-gray-200 bg-gray-100 text-gray-700 hover:bg-gray-200 focus:ring-gray-400 shadow-sm",
      },
      size: {
        default: "px-2.5 py-0.5 text-xs",
        sm: "px-2 py-0.5 text-xs",
        lg: "px-3 py-1 text-sm",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, size, ...props }: BadgeProps) {
  return (
    <div 
      className={cn(badgeVariants({ variant, size }), className)} 
      role="status"
      aria-label={variant ? `Status: ${variant}` : undefined}
      {...props} 
    />
  )
}

Badge.displayName = "Badge"

export { Badge, badgeVariants }
