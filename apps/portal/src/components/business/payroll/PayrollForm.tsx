'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Plus, X, CheckCircle, Clock, AlertCircle, Calendar, Download } from 'lucide-react'
import { generatePaymentPeriods, getPeriodLabel, PaymentPeriod } from '@/lib/period-generator'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'

interface PayrollFormProps {
    onSuccess: () => void
    onCancel: () => void
    initialEmployee?: any
    initialPeriod?: PaymentPeriod // New prop
}

interface PayrollItem {
    item_type: 'bonus' | 'deduction'
    concept: string
    amount: string
}

export default function PayrollForm({ onSuccess, onCancel, initialEmployee, initialPeriod }: PayrollFormProps) {
    const [employees, setEmployees] = useState<any[]>([])
    const [loading, setLoading] = useState(false)
    const [items, setItems] = useState<PayrollItem[]>([])
    const [paymentProof, setPaymentProof] = useState<File | null>(null)
    const [paymentProofPreview, setPaymentProofPreview] = useState<string>('')
    const [uploadingProof, setUploadingProof] = useState(false)
    const [calculatedPaymentType, setCalculatedPaymentType] = useState<string>('on_time')
    const [paymentPeriods, setPaymentPeriods] = useState<PaymentPeriod[]>([])
    const [selectedPeriod, setSelectedPeriod] = useState<PaymentPeriod | null>(null)
    const [showPeriodSelector, setShowPeriodSelector] = useState(false)
    const [formData, setFormData] = useState({
        employee_id: initialEmployee?.id || '',
        period_start: '',
        period_end: '',
        base_amount: initialEmployee?.base_salary?.toString() || '',
        payment_date: new Date().toISOString().split('T')[0],
        payment_method: 'transfer',
        status: 'pending',
        notes: ''
    })

    useEffect(() => {
        fetchEmployees()

        // Set default period (current month)
        const now = new Date()
        const firstDay = new Date(now.getFullYear(), now.getMonth(), 1)
        const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0)

        setFormData(prev => ({
            ...prev,
            period_start: firstDay.toISOString().split('T')[0],
            period_end: lastDay.toISOString().split('T')[0]
        }))
    }, [])

    useEffect(() => {
        if (initialEmployee) {
            setFormData(prev => ({
                ...prev,
                employee_id: initialEmployee.id,
                base_amount: initialEmployee.base_salary?.toString() || ''
            }))
        }
    }, [initialEmployee])

    // Handle initial period
    useEffect(() => {
        if (initialPeriod) {
            handlePeriodSelect(initialPeriod)
            // If we have an employee context, generate their periods too
            if (initialEmployee) {
                // Logic to select it visually is covered by handlePeriodSelect setting selectedPeriod
            }
        }
    }, [initialPeriod])


    // Calculate payment type when employee or period changes
    useEffect(() => {
        const calculateType = async () => {
            // ... existing logic ...
            if (formData.employee_id && formData.period_start && formData.period_end) {
                const type = await calculatePaymentType(
                    formData.employee_id,
                    formData.period_start,
                    formData.period_end
                )
                setCalculatedPaymentType(type)
            }
        }
        calculateType()
    }, [formData.employee_id, formData.period_start, formData.period_end])

    const fetchEmployees = async () => {
        const { data } = await supabase
            .from('employees')
            .select('*')
            .eq('active', true)
            .order('full_name')

        if (data) setEmployees(data)
    }

    const handleEmployeeChange = async (employeeId: string) => {
        const employee = employees.find(e => e.id === employeeId)

        setFormData({
            ...formData,
            employee_id: employeeId,
            base_amount: employee?.base_salary?.toString() || ''
        })

        // Load payment periods for this employee
        if (employee) {
            const periods = await generatePaymentPeriods(
                employee.id,
                employee.salary_type,
                employee.hire_date
            )
            setPaymentPeriods(periods)

            // Auto-select current pending period if exists AND no initial period was passed/selected
            if (!selectedPeriod) {
                const currentPending = periods.find(p => p.is_current && p.status !== 'paid')
                if (currentPending) {
                    handlePeriodSelect(currentPending)
                } else {
                    setShowPeriodSelector(true)
                }
            }
        }
    }

    const handleOpenPeriodSelector = async () => {
        // ... existing logic ...
        // If no periods loaded yet, load them
        if (paymentPeriods.length === 0 && formData.employee_id) {
            const employee = employees.find(e => e.id === formData.employee_id)
            if (employee) {
                const periods = await generatePaymentPeriods(
                    employee.id,
                    employee.salary_type,
                    employee.hire_date
                )
                setPaymentPeriods(periods)
            }
        }

        setShowPeriodSelector(true)
    }

    const handlePeriodSelect = (period: PaymentPeriod) => {
        setSelectedPeriod(period)
        setFormData(prev => ({
            ...prev,
            period_start: period.period_start,
            period_end: period.period_end
        }))
        setShowPeriodSelector(false)
    }

    // ... Rest of the functions (addItem, removeItem, updateItem, calculateTotals, calculatePaymentType, handleFileChange, uploadPaymentProof, handleSubmit) ...
    // Using simple pass-through for brevity where logic is unchanged, but since I'm rewriting the file, I must include all. 

    const addItem = (type: 'bonus' | 'deduction') => {
        setItems([...items, { item_type: type, concept: '', amount: '' }])
    }

    const removeItem = (index: number) => {
        setItems(items.filter((_, i) => i !== index))
    }

    const updateItem = (index: number, field: keyof PayrollItem, value: string) => {
        const newItems = [...items]
        newItems[index] = { ...newItems[index], [field]: value }
        setItems(newItems)
    }

    const calculateTotals = () => {
        const base = parseFloat(formData.base_amount) || 0
        const bonuses = items
            .filter(i => i.item_type === 'bonus')
            .reduce((sum, i) => sum + (parseFloat(i.amount) || 0), 0)
        const deductions = items
            .filter(i => i.item_type === 'deduction')
            .reduce((sum, i) => sum + (parseFloat(i.amount) || 0), 0)

        return {
            base,
            bonuses,
            deductions,
            net: base + bonuses - deductions
        }
    }

    const calculatePaymentType = async (employeeId: string, periodStart: string, periodEnd: string): Promise<string> => {
        try {
            // Get employee info (Need to ensure employees state is populated or fetch single if needed)
            // We use 'employees' state which is fetched on mount.
            let employee = employees.find(e => e.id === employeeId)
            // Fallback if employee list not loaded but initial passed
            if (!employee && initialEmployee && initialEmployee.id === employeeId) {
                employee = initialEmployee
            }
            if (!employee) return 'on_time'

            // Get last payment for this employee
            const { data: lastPayments } = await supabase
                .from('payroll')
                .select('period_end, payment_date')
                .eq('employee_id', employeeId)
                .order('period_end', { ascending: false })
                .limit(1)

            const today = new Date()
            const periodStartDate = new Date(periodStart)
            const periodEndDate = new Date(periodEnd)

            if (!lastPayments || lastPayments.length === 0) {
                const hireDate = new Date(employee.hire_date)
                if (periodStartDate < hireDate) {
                    return 'advance'
                }
                return 'on_time'
            }

            const lastPayment = lastPayments[0]
            const lastPeriodEnd = new Date(lastPayment.period_end)

            const expectedPeriodStart = new Date(lastPeriodEnd)
            expectedPeriodStart.setDate(expectedPeriodStart.getDate() + 1)

            const expectedPeriodEnd = new Date(expectedPeriodStart)
            switch (employee.salary_type) {
                case 'daily':
                    expectedPeriodEnd.setDate(expectedPeriodEnd.getDate())
                    break
                case 'biweekly':
                    expectedPeriodEnd.setDate(expectedPeriodEnd.getDate() + 14)
                    break
                case 'monthly':
                    expectedPeriodEnd.setMonth(expectedPeriodEnd.getMonth() + 1)
                    expectedPeriodEnd.setDate(0)
                    break
                case 'hourly':
                    expectedPeriodEnd.setDate(expectedPeriodEnd.getDate() + 6)
                    break
            }

            const actualStart = periodStartDate.getTime()
            const expectedStart = expectedPeriodStart.getTime()

            if (actualStart > expectedStart) return 'advance'
            else if (actualStart < expectedStart) return 'late'
            else return 'on_time'
        } catch (error) {
            console.error('Error calculating payment type:', error)
            return 'on_time'
        }
    }

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) {
            setPaymentProof(file)
            const reader = new FileReader()
            reader.onloadend = () => {
                setPaymentProofPreview(reader.result as string)
            }
            reader.readAsDataURL(file)
        }
    }

    const uploadPaymentProof = async (payrollId: string): Promise<string | null> => {
        if (!paymentProof) return null
        setUploadingProof(true)
        try {
            const fileExt = paymentProof.name.split('.').pop()
            const fileName = `${payrollId}_${Date.now()}.${fileExt}`
            const filePath = `payroll/${fileName}`

            const { error: uploadError } = await supabase.storage
                .from('payment_proofs')
                .upload(filePath, paymentProof)

            if (uploadError) throw uploadError

            const { data: { publicUrl } } = supabase.storage
                .from('payment_proofs')
                .getPublicUrl(filePath)

            return publicUrl
        } catch (error) {
            console.error('Error uploading proof:', error)
            return null
        } finally {
            setUploadingProof(false)
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        try {
            const totals = calculateTotals()
            const { data: { user } } = await supabase.auth.getUser()

            if (!paymentProof) {
                alert('Es obligatorio adjuntar el comprobante de pago.')
                setLoading(false)
                return
            }

            const paymentType = await calculatePaymentType(
                formData.employee_id,
                formData.period_start,
                formData.period_end
            )

            const { data: payrollData, error: payrollError } = await supabase
                .from('payroll')
                .insert([{
                    employee_id: formData.employee_id,
                    period_start: formData.period_start,
                    period_end: formData.period_end,
                    base_amount: totals.base,
                    bonuses: totals.bonuses,
                    deductions: totals.deductions,
                    payment_date: formData.payment_date,
                    payment_method: formData.payment_method,
                    payment_type: paymentType,
                    status: formData.status,
                    notes: formData.notes,
                    created_by: user?.id
                }])
                .select()
                .single()

            if (payrollError) throw payrollError

            if (paymentProof) {
                const proofUrl = await uploadPaymentProof(payrollData.id)
                if (proofUrl) {
                    await supabase
                        .from('payroll')
                        .update({ payment_proof_url: proofUrl })
                        .eq('id', payrollData.id)
                }
            }

            if (items.length > 0) {
                const itemsToInsert = items
                    .filter(item => item.concept && item.amount)
                    .map(item => ({
                        payroll_id: payrollData.id,
                        item_type: item.item_type,
                        concept: item.concept,
                        amount: parseFloat(item.amount)
                    }))

                if (itemsToInsert.length > 0) {
                    const { error: itemsError } = await supabase
                        .from('payroll_items')
                        .insert(itemsToInsert)

                    if (itemsError) throw itemsError
                }
            }

            onSuccess()
        } catch (error: any) {
            console.error('Error saving payroll:', error)
            alert('Error al registrar pago: ' + error.message)
        } finally {
            setLoading(false)
        }
    }

    const totals = calculateTotals()
    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('es-CO', {
            style: 'currency',
            currency: 'COP',
            minimumFractionDigits: 0
        }).format(amount)
    }

    const inputClassName = "w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pp-gold focus:border-pp-gold outline-none transition-all font-sans"
    const labelClassName = "block text-sm font-bold text-gray-700 mb-1 font-display"

    return (
        <form onSubmit={handleSubmit} className="space-y-6 font-sans">
            {/* ... Render Logic ... */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                    <label className={labelClassName}>Empleado *</label>
                    <select
                        required
                        value={formData.employee_id}
                        onChange={(e) => handleEmployeeChange(e.target.value)}
                        className={inputClassName}
                        disabled={!!initialEmployee}
                    >
                        <option value="">Seleccionar empleado</option>
                        {employees.map(emp => (
                            <option key={emp.id} value={emp.id}>
                                {emp.full_name} - {emp.position}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Period Selector */}
                <div className="md:col-span-2">
                    <label className={labelClassName}>Periodo de Pago *</label>
                    {selectedPeriod ? (
                        <div className="flex items-center gap-2">
                            <div className="flex-1 px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg shadow-sm">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="font-bold text-gray-900 font-display">
                                            {getPeriodLabel(selectedPeriod.period_start, selectedPeriod.period_end, employees.find(e => e.id === formData.employee_id)?.salary_type || initialEmployee?.salary_type || 'monthly')}
                                        </p>
                                        <p className="text-sm text-gray-500">
                                            {selectedPeriod.period_start} - {selectedPeriod.period_end}
                                        </p>
                                    </div>
                                    <Badge variant={selectedPeriod.status === 'paid' ? 'success' : selectedPeriod.status === 'overdue' ? 'error' : selectedPeriod.status === 'upcoming' ? 'info' : 'warning'}>
                                        {selectedPeriod.status === 'paid' ? 'Pagado' : selectedPeriod.status === 'overdue' ? 'Atrasado' : selectedPeriod.status === 'upcoming' ? 'Próximo' : 'Pendiente'}
                                    </Badge>
                                </div>
                            </div>
                            <Button type="button" onClick={() => handleOpenPeriodSelector()} variant="secondary">Cambiar</Button>
                        </div>
                    ) : (
                        <button
                            type="button"
                            onClick={() => handleOpenPeriodSelector()}
                            disabled={!formData.employee_id}
                            className={`w-full px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-[--pp-gold] hover:text-[--pp-gold] disabled:opacity-50 disabled:cursor-not-allowed transition-all`}
                        >
                            <Calendar className="h-5 w-5 mx-auto mb-1" />
                            Seleccionar Periodo de Pago
                        </button>
                    )}
                </div>

                {/* Period Selector Modal */}
                {showPeriodSelector && (
                    <div className="md:col-span-2">
                        <div className="border border-blue-100 rounded-lg p-4 bg-blue-50/50">
                            <h3 className="font-bold text-gray-800 mb-3 text-sm uppercase tracking-wider">Seleccionar Periodo de Pago</h3>
                            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                                {paymentPeriods.map((period, idx) => (
                                    <button
                                        key={idx}
                                        type="button"
                                        onClick={() => handlePeriodSelect(period)}
                                        className={`w-full text-left px-3 py-2 rounded-lg border transition-all ${period.status === 'paid'
                                            ? 'bg-gray-100 border-gray-200 cursor-not-allowed opacity-60'
                                            : 'bg-white border-gray-200 hover:border-blue-400 hover:shadow-sm'
                                            }`}
                                        disabled={period.status === 'paid'}
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex-1">
                                                <p className="font-semibold text-sm text-gray-800">
                                                    {getPeriodLabel(period.period_start, period.period_end, employees.find(e => e.id === formData.employee_id)?.salary_type || 'monthly')}
                                                </p>
                                                <p className="text-xs text-gray-500">
                                                    {period.period_start} - {period.period_end}
                                                </p>
                                            </div>
                                            <Badge size="sm" variant={period.status === 'paid' ? 'success' : period.status === 'overdue' ? 'error' : period.status === 'upcoming' ? 'info' : 'warning'}>
                                                {period.status === 'paid' ? 'Pagado' : period.status === 'overdue' ? 'Atrasado' : period.status === 'upcoming' ? 'Próximo' : 'Pendiente'}
                                            </Badge>
                                        </div>
                                    </button>
                                ))}
                            </div>
                            <Button type="button" onClick={() => setShowPeriodSelector(false)} variant="ghost" className="mt-3 w-full" size="sm">Cancelar</Button>
                        </div>
                    </div>
                )}

                {/* Basic Fields */}
                <div>
                    <label className={labelClassName}>Monto Base * (COP)</label>
                    <input type="number" required min="0" step="1000" value={formData.base_amount} onChange={(e) => setFormData({ ...formData, base_amount: e.target.value })} className={inputClassName} />
                </div>
                <div>
                    <label className={labelClassName}>Fecha de Pago *</label>
                    <input type="date" required value={formData.payment_date} onChange={(e) => setFormData({ ...formData, payment_date: e.target.value })} className={inputClassName} />
                </div>
                <div>
                    <label className={labelClassName}>Método de Pago *</label>
                    <select required value={formData.payment_method} onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })} className={inputClassName}>
                        <option value="cash">Efectivo</option>
                        <option value="transfer">Transferencia</option>
                        <option value="check">Cheque</option>
                    </select>
                </div>
                <div>
                    <label className={labelClassName}>Estado *</label>
                    <select required value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })} className={inputClassName}>
                        <option value="pending">Pendiente</option>
                        <option value="paid">Pagado</option>
                    </select>
                </div>

                {/* Proof Upload */}
                <div className="md:col-span-2">
                    <label className={labelClassName}>Comprobante de Pago *</label>
                    <div className="space-y-2">
                        <input type="file" accept="image/*,.pdf" onChange={handleFileChange} required className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pp-gold focus:border-pp-gold file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-pp-gold/10 file:text-pp-gold hover:file:bg-pp-gold/20 cursor-pointer" />
                        {paymentProofPreview && (
                            <div className="relative inline-block mt-2">
                                <img src={paymentProofPreview} alt="Preview" className="h-32 w-auto rounded-lg border border-gray-200 shadow-sm" />
                                <button type="button" onClick={() => { setPaymentProof(null); setPaymentProofPreview('') }} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 shadow-md"><X className="h-3 w-3" /></button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Bonuses/Deductions UI same as before */}
            <div className="space-y-4">
                <div>
                    <div className="flex justify-between items-center mb-2">
                        <h3 className="text-sm font-bold text-gray-700 font-display uppercase tracking-wide">Bonificaciones</h3>
                        <Button type="button" onClick={() => addItem('bonus')} variant="ghost" size="sm" className="text-green-600 hover:bg-green-50 px-2"><Plus className="h-4 w-4 mr-1" />Agregar</Button>
                    </div>
                    {items.filter(i => i.item_type === 'bonus').map((item, index) => {
                        const actualIndex = items.indexOf(item)
                        return (
                            <div key={actualIndex} className="flex gap-2 mb-2 items-center">
                                <input type="text" placeholder="Concepto" value={item.concept} onChange={(e) => updateItem(actualIndex, 'concept', e.target.value)} className={inputClassName} />
                                <input type="number" placeholder="Monto" value={item.amount} onChange={(e) => updateItem(actualIndex, 'amount', e.target.value)} className="w-32 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[--pp-gold] focus:border-[--pp-gold] outline-none font-sans" />
                                <button type="button" onClick={() => removeItem(actualIndex)} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"><X className="h-5 w-5" /></button>
                            </div>
                        )
                    })}
                </div>
                <div>
                    <div className="flex justify-between items-center mb-2">
                        <h3 className="text-sm font-bold text-gray-700 font-display uppercase tracking-wide">Deducciones</h3>
                        <Button type="button" onClick={() => addItem('deduction')} variant="ghost" size="sm" className="text-red-600 hover:bg-red-50 px-2"><Plus className="h-4 w-4 mr-1" />Agregar</Button>
                    </div>
                    {items.filter(i => i.item_type === 'deduction').map((item, index) => {
                        const actualIndex = items.indexOf(item)
                        return (
                            <div key={actualIndex} className="flex gap-2 mb-2 items-center">
                                <input type="text" placeholder="Concepto" value={item.concept} onChange={(e) => updateItem(actualIndex, 'concept', e.target.value)} className={inputClassName} />
                                <input type="number" placeholder="Monto" value={item.amount} onChange={(e) => updateItem(actualIndex, 'amount', e.target.value)} className="w-32 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[--pp-gold] focus:border-[--pp-gold] outline-none font-sans" />
                                <button type="button" onClick={() => removeItem(actualIndex)} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"><X className="h-5 w-5" /></button>
                            </div>
                        )
                    })}
                </div>
            </div>

            {/* Summary */}
            <div className="bg-gray-50 rounded-lg p-5 border border-gray-200">
                <div className="space-y-2">
                    <div className="flex justify-between text-sm font-sans"><span className="text-gray-600">Base:</span><span className="font-medium">{formatCurrency(totals.base)}</span></div>
                    <div className="flex justify-between text-sm font-sans"><span className="text-green-600">+ Bonificaciones:</span><span className="font-medium text-green-600">{formatCurrency(totals.bonuses)}</span></div>
                    <div className="flex justify-between text-sm font-sans"><span className="text-red-600">- Deducciones:</span><span className="font-medium text-red-600">{formatCurrency(totals.deductions)}</span></div>
                    <div className="flex justify-between text-lg font-bold pt-3 border-t border-gray-200 mt-2 font-display"><span>Total Neto:</span><span className="text-green-600">{formatCurrency(totals.net)}</span></div>
                </div>
            </div>

            {/* Notes */}
            <div>
                <label className={labelClassName}>Notas</label>
                <textarea value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} rows={3} className={inputClassName} placeholder="Notas adicionales..." />
            </div>

            <div className="flex gap-3 pt-4 border-t">
                <Button onClick={onCancel} variant="ghost" className="flex-1">Cancelar</Button>
                <Button type="submit" disabled={loading} className="flex-1 bg-pp-gold hover:brightness-105 text-white shadow-md hover:shadow-lg transition-all">{loading ? 'Registrando...' : 'Registrar Pago'}</Button>
            </div>
        </form>
    )
}
