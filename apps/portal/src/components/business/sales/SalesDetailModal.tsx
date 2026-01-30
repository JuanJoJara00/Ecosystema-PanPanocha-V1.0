'use client'

import React, { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { formatCurrency } from '@/lib/utils'
import {
    X,
    ShoppingCart,
    CreditCard,
    Calendar,
    User,
    Store,
    Receipt,
    Download
} from 'lucide-react'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'

export interface SalesDetailModalProps {
    saleId: string | null
    onClose: () => void
}

export default function SalesDetailModal({ saleId, onClose }: SalesDetailModalProps) {
    const [sale, setSale] = useState<any>(null)
    const [items, setItems] = useState<any[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (saleId) fetchDetails()
    }, [saleId])

    const fetchDetails = async () => {
        setLoading(true)
        try {
            // Fetch Sale Header
            const { data: saleData, error: saleError } = await supabase
                .from('sales')
                .select(`
                    *,
                    branch:branches(name),
                    created_by_user:users!sales_created_by_fkey(full_name),
                    client:clients(full_name)
                `)
                .eq('id', saleId)
                .single()

            if (saleError) throw saleError
            setSale(saleData)

            // Fetch Sale Items
            const { data: itemsData, error: itemsError } = await supabase
                .from('sale_items')
                .select(`
                    *,
                    product:products(name, sku, image_url)
                `)
                .eq('sale_id', saleId)

            if (itemsError) throw itemsError
            setItems(itemsData || [])

        } catch (err) {
            console.error('Error fetching sale details:', err)
        } finally {
            setLoading(false)
        }
    }

    if (!saleId) return null

    return (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50 backdrop-blur-md animate-in fade-in duration-300">
            <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl w-full max-w-7xl overflow-hidden flex flex-col md:flex-row max-h-[90vh] animate-in zoom-in-95 duration-300 border border-gray-100 dark:border-white/5">

                {/* Left Panel: Items List (3/5) */}
                <div className="flex-1 overflow-y-auto custom-scrollbar border-r border-gray-100 dark:border-white/5 bg-white dark:bg-slate-900">

                    {/* Header */}
                    <div className="p-8 border-b border-gray-100 dark:border-white/5 flex items-center justify-between sticky top-0 bg-white dark:bg-slate-900 z-10">
                        <div className="flex items-center gap-4">
                            <div className="h-14 w-14 rounded-2xl bg-pp-brown flex items-center justify-center text-pp-gold shadow-lg shadow-pp-brown/20">
                                <ShoppingCart size={28} />
                            </div>
                            <div>
                                <h2 className="text-2xl font-black text-gray-900 dark:text-white uppercase tracking-tighter font-display leading-none">
                                    Detalle de Venta
                                </h2>
                                <div className="flex items-center gap-2 mt-1">
                                    <Badge className="bg-pp-gold text-pp-brown border-none font-black text-[10px] uppercase px-2">
                                        #{sale?.id?.split('-')[0].toUpperCase()}
                                    </Badge>
                                    <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                                        {new Date(sale?.created_at).toLocaleString()}
                                    </span>
                                </div>
                            </div>
                        </div>
                        <button onClick={onClose} title="Cerrar" className="p-2 hover:bg-gray-100 rounded-full text-gray-400">
                            <X size={24} />
                        </button>
                    </div>

                    {/* Items Table */}
                    <div className="p-8">
                        <div className="bg-gray-50/50 dark:bg-slate-800/20 rounded-[2rem] border border-gray-100 dark:border-white/5 overflow-hidden">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-gray-50 dark:bg-slate-800/50 text-gray-400 uppercase text-[10px] font-black tracking-widest">
                                    <tr>
                                        <th className="px-6 py-4">Producto</th>
                                        <th className="px-4 py-4 text-center">Cant.</th>
                                        <th className="px-4 py-4 text-right">Precio Unit.</th>
                                        <th className="px-6 py-4 text-right">Total</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                                    {items.map(item => (
                                        <tr key={item.id} className="hover:bg-white dark:hover:bg-slate-800 transition-colors">
                                            <td className="px-6 py-4">
                                                <p className="font-bold text-gray-900 dark:text-white">{item.product?.name || 'Item desconozido'}</p>
                                                <p className="text-[10px] text-gray-400 uppercase tracking-wider">{item.product?.sku}</p>
                                            </td>
                                            <td className="px-4 py-4 text-center font-bold text-gray-600 dark:text-gray-300">
                                                {item.quantity}
                                            </td>
                                            <td className="px-4 py-4 text-right font-medium text-gray-500">
                                                {formatCurrency(item.unit_price)}
                                            </td>
                                            <td className="px-6 py-4 text-right font-black text-gray-900 dark:text-white">
                                                {formatCurrency(item.total_price)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot className="bg-white dark:bg-slate-900 border-t border-gray-100">
                                    <tr>
                                        <td colSpan={3} className="px-6 py-4 text-right font-black text-gray-400 uppercase text-xs">Subtotal</td>
                                        <td className="px-6 py-4 text-right font-black text-gray-900 dark:text-white text-lg">
                                            {formatCurrency(sale?.total_amount - (sale?.tax_amount || 0))}
                                        </td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    </div>
                </div>

                {/* Right Panel: Context & Actions (2/5) */}
                <div className="w-full md:w-[350px] bg-white dark:bg-slate-900 p-8 flex flex-col justify-between border-t md:border-t-0 md:border-l border-gray-100 dark:border-white/5">
                    <div className="space-y-8">
                        {/* Status Card */}
                        <div className="bg-pp-brown p-6 rounded-[2rem] text-white shadow-xl shadow-pp-brown/20 relative overflow-hidden">
                            <Receipt className="absolute -right-4 -bottom-4 text-white/10 w-32 h-32" />
                            <div className="relative z-10">
                                <p className="text-[10px] font-black uppercase tracking-widest text-white/50 mb-1">Total Venta</p>
                                <p className="text-3xl font-black text-pp-gold">{formatCurrency(sale?.total_amount)}</p>
                                <div className="mt-4 flex gap-2">
                                    <Badge className="bg-white/10 text-white border-none text-[10px] uppercase">
                                        {sale?.payment_method}
                                    </Badge>
                                    <Badge variant="success" className="text-[10px] uppercase">
                                        {sale?.status}
                                    </Badge>
                                </div>
                            </div>
                        </div>

                        {/* Details List */}
                        <div className="space-y-4">
                            <div>
                                <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Información</h3>
                                <div className="grid grid-cols-1 gap-4">
                                    <div className="flex items-center gap-3">
                                        <Store className="text-pp-gold w-4 h-4" />
                                        <div>
                                            <p className="text-[9px] text-gray-400 uppercase font-bold">Sede</p>
                                            <p className="font-bold text-gray-900 dark:text-white text-sm">{sale?.branch?.name || 'N/A'}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <User className="text-pp-gold w-4 h-4" />
                                        <div>
                                            <p className="text-[9px] text-gray-400 uppercase font-bold">Cliente</p>
                                            <p className="font-bold text-gray-900 dark:text-white text-sm">{sale?.client?.full_name || 'Consumidor Final'}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <Calendar className="text-pp-gold w-4 h-4" />
                                        <div>
                                            <p className="text-[9px] text-gray-400 uppercase font-bold">Fecha</p>
                                            <p className="font-bold text-gray-900 dark:text-white text-sm">
                                                {sale?.created_at ? new Date(sale.created_at).toLocaleDateString() : '-'}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="space-y-3">
                        <Button className="w-full bg-pp-brown text-pp-gold font-black uppercase tracking-widest h-12 rounded-xl">
                            <Download size={18} className="mr-2" /> Descargar Factura
                        </Button>
                        <Button onClick={onClose} variant="ghost" className="w-full text-gray-400 font-bold uppercase tracking-widest h-12 rounded-xl">
                            Cerrar
                        </Button>
                    </div>
                </div>

            </div>
        </div>
    )
}
