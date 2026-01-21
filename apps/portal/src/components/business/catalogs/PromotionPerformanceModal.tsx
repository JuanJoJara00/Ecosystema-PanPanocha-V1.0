'use client'

import React, { useState, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { PinCodeModal } from '@/components/ui/PinCodeModal'
import {
    X,
    Calendar,
    Target,
    Zap,
    Users,
    TrendingUp,
    DollarSign,
    BarChart3,
    ArrowUpRight,
    ArrowDownRight,
    ShoppingBag,
    History,
    FileText,
    Download,
    Eye,
    Globe,
    Store,
    Tag,
    Clock,
    CheckCircle2,
    Briefcase,
    ChevronRight,
    Edit2,
    MapPin,
    Trash2
} from 'lucide-react'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import { Calculator } from '../../../../../../packages/shared-logic/src'

interface PromotionPerformanceModalProps {
    isOpen: boolean
    onClose: () => void
    onEdit: (promotion: any) => void
    onStatusChange?: (promotionId: string, isActive: boolean) => Promise<void>
    onDelete?: (promotion: any) => Promise<void>
    promotion: any | null
    branches: { id: string, name: string }[]
    channels?: { id: string, name: string }[]
    products: any[]
}

export default function PromotionPerformanceModal({
    isOpen,
    onClose,
    onEdit,
    onStatusChange,
    onDelete,
    promotion,
    branches,
    channels = [],
    products
}: PromotionPerformanceModalProps) {
    const [activeTab, setActiveTab] = useState<'sedes' | 'productos' | 'pedidos'>('sedes')
    const [selectedBranchFilter, setSelectedBranchFilter] = useState<string | null>(null) // null = Todas
    const [selectedChannelFilter, setSelectedChannelFilter] = useState<string | null>(null) // null = Todos
    const [isPinModalOpen, setIsPinModalOpen] = useState(false)
    const [pendingAction, setPendingAction] = useState<'edit' | 'toggle' | 'delete' | null>(null)

    // Check expiration
    const isExpired = useMemo(() => {
        if (!promotion?.end_date) return false
        const end = new Date(promotion.end_date).getTime()
        const now = new Date().getTime()
        return end < now
    }, [promotion])

    const canEdit = promotion?.is_active && !isExpired

    const handlePinSubmit = async (pin: string) => {
        try {
            const { data: isValid, error } = await supabase.rpc('verify_action_pin', { input_pin: pin })

            if (error || !isValid) {
                alert('Código PIN inválido o sin permisos suficientes.')
                return
            }

            setIsPinModalOpen(false)
            if (pendingAction === 'edit') {
                onEdit(promotion)
            } else if (pendingAction === 'toggle' && onStatusChange) {
                await onStatusChange(promotion.id, !promotion.is_active)
            } else if (pendingAction === 'delete' && onDelete) {
                await onDelete(promotion)
                onClose()
            }
            setPendingAction(null)
        } catch (err) {
            console.error('Error verifying PIN:', err)
        }
    }

    const triggerAction = (action: 'edit' | 'toggle' | 'delete') => {
        if (action === 'delete') {
            if (promotion?.is_active) {
                alert('No se pueden eliminar campañas activas. Desactívala primero.')
                return
            }
            setPendingAction('delete')
            setIsPinModalOpen(true)
            return
        }

        if (isExpired) return

        if (action === 'toggle') {
            setPendingAction('toggle')
            setIsPinModalOpen(true)
        } else if (action === 'edit') {
            if (promotion?.is_active) {
                setPendingAction('edit')
                setIsPinModalOpen(true)
            } else {
                alert('Las promociones inactivas no pueden ser editadas. Actívala primero.')
            }
        }
    }

    // Realtime Data State
    const [realStats, setRealStats] = useState<{
        gmv: number
        investment: number
        roas: number
        orders: number
        branchBreakdown: Record<string, { gmv: number, orders: number, investment: number }>
        channelBreakdown: Record<string, { gmv: number, orders: number, investment: number }>
    } | null>(null)

    // Fetch Real Performance Data
    React.useEffect(() => {
        if (!promotion) return

        const fetchPerformance = async () => {
            try {
                // Fetch valid sales items linked to this promotion
                // We join with sales to get branch_id
                const { data, error } = await supabase
                    .from('sale_items')
                    .select(`
                        total_price,
                        discount_amount,
                        quantity,
                        sales!inner (
                            branch_id,
                            channel_id,
                            status
                        )
                    `)
                    .eq('promotion_id', promotion.id)
                    .neq('sales.status', 'cancelled') // Exclude cancelled sales

                if (error) throw error

                let gmv = 0
                let investment = 0
                let ordersSet = new Set<string>() // To count unique orders? actually we need sale_id but I didn't select it.
                // Wait, I need sale_id to count distinct orders.

                // Refetch including sale_id
                const { data: preciseData, error: preciseError } = await supabase
                    .from('sale_items')
                    .select(`
                        sale_id,
                        total_price,
                        discount_amount,
                        sales!inner (
                            branch_id,
                            channel_id,
                            status
                        )
                    `)
                    .eq('promotion_id', promotion.id)
                    .neq('sales.status', 'cancelled')

                if (preciseError) throw preciseError

                const breakdowns: Record<string, { gmv: number, orders: number, investment: number }> = {}
                const channelBreakdowns: Record<string, { gmv: number, orders: number, investment: number }> = {}

                preciseData?.forEach((item: any) => {
                    const branchId = item.sales?.branch_id
                    const channelId = item.sales?.channel_id

                    const itemGmv = item.total_price || 0
                    const itemInvest = item.discount_amount || 0

                    gmv += itemGmv
                    investment += itemInvest

                    // Branch breakdown
                    if (branchId) {
                        if (!breakdowns[branchId]) breakdowns[branchId] = { gmv: 0, orders: 0, investment: 0 }
                        breakdowns[branchId].gmv += itemGmv
                        breakdowns[branchId].investment += itemInvest
                    }

                    // Channel breakdown
                    if (channelId) {
                        if (!channelBreakdowns[channelId]) channelBreakdowns[channelId] = { gmv: 0, orders: 0, investment: 0 }
                        channelBreakdowns[channelId].gmv += itemGmv
                        channelBreakdowns[channelId].investment += itemInvest
                    }
                })

                // Count unique orders per branch and channel
                const ordersPerBranch: Record<string, Set<string>> = {}
                const ordersPerChannel: Record<string, Set<string>> = {}

                preciseData?.forEach((item: any) => {
                    const branchId = item.sales?.branch_id
                    const channelId = item.sales?.channel_id

                    if (branchId) {
                        if (!ordersPerBranch[branchId]) ordersPerBranch[branchId] = new Set()
                        ordersPerBranch[branchId].add(item.sale_id)
                    }
                    if (channelId) {
                        if (!ordersPerChannel[channelId]) ordersPerChannel[channelId] = new Set()
                        ordersPerChannel[channelId].add(item.sale_id)
                    }
                })

                Object.keys(ordersPerBranch).forEach(bid => {
                    if (breakdowns[bid]) {
                        breakdowns[bid].orders = ordersPerBranch[bid].size
                    }
                })

                Object.keys(ordersPerChannel).forEach(cid => {
                    if (channelBreakdowns[cid]) {
                        channelBreakdowns[cid].orders = ordersPerChannel[cid].size
                    }
                })

                setRealStats({
                    gmv,
                    investment,
                    roas: investment > 0 ? gmv / investment : 0,
                    orders: new Set(preciseData?.map(i => i.sale_id)).size,
                    branchBreakdown: breakdowns,
                    channelBreakdown: channelBreakdowns
                })

            } catch (err) {
                console.error("Error fetching promotion stats:", err)
            }
        }

        fetchPerformance()
    }, [promotion])

    // Aggregate stats based on filter
    const stats = useMemo(() => {
        if (!promotion || !realStats) return { gmv: 0, investment: 0, realUtility: 0, roas: 0, orders: 0 }

        if (selectedBranchFilter) {
            const b = realStats.branchBreakdown[selectedBranchFilter]
            if (!b) return { gmv: 0, investment: 0, realUtility: 0, roas: 0, orders: 0 }

            return {
                gmv: b.gmv,
                investment: b.investment,
                realUtility: b.gmv - b.investment - (b.gmv * 0.45),
                roas: b.investment > 0 ? b.gmv / b.investment : 0,
                orders: b.orders
            }
        }

        if (selectedChannelFilter) {
            const c = realStats.channelBreakdown[selectedChannelFilter]
            if (!c) return { gmv: 0, investment: 0, realUtility: 0, roas: 0, orders: 0 }

            return {
                gmv: c.gmv,
                investment: c.investment,
                realUtility: c.gmv - c.investment - (c.gmv * 0.45),
                roas: c.investment > 0 ? c.gmv / c.investment : 0,
                orders: c.orders
            }
        }

        return {
            gmv: realStats.gmv,
            investment: realStats.investment,
            realUtility: realStats.gmv - realStats.investment - (realStats.gmv * 0.45), // Est COGS
            roas: realStats.investment > 0 ? realStats.gmv / realStats.investment : 0,
            orders: realStats.orders
        }
    }, [selectedBranchFilter, selectedChannelFilter, realStats, promotion])

    // Branch list with stats
    const branchStatsWithData = useMemo(() => {
        if (!promotion) return []

        const filteredBranches = branches.filter(b =>
            promotion.scope_branches?.length ? promotion.scope_branches.includes(b.id) : true
        )

        if (!realStats) {
            return filteredBranches.map(b => ({ ...b, grossRevenue: 0, orders: 0 }))
        }

        return filteredBranches.map(b => ({
            ...b,
            grossRevenue: realStats.branchBreakdown[b.id]?.gmv || 0,
            orders: realStats.branchBreakdown[b.id]?.orders || 0
        }))
    }, [branches, promotion, realStats])

    // Channel list with stats
    const channelStatsWithData = useMemo(() => {
        if (!promotion) return []

        const filteredChannels = channels.filter(c =>
            promotion.scope_channels?.length ? promotion.scope_channels.includes(c.id) : true
        )

        if (!realStats) {
            return filteredChannels.map(c => ({ ...c, grossRevenue: 0, orders: 0 }))
        }

        return filteredChannels.map(c => ({
            ...c,
            grossRevenue: realStats.channelBreakdown[c.id]?.gmv || 0,
            orders: realStats.channelBreakdown[c.id]?.orders || 0
        }))
    }, [channels, promotion, realStats])

    if (!isOpen || !promotion) return null

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-300">
            <div className="bg-white dark:bg-slate-900 w-full max-w-[1400px] h-[92vh] rounded-[3.5rem] shadow-2xl overflow-hidden flex flex-col border border-white/20">

                {/* Header */}
                <div className="px-10 py-8 border-b border-gray-100 dark:border-white/5 bg-white dark:bg-slate-900 flex items-center justify-between z-10">
                    <div className="flex items-center gap-5">
                        <div className="w-14 h-14 rounded-2xl bg-pp-gold/10 flex items-center justify-center text-pp-gold shadow-sm">
                            <BarChart3 size={28} />
                        </div>
                        <div>
                            <div className="flex items-center gap-3">
                                <h2 className="text-2xl font-black text-gray-900 dark:text-white uppercase tracking-tight">
                                    Desempeño: {promotion.name}
                                </h2>
                                <Badge variant={isExpired ? "neutral" : promotion.is_active ? "success" : "neutral"} className="uppercase text-[11px] font-black tracking-widest py-1 px-3">
                                    {isExpired ? 'Vencida' : promotion.is_active ? 'Activa' : 'Inactiva'}
                                </Badge>
                            </div>
                            <div className="flex items-center gap-3 mt-1 text-sm text-gray-400 font-bold tracking-wide">
                                <p>
                                    ID de Campaña: <span className="font-mono text-gray-500 opacity-80">{promotion.id.slice(0, 8).toUpperCase()}</span>
                                </p>
                                <span className="text-gray-200">|</span>
                                <div className="flex items-center gap-2">
                                    <span className={`text-[10px] uppercase tracking-widest ${promotion.is_active ? 'text-emerald-500' : 'text-gray-400'}`}>
                                        {promotion.is_active ? 'Publicada' : 'Pausada'}
                                    </span>
                                    <button
                                        onClick={() => triggerAction('toggle')}
                                        disabled={isExpired}
                                        title={isExpired ? "Promoción vencida" : promotion.is_active ? "Pausar promoción" : "Activar promoción"}
                                        className={`relative w-10 h-5 rounded-full transition-all duration-300 ${isExpired ? 'bg-gray-200 opacity-50 cursor-not-allowed' : promotion.is_active ? 'bg-emerald-500' : 'bg-gray-300 hover:bg-gray-400'}`}
                                    >
                                        <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all duration-300 ${promotion.is_active ? 'right-1' : 'left-1'}`} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <Button
                            variant="outline"
                            className="h-12 px-6 rounded-2xl border-gray-200 dark:border-white/10 text-gray-400 font-black text-xs uppercase tracking-widest hover:bg-gray-50 dark:hover:bg-white/5 opacity-50 flex items-center gap-2"
                        >
                            <Download size={18} />
                            Generar Reporte
                        </Button>

                        {onDelete && (
                            <Button
                                variant="ghost"
                                onClick={() => triggerAction('delete')}
                                disabled={promotion.is_active}
                                className={`h-12 w-12 p-0 rounded-2xl flex items-center justify-center transition-colors ${promotion.is_active
                                    ? 'text-gray-300 cursor-not-allowed hover:bg-transparent'
                                    : 'text-red-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10'
                                    }`}
                                title={promotion.is_active ? "Desactiva la promoción para eliminar" : "Eliminar Promoción"}
                            >
                                <Trash2 size={20} />
                            </Button>
                        )}

                        <Button
                            variant="primary"
                            onClick={() => triggerAction('edit')}
                            disabled={!canEdit}
                            className={`h-12 px-6 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl transition-all flex items-center gap-2 ${!canEdit
                                ? 'bg-gray-100 dark:bg-white/5 text-gray-400 shadow-none cursor-not-allowed border border-gray-200 dark:border-white/10'
                                : 'bg-pp-gold text-white shadow-pp-gold/30 hover:scale-[1.02] active:scale-95'}`}
                        >
                            <Edit2 size={18} />
                            Editar Configuración
                        </Button>
                        <button
                            onClick={onClose}
                            title="Cerrar modal"
                            className="p-3 ml-4 rounded-full hover:bg-gray-100 dark:hover:bg-white/5 text-gray-400 transition-colors"
                        >
                            <X size={28} />
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-hidden flex">
                    {/* Left Column: Stats & Side Filter */}
                    <div className="w-96 border-r border-gray-100 dark:border-white/5 bg-gray-50/40 dark:bg-slate-900/50 flex flex-col pt-8 overflow-hidden">

                        {/* Summary Section */}
                        <div className="px-8 mb-8">
                            <h3 className="text-[11px] font-black text-gray-400 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                                <Target size={14} className="text-pp-gold" />
                                Resumen de Alcance
                            </h3>
                            <div className="space-y-4">
                                <div className="p-5 rounded-3xl bg-white dark:bg-slate-800 border border-gray-100 dark:border-white/5 shadow-sm">
                                    <span className="text-[10px] font-black text-pp-gold/60 uppercase tracking-widest block mb-1.5">Vigencia Actual</span>
                                    <div className="text-sm font-black text-gray-800 dark:text-gray-100 flex items-center gap-2">
                                        <Calendar size={16} className="text-pp-gold" />
                                        {new Date(promotion.start_date).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })}
                                        <span className="text-gray-300 font-normal">→</span>
                                        {promotion.end_date ? new Date(promotion.end_date).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Indefinida'}
                                    </div>
                                </div>

                                <div className="p-5 rounded-3xl bg-white dark:bg-slate-800 border border-gray-100 dark:border-white/5 shadow-sm">
                                    <span className="text-[10px] font-black text-pp-gold/60 uppercase tracking-widest block mb-1.5">Tipo de Oferta</span>
                                    <div className="text-sm font-black text-gray-800 dark:text-gray-100 flex items-center gap-2 uppercase tracking-tight">
                                        <Tag size={16} className="text-pp-gold" />
                                        {promotion.type === 'percentage' ? 'Descuento %' : promotion.type === 'fixed_amount' ? 'Valor Fijo' : 'Combo / Pack'}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Channel Selection List */}
                        <div className="flex-1 flex flex-col min-h-0 border-b border-gray-100 dark:border-white/5 pb-4">
                            <div className="px-8 mb-4 flex items-center justify-between">
                                <h3 className="text-[11px] font-black text-gray-400 uppercase tracking-[0.2em] flex items-center gap-2">
                                    <Globe size={14} className="text-pp-gold" />
                                    Filtrar por Canal
                                </h3>
                                {selectedChannelFilter && (
                                    <button
                                        onClick={() => {
                                            setSelectedChannelFilter(null)
                                        }}
                                        className="text-[10px] font-black text-pp-gold uppercase tracking-widest hover:underline"
                                    >
                                        Limpiar
                                    </button>
                                )}
                            </div>

                            <div className="flex-1 overflow-y-auto px-6 space-y-3 custom-scrollbar">
                                {/* Global Option */}
                                <button
                                    onClick={() => {
                                        setSelectedChannelFilter(null)
                                        setSelectedBranchFilter(null)
                                    }}
                                    className={`w-full text-left p-5 rounded-[2rem] transition-all border flex items-center justify-between group ${selectedChannelFilter === null
                                        ? 'bg-pp-gold border-pp-gold text-white shadow-lg shadow-pp-gold/20'
                                        : 'bg-white dark:bg-slate-800 border-gray-100 dark:border-white/5 text-gray-700 dark:text-gray-300 hover:border-pp-gold/30 hover:shadow-md'
                                        }`}
                                >
                                    <div className="flex items-center gap-4">
                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${selectedChannelFilter === null ? 'bg-white/20' : 'bg-pp-gold/10 text-pp-gold'}`}>
                                            <ShoppingBag size={20} />
                                        </div>
                                        <div>
                                            <p className="text-xs font-black uppercase tracking-widest">Todos los Canales</p>
                                            <p className={`text-[10px] font-bold ${selectedChannelFilter === null ? 'text-white/70' : 'text-gray-400'}`}>Alcance Total</p>
                                        </div>
                                    </div>
                                    <ChevronRight size={18} className={selectedChannelFilter === null ? 'text-white/50' : 'text-gray-300 group-hover:text-pp-gold'} />
                                </button>

                                {/* Channels */}
                                {channelStatsWithData.map(channel => (
                                    <button
                                        key={channel.id}
                                        onClick={() => {
                                            setSelectedChannelFilter(channel.id)
                                            setSelectedBranchFilter(null)
                                        }}
                                        className={`w-full text-left p-5 rounded-[2rem] transition-all border flex items-center justify-between group ${selectedChannelFilter === channel.id
                                            ? 'bg-white dark:bg-slate-800 border-pp-gold text-gray-900 dark:text-white shadow-xl translate-x-1'
                                            : 'bg-white dark:bg-slate-800 border-gray-100 dark:border-white/5 text-gray-700 dark:text-gray-300 hover:border-pp-gold/30 hover:shadow-md'
                                            }`}
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${selectedChannelFilter === channel.id ? 'bg-pp-gold text-white' : 'bg-gray-100 dark:bg-white/5 text-gray-400'}`}>
                                                <Store size={20} />
                                            </div>
                                            <div>
                                                <p className="text-xs font-black uppercase tracking-widest truncate max-w-[120px]">{channel.name}</p>
                                                <p className={`text-xs font-black ${selectedChannelFilter === channel.id ? 'text-pp-gold' : 'text-emerald-500'}`}>
                                                    {Calculator.formatCurrency(channel.grossRevenue)}
                                                </p>
                                            </div>
                                        </div>
                                        {selectedChannelFilter === channel.id && (
                                            <div className="w-2 h-2 rounded-full bg-pp-gold animate-pulse" />
                                        )}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Branch Selection List */}
                        <div className="flex-1 flex flex-col min-h-0">
                            <div className="px-8 mb-4 flex items-center justify-between">
                                <h3 className="text-[11px] font-black text-gray-400 uppercase tracking-[0.2em] flex items-center gap-2">
                                    <MapPin size={14} className="text-pp-gold" />
                                    Filtrar por Sede
                                </h3>
                                {selectedBranchFilter && (
                                    <button
                                        onClick={() => setSelectedBranchFilter(null)}
                                        className="text-[10px] font-black text-pp-gold uppercase tracking-widest hover:underline"
                                    >
                                        Limpiar
                                    </button>
                                )}
                            </div>

                            <div className="flex-1 overflow-y-auto px-6 pb-8 space-y-3">
                                {/* Global Option */}
                                <button
                                    onClick={() => {
                                        setSelectedBranchFilter(null)
                                        setSelectedChannelFilter(null)
                                    }}
                                    className={`w-full text-left p-5 rounded-[2rem] transition-all border flex items-center justify-between group ${selectedBranchFilter === null
                                        ? 'bg-pp-gold border-pp-gold text-white shadow-lg shadow-pp-gold/20'
                                        : 'bg-white dark:bg-slate-800 border-gray-100 dark:border-white/5 text-gray-700 dark:text-gray-300 hover:border-pp-gold/30 hover:shadow-md'
                                        }`}
                                >
                                    <div className="flex items-center gap-4">
                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${selectedBranchFilter === null ? 'bg-white/20' : 'bg-pp-gold/10 text-pp-gold'}`}>
                                            <Globe size={20} />
                                        </div>
                                        <div>
                                            <p className="text-xs font-black uppercase tracking-widest">Todas las Sedes</p>
                                            <p className={`text-[10px] font-bold ${selectedBranchFilter === null ? 'text-white/70' : 'text-gray-400'}`}>Alcance Global</p>
                                        </div>
                                    </div>
                                    <ChevronRight size={18} className={selectedBranchFilter === null ? 'text-white/50' : 'text-gray-300 group-hover:text-pp-gold'} />
                                </button>

                                {/* Branches */}
                                {branchStatsWithData.map(branch => (
                                    <button
                                        key={branch.id}
                                        onClick={() => {
                                            setSelectedBranchFilter(branch.id)
                                            setSelectedChannelFilter(null)
                                        }}
                                        className={`w-full text-left p-5 rounded-[2rem] transition-all border flex items-center justify-between group ${selectedBranchFilter === branch.id
                                            ? 'bg-white dark:bg-slate-800 border-pp-gold text-gray-900 dark:text-white shadow-xl translate-x-1'
                                            : 'bg-white dark:bg-slate-800 border-gray-100 dark:border-white/5 text-gray-700 dark:text-gray-300 hover:border-pp-gold/30 hover:shadow-md'
                                            }`}
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${selectedBranchFilter === branch.id ? 'bg-pp-gold text-white' : 'bg-gray-100 dark:bg-white/5 text-gray-400'}`}>
                                                <Store size={20} />
                                            </div>
                                            <div>
                                                <p className="text-xs font-black uppercase tracking-widest truncate max-w-[120px]">{branch.name}</p>
                                                <p className={`text-xs font-black ${selectedBranchFilter === branch.id ? 'text-pp-gold' : 'text-emerald-500'}`}>
                                                    {Calculator.formatCurrency(branch.grossRevenue)}
                                                </p>
                                            </div>
                                        </div>
                                        {selectedBranchFilter === branch.id && (
                                            <div className="w-2 h-2 rounded-full bg-pp-gold animate-pulse" />
                                        )}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="p-8 mt-auto">
                            <div className="p-6 rounded-[2.5rem] bg-gradient-to-br from-pp-gold/5 via-transparent to-pp-gold/5 border border-pp-gold/10">
                                <h4 className="text-[11px] font-black text-gray-900 dark:text-white uppercase tracking-[0.2em] mb-2">Transparencia Financiera</h4>
                                <p className="text-[10px] text-gray-500 leading-relaxed font-bold opacity-80 uppercase tracking-tight">
                                    Cálculos basados en el margen real neto (Venta - Costo - Descuento).
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Analytics & KPI Grid */}
                    <div className="flex-1 flex flex-col p-10 gap-10 overflow-y-auto bg-white dark:bg-slate-900">
                        {/* KPI Grid - Premium Style */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            {/* Ventas (GMV) */}
                            <div className="relative p-7 rounded-[2.5rem] bg-white dark:bg-slate-800 border border-emerald-100 dark:border-emerald-500/10 shadow-sm overflow-hidden group">
                                <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-50 dark:bg-emerald-500/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl group-hover:scale-150 transition-transform duration-700" />
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center text-emerald-500 shadow-sm border border-emerald-100/50">
                                        <TrendingUp size={16} />
                                    </div>
                                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Ventas (GMV)</span>
                                </div>
                                <div className="space-y-1">
                                    <h4 className="text-2xl font-black text-gray-900 dark:text-white font-mono">{Calculator.formatCurrency(stats.gmv)}</h4>
                                    <div className="flex items-center gap-1.5 text-[10px] font-black text-emerald-500 uppercase tracking-widest">
                                        <ArrowUpRight size={14} strokeWidth={3} />
                                        12.5% Incremento
                                    </div>
                                </div>
                            </div>

                            {/* Inversión */}
                            <div className="relative p-7 rounded-[2.5rem] bg-white dark:bg-slate-800 border border-pp-gold/20 shadow-sm overflow-hidden group">
                                <div className="absolute top-0 right-0 w-24 h-24 bg-pp-gold/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl group-hover:scale-150 transition-transform duration-700" />
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="w-8 h-8 rounded-lg bg-pp-gold/10 flex items-center justify-center text-pp-gold shadow-sm border border-pp-gold/20">
                                        <Zap size={16} />
                                    </div>
                                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Inversión</span>
                                </div>
                                <div className="space-y-1">
                                    <h4 className="text-2xl font-black text-pp-gold font-mono">{Calculator.formatCurrency(stats.investment)}</h4>
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Descuentos Aplicados</p>
                                </div>
                            </div>

                            {/* Utilidad Real */}
                            <div className="relative p-7 rounded-[2.5rem] bg-white dark:bg-slate-800 border border-indigo-100 dark:border-indigo-500/10 shadow-sm overflow-hidden group">
                                <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-50 dark:bg-indigo-500/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl group-hover:scale-150 transition-transform duration-700" />
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center text-indigo-500 shadow-sm border border-indigo-100/50">
                                        <Briefcase size={16} />
                                    </div>
                                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Utilidad Real</span>
                                </div>
                                <div className="space-y-1">
                                    <h4 className="text-2xl font-black text-indigo-700 dark:text-indigo-300 font-mono">{Calculator.formatCurrency(stats.realUtility)}</h4>
                                    <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest italic font-black">Margen Neto Operativo</p>
                                </div>
                            </div>

                            {/* ROAS */}
                            <div className="relative p-7 rounded-[2.5rem] bg-white dark:bg-slate-800 border border-violet-100 dark:border-violet-500/10 shadow-sm overflow-hidden group">
                                <div className="absolute top-0 right-0 w-24 h-24 bg-violet-50 dark:bg-violet-500/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl group-hover:scale-150 transition-transform duration-700" />
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="w-8 h-8 rounded-lg bg-violet-50 dark:bg-violet-500/10 flex items-center justify-center text-violet-500 shadow-sm border border-violet-100/50">
                                        <TrendingUp size={16} />
                                    </div>
                                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Retorno (ROAS)</span>
                                </div>
                                <div className="space-y-1">
                                    <h4 className="text-3xl font-black text-violet-700 dark:text-violet-300 font-mono">
                                        {stats.roas}<span className="text-lg ml-0.5 opacity-60 font-black">X</span>
                                    </h4>
                                    <p className="text-[10px] font-black text-violet-400 uppercase tracking-widest">Multiplicador de Venta</p>
                                </div>
                            </div>
                        </div>

                        {/* Analysis Tabs */}
                        <div className="flex-1 flex flex-col min-h-0 bg-gray-50/30 dark:bg-slate-800/20 rounded-[3rem] border border-gray-100 dark:border-white/5 overflow-hidden shadow-inner">
                            <div className="px-8 flex items-center border-b border-gray-100 dark:border-white/5 bg-white dark:bg-slate-800">
                                {[
                                    { id: 'sedes', label: 'Tiendas que aplicaron', icon: Store },
                                    { id: 'productos', label: 'Productos impactados', icon: ShoppingBag },
                                    { id: 'pedidos', label: 'Pedidos del periodo', icon: History }
                                ].map((tab: any) => (
                                    <button
                                        key={tab.id}
                                        onClick={() => setActiveTab(tab.id)}
                                        className={`flex items-center gap-3 px-8 py-6 text-[11px] font-black uppercase tracking-[0.25em] transition-all relative ${activeTab === tab.id
                                            ? 'text-pp-gold'
                                            : 'text-gray-400 hover:text-gray-600 dark:hover:text-white'
                                            }`}
                                    >
                                        <tab.icon size={16} />
                                        {tab.label}
                                        {activeTab === tab.id && (
                                            <div className="absolute bottom-0 left-0 right-0 h-1 bg-pp-gold shadow-[0_-4px_12px_rgba(234,179,8,0.5)] rounded-t-full" />
                                        )}
                                    </button>
                                ))}
                            </div>

                            <div className="flex-1 overflow-y-auto p-10">
                                {activeTab === 'sedes' && (
                                    <div className="space-y-4">
                                        <table className="w-full text-left border-separate border-spacing-y-2">
                                            <thead>
                                                <tr>
                                                    <th className="px-6 pb-4 text-[11px] font-black text-gray-400 uppercase tracking-widest">Sede</th>
                                                    <th className="px-6 pb-4 text-[11px] font-black text-gray-400 uppercase tracking-widest">Pedidos</th>
                                                    <th className="px-6 pb-4 text-[11px] font-black text-gray-400 uppercase tracking-widest text-center">Inversión</th>
                                                    <th className="px-6 pb-4 text-[11px] font-black text-gray-400 uppercase tracking-widest text-center">GMV</th>
                                                    <th className="px-6 pb-4 text-right text-[11px] font-black text-gray-400 uppercase tracking-widest">Utilidad</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {branchStatsWithData
                                                    .filter(s => selectedBranchFilter ? s.id === selectedBranchFilter : true)
                                                    .map((branch) => {
                                                        const investment = realStats?.branchBreakdown[branch.id]?.investment || 0
                                                        const gmv = branch.grossRevenue || 0
                                                        const utility = gmv - investment - (gmv * 0.45) // Est COGS 45%

                                                        return (
                                                            <tr key={branch.id} className="group">
                                                                <td className="px-6 py-5 bg-white dark:bg-slate-800 rounded-l-[1.5rem] border-y border-l border-gray-100 dark:border-white/5 text-sm font-black text-gray-800 dark:text-gray-100 uppercase tracking-tight">
                                                                    <div className="flex items-center gap-3">
                                                                        <div className="w-8 h-8 rounded-lg bg-gray-50 dark:bg-white/5 flex items-center justify-center text-pp-gold">
                                                                            <Store size={14} />
                                                                        </div>
                                                                        {branch.name}
                                                                    </div>
                                                                </td>
                                                                <td className="px-6 py-5 bg-white dark:bg-slate-800 border-y border-gray-100 dark:border-white/5 text-sm font-mono font-bold text-gray-500">
                                                                    {branch.orders} <span className="text-[10px] font-black text-gray-300 ml-1 uppercase">Tickets</span>
                                                                </td>
                                                                <td className="px-6 py-5 bg-white dark:bg-slate-800 border-y border-gray-100 dark:border-white/5 text-sm font-black text-pp-gold text-center">
                                                                    {Calculator.formatCurrency(investment)}
                                                                </td>
                                                                <td className="px-6 py-5 bg-white dark:bg-slate-800 border-y border-gray-100 dark:border-white/5 text-sm font-black text-gray-900 dark:text-white text-center">
                                                                    {Calculator.formatCurrency(gmv)}
                                                                </td>
                                                                <td className="px-6 py-5 bg-white dark:bg-slate-800 rounded-r-[1.5rem] border-y border-r border-gray-100 dark:border-white/5 text-right">
                                                                    <div className="text-sm font-black text-emerald-600">
                                                                        {Calculator.formatCurrency(utility)}
                                                                    </div>
                                                                    <div className="text-[9px] font-black text-emerald-500/60 uppercase">45% Margen</div>
                                                                </td>
                                                            </tr>
                                                        )
                                                    })}
                                            </tbody>
                                        </table>
                                    </div>
                                )}

                                {activeTab === 'productos' && (
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                        {products.slice(0, 6).map((product) => (
                                            <div key={product.id} className="p-6 rounded-[2rem] bg-white dark:bg-slate-800 border border-gray-100 dark:border-white/5 flex flex-col gap-5 shadow-sm group hover:border-pp-gold/30 hover:shadow-xl hover:-translate-y-1 transition-all">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-12 h-12 rounded-2xl bg-gray-50 dark:bg-white/5 flex items-center justify-center text-pp-gold">
                                                        <ShoppingBag size={22} />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <h5 className="text-xs font-black text-gray-900 dark:text-white uppercase truncate mb-1">{product.name}</h5>
                                                        <Badge variant="neutral" className="bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 text-[9px] py-0 px-2 font-black uppercase tracking-widest">
                                                            Margen: 45%
                                                        </Badge>
                                                    </div>
                                                </div>
                                                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-50 dark:border-white/5">
                                                    <div>
                                                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">Venta</span>
                                                        <span className="text-sm font-black text-gray-900 dark:text-white font-mono">$120.000</span>
                                                    </div>
                                                    <div className="text-right">
                                                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">Unidades</span>
                                                        <span className="text-sm font-black text-gray-900 dark:text-white font-mono">18</span>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {activeTab === 'pedidos' && (
                                    <div className="space-y-4">
                                        {[1, 2, 3, 4, 5, 6].map((i) => (
                                            <div key={i} className="flex items-center justify-between p-6 rounded-[2rem] bg-white dark:bg-slate-800 border border-gray-100 dark:border-white/5 hover:border-pp-gold/30 hover:shadow-lg transition-all group">
                                                <div className="flex items-center gap-5">
                                                    <div className="w-12 h-12 rounded-2xl bg-pp-gold/5 flex items-center justify-center">
                                                        <FileText size={20} className="text-pp-gold/60" />
                                                    </div>
                                                    <div>
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-xs font-black text-gray-900 dark:text-white uppercase tracking-tight">Orden #{10254 + i}</span>
                                                            <Badge variant="neutral" className="bg-gray-50 dark:bg-white/5 text-[8px] py-0 px-1 font-bold">POS</Badge>
                                                        </div>
                                                        <span className="text-[10px] font-bold text-gray-400 flex items-center gap-1.5 mt-1 uppercase">
                                                            <Clock size={12} className="text-gray-300" />
                                                            Hace {i * 15} minutos
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-12">
                                                    <div className="text-center">
                                                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">Inversión</span>
                                                        <span className="text-sm font-black text-pp-gold font-mono">$9.000</span>
                                                    </div>
                                                    <div className="text-center">
                                                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">Venta</span>
                                                        <span className="text-sm font-black text-gray-900 dark:text-white font-mono">$45.000</span>
                                                    </div>
                                                    <button
                                                        title="Ver detalles de orden"
                                                        className="w-10 h-10 rounded-xl bg-gray-50 dark:bg-white/5 flex items-center justify-center text-gray-400 hover:text-pp-gold hover:bg-pp-gold/10 transition-colors"
                                                    >
                                                        <ArrowUpRight size={20} />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {isPinModalOpen && (
                <PinCodeModal
                    onClose={() => {
                        setIsPinModalOpen(false)
                        setPendingAction(null)
                    }}
                    onSubmit={handlePinSubmit}
                    title="Autorización Requerida"
                    subtitle={`Ingresa el PIN para ${pendingAction === 'edit' ? 'editar' : 'desactivar'} la promoción`}
                />
            )}
        </div>
    )
}
