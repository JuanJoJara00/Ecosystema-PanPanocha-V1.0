import { useState, useEffect } from 'react';
import { usePosStore } from '../../store';
import { Card } from '@panpanocha/ui';
import { Wallet, Calendar, Receipt, Package, Zap, Users, Home, MoreHorizontal, Trash2, X, Coins } from 'lucide-react';
import { PinCodeModal } from './PinCodeModal';
import type { Expense } from '../../types';

export default function ExpensesSection() {
    const { currentShift, loadExpenses, loadAllExpenses, expenses, sidebarDateFilter, deleteExpense } = usePosStore();

    const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
    const [showAuthModal, setShowAuthModal] = useState(false);
    const { showAlert } = usePosStore();

    const categories = [
        { name: 'Suministros', icon: Package, color: 'bg-cyan-50 text-cyan-500' },
        { name: 'Servicios', icon: Zap, color: 'bg-amber-50 text-amber-500' },
        { name: 'Nómina', icon: Users, color: 'bg-fuchsia-50 text-fuchsia-500' },
        { name: 'Arriendo', icon: Home, color: 'bg-indigo-50 text-indigo-500' },
        { name: 'Propinas', icon: Coins, color: 'bg-emerald-50 text-emerald-500' },
        { name: 'Otros', icon: MoreHorizontal, color: 'bg-gray-50 text-gray-500' },
    ];

    useEffect(() => {
        if (sidebarDateFilter === 'shift') {
            if (currentShift?.id) loadExpenses(currentShift.id);
        } else {
            loadAllExpenses();
        }
    }, [currentShift?.id, loadExpenses, loadAllExpenses, sidebarDateFilter]);

    if (!currentShift) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-gray-400 p-8 text-center">
                <Wallet size={48} className="mb-4 opacity-50" />
                <h3 className="text-lg font-bold">Caja Cerrada</h3>
                <p className="text-sm">Debes abrir un turno para registrar gastos.</p>
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6">
            <header>
                <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                    <Wallet className="text-[#D4AF37]" />
                    Gastos de Caja
                </h2>
                <p className="text-gray-500 text-sm">Historial de gastos registrados en el turno.</p>
            </header>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 gap-3">
                <Card className="bg-yellow-50 border-yellow-200">
                    <div className="flex flex-col items-center justify-center text-center py-2">
                        <p className="text-xs uppercase font-bold text-yellow-700 tracking-wider mb-1">Total de Gastos</p>
                        <p className="text-3xl font-black text-yellow-900 font-mono tracking-tight">{expenses?.length || 0}</p>
                    </div>
                </Card>
                <Card className="bg-green-50 border-green-200">
                    <div className="flex flex-col items-center justify-center text-center py-2">
                        <p className="text-xs uppercase font-bold text-green-700 tracking-wider mb-1">Monto Total</p>
                        <p className="text-2xl font-black text-green-700 font-mono tracking-tight whitespace-nowrap">$ {(expenses?.reduce((sum, e) => sum + (e.amount || 0), 0) || 0).toLocaleString()}</p>
                    </div>
                </Card>
            </div>

            {/* List */}
            <div className="space-y-3">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                    <Calendar size={12} />
                    {sidebarDateFilter === 'shift' ? 'Historial del Turno' :
                        sidebarDateFilter === 'today' ? 'Gastos de Hoy' :
                            sidebarDateFilter === '7d' ? 'Últimos 7 Días' :
                                'Últimos 15 Días'}
                </h3>

                {!expenses || expenses.length === 0 ? (
                    <div className="text-center py-10 text-gray-400 bg-gray-50/50 rounded-xl border border-dashed border-gray-200">
                        <Receipt size={32} className="mx-auto mb-2 opacity-20" />
                        <p className="text-xs font-medium">No hay gastos registrados</p>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {expenses
                            .filter(expense => {
                                if (sidebarDateFilter === 'shift') return expense.shift_id === currentShift?.id;

                                const expenseDate = new Date(expense.created_at);
                                const expenseTime = expenseDate.getTime();

                                const now = new Date();
                                now.setHours(0, 0, 0, 0);
                                const startOfToday = now.getTime();

                                if (sidebarDateFilter === 'today') return expenseTime >= startOfToday;

                                if (sidebarDateFilter === '7d') {
                                    const sevenDaysAgo = new Date();
                                    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
                                    sevenDaysAgo.setHours(0, 0, 0, 0);
                                    return expenseTime >= sevenDaysAgo.getTime();
                                }

                                if (sidebarDateFilter === '15d') {
                                    const fifteenDaysAgo = new Date();
                                    fifteenDaysAgo.setDate(fifteenDaysAgo.getDate() - 15);
                                    fifteenDaysAgo.setHours(0, 0, 0, 0);
                                    return expenseTime >= fifteenDaysAgo.getTime();
                                }

                                return true;
                            })
                            .map((expense) => {
                                const catInfo = categories.find(c => c.name.toLowerCase() === expense.category?.toLowerCase()) || categories[4];
                                const Icon = catInfo.icon;
                                // Map category colors to border (use inline style for exact hex match)
                                const categoryColors: Record<string, string> = {
                                    suministros: '#06b6d4', // Cyan
                                    servicios: '#f59e0b',   // Amber
                                    nómina: '#d946ef',      // Fuchsia
                                    nomina: '#d946ef',      // Fuchsia (no accent)
                                    arriendo: '#6366f1',    // Indigo
                                    domicilios: '#3b82f6',  // Blue (plural)
                                    domicilio: '#3b82f6',   // Blue (singular - legacy)
                                    propinas: '#10b981',    // Emerald
                                    propina: '#10b981',     // Emerald (singular)
                                    otros: '#9ca3af',       // Gray
                                };
                                const borderColor = categoryColors[(expense.category || 'otros').toLowerCase()] || '#9ca3af';

                                return (
                                    <Card
                                        key={expense.id}
                                        onClick={() => setSelectedExpense(expense)}
                                        className="bg-white hover:border-[#D4AF37]/50 shadow-sm transition-all cursor-pointer relative group active:scale-[0.99] border-l-4"
                                        style={{ borderLeftColor: borderColor }}
                                    >
                                        <div className="flex justify-between items-start mb-2">
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <p className="text-sm text-gray-900 font-bold uppercase tracking-tight">
                                                        {new Date(expense.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </p>
                                                    <span className="text-gray-300">|</span>
                                                    <p className="text-[10px] text-gray-400 font-mono">
                                                        #{expense.id.slice(0, 8)}
                                                    </p>
                                                </div>

                                                <div className="flex items-center gap-2 mt-1">
                                                    <div className={`w-5 h-5 rounded-full ${catInfo.color} flex items-center justify-center`}>
                                                        <Icon size={12} />
                                                    </div>
                                                    <span className="text-sm font-bold text-gray-800">
                                                        {expense.category || 'Gasto General'}
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="text-right">
                                                <p className="text-xl font-bold text-red-600 font-mono tracking-tight">
                                                    - ${expense.amount.toLocaleString()}
                                                </p>
                                                <div className="flex gap-1 justify-end mt-1">
                                                    {expense.voucher_number ? (
                                                        <span className="bg-gray-100 text-gray-600 border border-gray-200 rounded-md text-[10px] uppercase font-bold px-2 py-0.5">
                                                            🧾 Factura
                                                        </span>
                                                    ) : (
                                                        <span className="bg-gray-50 text-gray-400 border border-gray-100 rounded-md text-[10px] uppercase font-bold px-2 py-0.5">
                                                            No Ref.
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Description Block */}
                                        <div className="mt-2 bg-gray-50/50 p-2 rounded-lg border border-dashed border-gray-100">
                                            <p className="text-sm text-gray-700 font-medium leading-snug">
                                                {expense.description}
                                            </p>
                                        </div>

                                        {/* Footer */}
                                        <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-50">
                                            <div className="flex items-center gap-2">
                                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1">
                                                    <Users size={10} />
                                                    {currentShift?.user_id === expense.user_id ? 'Tú' : 'Otro Usuario'}
                                                </span>
                                            </div>

                                            <div className="flex items-center gap-3">
                                                <span className="text-[10px] text-green-600 flex items-center gap-1 font-bold bg-green-50 px-2 py-0.5 rounded-full uppercase">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                                                    Registrado
                                                </span>
                                            </div>
                                        </div>
                                    </Card>
                                );
                            })}
                    </div>
                )}
            </div>

            {/* Expense Detail Modal */}
            {/* Expense Detail Modal - Clean Layout */}
            {selectedExpense && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in font-sans">
                    <div
                        className="bg-white rounded-[30px] shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200 relative border-t-4 border-[#D4AF37]"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="pt-8 px-8 pb-4">
                            <div className="flex justify-between items-start">
                                <div>
                                    <h2 className="text-2xl font-black text-gray-900 uppercase tracking-tight leading-none">DETALLE DE GASTO</h2>
                                    <p className="text-sm font-bold text-[#D4AF37] mt-1">#{selectedExpense.id.slice(0, 8).toUpperCase()}</p>
                                </div>
                                <button
                                    onClick={() => setSelectedExpense(null)}
                                    className="text-gray-400 hover:text-gray-900 transition-colors"
                                >
                                    <X size={24} />
                                </button>
                            </div>
                        </div>

                        {/* Body */}
                        <div className="px-8 pb-8 space-y-6">

                            {/* Category Box */}
                            <div className="bg-gray-50 rounded-2xl p-4 flex justify-between items-center">
                                <div>
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Categoría</p>
                                    <div className="flex items-center gap-2">
                                        {(() => {
                                            const cat = categories.find(c => c.name.toLowerCase() === selectedExpense.category?.toLowerCase()) || categories[4];
                                            const Icon = cat.icon;
                                            return (
                                                <div className="flex items-center gap-2 text-gray-900 font-bold text-base leading-tight">
                                                    <div className={`w-5 h-5 rounded-full ${cat.color} flex items-center justify-center`}>
                                                        <Icon size={10} />
                                                    </div>
                                                    {selectedExpense.category || 'Otros'}
                                                </div>
                                            );
                                        })()}
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Factura</p>
                                    <p className="text-base font-bold text-gray-900 leading-tight">
                                        {selectedExpense.voucher_number || 'N/A'}
                                    </p>
                                </div>
                            </div>

                            {/* Details Block */}
                            <div>
                                <p className="text-xs font-black text-gray-800 uppercase tracking-wider mb-2 flex items-center gap-2">
                                    📝 Descripción
                                </p>
                                <div className="border border-gray-100 rounded-2xl p-4 bg-white">
                                    <p className="text-gray-700 font-medium leading-relaxed whitespace-pre-wrap">
                                        {selectedExpense.description}
                                    </p>
                                    <div className="mt-4 pt-4 border-t border-gray-50 flex justify-between text-xs text-gray-400 font-medium uppercase tracking-wide">
                                        <span>{new Date(selectedExpense.created_at).toLocaleString()}</span>
                                        <span>{currentShift?.user_id === selectedExpense.user_id ? 'Tú' : 'Otro Usuario'}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Totals Section Container - Gray Block */}
                            <div className="bg-gray-50 rounded-2xl p-6">
                                <div className="flex justify-between items-center">
                                    <span className="text-xl font-black text-gray-900 uppercase">Monto Total</span>
                                    <span className="text-2xl font-black text-red-600 tracking-tight">
                                        - ${selectedExpense.amount.toLocaleString()}
                                    </span>
                                </div>
                            </div>

                            {/* Actions - Full Width Clean Buttons */}
                            <div className="pt-2 space-y-3">
                                <button
                                    onClick={() => {
                                        // Confirm deletion
                                        if (confirm('¿Estás seguro de eliminar este gasto?')) {
                                            setShowAuthModal(true); // Trigger PIN Auth
                                        }
                                    }}
                                    className="w-full bg-red-50 hover:bg-red-100 text-red-600 font-bold py-4 rounded-xl text-sm uppercase tracking-wider transition-colors flex items-center justify-center gap-2"
                                >
                                    <Trash2 size={16} /> Eliminar Gasto
                                </button>

                                <button
                                    onClick={() => setSelectedExpense(null)}
                                    className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-4 rounded-xl text-sm uppercase tracking-wider transition-colors"
                                >
                                    Cerrar
                                </button>
                            </div>

                        </div>
                    </div>
                </div>
            )}


            {/* Admin Auth Modal */}
            {showAuthModal && (
                <PinCodeModal
                    title="Autorización Requerida"
                    subtitle="Ingresa el código administrativo para eliminar este gasto"
                    onClose={() => setShowAuthModal(false)}
                    onSubmit={(pin) => {
                        if (pin === '0000') {
                            if (selectedExpense) {
                                deleteExpense(selectedExpense.id);
                                setSelectedExpense(null);
                                setShowAuthModal(false);
                                showAlert('success', 'Gasto Eliminado', 'El gasto ha sido eliminado correctamente.');
                            }
                        } else {
                            showAlert('error', 'Código Incorrecto', 'El código ingresado no es válido.');
                        }
                    }}
                />
            )}
        </div>
    );
}
