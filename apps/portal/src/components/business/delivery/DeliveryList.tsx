'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Plus, Search, Truck, MapPin, Calendar, Clock, DollarSign, User } from 'lucide-react'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import Modal from '@/components/ui/Modal'
import ModuleHeader from '@/components/ui/ModuleHeader'
import ModuleTabs from '@/components/ui/ModuleTabs'
import DateRangeFilter from '@/components/ui/DateRangeFilter'
import PageHeader from '@/components/ui/PageHeader'
import Badge from '@/components/ui/Badge'
import DeliveryDetail from './DeliveryDetail'
import DeliveryForm from './DeliveryForm'

export default function DeliveryList() {
    const [deliveries, setDeliveries] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
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
    const [selectedDelivery, setSelectedDelivery] = useState<any | null>(null)
    const [isDetailOpen, setIsDetailOpen] = useState(false)
    const [isFormOpen, setIsFormOpen] = useState(false)
    const [editingDelivery, setEditingDelivery] = useState<any | null>(null)

    const [branches, setBranches] = useState<any[]>([])

    useEffect(() => {
        fetchData()
    }, [])

    const fetchData = async () => {
        setLoading(true)
        // Calculate Date Range
        const startISO = new Date(startDate).toISOString()
        const endISO = new Date(new Date(endDate).setHours(23, 59, 59)).toISOString()

        const [deliveriesReq, branchesReq] = await Promise.all([
            // Reverted to simple select to avoid 400 error due to missing FK
            supabase.from('deliveries')
                .select('*')
                .gte('created_at', startISO)
                .lte('created_at', endISO)
                .order('created_at', { ascending: false }),
            supabase.from('branches').select('*').eq('is_active', true).order('name')
        ])

        if (deliveriesReq.data) {
            console.log('FETCHED DELIVERIES:', deliveriesReq.data)
            setDeliveries(deliveriesReq.data)
        }
        if (branchesReq.data) setBranches(branchesReq.data)
        setLoading(false)
    }

    const handleViewDetail = (delivery: any) => {
        setSelectedDelivery(delivery)
        setIsDetailOpen(true)
    }

    const handleEdit = (delivery?: any) => {
        setEditingDelivery(delivery)
        setIsFormOpen(true)
    }

    const handleSuccess = () => {
        fetchData()
        setIsFormOpen(false)
        setEditingDelivery(null)
    }

    const [activeBranch, setActiveBranch] = useState('all')

    const filteredDeliveries = deliveries.filter(d => {
        const matchesSearch = d.id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            d.assigned_driver?.toLowerCase().includes(searchTerm.toLowerCase())
        const matchesBranch = activeBranch === 'all' || d.branch_id === activeBranch

        // Debug Log
        if (false) console.log('Filtering:', { id: d.id, branch: d.branch_id, activeBranch, matchesBranch })

        return matchesSearch && matchesBranch
    })

    console.log('RENDER LIST:', { total: deliveries.length, filtered: filteredDeliveries.length, activeBranch })

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
            'delivered': 'Entregado',
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
            <PageHeader title="Domicilios" subtitle="Gestión de despachos" />

            {/* Header Actions */}
            <ModuleHeader
                searchTerm={searchTerm}
                onSearchChange={setSearchTerm}
                searchPlaceholder="Buscar por ID, domiciliario..."
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
                            onClick={() => handleEdit(null)}
                            startIcon={<Plus className="h-4 w-4" />}
                            className="w-full sm:w-auto h-[38px] mt-2 md:mt-0"
                        >
                            Nuevo Domicilio
                        </Button>
                    </div>
                }
            />

            {/* Standardized Tabs */}
            <ModuleTabs
                tabs={branches.map(b => ({ id: b.id, label: b.name }))}
                activeTabId={activeBranch}
                onTabChange={setActiveBranch}
                labelAll="Todas las Sedes"
            />

            {/* List Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredDeliveries.map(delivery => (
                    <Card
                        key={delivery.id}
                        className="flex flex-col h-full bg-white p-4 border border-gray-100 group cursor-pointer relative"
                        hover
                        onClick={() => handleViewDetail(delivery)}
                    >
                        {/* Header: Title + ID + Badge */}
                        <div className="flex justify-between items-start mb-3">
                            <div className="flex-1 min-w-0 pr-2">
                                <h3 className="font-bold text-gray-800 font-display uppercase text-sm line-clamp-1">
                                    Domicilio
                                </h3>
                                <p className="text-xs text-gray-500 font-mono mt-0.5 truncate">
                                    #{delivery.id.slice(0, 8).toUpperCase()}
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
                                <span>{new Date(delivery.created_at).toLocaleDateString()}</span>
                                {delivery.last_edited_at && (
                                    <span className="bg-yellow-100 text-yellow-800 text-[10px] px-1.5 py-0.5 rounded border border-yellow-200 font-medium ml-2">
                                        Editado
                                    </span>
                                )}
                            </div>
                            <div className="flex items-center gap-2 text-xs text-gray-600">
                                <User className="h-3.5 w-3.5 text-gray-400" />
                                <span className={!delivery.assigned_driver ? "italic text-gray-400" : ""}>
                                    {delivery.assigned_driver || 'Sin asignar'}
                                </span>
                            </div>
                        </div>

                        {/* Footer (Financials) */}
                        <div className="mt-auto pt-3 border-t border-gray-50 grid grid-cols-2 gap-2">
                            <div>
                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-0.5">Valor Venta</span>
                                <span className="font-bold text-gray-900 font-mono text-sm">
                                    {new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(calculateProductTotal(delivery.product_details))}
                                </span>
                            </div>
                            <div className="text-right">
                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-0.5">Envío</span>
                                <span className="font-bold text-gray-900 font-mono text-sm">
                                    {new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(delivery.delivery_fee)}
                                </span>
                            </div>
                        </div>
                    </Card>
                ))}
            </div>

            {/* Detail Modal */}
            < Modal
                isOpen={isDetailOpen}
                onClose={() => setIsDetailOpen(false)}
                title=""
                maxWidth="max-w-2xl"
                hideHeader={true}
            >
                {selectedDelivery && (
                    <DeliveryDetail
                        delivery={selectedDelivery}
                        onClose={() => setIsDetailOpen(false)}
                        onUpdate={fetchData}
                        onEdit={() => {
                            setIsDetailOpen(false)
                            handleEdit(selectedDelivery)
                        }}
                    />
                )}
            </Modal >

            {/* Form Modal (Placeholder for now) */}
            < Modal
                isOpen={isFormOpen}
                onClose={() => setIsFormOpen(false)}
                title={editingDelivery ? "Editar Domicilio" : "Nuevo Domicilio"}
            >
                <DeliveryForm
                    initialData={editingDelivery}
                    onSuccess={handleSuccess}
                    onCancel={() => setIsFormOpen(false)}
                />
            </Modal >
        </div >
    )
}
