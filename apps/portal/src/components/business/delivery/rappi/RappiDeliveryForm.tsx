'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { X, Upload, Plus, Trash2, ShoppingBag } from 'lucide-react'
import Button from '@/components/ui/Button'

import { RappiDelivery } from '@panpanocha/types'

interface RappiDeliveryFormProps {
    initialData?: RappiDelivery | null
    onSuccess: () => void
    onCancel: () => void
}

export default function RappiDeliveryForm({ initialData, onSuccess, onCancel }: RappiDeliveryFormProps) {
    const [loading, setLoading] = useState(false)
    const [branches, setBranches] = useState<any[]>([])
    const [products, setProducts] = useState<any[]>([])

    // Form Data
    const [formData, setFormData] = useState({
        rappi_order_id: initialData?.rappi_order_id || '',
        branch_id: initialData?.branch_id || '',
        status: initialData?.status || 'pending',
        notes: initialData?.notes || ''
    })

    // Product Cart: { productId: quantity }
    const [cart, setCart] = useState<Record<string, number>>({})

    // File States
    const [ticketProof, setTicketProof] = useState<File | null>(null)
    const [ticketProofUrl, setTicketProofUrl] = useState(initialData?.ticket_url || '')

    const [orderReadyProof, setOrderReadyProof] = useState<File | null>(null)
    const [orderReadyProofUrl, setOrderReadyProofUrl] = useState(initialData?.order_ready_url || '')

    useEffect(() => {
        fetchInitialData()
    }, [])

    useEffect(() => {
        if (initialData) {
            setFormData({
                rappi_order_id: initialData.rappi_order_id || '',
                branch_id: initialData.branch_id || '',
                status: initialData.status || 'pending',
                notes: initialData.notes || ''
            })
            setTicketProofUrl(initialData.ticket_url || '')
            setOrderReadyProofUrl(initialData.order_ready_url || '')
            setTicketProof(null)
            setOrderReadyProof(null)

            if (initialData.product_details) {
                try {
                    const parsed = typeof initialData.product_details === 'string'
                        ? JSON.parse(initialData.product_details)
                        : initialData.product_details

                    if (Array.isArray(parsed)) {
                        const loadedCart: Record<string, number> = {}
                        parsed.forEach((p: any) => loadedCart[p.id] = p.quantity)
                        setCart(loadedCart)
                    }
                } catch (e) {
                    console.log('Legacy product details:', initialData.product_details)
                }
            } else {
                setCart({})
            }
        }
    }, [initialData])

    const fetchInitialData = async () => {
        const { data: br } = await supabase.from('branches').select('id, name').eq('is_active', true)
        if (br) setBranches(br)

        const { data: pr } = await supabase.from('products').select('id, name, price').eq('is_active', true).order('name')
        if (pr) setProducts(pr)
    }

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'ticket' | 'order_ready') => {
        const file = e.target.files?.[0]
        if (file) {
            if (type === 'ticket') {
                setTicketProof(file)
                setTicketProofUrl(URL.createObjectURL(file))
            } else {
                setOrderReadyProof(file)
                setOrderReadyProofUrl(URL.createObjectURL(file))
            }
        }
    }

    const uploadFile = async (file: File) => {
        const fileExt = file.name.split('.').pop()
        const fileName = `rappi_${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`
        const filePath = `${fileName}`

        // Using 'receipts' bucket
        const { error: uploadError } = await supabase.storage
            .from('receipts')
            .upload(filePath, file)

        if (uploadError) throw uploadError

        const { data: { publicUrl } } = supabase.storage
            .from('receipts')
            .getPublicUrl(filePath)

        return publicUrl
    }

    const addToCart = (productId: string) => {
        setCart(prev => ({
            ...prev,
            [productId]: (prev[productId] || 0) + 1
        }))
    }

    const removeFromCart = (productId: string) => {
        setCart(prev => {
            const next = { ...prev }
            delete next[productId]
            return next
        })
    }

    const updateQuantity = (productId: string, qty: number) => {
        if (qty <= 0) {
            removeFromCart(productId)
        } else {
            setCart(prev => ({ ...prev, [productId]: qty }))
        }
    }

    const calculateProductTotal = () => {
        let total = 0
        Object.entries(cart).forEach(([id, qty]) => {
            const prod = products.find(p => p.id === id)
            if (prod) total += (prod.price * qty)
        })
        return total
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        try {
            let finalTicketUrl = ticketProofUrl
            let finalOrderReadyUrl = orderReadyProofUrl

            if (ticketProof) {
                finalTicketUrl = await uploadFile(ticketProof)
            }
            if (orderReadyProof) {
                finalOrderReadyUrl = await uploadFile(orderReadyProof)
            }

            const productList = Object.entries(cart).map(([id, qty]) => {
                const prod = products.find(p => p.id === id)
                return {
                    id,
                    name: prod?.name || 'Unknown',
                    quantity: qty,
                    price: prod?.price || 0
                }
            })

            const { data: { user } } = await supabase.auth.getUser()

            const dataToSave: any = {
                ...formData,
                product_details: JSON.stringify(productList),
                ticket_url: finalTicketUrl || null,
                order_ready_url: finalOrderReadyUrl || null,
                total_value: calculateProductTotal()
            }

            if (initialData?.id) {
                dataToSave.last_edited_at = new Date().toISOString()
                if (user) dataToSave.last_edited_by = user.id
                dataToSave.last_edit_type = 'manual'

                const { error } = await supabase
                    .from('rappi_deliveries')
                    .update(dataToSave)
                    .eq('id', initialData.id)
                if (error) throw error
            } else {
                if (user) dataToSave.last_edited_by = user.id
                dataToSave.status = 'pending'
                const { error } = await supabase
                    .from('rappi_deliveries')
                    .insert([dataToSave])
                if (error) throw error
            }

            onSuccess()
        } catch (error: any) {
            console.error(error)
            alert('Error al guardar: ' + error.message)
        } finally {
            setLoading(false)
        }
    }

    const inputClassName = "w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF441F] focus:border-[#FF441F] outline-none transition-all font-sans"
    const labelClassName = "block text-sm font-bold text-gray-700 mb-1 font-display uppercase tracking-wide"

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className={labelClassName}>ID Pedido Rappi *</label>
                    <input
                        type="text"
                        required
                        value={formData.rappi_order_id}
                        onChange={(e) => setFormData({ ...formData, rappi_order_id: e.target.value })}
                        className={inputClassName}
                        placeholder="# Orden Rappi"
                    />
                </div>
                <div>
                    <label className={labelClassName}>Sede de Salida *</label>
                    <select
                        required
                        value={formData.branch_id}
                        onChange={(e) => setFormData({ ...formData, branch_id: e.target.value })}
                        className={inputClassName}
                    >
                        <option value="">Seleccionar Sede</option>
                        {branches.map(b => (
                            <option key={b.id} value={b.id}>{b.name}</option>
                        ))}
                    </select>
                </div>
            </div>

            <div className="border-t border-gray-100 pt-4">
                <label className={labelClassName}>Productos *</label>
                <div className="flex gap-2 mb-4">
                    <select
                        className={inputClassName}
                        onChange={(e) => {
                            if (e.target.value) {
                                addToCart(e.target.value)
                                e.target.value = ''
                            }
                        }}
                    >
                        <option value="">Agregar producto...</option>
                        {products.map(p => (
                            <option key={p.id} value={p.id}>{p.name} - ${p.price}</option>
                        ))}
                    </select>
                </div>

                <div className="bg-gray-50 rounded-xl p-4 space-y-2 border border-gray-200">
                    {Object.keys(cart).length === 0 && (
                        <div className="text-center text-gray-400 py-4 text-sm">
                            No hay productos seleccionados
                        </div>
                    )}
                    {Object.entries(cart).map(([id, qty]) => {
                        const prod = products.find(p => p.id === id)
                        if (!prod) return null
                        return (
                            <div key={id} className="flex items-center justify-between bg-white p-3 rounded-lg shadow-sm">
                                <div>
                                    <span className="font-medium text-gray-700">{prod.name}</span>
                                    <p className="text-xs text-gray-400">${prod.price} c/u</p>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="flex items-center border rounded-lg overflow-hidden">
                                        <button type="button" onClick={() => updateQuantity(id, qty - 1)} className="px-2 py-1 hover:bg-gray-100 text-gray-600 font-bold">-</button>
                                        <span className="px-2 py-1 bg-white font-mono text-sm w-8 text-center">{qty}</span>
                                        <button type="button" onClick={() => updateQuantity(id, qty + 1)} className="px-2 py-1 hover:bg-gray-100 text-gray-600 font-bold">+</button>
                                    </div>
                                    <button type="button" onClick={() => removeFromCart(id)} className="text-red-400 hover:text-red-600"><Trash2 className="h-4 w-4" /></button>
                                </div>
                            </div>
                        )
                    })}
                    {Object.keys(cart).length > 0 && (
                        <div className="flex justify-between items-center pt-2 mt-2 border-t border-gray-200 text-sm">
                            <span className="font-bold text-gray-500">Valor Productos:</span>
                            <span className="font-bold text-gray-800">${calculateProductTotal().toLocaleString()}</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Proofs Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-gray-100">
                {/* Comanda */}
                <div>
                    <label className={labelClassName}>Foto Comanda *</label>
                    <div className="mt-2">
                        <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors">
                            <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                <Upload className="w-8 h-8 mb-2 text-gray-400" />
                                <p className="text-xs text-center text-gray-500 font-sans">Subir Comanda</p>
                            </div>
                            <input type="file" className="hidden" accept="image/*" onChange={(e) => handleFileChange(e, 'ticket')} />
                        </label>
                        {ticketProofUrl && (
                            <div className="mt-2 relative h-20 w-full bg-gray-100 rounded-lg overflow-hidden border border-gray-200">
                                <img src={ticketProofUrl} className="w-full h-full object-cover" />
                                <button type="button" onClick={() => { setTicketProof(null); setTicketProofUrl('') }} className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1"><X className="h-3 w-3" /></button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Pedido Listo */}
                <div>
                    <label className={labelClassName}>Foto Pedido Listo *</label>
                    <div className="mt-2">
                        <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors">
                            <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                <Upload className="w-8 h-8 mb-2 text-gray-400" />
                                <p className="text-xs text-center text-gray-500 font-sans">Subir Pedido Empacado</p>
                            </div>
                            <input type="file" className="hidden" accept="image/*" onChange={(e) => handleFileChange(e, 'order_ready')} />
                        </label>
                        {orderReadyProofUrl && (
                            <div className="mt-2 relative h-20 w-full bg-gray-100 rounded-lg overflow-hidden border border-gray-200">
                                <img src={orderReadyProofUrl} className="w-full h-full object-cover" />
                                <button type="button" onClick={() => { setOrderReadyProof(null); setOrderReadyProofUrl('') }} className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1"><X className="h-3 w-3" /></button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Notes */}
            <div>
                <label className={labelClassName}>Notas</label>
                <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className={`${inputClassName} min-h-[80px]`}
                    placeholder="Notas adicionales..."
                />
            </div>

            <div className="flex gap-3 pt-6 border-t mt-2">
                <Button onClick={onCancel} variant="ghost" className="flex-1">
                    Cancelar
                </Button>
                <Button type="submit" disabled={loading} className="flex-1 bg-[#FF441F] text-white hover:bg-[#FF441F]/90">
                    {loading ? 'Guardando...' : 'Guardar Pedido Rappi'}
                </Button>
            </div>
        </form>
    )
}
