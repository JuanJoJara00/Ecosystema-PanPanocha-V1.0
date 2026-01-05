'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { AlertTriangle, PackageOpen, Eye, Edit2, Trash2, X, Activity, Search, Package, Store, Filter, Plus, Upload, DollarSign, Truck, Clock } from 'lucide-react'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import Modal from '@/components/ui/Modal'
import ModuleHeader from '@/components/ui/ModuleHeader'
import ModuleTabs from '@/components/ui/ModuleTabs'
import PageHeader from '@/components/ui/PageHeader'
import DateRangeFilter from '@/components/ui/DateRangeFilter'
import InventoryForm from './InventoryForm'
import InventoryMetrics from './InventoryMetrics'
import ReceiveStockModal from './ReceiveStockModal'
import CSVImporter from './CSVImporter'
import EmptyState from '@/components/ui/EmptyState'
import Skeleton from '@/components/ui/Skeleton'

type InventoryItem = {
    id: string
    // sku: string  // TODO: Re-enable after PostgREST schema cache refresh
    name: string
    unit: string
    min_stock_alert: number
    unit_cost?: number
    supplier_id?: string
    // WAC Fields
    buying_unit?: string
    usage_unit?: string
    conversion_factor?: number
    last_purchase_price?: number
    weighted_avg_cost?: number
    // Joins
    branch_ingredients?: { branch_id: string, current_stock: number }[]
}

