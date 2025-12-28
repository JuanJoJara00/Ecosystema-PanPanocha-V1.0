import { User, Calendar, DollarSign, X, FileText, Download, Clock } from 'lucide-react'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'

interface PayrollRecord {
    id: string
    employee_id: string
    period_start: string
    period_end: string
    base_amount: number
    bonuses: number
    deductions: number
    net_amount: number
    payment_date: string
    payment_method: string
    payment_type?: string
    status: string
    notes: string
    employees?: { full_name: string; position: string }
    payroll_items?: Array<{
        item_type: string
        concept: string
        amount: number
    }>
    payment_proof_url?: string
}

interface PayrollDetailProps {
    payroll: PayrollRecord
    onClose: () => void
    onDownloadPDF: () => void
}

export default function PayrollDetail({ payroll, onClose, onDownloadPDF }: PayrollDetailProps) {
    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('es-CO', {
            style: 'currency',
            currency: 'COP',
            minimumFractionDigits: 0
        }).format(amount)
    }

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('es-CO', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        })
    }

    const getPaymentMethodLabel = (method: string) => {
        const labels: Record<string, string> = {
            'cash': 'Efectivo',
            'transfer': 'Transferencia',
            'check': 'Cheque'
        }
        return labels[method] || method
    }

    return (
        <div className="flex flex-col h-full max-h-[85vh]">
            {/* Header - Fixed */}
            <div className="flex justify-between items-start p-6 border-b border-gray-100 bg-white rounded-t-2xl shrink-0">
                <div className="flex gap-4 items-start">
                    <div className="h-14 w-14 bg-green-50 rounded-xl flex items-center justify-center text-green-600 shrink-0">
                        <DollarSign className="h-7 w-7" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-gray-900 font-display uppercase tracking-tight">{payroll.employees?.full_name}</h2>
                        <p className="text-sm text-gray-500 font-sans mt-0.5">{payroll.employees?.position}</p>
                    </div>
                </div>
                <button
                    onClick={onClose}
                    className="text-gray-400 hover:text-gray-600 transition-colors p-1"
                >
                    <X className="h-6 w-6" />
                </button>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-8">
                {/* Info Grid */}
                <div className="grid grid-cols-2 gap-x-8 gap-y-6">
                    <div>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Estado</p>
                        <Badge variant={payroll.status === 'paid' ? 'success' : 'warning'}>
                            {payroll.status === 'paid' ? 'Pagado' : 'Pendiente'}
                        </Badge>
                    </div>
                    <div>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Tipo de Pago</p>
                        <Badge variant={payroll.payment_type === 'late' ? 'warning' : payroll.payment_type === 'advance' ? 'info' : 'success'}>
                            {payroll.payment_type === 'late' ? '⏰ Atrasado' : payroll.payment_type === 'advance' ? '⚡ Avance' : '✓ Al Día'}
                        </Badge>
                    </div>

                    <div>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Periodo</p>
                        <p className="font-medium text-gray-900 flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-gray-400" />
                            {formatDate(payroll.period_start)} - {formatDate(payroll.period_end)}
                        </p>
                    </div>
                    <div>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Fecha de Pago</p>
                        <p className="font-medium text-gray-900">
                            {formatDate(payroll.payment_date)}
                        </p>
                    </div>

                    <div>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Método</p>
                        <p className="font-medium text-gray-900 capitalize">
                            {getPaymentMethodLabel(payroll.payment_method)}
                        </p>
                    </div>
                </div>

                {/* Salary Breakdown */}
                <div className="bg-gray-50 rounded-xl p-5 border border-gray-100">
                    <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider mb-4 flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        Desglose Salarial
                    </h3>

                    <div className="space-y-3">
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-gray-600">Salario Base</span>
                            <span className="font-medium font-mono">{formatCurrency(payroll.base_amount)}</span>
                        </div>

                        {/* Bonuses */}
                        {payroll.payroll_items?.filter(i => i.item_type === 'bonus').map((item, idx) => (
                            <div key={idx} className="flex justify-between items-center text-sm p-2 bg-green-50/50 rounded-lg border border-green-100">
                                <span className="text-green-700 font-medium flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                                    {item.concept}
                                </span>
                                <span className="font-medium font-mono text-green-700">+ {formatCurrency(item.amount)}</span>
                            </div>
                        ))}

                        {/* Deductions */}
                        {payroll.payroll_items?.filter(i => i.item_type === 'deduction').map((item, idx) => (
                            <div key={idx} className="flex justify-between items-center text-sm p-2 bg-red-50/50 rounded-lg border border-red-100">
                                <span className="text-red-700 font-medium flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
                                    {item.concept}
                                </span>
                                <span className="font-medium font-mono text-red-700">- {formatCurrency(item.amount)}</span>
                            </div>
                        ))}

                        <div className="flex justify-between items-center text-lg font-bold pt-3 border-t border-gray-200 mt-2">
                            <span className="text-gray-900">Total Neto</span>
                            <span className="text-green-600 font-mono">{formatCurrency(payroll.net_amount)}</span>
                        </div>
                    </div>
                </div>

                {/* Attachments Section */}
                <div className="space-y-4">
                    <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        Comprobantes
                    </h3>

                    <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm flex flex-col items-center justify-center text-center gap-3 hover:border-pp-gold transition-colors group relative overflow-hidden w-full md:w-1/2">
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest z-10">Comprobante de Pago</p>
                        {payroll.payment_proof_url ? (
                            <a
                                href={payroll.payment_proof_url}
                                target="_blank"
                                rel="noreferrer"
                                className="z-10 w-full"
                            >
                                <div className="h-32 w-full bg-gray-100 rounded-lg flex items-center justify-center mb-2 overflow-hidden border border-gray-100">
                                    <img src={payroll.payment_proof_url} alt="Comprobante Pago" className="w-full h-full object-cover" />
                                </div>
                                <span className="text-xs font-bold text-pp-brown underline">Ver Comprobante</span>
                            </a>
                        ) : (
                            <div className="z-10 py-6">
                                <div className="h-10 w-10 bg-gray-100 rounded-full flex items-center justify-center text-gray-300 mx-auto mb-2">
                                    <X className="h-5 w-5" />
                                </div>
                                <p className="text-xs text-gray-400 italic">No adjuntado</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Notes */}
                {payroll.notes && (
                    <div className="bg-yellow-50 p-4 rounded-xl border border-yellow-100">
                        <h3 className="font-bold mb-2 text-yellow-800 text-xs uppercase tracking-wide flex items-center gap-2">
                            <FileText className="h-3 w-3" />
                            Notas Adicionales
                        </h3>
                        <p className="text-sm text-yellow-900 leading-relaxed font-sans">{payroll.notes}</p>
                    </div>
                )}
            </div>

            {/* Sticky Lower Actions Footer */}
            <div className="p-4 border-t border-gray-100 bg-gray-50 rounded-b-2xl flex justify-end gap-3 shrink-0">
                <Button
                    onClick={onDownloadPDF}
                    className="bg-pp-brown hover:bg-pp-brown/90 text-white border-transparent shadow-sm"
                    startIcon={<Download className="h-4 w-4" />}
                >
                    Descargar PDF
                </Button>
            </div>
        </div>
    )
}
