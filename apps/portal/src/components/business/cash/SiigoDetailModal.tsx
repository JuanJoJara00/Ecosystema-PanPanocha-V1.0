'use client'

import React from 'react'
import { FileText, AlertTriangle, CreditCard, Receipt, Check, Edit2, X } from 'lucide-react'
import Button from '@/components/ui/Button'

const formatCurrency = (value: number) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(value)
const formatDate = (dateStr: string) => new Date(dateStr).toLocaleDateString('es-CO', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })

type SiigoData = {
    base_cash: number
    sales_cash: number
    sales_card?: number
    sales_transfer?: number
    expenses_total: number
    tips_total: number
    cash_audit_count: number
    dataphone_voucher_url?: string
    pos_invoice_url?: string
    sales_by_category?: Record<string, number>
}

type ClosingUnified = {
    id: string
    date: string
    branch_name: string
    siigo?: SiigoData
}

interface Props {
    closing: ClosingUnified
    onClose: () => void
    onExportPDF: () => void
    onUploadDataphone: () => void
    onUploadInvoice: () => void
    uploadingDataphone?: boolean
    uploadingInvoice?: boolean
    dataphoneInputRef: React.RefObject<HTMLInputElement>
    invoiceInputRef: React.RefObject<HTMLInputElement>
    handleFileUpload: (e: React.ChangeEvent<HTMLInputElement>, type: 'dataphone' | 'invoice') => void
}

