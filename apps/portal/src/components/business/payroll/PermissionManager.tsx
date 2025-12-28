'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Shield, Check, X } from 'lucide-react'
import Button from '@/components/ui/Button'

interface Props {
    employeeId: string
    userId: string | null
    onClose: () => void
}

export default function PermissionManager({ employeeId, userId, onClose }: Props) {
    const [loading, setLoading] = useState(false)
    const [permissions, setPermissions] = useState<any>({})
    const [rolePermissions, setRolePermissions] = useState<any>({})

    useEffect(() => {
        loadPermissions()
    }, [employeeId])

    const loadPermissions = async () => {
        try {
            // Get custom permissions
            const { data: custom } = await supabase
                .from('employee_custom_permissions')
                .select('*')
                .eq('employee_id', employeeId)
                .single()

            if (custom) {
                setPermissions(custom)
            }

            // Get role default permissions for reference
            const { data: employee } = await supabase
                .from('employees')
                .select('position')
                .eq('id', employeeId)
                .single()

            if (employee) {
                // Determine role from position
                const role = determineRole(employee.position)
                const { data: rolePerm } = await supabase
                    .from('role_permissions')
                    .select('*')
                    .eq('role', role)
                    .single()

                if (rolePerm) {
                    setRolePermissions(rolePerm)
                }
            }
        } catch (err) {
            console.error('Error loading permissions:', err)
        }
    }

    const handleToggle = (field: string) => {
        setPermissions((prev: any) => ({
            ...prev,
            [field]: prev[field] === null ? true : (prev[field] ? null : true)
        }))
    }

    const handleSave = async () => {
        setLoading(true)
        try {
            const { error } = await supabase
                .from('employee_custom_permissions')
                .upsert({
                    employee_id: employeeId,
                    user_id: userId,
                    ...permissions
                })

            if (error) throw error
            alert('Permisos actualizados correctamente')
            onClose()
        } catch (err: any) {
            alert('Error al guardar: ' + err.message)
        } finally {
            setLoading(false)
        }
    }

    const PermissionRow = ({ field, label }: { field: string, label: string }) => {
        const isCustom = permissions[field] !== undefined && permissions[field] !== null
        const effectiveValue = permissions[field] ?? rolePermissions[field]

        return (
            <div className="flex items-center justify-between py-2 px-3 hover:bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                    <div className={`w-6 h-6 rounded flex items-center justify-center ${effectiveValue ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'
                        }`}>
                        {effectiveValue ? <Check size={14} /> : <X size={14} />}
                    </div>
                    <span className="text-sm text-gray-700">{label}</span>
                    {isCustom && (
                        <span className="text-xs bg-pp-gold/20 text-pp-brown px-2 py-0.5 rounded-full">
                            Personalizado
                        </span>
                    )}
                </div>
                <button
                    onClick={() => handleToggle(field)}
                    className={`px-3 py-1 rounded text-xs font-medium transition-colors ${isCustom
                            ? 'bg-pp-gold text-pp-brown hover:bg-pp-gold/80'
                            : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                        }`}
                >
                    {isCustom ? 'Restaurar' : 'Personalizar'}
                </button>
            </div>
        )
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-2 text-pp-brown mb-4">
                <Shield className="h-5 w-5" />
                <h3 className="font-bold text-lg">Gestión de Permisos</h3>
            </div>

            <p className="text-sm text-gray-600 mb-4">
                Los permisos personalizados sobrescriben los permisos del rol base.
                Click en "Personalizar" para modificar un permiso específico.
            </p>

            {/* Portal Modules */}
            <div className="space-y-2">
                <h4 className="font-bold text-sm text-gray-500 uppercase">Módulos del Portal</h4>
                <PermissionRow field="access_dashboard" label="Dashboard" />
                <PermissionRow field="access_branches" label="Sedes" />
                <PermissionRow field="access_employees" label="Empleados" />
                <PermissionRow field="access_payroll" label="Nómina" />
                <PermissionRow field="access_inventory" label="Inventario" />
                <PermissionRow field="access_products" label="Productos" />
                <PermissionRow field="access_orders" label="Pedidos" />
                <PermissionRow field="access_deliveries" label="Domicilios" />
                <PermissionRow field="access_cash_closing" label="Cierre de Caja" />
                <PermissionRow field="access_reports" label="Reportes" />
            </div>

            {/* POS Access */}
            <div className="space-y-2 pt-4 border-t">
                <h4 className="font-bold text-sm text-gray-500 uppercase">Acceso POS</h4>
                <PermissionRow field="access_pos" label="Acceso al POS" />
                <PermissionRow field="pos_full_access" label="Acceso Completo POS" />
                <PermissionRow field="pos_checkout" label="Cobrar en POS" />
                <PermissionRow field="pos_register_only" label="Solo Registrar (Sin Cobrar)" />
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-4 border-t mt-4">
                <Button onClick={onClose} variant="ghost" className="flex-1">
                    Cancelar
                </Button>
                <Button onClick={handleSave} disabled={loading} className="flex-1">
                    {loading ? 'Guardando...' : 'Guardar Cambios'}
                </Button>
            </div>
        </div>
    )
}

function determineRole(position: string): string {
    const pos = position.toLowerCase()
    if (pos.includes('developer') || pos.includes('dueño')) return 'developer'
    if (pos.includes('admin') || pos.includes('encargado')) return 'administrator'
    if (pos.includes('cajero') || pos.includes('cajera')) return 'cajera'
    return 'empleado'
}
