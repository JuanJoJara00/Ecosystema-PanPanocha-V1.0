'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Users, Edit2, Trash2, DollarSign, Search, Filter, Building2, Briefcase, Play, Pause, Plus, Upload } from 'lucide-react'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import ModuleHeader from '@/components/ui/ModuleHeader'
import ModuleTabs from '@/components/ui/ModuleTabs'
import PageHeader from '@/components/ui/PageHeader'
import Modal from '@/components/ui/Modal'
import EmployeeFormModal from './EmployeeFormModal'
import EmployeeCSVImporter from './EmployeeCSVImporter'
import PayrollForm from './PayrollForm'
import EmployeeDetail from './EmployeeDetail'

import { Employee } from '@panpanocha/types'

export default function EmployeeList() {
    const [employees, setEmployees] = useState<Employee[]>([])
    const [branches, setBranches] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')
    const [selectedBranch, setSelectedBranch] = useState<string>('all')
    const [selectedStatus, setSelectedStatus] = useState<string>('active')

    // Modal States
    const [isFormModalOpen, setIsFormModalOpen] = useState(false)
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)
    const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null)
    const [viewingEmployee, setViewingEmployee] = useState<Employee | null>(null)

    const [isImportModalOpen, setIsImportModalOpen] = useState(false)
    const [isPayrollModalOpen, setIsPayrollModalOpen] = useState(false)
    const [selectedEmployeeForPayroll, setSelectedEmployeeForPayroll] = useState<Employee | null>(null)

    useEffect(() => {
        fetchBranches()
        fetchEmployees()
    }, [])

    const fetchBranches = async () => {
        const { data } = await supabase.from('branches').select('*').order('name')
        if (data) setBranches(data)
    }

    const fetchEmployees = async () => {
        setLoading(true)
        try {
            const query = supabase
                .from('employees')
                .select(`
                    *,
                    branches:branch_id (name)
                `)
                .order('full_name')

            const { data, error } = await query

            if (error) throw error
            setEmployees(data || [])
        } catch (error) {
            console.error('Error fetching employees:', error)
        } finally {
            setLoading(false)
        }
    }

    const toggleActive = async (id: string, currentStatus: boolean) => {
        try {
            const { error } = await supabase
                .from('employees')
                .update({ active: !currentStatus })
                .eq('id', id)

            if (error) throw error
            fetchEmployees()
        } catch (error) {
            console.error('Error updating employee status:', error)
        }
    }

    const handleFormSuccess = () => {
        setIsFormModalOpen(false)
        setEditingEmployee(null)
        fetchEmployees()
    }

    const handlePayrollSuccess = () => {
        setIsPayrollModalOpen(false)
        setSelectedEmployeeForPayroll(null)
        // Optionally refresh if we showed last payment date or something
    }

    const handleImportSuccess = () => {
        fetchEmployees()
        setIsImportModalOpen(false)
    }

    const handleViewDetail = (employee: Employee) => {
        setViewingEmployee(employee)
        setIsDetailModalOpen(true)
    }

    const handleEdit = (employee: Employee) => {
        setEditingEmployee(employee)
        setIsFormModalOpen(true)
    }

    const handleRegisterPayment = (employee: Employee) => {
        setSelectedEmployeeForPayroll(employee)
        setIsPayrollModalOpen(true)
    }

    const filteredEmployees = employees.filter(emp => {
        const matchesSearch = emp.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            emp.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            emp.position.toLowerCase().includes(searchTerm.toLowerCase())
        const matchesBranch = selectedBranch === 'all' || emp.branch_id === selectedBranch
        const matchesStatus = selectedStatus === 'all' ||
            (selectedStatus === 'active' && emp.active) ||
            (selectedStatus === 'inactive' && !emp.active)

        return matchesSearch && matchesBranch && matchesStatus
    })

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

    return (
        <div className="space-y-6">
            <ModuleHeader
                searchTerm={searchTerm}
                onSearchChange={setSearchTerm}
                searchPlaceholder="Buscar empleado..."
                actions={
                    <div className="flex gap-2">
                        <Button
                            variant="secondary"
                            onClick={() => setIsImportModalOpen(true)}
                            startIcon={<Upload className="h-4 w-4" />}
                        >
                            Importar
                        </Button>
                        <Button
                            onClick={() => {
                                setEditingEmployee(null)
                                setIsFormModalOpen(true)
                            }}
                            startIcon={<Plus className="h-4 w-4" />}
                        >
                            Nuevo Empleado
                        </Button>
                    </div>
                }
            >
                <div className="min-w-[200px]">
                    <select
                        value={selectedStatus}
                        onChange={(e) => setSelectedStatus(e.target.value)}
                        aria-label="Filtrar por estado"
                        className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-pp-gold/50 outline-none"
                    >
                        <option value="all">Todos los estados</option>
                        <option value="active">Activos</option>
                        <option value="inactive">Inactivos</option>
                    </select>
                </div>
            </ModuleHeader>

            <ModuleTabs
                tabs={branches.map(b => ({ id: b.id, label: b.name }))}
                activeTabId={selectedBranch}
                onTabChange={setSelectedBranch}
                labelAll="Todas las Sedes"
            />

            {loading ? (
                <div className="flex justify-center p-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pp-gold"></div>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredEmployees.map(employee => (
                        <Card
                            key={employee.id}
                            hover
                            className="flex flex-col h-full bg-white p-5 border border-gray-200 shadow-sm hover:shadow-md transition-all cursor-pointer group"
                            onClick={() => handleViewDetail(employee)}
                        >
                            <div className="flex justify-between items-start mb-4">
                                <div className="flex-1">
                                    <h3 className="font-bold text-gray-900 text-lg font-display">{employee.full_name}</h3>
                                    <p className="text-sm text-gray-500 font-sans">{employee.position}</p>
                                </div>
                                <Badge variant={employee.active ? 'success' : 'neutral'}>
                                    {employee.active ? 'Activo' : 'Inactivo'}
                                </Badge>
                            </div>

                            <div className="space-y-3 mb-6 flex-grow font-sans">
                                {employee.email && (
                                    <p className="text-sm text-gray-600 flex items-center gap-2">
                                        <span className="text-gray-400">📧</span>
                                        {employee.email}
                                    </p>
                                )}
                                {employee.phone && (
                                    <p className="text-sm text-gray-600 flex items-center gap-2">
                                        <span className="text-gray-400">📱</span>
                                        {employee.phone}
                                    </p>
                                )}
                                <p className="text-sm text-gray-600 flex items-center gap-2">
                                    <Building2 className="h-4 w-4 text-gray-400" />
                                    {employee.branches?.name || 'Sin sede'}
                                </p>
                                <div className="flex items-center justify-between pt-2 border-t border-dashed border-gray-100 mt-2">
                                    <span className="text-sm text-gray-500 flex items-center gap-1">
                                        <Briefcase className="h-3 w-3" />
                                        {getSalaryTypeLabel(employee.salary_type)}
                                    </span>
                                    <span className="text-sm font-bold text-pp-brown bg-pp-gold/20 px-2 py-0.5 rounded">
                                        {formatSalary(employee.base_salary)}
                                    </span>
                                </div>
                            </div>

                            <div className="grid grid-cols-4 gap-2 pt-2 border-t border-gray-100 mt-auto opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                <Button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleRegisterPayment(employee);
                                    }}
                                    disabled={!employee.active}
                                    className="bg-pp-gold hover:bg-pp-gold/80 text-pp-brown col-span-2 shadow-sm"
                                    size="sm"
                                    startIcon={<DollarSign className="h-4 w-4" />}
                                >
                                    Pagar
                                </Button>
                                <Button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleEdit(employee);
                                    }}
                                    variant="ghost"
                                    size="sm"
                                    className="text-gray-600 hover:bg-gray-100"
                                >
                                    <Edit2 className="h-4 w-4" />
                                </Button>
                                <Button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        toggleActive(employee.id, employee.active);
                                    }}
                                    variant="ghost"
                                    size="sm"
                                    className="text-gray-600 hover:bg-gray-100"
                                    title={employee.active ? 'Desactivar' : 'Activar'}
                                >
                                    {employee.active ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                                </Button>
                            </div>
                        </Card>
                    ))}
                </div>
            )
            }

            {/* Modals */}
            <EmployeeDetail
                isOpen={isDetailModalOpen}
                employee={viewingEmployee!}
                onClose={() => {
                    setIsDetailModalOpen(false)
                    setViewingEmployee(null)
                }}
                onEdit={() => {
                    setEditingEmployee(viewingEmployee)
                    setIsDetailModalOpen(false)
                    setIsFormModalOpen(true)
                }}
                onRegisterPayment={() => {
                    setSelectedEmployeeForPayroll(viewingEmployee)
                    setIsDetailModalOpen(false)
                    setIsPayrollModalOpen(true)
                }}
            />

            <EmployeeFormModal
                isOpen={isFormModalOpen}
                onClose={() => {
                    setIsFormModalOpen(false)
                    setEditingEmployee(null)
                }}
                editingEmployee={editingEmployee}
                branches={branches}
                onSubmit={async (formData, authParams) => {
                    setLoading(true)
                    try {
                        const dataToSave = {
                            ...formData,
                            base_salary: parseFloat(formData.base_salary)
                        }

                        let employeeId = editingEmployee?.id

                        if (editingEmployee) {
                            const { error } = await supabase
                                .from('employees')
                                .update(dataToSave)
                                .eq('id', editingEmployee.id)
                            if (error) throw error
                        } else {
                            const { data: newEmployee, error } = await supabase
                                .from('employees')
                                .insert([dataToSave])
                                .select()
                                .single()
                            if (error) throw error
                            employeeId = newEmployee.id
                        }

                        if (authParams?.createPortalAccess && formData.email && employeeId) {
                            const { data, error } = await supabase.functions.invoke('create-employee-user', {
                                body: {
                                    employeeId,
                                    email: formData.email,
                                    fullName: formData.full_name,
                                    role: formData.position,
                                    branchId: formData.branch_id,
                                    sendInvitation: authParams.sendInvitation
                                }
                            })

                            if (error) throw error

                            if (data.success && !authParams.sendInvitation) {
                                alert(`✅ Acceso Creado. Contraseña temporal: ${data.tempPassword}`)
                            }
                        }

                        handleFormSuccess()
                    } catch (error: any) {
                        console.error('Error saving employee:', error)
                        alert('Error al guardar: ' + error.message)
                    } finally {
                        setLoading(false)
                    }
                }}
            />

            <Modal
                isOpen={isImportModalOpen}
                onClose={() => setIsImportModalOpen(false)}
                title="Importar Empleados desde CSV"
            >
                <EmployeeCSVImporter
                    onSuccess={handleImportSuccess}
                />
            </Modal>

            <Modal
                isOpen={isPayrollModalOpen}
                onClose={() => {
                    setIsPayrollModalOpen(false)
                    setSelectedEmployeeForPayroll(null)
                }}
                title="Registrar Pago de Nómina"
            >
                <PayrollForm
                    onSuccess={handlePayrollSuccess}
                    onCancel={() => {
                        setIsPayrollModalOpen(false)
                        setSelectedEmployeeForPayroll(null)
                    }}
                    initialEmployee={selectedEmployeeForPayroll}
                />
            </Modal>
        </div >
    )
}
