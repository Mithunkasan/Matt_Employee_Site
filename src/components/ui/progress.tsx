import * as React from "react"

import { cn } from "@/lib/utils"

const Progress = React.forwardRef<
    HTMLDivElement,
    React.HTMLAttributes<HTMLDivElement> & { value?: number }
>(({ className, value = 0, ...props }, ref) => (
    <div
        ref={ref}
        className={cn(
            "relative h-4 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800",
            className
        )}
        {...props}
    >
        <div
            className="h-full bg-gradient-to-r from-violet-500 to-purple-600 transition-all duration-500 ease-out rounded-full"
            style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
        />
    </div>
))
Progress.displayName = "Progress"

export { Progress }
