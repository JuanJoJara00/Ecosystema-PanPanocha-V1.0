'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import {
    Search,
    ShoppingBag,
    DollarSign,
    Users,
    Store,
    Calendar,
    ArrowUpRight,
    QrCode,
    CreditCard,
    FileText,
    TrendingUp,
    Plus
} from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import Card from '@/components/ui/Card'
import ModuleHeader from '@/components/ui/ModuleHeader'
import ModuleTabs from '@/components/ui/ModuleTabs'
import SalesDetailModal from './SalesDetailModal'
import SalesFormModal from './SalesFormModal'
import SalesMetrics from './SalesMetrics'
import Image from 'next/image'
import { appConfig } from '@/config/app-config'
import DateRangeFilter from '@/components/ui/DateRangeFilter'
import { MOCK_SALES } from '@/lib/mock-financials'

export default function SalesList() {
    const [sales, setSales] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')
    const [selectedBranch, setSelectedBranch] = useState<string>('all')
    const [selectedSaleId, setSelectedSaleId] = useState<string | null>(null)
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
    const [branches, setBranches] = useState<any[]>([])

    // Filters
    const [dateRange, setDateRange] = useState({
        start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
        end: new Date().toISOString().split('T')[0]
    })

    useEffect(() => {
        fetchBranches()
        fetchSales()
    }, [selectedBranch, dateRange]) // Re-fetch on filter change

    const fetchBranches = async () => {
        const { data } = await supabase.from('branches').select('id, name')
        if (data) setBranches(data)
    }

    const fetchSales = async () => {
        setLoading(true)
        try {
            let query = supabase
                .from('sales')
                .select(`
                    *,
                    branch:branches(name),
                    client:clients(full_name)
                `)
                .order('created_at', { ascending: false })
                .gte('created_at', `${dateRange.start}T00:00:00`)
                .lte('created_at', `${dateRange.end}T23:59:59`)

            if (selectedBranch !== 'all') {
                query = query.eq('branch_id', selectedBranch)
            }

            const { data, error } = await query

            if (error) {
                console.warn('Using MOCK data due to error:', error.message)
                // setSales(MOCK_SALES)
                setSales([])
            } else if (!data || data.length === 0) {
                // If empty range or no records, verify if we should show mocks (User requested seeing mocks)
                // For production this should be empty list, but for this demo request:
                // setSales(MOCK_SALES)
                setSales([])
            } else {
                setSales(data)
            }
        } catch (error) {
            console.error('Error fetching sales:', error)
            // setSales(MOCK_SALES)
            setSales([])
        } finally {
            setLoading(false)
        }
    }

    // Filter locally by search term
    const filteredSales = sales.filter(sale =>
        sale.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        sale.client?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        sale.sale_channel?.toLowerCase().includes(searchTerm.toLowerCase())
    )

    // Calculate Metrics
    const metrics = useMemo(() => {
        const totalAmount = filteredSales.reduce((sum, sale) => sum + (sale.total_amount || 0), 0)
        const totalCount = filteredSales.length
        const avgTicket = totalCount > 0 ? totalAmount / totalCount : 0

        // Mock Trend Data for Chart (Daily Aggregation)
        // Group by Date
        const grouped = filteredSales.reduce((acc, sale) => {
            const date = sale.created_at.split('T')[0]
            acc[date] = (acc[date] || 0) + sale.total_amount
            return acc
        }, {} as Record<string, number>)

        const chartData = Object.entries(grouped)
            .map(([date, value]) => ({ date, value }))
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

        return {
            totalAmount,
            totalCount,
            avgTicket,
            chartData
        }
    }, [filteredSales])

    const kpis = [
        {
            title: 'Ventas Totales',
            value: formatCurrency(metrics.totalAmount),
            icon: DollarSign,
            theme: 'yellow' as const,
            trend: { value: 12, isPositive: true }
        },
        {
            title: 'Transacciones',
            value: metrics.totalCount.toString(),
            icon: ShoppingBag,
            theme: 'blue' as const
        },
        {
            title: 'Ticket Promedio',
            value: formatCurrency(metrics.avgTicket),
            icon: TrendingUp,
            theme: 'green' as const
        },
        {
            title: 'Top Canal',
            value: 'POS', // Placeholder logic, could calculate mode
            icon: Store,
            theme: 'purple' as const
        }
    ]

    return (
        <div className="flex gap-2 w-full h-[calc(100vh-4rem)] animate-in fade-in duration-500">
            {/* LEFT PANEL - Dashboard & Filters */}
            <div className="w-1/2 flex-shrink-0 flex flex-col gap-3 overflow-y-auto custom-scrollbar pr-2">
                <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-white/5 flex-shrink-0">

                    {/* Header */}
                    <div className="flex justify-between items-center mb-6">
                        <div className="flex items-center gap-3">
                            <div className="relative h-12 w-12 shrink-0 transition-transform hover:scale-105 duration-300">
                                <Image
                                    src={appConfig.company.logoUrl}
                                    alt="Logo"
                                    fill
                                    className="object-contain"
                                    priority
                                />
                            </div>
                            <div>
                                <h1 className="text-xl font-black text-gray-900 dark:text-gray-50 tracking-tight uppercase">
                                    Gestión de Ventas
                                </h1>
                                <p className="text-xs text-gray-400 font-medium">Control de ingresos y transacciones</p>
                            </div>
                        </div>

                        {/* Date Filter */}
                        <DateRangeFilter
                            startDate={dateRange.start}
                            endDate={dateRange.end}
                            onStartDateChange={(d) => setDateRange(prev => ({ ...prev, start: d }))}
                            onEndDateChange={(d) => setDateRange(prev => ({ ...prev, end: d }))}
                            onFilter={() => fetchSales()}
                        />
                    </div>

                    <ModuleHeader
                        searchTerm={searchTerm}
                        onSearchChange={setSearchTerm}
                        searchPlaceholder="Buscar venta..."
                        actions={
                            <div className="flex gap-2">
                                <Button variant="outline" size="sm" className="h-9 text-xs">
                                    <FileText size={14} className="mr-2" /> Reporte
                                </Button>
                                <Button
                                    className="h-9 px-4 text-xs font-bold bg-pp-gold text-pp-brown hover:bg-pp-gold/90 shadow-lg shadow-pp-gold/20"
                                    onClick={() => setIsCreateModalOpen(true)}
                                >
                                    <Plus size={14} className="mr-2" /> Nueva Venta
                                </Button>
                            </div>
                        }
                        className="mb-4"
                    />

                    {/* Branch Tabs */}
                    <div className="border-t border-gray-100 pt-2">
                        <ModuleTabs
                            tabs={branches.map(b => ({ id: b.id, label: b.name }))}
                            activeTabId={selectedBranch}
                            onTabChange={setSelectedBranch}
                            labelAll="Todas las Sedes"
                        />
                    </div>
                </div>

                {/* Metrics Dashboard */}
                <div className="flex-grow">
                    <SalesMetrics
                        kpis={kpis}
                        chartData={metrics.chartData}
                    />
                </div>
            </div>

            {/* RIGHT PANEL - Scrollable List */}
            <div className="w-1/2 overflow-y-auto custom-scrollbar pl-1">
                {loading ? (
                    <div className="flex flex-col gap-4">
                        {[1, 2, 3, 4].map(i => (
                            <div key={i} className="h-32 bg-gray-100 animate-pulse rounded-2xl" />
                        ))}
                    </div>
                ) : filteredSales.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center p-8 opacity-60">
                        <ShoppingBag size={48} className="text-gray-300 mb-4" />
                        <h3 className="text-lg font-bold text-gray-900">No hay ventas registradas</h3>
                        <p className="text-sm text-gray-500">Intenta cambiar los filtros de fecha o sede.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-3 pb-20">
                        {filteredSales.map(sale => (
                            <Card
                                key={sale.id}
                                hover
                                onClick={() => setSelectedSaleId(sale.id)}
                                className="group cursor-pointer border-none shadow-sm ring-1 ring-gray-100 hover:ring-pp-gold/30 hover:shadow-lg transition-all"
                            >
                                <div className="p-5 flex justify-between items-center">
                                    <div className="flex items-center gap-4">
                                        {/* Icon Box */}
                                        <div className="h-12 w-12 rounded-2xl bg-pp-gold/10 text-pp-brown flex items-center justify-center shrink-0 group-hover:bg-pp-gold group-hover:text-white transition-colors">
                                            {sale.payment_method === 'cash' ? <DollarSign size={20} /> :
                                                sale.payment_method === 'card' ? <CreditCard size={20} /> : <QrCode size={20} />}
                                        </div>

                                        <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="text-[10px] font-black text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded uppercase tracking-wider">
                                                    #{sale.id.split('-')[0]}
                                                </span>
                                                <Badge variant={sale.sale_channel === 'POS' ? 'neutral' : 'warning'} className="text-[9px] py-0.5 px-1.5">
                                                    {sale.sale_channel || 'POS'}
                                                </Badge>
                                            </div>
                                            <h3 className="font-bold text-gray-900 leading-tight">
                                                {sale.client?.full_name || 'Cliente General'}
                                            </h3>
                                            <div className="flex items-center gap-2 mt-1 text-[10px] text-gray-500 font-medium">
                                                <Store size={10} /> {sale.branch?.name}
                                                <span className="text-gray-300">•</span>
                                                <Calendar size={10} /> {new Date(sale.created_at).toLocaleString()}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="text-right">
                                        <div className="text-xl font-black text-gray-900 group-hover:text-pp-gold transition-colors">
                                            {formatCurrency(sale.total_amount)}
                                        </div>
                                        <div className={`text-[10px] font-bold uppercase tracking-widest mt-1 ${sale.status === 'completed' ? 'text-emerald-500' :
                                            sale.status === 'pending' ? 'text-amber-500' : 'text-red-500'
                                            }`}>
                                            {sale.status === 'completed' ? 'Completado' : sale.status === 'cancelled' ? 'Anulado' : 'Pendiente'}
                                        </div>
                                    </div>
                                </div>
                            </Card>
                        ))}
                    </div>
                )}
            </div>

            {/* Detail Modal */}
            <SalesDetailModal
                saleId={selectedSaleId}
                onClose={() => setSelectedSaleId(null)}
            />

            {/* Create Modal */}
            <SalesFormModal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                onSuccess={() => fetchSales()}
            />
        </div>
    )
}
