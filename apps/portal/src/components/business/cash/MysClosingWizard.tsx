'use client'

import React, { useState, useEffect } from 'react'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import { ArrowRight, ArrowLeft, Save, ShoppingBag, Coins, Wallet, Upload, X, Trash2, User, Plus, CreditCard, ArrowLeftRight } from 'lucide-react'
import { supabase } from '@/lib/supabase'

const DENOMINATIONS_BILLS = [100000, 50000, 20000, 10000, 5000, 2000]
const DENOMINATIONS_COINS = [1000, 500, 200, 100, 50]

export default function MysClosingWizard() {
    const [step, setStep] = useState(1) // 1: Base, 2: Products, 3: Movements, 4: Count, 5: Summary
    const [loading, setLoading] = useState(false)
    const [branches, setBranches] = useState<{ id: string, name: string }[]>([])
    const [employees, setEmployees] = useState<{ id: string, full_name: string }[]>([])

    // Form State
    const [formData, setFormData] = useState({
        branch_id: '',
        shift: 'mañana',
        base_cash: 0,
        sales_cash: 0,
        sales_card: 0,
        sales_transfer: 0,
        expenses_total: 0,
        tips_total: 0,
        cash_audit_count: 0,
        notes: ''
    })

    // Expenses State
    const [expensesList, setExpensesList] = useState<{ description: string, amount: number, proofFile: File | null, proofUrl: string }[]>([])
    const [expenseForm, setExpenseForm] = useState({ description: '', amount: 0, proofFile: null as File | null, proofUrl: '' })

    // Tips State (Now treated as Outflow)
    const [tipsList, setTipsList] = useState<{ employee_id: string, employee_name: string, amount: number }[]>([])
    const [tipForm, setTipForm] = useState({ employee_id: '', amount: 0 })

    // Global Closing Proofs
    const [closingProof, setClosingProof] = useState<File | null>(null) // Factura Cierre de Caja
    const [closingProofUrl, setClosingProofUrl] = useState('')

    const [productsProof, setProductsProof] = useState<File | null>(null) // Factura Productos Vendidos
    const [productsProofUrl, setProductsProofUrl] = useState('')

    const [cardProof, setCardProof] = useState<File | null>(null) // Voucher Datáfono
    const [cardProofUrl, setCardProofUrl] = useState('')

    // Cash Count State (Arqueo)
    const [cashCounts, setCashCounts] = useState<Record<number, number>>({})

    // Product State
    const [products, setProducts] = useState<any[]>([])
    const [productsSold, setProductsSold] = useState<{ product_id: string, name: string, quantity: number, price: number }[]>([])
    const [selectedProduct, setSelectedProduct] = useState('')
    const [quantity, setQuantity] = useState(1)

    // Sync Totals
    useEffect(() => {
        const expenses = expensesList.reduce((sum, item) => sum + item.amount, 0)
        const tips = tipsList.reduce((sum, item) => sum + item.amount, 0)
        const productsTotal = productsSold.reduce((sum, item) => sum + (item.quantity * item.price), 0)

        setFormData(prev => ({
            ...prev,
            expenses_total: expenses,
            tips_total: tips,
            sales_cash: Math.max(0, productsTotal - prev.sales_card - prev.sales_transfer)
        }))
    }, [expensesList, tipsList, productsSold, formData.sales_card, formData.sales_transfer])

    // Sync Cash Count to Total
    useEffect(() => {
        const total = [...DENOMINATIONS_BILLS, ...DENOMINATIONS_COINS].reduce((sum, denom) => {
            return sum + (denom * (cashCounts[denom] || 0))
        }, 0)

        if (total !== formData.cash_audit_count) {
            setFormData(prev => ({ ...prev, cash_audit_count: total }))
        }
    }, [cashCounts, formData.cash_audit_count])

    // Fetch Branches
    useEffect(() => {
        const fetchBranches = async () => {
            const { data } = await supabase.from('branches').select('id, name').order('name')
            if (data) setBranches(data)
        }
        fetchBranches()
    }, [])

    // Fetch Products
    useEffect(() => {
        const fetchProducts = async () => {
            const { data } = await supabase.from('products').select('*').eq('active', true).order('name')
            if (data) setProducts(data)
        }
        fetchProducts()
    }, [])

    // Fetch Employees when Branch changes
    useEffect(() => {
        if (!formData.branch_id) {
            setEmployees([])
            return
        }
        const fetchEmployees = async () => {
            const { data } = await supabase.from('employees')
                .select('id, full_name')
                .eq('branch_id', formData.branch_id)
                .eq('active', true)
                .order('full_name')
            if (data) setEmployees(data)
        }
        fetchEmployees()
    }, [formData.branch_id])

    // Helpers for Currency Formatting
    const formatCurrency = (value: number) => {
        if (!value) return ''
        return new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 }).format(value)
    }

    const parseCurrency = (value: string) => {
        return parseFloat(value.replace(/\./g, '').replace(/,/g, '')) || 0
    }

    const nextStep = () => setStep(s => s + 1)
    const prevStep = () => setStep(s => s - 1)

    // Handlers
    const handleExpenseFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) {
            setExpenseForm(prev => ({
                ...prev,
                proofFile: file,
                proofUrl: URL.createObjectURL(file)
            }))
        }
    }

    const handleClosingProofChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) {
            setClosingProof(file)
            setClosingProofUrl(URL.createObjectURL(file))
        }
    }

    const handleProductsProofChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) {
            setProductsProof(file)
            setProductsProofUrl(URL.createObjectURL(file))
        }
    }

    const handleCardProofChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) {
            setCardProof(file)
            setCardProofUrl(URL.createObjectURL(file))
        }
    }

    const handleAddExpense = () => {
        if (!expenseForm.description || expenseForm.amount <= 0) return
        setExpensesList([...expensesList, { ...expenseForm }])
        setExpenseForm({ description: '', amount: 0, proofFile: null, proofUrl: '' })
    }

    const handleRemoveExpense = (idx: number) => {
        const newList = [...expensesList]
        newList.splice(idx, 1)
        setExpensesList(newList)
    }

    const handleAddTip = () => {
        if (!tipForm.employee_id || tipForm.amount <= 0) return
        const emp = employees.find(e => e.id === tipForm.employee_id)
        if (!emp) return

        setTipsList([...tipsList, {
            employee_id: emp.id,
            employee_name: emp.full_name,
            amount: tipForm.amount
        }])
        setTipForm({ employee_id: '', amount: 0 })
    }

    const handleRemoveTip = (idx: number) => {
        const newList = [...tipsList]
        newList.splice(idx, 1)
        setTipsList(newList)
    }

    const handleAddProduct = () => {
        if (!selectedProduct || quantity <= 0) return

        const product = products.find(p => p.id === selectedProduct)
        if (!product) return

        setProductsSold([...productsSold, {
            product_id: product.id,
            name: product.name,
            quantity: quantity,
            price: product.price
        }])

        // Reset inputs
        setSelectedProduct('')
        setQuantity(1)
    }

    const handleRemoveProduct = (index: number) => {
        const newProducts = [...productsSold]
        newProducts.splice(index, 1)
        setProductsSold(newProducts)
    }

    // --- STEP 1: APERTURA / BASE ---
    const renderStep1 = () => (
        <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
            <h3 className="text-lg font-bold text-gray-800 border-b pb-2">Paso 1: Apertura de Caja</h3>
            <p className="text-sm text-gray-500">Confirma la sede, el turno y el monto base.</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Select
                    label="Sede"
                    options={[
                        { value: '', label: 'Seleccionar...' },
                        ...branches.map(b => ({ value: b.id, label: b.name }))
                    ]}
                    value={formData.branch_id}
                    onChange={e => setFormData({ ...formData, branch_id: e.target.value })}
                />
                <Select
                    label="Turno"
                    options={[
                        { value: 'mañana', label: 'Mañana' },
                        { value: 'tarde', label: 'Tarde' },
                        { value: 'unico', label: 'Turno Único' }
                    ]}
                    value={formData.shift}
                    onChange={e => setFormData({ ...formData, shift: e.target.value })}
                />
                <Input
                    label="Base Inicial (Efectivo)"
                    type="text"
                    startIcon={<span className="text-gray-500 font-bold">$</span>}
                    value={formData.base_cash > 0 ? formatCurrency(formData.base_cash) : ''}
                    onChange={e => setFormData({ ...formData, base_cash: parseCurrency(e.target.value) })}
                    placeholder="0"
                />
            </div>

            <div className="flex justify-end pt-4">
                <Button onClick={nextStep} disabled={!formData.branch_id || !formData.shift}>
                    Siguiente <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
            </div>
        </div>
    )

    // --- STEP 2: PRODUCTOS VENDIDOS ---
    const renderStep2 = () => (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            <h3 className="text-lg font-bold text-gray-800 border-b pb-2">Paso 2: Registro de Productos</h3>
            <p className="text-sm text-gray-500">Agrega los productos vendidos durante el turno.</p>

            {/* Add Product Form */}
            <div className="bg-gray-50 p-4 rounded-xl space-y-4 border border-gray-200">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                    <div className="md:col-span-2">
                        <Select
                            label="Producto"
                            options={[
                                { value: '', label: 'Buscar producto...' },
                                ...products.map(p => ({ value: p.id, label: `${p.name} - $${formatCurrency(p.price)}` }))
                            ]}
                            value={selectedProduct}
                            onChange={e => setSelectedProduct(e.target.value)}
                        />
                    </div>
                    <div>
                        <Input
                            label="Cantidad"
                            type="number"
                            min="1"
                            value={quantity}
                            onChange={e => setQuantity(parseInt(e.target.value) || 0)}
                        />
                    </div>
                </div>
                <Button
                    onClick={handleAddProduct}
                    disabled={!selectedProduct || quantity <= 0}
                    className="w-full bg-pp-brown text-white hover:bg-gray-800"
                    startIcon={<ShoppingBag className="w-4 h-4" />}
                >
                    Agregar a la Lista
                </Button>
            </div>

            {/* Products List */}
            <div className="space-y-2">
                <h4 className="font-bold text-gray-700 text-sm uppercase tracking-wide">Productos Agregados ({productsSold.length})</h4>

                {productsSold.length === 0 ? (
                    <div className="text-center py-8 text-gray-400 border-2 border-dashed rounded-xl">
                        No hay productos agregados aún.
                    </div>
                ) : (
                    <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                        {productsSold.map((item, idx) => (
                            <div key={idx} className="flex items-center justify-between bg-white p-3 rounded-lg border shadow-sm group">
                                <div>
                                    <p className="font-bold text-gray-800">{item.name}</p>
                                    <p className="text-xs text-gray-500">{item.quantity} x ${formatCurrency(item.price)}</p>
                                </div>
                                <div className="flex items-center gap-4">
                                    <span className="font-bold text-pp-brown">${formatCurrency(item.quantity * item.price)}</span>
                                    <button
                                        onClick={() => handleRemoveProduct(idx)}
                                        className="text-red-400 hover:text-red-600 p-1 rounded-md hover:bg-red-50 transition-colors"
                                    >
                                        &times;
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {productsSold.length > 0 && (
                    <div className="space-y-4">
                        <div className="flex justify-between items-center bg-pp-gold/10 p-4 rounded-xl border border-pp-gold/20 mt-4">
                            <span className="font-bold text-pp-brown">Total Ventas (Productos):</span>
                            <span className="font-extrabold text-xl text-pp-brown">
                                ${formatCurrency(productsSold.reduce((sum, item) => sum + (item.quantity * item.price), 0))}
                            </span>
                        </div>

                        {/* Payment Method Breakdown */}
                        <div className="bg-white p-4 rounded-xl border border-gray-200 mt-4">
                            <h4 className="font-bold text-gray-700 text-sm uppercase tracking-wide mb-3 flex items-center gap-2">
                                <CreditCard className="w-4 h-4" /> Medios de Pago No Efectivo
                            </h4>
                            <p className="text-xs text-gray-500 mb-4">
                                Si recibiste pagos por Datáfono o Transferencia, ingrésalos aquí para descontarlos del efectivo esperado.
                            </p>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <Input
                                    label="Ventas por Datáfono"
                                    type="text"
                                    startIcon={<span className="text-blue-500 font-bold">$</span>}
                                    value={formData.sales_card > 0 ? formatCurrency(formData.sales_card) : ''}
                                    onChange={e => setFormData({ ...formData, sales_card: parseCurrency(e.target.value) })}
                                    placeholder="0"
                                />
                                <Input
                                    label="Transferencias / Nequi"
                                    type="text"
                                    startIcon={<span className="text-purple-500 font-bold">$</span>}
                                    value={formData.sales_transfer > 0 ? formatCurrency(formData.sales_transfer) : ''}
                                    onChange={e => setFormData({ ...formData, sales_transfer: parseCurrency(e.target.value) })}
                                    placeholder="0"
                                />
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <div className="flex justify-between pt-4">
                <Button variant="secondary" onClick={prevStep} startIcon={<ArrowLeft className="w-4 h-4" />}>Atrás</Button>
                <Button onClick={nextStep}>
                    Siguiente <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
            </div>
        </div>
    )

    // --- STEP 3: MOVIMIENTOS ---
    const renderStep3 = () => {
        return (
            <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
                <h3 className="text-lg font-bold text-gray-800 border-b pb-2">Paso 3: Gastos y Propinas</h3>

                {/* EXPENSES SECTION */}
                <div className="space-y-4">
                    <h4 className="font-bold text-red-600 flex items-center gap-2">
                        <Wallet className="w-5 h-5" /> Gastos / Salidas de Caja
                    </h4>

                    <div className="bg-red-50/50 p-4 rounded-xl border border-red-100 space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                            <Input
                                label="Descripción del Gasto"
                                placeholder="Ej: Compra de hielo, Pago transporte..."
                                value={expenseForm.description}
                                onChange={e => setExpenseForm({ ...expenseForm, description: e.target.value })}
                            />
                            <Input
                                label="Monto"
                                type="text"
                                startIcon={<span className="text-red-500 font-bold">$</span>}
                                value={expenseForm.amount > 0 ? formatCurrency(expenseForm.amount) : ''}
                                onChange={e => setExpenseForm({ ...expenseForm, amount: parseCurrency(e.target.value) })}
                                placeholder="0"
                            />
                        </div>

                        {/* Image Upload */}
                        <div>
                            <label className="text-xs font-bold text-gray-700 font-display uppercase tracking-wide ml-1 block mb-1">Evidencia (Foto Factura)</label>
                            {!expenseForm.proofUrl ? (
                                <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-white hover:bg-gray-50 transition-colors">
                                    <div className="flex flex-col items-center justify-center pt-2 pb-3">
                                        <Upload className="w-6 h-6 mb-1 text-gray-400" />
                                        <p className="text-xs text-gray-500">Subir foto</p>
                                    </div>
                                    <input type="file" className="hidden" accept="image/*" capture="environment" onChange={handleExpenseFileChange} />
                                </label>
                            ) : (
                                <div className="relative w-full h-32 bg-gray-100 rounded-lg overflow-hidden border">
                                    <img src={expenseForm.proofUrl} alt="Preview" className="w-full h-full object-cover" />
                                    <button onClick={() => setExpenseForm({ ...expenseForm, proofFile: null, proofUrl: '' })} className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full shadow-md">
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                            )}
                        </div>

                        <Button
                            onClick={handleAddExpense}
                            disabled={!expenseForm.description || expenseForm.amount <= 0 || !expenseForm.proofFile}
                            className="w-full bg-red-600 hover:bg-red-700 text-white"
                            startIcon={<Plus className="w-4 h-4" />}
                        >
                            Registrar Gasto
                        </Button>
                    </div>

                    {/* Expenses List */}
                    {expensesList.length > 0 && (
                        <div className="space-y-2">
                            {expensesList.map((item, idx) => (
                                <div key={idx} className="flex items-center justify-between bg-white p-3 rounded-lg border shadow-sm">
                                    <div className="flex items-center gap-3">
                                        {item.proofUrl && <img src={item.proofUrl} className="w-10 h-10 rounded object-cover border" />}
                                        <div>
                                            <p className="font-bold text-gray-800 text-sm">{item.description}</p>
                                            <p className="text-xs text-red-500 font-bold">-${formatCurrency(item.amount)}</p>
                                        </div>
                                    </div>
                                    <button onClick={() => handleRemoveExpense(idx)} className="text-gray-400 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
                                </div>
                            ))}
                            <div className="text-right font-bold text-red-600 text-sm">
                                Total Gastos: -${formatCurrency(formData.expenses_total)}
                            </div>
                        </div>
                    )}
                </div>

                <hr className="border-gray-200" />

                {/* TIPS SECTION */}
                <div className="space-y-4">
                    <h4 className="font-bold text-green-600 flex items-center gap-2">
                        <Coins className="w-5 h-5" /> Repartición de Propinas
                    </h4>

                    <div className="bg-green-50/50 p-4 rounded-xl border border-green-100 space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                            <Select
                                label="Empleado"
                                options={[
                                    { value: '', label: 'Seleccionar...' },
                                    ...employees.map(e => ({ value: e.id, label: e.full_name }))
                                ]}
                                value={tipForm.employee_id}
                                onChange={e => setTipForm({ ...tipForm, employee_id: e.target.value })}
                            />
                            <Input
                                label="Monto Entregado"
                                type="text"
                                startIcon={<span className="text-green-500 font-bold">$</span>}
                                value={tipForm.amount > 0 ? formatCurrency(tipForm.amount) : ''}
                                onChange={e => setTipForm({ ...tipForm, amount: parseCurrency(e.target.value) })}
                                placeholder="0"
                            />
                        </div>
                        <Button
                            onClick={handleAddTip}
                            disabled={!tipForm.employee_id || tipForm.amount <= 0}
                            className="w-full bg-green-600 hover:bg-green-700 text-white"
                            startIcon={<Plus className="w-4 h-4" />}
                        >
                            Asignar Propina
                        </Button>
                    </div>

                    {/* Tips List */}
                    {tipsList.length > 0 && (
                        <div className="space-y-2">
                            {tipsList.map((item, idx) => (
                                <div key={idx} className="flex items-center justify-between bg-white p-3 rounded-lg border shadow-sm">
                                    <div>
                                        <p className="font-bold text-gray-800 text-sm">{item.employee_name}</p>
                                        <p className="text-xs text-green-600 font-bold">+${formatCurrency(item.amount)}</p>
                                    </div>
                                    <button onClick={() => handleRemoveTip(idx)} className="text-gray-400 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
                                </div>
                            ))}
                            <div className="text-right font-bold text-green-600 text-sm">
                                Total Propinas: +${formatCurrency(formData.tips_total)}
                            </div>
                        </div>
                    )}
                </div>

                <div className="flex justify-between pt-4">
                    <Button variant="secondary" onClick={prevStep} startIcon={<ArrowLeft className="w-4 h-4" />}>Atrás</Button>
                    <Button onClick={nextStep}>
                        Siguiente <ArrowRight className="ml-2 w-4 h-4" />
                    </Button>
                </div>
            </div>
        )
    }

    // --- STEP 4: CONTEO DETALLADO (ARQUEO) ---
    const renderStep4 = () => {
        const totalBills = DENOMINATIONS_BILLS.reduce((sum, d) => sum + (d * (cashCounts[d] || 0)), 0)
        const totalCoins = DENOMINATIONS_COINS.reduce((sum, d) => sum + (d * (cashCounts[d] || 0)), 0)

        const handleCountChange = (denom: number, val: string) => {
            const qty = parseInt(val) || 0
            setCashCounts(prev => ({ ...prev, [denom]: qty }))
        }

        return (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                <h3 className="text-lg font-bold text-gray-800 border-b pb-2">Paso 4: Arqueo Físico Detallado</h3>
                <p className="text-sm text-gray-500">Ingresa la cantidad de billetes y monedas que hay en caja.</p>

                <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-100 mb-2">
                    <p className="font-bold text-yellow-800 text-sm flex items-center gap-2">⚠️ Importante</p>
                    <p className="text-xs text-yellow-700">El sistema calculará el total automáticamente según las cantidades ingresadas.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Billetes Column */}
                    <div className="space-y-3">
                        <div className="flex items-center gap-2 mb-2 pb-1 border-b border-pp-brown/20">
                            <Wallet className="w-5 h-5 text-pp-brown" />
                            <h4 className="font-bold text-pp-brown header-font">BILLETES</h4>
                        </div>
                        <div className="grid grid-cols-12 gap-2 text-xs font-bold text-gray-400 uppercase tracking-wide mb-1 text-center">
                            <div className="col-span-4 text-left">Denominación</div>
                            <div className="col-span-3">Cantidad</div>
                            <div className="col-span-5 text-right">Total</div>
                        </div>
                        {DENOMINATIONS_BILLS.map(denom => (
                            <div key={denom} className="grid grid-cols-12 gap-2 items-center">
                                <div className="col-span-4 font-bold text-gray-700 text-sm">
                                    ${formatCurrency(denom)}
                                </div>
                                <div className="col-span-3">
                                    <Input
                                        type="number"
                                        min="0"
                                        className="h-9 text-center font-bold"
                                        value={cashCounts[denom] || ''}
                                        onChange={e => handleCountChange(denom, e.target.value)}
                                        placeholder="0"
                                    />
                                </div>
                                <div className="col-span-5 text-right font-mono text-sm text-gray-600">
                                    ${formatCurrency(denom * (cashCounts[denom] || 0))}
                                </div>
                            </div>
                        ))}
                        <div className="bg-gray-100 p-2 rounded flex justify-between items-center font-bold text-sm mt-2">
                            <span>TOTAL BILLETES:</span>
                            <span>${formatCurrency(totalBills)}</span>
                        </div>
                    </div>

                    {/* Monedas Column */}
                    <div className="space-y-3">
                        <div className="flex items-center gap-2 mb-2 pb-1 border-b border-pp-brown/20">
                            <Coins className="w-5 h-5 text-pp-brown" />
                            <h4 className="font-bold text-pp-brown header-font">MONEDAS</h4>
                        </div>
                        <div className="grid grid-cols-12 gap-2 text-xs font-bold text-gray-400 uppercase tracking-wide mb-1 text-center">
                            <div className="col-span-4 text-left">Denominación</div>
                            <div className="col-span-3">Cantidad</div>
                            <div className="col-span-5 text-right">Total</div>
                        </div>
                        {DENOMINATIONS_COINS.map(denom => (
                            <div key={denom} className="grid grid-cols-12 gap-2 items-center">
                                <div className="col-span-4 font-bold text-gray-700 text-sm">
                                    ${formatCurrency(denom)}
                                </div>
                                <div className="col-span-3">
                                    <Input
                                        type="number"
                                        min="0"
                                        className="h-9 text-center font-bold"
                                        value={cashCounts[denom] || ''}
                                        onChange={e => handleCountChange(denom, e.target.value)}
                                        placeholder="0"
                                    />
                                </div>
                                <div className="col-span-5 text-right font-mono text-sm text-gray-600">
                                    ${formatCurrency(denom * (cashCounts[denom] || 0))}
                                </div>
                            </div>
                        ))}
                        <div className="bg-gray-100 p-2 rounded flex justify-between items-center font-bold text-sm mt-2">
                            <span>TOTAL MONEDAS:</span>
                            <span>${formatCurrency(totalCoins)}</span>
                        </div>
                    </div>
                </div>

                {/* Gran Total */}
                <div className="bg-pp-brown text-white p-4 rounded-xl flex justify-between items-center shadow-lg mt-6">
                    <div>
                        <p className="text-xs opacity-80 uppercase tracking-wider font-bold">Total Efectivo en Caja</p>
                        <p className="text-xs opacity-60">(Billetes + Monedas)</p>
                    </div>
                    <div className="text-3xl font-black">
                        ${formatCurrency(totalBills + totalCoins)}
                    </div>
                </div>

                <div className="flex justify-between pt-4">
                    <Button variant="secondary" onClick={prevStep} startIcon={<ArrowLeft className="w-4 h-4" />}>Atrás</Button>
                    <Button onClick={nextStep} disabled={formData.cash_audit_count <= 0}>
                        Ver Resumen <ArrowRight className="ml-2 w-4 h-4" />
                    </Button>
                </div>
            </div>
        )
    }

    // --- STEP 5: RESUMEN Y SOPORTES ---
    const renderStep5 = () => {
        const expected = formData.base_cash + formData.sales_cash - formData.expenses_total - formData.tips_total
        const difference = formData.cash_audit_count - expected

        return (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                <h3 className="text-lg font-bold text-gray-800 border-b pb-2">Paso 5: Resumen y Soportes</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-3 bg-gray-50 p-4 rounded-xl">
                        <h4 className="font-display font-bold text-gray-700">Operación</h4>
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-500">Base Inicial:</span>
                            <span className="font-medium">${formatCurrency(formData.base_cash)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-500">Ventas Totales:</span>
                            <span className="font-bold text-gray-800">
                                ${formatCurrency(productsSold.reduce((sum, item) => sum + (item.quantity * item.price), 0))}
                            </span>
                        </div>
                        {(formData.sales_card > 0 || formData.sales_transfer > 0) && (
                            <div className="pl-2 border-l-2 border-gray-100 my-1 space-y-1">
                                <div className="flex justify-between text-xs text-gray-500">
                                    <span>- Datáfono:</span>
                                    <span>${formatCurrency(formData.sales_card)}</span>
                                </div>
                                <div className="flex justify-between text-xs text-gray-500">
                                    <span>- Transferencia:</span>
                                    <span>${formatCurrency(formData.sales_transfer)}</span>
                                </div>
                            </div>
                        )}
                        <div className="flex justify-between text-sm pt-1 border-t border-dashed border-gray-200">
                            <span className="text-gray-700 font-medium">Ventas Efectivo:</span>
                            <span className="font-medium text-green-700">${formatCurrency(formData.sales_cash)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-500">Propinas Entregadas:</span>
                            <span className="font-medium text-orange-600">-${formatCurrency(formData.tips_total)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-500">Gastos/Salidas:</span>
                            <span className="font-medium text-red-600">-${formatCurrency(formData.expenses_total)}</span>
                        </div>
                        <div className="border-t border-gray-200 pt-2 flex justify-between font-bold">
                            <span>Debería haber:</span>
                            <span>${formatCurrency(expected)}</span>
                        </div>
                    </div>

                    <div className="space-y-3 bg-white border-2 border-gray-100 p-4 rounded-xl flex flex-col justify-center">
                        <h4 className="font-display font-bold text-gray-700">Resultado Físico</h4>
                        <div className="text-center py-4">
                            <p className="text-sm text-gray-400 uppercase tracking-wide">Hay en Caja</p>
                            <p className="text-3xl font-bold text-gray-900">${formatCurrency(formData.cash_audit_count)}</p>
                        </div>

                        <div className={`p-3 rounded-lg text-center ${difference >= 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                            <p className="text-xs font-bold uppercase mb-1">Diferencia</p>
                            <p className="text-xl font-extrabold">
                                {difference > 0 ? '+' : ''}{formatCurrency(difference)}
                            </p>
                            <p className="text-xs opacity-75">{difference === 0 ? '¡Cuadre Perfecto!' : difference > 0 ? 'Sobra dinero' : 'Falta dinero'}</p>
                        </div>
                    </div>
                </div>

                {/* File Uploads Section */}
                <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 mt-4 space-y-4">
                    <h4 className="font-bold text-gray-800 border-b pb-2 flex items-center gap-2">
                        <Upload className="w-4 h-4" /> Soportes Obligatorios
                    </h4>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* 1. Factura Cierre Caja */}
                        <div className="bg-white p-3 rounded-lg border border-gray-200">
                            <label className="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-wide">
                                1. Factura Cierre (Caja) <span className="text-red-500">*</span>
                            </label>
                            {!closingProofUrl ? (
                                <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer hover:bg-gray-50">
                                    <Upload className="w-6 h-6 text-gray-400" />
                                    <span className="text-xs text-gray-500 mt-1">Subir Foto</span>
                                    <input type="file" className="hidden" accept="image/*" capture="environment" onChange={handleClosingProofChange} />
                                </label>
                            ) : (
                                <div className="relative w-full h-24 bg-gray-100 rounded-lg overflow-hidden border">
                                    <img src={closingProofUrl} alt="Preview" className="w-full h-full object-cover" />
                                    <button onClick={() => { setClosingProof(null); setClosingProofUrl('') }} className="absolute top-1 right-1 bg-red-500 text-white p-0.5 rounded-full"><X className="w-3 h-3" /></button>
                                </div>
                            )}
                        </div>

                        {/* 2. Factura Productos Vendidos */}
                        <div className="bg-white p-3 rounded-lg border border-gray-200">
                            <label className="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-wide">
                                2. Productos Vendidos <span className="text-red-500">*</span>
                            </label>
                            {!productsProofUrl ? (
                                <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer hover:bg-gray-50">
                                    <Upload className="w-6 h-6 text-gray-400" />
                                    <span className="text-xs text-gray-500 mt-1">Subir Foto</span>
                                    <input type="file" className="hidden" accept="image/*" capture="environment" onChange={handleProductsProofChange} />
                                </label>
                            ) : (
                                <div className="relative w-full h-24 bg-gray-100 rounded-lg overflow-hidden border">
                                    <img src={productsProofUrl} alt="Preview" className="w-full h-full object-cover" />
                                    <button onClick={() => { setProductsProof(null); setProductsProofUrl('') }} className="absolute top-1 right-1 bg-red-500 text-white p-0.5 rounded-full"><X className="w-3 h-3" /></button>
                                </div>
                            )}
                        </div>

                        {/* 3. Voucher Datáfono (Conditional) */}
                        {formData.sales_card > 0 && (
                            <div className="bg-white p-3 rounded-lg border border-blue-200 ring-2 ring-blue-50">
                                <label className="block text-xs font-bold text-blue-600 mb-2 uppercase tracking-wide">
                                    3. Cierre Datáfono <span className="text-red-500">*</span>
                                </label>
                                {!cardProofUrl ? (
                                    <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-blue-200 border-dashed rounded-lg cursor-pointer hover:bg-blue-50">
                                        <CreditCard className="w-6 h-6 text-blue-400" />
                                        <span className="text-xs text-blue-500 mt-1">Subir Voucher</span>
                                        <input type="file" className="hidden" accept="image/*" capture="environment" onChange={handleCardProofChange} />
                                    </label>
                                ) : (
                                    <div className="relative w-full h-24 bg-gray-100 rounded-lg overflow-hidden border">
                                        <img src={cardProofUrl} alt="Preview" className="w-full h-full object-cover" />
                                        <button onClick={() => { setCardProof(null); setCardProofUrl('') }} className="absolute top-1 right-1 bg-red-500 text-white p-0.5 rounded-full"><X className="w-3 h-3" /></button>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex justify-between pt-4">
                    <Button variant="secondary" onClick={prevStep} startIcon={<ArrowLeft className="w-4 h-4" />}>Atrás</Button>
                    <Button
                        onClick={handleSaveClosing}
                        disabled={loading}
                        className="bg-green-600 hover:bg-green-700 disabled:opacity-50"
                        startIcon={loading ? <span className="animate-spin">⏳</span> : <Save className="w-4 h-4" />}
                    >
                        {loading ? 'Guardando...' : 'Guardar Cierre'}
                    </Button>
                </div>
            </div>
        )
    }

    // --- SAVE LOGIC ---
    const handleSaveClosing = async () => {
        // Basic Validation
        if (!formData.branch_id || !formData.shift || formData.cash_audit_count <= 0) {
            alert('Por favor completa la Sede, el Turno y el Arqueo Físico.')
            return
        }

        // File Validation
        if (!closingProof) {
            alert('⚠️ Falta la Factura de Cierre de Caja. Es obligatoria.')
            return
        }
        if (!productsProof) {
            alert('⚠️ Falta la Factura de Productos Vendidos. Es obligatoria.')
            return
        }
        if (formData.sales_card > 0 && !cardProof) {
            alert('⚠️ Registraste ventas por Datáfono. Debes subir el Cierre del Datáfono.')
            return
        }

        try {
            setLoading(true)
            const user = (await supabase.auth.getUser()).data.user
            if (!user) throw new Error('No usuario autenticado')

            // Helper to upload file
            const uploadFile = async (file: File, prefix: string) => {
                const fileExt = file.name.split('.').pop()
                const filePath = `closings/${Date.now()}_${prefix}.${fileExt}`
                const { error: uploadError } = await supabase.storage.from('expenses').upload(filePath, file)
                if (uploadError) throw uploadError
                const { data } = supabase.storage.from('expenses').getPublicUrl(filePath)
                return data.publicUrl
            }

            // 1. Upload Proofs
            const urlClosing = await uploadFile(closingProof, 'cierre_caja')
            const urlProducts = await uploadFile(productsProof, 'productos')
            let urlCard = ''
            if (cardProof) {
                urlCard = await uploadFile(cardProof, 'datafono')
            }

            // Construct Notes with URLs
            let finalNotes = formData.notes
            finalNotes += `\n\n[SOPORTES ADJUNTOS]:`
            finalNotes += `\n📄 Cierre Caja: ${urlClosing}`
            finalNotes += `\n📦 Productos: ${urlProducts}`
            if (urlCard) finalNotes += `\n💳 Datáfono: ${urlCard}`

            // 2. Insert Main Closing Record
            const { data: closingData, error: closingError } = await supabase.from('mys_closings').insert({
                branch_id: formData.branch_id,
                closed_by: user.id,
                shift: formData.shift,
                base_cash: formData.base_cash,
                sales_cash: formData.sales_cash,
                sales_card: formData.sales_card,
                sales_transfer: formData.sales_transfer,
                expenses_total: formData.expenses_total,
                tips_total: formData.tips_total,
                cash_audit_count: formData.cash_audit_count,
                notes: finalNotes
            }).select().single()

            if (closingError) throw closingError
            const closingId = closingData.id

            // 3. Insert Products
            if (productsSold.length > 0) {
                const productsToInsert = productsSold.map(p => ({
                    closing_id: closingId,
                    product_id: p.product_id,
                    quantity: p.quantity,
                    unit_price: p.price
                }))
                const { error: prodError } = await supabase.from('mys_closing_products').insert(productsToInsert)
                if (prodError) throw prodError
            }

            // 4. Insert Movements (Expenses + Tips)
            const movementsToInsert = []

            // Process Expenses (Upload receipts first)
            for (const expense of expensesList) {
                let evidenceUrl = expense.proofUrl // Default if already remote (unlikely in created mode)

                if (expense.proofFile) {
                    const fileExt = expense.proofFile.name.split('.').pop()
                    const filePath = `expenses/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`
                    const { error: upErr } = await supabase.storage.from('expenses').upload(filePath, expense.proofFile)
                    if (upErr) console.error('Error uploading receipt', upErr)
                    else {
                        const { data } = supabase.storage.from('expenses').getPublicUrl(filePath)
                        evidenceUrl = data.publicUrl
                    }
                }

                movementsToInsert.push({
                    closing_id: closingId,
                    type: 'expense',
                    amount: expense.amount,
                    description: expense.description,
                    evidence_url: evidenceUrl
                })
            }

            // Process Tips
            for (const tip of tipsList) {
                movementsToInsert.push({
                    closing_id: closingId,
                    type: 'tip',
                    amount: tip.amount,
                    employee_id: tip.employee_id,
                    description: `Propina a ${tip.employee_name}`
                })
            }

            if (movementsToInsert.length > 0) {
                const { error: movError } = await supabase.from('mys_closing_movements').insert(movementsToInsert)
                if (movError) throw movError
            }

            alert('¡Cierre Guardado con Éxito!')
            // Redirect or Reset?
            window.location.href = '/portal/gestion' // Or wherever user should go

        } catch (error: any) {
            console.error('Error saving closing:', error)
            // Enhanced error reporting for user
            const errorMessage = error.message || 'Error desconocido'
            const errorDetails = error.details || error.hint || JSON.stringify(error)
            alert(`Error al guardar:\n${errorMessage}\n\nDetalles: ${errorDetails}`)
        } finally {
            setLoading(false)
        }
    }

    return (
        <Card className="p-6">
            {/* Stepper Header */}
            <div className="flex items-center justify-between mb-8 px-4">
                {[1, 2, 3, 4, 5].map(i => (
                    <div key={i} className={`flex items-center ${i < 5 ? 'w-full' : ''}`}>
                        <div className={`
                            w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm transition-colors
                            ${step >= i ? 'bg-pp-gold text-pp-brown' : 'bg-gray-200 text-gray-500'}
                        `}>
                            {i}
                        </div>
                        {i < 5 && (
                            <div className={`h-1 w-full mx-2 rounded-full ${step > i ? 'bg-pp-gold' : 'bg-gray-100'}`} />
                        )}
                    </div>
                ))}
            </div>

            {step === 1 && renderStep1()}
            {step === 2 && renderStep2()}
            {step === 3 && renderStep3()}
            {step === 4 && renderStep4()}
            {step === 5 && renderStep5()}

        </Card>
    )
}
