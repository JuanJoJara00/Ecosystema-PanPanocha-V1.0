import { supplierService } from '@/services/supplier.service'
import SuppliersView from '@/components/business/suppliers/SuppliersView'

export default async function ProveedoresPage() {
    // Parallel data fetching for performance
    const [suppliers, stats] = await Promise.all([
        supplierService.getAll(),
        supplierService.getStats()
    ])

    return (
        <SuppliersView
            initialSuppliers={suppliers}
            initialStats={stats}
        />
    )
}
