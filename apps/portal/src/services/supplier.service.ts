import { supabase } from '@/lib/supabase'
import { Supplier } from '@panpanocha/types'

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

export const supplierService = {
    /**
     * Get all suppliers
     */
    async getAll() {
        const { data, error } = await supabase
            .from('suppliers')
            .select('*')
            .order('name')

        if (error) throw error
        return data as Supplier[]
    },

    /**
     * Get aggregated stats for all suppliers using a single RPC call
     */
    async getStats() {
        const { data, error } = await supabase
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
    }
}
