'use client'


import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Loader2 } from 'lucide-react'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import Button from '@/components/ui/Button'

interface InventoryFormProps {
    onSuccess: () => void
    onCancel: () => void
    initialData?: any
}

export default function InventoryForm({ onSuccess, onCancel, initialData }: InventoryFormProps) {
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const [formData, setFormData] = useState({
        sku: '',
        name: '',
        unit: 'unidad', // This is technically 'usage_unit' usually, but let's keep it for compatibility or migrate it
        min_stock_alert: 0,
        supplier_name: '',
        // WAC Fields
        buying_unit: 'Unidad',
        usage_unit: 'Unidad',
        conversion_factor: 1
    })

    useEffect(() => {
        if (initialData) {
            setFormData({
                sku: initialData.sku || '',
                name: initialData.name || '',
                unit: initialData.unit || 'unidad',
                min_stock_alert: initialData.min_stock_alert || 0,
                supplier_name: initialData.supplier_id ? 'Provedor ID ' + initialData.supplier_id : '',
                buying_unit: initialData.buying_unit || 'Unidad',
                usage_unit: initialData.usage_unit || 'Unidad',
                conversion_factor: initialData.conversion_factor || 1
            })
            // Fetch supplier name properly if needed, but for now this enables edit
        }
    }, [initialData])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError(null)

        try {
            // Handle Supplier Logic
            let supplierId = null
            if (formData.supplier_name) {
                const { data: existingSup } = await supabase
                    .from('suppliers')
                    .select('id')
                    .ilike('name', formData.supplier_name)
                    .maybeSingle()

                if (existingSup) {
                    supplierId = existingSup.id
                } else {
                    const { data: newSup } = await supabase
                        .from('suppliers')
                        .insert({ name: formData.supplier_name })
                        .select()
                        .single()
                    if (newSup) supplierId = newSup.id
                }
            }

            const { data: newItem, error } = await supabase
                .from('inventory_items')
                .upsert([{
                    sku: formData.sku,
                    name: formData.name,
                    unit: formData.unit,
                    min_stock_alert: formData.min_stock_alert,
                    supplier_id: supplierId,
                    buying_unit: formData.buying_unit,
                    usage_unit: formData.usage_unit,
                    conversion_factor: formData.conversion_factor
                }], { onConflict: 'sku' }) // Allow update by SKU
                .select()
                .single()

            if (error) throw error

            // Handle Initial Stock (Only if creating and initial stock is set)
            if (!initialData && (formData as any).initial_stock > 0 && newItem) {
                // Get branch ID (TODO: Context)
                const { data: branches } = await supabase.from('branches').select('id').limit(1)
                const branchId = branches?.[0]?.id

                if (branchId) {
                    await supabase.from('branch_inventory').upsert({
                        branch_id: branchId,
                        item_id: newItem.id,
                        quantity: (formData as any).initial_stock,
                        last_updated: new Date().toISOString()
                    }, { onConflict: 'branch_id, item_id' })
                }
            }

            if (error) throw error

            onSuccess()
        } catch (err: any) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-4 font-sans">
            <Input
                label="Nombre del Insumo"
                placeholder="Ej: Harina de Trigo"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />

            <Input
                label="SKU (Código)"
                placeholder="Ej: PAN001"
                value={formData.sku}
                onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
            />

            <Input
                label="Proveedor"
                placeholder="Ej: La Granja SAS"
                value={formData.supplier_name}
                onChange={(e) => setFormData({ ...formData, supplier_name: e.target.value })}
            />

            <div className="grid grid-cols-2 gap-4">
                <Select
                    label="Unidad de Medida"
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    options={[
                        { value: 'unidad', label: 'Unidad' },
                        { value: 'kg', label: 'Kilogramos (kg)' },
                        { value: 'gr', label: 'Gramos (gr)' },
                        { value: 'lt', label: 'Litros (lt)' },
                        { value: 'ml', label: 'Mililitros (ml)' },
                        { value: 'paquete', label: 'Paquete' }
                    ]}
                />

                {/* WAC Configuration */}
                <div className="col-span-2 grid grid-cols-3 gap-3 bg-blue-50/50 p-4 rounded-xl border border-blue-100">
                    <div className="col-span-3 text-xs font-bold text-blue-800 uppercase tracking-wider mb-2">
                        Configuración de Unidades (WAC)
                    </div>

                    <Input
                        label="Unidad de Compra"
                        placeholder="Ej: Saco, Caja"
                        value={formData.buying_unit}
                        onChange={(e) => setFormData({ ...formData, buying_unit: e.target.value })}
                    />

                    <Input
                        label="Unidad de Uso (Receta)"
                        placeholder="Ej: Gramo, Unidad"
                        value={formData.usage_unit}
                        onChange={(e) => setFormData({ ...formData, usage_unit: e.target.value })}
                    />

                    <Input
                        label="Factor de Conversión"
                        type="number"
                        min="0.0001"
                        step="0.0001"
                        value={formData.conversion_factor}
                        onChange={(e) => setFormData({ ...formData, conversion_factor: parseFloat(e.target.value) })}
                        helperText={`1 ${formData.buying_unit || 'Compra'} = ${formData.conversion_factor} ${formData.usage_unit || 'Uso'}`}
                    />
                </div>

                <Input
                    label="Alerta Stock Bajo"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.min_stock_alert}
                    onChange={(e) => setFormData({ ...formData, min_stock_alert: parseFloat(e.target.value) })}
                />

                <Input
                    label="Costo Unitario ($)"
                    type="number"
                    min="0"
                    step="0.01"
                    value={(formData as any).unit_cost || 0}
                    onChange={(e) => setFormData({ ...formData, unit_cost: parseFloat(e.target.value) } as any)}
                />

                {!initialData && (
                    <div className="col-span-2 bg-pp-gold/10 p-4 rounded-xl border border-pp-gold/20">
                        <Input
                            label="Inventario Inicial (Stock Real)"
                            type="number"
                            min="0"
                            step="0.01"
                            value={(formData as any).initial_stock || 0}
                            onChange={(e) => setFormData({ ...formData, initial_stock: parseFloat(e.target.value) } as any)}
                            helperText="Se asignará a la primera sede encontrada."
                            className="bg-white" // Override bg to stand out inside the gold box
                        />
                    </div>
                )}
            </div>

            {error && (
                <div className="text-red-600 text-sm bg-red-50 p-3 rounded-lg flex items-center gap-2 border border-red-100">
                    <span>⚠️</span> {error}
                </div>
            )}

            <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <Button
                    type="button"
                    variant="ghost"
                    onClick={onCancel}
                    disabled={loading}
                >
                    Cancelar
                </Button>
                <Button
                    type="submit"
                    isLoading={loading}
                    disabled={loading}
                >
                    Guardar Insumo
                </Button>
            </div>
        </form>
    )
}
