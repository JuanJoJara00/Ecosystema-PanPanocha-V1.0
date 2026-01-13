'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Plus, Search, Truck, MapPin, Calendar, Clock, DollarSign, User, ShoppingBag } from 'lucide-react'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import Modal from '@/components/ui/Modal'
import ModuleHeader from '@/components/ui/ModuleHeader'
import ModuleTabs from '@/components/ui/ModuleTabs'
import PageHeader from '@/components/ui/PageHeader'
import Badge from '@/components/ui/Badge'
import RappiDeliveryDetail from './RappiDeliveryDetail'
import RappiDeliveryForm from './RappiDeliveryForm'

import { RappiDelivery } from '@panpanocha/types'

export default function RappiDeliveryList() {
    const [deliveries, setDeliveries] = useState<RappiDelivery[]>([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')

    // Modal States
    const [selectedDelivery, setSelectedDelivery] = useState<RappiDelivery | null>(null)
    const [isDetailOpen, setIsDetailOpen] = useState(false)
    const [isFormOpen, setIsFormOpen] = useState(false)
    const [editingDelivery, setEditingDelivery] = useState<RappiDelivery | null>(null)
    const [branches, setBranches] = useState<any[]>([])
    const [activeBranch, setActiveBranch] = useState('all')

    useEffect(() => {
        fetchData()
    }, [])

    const fetchData = async () => {
        setLoading(true)
        const [deliveriesReq, branchesReq] = await Promise.all([
            // Select from rappi_deliveries
            supabase.from('rappi_deliveries').select('*').order('created_at', { ascending: false }),
            supabase.from('branches').select('*').eq('is_active', true).order('name')
        ])

        if (deliveriesReq.data) {
            setDeliveries(deliveriesReq.data as RappiDelivery[])
        }
        if (branchesReq.data) setBranches(branchesReq.data)
        setLoading(false)
    }

    const handleViewDetail = (delivery: RappiDelivery) => {
        setSelectedDelivery(delivery)
        setIsDetailOpen(true)
    }

    const handleEdit = (delivery?: RappiDelivery | null) => {
        setEditingDelivery(delivery || null)
        setIsFormOpen(true)
    }

    const handleSuccess = () => {
        fetchData()
        setIsFormOpen(false)
        setEditingDelivery(null)
    }

    const filteredDeliveries = deliveries.filter(d => {
        const matchesSearch =
            (d.rappi_order_id?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
            (d.customer_name?.toLowerCase() || '').includes(searchTerm.toLowerCase())
        const matchesBranch = activeBranch === 'all' || d.branch_id === activeBranch

        return matchesSearch && matchesBranch
    })

    const getStatusVariant = (status: string) => {
        const map: Record<string, any> = {
            'pending': 'warning',
            'dispatched': 'info',
            'delivered': 'success',
            'cancelled': 'error'
        }
        return map[status] || 'neutral'
    }

    const getStatusLabel = (status: string) => {
        const map: Record<string, string> = {
            'pending': 'Pendiente',
            'dispatched': 'Despachado',
            'delivered': 'Finalizado',
            'cancelled': 'Cancelado'
        }
        return map[status] || status
    }

    const calculateProductTotal = (details: string) => {
        try {
            const parsed = typeof details === 'string' ? JSON.parse(details) : details
            if (Array.isArray(parsed)) {
                return parsed.reduce((acc: number, item: any) => acc + (item.price * item.quantity), 0)
            }
            return 0
        } catch { return 0 }
    }

    return (
        <div className="space-y-6">
            <PageHeader title="Domicilios Rappi" subtitle="Gestión de pedidos plataforma externa" />

            <ModuleHeader
                searchTerm={searchTerm}
                onSearchChange={setSearchTerm}
                searchPlaceholder="Buscar por Orden Rappi, Cliente..."
                actions={
                    <Button
                        onClick={() => handleEdit(null)}
                        className="bg-[#FF441F] hover:bg-[#FF441F]/90 text-white"
                        startIcon={<Plus className="h-4 w-4" />}
                    >
                        Nuevo Pedido Rappi
                    </Button>
                }
            />

            <ModuleTabs
                tabs={branches.map(b => ({ id: b.id, label: b.name }))}
                activeTabId={activeBranch}
                onTabChange={setActiveBranch}
                labelAll="Todas las Sedes"
            />

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredDeliveries.map(delivery => (
                    <Card
                        key={delivery.id}
                        className="flex flex-col h-full bg-white p-4 border border-gray-100 group cursor-pointer relative hover:border-[#FF441F]/30 transition-colors"
                        onClick={() => handleViewDetail(delivery)}
                    >
                        {/* Header */}
                        <div className="flex justify-between items-start mb-3">
                            <div className="flex-1 min-w-0 pr-2">
                                <div className="flex items-center gap-2 mb-0.5">
                                    <ShoppingBag className="h-3 w-3 text-[#FF441F]" />
                                    <span className="text-[10px] font-bold text-[#FF441F] uppercase tracking-wider">Rappi</span>
                                </div>
                                <h3 className="font-bold text-gray-800 font-display text-lg">
                                    #{delivery.rappi_order_id || '---'}
                                </h3>
                                <p className="text-xs text-gray-500 truncate">
                                    {delivery.customer_name || 'Cliente Desconocido'}
                                </p>
                            </div>
                            <Badge variant={getStatusVariant(delivery.status)} className="shrink-0">
                                {getStatusLabel(delivery.status)}
                            </Badge>
                        </div>

                        {/* Details Body */}
                        <div className="space-y-2 mb-4">
                            <div className="flex items-center gap-2 text-xs text-gray-600">
                                <Calendar className="h-3.5 w-3.5 text-gray-400" />
                                <span>{new Date(delivery.created_at).toLocaleDateString()} {new Date(delivery.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                            {delivery.assigned_driver && (
                                <div className="flex items-center gap-2 text-xs text-gray-600">
                                    <Truck className="h-3.5 w-3.5 text-gray-400" />
                                    <span>{delivery.assigned_driver}</span>
                                </div>
                            )}
                        </div>

                        {/* Footer (Financials) */}
                        <div className="mt-auto pt-3 border-t border-gray-50 grid grid-cols-2 gap-2">
                            <div>
                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-0.5">Total Orden</span>
                                <span className="font-bold text-gray-900 font-mono text-sm">
                                    {new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(calculateProductTotal(delivery.product_details))}
                                </span>
                            </div>
                        </div>
                    </Card>
                ))}
            </div>

            {isDetailOpen && selectedDelivery && (
                <RappiDeliveryDetail
                    isOpen={isDetailOpen}
                    delivery={selectedDelivery}
                    onClose={() => setIsDetailOpen(false)}
                    onUpdate={fetchData}
                    onEdit={() => {
                        setIsDetailOpen(false)
                        handleEdit(selectedDelivery)
                    }}
                />
            )}

            <RappiDeliveryForm
                isOpen={isFormOpen}
                onCancel={() => setIsFormOpen(false)}
                initialData={editingDelivery}
                onSuccess={handleSuccess}
            />
        </div>
    )
}
