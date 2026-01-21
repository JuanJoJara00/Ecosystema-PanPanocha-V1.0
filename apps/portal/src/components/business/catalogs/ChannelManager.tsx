'use client'

import React, { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Calculator } from '../../../../../../packages/shared-logic/src'
import {
    Globe,
    Plus,
    Search,
    Store,
    ChevronRight,
    Filter,
    MoreHorizontal,
    TrendingUp,
    FileText,
    RefreshCw,
    AlertCircle,
    CheckCircle2,
    Tag,
    Package,
    Layers,
    Edit3,
    Calendar,
    Share2,
    Download,
    BarChart2,
    Gift,
    DollarSign,
    Percent,
    Clock,
    ArrowUpRight,
    TrendingDown
} from 'lucide-react'
import Image from 'next/image'
import { appConfig } from '@/config/app-config'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import ChannelProductDetailModal from './ChannelProductDetailModal'
import PromotionPerformanceModal from './PromotionPerformanceModal'
import { ChannelPerformanceModal } from './ChannelPerformanceModal'
import PromotionModal from './PromotionModal'
import ChannelFormModal from './ChannelFormModal'
import { CatalogExportService } from './CatalogExportService'
import { PinCodeModal } from '@/components/ui/PinCodeModal'


interface Channel {
    id: string;
    name: string;
    type: 'retail' | 'delivery' | 'wholesale' | 'ecommerce';
    is_active: boolean;
}

interface ProductWithPrice {
    id: string;
    name: string;
    category: string;
    base_price: number;
    current_price: number;
    has_override: boolean;
    is_active_in_channel: boolean;
    stock: number;
    applied_promotion?: {
        id: string;
        name: string;
        type: 'percentage' | 'fixed_amount' | 'combo';
        value: number;
        scope_branches?: string[];
        scope_channels?: string[];
    } | null;
    cost: number;
    ignore_promotions: boolean;
}

