'use client'

import React from 'react'
import { twMerge } from 'tailwind-merge'
import { LucideIcon } from 'lucide-react'

interface KpiCardProps {
    title: string
    value: string | number
    icon: LucideIcon
    colorTheme?: 'yellow' | 'blue' | 'red' | 'green' | 'purple'
    trend?: {
        value: number
        isPositive: boolean
    }
    onClick?: () => void
    isActive?: boolean
    className?: string
}

const THEME_STYLES = {
    yellow: {
        active: 'bg-white dark:bg-slate-800 border-yellow-400 shadow-md',
        inactive: 'bg-white dark:bg-slate-800 border-transparent shadow-sm hover:border-yellow-200 dark:hover:border-yellow-500/30',
        iconBg: 'bg-yellow-100 text-yellow-700',
        iconBgInactive: 'bg-gray-100 text-gray-400',
        title: 'text-yellow-600',
        text: 'text-gray-800 dark:text-white',
        textInactive: 'text-gray-600 dark:text-gray-400',
        decoration: 'bg-yellow-400/10'
    },
    blue: {
        active: 'bg-white dark:bg-slate-800 border-blue-400 shadow-md',
        inactive: 'bg-white dark:bg-slate-800 border-transparent shadow-sm hover:border-blue-200 dark:hover:border-blue-500/30',
        iconBg: 'bg-blue-100 text-blue-700',
        iconBgInactive: 'bg-gray-100 text-gray-400',
        title: 'text-blue-600',
        text: 'text-gray-800 dark:text-white',
        textInactive: 'text-gray-600 dark:text-gray-400',
        decoration: 'bg-blue-400/10'
    },
    red: {
        active: 'bg-white dark:bg-slate-800 border-red-400 shadow-md',
        inactive: 'bg-white dark:bg-slate-800 border-transparent shadow-sm hover:border-red-200 dark:hover:border-red-500/30',
        iconBg: 'bg-red-100 text-red-700',
        iconBgInactive: 'bg-gray-100 text-gray-400',
        title: 'text-red-600',
        text: 'text-gray-800 dark:text-white',
        textInactive: 'text-gray-600 dark:text-gray-400',
        decoration: 'bg-red-400/10'
    },
    green: {
        active: 'bg-white dark:bg-slate-800 border-green-400 shadow-md',
        inactive: 'bg-white dark:bg-slate-800 border-transparent shadow-sm hover:border-green-200 dark:hover:border-green-500/30',
        iconBg: 'bg-green-100 text-green-700',
        iconBgInactive: 'bg-gray-100 text-gray-400',
        title: 'text-green-600',
        text: 'text-gray-800 dark:text-white',
        textInactive: 'text-gray-600 dark:text-gray-400',
        decoration: 'bg-green-400/10'
    },
    purple: {
        active: 'bg-white dark:bg-slate-800 border-purple-400 shadow-md',
        inactive: 'bg-white dark:bg-slate-800 border-transparent shadow-sm hover:border-purple-200 dark:hover:border-purple-500/30',
        iconBg: 'bg-purple-100 text-purple-700',
        iconBgInactive: 'bg-gray-100 text-gray-400',
        title: 'text-purple-600',
        text: 'text-gray-800 dark:text-white',
        textInactive: 'text-gray-600 dark:text-gray-400',
        decoration: 'bg-purple-400/10'
    }
}

export default function KpiCard({
    title,
    value,
    icon: Icon,
    colorTheme = 'yellow',
    trend,
    onClick,
    isActive = false,
    className
}: KpiCardProps) {
    const styles = THEME_STYLES[colorTheme]

    // Determine activation state styling:
    // If onClick is provided, we assume it can be active/inactive.
    // If isActive is strictly true, use active styles.
    // If onClick is NOT provided, it's a static card, so use "active-like" visual but no border emphasis unless specified.
    // Actually, let's treat `isActive=true` as "Highlighted". Default to inactive if clickable but not active.

    // For static dashboards (Inventory), cards might just sit there. Let's assume they are "active" in look but not interactive unless onClick.
    const isInteractive = !!onClick
    const baseStyle = (isInteractive && isActive) || (!isInteractive)
        ? styles.active
        : styles.inactive

    return (
        <div
            onClick={onClick}
            className={twMerge(
                `relative overflow-hidden p-6 rounded-3xl border-2 transition-all duration-200 group`,
                isInteractive ? 'cursor-pointer transform hover:scale-[1.02] hover:shadow-lg' : '',
                baseStyle,
                className
            )}
        >
            {/* Decoration Circle */}
            <div className={twMerge("absolute top-0 right-0 w-32 h-32 rounded-full -mr-16 -mt-16 transition-transform group-hover:scale-110", styles.decoration)} />

            <div className="relative z-10">
                <div className="flex items-center gap-3 mb-3">
                    <div className={twMerge(
                        "p-2 rounded-xl transition-colors",
                        (isActive || !isInteractive) ? styles.iconBg : styles.iconBgInactive
                    )}>
                        <Icon className="w-5 h-5" />
                    </div>
                    <h4 className={twMerge(
                        "text-xs font-bold uppercase tracking-widest",
                        (isActive || !isInteractive) ? styles.title : styles.textInactive
                    )}>
                        {title}
                    </h4>
                </div>

                <div className="flex items-end gap-2 justify-between">
                    <p className={twMerge(
                        "text-2xl font-black tracking-tight",
                        (isActive || !isInteractive) ? styles.text : styles.textInactive
                    )}>
                        {value}
                    </p>

                    {trend && (
                        <div className={`flex items-center gap-1 text-xs font-bold ${trend.isPositive ? 'text-green-500' : 'text-red-500'}`}>
                            <span>{trend.isPositive ? '+' : ''}{trend.value}%</span>
                        </div>
                    )}
                </div>

            </div>
        </div>
    )
}
