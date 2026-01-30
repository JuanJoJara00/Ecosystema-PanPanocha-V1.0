'use client'

import SupplierList from '@/components/business/suppliers/SupplierList'
import { Supplier } from '@panpanocha/types'
import { SupplierStats, supplierService } from '@/services/supplier.service'
interface SuppliersViewProps {
    initialSuppliers: Supplier[]
    initialStats: Record<string, SupplierStats>
}

export default function SuppliersView({ initialSuppliers, initialStats }: SuppliersViewProps) {
    return (
        <SupplierList initialSuppliers={initialSuppliers} initialStats={initialStats} />
    )
}
