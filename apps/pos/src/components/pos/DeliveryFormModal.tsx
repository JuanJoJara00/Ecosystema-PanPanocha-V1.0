import { useState } from 'react';
import { X, Package, Bike } from 'lucide-react';
import { usePosStore } from '../../store';
// import { supabase } from '../../api/client';
import { formatCurrency, BUSINESS_CONFIG } from '@panpanocha/shared';
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

interface DeliveryFormModalProps {
    onClose: () => void;
    cartItems: CartItem[];
}

export default function DeliveryFormModal({ onClose, cartItems }: DeliveryFormModalProps) {
    const { currentBranchId, organizationId, showAlert } = usePosStore();

    const [loading, setLoading] = useState(false);

    // Form data
    const [deliveryFee, setDeliveryFee] = useState<number>(BUSINESS_CONFIG.DELIVERY_FEE_DEFAULT);
    const [assignedDriver, setAssignedDriver] = useState('');
    const [driverId, setDriverId] = useState('');
    const [driverPhone, setDriverPhone] = useState(''); // Added to capture driver contact
    const [notes, setNotes] = useState('');

    const calculateProductTotal = () => {
        return cartItems.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
    };

    const grandTotal = calculateProductTotal() + deliveryFee;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!assignedDriver.trim()) {
            showAlert('warning', 'Faltan Datos', 'Por favor ingresa el nombre del domiciliario');
            return;
        }

        if (!driverId.trim()) {
            showAlert('warning', 'Faltan Datos', 'Por favor ingresa la cédula del domiciliario');
            return;
        }

        if (!driverPhone.trim()) {
            showAlert('warning', 'Faltan Datos', 'Por favor ingresa el teléfono del domiciliario');
            return;
        }

        if (cartItems.length === 0) {
            showAlert('warning', 'Carrito Vacío', 'No hay productos para registrar');
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
            const deliveryId = crypto.randomUUID();

            // Validate organizationId before proceeding
            // organizationId already available from destructuring
            if (!organizationId || organizationId.trim() === '') {
                showAlert('error', 'Error de Configuración', 'El ID de la organización no está configurado. Por favor, reinicie la aplicación o contacte soporte.');
                setLoading(false);
                return;
            }

            // Canonical address mapping for external service context
            // Fixed address used since these are external driver pickups, not direct customer deliveries
            const EXTERNAL_SERVICE_ADDRESS = 'Empresa de Domicilios';

            const dataToSave = {
                id: deliveryId, // Use explicit ID
                organization_id: organizationId,
                branch_id: currentBranchId,
                customer_name: 'Domicilio Externo',
                phone: driverPhone, // Mapped to driver phone
                address: EXTERNAL_SERVICE_ADDRESS,
                customer_phone: driverPhone, // Mapping driver phone as contact point for this external delivery
                customer_address: EXTERNAL_SERVICE_ADDRESS,
                product_details: JSON.stringify(productList),
                delivery_fee: deliveryFee,
                assigned_driver: assignedDriver,
                status: 'pending' as const,
                notes: notes || undefined,
            };

            const { branches } = usePosStore.getState();
            const validBranch = branches.find(b => b.id === currentBranchId);

            if (!validBranch) {
                showAlert('error', 'Error de Sede', 'El ID de la sede actual no coincide con los registros sincronizados. Por favor cierra turno y sincroniza datos.');
                setLoading(false);
                return;
            }

            // 1. Save to Local SQLite (OFFLINE-FIRST)
            await window.electron.createDelivery({
                ...dataToSave,
                created_at: new Date().toISOString()
            });

            // 2. Create reservations locally
            const reservationItems = productList.map(item => ({
                productId: item.id,
                quantity: item.quantity
            }));
            await window.electron.addReservations(reservationItems, 'delivery', deliveryId);

            // 3. Sync handled by PowerSync automatically
            console.log('[Delivery] Saved locally, PowerSync handles replication.');

            // 4. Update UI
            usePosStore.getState().triggerProductsRefresh();


            showAlert('success', 'Domicilio Registrado', 'Domicilio registrado exitosamente');
            usePosStore.getState().triggerDeliveriesRefresh();
            usePosStore.getState().clearCart();
            onClose();
        } catch (error: any) {
            console.error('Error saving delivery:', error);
            showAlert('error', 'Error al Guardar', 'Error al guardar: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
                {/* Header - Blue Gradient */}
                <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-6 text-white relative">
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 text-white/80 hover:text-white transition-colors"
                        aria-label="Cerrar"
                        title="Cerrar"
                    >
                        <X size={24} />
                    </button>
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                            <Bike size={24} />
                        </div>
                        <div>
                            <h3 className="text-2xl font-bold">📦 Domicilio PanPanocha</h3>
                            <p className="text-blue-100 text-sm">Registrar pedido interno</p>
                        </div>
                    </div>
                </div>

                {/* Info Alert */}
                <div className="mx-6 mt-4 bg-blue-50 border-2 border-blue-200 rounded-xl p-4 text-sm text-blue-800">
                    <p className="font-semibold mb-2">ℹ️ Información Importante:</p>
                    <ul className="space-y-1 text-xs">
                        <li>• Registra productos, domiciliario y costo</li>
                        <li>• Cliente paga por transferencia</li>
                        <li>• Domiciliario cobra en efectivo al recoger</li>
                    </ul>
                </div>

                {/* Form Content */}
                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
                    {/* Products Summary */}
                    <div className="space-y-3">
                        <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                            <Package size={18} className="text-blue-500" />
                            Productos del Pedido
                        </h4>
                        <div className="bg-gray-50 rounded-xl p-4 space-y-2 max-h-64overflow-y-auto border-2 border-gray-100">
                            {cartItems.map((item) => (
                                <div key={item.id} className="flex items-center justify-between bg-white p-3 rounded-lg border border-gray-100">
                                    <div className="flex-1">
                                        <p className="font-semibold text-gray-800">{item.product.name}</p>
                                        <p className="text-xs text-gray-500">
                                            {formatCurrency(item.product.price)} × {item.quantity}
                                        </p>
                                        {item.note && (
                                            <p className="text-xs text-blue-600 mt-1">📝 {item.note}</p>
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

                        {/* Subtotal */}
                        <div className="flex justify-between items-center pt-2 border-t border-gray-200">
                            <span className="text-sm font-medium text-gray-600">Subtotal Productos:</span>
                            <span className="text-lg font-bold text-gray-800">
                                {formatCurrency(calculateProductTotal())}
                            </span>
                        </div>
                    </div>

                    {/* Delivery Details */}
                    <div className="space-y-4">
                        <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                            <Bike size={18} className="text-blue-500" />
                            Datos del Domiciliario
                        </h4>

                        <div className="grid grid-cols-2 gap-4">
                            <Input
                                label="Nombre Completo *"
                                required
                                value={assignedDriver}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAssignedDriver(e.target.value)}
                                className="border-2 border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                                placeholder="Juan Pérez"
                            />
                            <Input
                                label="Cédula *"
                                required
                                value={driverId}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                                    const value = e.target.value.replace(/\D/g, '');
                                    setDriverId(value);
                                }}
                                className="border-2 border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                                placeholder="1234567890"
                            />
                            <Input
                                label="Celular Domiciliario *"
                                required
                                value={driverPhone}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                                    const value = e.target.value.replace(/\D/g, '');
                                    setDriverPhone(value);
                                }}
                                className="border-2 border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                                placeholder="300 123 4567"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                Costo Domicilio *
                            </label>
                            <Input
                                required
                                value={deliveryFee.toLocaleString('es-CO')}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                                    const value = e.target.value.replace(/\D/g, '');
                                    setDeliveryFee(parseInt(value) || 0);
                                }}
                                className="border-2 border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                                placeholder="3.000"
                            />
                        </div>
                    </div>

                    {/* Notes */}
                    <div className="space-y-2">
                        <label className="block text-sm font-semibold text-gray-700">
                            Notas u Observaciones
                        </label>
                        <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all resize-none"
                            rows={2}
                            placeholder="Detalles adicionales del pedido..."
                        />
                    </div>

                    {/* Total Summary */}
                    <div className="space-y-3">
                        {/* Venta Total */}
                        <div className="bg-green-50 border-2 border-green-200 rounded-xl p-4">
                            <div className="flex justify-between items-center">
                                <span className="font-semibold text-gray-700">💰 Venta Total:</span>
                                <span className="text-2xl font-black text-green-700">
                                    {formatCurrency(grandTotal)}
                                </span>
                            </div>
                            <p className="text-xs text-gray-600 mt-1">
                                Productos + Domicilio (se registra para el turno)
                            </p>
                        </div>

                        {/* Gasto de Caja */}
                        <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4">
                            <div className="flex justify-between items-center">
                                <span className="font-semibold text-gray-700">💸 Gasto de Caja:</span>
                                <span className="text-2xl font-black text-red-700">
                                    -{formatCurrency(deliveryFee)}
                                </span>
                            </div>
                            <p className="text-xs text-gray-600 mt-1">
                                Pago al domiciliario (se registra como gasto)
                            </p>
                        </div>

                        {/* Accounting Note */}
                        <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4 text-xs text-blue-800">
                            <p className="font-semibold mb-2">ℹ️ Resumen Contable:</p>
                            <p>✅ Venta: {formatCurrency(grandTotal)} (transferencia)</p>
                            <p>✅ Gasto: {formatCurrency(deliveryFee)} (efectivo)</p>
                            <p>✅ Inventario se descuenta de esta sede</p>
                            <p className="mt-2 font-bold text-green-700">La caja queda cuadrada ✓</p>
                        </div>
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
                        className="flex-1 bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/20"
                    >
                        {loading ? 'Guardando...' : '✓ Registrar Domicilio'}
                    </Button>
                </div>
            </div>
        </div>
    );
}
