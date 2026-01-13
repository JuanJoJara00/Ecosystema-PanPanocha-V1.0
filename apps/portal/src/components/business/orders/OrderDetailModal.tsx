'use client'

import React, { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import {
    FileText,
    X,
    Pencil,
    Trash2,
    AlertCircle,
    CheckCircle,
    Download,
    Building2,
    Truck,
    Calendar,
    DollarSign,
    Package,
    ArrowRight,
    ExternalLink,
    MapPin,
    Clock,
    User,
    Upload,
    CheckCircle2,
    ShoppingCart
} from 'lucide-react'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import Card from '@/components/ui/Card'
import { generateOrderPDF } from './OrderPDFGenerator'

export interface OrderDetailModalProps {
    orderId: string | null
    onClose: () => void
    onEdit?: (orderId: string) => void
    onDelete?: (orderId: string) => void
    onUpdate?: () => void
}

export default function OrderDetailModal({ orderId, onClose, onEdit, onDelete, onUpdate }: OrderDetailModalProps) {
    const [order, setOrder] = useState<any>(null)
    const [items, setItems] = useState<any[]>([])
    const [loading, setLoading] = useState(true)

    // Receiving Mode State
    const [isReceiving, setIsReceiving] = useState(false)
    const [receiveQuantities, setReceiveQuantities] = useState<Record<string, number>>({})
    const [invoiceUrl, setInvoiceUrl] = useState<string | null>(null)
    const [paymentStatus, setPaymentStatus] = useState<'pending' | 'paid'>('pending')
    const [paymentProofUrl, setPaymentProofUrl] = useState<string | null>(null)
    const [isRegisteringPayment, setIsRegisteringPayment] = useState(false)

    useEffect(() => {
        if (orderId) fetchDetails()
    }, [orderId])

    const fetchDetails = async () => {
        setLoading(true)
        try {
            const { data: orderData, error: orderError } = await supabase
                .from('purchase_orders')
                .select(`*, supplier:suppliers(name), branch:branches(name), requester:users!purchase_orders_requested_by_fkey(full_name), modifier:users!purchase_orders_last_modified_by_fkey(full_name)`)
                .eq('id', orderId)
                .single()

            if (orderError) throw orderError
            setOrder(orderData)
            if (orderData.invoice_url) setInvoiceUrl(orderData.invoice_url)
            if (orderData.payment_status) setPaymentStatus(orderData.payment_status)
            if (orderData.payment_proof_url) setPaymentProofUrl(orderData.payment_proof_url)

            const { data: itemsData, error: itemsError } = await supabase
                .from('purchase_order_items')
                .select(`*, item:inventory_items(name, unit, sku)`)
                .eq('order_id', orderId)

            if (itemsError) throw itemsError
            setItems(itemsData || [])

        } catch (err) {
            console.error(err)
        } finally {
            setLoading(false)
        }
    }

    const handleRegisterPayment = async () => {
        if (!paymentProofUrl) {
            alert('Debes adjuntar el comprobante de pago.')
            return
        }
        setLoading(true)
        try {
            const { error } = await supabase
                .from('purchase_orders')
                .update({
                    payment_status: 'paid',
                    payment_proof_url: paymentProofUrl
                })
                .eq('id', orderId)

            if (error) throw error

            alert('Pago registrado correctamente')
            if (onUpdate) onUpdate()
            onClose()
        } catch (err: any) {
            console.error(err)
            alert('Error al registrar pago: ' + err.message)
        } finally {
            setLoading(false)
        }
    }

    const startReceiving = () => {
        const initialQtys: Record<string, number> = {}
        items.forEach(item => {
            initialQtys[item.id] = item.quantity
        })
        setReceiveQuantities(initialQtys)
        setPaymentStatus(order.payment_status || 'pending')
        setInvoiceUrl(order.invoice_url || null)
        setPaymentProofUrl(order.payment_proof_url || null)
        setIsReceiving(true)
    }

    const handleConfirmReception = async () => {
        setLoading(true)
        try {
            if (!invoiceUrl) {
                alert('⚠️ Validacion fallida:\nLa FOTO DE LA FACTURA es obligatoria para confirmar la recepción.')
                setLoading(false)
                return
            }

            if (paymentStatus === 'paid' && !paymentProofUrl) {
                alert('⚠️ Validacion fallida:\nPara marcar como PAGADO, es obligatorio adjuntar el COMPROBANTE DE PAGO.')
                setLoading(false)
                return
            }

            for (const item of items) {
                const confirmedQty = receiveQuantities[item.id] ?? item.quantity
                if (confirmedQty !== item.quantity) {
                    const { error: updateItemError } = await supabase
                        .from('purchase_order_items')
                        .update({ quantity: confirmedQty })
                        .eq('id', item.id)
                    if (updateItemError) throw updateItemError
                }
            }

            for (const item of items) {
                const qtyToAdd = receiveQuantities[item.id] ?? item.quantity
                const { data: currentStockVal } = await supabase
                    .from('branch_ingredients')
                    .select('quantity')
                    .eq('branch_id', order.branch_id)
                    .eq('item_id', item.item_id)
                    .single()

                const currentQty = currentStockVal?.quantity || 0
                const newQty = currentQty + qtyToAdd

                const { error: upsertError } = await supabase
                    .from('branch_ingredients')
                    .upsert({
                        branch_id: order.branch_id,
                        item_id: item.item_id,
                        quantity: newQty,
                        last_updated: new Date().toISOString()
                    }, { onConflict: 'branch_id, item_id' })

                if (upsertError) throw upsertError
            }

            const hasQuantityChanges = items.some(item => {
                const confirmed = receiveQuantities[item.id] ?? item.quantity
                return confirmed !== item.quantity
            })

            const updatePayload: any = {
                status: 'received',
                invoice_url: invoiceUrl,
                payment_status: paymentStatus,
                payment_proof_url: paymentStatus === 'paid' ? paymentProofUrl : null,
                ...(hasQuantityChanges ? {
                    last_modified_at: new Date().toISOString(),
                    last_edit_type: 'reception'
                } : {})
            }

            const { error: updateError } = await supabase
                .from('purchase_orders')
                .update(updatePayload)
                .eq('id', orderId)

            if (updateError) throw updateError

            alert('✅ Orden recibida exitosamente.\nInventario actualizado.')
            if (onUpdate) onUpdate()
            onClose()

        } catch (err: any) {
            console.error('Error confirming reception:', err)
            alert('Error al confirmar recepción: ' + err.message)
        } finally {
            setLoading(false)
        }
    }

    if (!orderId) return null

    const isEditable = order?.status === 'pending'

    return (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50 backdrop-blur-md animate-in fade-in duration-300">
            <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl rounded-[2.5rem] shadow-2xl w-full max-w-6xl overflow-hidden flex flex-col md:flex-row max-h-[90vh] animate-in zoom-in-95 duration-300 border border-white/20">

                {/* Left Panel: Itemized List & Context (3/5) */}
                <div className="flex-1 overflow-y-auto custom-scrollbar border-r border-gray-100 dark:border-white/5 bg-white dark:bg-slate-900">

                    {/* Header Banner */}
                    <div className="p-10 border-b border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-slate-800/20 flex items-center justify-between sticky top-0 z-10 backdrop-blur-md">
                        <div className="flex items-center gap-5">
                            <div className="h-16 w-16 rounded-2xl bg-pp-brown flex items-center justify-center text-pp-gold shadow-lg shadow-pp-brown/20">
                                <ShoppingCart size={32} />
                            </div>
                            <div>
                                <h2 className="text-3xl font-black text-gray-900 dark:text-white uppercase tracking-tighter font-display leading-none">
                                    {isReceiving ? 'Confirmar Recepción' : isRegisteringPayment ? 'Registrar Pago' : 'Detalle de Pedido'}
                                </h2>
                                <div className="flex items-center gap-2 mt-1.5">
                                    <Badge className="bg-pp-gold text-pp-brown border-none font-black text-[10px] uppercase px-3 py-1">
                                        Ref: #{order?.id.split('-')[0].toUpperCase()}
                                    </Badge>
                                    <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">{new Date(order?.created_at).toLocaleDateString()}</span>
                                </div>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-3 hover:bg-white dark:hover:bg-slate-800 rounded-full text-gray-400 transition-all border border-transparent hover:border-gray-100 dark:hover:border-white/5"
                            title="Cerrar modal"
                        >
                            <X size={24} />
                        </button>
                    </div>

                    {/* Main Content Areas */}
                    <div className="p-10 space-y-12">

                        {/* Section 1: Itemized List */}
                        <div className="space-y-6">
                            <h3 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em] flex items-center gap-2">
                                <Package size={16} className="text-pp-gold" /> Lista de Insumos & Materias Primas
                            </h3>

                            <div className="bg-white dark:bg-slate-800 rounded-[2rem] border border-gray-100 dark:border-white/5 overflow-hidden shadow-xl shadow-gray-200/20 dark:shadow-none">
                                <table className="w-full text-sm text-left border-collapse">
                                    <thead>
                                        <tr className="bg-gray-50/50 dark:bg-slate-800/50 text-gray-400 dark:text-gray-500 font-medium">
                                            <th className="px-8 py-5 font-black uppercase text-[10px] tracking-widest">Insumo</th>
                                            <th className="px-8 py-5 text-center font-black uppercase text-[10px] tracking-widest">Solicitado</th>
                                            {isReceiving && <th className="px-8 py-5 text-center font-black uppercase text-[10px] tracking-widest">Recibido</th>}
                                            <th className="px-8 py-5 text-right font-black uppercase text-[10px] tracking-widest">Unidad</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                                        {items.map(item => (
                                            <tr key={item.id} className="group hover:bg-gray-50/50 dark:hover:bg-white/5 transition-colors">
                                                <td className="px-8 py-6">
                                                    <p className="font-black text-gray-900 dark:text-white uppercase text-base">{item.item?.name}</p>
                                                    <p className="text-[10px] font-bold text-gray-400 uppercase font-mono tracking-tighter">SKU: {item.item?.sku}</p>
                                                </td>
                                                <td className="px-8 py-6 text-center">
                                                    <span className="text-xl font-black text-gray-900 dark:text-white font-display italic">{item.quantity}</span>
                                                </td>
                                                {isReceiving && (
                                                    <td className="px-8 py-6 text-center">
                                                        <input
                                                            type="number"
                                                            title="Cantidad recibida"
                                                            value={receiveQuantities[item.id] ?? item.quantity}
                                                            onChange={e => setReceiveQuantities(prev => ({ ...prev, [item.id]: parseFloat(e.target.value) }))}
                                                            className="w-20 bg-pp-gold/10 border-2 border-pp-gold/30 rounded-xl py-2 px-3 text-center font-black text-pp-brown text-lg focus:ring-4 focus:ring-pp-gold/20 outline-none transition-all"
                                                        />
                                                    </td>
                                                )}
                                                <td className="px-8 py-6 text-right">
                                                    <Badge variant="neutral" className="bg-gray-100 dark:bg-slate-700 font-bold uppercase py-1">{item.item?.unit}</Badge>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Section 2: Uploads/Evidence (When in Reception or Payment mode) */}
                        {(isReceiving || isRegisteringPayment) && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-in slide-in-from-bottom-5 duration-500">
                                {/* Invoice Evidence */}
                                {isReceiving && (
                                    <div className="space-y-4">
                                        <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                                            <Upload size={14} className="text-pp-gold" /> Evidencia de Facturación
                                        </h4>
                                        <label className="block relative cursor-pointer group">
                                            <div className="h-48 rounded-[2rem] border-2 border-dashed border-pp-gold/30 bg-pp-gold/5 flex flex-col items-center justify-center gap-3 group-hover:bg-pp-gold/10 transition-all overflow-hidden">
                                                {invoiceUrl ? (
                                                    <img src={invoiceUrl} alt="Factura" className="w-full h-full object-cover" />
                                                ) : (
                                                    <>
                                                        <div className="h-14 w-14 rounded-2xl bg-pp-gold/20 flex items-center justify-center text-pp-brown">
                                                            <Upload size={28} />
                                                        </div>
                                                        <p className="text-xs font-black text-pp-brown uppercase tracking-widest">Subir Foto Factura</p>
                                                    </>
                                                )}
                                            </div>
                                            <input
                                                type="file"
                                                className="hidden"
                                                onChange={async (e) => {
                                                    const file = e.target.files?.[0]
                                                    if (!file) return
                                                    const fileName = `inv_${orderId}_${Date.now()}`
                                                    const { data, error } = await supabase.storage.from('invoices').upload(fileName, file)
                                                    if (error) alert(error.message)
                                                    else {
                                                        const { data: { publicUrl } } = supabase.storage.from('invoices').getPublicUrl(fileName)
                                                        setInvoiceUrl(publicUrl)
                                                    }
                                                }}
                                            />
                                        </label>
                                    </div>
                                )}

                                {/* Payment Evidence */}
                                {(isReceiving && paymentStatus === 'paid') || isRegisteringPayment ? (
                                    <div className="space-y-4">
                                        <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                                            <DollarSign size={14} className="text-pp-gold" /> Comprobante de Pago
                                        </h4>
                                        <label className="block relative cursor-pointer group">
                                            <div className="h-48 rounded-[2rem] border-2 border-dashed border-pp-gold/30 bg-pp-gold/5 flex flex-col items-center justify-center gap-3 group-hover:bg-pp-gold/10 transition-all overflow-hidden">
                                                {paymentProofUrl ? (
                                                    <img src={paymentProofUrl} alt="Comprobante" className="w-full h-full object-cover" />
                                                ) : (
                                                    <>
                                                        <div className="h-14 w-14 rounded-2xl bg-pp-gold/20 flex items-center justify-center text-pp-brown">
                                                            <Upload size={28} />
                                                        </div>
                                                        <p className="text-xs font-black text-pp-brown uppercase tracking-widest">Subir Comprobante</p>
                                                    </>
                                                )}
                                            </div>
                                            <input
                                                type="file"
                                                className="hidden"
                                                onChange={async (e) => {
                                                    const file = e.target.files?.[0]
                                                    if (!file) return
                                                    const fileName = `pay_${orderId}_${Date.now()}`
                                                    const { data, error } = await supabase.storage.from('payment_proofs').upload(fileName, file)
                                                    if (error) alert(error.message)
                                                    else {
                                                        const { data: { publicUrl } } = supabase.storage.from('payment_proofs').getPublicUrl(fileName)
                                                        setPaymentProofUrl(publicUrl)
                                                    }
                                                }}
                                            />
                                        </label>
                                    </div>
                                ) : null}
                            </div>
                        )}

                        {/* Modification Alert */}
                        {order?.last_modified_at && (
                            <div className="bg-pp-gold/10 border border-pp-gold/30 rounded-[2rem] p-8 flex items-start gap-5 relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-10 opacity-5 text-pp-brown -translate-y-4 translate-x-4">
                                    <AlertCircle size={80} />
                                </div>
                                <div className="h-12 w-12 rounded-2xl bg-pp-gold/20 flex items-center justify-center text-pp-brown shrink-0">
                                    <AlertCircle size={24} />
                                </div>
                                <div>
                                    <h4 className="text-sm font-black text-pp-brown uppercase tracking-widest mb-1">Registro de Modificación</h4>
                                    <p className="text-xs text-pp-brown/70 font-bold uppercase leading-relaxed">
                                        Detectamos un ajuste manual el {new Date(order.last_modified_at).toLocaleString()}. <br />
                                        Autor: {order.modifier?.full_name || 'Protocolo del Sistema'}
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Panel: Logistics & Global Actions (2/5) */}
                <div className="w-full md:w-[450px] bg-gray-50/50 dark:bg-slate-800/10 p-10 flex flex-col justify-between">
                    <div className="flex-1 space-y-10">
                        {/* Order Identity Card */}
                        <div className="bg-pp-brown p-8 rounded-[2.8rem] text-white shadow-2xl shadow-pp-brown/30 relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-10 opacity-10 translate-x-4 -translate-y-4 group-hover:scale-110 transition-transform duration-700">
                                <Truck size={120} />
                            </div>
                            <div className="relative z-10">
                                <div className="flex justify-between items-start mb-6">
                                    <Badge className="bg-white/10 text-pp-gold border-white/10 font-black text-[10px] uppercase tracking-widest px-4 py-1">
                                        Logística
                                    </Badge>
                                    <Badge variant={order?.status === 'received' ? 'success' : order?.status === 'pending' ? 'warning' : 'neutral'} className="font-black text-[10px] uppercase shadow-lg">
                                        {order?.status === 'received' ? 'Recibido' : order?.status === 'pending' ? 'Pendiente' : order?.status}
                                    </Badge>
                                </div>

                                <div className="space-y-6">
                                    <div>
                                        <p className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] mb-1">Proveedor Titular</p>
                                        <p className="text-2xl font-black font-display tracking-tight leading-none italic text-pp-gold">
                                            {order?.supplier?.name}
                                        </p>
                                    </div>

                                    <div className="h-px bg-white/10 w-full" />

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <p className="text-[9px] font-black text-white/40 uppercase tracking-widest mb-1">Destino</p>
                                            <p className="text-sm font-black text-white truncate">{order?.branch?.name}</p>
                                        </div>
                                        <div>
                                            <p className="text-[9px] font-black text-white/40 uppercase tracking-widest mb-1">Solicitante</p>
                                            <p className="text-sm font-black text-white truncate">{order?.requester?.full_name?.split(' ')[0] || 'Admin'}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Financial State */}
                        <div className="space-y-6">
                            <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] flex items-center justify-between">
                                <span>Control de Pago</span>
                                <DollarSign size={14} className="opacity-40" />
                            </h3>

                            <div className={`p-6 rounded-3xl border ${order?.payment_status === 'paid' ? 'bg-green-50/50 border-green-100 dark:bg-green-900/10 dark:border-green-800/20' : 'bg-pp-gold/5 border-pp-gold/20'}`}>
                                <div className="flex items-center justify-between mb-4">
                                    <Badge variant={order?.payment_status === 'paid' ? 'success' : 'warning'} className="font-black text-[9px] uppercase">
                                        {order?.payment_status === 'paid' ? 'Conciliado' : 'Pendiente de Pago'}
                                    </Badge>
                                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-tighter">Vía Transferencia</span>
                                </div>

                                {isReceiving && (
                                    <div className="flex gap-2 p-1.5 bg-white dark:bg-slate-800 rounded-2xl shadow-sm">
                                        <button
                                            onClick={() => setPaymentStatus('pending')}
                                            className={`flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${paymentStatus === 'pending' ? 'bg-pp-brown text-pp-gold shadow-md' : 'text-gray-400'}`}
                                        >
                                            Crédito
                                        </button>
                                        <button
                                            onClick={() => setPaymentStatus('paid')}
                                            className={`flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${paymentStatus === 'paid' ? 'bg-green-600 text-white shadow-md' : 'text-gray-400'}`}
                                        >
                                            Contado
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Visual Evidence (If exists and NOT in active mode) */}
                        {!isReceiving && !isRegisteringPayment && (order?.invoice_url || order?.payment_proof_url) && (
                            <div className="space-y-4">
                                <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Archivos Adjuntos</h3>
                                <div className="grid grid-cols-2 gap-3">
                                    {order?.invoice_url && (
                                        <button
                                            onClick={() => window.open(order.invoice_url, '_blank')}
                                            className="h-20 rounded-2xl border border-gray-100 dark:border-white/5 bg-white dark:bg-slate-800 flex items-center justify-center p-1 group hover:border-pp-gold/30 transition-all shadow-sm"
                                        >
                                            <img src={order.invoice_url} className="w-full h-full object-cover rounded-xl" alt="Invoice thumb" />
                                        </button>
                                    )}
                                    {order?.payment_proof_url && (
                                        <button
                                            onClick={() => window.open(order.payment_proof_url, '_blank')}
                                            className="h-20 rounded-2xl border border-gray-100 dark:border-white/5 bg-white dark:bg-slate-800 flex items-center justify-center p-1 group hover:border-pp-gold/30 transition-all shadow-sm"
                                        >
                                            <img src={order.payment_proof_url} className="w-full h-full object-cover rounded-xl" alt="Proof thumb" />
                                        </button>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Footer Actions Area */}
                    <div className="mt-10 pt-8 border-t border-gray-100 dark:border-white/5 space-y-4 shrink-0">
                        {isReceiving ? (
                            <Button
                                onClick={handleConfirmReception}
                                disabled={loading || !invoiceUrl}
                                className="w-full h-16 rounded-[2rem] bg-pp-gold text-pp-brown font-black uppercase tracking-widest flex items-center justify-center gap-3 transition-all hover:scale-[1.02] shadow-xl shadow-pp-gold/30"
                            >
                                {loading ? <Loader2 className="animate-spin" /> : <><CheckCircle2 size={24} /> Confirmar Todo</>}
                            </Button>
                        ) : isRegisteringPayment ? (
                            <Button
                                onClick={handleRegisterPayment}
                                disabled={loading || !paymentProofUrl}
                                className="w-full h-16 rounded-[2rem] bg-pp-gold text-pp-brown font-black uppercase tracking-widest flex items-center justify-center gap-3 transition-all hover:scale-[1.02] shadow-xl shadow-pp-gold/30"
                            >
                                {loading ? <Loader2 className="animate-spin" /> : <><DollarSign size={24} /> Registrar Pago</>}
                            </Button>
                        ) : (
                            <>
                                {isEditable && (
                                    <div className="grid grid-cols-2 gap-3">
                                        <Button
                                            onClick={startReceiving}
                                            className="h-14 rounded-2xl bg-green-600 text-white font-black uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-green-600/20 border-none"
                                        >
                                            <Truck size={18} /> Recibir
                                        </Button>
                                        <Button
                                            onClick={() => {
                                                if (orderId && onEdit) {
                                                    onClose()
                                                    onEdit(orderId)
                                                }
                                            }}
                                            variant="outline"
                                            className="h-14 rounded-2xl font-black uppercase tracking-widest dark:border-white/10 dark:text-white"
                                        >
                                            <Pencil size={18} className="mr-2" /> Editar
                                        </Button>
                                    </div>
                                )}

                                {order?.status === 'received' && order?.payment_status === 'pending' && (
                                    <Button
                                        onClick={() => setIsRegisteringPayment(true)}
                                        className="w-full h-14 rounded-2xl bg-pp-gold text-pp-brown font-black uppercase tracking-widest flex items-center justify-center gap-3"
                                    >
                                        <DollarSign size={20} /> Registrar Pago
                                    </Button>
                                )}

                                <div className="grid grid-cols-3 gap-3">
                                    <Button
                                        onClick={() => generateOrderPDF(order, items)}
                                        variant="outline"
                                        className="h-12 rounded-2xl font-black text-[10px] uppercase tracking-tighter"
                                    >
                                        <Download size={16} className="mr-1.5" /> PDF
                                    </Button>
                                    <Button
                                        onClick={() => {
                                            if (orderId && onDelete) {
                                                if (confirm('¿Eliminar pedido?')) {
                                                    onDelete(orderId)
                                                    onClose()
                                                }
                                            }
                                        }}
                                        variant="ghost"
                                        className="h-12 rounded-2xl text-red-400 font-black text-[10px] uppercase tracking-tighter"
                                    >
                                        <Trash2 size={16} className="mr-1.5" /> Eliminar
                                    </Button>
                                    <Button
                                        onClick={onClose}
                                        variant="ghost"
                                        className="h-12 rounded-2xl font-black text-[10px] uppercase tracking-tighter text-gray-400"
                                    >
                                        Cerrar
                                    </Button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}

function Loader2({ className }: { className?: string }) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className={className}>
            <path d="M21 12a9 9 0 1 1-6.219-8.56" />
        </svg>
    )
}

function CheckCircleIcon({ size, className }: { size: number; className?: string }) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className={className}>
            <path d="M20 6 9 17l-5-5" />
        </svg>
    )
}
