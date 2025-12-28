import { useState, useEffect } from 'react';
import { Button } from '@panpanocha/ui';
import { X, DollarSign, CreditCard, Smartphone, Wallet, TrendingUp, TrendingDown, Printer, Package, ChevronDown, ChevronUp, User, Calendar, Hash } from 'lucide-react';

interface ShiftDetailModalProps {
    shift: {
        id: string;
        branch_id: string;
        user_id: string;
        start_time: string;
        end_time: string | null;
        initial_cash: number;
        final_cash: number | null;
        expected_cash: number | null;
        status: 'open' | 'closed';
        turn_type: string | null;
        user_name?: string;
        branch_name?: string;
        turnNumber?: number;
    };
    onClose: () => void;
}

interface ShiftSummary {
    totalSales: number;
    cashSales: number;
    cardSales: number;
    transferSales: number;
    totalTips: number;
    totalExpenses: number;
    productsSold: { name: string; quantity: number; total: number }[];
    salesCount: number;
}

export function ShiftDetailModal({ shift, onClose }: ShiftDetailModalProps) {
    const [summary, setSummary] = useState<ShiftSummary | null>(null);
    const [loading, setLoading] = useState(true);
    const [showProducts, setShowProducts] = useState(false);

    useEffect(() => {
        loadSummary();
    }, [shift.id]);

    const loadSummary = async () => {
        try {
            // @ts-ignore
            const data = await window.electron.getShiftSummary(shift.id);
            setSummary(data);
        } catch (error) {
            console.error('[ShiftDetail] Error loading summary:', error);
        } finally {
            setLoading(false);
        }
    };

    const formatCurrency = (amount: number) => {
        return `$${(amount || 0).toLocaleString('es-CO')}`;
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('es-CO', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' });
    };

    const formatTime = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: true });
    };

    const difference = (shift.final_cash || 0) - (shift.expected_cash || 0);
    const isPositive = difference >= 0;
    const isClosed = shift.status === 'closed';

    const handlePrintShiftSummary = () => {
        // TODO: Implement shift summary print
        console.log('Print shift summary:', shift.id);
        alert('🖨️ Imprimiendo cierre de caja...');
    };

    const handlePrintProductDetail = () => {
        // TODO: Implement product detail print
        console.log('Print product detail:', shift.id);
        alert('🖨️ Imprimiendo detalle de productos...');
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4" onClick={onClose}>
            <div
                className="bg-white rounded-[30px] shadow-2xl max-w-lg w-full max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200 border-t-4 border-[#D4AF37]"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="pt-6 px-6 pb-4 flex justify-between items-start border-b border-gray-100">
                    <div>
                        <h2 className="text-xl font-black text-gray-900 uppercase tracking-tight leading-none flex items-center gap-2">
                            📋 Detalle de Cierre
                        </h2>
                        <div className="flex items-center gap-2 mt-2 text-sm text-gray-500">
                            <Calendar size={14} />
                            <span>{formatDate(shift.start_time)}</span>
                            <span>•</span>
                            <span>{formatTime(shift.start_time)} → {shift.end_time ? formatTime(shift.end_time) : 'En curso'}</span>
                        </div>
                        <div className="flex items-center gap-2 mt-1 text-sm text-gray-500">
                            <User size={14} />
                            <span>{shift.user_name || 'Usuario'}</span>
                            {shift.branch_name && (
                                <>
                                    <span>•</span>
                                    <span>{shift.branch_name}</span>
                                </>
                            )}
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {shift.turnNumber && (
                            <div className="flex items-center gap-1 text-xs font-bold uppercase px-2 py-1 rounded-full bg-[#D4AF37]/10 text-[#D4AF37]">
                                <Hash size={12} />
                                Turno {shift.turnNumber}
                            </div>
                        )}
                        <button onClick={onClose} className="text-gray-400 hover:text-gray-900 transition-colors">
                            <X size={24} />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="px-6 py-4 overflow-y-auto max-h-[60vh] space-y-4">
                    {loading ? (
                        <div className="flex items-center justify-center h-32">
                            <div className="animate-pulse text-gray-400">Cargando resumen...</div>
                        </div>
                    ) : (
                        <>
                            {/* Base & Expected */}
                            <div className="grid grid-cols-2 gap-3">
                                <div className="bg-gray-50 rounded-xl p-4 text-center">
                                    <p className="text-xs text-gray-500 uppercase font-bold mb-1">Base Inicial</p>
                                    <p className="text-2xl font-black text-gray-800">{formatCurrency(shift.initial_cash)}</p>
                                </div>
                                <div className="bg-green-50 rounded-xl p-4 text-center">
                                    <p className="text-xs text-green-600 uppercase font-bold mb-1">Ventas Totales</p>
                                    <p className="text-2xl font-black text-green-700">{formatCurrency(summary?.totalSales || 0)}</p>
                                    <p className="text-[10px] text-green-500 mt-1">{summary?.salesCount || 0} transacciones</p>
                                </div>
                            </div>

                            {/* Sales Breakdown */}
                            <div className="bg-white border border-gray-100 rounded-xl p-4 space-y-3">
                                <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Desglose de Ingresos</h4>
                                <div className="space-y-2">
                                    <div className="flex justify-between items-center">
                                        <span className="flex items-center gap-2 text-sm text-gray-600">
                                            <DollarSign size={14} className="text-green-500" />
                                            Efectivo (Ventas)
                                        </span>
                                        <span className="text-sm font-bold text-green-600">+{formatCurrency(summary?.cashSales || 0)}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="flex items-center gap-2 text-sm text-gray-600">
                                            <CreditCard size={14} className="text-blue-500" />
                                            Datáfono / Tarjeta
                                        </span>
                                        <span className="text-sm font-bold text-gray-700">{formatCurrency(summary?.cardSales || 0)}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="flex items-center gap-2 text-sm text-gray-600">
                                            <Smartphone size={14} className="text-purple-500" />
                                            Transferencias
                                        </span>
                                        <span className="text-sm font-bold text-gray-700">{formatCurrency(summary?.transferSales || 0)}</span>
                                    </div>
                                    <div className="flex justify-between items-center pt-2 border-t border-gray-100">
                                        <span className="flex items-center gap-2 text-sm text-gray-600">
                                            <Wallet size={14} className="text-red-500" />
                                            Gastos / Egresos
                                        </span>
                                        <span className="text-sm font-bold text-red-600">-{formatCurrency(summary?.totalExpenses || 0)}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Expected vs Final */}
                            {isClosed && (
                                <div className={`rounded-xl p-4 ${isPositive ? 'bg-green-50' : 'bg-red-50'}`}>
                                    <div className="grid grid-cols-3 gap-2 mb-3">
                                        <div className="text-center">
                                            <p className="text-[10px] text-gray-500 uppercase font-bold">Esperado</p>
                                            <p className="text-lg font-bold text-gray-700">{formatCurrency(shift.expected_cash || 0)}</p>
                                        </div>
                                        <div className="text-center">
                                            <p className="text-[10px] text-gray-500 uppercase font-bold">En Caja</p>
                                            <p className="text-lg font-bold text-gray-700">{formatCurrency(shift.final_cash || 0)}</p>
                                        </div>
                                        <div className="text-center">
                                            <p className={`text-[10px] uppercase font-bold ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                                                {isPositive ? 'Sobrante' : 'Faltante'}
                                            </p>
                                            <p className={`text-lg font-bold flex items-center justify-center gap-1 ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                                                {isPositive ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                                                {formatCurrency(Math.abs(difference))}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Products Sold (Collapsible) */}
                            {summary?.productsSold && summary.productsSold.length > 0 && (
                                <div className="bg-gray-50 rounded-xl p-4">
                                    <button
                                        onClick={() => setShowProducts(!showProducts)}
                                        className="w-full flex items-center justify-between text-xs font-bold text-gray-500 uppercase tracking-wider"
                                    >
                                        <span className="flex items-center gap-2">
                                            <Package size={14} />
                                            Productos Vendidos ({summary.productsSold.length})
                                        </span>
                                        {showProducts ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                    </button>
                                    {showProducts && (
                                        <div className="mt-3 space-y-2 max-h-48 overflow-y-auto">
                                            {summary.productsSold.map((product, idx) => (
                                                <div key={idx} className="flex justify-between items-center text-sm">
                                                    <span className="text-gray-600 truncate flex-1">{product.name}</span>
                                                    <span className="text-gray-400 mx-2">x{product.quantity}</span>
                                                    <span className="font-bold text-gray-700">{formatCurrency(product.total)}</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* Footer - Print Buttons */}
                <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex gap-3">
                    <Button
                        onClick={handlePrintShiftSummary}
                        className="flex-1 bg-[#D4AF37] hover:bg-[#C19B2D] text-white font-bold h-12 rounded-xl flex items-center justify-center gap-2"
                    >
                        <Printer size={18} />
                        Imprimir Cierre
                    </Button>
                    <Button
                        onClick={handlePrintProductDetail}
                        className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold h-12 rounded-xl flex items-center justify-center gap-2"
                    >
                        <Package size={18} />
                        Imprimir Productos
                    </Button>
                </div>
            </div>
        </div>
    );
}
