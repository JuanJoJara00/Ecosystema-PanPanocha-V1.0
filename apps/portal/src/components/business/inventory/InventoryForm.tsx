'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Loader2, Calculator, Wand2 } from 'lucide-react'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import Button from '@/components/ui/Button'
import NumericInput from '@/components/ui/NumericInput'
import ImageUpload from '@/components/ui/ImageUpload'

interface InventoryFormProps {
    onSuccess: () => void
    onCancel: () => void
    initialData?: any
    branches?: any[] // Optional prop to avoid re-fetching
}

// Helper to calculate WAC values
const calculateWAC = (presentation: string, content: number, unit: string) => {
    let baseUnit = 'unidad'
    let factor = 1

    if (!unit) return { buying_unit: '', conversion_factor: 1, usage_unit: 'unidad' }

    switch (unit) {
        case 'kg':
            baseUnit = 'g'
            factor = content * 1000
            break
        case 'lb':
            baseUnit = 'g'
            factor = content * 453.59
            break
        case 'g':
            baseUnit = 'g'
            factor = content
            break
        case 'l':
            baseUnit = 'ml'
            factor = content * 1000
            break
        case 'ml':
            baseUnit = 'ml'
            factor = content
            break
        case 'gal':
            baseUnit = 'ml'
            factor = content * 3785.41
            break
        case 'fl oz':
            baseUnit = 'ml'
            factor = content * 29.5735
            break
        default:
            baseUnit = 'unidad'
            factor = content
            break
    }

    return {
        buying_unit: `${presentation} ${content}${unit}`,
        conversion_factor: Math.round(factor * 100) / 100, // Round to 2 decimals
        usage_unit: baseUnit
    }
}

