import { useState, useEffect, useCallback } from 'react';
import { User, Check, X, MapPin, Trash2 } from 'lucide-react';
import { usePosStore, assertOrganizationId } from '../../store';
// import { supabase } from '../../api/client'; // Removed direct cloud dependency

import { formatCurrency } from '@panpanocha/shared';
import { Card, Badge, Skeleton } from '@panpanocha/ui';
import { toast } from '../../hooks/useToast';

interface Delivery {
    id: string;
    customer_name: string;
    customer_phone: string;
    customer_address: string;
    product_details: string;
    delivery_fee: number;
    status: 'pending' | 'dispatched' | 'delivered' | 'cancelled';
    created_at: string;
    branch_id?: string;
    assigned_driver?: string;
    last_edited_at?: string;
    order_type?: 'domicilio' | 'rappi';
    rappi_order_id?: string;
}

export default function DeliveriesSection() {
    const { currentBranchId, refreshDeliveriesTrigger, currentShift, currentUser, sidebarDateFilter } = usePosStore();
    const [deliveries, setDeliveries] = useState<Delivery[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedDelivery, setSelectedDelivery] = useState<Delivery | null>(null);
    const [processing, setProcessing] = useState(false);
    const [showCancelConfirm, setShowCancelConfirm] = useState(false);

    const loadTodaysDeliveries = useCallback(async () => {
        try {
            setLoading(true);

            // Strict Tenant Check
            const orgId = assertOrganizationId();

            let queryStartTime = new Date();
            queryStartTime.setHours(0, 0, 0, 0);

            if (sidebarDateFilter === 'shift' && currentShift?.start_time) {
                queryStartTime = new Date(currentShift.start_time);
            } else if (sidebarDateFilter === '7d') {
                queryStartTime.setDate(queryStartTime.getDate() - 7);
            } else if (sidebarDateFilter === '15d') {
                queryStartTime.setDate(queryStartTime.getDate() - 15);
            }
            // 'today' uses start of today already set above

            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            tomorrow.setHours(0, 0, 0, 0);

            const [deliveriesRes, rappiRes] = await Promise.all([
                // Local SQLite fetch (Offline-First)
                window.electron.getDeliveriesByBranch(currentBranchId || ''),
                window.electron.getRappiDeliveries()
            ]);

            if (!Array.isArray(deliveriesRes)) console.error('[Deliveries] Invalid deliveries response:', deliveriesRes);

            // Filter standard deliveries by date in JS since we fetched by branch (or update DAO to filter by date)
            // For now, filtering in JS is fast enough for daily operations.
            const standardDeliveries = (Array.isArray(deliveriesRes) ? deliveriesRes : []).filter(d => {
                const date = new Date(d.created_at);
                return date >= queryStartTime && date < tomorrow;
            });

            const allDeliveries: Delivery[] = [
                ...standardDeliveries.map(d => {
                    return {
                        ...d,
                        order_type: 'domicilio' as const,
                        // Status is now correctly typed as 'dispatched' in canonical type
                        status: d.status as Delivery['status'],
                        customer_phone: d.phone,
                        customer_address: d.address,
                        product_details: (d as { product_details?: string }).product_details ?? '[]',
                        delivery_fee: (d as { delivery_fee?: number }).delivery_fee ?? 0,
                        organization_id: orgId
                    };
                }),
                ...(Array.isArray(rappiRes) ? rappiRes : []).map(d => ({
                    ...d,
                    order_type: 'rappi' as const,
                    // Map Rappi statuses to generic Delivery statuses
                    status: (
                        d.status === 'ready' || d.status === 'picked_up' ? 'pending' :
                            d.status === 'dispatched' ? 'dispatched' :
                                d.status === 'delivered' ? 'delivered' :
                                    d.status === 'cancelled' ? 'cancelled' :
                                        'pending'
                    ) as Delivery['status'],
                    customer_name: d.customer_name || d.client_name || 'Pedido Rappi',
                    // Note: Rappi doesn't provide phone/address in basic integration, keep fallback or null
                    phone: 'Rappi',
                    address: 'Rappi',
                    customer_phone: 'Rappi',
                    customer_address: 'Rappi',

                    product_details: d.product_details || '[]',
                    delivery_fee: d.total_amount || d.total_value || 0,
                    delivery_cost: 0,
                    delivery_person: 'Rappi',
                    organization_id: orgId,
                    notes: d.notes
                }))
            ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

            // Filter out completed ones if we only want active ones? No, user wants to see history too usually, but let's check
            // For now, keep showing all but sort by date.

            setDeliveries(allDeliveries);
        } catch (error) {
            console.error('[Deliveries] Error loading:', error);
        } finally {
            setLoading(false);
        }
    }, [currentBranchId, currentShift?.start_time, sidebarDateFilter]);

    useEffect(() => {
        loadTodaysDeliveries();
        const interval = setInterval(loadTodaysDeliveries, 60000);
        return () => clearInterval(interval);
    }, [loadTodaysDeliveries, refreshDeliveriesTrigger]);

    const handleViewDetail = (delivery: Delivery) => {
        setSelectedDelivery(delivery);
    };

    const handleCancelDelivery = async (deliveryId: string) => {
        if (processing) return;
        setProcessing(true);
        try {
            const delivery = deliveries.find(d => d.id === deliveryId);
            if (!delivery) throw new Error('Delivery not found');

            const isRappi = delivery.order_type === 'rappi';


            // 1. Update LOCAL Database
            if (isRappi) {
                await window.electron.updateRappiStatus(deliveryId, 'cancelled');
            } else {
                await window.electron.updateDeliveryStatus(deliveryId, 'cancelled');
            }

            // 2. PowerSync handles background sync automatically

            const sourceType = isRappi ? 'rappi' : 'delivery';
            await window.electron.removeReservation(sourceType, deliveryId);
            usePosStore.getState().triggerProductsRefresh();

            toast.success(`✅ Pedido cancelado - Stock restaurado`);
            setSelectedDelivery(null);
            loadTodaysDeliveries();
        } catch (error: any) {
            toast.error('Error al cancelar: ' + error.message);
        } finally {
            setProcessing(false);
        }
    };

    const handleMarkAsDelivered = async (deliveryId: string) => {
        if (processing) return;
        setProcessing(true);
        try {
            const delivery = deliveries.find(d => d.id === deliveryId);
            if (!delivery) throw new Error('Delivery not found');

            // Strict Tenant Check
            const orgId = assertOrganizationId();

            // Require authenticated user for sale creation
            if (!currentUser?.id) {
                toast.error('❌ No se puede completar: Usuario no autenticado');
                setProcessing(false);
                return;
            }

            if (delivery.status === 'delivered') {
                toast.success('Este pedido ya fue entregado previamente.');
                setSelectedDelivery(null);
                return;
            }

            const isRappi = delivery.order_type === 'rappi';


            const products = JSON.parse(delivery.product_details);
            const productTotal = products.reduce((sum: number, item: any) =>
                sum + (item.price * item.quantity), 0
            );
            const totalAmount = productTotal + (delivery.delivery_fee || 0);

            // --- REDUNDANCY CUSTOM_CHECK ---
            // If current shift is active, check if this delivery was already registered as a sale
            let alreadyExists = false;
            if (currentShift?.id) {
                try {
                    console.log(`[DeliveriesSection] Checking for duplicate sale for delivery: ${deliveryId} in shift: ${currentShift.id}`);
                    const shiftSales = await window.electron.getSalesByShift(currentShift.id);
                    // Match by Note content which contains the delivery/rappi ID
                    const searchKey = isRappi
                        ? (delivery.rappi_order_id || deliveryId.slice(0, 8))
                        : (deliveryId.slice(0, 8));

                    alreadyExists = shiftSales.some((s: any) => s.notes && s.notes.includes(searchKey));
                    console.log(`[DeliveriesSection] Redundancy check result: ${alreadyExists ? 'EXISTS (Sale found)' : 'NEW (No sale found)'}`);
                } catch (chkErr) {
                    console.warn('[DeliveriesSection] Error checking for duplicate sale:', chkErr);
                }
            }

            if (alreadyExists) {
                // Just update status, do NOT create new sale
                console.log('Sale already exists for this delivery, skipping creation.');

                // 1. Update LOCAL State (Offline-First)
                if (isRappi) {
                    await window.electron.updateRappiStatus(deliveryId, 'delivered');
                } else {
                    await window.electron.updateDeliveryStatus(deliveryId, 'delivered');
                }

                // 2. Trigger Sync
                // 2. PowerSync Syncs Automatically
                // 3. Confirm Reservations
                const sourceType = isRappi ? 'rappi' : 'delivery';
                await window.electron.markReservationConfirmed(sourceType, deliveryId);

                toast.success(`✅ Estado actualizado (Venta ya existía)`);
                setSelectedDelivery(null);
                loadTodaysDeliveries();
                setProcessing(false);
                return;
            }
            // -------------------------------


            // 1. Update LOCAL Database (Offline-First)
            if (isRappi) {
                await window.electron.updateRappiStatus(deliveryId, 'delivered');
            } else {
                await window.electron.updateDeliveryStatus(deliveryId, 'delivered');
            }

            // 3. Register Sale
            const saleId = crypto.randomUUID();

            const saleData = {
                id: saleId,
                branch_id: currentBranchId,
                shift_id: currentShift?.id,
                created_by: currentUser.id,
                created_by_system: isRappi ? 'pos-rappi' : 'pos-delivery',
                sale_channel: isRappi ? 'rappi' as const : 'delivery' as const,
                total_amount: totalAmount,
                payment_method: 'transfer' as const,
                status: 'completed' as const,
                notes: isRappi
                    ? `Rappi #${delivery.rappi_order_id || deliveryId.slice(0, 8)}`
                    : `Domicilio #${deliveryId.slice(0, 8)} - ${delivery.customer_name}`,
                diners: 1,
                created_at: new Date().toISOString(),
                synced: false,
                organization_id: orgId,
            };

            const saleItems = products.map((item: any) => ({
                id: crypto.randomUUID(),
                sale_id: saleId,
                product_id: item.id,
                product_name: item.name,
                quantity: item.quantity,
                unit_price: item.price,
                total_price: item.price * item.quantity,
            }));

            await window.electron.saveSale(saleData, saleItems);

            // 4. Confirm Reservations
            const sourceType = isRappi ? 'rappi' : 'delivery';
            await window.electron.markReservationConfirmed(sourceType, deliveryId);

            // 5. Register Delivery Fee Expense (if applicable)
            if (delivery.delivery_fee && delivery.delivery_fee > 0) {
                if (!currentUser?.id) {
                    console.warn('[Expense] Cannot create expense: No authenticated user');
                    toast.warning('⚠️ No se pudo registrar el gasto: Usuario no autenticado.');
                } else if (!currentShift) {
                    console.warn('Cannot register expense: No active shift');
                    toast.warning('⚠️ No hay turno activo, el gasto no quedó asociado a caja.');
                } else {
                    const expenseData = {
                        id: crypto.randomUUID(),
                        branch_id: currentBranchId,
                        shift_id: currentShift.id,
                        user_id: currentUser.id,
                        amount: delivery.delivery_fee,
                        category: 'Domicilios',
                        description: isRappi
                            ? `Rappi - Orden ${delivery.rappi_order_id || deliveryId.slice(0, 8)}`
                            : `Pago domiciliario - ${delivery.assigned_driver || 'N/A'}`,
                        created_at: new Date().toISOString(),
                        synced: false,
                        organization_id: orgId
                    };

                    try {
                        await window.electron.createExpense(expenseData);
                    } catch (expenseErr) {
                        console.error('Local Expense registration error:', expenseErr);
                        toast.error(`⚠️ Advertencia: No se pudo registrar el gasto localmente.`);
                    }
                }
            }

            const orderType = isRappi ? 'Rappi' : 'Domicilio';
            toast.success(`✅ ${orderType} marcado como entregado\n💰 Venta registrada${delivery.delivery_fee > 0 ? '\n💸 Gasto registrado' : ''}`);
            setSelectedDelivery(null);
            loadTodaysDeliveries();
        } catch (error: any) {
            toast.error('Error al procesar: ' + error.message);
        } finally {
            setProcessing(false);
        }
    };

    const calculateProductTotal = (productDetails: string) => {
        try {
            const parsed = typeof productDetails === 'string' ? JSON.parse(productDetails) : productDetails;
            if (Array.isArray(parsed)) {
                return parsed.reduce((acc: number, item: any) => acc + (item.price * item.quantity), 0);
            }
            return 0;
        } catch {
            return 0;
        }
    };

    const formatTime = (dateString: string) => {
        return new Date(dateString).toLocaleTimeString('es-CO', {
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const parseProducts = (details: string) => {
        try {
            return JSON.parse(details);
        } catch {
            return [];
        }
    };

    if (loading) {
        return (
            <div className="p-6 h-full space-y-3">
                {[1, 2, 3].map(i => (
                    <div key={i} className="border-2 border-gray-100 rounded-xl p-4 bg-white">
                        <div className="flex justify-between items-start mb-3">
                            <Skeleton className="h-6 w-20 rounded-full" />
                            <Skeleton className="h-6 w-20 rounded-full" />
                        </div>
                        <Skeleton className="h-4 w-full" />
                    </div>
                ))}
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex flex-row justify-between items-center bg-transparent">
                <h2 className="text-2xl font-bold text-gray-900 uppercase tracking-tight flex items-center gap-2">
                    <span>🛵</span> DOMICILIOS
                </h2>
            </div>

            {/* Summary Stats */}
            <div className="grid grid-cols-2 gap-3">
                <Card className="bg-yellow-50 border-yellow-200">
                    <div className="flex flex-col items-center justify-center text-center py-2">
                        <p className="text-xs text-yellow-700 font-semibold mb-1 uppercase tracking-wider">Pendientes</p>
                        <p className="text-3xl font-black text-yellow-900">
                            {deliveries.filter(d => d.status === 'pending').length}
                        </p>
                    </div>
                </Card>
                <Card className="bg-green-50 border-green-200">
                    <div className="flex flex-col items-center justify-center text-center py-2">
                        <p className="text-xs text-green-700 font-semibold mb-1 uppercase tracking-wider">Entregados</p>
                        <p className="text-3xl font-black text-green-900">
                            {deliveries.filter(d => d.status === 'delivered').length}
                        </p>
                    </div>
                </Card>
            </div>

            {/* Deliveries List */}
            <div>
                {deliveries.length === 0 ? (
                    <Card className="bg-gray-50 border-gray-200 text-center py-8">
                        <p className="text-4xl mb-3">🛵</p>
                        <p className="text-gray-600 font-medium">No hay domicilios hoy</p>
                        <p className="text-sm text-gray-500 mt-1">
                            Los pedidos de domicilio aparecerán aquí
                        </p>
                    </Card>
                ) : (
                    <div className="space-y-3">
                        {deliveries.map((delivery) => {
                            const isRappi = delivery.order_type === 'rappi';
                            const productTotal = calculateProductTotal(delivery.product_details);
                            const total = productTotal + (delivery.delivery_fee || 0);
                            const items = parseProducts(delivery.product_details);

                            return (
                                <Card
                                    key={delivery.id}
                                    onClick={() => handleViewDetail(delivery)}
                                    className={`
                                        bg-white hover:border-[#D4AF37]/50 shadow-sm transition-all cursor-pointer relative group active:scale-[0.99]
                                        ${isRappi ? 'border-l-4 border-l-[#FF441F]' : 'border-l-4 border-l-blue-500'}
                                    `}
                                >
                                    {/* Top Row: Time, ID, Total and Badges */}
                                    <div className="flex justify-between items-start mb-2">
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <p className="text-sm text-gray-900 font-bold uppercase tracking-tight">
                                                    {formatTime(delivery.created_at)}
                                                </p>
                                                <span className="text-gray-300">|</span>
                                                <p className="text-[10px] text-gray-400 font-mono">
                                                    #{delivery.id.slice(0, 8)}
                                                </p>
                                            </div>
                                            {/* Customer Name prominent */}
                                            <div className="flex items-center gap-1 mt-1 text-gray-800 font-medium group-hover:text-[#D4AF37] transition-colors">
                                                <User className="w-3.5 h-3.5 text-gray-400" />
                                                <span className="truncate text-sm">{delivery.customer_name}</span>
                                            </div>
                                        </div>

                                        <div className="text-right">
                                            <p className="text-xl font-bold text-gray-900 font-mono tracking-tight">
                                                {formatCurrency(total)}
                                            </p>
                                            <div className="flex gap-1 justify-end mt-1">
                                                {isRappi ? (
                                                    <Badge className="bg-[#FF441F]/10 text-[#FF441F] border-[#FF441F]/20 rounded-md text-[10px] uppercase font-bold px-2">
                                                        🎒 Rappi
                                                    </Badge>
                                                ) : (
                                                    <Badge className="bg-blue-50 text-blue-700 border-blue-100 rounded-md text-[10px] uppercase font-bold px-2">
                                                        💵 Efectivo
                                                    </Badge>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Middle: Products List (Compact) */}
                                    {items.length > 0 && (
                                        <div className="mt-2 bg-gray-50/50 p-2 rounded-lg border border-dashed border-gray-100">
                                            <div className="space-y-1">
                                                {items.slice(0, 2).map((item: any, idx: number) => (
                                                    <div key={idx} className="flex justify-between text-xs">
                                                        <span className="text-gray-600">
                                                            <span className="font-bold text-gray-800">{item.quantity}x</span> {item.name}
                                                        </span>
                                                    </div>
                                                ))}
                                                {items.length > 2 && (
                                                    <p className="text-[10px] text-gray-400 italic font-medium">
                                                        + {items.length - 2} productos más...
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {/* Bottom: Address & Status */}
                                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-50">
                                        <div className="flex items-center gap-2 max-w-[60%]">
                                            {!isRappi && (
                                                <div className="flex items-center gap-1 text-[10px] text-gray-500 truncate">
                                                    <MapPin className="w-3 h-3 text-gray-400" />
                                                    <span className="truncate">{delivery.customer_address}</span>
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex items-center gap-3">
                                            {delivery.status === 'delivered' ? (
                                                <span className="text-[10px] text-green-600 flex items-center gap-1 font-bold bg-green-50 px-2 py-0.5 rounded-full uppercase">
                                                    <Check className="w-3 h-3" />
                                                    Entregado
                                                </span>
                                            ) : (
                                                <span className="text-[10px] text-orange-600 flex items-center gap-1 font-bold bg-orange-50 px-2 py-0.5 rounded-full uppercase animate-pulse">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-orange-500"></span>
                                                    Pendiente
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </Card>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Detail Modal */}
            {/* Detail Modal - Clean Layout */}
            {selectedDelivery && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4" onClick={() => setSelectedDelivery(null)}>
                    <div
                        className="bg-white rounded-[30px] shadow-2xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200 relative border-t-4 border-[#D4AF37]"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="pt-8 px-8 pb-4">
                            <div className="flex justify-between items-start">
                                <div>
                                    <h2 className="text-2xl font-black text-gray-900 uppercase tracking-tight leading-none">Detalles del Pedido</h2>
                                    <p className="text-sm font-bold text-[#D4AF37] mt-1">#{selectedDelivery.id.slice(0, 8).toUpperCase()}</p>
                                </div>
                                <button
                                    onClick={() => setSelectedDelivery(null)}
                                    className="text-gray-400 hover:text-gray-900 transition-colors"
                                    aria-label="Cerrar detalles"
                                    title="Cerrar detalles"
                                >
                                    <X size={24} />
                                </button>
                            </div>
                        </div>

                        {/* Body */}
                        <div className="px-8 pb-8 space-y-6">

                            {/* Customer Box */}
                            <div className="bg-gray-50 rounded-2xl p-4 flex justify-between items-center">
                                <div>
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Cliente</p>
                                    <p className="text-base font-bold text-gray-900 leading-tight">
                                        {selectedDelivery.customer_name}
                                    </p>
                                </div>
                                <div className="text-right">
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Entrega</p>
                                    <p className="text-base font-bold text-gray-900 leading-tight text-right truncate max-w-[150px]">
                                        {selectedDelivery.order_type === 'rappi' ? 'Rappi' : selectedDelivery.customer_address}
                                    </p>
                                </div>
                            </div>

                            {/* Products Section */}
                            <div>
                                <div className="flex items-center gap-2 mb-3">
                                    <p className="text-xs font-black text-gray-800 uppercase tracking-wider flex items-center gap-2">
                                        🛒 Productos
                                    </p>
                                </div>
                                <div className="border border-gray-100 rounded-2xl overflow-hidden">
                                    {(() => {
                                        const items = parseProducts(selectedDelivery.product_details);
                                        return items.map((item: any, idx: number) => (
                                            <div key={idx} className="flex justify-between items-center p-4 border-b border-gray-50 last:border-0 bg-white">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-8 h-8 rounded-full bg-[#fcf5e6] text-[#b08d2b] font-bold flex items-center justify-center text-sm shrink-0">
                                                        {item.quantity}
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-gray-900 text-sm leading-tight">{item.name}</p>
                                                        <p className="text-xs text-gray-400 mt-0.5">Unitario: {formatCurrency(item.price)}</p>
                                                    </div>
                                                </div>
                                                <p className="font-bold text-gray-900 text-sm">{formatCurrency(item.price * item.quantity)}</p>
                                            </div>
                                        ));
                                    })()}
                                </div>
                            </div>

                            {/* Financial Summary - Gray Block */}
                            <div className="bg-gray-50 rounded-2xl p-6 space-y-3">
                                <div className="flex justify-between text-sm text-gray-500 font-medium">
                                    <span>Subtotal Productos</span>
                                    <span>{formatCurrency(calculateProductTotal(selectedDelivery.product_details))}</span>
                                </div>
                                <div className="flex justify-between text-sm text-gray-500 font-medium">
                                    <span>Costo Domicilio</span>
                                    <span>{formatCurrency(selectedDelivery.delivery_fee)}</span>
                                </div>

                                <div className="flex justify-between items-center pt-2 mt-2 border-t border-gray-200">
                                    <span className="text-xl font-black text-gray-900 uppercase">Total a Pagar</span>
                                    <span className="text-2xl font-black text-gray-900 tracking-tight">
                                        {formatCurrency(calculateProductTotal(selectedDelivery.product_details) + selectedDelivery.delivery_fee)}
                                    </span>
                                </div>
                            </div>

                            {/* Actions - Full Width Clean Buttons */}
                            <div className="pt-2 flex flex-col gap-3">
                                {selectedDelivery.status === 'pending' ? (
                                    <>
                                        <button
                                            onClick={() => {
                                                handleMarkAsDelivered(selectedDelivery.id);
                                            }}
                                            disabled={processing}
                                            className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-4 rounded-xl text-sm uppercase tracking-wider transition-colors shadow-lg shadow-green-200 flex items-center justify-center gap-2"
                                        >
                                            {processing ? (
                                                <>⏳ Procesando...</>
                                            ) : (
                                                <>
                                                    <Check size={18} /> CONFIRMAR ENTREGA
                                                </>
                                            )}
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() => setShowCancelConfirm(true)}
                                            disabled={processing}
                                            className="w-full bg-red-50 hover:bg-red-100 text-red-600 font-bold py-4 rounded-xl text-sm uppercase tracking-wider transition-colors flex items-center justify-center gap-2"
                                        >
                                            <Trash2 size={16} /> Cancelar Pedido
                                        </button>
                                    </>
                                ) : (
                                    <button
                                        onClick={() => setSelectedDelivery(null)}
                                        className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-4 rounded-xl text-sm uppercase tracking-wider transition-colors"
                                    >
                                        Cerrar
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Confirmation Overlay */}
                        {showCancelConfirm && (
                            <div className="absolute inset-0 bg-white/95 backdrop-blur-sm z-[70] flex items-center justify-center p-8 rounded-[30px] animate-in fade-in duration-200">
                                <div className="w-full max-w-sm text-center space-y-4">
                                    <div className="mx-auto w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-2">
                                        <Trash2 size={24} />
                                    </div>
                                    <h3 className="text-xl font-black text-gray-900">¿Cancelar Pedido?</h3>
                                    <p className="text-gray-500 text-sm leading-relaxed">
                                        Esta acción restaurará el stock y marcará el pedido como cancelado. <br />
                                        <span className="font-bold text-red-500">¿Estás seguro?</span>
                                    </p>
                                    <div className="grid grid-cols-2 gap-3 pt-2">
                                        <button
                                            type="button"
                                            onClick={() => setShowCancelConfirm(false)}
                                            className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-3 rounded-xl text-sm transition-colors"
                                        >
                                            VOLVER
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                if (selectedDelivery) handleCancelDelivery(selectedDelivery.id);
                                                setShowCancelConfirm(false);
                                            }}
                                            className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-xl text-sm transition-colors shadow-lg shadow-red-200"
                                        >
                                            SÍ, CANCELAR
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
