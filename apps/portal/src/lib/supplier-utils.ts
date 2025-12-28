// Utility functions for supplier calculations and statistics
import { supabase } from './supabase'
import { Supplier } from '@panpanocha/types'

export interface SupplierStats {
    supplier_id: string
    supplier_name: string
    category: string
    total_purchased: number
    total_debt: number
    last_purchase_date: string | null
    last_purchase_amount: number
    orders_count: number
    paid_orders_count: number
    pending_orders_count: number
}

export interface SupplierDebt {
    supplier_id: string
    supplier_name: string
    category: string
    total_debt: number
    pending_orders: number
}

/**
 * Calculate total amount purchased from a supplier
 */
export async function calculateSupplierTotal(supplierId: string): Promise<number> {
    try {
        const { data, error } = await supabase
            .from('purchase_orders')
            .select('total_amount')
            .eq('supplier_id', supplierId)
            .eq('status', 'received')

        if (error) throw error

        return data?.reduce((sum, order) => sum + (order.total_amount || 0), 0) || 0
    } catch (error) {
        console.error('Error calculating supplier total:', error)
        return 0
    }
}

/**
 * Calculate pending debt for a supplier (unpaid orders)
 */
export async function calculateSupplierDebt(supplierId: string): Promise<number> {
    try {
        const { data, error } = await supabase
            .from('purchase_orders')
            .select('total_amount')
            .eq('supplier_id', supplierId)
            .eq('payment_status', 'pending')
            .in('status', ['pending', 'approved', 'received'])

        if (error) throw error

        return data?.reduce((sum, order) => sum + (order.total_amount || 0), 0) || 0
    } catch (error) {
        console.error('Error calculating supplier debt:', error)
        return 0
    }
}

/**
 * Get comprehensive statistics for a supplier
 */
export async function getSupplierStats(supplierId: string): Promise<SupplierStats | null> {
    try {
        // Get supplier info
        const { data: supplier, error: supplierError } = await supabase
            .from('suppliers')
            .select('id, name, category')
            .eq('id', supplierId)
            .single()

        if (supplierError) throw supplierError

        // Get all orders for this supplier
        const { data: orders, error: ordersError } = await supabase
            .from('purchase_orders')
            .select('total_amount, payment_status, status, created_at')
            .eq('supplier_id', supplierId)
            .order('created_at', { ascending: false })

        if (ordersError) throw ordersError

        // Calculate statistics
        const totalPurchased = orders
            ?.filter(o => o.status === 'received')
            .reduce((sum, o) => sum + (o.total_amount || 0), 0) || 0

        const totalDebt = orders
            ?.filter(o => o.payment_status === 'pending' && ['pending', 'approved', 'received'].includes(o.status))
            .reduce((sum, o) => sum + (o.total_amount || 0), 0) || 0

        const paidOrders = orders?.filter(o => o.payment_status === 'paid').length || 0
        const pendingOrders = orders?.filter(o => o.payment_status === 'pending').length || 0

        const lastOrder = orders?.[0]

        return {
            supplier_id: supplier.id,
            supplier_name: supplier.name,
            category: supplier.category || 'Sin categoría',
            total_purchased: totalPurchased,
            total_debt: totalDebt,
            last_purchase_date: lastOrder?.created_at || null,
            last_purchase_amount: lastOrder?.total_amount || 0,
            orders_count: orders?.length || 0,
            paid_orders_count: paidOrders,
            pending_orders_count: pendingOrders
        }
    } catch (error) {
        console.error('Error getting supplier stats:', error)
        return null
    }
}

/**
 * Get all suppliers with pending debt
 */
export async function getSuppliersWithDebt(): Promise<SupplierDebt[]> {
    try {
        // Get all active suppliers
        const { data: suppliers, error: suppliersError } = await supabase
            .from('suppliers')
            .select('id, name, category')
            .eq('active', true)

        if (suppliersError) throw suppliersError

        const debts: SupplierDebt[] = []

        for (const supplier of suppliers || []) {
            const { data: pendingOrders, error: ordersError } = await supabase
                .from('purchase_orders')
                .select('total_amount')
                .eq('supplier_id', supplier.id)
                .eq('payment_status', 'pending')
                .in('status', ['pending', 'approved', 'received'])

            if (ordersError) continue

            const totalDebt = pendingOrders?.reduce((sum, o) => sum + (o.total_amount || 0), 0) || 0

            if (totalDebt > 0) {
                debts.push({
                    supplier_id: supplier.id,
                    supplier_name: supplier.name,
                    category: supplier.category || 'Sin categoría',
                    total_debt: totalDebt,
                    pending_orders: pendingOrders?.length || 0
                })
            }
        }

        return debts.sort((a, b) => b.total_debt - a.total_debt)
    } catch (error) {
        console.error('Error getting suppliers with debt:', error)
        return []
    }
}

