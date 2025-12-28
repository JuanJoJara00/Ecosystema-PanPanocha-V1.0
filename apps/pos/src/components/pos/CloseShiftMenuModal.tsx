import { useState, useMemo } from 'react';
import { Button } from '@panpanocha/ui';
import { X, DollarSign, Calculator, Check, LogOut, Coins, Lock } from 'lucide-react';
import { usePosStore } from '../../store';
import { PanpanochaClosingModal } from './PanpanochaClosingModal';
import { SiigoClosingModal } from './SiigoClosingModal';
import { TipsDistributionModal } from './TipsDistributionModal';
import { FinalShiftSummaryModal } from './FinalShiftSummaryModal';
import { type ClosingData } from '../../types';

interface CloseShiftMenuModalProps {
    onClose: () => void;
    onLogout: () => void;
}

export function CloseShiftMenuModal({ onClose, onLogout }: CloseShiftMenuModalProps) {
    const { currentShift, closeShift, closingSession, updateClosingSession } = usePosStore();

    // Use completion status from Global Store
    const panpanochaCompleted = closingSession.panpanocha.completed;
    const siigoCompleted = closingSession.siigo.completed;
    const tipsCompleted = closingSession.tips.completed;

    const panpanochaData = closingSession.panpanocha.savedData;
    const siigoData = closingSession.siigo.savedData;

    // Which modal is open
    const [showPanpanocha, setShowPanpanocha] = useState(false);
    const [showSiigo, setShowSiigo] = useState(false);
    const [showTips, setShowTips] = useState(false);
    const [showFinalSummary, setShowFinalSummary] = useState(false);

    // Final closing state
    const [finalizing, setFinalizing] = useState(false);

    const bothClosingsCompleted = panpanochaCompleted && siigoCompleted;
    const tipsUnlocked = bothClosingsCompleted;
    const allStepsCompleted = panpanochaCompleted && siigoCompleted && tipsCompleted;

    const totalCashToDeliver = useMemo(() => {
        const tipsDelivered = closingSession.tips.distributions?.deliveredAmount || 0;
        return ((panpanochaData?.cashToDeliver || 0) + (siigoData?.cashToDeliver || 0)) - tipsDelivered;
    }, [panpanochaData, siigoData, closingSession.tips.distributions]);

    const formatCurrency = (amount: number) => {
        return `$${(amount || 0).toLocaleString('es-CO')}`;
    };

    const handlePanpanochaComplete = (data: ClosingData) => {
        // Store update is handled inside the modal now
        setShowPanpanocha(false);
    };

    const handleSiigoComplete = (data: ClosingData) => {
        // Store update is handled inside the modal now
        setShowSiigo(false);
    };

    const handleTipsComplete = (deliveredAmount: number, transferredAmount: number) => {
        updateClosingSession('tips', {
            completed: true,
            distributions: { deliveredAmount, transferredAmount }
        });
        setShowTips(false);
    };

    const handleFinalizeClick = () => {
        setShowFinalSummary(true);
    };

    const handleConfirmedFinalize = async () => {
        if (!currentShift) return;

        setFinalizing(true);
        try {
            // Close the shift in database
            await closeShift(totalCashToDeliver);

            // Logout and go to login screen
            onLogout();
        } catch (error) {
            console.error('[CloseShift] Error finalizing:', error);
            alert('Error al finalizar cierre');
        } finally {
            setFinalizing(false);
        }
    };

    // If a sub-modal is open, render it instead
    if (showFinalSummary) {
        return (
            <FinalShiftSummaryModal
                onClose={() => setShowFinalSummary(false)}
                onIdentify={handleConfirmedFinalize}
            />
        );
    }

    if (showPanpanocha) {
        return (
            <PanpanochaClosingModal
                onClose={() => setShowPanpanocha(false)}
                onComplete={handlePanpanochaComplete}
                readOnly={panpanochaCompleted}
                initialStep={panpanochaCompleted ? 2 : 1} // Review directly to Confirmation/Result
            />
        );
    }

    if (showSiigo) {
        return (
            <SiigoClosingModal
                onClose={() => setShowSiigo(false)}
                onComplete={handleSiigoComplete}
                readOnly={siigoCompleted}
                initialStep={siigoCompleted ? 3 : 1} // Review directly to Summary
            />
        );
    }

    if (showTips) {
        // Calculate tips from both sources
        const panpanochaTips = panpanochaData?.tips || 0;
        const siigoTips = siigoData?.tips || 0;
        const shiftTips = panpanochaTips + siigoTips;
        const pendingTips = 0; // TODO: Get from shift.pending_tips when available

        return (
            <TipsDistributionModal
                onClose={() => setShowTips(false)}
                onComplete={handleTipsComplete}
                shiftTips={shiftTips}
                pendingTips={pendingTips}
            />
        );
    }

    return (
        <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[70] flex items-center justify-center p-4"
            onClick={onClose}
        >
            <div
                className="bg-white rounded-[30px] shadow-2xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="bg-gradient-to-br from-[#D4AF37] to-[#B8960C] p-6 text-white">
                    <div className="flex justify-between items-start">
                        <div>
                            <h2 className="text-2xl font-black uppercase tracking-tight leading-none">
                                Cerrar Turno
                            </h2>
                            <p className="text-white/80 text-sm mt-1">
                                {allStepsCompleted
                                    ? '¡Todos los pasos completados!'
                                    : 'Completa los 3 pasos para finalizar'
                                }
                            </p>
                        </div>
                        <button
                            onClick={onClose}
                            className="text-white/70 hover:text-white transition-colors"
                        >
                            <X size={24} />
                        </button>
                    </div>

                    {/* Progress indicator - 3 steps */}
                    <div className="flex gap-2 mt-4">
                        <div className={`flex-1 h-2 rounded-full transition-colors ${panpanochaCompleted ? 'bg-green-400' : 'bg-white/30'}`} />
                        <div className={`flex-1 h-2 rounded-full transition-colors ${siigoCompleted ? 'bg-green-400' : 'bg-white/30'}`} />
                        <div className={`flex-1 h-2 rounded-full transition-colors ${tipsCompleted ? 'bg-green-400' : 'bg-white/30'}`} />
                    </div>
                </div>

                {/* Options */}
                <div className="p-6 space-y-4">

                    {/* Cierre PanPanocha */}
                    <button
                        onClick={() => setShowPanpanocha(true)}
                        className={`w-full p-5 rounded-2xl border-2 transition-all group text-left ${panpanochaCompleted
                            ? 'border-green-300 bg-green-50 hover:bg-green-100 hover:border-green-400 shadow-sm'
                            : 'border-[#D4AF37]/30 bg-gradient-to-br from-[#D4AF37]/5 to-[#D4AF37]/10 hover:border-[#D4AF37] hover:shadow-lg hover:shadow-[#D4AF37]/20'
                            }`}
                    >
                        <div className="flex items-start gap-4">
                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-md transition-transform ${panpanochaCompleted
                                ? 'bg-green-500'
                                : 'bg-[#D4AF37] group-hover:scale-110'
                                }`}>
                                {panpanochaCompleted ? (
                                    <Check size={24} className="text-white" />
                                ) : (
                                    <DollarSign size={24} className="text-white" />
                                )}
                            </div>
                            <div className="flex-1">
                                <div className="flex items-center gap-2">
                                    <h3 className="text-lg font-black text-gray-900 uppercase tracking-tight">
                                        Cierre PanPanocha
                                    </h3>
                                    {panpanochaCompleted && (
                                        <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-700">
                                            ✓ Completado
                                        </span>
                                    )}
                                </div>
                                {panpanochaCompleted && panpanochaData ? (
                                    <div className="mt-1">
                                        <p className="text-sm text-green-600 font-medium">
                                            A entregar: {formatCurrency(panpanochaData.cashToDeliver)}
                                        </p>
                                        <p className="text-xs text-green-500">Clic para ver detalles</p>
                                    </div>
                                ) : (
                                    <p className="text-sm text-gray-500 mt-1">
                                        Datos automáticos del POS. Solo ingresa el arqueo físico.
                                    </p>
                                )}
                                {!panpanochaCompleted && (
                                    <div className="flex items-center gap-2 mt-2">
                                        <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-green-100 text-green-700">
                                            Recomendado
                                        </span>
                                        <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                                            Auto-Imprime
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </button>

                    {/* Cierre Siigo */}
                    <button
                        onClick={() => setShowSiigo(true)}
                        className={`w-full p-5 rounded-2xl border-2 transition-all group text-left ${siigoCompleted
                            ? 'border-green-300 bg-green-50 hover:bg-green-100 hover:border-green-400 shadow-sm'
                            : 'border-gray-200 bg-white hover:border-indigo-400 hover:shadow-lg'
                            }`}
                    >
                        <div className="flex items-start gap-4">
                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-md transition-transform ${siigoCompleted
                                ? 'bg-green-500'
                                : 'bg-indigo-500 text-white group-hover:scale-110'
                                }`}>
                                {siigoCompleted ? (
                                    <Check size={24} className="text-white" />
                                ) : (
                                    <Calculator size={24} className="text-white" />
                                )}
                            </div>
                            <div className="flex-1">
                                <div className="flex items-center gap-2">
                                    <h3 className="text-lg font-black text-gray-900 uppercase tracking-tight">
                                        Cierre Siigo
                                    </h3>
                                    {siigoCompleted && (
                                        <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-700">
                                            ✓ Completado
                                        </span>
                                    )}
                                </div>
                                {siigoCompleted ? (
                                    <div className="mt-1">
                                        <p className="text-sm text-green-600 font-medium">
                                            A entregar: {formatCurrency(siigoData?.cashToDeliver || 0)}
                                        </p>
                                        <p className="text-xs text-green-500">Clic para ver detalles</p>
                                    </div>
                                ) : (
                                    <p className="text-sm text-gray-500 mt-1">
                                        Ingresa los datos del POS Siigo manualmente.
                                    </p>
                                )}
                                {!siigoCompleted && (
                                    <div className="flex items-center gap-2 mt-2">
                                        <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                                            Manual
                                        </span>
                                        <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600">
                                            3 Pasos
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </button>

                    {/* Propinas - BLOQUEADO HASTA COMPLETAR LOS CIERRES */}
                    <button
                        onClick={() => tipsUnlocked && setShowTips(true)}
                        disabled={!tipsUnlocked}
                        className={`w-full p-5 rounded-2xl border-2 transition-all group text-left ${!tipsUnlocked
                            ? 'border-gray-100 bg-gray-50 opacity-60 cursor-not-allowed'
                            : tipsCompleted
                                ? 'border-green-300 bg-green-50 hover:bg-green-100'
                                : 'border-amber-200 bg-amber-50 hover:border-amber-400 hover:shadow-lg'
                            }`}
                    >
                        <div className="flex items-start gap-4">
                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-md transition-transform ${!tipsUnlocked
                                ? 'bg-gray-300'
                                : tipsCompleted
                                    ? 'bg-green-500'
                                    : 'bg-amber-500 group-hover:scale-110'
                                }`}>
                                {!tipsUnlocked ? (
                                    <Lock size={20} className="text-white" />
                                ) : tipsCompleted ? (
                                    <Check size={24} className="text-white" />
                                ) : (
                                    <Coins size={24} className="text-white" />
                                )}
                            </div>
                            <div className="flex-1">
                                <div className="flex items-center gap-2">
                                    <h3 className="text-lg font-black text-gray-900 uppercase tracking-tight">
                                        Propinas
                                    </h3>
                                    {!tipsUnlocked && (
                                        <span className="text-xs font-bold text-gray-400 flex items-center gap-1">
                                            <Lock size={10} /> Bloqueado
                                        </span>
                                    )}
                                    {tipsCompleted && (
                                        <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-700">
                                            ✓ Distribuido
                                        </span>
                                    )}
                                </div>
                                <p className="text-sm text-gray-500 mt-1">
                                    {tipsCompleted
                                        ? 'Distribución realizada correctamente.'
                                        : tipsUnlocked
                                            ? 'Completa la distribución de propinas.'
                                            : 'Completa los cierres primero para desbloquear.'
                                    }
                                </p>
                            </div>
                        </div>
                    </button>
                </div>

                {/* Footer Final Action */}
                <div className="px-6 py-4 border-t border-gray-100 bg-gray-50">
                    <Button
                        onClick={handleFinalizeClick}
                        disabled={!allStepsCompleted || finalizing}
                        className={`w-full h-14 text-lg font-black rounded-xl shadow-lg transition-all ${allStepsCompleted
                            ? 'bg-red-600 hover:bg-red-700 text-white hover:scale-[1.02]'
                            : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                            }`}
                    >
                        {finalizing ? (
                            <span className="flex items-center gap-2 justify-center">
                                <span className="animate-spin text-2xl">⏳</span> Finalizando...
                            </span>
                        ) : (
                            <span className="flex items-center gap-2 justify-center">
                                <LogOut size={24} /> FINALIZAR TURNO
                            </span>
                        )}
                    </Button>
                </div>
            </div>
        </div>
    );
}
