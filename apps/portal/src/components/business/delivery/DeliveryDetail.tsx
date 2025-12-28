import { User, Phone, MapPin, DollarSign, Package, FileText, X, Edit2, Calendar, AlertCircle, CheckCircle } from 'lucide-react'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import Card from '@/components/ui/Card'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'

interface Delivery {
    id: string
    customer_name: string
    customer_phone: string
    customer_address: string
    product_details: string
    delivery_fee: number
    status: 'pending' | 'dispatched' | 'delivered' | 'cancelled'
    client_payment_proof_url?: string
    delivery_receipt_url?: string
    created_at: string
    branch_id?: string
    assigned_driver?: string
    notes?: string
    last_edited_at?: string
    last_edited_by?: string
    last_edit_type?: 'manual' | 'delivery'
    last_editor?: { full_name: string }
}

interface DeliveryDetailProps {
    delivery: Delivery
    onEdit: () => void
    onClose: () => void
    onUpdate?: () => void
}

export default function DeliveryDetail({ delivery, onEdit, onClose, onUpdate }: DeliveryDetailProps) {
    const [isDelivering, setIsDelivering] = useState(false)
    const [loading, setLoading] = useState(false)
    const [uploadingClient, setUploadingClient] = useState(false)
    const [uploadingReceipt, setUploadingReceipt] = useState(false)
    const [clientProofUrl, setClientProofUrl] = useState<string | null>(delivery.client_payment_proof_url || null)
    const [receiptProofUrl, setReceiptProofUrl] = useState<string | null>(delivery.delivery_receipt_url || null)
    const [deliveryFee, setDeliveryFee] = useState<number>(delivery.delivery_fee || 0)

    // Parse initial products
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

    const handleQuantityChange = (index: number, newQty: number) => {
        const updated = [...products]
        updated[index].quantity = newQty
        setProducts(updated)
    }

    const handleFileUpload = async (file: File, bucket: string) => {
        const isClient = bucket === 'client_payments'
        if (isClient) setUploadingClient(true)
        else setUploadingReceipt(true)

        try {
            const fileExt = file.name.split('.').pop()
            const fileName = `${bucket}_${delivery.id}_${Date.now()}.${fileExt}`
            const filePath = `${fileName}`

            // Note: Bucket names in Supabase are usually exact. 
            // We map generic names to actual buckets here.
            const bucketName = bucket === 'client_payments' ? 'payment_proofs' : 'receipts'

            const { error: uploadError } = await supabase.storage
                .from(bucketName)
                .upload(filePath, file)

            if (uploadError) throw uploadError

            const { data: { publicUrl } } = supabase.storage
                .from(bucketName)
                .getPublicUrl(filePath)

            return publicUrl
        } catch (error: any) {
            alert('Error subiendo archivo: ' + error.message)
            return null
        } finally {
            if (isClient) setUploadingClient(false)
            else setUploadingReceipt(false)
        }
    }

    const handleConfirmDelivery = async () => {
        // Validation: Both proofs are mandatory as per user request
        if (!clientProofUrl || !receiptProofUrl) {
            alert('⚠️ Validación fallida:\nDebes adjuntar tanto el PAGO DEL CLIENTE como el RECIBO DE CAJA MENOR para finalizar la entrega.')
            return
        }

        setLoading(true)
        try {
            const { data: { user } } = await supabase.auth.getUser()

            // Smart Edit Check
            const isFeeChanged = deliveryFee !== (delivery.delivery_fee || 0)

            const originalProducts = typeof delivery.product_details === 'string'
                ? JSON.parse(delivery.product_details)
                : []
            const isProductsChanged = JSON.stringify(products) !== JSON.stringify(originalProducts)

            const isEdited = isFeeChanged || isProductsChanged

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

            const updatePayload: any = {
                status: 'delivered',
                client_payment_proof_url: clientProofUrl,
                delivery_receipt_url: receiptProofUrl,
                product_details: JSON.stringify(products),
                delivery_fee: deliveryFee,
            }

            // Only update edit tracking if logic actually changed (fee or qty), not just proofs
            if (isEdited) {
                updatePayload.last_edited_at = new Date().toISOString()
                updatePayload.last_edited_by = user?.id
                updatePayload.last_edit_type = 'delivery'
            }

            const { error } = await supabase
                .from('deliveries')
                .update(updatePayload)
                .eq('id', delivery.id)

            if (error) throw error

            alert('Domicilio entregado exitosamente')
            if (onUpdate) onUpdate()
            onClose()
        } catch (err: any) {
            console.error(err)
            alert('Error al guardar: ' + err.message)
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
            'delivered': 'Entregado',
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
            {/* Header */}
            <div className="p-6 border-b flex justify-between items-center bg-gray-50/50 rounded-t-2xl shrink-0">
                <div>
                    <h3 className="text-xl font-bold text-gray-900 font-display uppercase">
                        {isDelivering ? 'Confirmar Entrega' : 'Detalles del Domicilio'}
                    </h3>
                    <p className="text-xs text-gray-500 font-mono">#{delivery.id.slice(0, 8).toUpperCase()}</p>
                </div>
                <Button variant="ghost" size="sm" onClick={onClose}>
                    <X className="h-5 w-5" />
                </Button>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">

                {/* Info Grid - Only when not delivering */}
                {!isDelivering && (
                    <div className="grid grid-cols-2 gap-6 text-sm">
                        <div>
                            <p className="text-gray-400 text-xs uppercase font-bold tracking-wider mb-1 font-display">Cliente</p>
                            <p className="font-semibold text-gray-800 text-base">{delivery.customer_name}</p>
                            {delivery.customer_phone && (
                                <a href={`tel:${delivery.customer_phone}`} className="text-xs text-blue-600 hover:underline flex items-center gap-1 mt-1">
                                    <Phone className="h-3 w-3" /> {delivery.customer_phone}
                                </a>
                            )}
                        </div>
                        <div>
                            <p className="text-gray-400 text-xs uppercase font-bold tracking-wider mb-1 font-display">Domiciliario</p>
                            <p className="font-semibold text-gray-800 text-base">{delivery.assigned_driver || 'Sin asignar'}</p>
                        </div>
                        <div>
                            <p className="text-gray-400 text-xs uppercase font-bold tracking-wider mb-1 font-display">Fecha</p>
                            <p className="font-medium text-gray-800">{new Date(delivery.created_at).toLocaleString()}</p>
                        </div>
                        <div className="space-y-2">
                            <div>
                                <p className="text-gray-400 text-xs uppercase font-bold tracking-wider mb-1 font-display">Estado</p>
                                <Badge variant={getStatusVariant(delivery.status)}>
                                    {getStatusLabel(delivery.status)}
                                </Badge>
                            </div>
                        </div>
                    </div>
                )}

                {/* Edit Alert */}
                {!isDelivering && delivery.last_edited_at && (
                    <div className="bg-pp-gold/10 border border-pp-gold/30 rounded-xl p-4 flex items-start gap-3">
                        <AlertCircle className="h-5 w-5 text-pp-brown mt-0.5" />
                        <div>
                            <span className="font-bold text-pp-brown block mb-1 font-display uppercase text-xs tracking-wider">
                                {delivery.last_edit_type === 'delivery' ? 'Ajustado en Entrega' : 'Editado Manualmente'}
                            </span>
                            <p className="text-pp-brown/80 text-sm">
                                Modificado el {new Date(delivery.last_edited_at).toLocaleString()} por {delivery.last_editor?.full_name || 'un usuario'}.
                            </p>
                        </div>
                    </div>
                )}

                {/* known-good view mode for attachments */}
                {!isDelivering && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {delivery.client_payment_proof_url ? (
                            <Card className="p-4 bg-gray-50/50">
                                <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2 font-display uppercase text-xs tracking-wide">
                                    <DollarSign className="h-4 w-4 text-gray-500" /> Pago Cliente
                                </h4>
                                <div
                                    onClick={() => window.open(delivery.client_payment_proof_url, '_blank')}
                                    className="relative aspect-video w-full overflow-hidden rounded-lg border border-gray-200 cursor-pointer group"
                                >
                                    <img src={delivery.client_payment_proof_url} alt="Pago Cliente" className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-500" />
                                </div>
                            </Card>
                        ) : null}

                        {delivery.delivery_receipt_url ? (
                            <Card className="p-4 bg-gray-50/50">
                                <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2 font-display uppercase text-xs tracking-wide">
                                    <FileText className="h-4 w-4 text-gray-500" /> Recibo Caja Menor
                                </h4>
                                <div
                                    onClick={() => window.open(delivery.delivery_receipt_url, '_blank')}
                                    className="relative aspect-video w-full overflow-hidden rounded-lg border border-gray-200 cursor-pointer group"
                                >
                                    <img src={delivery.delivery_receipt_url} alt="Recibo" className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-500" />
                                </div>
                            </Card>
                        ) : null}
                    </div>
                )}

                {/* Delivery Mode: Uploads */}
                {isDelivering && (
                    <div className="bg-green-50/50 rounded-2xl p-6 border border-green-100 mb-6">
                        <h4 className="font-bold text-green-900 mb-2 flex items-center gap-2 font-display uppercase">
                            <CheckCircle className="h-5 w-5 text-green-600" />
                            Soportes de Entrega
                        </h4>
                        <p className="text-sm text-green-800 mb-6 leading-relaxed">
                            Adjunta los comprobantes para finalizar el domicilio.
                        </p>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Client Payment Proof */}
                            <div className="bg-white p-4 rounded-xl border border-green-100 shadow-sm">
                                <label className="block text-sm font-bold text-gray-900 mb-2 font-display uppercase">
                                    Pago del Cliente <span className="text-red-500">*</span>
                                </label>
                                <div className="relative">
                                    <input
                                        type="file"
                                        accept="image/*"
                                        disabled={uploadingClient}
                                        onChange={async (e) => {
                                            const file = e.target.files?.[0]
                                            if (file) {
                                                const url = await handleFileUpload(file, 'client_payments')
                                                if (url) setClientProofUrl(url)
                                            }
                                        }}
                                        className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-bold file:uppercase file:bg-green-50 file:text-green-700 hover:file:bg-green-100 cursor-pointer disabled:opacity-50"
                                    />
                                    {uploadingClient && <span className="absolute top-2 right-2 text-xs text-green-600 font-bold animate-pulse">Subiendo...</span>}
                                </div>
                                {clientProofUrl && (
                                    <div className="mt-3 relative aspect-video w-full overflow-hidden rounded-lg border border-green-200">
                                        <img src={clientProofUrl} alt="Pago" className="object-cover w-full h-full" />
                                    </div>
                                )}
                            </div>

                            {/* Delivery Receipt */}
                            <div className="bg-white p-4 rounded-xl border border-green-100 shadow-sm">
                                <label className="block text-sm font-bold text-gray-900 mb-2 font-display uppercase">
                                    Recibo Caja Menor <span className="text-red-500">*</span>
                                </label>
                                <div className="relative">
                                    <input
                                        type="file"
                                        accept="image/*"
                                        disabled={uploadingReceipt}
                                        onChange={async (e) => {
                                            const file = e.target.files?.[0]
                                            if (file) {
                                                const url = await handleFileUpload(file, 'receipts')
                                                if (url) setReceiptProofUrl(url)
                                            }
                                        }}
                                        className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-bold file:uppercase file:bg-green-50 file:text-green-700 hover:file:bg-green-100 cursor-pointer disabled:opacity-50"
                                    />
                                    {uploadingReceipt && <span className="absolute top-2 right-2 text-xs text-green-600 font-bold animate-pulse">Subiendo...</span>}
                                </div>
                                {receiptProofUrl && (
                                    <div className="mt-3 relative aspect-video w-full overflow-hidden rounded-lg border border-green-200">
                                        <img src={receiptProofUrl} alt="Recibo" className="object-cover w-full h-full" />
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Items List - Editable in Delivery Mode */}
                <div>
                    <h4 className="font-bold text-gray-900 mb-4 flex items-center gap-2 font-display uppercase text-sm tracking-wide">
                        <Package className="h-5 w-5 text-pp-brown" />
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
                                                        className="w-16 text-center border rounded p-1"
                                                    />
                                                ) : (
                                                    `x${p.quantity}`
                                                )}
                                            </td>
                                            <td className="px-5 py-4 text-right text-gray-600">{formatCurrency(p.price)}</td>
                                            <td className="px-5 py-4 text-right font-medium text-gray-900">{formatCurrency(p.price * p.quantity)}</td>
                                        </tr>
                                    ))}
                                    {/* Summary Rows */}
                                    <tr className="bg-gray-50/50">
                                        <td colSpan={3} className="px-5 py-3 text-right font-bold text-gray-500 uppercase text-xs tracking-wider">Subtotal Productos</td>
                                        <td className="px-5 py-3 text-right font-bold text-gray-800">{formatCurrency(calculateTotalProducts())}</td>
                                    </tr>
                                    <tr className="bg-gray-50/50">
                                        <td colSpan={3} className="px-5 py-3 text-right font-bold text-gray-500 uppercase text-xs tracking-wider">Costo Domicilio</td>
                                        <td className="px-5 py-3 text-right font-bold text-gray-800">
                                            {isDelivering ? (
                                                <input
                                                    type="number"
                                                    min="0"
                                                    value={deliveryFee}
                                                    onChange={(e) => setDeliveryFee(parseFloat(e.target.value) || 0)}
                                                    className="w-24 text-right border rounded p-1 font-bold text-gray-900 focus:ring-green-500 focus:border-green-500"
                                                />
                                            ) : (
                                                formatCurrency(delivery.delivery_fee)
                                            )}
                                        </td>
                                    </tr>
                                    <tr className="bg-pp-gold/5">
                                        <td colSpan={3} className="px-5 py-4 text-right font-bold text-pp-brown uppercase text-xs tracking-wider">Total a Verificar</td>
                                        <td className="px-5 py-4 text-right font-bold text-pp-brown text-lg font-mono">
                                            {formatCurrency(calculateTotalProducts() + (isDelivering ? (deliveryFee || 0) : (delivery.delivery_fee || 0)))}
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 text-gray-500 text-sm">
                            {typeof delivery.product_details === 'string' ? delivery.product_details : 'No hay detalles de productos'}
                        </div>
                    )}
                </div>

            </div>

            {/* Footer */}
            <div className="p-6 border-t bg-gray-50/50 rounded-b-2xl flex justify-between gap-4 items-center shrink-0">
                {isDelivering ? (
                    <>
                        <Button variant="ghost" onClick={() => setIsDelivering(false)}>Cancelar</Button>
                        <Button
                            onClick={handleConfirmDelivery}
                            className={`text-white ${loading || uploadingClient || uploadingReceipt ? 'bg-gray-400' : 'bg-green-600 hover:bg-green-700'}`}
                            disabled={loading || uploadingClient || uploadingReceipt}
                        >
                            {loading ? 'Guardando...' : (uploadingClient || uploadingReceipt ? 'Subiendo Soportes...' : 'Confirmar Entrega')}
                        </Button>
                    </>
                ) : (
                    <>
                        <div className="flex gap-3">
                        </div>
                        <div className="flex gap-3">
                            <Button
                                onClick={onClose}
                                variant="ghost"
                            >
                                Cerrar
                            </Button>

                            {delivery.status !== 'delivered' && delivery.status !== 'cancelled' && (
                                <Button
                                    onClick={() => setIsDelivering(true)}
                                    className="bg-green-600 hover:bg-green-700 text-white shadow-sm"
                                    startIcon={<CheckCircle className="h-4 w-4" />}
                                >
                                    Entregar
                                </Button>
                            )}

                            {delivery.status !== 'delivered' && delivery.status !== 'cancelled' && (
                                <Button
                                    onClick={() => {
                                        onClose();
                                        onEdit();
                                    }}
                                    className="bg-pp-gold hover:bg-pp-gold/80 text-pp-brown shadow-sm"
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
