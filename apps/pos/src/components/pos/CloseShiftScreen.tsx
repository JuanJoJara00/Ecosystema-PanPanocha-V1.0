import React, { useState, useEffect } from 'react';
import { usePosStore } from '../../store';
import { Save, Calculator, AlertTriangle } from 'lucide-react';
import { Button, Input, Card } from '@panpanocha/ui';
import { formatCurrency } from '@panpanocha/shared';
import { LoadingOverlay } from '../Loading';

interface Props {
    onClose: () => void;
}

export function CloseShiftScreen({ onClose }: Props) {
    const { currentShift } = usePosStore();
    const [finalCash, setFinalCash] = useState('');
    const [summary, setSummary] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [confirmation, setConfirmation] = useState<{
        title: string;
        message: string;
        onConfirm: () => void;
        isWarning?: boolean;
    } | null>(null);

    useEffect(() => {
        const loadReport = async () => {
            if (!currentShift?.id) return;
            try {
                setLoading(true);
                // Assuming window.electron exposes this
                const data = await (window as any).electron.getShiftSummary(currentShift.id);
                setSummary(data);
            } catch (error) {
                console.error("Failed to load shift summary", error);
            } finally {
                setLoading(false);
            }
        };
        loadReport();
    }, [currentShift]);

    const closeShift = async (finalAmount: number) => {
        try {
            await (window as any).electron.closeShift({
                shiftId: currentShift?.id,
                finalCash: finalAmount,
                observations: 'Cierre de caja - POS'
            });
            // Force reload or sync
            window.location.reload();
        } catch (error) {
            console.error("Error closing shift", error);
            alert("Error al cerrar turno");
        }
    };

    const handleCloseShift = async () => {
        if (!finalCash || !summary) return;

        const expectedCash = (currentShift?.initial_cash || 0) + summary.cashSales - (summary.totalExpenses || 0);
        const finalAmount = Number(finalCash.replace(/\./g, '').replace(/\D/g, ''));
        const difference = finalAmount - expectedCash;
        const TOLERANCE = 10000; // $10,000 COP tolerance

        const proceedToClose = () => {
            setConfirmation({
                title: '¿Cerrar Turno?',
                message: '¿Estás seguro de cerrar el turno? Esta acción no se puede deshacer y generará el reporte final.',
                onConfirm: async () => {
                    await closeShift(finalAmount);
                    onClose();
                }
            });
        };

        // Check for significant discrepancy
        if (Math.abs(difference) > TOLERANCE) {
            const message = difference > 0
                ? `Hay un SOBRANTE de ${formatCurrency(Math.abs(difference))}.\n¿Estás seguro de que el conteo es correcto?`
                : `Falta ${formatCurrency(Math.abs(difference))} en caja.\nEsta diferencia quedará registrada. ¿Deseas continuar?`;

            setConfirmation({
                title: difference > 0 ? '⚠️ Dinero Sobrante' : '⚠️ Dinero Faltante',
                message: message,
                isWarning: true,
                onConfirm: proceedToClose
            });
            return;
        }

        proceedToClose();
    }

    if (loading || !summary) return <LoadingOverlay message="Cargando reporte de cierre..." show={true} />;

    const expectedCash = (currentShift?.initial_cash || 0) + summary.cashSales - (summary.totalExpenses || 0);
    const currentFinal = Number(finalCash.replace(/\./g, '').replace(/\D/g, ''));
    const difference = currentFinal - expectedCash;


    return (
        <div className="h-full flex flex-col bg-gray-50 relative">
            {/* Header - Matching other sidebar sections */}
            <div className="p-4 bg-white border-b border-gray-200 shadow-sm shrink-0">
                <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                    <Save size={18} className="text-pp-brown" />
                    Cierre de Caja
                </h2>
                <p className="text-xs text-gray-500 mt-1">
                    Turno: <span className="font-medium text-gray-700">{currentShift?.turn_type}</span>
                </p>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">

                {/* Summary Cards */}
                <div className="grid grid-cols-2 gap-3">
                    <Card className="bg-white p-3 space-y-1 shadow-sm border-gray-100">
                        <span className="text-gray-500 text-[10px] font-bold uppercase">Base Inicial</span>
                        <div className="text-lg font-bold text-gray-800">{formatCurrency(currentShift?.initial_cash || 0)}</div>
                    </Card>
                    <Card className="bg-blue-50 p-3 space-y-1 text-blue-900 border-blue-100 shadow-sm">
                        <span className="text-blue-600 text-[10px] font-bold uppercase">Ventas Totales</span>
                        <div className="text-lg font-bold">{formatCurrency(summary.totalSales)}</div>
                        <div className="text-[10px] opacity-75">{summary.salesCount} transacciones</div>
                    </Card>
                </div>

                {/* Breakdown */}
                <div className="space-y-3 bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                    <h3 className="font-bold text-gray-800 text-sm border-b pb-2">Desglose de Ingresos</h3>
                    <div className="space-y-2 text-sm">
                        <div className="flex justify-between items-center p-2 bg-green-50 rounded border border-green-100">
                            <span className="font-medium text-green-900 text-xs">Efectivo (Ventas)</span>
                            <span className="font-bold text-green-700 text-xs">+{formatCurrency(summary.cashSales)}</span>
                        </div>
                        <div className="flex justify-between items-center p-2 bg-gray-50 rounded border border-gray-100">
                            <span className="flex items-center gap-2 text-xs text-gray-600">Datáfono / Tarjeta</span>
                            <span className="text-xs font-bold text-gray-700">{formatCurrency(summary.cardSales)}</span>
                        </div>
                        <div className="flex justify-between items-center p-2 bg-gray-50 rounded border border-gray-100">
                            <span className="flex items-center gap-2 text-xs text-gray-600">Transferencias</span>
                            <span className="text-xs font-bold text-gray-700">{formatCurrency(summary.transferSales)}</span>
                        </div>
                        {summary.totalExpenses > 0 && (
                            <div className="flex justify-between items-center p-2 bg-red-50 rounded border border-red-100">
                                <span className="font-medium text-red-900 text-xs">Gastos / Egresos</span>
                                <span className="font-bold text-red-700 text-xs">-{formatCurrency(summary.totalExpenses)}</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Final Count */}
                <div className="bg-gray-900 text-white p-5 rounded-xl space-y-5 shadow-lg">
                    <div className="flex justify-between items-end border-b border-gray-700 pb-3">
                        <div>
                            <p className="text-gray-400 text-[10px] uppercase font-bold tracking-wider mb-1">Efectivo Esperado</p>
                            <p className="text-[10px] text-gray-500">(Base + Ventas - Gastos)</p>
                        </div>
                        <div className="text-2xl font-mono font-bold">
                            {formatCurrency(expectedCash)}
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-pp-gold font-bold text-xs uppercase tracking-wide flex items-center gap-2">
                            <Calculator size={14} /> ¿Cuánto hay en caja?
                        </label>
                        <Input
                            type="text"
                            inputMode="numeric"
                            className="w-full bg-gray-800 border-gray-700 text-xl font-bold text-white focus:border-pp-gold focus:ring-1 focus:ring-pp-gold h-12"
                            placeholder="0"
                            value={finalCash}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                                const digits = e.target.value.replace(/\D/g, '');
                                const formatted = digits ? new Intl.NumberFormat('es-CO').format(Number(digits)) : '';
                                setFinalCash(formatted);
                            }}
                        />
                    </div>

                    {finalCash && (
                        <div className={`p-3 rounded-lg flex items-center gap-3 ${difference === 0 ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                            <AlertTriangle size={18} />
                            <div className="flex-1">
                                <span className="font-bold block text-sm">Diferencia: {formatCurrency(difference)}</span>
                                <span className="text-[10px] opacity-80">{difference === 0 ? 'Cuadre perfecto' : difference > 0 ? 'Sobra dinero' : 'Falta dinero'}</span>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Footer */}
            <div className="p-4 bg-white border-t border-gray-200 shrink-0">
                <Button
                    onClick={handleCloseShift}
                    disabled={!finalCash}
                    className="w-full bg-pp-brown hover:bg-pp-brown/90 text-white font-bold h-12 shadow-lg"
                >
                    <Save size={18} className="mr-2" /> Cerrar Turno
                </Button>
            </div>

            {/* Confirmation Modal */}
            {confirmation && (
                <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 max-w-sm w-full shadow-2xl border border-white/20 text-center space-y-4">
                        <div className={`mx-auto w-12 h-12 rounded-full flex items-center justify-center mb-2 ${confirmation.isWarning ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
                            <AlertTriangle size={24} />
                        </div>

                        <h3 className="text-xl font-bold text-white drop-shadow-md">{confirmation.title}</h3>
                        <p className="text-white/90 text-sm whitespace-pre-line leading-relaxed">{confirmation.message}</p>

                        <div className="flex gap-3 pt-2">
                            <Button
                                onClick={() => setConfirmation(null)}
                                variant="outline"
                                className="flex-1 bg-white/10 border-white/20 text-white hover:bg-white/20"
                            >
                                Cancelar
                            </Button>
                            <Button
                                onClick={confirmation.onConfirm}
                                className={`flex-1 font-bold ${confirmation.isWarning ? 'bg-red-500 hover:bg-red-600 text-white' : 'bg-pp-gold hover:bg-yellow-500 text-white'}`}
                            >
                                Confirmar
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
