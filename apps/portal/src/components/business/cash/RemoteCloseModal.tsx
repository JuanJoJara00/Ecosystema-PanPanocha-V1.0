import React, { useState, useEffect } from 'react'

import Button from '@/components/ui/Button'
import { supabase } from '@/lib/supabase'
import { Shift, Product } from '@panpanocha/types'
import { X, Search, Plus, Trash2, ArrowRight, AlertTriangle, Check, DollarSign } from 'lucide-react'

// Formatting Helpers
const formatCurrency = (val: number) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(val)

type RemoteCloseModalProps = {
    isOpen: boolean
    onClose: () => void
    shift: Shift
    onSuccess: () => void
}

export default function RemoteCloseModal({ isOpen, onClose, shift, onSuccess }: RemoteCloseModalProps) {
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);

    // --- STATE ---

    // Step 1: PanPanocha Audit
    const [ppAuditCash, setPpAuditCash] = useState<number>(0);
    const [ppExpected, setPpExpected] = useState<number>(0);
    const [ppCalculatedSales, setPpCalculatedSales] = useState<number>(0);
    const [ppExpenses, setPpExpenses] = useState<number>(0);

    // Step 2: Siigo Manual Data
    const [siigoProducts, setSiigoProducts] = useState<{ product: Product, quantity: number }[]>([]);
    const [siigoExpenses, setSiigoExpenses] = useState<{ description: string, amount: number }[]>([]);
    const [siigoCashCount, setSiigoCashCount] = useState<number>(0);
    const [siigoBase, setSiigoBase] = useState<number>(0);

    // Siigo Product Search
    const [searchTerm, setSearchTerm] = useState('');
    const [searchResults, setSearchResults] = useState<Product[]>([]);
    const [isSearching, setIsSearching] = useState(false);

    // Step 3: Tips
    const [tipsDelivered, setTipsDelivered] = useState<number>(0);
    const [tipsTotal, setTipsTotal] = useState<number>(0); // Fetched from DB? Or manual? Usually manual in remote or 0.

    // --- INITIALIZATION ---
    useEffect(() => {
        if (isOpen && shift) {
            fetchInitialData();
            setStep(1);
        }
    }, [isOpen, shift]);

    const fetchInitialData = async () => {
        setLoading(true);
        // 1. Calculate PanPanocha Sales & Expenses from DB
        const { data: sales } = await supabase.from('sales').select('total_amount, payment_method, tip_amount').eq('shift_id', shift.id);
        const { data: expenses } = await supabase.from('expenses').select('amount').eq('shift_id', shift.id);

        const totalSales = sales?.reduce((acc, s) => acc + (s.total_amount || 0), 0) || 0;
        const totalExpenses = expenses?.reduce((acc, e) => acc + (e.amount || 0), 0) || 0;
        const totalTips = sales?.reduce((acc, s) => acc + (s.tip_amount || 0), 0) || 0;

        setPpCalculatedSales(totalSales);
        setPpExpenses(totalExpenses);
        setTipsTotal(totalTips);

        // Expected Cash = Initial + Sales(Cash) - Expenses - Tips(if distributed in cash, usually kept separate or subtracted)
        // Ideally we filter sales by payment_method = 'cash'
        const cashSales = sales?.filter(s => s.payment_method === 'cash').reduce((acc, s) => acc + s.total_amount, 0) || 0;

        // Simplified Logic mimicking POS
        setPpExpected((shift.initial_cash || 0) + cashSales - totalExpenses);
        setPpAuditCash((shift.initial_cash || 0) + cashSales - totalExpenses); // Default to expected

        setLoading(false);
    };

    // --- HANDLERS ---

    // Product Search
    useEffect(() => {
        const search = async () => {
            if (searchTerm.length < 3) {
                setSearchResults([]);
                return;
            }
            setIsSearching(true);
            const { data } = await supabase.from('products')
                .select('*')
                .ilike('name', `%${searchTerm}%`)
                .limit(5);
            setSearchResults(data || []);
            setIsSearching(false);
        };
        const timeout = setTimeout(search, 300);
        return () => clearTimeout(timeout);
    }, [searchTerm]);

    const addProduct = (product: Product) => {
        const existing = siigoProducts.find(p => p.product.id === product.id);
        if (existing) {
            setSiigoProducts(siigoProducts.map(p => p.product.id === product.id ? { ...p, quantity: p.quantity + 1 } : p));
        } else {
            setSiigoProducts([...siigoProducts, { product, quantity: 1 }]);
        }
        setSearchTerm('');
        setSearchResults([]);
    };

    const updateQuantity = (productId: string, qty: number) => {
        if (qty <= 0) {
            setSiigoProducts(siigoProducts.filter(p => p.product.id !== productId));
        } else {
            setSiigoProducts(siigoProducts.map(p => p.product.id === productId ? { ...p, quantity: qty } : p));
        }
    };

    const addSiigoExpense = (desc: string, amount: number) => {
        if (!desc || !amount) return;
        setSiigoExpenses([...siigoExpenses, { description: desc, amount }]);
    };

    // --- FINISH ---
    const handleCloseShift = async () => {
        setLoading(true);

        const siigoSalesTotal = siigoProducts.reduce((acc, p) => acc + (p.product.price * p.quantity), 0);
        const siigoExpensesTotal = siigoExpenses.reduce((acc, e) => acc + e.amount, 0);

        const closingMetadata = {
            panpanocha: {
                base_cash: shift.initial_cash,
                sales_cash: ppCalculatedSales, // Assuming all cash for simp. logic or filtered above
                sales_card: 0,
                sales_transfer: 0,
                expenses_total: ppExpenses,
                tips_total: tipsTotal,
                cash_audit_count: ppAuditCash,
                notes: 'Cierre Remoto'
            },
            siigo: {
                base_cash: siigoBase,
                sales_cash: siigoSalesTotal, // Assume cash for manual entry
                sales_card: 0,
                sales_transfer: 0,
                expenses_total: siigoExpensesTotal,
                tips_total: 0,
                cash_audit_count: siigoCashCount,
                productsSold: siigoProducts.map(p => ({
                    product_id: p.product.id,
                    name: p.product.name,
                    quantity: p.quantity,
                    price: p.product.price
                })),
                expensesList: siigoExpenses
            }
        };

        const totalFinalCash = ppAuditCash + siigoCashCount;

        // Update DB
        const { error } = await supabase
            .from('shifts')
            .update({
                status: 'closed',
                end_time: new Date().toISOString(),
                final_cash: totalFinalCash,
                closing_metadata: JSON.stringify(closingMetadata),
                closed_by_method: 'remote'
            })
            .eq('id', shift.id);

        setLoading(false);
        if (error) {
            alert('Error cerrando turno: ' + error.message);
        } else {
            onSuccess();
            onClose();
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
            <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col">
                {/* Header */}
                <div className="p-6 border-b flex justify-between items-center sticky top-0 bg-white z-10">
                    <div>
                        <h2 className="text-xl font-bold text-gray-800">Cierre de Caja Remoto</h2>
                        <p className="text-sm text-gray-500">Paso {step} de 4</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full" aria-label="Cerrar modal" title="Cerrar"><X className="w-5 h-5 text-gray-500" /></button>
                </div>

                <div className="p-6 flex-1 overflow-y-auto">
                    {/* STEP 1: PANPANOCHA */}
                    {step === 1 && (
                        <div className="space-y-6 animate-in slide-in-from-right duration-200">
                            <h3 className="font-bold text-lg text-orange-600 flex items-center gap-2">
                                <span className="bg-orange-100 p-1 rounded">1</span> PanPanocha (Operativo)
                            </h3>

                            <div className="bg-gray-50 p-4 rounded-xl space-y-3">
                                <div className="flex justify-between text-sm"><span>Base Inicial:</span> <span className="font-bold">{formatCurrency(shift.initial_cash || 0)}</span></div>
                                <div className="flex justify-between text-sm"><span>+ Ventas (Calc):</span> <span className="font-bold">{formatCurrency(ppCalculatedSales)}</span></div>
                                <div className="flex justify-between text-sm text-red-500"><span>- Gastos:</span> <span className="font-bold">-{formatCurrency(ppExpenses)}</span></div>
                                <div className="border-t pt-2 mt-2 flex justify-between font-bold text-gray-700"><span>Esperado:</span> <span>{formatCurrency(ppExpected)}</span></div>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">Efectivo Real (Auditado)</label>
                                <div className="relative">
                                    <DollarSign className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                                    <input
                                        type="number"
                                        placeholder="0"
                                        aria-label="Efectivo Real Auditado"
                                        title="Efectivo Real Auditado"
                                        value={ppAuditCash}
                                        onChange={(e) => setPpAuditCash(Number(e.target.value))}
                                        className="w-full pl-10 pr-4 py-3 bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 font-bold text-lg"
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* STEP 2: SIIGO */}
                    {step === 2 && (
                        <div className="space-y-6 animate-in slide-in-from-right duration-200">
                            <h3 className="font-bold text-lg text-blue-600 flex items-center gap-2">
                                <span className="bg-blue-100 p-1 rounded">2</span> Siigo (Manual)
                            </h3>

                            <div className="space-y-4">
                                <div className="bg-blue-50 p-4 rounded-xl">
                                    <label className="block text-xs font-bold text-blue-800 uppercase mb-1">Buscar Producto</label>
                                    <div className="relative">
                                        <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                                        <input
                                            type="text"
                                            placeholder="Nombre o código..."
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            className="w-full pl-9 pr-4 py-2 border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                        />
                                    </div>
                                    {/* Results Dropdown */}
                                    {searchResults.length > 0 && (
                                        <div className="absolute bg-white shadow-xl border rounded-xl mt-2 w-full max-w-md z-20 max-h-48 overflow-y-auto">
                                            {searchResults.map(p => (
                                                <div key={p.id} onClick={() => addProduct(p)} className="p-3 hover:bg-gray-50 cursor-pointer border-b flex justify-between items-center">
                                                    <span className="font-medium text-sm">{p.name}</span>
                                                    <span className="text-gray-500 text-xs font-bold">{formatCurrency(p.price)}</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Product List */}
                                <div className="space-y-2 max-h-40 overflow-y-auto">
                                    {siigoProducts.map((item, idx) => (
                                        <div key={idx} className="flex items-center justify-between bg-white border p-2 rounded-lg">
                                            <div className="flex-1">
                                                <p className="text-sm font-bold truncate">{item.product.name}</p>
                                                <p className="text-xs text-gray-500">{formatCurrency(item.product.price)} x {item.quantity}</p>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <input
                                                    type="number"
                                                    placeholder="Cant"
                                                    aria-label={`Cantidad de ${item.product.name}`}
                                                    title={`Cantidad de ${item.product.name}`}
                                                    className="w-16 p-1 border rounded text-center text-sm"
                                                    value={item.quantity}
                                                    onChange={(e) => updateQuantity(item.product.id, Number(e.target.value))}
                                                />
                                                <button onClick={() => updateQuantity(item.product.id, 0)} className="text-red-400 hover:text-red-600" aria-label="Eliminar producto" title="Eliminar"><Trash2 className="w-4 h-4" /></button>
                                            </div>
                                        </div>
                                    ))}
                                    {siigoProducts.length === 0 && <p className="text-center text-gray-400 text-sm py-2">No hay productos agregados</p>}
                                </div>

                                {/* Totals Wrapper */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 mb-1">Base Siigo</label>
                                        <input type="number"
                                            placeholder="0"
                                            aria-label="Base Siigo"
                                            title="Base Siigo"
                                            value={siigoBase} onChange={e => setSiigoBase(Number(e.target.value))}
                                            className="w-full p-2 border rounded-lg"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 mb-1">Efectivo Real Siigo</label>
                                        <input type="number"
                                            placeholder="0"
                                            aria-label="Efectivo Real Siigo"
                                            title="Efectivo Real Siigo"
                                            value={siigoCashCount} onChange={e => setSiigoCashCount(Number(e.target.value))}
                                            className="w-full p-2 border rounded-lg font-bold"
                                        />
                                    </div>
                                </div>

                                {/* Expenses Mini-Form */}
                                <div className="border-t pt-4">
                                    <h4 className="font-bold text-sm mb-2 text-gray-600">Gastos Siigo</h4>
                                    <div className="flex gap-2 mb-2">
                                        <input
                                            id="expDesc"
                                            type="text"
                                            placeholder="Descripción"
                                            aria-label="Descripción del gasto"
                                            title="Descripción del gasto"
                                            className="flex-1 p-2 border rounded-lg"
                                        />
                                        <input
                                            id="expAmnt"
                                            type="number"
                                            placeholder="$"
                                            aria-label="Monto del gasto"
                                            title="Monto del gasto"
                                            className="w-24 p-2 border rounded-lg"
                                        />
                                        <Button size="sm" onClick={() => {
                                            const desc = (document.getElementById('expDesc') as HTMLInputElement).value;
                                            const amnt = Number((document.getElementById('expAmnt') as HTMLInputElement).value);
                                            addSiigoExpense(desc, amnt);
                                            (document.getElementById('expDesc') as HTMLInputElement).value = '';
                                            (document.getElementById('expAmnt') as HTMLInputElement).value = '';
                                        }}><Plus className="w-4 h-4" /></Button>
                                    </div>
                                    <div className="space-y-1">
                                        {siigoExpenses.map((e, i) => (
                                            <div key={i} className="flex justify-between text-xs bg-gray-50 p-2 rounded">
                                                <span>{e.description}</span>
                                                <span className="font-bold text-red-500">-{formatCurrency(e.amount)}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* STEP 3: TIPS */}
                    {step === 3 && (
                        <div className="space-y-6 animate-in slide-in-from-right duration-200">
                            <h3 className="font-bold text-lg text-purple-600 flex items-center gap-2">
                                <span className="bg-purple-100 p-1 rounded">3</span> Propinas
                            </h3>
                            <div className="bg-purple-50 p-6 rounded-xl text-center">
                                <p className="text-sm text-gray-600 mb-2">Total Propinas Recaudadas</p>
                                <p className="text-3xl font-black text-purple-700">{formatCurrency(tipsTotal)}</p>
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">Propinas Entregadas</label>
                                <input
                                    type="number"
                                    placeholder="0"
                                    aria-label="Propinas Entregadas"
                                    title="Propinas Entregadas"
                                    value={tipsDelivered}
                                    onChange={(e) => setTipsDelivered(Number(e.target.value))}
                                    className="w-full p-3 border border-gray-300 rounded-xl font-bold"
                                />
                                <p className="text-xs text-gray-500 mt-2">Ingrese el monto entregado en efectivo a los empleados.</p>
                            </div>
                        </div>
                    )}

                    {/* STEP 4: CONFIRM */}
                    {step === 4 && (
                        <div className="space-y-6 animate-in slide-in-from-right duration-200 text-center">
                            <div className="bg-green-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Check className="w-8 h-8 text-green-600" />
                            </div>
                            <h3 className="font-black text-2xl text-gray-800">¿Finalizar Cierre?</h3>
                            <p className="text-gray-500">
                                Esta acción cerrará el turno en el sistema y cerrará la sesión del POS automáticamente.
                            </p>

                            <div className="bg-gray-50 p-4 rounded-xl text-left space-y-2 text-sm">
                                <div className="flex justify-between"><span>Total PanPanocha:</span> <span className="font-bold">{formatCurrency(ppAuditCash)}</span></div>
                                <div className="flex justify-between"><span>Total Siigo:</span> <span className="font-bold">{formatCurrency(siigoCashCount)}</span></div>
                                <div className="flex justify-between text-lg pt-2 border-t"><span>Total Caja:</span> <span className="font-bold text-green-600">{formatCurrency(ppAuditCash + siigoCashCount)}</span></div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-6 border-t bg-gray-50 rounded-b-2xl flex justify-between items-center">
                    {step > 1 ? (
                        <Button variant="ghost" onClick={() => setStep(step - 1)}>Atrás</Button>
                    ) : (
                        <div />
                    )}

                    {step < 4 ? (
                        <Button onClick={() => setStep(step + 1)} className="bg-gray-900 text-white hover:bg-gray-800">
                            Siguiente <ArrowRight className="w-4 h-4 ml-2" />
                        </Button>
                    ) : (
                        <Button onClick={handleCloseShift} disabled={loading} className="bg-green-600 text-white hover:bg-green-700 w-full md:w-auto">
                            {loading ? 'Cerrando...' : 'Confirmar Cierre Remoto'}
                        </Button>
                    )}
                </div>
            </div>
        </div>
    );
}
