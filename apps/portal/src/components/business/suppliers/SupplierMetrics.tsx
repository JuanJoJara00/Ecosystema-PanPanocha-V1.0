import React, { useMemo, useState } from 'react'
import { TrendingUp, Truck, AlertCircle, ShoppingBag, Store, Users, DollarSign, BarChart3, LineChart } from 'lucide-react'
import { SupplierDashboardMetrics } from '@/services/supplier.service'

// Helper for currency
const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        maximumFractionDigits: 0
    }).format(amount)
}

export interface SupplierKPI {
    title: string
    value: string
    icon: any
    theme: string
    colorStyles?: any
}

interface SupplierMetricsProps {
    kpis: SupplierKPI[]
    widgets: {
        totalSuppliers: number
        activeSuppliers: number
        totalDebt: number
        totalPurchases: number
        topDebtSuppliers: { name: string, debt: number }[]
        topPurchaseSuppliers: { name: string, total: number }[]
        topCategories?: { name: string, value: number }[]
        dashboardMetrics?: SupplierDashboardMetrics
    }
    loading?: boolean
    activeKpi?: string | null
    onKpiClick?: (kpi: string) => void
    className?: string
}

// Internal Chart Component
const CHART_COLORS = [
    'bg-emerald-400', 'bg-blue-400', 'bg-amber-400', 'bg-red-400', 'bg-purple-400', 'bg-pink-400', 'bg-cyan-400'
]
const ComparativeChart = ({ data, timeSeries, isDebtView, showLine }: {
    data: any[],
    timeSeries: any[],
    isDebtView: boolean,
    showLine: boolean
}) => {
    // If showing Line Chart (Time Series)
    if (showLine && timeSeries && timeSeries.length > 0) {
        // Calculate max value for scaling, ensure 0 baseline
        const maxVal = Math.max(...timeSeries.map(d => Math.max(d.current, d.previous)), 100)

        // Generate points for SVG polyline
        // X = (index / length) * 100
        // Y = 100 - ((value / max) * 100)
        const pointsCurr = timeSeries.map((d, i) => {
            const x = (i / (timeSeries.length - 1)) * 100
            const y = 100 - ((d.current / maxVal) * 100)
            return `${x},${y}`
        }).join(' ')
        const pointsPrev = timeSeries.map((d, i) => {
            const x = (i / (timeSeries.length - 1)) * 100
            const y = 100 - ((d.previous / maxVal) * 100)
            return `${x},${y}`
        }).join(' ')

        return (
            <div className="w-full h-full relative p-4 flex flex-col justify-end">
                <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full overflow-visible">
                    {/* Grid Lines */}
                    <line x1="0" y1="25" x2="100" y2="25" stroke="#e5e7eb" strokeWidth="0.5" strokeDasharray="2" />
                    <line x1="0" y1="50" x2="100" y2="50" stroke="#e5e7eb" strokeWidth="0.5" strokeDasharray="2" />
                    <line x1="0" y1="75" x2="100" y2="75" stroke="#e5e7eb" strokeWidth="0.5" strokeDasharray="2" />

                    {/* Previous Line (Dashed) */}
                    <polyline
                        points={pointsPrev}
                        fill="none"
                        stroke="#d1d5db"
                        strokeWidth="1.5"
                        strokeDasharray="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        vectorEffect="non-scaling-stroke"
                    />

                    {/* Current Line (Solid) */}
                    <polyline
                        points={pointsCurr}
                        fill="none"
                        stroke={isDebtView ? '#f87171' : '#fbbf24'}
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        vectorEffect="non-scaling-stroke"
                    />
                </svg>
                {/* X Axis Labels */}
                <div className="flex justify-between text-[8px] text-gray-400 mt-2 uppercase font-mono">
                    <span>{timeSeries[0]?.date}</span>
                    <span>{timeSeries[Math.floor(timeSeries.length / 2)]?.date}</span>
                    <span>{timeSeries[timeSeries.length - 1]?.date}</span>
                </div>
            </div>
        )
    }

    // Bar Chart (Categorical) Logic
    const maxValue = Math.max(...data.map((d: any) => Math.max(isDebtView ? d.debt : d.total, isDebtView ? (d.prevDebt || 0) : (d.prev || 0))), 1000)

    return (
        <div className="w-full h-full flex items-end justify-between gap-2 pt-8 pb-2 px-2 relative min-h-[200px]">
            {/* Y-Axis Guidelines */}
            <div className="absolute inset-0 flex flex-col justify-between pointer-events-none px-2 pb-6 pt-8">
                {[1, 0.75, 0.5, 0.25, 0].map((tick, i) => (
                    <div key={i} className="w-full border-t border-gray-50 dark:border-white/5 h-0 relative">
                        {i % 2 === 0 && <span className="absolute -top-2 -left-0 text-[9px] text-gray-300 font-mono">{formatCurrency(maxValue * tick).slice(0, -3)}</span>}
                    </div>
                ))}
            </div>

            {data.slice(0, 10).map((item: any, i: number) => {
                const current = isDebtView ? item.debt : item.total
                const prev = isDebtView ? (item.prevDebt || 0) : (item.prev || 0)

                const heightCurr = (current / maxValue) * 100
                const heightPrev = (prev / maxValue) * 100

                return (
                    <div key={i} className="flex-1 h-full flex flex-col justify-end items-center gap-1 group relative z-10 w-full">
                        {/* Bars Container */}
                        <div className="flex items-end gap-1 h-full w-full justify-center">
                            {/* Prev Bar */}
                            <div
                                style={{ height: `${heightPrev || 1}%` }}
                                className="w-1.5 md:w-3 bg-gray-200 dark:bg-gray-700 rounded-t-sm transition-all duration-500 opacity-60"
                                title={`Previo: ${formatCurrency(prev)}`}
                            />
                            {/* Curr Bar */}
                            <div
                                style={{ height: `${heightCurr || 1}%` }}
                                className={`w-2 md:w-4 ${isDebtView ? 'bg-red-400' : 'bg-amber-400'} rounded-t-lg transition-all duration-500 group-hover:opacity-90 shadow-sm`}
                                title={`Actual: ${formatCurrency(current)}`}
                            />
                        </div>

                        {/* Label */}
                        <div className="h-6 flex items-center justify-center">
                            <span className="text-[9px] font-bold text-gray-400 -rotate-45 truncate w-12 text-center origin-center">
                                {item.name.split(' ')[0]}
                            </span>
                        </div>

                        {/* Tooltip */}
                        <div className="absolute -top-12 opacity-0 group-hover:opacity-100 transition-opacity bg-black text-white text-[10px] p-2 rounded pointer-events-none whitespace-nowrap z-50">
                            <p className="font-bold">{item.name}</p>
                            <p>Actual: {formatCurrency(current)}</p>
                            <p className="text-gray-400">Previo: {formatCurrency(prev)}</p>
                        </div>
                    </div>
                )
            })}
        </div>
    )
}

