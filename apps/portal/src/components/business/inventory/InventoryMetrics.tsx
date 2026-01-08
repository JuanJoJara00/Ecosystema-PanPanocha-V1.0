'use client'

import React, { useState } from 'react'
import { DollarSign, Package, AlertTriangle, AlertCircle, Clock, TrendingDown, Box, TrendingUp, Activity, Calendar } from 'lucide-react'
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
        topCriticalItems?: { name: string, stock: number, alert: number, unit: string }[]
        categoryDistribution?: { name: string, count: number }[]
        // NEW WIDGETS
        daysOnHand?: string
        topExpenseItem?: { name: string, percentage: number }
        purchaseEfficiency?: { value: number, isPositive: boolean }
        deadStockValue?: number
    }
    loading?: boolean
    chartData?: {
        movements: { date: string, value: number }[]
        unitMovements?: { date: string, value: number }[] // NEW: Unit specific data
        consumption: number
    }
    dateRange?: { start: string, end: string }
    activeKpi?: string | null
    onKpiClick?: (title: string) => void
}

export default function InventoryMetrics({
    kpis,
    widgets,
    loading = false,
    chartData,
    dateRange,
    activeKpi,
    onKpiClick
}: InventoryMetricsProps) {
    const [hoveredPoint, setHoveredPoint] = useState<any>(null);

    // Helper to format currency/units
    const formatValue = (val: number, type: 'currency' | 'unit') => {
        if (type === 'currency') {
            return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(val);
        }
        return val.toLocaleString('es-CO'); // Units
    }

    const formatDate = (dateStr: string) => {
        const parts = dateStr.split('-');
        if (parts.length === 3) return `${parts[2]}/${parts[1]}`; // DD/MM
        return dateStr;
    }

    // Chart Render Logic
    const renderChart = () => {
        // 1. Determine Data Source & Settings
        let data: { date: string, value: number }[] = [];
        let color = '#F6B323'; // Default Yellow
        let gradientId = 'chart-grad';
        let type: 'currency' | 'unit' = 'currency';
        let label = 'Valor Total';

        if (activeKpi === 'Total Items (SKU)') {
            data = chartData?.unitMovements || chartData?.movements || [];
            color = '#3B82F6'; // Blue
            gradientId = 'chart-grad-blue';
            type = 'unit';
            label = 'Unidades';
        } else if (activeKpi === 'Stock Crítico') {
            // ... Critical Stock List Logic (Separate return) ...
        } else {
            // Valor Total
            data = chartData?.movements || [];
        }

        // Handle Horizontal Bar Chart (Stock Crítico) - Early Return
        if (activeKpi === 'Stock Crítico') {
            const critData = widgets.topCriticalItems || [];
            if (critData.length === 0) return <div className="flex items-center justify-center h-full text-gray-300 font-bold uppercase text-lg">Sin ítems críticos</div>

            return (
                <div className="relative w-full h-full flex flex-col px-4 pt-2 pb-2 overflow-y-auto">
                    {/* Header for List */}
                    <div className="flex justify-between text-xs font-bold text-gray-400 uppercase tracking-wider pb-2 border-b border-gray-100 mb-4 sticky top-0 bg-white z-10">
                        <span>Producto</span>
                        <span>Estado de Stock</span>
                    </div>

                    <div className="space-y-6">
                        {critData.map((item, i) => {
                            const missing = item.alert - item.stock;
                            const percentage = Math.min((item.stock / item.alert) * 100, 100);

                            return (
                                <div key={i} className="w-full group">
                                    <div className="flex justify-between items-end mb-2">
                                        <span className="text-sm font-bold text-gray-700 truncate max-w-[60%] font-display" title={item.name}>
                                            {item.name}
                                        </span>
                                        <div className="flex flex-col items-end">
                                            {missing > 0 ? (
                                                <span className="text-[10px] font-black text-red-500 bg-red-50 px-2 py-0.5 rounded-full uppercase tracking-wide">
                                                    Faltan {missing.toFixed(1)} {item.unit}
                                                </span>
                                            ) : (
                                                <span className="text-[10px] font-black text-orange-500 bg-orange-50 px-2 py-0.5 rounded-full uppercase tracking-wide">
                                                    Al Límite
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="relative w-full h-3 bg-gray-100 rounded-full overflow-hidden">
                                        <div
                                            className="absolute top-0 left-0 h-full bg-red-500 rounded-full transition-all duration-500"
                                            style={{ width: `${percentage}%` }}
                                        />
                                    </div>
                                    <div className="flex justify-between text-[10px] text-gray-400 mt-1 font-mono">
                                        <span>{item.stock} / {item.alert} {item.unit}</span>
                                        <span>{percentage.toFixed(0)}% del Mínimo</span>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>
            )
        }

        // 2. Prepare Chart Data (Min/Max/Points)
        if (data.length === 0) return <div className="w-full h-1/2 bg-gray-100/50 animate-pulse rounded-t-3xl" />;

        const minVal = Math.min(...data.map(m => m.value));
        const maxVal = Math.max(...data.map(m => m.value));
        const range = maxVal - minVal || 1;
        const extendedRange = range * 1.25; // Add some breathing room on top
        const baseMin = Math.max(0, minVal - (range * 0.1)); // Slightly below min

        // Y-Axis Labels
        const yLabels = [
            baseMin + extendedRange,
            baseMin + extendedRange * 0.66,
            baseMin + extendedRange * 0.33,
            baseMin
        ].map(v => {
            if (v >= 1000000) return (v / 1000000).toFixed(1) + 'M';
            if (v >= 1000) return (v / 1000).toFixed(0) + 'K';
            return v.toFixed(0);
        });

        const width = 1000;
        const height = 400;

        return (
            <div className="relative w-full h-full flex pl-8 pr-1 group pb-2" onMouseLeave={() => setHoveredPoint(null)}>
                <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full preserve-3d overflow-visible">
                    <defs>
                        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={color} stopOpacity="0.4" />
                            <stop offset="100%" stopColor={color} stopOpacity="0" />
                        </linearGradient>
                    </defs>

                    {/* GRID & Y-AXIS LABELS (Native SVG) */}
                    {[0, 0.33, 0.66, 1].map((p, i) => {
                        const yPos = p * height;
                        const labelValue = yLabels[3 - i]; // Reverse order to match bottom-up
                        return (
                            <g key={i}>
                                {/* Grid Line */}
                                <line x1="0" y1={yPos} x2={width} y2={yPos} stroke="currentColor" className="text-gray-100 dark:text-white/5" strokeWidth="1" />
                                {/* Y-Axis Label */}
                                <text x="-15" y={yPos + 4} textAnchor="end" className="text-xs font-black fill-gray-500 dark:fill-gray-400 select-none">
                                    {labelValue}
                                </text>
                            </g>
                        )
                    })}

                    {/* Main Path */}
                    <path
                        d={`M0,${height} ${data.map((d, i) => {
                            const x = (i / (data.length - 1)) * width;
                            const y = height - (((d.value - baseMin) / extendedRange) * 360 + 20); // Scale to fit 360px height + 20px padding
                            return `L${x},${y}`;
                        }).join(' ')} L${width},${height} Z`}
                        fill={`url(#${gradientId})`}
                    />
                    <path
                        d={`M0,${height - (((data[0].value - baseMin) / extendedRange) * 360 + 20)} ${data.map((d, i) => {
                            const x = (i / (data.length - 1)) * width;
                            const y = height - (((d.value - baseMin) / extendedRange) * 360 + 20);
                            return `L${x},${y}`;
                        }).join(' ')}`}
                        fill="none"
                        stroke={color}
                        strokeWidth="4"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />

                    {/* X-AXIS LABELS (Native SVG) using exact data points */}
                    {data.length > 0 && [0, Math.floor(data.length * 0.25), Math.floor(data.length * 0.5), Math.floor(data.length * 0.75), data.length - 1].map((idx, i) => {
                        const d = data[idx];
                        if (!d) return null;
                        const x = (idx / (data.length - 1)) * width;

                        // Anchor logic
                        let anchor: "middle" | "start" | "end" = "middle";
                        if (i === 0) anchor = "start";
                        if (i === 4) anchor = "end";

                        return (
                            <text key={idx} x={x} y={height + 25} textAnchor={anchor} className="text-xs font-black fill-gray-500 dark:fill-gray-400 select-none">
                                {formatDate(d.date)}
                            </text>
                        )
                    })}

                    {/* INTERACTIVE LAYER */}
                    {data.map((d, i) => {
                        const x = (i / (data.length - 1)) * width;
                        const y = height - (((d.value - baseMin) / extendedRange) * 360 + 20);
                        const prevVal = i > 0 ? data[i - 1].value : d.value;

                        return (
                            <g key={i}>
                                {/* Invisible Hit Rect */}
                                <rect
                                    x={x - (width / data.length / 2)}
                                    y="0"
                                    width={width / data.length}
                                    height={height}
                                    fill="transparent"
                                    className="cursor-crosshair"
                                    onMouseEnter={() => setHoveredPoint({
                                        date: d.date,
                                        value: d.value,
                                        formattedDate: formatDate(d.date),
                                        formattedValue: formatValue(d.value, type),
                                        prevValue: prevVal,
                                        label: label,
                                        x,
                                        y
                                    })}
                                />

                                {/* Visible Hover Elements */}
                                {hoveredPoint?.date === d.date && (
                                    <>
                                        <line x1={x} y1="0" x2={x} y2={height} stroke="#e5e7eb" strokeWidth="2" strokeDasharray="5,5" />
                                        <circle cx={x} cy={y} r="6" fill="white" stroke={color} strokeWidth="3" />
                                        <circle cx={x} cy={y} r="12" fill={color} opacity="0.2" />
                                    </>
                                )}
                            </g>
                        )
                    })}
                </svg>
            </div>
        )

    }

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500 mb-8">

            {/* BLUE ZONE: KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {kpis.map((kpi, idx) => (
                    <KpiCard
                        key={idx}
                        title={kpi.title}
                        value={kpi.value}
                        icon={kpi.icon}
                        colorTheme={kpi.theme}
                        trend={kpi.trend}
                        isActive={activeKpi === kpi.title}
                        onClick={() => {
                            setHoveredPoint(null); // Reset hover on switch
                            onKpiClick?.(kpi.title);
                        }}
                    />
                ))}
            </div>

            {/* RED ZONE: Bento Box Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-auto lg:h-[500px]">

                {/* Left: Main Chart (2/3 width) */}
                <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-3xl p-5 shadow-sm border border-gray-100 dark:border-white/5 relative overflow-hidden group flex flex-col justify-between">

                    {/* Header: Dynamic Logic */}
                    <div className="flex justify-between items-center mb-4 relative z-10 h-10 shrink-0">
                        {activeKpi === 'Stock Crítico' ? (
                            <div className="animate-in fade-in slide-in-from-left-2 duration-300">
                                <h3 className="text-lg font-bold text-red-600 dark:text-red-400 font-display uppercase tracking-wide">
                                    Alertas de Stock
                                </h3>
                                <p className="text-sm text-gray-400 font-medium">Ítems críticos por debajo del mínimo</p>
                            </div>
                        ) : (
                            <div className="animate-in fade-in slide-in-from-left-2 duration-300">
                                <h3 className="text-lg font-bold text-gray-800 dark:text-white font-display uppercase tracking-wide">
                                    {activeKpi === 'Total Items (SKU)' ? 'Variedad de Stock (SKUs Disponibles)' : 'Valor Total del Inventario ($)'}
                                </h3>
                                <p className="text-sm text-gray-400 font-medium">
                                    {activeKpi === 'Total Items (SKU)'
                                        ? 'Cant. de productos diferentes con stock'
                                        : (dateRange ? `Periodo: ${formatDate(dateRange.start)} - ${formatDate(dateRange.end)}` : 'Valoración histórica')
                                    }
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Chart Container - takes remaining height but leaves room for bottom detail bar */}
                    <div className="relative w-full flex-grow min-h-[250px] mb-2">
                        {renderChart()}
                    </div>

                    {/* Bottom Detail Bar (Only for Charts) */}
                    {activeKpi !== 'Stock Crítico' && (
                        <div className="h-24 border-t border-gray-100 dark:border-white/5 pt-6 shrink-0 mt-4">
                            {hoveredPoint ? (
                                <div className="flex items-center justify-between px-8 animate-in fade-in slide-in-from-bottom-2 duration-200">
                                    <div className="flex flex-col">
                                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Fecha</span>
                                        <div className="flex items-center gap-2 text-gray-700 dark:text-gray-200 font-bold text-xl">
                                            <Calendar className="w-5 h-5 text-gray-400" />
                                            {hoveredPoint.formattedDate}
                                        </div>
                                    </div>

                                    <div className="flex flex-col text-right">
                                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{hoveredPoint.label}</span>
                                        <span className={`font-black text-2xl ${activeKpi === 'Total Items (SKU)' ? 'text-blue-500' : 'text-yellow-500'}`}>
                                            {hoveredPoint.formattedValue}
                                        </span>
                                    </div>

                                    {/* Optional Change Indicator */}
                                    <div className="flex flex-col text-right hidden sm:flex">
                                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Variación</span>
                                        {(() => {
                                            const diff = hoveredPoint.value - hoveredPoint.prevValue;
                                            const isPos = diff >= 0;
                                            return (
                                                <div className={`flex items-center gap-1 font-bold ${isPos ? 'text-green-500' : 'text-red-500'}`}>
                                                    {isPos ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                                                    {(Math.abs(diff) / (hoveredPoint.prevValue || 1) * 100).toFixed(1)}%
                                                </div>
                                            )
                                        })()}
                                    </div>
                                </div>
                            ) : (
                                <div className="flex items-center justify-center h-full text-gray-300 font-medium italic text-sm">
                                    Desliza sobre la gráfica para ver detalles
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Right: 4 Small Widgets (1/3 width, internal 2x2 custom grid) */}
                <div className="grid grid-cols-2 grid-rows-2 gap-4 lg:col-span-1 h-full">

                    {/* Widget 1: Top Críticos */}
                    <div className="relative bg-white dark:bg-slate-900 rounded-3xl p-5 shadow-sm border border-gray-100 dark:border-white/5 flex flex-col group hover:border-red-200 transition-colors overflow-hidden">
                        <div className="flex items-start justify-between relative z-10">
                            <div className="p-2 bg-red-50 dark:bg-red-900/20 text-red-600 rounded-xl">
                                <AlertCircle className="w-5 h-5" />
                            </div>
                        </div>

                        {/* Centered Value */}
                        <div className="flex-grow flex flex-col items-center justify-center relative z-10">
                            <span className="text-4xl font-black text-gray-800 dark:text-gray-100 tracking-tight">
                                {widgets.criticalCount}
                            </span>
                        </div>

                        {/* Sparkline Decoration */}
                        <div className="absolute inset-0 opacity-5 pointer-events-none">
                            <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                                <path d="M0 80 Q 25 70, 50 85 T 100 40" fill="none" stroke="currentColor" strokeWidth="3" className="text-red-600" />
                            </svg>
                        </div>

                        <div className="relative z-10">
                            <p className="text-xs font-bold uppercase text-gray-400 tracking-wider text-center">Top Críticos</p>
                            <p className="text-xs text-gray-500 mt-1 truncate text-center">{widgets.criticalNames || 'Todo en orden'}</p>
                        </div>
                    </div>

                    {/* Widget 2: Días de Inventario (Days on Hand) */}
                    <div className="relative bg-white dark:bg-slate-900 rounded-3xl p-5 shadow-sm border border-gray-100 dark:border-white/5 flex flex-col group hover:border-blue-200 transition-colors">
                        <div className="flex items-center justify-between">
                            <div className={`p-2 rounded-xl ${(parseFloat(widgets.daysOnHand || '0') < 5) ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'}`}>
                                <Clock className="w-5 h-5" />
                            </div>
                            <span className={`text-xs font-bold px-2 py-1 rounded-full ${parseFloat(widgets.daysOnHand || '0') < 5 ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>
                                {parseFloat(widgets.daysOnHand || '0') < 5 ? 'Crítico' : 'Normal'}
                            </span>
                        </div>

                        <div className="flex-grow flex flex-col items-center justify-center py-2">
                            <span className="text-4xl font-black text-gray-800 dark:text-gray-100">
                                {widgets.daysOnHand || '-'}
                            </span>
                            <span className="text-xs text-gray-400 font-medium">días est.</span>
                        </div>

                        <div>
                            <div className="w-full bg-gray-100 dark:bg-gray-800 h-2 rounded-full overflow-hidden relative">
                                <div
                                    className={`h-full rounded-full ${(parseFloat(widgets.daysOnHand || '0') < 5) ? 'bg-red-500' : 'bg-blue-500'}`}
                                    style={{ width: `${Math.min((parseFloat(widgets.daysOnHand || '0') / 15) * 100, 100)}%` }}
                                />
                            </div>
                            <p className="text-xs font-bold uppercase text-gray-400 tracking-wider mt-2 text-center">Cobertura</p>
                        </div>
                    </div>

                    {/* Widget 3: Top Insumo (Pareto) */}
                    <div className="relative bg-white dark:bg-slate-900 rounded-3xl p-5 shadow-sm border border-gray-100 dark:border-white/5 flex flex-col group hover:border-purple-200 transition-colors">
                        <div className="flex items-start">
                            <div className="p-2 bg-purple-50 dark:bg-purple-900/20 text-purple-600 rounded-xl">
                                <DollarSign className="w-5 h-5" />
                            </div>
                        </div>

                        <div className="flex-grow flex flex-col items-center justify-center">
                            <span className="text-4xl font-black text-gray-800 dark:text-gray-100 truncate max-w-full">
                                {widgets.topExpenseItem?.percentage}%
                            </span>
                            <p className="text-[10px] text-gray-400">del costo total</p>
                        </div>

                        <div className="text-center rounded-xl bg-gray-50 dark:bg-white/5 p-2 mt-2">
                            <p className="text-xs font-bold uppercase text-gray-500 tracking-wider mb-0.5">Top Gasto</p>
                            <p className="text-sm font-bold text-gray-800 dark:text-gray-200 truncate" title={widgets.topExpenseItem?.name}>
                                {widgets.topExpenseItem?.name || '-'}
                            </p>
                        </div>
                    </div>

                    {/* Widget 4: Eficiencia de Compra */}
                    <div className="relative bg-white dark:bg-slate-900 rounded-3xl p-5 shadow-sm border border-gray-100 dark:border-white/5 flex flex-col group hover:border-green-200 transition-colors overflow-hidden">
                        <div className="flex items-start relative z-10">
                            <div className={`p-2 rounded-xl ${!widgets.purchaseEfficiency?.isPositive ? 'bg-orange-50 text-orange-600' : 'bg-green-50 text-green-600'}`}>
                                <Activity className="w-5 h-5" />
                            </div>
                        </div>

                        <div className="flex-grow flex flex-col items-center justify-center relative z-10">
                            <span className="text-4xl font-black text-gray-800 dark:text-gray-100">
                                {widgets.purchaseEfficiency?.value ? `${widgets.purchaseEfficiency.value}%` : '--'}
                            </span>
                        </div>

                        {/* Sparkline Decoration */}
                        <div className="absolute inset-0 opacity-10 pointer-events-none">
                            <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                                <path d="M0 90 L 20 80 L 40 85 L 60 50 L 80 60 L 100 20" fill="none" stroke={!widgets.purchaseEfficiency?.isPositive ? '#ea580c' : '#16a34a'} strokeWidth="3" />
                            </svg>
                        </div>

                        <div className="relative z-10 text-center">
                            <p className="text-xs font-bold uppercase text-gray-400 tracking-wider">Eficiencia</p>
                            <span className={`inline-block px-2 py-0.5 rounded text-xs font-bold mt-1 ${!widgets.purchaseEfficiency?.isPositive ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700'}`}>
                                {!widgets.purchaseEfficiency?.isPositive ? 'Sobre Costo' : 'Ahorro'}
                            </span>
                        </div>
                    </div>

                </div>

            </div>
        </div>
    )
}
