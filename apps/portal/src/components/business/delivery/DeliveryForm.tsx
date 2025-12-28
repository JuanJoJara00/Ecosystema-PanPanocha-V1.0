'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { X, Upload, Plus, Trash2, ShoppingBag } from 'lucide-react'
import Button from '@/components/ui/Button'
import Select from '@/components/ui/Select'

interface DeliveryFormProps {
    initialData?: any
    onSuccess: () => void
    onCancel: () => void
}

export default function DeliveryForm({ initialData, onSuccess, onCancel }: DeliveryFormProps) {
    const [loading, setLoading] = useState(false)
    const [branches, setBranches] = useState<any[]>([])
    const [products, setProducts] = useState<any[]>([])

    // File States
    const [clientProof, setClientProof] = useState<File | null>(null)
    const [receiptProof, setReceiptProof] = useState<File | null>(null)

    // Preview States
    const [clientProofUrl, setClientProofUrl] = useState(initialData?.client_payment_proof_url || '')
    const [receiptProofUrl, setReceiptProofUrl] = useState(initialData?.delivery_receipt_url || '')

    // Form Data
    const [formData, setFormData] = useState({
        delivery_fee: initialData?.delivery_fee || 0,
        branch_id: initialData?.branch_id || '',
        assigned_driver: initialData?.assigned_driver || '',
        status: initialData?.status || 'pending',
        notes: initialData?.notes || ''
    })

    // Product Cart: { productId: quantity }
    const [cart, setCart] = useState<Record<string, number>>({})

    useEffect(() => {
        fetchInitialData()
    }, [])

    useEffect(() => {
        if (initialData) {
            setFormData({
                delivery_fee: initialData.delivery_fee || 0,
                branch_id: initialData.branch_id || '',
                assigned_driver: initialData.assigned_driver || '',
                status: initialData.status || 'pending',
                notes: initialData.notes || ''
            })
            setClientProofUrl(initialData.client_payment_proof_url || '')
            setReceiptProofUrl(initialData.delivery_receipt_url || '')
            setClientProof(null)
            setReceiptProof(null)

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
        } else {
            // Reset for new entry
            setFormData({
                delivery_fee: 0,
                branch_id: '',
                assigned_driver: '',
                status: 'pending',
                notes: ''
            })
            setClientProofUrl('')
            setReceiptProofUrl('')
            setClientProof(null)
            setReceiptProof(null)
            setCart({})
        }
    }, [initialData])

    const fetchInitialData = async () => {
        const { data: br } = await supabase.from('branches').select('id, name').eq('is_active', true)
        if (br) setBranches(br)

        const { data: pr } = await supabase.from('products').select('id, name, price').eq('is_active', true).order('name')
        if (pr) setProducts(pr)
    }

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'client' | 'receipt') => {
        const file = e.target.files?.[0]
        if (file) {
            if (type === 'client') {
                setClientProof(file)
                setClientProofUrl(URL.createObjectURL(file))
            } else {
                setReceiptProof(file)
                setReceiptProofUrl(URL.createObjectURL(file))
            }
        }
    }

    const uploadFile = async (file: File, path: string) => {
        const fileExt = file.name.split('.').pop()
        const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`
        const filePath = `${path}/${fileName}`

        const { error: uploadError } = await supabase.storage
            .from('payment_proofs')
            .upload(filePath, file)

        if (uploadError) throw uploadError

        const { data: { publicUrl } } = supabase.storage
            .from('payment_proofs')
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

    // Calculations
    const calculateProductTotal = () => {
        let total = 0
        Object.entries(cart).forEach(([id, qty]) => {
            const prod = products.find(p => p.id === id)
            if (prod) total += (prod.price * qty)
        })
        return total
    }

    const grandTotal = calculateProductTotal() + (formData.delivery_fee || 0)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        console.log('Starting submission...')

        try {
            let clientUrl = clientProofUrl
            let receiptUrl = receiptProofUrl

            if (clientProof) {
                console.log('Uploading client proof...')
                clientUrl = await uploadFile(clientProof, 'delivery_client_payments')
                console.log('Client proof uploaded:', clientUrl)
            }
            if (receiptProof) {
                console.log('Uploading receipt proof...')
                receiptUrl = await uploadFile(receiptProof, 'delivery_receipts')
                console.log('Receipt proof uploaded:', receiptUrl)
            }

            // Prepare products JSON
            const productList = Object.entries(cart).map(([id, qty]) => {
                const prod = products.find(p => p.id === id)
                return {
                    id,
                    name: prod?.name || 'Unknown',
                    quantity: qty,
                    price: prod?.price || 0
                }
            })

            // Auto-calculate status
            const finalClientUrl = clientUrl || null
            const finalReceiptUrl = receiptUrl || null
            const autoStatus = (finalClientUrl && finalReceiptUrl) ? 'delivered' : 'pending'

            // Get Current User
            const { data: { user } } = await supabase.auth.getUser()

            const dataToSave: any = {
                ...formData,
                status: autoStatus,
                branch_id: formData.branch_id || null,
                customer_name: 'Cliente General',
                customer_phone: '',
                customer_address: 'Sede',
                product_details: JSON.stringify(productList),
                client_payment_proof_url: finalClientUrl,
                delivery_receipt_url: finalReceiptUrl,
                notes: formData.notes
            }

            console.log('Data to be saved:', dataToSave)

            if (initialData?.id) {
                console.log('Updating existing record...')
                // Add Edit Tracking
                dataToSave.last_edited_at = new Date().toISOString()
                if (user) dataToSave.last_edited_by = user.id

                const { error } = await supabase
                    .from('deliveries')
                    .update(dataToSave)
                    .eq('id', initialData.id)
                if (error) {
                    console.error('Supabase UPDATE error:', error)
                    throw error
                }
            } else {
                console.log('Inserting new record...')
                if (user) dataToSave.last_edited_by = user.id // Also track creator if desired, or just leave it for updates
                const { error } = await supabase
                    .from('deliveries')
                    .insert([dataToSave])
                if (error) {
                    console.error('Supabase INSERT error:', error)
                    throw error
                }
            }
            console.log('Save successful!')
            onSuccess()
        } catch (error: any) {
            console.error('FULL ERROR OBJECT:', error)
            const errorMsg = error.message || error.error_description || error.description || JSON.stringify(error)
            alert(`Error al guardar: ${errorMsg}. Revisar consola para más detalles.`)
        } finally {
            setLoading(false)
        }
    }

    const inputClassName = "w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pp-gold focus:border-pp-gold outline-none transition-all font-sans"
    const labelClassName = "block text-sm font-bold text-gray-700 mb-1 font-display uppercase tracking-wide"

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            {/* Context Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className={labelClassName}>Sede de Salida</label>
                    <select
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

                <div>
                    <label className={labelClassName}>Domiciliario</label>
                    <input
                        type="text"
                        value={formData.assigned_driver}
                        onChange={(e) => setFormData({ ...formData, assigned_driver: e.target.value })}
                        className={inputClassName}
                        placeholder="Nombre del repartidor"
                    />
                </div>
            </div>

            {/* Product Selection */}
            <div className="border-t border-gray-100 pt-4">
                <label className={labelClassName}>Productos Vendidos *</label>
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

                {/* Cart List */}
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
                                        <button
                                            type="button"
                                            onClick={() => updateQuantity(id, qty - 1)}
                                            className="px-2 py-1 hover:bg-gray-100 text-gray-600 font-bold"
                                        >-</button>
                                        <span className="px-2 py-1 bg-white font-mono text-sm w-8 text-center">{qty}</span>
                                        <button
                                            type="button"
                                            onClick={() => updateQuantity(id, qty + 1)}
                                            className="px-2 py-1 hover:bg-gray-100 text-gray-600 font-bold"
                                        >+</button>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => removeFromCart(id)}
                                        className="text-red-400 hover:text-red-600"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </button>
                                </div>
                            </div>
                        )
                    })}

                    {/* Subtotal */}
                    {Object.keys(cart).length > 0 && (
                        <div className="flex justify-between items-center pt-2 mt-2 border-t border-gray-200 text-sm">
                            <span className="font-bold text-gray-500">Valor Productos:</span>
                            <span className="font-bold text-gray-800">${calculateProductTotal().toLocaleString()}</span>
                        </div>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-gray-100">
                <div>
                    <label className={labelClassName}>Costo Domicilio (COP) *</label>
                    <input
                        type="number"
                        required
                        min="0"
                        step="100"
                        value={formData.delivery_fee}
                        onChange={(e) => setFormData({ ...formData, delivery_fee: parseFloat(e.target.value) || 0 })}
                        className={inputClassName}
                    />
                </div>


                {/* Total Display Block */}
                <div className="bg-pp-gold/10 rounded-xl p-4 border border-pp-gold/30 flex flex-col justify-center">
                    <span className="text-xs font-bold text-pp-brown uppercase tracking-widest text-center mb-1">Total a Verificar</span>
                    <span className="text-2xl font-bold text-pp-brown text-center font-mono">
                        ${grandTotal.toLocaleString()}
                    </span>
                    <span className="text-[10px] text-center text-pp-brown/60">(Productos + Domicilio)</span>
                </div>
            </div>

            {/* Notes Field */}
            <div>
                <label className={labelClassName}>Notas / Detalles</label>
                <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className={`${inputClassName} min-h-[80px]`}
                    placeholder="Detalles adicionales o cambios realizados..."
                />
            </div>

            {/* File Uploads */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-gray-100">
                {/* Client Payment Proof */}
                <div>
                    <label className={labelClassName}>Pago del Cliente (Comprobante)</label>
                    <div className="mt-2">
                        <div className="flex items-center justify-center w-full">
                            <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors">
                                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                    <Upload className="w-8 h-8 mb-2 text-gray-400" />
                                    <p className="text-xs text-gray-500 font-sans">Click para subir</p>
                                </div>
                                <input type="file" className="hidden" accept="image/*" onChange={(e) => handleFileChange(e, 'client')} />
                            </label>
                        </div>
                        {clientProofUrl && (
                            <div className="mt-2 relative h-20 w-full bg-gray-100 rounded-lg overflow-hidden border border-gray-200">
                                <img src={clientProofUrl} className="w-full h-full object-cover" />
                                <button type="button" onClick={() => { setClientProof(null); setClientProofUrl('') }} className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1"><X className="h-3 w-3" /></button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Receipt Proof */}
                <div>
                    <label className={labelClassName}>Recibo Caja Menor (Pago Domiciliario)</label>
                    <div className="mt-2">
                        <div className="flex items-center justify-center w-full">
                            <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors">
                                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                    <Upload className="w-8 h-8 mb-2 text-gray-400" />
                                    <p className="text-xs text-gray-500 font-sans">Click para subir</p>
                                </div>
                                <input type="file" className="hidden" accept="image/*" onChange={(e) => handleFileChange(e, 'receipt')} />
                            </label>
                        </div>
                        {receiptProofUrl && (
                            <div className="mt-2 relative h-20 w-full bg-gray-100 rounded-lg overflow-hidden border border-gray-200">
                                <img src={receiptProofUrl} className="w-full h-full object-cover" />
                                <button type="button" onClick={() => { setReceiptProof(null); setReceiptProofUrl('') }} className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1"><X className="h-3 w-3" /></button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="flex gap-3 pt-6 border-t mt-2">
                <Button onClick={onCancel} variant="ghost" className="flex-1">
                    Cancelar
                </Button>
                <Button type="submit" disabled={loading} className="flex-1 bg-pp-gold text-pp-brown hover:bg-pp-gold/80">
                    {loading ? 'Guardando...' : 'Guardar Domicilio'}
                </Button>
            </div>
        </form>
    )
}
