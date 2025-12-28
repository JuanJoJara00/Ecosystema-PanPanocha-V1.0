import { useState } from 'react';
import { Button } from '@panpanocha/ui';
import { XCircle, AlertTriangle } from 'lucide-react';

interface RefundModalProps {
    onClose: () => void;
    saleId: string;
    saleItems: Array<{ id: string; product_name: string; quantity: number; total_price: number; product_id: string }>;
    onRefund: (saleId: string, itemIds: string[], reason: string) => void;
}

export function RefundModal({ onClose, saleId, saleItems, onRefund }: RefundModalProps) {
    const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
    const [reason, setReason] = useState('');

    const toggleItem = (itemId: string) => {
        const newSelected = new Set(selectedItems);
        if (newSelected.has(itemId)) {
            newSelected.delete(itemId);
        } else {
            newSelected.add(itemId);
        }
        setSelectedItems(newSelected);
    };

    const handleRefund = () => {
        if (selectedItems.size === 0) {
            alert('Selecciona al menos un producto para reembolsar');
            return;
        }
        if (!reason.trim()) {
            alert('Debes proporcionar una razón para el reembolso');
            return;
        }
        onRefund(saleId, Array.from(selectedItems), reason);
    };

    const totalRefund = saleItems
        .filter(item => selectedItems.has(item.id))
        .reduce((sum, item) => sum + item.total_price, 0);

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden">
                <div className="bg-gradient-to-r from-red-500 to-red-600 text-white p-6 relative">
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 text-white/80 hover:text-white transition-colors"
                    >
                        <XCircle size={24} />
                    </button>
                    <h2 className="text-2xl font-bold">Reembolso de Venta</h2>
                    <p className="text-red-100 text-sm mt-1">Selecciona los productos a reembolsar</p>
                </div>

                <div className="p-6 max-h-[60vh] overflow-y-auto">
                    {/* Warning - Productos como pérdida, NO regresan a stock */}
                    <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
                        <AlertTriangle className="text-amber-600 flex-shrink-0" size={20} />
                        <div className="text-sm text-amber-800">
                            <p className="font-semibold">⚠️ Los productos reembolsados se registrarán como pérdida/desperdicio</p>
                            <p className="mt-1">NO volverán al inventario (producto contaminado/consumido). Esta acción no se puede deshacer.</p>
                        </div>
                    </div>

                    {/* Items List */}
                    <div className="space-y-2 mb-4">
                        {saleItems.map(item => (
                            <label
                                key={item.id}
                                className={`flex items-center justify-between p-4 border-2 rounded-lg cursor-pointer transition-all ${selectedItems.has(item.id)
                                    ? 'border-red-500 bg-red-50'
                                    : 'border-gray-200 hover:border-red-300'
                                    }`}
                            >
                                <div className="flex items-center gap-3">
                                    <input
                                        type="checkbox"
                                        checked={selectedItems.has(item.id)}
                                        onChange={() => toggleItem(item.id)}
                                        className="w-5 h-5 text-red-600 rounded border-gray-300 focus:ring-red-500"
                                    />
                                    <div>
                                        <p className="font-semibold text-gray-800">{item.product_name}</p>
                                        <p className="text-sm text-gray-500">Cantidad: {item.quantity}</p>
                                    </div>
                                </div>
                                <p className="font-bold text-gray-800">
                                    ${item.total_price.toLocaleString('es-CO')}
                                </p>
                            </label>
                        ))}
                    </div>

                    {/* Reason */}
                    <div className="mb-4">
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Razón del Reembolso *
                        </label>
                        <textarea
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-red-500 focus:ring-2 focus:ring-red-200 transition-all resize-none"
                            rows={3}
                            placeholder="Ej: Producto defectuoso, error en pedido, cliente insatisfecho..."
                        />
                    </div>

                    {/* Total */}
                    <div className="bg-gray-50 rounded-lg p-4 flex justify-between items-center">
                        <span className="text-gray-700 font-semibold">Total a Reembolsar:</span>
                        <span className="text-2xl font-bold text-red-600">
                            ${totalRefund.toLocaleString('es-CO')}
                        </span>
                    </div>
                </div>

                <div className="bg-gray-50 p-6 flex gap-3">
                    <Button variant="outline" onClick={onClose} className="flex-1">
                        Cancelar
                    </Button>
                    <Button
                        onClick={handleRefund}
                        disabled={selectedItems.size === 0 || !reason.trim()}
                        className="flex-1 bg-red-600 hover:bg-red-700 text-white disabled:bg-gray-300"
                    >
                        Procesar Reembolso
                    </Button>
                </div>
            </div>
        </div>
    );
}
