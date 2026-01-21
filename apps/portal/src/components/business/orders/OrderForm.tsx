'use client'

import React, { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import {
    Loader2,
    Plus,
    AlertCircle,
    ShoppingCart,
    Save,
    Wand2,
    Store,
    Truck,
    Calculator,
    Search,
    Package,
    ArrowRight,
    CheckCircle2,
    X,
    Building2,
    Info,
    ChevronRight,
    ArrowUpCircle
} from 'lucide-react'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import NumericInput from '@/components/ui/NumericInput'

interface OrderFormProps {
    isOpen: boolean
    onSuccess: () => void
    onCancel: () => void
    initialOrderId?: string | null
}

export default function OrderForm({ isOpen, onSuccess, onCancel, initialOrderId }: OrderFormProps) {
    const [loading, setLoading] = useState(false)
    const [pageLoading, setPageLoading] = useState(!!initialOrderId)
    const [error, setError] = useState<string | null>(null)
    const [searchTerm, setSearchTerm] = useState('')

    // Data Sources
    const [suppliers, setSuppliers] = useState<any[]>([])
    const [branches, setBranches] = useState<any[]>([])
    const [inventory, setInventory] = useState<any[]>([])

    // Selection
    const [selectedSupplierId, setSelectedSupplierId] = useState('')
    const [selectedBranchId, setSelectedBranchId] = useState('')

    // Cart: { itemId: quantity }
    const [cart, setCart] = useState<Record<string, number>>({})

    useEffect(() => {
        if (isOpen) {
            fetchInit()
        }
    }, [isOpen])

    const fetchInit = async () => {
        const { data: sup } = await supabase.from('suppliers').select('id, name').order('name')
        const { data: br } = await supabase.from('branches').select('id, name').order('name')
        if (sup) setSuppliers(sup)
        if (br) {
            setBranches(br)
            if (!initialOrderId && br.length > 0) setSelectedBranchId(br[0].id)
        }
    }

    // Load existing order data
    useEffect(() => {
        if (initialOrderId && isOpen) {
            loadOrderData()
        } else if (isOpen && !initialOrderId) {
            // Reset for new order
            setSelectedSupplierId('')
            setCart({})
            setError(null)
        }
    }, [initialOrderId, isOpen])

    // Fetch Inventory when Supplier & Branch are selected
    useEffect(() => {
        if (selectedSupplierId && selectedBranchId && isOpen) {
            fetchCatalog()
        }
    }, [selectedSupplierId, selectedBranchId, isOpen])

    const loadOrderData = async () => {
        setPageLoading(true)
        try {
            const { data: order, error: orderError } = await supabase
                .from('purchase_orders')
                .select('*')
                .eq('id', initialOrderId)
                .single()

            if (orderError) throw orderError

            setSelectedBranchId(order.branch_id)
            setSelectedSupplierId(order.supplier_id)

            const { data: items, error: itemsError } = await supabase
                .from('purchase_order_items')
                .select('item_id, quantity')
                .eq('order_id', initialOrderId)

            if (itemsError) throw itemsError

            const loadedCart: Record<string, number> = {}
            items?.forEach(item => {
                loadedCart[item.item_id] = item.quantity
            })
            setCart(loadedCart)

        } catch (err: any) {
            console.error("Error loading order:", err)
            setError("No se pudo cargar el pedido para editar.")
        } finally {
            setPageLoading(false)
        }
    }

    const fetchCatalog = async () => {
        setLoading(true)
        try {
            const { data, error } = await supabase
                .from('inventory_items')
                .select(`id, name, unit, min_stock_alert, sku`)
                .eq('supplier_id', selectedSupplierId)

            if (error) throw error

            const { data: stockData } = await supabase
                .from('branch_ingredients')
                .select('item_id, quantity')
                .eq('branch_id', selectedBranchId)

            const stockMap = new Map(stockData?.map(s => [s.item_id, s.quantity]))

            const merged = data?.map(item => ({
                ...item,
                current_stock: stockMap.get(item.id) || 0
            }))

            setInventory(merged || [])

        } catch (err: any) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    const handleSuggestOrder = () => {
        const newCart = { ...cart }
        let addedCount = 0

        inventory.forEach(item => {
            if (item.current_stock < item.min_stock_alert) {
                const deficit = item.min_stock_alert - item.current_stock
                if (deficit > 0) {
                    newCart[item.id] = deficit
                    addedCount++
                }
            }
        })

        if (addedCount > 0) {
            setCart(newCart)
        } else {
            alert('El inventario actual cubre los mínimos requeridos.')
        }
    }

    const handleSubmit = async () => {
        if (Object.keys(cart).length === 0) {
            setError("Debes agregar al menos un insumo al pedido.")
            return
        }
        setLoading(true)
        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) throw new Error("No autenticado")

            let orderId = initialOrderId

            if (orderId) {
                const { error: updateError } = await supabase
                    .from('purchase_orders')
                    .update({
                        supplier_id: selectedSupplierId,
                        branch_id: selectedBranchId,
                        last_modified_at: new Date().toISOString(),
                        last_modified_by: user.id,
                        last_edit_type: 'manual'
                    })
                    .eq('id', orderId)

                if (updateError) throw updateError

                const { error: deleteError } = await supabase
                    .from('purchase_order_items')
                    .delete()
                    .eq('order_id', orderId)

                if (deleteError) throw deleteError

            } else {
                const { data: newOrder, error: insertError } = await supabase
                    .from('purchase_orders')
                    .insert({
                        supplier_id: selectedSupplierId,
                        branch_id: selectedBranchId,
                        requested_by: user.id,
                        status: 'pending'
                    })
                    .select()
                    .single()

                if (insertError) throw insertError
                orderId = newOrder.id
            }

            const itemsToInsert = Object.entries(cart).map(([itemId, qty]) => ({
                order_id: orderId,
                item_id: itemId,
                quantity: qty,
                unit_price: 0
            }))

            const { error: itemsError } = await supabase
                .from('purchase_order_items')
                .insert(itemsToInsert)

            if (itemsError) throw itemsError

            onSuccess()
        } catch (err: any) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    const updateCart = (itemId: string, val: string) => {
        const num = parseFloat(val)
        if (isNaN(num) || num <= 0) {
            const newCart = { ...cart }
            delete newCart[itemId]
            setCart(newCart)
        } else {
            setCart({ ...cart, [itemId]: num })
        }
    }

    if (!isOpen) return null

    const filteredInventory = inventory.filter(item =>
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.sku?.toLowerCase().includes(searchTerm.toLowerCase())
    )

    return (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50 backdrop-blur-md animate-in fade-in duration-300">
            <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl rounded-[2.5rem] shadow-2xl w-full max-w-6xl overflow-hidden flex flex-col md:flex-row max-h-[90vh] animate-in zoom-in-95 duration-300 border border-white/20">

                {/* Left Panel: Catalog & Selection (3/5) */}
                <div className="flex-1 overflow-y-auto custom-scrollbar border-r border-gray-100 dark:border-white/5 bg-white dark:bg-slate-900 flex flex-col">

                    {/* Header Banner */}
                    <div className="p-10 border-b border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-slate-800/20 flex items-center justify-between sticky top-0 z-10 backdrop-blur-md">
                        <div className="flex items-center gap-5">
                            <div className="h-16 w-16 rounded-2xl bg-pp-brown flex items-center justify-center text-pp-gold shadow-lg shadow-pp-brown/20">
                                <ShoppingCart size={32} />
                            </div>
                            <div>
                                <h2 className="text-3xl font-black text-gray-900 dark:text-white uppercase tracking-tighter font-display leading-none">
                                    {initialOrderId ? 'Editar Pedido' : 'Nueva Orden de Compra'}
                                </h2>
                                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1.5 flex items-center gap-2">
                                    <Package size={14} className="text-pp-gold" /> Gestión de Abastecimiento Externo
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={onCancel}
                            className="p-3 hover:bg-white dark:hover:bg-slate-800 rounded-full text-gray-400 transition-all border border-transparent hover:border-gray-100 dark:hover:border-white/5"
                            title="Cerrar modal"
                        >
                            <X size={24} />
                        </button>
                    </div>

                    <div className="p-10 space-y-12 flex-1">

                        {/* Section 1: Select Context */}
                        <div className="grid grid-cols-2 gap-8">
                            <div className="space-y-3">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-2">Sede (Destino)</label>
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none text-gray-400 group-focus-within:text-pp-gold transition-colors">
                                        <Building2 size={18} />
                                    </div>
                                    <select
                                        required
                                        title="Seleccionar sede de destino"
                                        value={selectedBranchId}
                                        onChange={e => setSelectedBranchId(e.target.value)}
                                        disabled={!!initialOrderId}
                                        className="w-full pl-12 pr-5 py-4 bg-gray-50 dark:bg-slate-800/50 border border-gray-100 dark:border-white/5 rounded-2xl font-black text-gray-900 dark:text-white uppercase tracking-wider focus:bg-white dark:focus:bg-slate-800 focus:ring-4 focus:ring-pp-gold/10 focus:border-pp-gold/30 outline-none appearance-none cursor-pointer transition-all"
                                    >
                                        <option value="">Seleccionar Sede</option>
                                        {branches.map(b => (
                                            <option key={b.id} value={b.id}>{b.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-2">Proveedor Titular</label>
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none text-gray-400 group-focus-within:text-pp-gold transition-colors">
                                        <Truck size={18} />
                                    </div>
                                    <select
                                        required
                                        title="Seleccionar proveedor"
                                        value={selectedSupplierId}
                                        onChange={e => setSelectedSupplierId(e.target.value)}
                                        disabled={!!initialOrderId}
                                        className="w-full pl-12 pr-5 py-4 bg-gray-50 dark:bg-slate-800/50 border border-gray-100 dark:border-white/5 rounded-2xl font-black text-gray-900 dark:text-white uppercase tracking-wider focus:bg-white dark:focus:bg-slate-800 focus:ring-4 focus:ring-pp-gold/10 focus:border-pp-gold/30 outline-none appearance-none cursor-pointer transition-all"
                                    >
                                        <option value="">Seleccionar Proveedor</option>
                                        {suppliers.map(s => (
                                            <option key={s.id} value={s.id}>{s.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* Section 2: Catalog Selection */}
                        {selectedSupplierId ? (
                            <div className="space-y-6">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em] flex items-center gap-2">
                                        <ArrowRight size={16} className="text-pp-gold" /> Catálogo de Insumos Especializados
                                    </h3>
                                    <Button
                                        onClick={handleSuggestOrder}
                                        variant="outline"
                                        className="h-9 rounded-xl border-pp-gold/20 text-pp-brown dark:text-pp-gold font-black uppercase text-[10px] tracking-widest hover:bg-pp-gold/10 group"
                                        title="Rellenar cantidades críticas basadas en stock mínimo"
                                    >
                                        <Wand2 size={14} className="mr-2 group-hover:rotate-12 transition-transform" /> Sugerir Automático
                                    </Button>
                                </div>

                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none text-gray-400 group-focus-within:text-pp-gold transition-colors">
                                        <Search size={18} />
                                    </div>
                                    <input
                                        type="text"
                                        value={searchTerm}
                                        onChange={e => setSearchTerm(e.target.value)}
                                        placeholder="Filtrar por nombre o SKU del insumo..."
                                        className="w-full pl-12 pr-5 py-4 bg-gray-100/50 dark:bg-slate-800/80 border-none rounded-2xl font-bold text-gray-900 dark:text-white outline-none focus:ring-4 focus:ring-pp-gold/10 transition-all placeholder:text-gray-400"
                                    />
                                </div>

                                <div className="bg-white dark:bg-slate-800 rounded-[2rem] border border-gray-100 dark:border-white/5 overflow-hidden shadow-xl">
                                    <table className="w-full text-sm text-left">
                                        <thead>
                                            <tr className="bg-gray-50/50 dark:bg-slate-800/50 text-gray-400 font-medium border-b border-gray-100 dark:border-white/5">
                                                <th className="px-8 py-5 font-black uppercase text-[10px] tracking-widest">Insumo</th>
                                                <th className="px-8 py-5 text-center font-black uppercase text-[10px] tracking-widest text-pp-gold">Min.</th>
                                                <th className="px-8 py-5 text-center font-black uppercase text-[10px] tracking-widest">Stock</th>
                                                <th className="px-8 py-5 text-right font-black uppercase text-[10px] tracking-widest">Cantidad Pedir</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                                            {filteredInventory.map(item => {
                                                const isLowStock = item.current_stock <= item.min_stock_alert
                                                const inCart = (cart[item.id] || 0) > 0
                                                return (
                                                    <tr key={item.id} className={`group hover:bg-gray-50/50 dark:hover:bg-white/5 transition-colors ${isLowStock ? 'bg-red-50/30' : ''}`}>
                                                        <td className="px-8 py-6">
                                                            <p className="font-black text-gray-900 dark:text-white uppercase text-base">{item.name}</p>
                                                            <div className="flex items-center gap-2 mt-1">
                                                                <span className="text-[10px] font-bold text-gray-400 uppercase font-mono tracking-tighter">{item.sku}</span>
                                                                <Badge variant="neutral" className="bg-gray-100 dark:bg-slate-700 font-bold uppercase text-[9px] py-0 h-4">{item.unit}</Badge>
                                                            </div>
                                                        </td>
                                                        <td className="px-8 py-6 text-center">
                                                            <span className="text-sm font-black text-pp-brown dark:text-pp-gold">{item.min_stock_alert}</span>
                                                        </td>
                                                        <td className="px-8 py-6 text-center">
                                                            <div className={`px-3 py-1.5 rounded-xl text-xs font-black font-mono inline-block ${isLowStock ? 'text-red-700 bg-red-100 shadow-sm shadow-red-100' : 'text-gray-500 bg-gray-100'}`}>
                                                                {item.current_stock}
                                                            </div>
                                                        </td>
                                                        <td className="px-8 py-6 text-right">
                                                            <NumericInput
                                                                className={`!w-28 !py-3 !px-4 !text-right !rounded-2xl !font-black !text-lg !outline-none !transition-all !border-2 ${inCart ? '!border-pp-gold !bg-pp-gold/10 !text-pp-brown' : '!border-gray-100 dark:!border-white/5 !bg-gray-50 focus:!border-pp-gold/30'}`}
                                                                value={cart[item.id] || 0}
                                                                onChange={val => updateCart(item.id, val.toString())}
                                                            />
                                                        </td>
                                                    </tr>
                                                )
                                            })}
                                            {filteredInventory.length === 0 && !loading && (
                                                <tr>
                                                    <td colSpan={4} className="px-8 py-16 text-center">
                                                        <div className="flex flex-col items-center gap-3">
                                                            <Info className="h-10 w-10 text-gray-300" />
                                                            <p className="text-xs font-black text-gray-400 uppercase tracking-widest">No se encontraron insumos vinculados</p>
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        ) : (
                            <div className="flex-1 flex flex-col items-center justify-center text-center opacity-40 py-20">
                                <Wand2 size={80} className="mb-6 text-pp-gold" />
                                <h3 className="text-xl font-black text-gray-900 uppercase tracking-tighter">Selecciona Proveeder y Sede</h3>
                                <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mt-2">Para habilitar el catálogo dinámico de insumos</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Panel: Summary & Global Actions (2/5) */}
                <div className="w-full md:w-[450px] bg-gray-50/50 dark:bg-slate-800/10 p-10 flex flex-col justify-between">
                    <div className="flex-1 space-y-10">
                        {/* Summary Identity Card */}
                        <div className="bg-pp-brown p-8 rounded-[2.8rem] text-white shadow-2xl relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-10 opacity-10 translate-x-4 -translate-y-4 group-hover:scale-110 transition-transform duration-700">
                                <Truck size={120} />
                            </div>
                            <div className="relative z-10 space-y-8">
                                <div className="flex justify-between items-start">
                                    <Badge className="bg-white/10 text-pp-gold border-white/10 font-black text-[10px] uppercase tracking-widest px-4 py-1">
                                        Resumen Pedido
                                    </Badge>
                                    <div className="flex flex-col items-end">
                                        <p className="text-[9px] font-black text-white/40 uppercase tracking-widest mb-1">Estado</p>
                                        <Badge variant="warning" className="font-black text-[10px] uppercase">PENDIENTE</Badge>
                                    </div>
                                </div>

                                <div>
                                    <p className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] mb-1">Items en Carrito</p>
                                    <p className="text-5xl font-black font-display italic text-pp-gold tracking-tighter leading-none">
                                        {Object.keys(cart).length} <span className="text-sm font-black -ml-2">UDs</span>
                                    </p>
                                </div>

                                <div className="h-px bg-white/10 w-full" />

                                <div className="space-y-4 max-h-64 overflow-y-auto custom-scrollbar pr-2">
                                    {Object.entries(cart).map(([id, qty]) => {
                                        const item = inventory.find(i => i.id === id)
                                        if (!item) return null
                                        return (
                                            <div key={id} className="flex items-center justify-between group/row">
                                                <div className="flex items-center gap-3">
                                                    <div className="h-10 w-10 rounded-xl bg-white/10 flex items-center justify-center font-black text-xs text-pp-gold">
                                                        x{qty}
                                                    </div>
                                                    <div>
                                                        <p className="text-[10px] font-black uppercase text-white leading-tight">{item.name}</p>
                                                        <p className="text-[8px] font-bold text-white/40 uppercase font-mono">{item.sku}</p>
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() => updateCart(id, '0')}
                                                    className="p-2 text-white/10 hover:text-red-400 transition-colors"
                                                    title="Quitar del pedido"
                                                >
                                                    <X size={14} />
                                                </button>
                                            </div>
                                        )
                                    })}
                                    {Object.keys(cart).length === 0 && (
                                        <div className="py-10 text-center opacity-20">
                                            <ShoppingCart size={40} className="mx-auto mb-2" />
                                            <p className="text-[10px] font-black uppercase tracking-widest">Pedido Vacío</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Order Meta */}
                        <div className="space-y-6">
                            <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] flex items-center justify-between">
                                <span>Detalles Complementarios</span>
                                <Info size={14} className="opacity-40" />
                            </h3>

                            <div className="space-y-4">
                                <div className="flex items-center gap-4 bg-white dark:bg-slate-800 p-5 rounded-3xl border border-gray-100 dark:border-white/5 shadow-sm">
                                    <div className="h-10 w-10 rounded-xl bg-gray-100 dark:bg-slate-700 flex items-center justify-center text-gray-400">
                                        <Store size={20} />
                                    </div>
                                    <div>
                                        <p className="text-[9px] font-black text-gray-400 uppercase leading-none mb-1">Sucursal Origen</p>
                                        <p className="text-sm font-black text-gray-900 dark:text-white uppercase truncate max-w-[200px]">
                                            {branches.find(b => b.id === selectedBranchId)?.name || 'Sin Selección'}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4 bg-white dark:bg-slate-800 p-5 rounded-3xl border border-gray-100 dark:border-white/5 shadow-sm">
                                    <div className="h-10 w-10 rounded-xl bg-gray-100 dark:bg-slate-700 flex items-center justify-center text-gray-400">
                                        <Calculator size={20} />
                                    </div>
                                    <div>
                                        <p className="text-[9px] font-black text-gray-400 uppercase leading-none mb-1">Protocolo Costos</p>
                                        <p className="text-sm font-black text-gray-900 dark:text-white uppercase">Valores en $0 (Recepción Requerida)</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Final Action Area */}
                    <div className="mt-10 pt-8 border-t border-gray-100 dark:border-white/5 flex flex-col gap-4 sticky bottom-0 bg-white/50 dark:bg-slate-900/50 backdrop-blur-md">
                        {error && (
                            <div className="bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-800/20 p-4 rounded-2xl flex items-center gap-3 text-red-600 dark:text-red-400 text-xs font-bold uppercase">
                                <AlertCircle size={16} /> {error}
                            </div>
                        )}
                        <Button
                            onClick={handleSubmit}
                            disabled={loading || !selectedSupplierId || Object.keys(cart).length === 0}
                            className="w-full h-16 rounded-[2rem] bg-pp-brown text-pp-gold font-black uppercase tracking-[0.15em] flex items-center justify-center gap-3 shadow-2xl shadow-pp-brown/20 hover:scale-[1.02] transition-all border-none"
                        >
                            {loading ? <Loader2 className="animate-spin" /> : <><CheckCircle2 size={24} /> {initialOrderId ? 'Actualizar Orden' : 'Generar Orden Pedido'}</>}
                        </Button>
                        <Button
                            onClick={onCancel}
                            variant="ghost"
                            className="w-full h-14 rounded-2xl font-black text-xs uppercase tracking-widest text-gray-400"
                        >
                            Volver / Cancelar
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    )
}
