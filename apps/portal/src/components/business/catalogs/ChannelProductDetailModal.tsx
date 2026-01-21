'use client'

import { useState, useEffect, Fragment } from 'react'
import {
    X,
    Save,
    MapPin,
    Store,
    Info,
    DollarSign,
    TrendingUp,
    AlertCircle,
    CheckCircle2,
    Image as ImageIcon,
    Tag,
    Activity,
    Lock,
    Edit2,
    AlertTriangle
} from 'lucide-react'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Badge from '@/components/ui/Badge'
import { Calculator } from '../../../../../../packages/shared-logic/src'
import { supabase } from '@/lib/supabase'
import { PinCodeModal } from '@/components/ui/PinCodeModal'

interface ChannelProductDetailModalProps {
    isOpen: boolean
    onClose: () => void
    product: {
        id: string
        name: string
        category: string
        base_price: number
        current_price: number
        has_override: boolean
        is_active_in_channel: boolean
        image_url?: string
        stock: number
        applied_promotion?: {
            id: string,
            name: string,
            type: 'percentage' | 'fixed_amount' | 'combo' | 'buy_x_get_y',
            value: number,
            scope_branches?: string[],
            scope_channels?: string[],
            config?: any // Added config for detailed display
        } | null
        cost: number
        ignore_promotions: boolean // Added
    } | null
    channelName: string
    selectedBranch: { id: string, name: string } | null
    allBranches: { id: string, name: string }[]
    branchPrices: { branchId: string, branchName: string, price: number, isPromotion: boolean }[] // Added prop
    onSavePrice: (newPrice: number, ignorePromotions: boolean) => Promise<void> // Updated signature
    onToggleActive: (isActive: boolean) => Promise<void>
}

