'use client'

import { User, Phone, MapPin, DollarSign, Package, FileText, X, Edit2, Calendar, AlertCircle, CheckCircle, ShoppingBag } from 'lucide-react'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import Card from '@/components/ui/Card'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'

import { RappiDelivery } from '@panpanocha/types'

interface RappiDeliveryDetailProps {
    delivery: RappiDelivery
    onEdit: () => void
    onClose: () => void
    onUpdate?: () => void
}

export default function RappiDeliveryDetail({ delivery, onEdit, onClose, onUpdate }: RappiDeliveryDetailProps) {
    const [isDelivering, setIsDelivering] = useState(false)
    const [loading, setLoading] = useState(false)
    const [uploadingTicket, setUploadingTicket] = useState(false)
    const [uploadingOrderReady, setUploadingOrderReady] = useState(false)

    // Initial State from Delivery
    const [ticketUrl, setTicketUrl] = useState<string | null>(delivery.ticket_url || null)
    const [orderReadyUrl, setOrderReadyUrl] = useState<string | null>(delivery.order_ready_url || null)

    // NOTE: Rappi Deliveries now are just 'created' and 'tracked', they don't have a "confirm delivery" phase like internal ones necessarily,
    // but we can keep the "Finalizar" flow if we want to confirm status change OR just use edit.
    // Given the new fields are "Ticket" and "Order Ready", these are likely uploaded at creation.
    // So "Finalizar" might just mean "Mark as Dispatched/Delivered". 

    const parseProducts = () => {
        try {
            const details = delivery.product_details
            return typeof details === 'string' && details.startsWith('[')
                ? JSON.parse(details)
                : []
        } catch {
            return []
        }
    }

    const [products, setProducts] = useState<any[]>(parseProducts())

    // Handlers
    const handleQuantityChange = (index: number, newQty: number) => {
        const updated = [...products]
        updated[index].quantity = newQty
        setProducts(updated)
    }

    const handleFileUpload = async (file: File, type: 'ticket' | 'order_ready') => {
        if (type === 'ticket') setUploadingTicket(true)
        else setUploadingOrderReady(true)

        try {
            const fileExt = file.name.split('.').pop()
            const fileName = `rappi_${type}_${delivery.id}_${Date.now()}.${fileExt}`
            const bucketName = 'receipts'

            const { error: uploadError } = await supabase.storage
                .from(bucketName)
                .upload(fileName, file)

            if (uploadError) throw uploadError

            const { data: { publicUrl } } = supabase.storage
                .from(bucketName)
                .getPublicUrl(fileName)

            return publicUrl
        } catch (error: any) {
            alert('Error subiendo archivo: ' + error.message)
            return null
        } finally {
            if (type === 'ticket') setUploadingTicket(false)
            else setUploadingOrderReady(false)
        }
    }

    const handleConfirmFinalization = async () => {
        // Validation: Mandatory Proofs
        if (!ticketUrl || !orderReadyUrl) {
            alert('⚠️ Validación fallida:\nDebes adjuntar FOTO COMANDA y FOTO PEDIDO LISTO para finalizar.')
            return
        }

        setLoading(true)
        try {
            const totalValue = products.reduce((acc: number, item: any) => acc + (item.price * item.quantity), 0)

            // 1. Deduct Inventory (Only if we have a branch)
            if (delivery.branch_id) {
                const { error: inventoryError } = await supabase.rpc('deduct_inventory', {
                    p_branch_id: delivery.branch_id,
                    p_products_json: products
                })

                if (inventoryError) {
                    console.error('Inventory Error:', inventoryError)
                    throw new Error('Falló el descuento de inventario: ' + inventoryError.message)
                }
            }

            // 2. Update Delivery Status
            const { error } = await supabase
                .from('rappi_deliveries')
                .update({
                    status: 'delivered',
                    ticket_url: ticketUrl,
                    order_ready_url: orderReadyUrl,
                    product_details: JSON.stringify(products),
                    total_value: totalValue,
                    last_edited_at: new Date().toISOString(),
                    last_edit_type: 'delivery'
                })
                .eq('id', delivery.id)

            if (error) throw error

            alert('Orden Rappi Finalizada y Verificada (Inventario Descontado)')
            if (onUpdate) onUpdate()
            onClose()
        } catch (err: any) {
            alert('Error: ' + err.message)
        } finally {
            setLoading(false)
        }
    }

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('es-CO', {
            style: 'currency',
            currency: 'COP',
            minimumFractionDigits: 0
        }).format(amount)
    }

    const getStatusLabel = (status: string) => {
        const map: Record<string, string> = {
            'pending': 'Pendiente',
            'dispatched': 'Despachado',
            'delivered': 'Finalizado',
            'cancelled': 'Cancelado'
        }
        return map[status] || status
    }

    const getStatusVariant = (status: string) => {
        const map: Record<string, any> = {
            'pending': 'warning',
            'dispatched': 'info',
            'delivered': 'success',
            'cancelled': 'error'
        }
        return map[status] || 'neutral'
    }

    const calculateTotalProducts = () => {
        if (!Array.isArray(products)) return 0
        return products.reduce((acc: number, item: any) => acc + (item.price * item.quantity), 0)
    }

    return (
        <div className="flex flex-col h-full max-h-[85vh]">
            <div className="p-6 border-b flex justify-between items-center bg-gray-50/50 rounded-t-2xl shrink-0">
                <div>
                    <h3 className="text-xl font-bold text-gray-900 font-display uppercase flex items-center gap-2">
                        {isDelivering ? 'Verificar y Finalizar' : 'Detalles Orden Rappi'}
                        <span className="bg-[#FF441F]/10 text-[#FF441F] text-xs px-2 py-1 rounded-full border border-[#FF441F]/20">
                            #{delivery.rappi_order_id}
                        </span>
                    </h3>
                </div>
                <Button variant="ghost" size="sm" onClick={onClose}>
                    <X className="h-5 w-5" />
                </Button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">

                {/* Info Grid - Hide in delivery mode to focus on task */}
                {!isDelivering && (
                    <div className="grid grid-cols-2 gap-6 text-sm">
                        <div>
                            <p className="text-gray-400 text-xs uppercase font-bold tracking-wider mb-1 font-display">Fecha Creación</p>
                            <p className="font-medium text-gray-800">{new Date(delivery.created_at).toLocaleString()}</p>
                        </div>
                        <div>
                            <p className="text-gray-400 text-xs uppercase font-bold tracking-wider mb-1 font-display">Estado Actual</p>
                            <Badge variant={getStatusVariant(delivery.status)}>
                                {getStatusLabel(delivery.status)}
                            </Badge>
                        </div>
                        {delivery.notes && (
                            <div className="col-span-2">
                                <p className="text-gray-400 text-xs uppercase font-bold tracking-wider mb-1 font-display">Notas</p>
                                <p className="text-gray-600 bg-gray-50 p-2 rounded">{delivery.notes}</p>
                            </div>
                        )}
                    </div>
                )}

                {/* Proofs Section - View Mode */}
                {!isDelivering && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {ticketUrl ? (
                            <Card className="p-4 bg-gray-50/50">
                                <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2 font-display uppercase text-xs tracking-wide">
                                    <FileText className="h-4 w-4 text-gray-500" /> Foto Comanda
                                </h4>
                                <div
                                    onClick={() => window.open(ticketUrl || '', '_blank')}
                                    className="relative aspect-video w-full overflow-hidden rounded-lg border border-gray-200 cursor-pointer group"
                                >
                                    <img src={ticketUrl} alt="Comanda" className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-500" />
                                </div>
                            </Card>
                        ) : null}

                        {orderReadyUrl ? (
                            <Card className="p-4 bg-gray-50/50">
                                <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2 font-display uppercase text-xs tracking-wide">
                                    <Package className="h-4 w-4 text-gray-500" /> Pedido Listo
                                </h4>
                                <div
                                    onClick={() => window.open(orderReadyUrl || '', '_blank')}
                                    className="relative aspect-video w-full overflow-hidden rounded-lg border border-gray-200 cursor-pointer group"
                                >
                                    <img src={orderReadyUrl} alt="Pedido Listo" className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-500" />
                                </div>
                            </Card>
                        ) : null}
                    </div>
                )}

                {/* Delivery Mode: Uploads */}
                {isDelivering && (
                    <div className="bg-[#FF441F]/5 rounded-2xl p-6 border border-[#FF441F]/20 mb-6">
                        <h4 className="font-bold text-[#FF441F] mb-2 flex items-center gap-2 font-display uppercase">
                            <CheckCircle className="h-5 w-5" />
                            Finalizar Orden Rappi
                        </h4>
                        <p className="text-sm text-gray-600 mb-6 leading-relaxed">
                            Verifica que los productos sean correctos y asegúrate de cargar los soportes obligatorios.
                        </p>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Comanda */}
                            <div className="bg-white p-4 rounded-xl border border-[#FF441F]/20 shadow-sm">
                                <label className="block text-sm font-bold text-gray-900 mb-2 font-display uppercase">
                                    Foto Comanda <span className="text-red-500">*</span>
                                </label>
                                <div className="relative">
                                    <input
                                        type="file"
                                        accept="image/*"
                                        disabled={uploadingTicket}
                                        onChange={async (e) => {
                                            const file = e.target.files?.[0]
                                            if (file) {
                                                const url = await handleFileUpload(file, 'ticket')
                                                if (url) setTicketUrl(url)
                                            }
                                        }}
                                        className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-bold file:uppercase file:bg-[#FF441F]/10 file:text-[#FF441F] hover:file:bg-[#FF441F]/20 cursor-pointer disabled:opacity-50"
                                    />
                                    {uploadingTicket && <span className="absolute top-2 right-2 text-xs text-[#FF441F] font-bold animate-pulse">Subiendo...</span>}
                                </div>
                                {ticketUrl && (
                                    <div className="mt-3 relative aspect-video w-full overflow-hidden rounded-lg border border-gray-200">
                                        <img src={ticketUrl} alt="Comanda" className="object-cover w-full h-full" />
                                    </div>
                                )}
                            </div>

                            {/* Pedido Listo */}
                            <div className="bg-white p-4 rounded-xl border border-[#FF441F]/20 shadow-sm">
                                <label className="block text-sm font-bold text-gray-900 mb-2 font-display uppercase">
                                    Foto Pedido Listo <span className="text-red-500">*</span>
                                </label>
                                <div className="relative">
                                    <input
                                        type="file"
                                        accept="image/*"
                                        disabled={uploadingOrderReady}
                                        onChange={async (e) => {
                                            const file = e.target.files?.[0]
                                            if (file) {
                                                const url = await handleFileUpload(file, 'order_ready')
                                                if (url) setOrderReadyUrl(url)
                                            }
                                        }}
                                        className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-bold file:uppercase file:bg-[#FF441F]/10 file:text-[#FF441F] hover:file:bg-[#FF441F]/20 cursor-pointer disabled:opacity-50"
                                    />
                                    {uploadingOrderReady && <span className="absolute top-2 right-2 text-xs text-[#FF441F] font-bold animate-pulse">Subiendo...</span>}
                                </div>
                                {orderReadyUrl && (
                                    <div className="mt-3 relative aspect-video w-full overflow-hidden rounded-lg border border-gray-200">
                                        <img src={orderReadyUrl} alt="Pedido Listo" className="object-cover w-full h-full" />
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                <div>
                    <h4 className="font-bold text-gray-900 mb-4 flex items-center gap-2 font-display uppercase text-sm tracking-wide">
                        <ShoppingBag className="h-5 w-5 text-[#FF441F]" />
                        {isDelivering ? 'Verificar Items' : 'Items Solicitados'}
                    </h4>

                    {Array.isArray(products) && products.length > 0 ? (
                        <div className="border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-gray-50 text-gray-500 font-medium">
                                    <tr>
                                        <th className="px-5 py-3 font-display uppercase text-xs tracking-wider">Producto</th>
                                        <th className="px-5 py-3 text-center font-display uppercase text-xs tracking-wider">Cantidad</th>
                                        <th className="px-5 py-3 text-right font-display uppercase text-xs tracking-wider">Precio</th>
                                        <th className="px-5 py-3 text-right font-display uppercase text-xs tracking-wider">Total</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {products.map((p: any, i: number) => (
                                        <tr key={i}>
                                            <td className="px-5 py-4 font-medium text-gray-900">{p.name}</td>
                                            <td className="px-5 py-4 text-center font-bold text-gray-800">
                                                {isDelivering ? (
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        value={p.quantity}
                                                        onChange={(e) => handleQuantityChange(i, parseInt(e.target.value) || 0)}
                                                        className="w-16 text-center border rounded p-1 outline-none focus:ring-2 focus:ring-[#FF441F]"
                                                    />
                                                ) : (
                                                    `x${p.quantity}`
                                                )}
                                            </td>
                                            <td className="px-5 py-4 text-right text-gray-600">{formatCurrency(p.price)}</td>
                                            <td className="px-5 py-4 text-right font-medium text-gray-900">{formatCurrency(p.price * p.quantity)}</td>
                                        </tr>
                                    ))}
                                    <tr className="bg-orange-50">
                                        <td colSpan={3} className="px-5 py-4 text-right font-bold text-[#FF441F] uppercase text-xs tracking-wider">Total Orden</td>
                                        <td className="px-5 py-4 text-right font-bold text-[#FF441F] text-lg font-mono">
                                            {formatCurrency(calculateTotalProducts())}
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 text-gray-500 text-sm">
                            {typeof delivery.product_details === 'string' ? delivery.product_details : 'No hay detalles.'}
                        </div>
                    )}

                </div>
            </div>

            <div className="p-6 border-t bg-gray-50/50 rounded-b-2xl flex justify-between gap-4 items-center shrink-0">

                {isDelivering ? (
                    <>
                        <Button variant="ghost" onClick={() => setIsDelivering(false)}>Cancelar</Button>
                        <Button
                            onClick={handleConfirmFinalization}
                            className={`text-white ${loading || uploadingTicket || uploadingOrderReady ? 'bg-gray-400' : 'bg-[#FF441F] hover:bg-[#FF441F]/90'}`}
                            disabled={loading || uploadingTicket || uploadingOrderReady}
                        >
                            {loading ? 'Finalizando...' : 'Confirmar Rappi Finalizado'}
                        </Button>
                    </>
                ) : (
                    <>
                        <div className="flex gap-3">
                            <span className="text-xs text-gray-400 self-center">ID: {delivery.id}</span>
                        </div>
                        <div className="flex gap-3">
                            <Button onClick={onClose} variant="ghost">Cerrar</Button>

                            {delivery.status !== 'delivered' && delivery.status !== 'cancelled' && (
                                <Button
                                    onClick={() => setIsDelivering(true)}
                                    className="bg-[#FF441F] hover:bg-[#FF441F]/90 text-white shadow-sm"
                                    startIcon={<CheckCircle className="h-4 w-4" />}
                                    disabled={loading}
                                >
                                    Marcar Finalizado
                                </Button>
                            )}

                            {delivery.status !== 'delivered' && delivery.status !== 'cancelled' && (
                                <Button
                                    onClick={() => { onClose(); onEdit(); }}
                                    className="bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 shadow-sm"
                                    startIcon={<Edit2 className="h-4 w-4" />}
                                >
                                    Editar
                                </Button>
                            )}
                        </div>
                    </>
                )}
            </div>
        </div>
    )
}
