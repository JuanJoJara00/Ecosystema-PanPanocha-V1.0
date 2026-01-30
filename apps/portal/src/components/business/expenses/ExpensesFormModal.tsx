'use client'

import React, { useState, useEffect } from 'react'
import Modal from '@/components/ui/Modal'
import { supabase } from '@/lib/supabase'
import Button from '@/components/ui/Button'
import {
    Wallet,
    Package,
    Zap,
    Users,
    Home,
    MoreHorizontal,
    FileText,
    Truck,
    Coins,
    Store,
    Calendar,
    Paperclip,
    Check,
    Clock,
    Upload,
    X
} from 'lucide-react'

interface ExpensesFormModalProps {
    isOpen: boolean
    onClose: () => void
    onSuccess: () => void
}

export default function ExpensesFormModal({ isOpen, onClose, onSuccess }: ExpensesFormModalProps) {
    const [amount, setAmount] = useState('')
    const [description, setDescription] = useState('')
    const [category, setCategory] = useState('Suministros')
    const [voucherNumber, setVoucherNumber] = useState('')
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [branches, setBranches] = useState<any[]>([])
    const [selectedBranchId, setSelectedBranchId] = useState<string>('')
    const [userId, setUserId] = useState<string | null>(null)

    // New Fields
    const [status, setStatus] = useState<'paid' | 'pending'>('paid')
    const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0])
    const [dueDate, setDueDate] = useState('')
    const [suppliers, setSuppliers] = useState<any[]>([])
    const [selectedSupplierId, setSelectedSupplierId] = useState<string>('')

    // Files
    const [invoiceFile, setInvoiceFile] = useState<File | null>(null)
    const [paymentProofFile, setPaymentProofFile] = useState<File | null>(null)

    const categories = [
        { name: 'Suministros', icon: Package, bgSelected: 'bg-cyan-50', borderSelected: 'border-cyan-400', textSelected: 'text-cyan-600' },
        { name: 'Servicios', icon: Zap, bgSelected: 'bg-amber-50', borderSelected: 'border-amber-400', textSelected: 'text-amber-600' },
        { name: 'Nómina', icon: Users, bgSelected: 'bg-fuchsia-50', borderSelected: 'border-fuchsia-400', textSelected: 'text-fuchsia-600' },
        { name: 'Arriendo', icon: Home, bgSelected: 'bg-indigo-50', borderSelected: 'border-indigo-400', textSelected: 'text-indigo-600' },
        { name: 'Domicilios', icon: Truck, bgSelected: 'bg-blue-50', borderSelected: 'border-blue-400', textSelected: 'text-blue-600' },
        { name: 'Propinas', icon: Coins, bgSelected: 'bg-emerald-50', borderSelected: 'border-emerald-400', textSelected: 'text-emerald-600' },
        { name: 'Otros', icon: MoreHorizontal, bgSelected: 'bg-gray-100', borderSelected: 'border-gray-400', textSelected: 'text-gray-600' },
    ]

    useEffect(() => {
        const getUser = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (user) setUserId(user.id)
        }
        getUser()
        fetchBranches()
        fetchSuppliers()
    }, [])

    useEffect(() => {
        if (isOpen) {
            // Reset form
            setAmount('')
            setDescription('')
            setCategory('Suministros')
            setVoucherNumber('')
            setStatus('paid')
            setInvoiceDate(new Date().toISOString().split('T')[0])
            setDueDate('')
            setSelectedSupplierId('')
            setInvoiceFile(null)
            setPaymentProofFile(null)
            // Ensure branch is selected if available
            if (branches.length > 0 && !selectedBranchId) {
                setSelectedBranchId(branches[0].id)
            }
        }
    }, [isOpen, branches])

    const fetchBranches = async () => {
        const { data } = await supabase.from('branches').select('id, name')
        if (data) {
            setBranches(data)
            if (data.length > 0) setSelectedBranchId(data[0].id)
        }
    }

    const fetchSuppliers = async () => {
        const { data } = await supabase.from('suppliers').select('id, name').order('name')
        if (data) setSuppliers(data)
    }

    const uploadFile = async (file: File, path: string) => {
        const fileExt = file.name.split('.').pop()
        const fileName = `${crypto.randomUUID()}.${fileExt}`
        const filePath = `${path}/${fileName}`

        const { error: uploadError } = await supabase.storage
            .from('documents')
            .upload(filePath, file)

        if (uploadError) throw uploadError

        const { data } = supabase.storage.from('documents').getPublicUrl(filePath)
        return data.publicUrl
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!amount || !description || !selectedBranchId) return
        if (!userId) {
            alert('Error: No se pudo identificar al usuario actual.')
            return
        }

        // Validation for Pending Payment
        if (status === 'pending' && !dueDate) {
            alert('Por favor, ingresa la fecha límite de pago.')
            return
        }

        setIsSubmitting(true)
        try {
            let invoiceUrl = null
            let paymentProofUrl = null

            // Upload Invoice
            if (invoiceFile) {
                invoiceUrl = await uploadFile(invoiceFile, `expenses/${selectedBranchId}/invoices`)
            }

            // Upload Payment Proof (only if Paid)
            if (status === 'paid' && paymentProofFile) {
                paymentProofUrl = await uploadFile(paymentProofFile, `expenses/${selectedBranchId}/payments`)
            }

            const payload: any = {
                amount: parseFloat(amount),
                description: description,
                branch_id: selectedBranchId,
                category: category.toLowerCase(),
                user_id: userId,
                voucher_number: voucherNumber || null,
                status: status,
                invoice_date: invoiceDate,
                due_date: status === 'pending' ? dueDate : null, // Only relevant if pending
                supplier_id: selectedSupplierId || null,
                voucher_url: invoiceUrl,
                payment_proof_url: paymentProofUrl
            }

            const { error } = await supabase.from('expenses').insert(payload)

            if (error) throw error
            onSuccess()
            onClose()
        } catch (error: any) {
            console.error('Failed to create expense:', error)
            alert('Error al crear gasto: ' + error.message)
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="" maxWidth="max-w-3xl">
            {/* Header */}
            <div className="flex justify-between items-start border-b border-gray-100 pb-4 mb-4">
                <div>
                    <h2 className="text-2xl font-black text-gray-900 uppercase tracking-tight leading-none flex items-center gap-2">
                        <Wallet className="text-[#D4AF37]" /> Registrar Gasto
                    </h2>
                    <p className="text-sm text-gray-500 mt-1">Control de salidas de caja y cuentas por pagar</p>
                </div>

                {/* Status Toggle */}
                <div className="flex bg-gray-100 rounded-lg p-1">
                    <button
                        type="button"
                        onClick={() => setStatus('paid')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-bold transition-all ${status === 'paid'
                            ? 'bg-green-500 text-white shadow-sm'
                            : 'text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        <Check size={16} /> Pagado
                    </button>
                    <button
                        type="button"
                        onClick={() => setStatus('pending')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-bold transition-all ${status === 'pending'
                            ? 'bg-orange-500 text-white shadow-sm'
                            : 'text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        <Clock size={16} /> Pendiente
                    </button>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col md:flex-row gap-6">

                {/* Left Column: Form Data */}
                <div className="flex-1 space-y-4">

                    {/* Amounts and Descriptions */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2">
                            <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wider">Concepto</label>
                            <input
                                type="text"
                                placeholder="Ej: Pago de servicios, compra de insumos"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-[#D4AF37]/50 outline-none"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wider">Monto</label>
                            <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-lg">$</span>
                                <input
                                    title="Monto del gasto"
                                    type="number"
                                    placeholder="0"
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                    className={`w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl font-mono text-xl font-black outline-none focus:ring-2 ${status === 'paid' ? 'text-red-600 focus:ring-red-200' : 'text-orange-600 focus:ring-orange-200'}`}
                                    required
                                    min="0"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wider">Proveedor (Opcional)</label>
                            <select
                                title="Seleccionar Proveedor"
                                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-[#D4AF37]/50 outline-none appearance-none"
                                value={selectedSupplierId}
                                onChange={(e) => setSelectedSupplierId(e.target.value)}
                            >
                                <option value="">-- Seleccionar --</option>
                                {suppliers.map(s => (
                                    <option key={s.id} value={s.id}>{s.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wider">Sede</label>
                            <div className="relative">
                                <Store className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
                                <select
                                    title="Seleccionar Sede"
                                    className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-[#D4AF37]/50 outline-none appearance-none"
                                    value={selectedBranchId}
                                    onChange={(e) => setSelectedBranchId(e.target.value)}
                                    required
                                >
                                    {branches.map(b => (
                                        <option key={b.id} value={b.id}>{b.name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wider flex items-center gap-1">
                                <FileText size={12} /> N° Factura
                            </label>
                            <input
                                title="Número de factura"
                                type="text"
                                placeholder="Opcional"
                                value={voucherNumber}
                                onChange={(e) => setVoucherNumber(e.target.value)}
                                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-[#D4AF37]/50 outline-none"
                            />
                        </div>
                    </div>

                    {/* Dates */}
                    <div className="grid grid-cols-2 gap-4 bg-gray-50 p-3 rounded-xl border border-dashed border-gray-200">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wider">Fecha Factura</label>
                            <input
                                title="Fecha de la factura"
                                type="date"
                                value={invoiceDate}
                                onChange={(e) => setInvoiceDate(e.target.value)}
                                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium focus:ring-1 focus:ring-gray-400 outline-none"
                                required
                            />
                        </div>

                        <div className={status === 'paid' ? 'opacity-50 pointer-events-none' : ''}>
                            <label className="block text-xs font-bold text-orange-600 mb-1 uppercase tracking-wider flex items-center gap-1">
                                <Clock size={12} /> Fecha Límite
                            </label>
                            <input
                                title="Fecha límite de pago"
                                type="date"
                                value={dueDate}
                                onChange={(e) => setDueDate(e.target.value)}
                                className="w-full px-3 py-2 bg-white border border-orange-200 rounded-lg text-sm font-medium focus:ring-1 focus:ring-orange-400 outline-none text-orange-700"
                                required={status === 'pending'}
                            />
                        </div>
                    </div>

                    {/* Categories */}
                    <div>
                        <label className="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-wider">Categoría</label>
                        <div className="grid grid-cols-4 gap-2">
                            {categories.map((cat) => (
                                <button
                                    key={cat.name}
                                    type="button"
                                    onClick={() => setCategory(cat.name)}
                                    className={`flex flex-col items-center justify-center p-2 rounded-xl border-2 transition-all ${category === cat.name
                                        ? `${cat.borderSelected} ${cat.bgSelected} shadow-sm`
                                        : 'border-gray-100 bg-white hover:border-gray-300 hover:bg-gray-50'
                                        }`}
                                >
                                    <cat.icon size={18} className={category === cat.name ? cat.textSelected : 'text-gray-400'} />
                                    <span className={`text-[9px] mt-1 font-bold uppercase ${category === cat.name ? cat.textSelected : 'text-gray-400'}`}>
                                        {cat.name}
                                    </span>
                                </button>
                            ))}
                        </div>
                    </div>

                </div>

                {/* Right Column: Attachments */}
                <div className="w-full md:w-72 flex flex-col gap-4">
                    <p className="text-xs font-black text-gray-400 uppercase tracking-widest border-b border-gray-100 pb-2">Adjuntos / Evidencia</p>

                    {/* Invoice Upload */}
                    <div className="flex-1 border-2 border-dashed border-gray-200 rounded-2xl flex flex-col items-center justify-center p-4 hover:bg-gray-50 transition-colors relative group">
                        <input
                            title="Subir Factura"
                            type="file"
                            className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10"
                            accept="image/*,.pdf"
                            onChange={(e) => setInvoiceFile(e.target.files ? e.target.files[0] : null)}
                        />
                        {invoiceFile ? (
                            <div className="text-center relative z-20">
                                <div className="h-10 w-10 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-2">
                                    <Paperclip size={20} />
                                </div>
                                <p className="text-xs font-bold text-gray-700 truncate max-w-[150px]">{invoiceFile.name}</p>
                                <p className="text-[10px] text-green-600 font-bold uppercase mt-1">Factura Cargada</p>
                                <button
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); setInvoiceFile(null); }}
                                    className="mt-2 text-[10px] text-red-500 hover:underline z-30 relative"
                                >
                                    Eliminar
                                </button>
                            </div>
                        ) : (
                            <div className="text-center">
                                <FileText className="mx-auto text-gray-300 mb-2" size={32} />
                                <p className="text-xs font-bold text-gray-500">Subir Factura</p>
                                <p className="text-[10px] text-gray-400">Click o arrastrar</p>
                            </div>
                        )}
                    </div>

                    {/* Payment Proof Upload (Conditional) */}
                    {status === 'paid' && (
                        <div className="flex-1 border-2 border-dashed border-gray-200 rounded-2xl flex flex-col items-center justify-center p-4 hover:bg-gray-50 transition-colors relative animate-in fade-in slide-in-from-bottom-2">
                            <input
                                title="Subir Comprobante"
                                type="file"
                                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10"
                                accept="image/*,.pdf"
                                onChange={(e) => setPaymentProofFile(e.target.files ? e.target.files[0] : null)}
                            />
                            {paymentProofFile ? (
                                <div className="text-center relative z-20">
                                    <div className="h-10 w-10 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-2">
                                        <Check size={20} />
                                    </div>
                                    <p className="text-xs font-bold text-gray-700 truncate max-w-[150px]">{paymentProofFile.name}</p>
                                    <p className="text-[10px] text-blue-600 font-bold uppercase mt-1">Comprobante Cargado</p>
                                    <button
                                        type="button"
                                        onClick={(e) => { e.stopPropagation(); setPaymentProofFile(null); }}
                                        className="mt-2 text-[10px] text-red-500 hover:underline z-30 relative"
                                    >
                                        Eliminar
                                    </button>
                                </div>
                            ) : (
                                <div className="text-center">
                                    <Upload className="mx-auto text-gray-300 mb-2" size={32} />
                                    <p className="text-xs font-bold text-gray-500">Comprobante Pago</p>
                                    <p className="text-[10px] text-gray-400">Si ya fue pagado</p>
                                </div>
                            )}
                        </div>
                    )}

                    <Button
                        type="submit"
                        disabled={isSubmitting || !amount || !description || !selectedBranchId}
                        className={`w-full font-bold h-12 rounded-xl shadow-lg text-sm uppercase tracking-wider ${status === 'paid'
                            ? 'bg-[#D4AF37] hover:bg-[#C19B2D] text-white shadow-amber-200/50'
                            : 'bg-gray-900 hover:bg-gray-800 text-white shadow-gray-400/50'
                            }`}
                    >
                        {isSubmitting ? '⏳ Guardando...' : (status === 'paid' ? '💸 Registrar Pago' : '💾 Guardar Pendiente')}
                    </Button>
                </div>
            </form>
        </Modal>
    )
}
