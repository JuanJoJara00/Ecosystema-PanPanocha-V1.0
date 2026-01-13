'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import {
    X,
    Calendar,
    FileText,
    MapPin,
    Phone,
    Mail,
    Building2,
    CreditCard,
    Clock,
    Truck,
    ShieldCheck,
    DollarSign,
    ExternalLink,
    ChevronRight,
    History,
    Activity,
    Info,
    Store,
    Loader2,
    ShoppingCart
} from 'lucide-react'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'

interface SupplierDetailProps {
    supplier: any
    onClose: () => void
    isOpen: boolean
}

interface PurchaseOrder {
    id: string
    created_at: string
    status: string
    payment_status: string
    total_amount?: number
    branch: { name: string }
    items_count?: number
}

export default function SupplierDetail({ supplier, onClose, isOpen }: SupplierDetailProps) {
    const [orders, setOrders] = useState<PurchaseOrder[]>([])
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        if (isOpen && supplier) {
            fetchHistory()
        }
    }, [isOpen, supplier])

    const fetchHistory = async () => {
        setLoading(true)
        try {
            const { data, error } = await supabase
                .from('purchase_orders')
                .select(`
                    id,
                    created_at,
                    status,
                    payment_status,
                    items:purchase_order_items(count),
                    branch:branches(name)
                `)
                .eq('supplier_id', supplier.id)
                .order('created_at', { ascending: false })
                .limit(10)

            if (error) throw error

            const mappedOrders = data.map((order: any) => ({
                id: order.id,
                created_at: order.created_at,
                status: order.status,
                payment_status: order.payment_status,
                branch: order.branch,
                items_count: order.items?.[0]?.count || 0
            }))

            setOrders(mappedOrders)
        } catch (error) {
            console.error('Error fetching history:', error)
        } finally {
            setLoading(false)
        }
    }

    if (!isOpen || !supplier) return null

    return (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50 backdrop-blur-md animate-in fade-in duration-300">
            <div className="bg-white/90 backdrop-blur-xl rounded-[2.5rem] shadow-2xl w-full max-w-6xl overflow-hidden flex flex-col md:flex-row max-h-[90vh] animate-in zoom-in-95 duration-300 border border-white/20">

                {/* Left Panel: Profile & Identity */}
                <div className="flex-1 overflow-y-auto custom-scrollbar border-r border-gray-100">
                    {/* Hero Header */}
                    <div className="relative h-64 w-full bg-pp-brown overflow-hidden">
                        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10" />
                        <div className="absolute inset-0 bg-gradient-to-t from-pp-brown via-transparent to-transparent" />

                        <div className="absolute bottom-10 left-10 right-10 flex items-end gap-6">
                            <div className="h-24 w-24 rounded-3xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-pp-gold shadow-2xl">
                                <Truck size={48} />
                            </div>
                            <div className="flex-1 pb-1">
                                <div className="flex items-center gap-3 mb-2">
                                    <Badge className="bg-pp-gold text-pp-brown border-none font-black text-[10px] uppercase tracking-widest px-3 py-1">
                                        Proveedor VIP
                                    </Badge>
                                    <span className="text-white/40 text-[10px] font-mono tracking-widest uppercase">ID: {supplier.id.split('-')[0]}</span>
                                </div>
                                <h2 className="text-4xl font-black text-white uppercase tracking-tight leading-none font-display">
                                    {supplier.name}
                                </h2>
                            </div>
                        </div>

                        <button
                            onClick={onClose}
                            className="absolute top-8 right-8 p-2 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-full text-white transition-all border border-white/10"
                            title="Cerrar detalle"
                        >
                            <X size={24} />
                        </button>
                    </div>

                    {/* Content Section */}
                    <div className="p-10 space-y-12">
                        {/* Highlights Grid */}
                        <div className="grid grid-cols-3 gap-6">
                            <div className="p-4 rounded-3xl bg-gray-50/50 border border-gray-100 flex flex-col gap-1">
                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Categoría</span>
                                <span className="text-sm font-black text-pp-brown uppercase">{supplier.category || 'Varios'}</span>
                            </div>
                            <div className="p-4 rounded-3xl bg-gray-50/50 border border-gray-100 flex flex-col gap-1">
                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Términos</span>
                                <span className="text-sm font-black text-pp-brown uppercase">{supplier.payment_terms || 'Contado'}</span>
                            </div>
                            <div className="p-4 rounded-3xl bg-gray-50/50 border border-gray-100 flex flex-col gap-1">
                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Lead Time</span>
                                <span className="text-sm font-black text-pp-brown uppercase">{supplier.delivery_time_days || 0} Días</span>
                            </div>
                        </div>

                        {/* Detailed Info Blocks */}
                        <div className="grid grid-cols-2 gap-10">
                            {/* Contact Info */}
                            <div className="space-y-6">
                                <h3 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em] flex items-center gap-2">
                                    <ShieldCheck size={16} className="text-pp-gold" /> Contacto Directo
                                </h3>
                                <div className="space-y-4">
                                    <div className="flex items-center gap-4 group">
                                        <div className="h-12 w-12 rounded-2xl bg-pp-gold/10 flex items-center justify-center text-pp-brown group-hover:scale-110 transition-transform">
                                            <Building2 size={20} />
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Atención Comercial</p>
                                            <p className="text-base font-black text-gray-900 leading-none">{supplier.contact_name || 'No asignado'}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4 group">
                                        <div className="h-12 w-12 rounded-2xl bg-pp-gold/10 flex items-center justify-center text-pp-brown group-hover:scale-110 transition-transform">
                                            <Phone size={20} />
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Teléfono Principal</p>
                                            <a href={`tel:${supplier.phone}`} className="text-base font-black text-gray-900 leading-none hover:text-pp-brown transition-colors">
                                                {supplier.phone || 'No registrado'}
                                            </a>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4 group">
                                        <div className="h-12 w-12 rounded-2xl bg-pp-gold/10 flex items-center justify-center text-pp-brown group-hover:scale-110 transition-transform">
                                            <Mail size={20} />
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Email Corporativo</p>
                                            <a href={`mailto:${supplier.email}`} className="text-base font-black text-gray-900 leading-none hover:text-pp-brown transition-colors break-all">
                                                {supplier.email || 'No registrado'}
                                            </a>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Logistics info */}
                            <div className="space-y-6">
                                <h3 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em] flex items-center gap-2">
                                    <Clock size={16} className="text-pp-gold" /> Operaciones & Despacho
                                </h3>
                                <div className="space-y-4">
                                    <div className="p-5 rounded-3xl bg-blue-50/50 border border-blue-100 flex items-center justify-between">
                                        <div>
                                            <p className="text-[9px] font-black text-blue-600 uppercase tracking-widest mb-1">Día de Pedido</p>
                                            <p className="text-sm font-black text-blue-900 uppercase">{supplier.order_day || 'Variable'}</p>
                                        </div>
                                        <div className="h-1 w-8 bg-blue-200 rounded-full" />
                                        <div className="text-right">
                                            <p className="text-[9px] font-black text-blue-600 uppercase tracking-widest mb-1">Entrega</p>
                                            <p className="text-sm font-black text-blue-900 uppercase">{supplier.delivery_day || 'Variable'}</p>
                                        </div>
                                    </div>
                                    <div className="p-5 rounded-3xl bg-gray-50 border border-gray-100">
                                        <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                                            <MapPin size={12} /> Punto de Carga / Despacho
                                        </p>
                                        <p className="text-sm font-bold text-gray-700 leading-relaxed italic">
                                            {supplier.address || 'Dirección no especificada'}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Notes Section */}
                        {supplier.notes && (
                            <div className="bg-pp-gold/5 p-6 rounded-3xl border border-pp-gold/10 relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-4 opacity-5">
                                    <FileText size={48} />
                                </div>
                                <h3 className="text-[10px] font-black text-pp-brown uppercase tracking-widest mb-3 flex items-center gap-2">
                                    <Info size={14} /> Notas Adicionales
                                </h3>
                                <p className="text-xs text-pp-brown/80 font-medium leading-relaxed italic">
                                    "{supplier.notes}"
                                </p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Panel: Analytics & History */}
                <div className="w-full md:w-[450px] bg-gray-50/50 p-10 flex flex-col">
                    <div className="flex-1 space-y-10">
                        {/* Visual Summary Card */}
                        <div className="bg-pp-brown p-8 rounded-[2.8rem] text-white shadow-2xl shadow-pp-brown/30 relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-10 opacity-10 translate-x-4 -translate-y-4 group-hover:scale-110 transition-transform duration-700">
                                <DollarSign size={120} />
                            </div>
                            <div className="relative z-10">
                                <Badge className="bg-white/10 text-pp-gold border-white/10 font-black text-[10px] uppercase mb-6 tracking-widest">
                                    Financial Insights
                                </Badge>
                                <p className="text-[10px] font-black text-pp-gold uppercase tracking-[0.2em] mb-1">Total Compras (Histórico)</p>
                                <div className="flex items-baseline gap-2">
                                    <span className="text-2xl font-bold text-pp-gold/50">$</span>
                                    <p className="text-5xl font-black font-display tracking-tight">
                                        {(supplier.stats?.total_purchased || 0).toLocaleString()}
                                    </p>
                                </div>
                                <div className="h-px bg-white/10 w-full my-6" />
                                <div className="flex justify-between items-center">
                                    <div>
                                        <p className="text-[9px] font-black text-white/40 uppercase tracking-widest mb-1">Cuentas x Pagar</p>
                                        <p className={`text-xl font-black ${supplier.stats?.current_debt > 0 ? 'text-red-400' : 'text-pp-gold'}`}>
                                            ${(supplier.stats?.current_debt || 0).toLocaleString()}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[9px] font-black text-white/40 uppercase tracking-widest mb-1">Último Pago</p>
                                        <p className="text-xs font-black uppercase text-white/80">Hoy 04:00 PM</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Recent Activity List */}
                        <div className="space-y-6">
                            <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] flex items-center justify-between">
                                <span>Últimas Órdenes de Compra</span>
                                <History size={14} className="opacity-40" />
                            </h3>

                            {loading ? (
                                <div className="flex items-center justify-center py-10">
                                    <Loader2 size={32} className="animate-spin text-pp-brown opacity-20" />
                                </div>
                            ) : orders.length === 0 ? (
                                <div className="text-center py-10 bg-white/50 border border-dashed border-gray-200 rounded-3xl">
                                    <Activity size={32} className="mx-auto text-gray-200 mb-2" />
                                    <p className="text-xs font-bold text-gray-400 uppercase">Sin movimientos recientes</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {orders.map(order => (
                                        <div key={order.id} className="bg-white p-4 rounded-3xl border border-gray-100 shadow-sm flex items-center justify-between group hover:border-pp-gold/30 transition-all cursor-pointer">
                                            <div className="flex items-center gap-4">
                                                <div className="h-10 w-10 rounded-2xl bg-gray-50 flex items-center justify-center text-pp-brown group-hover:bg-pp-gold/10 transition-colors">
                                                    <Calendar size={18} />
                                                </div>
                                                <div>
                                                    <p className="text-xs font-black text-gray-900 font-display">
                                                        {new Date(order.created_at).toLocaleDateString()}
                                                    </p>
                                                    <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">{order.branch?.name}</p>
                                                </div>
                                            </div>
                                            <div className="text-right flex flex-col items-end gap-1">
                                                <Badge variant={order.status === 'received' ? 'success' : 'warning'} className="text-[8px] font-black py-0.5">
                                                    {order.status === 'received' ? 'Recibido' : 'Pendiente'}
                                                </Badge>
                                                <span className="text-[8px] font-black text-gray-300 uppercase leading-none tracking-tighter">ORD-{order.id.split('-')[0].toUpperCase()}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Action Footer */}
                    <div className="mt-10 pt-8 border-t border-gray-100 flex flex-col gap-4">
                        <Button
                            variant="primary"
                            className="w-full h-14 rounded-2xl bg-pp-brown text-pp-gold font-black uppercase tracking-widest flex items-center justify-center gap-3 transition-all hover:scale-[1.02] shadow-xl shadow-pp-brown/10"
                            title="Generar nueva orden de compra"
                        >
                            <ShoppingCart size={20} /> Generar Nueva Orden
                        </Button>
                        <div className="grid grid-cols-2 gap-3">
                            <Button
                                variant="outline"
                                className="rounded-xl font-bold text-xs h-12 uppercase tracking-tight"
                            >
                                <ExternalLink size={16} className="mr-2" /> Ver Facturas
                            </Button>
                            <Button
                                onClick={onClose}
                                variant="ghost"
                                className="rounded-xl font-black text-gray-400 text-xs h-12 uppercase"
                            >
                                Cerrar Detalle
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

function ShoppingCartIcon({ size }: { size: number }) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="8" cy="21" r="1" />
            <circle cx="19" cy="21" r="1" />
            <path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12" />
        </svg>
    )
}
