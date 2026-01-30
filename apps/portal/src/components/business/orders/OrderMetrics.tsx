import React, { useMemo } from 'react'
import { DollarSign, FileText, CheckCircle, AlertCircle, TrendingUp, Clock, CreditCard, ShoppingCart } from 'lucide-react'

// Helper for currency
const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        maximumFractionDigits: 0
    }).format(amount)
}

interface OrderKPI {
    title: string
    value: string
    icon: any
    theme: 'yellow' | 'blue' | 'red' | 'green' | 'purple'
}

interface OrderMetricsProps {
    widgets: {
        totalOrders: number
        pendingcount: number
        totalSpend: number
        totalPayables: number
        topSuppliers?: { name: string, total: number }[]
        receivedCount?: number
    }
    loading?: boolean
    activeKpi?: string | null
    onKpiClick?: (title: string) => void
    className?: string
}

// Internal Chart Component (Reusing the style from SupplierMetrics)
const ComparativeChart = ({ data }: { data: any[] }) => {
    const maxValue = Math.max(...data.map((d: any) => d.total), 1)

    return (
        <div className="w-full h-full flex flex-col justify-end gap-2 pb-2">
            <div className="flex-1 flex items-end justify-between gap-2 px-2">
                {data.slice(0, 7).map((item: any, i: number) => { // Up to 7 bars
                    const height = `${Math.max((item.total / maxValue) * 100, 5)}%` // Min 5% height
                    return (
                        <div key={i} className="flex flex-col items-center gap-1 group w-full">
                            <div className="relative w-full flex-1 flex items-end bg-gray-50/50 rounded-t-lg hover:bg-gray-100 transition-colors cursor-pointer group-hover:bg-gray-100">
                                <div
                                    className="w-full rounded-t-lg transition-all duration-700 ease-out bg-blue-400 group-hover:bg-blue-500"
                                    style={{ height: height }}
                                >
                                    {/* Tooltip */}
                                    <div className="opacity-0 group-hover:opacity-100 absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-[10px] py-1 px-2 rounded whitespace-nowrap z-10 pointer-events-none transition-opacity shadow-lg">
                                        {formatCurrency(item.total)}
                                    </div>
                                </div>
                            </div>
                            <span className="text-[9px] font-bold text-gray-400 truncate max-w-[60px]" title={item.name}>{item.name.split(' ')[0]}</span>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}

export default function OrderMetrics({
    widgets,
    loading = false,
    activeKpi,
    onKpiClick,
    className
}: OrderMetricsProps) {

    const kpis: (OrderKPI & { colorStyles: any })[] = [
        {
            title: 'Gasto Total',
            value: formatCurrency(widgets.totalSpend),
            icon: DollarSign,
            theme: 'blue',
            colorStyles: {
                active: 'bg-white border-blue-400 shadow-md transform scale-[1.02]',
                inactive: 'bg-white border-transparent shadow-sm hover:border-blue-200',
                iconBg: 'bg-blue-100 text-blue-700',
                text: 'text-blue-600',
                blob: 'bg-blue-400/10'
            }
        },
        {
            title: 'Pedidos Pendientes',
            value: widgets.pendingcount.toString(),
            icon: Clock,
            theme: 'yellow',
            colorStyles: {
                active: 'bg-white border-yellow-400 shadow-md transform scale-[1.02]',
                inactive: 'bg-white border-transparent shadow-sm hover:border-yellow-200',
                iconBg: 'bg-yellow-100 text-yellow-700',
                text: 'text-yellow-600',
                blob: 'bg-yellow-400/10'
            }
        },
        {
            title: 'Cuentas por Pagar',
            value: formatCurrency(widgets.totalPayables),
            icon: CreditCard,
            theme: 'red',
            colorStyles: {
                active: 'bg-white border-red-400 shadow-md transform scale-[1.02]',
                inactive: 'bg-white border-transparent shadow-sm hover:border-red-200',
                iconBg: 'bg-red-100 text-red-700',
                text: 'text-red-600',
                blob: 'bg-red-400/10'
            }
        },
        {
            title: 'Pedidos Recibidos',
            value: widgets.receivedCount?.toString() || '0', // Assuming derived from props or logic
            icon: CheckCircle,
            theme: 'green',
            colorStyles: {
                active: 'bg-white border-emerald-400 shadow-md transform scale-[1.02]',
                inactive: 'bg-white border-transparent shadow-sm hover:border-emerald-200',
                iconBg: 'bg-emerald-100 text-emerald-700',
                text: 'text-emerald-600',
                blob: 'bg-emerald-400/10'
            }
        }
    ]
    // Fix for receivedCount since it wasn't passed directly in widgets prop type but used in kpis
    // We'll calculate it or accept it. The previous code didn't pass it in metrics directly but calculated in parent.
    // I'll assume widgets has everything or I'll adjust. 
    // Wait, the prev file had `widgets` param with totalOrders, pendingcount, totalSpend, totalPayables.
    // receivedCount was calculated in OrdersList but passed... wait.
    // In OrdersList.tsx:
    // widgets={{ totalOrders, pendingcount, totalSpend, totalPayables, topSuppliers }}
    // The previous OrderMetrics didn't use receivedCount in widgets, it used `kpis` prop passed from parent.
    // But now I am defining KPIs locally to match the style. 
    // I need to accept `receivedCount` or `kpis` values.
    // To match SupplierMetrics pattern, I should accept raw data or calc it.
    // But here I'll stick to accepting `widgets` extended.

    // I will use `widgets.totalOrders - widgets.pendingcount` as approximation for received if not passed, 
    // BUT the previous code passed `kpis` which had the values.
    // I will assume `widgets` is the source of truth now and update OrdersList to pass `receivedCount`.

    const renderWidget = () => {
        if (loading) return <div className="w-full h-full bg-gray-50/50 animate-pulse rounded-2xl" />

        const data = widgets.topSuppliers || []

        if (data.length === 0) return <div className="flex items-center justify-center h-full text-gray-300 font-bold uppercase text-xs">Sin datos para graficar</div>

        return (
            <div className="w-full h-full flex flex-col">
                <ComparativeChart data={data} />
            </div>
        )
    }

    return (
        <div className={`w-full mb-6 flex flex-col xl:flex-row gap-6 ${className || ''}`}>
            {/* Left Column: KPIs Grid - Rich Style */}
            <div className="flex-1 grid grid-cols-2 lg:grid-cols-2 gap-4">
                {kpis.map((kpi, i) => (
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

            {/* Right Column: Chart Widget */}
            <div className="w-full xl:w-[320px] shrink-0 bg-white dark:bg-slate-800 rounded-3xl border border-gray-100 dark:border-white/5 shadow-lg p-5 flex flex-col h-[300px] xl:h-auto overflow-hidden relative">
                <div className="flex justify-between items-center mb-6 z-10">
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                        <TrendingUp size={14} className="text-blue-400" /> Top Proveedores
                    </h3>
                </div>

                <div className="flex-1 min-h-0 relative z-10">
                    {renderWidget()}
                </div>

                {/* Background Decoration for Widget */}
                <div className="absolute bottom-0 left-0 w-full h-32 bg-gradient-to-t from-gray-50 to-transparent pointer-events-none opacity-50" />
            </div>
        </div>
    )
}

export type { OrderKPI };
