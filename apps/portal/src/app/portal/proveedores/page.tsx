import { supplierService } from '@/services/supplier.service'
import SuppliersView from '@/components/business/suppliers/SuppliersView'
import { Supplier } from '@panpanocha/types'

export default async function ProveedoresPage() {
    let suppliers: Supplier[] = []
    let stats = {}

    try {
        // Parallel data fetching for performance with fail-safe
        const [suppliersData, statsData] = await Promise.all([
            supplierService.getAll().catch(e => {
                console.error('Error fetching suppliers:', e)
                return []
            }),
            supplierService.getStats().catch(e => {
                console.error('Error fetching supplier stats:', e)
                return {}
            })
        ])
        suppliers = suppliersData
        stats = statsData
    } catch (error) {
        console.error('Critical error loading suppliers page:', error)
    }

    return (
        <SuppliersView
            initialSuppliers={suppliers}
            initialStats={stats}
        />
    )
}
