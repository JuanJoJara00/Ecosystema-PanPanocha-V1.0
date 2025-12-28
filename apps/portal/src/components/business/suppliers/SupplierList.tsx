'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Package, Edit2, Trash2, ShoppingCart, Search, Tag, Phone, Mail, FileText, Activity, Plus, Upload } from 'lucide-react'
import { formatCurrency } from '@/lib/supplier-utils'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import ModuleHeader from '@/components/ui/ModuleHeader'
import ModuleTabs from '@/components/ui/ModuleTabs'
import PageHeader from '@/components/ui/PageHeader'
import Modal from '@/components/ui/Modal'
import SupplierForm from './SupplierForm'
import SupplierCSVImporter from './SupplierCSVImporter'
import SupplierDetail from './SupplierDetail'

import { Supplier } from '@panpanocha/types'

interface SupplierStats {
    total_purchased: number
    current_debt: number
}

import { supplierService } from '@/services/supplier.service'

interface SupplierListProps {
    initialSuppliers: Supplier[]
    initialStats: Record<string, SupplierStats>
}

export default function SupplierList({ initialSuppliers, initialStats }: SupplierListProps) {
    const [suppliers, setSuppliers] = useState<Supplier[]>(initialSuppliers)
    const [loading, setLoading] = useState(false)
    const [searchTerm, setSearchTerm] = useState('')
    const [selectedCategory, setSelectedCategory] = useState<string>('all')
    const [selectedStatus, setSelectedStatus] = useState<string>('active')
    const [supplierStats, setSupplierStats] = useState<Record<string, SupplierStats>>(initialStats)

    // Modal States
    const [isFormModalOpen, setIsFormModalOpen] = useState(false)
    const [isImportModalOpen, setIsImportModalOpen] = useState(false)
    const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null)
    const [selectedSupplierForDetails, setSelectedSupplierForDetails] = useState<Supplier | null>(null)

    const categories = ['Alimentos', 'Bebidas', 'Limpieza', 'Empaques', 'Otros']

    const fetchSuppliersAndStats = async () => {
        // setLoading(true) // Silent update preferred or localized loading
        try {
            const [data, stats] = await Promise.all([
                supplierService.getAll(),
                supplierService.getStats()
            ])
            setSuppliers(data)
            setSupplierStats(stats)
        } catch (error) {
            console.error('Error refreshing suppliers:', error)
        } finally {
            setLoading(false)
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

    const handleFormSuccess = () => {
        setIsFormModalOpen(false)
        setEditingSupplier(null)
        fetchSuppliersAndStats()
    }

    const filteredSuppliers = suppliers.filter(sup => {
        const matchesSearch = sup.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            sup.contact_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            sup.email?.toLowerCase().includes(searchTerm.toLowerCase())
        const matchesCategory = selectedCategory === 'all' || sup.category === selectedCategory
        const matchesStatus = selectedStatus === 'all' ||
            (selectedStatus === 'active' && sup.active) ||
            (selectedStatus === 'inactive' && !sup.active)
        return matchesSearch && matchesCategory && matchesStatus
    })

    return (
        <div className="space-y-6">
            <ModuleHeader
                searchTerm={searchTerm}
                onSearchChange={setSearchTerm}
                searchPlaceholder="Buscar por nombre, contacto o email..."
                actions={
                    <>
                        <Button
                            onClick={() => setIsImportModalOpen(true)}
                            variant="secondary"
                            startIcon={<Upload className="h-4 w-4" />}
                        >
                            Importar
                        </Button>
                        <Button
                            onClick={openCreate}
                            startIcon={<Plus className="h-4 w-4" />}
                        >
                            Nuevo Proveedor
                        </Button>
                    </>
                }
            >
                <div className="min-w-[200px]">
                    <select
                        value={selectedStatus}
                        onChange={(e) => setSelectedStatus(e.target.value)}
                        className="px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm text-gray-700 focus:ring-4 focus:ring-pp-gold/10 focus:border-pp-gold outline-none cursor-pointer w-full transition-all"
                    >
                        <option value="active">Activos</option>
                        <option value="inactive">Inactivos</option>
                        <option value="all">Todos</option>
                    </select>
                </div>
            </ModuleHeader>

            <ModuleTabs
                tabs={categories.map(c => ({ id: c, label: c }))}
                activeTabId={selectedCategory}
                onTabChange={setSelectedCategory}
                labelAll="Todas"
            />

            {/* Content */}
            {loading ? (
                <div className="flex flex-col items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600 mb-4"></div>
                    <p className="text-gray-500 font-medium">Cargando proveedores...</p>
                </div>
            ) : filteredSuppliers.length === 0 ? (
                <div className="text-center py-16 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
                    <Package className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                    <h3 className="text-gray-900 font-medium text-lg">No se encontraron proveedores</h3>
                    <p className="text-gray-500">Intenta ajustar los filtros o agrega uno nuevo.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {filteredSuppliers.map(supplier => (
                        <Card key={supplier.id} hover className="flex flex-col group p-5 border-pp-gold/10 hover:border-pp-gold/30 transition-all">
                            {/* Header */}
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <h3 className="font-bold text-gray-800 text-lg group-hover:text-pp-brown transition-colors uppercase font-display">
                                        {supplier.name}
                                    </h3>
                                    {supplier.contact_name && (
                                        <p className="text-sm text-gray-500 font-medium">{supplier.contact_name}</p>
                                    )}
                                </div>
                                <Badge variant={supplier.active ? 'success' : 'neutral'}>
                                    {supplier.active ? 'Activo' : 'Inactivo'}
                                </Badge>
                            </div>

                            {/* Info */}
                            <div className="space-y-3 mb-6 flex-1">
                                {supplier.category && (
                                    <div className="flex items-center gap-2 text-sm text-gray-600">
                                        <div className="w-6 flex justify-center"><Tag className="h-4 w-4 text-pp-gold" /></div>
                                        <span>{supplier.category}</span>
                                    </div>
                                )}
                                {supplier.phone && (
                                    <div className="flex items-center gap-2 text-sm text-gray-600">
                                        <div className="w-6 flex justify-center"><Phone className="h-4 w-4 text-pp-gold" /></div>
                                        <a href={`tel:${supplier.phone}`} className="hover:text-pp-brown hover:underline">{supplier.phone}</a>
                                    </div>
                                )}
                                {supplier.email && (
                                    <div className="flex items-center gap-2 text-sm text-gray-600">
                                        <div className="w-6 flex justify-center"><Mail className="h-4 w-4 text-pp-gold" /></div>
                                        <a href={`mailto:${supplier.email}`} className="hover:text-pp-brown hover:underline truncate max-w-[200px]">{supplier.email}</a>
                                    </div>
                                )}
                                {(supplier.order_day || supplier.delivery_day) && (
                                    <div className="flex items-start gap-2 text-sm text-gray-600 bg-blue-50/50 p-2 rounded-lg">
                                        <div className="w-6 flex justify-center mt-0.5"><FileText className="h-4 w-4 text-blue-500" /></div>
                                        <div className="text-xs">
                                            {supplier.order_day && <p><span className="font-semibold">Pedido:</span> {supplier.order_day}</p>}
                                            {supplier.delivery_day && <p><span className="font-semibold">Entrega:</span> {supplier.delivery_day}</p>}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Stats */}
                            <div className="mb-5 pt-4 border-t border-gray-50">
                                <div className="flex items-center justify-between text-sm">
                                    <div className="flex items-center gap-1.5 text-gray-500">
                                        <Activity className="h-4 w-4" />
                                        <span>Compras Totales</span>
                                    </div>
                                    <span className="font-semibold text-gray-900">
                                        {formatCurrency(supplierStats[supplier.id]?.total_purchased || 0)}
                                    </span>
                                </div>
                                {supplierStats[supplier.id]?.current_debt > 0 && (
                                    <div className="flex items-center justify-between text-sm mt-2 bg-red-50 px-2 py-1 rounded-md border border-red-100">
                                        <span className="text-red-700 font-medium">Deuda Pendiente</span>
                                        <span className="font-bold text-red-700">
                                            {formatCurrency(supplierStats[supplier.id]?.current_debt)}
                                        </span>
                                    </div>
                                )}
                            </div>

                            {/* Actions */}
                            <div className="grid grid-cols-4 gap-2 pt-2 border-t border-gray-100 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                                <Button
                                    onClick={() => setSelectedSupplierForDetails(supplier)}
                                    variant="primary"
                                    className="col-span-2"
                                    size="sm"
                                    startIcon={<ShoppingCart className="h-3.5 w-3.5" />}
                                >
                                    Detalles
                                </Button>
                                <Button
                                    onClick={() => openEdit(supplier)}
                                    variant="secondary"
                                    size="sm"
                                >
                                    <Edit2 className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                    onClick={() => handleDelete(supplier.id)}
                                    variant="danger"
                                    size="sm"
                                >
                                    <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                            </div>
                        </Card>
                    ))}
                </div>
            )}

            {/* Modals */}
            <Modal
                isOpen={isFormModalOpen}
                onClose={() => setIsFormModalOpen(false)}
                title={editingSupplier ? "Editar Proveedor" : "Nuevo Proveedor"}
            >
                <SupplierForm
                    initialSupplier={editingSupplier}
                    onSuccess={handleFormSuccess}
                    onCancel={() => setIsFormModalOpen(false)}
                />
            </Modal>

            <Modal
                isOpen={isImportModalOpen}
                onClose={() => setIsImportModalOpen(false)}
                title="Importar Proveedores desde CSV"
            >
                <SupplierCSVImporter
                    onSuccess={() => {
                        setTimeout(() => {
                            setIsImportModalOpen(false)
                            fetchSuppliersAndStats()
                        }, 2000)
                    }}
                />
            </Modal>

            <SupplierDetail
                isOpen={!!selectedSupplierForDetails}
                onClose={() => setSelectedSupplierForDetails(null)}
                supplier={selectedSupplierForDetails}
            />
        </div>
    )
}
