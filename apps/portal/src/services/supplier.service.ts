import { supabase } from '@/lib/supabase'
import { Supplier } from '@panpanocha/types'
import { SupabaseClient } from '@supabase/supabase-js'

export interface SupplierStats {
    total_purchased: number
    current_debt: number
}

// RPC Result Type
interface SupplierStatsRPC {
    supplier_id: string;
    total_purchased: number;
    current_debt: number;
}

export interface SupplierDashboardMetrics {
    totalPurchased: number
    totalDebt: number
    prevTotalPurchased: number
    prevTotalDebt: number
    timeSeries: { date: string, current: number, previous: number }[]
    supplierSeries: { id: string, name: string, current: number, debt: number, prev: number }[]
}

export const supplierService = {
    /**
     * Get all suppliers
     */
    async getAll(client?: SupabaseClient) {
        const sb = client || supabase
        const { data, error } = await sb
            .from('suppliers')
            .select('*')
            .order('name')

        if (error) throw error
        return data as Supplier[]
    },

    /**
     * Get aggregated stats for all suppliers using a single RPC call
     */
    async getStats(client?: SupabaseClient) {
        const sb = client || supabase
        const { data, error } = await sb
            .rpc('get_supplier_stats')

        if (error) {
            console.error('Error fetching stats:', error)
            return {}
        }

        const statsMap: Record<string, SupplierStats> = {}

        if (data) {
            // Safe cast if we trust the RPC output matches our interface
            (data as unknown as SupplierStatsRPC[]).forEach((stat) => {
                statsMap[stat.supplier_id] = {
                    total_purchased: Number(stat.total_purchased) || 0,
                    current_debt: Number(stat.current_debt) || 0
                }
            })
        }
        return statsMap
    },

    /**
     * Optimized debt calculation without N+1 problem
     * Uses a single query to fetch all pending orders grouped by supplier
     */
    async getSuppliersWithDebt() {
        // Fetch all pending orders with supplier info
        const { data, error } = await supabase
            .from('purchase_orders')
            .select(`
                total_amount,
                suppliers (
                    id,
                    name,
                    category
                )
            `)
            .eq('payment_status', 'pending')
            .in('status', ['pending', 'approved', 'received'])

        if (error) throw error

        // Aggregate in memory (much faster than N requests)
        const debtMap = new Map<string, {
            supplier_id: string,
            supplier_name: string,
            category: string,
            total_debt: number,
            pending_orders: number
        }>()

        // Define expected shape for the join query result
        type OrderWithSupplier = {
            total_amount: number;
            suppliers: {
                id: string;
                name: string;
                category: string;
            } | null; // One-to-one or Many-to-one, can be null if join fails (unlikely with FK)
        };

        (data as unknown as OrderWithSupplier[])?.forEach((order) => {
            const supplier = order.suppliers
            if (!supplier) return

            const current = debtMap.get(supplier.id) || {
                supplier_id: supplier.id,
                supplier_name: supplier.name,
                category: supplier.category || 'Sin categoría',
                total_debt: 0,
                pending_orders: 0
            }

            current.total_debt += order.total_amount || 0
            current.pending_orders += 1
            debtMap.set(supplier.id, current)
        })

        return Array.from(debtMap.values()).sort((a, b) => b.total_debt - a.total_debt)
    },

    /**
     * Get validated dashboard metrics with comparison
     */
    async getDashboardMetrics(
        range: { start?: string, end?: string } | null,
        prevRange: { start?: string, end?: string } | null
    ): Promise<SupplierDashboardMetrics> {
        // Queries
        let currQuery = supabase
            .from('purchase_orders')
            .select(`
                id,
                created_at,
                total_amount,
                payment_status,
                status,
                supplier:suppliers(id, name)
            `)
            .in('status', ['received', 'pending', 'approved', 'paid']) // All valid orders

        if (range?.start) currQuery = currQuery.gte('created_at', `${range.start}T00:00:00`)
        if (range?.end) currQuery = currQuery.lte('created_at', `${range.end}T23:59:59`)

        const { data: currData, error: currError } = await currQuery
        if (currError) throw currError

        let prevData: any[] = []
        if (prevRange?.start && prevRange?.end) {
            const { data, error } = await supabase
                .from('purchase_orders')
                .select(`created_at, total_amount, payment_status, status, supplier:suppliers(id)`)
                .in('status', ['received', 'pending', 'approved', 'paid'])
                .gte('created_at', `${prevRange.start}T00:00:00`)
                .lte('created_at', `${prevRange.end}T23:59:59`)

            if (!error && data) prevData = data
        }

        // --- Aggregation Logic ---

        // 1. Totals
        const totalPurchased = currData?.reduce((sum, o) => sum + (o.total_amount || 0), 0) || 0
        const totalDebt = currData?.reduce((sum, o) => sum + (o.payment_status === 'pending' ? (o.total_amount || 0) : 0), 0) || 0

        const prevTotalPurchased = prevData.reduce((sum, o) => sum + (o.total_amount || 0), 0)
        const prevTotalDebt = prevData.reduce((sum, o) => sum + (o.payment_status === 'pending' ? (o.total_amount || 0) : 0), 0)

        // 2. Time Series (Daily Volume) aligned by day index
        const getDayIndex = (d: string, start: string) => {
            if (!start) return 0 // Fallback
            const diff = new Date(d).getTime() - new Date(start).getTime()
            return Math.floor(diff / (1000 * 60 * 60 * 24))
        }

        const bucketMap = new Map<number, { date: string, current: number, previous: number }>()

        // Helper to init buckets
        if (range?.start && range?.end) {
            const start = new Date(range.start)
            const end = new Date(range.end)
            const days = Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1

            for (let i = 0; i < days; i++) {
                const d = new Date(start)
                d.setDate(d.getDate() + i)
                bucketMap.set(i, {
                    date: d.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' }),
                    current: 0,
                    previous: 0
                })
            }
        }

        currData?.forEach(o => {
            const idx = range?.start ? getDayIndex(o.created_at.split('T')[0], range.start) : 0
            const entry = bucketMap.get(idx)
            if (entry) {
                entry.current += o.total_amount || 0
                bucketMap.set(idx, entry)
            }
        })

        // Align previous data to same buckets?
        prevData.forEach(o => {
            const idx = prevRange?.start ? getDayIndex(o.created_at.split('T')[0], prevRange.start) : 0
            const entry = bucketMap.get(idx)
            if (entry) {
                entry.previous += o.total_amount || 0
                bucketMap.set(idx, entry)
            }
        })

        const timeSeries = Array.from(bucketMap.values())

        // 3. Supplier Series (Comparison)
        const supplierMap = new Map<string, { id: string, name: string, current: number, debt: number, prev: number }>()

        currData?.forEach(o => {
            // Supplier can be array or object depending on Supabase version/types, handling both
            const s = Array.isArray(o.supplier) ? o.supplier[0] : o.supplier
            const sId = s?.id
            const sName = s?.name
            if (!sId) return

            const entry = supplierMap.get(sId) || { id: sId, name: sName, current: 0, debt: 0, prev: 0 }
            entry.current += o.total_amount || 0
            if (o.payment_status === 'pending') entry.debt += o.total_amount || 0
            supplierMap.set(sId, entry)
        })

        prevData.forEach(o => {
            const s = Array.isArray(o.supplier) ? o.supplier[0] : o.supplier
            const sId = s?.id
            if (!sId) return

            const entry = supplierMap.get(sId)
            if (entry) {
                entry.prev += o.total_amount || 0
            }
        })

        return {
            totalPurchased,
            totalDebt,
            prevTotalPurchased,
            prevTotalDebt,
            timeSeries,
            supplierSeries: Array.from(supplierMap.values()).sort((a, b) => b.current - a.current)
        }
    }
}
