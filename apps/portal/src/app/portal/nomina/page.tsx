'use client'

import { useState } from 'react'
import PageHeader from '@/components/ui/PageHeader'
import EmployeeList from '@/components/business/payroll/EmployeeList'
import PayrollList from '@/components/business/payroll/PayrollList'
import { Users, DollarSign } from 'lucide-react'

export default function NominaPage() {
    const [activeTab, setActiveTab] = useState<'employees' | 'payroll'>('employees')

    return (
        <div className="space-y-6">
            <PageHeader title="Nómina y Empleados" subtitle="Gestión de pagos y personal" />


            {/* Tabs */}
            <div className="border-b border-gray-200">
                <nav className="-mb-px flex space-x-8">
                    <button
                        onClick={() => setActiveTab('employees')}
                        className={`py-4 px-1 border-b-2 font-bold font-display text-sm flex items-center gap-2 transition-colors ${activeTab === 'employees'
                            ? 'border-pp-gold text-pp-brown'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            }`}
                    >
                        <Users className="h-4 w-4" />
                        Empleados
                    </button>
                    <button
                        onClick={() => setActiveTab('payroll')}
                        className={`py-4 px-1 border-b-2 font-bold font-display text-sm flex items-center gap-2 transition-colors ${activeTab === 'payroll'
                            ? 'border-pp-gold text-pp-brown'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            }`}
                    >
                        <DollarSign className="h-4 w-4" />
                        Historial de Pagos
                    </button>
                </nav>
            </div>

            {/* Content */}
            {activeTab === 'employees' ? (
                <EmployeeList />
            ) : (
                <PayrollList />
            )}
        </div>
    )
}
