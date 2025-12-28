'use client'

import React, { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Calendar, User, Building2, Eye, Search, Plus } from 'lucide-react'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import Card from '@/components/ui/Card'
import ModuleHeader from '@/components/ui/ModuleHeader'
import ModuleTabs from '@/components/ui/ModuleTabs'
import DateRangeFilter from '@/components/ui/DateRangeFilter'
import PageHeader from '@/components/ui/PageHeader'
import Modal from '@/components/ui/Modal'
import OrderForm from './OrderForm'
import OrderDetailModal from './OrderDetailModal'

export default function OrdersList() {
    const [orders, setOrders] = useState<any[]>([])
    const [branches, setBranches] = useState<any[]>([])
    const [selectedBranchId, setSelectedBranchId] = useState<string | null>('all')
    const [loading, setLoading] = useState(true)
    const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null)
    const [searchTerm, setSearchTerm] = useState('')

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
    }, [])

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
            const { data, error } = await supabase
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
                    requester:profiles!purchase_orders_requested_by_fkey(full_name)
                `)
                .gte('created_at', startISO)
                .lte('created_at', endISO)
                .order('created_at', { ascending: false })

            if (error) throw error
            setOrders(data || [])
        } catch (error) {
            console.error('Error fetching orders:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleDelete = async (orderId: string) => {
        try {
            const { error } = await supabase
                .from('purchase_orders')
                .delete()
                .eq('id', orderId)

            if (error) throw error
            setOrders(prev => prev.filter(o => o.id !== orderId))
            setSelectedOrderId(null)
            fetchData()
        } catch (error: any) {
            alert('Error eliminando pedido: ' + error.message)
        }
    }

    const handleCreateOrder = () => {
        setEditingOrderId(null)
        setIsModalOpen(true)
    }

    const handleEditOrder = (orderId: string) => {
        setEditingOrderId(orderId)
        setIsModalOpen(true)
    }

    const handleFormSuccess = () => {
        setIsModalOpen(false)
        setEditingOrderId(null)
        fetchData()
    }


    const filteredOrders = orders.filter(order => {
        const matchesSearch =
            order.supplier?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            order.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
            order.requester?.full_name?.toLowerCase().includes(searchTerm.toLowerCase())

        const matchesBranch = selectedBranchId === 'all' || order.branch_id === selectedBranchId

        return matchesSearch && matchesBranch
    })

    if (loading) return <div className="text-center py-12 text-gray-500">Cargando pedidos...</div>

    return (
        <div className="space-y-6">
            <PageHeader title="Pedidos Proveedores" subtitle="Gestión de compras e insumos" />
            <ModuleHeader
                searchTerm={searchTerm}
                onSearchChange={setSearchTerm}
                searchPlaceholder="Buscar pedido, proveedor..."
                actions={
                    <div className="flex flex-col md:flex-row gap-3 items-end md:items-center">
                        <DateRangeFilter
                            startDate={startDate}
                            endDate={endDate}
                            onStartDateChange={setStartDate}
                            onEndDateChange={setEndDate}
                            onFilter={fetchData}
                            loading={loading}
                        />
                        <Button
                            onClick={handleCreateOrder}
                            startIcon={<Plus className="h-4 w-4" />}
                            className="w-full sm:w-auto h-[38px] mt-2 md:mt-0"
                        >
                            Nuevo Pedido
                        </Button>
                    </div>
                }
            />

            <ModuleTabs
                tabs={branches.map(b => ({ id: b.id, label: b.name }))}
                activeTabId={selectedBranchId || 'all'}
                onTabChange={setSelectedBranchId}
                labelAll="Todas las Sedes"
            />


            {filteredOrders.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-xl border border-gray-100">
                    <p className="text-gray-500">No se encontraron pedidos.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {filteredOrders.map((order) => (
                        <Card
                            key={order.id}
                            className="bg-white p-4 border border-gray-100 flex flex-col gap-3 group cursor-pointer h-full"
                            hover
                            onClick={() => setSelectedOrderId(order.id)}
                        >
                            <div className="flex justify-between items-start">
                                <div>
                                    <h3 className="font-bold text-gray-800 font-display uppercase text-sm line-clamp-1">{order.supplier?.name}</h3>
                                    <p className="text-xs text-gray-500 font-mono">#{order.id.slice(0, 8).toUpperCase()}</p>
                                </div>
                                <Badge variant={order.status === 'received' ? 'success' : 'info'}>
                                    {order.status === 'received' ? 'Recibido' : 'Pendiente'}
                                </Badge>
                            </div>

                            <div className="space-y-2 my-2">
                                <div className="flex items-center gap-2 text-xs text-gray-600">
                                    <Calendar className="h-3.5 w-3.5 text-gray-400" />
                                    <span>{new Date(order.created_at).toLocaleDateString()}</span>
                                </div>
                                <div className="flex items-center gap-2 text-xs text-gray-600">
                                    <User className="h-3.5 w-3.5 text-gray-400" />
                                    <span className="truncate">{order.requester?.full_name || 'N/A'}</span>
                                </div>
                                <div className="flex items-center gap-2 text-xs text-gray-600">
                                    <Building2 className="h-3.5 w-3.5 text-gray-400" />
                                    <span className="truncate">{order.branch?.name}</span>
                                </div>
                            </div>

                            {/* Payment Status Indicator */}
                            <div className="mt-auto pt-3 border-t border-gray-50 flex justify-between items-center">
                                <Badge variant={order.payment_status === 'paid' ? 'success' : 'warning'} className="text-[10px] px-1.5 py-0.5 h-5">
                                    {order.payment_status === 'paid' ? 'PAGADO' : 'POR PAGAR'}
                                </Badge>

                                <div className="opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        className="h-7 w-7 p-0 text-pp-brown hover:bg-pp-gold/10"
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            setSelectedOrderId(order.id)
                                        }}
                                    >
                                        <Eye className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        </Card>
                    ))}
                </div>
            )}

            {selectedOrderId && (
                <OrderDetailModal
                    orderId={selectedOrderId}
                    onClose={() => setSelectedOrderId(null)}
                    onEdit={handleEditOrder}
                    onDelete={handleDelete}
                    onUpdate={fetchData}
                />
            )}

            <Modal
                isOpen={isModalOpen}
                onClose={() => {
                    setIsModalOpen(false)
                    setEditingOrderId(null)
                }}
                title={editingOrderId ? "Editar Orden de Compra" : "Crear Nueva Orden de Compra"}
            >
                <OrderForm
                    initialOrderId={editingOrderId}
                    onSuccess={handleFormSuccess}
                    onCancel={() => {
                        setIsModalOpen(false)
                        setEditingOrderId(null)
                    }}
                />
            </Modal>
        </div>
    )
}
