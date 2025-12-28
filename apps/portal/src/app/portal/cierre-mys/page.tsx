'use client'

import React from 'react'
import PageHeader from '@/components/ui/PageHeader'
import MysClosingWizard from '@/components/business/cash/MysClosingWizard' // We will build this next

export default function MysClosingPage() {
    return (
        <div className="space-y-6">
            <PageHeader
                title="Cierres MysInventarios"
                subtitle="Registro de base, movimientos y conteo de efectivo"
                backUrl="/portal/cierre-caja"
            />

            <div className="max-w-4xl mx-auto">
                <MysClosingWizard />
            </div>
        </div>
    )
}
