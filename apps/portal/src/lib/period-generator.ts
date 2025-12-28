// Utility to generate payment periods for an employee
import { supabase } from './supabase'

export interface PaymentPeriod {
    period_start: string
    period_end: string
    status: 'paid' | 'pending' | 'upcoming' | 'overdue'
    payment_id?: string
    net_amount?: number
    payment_date?: string
    is_current: boolean
}

/**
 * Generate all payment periods for an employee from hire date to future
 */
export async function generatePaymentPeriods(
    employeeId: string,
    salaryType: string,
    hireDate: string
): Promise<PaymentPeriod[]> {
    try {
        console.log('🔍 Generating periods for:', { employeeId, salaryType, hireDate })

        // Get all payments for this employee
        const { data: payments, error: paymentsError } = await supabase
            .from('payroll')
            .select('id, period_start, period_end, net_amount, payment_date, status')
            .eq('employee_id', employeeId)
            .order('period_start', { ascending: true })

        if (paymentsError) {
            console.error('Error fetching payments:', paymentsError)
        }

        console.log('📊 Found payments:', payments)

        const periods: PaymentPeriod[] = []
        const today = new Date()
        const hire = new Date(hireDate + 'T00:00:00')

        console.log('📅 Dates:', { today: today.toISOString(), hire: hire.toISOString() })

        // Generate periods from hire date to 3 months in the future
        let currentPeriodStart = new Date(hire)
        const futureLimit = new Date(today)
        futureLimit.setMonth(futureLimit.getMonth() + 3)

        console.log('⏰ Will generate periods from', currentPeriodStart.toISOString(), 'to', futureLimit.toISOString())

        let iterations = 0
        const maxIterations = 100 // Safety limit

        while (currentPeriodStart <= futureLimit && iterations < maxIterations) {
            iterations++
            const periodEnd = calculatePeriodEnd(currentPeriodStart, salaryType)

            const periodStartStr = formatDate(currentPeriodStart)
            const periodEndStr = formatDate(periodEnd)

            // Check if this period has been paid
            const payment = payments?.find(p =>
                p.period_start === periodStartStr && p.period_end === periodEndStr
            )

            let status: 'paid' | 'pending' | 'upcoming' | 'overdue'
            const isCurrent = isCurrentPeriod(currentPeriodStart, periodEnd, today, salaryType)

            if (payment) {
                status = 'paid'
            } else if (periodEnd < today) {
                status = 'overdue'
            } else if (isCurrent) {
                status = 'pending'
            } else {
                status = 'upcoming'
            }

            periods.push({
                period_start: periodStartStr,
                period_end: periodEndStr,
                status,
                payment_id: payment?.id,
                net_amount: payment?.net_amount,
                payment_date: payment?.payment_date,
                is_current: isCurrent
            })

            // Move to next period
            currentPeriodStart = new Date(periodEnd)
            currentPeriodStart.setDate(currentPeriodStart.getDate() + 1)
        }

        console.log('✅ Generated', periods.length, 'periods:', periods)
        return periods
    } catch (error) {
        console.error('❌ Error generating payment periods:', error)
        return []
    }
}

/**
 * Calculate the end date of a period based on start date and salary type
 */
function calculatePeriodEnd(startDate: Date, salaryType: string): Date {
    const end = new Date(startDate)

    switch (salaryType) {
        case 'daily':
            // Same day
            return end
        case 'biweekly':
            // 15 days
            end.setDate(end.getDate() + 14)
            return end
        case 'monthly':
            // Last day of the month
            end.setMonth(end.getMonth() + 1)
            end.setDate(0)
            return end
        case 'hourly':
            // Weekly (7 days)
            end.setDate(end.getDate() + 6)
            return end
        default:
            return end
    }
}

/**
 * Check if a period is the current active period
 */
function isCurrentPeriod(
    periodStart: Date,
    periodEnd: Date,
    today: Date,
    salaryType: string
): boolean {
    return today >= periodStart && today <= periodEnd
}

/**
 * Format date as YYYY-MM-DD
 */
function formatDate(date: Date): string {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
}

/**
 * Get human-readable period label
 */
export function getPeriodLabel(periodStart: string, periodEnd: string, salaryType: string): string {
    const start = new Date(periodStart + 'T00:00:00')
    const end = new Date(periodEnd + 'T00:00:00')

    const startMonth = start.toLocaleDateString('es-CO', { month: 'short' })
    const endMonth = end.toLocaleDateString('es-CO', { month: 'short' })
    const year = start.getFullYear()

    switch (salaryType) {
        case 'monthly':
            return `${start.toLocaleDateString('es-CO', { month: 'long', year: 'numeric' })}`
        case 'biweekly':
            if (start.getMonth() === end.getMonth()) {
                return `${start.getDate()}-${end.getDate()} ${startMonth} ${year}`
            }
            return `${start.getDate()} ${startMonth} - ${end.getDate()} ${endMonth} ${year}`
        case 'daily':
            return start.toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' })
        case 'hourly':
            return `Semana ${start.getDate()}-${end.getDate()} ${startMonth} ${year}`
        default:
            return `${periodStart} - ${periodEnd}`
    }
}
