'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { X, Calendar, FileText, MapPin, Phone, Mail, Building2, CreditCard, Clock } from 'lucide-react'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import Modal from '@/components/ui/Modal'

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
    total_amount?: number // If available in schema, otherwise we might fetch items count
    branch: { name: string }
    items_count?: number
}

export default function SupplierDetail({ supplier, onClose, isOpen }: SupplierDetailProps) {
    const [orders, setOrders] = useState<PurchaseOrder[]>([])
    const [loading, setLoading] = useState(false)
    const [activeTab, setActiveTab] = useState<'info' | 'history'>('info')

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

    if (!supplier) return null

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={supplier.name || 'Detalle del Proveedor'}
            className="md:max-w-3xl"
        >
            <div className="flex border-b border-gray-100 mb-6">
                <button
                    onClick={() => setActiveTab('info')}
                    className={`flex-1 pb-3 text-sm font-bold font-display uppercase tracking-wide transition-colors border-b-2 ${activeTab === 'info'
                        ? 'border-pp-gold text-pp-brown'
                        : 'border-transparent text-gray-400 hover:text-pp-brown'
                        }`}
                >
                    Información
                </button>
                <button
                    onClick={() => setActiveTab('history')}
                    className={`flex-1 pb-3 text-sm font-bold font-display uppercase tracking-wide transition-colors border-b-2 ${activeTab === 'history'
                        ? 'border-pp-gold text-pp-brown'
                        : 'border-transparent text-gray-400 hover:text-pp-brown'
                        }`}
                >
                    Historial de Pedidos
                </button>
            </div>

            <div className="space-y-6 min-h-[300px]">
                {activeTab === 'info' ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 font-sans">
                        <div className="space-y-4">
                            <div>
                                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 font-display">Contacto</h3>
                                <div className="space-y-3">
                                    <div className="flex items-center gap-3 text-gray-700">
                                        <div className="bg-pp-gold/10 p-2 rounded-lg text-pp-brown">
                                            <UserIcon className="h-4 w-4" />
                                        </div>
                                        <div>
                                            <p className="font-bold text-sm">{supplier.contact_name || 'Sin nombre de contacto'}</p>
                                            <p className="text-xs text-gray-500">Contacto Principal</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3 text-gray-700">
                                        <div className="bg-pp-gold/10 p-2 rounded-lg text-pp-brown">
                                            <Mail className="h-4 w-4" />
                                        </div>
                                        <a href={`mailto:${supplier.email}`} className="text-sm hover:underline hover:text-pp-brown">
                                            {supplier.email || 'Sin email'}
                                        </a>
                                    </div>
                                    <div className="flex items-center gap-3 text-gray-700">
                                        <div className="bg-pp-gold/10 p-2 rounded-lg text-pp-brown">
                                            <Phone className="h-4 w-4" />
                                        </div>
                                        <a href={`tel:${supplier.phone}`} className="text-sm hover:underline hover:text-pp-brown">
                                            {supplier.phone || 'Sin teléfono'}
                                        </a>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 mt-4 font-display">Ubicación</h3>
                                <div className="flex items-start gap-3 text-gray-700">
                                    <div className="bg-pp-gold/10 p-2 rounded-lg text-pp-brown mt-0.5">
                                        <MapPin className="h-4 w-4" />
                                    </div>
                                    <p className="text-sm leading-relaxed">
                                        {supplier.address || 'Dirección no registrada'}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 font-display">Datos Fiscales y Pago</h3>
                                <Card className="p-4 bg-gray-50 border-gray-100 shadow-none">
                                    <div className="space-y-3">
                                        <div className="flex justify-between items-center pb-2 border-b border-gray-100">
                                            <span className="text-sm text-gray-500 font-medium">NIT / RUT</span>
                                            <span className="text-sm font-bold text-gray-800">{supplier.tax_id || 'N/A'}</span>
                                        </div>
                                        <div className="flex justify-between items-center pb-2 border-b border-gray-100">
                                            <span className="text-sm text-gray-500 font-medium">Términos Pago</span>
                                            <Badge variant="info">{supplier.payment_terms || 'Contado'}</Badge>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-sm text-gray-500 font-medium">Categoría</span>
                                            <span className="text-sm font-bold text-gray-800">{supplier.category}</span>
                                        </div>
                                    </div>
                                </Card>
                            </div>

                            <div>
                                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 font-display">Horarios</h3>
                                <div className="flex gap-3">
                                    <div className="flex-1 bg-blue-50 rounded-lg p-3 border border-blue-100">
                                        <p className="text-xs text-blue-600 font-bold mb-1 uppercase">Día Pedido</p>
                                        <p className="text-sm font-bold text-blue-900">{supplier.order_day || 'N/A'}</p>
                                    </div>
                                    <div className="flex-1 bg-green-50 rounded-lg p-3 border border-green-100">
                                        <p className="text-xs text-green-600 font-bold mb-1 uppercase">Día Entrega</p>
                                        <p className="text-sm font-bold text-green-900">{supplier.delivery_day || 'N/A'}</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {supplier.notes && (
                            <div className="md:col-span-2 mt-2">
                                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 font-display">Notas</h3>
                                <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-100 text-sm text-yellow-800 italic">
                                    "{supplier.notes}"
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="space-y-4">
                        {loading ? (
                            <div className="text-center py-12 text-gray-400">Loading history...</div>
                        ) : orders.length === 0 ? (
                            <div className="text-center py-12 border-2 border-dashed border-gray-100 rounded-xl bg-gray-50">
                                <FileText className="h-10 w-10 text-gray-300 mx-auto mb-2" />
                                <p className="text-gray-500 font-medium">No hay pedidos registrados</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {orders.map(order => (
                                    <div key={order.id} className="flex items-center justify-between p-3 border border-gray-100 rounded-xl hover:bg-gray-50 transition-colors group">
                                        <div className="flex items-center gap-4">
                                            <div className="bg-gray-100 p-2.5 rounded-lg text-gray-500 group-hover:bg-white group-hover:shadow-sm transition-all">
                                                <Calendar className="h-5 w-5" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-gray-800 font-display">
                                                    {new Date(order.created_at).toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' })}
                                                </p>
                                                <div className="flex items-center gap-2 text-xs text-gray-500">
                                                    <span className="flex items-center gap-1">
                                                        <Building2 className="h-3 w-3" />
                                                        {order.branch?.name}
                                                    </span>
                                                    <span>•</span>
                                                    <span>{order.items_count} items</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex flex-col items-end gap-1.5">
                                            <Badge variant={order.status === 'received' ? 'success' : order.status === 'pending' ? 'warning' : 'neutral'}>
                                                {order.status === 'received' ? 'Recibido' : order.status === 'pending' ? 'Pendiente' : order.status}
                                            </Badge>
                                            <span className={`text-[10px] font-bold uppercase tracking-wider ${order.payment_status === 'paid' ? 'text-green-600' : 'text-yellow-600'}`}>
                                                {order.payment_status === 'paid' ? 'Pagado' : 'Pago Pendiente'}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

            </div>

            <div className="flex justify-end pt-6 mt-2 border-t border-gray-100">
                <Button onClick={onClose} variant="ghost">
                    Cerrar
                </Button>
            </div>
        </Modal >
    )
}

function UserIcon({ className }: { className?: string }) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
            <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
        </svg>
    )
}
