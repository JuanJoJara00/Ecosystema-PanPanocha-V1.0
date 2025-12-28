'use client'

import React, { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { FileText, X, Pencil, Trash2, AlertCircle, CheckCircle, Download } from 'lucide-react'
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
            // Fetch Order Info
            const { data: orderData, error: orderError } = await supabase
                .from('purchase_orders')
                .select(`*, supplier:suppliers(name), branch:branches(name), requester:profiles!purchase_orders_requested_by_fkey(full_name), modifier:profiles!purchase_orders_last_modified_by_fkey(full_name)`)
                .eq('id', orderId)
                .single()

            if (orderError) throw orderError
            setOrder(orderData)
            if (orderData.invoice_url) setInvoiceUrl(orderData.invoice_url)
            if (orderData.payment_status) setPaymentStatus(orderData.payment_status)
            if (orderData.payment_proof_url) setPaymentProofUrl(orderData.payment_proof_url)

            // Fetch Items
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
        // Initialize quantities with current values
        const initialQtys: Record<string, number> = {}
        items.forEach(item => {
            initialQtys[item.id] = item.quantity
        })
        setReceiveQuantities(initialQtys)
        // Reset or init payment info
        setPaymentStatus(order.payment_status || 'pending')
        setInvoiceUrl(order.invoice_url || null)
        setPaymentProofUrl(order.payment_proof_url || null)

        setIsReceiving(true)
    }

    const handleConfirmReception = async () => {
        setLoading(true)
        try {
            // Validation
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

            // 1. Update Order Items with actual received quantities
            for (const item of items) {
                const confirmedQty = receiveQuantities[item.id] ?? item.quantity

                // Only update if different
                if (confirmedQty !== item.quantity) {
                    const { error: updateItemError } = await supabase
                        .from('purchase_order_items')
                        .update({ quantity: confirmedQty })
                        .eq('id', item.id)

                    if (updateItemError) throw updateItemError
                }
            }

            // 2. Update Inventory
            for (const item of items) {
                const qtyToAdd = receiveQuantities[item.id] ?? item.quantity

                const { data: currentStockVal } = await supabase
                    .from('branch_inventory')
                    .select('quantity')
                    .eq('branch_id', order.branch_id)
                    .eq('item_id', item.item_id)
                    .single()

                const currentQty = currentStockVal?.quantity || 0
                const newQty = currentQty + qtyToAdd

                const { error: upsertError } = await supabase
                    .from('branch_inventory')
                    .upsert({
                        branch_id: order.branch_id,
                        item_id: item.item_id,
                        quantity: newQty,
                        last_updated: new Date().toISOString()
                    }, { onConflict: 'branch_id, item_id' })

                if (upsertError) throw upsertError
            }

            // 3. Update Order Status & Info
            const hasQuantityChanges = items.some(item => {
                const confirmed = receiveQuantities[item.id] ?? item.quantity
                return confirmed !== item.quantity
            })

            const updatePayload: any = {
                status: 'received',
                invoice_url: invoiceUrl,
                payment_status: paymentStatus,
                payment_proof_url: paymentStatus === 'paid' ? paymentProofUrl : null, // Only save proof if paid
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

    const isEditable = order?.status === 'pending'

    if (!orderId) return null

    return (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-gray-100 animate-in zoom-in-95 duration-200">
                {loading ? (
                    <div className="p-12 text-center text-gray-500">Cargando detalles...</div>
                ) : (
                    <>
                        <div className="p-6 border-b flex justify-between items-center bg-gray-50/50 rounded-t-2xl">
                            <div>
                                <h3 className="text-xl font-bold text-gray-900 font-display uppercase">Detalles del Pedido</h3>
                                <p className="text-xs text-gray-500 font-mono">#{order?.id.toUpperCase()}</p>
                            </div>
                            <Button variant="ghost" size="sm" onClick={onClose}>
                                <X className="h-5 w-5" />
                            </Button>
                        </div>

                        <div className="p-6 space-y-6">
                            {/* Header Info */}
                            <div className="grid grid-cols-2 gap-6 text-sm">
                                <div>
                                    <p className="text-gray-400 text-xs uppercase font-bold tracking-wider mb-1 font-display">Proveedor</p>
                                    <p className="font-semibold text-gray-800 text-base">{order?.supplier?.name}</p>
                                </div>
                                <div>
                                    <p className="text-gray-400 text-xs uppercase font-bold tracking-wider mb-1 font-display">Sede</p>
                                    <p className="font-semibold text-gray-800 text-base">{order?.branch?.name}</p>
                                </div>
                                <div>
                                    <p className="text-gray-400 text-xs uppercase font-bold tracking-wider mb-1 font-display">Fecha</p>
                                    <p className="font-medium text-gray-800">{new Date(order?.created_at).toLocaleString()}</p>
                                </div>
                                <div className="space-y-2">
                                    <div>
                                        <p className="text-gray-400 text-xs uppercase font-bold tracking-wider mb-1 font-display">Estado</p>
                                        <Badge variant={
                                            order?.status === 'received' ? 'success' :
                                                order?.status === 'cancelled' ? 'error' : 'info'
                                        }>
                                            {order?.status === 'received' ? 'Recibido' :
                                                order?.status === 'cancelled' ? 'Cancelado' : 'Pendiente'}
                                        </Badge>
                                    </div>
                                    <div>
                                        <p className="text-gray-400 text-xs uppercase font-bold tracking-wider mb-1 font-display">Pago</p>
                                        <Badge variant={order?.payment_status === 'paid' ? 'success' : 'warning'}>
                                            {order?.payment_status === 'paid' ? 'Pagado' : 'Pendiente'}
                                        </Badge>
                                    </div>
                                </div>
                            </div>

                            {/* Modification Warning */}
                            {order?.last_modified_at && !isReceiving && (
                                <div className="bg-pp-gold/10 border border-pp-gold/30 rounded-xl p-4 flex items-start gap-3">
                                    <AlertCircle className="h-5 w-5 text-pp-brown mt-0.5" />
                                    <div>
                                        <span className="font-bold text-pp-brown block mb-1 font-display uppercase text-xs tracking-wider">
                                            {order.last_edit_type === 'reception'
                                                ? 'Ajustado en Recepción'
                                                : 'Editado Manualmente'}
                                        </span>
                                        <p className="text-pp-brown/80 text-sm">
                                            Modificado el {new Date(order.last_modified_at).toLocaleString()} por {order.modifier?.full_name || 'un usuario'}.
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* Attachments Display */}
                            {!isReceiving && !isRegisteringPayment && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {order?.invoice_url && (
                                        <Card className="p-4 bg-gray-50/50">
                                            <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2 font-display uppercase text-xs tracking-wide">
                                                <FileText className="h-4 w-4 text-gray-500" /> Factura
                                            </h4>
                                            <div
                                                onClick={() => window.open(order.invoice_url, '_blank')}
                                                className="relative aspect-video w-full overflow-hidden rounded-lg border border-gray-200 cursor-pointer group"
                                            >
                                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                                <img
                                                    src={order.invoice_url}
                                                    alt="Factura"
                                                    className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-500"
                                                />
                                            </div>
                                        </Card>
                                    )}

                                    {order?.payment_status === 'paid' && order?.payment_proof_url ? (
                                        <Card className="p-4 bg-green-50/30 border-green-100">
                                            <h4 className="font-semibold text-green-900 mb-3 flex items-center gap-2 font-display uppercase text-xs tracking-wide">
                                                <CheckCircle className="h-4 w-4 text-green-600" /> Comprobante
                                            </h4>
                                            <div
                                                onClick={() => window.open(order.payment_proof_url, '_blank')}
                                                className="relative aspect-video w-full overflow-hidden rounded-lg border border-green-200 cursor-pointer group"
                                            >
                                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                                <img
                                                    src={order.payment_proof_url}
                                                    alt="Pago"
                                                    className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-500"
                                                />
                                            </div>
                                        </Card>
                                    ) : (
                                        order?.status === 'received' && order?.payment_status === 'pending' && (
                                            <div className="bg-pp-gold/10 border border-pp-gold/30 rounded-xl p-6 flex flex-col justify-center items-center text-center">
                                                <p className="text-sm text-pp-brown font-medium mb-4">Este pedido está pendiente de pago.</p>
                                                <Button
                                                    onClick={() => setIsRegisteringPayment(true)}
                                                    className="bg-pp-gold hover:bg-pp-gold/80 text-pp-brown w-full border border-pp-brown/10"
                                                >
                                                    Registrar Pago
                                                </Button>
                                            </div>
                                        )
                                    )}
                                </div>
                            )}

                            {/* Register Payment Mode */}
                            {isRegisteringPayment && (
                                <div className="bg-pp-gold/5 rounded-2xl p-6 border border-pp-gold/20 animate-in fade-in zoom-in-95">
                                    <h4 className="font-bold text-pp-brown mb-4 flex items-center gap-2 text-lg font-display uppercase">
                                        <CheckCircle className="h-5 w-5 text-pp-brown" />
                                        Registrar Pago
                                    </h4>

                                    <div className="bg-white p-4 rounded-xl border border-gray-100 mb-4 shadow-sm">
                                        <label className="block text-sm font-bold text-gray-700 mb-2 font-display uppercase">
                                            Comprobante de Pago (Obligatorio) <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={async (e) => {
                                                const file = e.target.files?.[0]
                                                if (file) {
                                                    try {
                                                        const fileExt = file.name.split('.').pop()
                                                        const fileName = `pay_${orderId}_${Date.now()}.${fileExt}`
                                                        const filePath = `payment_proofs/${fileName}`

                                                        const { error: uploadError } = await supabase.storage
                                                            .from('payment_proofs')
                                                            .upload(filePath, file)

                                                        if (uploadError) throw uploadError

                                                        const { data: { publicUrl } } = supabase.storage
                                                            .from('payment_proofs')
                                                            .getPublicUrl(filePath)

                                                        setPaymentProofUrl(publicUrl)

                                                    } catch (error: any) {
                                                        alert('Error subiendo comprobante: ' + error.message)
                                                    }
                                                }
                                            }}
                                            className="block w-full text-sm text-gray-500
                                                file:mr-4 file:py-2 file:px-4
                                                file:rounded-full file:border-0
                                                file:text-xs file:font-bold file:uppercase
                                                file:bg-pp-gold/10 file:text-pp-brown
                                                hover:file:bg-pp-gold/20 cursor-pointer"
                                        />
                                        {paymentProofUrl && (
                                            <div className="mt-3 text-sm text-green-600 flex items-center gap-2 font-medium bg-green-50 p-2 rounded-lg">
                                                <CheckCircle className="h-4 w-4" /> Comprobante listo
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex justify-end gap-3">
                                        <Button
                                            onClick={() => {
                                                setIsRegisteringPayment(false)
                                                setPaymentProofUrl(null)
                                            }}
                                            variant="ghost"
                                        >
                                            Cancelar
                                        </Button>
                                        <Button
                                            onClick={handleRegisterPayment}
                                            disabled={!paymentProofUrl}
                                            className="bg-pp-gold hover:bg-pp-gold/80 text-pp-brown"
                                        >
                                            Confirmar Pago
                                        </Button>
                                    </div>
                                </div>
                            )}

                            {/* Items List */}
                            {isReceiving && !isRegisteringPayment ? (
                                <div className="space-y-6">
                                    <div className="bg-green-50/50 rounded-2xl p-6 border border-green-100">
                                        <h4 className="font-bold text-green-900 mb-2 flex items-center gap-2 font-display uppercase">
                                            <CheckCircle className="h-5 w-5 text-green-600" />
                                            Confirmar Entrega
                                        </h4>
                                        <p className="text-sm text-green-800 mb-6 leading-relaxed">
                                            Verifica las cantidades físicas recibidas. Esta acción actualizará el stock inmediatamente.
                                        </p>

                                        {/* Invoice Upload */}
                                        <div className="mb-6 bg-white p-5 rounded-xl border border-green-100 shadow-sm">
                                            <label className="block text-sm font-bold text-gray-900 mb-2 font-display uppercase">
                                                Foto de Factura <span className="text-red-500">*</span>
                                            </label>
                                            <input
                                                type="file"
                                                accept="image/*"
                                                onChange={async (e) => {
                                                    const file = e.target.files?.[0]
                                                    if (file) {
                                                        try {
                                                            const fileExt = file.name.split('.').pop()
                                                            const fileName = `inv_${orderId}_${Date.now()}.${fileExt}`
                                                            const filePath = `invoices/${fileName}`

                                                            const { error: uploadError } = await supabase.storage
                                                                .from('invoices')
                                                                .upload(filePath, file)

                                                            if (uploadError) throw uploadError

                                                            const { data: { publicUrl } } = supabase.storage
                                                                .from('invoices')
                                                                .getPublicUrl(filePath)

                                                            setInvoiceUrl(publicUrl)

                                                        } catch (error: any) {
                                                            alert('Error subiendo factura: ' + error.message)
                                                        }
                                                    }
                                                }}
                                                className="block w-full text-sm text-gray-500
                                                    file:mr-4 file:py-2 file:px-4
                                                    file:rounded-full file:border-0
                                                    file:text-xs file:font-bold file:uppercase
                                                    file:bg-green-50 file:text-green-700
                                                    hover:file:bg-green-100 cursor-pointer"
                                            />
                                            {invoiceUrl && (
                                                <div className="mt-3 text-sm text-green-600 flex items-center gap-2 font-medium bg-green-50 p-2 rounded-lg">
                                                    <CheckCircle className="h-4 w-4" /> Factura lista
                                                </div>
                                            )}
                                        </div>

                                        {/* Table */}
                                        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                                            <table className="w-full text-sm text-left">
                                                <thead className="bg-gray-50 text-gray-500 font-medium border-b border-gray-100">
                                                    <tr>
                                                        <th className="px-5 py-3 font-display uppercase text-xs tracking-wider">Producto</th>
                                                        <th className="px-5 py-3 text-center font-display uppercase text-xs tracking-wider">Solicitado</th>
                                                        <th className="px-5 py-3 text-center font-display uppercase text-xs tracking-wider">Recibido</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-100">
                                                    {items.map(item => (
                                                        <tr key={item.id}>
                                                            <td className="px-5 py-4 font-medium text-gray-900">
                                                                {item.item?.name}
                                                                <div className="text-xs text-gray-400 mt-0.5">{item.item?.unit}</div>
                                                            </td>
                                                            <td className="px-5 py-4 text-center text-gray-500 font-medium">
                                                                {item.quantity}
                                                            </td>
                                                            <td className="px-5 py-4 text-center">
                                                                <input
                                                                    type="number"
                                                                    min="0"
                                                                    className="w-24 text-center border-2 border-gray-200 rounded-lg p-1.5 font-bold text-green-700 focus:ring-4 focus:ring-green-100 focus:border-green-500 outline-none transition-all"
                                                                    value={receiveQuantities[item.id] ?? item.quantity}
                                                                    onChange={(e) => {
                                                                        const val = parseFloat(e.target.value)
                                                                        if (!isNaN(val) && val >= 0) {
                                                                            setReceiveQuantities(prev => ({ ...prev, [item.id]: val }))
                                                                        }
                                                                    }}
                                                                />
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>

                                    {/* Payment Section */}
                                    <div className="bg-pp-gold/5 rounded-2xl p-6 border border-pp-gold/20">
                                        <h4 className="font-bold text-pp-brown mb-4 flex items-center gap-2 font-display uppercase">
                                            <FileText className="h-5 w-5 text-pp-brown" />
                                            Información de Pago
                                        </h4>

                                        <div className="flex flex-col gap-4">
                                            <div className="flex flex-wrap items-center gap-6">
                                                <label className="flex items-center gap-3 cursor-pointer p-3 rounded-lg hover:bg-white transition-colors">
                                                    <input
                                                        type="radio"
                                                        name="paymentStatus"
                                                        value="pending"
                                                        checked={paymentStatus === 'pending'}
                                                        onChange={() => setPaymentStatus('pending')}
                                                        className="w-5 h-5 text-blue-600 focus:ring-blue-500 border-gray-300"
                                                    />
                                                    <span className="text-sm font-semibold text-gray-700">Por Pagar (Crédito)</span>
                                                </label>
                                                <label className="flex items-center gap-3 cursor-pointer p-3 rounded-lg hover:bg-white transition-colors">
                                                    <input
                                                        type="radio"
                                                        name="paymentStatus"
                                                        value="paid"
                                                        checked={paymentStatus === 'paid'}
                                                        onChange={() => setPaymentStatus('paid')}
                                                        className="w-5 h-5 text-green-600 focus:ring-green-500 border-gray-300"
                                                    />
                                                    <span className="text-sm font-semibold text-gray-700">Pagado (Contado)</span>
                                                </label>
                                            </div>

                                            {/* Payment Proof Upload */}
                                            {paymentStatus === 'paid' && (
                                                <div className="bg-white p-5 rounded-xl border border-gray-100 animate-in fade-in slide-in-from-top-2 shadow-sm">
                                                    <label className="block text-sm font-bold text-gray-900 mb-2 font-display uppercase">
                                                        Recibo de Pago <span className="text-red-500">*</span>
                                                    </label>
                                                    <input
                                                        type="file"
                                                        accept="image/*"
                                                        onChange={async (e) => {
                                                            const file = e.target.files?.[0]
                                                            if (file) {
                                                                try {
                                                                    const fileExt = file.name.split('.').pop()
                                                                    const fileName = `pay_${orderId}_${Date.now()}.${fileExt}`
                                                                    const filePath = `payment_proofs/${fileName}`

                                                                    const { error: uploadError } = await supabase.storage
                                                                        .from('payment_proofs')
                                                                        .upload(filePath, file)

                                                                    if (uploadError) throw uploadError

                                                                    const { data: { publicUrl } } = supabase.storage
                                                                        .from('payment_proofs')
                                                                        .getPublicUrl(filePath)

                                                                    setPaymentProofUrl(publicUrl)

                                                                } catch (error: any) {
                                                                    alert('Error subiendo comprobante: ' + error.message)
                                                                }
                                                            }
                                                        }}
                                                        className="block w-full text-sm text-gray-500
                                                            file:mr-4 file:py-2 file:px-4
                                                            file:rounded-full file:border-0
                                                            file:text-xs file:font-bold file:uppercase
                                                            file:bg-green-50 file:text-green-700
                                                            hover:file:bg-green-100 cursor-pointer"
                                                    />
                                                    {paymentProofUrl && (
                                                        <div className="mt-3 text-sm text-green-600 flex items-center gap-2 font-medium bg-green-50 p-2 rounded-lg">
                                                            <CheckCircle className="h-4 w-4" /> Comprobante listo
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex justify-end gap-3 mt-6 pt-6 border-t border-gray-100">
                                        <Button
                                            onClick={() => setIsReceiving(false)}
                                            variant="ghost"
                                        >
                                            Cancelar
                                        </Button>
                                        <Button
                                            onClick={handleConfirmReception}
                                            disabled={loading}
                                            className="bg-pp-gold hover:bg-pp-gold/80 text-pp-brown font-bold shadow-sm border border-pp-brown/10"
                                        >
                                            {loading ? 'Procesando...' : 'Confirmar Recepción'}
                                        </Button>
                                    </div>
                                </div>
                            ) : (
                                <div>
                                    <h4 className="font-bold text-gray-900 mb-4 flex items-center gap-2 font-display uppercase text-sm tracking-wide">
                                        <FileText className="h-5 w-5 text-pp-brown" /> Items Solicitados
                                    </h4>
                                    <div className="border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                                        <table className="w-full text-sm text-left">
                                            <thead className="bg-gray-50 text-gray-500 font-medium">
                                                <tr>
                                                    <th className="px-5 py-3 font-display uppercase text-xs tracking-wider">Producto</th>
                                                    <th className="px-5 py-3 text-center font-display uppercase text-xs tracking-wider">Cantidad</th>
                                                    <th className="px-5 py-3 text-gray-400 font-display uppercase text-xs tracking-wider">Unidad</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-100">
                                                {items.map(item => (
                                                    <tr key={item.id}>
                                                        <td className="px-5 py-4 font-medium text-gray-900">{item.item?.name}</td>
                                                        <td className="px-5 py-4 text-center font-bold text-gray-800">{item.quantity}</td>
                                                        <td className="px-5 py-4 text-gray-400 text-xs">{item.item?.unit}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="p-6 border-t bg-gray-50/50 rounded-b-2xl flex flex-col md:flex-row justify-between gap-4 items-center">
                            {(isReceiving || isRegisteringPayment) ? (
                                <div className="flex gap-2 w-full justify-end">
                                    {/* Actions handled inside the specific mode blocks */}
                                </div>
                            ) : (
                                <>
                                    <div className="flex gap-3 w-full md:w-auto">
                                        {isEditable && (
                                            <>
                                                <Button
                                                    onClick={startReceiving}
                                                    className="bg-pp-gold/10 hover:bg-pp-gold/20 text-pp-brown border border-pp-gold/50"
                                                    startIcon={<CheckCircle className="h-4 w-4" />}
                                                >
                                                    Recibir
                                                </Button>
                                                <div className="h-8 w-px bg-gray-200 hidden md:block"></div>
                                                <Button
                                                    onClick={() => {
                                                        if (orderId && onEdit) {
                                                            onClose()
                                                            onEdit(orderId)
                                                        }
                                                    }}
                                                    variant="secondary"
                                                    startIcon={<Pencil className="h-4 w-4" />}
                                                >
                                                    Editar
                                                </Button>
                                            </>
                                        )}
                                        <Button
                                            onClick={() => {
                                                if (orderId && onDelete) {
                                                    if (confirm('¿Estás seguro de que quieres eliminar este pedido?\n\nSi el pedido ya fue recibido, esto NO revertirá automáticamente el stock sumado al inventario (debes ajustarlo manualmente).\n\nEsta acción es irreversible.')) {
                                                        onDelete(orderId)
                                                        onClose()
                                                    }
                                                }
                                            }}
                                            variant="danger"
                                            startIcon={<Trash2 className="h-4 w-4" />}
                                        >
                                            Eliminar
                                        </Button>
                                    </div>
                                    <div className="flex gap-3 w-full md:w-auto justify-end">
                                        <Button
                                            onClick={onClose}
                                            variant="ghost"
                                        >
                                            Cerrar
                                        </Button>
                                        <Button
                                            onClick={() => generateOrderPDF(order, items)}
                                            className="bg-pp-brown text-white hover:bg-pp-brown/90"
                                            startIcon={<Download className="h-4 w-4" />}
                                        >
                                            PDF
                                        </Button>
                                    </div>
                                </>
                            )}
                        </div>
                    </>
                )}
            </div>
        </div>
    )
}