export default function ChannelManager() {
    const [channels, setChannels] = useState<Channel[]>([])
    const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null)
    const [products, setProducts] = useState<ProductWithPrice[]>([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false) // New State
    const [isChannelModalOpen, setIsChannelModalOpen] = useState(false)
    const [editingProduct, setEditingProduct] = useState<ProductWithPrice | null>(null)
    const [editingChannel, setEditingChannel] = useState<Channel | null>(null)
    const [branches, setBranches] = useState<{ id: string, name: string }[]>([])
    const [selectedBranchId, setSelectedBranchId] = useState<string | null>(null) // null = TODOS
    const [selectedCategory, setSelectedCategory] = useState<string>('all') // 'all', 'combos', or category name
    const [selectedPromoType, setSelectedPromoType] = useState<string>('all') // For promotions filtering
    const [showInactive, setShowInactive] = useState(false)
    const [activeTab, setActiveTab] = useState<'catalog' | 'promotions'>('catalog')
    const [promotions, setPromotions] = useState<any[]>([]) // Promotions State
    const [allOverrides, setAllOverrides] = useState<any[]>([]) // Added State
    const [isPromotionModalOpen, setIsPromotionModalOpen] = useState(false)
    const [isPerformanceModalOpen, setIsPerformanceModalOpen] = useState(false) // Performance Modal State
    const [editingPromotion, setEditingPromotion] = useState<any>(null) // For editing promotions
    const [selectedPerformancePromo, setSelectedPerformancePromo] = useState<any | null>(null)
    const [promoStats, setPromoStats] = useState<Record<string, { gmv: number, quantity: number }>>({})
    // For performance view
    const [isChannelPerformanceOpen, setIsChannelPerformanceOpen] = useState(false)
    const [orgId, setOrgId] = useState<string | null>(null)
    const [promoToDelete, setPromoToDelete] = useState<any>(null)
    const [isPinModalOpen, setIsPinModalOpen] = useState(false)

    const handleUpdatePromotionStatus = async (promoId: string, isActive: boolean) => {
        try {
            const { error } = await supabase
                .from('promotions')
                .update({ is_active: isActive })
                .eq('id', promoId)

            if (error) throw error

            fetchPromotions()
            if (selectedChannel) {
                fetchChannelProducts(selectedChannel.id)
            }

            if (selectedPerformancePromo?.id === promoId) {
                setSelectedPerformancePromo({ ...selectedPerformancePromo, is_active: isActive })
            }
        } catch (err) {
            console.error('Error updating promotion status:', err)
            alert('Error al actualizar el estado de la promoción')
        }
    }

    useEffect(() => {
        fetchOrgId().then(() => {
            fetchChannels()
            fetchBranches()
            fetchPromotions() // Fetch Promotions
        })
    }, [])

    const fetchOrgId = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return

            const { data, error } = await supabase
                .from('users')
                .select('organization_id')
                .eq('id', user.id)
                .single()

            if (error) throw error
            if (data) setOrgId(data.organization_id)
        } catch (err) {
            console.error('Error fetching organization:', err)
        }
    }

    useEffect(() => {
        if (selectedChannel) {
            fetchChannelProducts(selectedChannel.id)
        }
    }, [selectedChannel, selectedBranchId, showInactive]) // Re-fetch/map when constraints change

    const fetchChannels = async () => {
        setLoading(true)
        try {
            const { data, error } = await supabase
                .from('sales_channels')
                .select('*')
                .order('name')

            if (error) throw error
            if (data) {
                setChannels(data)
                if (data.length > 0 && !selectedChannel) {
                    setSelectedChannel(data[0])
                }
            }
        } catch (error) {
            console.error('Error fetching channels:', error)
        } finally {
            setLoading(false)
        }
    }

    const fetchBranches = async () => {
        try {
            const { data } = await supabase.from('branches').select('id, name').order('name')
            if (data) setBranches(data)
        } catch (error) {
            console.error('Error fetching branches:', error)
        }
    }


    const fetchPromotions = async () => {
        try {
            const { data } = await supabase.from('promotions').select('*').order('created_at', { ascending: false })
            if (data) setPromotions(data)
        } catch (error) {
            console.error('Error fetching promotions:', error)
        }
    }

    const handleCreatePromotion = async (promoData: any) => {
        if (!orgId) {
            alert('Error: No se identificó la organización del usuario.')
            return
        }

        try {
            const { error } = await supabase
                .from('promotions')
                .upsert({
                    ...promoData,
                    organization_id: orgId
                }) // Upsert handles both insert and update if ID is present

            if (error) throw error
            fetchPromotions()
            if (selectedChannel) {
                fetchChannelProducts(selectedChannel.id)
            }
        } catch (err: any) {
            console.error('Error creating promotion:', err)
            alert('Error al guardar la promoción')
        }
    }

    const handleDeletePromotion = async (arg?: any) => {
        // If arg has an id, it's a promotion object (from Performance Modal)
        // If arg is a string or undefined (from PinCodeModal), use state
        const promo = (arg && typeof arg === 'object' && 'id' in arg) ? arg : promoToDelete

        if (!promo) return
        try {
            const { error } = await supabase
                .from('promotions')
                .delete()
                .eq('id', promo.id)

            if (error) throw error

            fetchPromotions() // Refresh list and catalog prices
            if (selectedChannel) {
                fetchChannelProducts(selectedChannel.id)
            }
            setPromoToDelete(null)
            setIsPinModalOpen(false)
            setIsPerformanceModalOpen(false) // Close performance modal too if open
            setIsPromotionModalOpen(false) // Close modal if open
            setEditingPromotion(null)
            setSelectedPerformancePromo(null)
        } catch (err: any) {
            console.error('Error deleting promotion:', err)
            alert('Error al eliminar la promoción')
        }
    }

    const fetchChannelProducts = async (channelId: string) => {
        setLoading(true)
        try {
            // 1. Fetch all products with recipes
            const { data: allProds } = await supabase
                .from('products')
                .select(`
                    id, 
                    name, 
                    price, 
                    category:categories(name),
                    recipes:product_recipes(
                        ingredient_id,
                        quantity_required,
                        ingredient:inventory_items(unit_cost)
                    )
                `)
                .eq('organization_id', orgId || 'org_default')
                .order('name')

            // 2. Fetch overrides for this channel
            const { data: overrides } = await supabase
                .from('product_prices')
                .select('*')
                .eq('channel_id', channelId)

            if (overrides) setAllOverrides(overrides) // Store for modal


            // 3. Fetch Ingredient Stock
            let ingredientStock: Record<string, number> = {}
            if (selectedBranchId) {
                const { data: stockData } = await supabase
                    .from('branch_ingredients')
                    .select('ingredient_id, current_stock')
                    .eq('branch_id', selectedBranchId)

                if (stockData) {
                    stockData.forEach((item: any) => {
                        ingredientStock[item.ingredient_id] = Number(item.current_stock) || 0
                    })
                }
            } else {
                const { data: stockData } = await supabase
                    .from('branch_ingredients')
                    .select('ingredient_id, current_stock')

                if (stockData) {
                    stockData.forEach((item: any) => {
                        ingredientStock[item.ingredient_id] = (ingredientStock[item.ingredient_id] || 0) + (Number(item.current_stock) || 0)
                    })
                }
            }

            // 4. Fetch Active Promotions
            const { data: activePromos } = await supabase
                .from('promotions')
                .select('*')
                .eq('is_active', true)
                .order('priority', { ascending: false })

            if (allProds) {
                const mapped = allProds.map((p: any) => {
                    // Pricing Logic...
                    let activeOverride = overrides?.find(o =>
                        o.product_id === p.id &&
                        (selectedBranchId ? o.branch_id === selectedBranchId : o.branch_id === null)
                    )

                    if (!activeOverride && selectedBranchId) {
                        activeOverride = overrides?.find(o => o.product_id === p.id && o.branch_id === null)
                    }

                    const is_active = activeOverride ? activeOverride.is_active !== false : true
                    const overridePrice = activeOverride ? activeOverride.price : p.price
                    let currentPrice = overridePrice
                    const ignorePromotions = activeOverride?.ignore_promotions || false // Read from DB


                    // Promotion Logic
                    let appliedPromo = null
                    if (activePromos && !ignorePromotions) { // Check override
                        // Filter applicable promotions
                        const validPromos = activePromos.filter((promo: any) => {
                            // 1. Date Check (Local Day Comparison)
                            const getLocalDay = (d: Date | string) => {
                                const date = new Date(d)
                                return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime()
                            }

                            const now = getLocalDay(new Date())
                            const start = getLocalDay(promo.start_date)
                            const end = promo.end_date ? getLocalDay(promo.end_date) : null

                            if (start > now) return false // Scheduled (Future)
                            if (end && end < now) return false // Expired (Past)

                            // 2. Channel Scope Check
                            if (promo.scope_channels && promo.scope_channels.length > 0) {
                                if (!promo.scope_channels.includes(channelId)) return false
                            }

                            // 3. Branch Scope Check
                            if (selectedBranchId && promo.scope_branches && promo.scope_branches.length > 0) {
                                if (!promo.scope_branches.includes(selectedBranchId)) return false
                            }

                            return true
                        })

                        if (validPromos.length > 0) {
                            // Apply best promotion (first one due to priority sort)
                            const promo = validPromos[0]
                            appliedPromo = promo

                            const discountType = (promo.type === 'percentage' || promo.type === 'fixed_amount')
                                ? promo.type
                                : promo.config?.discount_type

                            if (discountType === 'percentage') {
                                currentPrice = currentPrice * (1 - (promo.value / 100))
                            } else if (discountType === 'fixed_amount') {
                                currentPrice = Math.max(0, currentPrice - promo.value)
                            }
                        }
                    }

                    // Stock Logic (Derived)
                    const recipes = p.recipes?.map((r: any) => ({
                        ingredientId: r.ingredient_id,
                        quantityRequired: r.quantity_required
                    }))

                    // Cost Logic
                    let totalCost = 0
                    p.recipes?.forEach((r: any) => {
                        const unitCost = r.ingredient?.unit_cost || 0
                        totalCost += unitCost * r.quantity_required
                    })

                    const stock = Calculator.calculateTheoreticalStock(recipes, ingredientStock)

                    return {
                        id: p.id,
                        name: p.name,
                        category: (p.category as any)?.name || 'Sin Categoría',
                        base_price: p.price,
                        override_price: overridePrice,
                        current_price: currentPrice,
                        has_override: !!activeOverride,
                        is_active_in_channel: is_active,
                        stock: stock,
                        applied_promotion: appliedPromo,
                        promo_id: appliedPromo?.id, // Added to fix lookup
                        cost: totalCost,
                        ignore_promotions: ignorePromotions
                    }
                })

                // Filter by Inactive Toggle
                const filtered = mapped.filter((p: any) => showInactive || p.is_active_in_channel)
                setProducts(filtered)
            }
        } catch (error) {
            console.error('Error fetching channel products:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleSaveChannel = async (formData: any) => {
        try {
            const { error } = await supabase
                .from('sales_channels')
                .upsert({
                    ...formData,
                    organization_id: orgId // Use dynamic ID
                })

            if (error) throw error
            fetchChannels()
            setIsChannelModalOpen(false) // Close modal on success
        } catch (err: any) {
            console.error('Error saving channel:', err.message || err)
            if (err.message?.includes('viole la contrainte d\'unicité') || err.message?.includes('duplicate key') || err.code === '23505') {
                // You might want to use a real toast here, but console is fine for now if no toast lib
                alert('Error: Ya existe un canal con este nombre.')
            }
        }
    }

    const handleToggleVisibility = async (productId: string, currentActive: boolean) => {
        if (!selectedChannel) return
        try {
            const product = products.find(p => p.id === productId)
            const { error } = await supabase
                .from('product_prices')
                .upsert({
                    product_id: productId,
                    channel_id: selectedChannel.id,
                    organization_id: orgId,
                    is_active: !currentActive,
                    price: product?.current_price || 0
                }, { onConflict: 'organization_id,product_id,channel_id,branch_id' })

            if (error) throw error
            fetchChannelProducts(selectedChannel.id)
        } catch (err: any) {
            console.error('Error toggling visibility:', err.message || err)
        }
    }

    return (
        <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-6rem)] animate-in fade-in duration-500">
            {/* Sidebar: Channels List */}
            {/* Sidebar: Split Layout */}
            <div className="w-full lg:w-80 flex flex-col gap-4">

                {/* Section 1: Channels */}
                <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-gray-100 dark:border-white/5 shadow-sm overflow-hidden flex flex-col h-[45vh]">
                    <div className="p-5 border-b border-gray-100 dark:border-white/5 flex items-center justify-between bg-gray-50/50 dark:bg-white/5 shrink-0">
                        <h3 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-widest">Canales</h3>
                        <Button
                            variant="outline"
                            className="h-8 w-8 p-0 rounded-full border-pp-gold/30 text-pp-gold hover:bg-pp-gold/10"
                            onClick={() => {
                                setEditingChannel(null)
                                setIsChannelModalOpen(true)
                            }}
                        >
                            <Plus size={16} />
                        </Button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-3 space-y-2">
                        {channels.map(channel => (
                            <div
                                key={channel.id}
                                onClick={() => {
                                    setSelectedChannel(channel)
                                    setActiveTab('catalog')
                                }}
                                className={`w-full group relative p-4 rounded-[1.25rem] border transition-all duration-300 cursor-pointer overflow-hidden ${selectedChannel?.id === channel.id && activeTab === 'catalog'
                                    ? 'bg-gradient-to-br from-white to-gray-50 dark:from-slate-800 dark:to-slate-900 border-pp-gold/50 shadow-lg shadow-pp-gold/10'
                                    : 'bg-white dark:bg-slate-900 border-transparent hover:border-gray-200 dark:hover:border-white/10 hover:shadow-md'
                                    }`}
                            >
                                <div className="flex items-center gap-4 z-10 relative">
                                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-inner relative ${selectedChannel?.id === channel.id
                                        ? 'bg-pp-gold text-white'
                                        : 'bg-gray-100 dark:bg-white/5 text-gray-500 group-hover:bg-pp-gold/10 group-hover:text-pp-gold transition-colors'
                                        }`}>
                                        {channel.type === 'delivery' ? <Package size={20} strokeWidth={2.5} /> :
                                            channel.type === 'wholesale' ? <Store size={20} strokeWidth={2.5} /> :
                                                <Globe size={20} strokeWidth={2.5} />}

                                        {/* Dot Status Indicator - Consistent Style */}
                                        <div className={`absolute -top-1 -right-1 w-3 h-3 rounded-full border-2 border-white dark:border-slate-900 ${channel.is_active ? 'bg-emerald-500' : 'bg-red-500'}`} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between mb-1">
                                            <span className={`text-[9px] font-black uppercase tracking-widest ${selectedChannel?.id === channel.id ? 'text-pp-gold' : 'text-gray-400'}`}>
                                                {channel.type || 'General'}
                                            </span>
                                            <span className={`text-[8px] font-black uppercase tracking-[0.1em] flex items-center gap-1 ${channel.is_active
                                                ? 'text-emerald-500'
                                                : 'text-red-500'}`}>
                                                <span className={`w-1.5 h-1.5 rounded-full ${channel.is_active ? 'bg-emerald-500' : 'bg-red-500'}`} />
                                                {channel.is_active ? 'Activo' : 'Inactivo'}
                                            </span>
                                        </div>
                                        <h4 className={`font-black uppercase tracking-tight text-sm truncate leading-snug ${selectedChannel?.id === channel.id ? 'text-gray-900 dark:text-white' : 'text-gray-600 dark:text-gray-400'}`}>
                                            {channel.name}
                                        </h4>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Section 2: Promotions */}
                <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-gray-100 dark:border-white/5 shadow-sm overflow-hidden flex flex-col flex-1 min-h-0">
                    <div
                        className="p-5 border-b border-gray-100 dark:border-white/5 flex items-center justify-between bg-gray-50/50 dark:bg-white/5 shrink-0 cursor-pointer hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
                        onClick={() => setActiveTab('promotions')}
                    >
                        <h3 className={`text-sm font-black uppercase tracking-widest ${activeTab === 'promotions' ? 'text-pp-gold' : 'text-gray-900 dark:text-white'}`}>
                            Promociones
                        </h3>
                        <Button
                            variant="outline"
                            className="h-8 w-8 p-0 rounded-full border-pp-gold/30 text-pp-gold hover:bg-pp-gold/10"
                            onClick={(e) => {
                                e.stopPropagation()
                                setIsPromotionModalOpen(true)
                            }}
                        >
                            <Plus size={16} />
                        </Button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-3 space-y-2">
                        {promotions.length === 0 ? (
                            <div className="text-center p-8 text-gray-400 text-xs flex flex-col items-center gap-2">
                                <div className="p-3 bg-gray-50 dark:bg-white/5 rounded-full">
                                    <Tag size={20} />
                                </div>
                                No hay promociones activas
                            </div>
                        ) : (
                            promotions.map(promo => {
                                // Visual helpers
                                const getPromoVisuals = (type: string) => {
                                    switch (type) {
                                        case 'buy_x_get_y': return { icon: Gift, color: 'text-pink-500', bg: 'bg-pink-50', border: 'border-pink-200' }
                                        case 'product_discount': return { icon: Tag, color: 'text-blue-500', bg: 'bg-blue-50', border: 'border-blue-200' }
                                        case 'category_discount': return { icon: Layers, color: 'text-indigo-500', bg: 'bg-indigo-50', border: 'border-indigo-200' }
                                        case 'fixed_amount': return { icon: DollarSign, color: 'text-emerald-500', bg: 'bg-emerald-50', border: 'border-emerald-200' }
                                        case 'combo': return { icon: Package, color: 'text-pp-gold', bg: 'bg-pp-gold/10', border: 'border-pp-gold/30' }
                                        default: return { icon: Percent, color: 'text-orange-500', bg: 'bg-orange-50', border: 'border-orange-200' }
                                    }
                                }
                                const visuals = getPromoVisuals(promo.type)
                                const Icon = visuals.icon

                                const getLocalDay = (d: Date | string) => {
                                    const date = new Date(d)
                                    return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime()
                                }
                                const now = getLocalDay(new Date())
                                const start = getLocalDay(promo.start_date)
                                const end = promo.end_date ? getLocalDay(promo.end_date) : null

                                let statusLabel = 'Inactiva'
                                let statusColor = 'text-gray-400'

                                if (promo.is_active) {
                                    if (start > now) { statusLabel = 'Prog.'; statusColor = 'text-amber-500' }
                                    else if (end && end < now) { statusLabel = 'Vencida'; statusColor = 'text-red-500' }
                                    else { statusLabel = 'Activa'; statusColor = 'text-emerald-500' }
                                }

                                return (
                                    <div
                                        key={promo.id}
                                        onClick={() => setActiveTab('promotions')}
                                        className={`group w-full relative p-4 rounded-[1.25rem] border transition-all duration-300 cursor-pointer overflow-hidden ${activeTab === 'promotions'
                                            ? 'bg-gradient-to-br from-white to-gray-50 dark:from-slate-800 dark:to-slate-900 border-pp-gold/50 shadow-lg shadow-pp-gold/10'
                                            : 'bg-white dark:bg-slate-900 border-transparent hover:border-gray-200 dark:hover:border-white/10 hover:shadow-md'
                                            }`}
                                    >
                                        <div className="flex items-start gap-4 z-10 relative">
                                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-inner ${visuals.bg} ${visuals.color}`}>
                                                <Icon size={20} strokeWidth={2.5} />
                                            </div>
                                            <div className="flex-1 min-w-0 pt-0.5">
                                                <div className="flex items-center justify-between mb-1">
                                                    <span className={`text-[9px] font-black uppercase tracking-widest ${visuals.color}`}>
                                                        {promo.type === 'buy_x_get_y' ? 'Regalo' :
                                                            promo.type === 'combo' ? 'Combo' : 'Descuento'}
                                                    </span>
                                                    <span className={`text-[9px] font-black uppercase tracking-wider flex items-center gap-1 ${statusColor}`}>
                                                        <span className={`w-1.5 h-1.5 rounded-full ${statusColor.replace('text-', 'bg-')}`} />
                                                        {statusLabel}
                                                    </span>
                                                </div>
                                                <h4 className="font-black text-gray-900 dark:text-white text-xs truncate leading-snug mb-1">
                                                    {promo.name}
                                                </h4>
                                                <div className="flex items-center gap-2">
                                                    <span className="font-mono font-black text-lg text-gray-700 dark:text-gray-200 -mt-1">
                                                        {promo.type === 'buy_x_get_y' ? `${promo.config?.buy_qty}x${promo.config?.get_qty}` :
                                                            promo.type === 'percentage' || ((promo.type === 'product_discount' || promo.type === 'category_discount' || promo.type === 'global_discount') && promo.config?.discount_type === 'percentage')
                                                                ? `${promo.value}%`
                                                                : Calculator.formatCurrency(Number(promo.value || 0))}
                                                    </span>
                                                    {promo.scope_branches?.length > 0 && (
                                                        <span className="px-1.5 py-0.5 rounded-md bg-gray-100 dark:bg-white/10 text-[9px] font-bold text-gray-500">
                                                            Sedes
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )
                            })
                        )}
                    </div>
                </div>
            </div>

            {/* Main Content: Catalog Management */}
            <div className="flex-1 flex flex-col gap-4">
                <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-gray-100 dark:border-white/5 shadow-sm overflow-hidden flex flex-col h-full">

                    {/* Header & Filters */}
                    {/* Header & Tabs */}
                    {/* Header & Tabs */}
                    <div className="p-6 border-b border-gray-100 dark:border-white/5 flex flex-col xl:flex-row gap-6 bg-gray-50/50 dark:bg-white/5 items-start xl:items-center justify-between">
                        <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 relative">
                                    <Image
                                        src={appConfig.company.logoUrl}
                                        alt="Logo"
                                        fill
                                        className="object-contain" // Simplified logo render
                                    />
                                </div>
                                <h2 className="text-2xl font-black text-gray-900 dark:text-white uppercase tracking-tighter flex items-center gap-3">
                                    <span>Catálogo de <span className="text-pp-gold">{selectedChannel?.name || 'Seleccione un canal'}</span></span>
                                </h2>
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                                {activeTab === 'catalog' ? (
                                    <>
                                        <Badge variant="neutral" className="bg-white/50 dark:bg-slate-800 text-[10px] py-0 px-2 uppercase font-black tracking-widest border border-gray-100 dark:border-white/5">
                                            {products.length} Productos
                                        </Badge>
                                        <Badge variant="neutral" className="bg-white/50 dark:bg-slate-800 text-[10px] py-0 px-2 uppercase font-black tracking-widest text-emerald-600 font-black border border-emerald-100 dark:border-emerald-900/20">
                                            {products.filter(p => p.current_price !== p.base_price).length} Precios Especiales
                                        </Badge>
                                    </>
                                ) : (
                                    <Badge variant="neutral" className="bg-pp-gold/10 text-pp-gold text-[10px] py-0 px-2 uppercase font-black tracking-widest border border-pp-gold/20">
                                        {promotions.filter(p => p.is_active).length} Promociones Activas
                                    </Badge>
                                )}
                            </div>
                        </div>

                        {/* Actions & Filters Area */}
                        <div className="flex flex-col-reverse xl:flex-row items-end xl:items-center gap-4 w-full xl:w-auto">

                            {/* Channel Actions - Edit Button */}
                            {selectedChannel && activeTab === 'catalog' && (
                                <button
                                    onClick={() => {
                                        setEditingChannel(selectedChannel);
                                        setIsChannelModalOpen(true);
                                    }}
                                    className="p-2 bg-white dark:bg-slate-800 border border-gray-100 dark:border-white/5 rounded-xl shadow-sm text-gray-400 hover:text-pp-gold hover:border-pp-gold/30 transition-all"
                                    title="Editar configuración del canal"
                                >
                                    <Edit3 size={18} />
                                </button>
                            )}

                            {/* Filters Tab (Catalog Categories or Promo Types) */}
                            <div className="flex items-center bg-white dark:bg-slate-800 p-1 rounded-xl border border-gray-100 dark:border-white/5 shadow-sm overflow-x-auto max-w-[calc(100vw-400px)] xl:max-w-md no-scrollbar">
                                {activeTab === 'catalog' ? (
                                    <>
                                        <button
                                            onClick={() => setSelectedCategory('all')}
                                            className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${selectedCategory === 'all'
                                                ? 'bg-gray-900 text-white shadow-md'
                                                : 'text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5 hover:text-gray-600'
                                                }`}
                                        >
                                            Todos
                                        </button>
                                        <button
                                            onClick={() => setSelectedCategory('combos')}
                                            className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${selectedCategory === 'combos'
                                                ? 'bg-purple-600 text-white shadow-md'
                                                : 'text-gray-400 hover:text-purple-600 hover:bg-purple-50'
                                                }`}
                                        >
                                            Combos
                                        </button>
                                        <div className="w-px h-4 bg-gray-200 dark:bg-white/10 mx-1" />
                                        <div className="flex items-center gap-1">
                                            {[...new Set(products.map(p => p.category))].sort().map(cat => (
                                                <button
                                                    key={cat}
                                                    onClick={() => setSelectedCategory(cat)}
                                                    className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${selectedCategory === cat
                                                        ? 'bg-pp-gold text-white shadow-md'
                                                        : 'text-gray-400 hover:text-pp-gold hover:bg-pp-gold/10'
                                                        }`}
                                                >
                                                    {cat}
                                                </button>
                                            ))}
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <button
                                            onClick={() => setSelectedPromoType('all')}
                                            className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${selectedPromoType === 'all'
                                                ? 'bg-gray-900 text-white shadow-md'
                                                : 'text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5 hover:text-gray-600'
                                                }`}
                                        >
                                            Todas
                                        </button>
                                        <div className="w-px h-4 bg-gray-200 dark:bg-white/10 mx-1" />
                                        {[
                                            { id: 'global_discount', label: 'Global', color: 'hover:text-amber-600 hover:bg-amber-50', active: 'bg-amber-600' },
                                            { id: 'product_discount', label: 'Producto', color: 'hover:text-blue-600 hover:bg-blue-50', active: 'bg-blue-600' },
                                            { id: 'category_discount', label: 'Categoría', color: 'hover:text-indigo-600 hover:bg-indigo-50', active: 'bg-indigo-600' },
                                            { id: 'buy_x_get_y', label: '2x1 / 3x2', color: 'hover:text-pink-600 hover:bg-pink-50', active: 'bg-pink-600' }
                                        ].map(type => (
                                            <button
                                                key={type.id}
                                                onClick={() => setSelectedPromoType(type.id)}
                                                className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${selectedPromoType === type.id
                                                    ? `${type.active} text-white shadow-md`
                                                    : `text-gray-400 ${type.color}`
                                                    }`}
                                            >
                                                {type.label}
                                            </button>
                                        ))}
                                    </>
                                )}
                            </div>

                            {/* Actions / Context Buttons */}
                            <div className="flex items-center gap-2 pl-2 xl:border-l border-gray-200 dark:border-white/10">
                                {activeTab === 'promotions' && (
                                    <Badge variant="neutral" className="bg-white/50 dark:bg-slate-800 text-[10px] py-0 px-2 uppercase font-black tracking-widest text-orange-600 border border-orange-100 dark:border-orange-900/20">
                                        {promotions.length} Promociones
                                    </Badge>
                                )}
                                {activeTab === 'catalog' && (
                                    <>
                                        <Button
                                            variant="outline"
                                            className="h-9 px-3 text-xs font-bold gap-2 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-white/10 hover:border-pp-gold/50 hover:text-pp-gold bg-white dark:bg-slate-800 rounded-xl"
                                            onClick={() => {
                                                console.log("Open Channel Performance")
                                                setIsChannelPerformanceOpen(true)
                                            }}
                                        >
                                            <BarChart2 size={16} />
                                            Desempeño
                                        </Button>
                                        <Button
                                            variant="outline"
                                            className="h-9 w-9 p-0 rounded-full border-gray-200 text-gray-400 hover:text-pp-gold hover:border-pp-gold/30 hover:bg-pp-gold/10 bg-white dark:bg-slate-800"
                                            title="Compartir Catálogo"
                                            onClick={async () => {
                                                const shareData = {
                                                    title: `Catálogo - ${selectedChannel?.name || 'PanPanocha'}`,
                                                    text: `Revisa nuestro catálogo de ${selectedChannel?.name || 'productos'}`,
                                                    url: window.location.href
                                                }
                                                try {
                                                    if (navigator.share) {
                                                        await navigator.share(shareData)
                                                    } else {
                                                        await navigator.clipboard.writeText(window.location.href)
                                                        alert('Enlace copiado al portapapeles')
                                                    }
                                                } catch (err) {
                                                    console.error('Error sharing:', err)
                                                }
                                            }}
                                        >
                                            <Share2 size={16} />
                                        </Button>
                                        <Button
                                            variant="outline"
                                            className="h-9 w-9 p-0 rounded-full border-gray-200 text-gray-400 hover:text-pp-gold hover:border-pp-gold/30 hover:bg-pp-gold/10 bg-white dark:bg-slate-800"
                                            title="Descargar PDF"
                                            onClick={() => {
                                                const productsToExport = products
                                                    .filter(p => !showInactive ? p.is_active_in_channel : true)
                                                    .map(p => ({
                                                        name: p.name,
                                                        category: p.category,
                                                        price: p.current_price
                                                    }))
                                                CatalogExportService.generatePDF(selectedChannel?.name || 'Catalogo', productsToExport)
                                            }}
                                        >
                                            <Download size={16} />
                                        </Button>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                    {/* Main Filter Bar (Branch + Search + Inactive) */}
                    <div className="px-6 py-4 bg-gray-50/50 dark:bg-white/5 border-b border-gray-100 dark:border-white/5">
                        <div className="flex flex-col xl:flex-row gap-4 justify-between items-center bg-gray-100/50 dark:bg-white/5 p-2 rounded-2xl border border-gray-100 dark:border-white/5 shadow-inner">
                            {/* Branch Tabs */}
                            <div className="flex p-1 bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-white/5 shadow-sm overflow-x-auto max-w-full no-scrollbar">
                                <button
                                    onClick={() => setSelectedBranchId(null)}
                                    className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${!selectedBranchId
                                        ? 'bg-pp-gold text-white shadow-md'
                                        : 'text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-white/5'
                                        }`}
                                >
                                    Sedes: Todas
                                </button>
                                {branches.map(branch => (
                                    <button
                                        key={branch.id}
                                        onClick={() => setSelectedBranchId(branch.id)}
                                        className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${selectedBranchId === branch.id
                                            ? 'bg-pp-gold text-white shadow-md'
                                            : 'text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-white/5'
                                            }`}
                                    >
                                        {branch.name}
                                    </button>
                                ))}
                            </div>

                            <div className="flex items-center gap-6 flex-1 w-full xl:w-auto px-2">
                                <div className="flex items-center gap-2 group cursor-pointer">
                                    <div
                                        onClick={() => setShowInactive(!showInactive)}
                                        className={`w-10 h-6 rounded-full transition-all duration-300 relative flex items-center px-1 ${showInactive ? 'bg-pp-gold' : 'bg-gray-300 dark:bg-slate-700'}`}
                                    >
                                        <div className={`w-4 h-4 bg-white rounded-full shadow-sm transition-all duration-300 ${showInactive ? 'translate-x-4' : 'translate-x-0'}`} />
                                    </div>
                                    <span className={`text-[10px] font-black uppercase tracking-widest select-none transition-colors ${showInactive ? 'text-pp-gold' : 'text-gray-400'}`}>
                                        Ver Inactivos
                                    </span>
                                </div>

                                <div className="relative flex-1 group">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-pp-gold transition-colors" size={16} />
                                    <input
                                        type="text"
                                        placeholder={activeTab === 'catalog' ? "Buscar producto..." : "Buscar promoción..."}
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="w-full pl-10 pr-4 h-10 bg-white dark:bg-slate-800 border-gray-100 dark:border-white/10 rounded-xl text-xs font-bold focus:ring-2 focus:ring-pp-gold/20 focus:border-pp-gold outline-none transition-all shadow-sm"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Main Content: Catalog/Promotions Grids */}
                    <div className="flex-1 overflow-y-auto p-4 lg:p-6">
                        {activeTab === 'catalog' ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 pb-20">
                                {products
                                    .filter((p: any) => {
                                        const matchesSearch = !searchTerm || p.name.toLowerCase().includes(searchTerm.toLowerCase())
                                        const matchesCategory = selectedCategory === 'all'
                                            ? true
                                            : selectedCategory === 'combos'
                                                ? p.category?.toLowerCase().includes('combo') || p.applied_promotion?.type === 'combo'
                                                : p.category === selectedCategory
                                        return matchesSearch && matchesCategory
                                    })
                                    .map((product: any) => {
                                        const isPromo = !!product.applied_promotion
                                        const isOverride = product.has_override

                                        // Calculate Impact
                                        const diff = product.current_price - product.base_price
                                        const percentDiff = product.base_price > 0 ? (diff / product.base_price) * 100 : 0

                                        const activePromo = promotions.find(p => p.id === product.promo_id)
                                        const discountPercentage = activePromo && activePromo.type === 'percentage'
                                            ? activePromo.value
                                            : product.override_price > 0
                                                ? Math.round(((product.override_price - product.current_price) / product.override_price) * 100)
                                                : 0

                                        return (
                                            <div
                                                key={product.id}
                                                onClick={() => {
                                                    // Inject full promo details including config
                                                    const productWithPromoDetails = {
                                                        ...product,
                                                        applied_promotion: activePromo ? {
                                                            ...product.applied_promotion,
                                                            ...activePromo
                                                        } : product.applied_promotion
                                                    }
                                                    setEditingProduct(productWithPromoDetails)
                                                    setIsDetailModalOpen(true)
                                                }}
                                                className={`group relative p-7 rounded-[2.5rem] bg-white dark:bg-slate-900 border transition-all duration-300 hover:shadow-[0_20px_50px_rgba(0,0,0,0.08)] hover:-translate-y-1 cursor-pointer overflow-hidden ${isPromo
                                                    ? 'border-pp-gold/30 shadow-sm'
                                                    : isOverride ? 'border-pp-gold/20 shadow-sm'
                                                        : 'border-gray-100 dark:border-white/5'
                                                    } ${!product.is_active_in_channel ? 'opacity-60 grayscale' : ''}`}
                                            >
                                                {/* Decorative BG for Promos */}
                                                {isPromo && <div className="absolute top-0 right-0 w-32 h-32 bg-pp-gold/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />}

                                                {/* Header */}
                                                <div className="relative z-10 flex justify-between items-start mb-6">
                                                    <div>
                                                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-1 block">
                                                            {product.category}
                                                        </span>
                                                        <h4 className="text-lg font-black text-gray-900 dark:text-white truncate max-w-[180px]">
                                                            {product.name}
                                                        </h4>
                                                    </div>

                                                    <div className="flex items-center gap-2">
                                                        {/* Status Toggle */}
                                                        <div
                                                            onClick={(e) => {
                                                                e.stopPropagation()
                                                                handleToggleVisibility(product.id, product.is_active_in_channel)
                                                            }}
                                                            className={`w-8 h-4 rounded-full relative transition-colors cursor-pointer ${product.is_active_in_channel ? 'bg-emerald-500' : 'bg-gray-200 dark:bg-gray-700'}`}
                                                            title={product.is_active_in_channel ? "Ocultar en canal" : "Mostrar en canal"}
                                                        >
                                                            <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full shadow-sm transition-transform ${product.is_active_in_channel ? 'translate-x-4' : 'translate-x-0.5'}`} />
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Metrics Grid */}
                                                <div className="relative z-10 grid grid-cols-2 gap-4 mb-6">
                                                    {/* Price Block */}
                                                    <div className={`p-5 rounded-full border-2 shadow-md transition-all duration-300 flex flex-col items-center justify-center ${isPromo
                                                        ? 'bg-pp-gold/5 border-pp-gold/30'
                                                        : isOverride
                                                            ? 'bg-amber-50 dark:bg-amber-500/5 border-amber-100/50'
                                                            : 'bg-emerald-50 dark:bg-emerald-500/5 border-emerald-100 dark:border-emerald-500/10'
                                                        }`}>
                                                        <span className={`text-[8px] font-black uppercase tracking-[0.25em] block mb-1 ${isPromo ? 'text-pp-gold' : isOverride ? 'text-amber-500' : 'text-emerald-500'}`}>
                                                            {isPromo ? 'Oferta' : 'Precio'}
                                                        </span>
                                                        <div className="flex flex-col items-center">
                                                            <span className={`text-2xl font-black tabular-nums tracking-tighter ${isPromo ? 'text-pp-gold' : 'text-gray-900 dark:text-white'}`}>
                                                                {Calculator.formatCurrency(product.current_price)}
                                                            </span>
                                                            {isPromo && discountPercentage > 0 && (
                                                                <div className={`inline-flex items-center mt-1 text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-pp-gold text-white`}>
                                                                    <TrendingDown size={10} className="mr-0.5" />
                                                                    {/* Detailed Tag for Price Block too */}
                                                                    {activePromo?.type === 'buy_x_get_y' && activePromo.config ? (
                                                                        <span>{activePromo.config.buy_qty}x{activePromo.config.get_qty}</span>
                                                                    ) : activePromo?.type === 'fixed_amount' ? (
                                                                        <span>${activePromo.value} Off</span>
                                                                    ) : (
                                                                        <span>{Math.round(((product.override_price - product.current_price) / product.override_price) * 100)}% Off</span>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {/* Base/Margin Block */}
                                                    <div className="p-5 rounded-full bg-white dark:bg-slate-800 border-2 border-gray-100 dark:border-white/5 shadow-sm flex flex-col items-center justify-center relative overflow-hidden">
                                                        <span className="text-[8px] font-black text-gray-400 uppercase tracking-[0.25em] block mb-1">Costo Base</span>
                                                        <div className="flex flex-col items-center">
                                                            <span className="text-lg font-black text-gray-500 tabular-nums">
                                                                {Calculator.formatCurrency(product.base_price)}
                                                            </span>
                                                            {isOverride && (
                                                                <div className={`inline-flex items-center mt-1 text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${(product.override_price - product.base_price) > 0 ? 'bg-amber-100 text-amber-600' : 'bg-emerald-50 text-emerald-500'}`}>
                                                                    {(product.override_price - product.base_price) > 0 ? <Plus size={10} className="mr-0.5" /> : null}
                                                                    {Math.round(((product.override_price - product.base_price) / product.base_price) * 100)}% Inc. Man.
                                                                </div>
                                                            )}
                                                            {isPromo && (
                                                                <div className={`inline-flex items-center mt-1 text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-pp-gold/10 text-pp-gold`}>
                                                                    {/* Dynamic Promo Tag */}
                                                                    {activePromo?.type === 'buy_x_get_y' && activePromo.config ? (
                                                                        <span>{activePromo.config.buy_qty}x{activePromo.config.get_qty}</span>
                                                                    ) : activePromo?.type === 'fixed_amount' ? (
                                                                        <span>${activePromo.value} Off</span>
                                                                    ) : (
                                                                        <span>Promo.</span>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Footer Info */}
                                                <div className="relative z-10 pt-4 border-t border-gray-50 dark:border-white/5 flex items-center justify-between">
                                                    <div className="flex items-center gap-1.5 text-gray-400">
                                                        <Package size={12} strokeWidth={2.5} />
                                                        <span className="text-[9px] font-black uppercase tracking-widest">{product.stock} Und</span>
                                                    </div>

                                                    {isPromo && (
                                                        <Badge variant="warning" className="bg-pp-gold/10 text-pp-gold text-[9px] py-0.5 px-2 font-black uppercase tracking-widest border-pp-gold/20">
                                                            {(() => {
                                                                const resolvedPromo = activePromo || product.applied_promotion
                                                                return resolvedPromo?.type === 'buy_x_get_y' && resolvedPromo.config ? (
                                                                    <span>{resolvedPromo.config.get_qty}x{resolvedPromo.config.buy_qty}</span>
                                                                ) : resolvedPromo?.type === 'fixed_amount' ? (
                                                                    <span>${resolvedPromo.value} Off</span>
                                                                ) : (
                                                                    <span>{resolvedPromo?.value}% Off</span>
                                                                )
                                                            })()}
                                                        </Badge>
                                                    )}
                                                </div>
                                            </div>
                                        )
                                    })}
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pb-20">
                                {promotions
                                    .filter((promo: any) => {
                                        const matchesSearch = !searchTerm || promo.name.toLowerCase().includes(searchTerm.toLowerCase())
                                        const matchesType = selectedPromoType === 'all' || promo.type === selectedPromoType
                                        const matchesBranch = !selectedBranchId || (promo.scope_branches && promo.scope_branches.includes(selectedBranchId)) || (!promo.scope_branches || promo.scope_branches.length === 0)

                                        const getLocalDay = (d: Date | string) => {
                                            const date = new Date(d)
                                            return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime()
                                        }
                                        const now = getLocalDay(new Date())
                                        const start = getLocalDay(promo.start_date)
                                        const end = promo.end_date ? getLocalDay(promo.end_date) : null

                                        const isExpired = end && end < now
                                        const isInactive = !promo.is_active || isExpired
                                        const matchesStatus = showInactive || !isInactive

                                        return matchesSearch && matchesType && matchesBranch && matchesStatus
                                    })
                                    .map((promo: any) => {
                                        const getPromoVisuals = (p: any) => {
                                            switch (p.type) {
                                                case 'buy_x_get_y': return { icon: Gift, color: 'text-pink-600', bg: 'bg-pink-100', bgSoft: 'bg-pink-50', border: 'border-pink-200', label: 'Regalo' }
                                                case 'product_discount': return { icon: Tag, color: 'text-blue-600', bg: 'bg-blue-100', bgSoft: 'bg-blue-50', border: 'border-blue-200', label: 'Producto' }
                                                case 'category_discount': return { icon: Layers, color: 'text-indigo-600', bg: 'bg-indigo-100', bgSoft: 'bg-indigo-50', border: 'border-indigo-200', label: 'Categoría' }
                                                case 'fixed_amount': return { icon: DollarSign, color: 'text-emerald-600', bg: 'bg-emerald-100', bgSoft: 'bg-emerald-50', border: 'border-emerald-200', label: 'Descuento Fijo' }
                                                case 'combo': return { icon: Package, color: 'text-purple-600', bg: 'bg-purple-100', bgSoft: 'bg-purple-50', border: 'border-purple-200', label: 'Combo Especial' }
                                                default: return { icon: Percent, color: 'text-orange-600', bg: 'bg-orange-100', bgSoft: 'bg-orange-50', border: 'border-orange-200', label: 'Descuento Global' }
                                            }
                                        }
                                        const visuals = getPromoVisuals(promo)
                                        const Icon = visuals.icon

                                        // Status Logic
                                        const getLocalDay = (d: Date | string) => new Date(new Date(d).toDateString()).getTime()
                                        const now = getLocalDay(new Date())
                                        const start = getLocalDay(promo.start_date)
                                        const end = promo.end_date ? getLocalDay(promo.end_date) : null
                                        const isExpired = end && end < now
                                        const isScheduled = start > now

                                        const statusConfig = isExpired ? { label: 'Vencida', color: 'text-gray-400', bg: 'bg-gray-100', border: 'border-gray-200' }
                                            : isScheduled ? { label: 'Programada', color: 'text-amber-600', bg: 'bg-amber-100', border: 'border-amber-200' }
                                                : !promo.is_active ? { label: 'Inactiva', color: 'text-gray-400', bg: 'bg-gray-100', border: 'border-gray-200' }
                                                    : { label: 'Activa', color: 'text-emerald-600', bg: 'bg-emerald-100', border: 'border-emerald-200' }

                                        return (
                                            <div
                                                key={promo.id}
                                                onClick={() => {
                                                    setSelectedPerformancePromo(promo)
                                                    setIsPerformanceModalOpen(true)
                                                }}
                                                className="group relative p-5 rounded-[2rem] bg-white dark:bg-slate-900 border border-gray-100 dark:border-white/5 shadow-sm hover:shadow-[0_20px_50px_rgba(0,0,0,0.08)] hover:-translate-y-1 transition-all duration-300 cursor-pointer overflow-hidden pb-16"
                                            >
                                                {/* Decorative Background Blob */}
                                                <div className={`absolute -top-10 -right-10 w-48 h-48 rounded-full blur-3xl opacity-20 transition-transform duration-700 group-hover:scale-125 ${visuals.color.replace('text-', 'bg-')}`} />

                                                {/* Header Row */}
                                                <div className="relative z-10 flex justify-between items-start mb-6">
                                                    <div className="flex items-center gap-3">
                                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-inner ${visuals.bg} ${visuals.color}`}>
                                                            <Icon size={20} strokeWidth={2.5} />
                                                        </div>
                                                        <div>
                                                            <span className={`text-[9px] font-black uppercase tracking-[0.2em] mb-0.5 block ${visuals.color}`}>
                                                                {visuals.label}
                                                            </span>
                                                            <h4 className="text-base font-black text-gray-900 dark:text-white leading-none tracking-tight truncate max-w-[140px]">
                                                                {promo.name}
                                                            </h4>
                                                        </div>
                                                    </div>
                                                    <div className={`px-3 py-1.5 rounded-full border text-[10px] font-black uppercase tracking-widest shadow-sm ${statusConfig.bg} ${statusConfig.color} ${statusConfig.border}`}>
                                                        {statusConfig.label}
                                                    </div>
                                                </div>

                                                {/* Main Content Area */}
                                                <div className="relative z-10 pl-2">
                                                    {promo.type === 'buy_x_get_y' ? (
                                                        <div className="flex flex-col items-center justify-center text-center w-full">
                                                            <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1 opacity-60">Mecánica</span>
                                                            <div className="flex items-center justify-center gap-2">
                                                                <span className="text-5xl font-black text-gray-900 dark:text-white tracking-tight">
                                                                    {promo.config?.buy_qty || '?'}<span className="text-gray-300 text-3xl mx-1">x</span>{promo.config?.get_qty || '?'}
                                                                </span>
                                                                <span className="text-xs font-bold text-gray-400">
                                                                    Lleva {promo.config?.get_qty} Pagando {promo.config?.buy_qty}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div className="flex flex-col items-center justify-center text-center w-full">
                                                            <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1 opacity-60">Beneficio</span>
                                                            <div className="flex items-center justify-center gap-3">
                                                                <span className="text-5xl font-black text-gray-900 dark:text-white tracking-tight font-mono">
                                                                    {promo.type === 'percentage' ||
                                                                        ((promo.type === 'product_discount' || promo.type === 'category_discount' || promo.type === 'global_discount') && promo.config?.discount_type === 'percentage')
                                                                        ? `${promo.value}%`
                                                                        : Calculator.formatCurrency(Number(promo.value || 0))
                                                                    }
                                                                </span>
                                                                <span className="text-xs font-bold text-gray-400 uppercase tracking-widest self-center">
                                                                    {promo.type === 'combo' ? 'Precio Final' : 'de Ahorro'}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Stats Indicator */}
                                                {promo.is_active && (
                                                    <div className="flex items-center justify-center gap-6 mt-4 mb-2">
                                                        <div className="flex flex-col items-center">
                                                            <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Venta Bruta</span>
                                                            <span className="text-sm font-black text-gray-900 dark:text-white">
                                                                {Calculator.formatCurrency(promoStats[promo.id]?.gmv || 0)}
                                                            </span>
                                                        </div>
                                                        <div className="w-px h-8 bg-gray-100 dark:bg-white/10" />
                                                        <div className="flex flex-col items-center">
                                                            <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Tickets</span>
                                                            <span className="text-sm font-black text-gray-900 dark:text-white">
                                                                {promoStats[promo.id]?.quantity || 0}
                                                            </span>
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Info Grid - Scope & Dates */}
                                                <div className="mt-8 grid grid-cols-2 gap-4 relative z-10">
                                                    <div className="p-4 rounded-3xl bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/5">
                                                        <div className="flex items-center gap-2 mb-2 text-gray-400">
                                                            <Globe size={14} />
                                                            <span className="text-[9px] font-black uppercase tracking-widest">Alcance</span>
                                                        </div>
                                                        <div className="text-xs font-bold text-gray-700 dark:text-gray-300">
                                                            {promo.scope_channels?.length > 0
                                                                ? promo.scope_channels.map((id: string) => channels.find(c => c.id === id)?.name || 'Desconocido').join(', ')
                                                                : 'Global'}
                                                            <span className="mx-1 text-gray-300">•</span>
                                                            {promo.scope_branches?.length > 0
                                                                ? promo.scope_branches.map((id: string) => branches.find(b => b.id === id)?.name || 'Desconocida').join(', ')
                                                                : 'Todas'}
                                                        </div>
                                                    </div>
                                                    <div className="p-4 rounded-3xl bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/5">
                                                        <div className="flex items-center gap-2 mb-2 text-gray-400">
                                                            <Calendar size={14} />
                                                            <span className="text-[9px] font-black uppercase tracking-widest">Vigencia</span>
                                                        </div>
                                                        <div className="text-xs font-bold text-gray-700 dark:text-gray-300">
                                                            {new Date(promo.start_date).toLocaleDateString('es-CO', { day: '2-digit', month: 'short' })}
                                                            <span className="text-gray-300 mx-1">→</span>
                                                            {promo.end_date ? new Date(promo.end_date).toLocaleDateString('es-CO', { day: '2-digit', month: 'short' }) : '∞'}
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Footer Action */}
                                                <div className="absolute bottom-0 left-0 right-0 p-5 bg-gradient-to-t from-gray-50 to-transparent dark:from-slate-800/80 flex justify-end">
                                                    <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-pp-gold opacity-0 group-hover:opacity-100 transition-opacity duration-300 transform translate-y-2 group-hover:translate-y-0">
                                                        Ver Reporte de Desempeño
                                                        <div className="w-6 h-6 rounded-full bg-pp-gold text-white flex items-center justify-center shadow-lg shadow-pp-gold/30">
                                                            <ArrowUpRight size={12} strokeWidth={3} />
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        )
                                    })}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <ChannelProductDetailModal
                isOpen={isDetailModalOpen}
                onClose={() => setIsDetailModalOpen(false)}
                product={editingProduct}
                channelName={selectedChannel?.name || 'Canal'}
                selectedBranch={selectedBranchId ? branches.find((b: any) => b.id === selectedBranchId) || null : null}
                allBranches={branches}
                branchPrices={(() => {
                    if (!editingProduct || !selectedChannel) return []
                    return branches.map((branch: any) => {
                        let override = allOverrides.find((o: any) =>
                            o.product_id === editingProduct.id &&
                            o.channel_id === selectedChannel.id &&
                            o.branch_id === branch.id
                        )
                        if (!override) {
                            override = allOverrides.find((o: any) =>
                                o.product_id === editingProduct.id &&
                                o.channel_id === selectedChannel.id &&
                                o.branch_id === null
                            )
                        }
                        let price = override ? override.price : editingProduct.base_price
                        const ignorePromos = override?.ignore_promotions || false
                        let isPromotion = false
                        if (!ignorePromos && promotions.length > 0) {
                            const getLocalDay = (d: Date | string) => {
                                const date = new Date(d)
                                return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime()
                            }
                            const now = getLocalDay(new Date())
                            const validPromos = promotions.filter((promo: any) => {
                                if (!promo.is_active) return false
                                const start = getLocalDay(promo.start_date)
                                const end = promo.end_date ? getLocalDay(promo.end_date) : null
                                if (start > now) return false
                                if (end && end < now) return false
                                if (promo.scope_channels?.length > 0 && !promo.scope_channels.includes(selectedChannel.id)) return false
                                if (promo.scope_branches?.length > 0 && !promo.scope_branches.includes(branch.id)) return false
                                return true
                            })
                            if (validPromos.length > 0) {
                                const promo = validPromos[0]
                                isPromotion = true

                                const discountType = (promo.type === 'percentage' || promo.type === 'fixed_amount')
                                    ? promo.type
                                    : promo.config?.discount_type

                                if (discountType === 'percentage') {
                                    price = price * (1 - (promo.value / 100))
                                } else if (discountType === 'fixed_amount') {
                                    price = Math.max(0, price - promo.value)
                                }
                            }
                        }
                        return {
                            branchId: branch.id,
                            branchName: branch.name,
                            price: price,
                            isPromotion: isPromotion
                        }
                    })
                })()}
                onSavePrice={async (newPrice: number, ignorePromotions: boolean) => {
                    if (!editingProduct || !selectedChannel) return
                    try {
                        const { error } = await supabase
                            .from('product_prices')
                            .upsert({
                                product_id: editingProduct.id,
                                channel_id: selectedChannel.id,
                                organization_id: orgId,
                                branch_id: selectedBranchId,
                                price: newPrice,
                                is_active: editingProduct.is_active_in_channel,
                                ignore_promotions: ignorePromotions
                            }, { onConflict: 'organization_id,product_id,channel_id,branch_id' })
                        if (error) throw error
                        setIsDetailModalOpen(false)
                        fetchChannelProducts(selectedChannel.id)
                    } catch (err: any) {
                        console.error('Error saving price:', err)
                        alert('Error al guardar el precio')
                    }
                }}
                onToggleActive={async (isActive: boolean) => {
                    if (!editingProduct || !selectedChannel) return
                    try {
                        const { error } = await supabase
                            .from('product_prices')
                            .upsert({
                                product_id: editingProduct.id,
                                channel_id: selectedChannel.id,
                                organization_id: orgId,
                                branch_id: selectedBranchId,
                                price: editingProduct.current_price,
                                is_active: isActive
                            }, { onConflict: 'organization_id,product_id,channel_id,branch_id' })
                        if (error) throw error
                        fetchChannelProducts(selectedChannel.id)
                    } catch (err: any) {
                        console.error('Error toggling active:', err)
                    }
                }}
            />

            <ChannelFormModal
                isOpen={isChannelModalOpen}
                onClose={() => setIsChannelModalOpen(false)}
                onSave={handleSaveChannel}
                initialData={editingChannel}
            />
            <PromotionModal
                isOpen={isPromotionModalOpen}
                onClose={() => {
                    setIsPromotionModalOpen(false)
                    setEditingPromotion(null)
                }}
                onSave={handleCreatePromotion}
                onDelete={(promo) => {
                    setPromoToDelete(promo)
                    setIsPinModalOpen(true)
                }}
                channels={channels}
                branches={branches}
                products={products}
                priceOverrides={allOverrides}
                initialData={editingPromotion}
            />

            {isPinModalOpen && (
                <PinCodeModal
                    onClose={() => {
                        setIsPinModalOpen(false)
                        setPromoToDelete(null)
                    }}
                    onSubmit={handleDeletePromotion}
                    title="Eliminar Promoción"
                    subtitle="Ingrese su PIN de administrador para confirmar la eliminación."
                />
            )}

            <PromotionPerformanceModal
                isOpen={isPerformanceModalOpen}
                onClose={() => {
                    setIsPerformanceModalOpen(false)
                    setSelectedPerformancePromo(null)
                }}
                onEdit={(promo) => {
                    setIsPerformanceModalOpen(false)
                    setEditingPromotion(promo)
                    setIsPromotionModalOpen(true)
                }}
                onStatusChange={handleUpdatePromotionStatus}
                onDelete={handleDeletePromotion}
                promotion={selectedPerformancePromo}
                branches={branches}
                channels={channels}
                products={products}
            />
            {/* Channel Performance Modal */}
            {
                selectedChannel && (
                    <ChannelPerformanceModal
                        isOpen={isChannelPerformanceOpen}
                        onClose={() => setIsChannelPerformanceOpen(false)}
                        channel={selectedChannel}
                    />
                )
            }
        </div >
    )
}
