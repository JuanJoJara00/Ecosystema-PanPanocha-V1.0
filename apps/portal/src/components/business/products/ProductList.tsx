'use client'

import React, { useEffect, useState } from 'react'
// import { supabase } from '@/lib/supabase' // Refactored to Server Actions
import { supabase } from '@/lib/supabase' // Still needed for Realtime subscriptions in this specific component for now

import {
    Package,
    Plus,
    Search,
    Edit2,
    Trash2,
    Image as ImageIcon,
    ChefHat,
    Loader2,
    Settings,
    Store,
    Check,
    X,
    Filter
} from 'lucide-react'
import RecipeBuilder from './RecipeBuilder'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import Card from '@/components/ui/Card'
import Modal from '@/components/ui/Modal'
import ModuleHeader from '@/components/ui/ModuleHeader'
import ModuleTabs from '@/components/ui/ModuleTabs'
import PageHeader from '@/components/ui/PageHeader'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import EmptyState from '@/components/ui/EmptyState'
import Skeleton from '@/components/ui/Skeleton'
import ImageUpload from '@/components/ui/ImageUpload'

// Interfaces matching our Supabase schema
interface Category {
    id: string
    name: string
}

import { Product } from '@panpanocha/types'
import { fetchProductsAction } from '@/actions/product.actions';

interface Branch {
    id: string
    name: string
}

interface BranchProduct {
    branch_id: string
    is_active: boolean
    price_override?: number
}

