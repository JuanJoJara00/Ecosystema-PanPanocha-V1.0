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
    AlertCircle,
    Info,
    ArrowRight,
    TrendingUp
} from 'lucide-react'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import ImageUpload from '@/components/ui/ImageUpload'
import Badge from '@/components/ui/Badge'
import { Product } from '@panpanocha/types'

interface ProductFormModalProps {
    isOpen: boolean
    onClose: () => void
    onSubmit: (data: any) => Promise<void>
    editingProduct: Product | null
    categories: { id: string, name: string }[]
    initialData?: any
}

export default function ProductFormModal({
    isOpen,
    onClose,
    onSubmit,
    editingProduct,
    categories,
    initialData
}: ProductFormModalProps) {
    const [loading, setLoading] = useState(false)
    const [formData, setFormData] = useState({
        name: '',
        category_id: '',
        price: 0,
        active: true,
        image_url: '',
        description: ''
    })

    useEffect(() => {
        if (editingProduct) {
            setFormData({
                name: editingProduct.name,
                category_id: editingProduct.category_id || '',
                price: editingProduct.price || 0,
                active: editingProduct.active,
                image_url: editingProduct.image_url || '',
                description: editingProduct.description || ''
            })
        } else if (initialData) {
            setFormData({ ...formData, ...initialData })
        } else {
            setFormData({
                name: '',
                category_id: categories.length > 0 ? categories[0].id : '',
                price: 0,
                active: true,
                image_url: '',
                description: ''
            })
        }
    }, [editingProduct, isOpen, categories, initialData])

    if (!isOpen) return null

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        try {
            await onSubmit(formData)
            onClose()
        } catch (error) {
            console.error('Error submitting product:', error)
        } finally {
            setLoading(false)
        }
    }

    // Financial Projection Calculations
    // Note: In a real scenario, we might fetch avg cost. For now, it's a projection.
    const projectedCost = formData.price * 0.4 // Placeholder: 40% cost
    const projectedMargin = formData.price - projectedCost
    const marginPercentage = formData.price > 0 ? (projectedMargin / formData.price) * 100 : 0

    return (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl w-full max-w-5xl overflow-hidden flex flex-col max-h-[90vh] border border-white/20 animate-in zoom-in-95 duration-300">

                {/* Header */}
                <div className="p-8 border-b border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-slate-800/20 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-4">
                        <div className="bg-pp-gold h-14 w-14 rounded-2xl flex items-center justify-center shadow-lg shadow-pp-gold/20">
                            <Package className="h-8 w-8 text-pp-brown" />
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

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <Select
                                    label="Categoría"
                                    value={formData.category_id}
                                    onChange={e => setFormData({ ...formData, category_id: e.target.value })}
                                    options={[
                                        { value: '', label: 'Seleccionar categoría...' },
                                        ...categories.map(cat => ({ value: cat.id, label: cat.name }))
                                    ]}
                                    className="!rounded-2xl"
                                />

                                <Input
                                    label="Precio de Venta"
                                    type="number"
                                    min="0"
                                    required
                                    startIcon={<DollarSign className="h-4 w-4 text-gray-400" />}
                                    value={formData.price}
                                    onChange={e => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                                    className="!rounded-2xl !py-4"
                                />
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

                            <div className="flex items-center gap-3 bg-gray-50 dark:bg-slate-800/40 p-4 rounded-2xl border border-gray-100 dark:border-white/5">
                                <input
                                    type="checkbox"
                                    id="form-active"
                                    checked={formData.active}
                                    onChange={e => setFormData({ ...formData, active: e.target.checked })}
                                    className="w-5 h-5 rounded-lg text-pp-gold focus:ring-pp-gold border-gray-300 dark:border-white/10"
                                />
                                <label htmlFor="form-active" className="text-sm font-black text-gray-600 dark:text-gray-300 uppercase tracking-tight cursor-pointer">
                                    Producto Activo Globalmente
                                </label>
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
