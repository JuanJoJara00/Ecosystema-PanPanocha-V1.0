import { SelectHTMLAttributes, forwardRef } from 'react'
import { twMerge } from 'tailwind-merge'
import { ChevronDown } from 'lucide-react'

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
    label?: string
    error?: string
    fullWidth?: boolean
    options?: { value: string | number; label: string }[]
}

const Select = forwardRef<HTMLSelectElement, SelectProps>(({
    className,
    label,
    error,
    fullWidth = true,
    disabled,
    children,
    options,
    ...props
}, ref) => {
    return (
        <div className={twMerge('flex flex-col gap-1.5', fullWidth ? 'w-full' : 'w-auto')}>
            {label && (
                <label className="text-xs font-bold text-gray-700 font-display uppercase tracking-wide ml-1">
                    {label}
                </label>
            )}
            <div className="relative group">
                <select
                    ref={ref}
                    className={twMerge(
                        'w-full bg-gray-50 border border-gray-200 text-gray-900 rounded-xl px-4 py-2.5 outline-none transition-all duration-200 appearance-none',
                        'focus:bg-white focus:border-pp-gold focus:ring-4 focus:ring-pp-gold/10',
                        'font-sans cursor-pointer',
                        disabled && 'opacity-60 cursor-not-allowed bg-gray-100',
                        error && 'border-red-300 focus:border-red-500 focus:ring-red-100',
                        className
                    )}
                    disabled={disabled}
                    {...props}
                >
                    {options ? (
                        <>
                            <option value="">Seleccionar...</option>
                            {options.map(opt => (
                                <option key={opt.value} value={opt.value}>
                                    {opt.label}
                                </option>
                            ))}
                        </>
                    ) : children}
                </select>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400 group-hover:text-pp-gold transition-colors">
                    <ChevronDown className="h-4 w-4" />
                </div>
            </div>
            {error && <span className="text-xs text-red-500 font-medium ml-1 animate-fade-in-up">{error}</span>}
        </div>
    )
})

Select.displayName = 'Select'

export default Select
