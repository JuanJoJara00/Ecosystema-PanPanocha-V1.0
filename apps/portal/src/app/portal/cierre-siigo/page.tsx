'use client'

import React from 'react'
import PageHeader from '@/components/ui/PageHeader'
import SiigoClosingWizard from '@/components/business/cash/SiigoClosingWizard' // We will build this next

export default function SiigoClosingPage() {
    return (
        <div className="space-y-6">
            <PageHeader
                title="Arqueo Siigo (Contable)"
                subtitle="Registro de ventas y movimientos reportados por el sistema contable"
                backUrl="/portal/cierre-caja"
            />

            <div className="max-w-4xl mx-auto">
                <SiigoClosingWizard />
            </div>
        </div>
    )
}