/**
 * Get total debt across all suppliers
 */
export async function getTotalSupplierDebt(): Promise<number> {
    try {
        const { data, error } = await supabase
            .from('purchase_orders')
            .select('total_amount')
            .eq('payment_status', 'pending')
            .in('status', ['pending', 'approved', 'received'])

        if (error) throw error

        return data?.reduce((sum, order) => sum + (order.total_amount || 0), 0) || 0
    } catch (error) {
        console.error('Error getting total supplier debt:', error)
        return 0
    }
}

/**
 * Get purchase summary for dashboard
 */
export async function getPurchaseSummary() {
    try {
        const { data: orders, error } = await supabase
            .from('purchase_orders')
            .select('*')
            .gte('created_at', new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString())

        if (error) throw error

        const summary = {
            total_purchased_this_month: 0,
            total_pending: 0,
            orders_count: 0,
            pending_count: 0,
            received_count: 0,
            cancelled_count: 0
        }

        orders?.forEach(o => {
            if (o.status === 'received') {
                summary.total_purchased_this_month += o.total_amount || 0
                summary.received_count++
            } else if (o.status === 'pending' || o.status === 'approved') {
                summary.total_pending += o.total_amount || 0
                summary.pending_count++
            } else if (o.status === 'cancelled') {
                summary.cancelled_count++
            }
            summary.orders_count++
        })

        return summary
    } catch (error) {
        console.error('Error getting purchase summary:', error)
        return null
    }
}

/**
 * Format currency for display
 */
export function formatCurrency(amount: number): string {
    return new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        minimumFractionDigits: 0
    }).format(amount)
}

/**
 * Get suppliers that should be ordered from today
 * Based on their configured order_day
 */
export async function getSuppliersToOrderToday(): Promise<Supplier[]> {
    try {
        const daysOfWeek = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
        const today = new Date()
        const todayName = daysOfWeek[today.getDay()]

        const { data, error } = await supabase
            .from('suppliers')
            .select('*')
            .eq('active', true)
            .eq('order_day', todayName)

        if (error) throw error

        return (data || []) as Supplier[]
    } catch (error) {
        console.error('Error getting suppliers to order today:', error)
        return []
    }
}

/**
 * Get suppliers that will deliver today
 * Based on their configured delivery_day
 */
export async function getSuppliersDeliveringToday(): Promise<Supplier[]> {
    try {
        const daysOfWeek = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
        const today = new Date()
        const todayName = daysOfWeek[today.getDay()]

        const { data, error } = await supabase
            .from('suppliers')
            .select('*')
            .eq('active', true)
            .eq('delivery_day', todayName)

        if (error) throw error

        return (data || []) as Supplier[]
    } catch (error) {
        console.error('Error getting suppliers delivering today:', error)
        return []
    }
}

/**
 * Get delivery schedule summary for the week
 */
export async function getWeeklyDeliverySchedule() {
    try {
        const { data, error } = await supabase
            .from('suppliers')
            .select('id, name, order_day, delivery_day, delivery_time_days')
            .eq('active', true)
            .not('order_day', 'is', null)
            .not('delivery_day', 'is', null)

        if (error) throw error

        // Group by day
        const schedule: Record<string, { toOrder: any[], toDeliver: any[] }> = {
            'Lunes': { toOrder: [], toDeliver: [] },
            'Martes': { toOrder: [], toDeliver: [] },
            'Miércoles': { toOrder: [], toDeliver: [] },
            'Jueves': { toOrder: [], toDeliver: [] },
            'Viernes': { toOrder: [], toDeliver: [] },
            'Sábado': { toOrder: [], toDeliver: [] },
            'Domingo': { toOrder: [], toDeliver: [] }
        }

        data?.forEach(supplier => {
            if (supplier.order_day && schedule[supplier.order_day]) {
                schedule[supplier.order_day].toOrder.push(supplier)
            }
            if (supplier.delivery_day && schedule[supplier.delivery_day]) {
                schedule[supplier.delivery_day].toDeliver.push(supplier)
            }
        })

        return schedule
    } catch (error) {
        console.error('Error getting weekly delivery schedule:', error)
        return null
    }
}

