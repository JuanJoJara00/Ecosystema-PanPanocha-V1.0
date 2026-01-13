'use client'

import React, { useState } from 'react'
import {
    User,
    Phone,
    MapPin,
    DollarSign,
    Package,
    FileText,
    X,
    Edit2,
    Calendar,
    AlertCircle,
    CheckCircle,
    ShoppingBag,
    Truck,
    Clock,
    Camera,
    Upload,
    CheckCircle2,
    ArrowRight,
    ExternalLink,
    Info
} from 'lucide-react'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import Card from '@/components/ui/Card'
import { supabase } from '@/lib/supabase'
import { RappiDelivery } from '@panpanocha/types'

interface RappiDeliveryDetailProps {
    delivery: RappiDelivery
    onEdit: () => void
    onClose: () => void
    onUpdate?: () => void
    isOpen: boolean
}

export default function RappiDeliveryDetail({ delivery, onEdit, onClose, onUpdate, isOpen }: RappiDeliveryDetailProps) {
    const [isDelivering, setIsDelivering] = useState(false)
    const [loading, setLoading] = useState(false)
    const [uploadingTicket, setUploadingTicket] = useState(false)
    const [uploadingOrderReady, setUploadingOrderReady] = useState(false)

    // Initial State from Delivery
    const [ticketUrl, setTicketUrl] = useState<string | null>(delivery?.ticket_url || null)
    const [orderReadyUrl, setOrderReadyUrl] = useState<string | null>(delivery?.order_ready_url || null)

    const parseProducts = () => {
        try {
            const details = delivery?.product_details
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
        if (!ticketUrl || !orderReadyUrl) {
            alert('⚠️ Validación fallida:\nDebes adjuntar FOTO COMANDA y FOTO PEDIDO LISTO para finalizar.')
            return
        }

        setLoading(true)
        try {
            const totalValue = products.reduce((acc: number, item: any) => acc + (item.price * item.quantity), 0)

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

    if (!isOpen || !delivery) return null

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('es-CO', {
            style: 'currency', currency: 'COP', minimumFractionDigits: 0
        }).format(amount)
    }

    return (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50 backdrop-blur-md animate-in fade-in duration-300">
            <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl rounded-[2.5rem] shadow-2xl w-full max-w-6xl overflow-hidden flex flex-col md:flex-row max-h-[90vh] animate-in zoom-in-95 duration-300 border border-white/20">

                {/* Left Panel: Items & Verification (3/5) */}
                <div className="flex-1 overflow-y-auto custom-scrollbar border-r border-gray-100 dark:border-white/5 bg-white dark:bg-slate-900">

                    {/* Header Banner */}
                    <div className="p-10 border-b border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-slate-800/20 flex items-center justify-between sticky top-0 z-10 backdrop-blur-md">
                        <div className="flex items-center gap-5">
                            <div className="h-16 w-16 rounded-2xl bg-[#FF441F] flex items-center justify-center text-white shadow-lg shadow-[#FF441F]/20">
                                <ShoppingBag size={32} />
                            </div>
                            <div>
                                <h2 className="text-3xl font-black text-gray-900 dark:text-white uppercase tracking-tighter font-display leading-none">
                                    {isDelivering ? 'Verificar y Despachar' : 'Detalle Domicilio Rappi'}
                                </h2>
                                <div className="flex items-center gap-2 mt-1.5">
                                    <Badge className="bg-[#FF441F]/10 text-[#FF441F] border-none font-black text-[10px] uppercase px-3 py-1">
                                        ID: #{delivery.rappi_order_id}
                                    </Badge>
                                    <span className="text-xs font-bold text-gray-400 uppercase tracking-widest leading-none">Marketplace Platform</span>
                                </div>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            title="Cerrar detalle"
                            className="p-3 hover:bg-white dark:hover:bg-slate-800 rounded-full text-gray-400 transition-all border border-transparent hover:border-gray-100 dark:hover:border-white/5"
                        >
                            <X size={24} />
                        </button>
                    </div>

                    <div className="p-10 space-y-12">

                        {/* Section 1: Itemized Verification */}
                        <div className="space-y-6">
                            <h3 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em] flex items-center gap-2">
                                <Package size={16} className="text-[#FF441F]" /> Lista de Productos a Validar
                            </h3>

                            <div className="bg-white dark:bg-slate-800 rounded-[2rem] border border-gray-100 dark:border-white/5 overflow-hidden shadow-xl">
                                <table className="w-full text-sm text-left">
                                    <thead>
                                        <tr className="bg-gray-50/50 dark:bg-slate-800/50 text-gray-400 font-medium">
                                            <th className="px-8 py-5 font-black uppercase text-[10px] tracking-widest">Producto</th>
                                            <th className="px-8 py-5 text-center font-black uppercase text-[10px] tracking-widest">Cantidad</th>
                                            <th className="px-8 py-5 text-right font-black uppercase text-[10px] tracking-widest">Precio Unit.</th>
                                            <th className="px-8 py-5 text-right font-black uppercase text-[10px] tracking-widest">Total</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                                        {products.map((p, i) => (
                                            <tr key={i} className="group hover:bg-gray-50/50 dark:hover:bg-white/5 transition-colors">
                                                <td className="px-8 py-6">
                                                    <p className="font-black text-gray-900 dark:text-white uppercase text-base italic">{p.name}</p>
                                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter mt-1">{p.category || 'Categoría Rappi'}</p>
                                                </td>
                                                <td className="px-8 py-6 text-center">
                                                    {isDelivering ? (
                                                        <input
                                                            type="number"
                                                            title="Cantidad recibida"
                                                            value={p.quantity}
                                                            onChange={e => handleQuantityChange(i, parseInt(e.target.value) || 0)}
                                                            className="w-16 bg-[#FF441F]/10 border-2 border-[#FF441F]/30 rounded-xl py-2 px-1 text-center font-black text-[#FF441F] text-lg outline-none focus:ring-4 focus:ring-[#FF441F]/10"
                                                        />
                                                    ) : (
                                                        <span className="text-xl font-black text-gray-900 dark:text-white font-display italic">x{p.quantity}</span>
                                                    )}
                                                </td>
                                                <td className="px-8 py-6 text-right">
                                                    <span className="text-xs font-black text-gray-400 uppercase font-mono tracking-tighter">{formatCurrency(p.price)}</span>
                                                </td>
                                                <td className="px-8 py-6 text-right">
                                                    <span className="text-lg font-black text-gray-900 dark:text-white font-mono tracking-tighter italic">{formatCurrency(p.price * p.quantity)}</span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Section 2: Uploads / Evidence */}
                        <div className="space-y-6">
                            <h3 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em] flex items-center gap-2">
                                <Camera size={16} className="text-[#FF441F]" /> Registro Fotográfico Obligatorio
                            </h3>

                            <div className="grid grid-cols-2 gap-8">
                                {/* Ticket Proof */}
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between px-2">
                                        <p className="text-[10px] font-black text-gray-400 uppercase">1. Comanda POS</p>
                                        {ticketUrl && <CheckCircle size={14} className="text-green-500" />}
                                    </div>
                                    <label className="block relative cursor-pointer group">
                                        <div className={`h-48 rounded-[2.5rem] border-2 border-dashed flex flex-col items-center justify-center transition-all overflow-hidden ${ticketUrl ? 'border-[#FF441F]/30 bg-[#FF441F]/5' : 'border-gray-200 dark:border-white/5 hover:bg-gray-100 dark:hover:bg-slate-800'}`}>
                                            {ticketUrl ? (
                                                <img src={ticketUrl} className="w-full h-full object-cover" alt="Ticket" />
                                            ) : (
                                                <div className="text-center">
                                                    <div className="h-12 w-12 rounded-2xl bg-gray-100 dark:bg-slate-700 flex items-center justify-center text-gray-400 dark:text-gray-500 mb-2 mx-auto group-hover:scale-110 transition-transform">
                                                        <Upload size={24} />
                                                    </div>
                                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Subir Comanda</p>
                                                </div>
                                            )}
                                        </div>
                                        {isDelivering && (
                                            <input
                                                type="file"
                                                className="hidden"
                                                accept="image/*"
                                                onChange={async e => {
                                                    const file = e.target.files?.[0]
                                                    if (file) {
                                                        const url = await handleFileUpload(file, 'ticket')
                                                        if (url) setTicketUrl(url)
                                                    }
                                                }}
                                            />
                                        )}
                                    </label>
                                </div>

                                {/* Order Ready Proof */}
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between px-2">
                                        <p className="text-[10px] font-black text-gray-400 uppercase">2. Pedido Empacado</p>
                                        {orderReadyUrl && <CheckCircle size={14} className="text-green-500" />}
                                    </div>
                                    <label className="block relative cursor-pointer group">
                                        <div className={`h-48 rounded-[2.5rem] border-2 border-dashed flex flex-col items-center justify-center transition-all overflow-hidden ${orderReadyUrl ? 'border-[#FF441F]/30 bg-[#FF441F]/5' : 'border-gray-200 dark:border-white/5 hover:bg-gray-100 dark:hover:bg-slate-800'}`}>
                                            {orderReadyUrl ? (
                                                <img src={orderReadyUrl} className="w-full h-full object-cover" alt="Ready" />
                                            ) : (
                                                <div className="text-center">
                                                    <div className="h-12 w-12 rounded-2xl bg-gray-100 dark:bg-slate-700 flex items-center justify-center text-gray-400 dark:text-gray-500 mb-2 mx-auto group-hover:scale-110 transition-transform">
                                                        <Upload size={24} />
                                                    </div>
                                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Subir Empaque</p>
                                                </div>
                                            )}
                                        </div>
                                        {isDelivering && (
                                            <input
                                                type="file"
                                                className="hidden"
                                                accept="image/*"
                                                onChange={async e => {
                                                    const file = e.target.files?.[0]
                                                    if (file) {
                                                        const url = await handleFileUpload(file, 'order_ready')
                                                        if (url) setOrderReadyUrl(url)
                                                    }
                                                }}
                                            />
                                        )}
                                    </label>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Panel: Logistics Summary (2/5) */}
                <div className="w-full md:w-[450px] bg-gray-50/50 dark:bg-slate-800/10 p-10 flex flex-col justify-between">
                    <div className="flex-1 space-y-10">

                        {/* Status Card */}
                        <div className="bg-slate-900 p-8 rounded-[2.8rem] text-white shadow-2xl relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-10 opacity-10 translate-x-4 -translate-y-4 group-hover:scale-110 transition-transform duration-700">
                                <Truck size={120} className="text-[#FF441F]" />
                            </div>

                            <div className="relative z-10 space-y-8">
                                <div className="flex justify-between items-start">
                                    <Badge className="bg-white/10 text-white border-white/10 font-black text-[10px] uppercase tracking-widest px-4 py-1">Logística Rappi</Badge>
                                    <Badge variant={delivery.status === 'delivered' ? 'success' : delivery.status === 'pending' ? 'warning' : 'info'} className="font-black text-[10px] uppercase shadow-lg">
                                        {delivery.status.toUpperCase()}
                                    </Badge>
                                </div>

                                <div>
                                    <p className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] mb-1">Total Liquidado</p>
                                    <p className="text-5xl font-black font-display italic text-[#FF441F] tracking-tighter leading-none">
                                        ${products.reduce((acc: number, p: any) => acc + (p.price * p.quantity), 0).toLocaleString()}
                                    </p>
                                </div>

                                <div className="h-px bg-white/10 w-full" />

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <p className="text-[9px] font-black text-white/40 uppercase tracking-widest mb-1">Móvil Repartidor</p>
                                        <p className="text-sm font-black text-white uppercase tracking-wider">{delivery.assigned_driver || 'Sin Asignar'}</p>
                                    </div>
                                    <div>
                                        <p className="text-[9px] font-black text-white/40 uppercase tracking-widest mb-1">Creación</p>
                                        <p className="text-xs font-bold text-white/60">{new Date(delivery.created_at).toLocaleDateString()} {new Date(delivery.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Customer & Branch */}
                        <div className="space-y-6">
                            <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] flex items-center justify-between">
                                <span>Contexto de Distribución</span>
                                <Info size={14} className="opacity-40" />
                            </h3>

                            <div className="space-y-4">
                                <div className="flex items-center gap-4 bg-white dark:bg-slate-800 p-5 rounded-3xl border border-gray-100 dark:border-white/5 shadow-sm">
                                    <div className="h-10 w-10 rounded-xl bg-gray-100 dark:bg-slate-700 flex items-center justify-center text-gray-400">
                                        <User size={20} />
                                    </div>
                                    <div>
                                        <p className="text-[9px] font-black text-gray-400 uppercase leading-none mb-1">Cliente Final</p>
                                        <p className="text-sm font-black text-gray-900 dark:text-white uppercase truncate max-w-[200px]">{delivery.customer_name || 'Anónimo'}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4 bg-white dark:bg-slate-800 p-5 rounded-3xl border border-gray-100 dark:border-white/5 shadow-sm">
                                    <div className="h-10 w-10 rounded-xl bg-gray-100 dark:bg-slate-700 flex items-center justify-center text-gray-400">
                                        <MapPin size={20} />
                                    </div>
                                    <div>
                                        <p className="text-[9px] font-black text-gray-400 uppercase leading-none mb-1">Sede de Origen</p>
                                        <p className="text-sm font-black text-gray-900 dark:text-white uppercase">Sede Central</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Notes Area */}
                        {delivery.notes && (
                            <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-gray-100 dark:border-white/5">
                                <h4 className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2">Comentarios Operativos</h4>
                                <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed font-bold uppercase italic italic">
                                    "{delivery.notes}"
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Action Block */}
                    <div className="mt-10 pt-8 border-t border-gray-100 dark:border-white/5 flex flex-col gap-4 sticky bottom-0 bg-gray-50/50 dark:bg-slate-900/50 backdrop-blur-md">
                        {isDelivering ? (
                            <Button
                                onClick={handleConfirmFinalization}
                                disabled={loading || uploadingTicket || uploadingOrderReady || !ticketUrl || !orderReadyUrl}
                                className="w-full h-16 rounded-[2rem] bg-[#FF441F] text-white font-black uppercase tracking-[0.15em] flex items-center justify-center gap-3 shadow-2xl shadow-[#FF441F]/20 hover:scale-[1.02] transition-all"
                            >
                                {loading ? <Loader2 className="animate-spin" /> : <><CheckCircle2 size={24} /> Confirmar Despacho</>}
                            </Button>
                        ) : (
                            <>
                                {delivery.status !== 'delivered' && delivery.status !== 'cancelled' && (
                                    <Button
                                        onClick={() => setIsDelivering(true)}
                                        className="w-full h-16 rounded-[2rem] bg-[#FF441F] text-white font-black uppercase tracking-[0.15em] flex items-center justify-center gap-3 shadow-2xl shadow-[#FF441F]/20 hover:scale-[1.02] transition-all border-none"
                                    >
                                        <CheckCircle size={24} /> Finalizar Orden
                                    </Button>
                                )}
                                <div className="grid grid-cols-2 gap-3">
                                    {(delivery.status !== 'delivered' && delivery.status !== 'cancelled') && (
                                        <Button
                                            onClick={() => { onClose(); onEdit(); }}
                                            variant="outline"
                                            className="h-14 rounded-2xl text-xs font-black uppercase tracking-widest dark:border-white/10 dark:text-white"
                                        >
                                            <Edit2 size={16} className="mr-2" /> Editar Ficha
                                        </Button>
                                    )}
                                    <Button
                                        onClick={onClose}
                                        variant="ghost"
                                        className={`h-14 rounded-2xl text-xs font-black uppercase tracking-widest text-gray-400 ${delivery.status === 'delivered' ? 'col-span-2' : ''}`}
                                    >
                                        {isDelivering ? 'Atrás' : 'Cerrar'}
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
