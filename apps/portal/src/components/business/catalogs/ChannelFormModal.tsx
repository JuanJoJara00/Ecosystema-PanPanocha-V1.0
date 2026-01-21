'use client'

import React, { useState, useEffect } from 'react'
import { Globe, Save, X, AlertCircle } from 'lucide-react'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'

interface ChannelFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (channel: any) => Promise<void>;
    initialData?: {
        id?: string;
        name: string;
        type: string;
        is_active: boolean;
    } | null;
}

export default function ChannelFormModal({
    isOpen,
    onClose,
    onSave,
    initialData
}: ChannelFormModalProps) {
    const [formData, setFormData] = useState({
        name: '',
        type: 'retail',
        is_active: true
    })
    const [saving, setSaving] = useState(false)

    useEffect(() => {
        if (initialData) {
            setFormData({
                name: initialData.name,
                type: initialData.type,
                is_active: initialData.is_active
            })
        } else {
            setFormData({
                name: '',
                type: 'retail',
                is_active: true
            })
        }
    }, [initialData, isOpen])

    if (!isOpen) return null

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setSaving(true)
        try {
            await onSave(formData)
            onClose()
        } catch (error) {
            console.error('Error saving channel:', error)
        } finally {
            setSaving(false)
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
            <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col">
                {/* Header */}
                <div className="p-8 pb-6 border-b border-gray-100 dark:border-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-pp-gold/10 rounded-2xl text-pp-gold">
                            <Globe size={24} />
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tight">
                                {initialData ? 'Editar Canal' : 'Nuevo Canal'}
                            </h2>
                            <p className="text-xs text-gray-500 font-medium">
                                Define cómo se agrupan tus precios
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
                        type="button"
                        title="Cerrar modal"
                        aria-label="Cerrar modal"
                    >
                        <X size={20} className="text-gray-400" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="flex-1 flex flex-col">
                    <div className="p-8 space-y-6">
                        <Input
                            label="Nombre del canal"
                            required
                            placeholder="Ej. Rappi Cerritos, Venta Local..."
                            value={formData.name}
                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                            className="text-lg font-bold"
                            fullWidth
                        />

                        <Select
                            label="Tipo de Canal"
                            required
                            value={formData.type}
                            onChange={e => setFormData({ ...formData, type: e.target.value })}
                            options={[
                                { value: 'retail', label: 'Retail / POS Presencial' },
                                { value: 'delivery', label: 'Domicilios (Rappi/Propio)' },
                                { value: 'wholesale', label: 'Venta al por Mayor' },
                                { value: 'ecommerce', label: 'E-commerce / Web' }
                            ]}
                            fullWidth
                        />

                        <div className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-white/5 rounded-2xl border border-gray-100 dark:border-white/5 cursor-pointer" onClick={() => setFormData({ ...formData, is_active: !formData.is_active })}>
                            <input
                                type="checkbox"
                                id="channel-active"
                                checked={formData.is_active}
                                onChange={e => setFormData({ ...formData, is_active: e.target.checked })}
                                className="w-5 h-5 rounded-lg text-pp-gold focus:ring-pp-gold border-gray-300"
                            />
                            <label htmlFor="channel-active" className="text-sm font-black text-gray-600 dark:text-gray-300 uppercase tracking-tight cursor-pointer">
                                Canal Activo y Visible
                            </label>
                        </div>
                    </div>

                    <div className="p-6 border-t border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-white/5 flex justify-end gap-3">
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={onClose}
                            className="rounded-xl font-bold text-gray-500"
                        >
                            Cancelar
                        </Button>
                        <Button
                            type="submit"
                            disabled={saving}
                            className="bg-pp-gold text-white shadow-lg shadow-pp-gold/20 rounded-xl px-8"
                        >
                            {saving ? 'Guardando...' : initialData ? 'Actualizar' : 'Crear Canal'}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    )
}