export default function ProductList() {
    const [products, setProducts] = useState<Product[]>([])
    const [categories, setCategories] = useState<Category[]>([])
    const [loading, setLoading] = useState(true)
    const [filterCategoryId, setFilterCategoryId] = useState<string>('all')
    const [searchTerm, setSearchTerm] = useState('')

    // Product Modal State
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [editingProduct, setEditingProduct] = useState<Product | null>(null)
    const [formData, setFormData] = useState({
        name: '',
        category_id: '',
        price: 0,
        active: true,
        image_url: ''
    })

    // Category Modal State
    const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false)
    const [newCategoryName, setNewCategoryName] = useState('')
    const [editingCategory, setEditingCategory] = useState<{ id: string, name: string } | null>(null)

    // Branch Availability Modal State
    const [isAvailabilityModalOpen, setIsAvailabilityModalOpen] = useState(false)
    const [selectedProductForAvailability, setSelectedProductForAvailability] = useState<Product | null>(null)
    const [branches, setBranches] = useState<Branch[]>([])
    const [branchAvailability, setBranchAvailability] = useState<Record<string, BranchProduct>>({})

    // Branch Filter State
    const [selectedBranchId, setSelectedBranchId] = useState<string | null>(null)
    const [productStocks, setProductStocks] = useState<Record<string, number>>({})

    // Recipe Builder Modal State
    const [chefHatProduct, setChefHatProduct] = useState<Product | null>(null)

    useEffect(() => {
        fetchInitialData()
    }, [])

    useEffect(() => {
        if (selectedBranchId) {
            fetchStocks(selectedBranchId)
        } else {
            setProductStocks({})
        }
    }, [selectedBranchId, branches])

    // Realtime subscription - Auto-refresh when sales or inventory changes
    useEffect(() => {
        if (!selectedBranchId) return

        console.log('[Realtime] Setting up subscription for stock updates...')

        // Subscribe to sales table changes (when POS syncs a sale)
        const salesChannel = supabase
            .channel('sales-changes')
            .on('postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'sales' },
                (payload) => {
                    console.log('[Realtime] New sale detected, refreshing stock...')
                    fetchStocks(selectedBranchId)
                }
            )
            .subscribe()

        // Subscribe to branch_inventory changes (when raw materials are decremented)
        const inventoryChannel = supabase
            .channel('inventory-changes')
            .on('postgres_changes',
                { event: '*', schema: 'public', table: 'branch_inventory' },
                (payload) => {
                    console.log('[Realtime] Inventory changed, refreshing stock...')
                    fetchStocks(selectedBranchId)
                }
            )
            .subscribe()

        return () => {
            console.log('[Realtime] Cleaning up subscriptions...')
            supabase.removeChannel(salesChannel)
            supabase.removeChannel(inventoryChannel)
        }
    }, [selectedBranchId])

    const fetchStocks = async (branchId: string) => {
        if (branchId === 'all') {
            const stocks: Record<string, number> = {}
            const promises = branches.map(async (b) => {
                const { data } = await supabase.rpc('get_branch_products_stock', { p_branch_id: b.id })
                return data || []
            })

            const results = await Promise.all(promises)
            results.flat().forEach((item: any) => {
                stocks[item.product_id] = (stocks[item.product_id] || 0) + item.stock
            })
            setProductStocks(stocks)
        } else {
            const { data } = await supabase.rpc('get_branch_products_stock', { p_branch_id: branchId })
            if (data) {
                const map: Record<string, number> = {}
                data.forEach((item: any) => map[item.product_id] = item.stock)
                setProductStocks(map)
            }
        }
    }

    const fetchInitialData = async () => {
        setLoading(true)
        try {
            await Promise.all([fetchCategories(), fetchProducts(), fetchBranches()])
        } catch (error) {
            console.error('Error loading data:', error)
        } finally {
            setLoading(false)
        }
    }

    const fetchCategories = async () => {
        const { data } = await supabase.from('product_categories').select('*').order('name')
        if (data) setCategories(data)
    }

    const fetchProducts = async () => {
        setLoading(true);
        const { success, data, error } = await fetchProductsAction();
        if (success && data) {
            setProducts(data as Product[]);
        } else {
            console.error('Error loading products via action:', error);
        }
        setLoading(false);
    }

    const fetchBranches = async () => {
        const { data } = await supabase.from('branches').select('id, name').order('name')
        if (data) {
            setBranches(data)
            // Default to first branch if available to show stock context immediately
            if (data.length > 0) setSelectedBranchId(data[0].id)
        }
    }

    const handleProductSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        try {
            const payload = { ...formData, category_id: formData.category_id || null }
            if (!payload.category_id) { alert('Por favor selecciona una categoría'); return }

            if (editingProduct) {
                const { error } = await supabase.from('products').update(payload).eq('id', editingProduct.id)
                if (error) throw error
            } else {
                const { error } = await supabase.from('products').insert([payload])
                if (error) throw error
            }
            fetchProducts()
            setIsModalOpen(false)
            resetForm()
        } catch (error: any) {
            alert('Error al guardar: ' + error.message)
        }
    }

    const handleDeleteProduct = async (id: string) => {
        if (!confirm('¿Eliminar este producto?')) return
        try {
            const { error } = await supabase.from('products').delete().eq('id', id)
            if (error) throw error
            fetchProducts()
        } catch (error) {
            alert('Error al eliminar')
        }
    }

    const resetForm = () => {
        setEditingProduct(null)
        setFormData({
            name: '',
            category_id: categories.length > 0 ? categories[0].id : '',
            price: 0,
            active: true,
            image_url: ''
        })
    }

    const openEdit = (product: Product) => {
        setEditingProduct(product)
        setFormData({
            name: product.name,
            category_id: product.category_id || (categories.length > 0 ? categories[0].id : ''),
            price: product.price || 0,
            active: product.active,
            image_url: product.image_url || ''
        })
        setIsModalOpen(true)
    }

    // --- Category CRUD ---

    const handleAddCategory = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!newCategoryName.trim()) return
        try {
            const { error } = await supabase
                .from('product_categories')
                .insert([{ name: newCategoryName.trim() }])

            if (error) throw error

            await fetchCategories()
            setNewCategoryName('')
            setIsCategoryModalOpen(false)
        } catch (error) {
            alert('Error al crear categoría')
        }
    }

    const handleDeleteCategory = async (id: string) => {
        if (!confirm('¿Eliminar categoría? Si tiene productos asociados, no se podrá eliminar.')) return
        try {
            const { error } = await supabase.from('product_categories').delete().eq('id', id)
            if (error) throw error
            await fetchCategories()
        } catch (error: any) {
            // 23503 is foreign_key_violation in Postgres
            if (error.code === '23503') {
                alert('No se puede eliminar: Hay productos asociados a esta categoría.')
            } else {
                alert('Error al eliminar categoría')
            }
        }
    }

    const handleUpdateCategory = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!editingCategory || !editingCategory.name.trim()) return
        try {
            const { error } = await supabase
                .from('product_categories')
                .update({ name: editingCategory.name.trim() })
                .eq('id', editingCategory.id)

            if (error) throw error

            await fetchCategories()
            setEditingCategory(null)
        } catch (error) {
            alert('Error al actualizar categoría')
        }
    }


    // --- Branch Availability ---

    const openAvailabilityModal = async (product: Product) => {
        setSelectedProductForAvailability(product)
        setIsAvailabilityModalOpen(true)

        const { data } = await supabase
            .from('branch_products')
            .select('*')
            .eq('product_id', product.id)

        const availabilityMap: Record<string, BranchProduct> = {}
        if (data) {
            data.forEach((bp: any) => {
                availabilityMap[bp.branch_id] = bp
            })
        }
        setBranchAvailability(availabilityMap)
    }

    const toggleBranchAvailability = async (branchId: string, currentStatus: boolean) => {
        if (!selectedProductForAvailability) return

        try {
            const newStatus = !currentStatus

            const { error } = await supabase
                .from('branch_products')
                .upsert({
                    branch_id: branchId,
                    product_id: selectedProductForAvailability.id,
                    is_active: newStatus
                }, { onConflict: 'branch_id, product_id' })

            if (error) throw error

            setBranchAvailability(prev => ({
                ...prev,
                [branchId]: { ...prev[branchId], branch_id: branchId, is_active: newStatus }
            }))

        } catch (error) {
            console.error(error)
            alert('Error al actualizar disponibilidad')
        }
    }


    // Filter Logic
    const filteredProducts = products.filter(p => {
        const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase())
        const matchesCategory = filterCategoryId === 'all' || p.category_id === filterCategoryId
        return matchesSearch && matchesCategory
    })

    return (
        <div className="space-y-6">
            <PageHeader title="Productos y Recetas" subtitle="Gestión del catálogo" />
            <ModuleHeader
                searchTerm={searchTerm}
                onSearchChange={setSearchTerm}
                searchPlaceholder="Buscar productos..."
                actions={
                    <div className="flex gap-2 w-full md:w-auto">
                        <Button
                            onClick={() => setIsCategoryModalOpen(true)}
                            variant="secondary"
                            startIcon={<Settings className="h-4 w-4" />}
                        >
                            Categorías
                        </Button>
                        <Button
                            onClick={() => { resetForm(); setIsModalOpen(true) }}
                            startIcon={<Plus className="h-4 w-4" />}
                        >
                            Nuevo Producto
                        </Button>
                    </div>
                }
            />


            {/* Branch Tabs */}
            <ModuleTabs
                tabs={branches.map(b => ({ id: b.id, label: b.name }))}
                activeTabId={selectedBranchId || 'all'}
                onTabChange={setSelectedBranchId}
                labelAll="Todas las sedes"
            />

            {/* Category Tabs */}
            <ModuleTabs
                tabs={categories.map(c => ({ id: c.id, label: c.name }))}
                activeTabId={filterCategoryId}
                onTabChange={setFilterCategoryId}
                labelAll="Todos"
            />

            {/* Product Grid */}
            {
                loading ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {[...Array(8)].map((_, i) => (
                            <div key={i} className="flex flex-col gap-2">
                                <Skeleton className="h-40 w-full rounded-xl" />
                                <Skeleton className="h-4 w-3/4" />
                                <Skeleton className="h-4 w-1/2" />
                            </div>
                        ))}
                    </div>
                ) : filteredProducts.length === 0 ? (
                    <EmptyState
                        icon={Package}
                        title="No se encontraron productos"
                        description="Intenta buscar con otro término o crea un nuevo producto."
                        actionLabel="Nuevo Producto"
                        onAction={() => { resetForm(); setIsModalOpen(true) }}
                    />
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {filteredProducts.map(product => {
                            const stock = productStocks[product.id]
                            return (
                                <Card key={product.id} className="overflow-hidden hover:shadow-md transition-shadow group flex flex-col p-0 border border-gray-200">
                                    {/* Image Placeholder */}
                                    <div className="h-40 bg-gray-100 flex items-center justify-center relative shrink-0">
                                        {product.image_url ? (
                                            <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
                                        ) : (
                                            <ImageIcon className="h-10 w-10 text-gray-300" />
                                        )}
                                        <div className="absolute top-2 right-2">
                                            <Badge variant={product.active ? 'success' : 'neutral'} className="shadow-sm">
                                                {product.active ? 'Activo' : 'Inactivo'}
                                            </Badge>
                                        </div>
                                    </div>

                                    <div className="p-4 flex-grow flex flex-col">
                                        <div className="mb-2">
                                            <h3 className="font-bold text-gray-800 line-clamp-1 text-lg font-display" title={product.name}>{product.name}</h3>
                                            <p className="text-xs text-pp-brown/70 font-medium">
                                                {(typeof product.category === 'object' ? product.category?.name : product.category) || 'Sin Categoría'}
                                            </p>
                                        </div>

                                        <div className="mt-auto flex items-end justify-between">
                                            <div>
                                                <span className="font-bold text-xl text-gray-900 font-display block">
                                                    ${product.price?.toLocaleString()}
                                                </span>
                                                {selectedBranchId && (
                                                    <span className={`text-sm font-bold px-2 py-1 rounded-md ${(stock || 0) > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                                                        }`}>
                                                        {(stock !== undefined) ? `Stock: ${stock}` : 'Sin Receta'}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Actions Footer */}
                                    <div className="p-3 bg-gray-50 border-t flex justify-between items-center gap-2 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Button
                                            onClick={() => openAvailabilityModal(product)}
                                            size="sm"
                                            variant="outline"
                                            className="flex-1 text-xs h-8 border-gray-300 text-gray-600 hover:bg-gray-100"
                                            startIcon={<Store className="h-3 w-3" />}
                                        >
                                            Sedes
                                        </Button>
                                        <div className="flex gap-1">
                                            <Button
                                                onClick={() => setChefHatProduct(product)}
                                                size="sm"
                                                variant="ghost"
                                                className="h-8 w-8 p-0 text-pp-brown hover:bg-pp-gold/10"
                                                title="Editar Receta"
                                            >
                                                <ChefHat className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                onClick={() => openEdit(product)}
                                                size="sm"
                                                variant="ghost"
                                                className="h-8 w-8 p-0 text-gray-600 hover:bg-gray-100"
                                                title="Editar"
                                            >
                                                <Edit2 className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                onClick={() => handleDeleteProduct(product.id)}
                                                size="sm"
                                                variant="ghost"
                                                className="h-8 w-8 p-0 text-red-600 hover:bg-red-50"
                                                title="Eliminar"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                </Card>
                            )
                        })}
                    </div>
                )
            }

            {/* PRODUCT MODAL */}
            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={editingProduct ? 'Editar Producto' : 'Nuevo Producto'}
            >
                <form onSubmit={handleProductSubmit} className="space-y-4 font-sans">
                    <Input
                        label="Nombre del Producto"
                        required
                        value={formData.name}
                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                        placeholder="Ej. Pan Bonn"
                    />

                    <div className="grid grid-cols-2 gap-4">
                        <Select
                            label="Categoría"
                            required
                            value={formData.category_id}
                            onChange={e => setFormData({ ...formData, category_id: e.target.value })}
                            options={categories.map(cat => ({ value: cat.id, label: cat.name }))}
                        />

                        <Input
                            label="Precio Base"
                            type="number"
                            min="0"
                            startIcon={<span className="text-gray-500 font-bold">$</span>}
                            value={formData.price}
                            onChange={e => {
                                const val = e.target.value
                                setFormData({ ...formData, price: val === '' ? 0 : parseFloat(val) })
                            }}
                        />
                    </div>

                    <div className="flex items-center gap-2">
                        <input
                            type="checkbox"
                            id="active"
                            checked={formData.active}
                            onChange={e => setFormData({ ...formData, active: e.target.checked })}
                            className="rounded text-pp-gold focus:ring-pp-gold border-gray-300 w-4 h-4"
                        />
                        <label htmlFor="active" className="text-sm text-gray-700 font-medium cursor-pointer">Producto Activo Globalmente</label>
                    </div>

                    <ImageUpload
                        value={formData.image_url}
                        onChange={(url) => setFormData({ ...formData, image_url: url })}
                        folder="catalog"
                    />

                    <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
                        <Button type="button" onClick={() => setIsModalOpen(false)} variant="ghost">Cancelar</Button>
                        <Button type="submit">Guardar</Button>
                    </div>
                </form>
            </Modal>

            {/* CATEGORY MODAL */}
            <Modal
                isOpen={isCategoryModalOpen}
                onClose={() => setIsCategoryModalOpen(false)}
                title="Gestionar Categorías"
            >
                <div className="space-y-4">
                    {/* Create New */}
                    <form onSubmit={handleAddCategory} className="flex gap-2 items-end">
                        <div className="flex-1">
                            <Input
                                required
                                placeholder="Nueva categoría..."
                                value={newCategoryName}
                                onChange={e => setNewCategoryName(e.target.value)}
                            />
                        </div>
                        <Button type="submit" className="h-[46px] w-[46px] p-0">
                            <Plus className="h-5 w-5" />
                        </Button>
                    </form>

                    {/* List */}
                    <div className="max-h-60 overflow-y-auto border border-gray-200 rounded-lg divide-y bg-gray-50/50">
                        {categories.map(cat => (
                            <div key={cat.id} className="p-3 text-sm flex items-center justify-between hover:bg-white transition-colors group">
                                {editingCategory?.id === cat.id ? (
                                    <form onSubmit={handleUpdateCategory} className="flex flex-1 gap-2 items-center">
                                        <input
                                            autoFocus
                                            aria-label="Nombre de categoría"
                                            className="flex-1 border rounded px-2 py-1 text-sm bg-white outline-none focus:ring-1 focus:ring-green-500"
                                            value={editingCategory.name}
                                            onChange={e => setEditingCategory({ ...editingCategory, name: e.target.value })}
                                        />
                                        <button type="submit" className="text-green-600 hover:bg-green-50 p-1 rounded transition-colors" aria-label="Guardar cambios">
                                            <Check className="h-4 w-4" />
                                        </button>
                                        <button type="button" onClick={() => setEditingCategory(null)} className="text-gray-500 hover:bg-gray-200 p-1 rounded transition-colors" aria-label="Cancelar edición">
                                            <X className="h-4 w-4" />
                                        </button>
                                    </form>
                                ) : (
                                    <>
                                        <span className="text-gray-700 font-medium">{cat.name}</span>
                                        <div className="flex gap-1 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={() => setEditingCategory(cat)}
                                                className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"
                                                title="Renombrar"
                                            >
                                                <Edit2 className="h-3 w-3" />
                                            </button>
                                            <button
                                                onClick={() => handleDeleteCategory(cat.id)}
                                                className="p-1.5 text-red-600 hover:bg-red-50 rounded"
                                                title="Eliminar"
                                            >
                                                <Trash2 className="h-3 w-3" />
                                            </button>
                                        </div>
                                    </>
                                )}
                            </div>
                        ))}
                    </div>

                    <div className="flex justify-end pt-2">
                        <Button onClick={() => setIsCategoryModalOpen(false)} variant="ghost" size="sm">Cerrar</Button>
                    </div>
                </div>
            </Modal>

            {/* AVAILABILITY MODAL */}
            <Modal
                isOpen={isAvailabilityModalOpen}
                onClose={() => setIsAvailabilityModalOpen(false)}
                title="Disponibilidad por Sede"
            >
                {selectedProductForAvailability && (
                    <>
                        <p className="text-sm text-gray-500 mb-4">Producto: <span className="text-pp-brown font-medium">{selectedProductForAvailability.name}</span></p>

                        <div className="space-y-2 mb-6">
                            {branches.map(branch => {
                                const isAvailable = branchAvailability[branch.id]?.is_active ?? true
                                const status = branchAvailability[branch.id]
                                const active = status ? status.is_active : true

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

                        <div className="flex justify-end pt-2 border-t">
                            <Button onClick={() => setIsAvailabilityModalOpen(false)} variant="ghost">Cerrar</Button>
                        </div>
                    </>
                )}
            </Modal>

            {/* RECIPE BUILDER MODAL */}
            {
                chefHatProduct && (
                    <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4 backdrop-blur-sm">
                        <RecipeBuilder
                            product={chefHatProduct}
                            onClose={() => setChefHatProduct(null)}
                        />
                    </div>
                )
            }
        </div >
    )
}
