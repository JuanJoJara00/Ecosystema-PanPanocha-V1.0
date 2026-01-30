'use client'

import React, { useState, useEffect } from 'react'
import Modal from '@/components/ui/Modal'
import { supabase } from '@/lib/supabase'
import Button from '@/components/ui/Button'
import {
    ShoppingBag,
    Trash2,
    Plus,
    Minus,
    Search,
    Store,
    Loader2,
    Delete,
    Percent,
    CreditCard,
    ArrowLeft,
    UploadCloud,
    Banknote,
    Smartphone,
    CheckCircle2
} from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

interface SalesFormModalProps {
    isOpen: boolean
    onClose: () => void
    onSuccess: () => void
}

interface Product {
    id: string
    name: string
    price: number
    image_url?: string | null
    stock?: number
    category?: string
}

interface CartItem {
    id: string
    product: Product
    quantity: number
}

// Quick Cash Denominations (COP)
const BILLS = [100000, 50000, 20000, 10000, 5000, 2000]
const COINS = [1000, 500, 200, 100, 50]

export default function SalesFormModal({ isOpen, onClose, onSuccess }: SalesFormModalProps) {
    const [step, setStep] = useState<'branch' | 'pos' | 'payment'>('branch')
    const [branches, setBranches] = useState<any[]>([])
    const [selectedBranch, setSelectedBranch] = useState<any>(null)
    const [products, setProducts] = useState<Product[]>([])
    const [cart, setCart] = useState<CartItem[]>([])
    const [loading, setLoading] = useState(false)
    const [searchTerm, setSearchTerm] = useState('')
    const [processing, setProcessing] = useState(false)

    // Payment State
    const [paymentMethod, setPaymentMethod] = useState<'Efectivo' | 'Transferencia' | 'Tarjeta'>('Efectivo')
    const [cashReceived, setCashReceived] = useState<number>(0)
    const [discount, setDiscount] = useState<number>(0)
    const [discountType, setDiscountType] = useState<'none' | '10%' | '30%' | '50%' | '100%'>('none')
    const [tip, setTip] = useState<number>(0)
    const [tipType, setTipType] = useState<'none' | '10%'>('none')
    const [proofFile, setProofFile] = useState<File | null>(null)

    useEffect(() => {
        if (isOpen) {
            fetchBranches()
            setStep('branch')
            setCart([])
            setSelectedBranch(null)
            setSearchTerm('')
            resetPaymentState()
        }
    }, [isOpen])

    const resetPaymentState = () => {
        setPaymentMethod('Efectivo')
        setCashReceived(0)
        setDiscount(0)
        setDiscountType('none')
        setTip(0)
        setTipType('none')
        setProofFile(null)
    }

    const fetchBranches = async () => {
        const { data } = await supabase.from('branches').select('*').order('name')
        setBranches(data || [])
    }

    const fetchProducts = async (branchId: string) => {
        setLoading(true)
        const { data } = await supabase.from('products').select('*')
        setProducts(data || [])
        setLoading(false)
    }

    const handleBranchSelect = (branch: any) => {
        setSelectedBranch(branch)
        fetchProducts(branch.id)
        setStep('pos')
    }

    // --- Cart Logic ---
    const addToCart = (product: Product) => {
        setCart(prev => {
            const existing = prev.find(item => item.product.id === product.id)
            if (existing) {
                return prev.map(item => item.product.id === product.id
                    ? { ...item, quantity: item.quantity + 1 }
                    : item
                )
            }
            return [...prev, { id: crypto.randomUUID(), product, quantity: 1 }]
        })
    }

    const updateQuantity = (itemId: string, delta: number) => {
        setCart(prev => prev.map(item => {
            if (item.id === itemId) return { ...item, quantity: Math.max(1, item.quantity + delta) }
            return item
        }))
    }

    const removeFromCart = (itemId: string) => {
        setCart(prev => prev.filter(item => item.id !== itemId))
    }

    const clearCart = () => setCart([])

    // Calculations
    const subtotal = cart.reduce((sum, item) => sum + (item.product.price * item.quantity), 0)

    // Apply Discount
    let discountAmount = 0
    if (discountType === '10%') discountAmount = subtotal * 0.10
    else if (discountType === '30%') discountAmount = subtotal * 0.30
    else if (discountType === '50%') discountAmount = subtotal * 0.50
    else if (discountType === '100%') discountAmount = subtotal

    // Apply Tip
    let tipAmount = 0
    if (tipType === '10%') tipAmount = subtotal * 0.10

    const totalToPay = subtotal - discountAmount + tipAmount
    const change = Math.max(0, cashReceived - totalToPay)

    const canPay = paymentMethod === 'Efectivo'
        ? cashReceived >= totalToPay
        : !!proofFile; // Require file for Transfer/Card

    // --- Keypad Logic ---
    const handleKeypad = (val: string) => {
        if (val === 'back') {
            const s = cashReceived.toString()
            setCashReceived(s.length > 1 ? parseInt(s.slice(0, -1)) : 0)
        } else if (val === '00') {
            setCashReceived(parseInt(cashReceived.toString() + '00'))
        } else {
            setCashReceived(parseInt(cashReceived.toString() + val))
        }
    }

    // --- Upload Helper ---
    const uploadFile = async (file: File) => {
        const fileExt = file.name.split('.').pop()
        const fileName = `${crypto.randomUUID()}.${fileExt}`
        const filePath = `payment_proofs/${fileName}`

        const { error: uploadError } = await supabase.storage
            .from('payment_proofs') // Ensure this bucket exists
            .upload(filePath, file)

        if (uploadError) throw uploadError

        const { data } = supabase.storage.from('payment_proofs').getPublicUrl(filePath)
        return data.publicUrl
    }

    // --- Checkout Logic ---
    const handleCheckout = async () => {
        if (!selectedBranch) return
        setProcessing(true)
        try {
            let proofUrl = null
            if (paymentMethod !== 'Efectivo' && proofFile) {
                proofUrl = await uploadFile(proofFile)
            }

            // 1. Create Sale
            const { data: sale, error: saleError } = await supabase.from('sales').insert({
                branch_id: selectedBranch.id,
                total_amount: totalToPay,
                payment_method: paymentMethod,
                status: 'completed',
                created_at: new Date().toISOString(),
                discount_amount: discountAmount,
                tip_amount: tipAmount,
                payment_data: {
                    cash_received: paymentMethod === 'Efectivo' ? cashReceived : totalToPay,
                    change: paymentMethod === 'Efectivo' ? change : 0,
                    payment_proof_url: proofUrl
                }
            }).select().single()

            if (saleError) throw saleError

            // 2. Create Items
            const itemsToInsert = cart.map(item => ({
                sale_id: sale.id,
                product_id: item.product.id,
                quantity: item.quantity,
                unit_price: item.product.price,
                total_price: item.product.price * item.quantity,
                product_name: item.product.name
            }))

            const { error: itemsError } = await supabase.from('sale_items').insert(itemsToInsert)
            if (itemsError) throw itemsError

            onSuccess()
            onClose()
        } catch (error: any) {
            console.error('Checkout failed', error)
            alert('Error al crear venta: ' + error.message)
        } finally {
            setProcessing(false)
        }
    }

    const filteredProducts = products.filter(p =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase())
    )

    // --- RENDER ---
    return (
        <Modal isOpen={isOpen} onClose={onClose} title="" maxWidth="max-w-7xl">
            <div className="flex flex-col h-[85vh] -m-6 bg-gray-50 overflow-hidden">

                {/* STEP 1: BRANCH SELECTION */}
                {step === 'branch' && (
                    <div className="p-8 h-full overflow-y-auto">
                        <h2 className="text-2xl font-black text-gray-900 mb-6">Seleccionar Sede para la Venta</h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                            {branches.map(branch => (
                                <button
                                    key={branch.id}
                                    onClick={() => handleBranchSelect(branch)}
                                    className="flex items-center p-6 border-2 border-gray-200 rounded-3xl hover:border-[#D4AF37] hover:bg-white hover:shadow-xl transition-all text-left group bg-white"
                                >
                                    <div className="h-16 w-16 rounded-full bg-gray-100 flex items-center justify-center shrink-0 group-hover:bg-[#D4AF37]/10 text-gray-400 group-hover:text-[#D4AF37] transition-colors">
                                        <Store size={32} />
                                    </div>
                                    <div className="ml-4">
                                        <h4 className="font-bold text-lg text-gray-900">{branch.name}</h4>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* STEP 2: POS */}
                {step === 'pos' && (
                    <div className="flex h-full overflow-hidden">
                        {/* LEFT: Product Grid */}
                        <div className="flex-1 flex flex-col min-w-0 border-r border-gray-200 bg-gray-50/50">
                            {/* Toolbar */}
                            <div className="h-16 border-b border-gray-200 bg-white px-6 flex items-center justify-between shrink-0">
                                <div className="flex items-center gap-3">
                                    <div className="bg-[#D4AF37]/10 text-[#D4AF37] p-2 rounded-lg">
                                        <Store size={20} />
                                    </div>
                                    <div>
                                        <p className="text-[10px] uppercase font-bold text-gray-400 leading-none">Sede Actual</p>
                                        <p className="font-bold text-gray-900 leading-none">{selectedBranch?.name}</p>
                                    </div>
                                </div>
                                <div className="relative w-80">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
                                    <input
                                        type="text"
                                        className="w-full pl-10 pr-4 py-2 bg-gray-100/50 border border-gray-200 rounded-xl text-sm font-bold focus:bg-white focus:ring-2 focus:ring-[#D4AF37]/50 outline-none transition-all"
                                        placeholder="Buscar productos..."
                                        value={searchTerm}
                                        onChange={e => setSearchTerm(e.target.value)}
                                        aria-label="Buscar productos"
                                        autoFocus
                                    />
                                </div>
                            </div>

                            {/* Grid */}
                            <div className="flex-1 overflow-y-auto p-6">
                                {loading ? (
                                    <div className="h-full flex items-center justify-center">
                                        <Loader2 className="animate-spin text-gray-300" size={48} />
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pb-20">
                                        {filteredProducts.map(product => (
                                            <button
                                                key={product.id}
                                                onClick={() => addToCart(product)}
                                                className="group relative flex flex-col h-[240px] rounded-[24px] bg-white shadow-sm ring-1 ring-black/5 hover:ring-[#D4AF37]/50 hover:shadow-xl hover:-translate-y-1 transition-all text-left overflow-hidden"
                                            >
                                                <div className="h-36 w-full bg-gray-100 relative">
                                                    {product.image_url ? (
                                                        <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center text-6xl opacity-30 grayscale rounded-t-[24px]">
                                                            🥐
                                                        </div>
                                                    )}
                                                    <div className="absolute top-2 right-2 bg-white/90 backdrop-blur px-2 py-1 rounded-lg text-xs font-black shadow-sm">
                                                        {formatCurrency(product.price)}
                                                    </div>
                                                </div>
                                                <div className="p-4 flex flex-col flex-1">
                                                    <h5 className="font-bold text-gray-900 text-sm line-clamp-2 leading-tight">{product.name}</h5>
                                                    <div className="mt-auto flex items-center justify-between">
                                                        <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{product.category || 'General'}</div>
                                                        <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center group-hover:bg-[#D4AF37] group-hover:text-white transition-colors">
                                                            <Plus size={16} />
                                                        </div>
                                                    </div>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* RIGHT: Cart Panel */}
                        <div className="w-[400px] bg-white border-l border-gray-200 flex flex-col h-full shadow-2xl z-10">
                            {/* Cart Header */}
                            <div className="h-16 px-6 flex items-center justify-between border-b border-gray-100">
                                <h3 className="font-black text-gray-900 uppercase tracking-tight flex items-center gap-2">
                                    <ShoppingBag size={18} /> Carrito
                                </h3>
                                {cart.length > 0 && (
                                    <button onClick={clearCart} className="text-red-500 hover:bg-red-50 p-2 rounded-lg transition-colors" title="Limpiar carrito" aria-label="Limpiar carrito">
                                        <Trash2 size={16} />
                                    </button>
                                )}
                            </div>

                            {/* Cart Items */}
                            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#FDFDFD]">
                                {cart.length === 0 ? (
                                    <div className="h-full flex flex-col items-center justify-center text-gray-300 opacity-60">
                                        <ShoppingBag size={48} className="mb-4" />
                                        <p className="font-bold">Orden Vacía</p>
                                    </div>
                                ) : (
                                    cart.map(item => (
                                        <div key={item.id} className="bg-white p-3 rounded-2xl border border-gray-100 shadow-sm flex items-start gap-3 group relative">
                                            {/* Qty Controls */}
                                            <div className="flex flex-col items-center bg-[#FFF8F0] border border-[#FFE4C4] rounded-xl w-8 shrink-0">
                                                <button onClick={() => updateQuantity(item.id, 1)} title="Aumentar cantidad" aria-label="Aumentar cantidad" className="h-7 w-full flex items-center justify-center hover:bg-[#FFE4C4]/50 rounded-t-xl text-pp-brown"><Plus size={12} strokeWidth={3} /></button>
                                                <span className="text-xs font-bold text-pp-brown">{item.quantity}</span>
                                                <button onClick={() => updateQuantity(item.id, -1)} title="Disminuir cantidad" aria-label="Disminuir cantidad" className="h-7 w-full flex items-center justify-center hover:bg-red-50 hover:text-red-500 rounded-b-xl text-pp-brown/50"><Minus size={12} strokeWidth={3} /></button>
                                            </div>

                                            <div className="flex-1 py-1">
                                                <div className="flex justify-between items-start mb-1">
                                                    <p className="font-bold text-gray-800 text-sm leading-tight line-clamp-2">{item.product.name}</p>
                                                    <p className="font-bold text-gray-900 text-sm ml-2">{formatCurrency(item.product.price * item.quantity)}</p>
                                                </div>
                                                <p className="text-[10px] text-gray-400 font-medium">{formatCurrency(item.product.price)} un.</p>
                                            </div>

                                            <button
                                                onClick={() => removeFromCart(item.id)}
                                                title="Eliminar del carrito"
                                                aria-label="Eliminar del carrito"
                                                className="absolute -top-2 -right-2 bg-white border border-gray-200 shadow-sm rounded-full p-1 text-gray-300 hover:text-red-500 hover:border-red-200 transition-all opacity-0 group-hover:opacity-100 scale-90 group-hover:scale-100"
                                            >
                                                <Trash2 size={12} />
                                            </button>
                                        </div>
                                    ))
                                )}
                            </div>

                            {/* Footer / To Payment */}
                            <div className="p-6 bg-white border-t border-gray-100 shadow-[0_-10px_40px_rgba(0,0,0,0.05)] z-20">
                                <div className="space-y-2 mb-4">
                                    <div className="flex justify-between text-gray-400 text-xs font-bold uppercase">
                                        <span>Subtotal</span>
                                        <span>{formatCurrency(subtotal)}</span>
                                    </div>
                                    <div className="flex justify-between text-gray-900 text-2xl font-black">
                                        <span>Total</span>
                                        <span>{formatCurrency(subtotal)}</span>
                                    </div>
                                </div>

                                <Button
                                    fullWidth
                                    onClick={() => {
                                        if (cart.length > 0) setStep('payment')
                                    }}
                                    disabled={cart.length === 0}
                                    className="h-16 bg-[#D4AF37] hover:bg-[#C19B2D] text-white rounded-xl shadow-xl shadow-[#D4AF37]/20 font-black text-xl uppercase tracking-widest"
                                >
                                    Cobrar (Efectivo)
                                </Button>
                            </div>
                        </div>
                    </div>
                )}

                {/* STEP 3: PAYMENT / CHECKOUT */}
                {step === 'payment' && (
                    <div className="flex flex-col h-full bg-gray-50">
                        {/* Header */}
                        <div className="bg-[#3B3026] text-white px-8 py-6 flex justify-between items-center shrink-0">
                            <div>
                                <h1 className="text-2xl font-black uppercase tracking-tighter">Cobrar Venta</h1>
                                <div className="flex items-center gap-2 mt-1">
                                    <span className="px-2 py-0.5 bg-[#D4AF37] text-[#3B3026] rounded-full text-[10px] font-bold uppercase">
                                        Venta Directa
                                    </span>
                                </div>
                            </div>
                            <div className="flex items-center gap-6">
                                <div className="bg-white/10 px-6 py-2 rounded-2xl text-right">
                                    <p className="text-[10px] font-bold text-white/50 uppercase tracking-widest mb-0.5">Total a Pagar</p>
                                    <p className="text-3xl font-black text-white">{formatCurrency(totalToPay)}</p>
                                </div>
                                <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors font-bold">
                                    <span className="text-sm uppercase tracking-widest">Cancelar</span>
                                </button>
                            </div>
                        </div>

                        {/* Main Content */}
                        <div className="flex-1 overflow-hidden p-6 flex gap-6">

                            {/* LEFT: Discounts/Tips */}
                            <div className="w-64 bg-white rounded-2xl p-4 border border-gray-200 flex flex-col gap-4 shadow-sm h-full overflow-y-auto custom-scrollbar">
                                <button onClick={() => setStep('pos')} className="flex items-center gap-2 text-gray-500 hover:text-gray-900 font-bold text-xs mb-2">
                                    <ArrowLeft size={16} /> Volver
                                </button>

                                <div>
                                    <h4 className="text-[#D4AF37] font-bold text-[10px] uppercase tracking-widest mb-3 flex items-center gap-2 border-b border-gray-100 pb-2"><Percent size={12} /> Descuentos</h4>
                                    <div className="space-y-2">
                                        <button onClick={() => setDiscountType('none')} className={`w-full p-2 rounded-lg text-xs font-bold uppercase text-left border ${discountType === 'none' ? 'bg-[#D4AF37]/10 border-[#D4AF37] text-[#D4AF37]' : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'}`}>Sin Descuento</button>
                                        <button onClick={() => setDiscountType('10%')} className={`w-full p-2 rounded-lg text-xs font-bold uppercase text-left border ${discountType === '10%' ? 'bg-[#D4AF37]/10 border-[#D4AF37] text-[#D4AF37]' : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'}`}>10% General</button>
                                        <button onClick={() => setDiscountType('30%')} className={`w-full p-2 rounded-lg text-xs font-bold uppercase text-left border ${discountType === '30%' ? 'bg-[#D4AF37]/10 border-[#D4AF37] text-[#D4AF37]' : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'}`}>30% Empleado</button>
                                        <button onClick={() => setDiscountType('50%')} className={`w-full p-2 rounded-lg text-xs font-bold uppercase text-left border ${discountType === '50%' ? 'bg-[#D4AF37]/10 border-[#D4AF37] text-[#D4AF37]' : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'}`}>50%</button>
                                        <button onClick={() => setDiscountType('100%')} className={`w-full p-2 rounded-lg text-xs font-bold uppercase text-left border ${discountType === '100%' ? 'bg-[#D4AF37]/10 border-[#D4AF37] text-[#D4AF37]' : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'}`}>100% Cortesía</button>
                                    </div>
                                </div>

                                <div>
                                    <h4 className="text-pink-400 font-bold text-[10px] uppercase tracking-widest mb-3 flex items-center gap-2 border-b border-gray-100 pb-2"><CreditCard size={12} /> Propina</h4>
                                    <div className="space-y-2">
                                        <button onClick={() => setTipType('none')} className={`w-full p-2 rounded-lg text-xs font-bold uppercase text-left border ${tipType === 'none' ? 'bg-pink-50 border-pink-400 text-pink-500' : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'}`}>Ninguna</button>
                                        <button onClick={() => setTipType('10%')} className={`w-full p-2 rounded-lg text-xs font-bold uppercase text-left border ${tipType === '10%' ? 'bg-pink-50 border-pink-400 text-pink-500' : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'}`}>10% Sugerido</button>
                                    </div>
                                </div>

                                <div className="mt-auto pt-4 border-t border-gray-100 space-y-1">
                                    <div className="flex justify-between text-gray-400 text-[10px]"><span>Subtotal</span><span>{formatCurrency(subtotal)}</span></div>
                                    {discountAmount > 0 && <div className="flex justify-between text-[#D4AF37] text-[10px]"><span>Descuento</span><span>-{formatCurrency(discountAmount)}</span></div>}
                                    {tipAmount > 0 && <div className="flex justify-between text-pink-400 text-[10px]"><span>Propina</span><span>+{formatCurrency(tipAmount)}</span></div>}
                                </div>
                            </div>

                            {/* CENTER: Payment Methods & Input */}
                            <div className="flex-1 flex flex-col gap-4">
                                {/* Methods Tabs */}
                                <div className="flex p-1 bg-gray-200 rounded-xl">
                                    <button
                                        onClick={() => setPaymentMethod('Efectivo')}
                                        className={`flex-1 py-3 rounded-lg text-sm font-bold uppercase flex items-center justify-center gap-2 transition-all ${paymentMethod === 'Efectivo' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
                                    >
                                        <Banknote size={16} /> Efectivo
                                    </button>
                                    <button
                                        onClick={() => setPaymentMethod('Transferencia')}
                                        className={`flex-1 py-3 rounded-lg text-sm font-bold uppercase flex items-center justify-center gap-2 transition-all ${paymentMethod === 'Transferencia' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
                                    >
                                        <Smartphone size={16} /> Transferencia
                                    </button>
                                    <button
                                        onClick={() => setPaymentMethod('Tarjeta')}
                                        className={`flex-1 py-3 rounded-lg text-sm font-bold uppercase flex items-center justify-center gap-2 transition-all ${paymentMethod === 'Tarjeta' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
                                    >
                                        <CreditCard size={16} /> Tarjeta
                                    </button>
                                </div>

                                {paymentMethod === 'Efectivo' ? (
                                    <>
                                        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-200 flex items-center justify-between">
                                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Dinero Recibido</span>
                                            <div className="flex items-center gap-1">
                                                <span className="text-gray-300 text-2xl">$</span>
                                                <span className="text-4xl font-black text-gray-900">{cashReceived.toLocaleString()}</span>
                                                <span className="w-[2px] h-8 bg-[#D4AF37] animate-pulse ml-1"></span>
                                            </div>
                                        </div>

                                        <div className="flex-1 grid grid-cols-3 gap-2 min-h-0">
                                            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => (
                                                <button key={n} onClick={() => handleKeypad(n.toString())} className="bg-white rounded-xl shadow-sm border-b-[3px] border-gray-200 text-3xl font-black text-gray-800 hover:bg-[#D4AF37] hover:border-[#B3932B] hover:text-white transition-all active:scale-95 active:border-b-0 active:translate-y-[3px]">
                                                    {n}
                                                </button>
                                            ))}
                                            <button onClick={() => handleKeypad('00')} className="bg-white rounded-xl shadow-sm border-b-[3px] border-gray-200 text-2xl font-black text-gray-800 hover:bg-[#D4AF37] hover:border-[#B3932B] hover:text-white transition-all active:scale-95 active:border-b-0 active:translate-y-[3px]">00</button>
                                            <button onClick={() => handleKeypad('0')} className="bg-white rounded-xl shadow-sm border-b-[3px] border-gray-200 text-3xl font-black text-gray-800 hover:bg-[#D4AF37] hover:border-[#B3932B] hover:text-white transition-all active:scale-95 active:border-b-0 active:translate-y-[3px]">0</button>
                                            <button onClick={() => handleKeypad('back')} aria-label="Borrar último dígito" className="bg-red-50 rounded-xl shadow-sm border-b-[3px] border-red-100 text-red-500 hover:bg-red-100 hover:border-red-200 transition-all active:scale-95 active:border-b-0 active:translate-y-[3px] flex items-center justify-center">
                                                <Delete size={24} />
                                            </button>
                                        </div>
                                    </>
                                ) : (
                                    <div className="flex-1 bg-white rounded-2xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center gap-4 hover:border-[#D4AF37] transition-colors relative group">
                                        <div className="h-20 w-20 bg-gray-50 rounded-full flex items-center justify-center text-gray-400 group-hover:text-[#D4AF37] transition-colors">
                                            {proofFile ? <CheckCircle2 size={40} className="text-green-500" /> : <UploadCloud size={40} />}
                                        </div>
                                        <div className="text-center">
                                            <h4 className="font-bold text-gray-900">{proofFile ? 'Comprobante Adjunto' : 'Subir Comprobante de Pago'}</h4>
                                            <p className="text-xs text-gray-500 mt-1">{proofFile ? proofFile.name : 'Requerido para confirmar la venta'}</p>
                                        </div>
                                        <input
                                            type="file"
                                            accept="image/*,.pdf"
                                            className="absolute inset-0 opacity-0 cursor-pointer"
                                            onChange={(e) => setProofFile(e.target.files ? e.target.files[0] : null)}
                                            aria-label="Subir comprobante de pago"
                                        />
                                    </div>
                                )}

                                <Button
                                    fullWidth
                                    onClick={handleCheckout}
                                    disabled={!canPay || processing}
                                    className={`h-16 rounded-xl text-xl font-black uppercase tracking-widest shadow-lg ${canPay
                                        ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:from-green-400 hover:to-emerald-500 shadow-green-900/20'
                                        : 'bg-gray-100 text-gray-300'}`}
                                >
                                    {processing ? 'Subiendo...' : 'Confirmar Pago'}
                                </Button>
                            </div>

                            {/* RIGHT: Quick Cash (Only for Cash) */}
                            {paymentMethod === 'Efectivo' ? (
                                <div className="w-64 flex flex-col gap-4 h-full overflow-hidden">
                                    <div className={`p-4 rounded-2xl border-2 transition-all shrink-0 ${canPay ? 'bg-green-50 border-green-200' : 'bg-white border-gray-200'} flex flex-col items-center justify-center`}>
                                        <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Su Cambio</span>
                                        <span className={`text-3xl font-black ${canPay ? 'text-green-600' : 'text-gray-300'}`}>
                                            {formatCurrency(change)}
                                        </span>
                                    </div>

                                    <div className="flex gap-2 shrink-0">
                                        <button onClick={() => setCashReceived(totalToPay)} className="flex-1 bg-[#D4AF37] text-white py-2 rounded-lg font-bold uppercase text-[10px] hover:bg-[#C19B2D]">Exacto</button>
                                        <button onClick={() => setCashReceived(0)} className="flex-1 bg-red-100 text-red-500 py-2 rounded-lg font-bold uppercase text-[10px] hover:bg-red-200">Limpiar</button>
                                    </div>

                                    <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3 pr-2">
                                        <div>
                                            <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest mb-2">Billetes</p>
                                            <div className="space-y-2">
                                                {BILLS.map(bill => (
                                                    <button key={bill} onClick={() => setCashReceived(prev => prev + bill)} className="w-full bg-white py-2.5 rounded-lg text-gray-900 font-bold border border-gray-200 shadow-sm hover:border-[#D4AF37] hover:text-[#D4AF37] transition-all text-sm">
                                                        {formatCurrency(bill)}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest mb-2">Monedas</p>
                                            <div className="space-y-2">
                                                {COINS.map(coin => (
                                                    <button key={coin} onClick={() => setCashReceived(prev => prev + coin)} className="w-full bg-white py-2.5 rounded-lg text-gray-900 font-bold border border-gray-200 shadow-sm hover:border-[#D4AF37] hover:text-[#D4AF37] transition-all text-sm">
                                                        {formatCurrency(coin)}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="w-64 bg-gray-100 rounded-2xl flex items-center justify-center text-center p-6 border border-gray-200 border-dashed">
                                    <p className="text-gray-400 text-xs font-bold uppercase">
                                        Las opciones de dinero rápido están deshabilitadas para pagos con {paymentMethod}
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                )}

            </div>
        </Modal>
    )
}
