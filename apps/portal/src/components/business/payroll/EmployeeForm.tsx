'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { User, Mail, Phone, Briefcase, Building2, Calendar, DollarSign, Wallet, Shield, Lock } from 'lucide-react'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import { usePermissions } from '@/hooks/usePermissions'

interface EmployeeFormProps {
    onSuccess: () => void
    onCancel: () => void
    initialData?: any
}

export default function EmployeeForm({ onSuccess, onCancel, initialData }: EmployeeFormProps) {
    const [branches, setBranches] = useState<any[]>([])
    const [loading, setLoading] = useState(false)
    const { permissions } = usePermissions()
    // Check if initialData is a valid object with an ID to determine mode
    const isEditMode = !!(initialData && initialData.id)

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

    const [createPortalAccess, setCreatePortalAccess] = useState(false)
    const [sendInvitation, setSendInvitation] = useState(true)
    const [creatingUser, setCreatingUser] = useState(false)

    useEffect(() => {
        fetchBranches()
        if (isEditMode) {
            setFormData({
                full_name: initialData.full_name || '',
                email: initialData.email || '',
                phone: initialData.phone || '',
                position: initialData.position || '',
                branch_id: initialData.branch_id || '',
                hire_date: initialData.hire_date || new Date().toISOString().split('T')[0],
                salary_type: initialData.salary_type || 'monthly',
                base_salary: initialData.base_salary?.toString() || '',
                active: initialData.active ?? true
            })
        }
    }, [initialData, isEditMode])

    const fetchBranches = async () => {
        const { data } = await supabase.from('branches').select('*').order('name')
        if (data) setBranches(data)
    }

    // Get available roles based on current user's role
    const getAvailableRoles = () => {
        const allRoles = [
            { value: 'developer', label: 'Desarrollador/Dueño' },
            { value: 'administrator', label: 'Administrador (Encargado)' },
            { value: 'cajera', label: 'Cajera' },
            { value: 'empleado', label: 'Empleado (Mesero, Cocina, Aseo)' }
        ]

        // Developer: can create all roles
        if (permissions?.role === 'developer') {
            return allRoles
        }

        // Administrator: can only create cajera and empleado
        if (permissions?.role === 'administrator') {
            return allRoles.filter(r => r.value === 'cajera' || r.value === 'empleado')
        }

        // Cajera and Empleado: shouldn't be creating employees
        // But if they somehow access the form, only allow empleado
        return [{ value: 'empleado', label: 'Empleado' }]
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        try {
            const dataToSave = {
                ...formData,
                base_salary: parseFloat(formData.base_salary)
            }

            let employeeId = initialData?.id

            if (isEditMode) {
                // Update
                const { error } = await supabase
                    .from('employees')
                    .update(dataToSave)
                    .eq('id', initialData.id)

                if (error) throw error

                // If creating portal access for existing employee
                if (createPortalAccess && !initialData.user_id && formData.email) {
                    employeeId = initialData.id
                }
            } else {
                // Insert
                const { data: newEmployee, error } = await supabase
                    .from('employees')
                    .insert([dataToSave])
                    .select()
                    .single()

                if (error) throw error
                employeeId = newEmployee.id
            }

            // Create portal user if requested (only for new employees or if checkbox is checked)
            if (createPortalAccess && formData.email && employeeId) {
                setCreatingUser(true)
                try {
                    const { data, error } = await supabase.functions.invoke('create-employee-user', {
                        body: {
                            employeeId,
                            email: formData.email,
                            fullName: formData.full_name,
                            role: formData.position, // position field now contains the role value
                            branchId: formData.branch_id,
                            sendInvitation
                        }
                    })

                    if (error) throw error

                    if (data.success) {
                        if (sendInvitation) {
                            alert(`✅ Empleado creado y invitación enviada a ${formData.email}`)
                        } else {
                            alert(`✅ Empleado creado. Contraseña temporal: ${data.tempPassword}\n\nComparte esta contraseña con el empleado de forma segura.`)
                        }
                    }
                } catch (userError: any) {
                    console.error('Error creating user:', userError)
                    alert('⚠️ Empleado creado pero hubo un error al crear el usuario del portal: ' + userError.message)
                }
            }

            onSuccess()
        } catch (error: any) {
            console.error('Error saving employee:', error)
            alert('Error al guardar empleado: ' + error.message)
        } finally {
            setLoading(false)
            setCreatingUser(false)
        }
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                    <Input
                        label="Nombre Completo"
                        required
                        value={formData.full_name}
                        onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                        startIcon={<User className="h-4 w-4" />}
                        placeholder="Ej: Juan Pérez"
                    />
                </div>

                <Input
                    label="Email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    startIcon={<Mail className="h-4 w-4" />}
                    placeholder="empleado@panpanocha.com"
                />

                <Input
                    label="Teléfono"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    startIcon={<Phone className="h-4 w-4" />}
                    placeholder="300 123 4567"
                />

                <Select
                    label="Rol / Cargo"
                    required
                    value={formData.position}
                    onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                    options={getAvailableRoles()}
                />

                <Select
                    label="Sede"
                    required
                    value={formData.branch_id}
                    onChange={(e) => setFormData({ ...formData, branch_id: e.target.value })}
                    options={branches.map(b => ({ value: b.id, label: b.name }))}
                />

                <Input
                    label="Fecha de Contratación"
                    type="date"
                    required
                    value={formData.hire_date}
                    onChange={(e) => setFormData({ ...formData, hire_date: e.target.value })}
                    startIcon={<Calendar className="h-4 w-4" />}
                />

                <Select
                    label="Tipo de Salario"
                    required
                    value={formData.salary_type}
                    onChange={(e) => setFormData({ ...formData, salary_type: e.target.value })}
                    options={[
                        { value: 'monthly', label: 'Mensual' },
                        { value: 'biweekly', label: 'Quincenal' },
                        { value: 'daily', label: 'Diario' },
                        { value: 'hourly', label: 'Por Hora' }
                    ]}
                />

                <Input
                    label="Salario Base (COP)"
                    type="number"
                    required
                    min="0"
                    step="1000"
                    value={formData.base_salary}
                    onChange={(e) => setFormData({ ...formData, base_salary: e.target.value })}
                    startIcon={<DollarSign className="h-4 w-4" />}
                    placeholder="1200000"
                />

                <div className="md:col-span-2 pt-2">
                    <label className="flex items-center gap-2 cursor-pointer p-3 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">
                        <input
                            type="checkbox"
                            checked={formData.active}
                            onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                            className="w-4 h-4 text-pp-gold border-gray-300 rounded focus:ring-pp-gold focus:ring-offset-0"
                        />
                        <span className="text-sm font-bold text-gray-700 font-display uppercase tracking-wide">Empleado Activo</span>
                    </label>
                </div>

                {/* Portal Access Section - Only for new employees */}
                {!isEditMode && (
                    <div className="md:col-span-2 pt-4 border-t border-gray-200">
                        <div className="bg-blue-50 rounded-xl p-4 space-y-3">
                            <div className="flex items-center gap-2 text-blue-900">
                                <Shield className="h-5 w-5" />
                                <h4 className="font-bold text-sm uppercase tracking-wide">Acceso al Portal</h4>
                            </div>

                            <label className="flex items-center gap-3 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={createPortalAccess}
                                    onChange={(e) => setCreatePortalAccess(e.target.checked)}
                                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                />
                                <div>
                                    <div className="text-sm font-bold text-blue-900">Crear acceso al portal</div>
                                    <div className="text-xs text-blue-700">Permitir que este empleado inicie sesión en el portal</div>
                                </div>
                            </label>

                            {createPortalAccess && (
                                <div className="pl-7 space-y-2 pt-2 border-t border-blue-200">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={sendInvitation}
                                            onChange={(e) => setSendInvitation(e.target.checked)}
                                            className="w-4 h-4 text-blue-600 border-gray-300 rounded"
                                        />
                                        <span className="text-sm text-blue-800">
                                            Enviar email de invitación
                                        </span>
                                    </label>
                                    <p className="text-xs text-blue-600 italic">
                                        {sendInvitation
                                            ? '✉️ Se enviará un email con un link para crear su contraseña'
                                            : '🔑 Se generará una contraseña temporal que deberás compartir manualmente'
                                        }
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            <div className="flex gap-3 pt-4 border-t border-gray-100 justify-end">
                <Button
                    onClick={onCancel}
                    variant="ghost"
                    disabled={loading}
                >
                    Cancelar
                </Button>
                <Button
                    type="submit"
                    isLoading={loading || creatingUser}
                    startIcon={<User className="h-4 w-4" />}
                >
                    {creatingUser ? 'Creando usuario...' : (isEditMode ? 'Actualizar Empleado' : 'Crear Empleado')}
                </Button>
            </div>
        </form >
    )
}
