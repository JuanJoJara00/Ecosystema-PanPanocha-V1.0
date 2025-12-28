'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import Button from '@/components/ui/Button'
import TableManager from './TableManager'

interface BranchFormProps {
    initialData?: any
    onSuccess: () => void
    onCancel: () => void
}

export default function BranchForm({ initialData, onSuccess, onCancel }: BranchFormProps) {
    const [loading, setLoading] = useState(false)
    const [formData, setFormData] = useState({
        name: initialData?.name || '',
        city: initialData?.city || '',
        address: initialData?.address || '',
        phone: initialData?.phone || '',
        manager_name: initialData?.manager_name || '',
        is_active: initialData?.is_active !== false
    })

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        try {
            if (initialData?.id) {
                const { error } = await supabase
                    .from('branches')
                    .update(formData)
                    .eq('id', initialData.id)
                if (error) throw error
            } else {
                const { error } = await supabase
                    .from('branches')
                    .insert([formData])
                if (error) throw error
            }
            onSuccess()
        } catch (error: any) {
            console.error('Error saving branch:', error)
            alert('Error al guardar: ' + error.message)
        } finally {
            setLoading(false)
        }
    }

    const inputClassName = "w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pp-gold focus:border-pp-gold outline-none transition-all font-sans"
    const labelClassName = "block text-sm font-bold text-gray-700 mb-1 font-display uppercase tracking-wide"

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Information */}
            <div className="space-y-4">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider border-b border-gray-100 pb-2">
                    Información Básica
                </h3>

                <div>
                    <label className={labelClassName}>Nombre de la Sede *</label>
                    <input
                        type="text"
                        required
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className={inputClassName}
                        placeholder="Ej: Sede Cerritos"
                    />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className={labelClassName}>Ciudad</label>
                        <input
                            type="text"
                            value={formData.city}
                            onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                            className={inputClassName}
                            placeholder="Pereira"
                        />
                    </div>
                    <div>
                        <label className={labelClassName}>Teléfono</label>
                        <input
                            type="text"
                            value={formData.phone}
                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                            className={inputClassName}
                        />
                    </div>
                </div>

                <div>
                    <label className={labelClassName}>Dirección</label>
                    <input
                        type="text"
                        value={formData.address}
                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                        className={inputClassName}
                    />
                </div>

                <div>
                    <label className={labelClassName}>Nombre del Encargado</label>
                    <input
                        type="text"
                        value={formData.manager_name}
                        onChange={(e) => setFormData({ ...formData, manager_name: e.target.value })}
                        className={inputClassName}
                    />
                </div>

                <div className="flex items-center gap-2 pt-2">
                    <input
                        type="checkbox"
                        id="is_active"
                        checked={formData.is_active}
                        onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                        className="h-4 w-4 text-pp-gold focus:ring-pp-gold border-gray-300 rounded"
                    />
                    <label htmlFor="is_active" className="text-sm text-gray-700 font-sans">Sede Activa</label>
                </div>
            </div>

            {/* Table Management - Only for existing branches */}
            {initialData?.id && (
                <div className="space-y-4 pt-4 border-t border-gray-200">
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider border-b border-gray-100 pb-2">
                        Gestión de Mesas
                    </h3>
                    <TableManager branchId={initialData.id} />
                </div>
            )}

            <div className="flex gap-3 pt-4 border-t mt-4">
                <Button onClick={onCancel} variant="ghost" className="flex-1">
                    Cancelar
                </Button>
                <Button type="submit" disabled={loading} className="flex-1">
                    {loading ? 'Guardando...' : 'Guardar Sede'}
                </Button>
            </div>
        </form>
    )
}