export default function ChannelProductDetailModal({
    isOpen,
    onClose,
    product,
    channelName,
    selectedBranch,
    allBranches,
    branchPrices = [], // Default to empty
    onSavePrice,
    onToggleActive
}: ChannelProductDetailModalProps) {
    const [price, setPrice] = useState<string>('')
    const [isActive, setIsActive] = useState(true)
    const [saving, setSaving] = useState(false)
    const [ignorePromotions, setIgnorePromotions] = useState(false) // New State

    // Security State
    const [isEditing, setIsEditing] = useState(false)
    const [showPinModal, setShowPinModal] = useState(false)
    const [verifying, setVerifying] = useState(false)

    useEffect(() => {
        if (product) {
            setPrice(product.current_price.toString())
            setIsActive(product.is_active_in_channel)
            setIgnorePromotions(product.ignore_promotions || false)
        }
    }, [product])

    if (!isOpen || !product) return null

    const handleSave = async () => {
        setSaving(true)
        try {
            const numPrice = parseFloat(price)
            if (!isNaN(numPrice)) {
                await onSavePrice(numPrice, ignorePromotions)
                setIsEditing(false) // Lock after save
            }
        } finally {
            setSaving(false)
        }
    }

    const handleVerifyPin = async (pin: string) => {
        setVerifying(true)
        try {
            const { data, error } = await supabase.rpc('verify_action_pin', { input_pin: pin })

            if (error) throw error

            if (data === true) {
                setShowPinModal(false)
                setIsEditing(true)
            } else {
                alert('PIN Incorrecto')
            }
        } catch (err) {
            console.error('Error verifying PIN:', err)
            alert('Error al verificar PIN')
        } finally {
            setVerifying(false)
        }
    }

    const handleToggle = async (checked: boolean) => {
        setIsActive(checked)
        await onToggleActive(checked)
    }

    // Calc margin/diff
    const numPrice = parseFloat(price) || 0
    const diff = numPrice - product.base_price
    const diffPerc = product.base_price > 0 ? (diff / product.base_price) * 100 : 0

    // Promo Scope Logic
    const promo = product.applied_promotion
    const promoBranches = promo?.scope_branches?.length
        ? allBranches.filter(b => promo.scope_branches?.includes(b.id))
        : []
    const isGlobalPromo = !promo?.scope_branches?.length

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
            <div className="bg-white dark:bg-slate-900 w-full max-w-4xl rounded-[2.5rem] shadow-[0_40px_100px_rgba(0,0,0,0.1)] overflow-hidden flex flex-col md:flex-row max-h-[90vh] ring-1 ring-black/5 dark:ring-white/10">

                {/* Left Column: Product Info */}
                <div className="w-full md:w-1/3 bg-gray-50/50 dark:bg-white/5 p-8 border-r border-gray-100 dark:border-white/5 flex flex-col gap-6 relative">
                    <button
                        onClick={onClose}
                        className="absolute top-6 left-6 p-2 rounded-full bg-white dark:bg-slate-800 shadow-sm text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                        title="Cerrar modal"
                        aria-label="Cerrar modal"
                    >
                        <X size={20} />
                    </button>

                    {/* Image Placeholder */}
                    <div className="aspect-square rounded-[2rem] bg-white dark:bg-slate-800 border-2 border-dashed border-gray-200 dark:border-white/10 flex flex-col items-center justify-center gap-3 text-gray-300 mx-4 mt-8">
                        <ImageIcon size={48} strokeWidth={1} />
                        <span className="text-[10px] font-black uppercase tracking-widest">Sin Imagen</span>
                    </div>

                    <div className="text-center space-y-2">
                        <Badge variant="neutral" className="bg-white dark:bg-slate-800 text-[10px] py-1 px-3 border border-gray-100 dark:border-white/5">
                            {product.category}
                        </Badge>
                        <h2 className="text-2xl font-black text-gray-900 dark:text-white uppercase leading-tight">
                            {product.name}
                        </h2>
                    </div>

                    {/* Branch Prices List (New Request) */}
                    <div className="flex-1 overflow-y-auto px-4 py-2 space-y-2 max-h-[200px] bg-white/50 dark:bg-white/5 rounded-xl border border-gray-100 dark:border-white/5">
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2 sticky top-0 bg-transparent">Precios por Sede</span>
                        {branchPrices.map((bp) => (
                            <div key={bp.branchId} className="flex justify-between items-center text-xs p-2 rounded-lg hover:bg-white dark:hover:bg-white/10 transition-colors">
                                <span className="font-medium text-gray-700 dark:text-gray-300">{bp.branchName}</span>
                                <div className="flex items-center gap-1.5">
                                    {bp.isPromotion && (
                                        <Tag size={10} className="text-amber-500" />
                                    )}
                                    <span className={`font-bold ${bp.isPromotion ? 'text-amber-600 dark:text-amber-400' : 'text-gray-900 dark:text-white'}`}>
                                        ${bp.price.toLocaleString('es-CO')}
                                    </span>
                                </div>
                            </div>
                        ))}
                        {branchPrices.length === 0 && (
                            <div className="text-center text-xs text-gray-400 py-4 italic">
                                No hay información de sedes
                            </div>
                        )}
                    </div>

                    <div className="space-y-4">
                        <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-gray-100 dark:border-white/5 shadow-sm">
                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">Precio Base</span>
                            <div className="flex items-center gap-2">
                                <DollarSign size={16} className="text-gray-400" />
                                <span className="text-xl font-black text-gray-600 dark:text-gray-300">
                                    {Calculator.formatCurrency(product.base_price)}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Column: Configuration */}
                {/* Right Column: Configuration */}
                <div className="flex-1 flex flex-col relative bg-white dark:bg-slate-900">

                    {/* Distinct Header Block */}
                    <div className="relative p-8 bg-gray-50/80 dark:bg-white/5 border-b border-gray-100 dark:border-white/5 flex flex-col items-center text-center">
                        <div className="mb-4 p-3 bg-pp-gold text-white rounded-2xl shadow-lg shadow-pp-gold/20 transform hover:scale-110 transition-transform duration-300">
                            <Store size={24} strokeWidth={2.5} />
                        </div>

                        <h3 className="text-base font-black text-gray-900 dark:text-white uppercase tracking-widest mb-1">
                            Configuración de Precio
                        </h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400 font-bold bg-white dark:bg-black/20 px-3 py-1 rounded-full border border-gray-100 dark:border-white/5">
                            {channelName} <span className="text-gray-300 mx-1">|</span> {selectedBranch ? selectedBranch.name : 'Global'}
                        </p>

                        {/* Central Promo Indicator */}
                        {product.applied_promotion && (
                            <div className="mt-3 flex items-center justify-center animate-in fade-in slide-in-from-top-1">
                                <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 dark:bg-amber-900/10 border border-amber-200/50 dark:border-amber-500/10 rounded-full shadow-sm">
                                    <Tag size={12} className="text-amber-500 fill-amber-500/20" />
                                    <span className="text-[10px] font-black uppercase tracking-wide text-amber-700 dark:text-amber-500">
                                        {product.applied_promotion.name}
                                    </span>
                                    <div className="h-3 w-px bg-amber-200 dark:bg-amber-800/30 mx-0.5"></div>
                                    <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400">
                                        {product.applied_promotion.type === 'buy_x_get_y' && product.applied_promotion.config ? (
                                            `${product.applied_promotion.config.get_qty}x${product.applied_promotion.config.buy_qty}`
                                        ) : product.applied_promotion.type === 'fixed_amount' ? (
                                            `$${product.applied_promotion.value} Off`
                                        ) : (
                                            `${product.applied_promotion.value}% Off`
                                        )}
                                    </span>
                                </div>
                            </div>
                        )}

                        {/* Top Right Actions */}
                        <div className="absolute top-6 right-6 flex items-center gap-2">

                            {!isEditing ? (
                                <Button
                                    variant="outline"
                                    onClick={() => setShowPinModal(true)}
                                    className="h-9 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest border-gray-200 text-gray-500 hover:text-pp-gold hover:border-pp-gold hover:bg-pp-gold/5 bg-white dark:bg-transparent"
                                >
                                    <Lock size={12} className="mr-2" />
                                    Editar
                                </Button>
                            ) : (
                                <Button
                                    variant="primary"
                                    onClick={handleSave}
                                    disabled={saving}
                                    className="h-9 px-5 rounded-xl text-[10px] font-black uppercase tracking-widest bg-pp-gold hover:bg-pp-gold-dark text-white shadow-lg shadow-pp-gold/20"
                                >
                                    {saving ? '...' : 'Guardar'}
                                </Button>
                            )}
                        </div>
                    </div>

                    {/* Main Content - Centered */}
                    <div className="flex-1 p-8 overflow-y-auto custom-scrollbar">
                        <div className="max-w-md mx-auto flex flex-col gap-8">

                            {/* Hero Price Input */}

                            {/* Active Promotion Warning & Override Checkbox */}
                            {isEditing && product.applied_promotion && (
                                <div className="p-3 bg-orange-50 text-orange-700 rounded-xl border border-orange-100 space-y-2">
                                    <div className="flex items-center gap-2 text-xs font-medium">
                                        <AlertTriangle size={16} />
                                        <span>
                                            <strong>Atención:</strong> Existe una promoción activa.
                                        </span>
                                    </div>
                                    <label className="flex items-center gap-2 cursor-pointer pt-2 border-t border-orange-100/50">
                                        <input
                                            type="checkbox"
                                            checked={ignorePromotions}
                                            onChange={(e) => setIgnorePromotions(e.target.checked)}
                                            className="rounded border-orange-300 text-orange-600 focus:ring-orange-500"
                                        />
                                        <span className="text-xs font-bold text-orange-800 hover:text-orange-900">
                                            Forzar precio (Ignorar promoción)
                                        </span>
                                    </label>
                                </div>
                            )}

                            <div className={`w-full relative group transition-opacity flex flex-col items-center justify-center py-4 ${!isEditing ? 'opacity-75' : 'opacity-100'}`}>
                                <label className="text-xs font-black text-gray-400 uppercase tracking-widest mb-2 group-focus-within:text-pp-gold transition-colors">
                                    Precio de Venta {!isEditing && '(Solo Lectura)'}
                                </label>
                                <div className="relative">
                                    <div className={`absolute -left-8 top-1/2 -translate-y-1/2 transition-colors ${isEditing ? 'text-gray-400 group-focus-within:text-pp-gold' : 'text-gray-300'}`}>
                                        <DollarSign size={36} strokeWidth={2.5} />
                                    </div>
                                    <input
                                        type="number"
                                        value={price}
                                        disabled={!isEditing}
                                        onChange={(e) => setPrice(e.target.value)}
                                        className={`w-full max-w-[280px] text-center text-7xl font-black bg-transparent border-b-2 outline-none transition-all placeholder-gray-200 ${isEditing
                                            ? 'text-gray-900 dark:text-white border-gray-200 dark:border-white/5 focus:border-pp-gold'
                                            : 'text-gray-400 border-transparent cursor-not-allowed'
                                            }`}
                                        placeholder="0"
                                    />
                                </div>
                            </div>

                            {/* Analysis Grid */}
                            <div className="grid grid-cols-2 gap-6">

                                {/* Card 1: Difference vs Base */}
                                <div className={`p-5 rounded-3xl border-2 transition-colors duration-300 ${diff > 0
                                    ? 'bg-orange-50/50 dark:bg-orange-900/5 border-orange-100 dark:border-orange-500/20 text-orange-600'
                                    : diff < 0
                                        ? 'bg-red-50/50 dark:bg-red-900/5 border-red-100 dark:border-red-500/20 text-red-600'
                                        : 'bg-gray-50/50 dark:bg-slate-800/50 border-gray-100 dark:border-white/5 text-gray-500'
                                    }`}>
                                    <div className="flex items-center gap-2 mb-2">
                                        <div className="p-1.5 rounded-full bg-white/50 dark:bg-black/20 backdrop-blur-sm">
                                            <TrendingUp size={16} />
                                        </div>
                                        <span className="text-[10px] font-black uppercase tracking-widest opacity-80">
                                            Diferencia vs Base
                                        </span>
                                    </div>
                                    <div className="flex items-baseline gap-2">
                                        <span className="text-2xl font-black tracking-tight">
                                            {diff > 0 ? '+' : ''}{Calculator.formatCurrency(diff)}
                                        </span>
                                    </div>
                                    <span className="text-[10px] font-bold opacity-75 mt-1 block">
                                        {diff > 0 ? '+' : ''}{Math.round(diffPerc)}% variación
                                    </span>
                                </div>

                                {/* Card 2: Margin Impact */}
                                <div className={`p-5 rounded-3xl border-2 border-dashed transition-colors duration-300 ${product.cost > 0 ? 'border-gray-200 dark:border-white/10 bg-gray-50/30' : 'border-gray-100 bg-gray-50'
                                    }`}>
                                    <div className="flex items-center gap-2 mb-4">
                                        <div className="p-1.5 rounded-full bg-gray-200/50 dark:bg-white/10">
                                            <Activity size={16} className="text-gray-500 dark:text-gray-400" />
                                        </div>
                                        <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">
                                            Impacto Margen
                                        </span>
                                    </div>

                                    {product.cost > 0 ? (
                                        <div className="flex items-end justify-between">
                                            <div>
                                                <span className="text-[10px] uppercase font-bold text-gray-400 block mb-0.5">Antes</span>
                                                <span className="text-xl font-black text-gray-400">
                                                    {Math.round((product.base_price - product.cost) / product.base_price * 100)}%
                                                </span>
                                            </div>
                                            <div className="h-8 w-px bg-gray-200 dark:bg-white/10 mx-2 rotate-12"></div>
                                            <div className="text-right">
                                                <span className="text-[10px] uppercase font-bold text-pp-gold">Ahora</span>
                                                <span className={`block text-3xl font-black leading-none ${((numPrice - product.cost) / numPrice * 100) > 30 ? 'text-green-500' : 'text-orange-500'
                                                    }`}>
                                                    {Math.round(((numPrice - product.cost) / numPrice) * 100)}<span className="text-sm align-top">%</span>
                                                </span>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="h-12 flex items-center justify-center text-gray-400 font-medium text-xs">
                                            Sin costo definido
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                    </div>
                    {/* Footer: Availability */}
                    <div className="p-6 border-t border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-slate-900/50">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-lg ${selectedBranch ? 'bg-indigo-100 text-indigo-600' : 'bg-orange-100 text-orange-600'}`}>
                                    <Store size={18} />
                                </div>
                                <div>
                                    <h4 className="text-xs font-black text-gray-900 dark:text-white uppercase tracking-widest">
                                        Disponibilidad
                                    </h4>
                                    <p className="text-[10px] font-bold text-gray-500">
                                        {selectedBranch ? `Visible en ${selectedBranch.name}` : 'Visible en todas las sedes (Global)'}
                                    </p>
                                </div>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    className="sr-only peer"
                                    checked={isActive}
                                    onChange={(e) => handleToggle(e.target.checked)}
                                    aria-label="Activar o desactivar producto"
                                />
                                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-emerald-300 dark:peer-focus:ring-emerald-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-emerald-500"></div>
                            </label>
                        </div>
                    </div>
                </div>

            </div>

            {showPinModal && (
                <PinCodeModal
                    onClose={() => setShowPinModal(false)}
                    onSubmit={handleVerifyPin}
                    title="Autorización Requerida"
                    subtitle="Ingresa tu PIN de administrador para editar"
                />
            )}
        </div>
    )
}
