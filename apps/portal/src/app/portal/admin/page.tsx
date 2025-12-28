'use client'

import React from 'react'
import PageHeader from '@/components/ui/PageHeader'
import { BarChart3 } from 'lucide-react'

export default function AdminPage() {
    return (
        <div className="space-y-6">
            <PageHeader title="Admin Dashboard" subtitle="Reportes y métricas de gestión" />

            <div className="bg-white p-12 rounded-xl border border-gray-200 text-center shadow-sm">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-pp-gold/10 mb-4">
                    <BarChart3 className="h-8 w-8 text-pp-brown" />
                </div>
                <h2 className="text-xl font-bold text-gray-800 font-display mb-2">Módulo en Construcción</h2>
                <p className="text-gray-500 max-w-md mx-auto">
                    Panel administrativo avanzado en desarrollo. Aquí encontrarás métricas globales, auditoría y configuraciones del sistema.
                </p>
            </div>
        </div>
    )
}
