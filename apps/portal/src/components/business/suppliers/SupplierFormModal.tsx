'use client'

import React, { useState, useEffect } from 'react'
import {
    X,
    Save,
    Loader2,
    Truck,
    User,
    Mail,
    Phone,
    Hash,
    MapPin,
    CreditCard,
    Calendar,
    Clock,
    FileText,
    Settings,
    ShieldCheck,
    AlertCircle,
    Info,
    ArrowRight,
    Search
} from 'lucide-react'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import Badge from '@/components/ui/Badge'
import { Supplier } from '@panpanocha/types'
import { appConfig } from '@/config/app-config'
import Image from 'next/image'

interface SupplierFormModalProps {
    isOpen: boolean
    onClose: () => void
    onSubmit: (data: any) => Promise<void>
    editingSupplier: Supplier | null
}

export default function SupplierFormModal({
    isOpen,
    onClose,
    onSubmit,
    editingSupplier
}: SupplierFormModalProps) {
    const [loading, setLoading] = useState(false)
    const [formData, setFormData] = useState({
        name: '',
        contact_name: '',
        email: '',
        phone: '',
        address: '',
        tax_id: '',
        payment_terms: 'Contado',
        category: 'Alimentos',
        order_day: '',
        delivery_day: '',
        delivery_time_days: 1,
        notes_delivery: '',
        notes: ''
    })

    useEffect(() => {
        if (isOpen && editingSupplier) {
            setFormData({
                name: editingSupplier.name || '',
                contact_name: editingSupplier.contact_name || '',
                email: editingSupplier.email || '',
                phone: editingSupplier.phone || '',
                address: editingSupplier.address || '',
                tax_id: editingSupplier.tax_id || '',
                payment_terms: editingSupplier.payment_terms || 'Contado',
                category: editingSupplier.category || 'Alimentos',
                order_day: editingSupplier.order_day || '',
                delivery_day: editingSupplier.delivery_day || '',
                delivery_time_days: editingSupplier.delivery_time_days || 1,
                notes_delivery: editingSupplier.notes_delivery || '',
                notes: editingSupplier.notes || ''
            })
        } else if (isOpen) {
            setFormData({
                name: '',
                contact_name: '',
                email: '',
                phone: '',
                address: '',
                tax_id: '',
                payment_terms: 'Contado',
                category: 'Alimentos',
                order_day: '',
                delivery_day: '',
                delivery_time_days: 1,
                notes_delivery: '',
                notes: ''
            })
        }
    }, [isOpen, editingSupplier])

    if (!isOpen) return null

    const handleSave = async (e?: React.FormEvent) => {
        if (e) e.preventDefault()
        setLoading(true)
        try {
            await onSubmit(formData)
            onClose()
        } catch (error) {
            console.error('Error saving supplier:', error)
        } finally {
            setLoading(false)
        }
    }

    const categories = [
        { value: 'Alimentos', label: 'Alimentos' },
        { value: 'Bebidas', label: 'Bebidas' },
        { value: 'Limpieza', label: 'Limpieza' },
        { value: 'Empaques', label: 'Empaques' },
        { value: 'Otros', label: 'Otros' }
    ]

    const paymentTermsOptions = [
        { value: 'Contado', label: 'Contado (Inmediato)' },
        { value: '15 días', label: 'Crédito 15 días' },
        { value: '30 días', label: 'Crédito 30 días' },
        { value: '45 días', label: 'Crédito 45 días' },
        { value: '60 días', label: 'Crédito 60 días' }
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
                                {editingSupplier ? 'Configurar Proveedor' : 'Vincular Nuevo Proveedor'}
                            </h2>
                            <p className="text-sm font-bold text-gray-500 flex items-center gap-1.5 uppercase tracking-widest mt-0.5">
                                Cadena de Suministro <ArrowRight size={12} className="text-pp-gold" /> <span className="text-pp-brown dark:text-pp-gold">{formData.category}</span>
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
                    <div className="lg:w-3/5 p-10 overflow-y-auto space-y-10 bg-white dark:bg-slate-900 custom-scrollbar">

                        {/* Section 1: Identity */}
                        <div className="space-y-6">
                            <div className="flex items-center gap-2 mb-2">
                                <ShieldCheck size={16} className="text-pp-gold" />
                                <h3 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em]">Identidad y Contacto</h3>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="md:col-span-2">
                                    <Input
                                        label="Nombre Legal / Razón Social"
                                        required
                                        value={formData.name}
                                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                                        placeholder="Ej. DISTRIBUIDORA NACIONAL S.A.S"
                                        startIcon={<Truck size={18} className="text-pp-gold" />}
                                        className="!rounded-2xl !py-4"
                                    />
                                </div>
                                <Input
                                    label="NIT / Tax ID"
                                    value={formData.tax_id}
                                    onChange={e => setFormData({ ...formData, tax_id: e.target.value })}
                                    placeholder="900.000.000-0"
                                    startIcon={<Hash size={18} className="text-gray-400" />}
                                    className="!rounded-2xl !py-3"
                                />
                                <Select
                                    label="Categoría de Insumos"
                                    value={formData.category}
                                    onChange={e => setFormData({ ...formData, category: e.target.value })}
                                    options={categories}
                                    className="!rounded-2xl"
                                />
                                <Input
                                    label="Persona de Contacto"
                                    value={formData.contact_name}
                                    onChange={e => setFormData({ ...formData, contact_name: e.target.value })}
                                    placeholder="Nombre del ejecutivo"
                                    startIcon={<User size={18} className="text-gray-400" />}
                                    className="!rounded-2xl !py-3"
                                />
                                <Input
                                    label="Teléfono Directo"
                                    required
                                    value={formData.phone}
                                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                    placeholder="+57 300 000 0000"
                                    startIcon={<Phone size={18} className="text-gray-400" />}
                                    className="!rounded-2xl !py-3"
                                />
                                <div className="md:col-span-2">
                                    <Input
                                        label="Email de Pedidos"
                                        type="email"
                                        value={formData.email}
                                        onChange={e => setFormData({ ...formData, email: e.target.value })}
                                        placeholder="pedidos@proveedor.com"
                                        startIcon={<Mail size={18} className="text-gray-400" />}
                                        className="!rounded-2xl !py-3"
                                    />
                                </div>
                                <div className="md:col-span-2">
                                    <Input
                                        label="Dirección de Despacho"
                                        value={formData.address}
                                        onChange={e => setFormData({ ...formData, address: e.target.value })}
                                        placeholder="Calle, Ciudad, Bodega..."
                                        startIcon={<MapPin size={18} className="text-gray-400" />}
                                        className="!rounded-2xl !py-3"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Section 2: Logistics & Operations */}
                        <div className="space-y-6 pt-10 border-t border-gray-100 dark:border-white/5">
                            <div className="flex items-center gap-2 mb-2">
                                <Clock size={16} className="text-pp-gold" />
                                <h3 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em]">Logística & Operaciones</h3>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <Select
                                    label="Día de Toma de Pedido"
                                    value={formData.order_day}
                                    onChange={e => setFormData({ ...formData, order_day: e.target.value })}
                                    options={[{ value: '', label: 'Cualquier día' }, ...daysOfWeek]}
                                    className="!rounded-2xl"
                                />
                                <Select
                                    label="Día de Entrega Estimado"
                                    value={formData.delivery_day}
                                    onChange={e => setFormData({ ...formData, delivery_day: e.target.value })}
                                    options={[{ value: '', label: 'Variable' }, ...daysOfWeek]}
                                    className="!rounded-2xl"
                                />
                                <Select
                                    label="Lead Time (Días de espera)"
                                    value={formData.delivery_time_days}
                                    onChange={e => setFormData({ ...formData, delivery_time_days: parseInt(e.target.value) })}
                                    options={[
                                        { value: 0, label: 'Mismo día' },
                                        { value: 1, label: '1 día' },
                                        { value: 2, label: '2 días' },
                                        { value: 3, label: '3 días' },
                                        { value: 7, label: '1 semana' }
                                    ]}
                                    className="!rounded-2xl"
                                />
                                <Select
                                    label="Términos de Pago"
                                    value={formData.payment_terms}
                                    onChange={e => setFormData({ ...formData, payment_terms: e.target.value })}
                                    options={paymentTermsOptions}
                                    className="!rounded-2xl"
                                />
                                <div className="md:col-span-2">
                                    <div className="relative">
                                        <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2 uppercase tracking-wide">Notas de Entrega / Despacho</label>
                                        <textarea
                                            value={formData.notes_delivery}
                                            onChange={e => setFormData({ ...formData, notes_delivery: e.target.value })}
                                            className="w-full bg-gray-50 dark:bg-slate-800 border-none rounded-3xl p-4 text-sm font-medium focus:ring-2 focus:ring-pp-gold/50 outline-none min-h-[100px] transition-all"
                                            placeholder="Ej: Pedido mínimo $200k, entrar por muelle 4..."
                                        />
                                        <FileText className="absolute right-4 bottom-4 text-gray-300" size={20} />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right Panel: Value Summary & Insights (2/5) */}
                    <div className="lg:w-2/5 border-l border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-slate-800/20 p-10 flex flex-col justify-between overflow-y-auto">
                        <div className="space-y-10">
                            <div>
                                <h3 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                                    <Settings size={14} className="text-pp-gold" />
                                    Resumen de Cuenta
                                </h3>

                                <div className="space-y-6">
                                    {/* Relationship Status Card */}
                                    <div className="bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] shadow-xl border border-gray-100 dark:border-white/5 relative overflow-hidden group">
                                        <div className="absolute top-0 right-0 p-8 opacity-5 text-pp-brown -translate-x-2 translate-y-2 group-hover:scale-110 transition-transform duration-500">
                                            <CreditCard size={100} />
                                        </div>
                                        <div className="relative z-10">
                                            <Badge className="bg-orange-50 text-orange-600 border-none font-black text-[10px] uppercase mb-4 tracking-widest px-3 py-1">
                                                Estado Financiero
                                            </Badge>
                                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Cupo / Término Actual</p>
                                            <p className="text-2xl font-black text-pp-brown dark:text-white uppercase leading-tight">
                                                {formData.payment_terms}
                                            </p>
                                            <div className="h-px bg-gray-100 dark:bg-white/5 w-full my-6" />
                                            <div className="flex justify-between items-center">
                                                <div>
                                                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em]">Lead Time</p>
                                                    <p className="text-lg font-black text-gray-900 dark:text-gray-100">{formData.delivery_time_days} Días</p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em]">Categoría</p>
                                                    <p className="text-lg font-black text-pp-gold">{formData.category}</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Integrity Checks */}
                                    <div className="bg-pp-brown/5 dark:bg-pp-brown/10 p-6 rounded-3xl border border-pp-brown/10 space-y-4">
                                        <h4 className="text-[10px] font-black text-pp-brown dark:text-pp-gold uppercase tracking-widest flex items-center gap-2">
                                            <ShieldCheck size={14} /> Requisitos del Proveedor
                                        </h4>
                                        <ul className="space-y-3">
                                            <li className="flex items-center gap-3 text-xs font-bold text-gray-600 dark:text-gray-300">
                                                <div className={formData.name ? 'text-green-500 font-bold' : 'text-gray-300'}><AlertCircle size={14} /></div>
                                                <span>Razón Social Requerida</span>
                                            </li>
                                            <li className="flex items-center gap-3 text-xs font-bold text-gray-600 dark:text-gray-300">
                                                <div className={formData.phone ? 'text-green-500 font-bold' : 'text-gray-300'}><AlertCircle size={14} /></div>
                                                <span>Contacto Teléfonico Directo</span>
                                            </li>
                                            <li className="flex items-center gap-3 text-xs font-bold text-gray-600 dark:text-gray-300">
                                                <div className={formData.tax_id ? 'text-green-500 font-bold' : 'text-gray-300'}><AlertCircle size={14} /></div>
                                                <span>NIT / Identificación Tributaria</span>
                                            </li>
                                        </ul>
                                    </div>
                                </div>
                            </div>

                            {/* Alert Box */}
                            <div className="bg-blue-50 dark:bg-blue-900/20 p-6 rounded-2xl border border-blue-100 dark:border-blue-800/30 flex items-start gap-4">
                                <div className="text-blue-500 mt-1"><Info size={24} /></div>
                                <p className="text-[11px] font-bold text-blue-800 dark:text-blue-300 leading-relaxed uppercase tracking-tight">
                                    La configuración de <span className="text-blue-600 font-black">Lead Time</span> afecta directamente las proyecciones de stock crítico en el dashboard. Asegúrese que sea realista.
                                </p>
                            </div>
                        </div>

                        {/* Sticky Action Footer */}
                        <div className="mt-10 pt-8 border-t border-gray-100 dark:border-white/5 space-y-4">
                            <Button
                                onClick={handleSave}
                                disabled={loading || !formData.name || !formData.phone}
                                className="w-full h-16 rounded-[2rem] bg-pp-gold text-pp-brown hover:bg-pp-gold/90 shadow-2xl shadow-pp-gold/30 border-none font-black uppercase tracking-widest flex items-center justify-center gap-3 transition-all hover:-translate-y-1 active:scale-95 text-xl"
                            >
                                {loading ? <Loader2 className="animate-spin" /> : <><Save size={24} /> {editingSupplier ? 'Actualizar' : 'Guardar'} Proveedor</>}
                            </Button>
                            <Button
                                onClick={onClose}
                                variant="ghost"
                                className="w-full h-12 rounded-2xl font-black uppercase tracking-widest text-gray-400 hover:text-gray-600 dark:hover:text-white"
                            >
                                Cancelar Registro
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
