'use client'

import React from 'react'
import { twMerge } from 'tailwind-merge'

interface TabOption {
    id: string
    label: string
}

interface ModuleTabsProps {
    tabs: TabOption[]
    activeTabId: string
    onTabChange: (id: string) => void
    labelAll?: string
    className?: string
}

export default function ModuleTabs({
    tabs,
    activeTabId,
    onTabChange,
    labelAll,
    className = ''
}: ModuleTabsProps) {
    return (
        <div className={twMerge("flex overflow-x-auto gap-2 p-1.5 bg-white dark:bg-slate-900 rounded-xl border border-gray-100 dark:border-white/5 shadow-sm max-w-full no-scrollbar items-center", className)}>
            {(labelAll || labelAll === undefined) && (
                <button
                    onClick={() => onTabChange('all')}
                    className={twMerge(
                        "px-4 py-2 font-bold text-sm transition-all rounded-lg whitespace-nowrap font-display uppercase tracking-wide",
                        activeTabId === 'all'
                            ? 'bg-pp-gold text-pp-brown shadow-md'
                            : 'text-gray-500 hover:text-pp-brown hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-slate-800 dark:hover:text-amber-400'
                    )}
                >
                    {labelAll || 'Todos'}
                </button>
            )}

            {tabs.map(tab => (
                <button
                    key={tab.id}
                    onClick={() => onTabChange(tab.id)}
                    className={twMerge(
                        "px-4 py-2 font-bold text-sm transition-all rounded-lg whitespace-nowrap font-display uppercase tracking-wide",
                        activeTabId === tab.id
                            ? 'bg-pp-gold text-pp-brown shadow-md'
                            : 'text-gray-500 hover:text-pp-brown hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-slate-800 dark:hover:text-amber-400'
                    )}
                >
                    {tab.label}
                </button>
            ))}
        </div>
    )
}
