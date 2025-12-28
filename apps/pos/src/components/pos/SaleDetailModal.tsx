import { X, Printer } from 'lucide-react';
import { formatCurrency } from '@panpanocha/shared';

interface SaleItem {
    id: string;
    product_name: string;
    quantity: number;
    unit_price?: number;
    total_price: number;
    modifiers?: any[];
}

interface Sale {
    id: string;
    created_at: string;
    total_amount: number;
    payment_method: string;
    items: SaleItem[];
    tip_amount?: number;
    discount_amount?: number;
    client?: {
        full_name: string;
    };
    shift_id?: string;
    synced?: boolean;
}

interface Props {
    sale: Sale;
    onClose: () => void;
    onReprint: (sale: Sale) => void;
}

export function SaleDetailModal({ sale, onClose, onReprint }: Props) {
    // Calculate subtotal from total - tip + discount? 
    // Or just sum items. Let's rely on fields if possible, otherwise derive.
    // Usually: Total = Subtotal - Discount + Tip
    // So: Subtotal = Total - Tip + Discount
    const tip = sale.tip_amount || 0;
    const discount = sale.discount_amount || 0;
    // If we simply sum item prices, that should be the subtotal (gross).
    // Let's verify with the items sum.
    const itemsTotal = sale.items.reduce((acc, item) => acc + item.total_price, 0);

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4 animate-in fade-in duration-200 font-sans">
            <div className="bg-white w-full max-w-md rounded-[30px] shadow-2xl overflow-hidden relative border-t-4 border-[#D4AF37]">

                {/* Header */}
                <div className="pt-8 px-8 pb-4">
                    <div className="flex justify-between items-start">
                        <div>
                            <h2 className="text-2xl font-black text-gray-900 uppercase tracking-tight leading-none">DETALLE DE VENTA</h2>
                            <p className="text-sm font-bold text-[#D4AF37] mt-1">#{sale.id.slice(0, 8).toUpperCase()}</p>
                        </div>
                        <button
                            onClick={onClose}
                            className="text-gray-400 hover:text-gray-900 transition-colors"
                        >
                            <X size={24} />
                        </button>
                    </div>
                </div>

                {/* Body */}
                <div className="px-8 pb-8 space-y-6">

                    {/* Client Box */}
                    <div className="bg-gray-50 rounded-2xl p-4 flex justify-between items-center">
                        <div>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Cliente</p>
                            <p className="text-base font-bold text-gray-900 leading-tight">
                                {sale.client?.full_name || 'Cliente General'}
                            </p>
                        </div>
                        <div className="text-right">
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Método</p>
                            <p className="text-base font-bold text-gray-900 leading-tight capitalize">
                                {sale.payment_method === 'cash' ? 'Efectivo' : sale.payment_method}
                            </p>
                        </div>
                    </div>

                    {/* Products Section */}
                    <div>
                        <div className="flex items-center gap-2 mb-3">
                            {/* Icon could go here if needed, keeping it clean */}
                            <p className="text-xs font-black text-gray-800 uppercase tracking-wider flex items-center gap-2">
                                🛒 Productos
                            </p>
                        </div>

                        <div className="border border-gray-100 rounded-2xl overflow-hidden">
                            {sale.items.map((item, idx) => (
                                <div key={idx} className="flex justify-between items-center p-4 border-b border-gray-50 last:border-0 bg-white">
                                    <div className="flex items-center gap-4">
                                        <div className="w-8 h-8 rounded-full bg-[#fcf5e6] text-[#b08d2b] font-bold flex items-center justify-center text-sm shrink-0">
                                            {item.quantity}
                                        </div>
                                        <div>
                                            <p className="font-bold text-gray-900 text-sm leading-tight">{item.product_name}</p>
                                            <p className="text-xs text-gray-400 mt-0.5">Unitario: {formatCurrency(item.unit_price || item.total_price / item.quantity)}</p>
                                        </div>
                                    </div>
                                    <p className="font-bold text-gray-900 text-sm">
                                        {formatCurrency(item.total_price)}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Totals Section Container - Gray Block */}
                    <div className="bg-gray-50 rounded-2xl p-6 space-y-3">
                        <div className="flex justify-between text-sm text-gray-500 font-medium">
                            <span>Subtotal Productos</span>
                            <span>{formatCurrency(itemsTotal)}</span>
                        </div>

                        {(discount > 0 || tip > 0) && (
                            <div className="space-y-1 pt-2 pb-2 border-b border-dashed border-gray-200">
                                {discount > 0 && (
                                    <div className="flex justify-between text-sm text-blue-600">
                                        <span>Descuento</span>
                                        <span>- {formatCurrency(discount)}</span>
                                    </div>
                                )}
                                {tip > 0 && (
                                    <div className="flex justify-between text-sm text-[#D4AF37]">
                                        <span>Propina</span>
                                        <span>+ {formatCurrency(tip)}</span>
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="flex justify-between items-center pt-2 mt-2 border-t border-gray-200">
                            <span className="text-xl font-black text-gray-900 uppercase">Total a Pagar</span>
                            <span className="text-2xl font-black text-gray-900 tracking-tight">
                                {formatCurrency(sale.total_amount)}
                            </span>
                        </div>
                    </div>

                    {/* Actions - Full Width Clean Buttons */}
                    <div className="pt-2">
                        <button
                            onClick={onClose}
                            className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-4 rounded-xl text-sm uppercase tracking-wider transition-colors"
                        >
                            Cerrar
                        </button>

                        <div className="text-center mt-3">
                            <button
                                onClick={() => onReprint(sale)}
                                className="text-xs font-bold text-gray-400 hover:text-[#D4AF37] uppercase tracking-widest transition-colors flex items-center justify-center gap-1 mx-auto"
                            >
                                <Printer size={12} /> Reimprimir Recibo
                            </button>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
}
