'use client'

import React, { useEffect, useState, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { Calendar, User, Building2, Eye, Search, Plus, FileText, CheckCircle, Clock, AlertCircle, Filter, DollarSign, CreditCard, Trash2, Store, Users, ShoppingCart } from 'lucide-react'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import ModuleHeader from '@/components/ui/ModuleHeader'
import ModuleTabs from '@/components/ui/ModuleTabs'
import DateRangeFilter from '@/components/ui/DateRangeFilter'
import PageHeader from '@/components/ui/PageHeader'
import OrderForm from './OrderForm'
import OrderDetailModal from './OrderDetailModal'
import OrderMetrics from './OrderMetrics'
import { formatCurrency } from '@/lib/utils'
import { MOCK_PAYMENT_HISTORY } from '@/lib/mock-suppliers'

export default function OrdersList() {
    const [orders, setOrders] = useState<any[]>([])
    const [branches, setBranches] = useState<any[]>([])
    const [selectedBranchId, setSelectedBranchId] = useState<string | null>('all')
    const [loading, setLoading] = useState(true)
    const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null)
    const [searchTerm, setSearchTerm] = useState('')
    const [activeTab, setActiveTab] = useState<string>('all')
    const [activeKpi, setActiveKpi] = useState<string | null>(null)

    // Date Range State
    const [startDate, setStartDate] = useState<string>(() => {
        const date = new Date();
        return new Date(date.getFullYear(), date.getMonth(), 1).toISOString().split('T')[0];
    })
    const [endDate, setEndDate] = useState<string>(() => {
        return new Date().toISOString().split('T')[0];
    })

    // Modal States
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [editingOrderId, setEditingOrderId] = useState<string | null>(null)

    useEffect(() => {
        fetchData()
    }, [startDate, endDate])

    const fetchData = async () => {
        setLoading(true)
        try {
            // Fetch Branches
            const { data: branchesData } = await supabase
                .from('branches')
                .select('id, name')
                .order('name')

            if (branchesData && branchesData.length > 0) {
                setBranches(branchesData)
            }

            // Calculate Date Range
            const startISO = new Date(startDate).toISOString()
            const endISO = new Date(new Date(endDate).setHours(23, 59, 59)).toISOString()

            // Fetch Orders
            const { data: realData, error } = await supabase
                .from('purchase_orders')
                .select(`
                    id, 
                    created_at, 
                    status, 
                    total_amount,
                    last_modified_at,
                    last_edit_type,
                    payment_status,
                    payment_proof_url,
                    invoice_url,
                    branch_id,
                    supplier:suppliers(name),
                    branch:branches(name),
                    requester:users!purchase_orders_requested_by_fkey(full_name)
                `)
                .gte('created_at', startISO)
                .lte('created_at', endISO)
                .order('created_at', { ascending: false })

            if (error) throw error

            let finalData = realData || []



            setOrders(finalData)
        } catch (error) {
            console.error('Error fetching orders:', error)
            // Fallback on error too
            const mockData = MOCK_PAYMENT_HISTORY.map((m: any) => ({
                ...m,
                branch_id: '1',
                requester: { full_name: 'Usuario Demo' },
                last_modified_at: new Date().toISOString(),
                last_edit_type: 'created'
            }))
            // setOrders(mockData)
            setOrders([])
        } finally {
            setLoading(false)
        }
    }

    const handleDelete = async (orderId: string) => {
        if (!confirm('¿Estás seguro de que eliminar este pedido?')) return
        try {
            const { error } = await supabase
                .from('purchase_orders')
                .delete()
                .eq('id', orderId)

            if (error) throw error
            setOrders(prev => prev.filter(o => o.id !== orderId))
            setSelectedOrderId(null)
            fetchData()
        } catch (error) {
            console.error('Error deleting order:', error)
        }
    }

    // Metrics Calculation
    const metrics = useMemo(() => {
        const totalSpend = orders.reduce((sum, o) => sum + (o.total_amount || 0), 0)
        const pendingCount = orders.filter(o => o.status === 'pending').length
        const receivedCount = orders.filter(o => o.status === 'received').length
        const payables = orders
            .filter(o => o.payment_status === 'pending' && o.status !== 'cancelled')
            .reduce((sum, o) => sum + (o.total_amount || 0), 0)

        // Top Suppliers
        const supplierMap: Record<string, number> = {}
        orders.forEach(o => {
            const name = o.supplier?.name || 'Desconocido'
            supplierMap[name] = (supplierMap[name] || 0) + (o.total_amount || 0)
        })

        const topSuppliers = Object.entries(supplierMap)
            .map(([name, total]) => ({ name, total }))
            .sort((a, b) => b.total - a.total)
            .slice(0, 7)

        return {
            totalSpend,
            pendingCount,
            receivedCount,
            payables,
            topSuppliers,
            totalOrders: orders.length
        }
    }, [orders])

    const filteredOrders = orders.filter(order => {
        // Search Filter
        const matchesSearch =
            order.supplier?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            order.requester?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            order.id.includes(searchTerm)

        // Status Filter (Tab)
        const matchesTab = activeTab === 'all' ||
            (activeTab === 'pending' && order.status === 'pending') ||
            (activeTab === 'received' && order.status === 'received') ||
            (activeTab === 'payables' && order.payment_status === 'pending')

        // Branch Filter
        const matchesBranch = selectedBranchId === 'all' || order.branch_id === selectedBranchId

        // KPI Filter
        if (activeKpi === 'Pedidos Pendientes') return matchesSearch && matchesBranch && order.status === 'pending'
        if (activeKpi === 'Cuentas por Pagar') return matchesSearch && matchesBranch && order.payment_status === 'pending'
        if (activeKpi === 'Pedidos Recibidos') return matchesSearch && matchesBranch && order.status === 'received'

        return matchesSearch && matchesTab && matchesBranch
    })

    return (
        <div className="flex gap-2 w-full h-[calc(100vh-4rem)] animate-in fade-in duration-500">
            {/* LEFT PANEL - Static (no scroll) */}
            <div className="w-1/2 flex-shrink-0 flex flex-col gap-3 overflow-y-auto custom-scrollbar pr-2">

                {/* UNIFIED HEADER BLOCK */}
                <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-xl border border-gray-100 dark:border-white/5 flex-shrink-0 relative overflow-hidden">
                    {/* Decorative Blob */}
                    <div className="absolute top-0 right-0 w-64 h-64 bg-pp-gold/5 rounded-full -mr-20 -mt-20 pointer-events-none" />


                    <PageHeader title="Gestión de Pedidos" subtitle="Control de compras e inventario" className="mb-6 relative z-10" />

                    <div className="flex flex-col gap-4 relative z-10">
                        <ModuleHeader
                            searchTerm={searchTerm}
                            onSearchChange={setSearchTerm}
                            searchPlaceholder="Buscar por proveedor, ID..."
                            actions={
                                <Button
                                    onClick={() => {
                                        setEditingOrderId(null)
                                        setIsModalOpen(true)
                                    }}
                                    className="bg-pp-brown hover:bg-pp-brown/90 text-white shadow-lg shadow-pp-brown/20 px-6 py-2.5 h-auto text-sm font-bold rounded-xl"
                                >
                                    <Plus className="mr-2 h-4 w-4" /> Nuevo Pedido
                                </Button>
                            }
                            className="bg-transparent p-0"
                        />

                        {/* FILTERS & TABS BLOCK */}
                        <div className="flex flex-col gap-4 mt-2">
                            <ModuleTabs
                                tabs={[
                                    { id: 'all', label: `Todos (${orders.length})` },
                                    { id: 'pending', label: `Pendientes (${metrics.pendingCount})` },
                                    { id: 'received', label: `Recibidos (${metrics.receivedCount})` },
                                    { id: 'payables', label: `Por Pagar (${orders.filter(o => o.payment_status === 'pending').length})` }
                                ]}
                                activeTabId={activeTab}
                                onTabChange={setActiveTab}
                                labelAll=""
                                className="w-full border-none p-0"
                            />

                            {/* Additional Filters Row */}
                            <div className="flex flex-col xl:flex-row gap-3 items-center bg-gray-50/80 p-3 rounded-2xl border border-gray-100">
                                {/* Branch Filter */}
                                <div className="relative w-full xl:w-auto xl:min-w-[180px]">
                                    <select
                                        title="Filtrar por Sede"
                                        value={selectedBranchId || 'all'}
                                        onChange={(e) => setSelectedBranchId(e.target.value)}
                                        className="w-full appearance-none bg-white border-transparent text-gray-700 py-2.5 pl-4 pr-10 rounded-xl leading-tight focus:outline-none focus:ring-2 focus:ring-pp-gold/20 text-xs font-bold shadow-sm"
                                    >
                                        <option value="all">Todas las Sedes</option>
                                        {branches.map(b => (
                                            <option key={b.id} value={b.id}>{b.name}</option>
                                        ))}
                                    </select>
                                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-400">
                                        <Building2 size={14} />
                                    </div>
                                </div>

                                <div className="hidden xl:block w-px h-8 bg-gray-200 mx-2" />

                                {/* Date Filter */}
                                <DateRangeFilter
                                    startDate={startDate}
                                    endDate={endDate}
                                    onStartDateChange={setStartDate}
                                    onEndDateChange={setEndDate}
                                    onFilter={fetchData}
                                    className="w-full xl:w-auto"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* METRICS - Left Panel */}
                <div className="flex-grow">
                    <OrderMetrics
                        widgets={{
                            totalOrders: metrics.totalOrders,
                            pendingcount: metrics.pendingCount,
                            totalSpend: metrics.totalSpend,
                            totalPayables: metrics.payables,
                            topSuppliers: metrics.topSuppliers,
                            receivedCount: metrics.receivedCount
                        }}
                        activeKpi={activeKpi}
                        onKpiClick={(title) => setActiveKpi(prev => prev === title ? null : title)}
                        className="h-full"
                    />
                </div>
            </div>

            {/* RIGHT PANEL - Scrollable Cards */}
            <div className="w-1/2 overflow-y-auto custom-scrollbar pl-1 pb-20">
                {/* Scrollable container with padding bottom for mobile */}
                <div className="space-y-4">
                    {filteredOrders.length === 0 ? (
                        <div className="flex items-center justify-center p-12 text-gray-300 font-bold uppercase text-sm border-2 border-dashed border-gray-100 rounded-3xl">
                            No se encontraron pedidos
                        </div>
                    ) : (
                        filteredOrders.map(order => {
                            const isReceived = order.status === 'received'
                            const isPaid = order.payment_status === 'paid'
                            const isCancelled = order.status === 'cancelled'

                            // Determine border color based on status
                            const borderColor = isCancelled ? 'border-gray-400' : isReceived ? 'border-emerald-500' : 'border-yellow-400'

                            return (
                                <div
                                    key={order.id}
                                    className={`bg-white dark:bg-slate-800 border dark:border-white/5 rounded-xl p-0 hover:shadow-lg transition-all cursor-pointer overflow-hidden border-l-[6px] ${borderColor}`}
                                >
                                    <div className="p-5">
                                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
                                            <div className="flex items-center gap-3">
                                                <div className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-2 shadow-sm ${isReceived ? 'bg-emerald-100 text-emerald-700' : isCancelled ? 'bg-gray-100 text-gray-500' : 'bg-yellow-100 text-yellow-700'
                                                    }`}>
                                                    <span className="opacity-50">#</span>
                                                    {order.id.slice(0, 8)}
                                                </div>
                                                <h5 className="font-bold text-lg text-gray-800 dark:text-white flex items-center gap-2">
                                                    <Store className="w-4 h-4 text-gray-400" />
                                                    {order.supplier?.name || 'Proveedor'}
                                                </h5>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Badge
                                                    variant={isPaid ? 'success' : 'error'}
                                                    className="font-bold uppercase tracking-wide border"
                                                >
                                                    {isPaid ? 'PAGADO' : 'PENDIENTE PAGO'}
                                                </Badge>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-gray-100 dark:border-white/5">
                                            <div>
                                                <p className="text-[10px] uppercase font-bold text-gray-400 mb-1 tracking-wider">Fecha</p>
                                                <p className="font-bold text-gray-700 text-sm flex items-center gap-2">
                                                    <Calendar className="w-3 h-3 text-gray-400" />
                                                    {new Date(order.created_at).toLocaleDateString('es-CO', { day: '2-digit', month: 'short' })}
                                                </p>
                                            </div>
                                            <div>
                                                <p className="text-[10px] uppercase font-bold text-gray-400 mb-1 tracking-wider">Solicitante</p>
                                                <p className="font-bold text-gray-700 text-sm truncate">
                                                    {order.requester?.full_name?.split(' ')[0] || 'N/A'}
                                                </p>
                                            </div>
                                            <div>
                                                <p className="text-[10px] uppercase font-bold text-gray-400 mb-1 tracking-wider">Total</p>
                                                <p className="font-black text-gray-800 text-lg">
                                                    {formatCurrency(order.total_amount)}
                                                </p>
                                            </div>
                                            <div className="text-right flex items-center justify-end gap-2">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 hover:bg-pp-gold/10 hover:text-pp-brown transition-colors rounded-full"
                                                    onClick={(e) => { e.stopPropagation(); setSelectedOrderId(order.id); }}
                                                    title="Ver Detalle"
                                                >
                                                    <Eye size={16} />
                                                </Button>
                                                {!isReceived && !isCancelled && (
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-full"
                                                        onClick={(e) => { e.stopPropagation(); handleDelete(order.id); }}
                                                        title="Eliminar"
                                                    >
                                                        <Trash2 size={16} />
                                                    </Button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )
                        })
                    )}
                </div>
            </div>

            {/* Modals */}
            <OrderForm
                isOpen={isModalOpen}
                onCancel={() => {
                    setIsModalOpen(false)
                    setEditingOrderId(null)
                }}
                onSuccess={() => {
                    setIsModalOpen(false)
                    setEditingOrderId(null)
                    fetchData()
                }}
                initialOrderId={editingOrderId}
            />

            {selectedOrderId && (
                <OrderDetailModal
                    orderId={selectedOrderId}
                    onClose={() => setSelectedOrderId(null)}
                    onUpdate={fetchData}
                />
            )}
        </div>
    )
}
