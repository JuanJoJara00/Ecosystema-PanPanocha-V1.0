interface SaleConfirmationProps {
    total: number;
    received: number;
    change: number;
    onClose: () => void;
    onOpenHistory: () => void;
}

import { Button, Card } from '@panpanocha/ui';
import { formatCurrency } from '@panpanocha/shared';

export default function SaleConfirmation({ total, received, change, onClose, onOpenHistory }: SaleConfirmationProps) {

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-fadeIn">
            <div className="relative bg-white rounded-2xl max-w-sm w-full shadow-2xl overflow-hidden animate-scaleIn">
                {/* Close Button */}
                <Button
                    variant="ghost"
                    onClick={onClose}
                    className="absolute right-3 top-3 w-8 h-8 p-0 flex items-center justify-center border-2 border-gray-300 rounded-lg text-gray-700 hover:bg-red-500 hover:border-red-500 hover:text-white transition-all text-xl font-light z-10"
                >
                    ×
                </Button>

                {/* Header */}
                <div className="p-6">
                    {/* Success Icon */}
                    <div className="flex justify-center mb-4">
                        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center animate-pulse">
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                fill="none"
                                viewBox="0 0 24 24"
                                className="w-10 h-10"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth="2.5"
                                    stroke="#10b981"
                                    d="M20 7L9 18L4 13"
                                />
                            </svg>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="text-center mb-6">
                        <h2 className="text-2xl font-bold text-green-700 mb-2">
                            ✅ Venta Completada
                        </h2>
                        <p className="text-gray-600 text-sm">
                            La transacción se procesó exitosamente
                        </p>
                    </div>

                    {/* Sale Details */}
                    <Card className="bg-gradient-to-br from-amber-50 to-yellow-50 p-4 mb-4 border-amber-200">
                        <div className="space-y-2">
                            <div className="flex justify-between items-center">
                                <span className="text-gray-700 font-medium">Total:</span>
                                <span className="text-lg font-bold text-gray-900">{formatCurrency(total)}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-gray-700 font-medium">Recibido:</span>
                                <span className="text-lg font-bold text-gray-900">{formatCurrency(received)}</span>
                            </div>
                            <div className="h-px bg-amber-300 my-2"></div>
                            <div className="flex justify-between items-center">
                                <span className="text-green-700 font-bold">Cambio:</span>
                                <span className="text-2xl font-black text-green-700">{formatCurrency(change)}</span>
                            </div>
                        </div>
                    </Card>

                    {/* Actions */}
                    <div className="space-y-2">
                        <Button
                            onClick={onClose}
                            className="w-full px-6 py-6 bg-gradient-to-r from-[#D4AF37] to-[#C19B2D] text-white font-semibold rounded-full shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all uppercase tracking-wide flex items-center justify-center gap-2"
                        >
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                fill="none"
                                viewBox="0 0 24 24"
                                className="w-5 h-5"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth="2.5"
                                    stroke="currentColor"
                                    d="M20 7L9 18L4 13"
                                />
                            </svg>
                            OK
                        </Button>
                        <Button
                            variant="outline"
                            onClick={onOpenHistory}
                            className="w-full px-6 py-6 bg-white border-2 border-gray-300 text-gray-700 font-medium rounded-full hover:bg-gray-50 transition-all h-auto"
                        >
                            Historial Ventas
                        </Button>
                    </div>
                </div>
            </div>

            <style dangerouslySetInnerHTML={{
                __html: `
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }

                @keyframes scaleIn {
                    from { transform: scale(0.9); opacity: 0; }
                    to { transform: scale(1); opacity: 1; }
                }

                .animate-fadeIn { animation: fadeIn 0.2s ease-out; }
                .animate-scaleIn { animation: scaleIn 0.3s ease-out; }
            `}} />
        </div>
    );
}
