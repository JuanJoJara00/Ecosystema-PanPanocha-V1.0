'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Calendar, DollarSign, Download, Eye, Search, Filter, Plus, FilePlus } from 'lucide-react'
import jsPDF from 'jspdf'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
import PayrollForm from './PayrollForm'
import PayrollDetail from './PayrollDetail'
import DateRangeFilter from '@/components/ui/DateRangeFilter'
import { generatePaymentPeriods, PaymentPeriod } from '@/lib/period-generator'

interface PayrollRecord {
    id: string
    employee_id: string
    period_start: string
    period_end: string
    base_amount: number
    bonuses: number
    deductions: number
    net_amount: number
    payment_date: string
    payment_method: string
    payment_type?: string
    status: string
    notes: string
    employees?: { full_name: string; position: string; base_salary?: number; id?: string }
    payroll_items?: Array<{
        item_type: string
        concept: string
        amount: number
    }>
    payment_proof_url?: string
    isVirtual?: boolean // New flag for unregistered periods
    virtualPeriod?: PaymentPeriod // Store the period data
}

export default function PayrollList() {
    const [payrolls, setPayrolls] = useState<PayrollRecord[]>([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')
    const [selectedStatus, setSelectedStatus] = useState<string>('all')
    const [selectedPayroll, setSelectedPayroll] = useState<PayrollRecord | null>(null)

    // Date Range State
    const [startDate, setStartDate] = useState<string>(() => {
        const date = new Date();
        return new Date(date.getFullYear(), date.getMonth(), 1).toISOString().split('T')[0];
    })
    const [endDate, setEndDate] = useState<string>(() => {
        return new Date().toISOString().split('T')[0];
    })

    // Create new payment modal state
    const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false)
    const [initialPeriodToRegister, setInitialPeriodToRegister] = useState<PaymentPeriod | undefined>(undefined)
    const [initialEmployeeToRegister, setInitialEmployeeToRegister] = useState<any>(undefined)

    useEffect(() => {
        fetchPayrolls()
    }, [])

    const fetchPayrolls = async () => {
        setLoading(true)
        try {
            // Calculate Date Range
            const startISO = new Date(startDate).toISOString()
            const endISO = new Date(new Date(endDate).setHours(23, 59, 59)).toISOString()

            // 1. Fetch Registered Payrolls
            const { data: realPayrolls, error } = await supabase
                .from('payroll')
                .select(`
                    *,
                    employees:employee_id (id, full_name, position, base_salary, salary_type, hire_date),
                    payroll_items (item_type, concept, amount)
                `)
                .gte('period_start', startISO)
                .lte('period_start', endISO) // Filter by start date of period
                .order('created_at', { ascending: false })

            if (error) throw error

            // 2. Fetch Active Employees to calculate missing periods
            const { data: employees } = await supabase
                .from('employees')
                .select('*')
                .eq('active', true)

            let virtualPayrolls: PayrollRecord[] = []

            if (employees) {
                // Generate periods for each employee
                for (const emp of employees) {
                    const periods = await generatePaymentPeriods(emp.id, emp.salary_type, emp.hire_date)

                    // Filter for Overdue or Pending periods that don't have a payment_id
                    // AND fall within the selected date range
                    const missingPeriods = periods.filter(p =>
                        (p.status === 'overdue' || (p.status === 'pending' && p.is_current)) &&
                        !p.payment_id &&
                        p.period_start >= startDate &&
                        p.period_start <= endDate
                    )

                    // Convert to PayrollRecord format
                    const empVirtuals: PayrollRecord[] = missingPeriods.map(p => ({
                        id: `virtual-${emp.id}-${p.period_start}`,
                        employee_id: emp.id,
                        period_start: p.period_start,
                        period_end: p.period_end,
                        base_amount: emp.base_salary || 0,
                        bonuses: 0,
                        deductions: 0,
                        net_amount: emp.base_salary || 0, // Estimating net as base
                        payment_date: '',
                        payment_method: '',
                        status: 'pending', // Default to pending for list filter purposes, or match p.status
                        payment_type: p.status === 'overdue' ? 'late' : 'on_time',
                        notes: 'Periodo aún no registrado',
                        employees: {
                            id: emp.id,
                            full_name: emp.full_name,
                            position: emp.position,
                            base_salary: emp.base_salary
                        },
                        isVirtual: true,
                        virtualPeriod: p
                    }))
                    virtualPayrolls = [...virtualPayrolls, ...empVirtuals]
                }
            }

            // Combine and Sort
            // We want virtuals (debts) to likely appear at the top or mixed by date?
            // Let's sort everything by period_end desc
            const combined = [...virtualPayrolls, ...(realPayrolls || [])].sort((a, b) => {
                return new Date(b.period_end).getTime() - new Date(a.period_end).getTime()
            })

            setPayrolls(combined)
        } catch (error) {
            console.error('Error fetching payrolls:', error)
        } finally {
            setLoading(false)
        }
    }

    const updateStatus = async (id: string, newStatus: string) => {
        try {
            const { error } = await supabase
                .from('payroll')
                .update({ status: newStatus })
                .eq('id', id)

            if (error) throw error
            fetchPayrolls()
        } catch (error) {
            console.error('Error updating status:', error)
        }
    }

    const handleRegisterSuccess = () => {
        setIsRegisterModalOpen(false)
        setInitialPeriodToRegister(undefined)
        setInitialEmployeeToRegister(undefined)
        fetchPayrolls()
    }

    const handleOpenRegister = (payroll?: PayrollRecord) => {
        if (payroll && payroll.isVirtual && payroll.virtualPeriod) {
            setInitialPeriodToRegister(payroll.virtualPeriod)
            setInitialEmployeeToRegister(payroll.employees)
        } else {
            setInitialPeriodToRegister(undefined)
            setInitialEmployeeToRegister(undefined)
        }
        setIsRegisterModalOpen(true)
    }

    const generatePDF = (payroll: PayrollRecord) => {
        if (payroll.isVirtual) return
        try {
            const doc = new jsPDF()
            // ... (keep existing PDF logic) ...
            // Header
            doc.setFontSize(20)
            doc.text('PanPanocha', 105, 20, { align: 'center' })
            doc.setFontSize(14)
            doc.text('Recibo de Pago', 105, 30, { align: 'center' })

            doc.setFontSize(10)
            doc.text(`Empleado: ${payroll.employees?.full_name || 'N/A'}`, 20, 50)
            doc.text(`Cargo: ${payroll.employees?.position || 'N/A'}`, 20, 56)

            const periodStart = new Date(payroll.period_start + 'T00:00:00').toLocaleDateString('es-CO')
            const periodEnd = new Date(payroll.period_end + 'T00:00:00').toLocaleDateString('es-CO')
            const paymentDate = new Date(payroll.payment_date + 'T00:00:00').toLocaleDateString('es-CO')

            doc.text(`Periodo: ${periodStart} - ${periodEnd}`, 20, 62)
            doc.text(`Fecha de Pago: ${paymentDate}`, 20, 68)

            let y = 85
            doc.setFontSize(12)
            doc.text('Detalles del Pago', 20, y)
            y += 10

            doc.setFontSize(10)
            doc.text(`Salario Base:`, 20, y)
            doc.text(formatCurrency(payroll.base_amount), 150, y, { align: 'right' })
            y += 6

            if (payroll.payroll_items && payroll.payroll_items.some(i => i.item_type === 'bonus')) {
                y += 4
                doc.setFont('helvetica', 'bold')
                doc.text('Bonificaciones:', 20, y)
                doc.setFont('helvetica', 'normal')
                y += 6

                payroll.payroll_items
                    .filter(i => i.item_type === 'bonus')
                    .forEach(item => {
                        doc.text(`  ${item.concept}`, 25, y)
                        doc.text(formatCurrency(item.amount), 150, y, { align: 'right' })
                        y += 6
                    })
            }

            if (payroll.payroll_items && payroll.payroll_items.some(i => i.item_type === 'deduction')) {
                y += 4
                doc.setFont('helvetica', 'bold')
                doc.text('Deducciones:', 20, y)
                doc.setFont('helvetica', 'normal')
                y += 6

                payroll.payroll_items
                    .filter(i => i.item_type === 'deduction')
                    .forEach(item => {
                        doc.text(`  ${item.concept}`, 25, y)
                        doc.text(`-${formatCurrency(item.amount)}`, 150, y, { align: 'right' })
                        y += 6
                    })
            }

            y += 10
            doc.setFontSize(12)
            doc.setFont('helvetica', 'bold')
            doc.text('Total Neto:', 20, y)
            doc.text(formatCurrency(payroll.net_amount), 150, y, { align: 'right' })

            if (payroll.notes) {
                y += 15
                doc.setFontSize(10)
                doc.setFont('helvetica', 'normal')
                doc.text('Notas:', 20, y)
                y += 6
                const splitNotes = doc.splitTextToSize(payroll.notes, 170)
                doc.text(splitNotes, 20, y)
            }

            doc.setFontSize(8)
            doc.text('Este documento es un comprobante de pago', 105, 280, { align: 'center' })

            const employeeName = payroll.employees?.full_name?.replace(/\s+/g, '_') || 'empleado'
            const filename = `recibo_${employeeName}_${payroll.period_start}.pdf`

            doc.save(filename)
        } catch (error) {
            console.error('Error generating PDF:', error)
            alert('Error al generar el PDF.')
        }
    }

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('es-CO', {
            style: 'currency',
            currency: 'COP',
            minimumFractionDigits: 0
        }).format(amount)
    }

    const getPaymentMethodLabel = (method: string) => {
        const labels: Record<string, string> = {
            'cash': 'Efectivo',
            'transfer': 'Transferencia',
            'check': 'Cheque'
        }
        return labels[method] || method
    }

    const filteredPayrolls = payrolls.filter(p => {
        const matchesSearch = p.employees?.full_name.toLowerCase().includes(searchTerm.toLowerCase())
        // Virtual items count as "pending"
        let effectiveStatus = p.status
        if (p.isVirtual) effectiveStatus = 'pending'

        const matchesStatus = selectedStatus === 'all' || effectiveStatus === selectedStatus
        return matchesSearch && matchesStatus
    })

    if (loading) {
        return <div className="text-center py-12 text-gray-500 font-sans">Cargando historial...</div>
    }

    return (
        <div className="space-y-6">
            {/* Header / Search / Actions */}
            <Card className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-gray-50/50 p-4">
                <div className="relative flex-1 w-full md:max-w-md">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Buscar por nombre de empleado..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-pp-gold/50 focus:border-pp-gold transition-all outline-none font-sans"
                    />
                </div>

                <div className="flex gap-2 w-full md:w-auto">
                    <Button
                        onClick={() => handleOpenRegister()}
                        startIcon={<Plus className="h-4 w-4" />}
                        className="w-full sm:w-auto"
                    >
                        Registrar Pago
                    </Button>
                </div>
            </Card>

            {/* Date Filter */}
            <div className="flex justify-end">
                <DateRangeFilter
                    startDate={startDate}
                    endDate={endDate}
                    onStartDateChange={setStartDate}
                    onEndDateChange={setEndDate}
                    onFilter={fetchPayrolls}
                    loading={loading}
                />
            </div>

            {/* Status Tabs */}
            <div className="flex overflow-x-auto gap-2 p-1 bg-gray-200/50 rounded-lg max-w-full">
                {[
                    { id: 'all', label: 'Todos' },
                    { id: 'pending', label: 'Pendientes' },
                    { id: 'paid', label: 'Pagados' },
                    { id: 'cancelled', label: 'Cancelados' }
                ].map(status => (
                    <button
                        key={status.id}
                        onClick={() => setSelectedStatus(status.id)}
                        className={`px-4 py-1.5 font-bold text-sm transition-all rounded-md whitespace-nowrap font-display uppercase tracking-wide
                        ${selectedStatus === status.id
                                ? 'bg-white text-pp-brown shadow-sm border border-pp-gold/20'
                                : 'text-gray-500 hover:text-pp-brown hover:bg-gray-200/40'}`}
                    >
                        {status.label}
                    </button>
                ))}
            </div>

            {/* Payroll List */}
            {filteredPayrolls.length === 0 ? (
                <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-xl">
                    <DollarSign className="h-10 w-10 mx-auto mb-3 text-gray-300" />
                    <p className="text-gray-500 font-sans">No se encontraron registros de pago</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-4">
                    {filteredPayrolls.map(payroll => (
                        <Card
                            key={payroll.id}
                            hover
                            className={`p-4 transition-all duration-200 cursor-pointer ${payroll.isVirtual ? 'border-dashed border-pp-gold/50 bg-pp-gold/5' : ''}`}
                            onClick={() => {
                                // If virtual, convert to registration. If real, view details.
                                if (payroll.isVirtual) {
                                    handleOpenRegister(payroll)
                                } else {
                                    setSelectedPayroll(payroll)
                                }
                            }}
                        >
                            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 gap-4">
                                <div>
                                    <h3 className="font-bold text-pp-brown text-lg font-display uppercase flex items-center gap-2">
                                        {payroll.employees?.full_name || 'Empleado desconocido'}
                                        {payroll.isVirtual && (
                                            <span className="text-[0.6rem] bg-gray-500 text-white px-2 py-0.5 rounded-full">NO REGISTRADO</span>
                                        )}
                                    </h3>
                                    <p className="text-sm text-gray-500 font-sans">{payroll.employees?.position}</p>
                                </div>
                                <div className="flex gap-2">
                                    <Badge variant={payroll.payment_type === 'late' ? 'warning' : payroll.payment_type === 'advance' ? 'info' : 'success'}>
                                        {payroll.payment_type === 'late' ? '⏰ Atrasado' : payroll.payment_type === 'advance' ? '⚡ Avance' : '✓ Al Día'}
                                    </Badge>
                                    <Badge variant={payroll.status === 'paid' ? 'success' : payroll.status === 'cancelled' ? 'error' : 'warning'}>
                                        {payroll.status === 'paid' ? 'Pagado' : payroll.status === 'cancelled' ? 'Cancelado' : 'Pendiente'}
                                    </Badge>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 text-sm font-sans bg-gray-50 p-3 rounded-lg border border-gray-100">
                                <div>
                                    <p className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-1">Periodo</p>
                                    <p className="font-medium text-gray-700">
                                        {new Date(payroll.period_start).toLocaleDateString('es-CO', { month: 'short', day: 'numeric' })} - {new Date(payroll.period_end).toLocaleDateString('es-CO', { month: 'short', day: 'numeric' })}
                                    </p>
                                </div>
                                {payroll.isVirtual ? (
                                    <div className="col-span-2 flex items-center text-gray-500 italic text-xs">
                                        Este periodo aún no ha sido registrado.
                                    </div>
                                ) : (
                                    <>
                                        <div>
                                            <p className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-1">Fecha Pago</p>
                                            <p className="font-medium text-gray-700">{new Date(payroll.payment_date).toLocaleDateString('es-CO')}</p>
                                        </div>
                                        <div>
                                            <p className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-1">Método</p>
                                            <p className="font-medium text-gray-700">{getPaymentMethodLabel(payroll.payment_method)}</p>
                                        </div>
                                    </>
                                )}
                                <div>
                                    <p className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-1">{payroll.isVirtual ? 'Monto Base' : 'Total Neto'}</p>
                                    <p className="font-bold text-green-600 text-base">{formatCurrency(payroll.net_amount)}</p>
                                </div>
                            </div>

                            <div className="flex gap-2 justify-end opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                                {payroll.isVirtual ? (
                                    <Button
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            handleOpenRegister(payroll)
                                        }}
                                        className="bg-pp-gold hover:bg-pp-gold/80 text-pp-brown shadow-sm"
                                        size="sm"
                                        startIcon={<FilePlus className="h-4 w-4" />}
                                    >
                                        Registrar Ahora
                                    </Button>
                                ) : (
                                    <>
                                        <Button
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                setSelectedPayroll(payroll)
                                            }}
                                            variant="ghost"
                                            size="sm"
                                            startIcon={<Eye className="h-4 w-4" />}
                                        >
                                            Ver Detalles
                                        </Button>
                                        <Button
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                generatePDF(payroll)
                                            }}
                                            variant="secondary"
                                            size="sm"
                                            startIcon={<Download className="h-4 w-4" />}
                                        >
                                            Descargar PDF
                                        </Button>
                                        {payroll.status === 'pending' && (
                                            <Button
                                                onClick={(e) => {
                                                    e.stopPropagation()
                                                    updateStatus(payroll.id, 'paid')
                                                }}
                                                className="bg-pp-gold hover:bg-pp-gold/80 text-pp-brown"
                                                size="sm"
                                                startIcon={<DollarSign className="h-4 w-4" />}
                                            >
                                                Marcar Pagado
                                            </Button>
                                        )}
                                    </>
                                )}
                            </div>
                        </Card>
                    ))}
                </div>
            )}

            <Modal
                isOpen={isRegisterModalOpen}
                onClose={() => setIsRegisterModalOpen(false)}
                title="Registrar Pago de Nómina"
            >
                <PayrollForm
                    onSuccess={handleRegisterSuccess}
                    onCancel={() => setIsRegisterModalOpen(false)}
                    initialEmployee={initialEmployeeToRegister}
                    initialPeriod={initialPeriodToRegister}
                />
            </Modal>

            {/* Detail Modal */}
            <Modal
                isOpen={!!selectedPayroll}
                onClose={() => setSelectedPayroll(null)}
                title=""
                maxWidth="max-w-2xl"
                hideHeader={true}
            >
                {selectedPayroll && !selectedPayroll.isVirtual && (
                    <PayrollDetail
                        payroll={selectedPayroll}
                        onClose={() => setSelectedPayroll(null)}
                        onDownloadPDF={() => generatePDF(selectedPayroll)}
                    />
                )}
            </Modal>
        </div>
    )
}
