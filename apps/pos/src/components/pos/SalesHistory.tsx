import { useState, useEffect } from 'react';
import { usePosStore } from '../../store';
import { X } from 'lucide-react';

interface SalesHistoryProps {
    onClose: () => void;
}

export default function SalesHistory({ onClose }: SalesHistoryProps) {
    const { currentShift } = usePosStore();
    const [sales, setSales] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadSales();
    }, []);

    const loadSales = async () => {
        try {
            setLoading(true);
            // Get all sales from current shift from local DB
            const allSales = await window.electron.getPendingSales();

            // Filter by current shift if exists
            const shiftSales = currentShift
                ? allSales.filter((s: any) => s.shift_id === currentShift.id)
                : allSales;

            setSales(shiftSales);
        } catch (error) {
            console.error('[SalesHistory] Error loading sales:', error);
        } finally {
            setLoading(false);
        }
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('es-CO', {
            style: 'currency',
            currency: 'COP',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(amount);
    };

    const formatTime = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleTimeString('es-CO', {
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const totalSales = sales.reduce((sum, sale) => sum + sale.total_amount, 0);

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
                {/* Header */}
                <div className="bg-gradient-to-r from-[#D4AF37] to-[#C19B2D] p-6 rounded-t-2xl relative">
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 text-white hover:bg-white/20 rounded-lg p-2 transition-colors"
                    >
                        <X className="h-6 w-6" />
                    </button>
                    <h2 className="text-2xl font-bold text-white mb-2">
                        📊 Historial de Ventas
                    </h2>
                    <p className="text-white/90 text-sm">
                        {currentShift ? `Turno actual - ${sales.length} ventas` : 'Todas las ventas'}
                    </p>
                </div>

                {/* Summary */}
                <div className="bg-gradient-to-br from-amber-50 to-yellow-50 p-4 border-b border-amber-200">
                    <div className="flex justify-between items-center">
                        <div>
                            <p className="text-sm text-gray-600">Total de Ventas</p>
                            <p className="text-3xl font-bold text-gray-900">{sales.length}</p>
                        </div>
                        <div className="text-right">
                            <p className="text-sm text-gray-600">Monto Total</p>
                            <p className="text-3xl font-bold text-green-700">{formatCurrency(totalSales)}</p>
                        </div>
                    </div>
                </div>

                {/* Sales List */}
                <div className="flex-1 overflow-y-auto p-6">
                    {loading ? (
                        <div className="flex items-center justify-center h-full">
                            <div className="text-center">
                                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#D4AF37] mx-auto mb-4"></div>
                                <p className="text-gray-600">Cargando ventas...</p>
                            </div>
                        </div>
                    ) : sales.length === 0 ? (
                        <div className="flex items-center justify-center h-full">
                            <div className="text-center text-gray-500">
                                <p className="text-xl mb-2">📭</p>
                                <p>No hay ventas registradas</p>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {sales.map((sale) => (
                                <div
                                    key={sale.id}
                                    className="bg-white border-2 border-gray-200 rounded-xl p-4 hover:border-[#D4AF37] hover:shadow-md transition-all"
                                >
                                    <div className="flex justify-between items-start mb-3">
                                        <div>
                                            <p className="text-sm text-gray-500">
                                                {formatTime(sale.created_at)}
                                            </p>
                                            <p className="text-xs text-gray-400 font-mono">
                                                ID: {sale.id.slice(0, 8)}...
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-2xl font-bold text-gray-900">
                                                {formatCurrency(sale.total_amount)}
                                            </p>
                                            <span className="inline-block px-2 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded-full">
                                                {sale.payment_method === 'cash' ? '💵 Efectivo' : sale.payment_method}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Sale Items */}
                                    {sale.items && sale.items.length > 0 && (
                                        <div className="border-t border-gray-200 pt-3 mt-3">
                                            <p className="text-xs font-semibold text-gray-600 mb-2">Productos:</p>
                                            <div className="space-y-1">
                                                {sale.items.map((item: any) => (
                                                    <div
                                                        key={item.id}
                                                        className="flex justify-between text-sm"
                                                    >
                                                        <span className="text-gray-700">
                                                            {item.quantity}x {item.product_name || `Producto ${item.product_id.slice(0, 8)}`}
                                                        </span>
                                                        <span className="text-gray-900 font-medium">
                                                            {formatCurrency(item.total_price)}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Sync Status */}
                                    <div className="mt-3 flex items-center gap-2">
                                        {sale.synced ? (
                                            <span className="text-xs text-green-600 flex items-center gap-1">
                                                ✓ Sincronizado
                                            </span>
                                        ) : (
                                            <span className="text-xs text-orange-600 flex items-center gap-1">
                                                ⏳ Pendiente de sync
                                            </span>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-gray-200">
                    <button
                        onClick={onClose}
                        className="w-full px-6 py-3 bg-gradient-to-r from-[#D4AF37] to-[#C19B2D] text-white font-semibold rounded-full shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all"
                    >
                        Cerrar
                    </button>
                </div>
            </div>
        </div>
    );
}
