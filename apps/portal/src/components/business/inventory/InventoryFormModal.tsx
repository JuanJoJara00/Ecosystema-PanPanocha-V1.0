'use client'

import React, { useState, useEffect } from 'react'
import {
    X,
    Save,
    Loader2,
    Package,
    Truck,
    Settings,
    CheckCircle2,
    AlertCircle,
    Info,
    ArrowRight,
    History,
    ChevronRight,
    AlertTriangle,
    Wand2,
    Calculator,
    DollarSign
} from 'lucide-react'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import NumericInput from '@/components/ui/NumericInput'
import Select from '@/components/ui/Select'
import ImageUpload from '@/components/ui/ImageUpload'
import Badge from '@/components/ui/Badge'
import { InventoryItem } from '@panpanocha/types'
import { appConfig } from '@/config/app-config'
import Image from 'next/image'

interface InventoryFormModalProps {
    isOpen: boolean
    onClose: () => void
    onSubmit: (data: any, branchConfigs?: any) => Promise<void>
    editingItem: InventoryItem | null
    suppliers: { id: string, name: string }[]
    branches: { id: string, name: string }[]
}

const calculateWAC = (presentation: string, content: number, unit: string) => {
    let baseUnit = 'unidad'
    let factor = 1
    if (!unit) return { buying_unit: '', conversion_factor: 1, usage_unit: 'unidad' }

    switch (unit) {
        case 'kg': baseUnit = 'g'; factor = content * 1000; break
        case 'lb': baseUnit = 'g'; factor = content * 453.59; break
        case 'g': baseUnit = 'g'; factor = content; break
        case 'l': baseUnit = 'ml'; factor = content * 1000; break
        case 'ml': baseUnit = 'ml'; factor = content; break
        case 'gal': baseUnit = 'ml'; factor = content * 3785.41; break
        case 'fl oz': baseUnit = 'ml'; factor = content * 29.5735; break
        default: baseUnit = 'unidad'; factor = content; break
    }

    return {
        buying_unit: `${presentation} ${content}${unit}`,
        conversion_factor: Math.round(factor * 100) / 100,
        usage_unit: baseUnit
    }
}

