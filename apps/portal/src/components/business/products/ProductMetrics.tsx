'use client'

import React, { useState } from 'react'
import { DollarSign, Package, TrendingUp, Activity, ChefHat, BarChart3, Target, Info, AlertTriangle, Layers, Percent } from 'lucide-react'
import KpiCard from '@/components/ui/dashboard/KpiCard'

// Data Types
export interface KPI {
    title: string
    value: string
    icon: any
    theme: 'yellow' | 'blue' | 'red' | 'green' | 'purple'
    trend?: { value: number, isPositive: boolean }
}

interface ProductMetricsProps {
    kpis: KPI[]
    widgets: {
        totalProducts: number
        activeProducts: number
        hasRecipeCount: number
        avgMargin: number
        totalPotentialProfit: number
        topProfitableItems?: { name: string, margin: number, marginPercentage: number }[]
        categoryDistribution?: { name: string, count: number, avgMargin: number }[]
        stockValuation?: number
        productionCapacity?: { name: string, possibleUnits: number }[]
        missingRecipes?: { name: string }[]
    }
    loading?: boolean
    activeKpi?: string | null
    onKpiClick?: (title: string) => void
}

export default function ProductMetrics({
    kpis,
    widgets,
    loading = false,
    activeKpi,
    onKpiClick
}: ProductMetricsProps) {
    const formatCurrency = (val: number) => {
        return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(val);
    }

    const renderChart = () => {
        if (loading) return <div className="w-full h-full bg-gray-50/50 animate-pulse rounded-2xl" />

        // Chart based on selection
        switch (activeKpi) {
            case 'Margen Promedio (%)':
                const catData = widgets.categoryDistribution || []
                if (catData.length === 0) return <div className="flex items-center justify-center h-full text-gray-300 font-bold uppercase">Sin datos de categorías</div>
                return (
                    <div className="relative w-full h-full flex flex-col px-4 pt-2 overflow-y-auto custom-scrollbar">
                        <div className="flex justify-between text-[10px] font-black text-gray-400 uppercase tracking-widest pb-4 border-b border-gray-100 mb-6 sticky top-0 bg-white">
                            <span>Categoría</span>
                            <span>Margen Promedio</span>
                        </div>
                        <div className="space-y-6">
                            {catData.map((cat, i) => (
                                <div key={i} className="group">
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="text-sm font-bold text-gray-700 font-display">{cat.name}</span>
                                        <span className={`text-xs font-black px-2 py-0.5 rounded-full ${cat.avgMargin >= 50 ? 'bg-green-50 text-green-600' : 'bg-orange-50 text-orange-600'}`}>
                                            {cat.avgMargin.toFixed(1)}%
                                        </span>
                                    </div>
                                    <div className="relative w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                                        <div
                                            className={`absolute top-0 left-0 h-full rounded-full transition-all duration-700 w-[var(--bar-width)] ${cat.avgMargin >= 50 ? 'bg-green-500' : 'bg-pp-gold'}`}
                                            style={{ '--bar-width': `${Math.min(cat.avgMargin, 100)}%` } as React.CSSProperties} // eslint-disable-line
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )

            case 'Rentabilidad Potencial ($)':
                const profitData = widgets.topProfitableItems || []
                if (profitData.length === 0) return <div className="flex items-center justify-center h-full text-gray-300 font-bold uppercase">Sin datos de productos</div>
                return (
                    <div className="relative w-full h-full flex flex-col px-4 pt-2 overflow-y-auto custom-scrollbar">
                        <div className="flex justify-between text-[10px] font-black text-gray-400 uppercase tracking-widest pb-4 border-b border-gray-100 mb-6 sticky top-0 bg-white">
                            <span>Producto</span>
                            <span>Margen Unitario ($)</span>
                        </div>
                        <div className="space-y-6">
                            {profitData.map((item, i) => (
                                <div key={i} className="group">
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="text-sm font-bold text-gray-700 font-display truncate max-w-[70%]">{item.name}</span>
                                        <span className="text-xs font-black text-pp-brown">
                                            {formatCurrency(item.margin)}
                                        </span>
                                    </div>
                                    <div className="relative w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                                        <div
                                            className="absolute top-0 left-0 h-full bg-pp-brown rounded-full transition-all duration-700 w-[var(--bar-width)]"
                                            style={{ '--bar-width': `${Math.max(item.marginPercentage, 0)}%` } as React.CSSProperties} // eslint-disable-line
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )

            case 'Cobertura de Recetas':
                const missing = widgets.missingRecipes || []
                return (
                    <div className="relative w-full h-full flex flex-col px-4 pt-2 overflow-y-auto custom-scrollbar">
                        <div className="flex justify-between text-[10px] font-black text-gray-400 uppercase tracking-widest pb-4 border-b border-gray-100 mb-6 sticky top-0 bg-white">
                            <span>Estado de Catálogo</span>
                            <span>Acción Req.</span>
                        </div>
                        <div className="space-y-4">
                            <div className="bg-green-50 p-4 rounded-2xl flex items-center justify-between border border-green-100">
                                <div className="flex items-center gap-3">
                                    <ChefHat className="text-green-600" />
                                    <div>
                                        <p className="text-sm font-bold text-green-900">Productos con Receta</p>
                                        <p className="text-[10px] text-green-700 uppercase font-black tracking-widest">{widgets.hasRecipeCount} Items</p>
                                    </div>
                                </div>
                                <span className="text-xl font-black text-green-600">{Math.round((widgets.hasRecipeCount / Math.max(widgets.totalProducts, 1)) * 100)}%</span>
                            </div>

                            {missing.length > 0 && (
                                <div className="space-y-3 pt-4">
                                    <h4 className="text-[10px] font-black text-red-400 uppercase tracking-widest px-2">Pendientes por Costear</h4>
                                    {missing.slice(0, 10).map((p, i) => (
                                        <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100 group hover:border-red-200 transition-colors">
                                            <span className="text-xs font-bold text-gray-700">{p.name}</span>
                                            <AlertTriangle className="h-3.5 w-3.5 text-red-400" />
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )

            case 'Inversión en Stock':
                const capacityData = widgets.productionCapacity || []
                return (
                    <div className="relative w-full h-full flex flex-col px-4 pt-2 overflow-y-auto custom-scrollbar">
                        <div className="flex justify-between text-[10px] font-black text-gray-400 uppercase tracking-widest pb-4 border-b border-gray-100 mb-6 sticky top-0 bg-white">
                            <span>Posibilidad de Venta</span>
                            <span>Capacidad Est.</span>
                        </div>
                        <div className="space-y-3">
                            {capacityData.length === 0 ? (
                                <div className="text-center py-10 text-gray-300">No hay datos de capacidad disponibles</div>
                            ) : (
                                capacityData.map((item, i) => (
                                    <div key={i} className="flex items-center justify-between p-4 bg-white rounded-2xl border border-gray-100 shadow-sm">
                                        <span className="text-sm font-bold text-gray-700">{item.name}</span>
                                        <div className="text-right">
                                            <span className={`text-lg font-black ${item.possibleUnits < 10 ? 'text-red-500' : 'text-pp-brown'}`}>{item.possibleUnits}</span>
                                            <span className="text-[10px] font-bold text-gray-400 ml-1 uppercase">Unid.</span>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                )

            default:
                return (
                    <div className="flex flex-col items-center justify-center h-full text-gray-300 space-y-4">
                        <BarChart3 className="h-16 w-16 opacity-20" />
                        <p className="font-bold uppercase tracking-widest text-sm opacity-40 italic">Selecciona un KPI para ver detalles</p>
                    </div>
                )
        }
    }

    return (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {kpis.map((kpi, idx) => (
                    <KpiCard
                        key={idx}
                        title={kpi.title}
                        value={kpi.value}
                        icon={kpi.icon}
                        colorTheme={kpi.theme}
                        trend={kpi.trend}
                        isActive={activeKpi === kpi.title}
                        onClick={() => onKpiClick?.(kpi.title)}
                    />
                ))}
            </div>

            {/* Bento Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-auto lg:h-[500px]">
                {/* Main Dynamic Panel (2/3) */}
                <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 shadow-sm border border-gray-100 dark:border-white/5 flex flex-col">
                    <div className="flex justify-between items-center mb-8 h-10 shrink-0">
                        <div>
                            <h3 className="text-2xl font-black text-gray-800 dark:text-white font-display uppercase tracking-tight leading-none">
                                {activeKpi || 'Análisis Estratégico'}
                            </h3>
                            <p className="text-sm text-gray-400 font-medium mt-1">Reflejando datos actuales del catálogo y almacén</p>
                        </div>
                        <div className="h-12 w-12 bg-gray-50 rounded-2xl flex items-center justify-center text-gray-300">
                            <Layers className="h-6 w-6" />
                        </div>
                    </div>

                    <div className="relative w-full flex-grow overflow-hidden">
                        {renderChart()}
                    </div>
                </div>

                {/* Info Widgets (1/3) */}
                <div className="grid grid-cols-1 grid-rows-3 gap-4 h-full">
                    {/* Widget 1: Total Valuation */}
                    <div className="bg-white dark:bg-slate-900 rounded-[2rem] p-6 text-gray-900 dark:text-white border border-gray-100 dark:border-white/5 shadow-sm flex gap-6 items-center group relative overflow-hidden">
                        <DollarSign className="h-24 w-24 absolute -bottom-4 -right-4 opacity-[0.03] group-hover:scale-110 transition-transform duration-500 text-pp-brown" />
                        <div className="p-4 bg-pp-brown/10 rounded-2xl border border-pp-brown/20">
                            <Target className="h-8 w-8 text-pp-brown" />
                        </div>
                        <div>
                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Inversión Total Recetas</span>
                            <div className="flex items-baseline gap-1 mt-1">
                                <span className="text-3xl font-black">{formatCurrency(widgets.stockValuation || 0).replace('COP', '')}</span>
                            </div>
                        </div>
                    </div>

                    {/* Widget 2: Margin Gap */}
                    <div className="bg-white dark:bg-slate-900 rounded-[2rem] p-6 border border-gray-100 shadow-sm flex gap-6 items-center">
                        <div className="p-4 bg-pp-gold/10 rounded-2xl border border-pp-gold/20 text-pp-brown">
                            <Percent className="h-8 w-8" />
                        </div>
                        <div>
                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">GAP Margen Meta</span>
                            <div className="flex items-baseline gap-1 mt-1">
                                <span className="text-3xl font-black text-pp-brown">
                                    {Math.round(Math.max(65 - widgets.avgMargin, 0))}%
                                </span>
                                <span className="text-[10px] text-gray-400 font-black uppercase">Faltante</span>
                            </div>
                        </div>
                    </div>

                    {/* Widget 3: Status Summary */}
                    <div className="bg-gray-50 dark:bg-slate-800/50 rounded-[2rem] p-6 border border-transparent shadow-inner flex flex-col justify-center gap-2">
                        <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-gray-400">
                            <span>Productos Operacionales</span>
                            <Activity className="h-3 w-3" />
                        </div>
                        <div className="flex justify-between items-center bg-white dark:bg-slate-900 p-3 rounded-2xl shadow-sm">
                            <span className="text-xs font-bold text-gray-600">Activos</span>
                            <span className="text-lg font-black text-green-600">{widgets.activeProducts}</span>
                        </div>
                        <div className="flex justify-between items-center bg-white dark:bg-slate-900 p-3 rounded-2xl shadow-sm">
                            <span className="text-xs font-bold text-gray-600">Con Receta</span>
                            <span className="text-lg font-black text-blue-600">{widgets.hasRecipeCount}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