export default function InventoryForm({ onSuccess, onCancel, initialData, branches: branchesProp }: InventoryFormProps) {
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    // Form Stats
    const [formData, setFormData] = useState({
        sku: '',
        name: '',
        supplier_id: '',
        item_type: 'raw_material',
        image_url: '',
        min_stock_alert: 0, // Deprecated in favor of per-branch
        unit_cost: 0,

        // Smart Unit Inputs
        presentation_name: 'Unidad', // e.g. "Saco", "Caja"
        presentation_content: 1,     // e.g. 50
        presentation_unit: 'unidad', // e.g. "kg"
        presentation_cost: 0, // NEW: Cost of the full package

        // Calculated WAC Fields (Read-only predominantly)
        buying_unit: 'Unidad',
        usage_unit: 'unidad',
        conversion_factor: 1,
    })

    const [organizationId, setOrganizationId] = useState<string | null>(null)
    const [localBranches, setLocalBranches] = useState<any[]>([])

    const effectiveBranches = branchesProp || localBranches

    // Map of BranchID -> Config { stock, alert }
    // Stock and Alert are in PRESENTATION UNITS (e.g. 2 Sacks)
    const [branchConfigMap, setBranchConfigMap] = useState<Record<string, { stock: number, alert: number }>>({})
    const [suppliers, setSuppliers] = useState<any[]>([])

    // Load Branches & Organization on Mount
    useEffect(() => {
        const initializeMap = (list: any[]) => {
            const initialMap: Record<string, { stock: number, alert: number }> = {}
            list.forEach((b: any) => {
                initialMap[b.id] = { stock: 0, alert: 0 }
            })
            setBranchConfigMap(initialMap)
        }

        const fetchContext = async () => {
            // 1. Get User & Organization
            const { data: { user } } = await supabase.auth.getUser()
            if (user) {
                const { data: profile } = await supabase
                    .from('users')
                    .select('organization_id')
                    .eq('id', user.id)
                    .single()

                if (profile?.organization_id) {
                    setOrganizationId(profile.organization_id)
                }
            }

            // 2. Fetch Branches ONLY if not provided
            if (!branchesProp || branchesProp.length === 0) {
                const { data } = await supabase.from('branches').select('id, name').order('name')
                if (data) {
                    setLocalBranches(data)
                    initializeMap(data)
                }
            } else {
                initializeMap(branchesProp)
            }
        }

        const fetchSuppliers = async () => {
            const { data } = await supabase.from('suppliers').select('id, name').order('name')
            if (data) setSuppliers(data)
        }

        fetchContext()
        fetchSuppliers()
    }, [branchesProp])

    // Auto-calculate WAC & Cost when inputs change
    useEffect(() => {
        const { buying_unit, conversion_factor, usage_unit } = calculateWAC(
            formData.presentation_name,
            formData.presentation_content,
            formData.presentation_unit
        )

        // Calculate Unit Cost (Cost per usage unit)
        // If Presentation Cost is > 0, calculate. Otherwise keep existing or 0.
        let calculatedUnitCost = formData.unit_cost
        if (formData.presentation_cost > 0 && conversion_factor > 0) {
            calculatedUnitCost = formData.presentation_cost / conversion_factor
            calculatedUnitCost = Math.round(calculatedUnitCost * 100) / 100 // Round 2 decimals
        }

        setFormData(prev => ({
            ...prev,
            buying_unit,
            conversion_factor,
            usage_unit,
            unit_cost: calculatedUnitCost
        }))
    }, [formData.presentation_name, formData.presentation_content, formData.presentation_unit, formData.presentation_cost])


    // Helper to parse "Bulto 10kg" back to { name: "Bulto", content: 10, unit: "kg" }
    const parseBuyingUnit = (buyingUnitStr: string) => {
        // Regex to match "Name ContentUnit" (e.g. "Saco 50kg" or "Botella 1l")
        // Tries to overlap space between name and content
        // Example: "Bulto 10kg" -> ["Bulto", "10", "kg"]
        const regex = /^(.+?)\s+(\d+(\.\d+)?)\s*([a-zA-Z\s]+)$/
        const match = buyingUnitStr?.match(regex)

        if (match) {
            return {
                name: match[1], // e.g. "Bulto"
                content: parseFloat(match[2]), // e.g. 10
                unit: match[4] // e.g. "kg"
            }
        }
        return null // Fallback
    }

    useEffect(() => {
        if (initialData) {
            // Restore Presentation Data
            const buyingUnitStr = initialData.buying_unit || ''
            const parsed = parseBuyingUnit(buyingUnitStr)

            const presentationName = parsed ? parsed.name : 'Manual'
            const presentationContent = parsed ? parsed.content : 1
            const presentationUnit = parsed ? parsed.unit : 'unidad'

            // Re-Calculate Presentation Cost
            // Unit Cost = Pres Cost / Factor  =>  Pres Cost = Unit Cost * Factor
            const conversionFactor = initialData.conversion_factor || 1
            const unitCost = initialData.unit_cost || 0
            const presentationCost = Math.round((unitCost * conversionFactor) * 100) / 100

            setFormData(prev => ({
                ...prev,
                sku: initialData.sku || '',
                name: initialData.name || '',
                supplier_id: initialData.supplier_id || '',
                item_type: initialData.item_type || 'raw_material',
                image_url: initialData.image_url || '',
                min_stock_alert: 0,
                unit_cost: unitCost,

                buying_unit: buyingUnitStr,
                usage_unit: initialData.usage_unit || 'unidad',
                conversion_factor: conversionFactor,

                // Restored Smart Inputs
                presentation_name: presentationName,
                presentation_content: presentationContent,
                presentation_unit: presentationUnit,
                presentation_cost: presentationCost
            }))
        }
    }, [initialData])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError(null)

        if (!organizationId) {
            setError("No se pudo identificar la organización. Recarga la página.")
            setLoading(false)
            return
        }

        try {
            const payload = {
                organization_id: organizationId,
                sku: formData.sku,
                name: formData.name,
                supplier_id: formData.supplier_id || null,
                item_type: formData.item_type,
                image_url: formData.image_url,
                unit: formData.usage_unit, // Enforce Base Unit as the main unit
                min_stock_alert: 0, // Deprecated at item level, moved to branch_ingredients
                unit_cost: formData.unit_cost,

                buying_unit: formData.buying_unit,
                usage_unit: formData.usage_unit,
                conversion_factor: formData.conversion_factor
            }

            const { data: newItem, error } = await supabase
                .from('inventory_items')
                .upsert([initialData ? { ...payload, id: initialData.id } : payload], { onConflict: 'sku' })
                .select()
                .single()

            if (error) throw error

            // Update Stock if New (Multi-Branch Logic)
            if (!initialData && newItem) {
                const stockPromises = effectiveBranches.map(async (branch) => {
                    const config = branchConfigMap[branch.id] || { stock: 0, alert: 0 }

                    // Convert Presentation Qty (e.g. 2 Sacos) to Usage Qty (e.g. 100,000g)
                    const finalStock = config.stock * formData.conversion_factor
                    const finalAlert = config.alert * formData.conversion_factor

                    // 1. Upsert Stock Record with Alert
                    await supabase.from('branch_ingredients').upsert({
                        branch_id: branch.id,
                        ingredient_id: newItem.id,
                        current_stock: finalStock,
                        min_stock_alert: finalAlert, // Save per-branch alert
                        last_updated: new Date().toISOString()
                    }, { onConflict: 'branch_id,ingredient_id' })

                    // 2. Log Movement if stock > 0 (Traceability)
                    if (finalStock > 0) {
                        await supabase.from('inventory_movements').insert({
                            organization_id: organizationId, // Also add org context to movements
                            ingredient_id: newItem.id,
                            branch_id: branch.id,
                            movement_type: 'adjustment',
                            quantity: finalStock,
                            reason: `Carga Inicial: ${config.stock} ${formData.presentation_name}(s) en ${branch.name}`,
                            created_at: new Date().toISOString()
                        })
                    }
                })

                await Promise.all(stockPromises)
            }

            onSuccess()
        } catch (err: any) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-6 font-sans">

            <div className="flex gap-6">
                {/* Left Col: Image */}
                <div className="w-1/3 max-w-[200px] flex flex-col gap-2">
                    <div className="aspect-square w-full">
                        <ImageUpload
                            value={formData.image_url}
                            onChange={(url) => setFormData({ ...formData, image_url: url })}
                            folder="inventory"
                        />
                    </div>
                </div>

                {/* Right Col: Basic Info */}
                <div className="flex-1 space-y-5">
                    <Input
                        label="Nombre del Insumo"
                        placeholder="Ej: Harina de Trigo"
                        required
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="h-11 text-base"
                    />

                    <div className="grid grid-cols-12 gap-5">
                        <div className="col-span-12 relative">
                            <Input
                                label="SKU (Código)"
                                placeholder="Ej: HAR-001"
                                value={formData.sku}
                                onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                                className="h-11 text-base pr-10"
                            />
                            <button
                                type="button"
                                onClick={() => {
                                    const prefix = formData.name ? formData.name.substring(0, 3).toUpperCase() : 'INS'
                                    const random = Math.floor(1000 + Math.random() * 9000)
                                    setFormData({ ...formData, sku: `${prefix}-${random}` })
                                }}
                                className="absolute right-2 top-[34px] text-pp-gold hover:text-pp-brown transition-colors p-1"
                                title="Generar SKU Automático"
                            >
                                <Wand2 size={18} />
                            </button>
                        </div>

                        <div className="col-span-6">
                            <Select
                                label="Tipo de Item"
                                value={formData.item_type}
                                onChange={(e) => setFormData({ ...formData, item_type: e.target.value })}
                                options={[
                                    { value: 'raw_material', label: 'Materia Prima' },
                                    { value: 'supply', label: 'Insumo' }
                                ]}
                                className="h-11 text-base"
                            />
                        </div>

                        <div className="col-span-6">
                            <Select
                                label="Proveedor"
                                value={formData.supplier_id || ''}
                                onChange={(e) => setFormData({ ...formData, supplier_id: e.target.value })}
                                options={[
                                    { value: '', label: 'Seleccionar...' },
                                    ...suppliers.map(s => ({ value: s.id, label: s.name }))
                                ]}
                                className="h-11 text-base"
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* CONFIGURATION & ALERTS CARD */}
            <div className="bg-gray-50 rounded-2xl p-5 border border-gray-100 space-y-6 shadow-sm">
                <div className="flex items-center justify-between border-b border-gray-200 pb-2">
                    <div className="flex items-center gap-2 text-xs font-bold text-gray-400 uppercase tracking-widest">
                        <span>⚙️ Configuración & Alertas</span>
                    </div>
                </div>

                {initialData ? (
                    // EDIT MODE - READ ONLY CARD only shows specific fixed info
                    <div className="grid grid-cols-2 gap-y-6 gap-x-12">
                        {/* 1. Buying Unit */}
                        <div>
                            <p className="text-[10px] text-gray-400 font-bold uppercase mb-1.5 ml-0.5">Unidad de Compra</p>
                            <div className="text-sm font-bold text-gray-700 bg-white inline-flex px-3 py-2 rounded-lg border border-gray-200 shadow-sm items-center gap-2 min-w-[120px]">
                                {formData.buying_unit || '-'}
                            </div>
                        </div>

                        {/* 2. Conversion Factor */}
                        <div>
                            <p className="text-[10px] text-gray-400 font-bold uppercase mb-1.5 ml-0.5">Factor Conv.</p>
                            <div className="text-sm font-medium text-gray-500 font-mono flex items-center gap-1 mt-1">
                                <span className="bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded text-xs font-bold">x</span>
                                {formData.conversion_factor ? formData.conversion_factor.toLocaleString() : 1}
                            </div>
                        </div>
                    </div>
                ) : (
                    // CREATE MODE - INPUTS INTEGRATED
                    <div className="space-y-6">
                        {/* Top: Inputs Grid - Integrated 4 columns (Stock Alert moved out) */}
                        <div className="grid grid-cols-12 gap-3 items-end">
                            <div className="col-span-3">
                                <Select
                                    label="Formato"
                                    value={formData.presentation_name}
                                    onChange={(e) => setFormData({ ...formData, presentation_name: e.target.value })}
                                    options={[
                                        { value: 'Saco', label: 'Saco' },
                                        { value: 'Bulto', label: 'Bulto' },
                                        { value: 'Caja', label: 'Caja' },
                                        { value: 'Paquete', label: 'Paquete' },
                                        { value: 'Bolsa', label: 'Bolsa' },
                                        { value: 'Botella', label: 'Botella' },
                                        { value: 'Galón', label: 'Galón' },
                                        { value: 'Bidón', label: 'Bidón' },
                                        { value: 'Docena', label: 'Docena' },
                                        { value: 'Unidad', label: 'Unidad' },
                                        { value: 'Manual', label: 'Otro / Manual' }
                                    ]}
                                    className="h-10 text-sm"
                                />
                            </div>
                            <div className="col-span-3">
                                <NumericInput
                                    label="Contenido"
                                    value={formData.presentation_content}
                                    onChange={val => setFormData({ ...formData, presentation_content: val })}
                                    className="h-10 text-sm"
                                    placeholder="0"
                                />
                            </div>
                            <div className="col-span-3">
                                <Select
                                    label="Medida"
                                    value={formData.presentation_unit}
                                    onChange={(e) => setFormData({ ...formData, presentation_unit: e.target.value })}
                                    options={[
                                        { value: 'kg', label: 'Kg' },
                                        { value: 'g', label: 'Gramos' },
                                        { value: 'l', label: 'Litros' },
                                        { value: 'ml', label: 'Mililitros' },
                                        { value: 'gal', label: 'Galón' },
                                        { value: 'lb', label: 'Libras' },
                                        { value: 'fl oz', label: 'Onzas' },
                                        { value: 'unidad', label: 'Unidad' }
                                    ]}
                                    className="h-10 text-sm"
                                />
                            </div>

                            <div className="col-span-3">
                                <NumericInput
                                    label="Costo Inicial ($)"
                                    value={formData.presentation_cost}
                                    onChange={val => setFormData({ ...formData, presentation_cost: val })}
                                    className="font-bold text-gray-900 h-10 pill text-base"
                                    startIcon={<span className="text-gray-400 text-xs">$</span>}
                                    placeholder="0"
                                />
                            </div>
                        </div>

                        {/* Middle: Calculated Preview Bar */}
                        <div className="flex items-center justify-between text-xs bg-white p-3 rounded-xl border border-gray-200 text-gray-600 shadow-sm">
                            <div className="flex flex-col gap-0.5">
                                <span className="text-[10px] uppercase font-bold text-gray-400">Compra como</span>
                                <span className="font-bold text-gray-800">{formData.buying_unit}</span>
                            </div>
                            <div className="h-6 w-px bg-gray-100 mx-2"></div>
                            <div className="flex flex-col gap-0.5">
                                <span className="text-[10px] uppercase font-bold text-gray-400">Factor</span>
                                <span className="font-mono text-gray-500">x{formData.conversion_factor?.toLocaleString()}</span>
                            </div>
                            <div className="h-6 w-px bg-gray-100 mx-2"></div>
                            <div className="flex flex-col gap-0.5">
                                <span className="text-[10px] uppercase font-bold text-gray-400">Costo Unitario</span>
                                <span className="font-mono font-bold text-green-600 text-sm">
                                    ${formData.unit_cost?.toLocaleString()} <span className="text-[10px] text-gray-400">/{formData.usage_unit}</span>
                                </span>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* INITIAL STOCK TABLE (Create Mode Only) */}
            {!initialData && effectiveBranches.length > 0 && (
                <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                    <h4 className="text-sm font-bold text-pp-brown mb-5 flex items-center gap-2 uppercase tracking-widest border-b border-gray-100 pb-3">
                        🏭 Saldos Iniciales & Alertas (Opcional)
                    </h4>

                    <div className="grid grid-cols-12 gap-4 mb-2 px-2 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                        <div className="col-span-4 pl-2">Sede</div>
                        <div className="col-span-4 text-center">Stock Inicial</div>
                        <div className="col-span-4 text-center">Alerta Mínima</div>
                    </div>

                    <div className="max-h-64 overflow-y-auto pr-2 space-y-3">
                        {effectiveBranches.map(branch => (
                            <div key={branch.id} className="grid grid-cols-12 gap-4 items-center p-3 rounded-xl bg-gray-50/50 hover:bg-white border border-transparent hover:border-gray-200 transition-all shadow-sm group">
                                <span className="col-span-4 text-base text-gray-800 font-bold truncate group-hover:text-black pl-2" title={branch.name}>
                                    {branch.name}
                                </span>

                                <div className="col-span-4 flex items-center justify-center gap-2">
                                    <NumericInput
                                        placeholder="0"
                                        value={branchConfigMap[branch.id]?.stock || 0}
                                        onChange={val => setBranchConfigMap(prev => ({
                                            ...prev,
                                            [branch.id]: {
                                                ...prev[branch.id],
                                                stock: val
                                            }
                                        }))}
                                        className="!text-center !font-mono !w-24 !h-11 !text-lg !font-bold !bg-white"
                                    />
                                    <span className="text-[10px] font-bold text-gray-400 uppercase hidden sm:inline-block">
                                        {formData.presentation_name || 'Unid'}
                                    </span>
                                </div>

                                <div className="col-span-4 flex items-center justify-center gap-2">
                                    <NumericInput
                                        placeholder="0"
                                        value={branchConfigMap[branch.id]?.alert || 0}
                                        onChange={val => setBranchConfigMap(prev => ({
                                            ...prev,
                                            [branch.id]: {
                                                ...prev[branch.id],
                                                alert: val
                                            }
                                        }))}
                                        className="!text-center !font-mono !w-24 !h-11 !text-lg !font-bold !border-red-100 focus:!border-red-500 !text-red-800 !bg-white"
                                    />
                                    <span className="text-[10px] font-bold text-red-300 uppercase hidden sm:inline-block">Min</span>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="mt-5 pt-4 border-t border-gray-100 flex justify-between items-center text-sm">
                        <div className="text-gray-500">
                            <span className="mr-2">Total Estimado en Inventario:</span>
                            <span className="font-black text-gray-900 text-lg">
                                ${(Object.values(branchConfigMap).reduce((acc, curr) => acc + curr.stock, 0) * formData.conversion_factor * formData.unit_cost).toLocaleString()}
                            </span>
                        </div>
                    </div>
                </div>
            )}

            {error && (
                <div className="text-red-700 text-sm bg-red-50 p-4 rounded-lg border border-red-200 font-medium">
                    {error}
                </div>
            )}

            <div className="flex justify-end gap-3 pt-6 border-t border-gray-100">
                <Button type="button" variant="ghost" onClick={onCancel} disabled={loading} className="px-6 h-12 text-gray-500 font-bold hover:bg-gray-100">
                    Cancelar
                </Button>
                <Button type="submit" isLoading={loading} className="px-8 h-12 bg-pp-gold text-pp-brown hover:bg-pp-gold/90 font-bold text-base shadow-lg shadow-pp-gold/20">
                    Guardar Insumo
                </Button>
            </div>
        </form >
    )
}
