'use client'

import {
    Building2,
    Calendar,
    Mail,
    Phone,
    DollarSign,
    Briefcase,
    User,
    Trash2,
    Edit2,
    X,
    Shield,
    Lock,
    ChevronRight,
    Activity,
    Info,
    Clock,
    CreditCard,
    Award,
    ExternalLink,
    Smartphone,
    MapPin,
    ArrowRight
} from 'lucide-react'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import Modal from '@/components/ui/Modal'
import PermissionManager from './PermissionManager'
import { usePermissions } from '@/hooks/usePermissions'
import { Employee } from '@panpanocha/types'

interface EmployeeDetailProps {
    employee: Employee
    onEdit: () => void
    onClose: () => void
    onRegisterPayment: () => void
    isOpen: boolean
}

export default function EmployeeDetail({ employee, onEdit, onClose, onRegisterPayment, isOpen }: EmployeeDetailProps) {
    const [totalPaid, setTotalPaid] = useState<number>(0)
    const [hasPortalAccess, setHasPortalAccess] = useState(false)
    const [userId, setUserId] = useState<string | null>(null)
    const [showPermissions, setShowPermissions] = useState(false)
    const { permissions } = usePermissions()

    const canManagePermissions = permissions?.role === 'developer' || permissions?.role === 'administrator'

    useEffect(() => {
        if (!isOpen) return

        const fetchTotalPaid = async () => {
            const { data, error } = await supabase
                .from('payroll')
                .select('net_amount')
                .eq('employee_id', employee.id)
                .eq('status', 'paid')

            if (data) {
                const total = data.reduce((sum, record) => sum + (record.net_amount || 0), 0)
                setTotalPaid(total)
            }
        }

        const checkPortalAccess = async () => {
            const { data } = await supabase
                .from('employees')
                .select('user_id')
                .eq('id', employee.id)
                .single()

            if (data?.user_id) {
                setHasPortalAccess(true)
                setUserId(data.user_id)
            }
        }

        fetchTotalPaid()
        checkPortalAccess()
    }, [employee.id, isOpen])

    const calculateTenure = (dateString: string) => {
        const start = new Date(dateString)
        const now = new Date()
        let years = now.getFullYear() - start.getFullYear()
        let months = now.getMonth() - start.getMonth()

        if (months < 0) {
            years--
            months += 12
        }

        if (years > 0) return `${years} año${years > 1 ? 's' : ''} y ${months} mes${months !== 1 ? 'es' : ''}`
        return `${months} mes${months !== 1 ? 'es' : ''}`
    }

    const formatSalary = (amount: number) => {
        return new Intl.NumberFormat('es-CO', {
            style: 'currency',
            currency: 'COP',
            minimumFractionDigits: 0
        }).format(amount)
    }

    const getSalaryTypeLabel = (type: string) => {
        const labels: Record<string, string> = {
            'monthly': 'Mensual',
            'biweekly': 'Quincenal',
            'daily': 'Diario',
            'hourly': 'Por hora'
        }
        return labels[type] || type
    }

    if (!isOpen || !employee) return null

    return (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50 backdrop-blur-md animate-in fade-in duration-300">
            <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl rounded-[2.5rem] shadow-2xl w-full max-w-6xl overflow-hidden flex flex-col md:flex-row max-h-[90vh] animate-in zoom-in-95 duration-300 border border-white/20">

                {/* Left Panel: Profile & Identity */}
                <div className="flex-1 overflow-y-auto custom-scrollbar border-r border-gray-100 dark:border-white/5 bg-white dark:bg-slate-900">
                    {/* Hero Header */}
                    <div className="relative h-64 w-full bg-slate-900 overflow-hidden shrink-0">
                        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10" />
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent" />

                        <div className="absolute bottom-10 left-10 right-10 flex items-end gap-6">
                            <div className="h-24 w-24 rounded-3xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-pp-gold shadow-2xl relative">
                                <User size={48} />
                                {employee.active && (
                                    <div className="absolute -top-2 -right-2 h-6 w-6 bg-green-500 rounded-full border-4 border-slate-900 flex items-center justify-center">
                                        <CheckCircleIcon size={12} className="text-white" />
                                    </div>
                                )}
                            </div>
                            <div className="flex-1 pb-1">
                                <div className="flex items-center gap-3 mb-2">
                                    <Badge className="bg-pp-gold text-pp-brown border-none font-black text-[10px] uppercase tracking-widest px-3 py-1">
                                        {employee.position}
                                    </Badge>
                                    <span className="text-white/40 text-[10px] font-mono tracking-widest uppercase">ID: {employee.id.split('-')[0]}</span>
                                </div>
                                <h2 className="text-4xl font-black text-white uppercase tracking-tight leading-none font-display">
                                    {employee.full_name}
                                </h2>
                            </div>
                        </div>

                        <button
                            onClick={onClose}
                            className="absolute top-8 right-8 p-2 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-full text-white transition-all border border-white/10"
                            title="Cerrar detalle"
                        >
                            <X size={24} />
                        </button>
                    </div>

                    {/* Content Section */}
                    <div className="p-10 space-y-12">
                        {/* Status Grid */}
                        <div className="grid grid-cols-3 gap-6">
                            <div className="p-5 rounded-3xl bg-gray-50/50 dark:bg-slate-800/50 border border-gray-100 dark:border-white/5 flex flex-col gap-1">
                                <span className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">Sede</span>
                                <span className="text-base font-black text-slate-900 dark:text-white uppercase">{employee.branches?.name || 'Varios'}</span>
                            </div>
                            <div className="p-5 rounded-3xl bg-gray-50/50 dark:bg-slate-800/50 border border-gray-100 dark:border-white/5 flex flex-col gap-1">
                                <span className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">Contrato</span>
                                <span className="text-base font-black text-slate-900 dark:text-white uppercase">Indefinido</span>
                            </div>
                            <div className="p-5 rounded-3xl bg-gray-50/50 dark:bg-slate-800/50 border border-gray-100 dark:border-white/5 flex flex-col gap-1">
                                <span className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">Antigüedad</span>
                                <span className="text-base font-black text-slate-900 dark:text-white uppercase truncate">{calculateTenure(employee.hire_date).split(' ')[0]} {calculateTenure(employee.hire_date).split(' ')[1]}</span>
                            </div>
                        </div>

                        {/* Detailed Blocks */}
                        <div className="grid grid-cols-2 gap-10">
                            {/* Contact Info */}
                            <div className="space-y-6">
                                <h3 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em] flex items-center gap-2">
                                    <Shield size={16} className="text-pp-gold" /> Información Personal
                                </h3>
                                <div className="space-y-4">
                                    <div className="flex items-center gap-4 group">
                                        <div className="h-12 w-12 rounded-2xl bg-pp-gold/10 flex items-center justify-center text-pp-brown group-hover:scale-110 transition-transform">
                                            <Mail size={20} />
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Email</p>
                                            <a href={`mailto:${employee.email}`} className="text-base font-black text-gray-900 dark:text-white leading-none hover:text-pp-gold transition-colors break-all">
                                                {employee.email || 'No asignado'}
                                            </a>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4 group">
                                        <div className="h-12 w-12 rounded-2xl bg-pp-gold/10 flex items-center justify-center text-pp-brown group-hover:scale-110 transition-transform">
                                            <Phone size={20} />
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Móvil</p>
                                            <a href={`tel:${employee.phone}`} className="text-base font-black text-gray-900 dark:text-white leading-none hover:text-pp-gold transition-colors">
                                                {employee.phone || 'No registrado'}
                                            </a>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Contract Info */}
                            <div className="space-y-6">
                                <h3 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em] flex items-center gap-2">
                                    <Clock size={16} className="text-pp-gold" /> Fechas Clave
                                </h3>
                                <div className="space-y-4">
                                    <div className="p-5 rounded-3xl bg-blue-50/50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-800/20 flex flex-col gap-1">
                                        <p className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest">Fecha de Ingreso</p>
                                        <p className="text-base font-black text-blue-900 dark:text-blue-200">
                                            {new Date(employee.hire_date).toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' })}
                                        </p>
                                    </div>
                                    <div className="p-5 rounded-3xl bg-gray-50 dark:bg-slate-800/50 border border-gray-100 dark:border-white/10 flex flex-col gap-1">
                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Tiempo Acumulado</p>
                                        <p className="text-sm font-bold text-gray-900 dark:text-white uppercase leading-none">
                                            {calculateTenure(employee.hire_date)}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Portal Access Logic */}
                        <div className={`p-8 rounded-[2.5rem] border flex items-center justify-between shadow-lg relative overflow-hidden transition-all duration-500 ${hasPortalAccess ? 'bg-blue-50 border-blue-100 dark:bg-blue-900/20 dark:border-blue-800/20' : 'bg-gray-50 border-gray-100 dark:bg-slate-800/40 dark:border-white/5'}`}>
                            {hasPortalAccess && (
                                <div className="absolute top-0 right-0 p-8 opacity-5 text-blue-500 -translate-x-2 -translate-y-2">
                                    <Lock size={80} />
                                </div>
                            )}
                            <div className="flex items-center gap-5 relative z-10">
                                <div className={`h-14 w-14 rounded-2xl flex items-center justify-center transition-colors ${hasPortalAccess ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-400 dark:bg-slate-700 dark:text-gray-500'}`}>
                                    <Lock size={28} />
                                </div>
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <h4 className={`text-sm font-black uppercase tracking-widest ${hasPortalAccess ? 'text-blue-900 dark:text-blue-300' : 'text-gray-400'}`}>Seguridad de Portal</h4>
                                        {hasPortalAccess && <Badge variant="success" className="h-5 py-0">Activo</Badge>}
                                    </div>
                                    <p className="text-[10px] font-bold text-gray-500 uppercase leading-none">
                                        {hasPortalAccess ? 'El empleado puede gestionar su información en línea' : 'Acceso al portal no habilitado'}
                                    </p>
                                </div>
                            </div>

                            {hasPortalAccess && canManagePermissions && (
                                <Button
                                    onClick={() => setShowPermissions(true)}
                                    variant="outline"
                                    className="relative z-10 h-12 bg-white dark:bg-slate-800 border-none rounded-2xl font-black text-xs uppercase tracking-widest px-6 shadow-xl"
                                >
                                    Gestionar Permisos
                                </Button>
                            )}
                        </div>
                    </div>
                </div>

                {/* Right Panel: Financial Analytics & Actions */}
                <div className="w-full md:w-[450px] bg-gray-50/50 dark:bg-slate-800/10 p-10 flex flex-col justify-between">
                    <div className="space-y-10">
                        {/* Payroll Visual Breakdown */}
                        <div className="bg-slate-900 dark:bg-slate-800 p-8 rounded-[2.8rem] text-white shadow-2xl relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-10 opacity-10 translate-x-4 -translate-y-4 group-hover:scale-110 transition-transform duration-1000">
                                <Activity size={120} className="text-pp-gold" />
                            </div>
                            <div className="relative z-10">
                                <Badge className="bg-white/10 text-pp-gold border-white/10 font-black text-[10px] uppercase mb-8 tracking-widest px-4 py-1">
                                    Desempeño Financiero
                                </Badge>

                                <div className="space-y-8">
                                    <div>
                                        <p className="text-[10px] font-black text-pp-gold uppercase tracking-[0.2em] mb-1">Salario Base ({getSalaryTypeLabel(employee.salary_type)})</p>
                                        <div className="flex items-baseline gap-2">
                                            <span className="text-2xl font-bold text-pp-gold opacity-40">$</span>
                                            <p className="text-5xl font-black font-display tracking-tight leading-none italic">
                                                {employee.base_salary.toLocaleString()}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="h-px bg-white/10 w-full" />

                                    <div className="flex justify-between items-center">
                                        <div>
                                            <p className="text-[9px] font-black text-white/40 uppercase tracking-widest mb-1">Pagado Acumulado</p>
                                            <p className="text-2xl font-black text-pp-gold tracking-tight">
                                                ${totalPaid.toLocaleString()}
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-[9px] font-black text-white/40 uppercase tracking-widest mb-1">Costo Anual</p>
                                            <p className="text-sm font-black uppercase text-white tracking-widest italic">${(employee.base_salary * 12).toLocaleString()}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Summary Metrics */}
                        <div className="space-y-6">
                            <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] flex items-center justify-between">
                                <span>Métricas de Cumplimiento</span>
                                <Award size={14} className="opacity-40" />
                            </h3>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-white dark:bg-slate-800 p-5 rounded-3xl border border-gray-100 dark:border-white/5 flex flex-col gap-1">
                                    <p className="text-[9px] font-black text-gray-400 uppercase">Seguridad Social</p>
                                    <p className="text-sm font-black text-slate-900 dark:text-white uppercase">Al día</p>
                                </div>
                                <div className="bg-white dark:bg-slate-800 p-5 rounded-3xl border border-gray-100 dark:border-white/5 flex flex-col gap-1">
                                    <p className="text-[9px] font-black text-gray-400 uppercase">Bonos Pendientes</p>
                                    <p className="text-sm font-black text-slate-900 dark:text-white uppercase">$0</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Action Block */}
                    <div className="mt-10 pt-8 border-t border-gray-100 dark:border-white/5 flex flex-col gap-4">
                        {employee.active && (
                            <Button
                                onClick={() => {
                                    onClose()
                                    onRegisterPayment()
                                }}
                                title="Registrar pago de nómina"
                                className="w-full h-16 rounded-[2rem] bg-pp-gold text-pp-brown font-black uppercase tracking-[0.15em] flex items-center justify-center gap-3 shadow-2xl shadow-pp-gold/20 hover:scale-[1.02] transition-all"
                            >
                                <DollarSign size={24} /> Registrar Pago
                            </Button>
                        )}
                        <div className="grid grid-cols-2 gap-3">
                            <Button
                                onClick={() => {
                                    onClose()
                                    onEdit()
                                }}
                                variant="outline"
                                title="Editar ficha del empleado"
                                className="h-14 rounded-2xl text-xs font-black uppercase tracking-widest border-2 dark:border-white/10 dark:text-white"
                            >
                                <Edit2 size={16} className="mr-2" /> Editar Ficha
                            </Button>
                            <Button
                                onClick={onClose}
                                variant="ghost"
                                className="h-14 rounded-2xl text-xs font-black uppercase tracking-widest text-gray-400"
                            >
                                Cerrar
                            </Button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Permission Manager Modal (Sub-modal) */}
            <Modal
                isOpen={showPermissions}
                onClose={() => setShowPermissions(false)}
                title="Gestión de Permisos"
                className="max-w-2xl"
            >
                <PermissionManager
                    employeeId={employee.id}
                    userId={userId}
                    onClose={() => setShowPermissions(false)}
                />
            </Modal>
        </div>
    )
}

function CheckCircleIcon({ size, className }: { size: number; className?: string }) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className={className}>
            <path d="M20 6 9 17l-5-5" />
        </svg>
    )
}
