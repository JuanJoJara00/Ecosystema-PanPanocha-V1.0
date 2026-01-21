'use client'

import React, { useState, useEffect } from 'react'
import { appConfig } from '@/config/app-config'
import { X, Calendar, DollarSign, Percent, Layers, Store, Globe, Clock, Gift, Tag, ShoppingBag, AlertCircle, Search, CheckCircle2 } from 'lucide-react'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import Badge from '@/components/ui/Badge'
import { Calculator } from '../../../../../../packages/shared-logic/src'

interface PromotionModalProps {
    isOpen: boolean
    onClose: () => void
    onSave: (promotion: any) => Promise<void>
    channels: { id: string, name: string }[]
    branches: { id: string, name: string }[]
    products: any[] // passed from parent
    priceOverrides?: any[] // New prop for channel overrides
    initialData?: any
    onDelete?: (promotion: any) => void
}

export default function PromotionModal({
    isOpen,
    onClose,
    onSave,
    onDelete,
    channels,
    branches,
    products,
    priceOverrides,
    initialData
}: PromotionModalProps) {
    const [name, setName] = useState('')
    const [type, setType] = useState<'global_discount' | 'buy_x_get_y' | 'product_discount' | 'category_discount'>('global_discount')
    const [value, setValue] = useState('')

    // Helper to parse value for calculations
    const getNumericValue = (val: string) => {
        return Number(val.replace(/\./g, '').replace(/,/g, '')) || 0
    }

    // Helper to format currency input
    const handleValueChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const raw = e.target.value.replace(/\D/g, '')
        if (!raw) {
            setValue('')
            return
        }

        if (discountType === 'percentage') {
            const num = Math.min(100, Number(raw))
            setValue(num.toString())
        } else {
            setValue(Number(raw).toLocaleString('es-CO'))
        }
    }

    // Config State (Dynamic Fields)
    const [buyQty, setBuyQty] = useState('')
    const [getQty, setGetQty] = useState('')
    const [selectedProductIds, setSelectedProductIds] = useState<string[]>([])
    const [selectedCategories, setSelectedCategories] = useState<string[]>([])
    const [discountType, setDiscountType] = useState<'percentage' | 'fixed_amount'>('percentage')

    const [scopeChannelId, setScopeChannelId] = useState<string>('') // '' = All
    const [scopeBranchId, setScopeBranchId] = useState<string>('') // '' = All
    const [startDate, setStartDate] = useState<string>(new Date().toISOString().split('T')[0])
    const [endDate, setEndDate] = useState<string>('')
    const [saving, setSaving] = useState(false)
    const [productSearch, setProductSearch] = useState('') // Product Search

    // Derived Categories
    const categories = Array.from(new Set(products.map(p => p.category))).sort()

    useEffect(() => {
        if (isOpen) {
            if (initialData) {
                setName(initialData.name)
                setType(initialData.type)
                // Format initial value
                if (initialData.config?.discount_type === 'percentage') {
                    setValue(initialData.value.toString())
                } else {
                    setValue(Number(initialData.value).toLocaleString('es-CO'))
                }
                setScopeChannelId(initialData.scope_channels?.[0] || '')
                setScopeBranchId(initialData.scope_branches?.[0] || '')
                // Parsing config would go here if editing existing complex promos
                // For now assuming basic edit or reset
                setBuyQty(initialData.config?.buy_qty || '')
                setGetQty(initialData.config?.get_qty || '')
                setSelectedProductIds(initialData.config?.target_product_ids || [])
                setSelectedCategories(initialData.config?.target_categories || [])
                // Populate discountType from config for all types that use it
                setDiscountType(initialData.config?.discount_type || 'percentage')

            } else {
                setName('')
                setType('global_discount')
                setValue('')
                setBuyQty('')
                setGetQty('')
                setSelectedProductIds([])
                setSelectedCategories([])
                setDiscountType('percentage')
                setScopeChannelId('')
                setScopeBranchId('')
                setStartDate(new Date().toISOString().split('T')[0])
                setEndDate('')
            }
        }
    }, [isOpen, initialData])

    if (!isOpen) return null

    const handleSave = async () => {
        if (!name) return

        // Validation logic per type
        if (type === 'buy_x_get_y' && (!buyQty || !getQty || selectedProductIds.length === 0 || parseInt(buyQty) >= parseInt(getQty))) return
        if (type === 'product_discount' && (selectedProductIds.length === 0 || !value)) return
        if (type === 'category_discount' && (selectedCategories.length === 0 || !value)) return
        if (type === 'global_discount' && !value) return

        setSaving(true)
        try {
            const config: any = {}
            if (type === 'buy_x_get_y') {
                config.buy_qty = parseInt(buyQty)
                config.get_qty = parseInt(getQty)
                config.target_product_ids = selectedProductIds
            }
            // Ensure discount_type is saved for all relevant types
            if (type === 'product_discount') {
                config.target_product_ids = selectedProductIds
                config.discount_type = discountType
            }
            if (type === 'category_discount') {
                config.target_categories = selectedCategories
                config.discount_type = discountType
            }
            if (type === 'global_discount') {
                config.discount_type = discountType
            }

            const payload: any = {
                name,
                type,
                value: type === 'buy_x_get_y' ? 0 : getNumericValue(value),
                config,
                scope_channels: scopeChannelId ? [scopeChannelId] : [],
                scope_branches: scopeBranchId ? [scopeBranchId] : [],
                start_date: startDate,
                end_date: endDate || null,
                is_active: true
            }

            // Include ID if editing to trigger update
            if (initialData?.id) {
                payload.id = initialData.id
            }

            await onSave(payload)
            onClose()
        } finally {
            setSaving(false)
        }
    }

    // Helper to toggle selection
    const toggleProduct = (id: string) => {
        setSelectedProductIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
    }
    const toggleCategory = (cat: string) => {
        setSelectedCategories(prev => prev.includes(cat) ? prev.filter(x => x !== cat) : [...prev, cat])
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
            <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-[2.5rem] shadow-[0_40px_100px_rgba(0,0,0,0.1)] overflow-hidden flex flex-col max-h-[90vh] ring-1 ring-black/5 dark:ring-white/10">

                {/* Header */}
                <div className="p-8 pb-6 border-b border-gray-100 dark:border-white/5 flex items-center justify-between bg-white dark:bg-slate-900 relative z-10">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center shadow-lg shadow-orange-500/20 transform -rotate-6 overflow-hidden p-1">
                            <img
                                src={appConfig.company.logoUrl}
                                alt={appConfig.company.name}
                                className="w-full h-full object-contain"
                            />
                        </div>
                        <div>
                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">
                                {initialData ? 'Configuración' : 'Nueva Campaña'}
                            </span>
                            <h2 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tight">
                                {initialData ? 'Editar Promoción' : 'Crear Promoción'}
                            </h2>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-full bg-gray-50 dark:bg-white/5 text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                        title="Cerrar modal"
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar p-8 pt-6 space-y-8 bg-white dark:bg-slate-900">

                    {/* 1. Name & Type */}
                    <div className="space-y-6">
                        <div className="p-1 rounded-2xl bg-gray-50 dark:bg-white/5 p-1.5 flex gap-1">
                            {[
                                { value: 'global_discount', label: 'Global', icon: Globe },
                                { value: 'buy_x_get_y', label: '2x1 / 3x2', icon: Gift },
                                { value: 'product_discount', label: 'Producto', icon: ShoppingBag },
                                { value: 'category_discount', label: 'Categoría', icon: Layers }
                            ].map((opt) => (
                                <button
                                    key={opt.value}
                                    onClick={() => {
                                        setType(opt.value as any)
                                        setValue('')
                                        setBuyQty('')
                                        setGetQty('')
                                        setSelectedProductIds([])
                                        setSelectedCategories([])
                                    }}
                                    className={`flex-1 flex flex-col items-center justify-center gap-1.5 py-3 rounded-xl transition-all ${type === opt.value
                                        ? 'bg-white dark:bg-slate-800 shadow-sm text-pp-gold ring-1 ring-black/5 dark:ring-white/10'
                                        : 'text-gray-400 hover:text-gray-600 hover:bg-white/50'
                                        }`}
                                >
                                    <opt.icon size={18} strokeWidth={type === opt.value ? 2.5 : 2} />
                                    <span className="text-[9px] font-black uppercase tracking-widest">{opt.label}</span>
                                </button>
                            ))}
                        </div>

                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Nombre de la Campaña</label>
                            <Input
                                placeholder="Ej: Jueves de 2x1, Descuento Panadería"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                fullWidth
                                className="text-lg font-bold bg-gray-50 dark:bg-white/5 border-transparent focus:bg-white focus:border-pp-gold transition-all"
                            />
                        </div>
                    </div>

                    {/* 2. Configuration Area */}
                    <div className="p-6 rounded-3xl bg-gray-50/80 dark:bg-white/5 border border-gray-100 dark:border-white/5 space-y-6 relative overflow-hidden">
                        {/* Decorative Background */}
                        <div className="absolute top-0 right-0 w-64 h-64 bg-pp-gold/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />

                        <div className="flex items-center gap-2 mb-2 relative z-10">
                            <div className="p-1.5 bg-white dark:bg-white/10 rounded-lg shadow-sm">
                                <AlertCircle size={14} className="text-pp-gold" />
                            </div>
                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                Reglas de Negocio
                            </span>
                        </div>

                        {/* TYPE: Global Discount */}
                        {type === 'global_discount' && (
                            <div className="flex gap-4 items-end relative z-10">
                                <div className="w-32">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 mb-1 block">Tipo</label>
                                    <div className="flex bg-white dark:bg-slate-800 rounded-xl p-1 shadow-sm ring-1 ring-black/5 dark:ring-white/10">
                                        <button
                                            onClick={() => setDiscountType('percentage')}
                                            className={`flex-1 py-1.5 rounded-lg text-xs font-black transition-colors ${discountType === 'percentage' ? 'bg-pp-gold text-white shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                                        >
                                            %
                                        </button>
                                        <button
                                            onClick={() => setDiscountType('fixed_amount')}
                                            className={`flex-1 py-1.5 rounded-lg text-xs font-black transition-colors ${discountType === 'fixed_amount' ? 'bg-pp-gold text-white shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                                        >
                                            $
                                        </button>
                                    </div>
                                </div>
                                <div className="flex-1">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 mb-1 block">Valor</label>
                                    <Input
                                        type="text"
                                        value={value}
                                        onChange={handleValueChange}
                                        placeholder="0"
                                        className="text-xl font-black bg-white dark:bg-slate-800 border-transparent shadow-sm ring-1 ring-black/5 dark:ring-white/10"
                                    />
                                </div>
                            </div>
                        )}

                        {/* TYPE: Buy X Get Y */}
                        {type === 'buy_x_get_y' && (
                            <div className="space-y-6 relative z-10">
                                <div className="flex gap-4 items-center">
                                    <div className="flex-1">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 mb-1 block">LLEVAS</label>
                                        <Input
                                            type="number"
                                            placeholder="2"
                                            value={getQty}
                                            onChange={(e) => setGetQty(e.target.value)}
                                            className="text-center font-black text-lg bg-white dark:bg-slate-800 border-transparent shadow-sm ring-1 ring-black/5 dark:ring-white/10"
                                        />
                                    </div>
                                    <div className="text-center pt-5">
                                        <span className="text-xs font-black text-gray-300">PAGAS</span>
                                    </div>
                                    <div className="flex-1">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 mb-1 block">PAGAS</label>
                                        <Input
                                            type="number"
                                            placeholder="1"
                                            value={buyQty}
                                            onChange={(e) => setBuyQty(e.target.value)}
                                            className="text-center font-black text-lg bg-white dark:bg-slate-800 border-transparent shadow-sm ring-1 ring-black/5 dark:ring-white/10"
                                        />
                                    </div>
                                    <div className="text-sm font-black text-pp-gold pb-3 pt-5">
                                        {buyQty && getQty ? `${getQty}x${buyQty}` : '2x1'}
                                    </div>
                                </div>

                                <div className="p-4 bg-white dark:bg-slate-800 rounded-2xl shadow-sm ring-1 ring-black/5 dark:ring-white/10">
                                    <div className="flex justify-between items-center mb-3">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Productos Aplicables</label>
                                        <span className="text-[10px] font-bold text-pp-gold bg-pp-gold/10 px-2 py-0.5 rounded-full">{selectedProductIds.length} seleccionados</span>
                                    </div>
                                    <div className="relative mb-3">
                                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                        <input
                                            type="text"
                                            placeholder="Buscar producto..."
                                            value={productSearch}
                                            onChange={(e) => setProductSearch(e.target.value)}
                                            className="w-full pl-9 pr-4 py-2 bg-gray-50 dark:bg-white/5 border-none rounded-xl text-xs font-medium outline-none focus:ring-1 focus:ring-pp-gold"
                                        />
                                    </div>
                                    <div className="max-h-40 overflow-y-auto custom-scrollbar space-y-1 pr-1">
                                        {products
                                            .filter(p => p.name.toLowerCase().includes(productSearch.toLowerCase()))
                                            .map(p => (
                                                <div
                                                    key={p.id}
                                                    onClick={() => toggleProduct(p.id)}
                                                    className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors ${selectedProductIds.includes(p.id) ? 'bg-pp-gold/5' : 'hover:bg-gray-50 dark:hover:bg-white/5'}`}
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <div className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${selectedProductIds.includes(p.id) ? 'bg-pp-gold border-pp-gold' : 'border-gray-300'}`}>
                                                            {selectedProductIds.includes(p.id) && <CheckCircle2 size={10} className="text-white" />}
                                                        </div>
                                                        <span className={`text-xs ${selectedProductIds.includes(p.id) ? 'font-bold text-gray-900 dark:text-gray-200' : 'text-gray-500'}`}>
                                                            {p.name} <span className="text-gray-300 mx-1">•</span> {Calculator.formatCurrency((p.base_price || p.current_price))}
                                                        </span>
                                                    </div>
                                                </div>
                                            ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* TYPE: Product Discount */}
                        {type === 'product_discount' && (
                            <div className="space-y-6 relative z-10">
                                <div className="flex gap-4 items-end">
                                    <div className="w-32">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 mb-1 block">Tipo</label>
                                        <div className="flex bg-white dark:bg-slate-800 rounded-xl p-1 shadow-sm ring-1 ring-black/5 dark:ring-white/10">
                                            <button
                                                onClick={() => setDiscountType('percentage')}
                                                className={`flex-1 py-1.5 rounded-lg text-xs font-black transition-colors ${discountType === 'percentage' ? 'bg-pp-gold text-white shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                                            >
                                                %
                                            </button>
                                            <button
                                                onClick={() => setDiscountType('fixed_amount')}
                                                className={`flex-1 py-1.5 rounded-lg text-xs font-black transition-colors ${discountType === 'fixed_amount' ? 'bg-pp-gold text-white shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                                            >
                                                $
                                            </button>
                                        </div>
                                    </div>
                                    <div className="flex-1">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 mb-1 block">Valor Descuento</label>
                                        <Input
                                            type="text"
                                            value={value}
                                            onChange={handleValueChange}
                                            placeholder="0"
                                            className="text-xl font-black bg-white dark:bg-slate-800 border-transparent shadow-sm ring-1 ring-black/5 dark:ring-white/10"
                                        />
                                    </div>
                                </div>

                                <div className="p-4 bg-white dark:bg-slate-800 rounded-2xl shadow-sm ring-1 ring-black/5 dark:ring-white/10">
                                    <div className="flex justify-between items-center mb-3">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Productos Aplicables</label>
                                        <span className="text-[10px] font-bold text-pp-gold bg-pp-gold/10 px-2 py-0.5 rounded-full">{selectedProductIds.length} seleccionados</span>
                                    </div>
                                    <div className="relative mb-3">
                                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                        <input
                                            type="text"
                                            placeholder="Buscar producto..."
                                            value={productSearch}
                                            onChange={(e) => setProductSearch(e.target.value)}
                                            className="w-full pl-9 pr-4 py-2 bg-gray-50 dark:bg-white/5 border-none rounded-xl text-xs font-medium outline-none focus:ring-1 focus:ring-pp-gold"
                                        />
                                    </div>
                                    <div className="max-h-40 overflow-y-auto custom-scrollbar space-y-1 pr-1">
                                        {products
                                            .filter(p => p.name.toLowerCase().includes(productSearch.toLowerCase()))
                                            .map(p => {
                                                // Calculate Base Price with Overrides
                                                let basePrice = p.base_price || p.current_price
                                                if (scopeChannelId && priceOverrides) {
                                                    const override = priceOverrides.find((o: any) =>
                                                        o.product_id === p.id &&
                                                        o.channel_id === scopeChannelId
                                                    )
                                                    if (override) {
                                                        basePrice = override.price
                                                    }
                                                }

                                                const promoPrice = discountType === 'percentage'
                                                    ? basePrice * (1 - getNumericValue(value) / 100)
                                                    : Math.max(0, basePrice - getNumericValue(value))
                                                return (
                                                    <div
                                                        key={p.id}
                                                        onClick={() => toggleProduct(p.id)}
                                                        className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors ${selectedProductIds.includes(p.id) ? 'bg-pp-gold/5' : 'hover:bg-gray-50 dark:hover:bg-white/5'}`}
                                                    >
                                                        <div className="flex items-center gap-3">
                                                            <div className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${selectedProductIds.includes(p.id) ? 'bg-pp-gold border-pp-gold' : 'border-gray-300'}`}>
                                                                {selectedProductIds.includes(p.id) && <CheckCircle2 size={10} className="text-white" />}
                                                            </div>
                                                            <div className="flex flex-col">
                                                                <span className={`text-xs ${selectedProductIds.includes(p.id) ? 'font-bold text-gray-900 dark:text-gray-200' : 'text-gray-500'}`}>
                                                                    {p.name}
                                                                </span>
                                                            </div>
                                                        </div>
                                                        {selectedProductIds.includes(p.id) && (
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-[10px] text-gray-400 line-through decoration-gray-400/50 decoration-1">
                                                                    {Calculator.formatCurrency(basePrice)}
                                                                </span>
                                                                <span className="text-xs font-bold text-emerald-500">
                                                                    {Calculator.formatCurrency(promoPrice)}
                                                                </span>
                                                            </div>
                                                        )}
                                                    </div>
                                                )
                                            })}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* TYPE: Category Discount */}
                        {type === 'category_discount' && (
                            <div className="space-y-6 relative z-10">
                                <div className="flex gap-4 items-end">
                                    <div className="w-32">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 mb-1 block">Tipo</label>
                                        <div className="flex bg-white dark:bg-slate-800 rounded-xl p-1 shadow-sm ring-1 ring-black/5 dark:ring-white/10">
                                            <button
                                                onClick={() => setDiscountType('percentage')}
                                                className={`flex-1 py-1.5 rounded-lg text-xs font-black transition-colors ${discountType === 'percentage' ? 'bg-pp-gold text-white shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                                            >
                                                %
                                            </button>
                                            <button
                                                onClick={() => setDiscountType('fixed_amount')}
                                                className={`flex-1 py-1.5 rounded-lg text-xs font-black transition-colors ${discountType === 'fixed_amount' ? 'bg-pp-gold text-white shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                                            >
                                                $
                                            </button>
                                        </div>
                                    </div>
                                    <div className="flex-1">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 mb-1 block">Valor Descuento</label>
                                        <Input
                                            type="text"
                                            value={value}
                                            onChange={handleValueChange}
                                            placeholder="0"
                                            className="text-xl font-black bg-white dark:bg-slate-800 border-transparent shadow-sm ring-1 ring-black/5 dark:ring-white/10"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 mb-2 block">Seleccionar Categorías</label>
                                    <div className="flex flex-wrap gap-2">
                                        {categories.map(cat => (
                                            <button
                                                key={cat}
                                                onClick={() => toggleCategory(cat as string)}
                                                className={`px-3 py-1.5 rounded-lg text-[10px] font-bold border transition-all ${selectedCategories.includes(cat as string)
                                                    ? 'bg-pp-gold text-white border-pp-gold shadow-md'
                                                    : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300'
                                                    }`}
                                            >
                                                {cat}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* 3. Scope & Duration */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                            <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                                <Clock size={14} /> Duración
                            </h3>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1 mb-1 block">Inicio</label>
                                    <Input
                                        type="date"
                                        value={startDate}
                                        onChange={(e) => setStartDate(e.target.value)}
                                        className="bg-gray-50 dark:bg-white/5 border-transparent text-xs font-bold"
                                    />
                                </div>
                                <div>
                                    <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1 mb-1 block">Fin (Opcional)</label>
                                    <Input
                                        type="date"
                                        value={endDate}
                                        onChange={(e) => setEndDate(e.target.value)}
                                        className="bg-gray-50 dark:bg-white/5 border-transparent text-xs font-bold"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                                <Globe size={14} /> Alcance
                            </h3>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1 mb-1 block">Canal</label>
                                    <Select
                                        value={scopeChannelId}
                                        onChange={(e) => setScopeChannelId(e.target.value)}
                                        className="bg-gray-50 dark:bg-white/5 border-transparent text-xs font-bold"
                                    >
                                        <option value="">Todos (Global)</option>
                                        {channels.map(c => (
                                            <option key={c.id} value={c.id}>{c.name}</option>
                                        ))}
                                    </Select>
                                </div>
                                <div>
                                    <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1 mb-1 block">Sede</label>
                                    <Select
                                        value={scopeBranchId}
                                        onChange={(e) => setScopeBranchId(e.target.value)}
                                        className="bg-gray-50 dark:bg-white/5 border-transparent text-xs font-bold"
                                    >
                                        <option value="">Todas (Global)</option>
                                        {branches.map(b => (
                                            <option key={b.id} value={b.id}>{b.name}</option>
                                        ))}
                                    </Select>
                                </div>
                            </div>
                        </div>
                    </div>

                </div>

                {/* Footer */}
                <div className="p-6 border-t border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-slate-900/50 flex justify-between items-center z-10">
                    <div>
                        {initialData && onDelete && (
                            <Button
                                variant="ghost"
                                onClick={() => onDelete(initialData)}
                                disabled={initialData.is_active}
                                className={`rounded-xl text-[10px] font-black uppercase tracking-widest ${initialData.is_active ? 'text-gray-300' : 'text-red-500 hover:bg-red-50 hover:text-red-700'}`}
                                title={initialData.is_active ? "Desactiva la promoción para eliminarla" : "Eliminar Promoción"}
                            >
                                <div className="flex items-center gap-2">
                                    <AlertCircle size={14} />
                                    Eliminar
                                </div>
                            </Button>
                        )}
                    </div>
                    <div className="flex gap-3">
                        <Button
                            variant="ghost"
                            onClick={onClose}
                            disabled={saving}
                            className="rounded-xl text-[10px] font-black uppercase tracking-widest text-gray-500 hover:bg-white hover:text-gray-700"
                        >
                            Cancelar
                        </Button>
                        <Button
                            variant="primary"
                            onClick={handleSave}
                            disabled={saving || !name}
                            className="bg-pp-gold text-white shadow-lg shadow-pp-gold/20 rounded-xl px-6 text-[10px] font-black uppercase tracking-widest hover:bg-pp-gold-dark transform active:scale-95 transition-all"
                        >
                            {saving ? (
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    <span>Guardando...</span>
                                </div>
                            ) : (
                                initialData ? 'Guardar Cambios' : 'Crear Promoción'
                            )}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    )
}
