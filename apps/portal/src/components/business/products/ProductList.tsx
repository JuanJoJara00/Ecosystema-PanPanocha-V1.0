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
    Settings,
    Store,
    Check,
    X,
    Filter,
    FileText,
    Upload,
    DollarSign,
    AlertTriangle
} from 'lucide-react'
import RecipeBuilder from './RecipeBuilder'
import ProductFormModal from './ProductFormModal'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import Card from '@/components/ui/Card'
import Modal from '@/components/ui/Modal'
import ModuleTabs from '@/components/ui/ModuleTabs'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import EmptyState from '@/components/ui/EmptyState'
import Skeleton from '@/components/ui/Skeleton'
import ImageUpload from '@/components/ui/ImageUpload'
import DateRangeFilter from '@/components/ui/DateRangeFilter'
import ProductCSVImporter from './ProductCSVImporter'

import { appConfig } from '@/config/app-config'
import Image from 'next/image'


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

interface StockResult {
    product_id: string
    stock: number
}

interface Ingredient {
    id: string
    name: string
    unit: string
    unit_cost: number
}

interface RecipeItem {
    id: string
    quantity_required: number
    ingredient: Ingredient
}

interface ProductWithRecipe extends Product {
    recipes?: RecipeItem[]
}

export default function ProductList() {
    const [products, setProducts] = useState<ProductWithRecipe[]>([])
    const [categories, setCategories] = useState<Category[]>([])
    const [loading, setLoading] = useState(true)
    const [filterCategoryId, setFilterCategoryId] = useState<string>('all')
    const [searchTerm, setSearchTerm] = useState('')

    // Date Filter State
    const [startDate, setStartDate] = useState(() => {
        const d = new Date()
        d.setDate(1)
        return d.toISOString().split('T')[0]
    })
    const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0])

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
    const [isImportModalOpen, setIsImportModalOpen] = useState(false)
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
    const [allIngredientsStock, setAllIngredientsStock] = useState<Record<string, number>>({})

    // Recipe Builder Modal State
    const [chefHatProduct, setChefHatProduct] = useState<Product | null>(null)
    const [selectedProductForDetail, setSelectedProductForDetail] = useState<ProductWithRecipe | null>(null)

    useEffect(() => {
        fetchInitialData()
    }, [])

    useEffect(() => {
        if (selectedBranchId) {
            fetchStocks(selectedBranchId)
            fetchIngredientStocks(selectedBranchId)
        } else {
            setProductStocks({})
            setAllIngredientsStock({})
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
                { event: '*', schema: 'public', table: 'branch_ingredients' },
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
                return (data as unknown as StockResult[]) || []
            })

            const results = await Promise.all(promises)
            results.flat().forEach((item) => {
                stocks[item.product_id] = (stocks[item.product_id] || 0) + item.stock
            })
            setProductStocks(stocks)
        } else {
            const { data } = await supabase.rpc('get_branch_products_stock', { p_branch_id: branchId })
            if (data) {
                const map: Record<string, number> = {}
                const typedData = data as unknown as StockResult[]
                typedData.forEach((item) => map[item.product_id] = item.stock)
                setProductStocks(map)
            }
        }
    }

    const fetchIngredientStocks = async (branchId: string) => {
        if (!branchId) return

        if (branchId === 'all') {
            const { data } = await supabase
                .from('branch_ingredients')
                .select('ingredient_id, current_stock')

            if (data) {
                const map: Record<string, number> = {}
                data.forEach(item => {
                    map[item.ingredient_id] = (map[item.ingredient_id] || 0) + (Number(item.current_stock) || 0)
                })
                setAllIngredientsStock(map)
            }
        } else {
            const { data } = await supabase
                .from('branch_ingredients')
                .select('ingredient_id, current_stock')
                .eq('branch_id', branchId)

            if (data) {
                const map: Record<string, number> = {}
                data.forEach(item => {
                    map[item.ingredient_id] = Number(item.current_stock) || 0
                })
                setAllIngredientsStock(map)
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
        const { data } = await supabase.from('categories').select('*').order('name')
        if (data) setCategories(data)
    }

    const fetchProducts = async () => {
        setLoading(true);
        // We use the service method to get products with recipes
        const { data, error } = await supabase
            .from('products')
            .select(`
                *,
                recipes:product_recipes(
                    id,
                    quantity_required,
                    ingredient:inventory_items(id, name, unit, unit_cost)
                )
            `)
            .order('name');

        if (data) {
            setProducts(data as ProductWithRecipe[]);
        } else if (error) {
            console.error('Error loading products with recipes:', error);
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
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) throw new Error('No auth user')

            const { data: profile } = await supabase
                .from('profiles')
                .select('organization_id')
                .eq('id', user.id)
                .single()

            const orgId = profile?.organization_id
            if (!orgId) throw new Error('No organization ID found')

            const { error } = await supabase
                .from('categories')
                .insert([{
                    name: newCategoryName.trim(),
                    organization_id: orgId
                }])

            if (error) {
                console.error('Supabase error creating category:', {
                    message: error.message,
                    details: error.details,
                    hint: error.hint,
                    code: error.code
                })
                throw error
            }

            await fetchCategories()
            setNewCategoryName('')
            // setIsCategoryModalOpen(false) // Keep it open for multiple additions if needed
        } catch (error) {
            console.error('Error adding category:', error)
            alert('Error al crear categoría')
        }
    }

    const handleDeleteCategory = async (id: string) => {
        if (!confirm('¿Eliminar categoría? Si tiene productos asociados, no se podrá eliminar.')) return
        try {
            const { error } = await supabase.from('categories').delete().eq('id', id)
            if (error) throw error
            await fetchCategories()
        } catch (error: any) {
            console.error('Error deleting category:', error)
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
                .from('categories')
                .update({ name: editingCategory.name.trim() })
                .eq('id', editingCategory.id)

            if (error) throw error

            await fetchCategories()
            setEditingCategory(null)
        } catch (error) {
            console.error('Error updating category:', error)
            alert('Error al actualizar categoría')
        }
    }


    const calculateProductMetrics = (product: ProductWithRecipe) => {
        let totalCost = 0
        let possibleStock = Infinity
        const hasRecipe = product.recipes && product.recipes.length > 0

        if (hasRecipe) {
            product.recipes?.forEach(item => {
                const ingredientCost = (item.ingredient?.unit_cost || 0) * item.quantity_required
                totalCost += ingredientCost

                const availableStock = allIngredientsStock[item.ingredient.id] || 0
                const possibleWithThis = Math.floor(availableStock / item.quantity_required)
                if (possibleWithThis < possibleStock) {
                    possibleStock = possibleWithThis
                }
            })
        } else {
            possibleStock = 0
        }

        const margin = (product.price || 0) - totalCost
        const marginPercentage = product.price > 0 ? (margin / product.price) * 100 : 0

        return {
            unitCost: totalCost,
            margin,
            marginPercentage,
            stock: possibleStock === Infinity ? 0 : possibleStock,
            hasRecipe
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
        const product = selectedProductForAvailability || selectedProductForDetail
        if (!product) return

        try {
            const newStatus = !currentStatus

            const { error } = await supabase
                .from('branch_products')
                .upsert({
                    branch_id: branchId,
                    product_id: product.id,
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
    const contextProducts = products.filter(p => {
        // Branch Filter
        if (selectedBranchId && selectedBranchId !== 'all') {
            // If item has a stock record in this branch, it belongs here
            if (productStocks[p.id] === undefined) return false
        }

        // Date range filter - if applicable/requested
        if (startDate && p.created_at) {
            const created = new Date(p.created_at).getTime()
            const start = new Date(startDate).getTime()
            const end = new Date(endDate).getTime() + (24 * 60 * 60 * 1000) // End inclusive
            // return created >= start && created <= end // Optional: filter by creation?
        }

        return true
    })

    const filteredProducts = contextProducts.filter(p => {
        const categoryName = categories.find(c => c.id === p.category_id)?.name || ''
        const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            categoryName.toLowerCase().includes(searchTerm.toLowerCase())

        const matchesCategory = filterCategoryId === 'all' || p.category_id === filterCategoryId
        return matchesSearch && matchesCategory
    })

    // No hierarchy filtering for pills - show all categories as requested by user
    // to ensure visibility of newly created categories and empty ones.

    return (
        <div className="flex gap-2 w-full h-[calc(100vh-4rem)]">
            {/* LEFT PANEL */}
            <div className="w-1/2 flex-shrink-0 flex flex-col gap-3 overflow-y-auto">
                {/* UNIFIED HEADER BLOCK */}
                <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl shadow-xl border border-gray-100/50 dark:border-white/5 relative overflow-hidden">
                    {/* Row 1: Brand, Category Filter, Date Filter */}
                    <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6 relative z-10">

                        {/* Brand & Title Section */}
                        <div className="flex items-center gap-4">
                            <div className="relative h-14 w-14 shrink-0 bg-pp-gold/10 rounded-2xl overflow-hidden flex items-center justify-center p-2">
                                <Image
                                    src={appConfig.company.logoUrl}
                                    alt={appConfig.company.name}
                                    fill
                                    className="object-contain"
                                />
                            </div>
                            <div>
                                <h1 className="text-2xl font-black text-gray-900 dark:text-white font-display uppercase tracking-tight">
                                    Productos y Recetas
                                </h1>
                                <p className="text-gray-500 font-medium text-sm">
                                    Gestión del catálogo de productos
                                </p>
                            </div>
                        </div>

                        <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                            {/* Date Filter */}
                            <DateRangeFilter
                                startDate={startDate}
                                endDate={endDate}
                                onStartDateChange={setStartDate}
                                onEndDateChange={setEndDate}
                                onFilter={() => fetchInitialData()}
                                loading={loading}
                            />
                        </div>
                    </div>

                    {/* Divider */}
                    <div className="h-px bg-gray-100 dark:bg-white/5 w-full mb-4" />

                    {/* Row 2: Search & Actions */}
                    <div className="flex flex-col lg:flex-row gap-3 justify-between items-center mb-4">
                        {/* Search */}
                        <div className="relative w-full lg:max-w-sm group">
                            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-pp-gold transition-colors">
                                <Search className="h-4 w-4" />
                            </div>
                            <input
                                type="text"
                                placeholder="Buscar productos..."
                                className="pl-9 pr-4 py-2.5 w-full bg-gray-50 dark:bg-slate-800 border border-gray-100 dark:border-white/5 rounded-xl focus:ring-4 focus:ring-pp-gold/10 focus:border-pp-gold outline-none transition-all text-sm font-bold placeholder:text-gray-400"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>

                        {/* Actions */}
                        <div className="flex flex-wrap gap-2 w-full lg:w-auto">
                            <Button
                                variant="secondary"
                                onClick={() => { }}
                                startIcon={<FileText className="h-4 w-4" />}
                                className="py-2.5 px-4 h-auto font-bold rounded-xl border-gray-100 dark:border-white/5 bg-white dark:bg-slate-800 text-gray-700 shadow-sm text-sm"
                            >
                                Reporte
                            </Button>
                            <Button
                                variant="secondary"
                                onClick={() => setIsImportModalOpen(true)}
                                startIcon={<Upload className="h-4 w-4" />}
                                className="py-2.5 px-4 h-auto font-bold rounded-xl border-gray-100 dark:border-white/5 bg-white dark:bg-slate-800 text-gray-700 shadow-sm text-sm"
                            >
                                Importar
                            </Button>
                            <Button
                                onClick={() => setIsCategoryModalOpen(true)}
                                variant="secondary"
                                startIcon={<Settings className="h-4 w-4" />}
                                className="py-2.5 px-4 h-auto font-bold rounded-xl border-gray-100 dark:border-white/5 bg-white dark:bg-slate-800 text-gray-700 shadow-sm text-sm"
                            >
                                Categorías
                            </Button>
                            <Button
                                onClick={() => { resetForm(); setIsModalOpen(true) }}
                                startIcon={<Plus className="h-4 w-4" />}
                                className="py-2.5 px-5 h-auto bg-pp-gold text-pp-brown hover:bg-pp-gold/90 font-black rounded-xl shadow-md text-sm border-none"
                            >
                                Nuevo Producto
                            </Button>
                        </div>
                    </div>

                    {/* Row 3: Branch & Category Tabs */}
                    <div className="border-t border-gray-100 dark:border-white/5 pt-3 flex flex-col gap-3">
                        <div className="w-full overflow-hidden">
                            <ModuleTabs
                                key="branch-tabs"
                                tabs={branches.map(b => ({ id: b.id, label: b.name }))}
                                activeTabId={selectedBranchId || 'all'}
                                onTabChange={setSelectedBranchId}
                                labelAll="Todas las sedes"
                            />
                        </div>
                        <div className="w-full overflow-hidden">
                            <ModuleTabs
                                key="category-tabs"
                                tabs={categories.map(cat => ({ id: cat.id, label: cat.name }))}
                                activeTabId={filterCategoryId || 'all'}
                                onTabChange={setFilterCategoryId}
                                labelAll="Todas las categorías"
                            />
                        </div>
                    </div>
                </div>

                {/* KPI CARDS */}
                <div className="grid grid-cols-3 gap-3">
                    {/* Total Productos */}
                    <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border-l-4 border-pp-gold shadow-sm border-y border-r border-y-gray-100 border-r-gray-100 dark:border-y-white/5 dark:border-r-white/5">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 bg-pp-gold/10 rounded-xl">
                                <Package className="h-5 w-5 text-pp-brown" />
                            </div>
                            <div>
                                <p className="text-[10px] font-black text-pp-brown/60 uppercase tracking-wider mb-0.5">Total Productos</p>
                                <p className="text-2xl font-black text-gray-900 dark:text-white leading-none">
                                    {products.length}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Productos Activos */}
                    <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border-l-4 border-green-500 shadow-sm border-y border-r border-y-gray-100 border-r-gray-100 dark:border-y-white/5 dark:border-r-white/5">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 bg-green-500/10 rounded-xl">
                                <Check className="h-5 w-5 text-green-600" />
                            </div>
                            <div>
                                <p className="text-[10px] font-black text-green-600/60 uppercase tracking-wider mb-0.5">Activos</p>
                                <p className="text-2xl font-black text-gray-900 dark:text-white leading-none">
                                    {products.filter(p => p.active).length}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Categorías */}
                    <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border-l-4 border-blue-500 shadow-sm border-y border-r border-y-gray-100 border-r-gray-100 dark:border-y-white/5 dark:border-r-white/5">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 bg-blue-500/10 rounded-xl">
                                <Filter className="h-5 w-5 text-blue-600" />
                            </div>
                            <div>
                                <p className="text-[10px] font-black text-blue-600/60 uppercase tracking-wider mb-0.5">Categorías</p>
                                <p className="text-2xl font-black text-gray-900 dark:text-white leading-none">
                                    {categories.length}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* CATEGORY DISTRIBUTION WIDGET */}
                <div className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-gray-100 dark:border-white/5 shadow-sm flex-1">
                    <h3 className="text-sm font-bold text-gray-700 dark:text-gray-200 mb-3">Distribución por Categoría</h3>
                    <div className="space-y-2">
                        {categories.slice(0, 5).map(cat => {
                            const count = products.filter(p => p.category_id === cat.id).length
                            const pct = products.length > 0 ? Math.round((count / products.length) * 100) : 0
                            return (
                                <div key={cat.id} className="flex items-center gap-3">
                                    <span className="w-24 text-xs font-medium text-gray-600 truncate">{cat.name}</span>
                                    <div className="flex-1 h-2 bg-gray-100 dark:bg-slate-700 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-pp-gold rounded-full transition-all"
                                            style={{ width: `${pct}%` }}
                                        />
                                    </div>
                                    <span className="text-xs font-bold text-gray-500 w-8 text-right">{count}</span>
                                </div>
                            )
                        })}
                    </div>
                    <div className="mt-4 pt-3 border-t border-gray-100 dark:border-white/5 grid grid-cols-2 gap-4">
                        <div>
                            <p className="text-xs text-gray-400 font-medium">Precio Promedio</p>
                            <p className="text-lg font-black text-gray-800 dark:text-white">
                                ${products.length > 0 ? Math.round(products.reduce((sum, p) => sum + (p.price || 0), 0) / products.length).toLocaleString() : 0}
                            </p>
                        </div>
                        <div>
                            <p className="text-xs text-gray-400 font-medium">Producto más caro</p>
                            <p className="text-sm font-bold text-pp-brown truncate">
                                {products.length > 0 ? products.reduce((max, p) => (p.price || 0) > (max.price || 0) ? p : max, products[0]).name : '-'}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* RIGHT PANEL - Scrollable Product Cards */}
            <div className="w-1/2 overflow-y-auto">
                {loading ? (
                    <div className="grid grid-cols-2 gap-3">
                        {[...Array(6)].map((_, i) => (
                            <div key={i} className="flex flex-col gap-2">
                                <Skeleton className="h-32 w-full rounded-xl" />
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
                    <div className="grid grid-cols-2 gap-3">
                        {filteredProducts.map(product => {
                            const { unitCost, margin, marginPercentage, stock, hasRecipe } = calculateProductMetrics(product)
                            const categoryName = categories.find(c => c.id === product.category_id)?.name || 'Sin Categoría'

                            return (
                                <Card
                                    key={product.id}
                                    noPadding
                                    className="flex flex-col bg-white border border-gray-100 transition-all duration-200 group cursor-pointer h-full rounded-2xl hover:shadow-lg hover:-translate-y-1 overflow-hidden !p-0"
                                    onClick={() => {
                                        setSelectedProductForDetail(product)
                                        openAvailabilityModal(product) // Load branch availability for detail modal
                                    }}
                                >
                                    {/* HEADER IMAGE */}
                                    <div className="h-44 w-full bg-gray-50 flex items-center justify-center relative overflow-hidden shrink-0">
                                        {product.image_url ? (
                                            <img
                                                src={product.image_url}
                                                alt={product.name}
                                                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                                            />
                                        ) : (
                                            <div className="flex flex-col items-center justify-center opacity-30 text-gray-300">
                                                <ImageIcon size={48} />
                                                <span className="text-[10px] uppercase font-bold tracking-widest mt-2">{categoryName}</span>
                                            </div>
                                        )}

                                        {/* Status Badge */}
                                        <div className="absolute top-3 right-3 z-10">
                                            <Badge variant={product.active ? 'success' : 'neutral'} className="shadow-sm">
                                                {product.active ? 'Activo' : 'Inactivo'}
                                            </Badge>
                                        </div>
                                    </div>

                                    {/* CARD CONTENT */}
                                    <div className="p-5 flex flex-col flex-grow relative">
                                        <div className="flex justify-between items-start gap-2 mb-1">
                                            <h3 className="font-black text-gray-900 leading-snug text-[15px] font-display uppercase line-clamp-2" title={product.name}>
                                                {product.name}
                                            </h3>
                                            {!hasRecipe && (
                                                <Badge variant="error" className="shadow-sm py-0.5 px-1.5 text-[9px] shrink-0">
                                                    Sin Receta
                                                </Badge>
                                            )}
                                        </div>

                                        <p className="text-[10px] text-pp-brown/70 font-black uppercase tracking-wider mb-4">
                                            {categoryName}
                                        </p>

                                        {/* Price / Primary Metric */}
                                        <div className="flex-grow flex flex-col items-center justify-center py-2 mb-4">
                                            <div className="flex items-baseline justify-center gap-1">
                                                <span className="text-sm font-bold text-gray-400">$</span>
                                                <span className="text-4xl font-black font-display tracking-tight text-pp-brown">
                                                    {product.price?.toLocaleString()}
                                                </span>
                                            </div>
                                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">Precio Venta</p>
                                        </div>

                                        {/* Details Footer - Matching Inventory Style */}
                                        <div className="grid grid-cols-3 gap-0 border-t border-gray-100 pt-4 mt-auto">
                                            <div className="flex flex-col items-center justify-center border-r border-gray-100 px-1 text-center">
                                                <span className="text-[10px] text-gray-400 uppercase tracking-widest font-extrabold mb-1">Costo</span>
                                                <span className="text-gray-900 font-black font-mono text-base leading-none">
                                                    ${Math.round(unitCost).toLocaleString()}
                                                </span>
                                            </div>
                                            <div className="flex flex-col items-center justify-center border-r border-gray-100 px-1 text-center">
                                                <span className="text-[10px] text-gray-400 uppercase tracking-widest font-extrabold mb-1">Margen</span>
                                                <div className="flex flex-col items-center">
                                                    <span className={`font-black font-mono text-base leading-none ${marginPercentage > 30 ? 'text-green-600' : 'text-orange-500'}`}>
                                                        ${Math.round(margin).toLocaleString()}
                                                    </span>
                                                    <span className={`text-[10px] font-bold font-mono mt-0.5 ${marginPercentage > 30 ? 'text-green-600/70' : 'text-orange-500/70'}`}>
                                                        {Math.round(marginPercentage)}%
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="flex flex-col items-center justify-center px-1 text-center">
                                                <span className="text-[10px] text-gray-400 uppercase tracking-widest font-extrabold mb-1">Stock</span>
                                                <span className={`font-black font-mono text-base leading-none ${stock > 0 ? 'text-blue-600' : 'text-gray-400'}`}>
                                                    {hasRecipe ? stock : '-'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </Card>
                            )
                        })}
                    </div>
                )
                }
            </div>

            {/* NEW PRODUCT FORM MODAL */}
            <ProductFormModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSubmit={async (data) => {
                    const payload = { ...data, category_id: data.category_id || null }
                    if (!payload.category_id) { alert('Por favor selecciona una categoría'); throw new Error('Missing category') }

                    if (editingProduct) {
                        const { error } = await supabase.from('products').update(payload).eq('id', editingProduct.id)
                        if (error) throw error
                    } else {
                        const { error } = await supabase.from('products').insert([payload])
                        if (error) throw error
                    }
                    fetchProducts()
                }}
                editingProduct={editingProduct}
                categories={categories}
            />

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

            {/* IMPORT MODAL */}
            <Modal
                isOpen={isImportModalOpen}
                onClose={() => setIsImportModalOpen(false)}
                title="Importar Productos desde CSV"
            >
                <ProductCSVImporter
                    onSuccess={() => {
                        setIsImportModalOpen(false)
                        fetchInitialData()
                    }}
                    onCancel={() => setIsImportModalOpen(false)}
                />
            </Modal>

            {/* PRODUCT DETAIL MODAL */}
            {selectedProductForDetail && (
                <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200 border border-white/20">
                        {/* Header Wrapper */}
                        <div className="relative">
                            {/* Top Image Banner */}
                            <div className="h-64 bg-gray-100 dark:bg-slate-800 w-full flex items-center justify-center border-b border-gray-200 dark:border-white/5 relative overflow-hidden group">
                                {selectedProductForDetail.image_url ? (
                                    <img
                                        src={selectedProductForDetail.image_url}
                                        alt={selectedProductForDetail.name}
                                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                                    />
                                ) : (
                                    <div className="flex flex-col items-center gap-3 text-gray-300">
                                        <ImageIcon className="h-16 w-16 opacity-50" />
                                        <span className="text-xs font-bold uppercase tracking-widest text-gray-400">Sin Imagen</span>
                                    </div>
                                )}

                                <div className="absolute top-6 right-6 z-20">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setSelectedProductForDetail(null)}
                                        className="bg-white/80 dark:bg-black/40 hover:bg-white dark:hover:bg-black text-gray-800 dark:text-white rounded-full h-10 w-10 p-0 backdrop-blur-md shadow-lg border border-white/50 dark:border-white/10 transition-all hover:scale-110"
                                    >
                                        <X className="h-5 w-5" />
                                    </Button>
                                </div>

                                {/* Floating Category Badge */}
                                <div className="absolute bottom-6 left-6 flex gap-2">
                                    <Badge className="bg-white/90 dark:bg-slate-900/90 py-1 px-3 text-[10px] font-black uppercase tracking-widest border-none shadow-lg text-pp-brown">
                                        {categories.find(c => c.id === selectedProductForDetail.category_id)?.name || 'Sin Categoría'}
                                    </Badge>
                                    <Badge variant={selectedProductForDetail.active ? 'success' : 'neutral'} className="shadow-lg py-1 px-3 border-none">
                                        {selectedProductForDetail.active ? 'Activo' : 'Inactivo'}
                                    </Badge>
                                </div>
                            </div>

                            {/* Actions Floating Bar */}
                            <div className="absolute -bottom-6 right-8 flex gap-2 z-30">
                                <Button
                                    onClick={() => {
                                        setChefHatProduct(selectedProductForDetail)
                                        setSelectedProductForDetail(null)
                                    }}
                                    className="bg-white dark:bg-slate-800 hover:shadow-xl shadow-lg border-none text-pp-brown h-12 px-5 font-black uppercase tracking-tighter rounded-2xl flex items-center gap-2 group transition-all hover:-translate-y-1"
                                >
                                    <ChefHat className="h-5 w-5 transition-transform group-hover:rotate-12" />
                                    Editar Receta
                                </Button>
                                <Button
                                    onClick={() => {
                                        openEdit(selectedProductForDetail)
                                        setSelectedProductForDetail(null)
                                    }}
                                    className="bg-pp-gold text-pp-brown hover:bg-pp-gold/90 shadow-lg shadow-pp-gold/30 border-none h-12 w-12 p-0 rounded-2xl flex items-center justify-center transition-all hover:-translate-y-1"
                                >
                                    <Edit2 className="h-5 w-5" />
                                </Button>
                                <Button
                                    onClick={() => {
                                        handleDeleteProduct(selectedProductForDetail.id)
                                        setSelectedProductForDetail(null)
                                    }}
                                    className="bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-500/30 border-none h-12 w-12 p-0 rounded-2xl flex items-center justify-center transition-all hover:-translate-y-1"
                                >
                                    <Trash2 className="h-5 w-5" />
                                </Button>
                            </div>
                        </div>

                        {/* Modal Body - 2 Columns */}
                        <div className="flex-grow grid grid-cols-1 lg:grid-cols-5 overflow-hidden">
                            {/* Left Column: Analytics & Info (2/5) */}
                            <div className="lg:col-span-2 border-r border-gray-100 dark:border-white/5 p-8 overflow-y-auto bg-gray-50/50 dark:bg-slate-800/20">
                                <div className="mb-8">
                                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">Nombre del Producto</span>
                                    <h2 className="text-3xl font-black text-gray-900 dark:text-white font-display uppercase leading-tight">{selectedProductForDetail.name}</h2>
                                    {selectedProductForDetail.description && (
                                        <p className="text-gray-500 dark:text-gray-400 mt-2 text-sm leading-relaxed">{selectedProductForDetail.description}</p>
                                    )}
                                </div>

                                <div className="space-y-4">
                                    {(() => {
                                        const { unitCost, margin, marginPercentage, stock, hasRecipe } = calculateProductMetrics(selectedProductForDetail)
                                        return (
                                            <>
                                                {/* Price Card */}
                                                <div className="bg-white dark:bg-slate-800 p-5 rounded-3xl border border-gray-100 dark:border-white/5 shadow-sm">
                                                    <div className="flex justify-between items-center mb-1">
                                                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Precio Venta</span>
                                                        <DollarSign className="h-4 w-4 text-pp-gold" />
                                                    </div>
                                                    <div className="flex items-baseline gap-1">
                                                        <span className="text-3xl font-black text-gray-900 dark:text-white">${selectedProductForDetail.price?.toLocaleString()}</span>
                                                    </div>
                                                </div>

                                                {/* Metrics Grid */}
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div className="bg-white dark:bg-slate-800 p-5 rounded-3xl border border-gray-100 dark:border-white/5 shadow-sm">
                                                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">Costo Unit.</span>
                                                        <span className="text-xl font-black text-gray-900 dark:text-white">${Math.round(unitCost).toLocaleString()}</span>
                                                    </div>
                                                    <div className="bg-white dark:bg-slate-800 p-5 rounded-3xl border border-gray-100 dark:border-white/5 shadow-sm">
                                                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">Stock Actual</span>
                                                        <span className={`text-xl font-black ${stock > 0 ? 'text-blue-600' : 'text-red-500'}`}>
                                                            {hasRecipe ? stock : '-'}
                                                        </span>
                                                    </div>
                                                </div>

                                                {/* Margin Card */}
                                                <div className="bg-pp-brown dark:bg-slate-900 p-5 rounded-3xl border border-white/5 shadow-xl">
                                                    <div className="flex justify-between items-center mb-2">
                                                        <span className="text-[10px] font-black text-pp-gold uppercase tracking-widest">Margen de Utilidad</span>
                                                        <Badge className={`${marginPercentage > 30 ? 'bg-green-500/20 text-green-400' : 'bg-orange-500/20 text-orange-400'} border-none py-0.5 px-2 text-[10px]`}>
                                                            {marginPercentage > 30 ? 'Saludable' : 'Revisar Costos'}
                                                        </Badge>
                                                    </div>
                                                    <div className="flex justify-between items-end">
                                                        <div>
                                                            <span className="text-3xl font-black text-white">${Math.round(margin).toLocaleString()}</span>
                                                            <span className="text-xs text-pp-gold ml-2 font-black">({Math.round(marginPercentage)}%)</span>
                                                        </div>
                                                        <div className="h-10 w-24 relative overflow-hidden flex items-end">
                                                            <div className="absolute inset-0 bg-pp-gold/10 rounded-lg" />
                                                            <div className="flex items-end gap-0.5 px-1 pb-1 w-full justify-between">
                                                                {[40, 60, 45, 70, 55, 85, 100].map((h, i) => (
                                                                    <div key={i} className="bg-pp-gold/40 w-full rounded-t-sm" style={{ height: `${h}%` }} />
                                                                ))}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </>
                                        )
                                    })()}
                                </div>
                            </div>

                            {/* Right Column: Recipe & Branches (3/5) */}
                            <div className="lg:col-span-3 p-8 overflow-y-auto flex flex-col gap-8">
                                {/* Recipe Breakdown */}
                                <div>
                                    <div className="flex items-center justify-between mb-4">
                                        <h3 className="text-lg font-black text-gray-900 dark:text-white uppercase tracking-tighter flex items-center gap-2">
                                            <ChefHat className="h-5 w-5 text-pp-gold" />
                                            Receta y Composición
                                        </h3>
                                        <span className="text-xs font-bold text-gray-400">
                                            {selectedProductForDetail.recipes?.length || 0} Ingredientes
                                        </span>
                                    </div>

                                    {selectedProductForDetail.recipes && selectedProductForDetail.recipes.length > 0 ? (
                                        <div className="bg-white dark:bg-slate-800 rounded-3xl border border-gray-100 dark:border-white/5 overflow-hidden">
                                            <table className="w-full text-left">
                                                <thead className="bg-gray-50/50 dark:bg-black/20 border-b border-gray-100 dark:border-white/5">
                                                    <tr>
                                                        <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Ingrediente</th>
                                                        <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Cant.</th>
                                                        <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Costo Est.</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                                                    {selectedProductForDetail.recipes.map((item, idx) => {
                                                        const cost = (item.ingredient?.unit_cost || 0) * item.quantity_required
                                                        return (
                                                            <tr key={idx} className="group hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                                                                <td className="px-6 py-4">
                                                                    <span className="text-sm font-bold text-gray-700 dark:text-gray-200">{item.ingredient?.name}</span>
                                                                    <div className="text-[10px] text-gray-400 uppercase font-bold mt-0.5">Ref: {item.ingredient?.id.slice(0, 8)}</div>
                                                                </td>
                                                                <td className="px-6 py-4 text-center">
                                                                    <span className="text-sm font-mono font-bold text-gray-900 dark:text-white">
                                                                        {item.quantity_required}
                                                                        <span className="text-[10px] ml-1 text-gray-400 lowercase">{item.ingredient?.unit}</span>
                                                                    </span>
                                                                </td>
                                                                <td className="px-6 py-4 text-right">
                                                                    <span className="text-sm font-mono font-bold text-gray-900 dark:text-white">${Math.round(cost).toLocaleString()}</span>
                                                                </td>
                                                            </tr>
                                                        )
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>
                                    ) : (
                                        <div className="bg-orange-50 dark:bg-orange-500/10 border border-orange-100 dark:border-orange-500/20 p-6 rounded-3xl flex flex-col items-center text-center">
                                            <AlertTriangle className="h-10 w-10 text-orange-500 mb-3" />
                                            <h4 className="font-black text-orange-900 dark:text-orange-400 uppercase text-sm mb-1">Sin Receta Configurada</h4>
                                            <p className="text-sm text-orange-700/70 dark:text-orange-400/70">No se pueden calcular costos o stock real sin una receta.</p>
                                            <Button
                                                onClick={() => {
                                                    setChefHatProduct(selectedProductForDetail)
                                                    setSelectedProductForDetail(null)
                                                }}
                                                variant="outline"
                                                size="sm"
                                                className="mt-4 border-orange-200 text-orange-700 hover:bg-orange-100"
                                            >
                                                Configurar Receta
                                            </Button>
                                        </div>
                                    )}
                                </div>

                                {/* Availability per Branch */}
                                <div>
                                    <div className="flex items-center justify-between mb-4">
                                        <h3 className="text-lg font-black text-gray-900 dark:text-white uppercase tracking-tighter flex items-center gap-2">
                                            <Store className="h-5 w-5 text-pp-gold" />
                                            Disponibilidad en Sedes
                                        </h3>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        {branches.map(branch => {
                                            const active = branchAvailability[branch.id]?.is_active ?? true
                                            return (
                                                <div
                                                    key={branch.id}
                                                    className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${active
                                                        ? 'bg-white dark:bg-slate-800 border-gray-100 dark:border-white/10 shadow-sm'
                                                        : 'bg-gray-50 dark:bg-slate-900 border-dashed border-gray-200 dark:border-white/5 opacity-60'
                                                        }`}
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <div className={`p-2 rounded-xl ${active ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'}`}>
                                                            <Store className="h-4 w-4" />
                                                        </div>
                                                        <span className={`text-sm font-bold ${active ? 'text-gray-800 dark:text-gray-200' : 'text-gray-400'}`}>
                                                            {branch.name}
                                                        </span>
                                                    </div>
                                                    <label className="relative inline-flex items-center cursor-pointer">
                                                        <input
                                                            type="checkbox"
                                                            className="sr-only peer"
                                                            checked={active}
                                                            aria-label={`Disponibilidad en ${branch.name}`}
                                                            onChange={() => toggleBranchAvailability(branch.id, active)}
                                                        />
                                                        <div className="w-9 h-5 bg-gray-200 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-green-600 shadow-inner"></div>
                                                    </label>
                                                </div>
                                            )
                                        })}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* RECIPE BUILDER MODAL */}
            {chefHatProduct && (
                <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4 backdrop-blur-sm">
                    <RecipeBuilder
                        product={chefHatProduct}
                        onClose={() => setChefHatProduct(null)}
                    />
                </div>
            )}
        </div>
    )
}
