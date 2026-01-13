'use client'
// Force refresh

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import PageHeader from '@/components/ui/PageHeader'
import ModuleTabs from '@/components/ui/ModuleTabs'
import DateRangeFilter from '@/components/ui/DateRangeFilter'
import { Calendar, Store, Eye, X, FileText, Search, AlertTriangle, Clock, CreditCard, Receipt, Check, Edit2, TrendingDown, DollarSign, ArrowLeft } from 'lucide-react'
import { ClosingChart } from './ClosingChart'
import ActiveShifts from './ActiveShifts'
import PanPanochaDetailModal from './PanPanochaDetailModal'
import SiigoDetailModal from './SiigoDetailModal'

import { config } from '@/config/brands/pan-panocha/config'
import { appConfig } from '@/config/app-config'
import Image from 'next/image'

// Types
import { Shift } from '@panpanocha/types'

type UnifiedClosing = {
    id: string
    date: string
    shift: string
    branch_name: string
    branch_id: string
    panpanocha?: any
    siigo?: any
}

// Helpers
const formatCurrency = (value: number) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(value)
const formatDate = (dateStr: string) => new Date(dateStr).toLocaleDateString('es-CO', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })
const formatDateTime = (dateStr: string) => new Date(dateStr).toLocaleString('es-CO', { year: '2-digit', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })

