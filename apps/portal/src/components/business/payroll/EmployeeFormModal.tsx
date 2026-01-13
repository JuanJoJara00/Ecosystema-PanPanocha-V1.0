'use client'

import React, { useState, useEffect } from 'react'
import {
    X,
    Save,
    Loader2,
    User,
    Mail,
    Phone,
    Briefcase,
    Building2,
    Calendar,
    DollarSign,
    Wallet,
    Shield,
    Lock,
    Settings,
    ArrowRight,
    Search,
    CheckCircle2,
    AlertCircle,
    Info,
    Smartphone,
    MapPin,
    UserPlus
} from 'lucide-react'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import Badge from '@/components/ui/Badge'
import { Employee } from '@panpanocha/types'
import { usePermissions } from '@/hooks/usePermissions'

interface EmployeeFormModalProps {
    isOpen: boolean
    onClose: () => void
    onSubmit: (data: any, authParams?: { createPortalAccess: boolean, sendInvitation: boolean }) => Promise<void>
    editingEmployee: Employee | null
    branches: any[]
}

export default function EmployeeFormModal({
    isOpen,
    onClose,
    onSubmit,
    editingEmployee,
    branches
}: EmployeeFormModalProps) {
    const [loading, setLoading] = useState(false)
    const { permissions } = usePermissions()
    const isEditMode = !!editingEmployee

    const [formData, setFormData] = useState({
        full_name: '',
        email: '',
        phone: '',
        position: 'empleado',
        branch_id: '',
        hire_date: new Date().toISOString().split('T')[0],
        salary_type: 'monthly',
        base_salary: '',
        active: true
    })

    const [authParams, setAuthParams] = useState({
        createPortalAccess: false,
        sendInvitation: true
    })

    useEffect(() => {
        if (isOpen && editingEmployee) {
            setFormData({
                full_name: editingEmployee.full_name || '',
                email: editingEmployee.email || '',
                phone: editingEmployee.phone || '',
                position: editingEmployee.position || 'empleado',
                branch_id: editingEmployee.branch_id || '',
                hire_date: editingEmployee.hire_date || new Date().toISOString().split('T')[0],
                salary_type: editingEmployee.salary_type || 'monthly',
                base_salary: editingEmployee.base_salary?.toString() || '',
                active: editingEmployee.active ?? true
            })
        } else if (isOpen) {
            setFormData({
                full_name: '',
                email: '',
                phone: '',
                position: 'empleado',
                branch_id: branches[0]?.id || '',
                hire_date: new Date().toISOString().split('T')[0],
                salary_type: 'monthly',
                base_salary: '',
                active: true
            })
            setAuthParams({
                createPortalAccess: false,
                sendInvitation: true
            })
        }
    }, [isOpen, editingEmployee, branches])

    if (!isOpen) return null

    const handleSave = async (e?: React.FormEvent) => {
        if (e) e.preventDefault()
        setLoading(true)
        try {
            await onSubmit(formData, authParams)
            onClose()
        } catch (error) {
            console.error('Error saving employee:', error)
        } finally {
            setLoading(false)
        }
    }

    const availableRoles = [
        { value: 'developer', label: 'Desarrollador/Dueño' },
        { value: 'administrator', label: 'Administrador (Encargado)' },
        { value: 'cajera', label: 'Cajera' },
        { value: 'empleado', label: 'Empleado (Mesero, Cocina, Aseo)' }
    ].filter(role => {
        if (permissions?.role === 'developer') return true
        if (permissions?.role === 'administrator') return role.value === 'cajera' || role.value === 'empleado'
        return role.value === 'empleado'
    })

    return (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl w-full max-w-6xl overflow-hidden flex flex-col max-h-[95vh] border border-white/20 animate-in zoom-in-95 duration-300">

                {/* Header */}
                <div className="p-8 border-b border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-slate-800/20 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-4">
                        <div className="bg-pp-brown h-14 w-14 rounded-2xl flex items-center justify-center shadow-lg shadow-pp-brown/20 text-pp-gold">
                            <UserPlus className="h-8 w-8" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-black text-gray-900 dark:text-white uppercase tracking-tighter font-display leading-tight">
                                {isEditMode ? 'Gestionar Empleado' : 'Contrato de Nuevo Talento'}
                            </h2>
                            <p className="text-sm font-bold text-gray-500 flex items-center gap-1.5 uppercase tracking-widest mt-0.5">
                                Capital Humano <ArrowRight size={12} className="text-pp-gold" /> <span className="text-pp-brown dark:text-pp-gold">{formData.position}</span>
                            </p>
                        </div>
                    </div>
                    <Button variant="ghost" size="sm" onClick={onClose} className="h-12 w-12 rounded-full hover:bg-white dark:hover:bg-slate-800 transition-all">
                        <X className="h-6 w-6 text-gray-400" />
                    </Button>
                </div>

                {/* Split Content Body */}
                <div className="flex-grow flex flex-col lg:flex-row overflow-hidden">

                    {/* Left Panel: Personal & Contract (3/5) */}
                    <div className="lg:w-3/5 p-10 overflow-y-auto space-y-10 bg-white dark:bg-slate-900 custom-scrollbar">

                        {/* Section 1: Personal Profile */}
                        <div className="space-y-6">
                            <div className="flex items-center gap-2 mb-2">
                                <User size={16} className="text-pp-gold" />
                                <h3 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em]">Perfil del Colaborador</h3>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="md:col-span-2">
                                    <Input
                                        label="Nombre Completo"
                                        required
                                        value={formData.full_name}
                                        onChange={e => setFormData({ ...formData, full_name: e.target.value })}
                                        placeholder="Ej. Juan Sebastián Pérez"
                                        startIcon={<User size={18} className="text-pp-gold" />}
                                        className="!rounded-2xl !py-4"
                                    />
                                </div>
                                <Input
                                    label="Email Corporativo"
                                    type="email"
                                    value={formData.email}
                                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                                    placeholder="empleado@panpanocha.com"
                                    startIcon={<Mail size={18} className="text-gray-400" />}
                                    className="!rounded-2xl !py-3"
                                />
                                <Input
                                    label="Teléfono de Contacto"
                                    value={formData.phone}
                                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                    placeholder="+57 300 000 0000"
                                    startIcon={<Smartphone size={18} className="text-gray-400" />}
                                    className="!rounded-2xl !py-3"
                                />
                            </div>
                        </div>

                        {/* Section 2: Contractual Details */}
                        <div className="space-y-6 pt-10 border-t border-gray-100 dark:border-white/5">
                            <div className="flex items-center gap-2 mb-2">
                                <Briefcase size={16} className="text-pp-gold" />
                                <h3 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em]">Condiciones Contractuales</h3>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <Select
                                    label="Rol / Cargo en la Empresa"
                                    value={formData.position}
                                    onChange={e => setFormData({ ...formData, position: e.target.value })}
                                    options={availableRoles}
                                    className="!rounded-2xl"
                                />
                                <Select
                                    label="Sede de Trabajo Asignada"
                                    value={formData.branch_id}
                                    onChange={e => setFormData({ ...formData, branch_id: e.target.value })}
                                    options={branches.map(b => ({ value: b.id, label: b.name }))}
                                    className="!rounded-2xl"
                                />
                                <Input
                                    label="Fecha de Ingreso"
                                    type="date"
                                    required
                                    value={formData.hire_date}
                                    onChange={e => setFormData({ ...formData, hire_date: e.target.value })}
                                    startIcon={<Calendar size={18} className="text-gray-400" />}
                                    className="!rounded-2xl"
                                />
                                <div className="flex items-center gap-4 bg-gray-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-gray-100 dark:border-white/5 mt-auto">
                                    <div className={`h-10 w-10 rounded-xl flex items-center justify-center transition-colors ${formData.active ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                                        <Shield size={20} />
                                    </div>
                                    <label className="flex-1 cursor-pointer">
                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">Estado de Empleo</p>
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="checkbox"
                                                checked={formData.active}
                                                onChange={e => setFormData({ ...formData, active: e.target.checked })}
                                                className="w-4 h-4 text-pp-gold border-gray-300 rounded focus:ring-pp-gold"
                                            />
                                            <span className="text-sm font-black text-gray-900 dark:text-white uppercase">{formData.active ? 'Activo' : 'Inactivo'}</span>
                                        </div>
                                    </label>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right Panel: Financial & Access (2/5) */}
                    <div className="lg:w-2/5 border-l border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-slate-800/20 p-10 flex flex-col justify-between overflow-y-auto">
                        <div className="space-y-10">
                            <div>
                                <h3 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                                    <Wallet size={14} className="text-pp-gold" />
                                    Esquema de Retribución
                                </h3>

                                <div className="space-y-6">
                                    {/* Salary Card */}
                                    <div className="bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] shadow-xl border border-gray-100 dark:border-white/5 relative overflow-hidden group">
                                        <div className="absolute top-0 right-0 p-8 opacity-5 text-pp-brown -translate-x-2 translate-y-2 group-hover:scale-110 transition-transform duration-500">
                                            <DollarSign size={100} />
                                        </div>
                                        <div className="relative z-10">
                                            <Select
                                                label="Frecuencia de Pago"
                                                value={formData.salary_type}
                                                onChange={e => setFormData({ ...formData, salary_type: e.target.value })}
                                                options={[
                                                    { value: 'monthly', label: 'Mensual' },
                                                    { value: 'biweekly', label: 'Quincenal' },
                                                    { value: 'daily', label: 'Diario' },
                                                    { value: 'hourly', label: 'Por Hora' }
                                                ]}
                                                className="!bg-pp-brown/5 !border-none !text-xs !font-black !uppercase !tracking-widest !mb-4 !py-1"
                                            />
                                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Salario Base Asignado</p>
                                            <div className="relative">
                                                <span className="absolute left-0 top-1/2 -translate-y-1/2 text-3xl font-bold text-pp-gold">$</span>
                                                <input
                                                    type="number"
                                                    value={formData.base_salary}
                                                    onChange={e => setFormData({ ...formData, base_salary: e.target.value })}
                                                    className="w-full bg-transparent border-none p-0 pl-7 text-4xl font-black text-gray-900 dark:text-white font-display focus:ring-0 outline-none"
                                                    placeholder="0"
                                                />
                                            </div>
                                            <div className="h-px bg-gray-100 dark:bg-white/5 w-full my-6" />
                                            <p className="text-[9px] font-bold text-gray-500 uppercase leading-relaxed italic">
                                                * El salario base se utiliza para cálculos prestacionales y provisiones de nómina.
                                            </p>
                                        </div>
                                    </div>

                                    {/* Portal Access Logic */}
                                    {!isEditMode && (
                                        <div className="bg-blue-50 dark:bg-blue-900/20 p-8 rounded-[2.5rem] border border-blue-100 dark:border-blue-800/30 space-y-6">
                                            <div className="flex items-center gap-3">
                                                <div className="h-10 w-10 bg-blue-500/10 rounded-xl flex items-center justify-center text-blue-600">
                                                    <Lock size={20} />
                                                </div>
                                                <h4 className="text-xs font-black text-blue-900 dark:text-blue-300 uppercase tracking-widest">Seguridad & Portal</h4>
                                            </div>

                                            <div className="space-y-4">
                                                <label className="flex items-start gap-3 cursor-pointer group">
                                                    <input
                                                        type="checkbox"
                                                        checked={authParams.createPortalAccess}
                                                        onChange={e => setAuthParams({ ...authParams, createPortalAccess: e.target.checked })}
                                                        className="mt-1 w-5 h-5 text-blue-600 border-gray-300 rounded-lg focus:ring-blue-500"
                                                    />
                                                    <div>
                                                        <p className="text-sm font-black text-blue-900 dark:text-blue-200 uppercase leading-none mb-1">Habilitar Acceso Portal</p>
                                                        <p className="text-[10px] font-bold text-blue-700 dark:text-blue-400 leading-tight">Permite al usuario gestionar su perfil y ver el Dashboard según su rol.</p>
                                                    </div>
                                                </label>

                                                {authParams.createPortalAccess && (
                                                    <div className="pl-8 space-y-3 pt-3 border-t border-blue-100 dark:border-blue-800/50 animate-in slide-in-from-top-2 duration-300">
                                                        <label className="flex items-center gap-3 cursor-pointer">
                                                            <input
                                                                type="checkbox"
                                                                checked={authParams.sendInvitation}
                                                                onChange={e => setAuthParams({ ...authParams, sendInvitation: e.target.checked })}
                                                                className="w-4 h-4 text-blue-600 border-gray-300 rounded"
                                                            />
                                                            <span className="text-xs font-bold text-blue-800 dark:text-blue-400 uppercase tracking-tight">Enviar Invitación por Email</span>
                                                        </label>
                                                        <div className="bg-white/50 dark:bg-slate-900/50 p-3 rounded-xl flex items-center gap-3">
                                                            <Info size={14} className="text-blue-500 shrink-0" />
                                                            <p className="text-[9px] font-bold text-blue-800 dark:text-blue-300 italic">
                                                                {authParams.sendInvitation
                                                                    ? 'Se enviará un enlace automático para que el empleado defina su contraseña.'
                                                                    : 'Se generará una contraseña temporal que deberá ser entregada personalmente.'}
                                                            </p>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Sticky Action Footer */}
                        <div className="mt-10 pt-8 border-t border-gray-100 dark:border-white/5 space-y-4">
                            <Button
                                onClick={handleSave}
                                disabled={loading || !formData.full_name || !formData.base_salary}
                                className="w-full h-16 rounded-[2rem] bg-pp-gold text-pp-brown hover:bg-pp-gold/90 shadow-2xl shadow-pp-gold/30 border-none font-black uppercase tracking-widest flex items-center justify-center gap-3 transition-all hover:-translate-y-1 active:scale-95 text-xl"
                            >
                                {loading ? <Loader2 className="animate-spin" /> : <><Save size={24} /> {isEditMode ? 'Actualizar Ficha' : 'Firmar Contrato'}</>}
                            </Button>
                            <Button
                                onClick={onClose}
                                variant="ghost"
                                className="w-full h-12 rounded-2xl font-black uppercase tracking-widest text-gray-400 hover:text-gray-600 dark:hover:text-white"
                            >
                                Cancelar trámite
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
