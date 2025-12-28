'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Calendar, Truck, Clock, FileText, Hash, Mail, Phone, User, Store, DollarSign } from 'lucide-react'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import Button from '@/components/ui/Button'

interface SupplierFormProps {
    onSuccess: () => void
    onCancel: () => void
    initialSupplier?: any
}

export default function SupplierForm({ onSuccess, onCancel, initialSupplier }: SupplierFormProps) {
    const [loading, setLoading] = useState(false)
    const [formData, setFormData] = useState({
        name: initialSupplier?.name || '',
        contact_name: initialSupplier?.contact_name || '',
        email: initialSupplier?.email || '',
        phone: initialSupplier?.phone || '',
        address: initialSupplier?.address || '',
        tax_id: initialSupplier?.tax_id || '',
        payment_terms: initialSupplier?.payment_terms || 'Contado',
        category: initialSupplier?.category || 'Alimentos',
        order_day: initialSupplier?.order_day || '',
        delivery_day: initialSupplier?.delivery_day || '',
        delivery_time_days: initialSupplier?.delivery_time_days || 1,
        notes_delivery: initialSupplier?.notes_delivery || '',
        notes: initialSupplier?.notes || ''
    })

    const categories = [
        { value: 'Alimentos', label: 'Alimentos' },
        { value: 'Bebidas', label: 'Bebidas' },
        { value: 'Limpieza', label: 'Limpieza' },
        { value: 'Empaques', label: 'Empaques' },
        { value: 'Otros', label: 'Otros' }
    ]

    const paymentTermsOptions = [
        { value: 'Contado', label: 'Contado' },
        { value: '15 días', label: '15 días' },
        { value: '30 días', label: '30 días' },
        { value: '45 días', label: '45 días' },
        { value: '60 días', label: '60 días' }
    ]

    const daysOfWeek = [
        { value: 'Lunes', label: 'Lunes' },
        { value: 'Martes', label: 'Martes' },
        { value: 'Miércoles', label: 'Miércoles' },
        { value: 'Jueves', label: 'Jueves' },
        { value: 'Viernes', label: 'Viernes' },
        { value: 'Sábado', label: 'Sábado' },
        { value: 'Domingo', label: 'Domingo' }
    ]

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        try {
            const deliveryTime = parseInt(formData.delivery_time_days.toString()) || 1
            const dataToSave = {
                ...formData,
                delivery_time_days: deliveryTime
            }

            let error
            if (initialSupplier) {
                const { error: updateError } = await supabase
                    .from('suppliers')
                    .update({ ...dataToSave, updated_at: new Date().toISOString() })
                    .eq('id', initialSupplier.id)
                error = updateError
            } else {
                const { error: insertError } = await supabase
                    .from('suppliers')
                    .insert([{ ...dataToSave, active: true }])
                error = insertError
            }

            if (error) throw error
            onSuccess()
        } catch (error: any) {
            console.error('Error saving supplier:', error)
            alert('Error al guardar proveedor: ' + error.message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Basic Info */}
                <div className="md:col-span-2">
                    <Input
                        label="Nombre del Proveedor"
                        required
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        startIcon={<Store className="h-4 w-4" />}
                        placeholder="EJ: DISTRITODO S.A.S"
                    />
                </div>

                <Input
                    label="Nombre de Contacto"
                    value={formData.contact_name}
                    onChange={(e) => setFormData({ ...formData, contact_name: e.target.value })}
                    startIcon={<User className="h-4 w-4" />}
                    placeholder="Juan Pérez"
                />

                <Input
                    label="Teléfono"
                    required
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    startIcon={<Phone className="h-4 w-4" />}
                    placeholder="300 123 4567"
                />

                <Input
                    label="Email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    startIcon={<Mail className="h-4 w-4" />}
                    placeholder="ventas@proveedor.com"
                />

                <Input
                    label="NIT / Tax ID"
                    value={formData.tax_id}
                    onChange={(e) => setFormData({ ...formData, tax_id: e.target.value })}
                    startIcon={<Hash className="h-4 w-4" />}
                    placeholder="900.123.456-7"
                />

                <Select
                    label="Categoría"
                    required
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    options={categories}
                />

                <Select
                    label="Términos de Pago"
                    value={formData.payment_terms}
                    onChange={(e) => setFormData({ ...formData, payment_terms: e.target.value })}
                    options={paymentTermsOptions}
                />

                {/* Logistics Section */}
                <div className="md:col-span-2 pt-6 border-t border-gray-100">
                    <h3 className="text-sm font-bold text-pp-brown font-display uppercase tracking-wide mb-1 flex items-center gap-2">
                        <Truck className="h-4 w-4" /> Logística y Entregas
                    </h3>
                    <p className="text-xs text-gray-500 mb-4 font-medium">Configura los días de pedido y tiempos de entrega.</p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Select
                            label="Día de Pedido"
                            value={formData.order_day}
                            onChange={(e) => setFormData({ ...formData, order_day: e.target.value })}
                            options={[
                                { value: '', label: 'Cualquier día' },
                                ...daysOfWeek
                            ]}
                        />

                        <Select
                            label="Día de Entrega"
                            value={formData.delivery_day}
                            onChange={(e) => setFormData({ ...formData, delivery_day: e.target.value })}
                            options={[
                                { value: '', label: 'Variable' },
                                ...daysOfWeek
                            ]}
                        />

                        <Select
                            label="Tiempo de Entrega (Lead Time)"
                            value={formData.delivery_time_days}
                            onChange={(e) => setFormData({ ...formData, delivery_time_days: parseInt(e.target.value) })}
                            options={[
                                { value: 0, label: 'Mismo día' },
                                { value: 1, label: '1 día (Día siguiente)' },
                                { value: 2, label: '2 días' },
                                { value: 3, label: '3 días' },
                                { value: 7, label: '1 semana' }
                            ]}
                        />

                        <div className="md:col-span-2">
                            <Input
                                label="Notas de Entrega"
                                value={formData.notes_delivery}
                                onChange={(e) => setFormData({ ...formData, notes_delivery: e.target.value })}
                                startIcon={<FileText className="h-4 w-4" />}
                                placeholder="Ej: Pedido mínimo $50.000, entregar por la puerta trasera..."
                            />
                        </div>
                    </div>
                </div>

                {/* Additional Info */}
                <div className="md:col-span-2 pt-4 border-t border-gray-100 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                        <Input
                            label="Dirección Física"
                            value={formData.address}
                            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                            startIcon={<Truck className="h-4 w-4" />} // Reused truck icon or maybe MapPin if available
                            placeholder="Calle 123 #45-67"
                        />
                    </div>

                    <div className="md:col-span-2">
                        <Input
                            label="Notas Adicionales"
                            value={formData.notes}
                            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                            placeholder="Información extra sobre el proveedor..."
                        />
                    </div>
                </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-6 border-t border-gray-100 mt-4">
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
                    startIcon={initialSupplier ? <FileText className="h-4 w-4" /> : <Store className="h-4 w-4" />}
                >
                    {initialSupplier ? 'Actualizar Proveedor' : 'Crear Proveedor'}
                </Button>
            </div>
        </form>
    )
}
