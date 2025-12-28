'use client'

import React from 'react'
import { Search } from 'lucide-react'
import { twMerge } from 'tailwind-merge'

interface ModuleHeaderProps {
    searchTerm?: string
    onSearchChange?: (value: string) => void
    searchPlaceholder?: string
    actions?: React.ReactNode
    children?: React.ReactNode
    className?: string
}

export default function ModuleHeader({
    searchTerm,
    onSearchChange,
    searchPlaceholder = 'Buscar...',
    actions,
    children,
    className = ''
}: ModuleHeaderProps) {
    return (
        <div className={twMerge(
            "flex flex-col md:flex-row gap-4 items-start md:items-center justify-between sticky top-0 z-30 py-4 bg-gray-50/80 backdrop-blur-md transition-all -mx-4 px-4 md:-mx-8 md:px-8 shadow-sm",
            className
        )}>
            {/* Search */}
            {/* Left Side: Search + Filters */}
            <div className="flex flex-col md:flex-row gap-4 w-full md:w-auto items-center flex-1">
                <div className="relative w-full md:max-w-xs group">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-pp-gold transition-colors">
                        <Search className="h-4 w-4" />
                    </div>
                    {onSearchChange && (
                        <input
                            type="text"
                            placeholder={searchPlaceholder}
                            className="pl-10 pr-4 py-2.5 w-full bg-white border border-gray-200 rounded-xl focus:ring-4 focus:ring-pp-gold/10 focus:border-pp-gold outline-none transition-all text-sm font-sans placeholder:text-gray-400"
                            value={searchTerm || ''}
                            onChange={(e) => onSearchChange(e.target.value)}
                        />
                    )}
                </div>
                {children}
            </div>

            <div className="flex gap-2 w-full sm:w-auto items-center flex-wrap sm:flex-nowrap">
                {actions}
            </div>
        </div>
    )
}
