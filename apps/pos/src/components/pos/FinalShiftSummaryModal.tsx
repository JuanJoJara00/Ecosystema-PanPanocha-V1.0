import { useState } from 'react';
import { Button } from '@panpanocha/ui';
import { usePosStore } from '../../store';
import { X, Printer, FileText } from 'lucide-react';
import { formatCurrency } from '@panpanocha/shared';

interface FinalShiftSummaryModalProps {
    onClose: () => void;
    onIdentify: () => void; // Proceed to identification/logout
}

export function FinalShiftSummaryModal({ onClose, onIdentify }: FinalShiftSummaryModalProps) {
    const { currentShift, closingSession, currentUser } = usePosStore();
    const [printing, setPrinting] = useState(false);

    // Get datas
    const ppData = closingSession.panpanocha.savedData;
    const siigoData = closingSession.siigo.savedData;
    const tipsData = closingSession.tips.distributions;

    // Aggregations
    // Use initialCash (standard) or fallback to legacy property if existing
    const ppBase = ppData?.initialCash ?? ppData?.['initial_cash'] ?? ppData?.baseCash ?? ppData?.['base_cash'] ?? 0;
    const siigoBase = siigoData?.initialCash ?? siigoData?.['initial_cash'] ?? siigoData?.baseCash ?? siigoData?.['base_cash'] ?? 0;
    const totalBase = ppBase + siigoBase;

    const ppSalesCash = ppData?.cashSales ?? ppData?.['sales_cash'] ?? 0;
    const siigoSalesCash = siigoData?.cashSales ?? siigoData?.['sales_cash'] ?? 0;
    const totalCashSales = ppSalesCash + siigoSalesCash;

    const ppSalesCard = ppData?.cardSales ?? ppData?.['sales_card'] ?? 0;
    const siigoSalesCard = siigoData?.cardSales ?? siigoData?.['sales_card'] ?? 0;
    const totalCard = ppSalesCard + siigoSalesCard;

    const ppSalesTransfer = ppData?.transferSales ?? ppData?.['sales_transfer'] ?? 0;
    const siigoSalesTransfer = siigoData?.transferSales ?? siigoData?.['sales_transfer'] ?? 0;
    const totalTransfer = ppSalesTransfer + siigoSalesTransfer;

    // Expenses might be inside 'expenses' prop or we need to check how it was saved.
    // In SiigoClosingModal we saved 'expenses' property?
    // Let's check SiigoClosingModal again. We passed 'expenses: session.expensesList' to printer, but savedData?
    // In SiigoClosingModal:
    // const savedData: ClosingData = { ..., totalSales, ... };
    // It does NOT save 'expenses' array in savedData explicitly in my recent edit?
    // Wait, SiigoClosingModal logic:
    // const cashToDeliver = session.formData.sales_cash - totalExpenses;
    // savedData includes totalSales, difference, tips, finalCash.
    // It DOES NOT seem to save 'expenses' count or total in savedData except implicitly if I added it?
    // I did NOT add 'expenses' total to savedData in SiigoClosingModal.
    // I need to fix SiigoClosingModal and PanpanochaClosingModal to save 'expenses' total in savedData.
    // FinancialSummary interface has 'expenses' (number).
    // So I should save 'expenses: totalExpenses' in savedData.

    // Let's hold on this replacement and fix the saving logic first.

    const ppExpenses = ppData?.expenses || 0;
    const siigoExpenses = siigoData?.expenses || 0;
    const totalOperationalExpenses = ppExpenses + siigoExpenses;

    const tipsDelivered = tipsData?.deliveredAmount || 0;

    // Calculated Expected
    // Expected = Base + CashSales - OperationalExpenses - TipsDelivered
    const expectedCash = totalBase + totalCashSales - totalOperationalExpenses - tipsDelivered;

    // Real Cash
    const ppReal = ppData?.finalCash || 0;
    const siigoReal = siigoData?.finalCash || 0;
    const totalRealCash = ppReal + siigoReal;

    const difference = totalRealCash - expectedCash;

    const cashToDeliver = (ppReal - ppBase) + (siigoReal - siigoBase);

    const handleConfirm = async () => {
        setPrinting(true);
        // ...
    };

    // ...

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">
                <div className="flex justify-between items-center p-6 border-b">
                    <h2 className="text-2xl font-black text-gray-900">Resumen y Cierre Final</h2>
                    <Button variant="ghost" size="icon" onClick={onClose}><X /></Button>
                </div>

                <div className="p-6 space-y-8 overflow-y-auto">
                    {/* Big Total */}
                    <div className={`border-2 rounded-2xl p-6 text-center ${cashToDeliver >= 0 ? 'bg-green-50 border-green-100' : 'bg-red-50 border-red-100'}`}>
                        <p className="text-gray-500 font-bold uppercase tracking-wider text-sm mb-1">Total Efectivo a Entregar</p>
                        <p className={`text-5xl font-black ${cashToDeliver >= 0 ? 'text-green-600' : 'text-red-600'}`}>{formatCurrency(cashToDeliver)}</p>
                        <p className={`text-xs mt-2 font-medium ${cashToDeliver >= 0 ? 'text-green-500' : 'text-red-400'}`}>
                            (Real PanPanocha - Base) + (Real Siigo - Base)
                        </p>
                    </div>

                    {/* Breakdown Grid */}
                    <div className="grid grid-cols-2 gap-8">
                        <div className="space-y-3">
                            <h3 className="font-bold text-gray-900 border-b pb-2">Entradas (Efectivo)</h3>
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-600">Base Inicial Total:</span>
                                <span className="font-medium">{formatCurrency(totalBase)}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-600">Ventas Efectivo:</span>
                                <span className="font-medium">{formatCurrency(totalCashSales)}</span>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <h3 className="font-bold text-gray-900 border-b pb-2">Salidas (Efectivo)</h3>
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-600">Gastos Operativos:</span>
                                <span className="font-medium text-red-600">-{formatCurrency(totalOperationalExpenses)}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-600">Propinas Entregadas:</span>
                                <span className="font-medium text-red-600">-{formatCurrency(tipsDelivered)}</span>
                            </div>
                        </div>
                    </div>

                    <div className="border-t pt-4">
                        <div className="flex justify-between items-center mb-1">
                            <span className="font-bold text-gray-700">Efectivo Esperado:</span>
                            <span className="font-bold text-gray-900">{formatCurrency(expectedCash)}</span>
                        </div>
                        <div className="flex justify-between items-center mb-1">
                            <span className="font-bold text-gray-700">Efectivo Real (Sumado):</span>
                            <span className="font-bold text-blue-700">{formatCurrency(totalRealCash)}</span>
                        </div>
                        <div className="flex justify-between items-center mt-3 pt-3 border-t border-dashed">
                            <span className="font-bold text-gray-700">Cuadre General:</span>
                            <span className={`font-black text-lg ${difference >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {formatCurrency(difference)} {difference !== 0 && (difference > 0 ? '(Sobra)' : '(Falta)')}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="bg-gray-50 p-6 flex gap-4 border-t">
                    <Button
                        onClick={onClose}
                        variant="ghost"
                        className="flex-1 h-14 text-base"
                    >
                        Cancelar
                    </Button>
                    <Button
                        onClick={handleConfirm}
                        className="flex-[2] h-14 text-lg font-bold bg-gray-900 hover:bg-black text-white shadow-xl"
                    >
                        {printing ? (
                            <span className="flex items-center gap-2">
                                <span className="animate-spin">⏳</span> Imprimiendo...
                            </span>
                        ) : (
                            <span className="flex items-center gap-2">
                                <FileText size={20} /> IMPRIMIR Y FINALIZAR
                            </span>
                        )}
                    </Button>
                </div>
            </div>
        </div>
    );
}
