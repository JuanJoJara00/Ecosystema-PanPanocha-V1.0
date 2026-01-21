'use client'

import React, { useState, useEffect } from 'react'
import {
    X,
    Save,
    Loader2,
    Package,
    DollarSign,
    Tag,
    ImageIcon,
    CheckCircle2,
    Info,
    ArrowRight,
    TrendingUp,
    Store,
    Search
} from 'lucide-react'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import NumericInput from '@/components/ui/NumericInput'
import Select from '@/components/ui/Select'
import ImageUpload from '@/components/ui/ImageUpload'
import Badge from '@/components/ui/Badge'
import { appConfig } from '@/config/app-config'
import Image from 'next/image'
import { Product } from '@panpanocha/types'

interface ProductFormModalProps {
    isOpen: boolean
    onClose: () => void
    onSubmit: (data: any) => Promise<void>
    editingProduct: Product | null
    categories: { id: string, name: string }[]
    branches: { id: string, name: string }[]
    initialData?: any
    allProducts: Product[]
    productCosts: Record<string, number>
}

export default function ProductFormModal({
    isOpen,
    onClose,
    onSubmit,
    editingProduct,
    categories,
    branches,
    initialData,
    allProducts,
    productCosts
}: ProductFormModalProps) {
    const [loading, setLoading] = useState(false)
    const [formData, setFormData] = useState({
        name: '',
        category_id: '',
        price: 0,
        active: true,
        image_url: '',
        description: '',
        type: 'standard' as 'standard' | 'combo'
    })

    const [comboItems, setComboItems] = useState<{ child_product_id: string, quantity: number }[]>([])
    const [branchActivity, setBranchActivity] = useState<Record<string, boolean>>({})
    const [productSearch, setProductSearch] = useState('')

    // Auto-switch category when type changes to combo
    useEffect(() => {
        if (formData.type === 'combo') {
            const combosCat = categories.find(c => c.name.toLowerCase() === 'combos')
            if (combosCat && formData.category_id !== combosCat.id) {
                setFormData(prev => ({ ...prev, category_id: combosCat.id }))
            } else if (!combosCat && formData.category_id !== 'system_combos') {
                // Select virtual category if real one doesn't exist
                setFormData(prev => ({ ...prev, category_id: 'system_combos' }))
            }
        }
    }, [formData.type, categories])

    useEffect(() => {
        if (editingProduct) {
            setFormData({
                name: editingProduct.name,
                category_id: editingProduct.category_id || '',
                price: editingProduct.price || 0,
                active: editingProduct.active,
                image_url: editingProduct.image_url || '',
                description: editingProduct.description || '',
                type: (editingProduct as any).type || 'standard'
            })
        } else if (initialData) {
            setFormData(prev => ({ ...prev, ...initialData }))
        } else {
            setFormData({
                name: '',
                category_id: categories.length > 0 ? categories[0].id : '',
                price: 0,
                active: true,
                image_url: '',
                description: '',
                type: 'standard'
            })
            setComboItems([])
        }

        // Initialize branch activity
        if (initialData?.branchActivity) {
            setBranchActivity(initialData.branchActivity)
        } else {
            const defaultActivity: Record<string, boolean> = {}
            branches.forEach(b => {
                defaultActivity[b.id] = formData.active
            })
            setBranchActivity(defaultActivity)
        }

        // Load combo items if editing
        if (editingProduct && (editingProduct as any).combos) {
            setComboItems((editingProduct as any).combos)
        }
    }, [editingProduct, isOpen, categories, initialData])

    // Auto-calculate Combo Price/Cost
    useEffect(() => {
        if (formData.type === 'combo') {
            let totalPrice = 0

            comboItems.forEach(item => {
                const prod = allProducts.find(p => p.id === item.child_product_id)
                if (prod) {
                    totalPrice += ((prod.price || 0) * item.quantity)
                }
            })

            // Update formData price if it differs
            if (formData.price !== totalPrice) {
                setFormData(prev => ({ ...prev, price: totalPrice }))
            }
        }
    }, [comboItems, formData.type, allProducts])

    if (!isOpen) return null

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        try {
            await onSubmit({
                ...formData,
                branchActivity,
                comboItems: formData.type === 'combo' ? comboItems : []
            })
            onClose()
        } catch (error) {
            console.error('Error submitting product:', error)
        } finally {
            setLoading(false)
        }
    }

    // Calculate cost based on type
    let projectedCost = 0
    if (formData.type === 'combo') {
        projectedCost = comboItems.reduce((acc, item) => {
            const cost = productCosts[item.child_product_id] || 0
            return acc + (cost * item.quantity)
        }, 0)
    } else if (editingProduct && productCosts[editingProduct.id]) {
        projectedCost = productCosts[editingProduct.id]
    } else {
        // Fallback or explicit 0 if no recipe
        projectedCost = 0
    }

    const projectedMargin = formData.price - projectedCost
    const marginPercentage = formData.price > 0 ? (projectedMargin / formData.price) * 100 : 0

    return (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl w-full max-w-5xl overflow-hidden flex flex-col max-h-[90vh] border border-white/20 animate-in zoom-in-95 duration-300">

                {/* Header */}
                <div className="p-8 border-b border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-slate-800/20 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-4">
                        <div className="h-14 w-14 flex items-center justify-center overflow-hidden relative">
                            {/* <Package className="h-8 w-8 text-pp-brown" /> */}
                            <Image
                                src={appConfig.company.logoUrl}
                                alt={appConfig.company.name}
                                fill
                                className="object-contain"
                            />
                        </div>
                        <div>
                            <h2 className="text-2xl font-black text-gray-900 dark:text-white uppercase tracking-tighter font-display leading-tight">
                                {editingProduct ? 'Editar Producto' : 'Nuevo Producto'}
                            </h2>
                            <p className="text-sm font-bold text-gray-500 flex items-center gap-1.5 uppercase tracking-widest mt-0.5">
                                Catálogo Maestro <ArrowRight size={12} className="text-pp-gold" /> <span className="text-pp-brown dark:text-pp-gold">General</span>
                            </p>
                        </div>
                    </div>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={onClose}
                        className="h-12 w-12 rounded-full hover:bg-white dark:hover:bg-slate-800 transition-all border border-transparent hover:border-gray-100 dark:hover:border-white/10"
                    >
                        <X className="h-6 w-6 text-gray-400" />
                    </Button>
                </div>

                {/* Split Content Body */}
                <div className="flex-grow flex flex-col lg:flex-row overflow-hidden">

                    {/* Left Panel: Primary Form (3/5) */}
                    <form id="product-form" onSubmit={handleSubmit} className="lg:w-3/5 p-8 overflow-y-auto space-y-8 bg-white dark:bg-slate-900">

                        <div className="space-y-6">
                            <div className="flex items-center gap-2 mb-2">
                                <Tag size={16} className="text-pp-gold" />
                                <h3 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em]">Identificación Básica</h3>
                            </div>

                            <Input
                                label="Nombre comercial"
                                required
                                value={formData.name}
                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                                placeholder="Ej. Croissant de Almendras"
                                className="!rounded-2xl !py-4"
                            />

                            {/* Type Selector */}
                            <div className="flex gap-4 p-1 bg-gray-100 dark:bg-slate-800 rounded-xl">
                                <button
                                    type="button"
                                    onClick={() => setFormData({ ...formData, type: 'standard' })}
                                    className={`flex-1 py-2 px-4 rounded-lg text-sm font-bold transition-all ${formData.type === 'standard'
                                        ? 'bg-white dark:bg-slate-700 shadow text-pp-brown dark:text-white'
                                        : 'text-gray-400 hover:text-gray-600'
                                        }`}
                                >
                                    Producto Estándar
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setFormData({ ...formData, type: 'combo' })}
                                    className={`flex-1 py-2 px-4 rounded-lg text-sm font-bold transition-all ${formData.type === 'combo'
                                        ? 'bg-white dark:bg-slate-700 shadow text-pp-brown dark:text-white'
                                        : 'text-gray-400 hover:text-gray-600'
                                        }`}
                                >
                                    Combo / Kit
                                </button>
                            </div>

                            {formData.type === 'combo' && (
                                <div className="space-y-4 bg-gray-50 dark:bg-slate-800/40 p-5 rounded-3xl border border-gray-100 dark:border-white/5 animate-in slide-in-from-top-2">
                                    <div className="flex justify-between items-center mb-2">
                                        <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest">Componentes</h3>
                                        <div className="text-xs font-bold text-pp-gold">
                                            {comboItems.length} items
                                        </div>
                                    </div>

                                    {/* Add Item Row */}
                                    {/* Add Item Search */}
                                    <div className="relative">
                                        <div className="relative">
                                            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                                                <Search className="h-4 w-4" />
                                            </div>
                                            <input
                                                type="text"
                                                placeholder="Buscar producto para agregar..."
                                                value={productSearch}
                                                onChange={(e) => setProductSearch(e.target.value)}
                                                className="w-full pl-9 pr-4 py-3 bg-white dark:bg-slate-900 border border-gray-100 dark:border-white/5 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-pp-gold/20 transition-all font-medium placeholder:text-gray-400"
                                            />
                                            {productSearch && (
                                                <button
                                                    type="button"
                                                    aria-label="Limpiar búsqueda"
                                                    title="Limpiar búsqueda"
                                                    onClick={() => setProductSearch('')}
                                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                                >
                                                    <X className="h-4 w-4" />
                                                </button>
                                            )}
                                        </div>

                                        {productSearch && (
                                            <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-gray-100 dark:border-white/5 z-20 max-h-60 overflow-y-auto divide-y divide-gray-50 dark:divide-white/5">
                                                {allProducts
                                                    .filter(p => !comboItems.some(i => i.child_product_id === p.id))
                                                    .filter(p => p.name.toLowerCase().includes(productSearch.toLowerCase()))
                                                    .slice(0, 10)
                                                    .map(p => (
                                                        <button
                                                            key={p.id}
                                                            type="button"
                                                            onClick={() => {
                                                                setComboItems(prev => [...prev, { child_product_id: p.id, quantity: 1 }])
                                                                setProductSearch('')
                                                            }}
                                                            className="w-full flex items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors text-left group"
                                                        >
                                                            <div className="flex flex-col">
                                                                <span className="text-sm font-bold text-gray-700 dark:text-gray-200 group-hover:text-pp-brown transition-colors">{p.name}</span>
                                                                <span className="text-[10px] text-gray-400 uppercase tracking-widest">{p.category_id ? categories.find(c => c.id === p.category_id)?.name : 'Sin Categoría'}</span>
                                                            </div>
                                                            <span className="text-xs font-black text-pp-gold">${p.price?.toLocaleString()}</span>
                                                        </button>
                                                    ))}
                                                {allProducts.filter(p => !comboItems.some(i => i.child_product_id === p.id) && p.name.toLowerCase().includes(productSearch.toLowerCase())).length === 0 && (
                                                    <div className="p-6 text-center text-xs font-medium text-gray-400 italic">No se encontraron productos disponibles</div>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    {/* List */}
                                    <div className="space-y-2 max-h-48 overflow-y-auto">
                                        {comboItems.map((item, idx) => {
                                            const prod = allProducts.find(p => p.id === item.child_product_id)
                                            if (!prod) return null
                                            return (
                                                <div key={idx} className="flex items-center justify-between p-3 bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-white/5">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-white/10 flex items-center justify-center font-bold text-xs">
                                                            {item.quantity}x
                                                        </div>
                                                        <div>
                                                            <div className="text-sm font-bold dark:text-white">{prod.name}</div>
                                                            <div className="text-[10px] text-gray-400 flex gap-2">
                                                                <span>Base: ${prod.price?.toLocaleString()}</span>
                                                                <span className="text-gray-300">|</span>
                                                                <span>Costo: ${(productCosts[prod.id] || 0).toLocaleString()}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <button
                                                            type="button"
                                                            aria-label="Disminuir cantidad"
                                                            title="Disminuir cantidad"
                                                            onClick={() => setComboItems(prev => prev.map(i => i.child_product_id === item.child_product_id ? { ...i, quantity: Math.max(1, i.quantity - 1) } : i))}
                                                            className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-white/10"
                                                        >
                                                            -
                                                        </button>
                                                        <button
                                                            type="button"
                                                            aria-label="Aumentar cantidad"
                                                            title="Aumentar cantidad"
                                                            onClick={() => setComboItems(prev => prev.map(i => i.child_product_id === item.child_product_id ? { ...i, quantity: i.quantity + 1 } : i))}
                                                            className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-white/10"
                                                        >
                                                            +
                                                        </button>
                                                        <button
                                                            type="button"
                                                            aria-label="Eliminar componente"
                                                            title="Eliminar componente"
                                                            onClick={() => setComboItems(prev => prev.filter(i => i.child_product_id !== item.child_product_id))}
                                                            className="w-6 h-6 flex items-center justify-center rounded-full text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                                                        >
                                                            <X size={14} />
                                                        </button>
                                                    </div>
                                                </div>
                                            )
                                        })}
                                        {comboItems.length === 0 && (
                                            <div className="text-center py-6 text-gray-400 text-xs italic">
                                                No hay componentes seleccionados
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {(formData.type !== 'combo' || !categories.some(c => c.name.toLowerCase() === 'combos')) && (
                                    <Select
                                        label={formData.type === 'combo' ? "Categoría (Manual)" : "Categoría"}
                                        value={formData.category_id}
                                        onChange={e => setFormData({ ...formData, category_id: e.target.value })}
                                        options={[
                                            { value: '', label: 'Seleccionar categoría...' },
                                            ...categories.map(cat => ({ value: cat.id, label: cat.name })),
                                            // Ensure Combos option always exists visually
                                            ...(categories.some(c => c.name.toLowerCase() === 'combos')
                                                ? []
                                                : [{ value: 'system_combos', label: 'Combos' }])
                                        ]}
                                        className="!rounded-2xl"
                                    />
                                )}

                                <div className="col-span-1 md:col-span-2 w-full">
                                    <NumericInput
                                        label="Precio de Venta"
                                        required
                                        disabled={formData.type === 'combo'}
                                        startIcon={<DollarSign className="h-4 w-4 text-gray-400" />}
                                        value={formData.price}
                                        onChange={val => setFormData({ ...formData, price: val })}
                                        className={`!rounded-2xl !py-4 text-lg font-black ${formData.type === 'combo' ? 'opacity-70 bg-gray-50' : ''}`}
                                    />
                                </div>
                                {formData.type === 'combo' && (
                                    <div className="col-span-2 text-[10px] text-gray-400 italic text-center -mt-4">
                                        * El precio del combo es la suma automática de sus componentes
                                    </div>
                                )}
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-black text-gray-500 uppercase tracking-widest ml-1">Descripción (Opcional)</label>
                                <textarea
                                    className="w-full bg-gray-50 dark:bg-slate-800/50 border border-transparent focus:border-pp-gold/50 rounded-2xl p-4 text-sm font-medium outline-none ring-0 transition-all min-h-[100px] resize-none shadow-inner dark:text-white"
                                    placeholder="Describe las características del producto..."
                                    value={formData.description}
                                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                                />
                            </div>

                            <div className="space-y-4 bg-gray-50 dark:bg-slate-800/40 p-5 rounded-3xl border border-gray-100 dark:border-white/5">
                                <div className="flex items-center gap-3">
                                    <input
                                        type="checkbox"
                                        id="form-active"
                                        checked={formData.active}
                                        onChange={e => {
                                            const active = e.target.checked
                                            setFormData({ ...formData, active })
                                            if (active) {
                                                const newActivity = { ...branchActivity }
                                                branches.forEach(b => newActivity[b.id] = true)
                                                setBranchActivity(newActivity)
                                            }
                                        }}
                                        className="w-5 h-5 rounded-lg text-pp-gold focus:ring-pp-gold border-gray-300 dark:border-white/10"
                                    />
                                    <label htmlFor="form-active" className="text-sm font-black text-gray-600 dark:text-gray-300 uppercase tracking-tight cursor-pointer">
                                        Producto Activo Globalmente
                                    </label>
                                </div>

                                {!formData.active && (
                                    <div className="pt-4 border-t border-gray-200 dark:border-white/5 mt-4 animate-in slide-in-from-top-2 duration-300">
                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Seleccionar sedes activas:</p>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                            {branches.map(branch => (
                                                <div
                                                    key={branch.id}
                                                    className={`flex items-center justify-between p-3 rounded-2xl border transition-all ${branchActivity[branch.id]
                                                        ? 'bg-white dark:bg-slate-800 border-gray-100 dark:border-white/10 shadow-sm'
                                                        : 'bg-gray-100/50 dark:bg-slate-900 border-transparent opacity-60'
                                                        }`}
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <Store size={14} className={branchActivity[branch.id] ? 'text-pp-gold' : 'text-gray-400'} />
                                                        <span className="text-xs font-bold text-gray-700 dark:text-gray-300">{branch.name}</span>
                                                    </div>
                                                    <input
                                                        type="checkbox"
                                                        checked={branchActivity[branch.id] || false}
                                                        onChange={e => setBranchActivity({ ...branchActivity, [branch.id]: e.target.checked })}
                                                        aria-label={`Activo en ${branch.name}`}
                                                        className="w-4 h-4 rounded text-pp-gold focus:ring-pp-gold border-gray-300 dark:border-white/10"
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="space-y-2">
                                <div className="flex items-center gap-2 mb-2">
                                    <ImageIcon size={16} className="text-pp-gold" />
                                    <h3 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em]">Multimedia</h3>
                                </div>
                                <ImageUpload
                                    value={formData.image_url}
                                    onChange={(url) => setFormData({ ...formData, image_url: url })}
                                    folder="catalog"
                                />
                            </div>
                        </div>
                    </form>

                    {/* Right Panel: Projections & Analytics (2/5) */}
                    <div className="lg:w-2/5 border-l border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-slate-800/20 p-8 flex flex-col justify-between overflow-y-auto">
                        <div className="space-y-8">
                            <div>
                                <h3 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                                    <TrendingUp size={14} className="text-pp-gold" />
                                    Análisis Proyectado
                                </h3>

                                <div className="space-y-4">
                                    {/* Summary Card */}
                                    <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-gray-100 dark:border-white/5 shadow-sm">
                                        <div className="flex justify-between items-center mb-2">
                                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Revenue Bruto</span>
                                            <div className="bg-pp-gold/10 p-1.5 rounded-lg text-pp-gold">
                                                <DollarSign size={14} strokeWidth={3} />
                                            </div>
                                        </div>
                                        <div className="flex items-baseline gap-2">
                                            <span className="text-4xl font-black text-gray-900 dark:text-white font-mono tracking-tighter">
                                                ${formData.price.toLocaleString()}
                                            </span>
                                            <span className="text-[10px] font-black text-gray-400 uppercase">/ Unidad</span>
                                        </div>
                                    </div>

                                    {/* Margin Projection */}
                                    <div className="bg-pp-brown p-6 rounded-3xl shadow-xl shadow-pp-brown/20 relative overflow-hidden group">
                                        <div className="absolute -right-4 -top-4 opacity-5 bg-white h-24 w-24 rounded-full transition-transform group-hover:scale-150 duration-700" />
                                        <div className="flex justify-between items-center mb-2 relative z-10">
                                            <span className="text-[10px] font-black text-pp-gold uppercase tracking-widest">Utilidad Estimada</span>
                                            <Badge
                                                size="sm"
                                                className="bg-pp-gold/20 text-pp-gold border-none py-0.5 px-3 text-[10px] font-black uppercase"
                                            >
                                                Markup: {Math.round(marginPercentage)}%
                                            </Badge>
                                        </div>
                                        <div className="relative z-10 flex flex-col">
                                            <div className="flex items-baseline gap-2">
                                                <span className="text-3xl font-black text-white font-mono tracking-tighter">${Math.round(projectedMargin).toLocaleString()}</span>
                                                <span className="text-sm font-black text-pp-gold font-mono">NETO</span>
                                            </div>
                                            <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest mt-2 leading-tight">Proyección basada en costo promedio de insumos del 40%.</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Tips & Guidance */}
                            <div className="space-y-4">
                                <div className="bg-white/50 dark:bg-white/5 rounded-2xl p-4 border border-white dark:border-white/10 flex items-start gap-4">
                                    <div className="text-pp-gold mt-1 shrink-0"><CheckCircle2 size={20} /></div>
                                    <p className="text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase leading-snug tracking-tighter">
                                        Asegúrate de asignar una categoría correcta para que tu reporte de ventas por departamento sea preciso.
                                    </p>
                                </div>
                                <div className="bg-white/50 dark:bg-white/5 rounded-2xl p-4 border border-white dark:border-white/10 flex items-start gap-4">
                                    <div className="text-pp-gold mt-1 shrink-0"><Info size={20} /></div>
                                    <p className="text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase leading-snug tracking-tighter">
                                        Las imágenes de alta calidad aumentan la conversión en los canales digitales y facilitan la identificación en el POS.
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Sticky Action Footer in Sidebar */}
                        <div className="mt-8 space-y-3">
                            <Button
                                type="submit"
                                form="product-form"
                                disabled={loading}
                                className="w-full h-16 rounded-[2rem] bg-pp-gold text-pp-brown hover:bg-pp-gold/90 shadow-2xl shadow-pp-gold/20 border-none font-black uppercase tracking-widest flex items-center justify-center gap-3 transition-all hover:-translate-y-1 active:scale-95 text-lg"
                            >
                                {loading ? (
                                    <Loader2 className="h-6 w-6 animate-spin" />
                                ) : (
                                    <>
                                        <Save className="h-6 w-6" />
                                        Guardar Producto
                                    </>
                                )}
                            </Button>
                            <Button
                                onClick={onClose}
                                variant="ghost"
                                className="w-full h-12 rounded-2xl font-black uppercase tracking-widest text-gray-400 hover:text-gray-600 dark:hover:text-white"
                            >
                                Descartar
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
