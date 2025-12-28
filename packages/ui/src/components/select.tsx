import * as React from "react"
import { cn } from "../lib/utils"
import { ChevronDown } from "lucide-react"

export interface SelectProps
    extends React.SelectHTMLAttributes<HTMLSelectElement> {
    startIcon?: React.ReactNode
}

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
    ({ className, children, startIcon, ...props }, ref) => {
        return (
            <div className="relative w-full">
                {/* Start Icon */}
                {startIcon && (
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground z-10 pointer-events-none [&>svg]:w-4 [&>svg]:h-4">
                        {startIcon}
                    </div>
                )}

                <select
                    className={cn(
                        "flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 appearance-none bg-none",
                        startIcon && "pl-10",
                        className
                    )}
                    ref={ref}
                    style={{
                        WebkitAppearance: 'none',
                        MozAppearance: 'none',
                        appearance: 'none',
                    }}
                    {...props}
                >
                    {children}
                </select>

                {/* Custom Arrow */}
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground">
                    <ChevronDown className="h-4 w-4 opacity-50" />
                </div>
            </div>
        )
    }
)
Select.displayName = "Select"

export { Select }
