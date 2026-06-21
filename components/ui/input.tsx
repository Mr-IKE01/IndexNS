import * as React from 'react'
import { cn } from '@/lib/utils'

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<'input'>>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          'flex h-10 w-full rounded-lg border px-3 py-2 text-sm transition-all duration-200',
          'bg-[#1a1530] border-[#2d2552] text-zinc-100 placeholder:text-zinc-600',
          'focus-visible:outline-none focus-visible:border-teal-500/50 focus-visible:ring-2 focus-visible:ring-teal-500/10',
          'disabled:cursor-not-allowed disabled:opacity-50',
          'file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-zinc-200',
          className,
        )}
        ref={ref}
        {...props}
      />
    )
  },
)
Input.displayName = 'Input'

export { Input }
