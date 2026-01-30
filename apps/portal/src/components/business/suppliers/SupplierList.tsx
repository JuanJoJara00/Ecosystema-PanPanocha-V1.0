'use client'

import React, { useEffect, useState, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import {
    Package,
    Edit2,
    Trash2,
    Search,
    Phone,
    Mail,
    FileText,
    Plus,
    Upload,
    DollarSign,
    Users,
    Store,
    ShoppingBag,
    Clock
} from 'lucide-react'
import { formatCurrency } from '@/lib/supplier-utils'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import ModuleHeader from '@/components/ui/ModuleHeader'
import ModuleTabs from '@/components/ui/ModuleTabs'
import PageHeader from '@/components/ui/PageHeader'
import Modal from '@/components/ui/Modal'
import SupplierFormModal from './SupplierFormModal'
import SupplierCSVImporter from './SupplierCSVImporter'
import SupplierDetail from './SupplierDetail'
import SupplierMetrics, { SupplierKPI } from './SupplierMetrics'
import SupplierPaymentHistory from './SupplierPaymentHistory'
import { Supplier } from '@panpanocha/types'
import { SupplierStats, supplierService } from '@/services/supplier.service'
import Image from 'next/image'
import { appConfig } from '@/config/app-config'
import { MOCK_SUPPLIERS, MOCK_STATS } from '@/lib/mock-suppliers'



interface SupplierListProps {
    initialSuppliers: Supplier[]
    initialStats: Record<string, SupplierStats>
}

export default function SupplierList({ initialSuppliers, initialStats }: SupplierListProps) {
    // Use Mock Data if initialSuppliers is empty
    const [suppliers, setSuppliers] = useState<Supplier[]>(initialSuppliers?.length > 0 ? initialSuppliers : MOCK_SUPPLIERS)
    const [loading, setLoading] = useState(false)
    const [searchTerm, setSearchTerm] = useState('')
    const [selectedCategory, setSelectedCategory] = useState<string>('all')
    const [selectedStatus, setSelectedStatus] = useState<string>('all')
    const [supplierStats, setSupplierStats] = useState<Record<string, SupplierStats>>(
        initialStats && Object.keys(initialStats).length > 0 ? initialStats : MOCK_STATS
    )
    const [activeKpi, setActiveKpi] = useState<string | null>(null)
    const [viewMode, setViewMode] = useState<'suppliers' | 'history'>('suppliers')

    // Modal States
    const [isFormModalOpen, setIsFormModalOpen] = useState(false)
    const [isImportModalOpen, setIsImportModalOpen] = useState(false)
    const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null)
    const [selectedSupplierForDetails, setSelectedSupplierForDetails] = useState<Supplier | null>(null)

    const categories = ['Alimentos', 'Bebidas', 'Limpieza', 'Empaques', 'Otros']

    // Metrics Calculation
    const metrics = useMemo(() => {
        const stats = Object.values(supplierStats)
        const totalPurchased = stats.reduce((acc, curr) => acc + (curr.total_purchased || 0), 0)
        const totalDebt = stats.reduce((acc, curr) => acc + (curr.current_debt || 0), 0)
        const activeCount = suppliers.filter(s => s.active).length

        // Top Lists
        const topDebt = Object.entries(supplierStats)
            .map(([id, stat]) => ({
                name: suppliers.find(s => s.id === id)?.name || 'Desconocido',
                debt: stat.current_debt || 0
            }))
            .filter(item => item.debt > 0)
            .sort((a, b) => b.debt - a.debt)
            .slice(0, 5)

        const topPurchases = Object.entries(supplierStats)
            .map(([id, stat]) => ({
                name: suppliers.find(s => s.id === id)?.name || 'Desconocido',
                total: stat.total_purchased || 0
            }))
            .sort((a, b) => b.total - a.total)
            .slice(0, 5)

        const avgPurchase = suppliers.length > 0 ? totalPurchased / suppliers.length : 0
        const debtRatio = totalPurchased > 0 ? (totalDebt / totalPurchased) * 100 : 0

        // Category Stats
        const categoryStats = suppliers.reduce((acc, sup) => {
            const cat = sup.category || 'Otros'
            const val = supplierStats[sup.id]?.total_purchased || 0
            acc[cat] = (acc[cat] || 0) + val
            return acc
        }, {} as Record<string, number>)

        const topCategories = Object.entries(categoryStats)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 5)

        return {
            totalPurchased,
            totalDebt,
            activeCount,
            avgPurchase,
            debtRatio,
            topDebt,
            topPurchases,
            topCategories
        }
    }, [suppliers, supplierStats])

    const kpis: SupplierKPI[] = [
        {
            title: 'Compras Totales',
            value: formatCurrency(metrics.totalPurchased),
            icon: ShoppingBag,
            theme: 'blue'
        },
        {
            title: 'Deuda Pendiente',
            value: formatCurrency(metrics.totalDebt),
            icon: DollarSign,
            theme: metrics.totalDebt > 0 ? 'red' : 'green'
        },
        {
            title: 'Promedio Compra',
            value: formatCurrency(metrics.avgPurchase),
            icon: Users,
            theme: 'purple'
        },
        {
            title: 'Ratio de Deuda',
            value: `${metrics.debtRatio.toFixed(1)}%`,
            icon: Store,
            theme: 'yellow'
        }
    ]

    const fetchSuppliersAndStats = async () => {
        try {
            const [data, stats] = await Promise.all([
                supplierService.getAll(),
                supplierService.getStats()
            ])
            setSuppliers(data)
            setSupplierStats(stats)
        } catch (error) {
            console.error('Error refreshing suppliers:', error)
        }
    }

    const handleDelete = async (id: string) => {
        if (!confirm('¿Estás seguro de que deseas eliminar este proveedor?')) return
        try {
            const { error } = await supabase.from('suppliers').delete().eq('id', id)
            if (error) throw error
            setSuppliers(prev => prev.filter(s => s.id !== id))
        } catch (error) {
            console.error('Error deleting supplier:', error)
            alert('Error al eliminar proveedor')
        }
    }

    const openCreate = () => {
        setEditingSupplier(null)
        setIsFormModalOpen(true)
    }

    const openEdit = (supplier: Supplier) => {
        setEditingSupplier(supplier)
        setIsFormModalOpen(true)
    }

    const handleFormSuccess = async () => {
        setIsFormModalOpen(false)
        setEditingSupplier(null)
        await fetchSuppliersAndStats()
    }

    const filteredSuppliers = suppliers.filter(sup => {
        const matchesSearch = sup.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            sup.contact_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            sup.email?.toLowerCase().includes(searchTerm.toLowerCase())
        const matchesCategory = selectedCategory === 'all' || sup.category === selectedCategory
        const matchesStatus = selectedStatus === 'all' ||
            (selectedStatus === 'active' && sup.active) ||
            (selectedStatus === 'inactive' && !sup.active)

        // Filter by KPI selection if active (simple filter logic)
        if (activeKpi === 'Deuda Pendiente') {
            const debt = supplierStats[sup.id]?.current_debt || 0
            return matchesSearch && matchesCategory && matchesStatus && debt > 0
        }

        return matchesSearch && matchesCategory && matchesStatus
    })

    return (
        <div className="flex gap-2 w-full h-[calc(100vh-4rem)] animate-in fade-in duration-500">
            {/* LEFT PANEL - Static (no scroll) */}
            <div className="w-1/2 flex-shrink-0 flex flex-col gap-3 overflow-y-auto custom-scrollbar pr-2">
                {/* UNIFIED HEADER BLOCK */}
                {/* UNIFIED HEADER BLOCK */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-white/5 flex-shrink-0">

                    {/* TOP ROW: Title & View Mode Toggle */}
                    <div className="flex justify-between items-center mb-6">
                        <div className="flex flex-col">
                            <h1 className="text-xl font-black text-gray-900 dark:text-gray-50 tracking-tight flex items-center gap-2">
                                <div className="relative w-10 h-10 shrink-0 transition-transform hover:scale-105 duration-300">
                                    <Image
                                        src={appConfig.company.logoUrl}
                                        alt="Logo"
                                        fill
                                        className="object-contain"
                                        priority
                                    />
                                </div>
                                PROVEEDORES
                            </h1>
                            <p className="text-xs text-gray-400 font-medium pl-12">Gestión de proveedores y compras</p>
                        </div>

                        {/* View Mode Toggle */}
                        <div className="flex bg-gray-100 p-1 rounded-lg">
                            <button
                                onClick={() => {
                                    setViewMode('suppliers')
                                    setSelectedCategory('all') // Reset filter on switch
                                }}
                                className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${viewMode === 'suppliers' ? 'bg-white text-pp-brown shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                            >
                                Proveedores
                            </button>
                            <button
                                onClick={() => {
                                    setViewMode('history')
                                    setSelectedCategory('all') // Reset filter on switch
                                }}
                                className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${viewMode === 'history' ? 'bg-white text-pp-brown shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                            >
                                Historial de Pagos
                            </button>
                        </div>
                    </div>

                    <ModuleHeader
                        searchTerm={searchTerm}
                        onSearchChange={setSearchTerm}
                        searchPlaceholder={viewMode === 'suppliers' ? "Buscar proveedor..." : "Buscar pago o referencia..."}
                        actions={
                            <div className="flex flex-wrap gap-2 items-center">
                                {viewMode === 'suppliers' && (
                                    <div className="mr-2">

                                    </div>
                                )}

                                <Button
                                    variant="outline"
                                    onClick={() => setIsImportModalOpen(true)}
                                    className="h-9 px-3 text-xs"
                                >
                                    <Upload className="mr-2 h-3 w-3" /> Importar
                                </Button>
                                <Button
                                    onClick={openCreate}
                                    className="bg-pp-brown hover:bg-pp-brown/90 text-white shadow-lg shadow-pp-brown/20 h-9 px-3 text-xs"
                                >
                                    <Plus className="mr-2 h-3 w-3" /> Nuevo
                                </Button>
                            </div>
                        }
                        className="mb-6"
                    />

                    {/* Main Categories Tabs (Dynamic) */}
                    <div className="w-full overflow-x-auto pb-2 custom-scrollbar">
                        <ModuleTabs
                            tabs={
                                viewMode === 'suppliers'
                                    ? [
                                        { id: 'all', label: 'Todas las Categorías' },
                                        ...categories.map(cat => ({
                                            id: cat,
                                            label: cat
                                        }))
                                    ]
                                    : [
                                        { id: 'all', label: 'Todos los Proveedores' },
                                        ...suppliers.map(s => ({
                                            id: s.name, // Use name as ID for filtering in history
                                            label: s.name
                                        }))
                                    ]
                            }
                            activeTabId={selectedCategory}
                            onTabChange={setSelectedCategory}
                            labelAll=""
                            className="w-full border-none p-0 bg-transparent min-w-max"
                        />
                    </div>
                </div>

                {/* Metrics Section - in left panel */}
                <div className="flex-grow">
                    <SupplierMetrics
                        kpis={kpis}
                        widgets={{
                            totalSuppliers: suppliers.length,
                            activeSuppliers: metrics.activeCount,
                            totalDebt: metrics.totalDebt,
                            totalPurchases: metrics.totalPurchased,
                            topDebtSuppliers: metrics.topDebt,
                            topPurchaseSuppliers: metrics.topPurchases,
                            topCategories: metrics.topCategories
                        }}
                        activeKpi={activeKpi}
                        onKpiClick={(title) => setActiveKpi(prev => prev === title ? null : title)}
                        className="h-full"
                    />
                </div>
            </div>

            {/* RIGHT PANEL - Scrollable Cards */}
            <div className="w-1/2 overflow-y-auto custom-scrollbar pl-1">
                {viewMode === 'suppliers' ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-20">
                        {filteredSuppliers.map(supplier => {
                            const stats = supplierStats[supplier.id] || { total_purchased: 0, current_debt: 0 }
                            return (
                                <Card
                                    key={supplier.id}
                                    className="group hover:shadow-xl transition-all duration-300 border-none shadow-sm ring-1 ring-gray-100 hover:ring-pp-gold/30 bg-white h-auto"
                                >
                                    <div className="p-5 flex flex-col h-full relative">
                                        {/* Header */}
                                        <div className="flex justify-between items-start mb-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 shrink-0 rounded-full bg-pp-cream text-pp-brown flex items-center justify-center font-bold text-lg">
                                                    {supplier.name.charAt(0)}
                                                </div>
                                                <div className="min-w-0">
                                                    <h3 className="font-bold text-gray-800 text-sm leading-tight group-hover:text-pp-brown transition-colors truncate" title={supplier.name}>
                                                        {supplier.name}
                                                    </h3>
                                                    <span className="text-[10px] text-gray-400 font-medium">
                                                        {supplier.category || 'Sin categoría'}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="flex flex-col items-end gap-1">
                                                <Badge variant={supplier.active ? 'success' : 'neutral'} className="text-[9px] px-1.5 py-0.5">
                                                    {supplier.active ? 'ACTIVO' : 'INACTIVO'}
                                                </Badge>
                                                {stats.current_debt > 0 && (
                                                    <Badge variant="error" className="text-[9px] px-1.5 py-0.5 flex gap-1 items-center animate-pulse">
                                                        <DollarSign size={8} /> DEUDA
                                                    </Badge>
                                                )}
                                            </div>
                                        </div>

                                        {/* Quick Stats */}
                                        <div className="grid grid-cols-2 gap-2 mb-4 bg-gray-50/50 p-2 rounded-lg border border-gray-50">
                                            <div className="flex flex-col">
                                                <span className="text-[9px] text-gray-400 uppercase font-black">Compras</span>
                                                <span className="text-xs font-bold text-gray-700 truncate">
                                                    {formatCurrency(stats.total_purchased)}
                                                </span>
                                            </div>
                                            <div className="flex flex-col border-l border-gray-200 pl-2">
                                                <span className="text-[9px] text-gray-400 uppercase font-black">Deuda</span>
                                                <span className={`text-xs font-bold truncate ${stats.current_debt > 0 ? 'text-red-500' : 'text-green-500'}`}>
                                                    {formatCurrency(stats.current_debt)}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Contact Info (Mini) */}
                                        <div className="space-y-1 mb-4 flex-1">
                                            {supplier.contact_name && (
                                                <div className="flex items-center gap-2 text-[10px] text-gray-500 truncate">
                                                    <Users size={10} className="text-gray-300 shrink-0" />
                                                    <span className="truncate">{supplier.contact_name}</span>
                                                </div>
                                            )}
                                            {supplier.phone && (
                                                <div className="flex items-center gap-2 text-[10px] text-gray-500 truncate">
                                                    <Phone size={10} className="text-gray-300 shrink-0" />
                                                    <span className="truncate">{supplier.phone}</span>
                                                </div>
                                            )}
                                        </div>

                                        {/* Actions */}
                                        <div className="flex gap-1 mt-auto pt-3 border-t border-gray-100 opacity-60 group-hover:opacity-100 transition-opacity">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="flex-1 text-[10px] h-7 hover:bg-pp-gold/10 hover:text-pp-brown"
                                                onClick={() => setSelectedSupplierForDetails(supplier)}
                                            >
                                                <FileText size={12} className="mr-1" /> Detalles
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-7 w-7 text-gray-400 hover:text-pp-brown hover:bg-pp-brown/10"
                                                onClick={() => openEdit(supplier)}
                                            >
                                                <Edit2 size={12} />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-7 w-7 text-gray-400 hover:text-red-600 hover:bg-red-50"
                                                onClick={() => handleDelete(supplier.id)}
                                            >
                                                <Trash2 size={12} />
                                            </Button>
                                        </div>
                                    </div>
                                </Card>
                            )
                        })}
                    </div>
                ) : (
                    // HISTORY VIEW
                    <div className="h-full">
                        <SupplierPaymentHistory
                            preSelectedSupplier={selectedCategory !== 'all' ? selectedCategory : undefined}
                            searchTerm={searchTerm}
                        />
                    </div>
                )}
            </div>

            {/* Modals */}
            <SupplierFormModal
                isOpen={isFormModalOpen}
                onClose={() => setIsFormModalOpen(false)}
                onSubmit={handleFormSuccess}
                editingSupplier={editingSupplier}
            />

            <Modal
                isOpen={isImportModalOpen}
                onClose={() => setIsImportModalOpen(false)}
                title="Importar Proveedores"
                className="max-w-2xl"
            >
                <SupplierCSVImporter
                    onSuccess={() => {
                        fetchSuppliersAndStats()
                        setIsImportModalOpen(false)
                    }}
                />
            </Modal>

            <SupplierDetail
                isOpen={!!selectedSupplierForDetails}
                supplier={selectedSupplierForDetails}
                onClose={() => setSelectedSupplierForDetails(null)}
            />
        </div>
    )
}
