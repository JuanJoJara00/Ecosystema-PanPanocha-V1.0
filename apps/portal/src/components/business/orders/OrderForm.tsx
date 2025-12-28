'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Loader2, Plus, AlertCircle, ShoppingCart, Save, Wand2, Store, Truck, Calculator } from 'lucide-react'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import Button from '@/components/ui/Button'

interface OrderFormProps {
    onSuccess: () => void
    onCancel: () => void
    initialOrderId?: string | null
}

export default function OrderForm({ onSuccess, onCancel, initialOrderId }: OrderFormProps) {
    const [loading, setLoading] = useState(false)
    const [pageLoading, setPageLoading] = useState(!!initialOrderId)
    const [error, setError] = useState<string | null>(null)

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
        const fetchInit = async () => {
            const { data: sup } = await supabase.from('suppliers').select('id, name').order('name')
            const { data: br } = await supabase.from('branches').select('id, name').order('name')
            if (sup) setSuppliers(sup)
            if (br) {
                setBranches(br)
                // Only default if NOT editing
                if (!initialOrderId && br.length > 0) setSelectedBranchId(br[0].id)
            }
        }
        fetchInit()
    }, [initialOrderId])

    // Load existing order data
    useEffect(() => {
        if (initialOrderId) {
            loadOrderData()
        }
    }, [initialOrderId])

    // Fetch Inventory when Supplier & Branch are selected
    useEffect(() => {
        if (selectedSupplierId && selectedBranchId) {
            fetchCatalog()
        }
    }, [selectedSupplierId, selectedBranchId])

    const loadOrderData = async () => {
        setPageLoading(true)
        try {
            // 1. Get Order
            const { data: order, error: orderError } = await supabase
                .from('purchase_orders')
                .select('*')
                .eq('id', initialOrderId)
                .single()

            if (orderError) throw orderError

            // 2. Set Context
            setSelectedBranchId(order.branch_id)
            setSelectedSupplierId(order.supplier_id)

            // 3. Get Items
            const { data: items, error: itemsError } = await supabase
                .from('purchase_order_items')
                .select('item_id, quantity')
                .eq('order_id', initialOrderId)

            if (itemsError) throw itemsError

            // 4. Populate Cart
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
            // Fetch items for this supplier
            const { data, error } = await supabase
                .from('inventory_items')
                .select(`
                    id, name, unit, min_stock_alert, sku
                `)
                .eq('supplier_id', selectedSupplierId)

            if (error) throw error

            // Fetch current stock
            const { data: stockData } = await supabase
                .from('branch_inventory')
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
                // UPDATE EXISTING
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

                // Delete old items to replace with new ones (simplest strategy)
                const { error: deleteError } = await supabase
                    .from('purchase_order_items')
                    .delete()
                    .eq('order_id', orderId)

                if (deleteError) throw deleteError

            } else {
                // CREATE NEW
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

            // Insert Items
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

    if (pageLoading) {
        return <div className="p-8 text-center text-gray-500">Cargando datos del pedido...</div>
    }

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Select
                    label="Sede (Destino)"
                    value={selectedBranchId}
                    onChange={e => setSelectedBranchId(e.target.value)}
                    disabled={!!initialOrderId}
                    options={branches.map(b => ({ value: b.id, label: b.name }))}
                />

                <Select
                    label="Proveedor"
                    value={selectedSupplierId}
                    onChange={e => setSelectedSupplierId(e.target.value)}
                    disabled={!!initialOrderId}
                    options={suppliers.map(s => ({ value: s.id, label: s.name }))}
                />
            </div>

            {selectedSupplierId && (
                <div className="border border-pp-brown/10 rounded-xl overflow-hidden shadow-sm">
                    <div className="bg-pp-cream px-4 py-3 border-b border-pp-brown/10 flex justify-between items-center">
                        <div>
                            <h3 className="font-bold text-pp-brown font-display uppercase tracking-wide text-sm">Catálogo de Insumos</h3>
                            <span className="text-xs text-pp-brown/70">
                                Inventario disponible en {branches.find(b => b.id === selectedBranchId)?.name}
                            </span>
                        </div>
                        <Button
                            onClick={handleSuggestOrder}
                            variant="secondary"
                            size="sm"
                            startIcon={<Wand2 className="h-3 w-3" />}
                            title="Rellenar automáticamente cantidades faltantes"
                        >
                            Sugerir Pedido
                        </Button>
                    </div>

                    <div className="max-h-[400px] overflow-y-auto bg-white">
                        <table className="w-full text-left">
                            <thead className="bg-gray-50/50 sticky top-0 backdrop-blur-sm">
                                <tr className="text-xs font-bold text-pp-brown/60 font-display uppercase tracking-wider">
                                    <th className="px-4 py-2">Item</th>
                                    <th className="px-4 py-2 text-center text-pp-gold" title="Stock Mínimo Requerido">Min.</th>
                                    <th className="px-4 py-2 text-center">Stock</th>
                                    <th className="px-4 py-2 text-right">Cantidad</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {inventory.map(item => {
                                    const isLowStock = item.current_stock <= item.min_stock_alert
                                    const inCart = cart[item.id] > 0
                                    return (
                                        <tr key={item.id} className={isLowStock ? "bg-red-50/50" : ""}>
                                            <td className="px-4 py-3">
                                                <div className="font-medium text-gray-800">{item.name}</div>
                                                <div className="text-xs text-gray-500">{item.sku} • {item.unit}</div>
                                            </td>
                                            <td className="px-4 py-3 text-center text-xs font-bold text-pp-brown bg-pp-gold/10 border-r border-dashed border-pp-gold/30">
                                                {item.min_stock_alert}
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <span className={`px-2 py-1 rounded-full text-xs font-bold font-mono ${isLowStock ? 'text-red-700 bg-red-100' : 'text-gray-600 bg-gray-100'}`}>
                                                    {item.current_stock}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <div className="flex justify-end">
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        step="1"
                                                        placeholder="0"
                                                        className={`w-20 p-2 text-right border rounded-lg focus:ring-2 outline-none font-bold transition-all ${inCart ? 'border-pp-gold ring-2 ring-pp-gold/20 bg-pp-gold/5 text-pp-brown' : 'border-gray-200 focus:border-pp-gold focus:ring-pp-gold/20'}`}
                                                        value={cart[item.id] || ''}
                                                        onChange={(e) => updateCart(item.id, e.target.value)}
                                                    />
                                                </div>
                                            </td>
                                        </tr>
                                    )
                                })}
                                {inventory.length === 0 && (
                                    <tr>
                                        <td colSpan={4} className="px-4 py-8 text-center text-gray-500">
                                            {loading ? 'Cargando catálogo...' : 'No hay insumos disponibles.'}
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {error && (
                <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" /> {error}
                </div>
            )}

            <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <Button
                    onClick={onCancel}
                    variant="ghost"
                    disabled={loading}
                >
                    Cancelar
                </Button>
                <Button
                    onClick={handleSubmit}
                    isLoading={loading}
                    disabled={loading || !selectedSupplierId || Object.keys(cart).length === 0}
                    startIcon={initialOrderId ? <Save className="h-4 w-4" /> : <ShoppingCart className="h-4 w-4" />}
                >
                    {initialOrderId ? 'Guardar Cambios' : `Crear Pedido (${Object.keys(cart).length})`}
                </Button>
            </div>
        </div>
    )
}
