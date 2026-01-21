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
    AlertTriangle,
    Percent
} from 'lucide-react'
import RecipeBuilder from './RecipeBuilder'
import ProductFormModal from './ProductFormModal'
import ProductMetrics from './ProductMetrics'
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
import { PinCodeModal } from '@/components/ui/PinCodeModal'

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
        image_url: '',
        description: '',
        type: 'standard', // 'standard' | 'combo'
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
    const [branchProductsVisibility, setBranchProductsVisibility] = useState<Record<string, Set<string>>>({})

    // Recipe Builder Modal State
    const [chefHatProduct, setChefHatProduct] = useState<Product | null>(null)
    const [selectedProductForDetail, setSelectedProductForDetail] = useState<ProductWithRecipe | null>(null)

    // Dashboard Metrics State
    const [activeKpi, setActiveKpi] = useState<string | null>('Margen Promedio (%)')

    // PIN Authorization State
    const [showPinModal, setShowPinModal] = useState(false)
    const [pinAction, setPinAction] = useState<{ type: 'EDIT' | 'DELETE' | 'RECIPE', data: any } | null>(null)

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
            await Promise.all([fetchCategories(), fetchProducts(), fetchBranches(), fetchBranchProductsLinks()])
        } catch (error) {
            console.error('Error loading data:', error)
        } finally {
            setLoading(false)
        }
    }

    const handlePinConfirmed = async (inputPin: string) => {
        const { data: isValid, error: pinError } = await supabase.rpc('verify_action_pin', { input_pin: inputPin })

        if (pinError || !isValid) {
            alert('PIN Incorrecto o sin permisos')
            return
        }

        setShowPinModal(false)
        const action = pinAction
        setPinAction(null)

        if (!action) return

        if (action.type === 'DELETE') {
            await performDelete(action.data.id)
        } else if (action.type === 'EDIT') {
            try {
                // Fetch branch activity for the product via product_prices
                const { data: branchData } = await supabase
                    .from('product_prices')
                    .select('branch_id, is_active')
                    .eq('product_id', action.data.id)
                    .is('channel_id', null) // Only base prices/availability per branch

                const activityRecord: Record<string, boolean> = {}
                branchData?.forEach(b => {
                    activityRecord[b.branch_id] = b.is_active
                })

                setEditingProduct(action.data)
                setFormData({
                    name: action.data.name,
                    category_id: action.data.category_id || '',
                    price: action.data.price || 0,
                    active: action.data.active,
                    image_url: action.data.image_url || '',
                    description: action.data.description || '',
                    branchActivity: activityRecord
                } as any)
                setIsModalOpen(true)
            } catch (error) {
                console.error('Error fetching branch activity:', error)
                alert('Error al cargar datos del producto')
            }
        } else if (action.type === 'RECIPE') {
            setChefHatProduct(action.data)
        }
    }

    const performDelete = async (id: string) => {
        try {
            const { error } = await supabase.from('products').delete().eq('id', id)
            if (error) throw error
            setProducts(prev => prev.filter(p => p.id !== id))
        } catch (error) {
            console.error(error)
            alert('Error al eliminar producto')
        }
    }

    const handleEditClick = (product: Product) => {
        setPinAction({ type: 'EDIT', data: product })
        setShowPinModal(true)
    }

    const handleDeleteClick = (product: Product) => {
        setPinAction({ type: 'DELETE', data: product })
        setShowPinModal(true)
    }

    const handleRecipeEditClick = (product: ProductWithRecipe) => {
        // If it has a recipe already, require PIN
        const hasRecipe = (product.recipes?.length || 0) > 0
        if (hasRecipe) {
            setPinAction({ type: 'RECIPE', data: product })
            setShowPinModal(true)
        } else {
            // New recipe setup - no PIN needed
            setChefHatProduct(product)
        }
    }

    const fetchBranchProductsLinks = async () => {
        // Use product_prices where channel_id is null to check base availability per branch
        const { data } = await supabase
            .from('product_prices')
            .select('branch_id, product_id')
            .eq('is_active', true)
            .is('channel_id', null)

        if (data) {
            const map: Record<string, Set<string>> = {}
            data.forEach(item => {
                if (!map[item.branch_id]) map[item.branch_id] = new Set()
                map[item.branch_id].add(item.product_id)
            })
            setBranchProductsVisibility(map)
        }
    }

    const fetchCategories = async () => {
        const { data } = await supabase.from('categories').select('*').order('name')
        if (data) {
            // Ensure 'Combos' category exists as per business rule
            const combosCategory = data.find(c => c.name.toLowerCase() === 'combos')
            if (!combosCategory) {
                // Auto-create Combos category
                try {
                    const { data: { user } } = await supabase.auth.getUser()
                    if (user) {
                        const { data: profile } = await supabase.from('profiles').select('organization_id').eq('id', user.id).single()
                        if (profile?.organization_id) {
                            await supabase.from('categories').insert([{
                                name: 'Combos',
                                organization_id: profile.organization_id
                            }])
                            // Re-fetch to include the new category
                            const { data: refetched } = await supabase.from('categories').select('*').order('name')
                            if (refetched) setCategories(refetched)
                            return
                        }
                    }
                } catch (err) {
                    console.error('Error auto-creating Combos category:', err)
                }
            }
            setCategories(data)
        }
    }

    const fetchProducts = async () => {
        setLoading(true);
        // We use the service method to get products with recipes
        const { data, error } = await supabase
            .from('products')
            .select(`
                *,
                type,
                combos:product_combos!parent_product_id(
                    child_product_id,
                    quantity,
                    child_product:products!child_product_id(name, image_url, price)
                ),
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
            // Extract comboItems from payload to avoid sending to products table
            const { comboItems, ...productData } = formData as any
            const payload = { ...productData, category_id: formData.category_id || null }
            if (!payload.category_id) { alert('Por favor selecciona una categoría'); return }

            if (editingProduct) {
                // If it's a combo, we need to handle products separately, but here we update basic info
                const { error } = await supabase.from('products').update(payload).eq('id', editingProduct.id)
                if (error) throw error

                // If it's a combo, we need to update relations (handled in Modal typically, but modal passes data here)
                // However, ProductList just receives data. The modal should probably handle the complex save via logic passed or inside itself.
                // Re-reading: The Modal calls `onSubmit` which is `handleProductSubmit`.
                // So I need to handle the relations here.

                if (payload.type === 'combo' && (payload as any).comboItems) {
                    // 1. Delete old combos
                    await supabase.from('product_combos').delete().eq('parent_product_id', editingProduct.id)

                    // 2. Insert new
                    const comboItems = (payload as any).comboItems.map((item: any) => ({
                        parent_product_id: editingProduct.id,
                        child_product_id: item.child_product_id,
                        quantity: item.quantity
                    }))

                    if (comboItems.length > 0) {
                        const { error: comboError } = await supabase.from('product_combos').insert(comboItems)
                        if (comboError) throw comboError
                    }
                }

            } else {
                // Insert Product
                const { data: newProd, error } = await supabase.from('products').insert([payload]).select().single()
                if (error) throw error

                // If Combo, insert items
                if (payload.type === 'combo' && (payload as any).comboItems) {
                    const comboItems = (payload as any).comboItems.map((item: any) => ({
                        parent_product_id: newProd.id,
                        child_product_id: item.child_product_id,
                        quantity: item.quantity
                    }))

                    if (comboItems.length > 0) {
                        const { error: comboError } = await supabase.from('product_combos').insert(comboItems)
                        if (comboError) throw comboError
                    }
                }
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
            image_url: '',
            description: '',
            type: 'standard'
        })
    }

    const openEdit = (product: Product) => {
        setEditingProduct(product)
        setFormData({
            name: product.name,
            category_id: product.category_id || (categories.length > 0 ? categories[0].id : ''),
            price: product.price || 0,
            active: product.active,
            image_url: product.image_url || '',
            description: product.description || '',
            type: (product as any).type || 'standard'
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
        const category = categories.find(c => c.id === id)
        if (category?.name.toLowerCase() === 'combos') {
            alert('La categoría "Combos" es una categoría del sistema y no puede ser eliminada.')
            return
        }

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
            .from('product_prices')
            .select('*')
            .eq('product_id', product.id)
            .is('channel_id', null)

        const availabilityMap: Record<string, BranchProduct> = {}
        if (data) {
            data.forEach((bp: any) => {
                // Map product_prices structure to our internal BranchProduct interface
                availabilityMap[bp.branch_id] = {
                    branch_id: bp.branch_id,
                    is_active: bp.is_active ?? true, // Default to true if null
                    price_override: bp.price
                }
            })
        }
        setBranchAvailability(availabilityMap)
    }

    const toggleBranchAvailability = async (branchId: string, currentStatus: boolean) => {
        const product = selectedProductForAvailability || selectedProductForDetail
        if (!product) return

        try {
            const newStatus = !currentStatus
            const { data: { user } } = await supabase.auth.getUser()

            // We need to fetch organization_id first
            const { data: profile } = await supabase.from('profiles').select('organization_id').eq('id', user?.id).single()
            if (!profile?.organization_id) throw new Error("No Organization ID")

            const { error } = await supabase
                .from('product_prices')
                .upsert({
                    organization_id: profile.organization_id,
                    branch_id: branchId,
                    product_id: product.id,
                    is_active: newStatus,
                    channel_id: null, // Base availability
                    price: null // No price override, just availability
                }, { onConflict: 'organization_id, product_id, channel_id, branch_id' })

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
            // Logic: Is it globally active? If yes, visible. 
            // If NOT globally active, check if it has a branch_products record with is_active: true
            if (p.active) return true;

            const visibleProductIds = branchProductsVisibility[selectedBranchId]
            if (!visibleProductIds?.has(p.id)) return false
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

        let matchesCategory = true
        if (filterCategoryId === 'all') {
            matchesCategory = true
        } else if (filterCategoryId === 'combos_system') {
            matchesCategory = (p as any).type === 'combo'
        } else {
            matchesCategory = p.category_id === filterCategoryId
        }

        return matchesSearch && matchesCategory
    })

    // Dashboard Metrics Calculations
    const dashboardMetrics = React.useMemo(() => {
        let totalMargin = 0
        let productsWithRecipe = 0
        let totalPotentialProfit = 0
        let totalValuation = 0
        const topProfitable: { name: string, margin: number, marginPercentage: number }[] = []
        const capacity: { name: string, possibleUnits: number }[] = []
        const missing: { name: string }[] = []
        const catStats: Record<string, { count: number, totalMargin: number }> = {}

        // Use contextProducts to ensure metrics respect the branch filter
        contextProducts.forEach(p => {
            const metrics = calculateProductMetrics(p)

            if (metrics.hasRecipe) {
                // Category Distribution & Margin - ONLY for costed products
                if (p.category_id) {
                    if (!catStats[p.category_id]) catStats[p.category_id] = { count: 0, totalMargin: 0 }
                    catStats[p.category_id].count++
                    catStats[p.category_id].totalMargin += metrics.marginPercentage
                }

                productsWithRecipe++
                totalMargin += metrics.marginPercentage
                totalPotentialProfit += (metrics.margin * metrics.stock)
                totalValuation += (metrics.unitCost * metrics.stock)

                topProfitable.push({
                    name: p.name,
                    margin: metrics.margin,
                    marginPercentage: metrics.marginPercentage
                })

                capacity.push({
                    name: p.name,
                    possibleUnits: metrics.stock
                })
            } else {
                missing.push({ name: p.name })
            }
        })

        const categoryDistribution = categories.map(cat => ({
            name: cat.name,
            count: catStats[cat.id]?.count || 0,
            avgMargin: catStats[cat.id]?.count > 0 ? catStats[cat.id].totalMargin / catStats[cat.id].count : 0
        })).filter(c => c.count > 0).sort((a, b) => b.avgMargin - a.avgMargin)

        return {
            avgMargin: productsWithRecipe > 0 ? totalMargin / productsWithRecipe : 0,
            totalPotentialProfit,
            hasRecipeCount: productsWithRecipe,
            totalProducts: products.length,
            activeProducts: products.filter(p => p.active).length,
            stockValuation: totalValuation,
            topProfitableItems: topProfitable.sort((a, b) => b.margin - a.margin).slice(0, 10),
            categoryDistribution,
            productionCapacity: capacity.filter(c => c.possibleUnits > 0).sort((a, b) => a.possibleUnits - b.possibleUnits).slice(0, 10),
            missingRecipes: missing
        }
    }, [products, categories, allIngredientsStock, selectedBranchId, startDate, endDate, productStocks])

    const productCosts = React.useMemo(() => {
        const costs: Record<string, number> = {}
        products.forEach(p => {
            costs[p.id] = calculateProductMetrics(p).unitCost
        })
        return costs
    }, [products, allIngredientsStock])

    const kpis: any[] = [
        {
            title: 'Margen Promedio (%)',
            value: `${Math.round(dashboardMetrics.avgMargin)}%`,
            icon: Percent,
            theme: 'green',
            trend: { value: 12, isPositive: true }
        },
        {
            title: 'Rentabilidad Potencial ($)',
            value: new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(dashboardMetrics.totalPotentialProfit),
            icon: DollarSign,
            theme: 'yellow'
        },
        {
            title: 'Cobertura de Recetas',
            value: `${Math.round((dashboardMetrics.hasRecipeCount / Math.max(contextProducts.length, 1)) * 100)}%`,
            icon: ChefHat,
            theme: 'blue'
        },
        {
            title: 'Inversión en Stock',
            value: new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(dashboardMetrics.stockValuation),
            icon: Package,
            theme: 'purple'
        }
    ]

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
                                tabs={[
                                    // Hardcode 'Combos' tab after 'All' (handled by labelAll) but before others
                                    { id: 'combos_system', label: 'Combos' },
                                    ...categories
                                        .filter(c => c.name.toLowerCase() !== 'combos') // Prevent duplicate if it exists in DB
                                        .map(cat => ({ id: cat.id, label: cat.name }))
                                ]}
                                activeTabId={filterCategoryId || 'all'}
                                onTabChange={setFilterCategoryId}
                                labelAll="Todas las categorías"
                            />
                        </div>
                    </div>
                </div>

                {/* ADVANCED METRICS DASHBOARD */}
                <div className="flex-grow overflow-y-auto custom-scrollbar pr-1">
                    <ProductMetrics
                        kpis={kpis}
                        widgets={dashboardMetrics}
                        activeKpi={activeKpi}
                        onKpiClick={setActiveKpi}
                        loading={loading}
                    />
                </div>
            </div>

            {/* RIGHT PANEL - Scrollable Product Cards */}
            <div className="w-1/2 overflow-y-auto">
                {
                    loading ? (
                        <div className="grid grid-cols-2 gap-3" >
                            {[...Array(6)].map((_, i) => (
                                <div key={i} className="flex flex-col gap-2">
                                    <Skeleton className="h-32 w-full rounded-xl" />
                                    <Skeleton className="h-4 w-3/4" />
                                    <Skeleton className="h-4 w-1/2" />
                                </div>
                            ))
                            }
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
                branches={branches}
                allProducts={products}
                productCosts={productCosts}
                initialData={formData}
                onSubmit={async (data) => {
                    const { branchActivity, comboItems, ...formContent } = data as any
                    let payload = { ...formContent, category_id: formContent.category_id || null }

                    // Auto-assign Combos category if missing or using virtual placeholder
                    if (payload.type === 'combo' && (!payload.category_id || payload.category_id === 'system_combos')) {
                        // Reset if it's the placeholder so we find the real one
                        if (payload.category_id === 'system_combos') payload.category_id = null;

                        let combosCatId = categories.find(c => c.name.toLowerCase() === 'combos')?.id

                        if (!combosCatId) {
                            // Fallback: Try to find it in DB directly
                            const { data: dbCat } = await supabase.from('categories').select('id').ilike('name', 'Combos').maybeSingle()

                            if (dbCat) {
                                combosCatId = dbCat.id
                            } else {
                                // Create it if absolutely missing
                                try {
                                    const { data: { user } } = await supabase.auth.getUser()
                                    if (user) {
                                        const { data: profile } = await supabase.from('profiles').select('organization_id').eq('id', user.id).single()
                                        if (profile?.organization_id) {
                                            const { data: newCat } = await supabase.from('categories').insert([{
                                                name: 'Combos',
                                                organization_id: profile.organization_id
                                            }]).select().single()
                                            if (newCat) combosCatId = newCat.id
                                        }
                                    }
                                } catch (e) {
                                    console.error('Failed to auto-create Combos category on save', e)
                                }
                            }
                        }

                        if (combosCatId) {
                            payload.category_id = combosCatId
                        }
                    }

                    if (!payload.category_id) { alert('Por favor selecciona una categoría'); throw new Error('Missing category') }

                    try {
                        let productId = editingProduct?.id

                        if (editingProduct) {
                            const { error } = await supabase.from('products').update(payload).eq('id', editingProduct.id)
                            if (error) throw error
                        } else {
                            const { data: newProd, error } = await supabase.from('products').insert([payload]).select().single()
                            if (error) throw error
                            productId = newProd.id
                        }

                        // Sync Branch Activity
                        if (productId) {
                            // 1. Sync Branches
                            const branchUpserts = Object.entries(branchActivity as Record<string, boolean>).map(([branchId, isActive]) => ({
                                product_id: productId,
                                branch_id: branchId,
                                is_active: isActive
                            }))

                            if (branchUpserts.length > 0) {
                                const { error: bpError } = await supabase
                                    .from('branch_products')
                                    .upsert(branchUpserts, { onConflict: 'branch_id, product_id' })
                                if (bpError) throw bpError
                            }

                            // 2. Sync Combos (if type is combo)
                            if (payload.type === 'combo' && Array.isArray(comboItems)) {
                                // Delete existing
                                const { error: delError } = await supabase
                                    .from('product_combos')
                                    .delete()
                                    .eq('parent_product_id', productId)
                                if (delError) throw delError

                                // Insert new
                                if (comboItems.length > 0) {
                                    const comboInserts = comboItems.map((item: any) => ({
                                        parent_product_id: productId,
                                        child_product_id: item.child_product_id,
                                        quantity: item.quantity
                                    }))

                                    const { error: insError } = await supabase
                                        .from('product_combos')
                                        .insert(comboInserts)
                                    if (insError) throw insError
                                }
                            }
                        }

                        await fetchProducts()
                        await fetchBranchProductsLinks() // Refresh visibility map
                    } catch (error) {
                        console.error('Error saving product:', error)
                        alert('Error al guardar producto')
                        throw error
                    }
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
            {
                selectedProductForDetail && (
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
                                        onClick={() => handleRecipeEditClick(selectedProductForDetail)}
                                        className="bg-white dark:bg-slate-800 hover:shadow-xl shadow-lg border-none text-pp-brown h-12 px-5 font-black uppercase tracking-tighter rounded-2xl flex items-center gap-2 group transition-all hover:-translate-y-1"
                                    >
                                        <ChefHat className="h-5 w-5 transition-transform group-hover:rotate-12" />
                                        {selectedProductForDetail.recipes?.length ? 'Editar Receta' : 'Configurar Receta'}
                                    </Button>
                                    <Button
                                        onClick={() => handleEditClick(selectedProductForDetail)}
                                        className="bg-pp-gold text-pp-brown hover:bg-pp-gold/90 shadow-lg shadow-pp-gold/30 border-none h-12 w-12 p-0 rounded-2xl flex items-center justify-center transition-all hover:-translate-y-1"
                                    >
                                        <Edit2 className="h-5 w-5" />
                                    </Button>
                                    <Button
                                        onClick={() => handleDeleteClick(selectedProductForDetail)}
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
                                                    <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-gray-100 dark:border-white/5 shadow-sm">
                                                        <div className="flex justify-between items-center mb-4">
                                                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Margen de Utilidad</span>
                                                            <Badge className={`${marginPercentage > 30 ? 'bg-green-100 text-green-600' : 'bg-orange-100 text-orange-600'} border-none py-1 px-3 text-[10px] font-black uppercase`}>
                                                                {marginPercentage > 30 ? 'Saludable' : 'Revisar Costos'}
                                                            </Badge>
                                                        </div>
                                                        <div className="flex justify-between items-end">
                                                            <div>
                                                                <span className="text-3xl font-black text-gray-900 dark:text-white">${Math.round(margin).toLocaleString()}</span>
                                                            </div>
                                                            <div className={`px-4 py-2 rounded-2xl flex flex-col items-center justify-center ${marginPercentage > 30 ? 'bg-green-50 text-green-600' : 'bg-orange-50 text-orange-600'}`}>
                                                                <span className="text-2xl font-black leading-none">{Math.round(marginPercentage)}%</span>
                                                                <span className="text-[8px] font-black uppercase tracking-tighter mt-1 opacity-70">Margen Real</span>
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
                                                    onClick={() => handleRecipeEditClick(selectedProductForDetail)}
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
                )
            }

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

            {/* PIN MODAL */}
            {showPinModal && (
                <PinCodeModal
                    title={pinAction?.type === 'DELETE' ? "Autorizar Eliminación" : pinAction?.type === 'EDIT' ? "Autorizar Edición" : "Autorizar Receta"}
                    subtitle="Ingresa PIN administrativo"
                    onClose={() => {
                        setShowPinModal(false)
                        setPinAction(null)
                    }}
                    onSubmit={handlePinConfirmed}
                />
            )}
        </div>
    )
}
