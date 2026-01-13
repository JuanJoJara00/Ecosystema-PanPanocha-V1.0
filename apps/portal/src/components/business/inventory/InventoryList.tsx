'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { appConfig } from '@/config/app-config'
import Image from 'next/image'
import { Plus, Search, Filter, Trash2, Edit2, MoreVertical, X, Package, AlertTriangle, Truck, DollarSign, Activity, PackageOpen, Store, History, Image as ImageIcon, Upload, Clock, FileText, Cog } from 'lucide-react'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import Modal from '@/components/ui/Modal'
import ModuleHeader from '@/components/ui/ModuleHeader'
import ModuleTabs from '@/components/ui/ModuleTabs'
import PageHeader from '@/components/ui/PageHeader'
import DateRangeFilter from '@/components/ui/DateRangeFilter'
import { PinCodeModal } from '@/components/ui/PinCodeModal'
import InventoryForm from './InventoryForm'
import InventoryMetrics from './InventoryMetrics'
import ReceiveStockModal from './ReceiveStockModal'
import CSVImporter from './CSVImporter'
import EmptyState from '@/components/ui/EmptyState'
import Skeleton from '@/components/ui/Skeleton'
import InventoryFormModal from './InventoryFormModal'

import { InventoryItem } from '@panpanocha/types'


