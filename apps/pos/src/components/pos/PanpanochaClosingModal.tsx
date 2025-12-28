import { useState, useEffect, useMemo } from 'react';
import { Button } from '@panpanocha/ui';
import { X, Printer, ArrowRight, ArrowLeft, Coins, Wallet, Check, Package, Calculator } from 'lucide-react';
import { usePosStore } from '../../store';
import { formatCurrency } from '@panpanocha/shared';
import { type ClosingData } from '../../types';
import { LoadingOverlay } from '../Loading';

const DENOMINATIONS_BILLS = [100000, 50000, 20000, 10000, 5000, 2000];
const DENOMINATIONS_COINS = [1000, 500, 200, 100, 50];

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

interface PanpanochaClosingModalProps {
    onClose: () => void;
    onComplete: (data: ClosingData) => void;
    initialStep?: number;
    readOnly?: boolean;
}

export function PanpanochaClosingModal({ onClose, onComplete, initialStep, readOnly = false }: PanpanochaClosingModalProps) {
    const { currentShift, closingSession, updateClosingSession, branches, currentUser } = usePosStore();
    const session = closingSession.panpanocha;

    const [step, setStep] = useState(initialStep || 1);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [summary, setSummary] = useState<ShiftSummary | null>(null);
    const [printProducts, setPrintProducts] = useState(true);
    const [encargadoAuthorized, setEncargadoAuthorized] = useState(false);

    useEffect(() => {
        loadSummary();
        if (readOnly) {
            setStep(2);
        } else if (initialStep) {
            setStep(initialStep);
        }
    }, [initialStep, readOnly]);

    const loadSummary = async () => {
        if (!currentShift) return;
        try {
            // @ts-ignore
            const data = await window.electron.getShiftSummary(currentShift.id);
            setSummary(data);
        } catch (error) {
            console.error('[PanpanochaClosing] Error loading summary:', error);
        } finally {
            setLoading(false);
        }
    };

    const formatCurrency = (amount: number) => {
        return `$${(amount || 0).toLocaleString('es-CO')}`;
    };

    // Calculate cash count total
    const cashAuditCount = useMemo(() => {
        return [...DENOMINATIONS_BILLS, ...DENOMINATIONS_COINS].reduce((sum, denom) => {
            return sum + (denom * (session.cashCounts[denom] || 0));
        }, 0);
    }, [session.cashCounts]);

    const totalBills = useMemo(() =>
        DENOMINATIONS_BILLS.reduce((sum, d) => sum + (d * (session.cashCounts[d] || 0)), 0),
        [session.cashCounts]
    );

    const totalCoins = useMemo(() =>
        DENOMINATIONS_COINS.reduce((sum, d) => sum + (d * (session.cashCounts[d] || 0)), 0),
        [session.cashCounts]
    );

    // Expected cash calculation
    const expectedCash = useMemo(() => {
        if (!summary || !currentShift) return 0;
        return currentShift.initial_cash + summary.cashSales - summary.totalExpenses;
    }, [summary, currentShift]);

    const difference = cashAuditCount - expectedCash;

    const handleCountChange = (denom: number, val: string) => {
        if (readOnly) return;
        const qty = parseInt(val) || 0;
        const newCounts = { ...session.cashCounts, [denom]: qty };
        updateClosingSession('panpanocha', { cashCounts: newCounts });
    };

    const handleSaveClosing = async () => {
        if (!currentShift || readOnly) return;

        setSaving(true);
        try {
            const cashToDeliver = (summary?.cashSales || 0) - (summary?.totalExpenses || 0);
            const branch = branches.find(b => b.id === currentShift.branch_id);

            // Print closing receipt
            console.log('[PanpanochaClosing] Printing closing receipt...');
            await window.electron.printClosing({
                shift: currentShift,
                branch,
                user: currentUser,
                summary: {
                    totalSales: summary?.totalSales || 0,
                    cashSales: summary?.cashSales || 0,
                    cardSales: summary?.cardSales || 0,
                    transferSales: summary?.transferSales || 0,
                    totalExpenses: summary?.totalExpenses || 0,
                    salesCount: summary?.salesCount || 0,
                },
                cashCount: cashAuditCount,
                cashCounts: session.cashCounts,
                difference,
                cashToDeliver,
                closingType: 'PanPanocha',
                productsSold: printProducts ? summary?.productsSold : undefined
            });

            const closingData: ClosingData = {
                cashToDeliver,
                totalSales: summary?.totalSales || 0,
                difference,
                tips: summary?.totalTips || 0,
                expenses: summary?.totalExpenses || 0,
                finalCash: cashAuditCount,
                baseCash: currentShift.initial_cash,
                cashSales: summary?.cashSales || 0,
                cardSales: summary?.cardSales || 0,
                transferSales: summary?.transferSales || 0
            };

            // Save to Store Persistence
            updateClosingSession('panpanocha', {
                completed: true,
                savedData: closingData
            });

            onComplete(closingData);
        } catch (error) {
            console.error('[PanpanochaClosing] Error:', error);
            alert('Error al guardar el cierre');
        } finally {
            setSaving(false);
        }
    };

    if (loading || saving) {
        return <LoadingOverlay message={saving ? "Guardando cierre..." : "Cargando..."} show={true} />;
    }

    if (!currentShift) return null;

    const handlePrintCopy = async () => {
        if (!currentShift || !summary) return;

        const branch = branches.find(b => b.id === currentShift.branch_id);

        // Use any for printer data to be flexible
        const printData: any = {
            shift: currentShift,
            branch: branch,
            user: currentUser,
            summary: {
                totalSales: summary.totalSales,
                cashSales: summary.cashSales,
                cardSales: summary.cardSales,
                transferSales: summary.transferSales,
                totalExpenses: summary.totalExpenses,
                salesCount: summary.salesCount,
            },
            cashCount: cashAuditCount,
            cashCounts: session.cashCounts,
            difference: difference,
            cashToDeliver: expectedCash + difference,
            closingType: 'PanPanocha',
            productsSold: printProducts ? summary.productsSold : undefined
        };
        try {
            // Send to main process
            await window.electron.printClosing(printData);

            if (printProducts) {
                await window.electron.printOrderDetails(printData);
            }
        } catch (error) {
            console.error('Error printing:', error);
            alert('Error al imprimir copia.');
        }
    };

    return (
        <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[80] flex items-center justify-center p-4"
            onClick={onClose}
        >
            <div
                className="bg-white rounded-[30px] shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="bg-gradient-to-br from-[#D4AF37] to-[#B8960C] p-6 text-white shrink-0">
                    <div className="flex justify-between items-start">
                        <div>
                            <h2 className="text-2xl font-black uppercase tracking-tight leading-none flex items-center gap-2">
                                <Calculator size={24} />
                                {readOnly ? 'Detalle Cierre PanPanocha' : 'Cierre PanPanocha'}
                            </h2>
                            <p className="text-white/80 text-sm mt-1">
                                {readOnly ? 'Modo Lectura' : `Paso ${step} de 2 — ${step === 1 ? 'Arqueo Físico' : 'Confirmar Cierre'}`}
                            </p>
                        </div>
                        <button onClick={onClose} className="text-white/70 hover:text-white transition-colors">
                            <X size={24} />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto flex-1">
                    {loading ? (
                        <div className="flex items-center justify-center h-48">
                            <div className="animate-pulse text-gray-400">Cargando datos del turno...</div>
                        </div>
                    ) : step === 1 ? (
                        <div className="space-y-6">
                            {/* Auto Summary */}
                            <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                                <h4 className="font-bold text-gray-700 text-sm uppercase tracking-wider">
                                    📊 Resumen Automático
                                </h4>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-500">Base Inicial:</span>
                                        <span className="font-bold">{formatCurrency(currentShift.initial_cash)}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-500">Ventas Totales:</span>
                                        <span className="font-bold text-green-600">{formatCurrency(summary?.totalSales || 0)}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-500">└ Efectivo:</span>
                                        <span className="font-medium">{formatCurrency(summary?.cashSales || 0)}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-500">Gastos:</span>
                                        <span className="font-bold text-red-600">-{formatCurrency(summary?.totalExpenses || 0)}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-amber-600 font-medium">💰 Propinas:</span>
                                        <span className="font-bold text-amber-600">{formatCurrency(summary?.totalTips || 0)}</span>
                                    </div>
                                </div>
                                <div className="border-t border-gray-200 pt-3 flex justify-between font-bold">
                                    <span>Efectivo Esperado:</span>
                                    <span className="text-lg">{formatCurrency(expectedCash)}</span>
                                </div>
                            </div>

                            {/* Cash Count */}
                            <div className="space-y-4">
                                <h4 className="font-bold text-gray-700 text-sm uppercase tracking-wider flex items-center gap-2">
                                    🧮 Arqueo Físico
                                </h4>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {/* Bills */}
                                    <div className="space-y-2">
                                        <div className="flex items-center gap-2 mb-2 pb-1 border-b border-[#D4AF37]/20">
                                            <Wallet className="w-4 h-4 text-[#D4AF37]" />
                                            <h5 className="font-bold text-[#D4AF37] text-sm uppercase">Billetes</h5>
                                        </div>
                                        {DENOMINATIONS_BILLS.map(denom => (
                                            <div key={denom} className="grid grid-cols-12 gap-2 items-center">
                                                <div className="col-span-4 font-bold text-gray-700 text-sm">{formatCurrency(denom)}</div>
                                                <div className="col-span-3">
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        disabled={readOnly}
                                                        className="w-full h-8 text-center font-bold border border-gray-200 rounded-lg focus:border-[#D4AF37] outline-none"
                                                        value={session.cashCounts[denom] || ''}
                                                        onChange={e => handleCountChange(denom, e.target.value)}
                                                        placeholder="0"
                                                    />
                                                </div>
                                                <div className="col-span-5 text-right font-mono text-sm text-gray-600">
                                                    {formatCurrency(denom * (session.cashCounts[denom] || 0))}
                                                </div>
                                            </div>
                                        ))}
                                        <div className="bg-gray-100 p-2 rounded flex justify-between items-center font-bold text-sm mt-2">
                                            <span>Total Billetes:</span>
                                            <span>{formatCurrency(totalBills)}</span>
                                        </div>
                                    </div>

                                    {/* Coins */}
                                    <div className="space-y-2">
                                        <div className="flex items-center gap-2 mb-2 pb-1 border-b border-[#D4AF37]/20">
                                            <Coins className="w-4 h-4 text-[#D4AF37]" />
                                            <h5 className="font-bold text-[#D4AF37] text-sm uppercase">Monedas</h5>
                                        </div>
                                        {DENOMINATIONS_COINS.map(denom => (
                                            <div key={denom} className="grid grid-cols-12 gap-2 items-center">
                                                <div className="col-span-4 font-bold text-gray-700 text-sm">{formatCurrency(denom)}</div>
                                                <div className="col-span-3">
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        disabled={readOnly}
                                                        className="w-full h-8 text-center font-bold border border-gray-200 rounded-lg focus:border-[#D4AF37] outline-none"
                                                        value={session.cashCounts[denom] || ''}
                                                        onChange={e => handleCountChange(denom, e.target.value)}
                                                        placeholder="0"
                                                    />
                                                </div>
                                                <div className="col-span-5 text-right font-mono text-sm text-gray-600">
                                                    {formatCurrency(denom * (session.cashCounts[denom] || 0))}
                                                </div>
                                            </div>
                                        ))}
                                        <div className="bg-gray-100 p-2 rounded flex justify-between items-center font-bold text-sm mt-2">
                                            <span>Total Monedas:</span>
                                            <span>{formatCurrency(totalCoins)}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Grand Total */}
                                <div className="bg-[#D4AF37] text-white p-4 rounded-xl flex justify-between items-center shadow-lg">
                                    <div>
                                        <p className="text-xs opacity-80 uppercase tracking-wider font-bold">Total en Caja</p>
                                        <p className="text-xs opacity-60">(Billetes + Monedas)</p>
                                    </div>
                                    <div className="text-3xl font-black">{formatCurrency(cashAuditCount)}</div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        /* Step 2: Confirmation */
                        <div className="animate-in fade-in slide-in-from-right-4 max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8 h-full items-center">

                            {/* Summary Card */}
                            <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-gray-100 h-fit">
                                <div className="bg-gray-50 p-6 border-b border-gray-100">
                                    <h3 className="font-black text-gray-800 text-lg uppercase tracking-tight">Resumen Operativo</h3>
                                    <p className="text-sm text-gray-500">Datos registrados en el sistema</p>
                                </div>
                                <div className="p-6 space-y-4">
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-gray-500">Base Inicial</span>
                                        <span className="font-bold text-gray-800">{formatCurrency(currentShift.initial_cash || 0)}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-gray-500">Ventas Totales</span>
                                        <span className="font-bold text-gray-800">{formatCurrency(summary?.totalSales || 0)}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-sm pl-4 border-l-2 border-green-200">
                                        <span className="text-gray-500">└ Venta en Efectivo</span>
                                        <span className="font-bold text-green-600">{formatCurrency(summary?.cashSales || 0)}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-gray-500">Gastos</span>
                                        <span className="font-bold text-red-600">-{formatCurrency(summary?.totalExpenses || 0)}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-gray-500">Propinas (Informativo)</span>
                                        <span className="font-bold text-amber-600">{formatCurrency(summary?.totalTips || 0)}</span>
                                    </div>

                                    <div className="h-px bg-gray-100 my-2" />

                                    <div className="flex justify-between items-center">
                                        <span className="font-black text-gray-900 uppercase text-sm">Efectivo Esperado</span>
                                        <span className="font-black text-xl text-gray-900">{formatCurrency(expectedCash)}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Result Card */}
                            <div className="space-y-6">
                                <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-gray-100 p-8 text-center relative">
                                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Dinero en Caja</p>
                                    <p className="text-5xl font-black text-gray-900 mb-6">{formatCurrency(cashAuditCount)}</p>

                                    <div className={`p-4 rounded-2xl ${difference === 0 ? 'bg-green-50 text-green-700' : difference > 0 ? 'bg-yellow-50 text-yellow-700' : 'bg-red-50 text-red-700'}`}>
                                        <div className="font-bold text-lg mb-1">
                                            {difference === 0 ? '¡Cuadre Perfecto!' : difference > 0 ? 'Sobrante' : 'Faltante'}
                                        </div>
                                        <div className="text-2xl font-black">
                                            {difference === 0 ? '$0' : formatCurrency(Math.abs(difference))}
                                        </div>
                                    </div>
                                </div>

                                {!readOnly && (
                                    <div className="space-y-3">
                                        <div className="flex items-center gap-3 p-3 bg-blue-50 text-blue-700 rounded-xl border border-blue-100">
                                            <Printer size={20} />
                                            <div>
                                                <p className="font-bold text-sm">Impresión Automática</p>
                                                <p className="text-xs text-blue-600">Se imprimirá el comprobante de cierre al guardar.</p>
                                            </div>
                                        </div>

                                        <button
                                            onClick={() => setPrintProducts(!printProducts)}
                                            className={`w-full rounded-xl p-3 flex items-center gap-3 transition-all border-2 text-left ${printProducts ? 'bg-indigo-50 border-indigo-200' : 'bg-white border-gray-100'}`}
                                        >
                                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${printProducts ? 'bg-indigo-500' : 'bg-gray-100'}`}>
                                                <Package size={20} className={printProducts ? 'text-white' : 'text-gray-400'} />
                                            </div>
                                            <div>
                                                <p className={`font-bold text-sm ${printProducts ? 'text-indigo-800' : 'text-gray-600'}`}>Imprimir Detalle de Productos</p>
                                                <p className={`text-xs ${printProducts ? 'text-indigo-600' : 'text-gray-400'}`}>
                                                    Incluye lista detallada en la impresión
                                                </p>
                                            </div>
                                        </button>
                                    </div>
                                )}

                                {!readOnly && difference !== 0 && !encargadoAuthorized && (
                                    <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-center">
                                        <p className="text-red-800 font-bold text-sm mb-2">⚠️ Diferencia Detectada</p>
                                        <div className="flex gap-2">
                                            <button onClick={() => setStep(1)} className="flex-1 bg-white border border-red-200 text-red-700 font-bold py-2 rounded-lg text-xs hover:bg-red-50 transition-colors">
                                                Recontar
                                            </button>
                                            <button
                                                onClick={() => {
                                                    if (confirm('¿Solicitar autorización al encargado para cerrar con diferencia de ' + formatCurrency(Math.abs(difference)) + '?')) {
                                                        alert('📱 Notificación enviada al encargado (simulado). Autorización concedida.');
                                                        setEncargadoAuthorized(true);
                                                    }
                                                }}
                                                className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-2 rounded-lg text-xs transition-colors"
                                            >
                                                Autorizar
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {!readOnly && difference !== 0 && encargadoAuthorized && (
                                    <div className="bg-orange-50 border border-orange-200 rounded-2xl p-4 flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center text-orange-600">
                                            <Check size={20} />
                                        </div>
                                        <div className="text-left">
                                            <p className="font-bold text-orange-900 text-sm">Descuadre Autorizado</p>
                                            <p className="text-xs text-orange-700">El encargado ha validado la diferencia.</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex gap-3 shrink-0">
                    {readOnly ? (
                        <>
                            <Button
                                onClick={onClose}
                                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold h-12 rounded-xl"
                            >
                                Cerrar Visualización
                            </Button>
                            <Button
                                onClick={handlePrintCopy}
                                className="flex-1 bg-[#D4AF37] hover:bg-[#C19B2D] text-white font-bold h-12 rounded-xl flex items-center justify-center gap-2"
                            >
                                <Printer size={20} /> Imprimir Copia
                            </Button>
                        </>
                    ) : step === 1 ? (
                        <>
                            <Button onClick={onClose} className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold h-12 rounded-xl">
                                Cancelar
                            </Button>
                            <Button
                                onClick={() => setStep(2)}
                                disabled={cashAuditCount <= 0}
                                className="flex-1 bg-[#D4AF37] hover:bg-[#C19B2D] text-white font-bold h-12 rounded-xl flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                                Continuar <ArrowRight size={18} />
                            </Button>
                        </>
                    ) : (
                        <>
                            <Button onClick={() => setStep(1)} className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold h-12 rounded-xl flex items-center justify-center gap-2">
                                <ArrowLeft size={18} /> Volver
                            </Button>
                            <Button
                                onClick={handleSaveClosing}
                                disabled={saving || (difference !== 0 && !encargadoAuthorized)}
                                className={`flex-1 text-white font-bold h-12 rounded-xl flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed ${difference !== 0 && encargadoAuthorized
                                    ? 'bg-orange-500 hover:bg-orange-600'
                                    : difference === 0
                                        ? 'bg-green-600 hover:bg-green-700'
                                        : 'bg-gray-400'
                                    }`}
                            >
                                {saving ? <span className="animate-spin">⏳</span> : <Check size={18} />}
                                {saving ? 'Cerrando...' : difference !== 0 && !encargadoAuthorized ? 'Requiere Autorización' : difference !== 0 && encargadoAuthorized ? 'Cerrar (Autorizado)' : 'Confirmar Cierre'}
                            </Button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
