// Utility functions for payroll calculations and debt tracking
// To be used in admin dashboard

import { supabase } from './supabase'

/**
 * Calculate how much is owed to each employee based on their salary type
 * and last payment date
 */
export async function calculateEmployeeDebts() {
    try {
        // Get all active employees
        const { data: employees, error: empError } = await supabase
            .from('employees')
            .select('*')
            .eq('active', true)

        if (empError) throw empError

        const debts = []
        const today = new Date()

        for (const employee of employees || []) {
            // Get last payment for this employee
            const { data: lastPayments } = await supabase
                .from('payroll')
                .select('period_end, net_amount, payment_date')
                .eq('employee_id', employee.id)
                .order('period_end', { ascending: false })
                .limit(1)

            let debt = 0
            let periodsPending = 0
            let lastPaidPeriod = null

            if (!lastPayments || lastPayments.length === 0) {
                // No payments yet - calculate from hire date
                const hireDate = new Date(employee.hire_date)
                periodsPending = calculatePeriodsBetween(
                    hireDate,
                    today,
                    employee.salary_type
                )
                debt = employee.base_salary * periodsPending
                lastPaidPeriod = 'Nunca'
            } else {
                const lastPayment = lastPayments[0]
                const lastPeriodEnd = new Date(lastPayment.period_end)

                // Calculate periods between last payment and today
                periodsPending = calculatePeriodsBetween(
                    lastPeriodEnd,
                    today,
                    employee.salary_type
                )

                debt = employee.base_salary * periodsPending
                lastPaidPeriod = lastPeriodEnd.toLocaleDateString('es-CO')
            }

            debts.push({
                employee_id: employee.id,
                employee_name: employee.full_name,
                position: employee.position,
                salary_type: employee.salary_type,
                base_salary: employee.base_salary,
                last_paid_period: lastPaidPeriod,
                periods_pending: periodsPending,
                total_debt: debt,
                branch_id: employee.branch_id
            })
        }

        return debts
    } catch (error) {
        console.error('Error calculating employee debts:', error)
        return []
    }
}

/**
 * Calculate number of payment periods between two dates
 */
function calculatePeriodsBetween(startDate: Date, endDate: Date, salaryType: string): number {
    const diffTime = Math.abs(endDate.getTime() - startDate.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    switch (salaryType) {
        case 'daily':
            return diffDays
        case 'biweekly':
            return Math.floor(diffDays / 15)
        case 'monthly':
            const months = (endDate.getFullYear() - startDate.getFullYear()) * 12 +
                (endDate.getMonth() - startDate.getMonth())
            return months
        case 'hourly':
            return Math.floor(diffDays / 7) // Weekly
        default:
            return 0
    }
}

/**
 * Get payroll summary for dashboard
 */
export async function getPayrollSummary() {
    try {
        const { data: payrolls, error } = await supabase
            .from('payroll')
            .select('*')
            .gte('created_at', new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString())

        if (error) throw error

        const summary = {
            total_paid_this_month: 0,
            total_pending: 0,
            payments_count: 0,
            pending_count: 0,
            total_advances: 0,
            total_late_payments: 0
        }

        payrolls?.forEach(p => {
            if (p.status === 'paid') {
                summary.total_paid_this_month += p.net_amount
                summary.payments_count++
            } else if (p.status === 'pending') {
                summary.total_pending += p.net_amount
                summary.pending_count++
            }

            if (p.payment_type === 'advance') {
                summary.total_advances += p.net_amount
            } else if (p.payment_type === 'late') {
                summary.total_late_payments += p.net_amount
            }
        })

        return summary
    } catch (error) {
        console.error('Error getting payroll summary:', error)
        return null
    }
}

/**
 * Get total debt across all employees
 */
export async function getTotalPayrollDebt() {
    const debts = await calculateEmployeeDebts()
    return debts.reduce((total, debt) => total + debt.total_debt, 0)
}

/**
 * Get employees with pending payments (debt > 0)
 */
export async function getEmployeesWithDebt() {
    const debts = await calculateEmployeeDebts()
    return debts.filter(debt => debt.total_debt > 0)
}
