import { useState, useMemo, useEffect } from 'react';
import { Button } from '@panpanocha/ui';
import {
    X, CreditCard, Coins, Wallet, Printer, Package, Calculator, Receipt, Search, Plus, Trash2, AlertTriangle
} from 'lucide-react';
import { usePosStore } from '../../store';
import type { ClosingData, ClosingProduct } from '../../types';
import { LoadingOverlay } from '../Loading';

declare global {
    interface Window {
        ipcRenderer: any;
    }
}

const DENOMINATIONS_BILLS = [100000, 50000, 20000, 10000, 5000, 2000];
const DENOMINATIONS_COINS = [1000, 500, 200, 100, 50];

interface SiigoClosingModalProps {
    onClose: () => void;
    onComplete: (data: ClosingData) => void;
    initialStep?: number;
    readOnly?: boolean;
}

export function SiigoClosingModal({ onClose, onComplete, initialStep, readOnly = false }: SiigoClosingModalProps) {
    const { products, closingSession, updateClosingSession, currentShift, branches, currentUser } = usePosStore();
    const session = closingSession.siigo;

    const [loading, setLoading] = useState(false);
    const [printProducts, setPrintProducts] = useState(false);

    // Local UI state (not persisted)
    const [productSearch, setProductSearch] = useState('');
    const [selectedProduct, setSelectedProduct] = useState<{ id: string; name: string; price: number } | null>(null);
    const [productQuantity, setProductQuantity] = useState(1);
    const [showProductDropdown, setShowProductDropdown] = useState(false);
    const [expenseForm, setExpenseForm] = useState({ description: '', amount: 0 });
    const [encargadoAuthorized, setEncargadoAuthorized] = useState(false);

    // Helpers to update store
    const setFormData = (data: Partial<typeof session.formData>) => {
        if (readOnly) return;
        updateClosingSession('siigo', { formData: { ...session.formData, ...data } });
    };

    const setProductsSold = (products: ClosingProduct[]) => {
        if (readOnly) return;
        updateClosingSession('siigo', { productsSold: products });
    };

    const setExpensesList = (expenses: { description: string; amount: number }[]) => {
        if (readOnly) return;
        updateClosingSession('siigo', { expensesList: expenses });
    };

    const setCashCounts = (counts: Record<number, number>) => {
        if (readOnly) return;
        updateClosingSession('siigo', { cashCounts: counts });
    };

    const setStep = (step: number) => {
        updateClosingSession('siigo', { step });
    };

    // Initialize step/readonly
    useEffect(() => {
        if (initialStep) {
            setStep(initialStep);
        }
    }, [initialStep]);

    const formatCurrency = (amount: number) => {
        return `$${(amount || 0).toLocaleString('es-CO')} `;
    };

    const parseCurrency = (value: string) => {
        return parseFloat(value.replace(/\./g, '').replace(/,/g, '')) || 0;
    };

    // Calculations
    const totalProducts = useMemo(() =>
        session.productsSold.reduce((sum, p) => sum + (p.quantity * p.price), 0),
        [session.productsSold]
    );

    const totalExpenses = useMemo(() =>
        session.expensesList.reduce((sum, e) => sum + e.amount, 0),
        [session.expensesList]
    );

    const cashAuditCount = useMemo(() =>
        [...DENOMINATIONS_BILLS, ...DENOMINATIONS_COINS].reduce((sum, denom) =>
            sum + (denom * (session.cashCounts[denom] || 0)), 0
        ),
        [session.cashCounts]
    );

    // Auto-calculate Cash Sales
    useEffect(() => {
        if (readOnly) return;
        const calculatedCash = Math.max(0, totalProducts - (session.formData.sales_card + session.formData.sales_transfer));
        if (calculatedCash !== session.formData.sales_cash) {
            setFormData({ sales_cash: calculatedCash });
        }
    }, [totalProducts, session.formData.sales_card, session.formData.sales_transfer, readOnly]);

    const expectedCash = useMemo(() =>
        session.formData.initial_cash + session.formData.sales_cash - totalExpenses,
        [session.formData.initial_cash, session.formData.sales_cash, totalExpenses]
    );

    const difference = cashAuditCount - expectedCash;
    const isPositive = difference >= 0;

    // Filter products
    const filteredProducts = useMemo(() => {
        if (!productSearch.trim()) return products.slice(0, 10);
        const search = productSearch.toLowerCase();
        return products.filter(p =>
            p.name.toLowerCase().includes(search) ||
            p.category?.toLowerCase().includes(search)
        ).slice(0, 10);
    }, [products, productSearch]);

    // Handlers
    const handleAddProduct = () => {
        if (!selectedProduct || productQuantity <= 0) return;

        const existingIndex = session.productsSold.findIndex(p => p.product_id === selectedProduct.id);
        const newProducts = [...session.productsSold];

        if (existingIndex >= 0) {
            // Aggregate quantity if already exists
            newProducts[existingIndex] = {
                ...newProducts[existingIndex],
                quantity: newProducts[existingIndex].quantity + productQuantity
            };
        } else {
            // Add new
            newProducts.push({
                product_id: selectedProduct.id,
                name: selectedProduct.name,
                quantity: productQuantity,
                price: selectedProduct.price
            });
        }

        setProductsSold(newProducts);
        setSelectedProduct(null);
        setProductSearch('');
        setProductQuantity(1);
        setShowProductDropdown(false);
    };

    const handleUpdateProductQuantity = (idx: number, newQty: number) => {
        if (readOnly || newQty < 1) return;
        const newProducts = [...session.productsSold];
        newProducts[idx] = { ...newProducts[idx], quantity: newQty };
        setProductsSold(newProducts);
    };

    const handleRemoveProduct = (idx: number) => {
        setProductsSold(session.productsSold.filter((_, i) => i !== idx));
    };

    const handleAddExpense = () => {
        if (!expenseForm.description || expenseForm.amount <= 0) return;
        setExpensesList([...session.expensesList, { ...expenseForm }]);
        setExpenseForm({ description: '', amount: 0 });
    };

    const handleRemoveExpense = (idx: number) => {
        setExpensesList(session.expensesList.filter((_, i) => i !== idx));
    };

    const handleCountChange = (denom: number, val: string) => {
        const qty = parseInt(val) || 0;
        setCashCounts({ ...session.cashCounts, [denom]: qty });
    };

    const handleSaveClosing = async () => {
        if (readOnly) return;
        setLoading(true);
        try {
            const cashToDeliver = session.formData.sales_cash - totalExpenses; // Tips separate
            const totalSales = session.formData.sales_cash + session.formData.sales_card + session.formData.sales_transfer;

            const savedData: ClosingData = {
                cashToDeliver,
                totalSales,
                difference,
                tips: session.formData.tips,
                expenses: totalExpenses,
                finalCash: cashAuditCount,
                baseCash: session.formData.initial_cash,
                cashSales: session.formData.sales_cash,
                cardSales: session.formData.sales_card,
                transferSales: session.formData.sales_transfer
            };

            // Save to store persistence
            updateClosingSession('siigo', {
                completed: true,
                savedData
            });

            // UNIFIED SYNC: Update the current shift in SQLite with this detailed metadata
            if (currentShift?.id && window.electron && window.electron.updateShift) {
                try {
                    console.log('[UnifiedClosing] Persisting metadata to shift:', currentShift.id);
                    await window.electron.updateShift(currentShift.id, {
                        closing_metadata: JSON.stringify({
                            siigo: savedData,
                            // If we have 'mys' data separate, we should merge it. 
                            // For now assuming SiigoClosingModal handles the 'accounting' view 
                            // and the operational view comes from the Shift fields themselves (final_cash, etc).
                            // But per user request "complete closing package", we might want to store everything here.
                            timestamp: new Date().toISOString()
                        })
                    });
                } catch (err) {
                    console.error('[UnifiedClosing] Failed to update shift metadata:', err);
                }
            }

            console.log('[SiigoClosing] Saved to persistence');

            // Trigger Printing
            if (window.ipcRenderer) {
                // 1. Print Closing Receipt
                window.ipcRenderer.invoke('print-siigo-closing', {
                    ...savedData,
                    shift: session.formData.shift,
                    initial_cash: session.formData.initial_cash,
                    sales_cash: session.formData.sales_cash,
                    sales_card: session.formData.sales_card,
                    sales_transfer: session.formData.sales_transfer,
                    products: session.productsSold,
                    expenses: session.expensesList,
                    cashCounts: session.cashCounts
                });

                // 2. Print Product Details (Optional)
                if (printProducts) {
                    window.ipcRenderer.invoke('print-order-details', {
                        items: session.productsSold
                    });
                }
            }

            alert('✅ Cierre Siigo guardado con éxito');
            onComplete(savedData);
        } catch (error) {
            console.error('[SiigoClosing] Error:', error);
            alert('Error al guardar el cierre');
        } finally {
            setLoading(false);
        }
    };

    // Navigation
    const nextStep = () => setStep(Math.min(session.step + 1, 3));
    const prevStep = () => setStep(Math.max(session.step - 1, 1));

    const handlePrintCopy = async () => {
        if (readOnly) {
            const dataToPrint = {
                shift: currentShift,
                branch: branches.find(b => b.id === currentShift?.branch_id),
                user: currentUser,
                summary: {
                    totalSales: session.formData.sales_cash + session.formData.sales_card + session.formData.sales_transfer,
                    cashSales: session.formData.sales_cash,
                    cardSales: session.formData.sales_card,
                    transferSales: session.formData.sales_transfer,
                    totalTips: session.formData.tips,
                    totalExpenses: totalExpenses,
                    cashAuditCount: cashAuditCount,
                    difference: difference,
                    expectedCash: expectedCash
                },
                initial_cash: session.formData.initial_cash,
                sales_cash: session.formData.sales_cash,
                sales_card: session.formData.sales_card,
                sales_transfer: session.formData.sales_transfer,
                tips: session.formData.tips,
                difference: difference,
                finalCash: cashAuditCount,
                expenses: session.expensesList,
                cashCounts: session.cashCounts,
                products: session.productsSold
            };

            try {
                // Send to main process
                await window.electron.printSiigoClosing(dataToPrint);

                if (printProducts) {
                    const mockItems: any[] = session.productsSold.map(p => ({
                        product_name: p.name,
                        quantity: p.quantity,
                        unit_price: p.price,
                        total_price: p.price * p.quantity
                    }));
                    // @ts-ignore - printing service is flexible
                    await window.electron.printOrderDetails({ items: mockItems });
                }
            } catch (error) {
                console.error('Error printing:', error);
                alert('Error al imprimir copia.');
            }
        }
    };

    if (loading) {
        return <LoadingOverlay message="Procesando cierre..." show={true} />;
    }

    return (
        <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[80] flex items-center justify-center p-4"
            onClick={onClose}
        >
            <div
                className="bg-white rounded-[30px] shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="bg-gradient-to-br from-indigo-600 to-indigo-800 p-6 text-white shrink-0">
                    <div className="flex justify-between items-start">
                        <div>
                            <h2 className="text-2xl font-black uppercase tracking-tight leading-none flex items-center gap-2">
                                <Calculator size={24} />
                                {readOnly ? 'Detalle Cierre Siigo' : 'Cierre Siigo'}
                            </h2>
                            <p className="text-white/80 text-sm mt-1">
                                {readOnly ? 'Modo Lectura' : `Paso ${session.step} de 3 — ${session.step === 1 ? 'Registro' :
                                    session.step === 2 ? 'Arqueo' :
                                        'Resumen'
                                    } `}
                            </p>
                        </div>
                        <button onClick={onClose} className="text-white/70 hover:text-white transition-colors">
                            <X size={24} />
                        </button>
                    </div>

                    {/* Progress Bar */}
                    <div className="flex gap-1 mt-4">
                        {[1, 2, 3].map(s => (
                            <div
                                key={s}
                                className={`flex - 1 h - 1.5 rounded - full transition - colors ${s <= session.step ? 'bg-white' : 'bg-white/30'} `}
                            />
                        ))}
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 bg-gray-50/50">

                    {/* STEP 1: REGISTRO INTEGRADO */}
                    {session.step === 1 && (
                        <div className="grid grid-cols-12 gap-6 animate-in fade-in slide-in-from-right-4">
                            {/* Left Column: Register Data */}
                            <div className="col-span-12 lg:col-span-5 space-y-5">
                                <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 space-y-4">
                                    <h3 className="font-bold text-gray-800 flex items-center gap-2 text-sm uppercase mb-2">
                                        <Wallet size={16} className="text-indigo-600" />
                                        Datos Generales
                                    </h3>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Turno</label>
                                            <div className="px-3 py-2 bg-gray-100 rounded-lg text-gray-600 font-bold border border-gray-200 capitalize text-sm">
                                                {session.formData.shift}
                                            </div>
                                        </div>
                                        <div>
                                            <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Base Inicial</label>
                                            <div className="relative">
                                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-bold">$</span>
                                                <input
                                                    type="text"
                                                    disabled={readOnly}
                                                    value={session.formData.initial_cash > 0 ? new Intl.NumberFormat('es-CO').format(session.formData.initial_cash) : ''}
                                                    onChange={e => setFormData({ initial_cash: parseCurrency(e.target.value) })}
                                                    className="w-full pl-7 px-3 py-2 rounded-lg border border-gray-200 focus:border-indigo-500 font-bold text-gray-800 text-sm outline-none"
                                                    placeholder="0"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 space-y-4">
                                    <h3 className="font-bold text-gray-800 flex items-center gap-2 text-sm uppercase mb-2">
                                        <CreditCard size={16} className="text-indigo-600" />
                                        Pagos Recibidos
                                    </h3>

                                    <div className="space-y-3">
                                        <div>
                                            <label className="text-xs text-gray-500 mb-1 flex items-center justify-between">
                                                Efectivo <span className="text-[9px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded border border-green-200">AUTO-CALCULADO</span>
                                            </label>
                                            <input
                                                disabled
                                                type="text"
                                                value={formatCurrency(session.formData.sales_cash)}
                                                className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-gray-50 text-gray-500 font-bold text-center"
                                            />
                                        </div>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <label className="text-xs text-gray-500 mb-1 block">Tarjeta</label>
                                                <div className="relative">
                                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-bold">$</span>
                                                    <input
                                                        type="text"
                                                        disabled={readOnly}
                                                        value={session.formData.sales_card > 0 ? new Intl.NumberFormat('es-CO').format(session.formData.sales_card) : ''}
                                                        onChange={e => setFormData({ sales_card: parseCurrency(e.target.value) })}
                                                        className="w-full pl-7 px-3 py-2 rounded-lg border border-gray-200 focus:border-blue-500 text-center font-medium outline-none"
                                                        placeholder="0"
                                                    />
                                                </div>
                                            </div>
                                            <div>
                                                <label className="text-xs text-gray-500 mb-1 block">Transferencia</label>
                                                <div className="relative">
                                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-bold">$</span>
                                                    <input
                                                        type="text"
                                                        disabled={readOnly}
                                                        value={session.formData.sales_transfer > 0 ? new Intl.NumberFormat('es-CO').format(session.formData.sales_transfer) : ''}
                                                        onChange={e => setFormData({ sales_transfer: parseCurrency(e.target.value) })}
                                                        className="w-full pl-7 px-3 py-2 rounded-lg border border-gray-200 focus:border-purple-500 text-center font-medium outline-none"
                                                        placeholder="0"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-amber-50 p-5 rounded-2xl border border-amber-100 space-y-3">
                                    <h3 className="font-bold text-amber-800 flex items-center gap-2 text-sm uppercase">
                                        <Coins size={16} /> Propinas
                                    </h3>
                                    <div>
                                        <label className="text-xs text-amber-600 mb-1 block">Total Propinas Registradas</label>
                                        <div className="relative">
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-amber-600 font-bold">$</span>
                                            <input
                                                type="text"
                                                disabled={readOnly}
                                                value={session.formData.tips > 0 ? new Intl.NumberFormat('es-CO').format(session.formData.tips) : ''}
                                                onChange={e => setFormData({ tips: parseCurrency(e.target.value) })}
                                                className="w-full pl-7 px-3 py-2 rounded-lg border border-amber-200 bg-white focus:border-amber-500 font-bold text-amber-900 outline-none"
                                                placeholder="0"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Right Column: Products & Expenses */}
                            <div className="col-span-12 lg:col-span-7 space-y-5">
                                {/* Product Section */}
                                <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 h-[380px] flex flex-col">
                                    <div className="flex items-center justify-between mb-3 shrink-0">
                                        <h3 className="font-bold text-gray-800 flex items-center gap-2 text-sm uppercase">
                                            <Receipt size={16} className="text-indigo-600" />
                                            Productos Vendidos
                                        </h3>
                                        <span className="text-sm font-black text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full">
                                            Total: {formatCurrency(totalProducts)}
                                        </span>
                                    </div>

                                    {!readOnly && (
                                        <div className="flex gap-2 mb-3 shrink-0">
                                            <div className="relative flex-1">
                                                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                                <input
                                                    type="text"
                                                    placeholder="Buscar producto..."
                                                    value={selectedProduct ? selectedProduct.name : productSearch}
                                                    onChange={e => {
                                                        setProductSearch(e.target.value);
                                                        setSelectedProduct(null);
                                                        setShowProductDropdown(true);
                                                    }}
                                                    onFocus={() => setShowProductDropdown(true)}
                                                    className="w-full pl-9 pr-3 h-10 rounded-lg border border-gray-200 focus:border-indigo-500 outline-none text-sm"
                                                />
                                                {showProductDropdown && !selectedProduct && (
                                                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-xl max-h-48 overflow-y-auto z-20">
                                                        {filteredProducts.map(p => (
                                                            <button
                                                                key={p.id}
                                                                onClick={() => {
                                                                    setSelectedProduct({ id: p.id, name: p.name, price: p.price });
                                                                    setShowProductDropdown(false);
                                                                }}
                                                                className="w-full text-left px-4 py-2 hover:bg-gray-50 border-b border-gray-50 text-sm flex justify-between"
                                                            >
                                                                <span>{p.name}</span>
                                                                <span className="font-bold text-indigo-600">{formatCurrency(p.price)}</span>
                                                            </button>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex items-center bg-gray-50 border border-gray-200 rounded-lg">
                                                <button onClick={() => setProductQuantity(Math.max(1, productQuantity - 1))} className="w-8 hover:bg-gray-100 rounded-l-lg">-</button>
                                                <input
                                                    type="number"
                                                    value={productQuantity}
                                                    onChange={e => setProductQuantity(parseInt(e.target.value) || 1)}
                                                    className="w-10 text-center bg-transparent outline-none text-sm font-bold"
                                                />
                                                <button onClick={() => setProductQuantity(productQuantity + 1)} className="w-8 hover:bg-gray-100 rounded-r-lg">+</button>
                                            </div>
                                            <Button
                                                onClick={handleAddProduct}
                                                disabled={!selectedProduct}
                                                className="bg-indigo-600 hover:bg-indigo-700 text-white h-10 px-4 rounded-lg"
                                            >
                                                <Plus size={18} />
                                            </Button>
                                        </div>
                                    )}

                                    <div className="flex-1 overflow-y-auto space-y-2 pr-2">
                                        {session.productsSold.length === 0 ? (
                                            <div className="h-full flex flex-col items-center justify-center text-gray-400 text-sm">
                                                <Receipt size={40} className="mb-2 opacity-20" />
                                                <p>No hay productos registrados</p>
                                            </div>
                                        ) : (
                                            session.productsSold.map((p, idx) => (
                                                <div key={idx} className="flex justify-between items-start p-3 bg-gray-50 rounded-xl border border-gray-100 group hover:border-indigo-200 transition-colors">
                                                    <div>
                                                        <div className="font-bold text-gray-700 text-sm mb-1">{p.name}</div>
                                                        {!readOnly ? (
                                                            <div className="flex items-center bg-white border border-gray-200 rounded-lg w-max shadow-sm">
                                                                <button
                                                                    onClick={() => handleUpdateProductQuantity(idx, p.quantity - 1)}
                                                                    className="w-7 h-7 flex items-center justify-center hover:bg-gray-100 rounded-l-lg text-gray-500 transition-colors"
                                                                >
                                                                    -
                                                                </button>
                                                                <input
                                                                    type="number"
                                                                    value={p.quantity}
                                                                    onChange={(e) => handleUpdateProductQuantity(idx, parseInt(e.target.value) || 1)}
                                                                    className="w-10 text-center text-xs font-bold text-gray-700 outline-none"
                                                                />
                                                                <button
                                                                    onClick={() => handleUpdateProductQuantity(idx, p.quantity + 1)}
                                                                    className="w-7 h-7 flex items-center justify-center hover:bg-gray-100 rounded-r-lg text-gray-500 transition-colors"
                                                                >
                                                                    +
                                                                </button>
                                                            </div>
                                                        ) : (
                                                            <div className="text-xs text-gray-500">{p.quantity} x {formatCurrency(p.price)}</div>
                                                        )}
                                                    </div>
                                                    <div className="flex flex-col items-end gap-1">
                                                        <span className="font-bold text-indigo-600 text-sm">{formatCurrency(p.quantity * p.price)}</span>
                                                        <span className="text-[10px] text-gray-400">Unit: {formatCurrency(p.price)}</span>
                                                        {!readOnly && (
                                                            <button
                                                                onClick={() => handleRemoveProduct(idx)}
                                                                className="text-red-400 hover:text-red-600 hover:bg-red-50 p-1.5 rounded-lg transition-colors mt-1"
                                                                title="Eliminar producto"
                                                            >
                                                                <Trash2 size={14} />
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>

                                {/* Expenses Section */}
                                <div className="bg-red-50 p-5 rounded-2xl border border-red-100">
                                    <div className="flex justify-between items-center mb-3">
                                        <h3 className="font-bold text-red-800 flex items-center gap-2 text-sm uppercase">
                                            <Wallet size={16} /> Gastos de Caja
                                        </h3>
                                        {totalExpenses > 0 && (
                                            <span className="text-xs font-bold text-red-600 bg-white px-2 py-1 rounded border border-red-200">
                                                -{formatCurrency(totalExpenses)}
                                            </span>
                                        )}
                                    </div>

                                    {!readOnly && (
                                        <div className="flex gap-2 mb-3">
                                            <input
                                                type="text"
                                                placeholder="Descripción"
                                                value={expenseForm.description}
                                                onChange={e => setExpenseForm({ ...expenseForm, description: e.target.value })}
                                                className="flex-1 h-9 px-3 rounded-lg border border-red-200 focus:border-red-500 text-sm outline-none"
                                            />
                                            <input
                                                type="number"
                                                placeholder="$"
                                                value={expenseForm.amount || ''}
                                                onChange={e => setExpenseForm({ ...expenseForm, amount: parseInt(e.target.value) || 0 })}
                                                className="w-24 h-9 px-3 rounded-lg border border-red-200 focus:border-red-500 text-sm outline-none"
                                            />
                                            <button
                                                onClick={handleAddExpense}
                                                disabled={!expenseForm.description}
                                                className="bg-red-500 hover:bg-red-600 text-white h-9 w-9 rounded-lg flex items-center justify-center disabled:opacity-50"
                                            >
                                                <Plus size={18} />
                                            </button>
                                        </div>
                                    )}

                                    <div className="space-y-2 max-h-32 overflow-y-auto">
                                        {session.expensesList.map((e, idx) => (
                                            <div key={idx} className="flex justify-between items-center text-sm bg-white p-2 rounded-lg border border-red-100">
                                                <span className="text-gray-700">{e.description}</span>
                                                <div className="flex items-center gap-2">
                                                    <span className="font-bold text-red-600">-{formatCurrency(e.amount)}</span>
                                                    {!readOnly && (
                                                        <button onClick={() => handleRemoveExpense(idx)} className="text-gray-400 hover:text-red-500">
                                                            <Trash2 size={14} />
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* STEP 2: ARQUEO */}
                    {session.step === 2 && (
                        <div className="animate-in fade-in slide-in-from-right-4 max-w-4xl mx-auto">
                            <h3 className="text-lg font-bold text-gray-800 border-b pb-4 mb-6 flex justify-between items-center">
                                <span>Conteo Físico de Dinero</span>
                                <span className="text-2xl font-black text-indigo-600 bg-indigo-50 px-4 py-1 rounded-xl">
                                    {formatCurrency(cashAuditCount)}
                                </span>
                            </h3>

                            <div className="grid grid-cols-2 gap-8">
                                {/* Bills */}
                                <div className="space-y-4">
                                    <h5 className="font-bold text-gray-600 text-sm uppercase flex items-center gap-2 pb-2 border-b">
                                        <Wallet size={16} /> Billetes
                                    </h5>
                                    {DENOMINATIONS_BILLS.map(denom => (
                                        <div key={denom} className="flex items-center gap-4 bg-white p-3 rounded-xl border border-gray-100 shadow-sm">
                                            <span className="font-bold text-gray-700 w-24 text-right">{formatCurrency(denom)}</span>
                                            <span className="text-gray-400">x</span>
                                            <input
                                                type="number"
                                                min="0"
                                                disabled={readOnly}
                                                value={session.cashCounts[denom] || ''}
                                                onChange={e => handleCountChange(denom, e.target.value)}
                                                className="w-20 h-10 text-center font-bold border border-gray-200 rounded-lg focus:border-indigo-500 outline-none"
                                                placeholder="0"
                                            />
                                            <span className="font-medium text-gray-500 flex-1 text-right">
                                                = {formatCurrency(denom * (session.cashCounts[denom] || 0))}
                                            </span>
                                        </div>
                                    ))}
                                </div>

                                {/* Coins */}
                                <div className="space-y-4">
                                    <h5 className="font-bold text-gray-600 text-sm uppercase flex items-center gap-2 pb-2 border-b">
                                        <Coins size={16} /> Monedas
                                    </h5>
                                    {DENOMINATIONS_COINS.map(denom => (
                                        <div key={denom} className="flex items-center gap-4 bg-white p-3 rounded-xl border border-gray-100 shadow-sm">
                                            <span className="font-bold text-gray-700 w-24 text-right">{formatCurrency(denom)}</span>
                                            <span className="text-gray-400">x</span>
                                            <input
                                                type="number"
                                                min="0"
                                                disabled={readOnly}
                                                value={session.cashCounts[denom] || ''}
                                                onChange={e => handleCountChange(denom, e.target.value)}
                                                className="w-20 h-10 text-center font-bold border border-gray-200 rounded-lg focus:border-indigo-500 outline-none"
                                                placeholder="0"
                                            />
                                            <span className="font-medium text-gray-500 flex-1 text-right">
                                                = {formatCurrency(denom * (session.cashCounts[denom] || 0))}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* STEP 3: RESUMEN FINAL */}
                    {session.step === 3 && (
                        <div className="animate-in fade-in slide-in-from-right-4 max-w-4xl mx-auto grid grid-cols-2 gap-8 h-full items-center">

                            {/* Summary Card */}
                            <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-gray-100">
                                <div className="bg-gray-50 p-6 border-b border-gray-100">
                                    <h3 className="font-black text-gray-800 text-lg uppercase tracking-tight">Resumen Operativo</h3>
                                    <p className="text-sm text-gray-500">Datos registrados en el sistema</p>
                                </div>
                                <div className="p-6 space-y-4">
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-gray-500">Base Inicial</span>
                                        <span className="font-bold text-gray-800">{formatCurrency(session.formData.initial_cash)}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-gray-500">Ventas Totales</span>
                                        <span className="font-bold text-gray-800">{formatCurrency(session.formData.sales_cash + session.formData.sales_card + session.formData.sales_transfer)}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-sm pl-4 border-l-2 border-green-200">
                                        <span className="text-gray-500">└ Venta en Efectivo</span>
                                        <span className="font-bold text-green-600">{formatCurrency(session.formData.sales_cash)}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-gray-500">Gastos</span>
                                        <span className="font-bold text-red-600">-{formatCurrency(totalExpenses)}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-gray-500">Propinas (Informativo)</span>
                                        <span className="font-bold text-amber-600">{formatCurrency(session.formData.tips)}</span>
                                    </div>

                                    <div className="h-px bg-gray-100 my-2" />

                                    <div className="flex justify-between items-center">
                                        <span className="font-black text-gray-900 uppercase text-sm">Efectivo Esperado</span>
                                        <span className="font-black text-xl text-gray-900">{formatCurrency(expectedCash)}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Result Card */}
                            <div className="space-y-6">
                                <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-gray-100 p-8 text-center relative">
                                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Dinero en Caja</p>
                                    <p className="text-5xl font-black text-gray-900 mb-6">{formatCurrency(cashAuditCount)}</p>

                                    <div className={`p - 4 rounded - 2xl ${difference === 0 ? 'bg-green-50 text-green-700' : isPositive ? 'bg-yellow-50 text-yellow-700' : 'bg-red-50 text-red-700'} `}>
                                        <div className="font-bold text-lg mb-1">
                                            {difference === 0 ? '¡Cuadre Perfecto!' : isPositive ? 'Sobrante' : 'Faltante'}
                                        </div>
                                        <div className="text-2xl font-black">
                                            {difference === 0 ? '$0' : formatCurrency(Math.abs(difference))}
                                        </div>
                                    </div>
                                </div>

                                {!readOnly && (
                                    <div className="space-y-3">
                                        <div className="flex items-center gap-3 p-3 bg-blue-50 text-blue-700 rounded-xl border border-blue-100">
                                            <Printer size={20} />
                                            <div>
                                                <p className="font-bold text-sm">Impresión Automática</p>
                                                <p className="text-xs text-blue-600">Se imprimirá el comprobante de cierre al guardar.</p>
                                            </div>
                                        </div>

                                        <button
                                            onClick={() => setPrintProducts(!printProducts)}
                                            className={`w - full rounded - xl p - 3 flex items - center gap - 3 transition - all border - 2 text - left ${printProducts ? 'bg-indigo-50 border-indigo-200' : 'bg-white border-gray-100'} `}
                                        >
                                            <div className={`w - 10 h - 10 rounded - lg flex items - center justify - center shrink - 0 ${printProducts ? 'bg-indigo-500' : 'bg-gray-100'} `}>
                                                <Receipt size={20} className={printProducts ? 'text-white' : 'text-gray-400'} />
                                            </div>
                                            <div>
                                                <p className={`font - bold text - sm ${printProducts ? 'text-indigo-800' : 'text-gray-600'} `}>Imprimir Detalle de Productos</p>
                                                <p className={`text - xs ${printProducts ? 'text-indigo-600' : 'text-gray-400'} `}>
                                                    Incluye lista detallada en la impresión
                                                </p>
                                            </div>
                                        </button>
                                    </div>
                                )}

                                {!readOnly && difference !== 0 && !encargadoAuthorized && (
                                    <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-center">
                                        <p className="text-red-800 font-bold text-sm mb-2">⚠️ Diferencia Detectada</p>
                                        <div className="flex gap-2">
                                            <button onClick={() => setStep(2)} className="flex-1 bg-white border border-red-200 text-red-700 font-bold py-2 rounded-lg text-xs">
                                                Recontar
                                            </button>
                                            <button
                                                onClick={() => {
                                                    if (confirm('¿Autorizar diferencia?')) setEncargadoAuthorized(true);
                                                }}
                                                className="flex-1 bg-red-600 text-white font-bold py-2 rounded-lg text-xs hover:bg-red-700"
                                            >
                                                Autorizar
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-gray-100 bg-white shrink-0 flex gap-4">
                    {readOnly ? (
                        <>
                            <Button
                                onClick={onClose}
                                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold h-12 rounded-xl"
                            >
                                Cerrar Visualización
                            </Button>
                            <Button
                                onClick={handlePrintCopy}
                                className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold h-12 rounded-xl flex items-center justify-center gap-2"
                            >
                                <Printer size={20} /> Imprimir Copia
                            </Button>
                        </>
                    ) : (
                        <>
                            {session.step > 1 && (
                                <Button onClick={prevStep} className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold h-12 rounded-xl">
                                    Atrás
                                </Button>
                            )}

                            {session.step < 3 ? (
                                <Button onClick={nextStep} className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold h-12 rounded-xl">
                                    Siguiente
                                </Button>
                            ) : (
                                <Button
                                    onClick={handleSaveClosing}
                                    disabled={loading || (difference !== 0 && !encargadoAuthorized)}
                                    className={`flex - 1 font - bold h - 12 rounded - xl text - white ${difference === 0 || encargadoAuthorized ? 'bg-green-600 hover:bg-green-700' : 'bg-gray-300 cursor-not-allowed'} `}
                                >
                                    {loading ? 'Guardando...' : 'Confirmar y Guardar'}
                                </Button>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}