export default function InventoryList() {
    const [items, setItems] = useState<InventoryItem[]>([])
    const [branches, setBranches] = useState<any[]>([])
    const [selectedBranchId, setSelectedBranchId] = useState<string | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [searchTerm, setSearchTerm] = useState('')
    const [activeType, setActiveType] = useState<'all' | 'raw_material' | 'supply'>('all')

    // Filter State
    const [showAllItems, setShowAllItems] = useState(false)

    // Modal States
    const [isFormModalOpen, setIsFormModalOpen] = useState(false)
    const [isImportModalOpen, setIsImportModalOpen] = useState(false)
    const [isAvailabilityModalOpen, setIsAvailabilityModalOpen] = useState(false)
    const [isReceiveModalOpen, setIsReceiveModalOpen] = useState(false)
    const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false)
    const [movementHistory, setMovementHistory] = useState<any[]>([])
    const [isLoadingHistory, setIsLoadingHistory] = useState(false)

    const [editingItem, setEditingItem] = useState<InventoryItem | null>(null)
    const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null)
    const [selectedItemForAvailability, setSelectedItemForAvailability] = useState<InventoryItem | null>(null)
    const [selectedItemForReceive, setSelectedItemForReceive] = useState<InventoryItem | null>(null)

    // Availability Modal State
    const [branchAvailability, setBranchAvailability] = useState<Record<string, boolean>>({})
    const [dateRange, setDateRange] = useState({ start: '2025-01-01', end: '2025-01-31' })

    const [mockChartData, setMockChartData] = useState<any>(null)

    const [suppliers, setSuppliers] = useState<any[]>([])
    // Delete PIN Modal State
    const [showPinModal, setShowPinModal] = useState(false)
    const [itemToDelete, setItemToDelete] = useState<InventoryItem | null>(null)

    // Dashboard Interaction State
    const [activeKpi, setActiveKpi] = useState<string | null>(null)

    useEffect(() => {
        fetchData()
    }, [dateRange])

    const fetchData = async () => {
        try {
            setLoading(true)
            // Fetch Branches
            const { data: branchesData } = await supabase
                .from('branches')
                .select('id, name')
                .select('id, name')
                .order('name')

            // Mock Data Generation for Charts (until we have real history)
            // Calculate days between start and end
            const start = new Date(dateRange.start)
            const end = new Date(dateRange.end)
            const diffTime = Math.abs(end.getTime() - start.getTime())
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1 // Inclusive

            setMockChartData({
                movements: Array.from({ length: diffDays }, (_, i) => {
                    const d = new Date(start)
                    d.setDate(d.getDate() + i)
                    return {
                        date: d.toISOString().split('T')[0],
                        value: Math.floor(Math.random() * 500000) + 1000000, // 1M - 1.5M range
                    }
                }),
                // NEW: SKU Availability History (How many distinct items had stock > 0)
                unitMovements: Array.from({ length: diffDays }, (_, i) => {
                    const d = new Date(start)
                    d.setDate(d.getDate() + i)
                    // Mock: Fluctuate around 90-98% of total items
                    const total = items?.length || 50;
                    return {
                        date: d.toISOString().split('T')[0],
                        value: Math.floor(total * (0.9 + Math.random() * 0.1)),
                    }
                }),
                consumption: Math.floor(Math.random() * 20) + 5 // Random consumption trend
            })

            if (branchesData && branchesData.length > 0) {
                setBranches(branchesData)
                if (!selectedBranchId) {
                    setSelectedBranchId(branchesData[0].id)
                }
            }

            // Fetch Suppliers
            const { data: suppliersData } = await supabase
                .from('suppliers')
                .select('id, name')
                .order('name')
            setSuppliers(suppliersData || [])

            // Fetch Inventory
            const { data: itemsData, error: itemsError } = await supabase
                .from('inventory_items')
                .select('*, branch_ingredients(branch_id, current_stock, is_active), suppliers(id, name)')
                .order('name', { ascending: true })  // TODO: Change back to 'sku' after cache refresh

            if (itemsError) throw itemsError
            // Cast strictly, ensuring we handle potential mismatches if needed
            setItems(itemsData as unknown as InventoryItem[] || [])
        } catch (err: any) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }


    // New Delete Handlers
    const handleDeleteClick = (item: InventoryItem) => {
        setItemToDelete(item)
        setShowPinModal(true)
    }

    const handleDeleteConfirmed = async (inputPin: string) => {
        const { data: isValid, error: pinError } = await supabase.rpc('verify_action_pin', { input_pin: inputPin })

        if (pinError || !isValid) {
            alert('PIN Incorrecto o sin permisos')
            return
        }

        setShowPinModal(false)
        if (itemToDelete) {
            await performDelete(itemToDelete.id)
            setItemToDelete(null)
        }
    }

    const performDelete = async (id: string) => {
        setLoading(true)
        try {
            const { error } = await supabase.from('inventory_items').delete().eq('id', id)
            if (error) throw error
            setSelectedItem(null)
            fetchData()
        } catch (error: any) {
            alert('Error al eliminar: ' + error.message)
        } finally {
            setLoading(false)
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

        // Calculate availability based on branch_ingredients active status
        const map: Record<string, boolean> = {}
        branches.forEach(b => {
            const record = item.branch_ingredients?.find(bi => bi.branch_id === b.id)
            // Check existence AND is_active flag (default true if undefined)
            const isActive = record ? (record.is_active !== false) : false
            map[b.id] = isActive
        })
        setBranchAvailability(map)
    }

    const toggleBranchAvailability = async (branchId: string, currentStatus: boolean) => {
        if (!selectedItemForAvailability) return

        try {
            const newStatus = !currentStatus

            // Upsert with is_active instead of delete/insert to preserve ID/history if possible
            // Note: If record does not exist, this creates it. If exists, updates it.
            // We need to be careful about current_stock.
            // If we are ENABLING (newStatus=true), and record exists, we keep stock. If not exists, 0.
            // If we are DISABLING (newStatus=false), we KEEP the record but mark inactive.

            // Get existing record if any (from client cache)
            const existingRecord = selectedItemForAvailability.branch_ingredients?.find(bi => bi.branch_id === branchId)

            const payload = {
                branch_id: branchId,
                ingredient_id: selectedItemForAvailability.id,
                is_active: newStatus,
                // Only touch stock if creating fresh (no existing record), otherwise preserve.
                // However, upsert needs all non-default fields. invalid if current_stock is not null?
                // Assuming current_stock has default 0 or we provide it.
                current_stock: existingRecord ? existingRecord.current_stock : 0
            }

            const { error } = await supabase.from('branch_ingredients')
                .upsert(payload, { onConflict: 'branch_id, ingredient_id' })

            if (error) throw error

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

    // History Fetcher
    const fetchHistory = async (item: InventoryItem) => {
        setIsLoadingHistory(true)
        setMovementHistory([])
        try {
            const { data, error } = await supabase
                .from('inventory_movements')
                .select(`
                    *,
                    branches (name)
                `)
                .eq('ingredient_id', item.id)
                .order('created_at', { ascending: false })
                .limit(20)

            if (error) throw error
            setMovementHistory(data || [])
        } catch (error) {
            console.error('Error fetching history:', error)
        } finally {
            setIsLoadingHistory(false)
        }
    }

    const filteredItems = items.filter(item => {
        const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (item.sku ? item.sku.toLowerCase().includes(searchTerm.toLowerCase()) : false)

        // If "showAllItems" is false, only show items that have a record in the selected branch logic
        // We verify if there is an ACTIVE entry in branch_ingredients for this branch
        const isAssignedToBranch = selectedBranchId
            ? item.branch_ingredients?.some(bi => bi.branch_id === selectedBranchId && bi.is_active !== false)
            : true

        // Filter by Item Type
        // If item_type is undefined (legacy data), treat as raw_material for now.
        const matchesType = activeType === 'all' || (item.item_type || 'raw_material') === activeType

        // Filter by KPI
        let matchesKpi = true
        if (activeKpi === 'Stock Crítico') {
            const totalStock = item.branch_ingredients?.reduce((sum, bi) => sum + bi.current_stock, 0) || 0
            matchesKpi = totalStock <= (item.min_stock_alert || 0)
        } else if (activeKpi === 'Por Vencer (<7 Días)') {
            // Placeholder: In future, check lots/expiry
            matchesKpi = false
        }

        return matchesSearch && (showAllItems || isAssignedToBranch || searchTerm !== '') && matchesType && matchesKpi
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



    // Helper: Calculate effective stock for an item based on current filters
    const getEffectiveStock = (item: any) => {
        if (selectedBranchId) {
            return item.branch_ingredients?.find((bi: any) => bi.branch_id === selectedBranchId)?.current_stock || 0
        }
        return item.branch_ingredients?.reduce((sum: number, bi: any) => sum + (bi.current_stock || 0), 0) || 0
    }

    // Helper: Calculate effective min alert
    const getEffectiveAlert = (item: any) => {
        if (selectedBranchId) {
            return item.branch_ingredients?.find((bi: any) => bi.branch_id === selectedBranchId)?.min_stock_alert || 0
        }
        // For 'All', we sum the alerts or take max? Usually sum if we sum stock.
        return item.branch_ingredients?.reduce((sum: number, bi: any) => sum + (bi.min_stock_alert || 0), 0) || 0
    }

    // Dynamic KPI Calculation based on filteredItems
    const totalInventoryValue = filteredItems.reduce((acc, item) => {
        return acc + (item.unit_cost || 0) * getEffectiveStock(item)
    }, 0)

    const totalCriticalItems = filteredItems.filter(i => {
        const stock = getEffectiveStock(i)
        const alert = getEffectiveAlert(i)
        return stock <= alert && alert > 0
    }).length

    const topCriticalList = filteredItems.filter(i => {
        const stock = getEffectiveStock(i)
        const alert = getEffectiveAlert(i)
        return stock <= alert && alert > 0
    }).sort((a, b) => {
        // Sort by deficit magnitude (relative or absolute?)
        return (getEffectiveAlert(b) - getEffectiveStock(b)) - (getEffectiveAlert(a) - getEffectiveStock(a))
    }).slice(0, 5)

    return (
        <div className="flex gap-2 w-full h-[calc(100vh-4rem)]">
            {/* LEFT PANEL - Static (no scroll) */}
            <div className="w-1/2 flex-shrink-0 flex flex-col gap-3 overflow-y-auto">
                {/* UNIFIED HEADER BLOCK */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-white/5">
                    {/* Row 1: Title & Main Type Select */}
                    <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-4">
                        <div className="flex items-center gap-3">
                            <div className="relative h-10 w-10 shrink-0 bg-pp-gold/10 rounded-xl overflow-hidden flex items-center justify-center p-1">
                                <Image
                                    src={appConfig.company.logoUrl}
                                    alt={appConfig.company.name}
                                    fill
                                    className="object-contain"
                                />
                            </div>
                            <div>
                                <h1 className="text-lg font-black text-gray-900 dark:text-white font-display uppercase tracking-tight">
                                    Inventario {activeType === 'all' ? 'General' : (activeType === 'raw_material' ? 'Materia Prima' : 'Insumos')}
                                </h1>
                                <p className="text-gray-500 font-medium text-xs">
                                    Gestión de {activeType === 'all' ? 'todos los items' : (activeType === 'raw_material' ? 'materia prima para recetas' : 'insumos y suministros')}
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 bg-gray-100 dark:bg-slate-800 p-1.5 rounded-xl">
                            <button
                                onClick={() => setActiveType('all')}
                                className={`px-4 py-2 text-sm font-bold rounded-lg transition-all ${activeType === 'all' ? 'bg-white dark:bg-slate-700 shadow-sm text-gray-900 dark:text-white' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
                            >
                                Todos
                            </button>
                            <button
                                onClick={() => setActiveType('raw_material')}
                                className={`px-4 py-2 text-sm font-bold rounded-lg transition-all ${activeType === 'raw_material' ? 'bg-white dark:bg-slate-700 shadow-sm text-pp-brown' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
                            >
                                Materia Prima
                            </button>
                            <button
                                onClick={() => setActiveType('supply')}
                                className={`px-4 py-2 text-sm font-bold rounded-lg transition-all ${activeType === 'supply' ? 'bg-white dark:bg-slate-700 shadow-sm text-pp-brown' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
                            >
                                Insumos
                            </button>
                        </div>

                        {/* Date Filter */}
                        <DateRangeFilter
                            startDate={dateRange.start}
                            endDate={dateRange.end}
                            onStartDateChange={(d) => setDateRange(prev => ({ ...prev, start: d }))}
                            onEndDateChange={(d) => setDateRange(prev => ({ ...prev, end: d }))}
                            onFilter={() => console.log('Filtering...')}
                        />
                    </div>

                    {/* Divider */}
                    <div className="h-px bg-gray-100 dark:bg-white/5 w-full mb-4" />

                    {/* Row 2: Search & Actions */}
                    <div className="flex flex-col lg:flex-row gap-3 justify-between items-center mb-4">
                        {/* Search */}
                        <div className="relative w-full lg:max-w-xl group">
                            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-pp-gold transition-colors">
                                <Search className="h-5 w-5" />
                            </div>
                            <input
                                type="text"
                                placeholder="Buscar insumo, SKU o proveedor..."
                                className="pl-10 pr-4 py-2.5 w-full bg-gray-50 dark:bg-slate-800 border border-transparent focus:bg-white dark:focus:bg-slate-700 border-gray-100 dark:border-white/5 rounded-xl focus:ring-4 focus:ring-pp-gold/10 focus:border-pp-gold outline-none transition-all text-sm font-bold placeholder:text-gray-400 dark:placeholder:text-gray-500 dark:text-white"
                                value={searchTerm || ''}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>

                        {/* Actions */}
                        <div className="flex gap-2 w-full lg:w-auto">
                            <Button
                                variant="secondary"
                                onClick={() => console.log("Generar Reporte")}
                                startIcon={<FileText className="h-4 w-4" />}
                                className="py-2 px-4 h-auto font-bold rounded-lg border-gray-200 hover:bg-gray-50 text-gray-600 text-sm"
                            >
                                Reporte
                            </Button>
                            <Button
                                variant="secondary"
                                onClick={() => setIsImportModalOpen(true)}
                                startIcon={<Upload className="h-4 w-4" />}
                                className="py-2 px-4 h-auto font-bold rounded-lg border-gray-200 hover:bg-gray-50 text-gray-600 text-sm"
                            >
                                Importar
                            </Button>
                            <Button
                                onClick={openCreate}
                                startIcon={<Plus className="h-4 w-4" />}
                                className="py-2 px-5 h-auto bg-pp-gold text-pp-brown hover:bg-pp-gold/90 border-transparent font-black rounded-lg shadow-md shadow-pp-gold/20 text-sm"
                            >
                                Nuevo Insumo
                            </Button>
                        </div>
                    </div>

                    {/* Row 3: Branch Tabs (Integrated) */}
                    <div className="border-t border-gray-100 dark:border-white/5 pt-2">
                        <ModuleTabs
                            tabs={branches.map(b => ({ id: b.id, label: b.name }))}
                            activeTabId={selectedBranchId || 'all'}
                            onTabChange={(id) => setSelectedBranchId(id === 'all' ? null : id)}
                            labelAll="Todos"
                        />
                    </div>
                </div>

                {/* Dashboard Sections - in left panel */}
                <InventoryMetrics
                    chartData={mockChartData}
                    dateRange={dateRange}
                    kpis={[
                        {
                            title: "Valor Total Inventario",
                            value: `$${(totalInventoryValue / 1000000).toFixed(1)}M`,
                            icon: DollarSign,
                            theme: 'yellow',
                            trend: { value: 12, isPositive: true }
                        },
                        {
                            title: "Total Items (SKU)",
                            value: filteredItems.length.toString(),
                            icon: Package,
                            theme: 'blue',
                            trend: { value: 4, isPositive: true }
                        },
                        {
                            title: "Stock Crítico",
                            value: totalCriticalItems.toString(),
                            icon: AlertTriangle,
                            theme: 'red',
                            trend: { value: 2, isPositive: false }
                        }
                    ]}
                    widgets={{
                        deadStockValue: totalInventoryValue * 0.05,
                        criticalCount: totalCriticalItems,
                        criticalNames: topCriticalList.slice(0, 2).map(i => i.name).join(', '),
                        daysOnHand: ((totalInventoryValue / (items.length * 10000)) * 5 + 4).toFixed(1),
                        topExpenseItem: (() => {
                            const sorted = [...filteredItems].sort((a, b) => {
                                return ((b.unit_cost || 0) * getEffectiveStock(b)) - ((a.unit_cost || 0) * getEffectiveStock(a))
                            });
                            const top = sorted[0];
                            const topVal = top ? ((top.unit_cost || 0) * getEffectiveStock(top)) : 0;
                            const pct = totalInventoryValue > 0 ? ((topVal / totalInventoryValue) * 100).toFixed(1) : 0;
                            return top ? { name: top.name, percentage: Number(pct) } : { name: '-', percentage: 0 };
                        })(),
                        purchaseEfficiency: {
                            value: 5.2,
                            isPositive: false
                        },
                        categoryCount: 0,
                        totalItems: filteredItems.length,
                        topCriticalItems: topCriticalList.map(i => ({
                            name: i.name,
                            stock: getEffectiveStock(i),
                            alert: getEffectiveAlert(i),
                            unit: i.unit
                        })),
                        categoryDistribution: [
                            { name: 'Materia Prima', count: filteredItems.filter(i => (i.item_type || 'raw_material') === 'raw_material').length },
                            { name: 'Insumos', count: filteredItems.filter(i => i.item_type === 'supply').length }
                        ]
                    }}
                    activeKpi={activeKpi}
                    onKpiClick={(title) => {
                        if (activeKpi === title) {
                            setActiveKpi(null)
                        } else {
                            setActiveKpi(title)
                        }
                    }}
                />
            </div>

            {/* RIGHT PANEL - Scrollable Cards */}
            <div className="w-1/2 overflow-y-auto">
                {filteredItems.length === 0 ? (
                    <EmptyState
                        icon={Package}
                        title="No se encontraron insumos"
                        description="Intenta buscar con otro término o selecciona otra sede."
                        actionLabel="Nuevo Insumo"
                        onAction={openCreate}
                    />
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {filteredItems.map((item: any) => {
                            // Find stock for the selected branch
                            const stockRecord = item.branch_ingredients?.find((bi: any) => bi.branch_id === selectedBranchId)
                            const stock = stockRecord?.current_stock || 0
                            const supplierName = item.suppliers?.name || '-'
                            const isLowStock = stock <= item.min_stock_alert
                            // Check if active in this branch (if filteredItems logic allows inactive, we might show them? But standard filter hides them)
                            // If showAllItems is true, we might see inactive ones.
                            // Let's assume visual cue for inactive?

                            return (
                                <Card
                                    key={item.id}
                                    noPadding
                                    className="flex flex-col bg-white border border-gray-100 transition-all duration-200 group cursor-pointer h-full rounded-2xl hover:shadow-lg hover:-translate-y-1 overflow-hidden !p-0"
                                    hover
                                    onClick={() => setSelectedItem(item)}
                                >
                                    {/* HEADER IMAGE - Full Bleed */}
                                    <div className="h-44 w-full bg-gray-50 flex items-center justify-center relative overflow-hidden shrink-0">
                                        {item.image_url ? (
                                            // eslint-disable-next-line @next/next/no-img-element
                                            <img
                                                src={item.image_url}
                                                alt={item.name}
                                                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                                            />
                                        ) : (
                                            <div className="flex flex-col items-center justify-center opacity-30 text-gray-300">
                                                {item.item_type === 'supply' ? <PackageOpen size={48} /> : <ImageIcon size={48} />}
                                                <span className="text-[10px] uppercase font-bold tracking-widest mt-2">{item.item_type === 'supply' ? 'Insumo' : 'Materia Prima'}</span>
                                            </div>
                                        )}

                                        {/* Type Badge Floating */}
                                        <div className="absolute top-3 right-3 z-10">
                                            <span className={`text-[9px] font-black px-2 py-1 rounded-lg uppercase tracking-wider shadow-sm backdrop-blur-md ${item.item_type === 'supply' ? 'bg-blue-100/90 text-blue-700' : 'bg-orange-100/90 text-orange-700'}`}>
                                                {item.item_type === 'supply' ? 'INS' : 'MAT'}
                                            </span>
                                        </div>
                                    </div>

                                    {/* CARD CONTENT */}
                                    <div className="p-5 flex flex-col flex-grow relative">
                                        {/* Valid Low Stock logic */}
                                        {(() => {
                                            // Logic for Min Stock: If specific branch selected, use that record's alert.
                                            // If "All" (null), sum all alerts from active relations.
                                            let displayedMinAlert = 0
                                            if (selectedBranchId) {
                                                displayedMinAlert = item.branch_ingredients?.find((bi: any) => bi.branch_id === selectedBranchId)?.min_stock_alert || 0
                                            } else {
                                                displayedMinAlert = item.branch_ingredients?.reduce((sum: number, bi: any) => sum + (bi.min_stock_alert || 0), 0) || 0
                                            }

                                            // stock is already calculated above as 'stock' variable, but let's be sure about scope
                                            // The outer scope 'stock' variable logic was:
                                            // const stockRecord = item.branch_ingredients?.find(...) -> this is specific branch logic
                                            // Warning: The outer 'stock' variable (line 440) works for Single Branch.
                                            // For "All Branches", we likely want Total Stock?
                                            // Currently line 440: item.branch_ingredients?.find(...) -- ONLY works if selectedBranchId is set.
                                            // If selectedBranchId is null, stockRecord is undefined, stock is 0.
                                            // FIX: Calculate Total Stock if no branch selected.
                                            let displayedStock = stock
                                            if (!selectedBranchId) {
                                                displayedStock = item.branch_ingredients?.reduce((sum: number, bi: any) => sum + (bi.current_stock || 0), 0) || 0
                                            }

                                            const isLow = displayedStock <= displayedMinAlert

                                            return (
                                                <>
                                                    <div className="flex justify-between items-start gap-2 mb-1">
                                                        <h3 className="font-black text-gray-900 leading-snug text-[15px] font-display uppercase line-clamp-2" title={item.name}>
                                                            {item.name}
                                                        </h3>
                                                        <Badge variant={isLow ? 'error' : 'success'} className="shadow-sm py-0.5 px-1.5 text-[9px] shrink-0">
                                                            {isLow ? 'Stock Bajo' : 'OK'}
                                                        </Badge>
                                                    </div>

                                                    <div className="flex flex-wrap items-center gap-2 mb-4">
                                                        <p className="text-[10px] font-mono text-gray-500 font-bold bg-gray-100 px-1.5 py-0.5 rounded w-fit">
                                                            {item.sku || 'SIN SKU'}
                                                        </p>
                                                        {item.suppliers?.name && (
                                                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider flex items-center gap-1">
                                                                <Store size={10} />
                                                                {item.suppliers.name}
                                                            </p>
                                                        )}
                                                    </div>

                                                    {/* Main Stock Display */}
                                                    <div className="flex-grow flex flex-col items-center justify-center py-2 mb-4">
                                                        <div className="flex items-baseline justify-center gap-1">
                                                            <span className={`text-5xl font-black font-display tracking-tight ${displayedStock === 0 ? 'text-gray-300' : 'text-pp-brown'}`}>
                                                                {displayedStock}
                                                            </span>
                                                            <span className="text-sm text-gray-500 font-bold lowercase">{item.unit === 'unidad' ? 'und' : item.unit}</span>
                                                        </div>
                                                        {item.buying_unit && item.buying_unit !== item.unit && (
                                                            <div className="flex flex-col items-center mt-1">
                                                                <div className="text-[10px] text-gray-500 bg-gray-50 px-3 py-1 rounded-full border border-gray-100 flex items-center gap-1">
                                                                    <span className="font-bold">Compra:</span> {item.buying_unit}
                                                                </div>
                                                                {item.conversion_factor > 1 && (
                                                                    <div className="text-[9px] text-gray-400 mt-0.5">
                                                                        (x{item.conversion_factor} {item.unit})
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Details Footer */}
                                                    <div className="grid grid-cols-2 gap-0 border-t border-gray-100 pt-4 mt-auto">
                                                        <div className="flex flex-col items-center justify-center border-r border-gray-100 px-2 text-center">
                                                            <span className="text-[10px] text-gray-400 uppercase tracking-widest font-extrabold mb-1">Costo</span>
                                                            <span className="text-gray-800 font-black font-mono text-xl leading-none">
                                                                ${item.unit_cost?.toLocaleString() || 0}
                                                                <span className="text-[10px] font-bold text-gray-400 ml-1">/{item.unit === 'unidad' ? 'und' : item.unit}</span>
                                                            </span>
                                                        </div>
                                                        <div className="flex flex-col items-center justify-center px-2 text-center">
                                                            <span className="text-[10px] text-gray-400 uppercase tracking-widest font-extrabold mb-1">Mínimo</span>
                                                            <span className="text-gray-500 font-bold text-xl leading-none">
                                                                {displayedMinAlert}
                                                                <span className="text-[10px] font-bold text-gray-300 ml-1 lowercase">{item.unit === 'unidad' ? 'und' : item.unit}</span>
                                                            </span>
                                                        </div>
                                                    </div>
                                                </>
                                            )
                                        })()}
                                    </div>
                                </Card>
                            )
                        })}
                    </div >
                )}

                {/* DETAIL MODAL - PREMIUM SPLIT PANE */}
                {
                    selectedItem && (
                        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50 backdrop-blur-md animate-in fade-in duration-300">
                            <div className="bg-white/90 backdrop-blur-xl rounded-[2.5rem] shadow-2xl w-full max-w-5xl overflow-hidden flex flex-col md:flex-row max-h-[90vh] animate-in zoom-in-95 duration-300 border border-white/20">
                                {/* Left Panel: Information */}
                                <div className="flex-1 overflow-y-auto custom-scrollbar border-r border-gray-100">
                                    {/* Header Section */}
                                    <div className="relative h-72 w-full bg-gray-100">
                                        {selectedItem.image_url ? (
                                            <img
                                                src={selectedItem.image_url}
                                                alt={selectedItem.name}
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <div className="w-full h-full flex flex-col items-center justify-center text-gray-300">
                                                <ImageIcon className="h-20 w-20 opacity-20" />
                                                <span className="text-xs font-bold uppercase tracking-widest mt-4 opacity-40">Sin Imagen</span>
                                            </div>
                                        )}
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                                        <div className="absolute bottom-8 left-8 right-8">
                                            <div className="flex items-center gap-3 mb-3">
                                                <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border backdrop-blur-md ${selectedItem.item_type === 'supply'
                                                    ? 'bg-blue-500/20 text-blue-200 border-blue-400/30'
                                                    : 'bg-orange-500/20 text-orange-200 border-orange-400/30'
                                                    }`}>
                                                    {selectedItem.item_type === 'supply' ? 'Insumo' : 'Materia Prima'}
                                                </span>
                                                <span className="bg-white/10 backdrop-blur-md text-white/90 px-3 py-1 rounded-full text-[10px] font-mono font-bold border border-white/10 uppercase tracking-widest">
                                                    {selectedItem.sku || 'SIN SKU'}
                                                </span>
                                            </div>
                                            <h2 className="text-4xl font-black text-white font-display uppercase tracking-tight leading-none">
                                                {selectedItem.name}
                                            </h2>
                                        </div>
                                        <button
                                            onClick={() => setSelectedItem(null)}
                                            title="Cerrar detalle"
                                            className="absolute top-6 right-6 p-2 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-full text-white transition-all border border-white/10"
                                        >
                                            <X className="h-6 w-6" />
                                        </button>
                                    </div>

                                    {/* Info Content */}
                                    <div className="p-8 space-y-10">
                                        {/* Core Stats */}
                                        <div className="grid grid-cols-2 gap-8">
                                            <div className="space-y-1">
                                                <label className="text-[10px] text-gray-400 uppercase tracking-widest font-black">Unidad de Uso</label>
                                                <p className="text-2xl font-black text-gray-900 capitalize">{selectedItem.unit}</p>
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-[10px] text-gray-400 uppercase tracking-widest font-black">Costo de Uso</label>
                                                <div className="flex items-baseline gap-1">
                                                    <span className="text-sm font-bold text-gray-400 leading-none">$</span>
                                                    <p className="text-2xl font-black text-gray-900 leading-none">
                                                        {selectedItem.unit_cost?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Configuration Details */}
                                        <div className="bg-gray-50/50 rounded-3xl p-6 border border-gray-100">
                                            <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                                                <Cog className="h-3 w-3" /> Configuración Operativa
                                            </h3>
                                            <div className="grid grid-cols-2 gap-6">
                                                <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
                                                    <p className="text-[10px] text-gray-400 font-bold uppercase mb-1">Unidad de Compra</p>
                                                    <p className="text-sm font-black text-gray-700 uppercase">{selectedItem.buying_unit || 'No definida'}</p>
                                                </div>
                                                <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
                                                    <p className="text-[10px] text-gray-400 font-bold uppercase mb-1">Factor Conversión</p>
                                                    <p className="text-sm font-black text-gray-700">1 {selectedItem.buying_unit} = {selectedItem.conversion_factor} {selectedItem.unit}</p>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Supplier */}
                                        {selectedItem.suppliers && (
                                            <div className="bg-orange-50/30 rounded-3xl p-6 border border-orange-100/50">
                                                <h3 className="text-[10px] font-black text-orange-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                                                    <Truck className="h-3 w-3" /> Proveedor Principal
                                                </h3>
                                                <div className="flex items-center gap-4">
                                                    <div className="h-12 w-12 rounded-xl bg-white border border-orange-100 flex items-center justify-center text-orange-500 shadow-sm">
                                                        <Truck className="h-6 w-6" />
                                                    </div>
                                                    <div>
                                                        <p className="text-lg font-black text-pp-brown uppercase leading-none">{selectedItem.suppliers.name}</p>
                                                        <p className="text-[10px] text-orange-500/70 font-bold mt-1 uppercase tracking-wider">Proveedor Verificado</p>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Right Panel: Analytics & Actions */}
                                <div className="w-full md:w-[400px] bg-gray-50/50 p-8 flex flex-col">
                                    <div className="flex-1 space-y-8">
                                        {/* Stock Section */}
                                        <div className="space-y-4">
                                            <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] flex items-center justify-between">
                                                <span>Distribución de Stock</span>
                                                <Store className="h-3 w-3" />
                                            </h3>
                                            <div className="space-y-3">
                                                {branches.map(branch => {
                                                    const record = selectedItem.branch_ingredients?.find((bi: any) => bi.branch_id === branch.id)
                                                    const stock = record?.current_stock || 0
                                                    const isActive = record?.is_active !== false
                                                    const isLow = stock <= (selectedItem.min_stock_alert || 0)

                                                    if (!isActive && stock === 0) return null

                                                    return (
                                                        <div key={branch.id} className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex justify-between items-center group hover:border-orange-200 transition-all">
                                                            <div>
                                                                <p className="text-xs font-bold text-gray-500 uppercase tracking-tight">{branch.name}</p>
                                                                {isLow && (
                                                                    <span className="text-[9px] font-black text-red-500 uppercase flex items-center gap-1 mt-1 animate-pulse">
                                                                        <AlertTriangle className="h-2.5 w-2.5" /> Stock Crítico
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <div className="text-right">
                                                                <div className="flex items-baseline gap-1">
                                                                    <p className={`text-xl font-black leading-none ${isLow ? 'text-red-600' : 'text-pp-brown'}`}>{stock}</p>
                                                                    <span className="text-[9px] font-black text-gray-400 uppercase">{selectedItem.unit}</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )
                                                })}
                                            </div>
                                        </div>

                                        {/* Value Card */}
                                        <div className="bg-pp-brown p-6 rounded-[2rem] text-white shadow-xl shadow-pp-brown/20 relative overflow-hidden">
                                            <div className="absolute top-0 right-0 p-8 opacity-10">
                                                <DollarSign className="h-24 w-24" />
                                            </div>
                                            <div className="relative z-10">
                                                <p className="text-[10px] font-black text-orange-200 uppercase tracking-[0.2em] mb-1">Valorización Total</p>
                                                <div className="flex items-baseline gap-1">
                                                    <span className="text-lg font-bold text-orange-200/50">$</span>
                                                    <p className="text-4xl font-black">
                                                        {((selectedItem.branch_ingredients?.reduce((sum, bi) => sum + (bi.current_stock || 0), 0) || 0) * (selectedItem.unit_cost || 0)).toLocaleString()}
                                                    </p>
                                                </div>
                                                <p className="text-[9px] text-orange-200/40 font-bold uppercase mt-4 tracking-widest border-t border-white/10 pt-4">Calculado según costo actual</p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="mt-8 space-y-3">
                                        <div className="grid grid-cols-2 gap-3">
                                            <Button
                                                variant="outline"
                                                onClick={() => {
                                                    setIsHistoryModalOpen(true)
                                                    fetchHistory(selectedItem)
                                                }}
                                                className="rounded-2xl border-gray-200 font-bold text-xs h-12 uppercase tracking-widest"
                                            >
                                                <History className="h-4 w-4 mr-2" /> Historial
                                            </Button>
                                            <Button
                                                variant="secondary"
                                                onClick={() => {
                                                    setEditingItem(selectedItem)
                                                    setIsFormModalOpen(true)
                                                }}
                                                className="rounded-2xl bg-orange-100 text-orange-700 hover:bg-orange-200 border-none font-bold text-xs h-12 uppercase tracking-widest"
                                            >
                                                <Edit2 className="h-4 w-4 mr-2" /> Editar
                                            </Button>
                                        </div>
                                        <Button
                                            variant="danger"
                                            onClick={() => handleDeleteClick(selectedItem)}
                                            className="w-full rounded-2xl bg-red-50 text-red-600 hover:bg-red-100 border-none font-bold text-xs h-12 uppercase tracking-widest"
                                        >
                                            <Trash2 className="h-4 w-4 mr-2" /> Eliminar Item
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )
                }
                {/* Modals */}
                {/* NEW INVENTORY FORM MODAL */}
                <InventoryFormModal
                    isOpen={isFormModalOpen}
                    onClose={() => setIsFormModalOpen(false)}
                    onSubmit={async (data, branchConfigs) => {
                        const { data: { user } } = await supabase.auth.getUser()
                        if (!user) throw new Error("No user found")
                        const { data: profile } = await supabase.from('users').select('organization_id').eq('id', user.id).single()
                        if (!profile?.organization_id) throw new Error("No organization found")

                        const payload = {
                            organization_id: profile.organization_id,
                            sku: data.sku,
                            name: data.name,
                            supplier_id: data.supplier_id || null,
                            item_type: data.item_type,
                            image_url: data.image_url,
                            unit: data.usage_unit,
                            unit_cost: data.unit_cost,
                            buying_unit: data.buying_unit,
                            usage_unit: data.usage_unit,
                            conversion_factor: data.conversion_factor
                        }

                        const { data: newItem, error } = await supabase
                            .from('inventory_items')
                            .upsert([editingItem ? { ...payload, id: editingItem.id } : payload])
                            .select()
                            .single()

                        if (error) throw error

                        if (!editingItem && newItem && branchConfigs) {
                            const stockPromises = branches.map(async (branch) => {
                                const config = branchConfigs[branch.id] || { stock: 0, alert: 0 }
                                const finalStock = config.stock * data.conversion_factor
                                const finalAlert = config.alert * data.conversion_factor

                                await supabase.from('branch_ingredients').upsert({
                                    branch_id: branch.id,
                                    ingredient_id: newItem.id,
                                    current_stock: finalStock,
                                    min_stock_alert: finalAlert,
                                }, { onConflict: 'branch_id,ingredient_id' })
                            })
                            await Promise.all(stockPromises)
                        }
                        handleFormSuccess()
                    }}
                    editingItem={editingItem}
                    suppliers={suppliers}
                    branches={branches}
                />

                <Modal
                    isOpen={isImportModalOpen}
                    onClose={() => setIsImportModalOpen(false)}
                    title="Importar Insumos desde CSV"
                >
                    <CSVImporter onSuccess={handleImportSuccess} onCancel={() => setIsImportModalOpen(false)} />
                </Modal>

                {/* History Modal */}
                <Modal
                    isOpen={isHistoryModalOpen}
                    onClose={() => setIsHistoryModalOpen(false)}
                    title="Historial de Movimientos"
                >
                    <div className="space-y-4">
                        {selectedItem && (
                            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-100">
                                <div className={`p-2 rounded-lg ${selectedItem.item_type === 'supply' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'}`}>
                                    {selectedItem.item_type === 'supply' ? <PackageOpen className="h-5 w-5" /> : <Package className="h-5 w-5" />}
                                </div>
                                <div>
                                    <h3 className="font-bold text-gray-900">{selectedItem.name}</h3>
                                    <p className="text-xs text-gray-500 font-mono">{selectedItem.sku}</p>
                                </div>
                            </div>
                        )}

                        {isLoadingHistory ? (
                            <div className="flex justify-center py-8">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pp-brown"></div>
                            </div>
                        ) : movementHistory.length === 0 ? (
                            <div className="text-center py-8 text-gray-400">
                                <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
                                <p>No hay movimientos registrados</p>
                            </div>
                        ) : (
                            <div className="overflow-hidden rounded-lg border border-gray-200">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha</th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tipo</th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sede</th>
                                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Cant.</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {movementHistory.map((move) => (
                                            <tr key={move.id}>
                                                <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-500">
                                                    {new Date(move.created_at).toLocaleDateString()} <br />
                                                    <span className="text-[10px] text-gray-400">{new Date(move.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                </td>
                                                <td className="px-4 py-3 whitespace-nowrap">
                                                    <span className={`px-2 py-0.5 inline-flex text-[10px] leading-5 font-semibold rounded-full 
                                                    ${move.movement_type === 'in' ? 'bg-green-100 text-green-800' :
                                                            move.movement_type === 'out' ? 'bg-red-100 text-red-800' :
                                                                move.movement_type === 'sale' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'}`}>
                                                        {move.movement_type === 'in' ? 'ENTRADA' :
                                                            move.movement_type === 'out' ? 'SALIDA' :
                                                                move.movement_type === 'sale' ? 'VENTA' : move.movement_type.toUpperCase()}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-500">
                                                    {move.branches?.name || 'General'}
                                                </td>
                                                <td className={`px-4 py-3 whitespace-nowrap text-sm font-bold text-right ${['out', 'sale', 'waste'].includes(move.movement_type) ? 'text-red-600' : 'text-green-600'}`}>
                                                    {['out', 'sale', 'waste'].includes(move.movement_type) ? '-' : '+'}{move.quantity}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
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

                            <div className="bg-blue-50 p-3 rounded-md mb-4 border border-blue-100 flex gap-2">
                                <Activity className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
                                <p className="text-xs text-blue-700">Desactivar una sede mantendrá el historial de stock pero ocultará el insumo en listas operativas.</p>
                            </div>

                            <div className="flex justify-end pt-2 border-t">
                                <Button onClick={() => setIsAvailabilityModalOpen(false)} variant="ghost">Cerrar</Button>
                            </div>
                        </>
                    )}
                </Modal>
                {
                    isReceiveModalOpen && selectedItemForReceive && (
                        <ReceiveStockModal
                            isOpen={isReceiveModalOpen}
                            onClose={() => setIsReceiveModalOpen(false)}
                            item={selectedItemForReceive}
                            branchId={selectedBranchId || branches[0]?.id} // Default to first branch if "All" selected
                            onSuccess={() => {
                                fetchData()
                            }}
                        />
                    )
                }
                {/* PIN MODAL */}
                {showPinModal && (
                    <PinCodeModal
                        title="Autorizar Eliminación"
                        subtitle="Ingresa PIN administrativo"
                        onClose={() => setShowPinModal(false)}
                        onSubmit={handleDeleteConfirmed}
                    />
                )}
            </div>
        </div>
    )
}