export default function InventoryList() {
    const [items, setItems] = useState<InventoryItem[]>([])
    const [branches, setBranches] = useState<any[]>([])
    const [selectedBranchId, setSelectedBranchId] = useState<string | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [searchTerm, setSearchTerm] = useState('')

    // Filter State
    const [showAllItems, setShowAllItems] = useState(false)

    // Modal States
    const [isFormModalOpen, setIsFormModalOpen] = useState(false)
    const [isImportModalOpen, setIsImportModalOpen] = useState(false)
    const [editingItem, setEditingItem] = useState<any>(null)
    const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null)
    const [isReceiveModalOpen, setIsReceiveModalOpen] = useState(false)
    const [selectedItemForReceive, setSelectedItemForReceive] = useState<InventoryItem | null>(null)

    // Availability Modal State
    const [isAvailabilityModalOpen, setIsAvailabilityModalOpen] = useState(false)
    const [selectedItemForAvailability, setSelectedItemForAvailability] = useState<InventoryItem | null>(null)
    const [branchAvailability, setBranchAvailability] = useState<Record<string, boolean>>({})
    const [dateRange, setDateRange] = useState({ start: '2025-01-01', end: '2025-01-31' })

    useEffect(() => {
        fetchData()
    }, [])

    const fetchData = async () => {
        try {
            setLoading(true)
            // Fetch Branches
            const { data: branchesData } = await supabase
                .from('branches')
                .select('id, name')
                .order('name')

            if (branchesData && branchesData.length > 0) {
                setBranches(branchesData)
                if (!selectedBranchId) {
                    setSelectedBranchId(branchesData[0].id)
                }
            }

            // Fetch Inventory
            const { data: itemsData, error: itemsError } = await supabase
                .from('inventory_items')
                .select('*, branch_ingredients(branch_id, current_stock)')
                .order('name', { ascending: true })  // TODO: Change back to 'sku' after cache refresh

            if (itemsError) throw itemsError
            setItems(itemsData as any || [])
        } catch (err: any) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    const handleDelete = async (id: string) => {
        if (!confirm('¿Estás seguro de eliminar este insumo? Esto podría afectar recetas existentes.')) return
        try {
            const { error } = await supabase.from('inventory_items').delete().eq('id', id)
            if (error) throw error
            setSelectedItem(null)
            fetchData()
        } catch (error: any) {
            alert('Error al eliminar: ' + error.message)
        }
    }

    const openCreate = () => {
        setEditingItem(null)
        setIsFormModalOpen(true)
    }

    const openEdit = (item: any) => {
        setEditingItem(item)
        setIsFormModalOpen(true)
    }

    const handleFormSuccess = () => {
        setIsFormModalOpen(false)
        setEditingItem(null)
        fetchData()
    }

    const handleImportSuccess = () => {
        setIsImportModalOpen(false)
        fetchData()
    }

    const openAvailabilityModal = (item: InventoryItem) => {
        setSelectedItemForAvailability(item)
        setIsAvailabilityModalOpen(true)

        // Calculate availability based on branch_ingredients existence
        const map: Record<string, boolean> = {}
        branches.forEach(b => {
            const hasRecord = item.branch_ingredients?.some(bi => bi.branch_id === b.id)
            map[b.id] = !!hasRecord
        })
        setBranchAvailability(map)
    }

    const toggleBranchAvailability = async (branchId: string, currentStatus: boolean) => {
        if (!selectedItemForAvailability) return

        try {
            const newStatus = !currentStatus

            if (newStatus) {
                // Add to branch
                const { error } = await supabase.from('branch_ingredients').insert({
                    branch_id: branchId,
                    ingredient_id: selectedItemForAvailability.id,
                    current_stock: 0
                })
                if (error) throw error
            } else {
                // Remove from branch
                const { error } = await supabase.from('branch_ingredients')
                    .delete()
                    .match({ branch_id: branchId, ingredient_id: selectedItemForAvailability.id })

                if (error) throw error
            }

            setBranchAvailability(prev => ({
                ...prev,
                [branchId]: newStatus
            }))

            // Background refresh to update list
            fetchData()

        } catch (error: any) {
            console.error('Error toggling availability:', error)
            alert('Error al actualizar disponibilidad: ' + error.message)
        }
    }

    const filteredItems = items.filter(item => {
        const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase())
        // || (item.sku && item.sku.toLowerCase().includes(searchTerm.toLowerCase()))  // TODO: Re-enable SKU search

        // If "showAllItems" is false, only show items that have a record in the selected branch logic
        // We verify if there is an entry in branch_ingredients for this branch
        const isAssignedToBranch = selectedBranchId
            ? item.branch_ingredients?.some(bi => bi.branch_id === selectedBranchId)
            : true

        return matchesSearch && (showAllItems || isAssignedToBranch || searchTerm !== '')
    })

    if (loading) return (
        <div className="space-y-6">
            <PageHeader title="Inventario" subtitle="Gestión de insumos y stock" />
            <ModuleHeader
                searchTerm={searchTerm}
                onSearchChange={setSearchTerm}
                searchPlaceholder="Buscar insumo o SKU..."
            />
            {/* Skeleton Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {[...Array(8)].map((_, i) => (
                    <div key={i} className="flex flex-col gap-2 p-4 border rounded-xl bg-white">
                        <div className="flex justify-between">
                            <Skeleton className="h-6 w-1/2 rounded-md" />
                            <Skeleton className="h-6 w-16 rounded-full" />
                        </div>
                        <Skeleton className="h-12 w-full rounded-lg mt-2" />
                        <div className="flex justify-between mt-auto pt-4">
                            <Skeleton className="h-4 w-1/3" />
                            <Skeleton className="h-4 w-1/3" />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )

    if (error) return (
        <div className="text-center py-8 text-red-500 flex flex-col items-center gap-2 bg-red-50 rounded-xl border border-red-100 p-8">
            <AlertTriangle className="h-8 w-8" />
            <p className="font-medium">Error al cargar inventario: {error}</p>
        </div>
    )



    return (
        <div className="space-y-6">
            <PageHeader
                title="INVENTARIO MATERIA PRIMA"
                subtitle="Gestión de insumos y stock"
                actions={
                    <DateRangeFilter
                        startDate={dateRange.start}
                        endDate={dateRange.end}
                        onStartDateChange={(d) => setDateRange(prev => ({ ...prev, start: d }))}
                        onEndDateChange={(d) => setDateRange(prev => ({ ...prev, end: d }))}
                        onFilter={() => console.log('Filtering...')}
                    />
                }
            />

            {/* Custom Action Toolbar (Aligned with Dashboard) */}
            <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm p-4 rounded-[1.5rem] border border-white/40 dark:border-white/5 shadow-sm flex flex-col md:flex-row gap-4 justify-between items-center">
                <div className="relative w-full md:max-w-md group">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-pp-gold transition-colors">
                        <Search className="h-5 w-5" />
                    </div>

                    <input
                        type="text"
                        placeholder="Buscar insumo o SKU..."
                        className="pl-12 pr-4 py-3 w-full bg-white dark:bg-slate-800 border border-gray-200 dark:border-white/10 rounded-xl focus:ring-4 focus:ring-pp-gold/10 focus:border-pp-gold outline-none transition-all text-sm font-sans placeholder:text-gray-400 dark:placeholder:text-gray-600 dark:text-white"
                        value={searchTerm || ''}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                <div className="flex gap-3 w-full md:w-auto">
                    <Button
                        variant="secondary"
                        onClick={() => setIsImportModalOpen(true)}
                        startIcon={<Upload className="h-4 w-4" />}
                        className="py-3 px-6 h-auto"
                    >
                        Importar
                    </Button>
                    <Button
                        onClick={openCreate}
                        startIcon={<Plus className="h-4 w-4" />}
                        className="py-3 px-6 h-auto bg-pp-gold text-pp-brown hover:bg-pp-gold/90 border-transparent"
                    >
                        Nuevo Insumo
                    </Button>
                </div>
            </div>

            <ModuleTabs
                tabs={branches.map(b => ({ id: b.id, label: b.name }))}
                activeTabId={selectedBranchId || 'all'}
                onTabChange={(id) => setSelectedBranchId(id === 'all' ? null : id)}
                labelAll="Todos"
            />

            {/* Dashboard Sections */}
            <InventoryMetrics
                kpis={[
                    {
                        title: "Valor Total Inventario",
                        value: `$${(items.reduce((acc, item) => acc + (item.unit_cost || 0) * (item.branch_ingredients?.reduce((sum, bi) => sum + bi.quantity, 0) || 0), 0) / 1000000).toFixed(1)}M`,
                        icon: DollarSign,
                        theme: 'yellow',
                        trend: { value: 12, isPositive: true }
                    },
                    {
                        title: "Total Items (SKU)",
                        value: items.length.toString(),
                        icon: Package,
                        theme: 'blue',
                        trend: { value: 4, isPositive: true }
                    },
                    {
                        title: "Stock Crítico",
                        value: items.filter(i => {
                            const totalStock = i.branch_ingredients?.reduce((sum, bi) => sum + bi.quantity, 0) || 0
                            return totalStock <= i.min_stock_alert
                        }).length.toString(),
                        icon: AlertTriangle,
                        theme: 'red',
                        trend: { value: 2, isPositive: false }
                    },
                    {
                        title: "Por Vencer (<7 Días)",
                        value: "0",
                        icon: Clock,
                        theme: 'purple'
                    }
                ]}
                widgets={{
                    criticalCount: items.filter(i => {
                        const totalStock = i.branch_ingredients?.reduce((sum, bi) => sum + bi.quantity, 0) || 0
                        return totalStock <= i.min_stock_alert
                    }).length,
                    criticalNames: items.filter(i => {
                        const totalStock = i.branch_ingredients?.reduce((sum, bi) => sum + bi.quantity, 0) || 0
                        return totalStock <= i.min_stock_alert
                    }).slice(0, 2).map(i => i.name).join(', '),
                    categoryCount: new Set(items.map((i, idx) => idx % 3)).size,  // TODO: Restore SKU-based categories
                    totalItems: items.length
                }}
            />

            {filteredItems.length === 0 ? (
                <EmptyState
                    icon={Package}
                    title="No se encontraron insumos"
                    description="Intenta buscar con otro término o selecciona otra sede."
                    actionLabel="Nuevo Insumo"
                    onAction={openCreate}
                />
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {filteredItems.map((item: any) => {
                        // Find stock for the selected branch
                        const stockRecord = item.branch_ingredients?.find((bi: any) => bi.branch_id === selectedBranchId)
                        const stock = stockRecord?.quantity || 0
                        const supplierName = item.suppliers?.name || '-'
                        const isLowStock = stock <= item.min_stock_alert

                        return (
                            <Card
                                key={item.id}
                                className="flex flex-col p-5 bg-white border border-gray-100 transition-all duration-200 group cursor-pointer h-full rounded-2xl hover:shadow-lg hover:-translate-y-1"
                                hover
                                onClick={() => setSelectedItem(item)}
                            >
                                {/* Header */}
                                <div className="flex justify-between items-start mb-3">
                                    <div>
                                        <h3 className="font-bold text-gray-800 line-clamp-1 text-base font-display uppercase" title={item.name}>
                                            {item.name}
                                        </h3>
                                        {/* <p className="text-xs font-mono text-gray-400 font-medium mt-0.5">{item.sku || 'SIN SKU'}</p> */}
                                    </div>
                                    <Badge variant={isLowStock ? 'error' : 'success'} className="shadow-sm shrink-0">
                                        {isLowStock ? 'Bajo Stock' : 'OK'}
                                    </Badge>
                                </div>

                                {/* Main Stock Display - Centered Body */}
                                <div className="flex-grow flex flex-col items-center justify-center py-6">
                                    <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-2">Stock Actual</span>
                                    <div className="flex items-end justify-center gap-1.5">
                                        <span className={`text-5xl font-bold font-display leading-none ${stock === 0 ? 'text-gray-200' : 'text-pp-brown'}`}>
                                            {stock}
                                        </span>
                                        <span className="text-sm text-gray-400 font-medium mb-1">{item.unit}</span>
                                    </div>
                                </div>

                                {/* Details */}
                                <div className="grid grid-cols-2 gap-3 mt-auto bg-gray-50 rounded-xl p-3">
                                    <div className="flex flex-col">
                                        <div className="flex items-center gap-1 text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                                            <DollarSign className="h-3 w-3 text-pp-gold" />
                                            <span>Costo</span>
                                        </div>
                                        <p className="text-gray-900 font-bold font-mono text-sm leading-tight border-l-2 border-pp-gold/30 pl-2">
                                            ${item.unit_cost?.toLocaleString() || 0}
                                        </p>
                                    </div>
                                    <div className="flex flex-col items-end text-right">
                                        <div className="flex items-center gap-1 text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                                            <span>Proveedor</span>
                                            <Truck className="h-3 w-3 text-pp-brown" />
                                        </div>
                                        <p className="text-pp-brown font-bold text-sm leading-tight truncate w-full border-r-2 border-pp-brown/30 pr-2" title={supplierName}>
                                            {supplierName}
                                        </p>
                                    </div>
                                </div>

                                {/* Actions Footer */}
                                <div className="pt-3 border-t border-gray-100 flex justify-between gap-1 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity items-center">
                                    <Button
                                        onClick={(e) => { e.stopPropagation(); openAvailabilityModal(item) }}
                                        size="sm"
                                        variant="outline"
                                        className="h-7 text-[10px] px-2 border-gray-300 text-gray-500 hover:bg-gray-100"
                                        startIcon={<Store className="h-3 w-3" />}
                                    >
                                        Sedes
                                    </Button>

                                    <div className="flex gap-1">
                                        <Button
                                            onClick={(e) => { e.stopPropagation(); setSelectedItemForReceive(item); setIsReceiveModalOpen(true) }}
                                            size="sm"
                                            variant="ghost"
                                            className="h-7 w-7 p-0 text-gray-500 hover:text-blue-600 hover:bg-blue-50"
                                            title="Recibir Mercancía (WAC)"
                                        >
                                            <Truck className="h-3.5 w-3.5" />
                                        </Button>

                                        <Button
                                            onClick={(e) => { e.stopPropagation(); openEdit(item) }}
                                            size="sm"
                                            variant="ghost"
                                            className="h-7 w-7 p-0 text-gray-500 hover:text-pp-brown hover:bg-gray-100"
                                            title="Editar"
                                        >
                                            <Edit2 className="h-3.5 w-3.5" />
                                        </Button>
                                        <Button
                                            onClick={(e) => { e.stopPropagation(); handleDelete(item.id) }}
                                            size="sm"
                                            variant="ghost"
                                            className="h-7 w-7 p-0 text-gray-400 hover:text-red-600 hover:bg-red-50"
                                            title="Eliminar"
                                        >
                                            <Trash2 className="h-3.5 w-3.5" />
                                        </Button>
                                        <Button
                                            onClick={(e) => { e.stopPropagation(); setSelectedItem(item) }}
                                            size="sm"
                                            variant="ghost"
                                            className="h-7 w-7 p-0 text-pp-brown hover:bg-pp-gold/10"
                                            title="Ver Detalles"
                                        >
                                            <Eye className="h-3.5 w-3.5" />
                                        </Button>
                                    </div>
                                </div>
                            </Card>
                        )
                    })}
                </div>
            )}

            {/* DETAIL MODAL */}
            {selectedItem && (
                <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
                        {/* Header */}
                        <div className="p-6 border-b flex justify-between items-start bg-gray-50/50">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-pp-gold/10 text-pp-brown rounded-xl">
                                    <Package className="h-6 w-6" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold text-gray-900 font-display uppercase">{selectedItem.name}</h2>
                                    {/* <p className="text-sm text-gray-500 font-mono mt-0.5">SKU: {selectedItem.sku || 'N/A'}</p> */}
                                </div>
                            </div>
                            <Button variant="ghost" size="sm" onClick={() => setSelectedItem(null)}>
                                <X className="h-5 w-5" />
                            </Button>
                        </div>

                        {/* Content */}
                        <div className="p-6 overflow-y-auto space-y-6">

                            <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-1">
                                    <label className="text-xs text-gray-400 uppercase tracking-widest font-bold font-display">Unidad</label>
                                    <p className="text-gray-900 font-medium text-lg">{selectedItem.unit}</p>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs text-gray-400 uppercase tracking-widest font-bold font-display">Costo Unitario</label>
                                    <p className="text-gray-900 font-medium text-lg">${selectedItem.unit_cost || 0}</p>
                                </div>

                                <div className="space-y-1">
                                    <label className="text-xs text-gray-400 uppercase tracking-widest font-bold font-display">Stock Alerta</label>
                                    <div className="flex items-center gap-2">
                                        <Activity className="h-4 w-4 text-pp-gold" />
                                        <p className="text-gray-900 font-medium">{selectedItem.min_stock_alert}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-pp-gold/5 rounded-xl p-5 border border-pp-gold/20">
                                <h3 className="text-sm font-bold text-pp-brown mb-3 flex items-center gap-2 font-display uppercase">
                                    <PackageOpen className="h-4 w-4" /> Stock por Sede
                                </h3>
                                <div className="space-y-3">
                                    {branches.map(branch => {
                                        const stock = selectedItem.branch_ingredients?.find((bi: any) => bi.branch_id === branch.id)?.current_stock || 0
                                        return (
                                            <div key={branch.id} className="flex justify-between items-center text-sm p-2 bg-white/60 rounded-lg">
                                                <span className="text-gray-700 font-medium">{branch.name}</span>
                                                <span className="font-bold text-pp-brown bg-pp-gold/20 px-2 py-0.5 rounded-md">{stock} {selectedItem.unit}</span>
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>

                        </div>

                        {/* Footer / Actions */}
                        <div className="p-4 bg-gray-50 border-t flex justify-end gap-3">
                            <Button
                                variant="danger"
                                onClick={() => handleDelete(selectedItem.id)}
                                startIcon={<Trash2 className="h-4 w-4" />}
                            >
                                Eliminar
                            </Button>
                            <Button
                                onClick={() => {
                                    openEdit(selectedItem)
                                    setSelectedItem(null)
                                }}
                                startIcon={<Edit2 className="h-4 w-4" />}
                            >
                                Editar
                            </Button>
                        </div>
                    </div>
                </div>
            )}
            {/* Modals */}
            <Modal
                isOpen={isFormModalOpen}
                onClose={() => setIsFormModalOpen(false)}
                title={editingItem ? "Editar Insumo" : "Agregar Nuevo Insumo"}
            >
                <InventoryForm onSuccess={handleFormSuccess} onCancel={() => setIsFormModalOpen(false)} initialData={editingItem} />
            </Modal>

            <Modal
                isOpen={isImportModalOpen}
                onClose={() => setIsImportModalOpen(false)}
                title="Importar Insumos desde CSV"
            >
                <CSVImporter onSuccess={handleImportSuccess} onCancel={() => setIsImportModalOpen(false)} />
            </Modal>

            {/* AVAILABILITY MODAL */}
            <Modal
                isOpen={isAvailabilityModalOpen}
                onClose={() => setIsAvailabilityModalOpen(false)}
                title="Disponibilidad por Sede"
            >
                {selectedItemForAvailability && (
                    <>
                        <p className="text-sm text-gray-500 mb-4">Insumo: <span className="text-pp-brown font-medium">{selectedItemForAvailability.name}</span></p>

                        <div className="space-y-2 mb-6">
                            {branches.map(branch => {
                                const active = branchAvailability[branch.id] || false

                                return (
                                    <div key={branch.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 transition-colors bg-white">
                                        <div className="flex items-center gap-3">
                                            <Store className={`h-5 w-5 ${active ? 'text-green-600' : 'text-gray-300'}`} />
                                            <span className={`font-medium ${active ? 'text-gray-800' : 'text-gray-400'}`}>{branch.name}</span>
                                        </div>
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input
                                                type="checkbox"
                                                className="sr-only peer"
                                                checked={active}
                                                aria-label={`Disponibilidad en ${branch.name}`}
                                                onChange={() => toggleBranchAvailability(branch.id, active)}
                                            />
                                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-pp-gold/50 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                                        </label>
                                    </div>
                                )
                            })}
                        </div>

                        <div className="bg-yellow-50 p-3 rounded-md mb-4 border border-yellow-100 flex gap-2">
                            <AlertTriangle className="h-4 w-4 text-yellow-600 shrink-0 mt-0.5" />
                            <p className="text-xs text-yellow-700">Desactivar una sede <strong>eliminará</strong> el registro de inventario, incluyendo el stock actual. Esta acción no se puede deshacer.</p>
                        </div>

                        <div className="flex justify-end pt-2 border-t">
                            <Button onClick={() => setIsAvailabilityModalOpen(false)} variant="ghost">Cerrar</Button>
                        </div>
                    </>
                )}
            </Modal>
            {isReceiveModalOpen && selectedItemForReceive && (
                <ReceiveStockModal
                    isOpen={isReceiveModalOpen}
                    onClose={() => setIsReceiveModalOpen(false)}
                    item={selectedItemForReceive}
                    branchId={selectedBranchId || branches[0]?.id} // Default to first branch if "All" selected
                    onSuccess={() => {
                        fetchData()
                    }}
                />
            )}
        </div>
    )
}
