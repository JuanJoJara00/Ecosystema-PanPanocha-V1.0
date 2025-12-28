import { useState } from 'react';
import { X, Package, TruckIcon } from 'lucide-react';
import { usePosStore } from '../../store';
import { supabase } from '../../api/client';
import { formatCurrency } from '@panpanocha/shared';
import { Button, Input } from '@panpanocha/ui';

interface CartItem {
    id: string;
    product: {
        id: string;
        name: string;
        price: number;
    };
    quantity: number;
    note?: string;
}

interface RappiFormModalProps {
    onClose: () => void;
    cartItems: CartItem[];
}

export default function RappiFormModal({ onClose, cartItems }: RappiFormModalProps) {
    const { currentBranchId, showAlert } = usePosStore();
    const [loading, setLoading] = useState(false);

    // Form data
    const [rappiOrderId, setRappiOrderId] = useState('');
    const [notes, setNotes] = useState('');

    const calculateTotal = () => {
        return cartItems.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!rappiOrderId.trim()) {
            showAlert('warning', 'Faltan Datos', 'Por favor ingresa el ID del pedido Rappi');
            return;
        }

        if (cartItems.length === 0) {
            showAlert('warning', 'Carrito Vacío', 'No hay productos para registrar');
            return;
        }

        if (!currentBranchId) {
            showAlert('error', 'Sin Sede Detectada', 'Debes ABRIR TURNO para asignar los pedidos a una sede.');
            return;
        }

        setLoading(true);
        try {
            // Prepare products JSON
            const productList = cartItems.map(item => ({
                id: item.product.id,
                name: item.product.name,
                quantity: item.quantity,
                price: item.product.price,
                note: item.note || null
            }));

            // Generate explicit ID for reservation tracking
            const rappiDeliveryId = crypto.randomUUID();

            const dataToSave = {
                id: rappiDeliveryId, // Use explicit ID
                rappi_order_id: rappiOrderId,
                branch_id: currentBranchId,
                product_details: JSON.stringify(productList),
                total_value: calculateTotal(),
                status: 'pending',
                notes: notes || null
            };

            // BYPASS: Save locally first to avoid Foreign Key errors if seed/branch_id is missing/mismatched
            // const { error } = await supabase
            //     .from('rappi_deliveries')
            //     .insert([dataToSave]);

            // if (error) throw error;

            console.log('Saving Rappi delivery locally:', dataToSave);
            await window.electron.createRappiDelivery(dataToSave);

            // Create reservations for pending order (POS shows products as reserved)


            showAlert('success', 'Pedido Registrado', 'Pedido Rappi registrado exitosamente');
            usePosStore.getState().triggerDeliveriesRefresh();
            usePosStore.getState().clearCart();
            onClose();
        } catch (error: any) {
            console.error('Error saving Rappi delivery:', error);
            showAlert('error', 'Error al Guardar', 'Error al guardar: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
                {/* Header - Orange Gradient */}
                <div className="bg-gradient-to-r from-orange-500 to-orange-600 p-6 text-white relative">
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 text-white/80 hover:text-white transition-colors"
                    >
                        <X size={24} />
                    </button>
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                            <TruckIcon size={24} />
                        </div>
                        <div>
                            <h3 className="text-2xl font-bold">🛵 Orden Rappi</h3>
                            <p className="text-orange-100 text-sm">Registrar pedido desde Rappi</p>
                        </div>
                    </div>
                </div>

                {/* Form Content */}
                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
                    {/* Rappi Order ID */}
                    <div className="space-y-2">
                        <label className="block text-sm font-semibold text-gray-700">
                            ID Pedido Rappi *
                        </label>
                        <Input
                            required
                            value={rappiOrderId}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setRappiOrderId(e.target.value)}
                            className="border-2 border-gray-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 transition-all"
                            placeholder="Ej: R-12345678"
                        />
                    </div>

                    {/* Products Summary */}
                    <div className="space-y-3">
                        <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                            <Package size={18} className="text-orange-500" />
                            Productos del Pedido
                        </h4>
                        <div className="bg-gray-50 rounded-xl p-4 space-y-2 max-h-64 overflow-y-auto border-2 border-gray-100">
                            {cartItems.map((item) => (
                                <div key={item.id} className="flex items-center justify-between bg-white p-3 rounded-lg border border-gray-100">
                                    <div className="flex-1">
                                        <p className="font-semibold text-gray-800">{item.product.name}</p>
                                        <p className="text-xs text-gray-500">
                                            {formatCurrency(item.product.price)} × {item.quantity}
                                        </p>
                                        {item.note && (
                                            <p className="text-xs text-orange-600 mt-1">📝 {item.note}</p>
                                        )}
                                    </div>
                                    <div className="text-right">
                                        <p className="font-bold text-gray-800">
                                            {formatCurrency(item.product.price * item.quantity)}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Total */}
                        <div className="flex justify-between items-center pt-3 border-t-2 border-dashed border-gray-200">
                            <span className="font-semibold text-gray-700">Total del Pedido:</span>
                            <span className="text-2xl font-black text-orange-600">
                                {formatCurrency(calculateTotal())}
                            </span>
                        </div>
                    </div>

                    {/* Notes */}
                    <div className="space-y-2">
                        <label className="block text-sm font-semibold text-gray-700">
                            Notas Adicionales
                        </label>
                        <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-orange-500 focus:ring-2 focus:ring-orange-200 transition-all resize-none"
                            rows={3}
                            placeholder="Notas del cliente, instrucciones especiales..."
                        />
                    </div>

                    {/* Info Alert */}
                    <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4">
                        <p className="font-semibold text-blue-900 mb-1">ℹ️ Importante</p>
                        <p className="text-sm text-blue-700">
                            Los pedidos de Rappi no incluyen costo de domicilio.
                            Rappi se encarga del cobro y pago del delivery.
                        </p>
                    </div>
                </form>

                {/* Footer */}
                <div className="p-6 bg-gray-50 border-t-2 border-gray-100 flex gap-3">
                    <Button
                        variant="outline"
                        onClick={onClose}
                        className="flex-1 border-2"
                    >
                        Cancelar
                    </Button>
                    <Button
                        onClick={handleSubmit}
                        disabled={loading || cartItems.length === 0}
                        className="flex-1 bg-orange-600 hover:bg-orange-700 text-white shadow-lg shadow-orange-500/20"
                    >
                        {loading ? 'Guardando...' : '✓ Guardar Pedido Rappi'}
                    </Button>
                </div>
            </div>
        </div>
    );
}