export default function InventoryFormModal({
    isOpen,
    onClose,
    onSubmit,
    editingItem,
    suppliers,
    branches
}: InventoryFormModalProps) {
    const [loading, setLoading] = useState(false)
    const [formData, setFormData] = useState({
        sku: '',
        name: '',
        supplier_id: '',
        item_type: 'raw_material',
        image_url: '',
        presentation_name: 'Unidad',
        presentation_content: 1,
        presentation_unit: 'unidad',
        presentation_cost: 0,
        unit_cost: 0,
        buying_unit: '',
        usage_unit: 'unidad',
        conversion_factor: 1
    })

    const [branchConfigs, setBranchConfigs] = useState<Record<string, { stock: number, alert: number }>>({})

    useEffect(() => {
        if (isOpen) {
            if (editingItem) {
                setFormData({
                    sku: editingItem.sku || '',
                    name: editingItem.name,
                    supplier_id: editingItem.supplier_id || '',
                    item_type: editingItem.item_type || 'raw_material',
                    image_url: editingItem.image_url || '',
                    presentation_name: 'Manual',
                    presentation_content: 1,
                    presentation_unit: editingItem.unit || 'unidad',
                    presentation_cost: (editingItem.unit_cost || 0) * (editingItem.conversion_factor || 1),
                    unit_cost: editingItem.unit_cost || 0,
                    buying_unit: editingItem.buying_unit || '',
                    usage_unit: editingItem.unit || 'unidad',
                    conversion_factor: editingItem.conversion_factor || 1
                })

                // Populate branch configs from existing branch_ingredients
                const initialConfigs: Record<string, { stock: number, alert: number }> = {}
                branches.forEach(b => {
                    const bi = editingItem.branch_ingredients?.find(i => i.branch_id === b.id) as any
                    initialConfigs[b.id] = {
                        stock: bi ? (bi.current_stock || 0) / (editingItem.conversion_factor || 1) : 0,
                        alert: bi ? (bi.min_stock_alert || 0) / (editingItem.conversion_factor || 1) : 0
                    }
                })
                setBranchConfigs(initialConfigs)
            } else {
                setFormData({
                    sku: '',
                    name: '',
                    supplier_id: '',
                    item_type: 'raw_material',
                    image_url: '',
                    presentation_name: 'Saco',
                    presentation_content: 50,
                    presentation_unit: 'kg',
                    presentation_cost: 0,
                    unit_cost: 0,
                    buying_unit: '',
                    usage_unit: 'g',
                    conversion_factor: 1
                })
                const initialConfigs: Record<string, { stock: number, alert: number }> = {}
                branches.forEach(b => initialConfigs[b.id] = { stock: 0, alert: 0 })
                setBranchConfigs(initialConfigs)
            }
        }
    }, [isOpen, editingItem, branches])

    // Auto-calculate WAC
    useEffect(() => {
        const { buying_unit, conversion_factor, usage_unit } = calculateWAC(
            formData.presentation_name,
            formData.presentation_content,
            formData.presentation_unit
        )

        let calculatedUnitCost = formData.unit_cost
        if (formData.presentation_cost > 0 && conversion_factor > 0) {
            calculatedUnitCost = Math.round((formData.presentation_cost / conversion_factor) * 100) / 100
        }

        setFormData(prev => ({
            ...prev,
            buying_unit,
            conversion_factor,
            usage_unit,
            unit_cost: calculatedUnitCost
        }))
    }, [formData.presentation_name, formData.presentation_content, formData.presentation_unit, formData.presentation_cost])

    if (!isOpen) return null

    const handleSave = async () => {
        setLoading(true)
        try {
            await onSubmit(formData, branchConfigs)
            onClose()
        } catch (error) {
            console.error('Error saving inventory item:', error)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl w-full max-w-6xl overflow-hidden flex flex-col max-h-[95vh] border border-white/20 animate-in zoom-in-95 duration-300">

                {/* Header */}
                <div className="p-8 border-b border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-slate-800/20 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-4">
                        <div className="h-16 w-16 relative flex items-center justify-center shrink-0">
                            <Image
                                src={appConfig.company.logoUrl}
                                alt="Organization Logo"
                                width={64}
                                height={64}
                                className="object-contain"
                            />
                        </div>
                        <div>
                            <h2 className="text-2xl font-black text-gray-900 dark:text-white uppercase tracking-tighter font-display leading-tight">
                                {editingItem ? 'Configurar Insumo' : 'Nuevo Insumo en Inventario'}
                            </h2>
                            <p className="text-sm font-bold text-gray-500 flex items-center gap-1.5 uppercase tracking-widest mt-0.5">
                                Abastecimiento <ArrowRight size={12} className="text-pp-gold" /> <span className="text-pp-brown dark:text-pp-gold">{formData.item_type === 'supply' ? 'Gastos / Insumos' : 'Materia Prima'}</span>
                            </p>
                        </div>
                    </div>
                    <Button variant="ghost" size="sm" onClick={onClose} className="h-12 w-12 rounded-full hover:bg-white dark:hover:bg-slate-800 transition-all">
                        <X className="h-6 w-6 text-gray-400" />
                    </Button>
                </div>

                {/* Split Content Body */}
                <div className="flex-grow flex flex-col lg:flex-row overflow-hidden">

                    {/* Left Panel: Primary Config (3/5) */}
                    <div className="lg:w-3/5 p-8 overflow-y-auto space-y-8 bg-white dark:bg-slate-900">

                        {/* Section 1: Basic Info */}
                        <div className="space-y-6">
                            <div className="flex items-center gap-2 mb-2">
                                <Package size={16} className="text-pp-gold" />
                                <h3 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em]">Información del Insumo</h3>
                            </div>

                            <div className="flex gap-6">
                                <div className="w-1/3">
                                    <ImageUpload
                                        value={formData.image_url}
                                        onChange={(url) => setFormData({ ...formData, image_url: url })}
                                        folder="inventory"
                                    />
                                </div>
                                <div className="flex-1 space-y-4">
                                    <Input
                                        label="Nombre comercial"
                                        required
                                        value={formData.name}
                                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                                        placeholder="Ej. Harina de Trigo"
                                        className="!rounded-2xl !py-3"
                                    />
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="relative">
                                            <Input
                                                label="SKU / Código"
                                                value={formData.sku}
                                                onChange={e => setFormData({ ...formData, sku: e.target.value })}
                                                placeholder="Ej. HAR-001"
                                                className="!rounded-2xl !py-3 pr-10"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setFormData({ ...formData, sku: `INS-${Math.random().toString(36).substr(2, 6).toUpperCase()}` })}
                                                className="absolute right-3 top-9 text-pp-gold hover:text-pp-brown transition-colors"
                                                title="Generar SKU automático"
                                            >
                                                <Wand2 size={16} />
                                            </button>
                                        </div>
                                        <Select
                                            label="Proveedor Habitual"
                                            value={formData.supplier_id}
                                            onChange={e => setFormData({ ...formData, supplier_id: e.target.value })}
                                            options={[
                                                { value: '', label: 'Seleccionar...' },
                                                ...suppliers.map(s => ({ value: s.id, label: s.name }))
                                            ]}
                                            className="!rounded-2xl"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Section 2: Units & Costing (Smart WAC) */}
                        <div className="space-y-6 pt-6 border-t border-gray-100 dark:border-white/5">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Calculator size={16} className="text-pp-gold" />
                                    <h3 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em]">Conversión y Costeo Intelligente</h3>
                                </div>
                                <Badge className="bg-blue-50 text-blue-600 border-none font-black text-[10px] uppercase">WAC Engine v2.0</Badge>
                            </div>

                            <div className="grid grid-cols-4 gap-4">
                                <Select
                                    label="Empaque"
                                    value={formData.presentation_name}
                                    onChange={e => setFormData({ ...formData, presentation_name: e.target.value })}
                                    options={['Saco', 'Bulto', 'Caja', 'Paquete', 'Bolsa', 'Botella', 'Galón', 'Unidad', 'Manual'].map(o => ({ value: o, label: o }))}
                                    className="!rounded-2xl"
                                />
                                <NumericInput
                                    label="Contenido"
                                    value={formData.presentation_content}
                                    onChange={val => setFormData({ ...formData, presentation_content: val })}
                                    className="!rounded-2xl"
                                />
                                <Select
                                    label="Unidad"
                                    value={formData.presentation_unit}
                                    onChange={e => setFormData({ ...formData, presentation_unit: e.target.value })}
                                    options={[
                                        { value: 'kg', label: 'Kilogramos' },
                                        { value: 'g', label: 'Gramos' },
                                        { value: 'l', label: 'Litros' },
                                        { value: 'ml', label: 'Mililitros' },
                                        { value: 'gal', label: 'Galones' },
                                        { value: 'lb', label: 'Libras' },
                                        { value: 'unidad', label: 'Unidades' },
                                    ]}
                                    className="!rounded-2xl"
                                />
                                <NumericInput
                                    label="Costo Empaque"
                                    value={formData.presentation_cost}
                                    onChange={val => setFormData({ ...formData, presentation_cost: val })}
                                    startIcon={<DollarSign className="h-4 w-4 text-pp-gold" />}
                                    className="!rounded-2xl"
                                />
                            </div>

                            <div className="bg-gray-50 dark:bg-slate-800/50 rounded-3xl p-6 border border-dashed border-gray-200 dark:border-white/10 flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="h-12 w-12 bg-white dark:bg-slate-800 rounded-xl flex items-center justify-center shadow-sm">
                                        <Truck className="text-gray-400" size={24} />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">Unidad de Compra</p>
                                        <p className="text-lg font-black text-gray-900 dark:text-white font-display uppercase">{formData.buying_unit}</p>
                                    </div>
                                </div>
                                <ArrowRight className="text-pp-gold" />
                                <div className="flex items-center gap-4 text-right">
                                    <div>
                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">Factor / Costo Unit.</p>
                                        <p className="text-lg font-black text-gray-900 dark:text-white font-display uppercase">
                                            x{formData.conversion_factor} <span className="mx-2 text-gray-300">|</span> <span className="text-pp-gold">${formData.unit_cost}</span>
                                        </p>
                                    </div>
                                    <div className="h-12 w-12 bg-pp-gold/10 rounded-xl flex items-center justify-center shadow-sm">
                                        <Calculator className="text-pp-gold" size={24} />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Section 3: Branch Config (Only on Create) */}
                        {!editingItem && (
                            <div className="space-y-6 pt-6 border-t border-gray-100 dark:border-white/5">
                                <div className="flex items-center gap-2 mb-2">
                                    <History size={16} className="text-pp-gold" />
                                    <h3 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em]">Saldos Iniciales por Sede</h3>
                                </div>
                                <div className="grid grid-cols-1 gap-4">
                                    {branches.map(branch => (
                                        <div key={branch.id} className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-gray-100 dark:border-white/5 flex items-center justify-between">
                                            <span className="text-xs font-black text-gray-600 dark:text-gray-300 uppercase truncate max-w-[120px]">{branch.name}</span>
                                            <div className="flex gap-2">
                                                <div className="relative w-24">
                                                    <span className="absolute -top-1.5 left-2 bg-white dark:bg-slate-800 px-1 text-[8px] font-black text-gray-400 uppercase z-10">Stock</span>
                                                    <NumericInput
                                                        className="!rounded-lg !py-2 !text-xs !font-bold"
                                                        value={branchConfigs[branch.id]?.stock || 0}
                                                        onChange={val => setBranchConfigs({ ...branchConfigs, [branch.id]: { ...branchConfigs[branch.id], stock: val } })}
                                                        placeholder="0"
                                                        fullWidth
                                                    />
                                                </div>
                                                <div className="relative w-24">
                                                    <span className="absolute -top-1.5 left-2 bg-white dark:bg-slate-800 px-1 text-[8px] font-black text-red-400 uppercase z-10">Min</span>
                                                    <NumericInput
                                                        className="!rounded-lg !py-2 !text-xs !font-bold"
                                                        value={branchConfigs[branch.id]?.alert || 0}
                                                        onChange={val => setBranchConfigs({ ...branchConfigs, [branch.id]: { ...branchConfigs[branch.id], alert: val } })}
                                                        placeholder="0"
                                                        fullWidth
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Right Panel: Value Summary & Compliance (2/5) */}
                    <div className="lg:w-2/5 border-l border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-slate-800/20 p-8 flex flex-col justify-between overflow-y-auto">
                        <div className="space-y-8">
                            <div>
                                <h3 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                                    <DollarSign size={14} className="text-pp-gold" />
                                    Valorización del Activo
                                </h3>

                                <div className="space-y-6">
                                    {/* Total Investment Card */}
                                    <div className="bg-pp-brown p-8 rounded-[2.5rem] shadow-2xl shadow-pp-brown/30 relative overflow-hidden group border border-white/5">
                                        <div className="absolute right-0 bottom-0 opacity-10 text-white translate-x-4 translate-y-4 transition-transform group-hover:scale-110 duration-500">
                                            <Calculator size={120} />
                                        </div>
                                        <div className="relative z-10">
                                            <span className="text-[10px] font-black text-pp-gold uppercase tracking-widest block mb-1">Inversión Total Inicial</span>
                                            <div className="flex items-baseline gap-2">
                                                <span className="text-5xl font-black text-white font-mono tracking-tighter">
                                                    ${(Object.values(branchConfigs).reduce((acc, curr) => acc + curr.stock, 0) * formData.presentation_cost).toLocaleString()}
                                                </span>
                                            </div>
                                            <div className="h-px bg-white/10 w-full my-4" />
                                            <p className="text-[10px] font-bold text-white/50 uppercase tracking-widest">
                                                Valorizado a {Object.values(branchConfigs).reduce((acc, curr) => acc + curr.stock, 0)} {formData.presentation_name}(s)
                                            </p>
                                        </div>
                                    </div>

                                    {/* SKU Consistency Check */}
                                    <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-gray-100 dark:border-white/5 shadow-sm">
                                        <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Check de Integridad</h4>
                                        <ul className="space-y-3">
                                            <li className="flex items-center gap-3 text-xs font-bold text-gray-500">
                                                <div className={formData.sku ? 'text-green-500' : 'text-gray-300'}><CheckCircle2 size={16} /></div>
                                                <span className={formData.sku ? 'text-gray-700 dark:text-white' : ''}>Control de SKU único</span>
                                            </li>
                                            <li className="flex items-center gap-3 text-xs font-bold text-gray-500">
                                                <div className={formData.presentation_cost > 0 ? 'text-green-500' : 'text-gray-300'}><CheckCircle2 size={16} /></div>
                                                <span className={formData.presentation_cost > 0 ? 'text-gray-700 dark:text-white' : ''}>Cálculo Unitario (WAC)</span>
                                            </li>
                                            <li className="flex items-center gap-3 text-xs font-bold text-gray-500">
                                                <div className={formData.image_url ? 'text-green-500' : 'text-gray-300'}><CheckCircle2 size={16} /></div>
                                                <span className={formData.image_url ? 'text-gray-700 dark:text-white' : ''}>Soporte Visual</span>
                                            </li>
                                        </ul>
                                    </div>
                                </div>
                            </div>

                            {/* Alert Box */}
                            <div className="bg-pp-gold/10 p-5 rounded-2xl border border-pp-gold/20 flex items-start gap-4">
                                <div className="text-pp-gold mt-1"><Info size={20} /></div>
                                <p className="text-[10px] font-black text-pp-brown uppercase leading-tight tracking-tight">
                                    Definir correctamente el factor de conversión es CRÍTICO para el cálculo de costos en las recetas. Un gramo mal calculado puede afectar tus márgenes.
                                </p>
                            </div>
                        </div>

                        {/* Sticky Action Footer */}
                        <div className="mt-8 pt-6 border-t border-gray-100 dark:border-white/5 space-y-3">
                            <Button
                                onClick={handleSave}
                                disabled={loading || !formData.name}
                                className="w-full h-16 rounded-[2rem] bg-pp-gold text-pp-brown hover:bg-pp-gold/90 shadow-2xl shadow-pp-gold/30 border-none font-black uppercase tracking-widest flex items-center justify-center gap-3 transition-all hover:-translate-y-1 active:scale-95 text-lg"
                            >
                                {loading ? <Loader2 className="animate-spin" /> : <><Save size={24} /> Guardar Insumo</>}
                            </Button>
                            <Button
                                onClick={onClose}
                                variant="ghost"
                                className="w-full h-12 rounded-2xl font-black uppercase tracking-widest text-gray-400 hover:text-gray-600 dark:hover:text-white"
                            >
                                Cancelar
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