export default function ClosingHistory() {
    const router = useRouter()
    const [unifiedClosings, setUnifiedClosings] = useState<UnifiedClosing[]>([])
    const [branches, setBranches] = useState<{ id: string, name: string }[]>([])

    // Filters
    const [selectedBranch, setSelectedBranch] = useState<string>('all')
    const [activeType, setActiveType] = useState<'all' | 'panpanocha' | 'siigo'>('all')
    const [searchTerm, setSearchTerm] = useState<string>('')

    // Date Range State (Default: Current Month)
    const [startDate, setStartDate] = useState<string>(() => {
        const date = new Date();
        return new Date(date.getFullYear(), date.getMonth(), 1).toISOString().split('T')[0];
    })
    const [endDate, setEndDate] = useState<string>(() => {
        return new Date().toISOString().split('T')[0];
    })

    const [loading, setLoading] = useState(true)
    const [selectedUnified, setSelectedUnified] = useState<UnifiedClosing | null>(null)
    const [previousClosings, setPreviousClosings] = useState<UnifiedClosing[]>([])

    // File Upload State
    const [uploadingType, setUploadingType] = useState<'dataphone' | 'invoice' | 'panpanocha_invoice' | null>(null)
    const dataphoneInputRef = React.useRef<HTMLInputElement>(null)
    const invoiceInputRef = React.useRef<HTMLInputElement>(null)
    const panpanochaInvoiceInputRef = React.useRef<HTMLInputElement>(null)

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'dataphone' | 'invoice' | 'panpanocha_invoice') => {
        if (!e.target.files || e.target.files.length === 0 || !selectedUnified) return

        try {
            setUploadingType(type)
            const file = e.target.files[0]
            const fileExt = file.name.split('.').pop()
            const fileName = `closings/${selectedUnified.id}_${type}_${Date.now()}.${fileExt}`

            // 1. Upload to Supabase Storage (using 'products' bucket for now as it exists, organized in closings folder)
            const { error: uploadError } = await supabase.storage
                .from('products')
                .upload(fileName, file)

            if (uploadError) throw uploadError

            // 2. Get Public URL
            const { data: { publicUrl } } = supabase.storage
                .from('products')
                .getPublicUrl(fileName)

            // 3. Update Shift Metadata
            // We need to fetch the current raw shift to merge metadata safely
            const { data: currentShift, error: fetchError } = await supabase
                .from('shifts')
                .select('closing_metadata')
                .eq('id', selectedUnified.id)
                .single()

            if (fetchError) throw fetchError

            let currentMetadata = currentShift.closing_metadata || {}
            if (typeof currentMetadata === 'string') {
                try { currentMetadata = JSON.parse(currentMetadata) } catch (e) { }
            }

            let updatedMetadata = { ...currentMetadata }

            if (type === 'panpanocha_invoice') {
                updatedMetadata = {
                    ...updatedMetadata,
                    panpanocha: {
                        ...(updatedMetadata.panpanocha || {}),
                        panpanocha_invoice_url: publicUrl
                    }
                }
            } else {
                updatedMetadata = {
                    ...updatedMetadata,
                    siigo: {
                        ...(updatedMetadata.siigo || {}),
                        [type === 'dataphone' ? 'dataphone_voucher_url' : 'pos_invoice_url']: publicUrl
                    }
                }
            }

            const { error: updateError } = await supabase
                .from('shifts')
                .update({ closing_metadata: updatedMetadata })
                .eq('id', selectedUnified.id)

            if (updateError) throw updateError

            // 4. Transform and Update Local State to reflect changes immediately
            // 4. Transform and Update Local State to reflect changes immediately
            let updatedUnified = { ...selectedUnified }

            if (type === 'panpanocha_invoice') {
                updatedUnified = {
                    ...updatedUnified,
                    panpanocha: {
                        ...updatedUnified.panpanocha,
                        panpanocha_invoice_url: publicUrl
                    }
                }
            } else {
                updatedUnified = {
                    ...updatedUnified,
                    siigo: {
                        ...updatedUnified.siigo,
                        [type === 'dataphone' ? 'dataphone_voucher_url' : 'pos_invoice_url']: publicUrl
                    }
                }
            }
            setSelectedUnified(updatedUnified)

            // Also refresh main list
            fetchData()

        } catch (error: any) {
            console.error('Upload error:', error)
            alert('Error al subir el archivo: ' + error.message)
        } finally {
            setUploadingType(null)
            // Reset input
            if (e.target) e.target.value = ''
        }
    }

    // Initial Load
    useEffect(() => {
        const init = async () => {
            await fetchBranches()
        }
        init()
    }, [])

    // Fetch data when filter changes or branches might have loaded
    useEffect(() => {
        if (branches.length > 0) {
            fetchData()
        }
    }, [startDate, endDate, branches.length])

    const fetchBranches = async () => {
        const { data: branchData } = await supabase.from('branches').select('id, name').order('name')
        if (branchData) setBranches(branchData)
    }

    const transformShifts = (shifts: Shift[]) => {
        return shifts.map((s: Shift) => {
            let metadata: any = {};
            try {
                // @ts-ignore
                if (s.closing_metadata) {
                    metadata = typeof s.closing_metadata === 'string'
                        ? JSON.parse(s.closing_metadata)
                        : s.closing_metadata;
                }
            } catch (e) {
                console.error("Error parsing metadata for shift", s.id);
            }

            const branch = branches.find(b => b.id === s.branch_id)

            const panpanochaData = {
                base_cash: s.initial_cash || 0,
                sales_cash: (s.final_cash || 0) - (s.initial_cash || 0),
                sales_card: 0,
                sales_transfer: 0,
                expenses_total: 0,
                tips_total: 0,
                cash_audit_count: s.final_cash || 0,
                notes: 'Cierre Operativo POS',
                ...metadata.panpanocha
            };

            return {
                id: s.id,
                date: s.start_time,
                shift: 'General',
                branch_id: s.branch_id,
                branch_name: branch?.name || 'Sede Desconocida',
                panpanocha: panpanochaData,
                siigo: metadata.siigo || null
            }
        })
    }

    const fetchData = async () => {
        setLoading(true)

        // 1. Current Period (Explicit Local Time to covers full day 00:00 - 23:59)
        const startISO = new Date(`${startDate}T00:00:00`).toISOString()
        const endISO = new Date(`${endDate}T23:59:59.999`).toISOString()

        // 2. Previous Period Calculation
        const currentStart = new Date(`${startDate}T00:00:00`)
        const currentEnd = new Date(`${endDate}T23:59:59.999`)
        const duration = currentEnd.getTime() - currentStart.getTime()

        // Previous period ends just before current start
        const prevEnd = new Date(currentStart.getTime() - 1); // 1ms before current
        const prevStart = new Date(prevEnd.getTime() - duration);

        const prevStartISO = prevStart.toISOString()
        const prevEndISO = prevEnd.toISOString()

        // Fetch Both Promises Parallel
        const [currentRes, prevRes] = await Promise.all([
            supabase
                .from('shifts')
                .select('*')
                .gte('start_time', startISO)
                .lte('start_time', endISO)
                .eq('status', 'closed')
                .order('start_time', { ascending: false }),
            supabase
                .from('shifts')
                .select('*')
                .gte('start_time', prevStartISO)
                .lte('start_time', prevEndISO)
                .eq('status', 'closed')
                .order('start_time', { ascending: false })
        ])

        if (currentRes.error) {
            console.error("Error fetching shifts:", currentRes.error)
            setLoading(false)
            return
        }

        setUnifiedClosings(transformShifts(currentRes.data || []))
        setPreviousClosings(transformShifts(prevRes.data || []))
        setLoading(false)
    }

    // ... PDF export code remains same ...
    const handleExportPDF = async (unified: UnifiedClosing) => {
        const jsPDF = (await import('jspdf')).default
        const autoTable = (await import('jspdf-autotable')).default
        const doc = new jsPDF()

        // Helper to load image
        const getImageData = async (url: string) => {
            try {
                const res = await fetch(url)
                const blob = await res.blob()
                return new Promise<string>((resolve) => {
                    const reader = new FileReader()
                    reader.onloadend = () => resolve(reader.result as string)
                    reader.readAsDataURL(blob)
                })
            } catch (e) { return null }
        }

        // Load Logo
        const logoData = await getImageData(config.company.logoUrl)

        // Helper for Currency
        const fmt = (val: number | undefined) => formatCurrency(val || 0)

        // --- HEADER ---
        if (logoData) {
            doc.addImage(logoData, 'PNG', 14, 10, 25, 25)
            doc.setFontSize(22)
            doc.setTextColor(0, 0, 0)
            doc.text('PAN PANOCHA', 45, 20)

            doc.setFontSize(10)
            doc.setTextColor(60)
            doc.text('REPORTE DETALLADO DE CIERRE', 45, 26)
        } else {
            doc.setFontSize(22)
            doc.setTextColor(0, 0, 0)
            doc.text('PAN PANOCHA', 14, 20)
            doc.setFontSize(10)
            doc.text('REPORTE DETALLADO DE CIERRE', 14, 28)
        }

        doc.setFontSize(9)
        doc.setTextColor(0)
        doc.text(`Generado: ${new Date().toLocaleString('es-CO')}`, 14, 42)

        doc.text(`Sede: ${unified.branch_name}`, 200, 18, { align: 'right' })
        doc.text(`Fecha: ${formatDate(unified.date)}`, 200, 24, { align: 'right' })

        doc.setDrawColor(0); doc.setLineWidth(0.5);
        doc.line(14, 45, 196, 45)

        let currentY = 55

        // Styles
        const headStyles = { fillColor: [40, 40, 40], textColor: [255, 255, 255], fontStyle: 'bold' } as any
        const subHeadStyles = { fillColor: [220, 220, 220], textColor: [0, 0, 0], fontStyle: 'bold' } as any
        const theme = 'striped' as const

        // ==========================================
        // SECCIÓN 1: CIERRE PANPANOCHA (OPERATIVO)
        // ==========================================
        if (unified.panpanocha) {
            doc.setFontSize(14)
            doc.setTextColor(0)
            doc.text('1. Cierre PanPanocha (Operativo POS)', 14, currentY)
            currentY += 6

            // 1.1 Financials
            const ppReal = unified.panpanocha.cash_audit_count || 0
            const ppBase = unified.panpanocha.base_cash || 0
            const ppExpectedDB = unified.panpanocha.expected_cash || 0

            // Formula: Net Handover = Audit Total - Base
            const ppRealNet = ppReal - ppBase

            autoTable(doc, {
                startY: currentY,
                head: [['Concepto', 'Valor']],
                body: [
                    ['Base Inicial', fmt(ppBase)],
                    ['Ventas Efectivo', fmt(unified.panpanocha.sales_cash)],
                    ['Ventas Tarjeta', fmt(unified.panpanocha.sales_card)],
                    ['Ventas Transferencia', fmt(unified.panpanocha.sales_transfer)],
                    ['Gastos de Caja', `-${fmt(unified.panpanocha.expenses_total)}`],
                    ['Propinas Entregadas', `-${fmt(unified.panpanocha.tips_total)}`],
                    ['Efectivo Real (Auditado Total)', fmt(ppReal)],
                    ['Total a Entregar (Real - Base)', { content: fmt(ppRealNet), styles: { fontStyle: 'bold', fillColor: [240, 240, 240] } }]
                ],
                theme: theme,
                headStyles: { ...headStyles, halign: 'center' }, // Center headers
                columnStyles: { 1: { halign: 'center' } }
            })
            // @ts-ignore
            currentY = doc.lastAutoTable.finalY + 10

            // 1.2 Products Sold
            // @ts-ignore
            const products = unified.panpanocha.sales_by_category
            if (products) {
                doc.setFontSize(11)
                doc.setTextColor(50)
                doc.text('Productos Vendidos / Categorías', 14, currentY)
                currentY += 4

                autoTable(doc, {
                    startY: currentY,
                    head: [['Producto / Categoría', 'Total Venta']],
                    body: Object.entries(products).map(([k, v]) => [k, fmt(v as number)]),
                    theme: theme,
                    headStyles: { ...subHeadStyles, halign: 'center' },
                    columnStyles: { 1: { halign: 'center' } }
                })
                // @ts-ignore
                currentY = doc.lastAutoTable.finalY + 15
            } else {
                currentY += 10
            }
        }

        // ==========================================
        // SECCIÓN 2: CIERRE SIIGO (CONTABLE)
        // ==========================================
        if (unified.siigo) {
            if (currentY + 60 > 280) { doc.addPage(); currentY = 20; }

            doc.setFontSize(14)
            doc.setTextColor(0)
            doc.text('2. Cierre Siigo (Contable/Facturación)', 14, currentY)
            currentY += 6

            // Mirroring PanPanocha Structure exactly
            const sgBase = unified.siigo.base_cash || 0
            const sgReal = unified.siigo.cash_audit_count || 0
            const sgRealNet = sgReal - sgBase

            autoTable(doc, {
                startY: currentY,
                head: [['Concepto', 'Valor']],
                body: [
                    ['Base Inicial', fmt(sgBase)],
                    ['Ventas Efectivo', fmt(unified.siigo.sales_cash)],
                    ['Ventas Tarjeta', fmt(unified.siigo.sales_card)],
                    ['Ventas Transferencia', fmt(unified.siigo.sales_transfer)],
                    ['Gastos de Caja', `-${fmt(unified.siigo.expenses_total)}`],
                    ['Propinas Entregadas', `-${fmt(unified.siigo.tips_total)}`],
                    // Mirroring PanPanocha
                    ['Efectivo Real (Auditado Total)', fmt(sgReal)],
                    ['Total a Entregar (Real - Base)', { content: fmt(sgRealNet), styles: { fontStyle: 'bold', fillColor: [240, 240, 240] } }]
                ],
                theme: theme,
                headStyles: { ...headStyles, halign: 'center' },
                columnStyles: { 1: { halign: 'center' } }
            })
            // @ts-ignore
            currentY = doc.lastAutoTable.finalY + 10

            // 2.2 Products Sold
            // @ts-ignore
            const products = unified.siigo.sales_by_category
            if (products) {
                doc.setFontSize(11)
                doc.setTextColor(50)
                doc.text('Detalle de Facturación (Categorías Siigo)', 14, currentY)
                currentY += 4

                autoTable(doc, {
                    startY: currentY,
                    head: [['Categoría', 'Total Facturado']],
                    body: Object.entries(products).map(([k, v]) => [k, fmt(v as number)]),
                    theme: theme,
                    headStyles: { ...subHeadStyles, halign: 'center' },
                    columnStyles: { 1: { halign: 'center' } }
                })
                // @ts-ignore
                currentY = doc.lastAutoTable.finalY + 15
            } else {
                currentY += 10
            }
        }

        // ==========================================
        // SECCIÓN 3: TOTALES UNIFICADOS (SUMA)
        // ==========================================
        if (currentY + 60 > 280) { doc.addPage(); currentY = 20; }

        doc.setFontSize(14)
        doc.setTextColor(0)
        doc.text('3. Consolidado Unificado (Suma Global)', 14, currentY)
        currentY += 6

        const pp = unified.panpanocha || {} as any
        const sg = unified.siigo || {} as any

        // Summation Logic
        const sumBase = (pp.base_cash || 0) + (sg.base_cash || 0)
        const sumCash = (pp.sales_cash || 0) + (sg.sales_cash || 0)
        const sumCard = (pp.sales_card || 0) + (sg.sales_card || 0)
        const sumTrans = (pp.sales_transfer || 0) + (sg.sales_transfer || 0)
        const sumExpenses = (pp.expenses_total || 0) + (sg.expenses_total || 0)
        const sumTips = (pp.tips_total || 0) + (sg.tips_total || 0)

        // Net Handover Sum (Sum of Real Nets)
        const ppRealSum = pp.cash_audit_count || 0
        const ppRealNetSum = ppRealSum - (pp.base_cash || 0)

        const sgRealSum = sg.cash_audit_count || 0
        const sgRealNetSum = sgRealSum - (sg.base_cash || 0)

        const sumHandover = ppRealNetSum + sgRealNetSum

        autoTable(doc, {
            startY: currentY,
            head: [['Concepto', 'Total Unificado']],
            body: [
                ['Base Inicial Total', fmt(sumBase)],
                ['Venta Total (Efectivo)', fmt(sumCash)],
                ['Venta Total (Tarjeta)', fmt(sumCard)],
                ['Venta Total (Transferencia)', fmt(sumTrans)],
                ['Total Gastos de Caja', `-${fmt(sumExpenses)}`],
                ['Total Propinas Entregadas', `-${fmt(sumTips)}`],
                ['Total a Entregar (Neto Global)', { content: fmt(sumHandover), styles: { fontStyle: 'bold', fillColor: [230, 230, 230] } }]
            ],
            theme: 'grid',
            headStyles: { ...headStyles, halign: 'center' },
            columnStyles: { 1: { halign: 'center' } }
        })

        // @ts-ignore
        currentY = doc.lastAutoTable.finalY + 30

        // Signatures
        if (currentY + 30 > 280) { doc.addPage(); currentY = 30; }

        doc.setLineWidth(0.5); doc.setDrawColor(0);
        doc.line(30, currentY, 90, currentY);
        doc.line(120, currentY, 180, currentY);
        doc.setFontSize(8); doc.setTextColor(0);
        doc.text('Firma Responsable', 60, currentY + 5, { align: 'center' })
        doc.text('Firma Supervisor', 150, currentY + 5, { align: 'center' })

        // Page Numbers
        const pageCount = doc.internal.pages.length - 1
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i)
            doc.text(`Página ${i} de ${pageCount}`, 105, 290, { align: 'center' })
        }

        doc.save(`Reporte_Cierre_${unified.branch_name.replace(/\s+/g, '_')}_${unified.date.split('T')[0]}.pdf`)
    }

    // Generate Tab Options from Branches
    const tabOptions = branches.map(b => ({ id: b.id, label: b.name }))

    // Client-side branch filtering (applied to BOTH periods)
    // Apply Branch Filter
    const branchFilteredClosings = selectedBranch === 'all'
        ? unifiedClosings
        : unifiedClosings.filter(c => c.branch_id === selectedBranch)

    // Apply Type Filter (only show closings that have the relevant data)
    const typeFilteredClosings = activeType === 'all'
        ? branchFilteredClosings
        : branchFilteredClosings.filter(c => {
            if (activeType === 'panpanocha') return c.panpanocha !== undefined
            if (activeType === 'siigo') return c.siigo !== undefined
            return true
        })

    // Apply Search Filter
    const filteredClosings = searchTerm.trim() === ''
        ? typeFilteredClosings
        : typeFilteredClosings.filter(c =>
            c.branch_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            c.shift?.toLowerCase().includes(searchTerm.toLowerCase())
        )

    const filteredPrevious = selectedBranch === 'all'
        ? previousClosings
        : previousClosings.filter(c => c.branch_id === selectedBranch)

    // Group Closings by Date
    const groupedClosings = Object.entries(
        filteredClosings.reduce((acc, closing) => {
            const dateKey = formatDate(closing.date)
            if (!acc[dateKey]) acc[dateKey] = []
            acc[dateKey].push(closing)
            return acc
        }, {} as Record<string, UnifiedClosing[]>)
    )

    return (
        <div className="flex gap-2 w-full h-[calc(100vh-4rem)]">
            {/* LEFT PANEL - Static (no scroll) */}
            <div className="w-1/2 flex-shrink-0 flex flex-col gap-3 overflow-y-auto">
                {/* Unified Header Block */}
                <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl shadow-xl border border-gray-100/50 dark:border-white/5 relative overflow-hidden">
                    {/* Row 1: Brand, Type Filter, Date Filter */}
                    <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6 relative z-10">

                        {/* Brand & Title Section */}
                        <div className="flex items-center gap-4">
                            <div className="relative h-14 w-14 shrink-0 bg-pp-gold/10 rounded-2xl overflow-hidden flex items-center justify-center p-2">
                                <Image
                                    src={appConfig.company.logoUrl}
                                    alt={appConfig.company.name}
                                    fill
                                    className="object-contain"
                                />
                            </div>
                            <div>
                                <h1 className="text-2xl font-black text-gray-900 dark:text-white font-display uppercase tracking-tight">
                                    Cierre de Caja y Conciliación
                                </h1>
                                <p className="text-gray-500 font-medium text-sm">
                                    Gestión de efectivo operativo y contable
                                </p>
                            </div>
                        </div>

                        {/* Type Filter */}
                        <div className="flex items-center gap-2 bg-gray-100 dark:bg-slate-800 p-1.5 rounded-xl">
                            <button
                                onClick={() => setActiveType('all')}
                                className={`px-4 py-2 text-sm font-bold rounded-lg transition-all ${activeType === 'all' ? 'bg-white dark:bg-slate-700 shadow-sm text-gray-900 dark:text-white' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
                            >
                                Todos
                            </button>
                            <button
                                onClick={() => setActiveType('panpanocha')}
                                className={`px-4 py-2 text-sm font-bold rounded-lg transition-all ${activeType === 'panpanocha' ? 'bg-white dark:bg-slate-700 shadow-sm text-pp-brown' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
                            >
                                PanPanocha
                            </button>
                            <button
                                onClick={() => setActiveType('siigo')}
                                className={`px-4 py-2 text-sm font-bold rounded-lg transition-all ${activeType === 'siigo' ? 'bg-white dark:bg-slate-700 shadow-sm text-pp-brown' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
                            >
                                Siigo
                            </button>
                        </div>

                        {/* Date Filter */}
                        <DateRangeFilter
                            startDate={startDate}
                            endDate={endDate}
                            onStartDateChange={setStartDate}
                            onEndDateChange={setEndDate}
                            onFilter={fetchData}
                            loading={loading}
                        />
                    </div>

                    {/* Divider */}
                    <div className="h-px bg-gray-100 dark:bg-white/5 w-full my-6" />

                    {/* Row 2: Search & Actions */}
                    <div className="flex flex-col lg:flex-row gap-4 justify-between items-center mb-6">
                        {/* Search */}
                        <div className="relative w-full lg:max-w-xl group">
                            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-pp-gold transition-colors">
                                <Search className="h-5 w-5" />
                            </div>
                            <input
                                type="text"
                                placeholder="Buscar cierre por sede, operador..."
                                className="pl-12 pr-4 py-3.5 w-full bg-gray-50 dark:bg-slate-800 border border-transparent focus:bg-white dark:focus:bg-slate-700 border-gray-100 dark:border-white/5 rounded-2xl focus:ring-4 focus:ring-pp-gold/10 focus:border-pp-gold outline-none transition-all text-sm font-bold placeholder:text-gray-400 dark:placeholder:text-gray-500 dark:text-white"
                                value={searchTerm || ''}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>

                        {/* Actions */}
                        <div className="flex gap-3 w-full lg:w-auto">
                            <Button
                                variant="secondary"
                                onClick={() => selectedUnified && handleExportPDF(selectedUnified)}
                                startIcon={<FileText className="h-5 w-5" />}
                                className="py-3.5 px-6 h-auto font-bold rounded-xl border-gray-200 hover:bg-gray-50 text-gray-600"
                            >
                                Generar Reporte
                            </Button>
                        </div>
                    </div>

                    {/* Row 3: Branch Tabs */}
                    <div className="border-t border-gray-100 dark:border-white/5 pt-2">
                        <ModuleTabs
                            tabs={tabOptions}
                            activeTabId={selectedBranch}
                            onTabChange={setSelectedBranch}
                            labelAll="Todos"
                        />
                    </div>

                    {/* Live Monitoring Section (Integrated) */}
                    <div className="mt-6 pt-6 border-t border-gray-100 dark:border-white/5">
                        <ActiveShifts />
                    </div>
                </div>

                {/* Charts Section - in left panel */}
                {!loading && groupedClosings.length > 0 && (
                    <ClosingChart currentData={filteredClosings} prevData={filteredPrevious} />
                )}
            </div>

            {/* RIGHT PANEL - Scrollable Cards */}
            <div className="w-1/2 overflow-y-auto">
                {loading ? (
                    <div className="text-center py-10 text-gray-400">Cargando historial unificado...</div>
                ) : groupedClosings.length === 0 ? (
                    <div className="text-center py-10 text-gray-400 bg-gray-50 rounded-xl border border-dashed">
                        No hay cierres registrados para este periodo.
                    </div>
                ) : (
                    <div className="space-y-6">

                        {groupedClosings.map(([dateLabel, closings]) => (
                            <div key={dateLabel} className="bg-gray-50/50 dark:bg-slate-900/50 rounded-xl border border-gray-200/60 dark:border-white/5 overflow-hidden shadow-sm">
                                {/* POS-style Date Header */}
                                <div className="bg-gray-100/80 dark:bg-slate-800 px-5 py-3 border-b border-gray-200 dark:border-white/5 flex items-center gap-2">
                                    <Calendar className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                                    <h4 className="font-bold text-gray-700 dark:text-gray-200 text-sm uppercase tracking-wide">
                                        {dateLabel} <span className="text-gray-400 dark:text-gray-600 font-normal normal-case ml-1">({closings.length} {closings.length === 1 ? 'Cierre' : 'Cierres'})</span>
                                    </h4>
                                </div>

                                <div className="p-4 space-y-4">
                                    {closings.map(unified => {
                                        // Calculate type-specific values
                                        const ppData = unified.panpanocha
                                        const sgData = unified.siigo

                                        // PanPanocha calculations
                                        const ppCash = ppData?.sales_cash || 0
                                        const ppCard = ppData?.sales_card || 0
                                        const ppTransfer = ppData?.sales_transfer || 0
                                        const ppExpenses = (ppData?.expenses_total || 0) + (ppData?.tips_total || 0)
                                        const ppTotal = ppCash + ppCard + ppTransfer
                                        const ppDiff = ppData ? (ppData.cash_audit_count - (ppData.base_cash + ppData.sales_cash - ppData.expenses_total - ppData.tips_total)) : 0

                                        // Siigo calculations
                                        const sgCash = sgData?.sales_cash || 0
                                        const sgCard = sgData?.sales_card || 0
                                        const sgTransfer = sgData?.sales_transfer || 0
                                        const sgExpenses = (sgData?.expenses_total || 0) + (sgData?.tips_total || 0)
                                        const sgTotal = sgCash + sgCard + sgTransfer
                                        const sgDiff = sgData ? (sgData.cash_audit_count - (sgData.base_cash + sgData.sales_cash - sgData.expenses_total - sgData.tips_total)) : 0

                                        // Combined for "all" view
                                        const combinedTotal = ppTotal + sgTotal
                                        const totalDiff = ppDiff + sgDiff

                                        // Completeness check
                                        const hasSiigo = !!sgData
                                        const hasAttachments = !!(sgData?.dataphone_voucher_url && sgData?.pos_invoice_url)
                                        const isFullyComplete = hasSiigo && hasAttachments

                                        // PANPANOCHA CARD (When filtered by panpanocha)
                                        if (activeType === 'panpanocha' && ppData) {
                                            return (
                                                <div key={unified.id}
                                                    onClick={() => setSelectedUnified(unified)}
                                                    className="bg-white dark:bg-slate-800 border dark:border-white/5 rounded-xl p-0 hover:shadow-lg transition-all cursor-pointer overflow-hidden border-l-[6px] border-orange-500"
                                                >
                                                    <div className="p-5">
                                                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                                                            <div className="flex items-center gap-3">
                                                                <div className="bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-2 shadow-sm">
                                                                    <span className="opacity-50">#</span>
                                                                    {unified.id.slice(0, 8)}
                                                                </div>
                                                                <h5 className="font-bold text-lg text-gray-800 dark:text-white">{unified.branch_name}</h5>
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                <span className="bg-orange-100 text-orange-700 border border-orange-300 text-xs px-3 py-1.5 rounded-lg font-bold uppercase tracking-wider">PanPanocha</span>
                                                            </div>
                                                        </div>

                                                        <div className="grid grid-cols-2 md:grid-cols-6 gap-4 md:gap-4 pt-4 border-t border-orange-100 dark:border-orange-500/20">
                                                            <div>
                                                                <p className="text-[10px] uppercase font-bold text-orange-400 dark:text-orange-500 mb-1 tracking-wider">Hora</p>
                                                                <p className="font-medium text-gray-600 dark:text-gray-300 text-sm flex items-center gap-2">
                                                                    <Clock className="w-3 h-3 text-orange-300 dark:text-orange-600" />
                                                                    {formatDateTime(unified.date).split(',')[1]}
                                                                </p>
                                                            </div>
                                                            <div>
                                                                <p className="text-[10px] uppercase font-bold text-orange-400 dark:text-orange-500 mb-1 tracking-wider">Efectivo</p>
                                                                <p className="font-bold text-gray-700 dark:text-gray-200 text-sm">{formatCurrency(ppCash)}</p>
                                                            </div>
                                                            <div>
                                                                <p className="text-[10px] uppercase font-bold text-orange-400 dark:text-orange-500 mb-1 tracking-wider">Tarjeta</p>
                                                                <p className="font-bold text-gray-700 dark:text-gray-200 text-sm">{formatCurrency(ppCard)}</p>
                                                            </div>
                                                            <div>
                                                                <p className="text-[10px] uppercase font-bold text-orange-400 dark:text-orange-500 mb-1 tracking-wider">Transf.</p>
                                                                <p className="font-bold text-gray-700 dark:text-gray-200 text-sm">{formatCurrency(ppTransfer)}</p>
                                                            </div>
                                                            <div>
                                                                <p className="text-[10px] uppercase font-bold text-red-300 dark:text-red-400 mb-1 tracking-wider">Gastos</p>
                                                                <p className="font-bold text-red-500 dark:text-red-400 text-sm">{formatCurrency(ppExpenses)}</p>
                                                            </div>
                                                            <div className="text-right">
                                                                <p className="text-[10px] uppercase font-bold text-orange-400 dark:text-orange-500 mb-1 tracking-wider">Diferencia</p>
                                                                <p className={`font-black text-sm flex items-center justify-end gap-1 ${ppDiff >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                                                                    {ppDiff !== 0 && (ppDiff > 0 ? <span className="text-xs">▲</span> : <span className="text-xs">▼</span>)}
                                                                    {formatCurrency(ppDiff)}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            )
                                        }

                                        // SIIGO CARD (When filtered by siigo)
                                        if (activeType === 'siigo' && sgData) {
                                            const isSiigoComplete = !!(sgData.dataphone_voucher_url && sgData.pos_invoice_url)
                                            return (
                                                <div key={unified.id}
                                                    onClick={() => setSelectedUnified(unified)}
                                                    className={`bg-white dark:bg-slate-800 border dark:border-white/5 rounded-xl p-0 hover:shadow-lg transition-all cursor-pointer overflow-hidden border-l-[6px] ${isSiigoComplete ? 'border-emerald-500' : 'border-blue-500'}`}
                                                >
                                                    <div className="p-5">
                                                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                                                            <div className="flex items-center gap-3">
                                                                <div className="bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-2 shadow-sm">
                                                                    <span className="opacity-50">#</span>
                                                                    {unified.id.slice(0, 8)}
                                                                </div>
                                                                <h5 className="font-bold text-lg text-gray-800 dark:text-white">{unified.branch_name}</h5>
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                <span className="bg-blue-100 text-blue-700 border border-blue-300 text-xs px-3 py-1.5 rounded-lg font-bold uppercase tracking-wider">SIIGO</span>
                                                                <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-1 ${isSiigoComplete ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                                                    <div className={`w-2 h-2 rounded-full ${isSiigoComplete ? 'bg-green-500' : 'bg-yellow-500'}`} />
                                                                    {isSiigoComplete ? 'Completo' : 'Pendiente'}
                                                                </div>
                                                            </div>
                                                        </div>

                                                        <div className="grid grid-cols-2 md:grid-cols-6 gap-4 md:gap-4 pt-4 border-t border-blue-100 dark:border-blue-500/20">
                                                            <div>
                                                                <p className="text-[10px] uppercase font-bold text-blue-400 dark:text-blue-500 mb-1 tracking-wider">Hora</p>
                                                                <p className="font-medium text-gray-600 dark:text-gray-300 text-sm flex items-center gap-2">
                                                                    <Clock className="w-3 h-3 text-blue-300 dark:text-blue-600" />
                                                                    {formatDateTime(unified.date).split(',')[1]}
                                                                </p>
                                                            </div>
                                                            <div>
                                                                <p className="text-[10px] uppercase font-bold text-blue-400 dark:text-blue-500 mb-1 tracking-wider">Efectivo</p>
                                                                <p className="font-bold text-gray-700 dark:text-gray-200 text-sm">{formatCurrency(sgCash)}</p>
                                                            </div>
                                                            <div>
                                                                <p className="text-[10px] uppercase font-bold text-blue-400 dark:text-blue-500 mb-1 tracking-wider">Tarjeta</p>
                                                                <p className="font-bold text-gray-700 dark:text-gray-200 text-sm">{formatCurrency(sgCard)}</p>
                                                            </div>
                                                            <div>
                                                                <p className="text-[10px] uppercase font-bold text-blue-400 dark:text-blue-500 mb-1 tracking-wider">Transf.</p>
                                                                <p className="font-bold text-gray-700 dark:text-gray-200 text-sm">{formatCurrency(sgTransfer)}</p>
                                                            </div>
                                                            <div>
                                                                <p className="text-[10px] uppercase font-bold text-red-300 dark:text-red-400 mb-1 tracking-wider">Gastos</p>
                                                                <p className="font-bold text-red-500 dark:text-red-400 text-sm">{formatCurrency(sgExpenses)}</p>
                                                            </div>
                                                            <div className="text-right">
                                                                <p className="text-[10px] uppercase font-bold text-blue-400 dark:text-blue-500 mb-1 tracking-wider">Diferencia</p>
                                                                <p className={`font-black text-sm flex items-center justify-end gap-1 ${sgDiff >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                                                                    {sgDiff !== 0 && (sgDiff > 0 ? <span className="text-xs">▲</span> : <span className="text-xs">▼</span>)}
                                                                    {formatCurrency(sgDiff)}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            )
                                        }

                                        // UNIFIED CARD (Default "Todos" view - only when no type filter is active)
                                        if (activeType !== 'all') {
                                            // If a type filter is active but we didn't match above, skip this card
                                            return null
                                        }

                                        const borderColor = isFullyComplete ? 'border-emerald-500' : 'border-[#5D4037]'
                                        return (
                                            <div key={unified.id}
                                                onClick={() => setSelectedUnified(unified)}
                                                className={`bg-white dark:bg-slate-800 border dark:border-white/5 rounded-xl p-0 hover:shadow-lg transition-all cursor-pointer overflow-hidden border-l-[6px] ${borderColor}`}
                                            >
                                                <div className="p-5">
                                                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                                                        <div className="flex items-center gap-3">
                                                            <div className="bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-2 shadow-sm">
                                                                <span className="opacity-50">#</span>
                                                                {unified.id.slice(0, 8)}
                                                            </div>
                                                            <h5 className="font-bold text-lg text-gray-800 dark:text-white">{unified.branch_name}</h5>
                                                        </div>

                                                        <div className="flex items-center gap-2">
                                                            {unified.panpanocha && <span className="bg-orange-50 text-orange-700 border border-orange-200 text-[10px] px-2 py-1 rounded-md font-bold uppercase tracking-wider">Panpanocha</span>}
                                                            {unified.siigo && <span className="bg-blue-50 text-blue-700 border border-blue-200 text-[10px] px-2 py-1 rounded-md font-bold uppercase tracking-wider">SIIGO</span>}
                                                            <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-1 ${isFullyComplete ? 'bg-green-100 text-green-700' : 'bg-[#5D4037]/10 text-[#5D4037]'}`}>
                                                                <div className={`w-2 h-2 rounded-full ${isFullyComplete ? 'bg-green-500' : 'bg-[#5D4037]'}`} />
                                                                {isFullyComplete ? 'Completo' : 'Parcial'}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="grid grid-cols-2 md:grid-cols-6 gap-4 md:gap-4 pt-4 border-t border-gray-100 dark:border-white/5">
                                                        <div>
                                                            <p className="text-[10px] uppercase font-bold text-gray-400 dark:text-gray-500 mb-1 tracking-wider">Hora</p>
                                                            <p className="font-medium text-gray-600 dark:text-gray-300 text-sm flex items-center gap-2">
                                                                <Clock className="w-3 h-3 text-gray-300 dark:text-gray-600" />
                                                                {formatDateTime(unified.date).split(',')[1]}
                                                            </p>
                                                        </div>
                                                        <div>
                                                            <p className="text-[10px] uppercase font-bold text-gray-400 dark:text-gray-500 mb-1 tracking-wider">Efectivo</p>
                                                            <p className="font-bold text-gray-700 dark:text-gray-200 text-sm">
                                                                {formatCurrency((unified.panpanocha?.sales_cash || 0) + (unified.siigo?.sales_cash || 0))}
                                                            </p>
                                                        </div>
                                                        <div>
                                                            <p className="text-[10px] uppercase font-bold text-gray-400 dark:text-gray-500 mb-1 tracking-wider">Tarjeta</p>
                                                            <p className="font-bold text-gray-700 dark:text-gray-200 text-sm">
                                                                {formatCurrency((unified.panpanocha?.sales_card || 0) + (unified.siigo?.sales_card || 0))}
                                                            </p>
                                                        </div>
                                                        <div>
                                                            <p className="text-[10px] uppercase font-bold text-gray-400 dark:text-gray-500 mb-1 tracking-wider">Transf.</p>
                                                            <p className="font-bold text-gray-700 dark:text-gray-200 text-sm">
                                                                {formatCurrency((unified.panpanocha?.sales_transfer || 0) + (unified.siigo?.sales_transfer || 0))}
                                                            </p>
                                                        </div>
                                                        <div>
                                                            <p className="text-[10px] uppercase font-bold text-red-300 dark:text-red-400 mb-1 tracking-wider">Gastos</p>
                                                            <p className="font-bold text-red-500 dark:text-red-400 text-sm">
                                                                {formatCurrency(
                                                                    ((unified.panpanocha?.expenses_total || 0) + (unified.panpanocha?.tips_total || 0)) +
                                                                    ((unified.siigo?.expenses_total || 0) + (unified.siigo?.tips_total || 0))
                                                                )}
                                                            </p>
                                                        </div>
                                                        <div className="text-right">
                                                            <p className="text-[10px] uppercase font-bold text-gray-400 dark:text-gray-500 mb-1 tracking-wider">Diferencia</p>
                                                            <p className={`font-black text-sm flex items-center justify-end gap-1 ${totalDiff >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                                                                {totalDiff !== 0 && (totalDiff > 0 ? <span className="text-xs">▲</span> : <span className="text-xs">▼</span>)}
                                                                {formatCurrency(totalDiff)}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>
                )
                }

                {/* DETAIL MODAL (Only show for "Todos" filter) */}
                {
                    selectedUnified && activeType === 'all' && (
                        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                            <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl animate-in zoom-in-95 duration-200">
                                <div className="sticky top-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm border-b dark:border-white/10 px-6 py-4 flex justify-between items-center z-10">
                                    <div>
                                        <h3 className="text-xl font-black text-gray-800 dark:text-white uppercase tracking-tight">Cierre Unificado del Turno</h3>
                                        <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">{formatDate(selectedUnified.date)} - {selectedUnified.branch_name}</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Button
                                            variant="outline"
                                            onClick={() => handleExportPDF(selectedUnified)}
                                            className="hidden md:flex bg-white hover:bg-gray-50 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-gray-200 dark:border-white/10"
                                        >
                                            <FileText className="w-4 h-4 mr-2" /> Exportar PDF
                                        </Button>
                                        <button
                                            onClick={() => setSelectedUnified(null)}
                                            className="p-2 hover:bg-orange-100 dark:hover:bg-slate-800 rounded-full transition-colors"
                                            aria-label="Cerrar detalle"
                                        >
                                            <X className="w-6 h-6 text-gray-400 hover:text-orange-500" />
                                        </button>
                                    </div>
                                </div>

                                <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">

                                    {/* PANPANOCHA SIDE */}
                                    <div className={`p-5 rounded-3xl border-2 transition-all ${selectedUnified.panpanocha ? 'border-orange-200 dark:border-orange-500/30 bg-white dark:bg-slate-900 shadow-sm' : 'border-gray-100 dark:border-white/5 bg-gray-50 dark:bg-slate-800 opacity-60'}`}>
                                        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-orange-100 dark:border-orange-500/20">
                                            <div className="bg-orange-100 dark:bg-orange-500/20 p-2 rounded-xl text-orange-600 dark:text-orange-400 shadow-sm"><Store className="w-5 h-5" /></div>
                                            <h4 className="font-extrabold text-gray-800 dark:text-gray-100 uppercase tracking-wide">Cierre Panpanocha</h4>
                                        </div>

                                        {selectedUnified.panpanocha ? (
                                            (() => {
                                                const exp = selectedUnified.panpanocha.base_cash + selectedUnified.panpanocha.sales_cash - selectedUnified.panpanocha.expenses_total - selectedUnified.panpanocha.tips_total
                                                const real = selectedUnified.panpanocha.cash_audit_count
                                                const diff = real - exp
                                                const hasDiff = Math.abs(diff) > 50

                                                // MERGED EXPENSES DISPLAY
                                                const displayExpenses = (selectedUnified.panpanocha.expenses_total || 0) + (selectedUnified.panpanocha.tips_total || 0)

                                                return (
                                                    <div className="space-y-6">
                                                        <div className="space-y-3 text-sm">
                                                            <div className="flex justify-between items-center p-2 hover:bg-orange-50/50 dark:hover:bg-orange-900/10 rounded-lg transition-colors"><span className="text-gray-500 dark:text-gray-400 font-medium">Base Inicial</span> <span className="font-bold text-gray-700 dark:text-gray-300">{formatCurrency(selectedUnified.panpanocha.base_cash)}</span></div>
                                                            <div className="flex justify-between items-center p-2 hover:bg-orange-50/50 dark:hover:bg-orange-900/10 rounded-lg transition-colors"><span className="text-gray-500 dark:text-gray-400 font-medium">Venta Efectivo</span> <span className="font-bold text-gray-700 dark:text-gray-300">{formatCurrency(selectedUnified.panpanocha.sales_cash)}</span></div>

                                                            {/* NEW: Card & Transfer */}
                                                            <div className="flex justify-between items-center p-2 hover:bg-orange-50/50 dark:hover:bg-orange-900/10 rounded-lg transition-colors"><span className="text-gray-500 dark:text-gray-400 font-medium">Venta Tarjeta</span> <span className="font-bold text-gray-700 dark:text-gray-300">{formatCurrency(selectedUnified.panpanocha.sales_card || 0)}</span></div>
                                                            <div className="flex justify-between items-center p-2 hover:bg-orange-50/50 dark:hover:bg-orange-900/10 rounded-lg transition-colors"><span className="text-gray-500 dark:text-gray-400 font-medium">Venta Transferencia</span> <span className="font-bold text-gray-700 dark:text-gray-300">{formatCurrency(selectedUnified.panpanocha.sales_transfer || 0)}</span></div>

                                                            <div className="flex justify-between items-center p-2 hover:bg-red-50/50 dark:hover:bg-red-900/10 rounded-lg transition-colors"><span className="text-gray-500 dark:text-gray-400 font-medium">Gastos</span> <span className="font-bold text-red-500 dark:text-red-400">-{formatCurrency(displayExpenses)}</span></div>

                                                            <div className="my-2 border-t border-dashed border-gray-200" />

                                                            <div className="flex justify-between font-bold text-gray-600 dark:text-gray-400 px-2">
                                                                <span>Esperado (Efectivo):</span>
                                                                <span>{formatCurrency(exp)}</span>
                                                            </div>
                                                            <div className="flex justify-between font-black text-orange-900 dark:text-orange-200 bg-orange-50 dark:bg-orange-900/20 p-3 rounded-xl border border-orange-100 dark:border-orange-500/20">
                                                                <span>Real (Efectivo):</span>
                                                                <span>{formatCurrency(real)}</span>
                                                            </div>

                                                            {hasDiff && (
                                                                <div className={`p-3 rounded-xl text-center font-bold flex items-center justify-center gap-2 border ${diff > 0 ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                                                                    <AlertTriangle className="w-4 h-4" />
                                                                    {diff > 0 ? `Sobrante: ${formatCurrency(diff)}` : `Faltante: ${formatCurrency(diff)}`}
                                                                </div>
                                                            )}
                                                        </div>

                                                        <div className="bg-gray-50 dark:bg-slate-800 p-4 rounded-2xl border border-gray-100 dark:border-white/5">
                                                            <h5 className="font-bold text-[10px] uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-2">Total Ventas Registradas</h5>
                                                            <div className="flex justify-between items-end">
                                                                <span className="text-gray-600 dark:text-gray-400 text-sm font-medium">Total Global</span>
                                                                <span className="font-black text-xl text-gray-800 dark:text-white">{formatCurrency((selectedUnified.panpanocha.sales_cash || 0) + (selectedUnified.panpanocha.sales_card || 0) + (selectedUnified.panpanocha.sales_transfer || 0))}</span>
                                                            </div>
                                                        </div>

                                                        {/* Attachments Section - PanPanocha */}
                                                        <div className="mt-6 border-t border-gray-100 pt-4">
                                                            <h5 className="font-bold text-[10px] uppercase tracking-wider text-gray-400 mb-3">Soporte del Cierre</h5>

                                                            <input
                                                                type="file"
                                                                ref={panpanochaInvoiceInputRef}
                                                                className="hidden"
                                                                accept="image/*"
                                                                aria-label="Subir factura PanPanocha"
                                                                onChange={(e) => handleFileUpload(e, 'panpanocha_invoice')}
                                                            />

                                                            <div
                                                                onClick={() => {
                                                                    if (selectedUnified.panpanocha?.panpanocha_invoice_url) {
                                                                        window.open(selectedUnified.panpanocha.panpanocha_invoice_url, '_blank')
                                                                    } else {
                                                                        panpanochaInvoiceInputRef.current?.click()
                                                                    }
                                                                }}
                                                                className={`w-full border rounded-xl p-3 flex flex-col items-center justify-center gap-2 transition-all cursor-pointer group relative overflow-hidden
                                                                ${selectedUnified.panpanocha?.panpanocha_invoice_url
                                                                        ? 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-500/30 hover:bg-orange-100 dark:hover:bg-orange-900/30'
                                                                        : 'bg-gray-50 dark:bg-slate-800 border-gray-100 dark:border-white/10 hover:bg-white dark:hover:bg-slate-700 hover:border-orange-200 dark:hover:border-orange-500/50 hover:shadow-sm'
                                                                    }`}
                                                            >
                                                                {uploadingType === 'panpanocha_invoice' ? (
                                                                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-orange-600"></div>
                                                                ) : (
                                                                    <>
                                                                        <div className={`p-2 rounded-full transition-colors ${selectedUnified.panpanocha?.panpanocha_invoice_url ? 'bg-orange-100 dark:bg-orange-500/20 text-orange-600 dark:text-orange-400' : 'bg-white dark:bg-slate-700 border border-gray-100 dark:border-white/5 text-gray-400 group-hover:text-orange-500 group-hover:border-orange-100'}`}>
                                                                            {selectedUnified.panpanocha?.panpanocha_invoice_url ? <Check className="w-4 h-4" /> : <Receipt className="w-4 h-4" />}
                                                                        </div>
                                                                        <span className={`text-[10px] font-bold text-center leading-tight ${selectedUnified.panpanocha?.panpanocha_invoice_url ? 'text-orange-700 dark:text-orange-300' : 'text-gray-500 dark:text-gray-400 group-hover:text-orange-600'}`}>
                                                                            {selectedUnified.panpanocha?.panpanocha_invoice_url ? 'Factura Cargada' : 'Factura POS PanPanocha'}
                                                                        </span>

                                                                        {selectedUnified.panpanocha?.panpanocha_invoice_url && (
                                                                            <div
                                                                                onClick={(e) => {
                                                                                    e.stopPropagation()
                                                                                    panpanochaInvoiceInputRef.current?.click()
                                                                                }}
                                                                                className="absolute top-1 right-1 p-1 text-orange-400 hover:text-orange-600 bg-white/50 rounded-full hover:bg-white"
                                                                                title="Cambiar archivo"
                                                                            >
                                                                                <Edit2 className="w-3 h-3" />
                                                                            </div>
                                                                        )}
                                                                    </>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                )
                                            })()
                                        ) : (
                                            <div className="flex flex-col items-center justify-center h-40 text-gray-400 text-center bg-gray-50/50 rounded-2xl border border-dashed border-gray-200">
                                                <Store className="w-8 h-8 mb-2 opacity-20" />
                                                <p className="text-sm">No se ha registrado cierre</p>
                                            </div>
                                        )}
                                    </div>

                                    {/* SIIGO SIDE */}
                                    <div className={`p-5 rounded-3xl border-2 transition-all ${selectedUnified.siigo ? 'border-blue-200 dark:border-blue-500/30 bg-white dark:bg-slate-900 shadow-sm' : 'border-gray-100 dark:border-white/5 bg-gray-50 dark:bg-slate-800 opacity-60'}`}>
                                        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-blue-100 dark:border-blue-500/20">
                                            <div className="bg-blue-100 dark:bg-blue-500/20 p-2 rounded-xl text-blue-600 dark:text-blue-400 shadow-sm"><FileText className="w-5 h-5" /></div>
                                            <h4 className="font-extrabold text-gray-800 dark:text-gray-100 uppercase tracking-wide">Cierre Siigo</h4>
                                        </div>

                                        {(() => {
                                            // 1. Safe Data Access (Default to 0s)
                                            const siigoData = selectedUnified.siigo || {
                                                base_cash: 0,
                                                sales_cash: 0,
                                                expenses_total: 0,
                                                tips_total: 0,
                                                cash_audit_count: 0,
                                                sales_card: 0,
                                                sales_transfer: 0
                                            }

                                            // Check if it's truly empty (all zeros or null)
                                            const isSiigoEmpty = !selectedUnified.siigo || (
                                                !selectedUnified.siigo.base_cash &&
                                                !selectedUnified.siigo.sales_cash &&
                                                !selectedUnified.siigo.cash_audit_count
                                            )

                                            const exp = (siigoData.base_cash || 0) + (siigoData.sales_cash || 0) - (siigoData.expenses_total || 0) - (siigoData.tips_total || 0)
                                            const real = siigoData.cash_audit_count || 0
                                            const diff = real - exp
                                            const hasDiff = Math.abs(diff) > 50

                                            // MERGED EXPENSES DISPLAY
                                            const displayExpenses = (siigoData.expenses_total || 0) + (siigoData.tips_total || 0)

                                            return (
                                                <div className="space-y-6">
                                                    {/* Missing Data Warning */}
                                                    {isSiigoEmpty && (
                                                        <div className="flex items-center gap-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-white/10 text-gray-500 dark:text-gray-400 px-4 py-3 rounded-xl mb-4 text-sm font-medium animate-pulse">
                                                            <AlertTriangle className="w-5 h-5 text-yellow-500" />
                                                            <span>No se ha registrado cierre Siigo</span>
                                                        </div>
                                                    )}

                                                    <div className="space-y-3 text-sm">
                                                        <div className="flex justify-between items-center p-2 hover:bg-blue-50/50 dark:hover:bg-blue-900/10 rounded-lg transition-colors"><span className="text-gray-500 dark:text-gray-400 font-medium">Base Inicial</span> <span className="font-bold text-gray-700 dark:text-gray-300">{formatCurrency(siigoData.base_cash || 0)}</span></div>
                                                        <div className="flex justify-between items-center p-2 hover:bg-blue-50/50 dark:hover:bg-blue-900/10 rounded-lg transition-colors"><span className="text-gray-500 dark:text-gray-400 font-medium">Venta Efectivo</span> <span className="font-bold text-gray-700 dark:text-gray-300">{formatCurrency(siigoData.sales_cash || 0)}</span></div>

                                                        {/* NEW: Card & Transfer */}
                                                        <div className="flex justify-between items-center p-2 hover:bg-blue-50/50 dark:hover:bg-blue-900/10 rounded-lg transition-colors"><span className="text-gray-500 dark:text-gray-400 font-medium">Venta Tarjeta</span> <span className="font-bold text-gray-700 dark:text-gray-300">{formatCurrency(siigoData.sales_card || 0)}</span></div>
                                                        <div className="flex justify-between items-center p-2 hover:bg-blue-50/50 dark:hover:bg-blue-900/10 rounded-lg transition-colors"><span className="text-gray-500 dark:text-gray-400 font-medium">Venta Transferencia</span> <span className="font-bold text-gray-700 dark:text-gray-300">{formatCurrency(siigoData.sales_transfer || 0)}</span></div>

                                                        <div className="flex justify-between items-center p-2 hover:bg-red-50/50 dark:hover:bg-red-900/10 rounded-lg transition-colors"><span className="text-gray-500 dark:text-gray-400 font-medium">Gastos</span> <span className="font-bold text-red-500 dark:text-red-400">-{formatCurrency(displayExpenses)}</span></div>

                                                        <div className="my-2 border-t border-dashed border-gray-200" />

                                                        <div className="flex justify-between font-bold text-gray-600 dark:text-gray-400 px-2">
                                                            <span>Esperado (Efectivo):</span>
                                                            <span>{formatCurrency(exp)}</span>
                                                        </div>
                                                        <div className="flex justify-between font-black text-blue-900 dark:text-blue-200 bg-blue-50 dark:bg-blue-900/20 p-3 rounded-xl border border-blue-100 dark:border-blue-500/20">
                                                            <span>Real (Efectivo):</span>
                                                            <span>{formatCurrency(real)}</span>
                                                        </div>

                                                        {hasDiff && (
                                                            <div className={`p-3 rounded-xl text-center font-bold flex items-center justify-center gap-2 border ${diff > 0 ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                                                                <AlertTriangle className="w-4 h-4" />
                                                                {diff > 0 ? `Sobrante: ${formatCurrency(diff)}` : `Faltante: ${formatCurrency(diff)}`}
                                                            </div>
                                                        )}
                                                    </div>

                                                    <div className="bg-gray-50 dark:bg-slate-800 p-4 rounded-2xl border border-gray-100 dark:border-white/5">
                                                        <h5 className="font-bold text-[10px] uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-2">Total Ventas Siigo</h5>
                                                        <div className="flex justify-between items-end">
                                                            <span className="text-gray-600 dark:text-gray-400 text-sm font-medium">Total Global</span>
                                                            <span className="font-black text-xl text-gray-800 dark:text-white">{formatCurrency((siigoData.sales_cash || 0) + (siigoData.sales_card || 0) + (siigoData.sales_transfer || 0))}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            )
                                        })()}

                                        {/* Attachments Section - Always Visible */}
                                        <div className="mt-6 border-t border-gray-100 pt-4">
                                            <h5 className="font-bold text-[10px] uppercase tracking-wider text-gray-400 mb-3">Soportes del Cierre</h5>
                                            <div className="flex gap-3">
                                                {/* Hidden Inputs */}
                                                <input
                                                    type="file"
                                                    ref={dataphoneInputRef}
                                                    className="hidden"
                                                    accept="image/*"
                                                    aria-label="Subir voucher datáfono"
                                                    onChange={(e) => handleFileUpload(e, 'dataphone')}
                                                />
                                                <input
                                                    type="file"
                                                    ref={invoiceInputRef}
                                                    className="hidden"
                                                    accept="image/*"
                                                    aria-label="Subir factura POS"
                                                    onChange={(e) => handleFileUpload(e, 'invoice')}
                                                />

                                                {/* Dataphone Card */}
                                                <div
                                                    onClick={() => {
                                                        if (selectedUnified.siigo?.dataphone_voucher_url) {
                                                            window.open(selectedUnified.siigo.dataphone_voucher_url, '_blank')
                                                        } else {
                                                            dataphoneInputRef.current?.click()
                                                        }
                                                    }}
                                                    className={`flex-1 border rounded-xl p-3 flex flex-col items-center justify-center gap-2 transition-all cursor-pointer group relative overflow-hidden
                                                    ${selectedUnified.siigo?.dataphone_voucher_url
                                                            ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-500/30 hover:bg-blue-100 dark:hover:bg-blue-900/30'
                                                            : 'bg-gray-50 dark:bg-slate-800 border-gray-100 dark:border-white/10 hover:bg-white dark:hover:bg-slate-700 hover:border-blue-200 dark:hover:border-blue-500/50 hover:shadow-sm'
                                                        }`}
                                                >
                                                    {uploadingType === 'dataphone' ? (
                                                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                                                    ) : (
                                                        <>
                                                            <div className={`p-2 rounded-full transition-colors ${selectedUnified.siigo?.dataphone_voucher_url ? 'bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400' : 'bg-white dark:bg-slate-700 border border-gray-100 dark:border-white/5 text-gray-400 group-hover:text-blue-500 group-hover:border-blue-100'}`}>
                                                                {selectedUnified.siigo?.dataphone_voucher_url ? <Check className="w-4 h-4" /> : <CreditCard className="w-4 h-4" />}
                                                            </div>
                                                            <span className={`text-[10px] font-bold text-center leading-tight ${selectedUnified.siigo?.dataphone_voucher_url ? 'text-blue-700 dark:text-blue-300' : 'text-gray-500 dark:text-gray-400 group-hover:text-blue-600'}`}>
                                                                {selectedUnified.siigo?.dataphone_voucher_url ? 'Soporte Cargado' : 'Cierre Datáfono'}
                                                            </span>

                                                            {selectedUnified.siigo?.dataphone_voucher_url && (
                                                                <div
                                                                    onClick={(e) => {
                                                                        e.stopPropagation()
                                                                        dataphoneInputRef.current?.click()
                                                                    }}
                                                                    className="absolute top-1 right-1 p-1 text-blue-400 hover:text-blue-600 bg-white/50 rounded-full hover:bg-white"
                                                                    title="Cambiar archivo"
                                                                >
                                                                    <Edit2 className="w-3 h-3" />
                                                                </div>
                                                            )}
                                                        </>
                                                    )}
                                                </div>

                                                {/* Invoice Card */}
                                                <div
                                                    onClick={() => {
                                                        if (selectedUnified.siigo?.pos_invoice_url) {
                                                            window.open(selectedUnified.siigo.pos_invoice_url, '_blank')
                                                        } else {
                                                            invoiceInputRef.current?.click()
                                                        }
                                                    }}
                                                    className={`flex-1 border rounded-xl p-3 flex flex-col items-center justify-center gap-2 transition-all cursor-pointer group relative overflow-hidden
                                                    ${selectedUnified.siigo?.pos_invoice_url
                                                            ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-500/30 hover:bg-blue-100 dark:hover:bg-blue-900/30'
                                                            : 'bg-gray-50 dark:bg-slate-800 border-gray-100 dark:border-white/10 hover:bg-white dark:hover:bg-slate-700 hover:border-blue-200 dark:hover:border-blue-500/50 hover:shadow-sm'
                                                        }`}
                                                >
                                                    {uploadingType === 'invoice' ? (
                                                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                                                    ) : (
                                                        <>
                                                            <div className={`p-2 rounded-full transition-colors ${selectedUnified.siigo?.pos_invoice_url ? 'bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400' : 'bg-white dark:bg-slate-700 border border-gray-100 dark:border-white/5 text-gray-400 group-hover:text-blue-500 group-hover:border-blue-100'}`}>
                                                                {selectedUnified.siigo?.pos_invoice_url ? <Check className="w-4 h-4" /> : <Receipt className="w-4 h-4" />}
                                                            </div>
                                                            <span className={`text-[10px] font-bold text-center leading-tight ${selectedUnified.siigo?.pos_invoice_url ? 'text-blue-700 dark:text-blue-300' : 'text-gray-500 dark:text-gray-400 group-hover:text-blue-600'}`}>
                                                                {selectedUnified.siigo?.pos_invoice_url ? 'Factura Cargada' : 'Factura POS Siigo'}
                                                            </span>

                                                            {selectedUnified.siigo?.pos_invoice_url && (
                                                                <div
                                                                    onClick={(e) => {
                                                                        e.stopPropagation()
                                                                        invoiceInputRef.current?.click()
                                                                    }}
                                                                    className="absolute top-1 right-1 p-1 text-blue-400 hover:text-blue-600 bg-white/50 rounded-full hover:bg-white"
                                                                    title="Cambiar archivo"
                                                                >
                                                                    <Edit2 className="w-3 h-3" />
                                                                </div>
                                                            )}
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div >

                                {/* UNIFIED SUMMARY FOOTER - Redesigned */}
                                < div className="mx-6 mb-6" >
                                    <div className="bg-slate-900 rounded-[2.5rem] overflow-hidden shadow-2xl relative">
                                        {/* Header Tab */}
                                        <div className="border-b border-white/5 px-6 py-3 flex items-center gap-3 relative z-10 rounded-t-[2.5rem]">
                                            <div className="bg-emerald-500/20 p-1.5 rounded-lg text-emerald-400">
                                                <Check className="w-4 h-4" />
                                            </div>
                                            <div>
                                                <h4 className="text-sm font-black uppercase tracking-widest text-white">Resumen Unificado</h4>
                                                <p className="text-[10px] text-slate-400 font-medium leading-none mt-0.5">Consolidado Total del Turno (Panpanocha + Siigo)</p>
                                            </div>
                                        </div>

                                        <div className="p-6 relative z-10">
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                {/* Total Ventas Box */}
                                                <div className="bg-white/5 rounded-2xl p-4 border border-white/5 backdrop-blur-sm hover:bg-white/10 transition-colors">
                                                    <div className="flex justify-between items-start mb-3">
                                                        <div className="bg-white/10 p-2 rounded-lg text-slate-300">
                                                            <Store className="w-4 h-4" />
                                                        </div>
                                                        <div className="text-right">
                                                            <p className="text-[10px] uppercase tracking-widest font-bold text-slate-400 mb-1">Total Ventas</p>
                                                            <p className="text-xl font-black text-white leading-none">
                                                                {formatCurrency(
                                                                    ((selectedUnified.panpanocha?.sales_cash || 0) + (selectedUnified.panpanocha?.sales_card || 0) + (selectedUnified.panpanocha?.sales_transfer || 0)) +
                                                                    ((selectedUnified.siigo?.sales_cash || 0) + (selectedUnified.siigo?.sales_card || 0) + (selectedUnified.siigo?.sales_transfer || 0))
                                                                )}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    {/* Breakdown */}
                                                    <div className="grid grid-cols-3 gap-2 text-[10px] font-medium border-t border-white/10 pt-3 text-slate-300">
                                                        <div className="flex flex-col">
                                                            <span className="opacity-40 text-[9px] uppercase mb-0.5">Efectivo</span>
                                                            <span className="font-bold">{formatCurrency((selectedUnified.panpanocha?.sales_cash || 0) + (selectedUnified.siigo?.sales_cash || 0))}</span>
                                                        </div>
                                                        <div className="flex flex-col border-l border-white/10 pl-2">
                                                            <span className="opacity-40 text-[9px] uppercase mb-0.5">Tarjeta</span>
                                                            <span className="font-bold">{formatCurrency((selectedUnified.panpanocha?.sales_card || 0) + (selectedUnified.siigo?.sales_card || 0))}</span>
                                                        </div>
                                                        <div className="flex flex-col border-l border-white/10 pl-2">
                                                            <span className="opacity-40 text-[9px] uppercase mb-0.5">Transf.</span>
                                                            <span className="font-bold">{formatCurrency((selectedUnified.panpanocha?.sales_transfer || 0) + (selectedUnified.siigo?.sales_transfer || 0))}</span>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Total Gastos Box */}
                                                <div className="bg-red-500/10 rounded-2xl p-4 border border-red-500/20 backdrop-blur-sm flex flex-col justify-between hover:bg-red-500/20 transition-colors group">
                                                    <div className="flex justify-between items-start">
                                                        <div className="bg-red-500/20 p-2 rounded-lg text-red-400 group-hover:text-red-300 transition-colors">
                                                            <TrendingDown className="w-4 h-4" />
                                                        </div>
                                                        <div className="text-right">
                                                            <p className="text-[10px] uppercase tracking-widest font-bold text-red-300/70 mb-1">Total Gastos</p>
                                                            <p className="text-xl font-black text-red-300 group-hover:text-red-200 transition-colors leading-none">
                                                                {formatCurrency(
                                                                    ((selectedUnified.panpanocha?.expenses_total || 0) + (selectedUnified.panpanocha?.tips_total || 0)) +
                                                                    ((selectedUnified.siigo?.expenses_total || 0) + (selectedUnified.siigo?.tips_total || 0))
                                                                )}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <div className="mt-3 text-right">
                                                        <span className="inline-block px-2 py-1 rounded bg-red-500/20 text-[10px] text-red-300 font-bold uppercase tracking-wider">
                                                            Descontable
                                                        </span>
                                                    </div>
                                                </div>

                                                {/* Total a Entregar Box */}
                                                <div className="bg-emerald-500/20 rounded-2xl p-4 border border-emerald-500/30 backdrop-blur-sm flex flex-col justify-between hover:bg-emerald-500/30 transition-colors shadow-[0_0_20px_rgba(16,185,129,0.1)] group">
                                                    <div className="flex justify-between items-start">
                                                        <div className="bg-emerald-500/30 p-2 rounded-lg text-emerald-300 group-hover:text-white transition-colors">
                                                            <DollarSign className="w-4 h-4" />
                                                        </div>
                                                        <div className="text-right">
                                                            <p className="text-[10px] uppercase tracking-widest font-black text-emerald-400/80 mb-1">Total a Entregar</p>
                                                            <p className="text-2xl font-black text-emerald-400 group-hover:text-emerald-300 transition-colors leading-none">
                                                                {formatCurrency(
                                                                    ((selectedUnified.panpanocha?.cash_audit_count || 0) - (selectedUnified.panpanocha?.base_cash || 0)) +
                                                                    ((selectedUnified.siigo?.cash_audit_count || 0) - (selectedUnified.siigo?.base_cash || 0))
                                                                )}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <div className="mt-3 text-right">
                                                        <span className="inline-block px-2 py-1 rounded bg-emerald-500/30 text-[10px] text-emerald-300 font-bold uppercase tracking-wider">
                                                            Neto Final
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div >


                            </div >
                        </div >
                    )
                }

                {/* TYPE-SPECIFIC DETAIL MODALS */}
                {selectedUnified && activeType === 'panpanocha' && (
                    <PanPanochaDetailModal
                        closing={selectedUnified}
                        onClose={() => setSelectedUnified(null)}
                        onExportPDF={() => handleExportPDF(selectedUnified)}
                        onUploadInvoice={() => {
                            if (selectedUnified.panpanocha?.panpanocha_invoice_url) {
                                window.open(selectedUnified.panpanocha.panpanocha_invoice_url, '_blank')
                            } else {
                                panpanochaInvoiceInputRef.current?.click()
                            }
                        }}
                        uploadingInvoice={uploadingType === 'panpanocha_invoice'}
                        invoiceInputRef={panpanochaInvoiceInputRef as React.RefObject<HTMLInputElement>}
                        handleFileUpload={handleFileUpload}
                    />
                )}

                {selectedUnified && activeType === 'siigo' && (
                    <SiigoDetailModal
                        closing={selectedUnified}
                        onClose={() => setSelectedUnified(null)}
                        onExportPDF={() => handleExportPDF(selectedUnified)}
                        onUploadDataphone={() => {
                            if (selectedUnified.siigo?.dataphone_voucher_url) {
                                window.open(selectedUnified.siigo.dataphone_voucher_url, '_blank')
                            } else {
                                dataphoneInputRef.current?.click()
                            }
                        }}
                        onUploadInvoice={() => {
                            if (selectedUnified.siigo?.pos_invoice_url) {
                                window.open(selectedUnified.siigo.pos_invoice_url, '_blank')
                            } else {
                                invoiceInputRef.current?.click()
                            }
                        }}
                        uploadingDataphone={uploadingType === 'dataphone'}
                        uploadingInvoice={uploadingType === 'invoice'}
                        dataphoneInputRef={dataphoneInputRef as React.RefObject<HTMLInputElement>}
                        invoiceInputRef={invoiceInputRef as React.RefObject<HTMLInputElement>}
                        handleFileUpload={handleFileUpload}
                    />
                )}
            </div>
        </div>
    )
}

