'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import {
    X,
    Upload,
    Plus,
    Trash2,
    ShoppingBag,
    Truck,
    Calendar,
    MapPin,
    Info,
    DollarSign,
    CheckCircle2,
    Clock,
    Camera,
    ChevronRight,
    Search,
    AlertCircle
} from 'lucide-react'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'

import { RappiDelivery } from '@panpanocha/types'

interface RappiDeliveryFormProps {
    initialData?: RappiDelivery | null
    onSuccess: () => void
    onCancel: () => void
    isOpen: boolean
}

export default function RappiDeliveryForm({ initialData, onSuccess, onCancel, isOpen }: RappiDeliveryFormProps) {
    const [loading, setLoading] = useState(false)
    const [branches, setBranches] = useState<any[]>([])
    const [products, setProducts] = useState<any[]>([])
    const [searchProduct, setSearchProduct] = useState('')

    // Form Data
    const [formData, setFormData] = useState({
        rappi_order_id: initialData?.rappi_order_id || '',
        branch_id: initialData?.branch_id || '',
        status: initialData?.status || 'pending',
        notes: initialData?.notes || '',
        customer_name: initialData?.customer_name || ''
    })

    // Product Cart: { productId: quantity }
    const [cart, setCart] = useState<Record<string, number>>({})

    // File States
    const [ticketProof, setTicketProof] = useState<File | null>(null)
    const [ticketProofUrl, setTicketProofUrl] = useState(initialData?.ticket_url || '')

    const [orderReadyProof, setOrderReadyProof] = useState<File | null>(null)
    const [orderReadyProofUrl, setOrderReadyProofUrl] = useState(initialData?.order_ready_url || '')

    useEffect(() => {
        if (isOpen) fetchInitialData()
    }, [isOpen])

    useEffect(() => {
        if (initialData && isOpen) {
            setFormData({
                rappi_order_id: initialData.rappi_order_id || '',
                branch_id: initialData.branch_id || '',
                status: initialData.status || 'pending',
                notes: initialData.notes || '',
                customer_name: initialData.customer_name || ''
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
        } else if (isOpen) {
            // Reset for new entry
            setFormData({
                rappi_order_id: '',
                branch_id: '',
                status: 'pending',
                notes: '',
                customer_name: ''
            })
            setCart({})
            setTicketProofUrl('')
            setOrderReadyProofUrl('')
        }
    }, [initialData, isOpen])

    const fetchInitialData = async () => {
        const { data: br } = await supabase.from('branches').select('id, name').eq('is_active', true)
        if (br) setBranches(br)

        const { data: pr } = await supabase.from('products').select('id, name, price, category').eq('is_active', true).order('name')
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
        if (Object.keys(cart).length === 0) {
            alert('Debes agregar al menos un producto.')
            return
        }
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

    if (!isOpen) return null

    const filteredProducts = products.filter(p =>
        p.name.toLowerCase().includes(searchProduct.toLowerCase()) ||
        p.category?.toLowerCase().includes(searchProduct.toLowerCase())
    )

    return (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50 backdrop-blur-md animate-in fade-in duration-300">
            <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl rounded-[2.5rem] shadow-2xl w-full max-w-6xl overflow-hidden flex flex-col md:flex-row max-h-[90vh] animate-in zoom-in-95 duration-300 border border-white/20">

                {/* Left Panel: Primary Data & Cart (3/5) */}
                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto custom-scrollbar border-r border-gray-100 dark:border-white/5 bg-white dark:bg-slate-900 flex flex-col">

                    {/* Header */}
                    <div className="p-10 border-b border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-slate-800/20 flex items-center justify-between sticky top-0 z-10 backdrop-blur-md">
                        <div className="flex items-center gap-5">
                            <div className="h-16 w-16 rounded-2xl bg-[#FF441F] flex items-center justify-center text-white shadow-lg shadow-[#FF441F]/20">
                                <ShoppingBag size={32} />
                            </div>
                            <div>
                                <h2 className="text-3xl font-black text-gray-900 dark:text-white uppercase tracking-tighter font-display leading-none">
                                    {initialData ? 'Editar Pedido Rappi' : 'Nuevo Pedido Rappi'}
                                </h2>
                                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1.5 flex items-center gap-2">
                                    <Truck size={14} className="text-[#FF441F]" /> Plataforma Rappi Marketplace
                                </p>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={onCancel}
                            title="Cerrar formulario"
                            className="p-3 hover:bg-white dark:hover:bg-slate-800 rounded-full text-gray-400 transition-all border border-transparent hover:border-gray-100 dark:hover:border-white/5"
                        >
                            <X size={24} />
                        </button>
                    </div>

                    <div className="p-10 space-y-12 flex-1">

                        {/* Section 1: Basic Info */}
                        <div className="grid grid-cols-2 gap-8">
                            <div className="space-y-3">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-2">ID Orden Rappi</label>
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none text-gray-400 group-focus-within:text-[#FF441F] transition-colors">
                                        <Info size={18} />
                                    </div>
                                    <input
                                        required
                                        type="text"
                                        title="ID de Orden Rappi"
                                        value={formData.rappi_order_id}
                                        onChange={e => setFormData({ ...formData, rappi_order_id: e.target.value })}
                                        placeholder="Ej: #1234567"
                                        className="w-full pl-12 pr-5 py-4 bg-gray-50 dark:bg-slate-800/50 border border-gray-100 dark:border-white/5 rounded-2xl font-black text-gray-900 dark:text-white uppercase tracking-wider focus:bg-white dark:focus:bg-slate-800 focus:ring-4 focus:ring-[#FF441F]/10 focus:border-[#FF441F]/30 outline-none transition-all"
                                    />
                                </div>
                            </div>

                            <div className="space-y-3">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-2">Sede de Despacho</label>
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none text-gray-400 group-focus-within:text-[#FF441F] transition-colors">
                                        <MapPin size={18} />
                                    </div>
                                    <select
                                        required
                                        title="Sede de Despacho"
                                        value={formData.branch_id}
                                        onChange={e => setFormData({ ...formData, branch_id: e.target.value })}
                                        className="w-full pl-12 pr-5 py-4 bg-gray-50 dark:bg-slate-800/50 border border-gray-100 dark:border-white/5 rounded-2xl font-black text-gray-900 dark:text-white uppercase tracking-wider focus:bg-white dark:focus:bg-slate-800 focus:ring-4 focus:ring-[#FF441F]/10 focus:border-[#FF441F]/30 outline-none appearance-none cursor-pointer transition-all"
                                    >
                                        <option value="">Seleccionar Sede</option>
                                        {branches.map(b => (
                                            <option key={b.id} value={b.id}>{b.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* Section 2: Product Selection (Mini POS Style) */}
                        <div className="space-y-6">
                            <h3 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em] flex items-center gap-2">
                                <Plus size={16} className="text-[#FF441F]" /> Selección de Productos
                            </h3>

                            <div className="relative mb-6 group">
                                <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none text-gray-400 group-focus-within:text-[#FF441F] transition-colors">
                                    <Search size={18} />
                                </div>
                                <input
                                    type="text"
                                    value={searchProduct}
                                    onChange={e => setSearchProduct(e.target.value)}
                                    placeholder="Buscar producto a agregar..."
                                    className="w-full pl-12 pr-5 py-4 bg-gray-100/50 dark:bg-slate-800/80 border-none rounded-2xl font-bold text-gray-900 dark:text-white outline-none focus:ring-4 focus:ring-[#FF441F]/10 transition-all"
                                />
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-64 overflow-y-auto custom-scrollbar p-1">
                                {filteredProducts.map(p => (
                                    <button
                                        key={p.id}
                                        type="button"
                                        onClick={() => addToCart(p.id)}
                                        className="p-4 bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-white/5 flex flex-col items-start text-left hover:scale-[1.02] hover:shadow-lg hover:border-[#FF441F]/20 transition-all group"
                                    >
                                        <span className="text-[10px] font-black text-gray-400 uppercase mb-1 tracking-widest">{p.category || 'Varios'}</span>
                                        <span className="text-sm font-black text-gray-900 dark:text-white uppercase leading-tight line-clamp-2">{p.name}</span>
                                        <span className="mt-2 text-xs font-bold text-[#FF441F] italic">${p.price.toLocaleString()}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Section 3: Notes & Meta */}
                        <div className="space-y-6">
                            <h3 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em] flex items-center gap-2">
                                <AlertCircle size={16} className="text-[#FF441F]" /> Información Adicional
                            </h3>
                            <div className="grid grid-cols-2 gap-8">
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-2">Nombre Cliente (Opcional)</label>
                                    <input
                                        type="text"
                                        value={formData.customer_name}
                                        onChange={e => setFormData({ ...formData, customer_name: e.target.value })}
                                        placeholder="Ej: Juan Perez"
                                        className="w-full px-5 py-4 bg-gray-50 dark:bg-slate-800/50 border border-gray-100 dark:border-white/5 rounded-2xl font-bold text-gray-900 dark:text-white outline-none focus:bg-white transition-all"
                                    />
                                </div>
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-2">Notas Especiales</label>
                                    <input
                                        type="text"
                                        value={formData.notes}
                                        onChange={e => setFormData({ ...formData, notes: e.target.value })}
                                        placeholder="Ej: Sin cebolla, extra salsa..."
                                        className="w-full px-5 py-4 bg-gray-50 dark:bg-slate-800/50 border border-gray-100 dark:border-white/5 rounded-2xl font-bold text-gray-900 dark:text-white outline-none focus:bg-white transition-all"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Footer Actions */}
                    <div className="p-8 border-t border-gray-100 dark:border-white/5 flex gap-4 bg-white dark:bg-slate-900/80 backdrop-blur-md sticky bottom-0">
                        <Button
                            type="button"
                            onClick={onCancel}
                            variant="ghost"
                            className="flex-1 h-14 rounded-2xl font-black text-xs uppercase tracking-widest text-gray-400"
                        >
                            Cancelar
                        </Button>
                        <Button
                            type="submit"
                            disabled={loading}
                            className="flex-[2] h-14 rounded-2xl bg-[#FF441F] text-white font-black uppercase tracking-widest shadow-xl shadow-[#FF441F]/20 flex items-center justify-center gap-3 hover:scale-[1.02] transition-all"
                        >
                            {loading ? <Loader2 className="animate-spin" /> : <><CheckCircle2 size={24} /> {initialData ? 'Actualizar Orden' : 'Publicar Orden'}</>}
                        </Button>
                    </div>
                </form>

                {/* Right Panel: Cart Summary & Evidence (2/5) */}
                <div className="w-full md:w-[450px] bg-gray-50/50 dark:bg-slate-800/10 p-10 flex flex-col justify-between">
                    <div className="flex-1 space-y-10 custom-scrollbar overflow-y-auto pr-2">

                        {/* Summary Card */}
                        <div className="space-y-6">
                            <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] flex items-center justify-between">
                                <span>Resumen del Pedido</span>
                                <ShoppingBag size={14} className="opacity-40" />
                            </h3>

                            <div className="bg-slate-900 p-8 rounded-[2.5rem] text-white shadow-2xl relative overflow-hidden group">
                                <div className="absolute top-0 right-0 p-8 opacity-5 text-white -translate-y-4 translate-x-4">
                                    <DollarSign size={80} />
                                </div>

                                <div className="relative z-10 space-y-8">
                                    <div className="space-y-1">
                                        <p className="text-[10px] font-black text-white/40 uppercase tracking-widest">Valor Total Bruto</p>
                                        <p className="text-5xl font-black font-display italic text-[#FF441F] tracking-tighter">
                                            ${calculateProductTotal().toLocaleString()}
                                        </p>
                                    </div>

                                    <div className="h-px bg-white/10 w-full" />

                                    <div className="space-y-4 max-h-48 overflow-y-auto custom-scrollbar pr-2">
                                        {Object.entries(cart).map(([id, qty]) => {
                                            const prod = products.find(p => p.id === id)
                                            if (!prod) return null
                                            return (
                                                <div key={id} className="flex items-center justify-between group/item">
                                                    <div className="flex items-center gap-3">
                                                        <div className="h-8 w-8 rounded-lg bg-white/10 flex items-center justify-center text-[10px] font-black">
                                                            x{qty}
                                                        </div>
                                                        <span className="text-xs font-bold uppercase truncate max-w-[150px]">{prod.name}</span>
                                                    </div>
                                                    <div className="flex items-center gap-3">
                                                        <span className="text-xs font-black text-white/60 font-mono">${(prod.price * qty).toLocaleString()}</span>
                                                        <button
                                                            type="button"
                                                            title="Eliminar producto"
                                                            onClick={() => removeFromCart(id)}
                                                            className="text-white/20 hover:text-red-500 transition-colors"
                                                        >
                                                            <Trash2 size={14} />
                                                        </button>
                                                    </div>
                                                </div>
                                            )
                                        })}
                                        {Object.keys(cart).length === 0 && (
                                            <p className="text-xs font-bold text-white/20 italic uppercase text-center py-4">Carrito Vacío</p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Evidence Uploads */}
                        <div className="space-y-6">
                            <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] flex items-center justify-between">
                                <span>Evidencia de Operación</span>
                                <Camera size={14} className="opacity-40" />
                            </h3>

                            <div className="grid grid-cols-2 gap-4">
                                <label className="block group cursor-pointer">
                                    <div className={`h-36 rounded-3xl border-2 border-dashed flex flex-col items-center justify-center gap-2 transition-all overflow-hidden ${ticketProofUrl ? 'border-[#FF441F]/30 bg-[#FF441F]/5' : 'border-gray-200 dark:border-white/5 hover:bg-gray-100'}`}>
                                        {ticketProofUrl ? (
                                            <img src={ticketProofUrl} className="w-full h-full object-cover" alt="Comanda" />
                                        ) : (
                                            <>
                                                <Upload size={20} className="text-gray-400" />
                                                <p className="text-[10px] font-black text-gray-400 uppercase">Comanda</p>
                                            </>
                                        )}
                                    </div>
                                    <input type="file" className="hidden" accept="image/*" onChange={e => handleFileChange(e, 'ticket')} />
                                </label>

                                <label className="block group cursor-pointer">
                                    <div className={`h-36 rounded-3xl border-2 border-dashed flex flex-col items-center justify-center gap-2 transition-all overflow-hidden ${orderReadyProofUrl ? 'border-[#FF441F]/30 bg-[#FF441F]/5' : 'border-gray-200 dark:border-white/5 hover:bg-gray-100'}`}>
                                        {orderReadyProofUrl ? (
                                            <img src={orderReadyProofUrl} className="w-full h-full object-cover" alt="Listo" />
                                        ) : (
                                            <>
                                                <Upload size={20} className="text-gray-400" />
                                                <p className="text-[10px] font-black text-gray-400 uppercase">Empaquetado</p>
                                            </>
                                        )}
                                    </div>
                                    <input type="file" className="hidden" accept="image/*" onChange={e => handleFileChange(e, 'order_ready')} />
                                </label>
                            </div>
                        </div>

                    </div>

                    {/* Status Badge */}
                    <div className="mt-10 p-6 rounded-[2rem] bg-white dark:bg-slate-800 shadow-xl border border-gray-100 dark:border-white/5 flex items-center justify-between">
                        <div>
                            <p className="text-[10px] font-black text-gray-400 uppercase mb-1">Estado de Lanzamiento</p>
                            <Badge variant={formData.status === 'pending' ? 'warning' : 'success'} className="font-black uppercase text-[10px]">
                                {formData.status === 'pending' ? 'Borrador Interno' : 'Publicado'}
                            </Badge>
                        </div>
                        <div className={`h-12 w-12 rounded-full flex items-center justify-center ${formData.status === 'pending' ? 'bg-pp-gold/20 text-pp-brown' : 'bg-green-100 text-green-600'}`}>
                            <Clock size={24} />
                        </div>
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