const DistributionBar = ({ data, isDebtView }: { data: any[], isDebtView: boolean }) => {
    const total = data.reduce((acc, curr) => acc + (isDebtView ? curr.debt : curr.total), 0)

    return (
        <div className="w-full mt-4 pt-4 border-t border-gray-100 dark:border-white/5">
            <div className="flex justify-between items-center mb-3">
                <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                    Distribución por {isDebtView ? 'Deuda' : 'Volúmen'}
                </h4>
                <span className="text-[10px] font-bold text-gray-900 bg-gray-100 px-2 py-0.5 rounded-md">
                    Total: {formatCurrency(total)}
                </span>
            </div>

            {/* Stacked Bar */}
            <div className="flex h-4 w-full rounded-full overflow-hidden mb-4 bg-gray-100">
                {data.map((item, i) => {
                    const val = isDebtView ? item.debt : item.total
                    const pct = total > 0 ? (val / total) * 100 : 0
                    if (pct < 1) return null // Hide tiny segments
                    return (
                        <div
                            key={i}
                            style={{ width: `${pct}%` }}
                            className={`h-full ${CHART_COLORS[i % CHART_COLORS.length]} hover:opacity-80 transition-opacity relative group`}
                            title={`${item.name}: ${pct.toFixed(1)}%`}
                        />
                    )
                })}
            </div>

            {/* Legend Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {data.slice(0, 8).map((item, i) => {
                    const val = isDebtView ? item.debt : item.total
                    const pct = total > 0 ? (val / total) * 100 : 0
                    return (
                        <div key={i} className="flex items-center gap-1.5">
                            <div className={`w-1.5 h-1.5 rounded-full ${CHART_COLORS[i % CHART_COLORS.length]}`} />
                            <div className="min-w-0 flex-1 flex justify-between items-baseline gap-2">
                                <p className="text-[9px] font-bold text-gray-600 truncate">{item.name}</p>
                                <p className="text-[9px] text-gray-400 font-mono">{pct.toFixed(0)}%</p>
                            </div>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}

const CategoryWidget = ({ categories, total }: { categories: { name: string, value: number }[], total: number }) => {
    return (
        <div className="w-full mt-4 pt-4 border-t border-gray-100 dark:border-white/5">
            <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Top Categorías</h4>
            <div className="space-y-3">
                {categories.map((cat, i) => {
                    const pct = total > 0 ? (cat.value / total) * 100 : 0
                    return (
                        <div key={i} className="flex flex-col gap-1">
                            <div className="flex justify-between text-[10px]">
                                <span className="font-semibold text-gray-700">{cat.name}</span>
                                <span className="text-gray-400">{pct.toFixed(1)}%</span>
                            </div>
                            <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                                <div
                                    className={`h-full rounded-full ${CHART_COLORS[i % CHART_COLORS.length]}`}
                                    style={{ width: `${pct}%` }}
                                />
                            </div>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}

export default function SupplierMetrics({
    kpis,
    widgets,
    loading = false,
    activeKpi,
    onKpiClick,
    className
}: SupplierMetricsProps) {
    // Moved hook to top level
    const [chartType, setChartType] = useState<'bar' | 'line'>('bar')

    // Enrich KPIs with styles if they don't have them
    const enrichedKpis = useMemo(() => {
        return kpis.map(kpi => {
            if (kpi.colorStyles) return kpi

            let styles = {
                active: 'bg-white border-blue-400 shadow-md transform scale-[1.02]',
                inactive: 'bg-white border-transparent shadow-sm hover:border-blue-200',
                iconBg: 'bg-blue-100 text-blue-700',
                text: 'text-blue-600',
                blob: 'bg-blue-400/10'
            }

            if (kpi.theme === 'red') {
                styles = {
                    active: 'bg-white border-red-400 shadow-md transform scale-[1.02]',
                    inactive: 'bg-white border-transparent shadow-sm hover:border-red-200',
                    iconBg: 'bg-red-100 text-red-700',
                    text: 'text-red-600',
                    blob: 'bg-red-400/10'
                }
            } else if (kpi.theme === 'green') {
                styles = {
                    active: 'bg-white border-emerald-400 shadow-md transform scale-[1.02]',
                    inactive: 'bg-white border-transparent shadow-sm hover:border-emerald-200',
                    iconBg: 'bg-emerald-100 text-emerald-700',
                    text: 'text-emerald-600',
                    blob: 'bg-emerald-400/10'
                }
            } else if (kpi.theme === 'purple') {
                styles = {
                    active: 'bg-white border-purple-400 shadow-md transform scale-[1.02]',
                    inactive: 'bg-white border-transparent shadow-sm hover:border-purple-200',
                    iconBg: 'bg-purple-100 text-purple-700',
                    text: 'text-purple-600',
                    blob: 'bg-purple-400/10'
                }
            } else if (kpi.theme === 'yellow') {
                styles = {
                    active: 'bg-white border-yellow-400 shadow-md transform scale-[1.02]',
                    inactive: 'bg-white border-transparent shadow-sm hover:border-yellow-200',
                    iconBg: 'bg-yellow-100 text-yellow-700',
                    text: 'text-yellow-600',
                    blob: 'bg-yellow-400/10'
                }
            }

            return { ...kpi, colorStyles: styles }
        })
    }, [kpis])

    const renderWidget = () => {
        if (loading) return <div className="w-full h-full bg-gray-50/50 animate-pulse rounded-2xl" />

        const isDebtView = activeKpi === 'Deuda Pendiente'
        let data = isDebtView ? (widgets.topDebtSuppliers || []) : (widgets.topPurchaseSuppliers || [])
        // If we have dashboardMetrics, utilize them for chart data
        if (widgets.dashboardMetrics?.supplierSeries) {
            data = widgets.dashboardMetrics.supplierSeries
        }

        const categories = widgets.topCategories || []
        const timeSeries = widgets.dashboardMetrics?.timeSeries || []

        if (data.length === 0) {
            return (
                <div className="w-full h-full flex flex-col items-center justify-center min-h-[300px] opacity-50">
                    <BarChart3 size={48} className="text-gray-300 mb-4" />
                    <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">Sin datos disponibles</p>
                </div>
            )
        }



        return (
            <div className="w-full h-full flex flex-col gap-6 overflow-y-auto custom-scrollbar pr-1">
                <div className="flex justify-end gap-2 mb-[-30px] z-20 relative px-4">
                    <button
                        onClick={() => setChartType('bar')}
                        className={`p-1.5 rounded-md ${chartType === 'bar' ? 'bg-gray-100 text-gray-900' : 'text-gray-400 hover:bg-gray-50'}`}
                        title="Ver gráfico de barras"
                        aria-label="Ver gráfico de barras"
                    >
                        <BarChart3 size={14} />
                    </button>
                    <button
                        onClick={() => setChartType('line')}
                        className={`p-1.5 rounded-md ${chartType === 'line' ? 'bg-gray-100 text-gray-900' : 'text-gray-400 hover:bg-gray-50'}`}
                        title="Ver gráfico de línea"
                        aria-label="Ver gráfico de línea"
                    >
                        <LineChart size={14} />
                    </button>
                </div>

                <div className="h-64 w-full shrink-0">
                    <ComparativeChart
                        data={data}
                        timeSeries={timeSeries}
                        isDebtView={isDebtView}
                        showLine={chartType === 'line'}
                    />
                </div>
                <DistributionBar data={data} isDebtView={isDebtView} />
                {!isDebtView && categories.length > 0 && (
                    <CategoryWidget categories={categories} total={widgets.totalPurchases} />
                )}
            </div>
        )
    }

    return (
        <div className={`w-full mb-6 flex flex-col gap-6 ${className || ''}`}>
            {/* Top Row: KPI Cards (Rich Style) - 4 in a row */}
            <div className="w-full grid grid-cols-2 md:grid-cols-4 gap-4">
                {enrichedKpis.map((kpi, i) => (
                    <div
                        key={i}
                        onClick={() => onKpiClick && onKpiClick(kpi.title)}
                        className={`cursor-pointer transition-all duration-200 p-5 rounded-3xl border-2 hover:shadow-lg relative overflow-hidden group min-h-[140px] flex flex-col justify-between ${activeKpi === kpi.title ? kpi.colorStyles.active : kpi.colorStyles.inactive
                            }`}
                    >
                        <div className={`absolute top-0 right-0 w-32 h-32 rounded-full -mr-16 -mt-16 transition-transform group-hover:scale-110 ${kpi.colorStyles.blob}`} />

                        <div className="relative z-10">
                            <div className="flex items-center gap-3 mb-3">
                                <div className={`p-2 rounded-xl transition-colors ${kpi.colorStyles.iconBg}`}>
                                    <kpi.icon className="w-5 h-5" />
                                </div>
                                <h4 className={`text-xs font-bold uppercase tracking-widest ${kpi.colorStyles.text}`}>
                                    {kpi.title}
                                </h4>
                            </div>
                            <p className="text-2xl font-black tracking-tight text-gray-800 dark:text-gray-100">
                                {loading ? '...' : kpi.value}
                            </p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Bottom Row: Chart Widget - Full Width */}
            <div className="w-full bg-white dark:bg-slate-800 rounded-3xl border border-gray-100 dark:border-white/5 shadow-lg p-5 flex flex-col h-auto min-h-[450px] relative">
                <div className="flex justify-between items-center mb-6 z-10">
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                        {activeKpi === 'Deuda Pendiente' ? (
                            <><AlertCircle size={14} className="text-red-400" /> Análisis de Deuda</>
                        ) : (
                            <><TrendingUp size={14} className="text-emerald-400" /> Análisis de Volúmen</>
                        )}
                    </h3>
                </div>

                <div className="flex-1 min-h-0 relative z-10 w-full h-full">
                    {renderWidget()}
                </div>

                {/* Background Decoration for Widget */}
                <div className="absolute bottom-0 left-0 w-full h-32 bg-gradient-to-t from-gray-50 to-transparent pointer-events-none opacity-50" />
            </div>
        </div>
    )
}