export default function SiigoDetailModal({
    closing,
    onClose,
    onExportPDF,
    onUploadDataphone,
    onUploadInvoice,
    uploadingDataphone,
    uploadingInvoice,
    dataphoneInputRef,
    invoiceInputRef,
    handleFileUpload
}: Props) {
    const sg = closing.siigo || {
        base_cash: 0,
        sales_cash: 0,
        sales_card: 0,
        sales_transfer: 0,
        expenses_total: 0,
        tips_total: 0,
        cash_audit_count: 0
    }

    const isSiigoEmpty = !closing.siigo || (
        !closing.siigo.base_cash &&
        !closing.siigo.sales_cash &&
        !closing.siigo.cash_audit_count
    )

    const exp = (sg.base_cash || 0) + (sg.sales_cash || 0) - (sg.expenses_total || 0) - (sg.tips_total || 0)
    const real = sg.cash_audit_count || 0
    const diff = real - exp
    const hasDiff = Math.abs(diff) > 50
    const displayExpenses = (sg.expenses_total || 0) + (sg.tips_total || 0)
    const totalSales = (sg.sales_cash || 0) + (sg.sales_card || 0) + (sg.sales_transfer || 0)
    const salesByCategory = sg.sales_by_category || {}

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto shadow-2xl animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="sticky top-0 bg-blue-50/95 dark:bg-blue-900/30 backdrop-blur-sm border-b border-blue-200 dark:border-blue-500/30 px-6 py-4 flex justify-between items-center z-10">
                    <div className="flex items-center gap-3">
                        <div className="bg-blue-100 dark:bg-blue-500/20 p-2 rounded-xl text-blue-600 dark:text-blue-400 shadow-sm">
                            <FileText className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="text-xl font-black text-blue-900 dark:text-blue-100 uppercase tracking-tight">Cierre Siigo</h3>
                            <p className="text-sm text-blue-600 dark:text-blue-400 font-medium">{formatDate(closing.date)} - {closing.branch_name}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            onClick={onExportPDF}
                            className="hidden md:flex bg-white hover:bg-blue-50 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-gray-200 dark:border-white/10 border-blue-200"
                        >
                            <FileText className="w-4 h-4 mr-2" /> Exportar PDF
                        </Button>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-blue-100 dark:hover:bg-slate-800 rounded-full transition-colors"
                            aria-label="Cerrar detalle"
                        >
                            <X className="w-6 h-6 text-blue-400 hover:text-blue-600" />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6">
                    {/* Empty Warning */}
                    {isSiigoEmpty && (
                        <div className="flex items-center gap-2 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-500/30 text-yellow-700 dark:text-yellow-400 px-4 py-3 rounded-xl text-sm font-medium">
                            <AlertTriangle className="w-5 h-5" />
                            <span>No se ha registrado cierre Siigo para este turno</span>
                        </div>
                    )}

                    {/* Financial Details */}
                    <div className="space-y-3 text-sm">
                        <div className="flex justify-between items-center p-3 bg-blue-50/50 dark:bg-blue-900/10 rounded-lg">
                            <span className="text-gray-600 dark:text-gray-400 font-medium">Base Inicial</span>
                            <span className="font-bold text-gray-800 dark:text-gray-200">{formatCurrency(sg.base_cash || 0)}</span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-blue-50/50 dark:bg-blue-900/10 rounded-lg">
                            <span className="text-gray-600 dark:text-gray-400 font-medium">Venta Efectivo</span>
                            <span className="font-bold text-gray-800 dark:text-gray-200">{formatCurrency(sg.sales_cash || 0)}</span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-blue-50/50 dark:bg-blue-900/10 rounded-lg">
                            <span className="text-gray-600 dark:text-gray-400 font-medium">Venta Tarjeta</span>
                            <span className="font-bold text-gray-800 dark:text-gray-200">{formatCurrency(sg.sales_card || 0)}</span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-blue-50/50 dark:bg-blue-900/10 rounded-lg">
                            <span className="text-gray-600 dark:text-gray-400 font-medium">Venta Transferencia</span>
                            <span className="font-bold text-gray-800 dark:text-gray-200">{formatCurrency(sg.sales_transfer || 0)}</span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-red-50/50 dark:bg-red-900/10 rounded-lg">
                            <span className="text-gray-600 dark:text-gray-400 font-medium">Gastos + Propinas</span>
                            <span className="font-bold text-red-500 dark:text-red-400">-{formatCurrency(displayExpenses)}</span>
                        </div>

                        <div className="my-2 border-t border-dashed border-blue-200 dark:border-blue-500/20" />

                        <div className="flex justify-between font-bold text-gray-600 dark:text-gray-400 px-3">
                            <span>Esperado (Efectivo):</span>
                            <span>{formatCurrency(exp)}</span>
                        </div>
                        <div className="flex justify-between font-black text-blue-900 dark:text-blue-200 bg-blue-100 dark:bg-blue-900/30 p-4 rounded-xl border border-blue-200 dark:border-blue-500/30">
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
                    <div className="bg-blue-50 dark:bg-blue-900/20 p-5 rounded-2xl border border-blue-200 dark:border-blue-500/30">
                        <h5 className="font-bold text-[10px] uppercase tracking-wider text-blue-600 dark:text-blue-400 mb-2">Total Ventas Siigo</h5>
                        <div className="flex justify-between items-end">
                            <span className="text-blue-700 dark:text-blue-300 text-sm font-medium">Total Global</span>
                            <span className="font-black text-2xl text-blue-900 dark:text-blue-100">{formatCurrency(totalSales)}</span>
                        </div>
                    </div>

                    {/* Products Sold Summary */}
                    {Object.keys(salesByCategory).length > 0 && (
                        <div className="border-t border-blue-100 dark:border-blue-500/20 pt-4">
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
                    <div className="border-t border-blue-100 dark:border-blue-500/20 pt-4">
                        <h5 className="font-bold text-[10px] uppercase tracking-wider text-gray-400 mb-3">Soportes del Cierre</h5>

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

                        <div className="flex gap-3">
                            {/* Dataphone Voucher */}
                            <div
                                onClick={onUploadDataphone}
                                className={`flex-1 border rounded-xl p-4 flex flex-col items-center justify-center gap-2 transition-all cursor-pointer group
                                    ${sg.dataphone_voucher_url
                                        ? 'bg-blue-50 border-blue-200 hover:bg-blue-100'
                                        : 'bg-gray-50 border-gray-100 hover:bg-white hover:border-blue-200 hover:shadow-sm'
                                    }`}
                            >
                                {uploadingDataphone ? (
                                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                                ) : (
                                    <>
                                        <div className={`p-3 rounded-full ${sg.dataphone_voucher_url ? 'bg-blue-100 text-blue-600' : 'bg-white border border-gray-100 text-gray-400 group-hover:text-blue-500'}`}>
                                            {sg.dataphone_voucher_url ? <Check className="w-5 h-5" /> : <CreditCard className="w-5 h-5" />}
                                        </div>
                                        <span className={`text-xs font-bold text-center ${sg.dataphone_voucher_url ? 'text-blue-700' : 'text-gray-500 group-hover:text-blue-600'}`}>
                                            {sg.dataphone_voucher_url ? 'Voucher Cargado' : 'Voucher Datáfono'}
                                        </span>
                                    </>
                                )}
                            </div>

                            {/* POS Invoice */}
                            <div
                                onClick={onUploadInvoice}
                                className={`flex-1 border rounded-xl p-4 flex flex-col items-center justify-center gap-2 transition-all cursor-pointer group
                                    ${sg.pos_invoice_url
                                        ? 'bg-blue-50 border-blue-200 hover:bg-blue-100'
                                        : 'bg-gray-50 border-gray-100 hover:bg-white hover:border-blue-200 hover:shadow-sm'
                                    }`}
                            >
                                {uploadingInvoice ? (
                                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                                ) : (
                                    <>
                                        <div className={`p-3 rounded-full ${sg.pos_invoice_url ? 'bg-blue-100 text-blue-600' : 'bg-white border border-gray-100 text-gray-400 group-hover:text-blue-500'}`}>
                                            {sg.pos_invoice_url ? <Check className="w-5 h-5" /> : <Receipt className="w-5 h-5" />}
                                        </div>
                                        <span className={`text-xs font-bold text-center ${sg.pos_invoice_url ? 'text-blue-700' : 'text-gray-500 group-hover:text-blue-600'}`}>
                                            {sg.pos_invoice_url ? 'Factura Cargada' : 'Factura POS Siigo'}
                                        </span>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
