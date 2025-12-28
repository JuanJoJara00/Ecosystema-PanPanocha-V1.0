'use client'

import React from 'react'
import { DollarSign, Package, AlertTriangle, Clock, TrendingDown, Box, TrendingUp, Activity } from 'lucide-react'
import KpiCard from '@/components/ui/dashboard/KpiCard'

// Data Types
export interface KPI {
    title: string
    value: string
    icon: any
    theme: 'yellow' | 'blue' | 'red' | 'green' | 'purple'
    trend?: { value: number, isPositive: boolean }
}

interface InventoryMetricsProps {
    kpis: KPI[]
    widgets: {
        criticalCount: number
        criticalNames: string
        categoryCount: number
        totalItems: number
    }
    loading?: boolean
}

export default function InventoryMetrics({ kpis, widgets, loading = false }: InventoryMetricsProps) {
    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500 mb-8">

            {/* BLUE ZONE: KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                {kpis.map((kpi, idx) => (
                    <KpiCard
                        key={idx}
                        title={kpi.title}
                        value={kpi.value}
                        icon={kpi.icon}
                        colorTheme={kpi.theme}
                        trend={kpi.trend}
                    />
                ))}
            </div>

            {/* RED ZONE: Bento Box Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-auto lg:h-[500px]">

                {/* Left: Main Chart (2/3 width) */}
                <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-3xl p-8 shadow-sm border border-gray-100 dark:border-white/5 relative overflow-hidden group">
                    <div className="flex justify-between items-center mb-6 relative z-10">
                        <div>
                            <h3 className="text-lg font-bold text-gray-800 dark:text-white font-display uppercase tracking-wide">Movimiento de Inventario</h3>
                            <p className="text-sm text-gray-400 font-medium">Valoración de stock últimos 30 días</p>
                        </div>
                        <div className="flex bg-gray-100 dark:bg-slate-800 rounded-lg p-1 gap-1">
                            <button className="px-3 py-1 text-xs font-bold text-white bg-pp-brown rounded-md shadow-sm">Valor ($)</button>
                            <button className="px-3 py-1 text-xs font-bold text-gray-500 dark:text-gray-400 hover:text-gray-700">Unidades</button>
                        </div>
                    </div>

                    {/* Placeholder Chart Visualization */}
                    <div className="absolute inset-x-0 bottom-0 top-20 flex items-end justify-center px-4 opacity-80">
                        {/* Simulated Area Chart using CSS/SVG for Skeleton look */}
                        <svg viewBox="0 0 1000 400" className="w-full h-full preserve-3d">
                            <path d="M0,400 L0,300 C200,350 400,200 600,250 S800,100 1000,150 L1000,400 Z" fill="url(#chart-grad)" />
                            <defs>
                                <linearGradient id="chart-grad" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#F6B323" stopOpacity="0.3" />
                                    <stop offset="100%" stopColor="#F6B323" stopOpacity="0" />
                                </linearGradient>
                            </defs>
                            <path d="M0,300 C200,350 400,200 600,250 S800,100 1000,150" fill="none" stroke="#F6B323" strokeWidth="4" />
                        </svg>

                        {/* Overlay Text */}
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <div className="bg-white/90 dark:bg-slate-800/90 backdrop-blur px-6 py-3 rounded-2xl border border-dashed border-gray-300 dark:border-gray-700 text-gray-400 text-sm font-medium">
                                Gráfico de Movimientos (Placeholder)
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right: 4 Small Widgets (1/3 width, internal 2x2 custom grid) */}
                <div className="grid grid-cols-2 grid-rows-2 gap-4 lg:col-span-1 h-full">

                    {/* Widget 1: Top Low Stock */}
                    <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 shadow-sm border border-gray-100 dark:border-white/5 flex flex-col justify-between group hover:border-red-200 transition-colors">
                        <div className="flex justify-between items-start">
                            <div className="p-2 bg-red-50 dark:bg-red-900/20 text-red-600 rounded-xl">
                                <TrendingDown className="w-5 h-5" />
                            </div>
                            <span className="text-2xl font-black text-gray-800 dark:text-gray-100">{widgets.criticalCount}</span>
                        </div>
                        <div>
                            <p className="text-xs font-bold uppercase text-gray-400 tracking-wider">Top Críticos</p>
                            <p className="text-xs text-gray-500 mt-1 truncate">{widgets.criticalNames || 'Todo en orden'}</p>
                        </div>
                    </div>

                    {/* Widget 2: Category Dist */}
                    <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 shadow-sm border border-gray-100 dark:border-white/5 flex flex-col justify-between group hover:border-blue-200 transition-colors">
                        <div className="flex justify-between items-start">
                            <div className="p-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 rounded-xl">
                                <Box className="w-5 h-5" />
                            </div>
                            <span className="text-2xl font-black text-gray-800 dark:text-gray-100">{widgets.categoryCount}</span>
                        </div>
                        <div>
                            <p className="text-xs font-bold uppercase text-gray-400 tracking-wider">Categorías (Est.)</p>
                            <div className="w-full bg-gray-100 h-1.5 rounded-full mt-2 overflow-hidden flex">
                                <div className="w-[40%] bg-blue-500 h-full" />
                                <div className="w-[30%] bg-yellow-500 h-full" />
                                <div className="w-[30%] bg-red-500 h-full" />
                            </div>
                        </div>
                    </div>

                    {/* Widget 3: Most Consumed */}
                    <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 shadow-sm border border-gray-100 dark:border-white/5 flex flex-col justify-between group hover:border-green-200 transition-colors">
                        <div className="flex justify-between items-start">
                            <div className="p-2 bg-green-50 dark:bg-green-900/20 text-green-600 rounded-xl">
                                <TrendingUp className="w-5 h-5" />
                            </div>
                            <span className="text-2xl font-black text-gray-800 dark:text-gray-100">--</span>
                        </div>
                        <div>
                            <p className="text-xs font-bold uppercase text-gray-400 tracking-wider">Consumo Mensual</p>
                            <p className="text-xs text-gray-400 mt-1">Sin histórico</p>
                        </div>
                    </div>

                    {/* Widget 4: Alerts */}
                    <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 shadow-sm border border-gray-100 dark:border-white/5 flex flex-col justify-between group hover:border-orange-200 transition-colors">
                        <div className="flex justify-between items-start">
                            <div className="p-2 bg-orange-50 dark:bg-orange-900/20 text-orange-600 rounded-xl">
                                <Activity className="w-5 h-5" />
                            </div>
                            <span className="text-2xl font-black text-gray-800 dark:text-gray-100">
                                {widgets.criticalCount > 0 ? 'ATTN' : 'OK'}
                            </span>
                        </div>
                        <div>
                            <p className="text-xs font-bold uppercase text-gray-400 tracking-wider">Estado General</p>
                            <p className="text-xs text-gray-500 mt-1">Sincronizado</p>
                        </div>
                    </div>

                </div>

            </div>
        </div>
    )
}
