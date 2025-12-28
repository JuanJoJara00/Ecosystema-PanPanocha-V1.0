'use client'

import { useState, useEffect } from 'react'
import { X, MapPin, Phone, User, Calendar, Edit, Building2, DollarSign, Armchair } from 'lucide-react'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import { supabase } from '@/lib/supabase'

interface BranchDetailProps {
    branch: any
    onClose: () => void
    onEdit: () => void
}

export default function BranchDetail({ branch, onClose, onEdit }: BranchDetailProps) {
    const [tableCount, setTableCount] = useState(0)
    const [employeeCount, setEmployeeCount] = useState(0)

    useEffect(() => {
        if (branch?.id) {
            loadTableCount()
            loadEmployeeCount()
        }
    }, [branch?.id])

    const loadTableCount = async () => {
        try {
            const { count, error } = await supabase
                .from('tables')
                .select('*', { count: 'exact', head: true })
                .eq('branch_id', branch.id)

            if (!error && count !== null) {
                setTableCount(count)
            }
        } catch (err) {
            console.error('Error loading table count:', err)
        }
    }

    const loadEmployeeCount = async () => {
        try {
            const { count, error } = await supabase
                .from('employees')
                .select('*', { count: 'exact', head: true })
                .eq('branch_id', branch.id)

            if (!error && count !== null) {
                setEmployeeCount(count)
            }
        } catch (err) {
            console.error('Error loading employee count:', err)
        }
    }

    if (!branch) return null

    return (
        <div className="flex flex-col h-full bg-white font-sans">
            {/* Context Header - Fixed */}
            <div className="flex justify-between items-start p-6 border-b border-gray-100 bg-gray-50/50">
                <div className="flex gap-4">
                    <div className="h-16 w-16 bg-pp-gold/10 rounded-2xl flex items-center justify-center text-pp-brown shrink-0">
                        <Building2 className="h-8 w-8" />
                    </div>
                    <div>
                        <div className="flex items-center gap-3 mb-1">
                            <h2 className="text-2xl font-bold text-gray-900 font-display uppercase tracking-tight">
                                {branch.name}
                            </h2>
                            <Badge variant={branch.is_active !== false ? 'success' : 'neutral'}>
                                {branch.is_active !== false ? 'Activa' : 'Inactiva'}
                            </Badge>
                        </div>
                        <p className="text-gray-500 font-medium">{branch.city || 'Ciudad no registrada'}</p>
                    </div>
                </div>
                <button
                    onClick={onClose}
                    className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full p-1 transition-colors"
                >
                    <X className="h-6 w-6" />
                </button>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-8">
                {/* Contact Info */}
                <section>
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4 border-b border-gray-100 pb-2">
                        Información de Contacto
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <div className="group p-4 rounded-xl border border-gray-100 bg-gray-50/50 hover:bg-white hover:border-gray-200 transition-all">
                            <div className="flex items-center gap-3 mb-2 text-pp-brown">
                                <MapPin className="h-5 w-5" />
                                <span className="font-bold text-sm">Dirección</span>
                            </div>
                            <p className="text-gray-700 pl-8">{branch.address || 'No registrada'}</p>
                        </div>

                        <div className="group p-4 rounded-xl border border-gray-100 bg-gray-50/50 hover:bg-white hover:border-gray-200 transition-all">
                            <div className="flex items-center gap-3 mb-2 text-pp-brown">
                                <Phone className="h-5 w-5" />
                                <span className="font-bold text-sm">Teléfono</span>
                            </div>
                            <p className="text-gray-700 pl-8">{branch.phone || 'No registrado'}</p>
                        </div>
                    </div>
                </section>

                {/* Management Info */}
                <section>
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4 border-b border-gray-100 pb-2">
                        Administración
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                        <div className="group p-4 rounded-xl border border-gray-100 bg-gray-50/50 hover:bg-white hover:border-gray-200 transition-all">
                            <div className="flex items-center gap-3 mb-2 text-pp-brown">
                                <User className="h-5 w-5" />
                                <span className="font-bold text-sm">Encargado</span>
                            </div>
                            <p className="text-gray-700 pl-8 font-medium">{branch.manager_name || 'Sin asignar'}</p>
                        </div>

                        <div className="group p-4 rounded-xl border border-gray-100 bg-gray-50/50 hover:bg-white hover:border-gray-200 transition-all">
                            <div className="flex items-center gap-3 mb-2 text-pp-brown">
                                <User className="h-5 w-5" />
                                <span className="font-bold text-sm">Empleados</span>
                            </div>
                            <p className="text-gray-700 pl-8 font-medium">
                                {employeeCount} empleado{employeeCount !== 1 ? 's' : ''}
                            </p>
                        </div>

                        <div className="group p-4 rounded-xl border border-gray-100 bg-gray-50/50 hover:bg-white hover:border-gray-200 transition-all">
                            <div className="flex items-center gap-3 mb-2 text-pp-brown">
                                <Armchair className="h-5 w-5" />
                                <span className="font-bold text-sm">Mesas</span>
                            </div>
                            <p className="text-gray-700 pl-8 font-medium">
                                {tableCount} mesa{tableCount !== 1 ? 's' : ''}
                            </p>
                        </div>
                    </div>
                </section>

                {/* Financial Performance - Placeholder */}
                <section>
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4 border-b border-gray-100 pb-2 flex justify-between items-center">
                        <span>Desempeño Financiero</span>
                        <span className="text-[0.6rem] bg-gray-100 px-2 py-0.5 rounded text-gray-500 font-normal">Próximamente</span>
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <div className="group p-4 rounded-xl border border-gray-100 bg-white hover:border-gray-200 transition-all shadow-sm">
                            <div className="flex items-center gap-3 mb-2 text-green-600">
                                <div className="p-1.5 bg-green-50 rounded-lg">
                                    <DollarSign className="h-5 w-5" />
                                </div>
                                <span className="font-bold text-sm text-gray-700">Ventas Brutas</span>
                            </div>
                            <div className="pl-11">
                                <p className="text-2xl font-bold text-gray-900 font-display">$ 0</p>
                                <p className="text-xs text-gray-400 mt-1">
                                    * Dato calculado desde Cierre de Caja
                                </p>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Metadata */}
                <section>
                    <div className="flex items-center gap-2 text-xs text-gray-400 mt-8 pt-4 border-t border-gray-50">
                        <Calendar className="h-3 w-3" />
                        <span>Sede registrada en el sistema</span>
                    </div>
                </section>
            </div>

            {/* Footer Actions - Fixed */}
            <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
                <Button
                    onClick={onClose}
                    variant="ghost"
                >
                    Cerrar
                </Button>
                <Button
                    onClick={onEdit}
                    startIcon={<Edit className="h-4 w-4" />}
                >
                    Editar Información
                </Button>
            </div>
        </div>
    )
}
