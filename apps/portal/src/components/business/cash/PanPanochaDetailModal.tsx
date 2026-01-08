'use client'

import React from 'react'
import { Store, AlertTriangle, FileText, Receipt, Check, Edit2, X } from 'lucide-react'
import Button from '@/components/ui/Button'

const formatCurrency = (value: number) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(value)
const formatDate = (dateStr: string) => new Date(dateStr).toLocaleDateString('es-CO', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })

type PanPanochaData = {
    base_cash: number
    sales_cash: number
    sales_card?: number
    sales_transfer?: number
    expenses_total: number
    tips_total: number
    cash_audit_count: number
    panpanocha_invoice_url?: string
    sales_by_category?: Record<string, number>
}

type ClosingUnified = {
    id: string
    date: string
    branch_name: string
    panpanocha?: PanPanochaData
}

interface Props {
    closing: ClosingUnified
    onClose: () => void
    onExportPDF: () => void
    onUploadInvoice: () => void
    uploadingInvoice?: boolean
    invoiceInputRef: React.RefObject<HTMLInputElement>
    handleFileUpload: (e: React.ChangeEvent<HTMLInputElement>, type: 'panpanocha_invoice') => void
}

export default function PanPanochaDetailModal({
    closing,
    onClose,
    onExportPDF,
    onUploadInvoice,
    uploadingInvoice,
    invoiceInputRef,
    handleFileUpload
}: Props) {
    if (!closing.panpanocha) return null

    const pp = closing.panpanocha
    const exp = pp.base_cash + pp.sales_cash - pp.expenses_total - pp.tips_total
    const real = pp.cash_audit_count
    const diff = real - exp
    const hasDiff = Math.abs(diff) > 50
    const displayExpenses = (pp.expenses_total || 0) + (pp.tips_total || 0)
    const totalSales = (pp.sales_cash || 0) + (pp.sales_card || 0) + (pp.sales_transfer || 0)
    const salesByCategory = pp.sales_by_category || {}

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto shadow-2xl animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="sticky top-0 bg-orange-50/95 dark:bg-orange-900/30 backdrop-blur-sm border-b border-orange-200 dark:border-orange-500/30 px-6 py-4 flex justify-between items-center z-10">
                    <div className="flex items-center gap-3">
                        <div className="bg-orange-100 dark:bg-orange-500/20 p-2 rounded-xl text-orange-600 dark:text-orange-400 shadow-sm">
                            <Store className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="text-xl font-black text-orange-900 dark:text-orange-100 uppercase tracking-tight">Cierre PanPanocha</h3>
                            <p className="text-sm text-orange-600 dark:text-orange-400 font-medium">{formatDate(closing.date)} - {closing.branch_name}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            onClick={onExportPDF}
                            className="hidden md:flex bg-white hover:bg-orange-50 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-gray-200 dark:border-white/10 border-orange-200"
                        >
                            <FileText className="w-4 h-4 mr-2" /> Exportar PDF
                        </Button>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-orange-100 dark:hover:bg-slate-800 rounded-full transition-colors"
                            aria-label="Cerrar detalle"
                        >
                            <X className="w-6 h-6 text-orange-400 hover:text-orange-600" />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6">
                    {/* Financial Details */}
                    <div className="space-y-3 text-sm">
                        <div className="flex justify-between items-center p-3 bg-orange-50/50 dark:bg-orange-900/10 rounded-lg">
                            <span className="text-gray-600 dark:text-gray-400 font-medium">Base Inicial</span>
                            <span className="font-bold text-gray-800 dark:text-gray-200">{formatCurrency(pp.base_cash)}</span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-orange-50/50 dark:bg-orange-900/10 rounded-lg">
                            <span className="text-gray-600 dark:text-gray-400 font-medium">Venta Efectivo</span>
                            <span className="font-bold text-gray-800 dark:text-gray-200">{formatCurrency(pp.sales_cash)}</span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-orange-50/50 dark:bg-orange-900/10 rounded-lg">
                            <span className="text-gray-600 dark:text-gray-400 font-medium">Venta Tarjeta</span>
                            <span className="font-bold text-gray-800 dark:text-gray-200">{formatCurrency(pp.sales_card || 0)}</span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-orange-50/50 dark:bg-orange-900/10 rounded-lg">
                            <span className="text-gray-600 dark:text-gray-400 font-medium">Venta Transferencia</span>
                            <span className="font-bold text-gray-800 dark:text-gray-200">{formatCurrency(pp.sales_transfer || 0)}</span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-red-50/50 dark:bg-red-900/10 rounded-lg">
                            <span className="text-gray-600 dark:text-gray-400 font-medium">Gastos + Propinas</span>
                            <span className="font-bold text-red-500 dark:text-red-400">-{formatCurrency(displayExpenses)}</span>
                        </div>

                        <div className="my-2 border-t border-dashed border-orange-200 dark:border-orange-500/20" />

                        <div className="flex justify-between font-bold text-gray-600 dark:text-gray-400 px-3">
                            <span>Esperado (Efectivo):</span>
                            <span>{formatCurrency(exp)}</span>
                        </div>
                        <div className="flex justify-between font-black text-orange-900 dark:text-orange-200 bg-orange-100 dark:bg-orange-900/30 p-4 rounded-xl border border-orange-200 dark:border-orange-500/30">
                            <span>Real (Efectivo):</span>
                            <span>{formatCurrency(real)}</span>
                        </div>

                        {hasDiff && (
                            <div className={`p-4 rounded-xl text-center font-bold flex items-center justify-center gap-2 border ${diff > 0 ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                                <AlertTriangle className="w-5 h-5" />
                                {diff > 0 ? `Sobrante: ${formatCurrency(diff)}` : `Faltante: ${formatCurrency(Math.abs(diff))}`}
                            </div>
                        )}
                    </div>

                    {/* Total Box */}
                    <div className="bg-orange-50 dark:bg-orange-900/20 p-5 rounded-2xl border border-orange-200 dark:border-orange-500/30">
                        <h5 className="font-bold text-[10px] uppercase tracking-wider text-orange-600 dark:text-orange-400 mb-2">Total Ventas Registradas</h5>
                        <div className="flex justify-between items-end">
                            <span className="text-orange-700 dark:text-orange-300 text-sm font-medium">Total Global</span>
                            <span className="font-black text-2xl text-orange-900 dark:text-orange-100">{formatCurrency(totalSales)}</span>
                        </div>
                    </div>

                    {/* Products Sold Summary */}
                    {Object.keys(salesByCategory).length > 0 && (
                        <div className="border-t border-orange-100 dark:border-orange-500/20 pt-4">
                            <h5 className="font-bold text-[10px] uppercase tracking-wider text-gray-400 mb-3">Resumen de Ventas por Categoría</h5>
                            <div className="space-y-2">
                                {Object.entries(salesByCategory).map(([category, amount]) => (
                                    <div key={category} className="flex justify-between items-center p-2 bg-gray-50 dark:bg-slate-800 rounded-lg">
                                        <span className="text-gray-600 dark:text-gray-400 font-medium text-sm">{category}</span>
                                        <span className="font-bold text-gray-800 dark:text-gray-200 text-sm">{formatCurrency(amount)}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Attachments */}
                    <div className="border-t border-orange-100 dark:border-orange-500/20 pt-4">
                        <h5 className="font-bold text-[10px] uppercase tracking-wider text-gray-400 mb-3">Soporte del Cierre</h5>
                        <input
                            type="file"
                            ref={invoiceInputRef}
                            className="hidden"
                            accept="image/*"
                            aria-label="Subir factura PanPanocha"
                            onChange={(e) => handleFileUpload(e, 'panpanocha_invoice')}
                        />
                        <div
                            onClick={onUploadInvoice}
                            className={`w-full border rounded-xl p-4 flex flex-col items-center justify-center gap-2 transition-all cursor-pointer group relative overflow-hidden
                                ${pp.panpanocha_invoice_url
                                    ? 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-500/30 hover:bg-orange-100'
                                    : 'bg-gray-50 dark:bg-slate-800 border-gray-100 dark:border-white/10 hover:bg-white hover:border-orange-200 hover:shadow-sm'
                                }`}
                        >
                            {uploadingInvoice ? (
                                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-orange-600"></div>
                            ) : (
                                <>
                                    <div className={`p-3 rounded-full transition-colors ${pp.panpanocha_invoice_url ? 'bg-orange-100 text-orange-600' : 'bg-white border border-gray-100 text-gray-400 group-hover:text-orange-500'}`}>
                                        {pp.panpanocha_invoice_url ? <Check className="w-5 h-5" /> : <Receipt className="w-5 h-5" />}
                                    </div>
                                    <span className={`text-sm font-bold ${pp.panpanocha_invoice_url ? 'text-orange-700' : 'text-gray-500 group-hover:text-orange-600'}`}>
                                        {pp.panpanocha_invoice_url ? 'Factura Cargada - Click para ver' : 'Subir Factura POS'}
                                    </span>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
