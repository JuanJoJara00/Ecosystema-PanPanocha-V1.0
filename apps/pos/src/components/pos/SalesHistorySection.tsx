import { useState, useEffect, useMemo } from 'react';
import { usePosStore } from '../../store';
import { formatCurrency } from '@panpanocha/shared';
import { Card, Badge, Button } from '@panpanocha/ui';
import { Printer } from 'lucide-react';
import { SaleDetailModal } from './SaleDetailModal';



export default function SalesHistorySection() {
    const { currentShift, refreshHistoryTrigger, sidebarDateFilter } = usePosStore();
    const [sales, setSales] = useState<any[]>([]);
    const [loading, setLoading] = useState(false); // Start with false for instant render
    const [selectedSale, setSelectedSale] = useState<any | null>(null);

    useEffect(() => {
        loadSales();
    }, [currentShift, refreshHistoryTrigger]);

    const loadSales = async () => {
        try {
            // Only show loading if we have no cached data
            if (sales.length === 0) setLoading(true);
            const allSales = await window.electron.getAllSales();



            // Get products from store for name lookup
            const { products } = usePosStore.getState();

            // Enrich sales with product names
            const enrichedSales = allSales.map((sale: any) => ({
                ...sale,
                items: sale.items?.map((item: any) => {
                    // Get product name from item, or lookup in products store
                    let productName = item.product_name;
                    if (!productName) {
                        const product = products.find(p => p.id === item.product_id);
                        productName = product?.name || `Producto ${(item.product_id || '').slice(0, 8)}`;
                    }
                    return { ...item, product_name: productName };
                })
            }))
                // Sort by created_at descending (newest first)
                .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

            setSales(enrichedSales);
        } catch (error) {
            console.error('[SalesHistory] Error loading sales:', error);
        } finally {
            setLoading(false);
        }
    };

    const filteredSales = useMemo(() => {
        if (!sales.length) return [];

        const now = new Date();
        // Set to beginning of TODAY in local time
        now.setHours(0, 0, 0, 0);
        const startOfDay = now.getTime();

        const startOfSevenDaysAgo = new Date(now);
        startOfSevenDaysAgo.setDate(now.getDate() - 7);
        const startOfSevenDaysAgoTime = startOfSevenDaysAgo.getTime();

        const startOfFifteenDaysAgo = new Date(now);
        startOfFifteenDaysAgo.setDate(now.getDate() - 15);
        const startOfFifteenDaysAgoTime = startOfFifteenDaysAgo.getTime();

        return sales.filter(sale => {
            // Convert UTC string to local date object
            const saleDate = new Date(sale.created_at);
            const saleTime = saleDate.getTime();

            switch (sidebarDateFilter) {
                case 'shift':
                    return currentShift ? sale.shift_id === currentShift.id : true;
                case 'today':
                    return saleTime >= startOfDay;
                case '7d':
                    return saleTime >= startOfSevenDaysAgoTime;
                case '15d':
                    return saleTime >= startOfFifteenDaysAgoTime;
                default:
                    return true;
            }
        });
    }, [sales, sidebarDateFilter, currentShift]);

    const formatTime = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleTimeString('es-CO', {
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const handleReprint = async (sale: any) => {
        try {
            // @ts-ignore
            await window.electron.reprintTicket(sale.id);
            usePosStore.getState().showAlert('success', 'Reimpresión Exitosa', 'Recibo reimpreso exitosamente');
        } catch (err) {
            console.error('Failed to reprint:', err);
            usePosStore.getState().showAlert('error', 'Error de Impresión', 'Error al reimprimir el recibo');
        }
    };

    const totalSales = filteredSales.reduce((sum, sale) => sum + sale.total_amount, 0);

    if (loading) {
        return (
            <div className="p-6 flex items-center justify-center h-full">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#D4AF37] mx-auto mb-4"></div>
                    <p className="text-gray-600">Cargando ventas...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex flex-row justify-between items-center bg-transparent">
                <h2 className="text-2xl font-bold text-gray-900 uppercase tracking-tight flex items-center gap-2">
                    <span>💰</span> VENTAS
                </h2>
            </div>

            {/* Summary */}
            <div className="grid grid-cols-2 gap-3">
                <Card className="bg-yellow-50 border-yellow-200">
                    <div className="flex flex-col items-center justify-center text-center py-2">
                        <p className="text-xs uppercase font-bold text-yellow-700 tracking-wider mb-1">Total de Ventas</p>
                        <p className="text-3xl font-black text-yellow-900 font-mono tracking-tight">{filteredSales.length}</p>
                    </div>
                </Card>
                <Card className="bg-green-50 border-green-200">
                    <div className="flex flex-col items-center justify-center text-center py-2">
                        <p className="text-xs uppercase font-bold text-green-700 tracking-wider mb-1">Monto Total</p>
                        <p className="text-3xl font-black text-green-900 font-mono tracking-tight">{formatCurrency(totalSales)}</p>
                    </div>
                </Card>
            </div>

            {/* Sales List */}
            {filteredSales.length === 0 ? (
                <div className="flex items-center justify-center h-64">
                    <div className="text-center text-gray-500">
                        <p className="text-xl mb-2">📭</p>
                        <p>No hay ventas registradas</p>
                    </div>
                </div>
            ) : (
                <div className="space-y-3">
                    {filteredSales.map((sale) => {
                        const isRappi = sale.created_by_system === 'pos-rappi' || (sale.notes || '').toLowerCase().includes('rappi');
                        const isDelivery = sale.created_by_system === 'pos-delivery' || (sale.notes || '').toLowerCase().includes('domicilio');
                        const isWeb = sale.sale_channel === 'web';
                        const isRegistered = sale.client_id && !isRappi && !isDelivery && !isWeb;

                        // Colors from Dashboard Pie Chart
                        let borderColor = '#92400e'; // Default: Cliente General (Brown)
                        let badgeColor = 'bg-gray-100 text-gray-800 border-gray-200';
                        let channelName = 'Cliente General';

                        if (isRappi) {
                            borderColor = '#f59e0b'; // Rappi Orange
                            badgeColor = 'bg-[#f59e0b]/10 text-[#f59e0b] border-[#f59e0b]/20';
                            channelName = 'Pedido Rappi';
                        }
                        else if (isDelivery) {
                            borderColor = '#3b82f6'; // Domicilios Blue
                            badgeColor = 'bg-blue-50 text-blue-700 border-blue-100';
                            channelName = 'Domicilio';
                        }
                        else if (isWeb) {
                            borderColor = '#10b981'; // Web Green
                            badgeColor = 'bg-green-50 text-green-700 border-green-100';
                            channelName = 'Pedido Web';
                        }
                        else if (isRegistered) {
                            borderColor = '#facc15'; // Registered Yellow
                            badgeColor = 'bg-yellow-50 text-yellow-700 border-yellow-100';
                            channelName = 'Cliente Registrado';
                        }

                        return (
                            <Card
                                key={sale.id}
                                onClick={() => setSelectedSale(sale)}
                                style={{ borderLeftColor: borderColor }}
                                className={`
                                bg-white hover:border-[#D4AF37]/50 shadow-sm transition-all cursor-pointer relative group active:scale-[0.99]
                                border-l-4
                            `}
                            >
                                {/* Top Row: Time, ID, Total and Badges */}
                                <div className="flex justify-between items-start mb-2">
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <p className="text-sm text-gray-900 font-bold uppercase tracking-tight">
                                                {formatTime(sale.created_at)}
                                            </p>
                                            <span className="text-gray-300">|</span>
                                            <p className="text-[10px] text-gray-400 font-mono">
                                                #{sale.id.slice(0, 8)}
                                            </p>
                                        </div>
                                        {/* Customer / Type Prominent */}
                                        <div className="flex items-center gap-1 mt-1 text-gray-800 font-medium group-hover:text-[#D4AF37] transition-colors">
                                            <span className="truncate text-sm">
                                                {sale.client?.full_name || channelName}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="text-right">
                                        <p className="text-xl font-bold text-gray-900 font-mono tracking-tight">
                                            {formatCurrency(sale.total_amount)}
                                        </p>
                                        <div className="flex gap-1 justify-end mt-1">
                                            {/* Channel Badge */}
                                            {(isRappi || isDelivery || isWeb || isRegistered) && (
                                                <Badge className={`rounded-md text-[10px] uppercase font-bold px-2 ${badgeColor}`}>
                                                    {isRappi ? '🎒 Rappi' : isDelivery ? '🛵 Domicilio' : isWeb ? '🌐 Web' : '👤 Cliente'}
                                                </Badge>
                                            )}

                                            {/* Payment Method Badge */}
                                            <Badge className={`rounded-md text-[10px] uppercase font-bold px-2 border-gray-200 
                                            ${sale.payment_method === 'cash' ? 'bg-green-50 text-green-700 border-green-100' : 'bg-gray-50 text-gray-600'}`}>
                                                {sale.payment_method === 'cash' ? '💵 Efectivo' :
                                                    sale.payment_method === 'transfer' ? '🏦 Transf.' :
                                                        sale.payment_method === 'card' ? '💳 Tarjeta' :
                                                            sale.payment_method}
                                            </Badge>
                                        </div>
                                    </div>
                                </div>

                                {/* Sale Items Preview (Compact Box) */}
                                {sale.items && sale.items.length > 0 && (
                                    <div className="mt-2 bg-gray-50/50 p-2 rounded-lg border border-dashed border-gray-100">
                                        <div className="space-y-1">
                                            {sale.items.slice(0, 2).map((item: any) => (
                                                <div key={item.id || Math.random()} className="flex justify-between text-xs">
                                                    <span className="text-gray-600">
                                                        <span className="font-bold text-gray-800">{item.quantity}x</span> {item.product_name || `Producto`}
                                                    </span>
                                                </div>
                                            ))}
                                            {sale.items.length > 2 && (
                                                <p className="text-[10px] text-gray-400 italic font-medium">+ {sale.items.length - 2} productos más...</p>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* Footer: Sync Status / Print */}
                                <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-50">
                                    <div className="flex items-center gap-2">
                                        {/* Small circle matching border color for visual link */}
                                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: borderColor }}></div>
                                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">
                                            {channelName}
                                        </span>
                                    </div>

                                    <div className="flex items-center gap-3">
                                        {sale.synced ? (
                                            <span className="text-[10px] text-green-600 flex items-center gap-1 font-bold bg-green-50 px-2 py-0.5 rounded-full uppercase">
                                                <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                                                Sync
                                            </span>
                                        ) : (
                                            <span className="text-[10px] text-orange-600 flex items-center gap-1 font-bold bg-orange-50 px-2 py-0.5 rounded-full uppercase animate-pulse">
                                                <span className="w-1.5 h-1.5 rounded-full bg-orange-500"></span>
                                                Pendiente
                                            </span>
                                        )}

                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleReprint(sale);
                                            }}
                                            className="h-6 px-2 text-[10px] font-bold text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-md"
                                        >
                                            <Printer size={12} className="mr-1" />
                                            Ticket
                                        </Button>
                                    </div>
                                </div>
                            </Card>
                        );
                    })}
                </div>
            )}

            {/* Detail Modal */}
            {selectedSale && (
                <SaleDetailModal
                    sale={selectedSale}
                    onClose={() => setSelectedSale(null)}
                    onReprint={handleReprint}
                />
            )}
        </div>
    );
}

