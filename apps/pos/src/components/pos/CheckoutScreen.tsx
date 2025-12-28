import { useState, useEffect } from "react"
import { X, Delete, Star, Heart, Percent, ShoppingBag, Edit2 } from "lucide-react"
import { Button } from "@panpanocha/ui"
import { formatCurrency } from '@panpanocha/shared';
import { usePosStore } from '../../store';
import type { CartItem, Client } from '../../types';

interface CheckoutScreenProps {
    items: CartItem[];
    total: number
    tableName?: string
    client?: Client | null
    onComplete: (data: { total: number; received: number; change: number; tipAmount?: number; discountAmount?: number; pointsRedeemed?: number; diners?: number }) => void
    onCancel: () => void
}

type ActiveField = 'received' | 'customTip' | 'customDiscount';

const POINT_VALUE_COP = 10; // 1 Point = $10 COP

export default function CheckoutScreen({ items, total, tableName, client, onComplete, onCancel }: CheckoutScreenProps) {
    const { tableSessions, activeTableId } = usePosStore();
    const [activeField, setActiveField] = useState<ActiveField>('received');

    // Values as strings
    const [receivedStr, setReceivedStr] = useState('0');
    const [customTipStr, setCustomTipStr] = useState('0');
    const [customDiscountStr, setCustomDiscountStr] = useState('0');

    // Points State
    const [usePoints, setUsePoints] = useState(false);

    const [alertMessage, setAlertMessage] = useState<string | null>(null);

    // Tips State
    const [tipType, setTipType] = useState<'none' | '10' | 'custom'>('none');
    // Mandatory Tip Effect for Large Groups (>6 diners)
    useEffect(() => {
        if (activeTableId && tableSessions[activeTableId]) {
            const session = tableSessions[activeTableId];
            const dinersCount = typeof session.diners === 'string'
                ? parseInt(session.diners, 10)
                : session.diners;

            if (dinersCount > 6) {
                setTipType('10');
            }
        }
    }, [activeTableId, tableSessions]);
    const [customTipMode, setCustomTipMode] = useState<'amount' | 'percent'>('amount'); // NEW: Toggle state

    // Discounts State
    const [discountType, setDiscountType] = useState<'none' | '10' | '30' | '50' | '100' | 'custom'>('none');
    const [customDiscountMode, setCustomDiscountMode] = useState<'amount' | 'percent'>('percent'); // NEW: Default to percent

    // --- Calculations ---

    // 1. Discount
    const discountAmount =
        discountType === '10' ? Math.round(total * 0.1) :
            discountType === '30' ? Math.round(total * 0.3) :
                discountType === '50' ? Math.round(total * 0.5) :
                    discountType === '100' ? total :
                        discountType === 'custom' ? (
                            customDiscountMode === 'amount'
                                ? (parseInt(customDiscountStr) || 0)
                                : Math.round(total * ((parseInt(customDiscountStr) || 0) / 100))
                        ) : 0;

    const subtotalAfterDiscount = Math.max(0, total - discountAmount);

    // 2. Tip
    const tipAmount =
        tipType === '10' ? Math.round(subtotalAfterDiscount * 0.1) :
            tipType === 'custom' ? (
                customTipMode === 'amount'
                    ? (parseInt(customTipStr) || 0)
                    : Math.round(subtotalAfterDiscount * ((parseInt(customTipStr) || 0) / 100))
            ) : 0;

    // 3. Points Redemption (Reduces the cash needed)
    const maxPointsValue = (client?.points || 0) * POINT_VALUE_COP;
    // We can only redeem up to the total amount (minus tips? usually points cover bill, not tips. Let's cover subtotalAfterDiscount)
    const pointsValue = usePoints ? Math.min(maxPointsValue, subtotalAfterDiscount) : 0;
    const pointsRedeemed = usePoints ? Math.ceil(pointsValue / POINT_VALUE_COP) : 0;

    // 4. Final Cash Needed
    // Total Invoice Value = subtotalAfterDiscount + tipAmount
    // Amount User Must Pay in Cash = (subtotal - points) + tip
    const finalTotal = subtotalAfterDiscount + tipAmount; // The invoice total stays the same
    const cashNeeded = Math.max(0, finalTotal - pointsValue);

    const receivedAmount = parseInt(receivedStr) || 0;
    const change = Math.max(0, receivedAmount - cashNeeded);

    // Denominaciones colombianas
    const denominations = [
        { value: 100000, label: '$100k', type: 'billete' },
        { value: 50000, label: '$50k', type: 'billete' },
        { value: 20000, label: '$20k', type: 'billete' },
        { value: 10000, label: '$10k', type: 'billete' },
        { value: 5000, label: '$5k', type: 'billete' },
        { value: 2000, label: '$2k', type: 'billete' },
        { value: 1000, label: '$1k', type: 'moneda' },
        { value: 500, label: '$500', type: 'moneda' },
        { value: 200, label: '$200', type: 'moneda' },
        { value: 100, label: '$100', type: 'moneda' },
        { value: 50, label: '$50', type: 'moneda' },
    ]

    // Keypad Logic
    const handleNumberClick = (num: string) => {
        setAlertMessage(null);
        if (activeField === 'received') {
            setReceivedStr(prev => (prev === '0' ? num : prev + num));
        } else if (activeField === 'customTip') {
            setCustomTipStr(prev => {
                const newVal = prev === '0' ? num : prev + num;
                // If in percent mode, cap at 100
                if (customTipMode === 'percent' && parseInt(newVal) > 100) return '100';
                return newVal;
            });
        } else if (activeField === 'customDiscount') {
            setCustomDiscountStr(prev => {
                const newVal = prev === '0' ? num : prev + num;
                // Cap at 100 ONLY if in percent mode
                if (customDiscountMode === 'percent' && parseInt(newVal) > 100) return '100';
                return newVal;
            });
        }
    }

    const handleBackspace = () => {
        setAlertMessage(null);
        if (activeField === 'received') setReceivedStr(prev => prev.length > 1 ? prev.slice(0, -1) : '0');
        else if (activeField === 'customTip') setCustomTipStr(prev => prev.length > 1 ? prev.slice(0, -1) : '0');
        else if (activeField === 'customDiscount') setCustomDiscountStr(prev => prev.length > 1 ? prev.slice(0, -1) : '0');
    }

    const handleClear = () => {
        setAlertMessage(null);
        if (activeField === 'received') setReceivedStr('0');
        else if (activeField === 'customTip') setCustomTipStr('0');
        else if (activeField === 'customDiscount') setCustomDiscountStr('0');
    }

    const handleDenomination = (value: number) => {
        if (activeField === 'received') {
            const current = parseInt(receivedStr) || 0;
            setReceivedStr((current + value).toString());
        } else if (activeField === 'customTip') {
            // Tips usually additive
            const current = parseInt(customTipStr) || 0;
            setCustomTipStr((current + value).toString());
        } else if (activeField === 'customDiscount') {
            // Discounts also additive
            const current = parseInt(customDiscountStr) || 0;
            setCustomDiscountStr((current + value).toString());
        }
    }

    const handleExact = () => {
        setReceivedStr(cashNeeded.toString());
        setActiveField('received');
        setAlertMessage(null);
    }

    const handleCheckout = () => {
        if (receivedAmount < cashNeeded) {
            setAlertMessage(`Faltan ${formatCurrency(cashNeeded - receivedAmount)}`);
            return;
        }

        const diners = (activeTableId && tableSessions[activeTableId])
            ? (typeof tableSessions[activeTableId].diners === 'string' ? parseInt(tableSessions[activeTableId].diners as string) : tableSessions[activeTableId].diners)
            : 0;

        onComplete({
            total: finalTotal,
            received: receivedAmount,
            change,
            tipAmount,
            discountAmount,
            pointsRedeemed,
            diners
        })
    }

    // Helper to set tip mode
    const selectTip = (type: typeof tipType) => {
        setTipType(type);
        if (type === 'custom') {
            setActiveField('customTip');
            setCustomTipStr('0');
        } else {
            setActiveField('received'); // Switch back to received implicitly
        }
    }

    // Helper to set discount mode
    const selectDiscount = (type: typeof discountType) => {
        setDiscountType(type);
        if (type === 'custom') {
            setActiveField('customDiscount');
            setCustomDiscountStr('0');
        } else {
            setActiveField('received');
        }
    }

    const togglePoints = () => {
        if (!client) return;
        if (client.points <= 0) {
            setAlertMessage("El cliente no tiene puntos");
            return;
        }
        setUsePoints(!usePoints);
    }

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[95vh] overflow-hidden flex flex-col h-full border border-white/10">

                {/* Header */}
                <div className="bg-pp-brown p-5 flex justify-between items-center shrink-0 shadow-lg z-10">
                    <div className="text-white">
                        <h2 className="text-xl font-bold font-display tracking-wide opacity-90">COBRAR VENTA</h2>
                        <div className="flex items-center gap-2 mt-1">
                            {tableName && <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-pp-gold text-pp-brown">{tableName}</span>}
                            <span className="text-xs text-white/50">ID: #ORD-2024</span>
                            {client && <span className="text-xs text-white/70 ml-2">| {client.full_name}</span>}
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        {/* Points Button */}
                        <button
                            onClick={togglePoints}
                            disabled={!client || client.points === 0}
                            className={`px-3 py-2 rounded-lg flex items-center gap-2 transition-all border border-white/5 group relative overflow-hidden ${usePoints ? 'bg-pp-gold text-pp-brown shadow-lg ring-2 ring-white/20' : 'bg-white/5 hover:bg-white/10 text-orange-200'}`}
                        >
                            <Star className={`transition-transform ${usePoints ? 'fill-pp-brown text-pp-brown scale-110' : 'fill-current text-orange-400 group-hover:scale-110'}`} size={16} />
                            <div className="text-left leading-none relative z-10">
                                <p className={`text-[9px] font-bold uppercase ${usePoints ? 'opacity-80' : 'opacity-60'}`}>
                                    {usePoints ? 'Usando Puntos' : 'Mis Puntos'}
                                </p>
                                <p className="text-xs font-bold">{client?.points || 0} pts</p>
                            </div>
                            {usePoints && <div className="absolute inset-0 bg-white/20 animate-pulse" />}
                        </button>

                        <div className="bg-white text-pp-brown rounded-lg px-5 py-2 shadow-xl border-4 border-pp-brown-light/20 min-w-[200px] text-right">
                            <p className="text-[10px] font-black uppercase tracking-widest opacity-40">Total a Pagar</p>
                            <p className="text-3xl font-black font-mono tracking-tighter leading-none">{formatCurrency(cashNeeded)}</p>
                            {usePoints && <p className="text-[10px] text-green-600 font-bold line-through opacity-60">{formatCurrency(finalTotal)}</p>}
                        </div>
                    </div>

                    <Button
                        variant="ghost"
                        onClick={onCancel}
                        className="text-white/40 hover:text-white hover:bg-white/10 rounded-full h-10 w-10 p-0"
                    >
                        <X className="h-6 w-6" />
                    </Button>
                </div>

                <div className="flex-1 flex overflow-hidden">
                    {/* Left Panel: Options (Tips & Discounts) */}
                    <div className="w-[250px] bg-gray-50 border-r border-gray-200 p-4 flex flex-col gap-4 overflow-y-auto shrink-0">

                        <div className="space-y-3">
                            <div className="flex items-center gap-2 text-gray-400 font-bold text-xs uppercase tracking-wider">
                                <Heart size={14} className="text-pink-400 fill-pink-400" />
                                Propina Voluntaria
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <button
                                    onClick={() => selectTip('none')}
                                    className={`h-12 rounded-xl font-bold text-xs transition-all border-2 ${tipType === 'none' ? 'bg-white border-gray-300 text-gray-800 shadow-sm ring-1 ring-black/5' : 'bg-white/50 border-transparent text-gray-400 hover:bg-white'}`}
                                >
                                    Ninguna
                                </button>
                                <button
                                    onClick={() => selectTip('10')}
                                    className={`h-12 rounded-xl font-bold text-xs transition-all border-2 flex flex-col items-center justify-center leading-none gap-1 ${tipType === '10' ? 'bg-pink-50 border-pink-300 text-pink-700 shadow-sm' : 'bg-white border-gray-200 text-gray-500 hover:border-pink-200 hover:text-pink-500'}`}
                                >
                                    <span>10% Sugerido</span>
                                    <span className="text-[10px] opacity-70 font-mono">
                                        {formatCurrency(Math.round(subtotalAfterDiscount * 0.1))}
                                    </span>
                                </button>
                                <div className={`col-span-2 h-12 rounded-xl font-bold text-xs transition-all border-2 flex justify-between items-center px-2 relative overflow-hidden ${tipType === 'custom' ? 'bg-pink-50 border-pink-400 text-pink-700 shadow-inner ring-2 ring-pink-100' : 'bg-white border-gray-200 text-gray-500 hover:border-pink-200'}`}>

                                    {/* Main Selector for Custom Tip */}
                                    <div
                                        className="absolute inset-0 z-0 cursor-pointer"
                                        onClick={() => selectTip('custom')}
                                    />

                                    {/* Mode Toggle (Only visible and active when 'custom' is selected) */}
                                    <div className={`relative z-10 flex bg-white/50 rounded-lg p-1 gap-1 transition-opacity ${tipType === 'custom' ? 'opacity-100' : 'opacity-50 pointer-events-none'}`}>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); setCustomTipMode('percent'); }}
                                            className={`px-2 py-1 rounded-md text-[10px] font-bold transition-all ${customTipMode === 'percent' ? 'bg-pink-500 text-white shadow-sm' : 'text-gray-500 hover:bg-black/5'}`}
                                        >
                                            %
                                        </button>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); setCustomTipMode('amount'); }}
                                            className={`px-2 py-1 rounded-md text-[10px] font-bold transition-all ${customTipMode === 'amount' ? 'bg-pink-500 text-white shadow-sm' : 'text-gray-500 hover:bg-black/5'}`}
                                        >
                                            $
                                        </button>
                                    </div>

                                    <div className="relative z-0 flex items-center gap-2 pr-2 pointer-events-none">
                                        {tipType === 'custom' && tipAmount > 0 && <span className="text-pink-600 font-bold">{formatCurrency(tipAmount)}</span>}
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${tipType === 'custom' ? 'bg-pink-200/50 text-pink-600' : 'bg-gray-100 text-gray-400'}`}>
                                            <Edit2 size={14} />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="h-px bg-gray-200" />

                        {/* 2. Descuentos */}
                        <div className="space-y-4">
                            <div className="flex items-center gap-2 text-gray-400 font-bold text-xs uppercase tracking-wider">
                                <Percent size={14} className="text-blue-400" />
                                Descuentos
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    onClick={() => selectDiscount('none')}
                                    className={`h-12 rounded-xl font-bold text-xs transition-all border-2 ${discountType === 'none' ? 'bg-white border-gray-300 text-gray-800 shadow-sm' : 'bg-white/50 border-transparent text-gray-400 hover:bg-white'}`}
                                >
                                    Sin Descuento
                                </button>
                                <button
                                    onClick={() => selectDiscount('10')}
                                    className={`h-12 rounded-xl font-bold text-xs transition-all border-2 ${discountType === '10' ? 'bg-blue-50 border-blue-300 text-blue-700 shadow-sm' : 'bg-white border-gray-200 text-gray-500 hover:border-blue-200 hover:text-blue-500'}`}
                                >
                                    10% General
                                </button>
                                <button
                                    onClick={() => { setDiscountType('30'); setActiveField('received'); }}
                                    className={`h-12 rounded-xl font-bold text-xs transition-all border-2 ${discountType === '30' ? 'bg-blue-50 border-blue-400 text-blue-700 shadow-inner' : 'bg-white border-gray-200 text-gray-500 hover:border-blue-200'}`}
                                >
                                    30% Empleado
                                </button>
                                <button
                                    onClick={() => { setDiscountType('50'); setActiveField('received'); }}
                                    className={`h-12 rounded-xl font-bold text-xs transition-all border-2 ${discountType === '50' ? 'bg-blue-50 border-blue-400 text-blue-700 shadow-inner' : 'bg-white border-gray-200 text-gray-500 hover:border-blue-200'}`}
                                >
                                    50%
                                </button>

                                {/* Custom Discount Toggle */}
                                <div className={`col-span-2 h-12 rounded-xl font-bold text-xs transition-all border-2 flex justify-between items-center px-2 relative overflow-hidden ${discountType === 'custom' ? 'bg-blue-50 border-blue-400 text-blue-700 shadow-inner ring-2 ring-blue-100' : 'bg-white border-gray-200 text-gray-500 hover:border-blue-200'}`}>

                                    {/* Main Selector */}
                                    <div
                                        className="absolute inset-0 z-0 cursor-pointer"
                                        onClick={() => { setDiscountType('custom'); setActiveField('customDiscount'); }}
                                    />

                                    {/* Mode Toggle */}
                                    <div className={`relative z-10 flex bg-white/50 rounded-lg p-1 gap-1 transition-opacity ${discountType === 'custom' ? 'opacity-100' : 'opacity-50 pointer-events-none'}`}>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); setCustomDiscountMode('amount'); setDiscountType('custom'); setActiveField('customDiscount'); }}
                                            className={`px-2 py-1 rounded-md text-[10px] uppercase font-black transition-all ${customDiscountMode === 'amount' ? 'bg-blue-500 text-white shadow-sm' : 'text-gray-400 hover:bg-black/5'}`}
                                        >
                                            $
                                        </button>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); setCustomDiscountMode('percent'); setDiscountType('custom'); setActiveField('customDiscount'); }}
                                            className={`px-2 py-1 rounded-md text-[10px] uppercase font-black transition-all ${customDiscountMode === 'percent' ? 'bg-blue-500 text-white shadow-sm' : 'text-gray-400 hover:bg-black/5'}`}
                                        >
                                            %
                                        </button>
                                    </div>

                                    {/* Display Value */}
                                    <span className="relative z-10 font-mono text-lg bg-white/80 px-2 rounded ml-auto pointer-events-none">
                                        {discountType === 'custom'
                                            ? (customDiscountMode === 'amount' ? formatCurrency(parseInt(customDiscountStr)) : `${customDiscountStr}%`)
                                            : '--'
                                        }
                                    </span>
                                </div>
                            </div>

                            <button
                                onClick={() => { setDiscountType('100'); setActiveField('received'); }}
                                className={`w-full h-12 mt-3 rounded-xl font-bold text-xs transition-all border-2 ${discountType === '100' ? 'bg-blue-50 border-blue-400 text-blue-700 shadow-inner' : 'bg-white border-gray-200 text-gray-500 hover:border-blue-200'}`}
                            >
                                100% Cortesía
                            </button>
                        </div>

                        {/* *** NEW: Order Details (Receipt Preview) *** */}
                        <div className="flex-1 min-h-0 bg-white border border-gray-200 rounded-xl p-3 flex flex-col">
                            <div className="flex items-center gap-2 text-gray-400 font-bold text-[10px] uppercase tracking-wider mb-2">
                                <ShoppingBag size={12} />
                                Detalle de Venta
                            </div>
                            <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                                {items.map((item, idx) => (
                                    <div key={idx} className="flex justify-between items-start text-xs border-b border-gray-50 pb-2 last:border-0 last:pb-0">
                                        <div className="flex gap-2">
                                            <span className="font-bold text-gray-800 w-5 text-center bg-gray-100 rounded text-[10px] h-4 leading-4">{item.quantity}</span>
                                            <div className="flex flex-col">
                                                <span className="text-gray-600 font-medium leading-tight">{item.product.name}</span>
                                                {item.modifiers && item.modifiers.length > 0 && (
                                                    <span className="text-[9px] text-gray-400">{item.modifiers.map(m => m.name).join(', ')}</span>
                                                )}
                                            </div>
                                        </div>
                                        <span className="font-mono text-gray-500">{formatCurrency(item.product.price * item.quantity)}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Summary Mini */}
                        <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm space-y-2 shrink-0 text-xs">
                            <div className="flex justify-between text-gray-400 font-medium">
                                <span>Subtotal</span>
                                <span>{formatCurrency(total)}</span>
                            </div>

                            {discountAmount > 0 && (
                                <div className="flex justify-between font-bold text-blue-600">
                                    <span>Descuento {discountType === 'custom' && `(${customDiscountStr}%)`}</span>
                                    <span>- {formatCurrency(discountAmount)}</span>
                                </div>
                            )}

                            {pointsValue > 0 && (
                                <div className="flex justify-between font-bold text-pp-gold">
                                    <span>Puntos Redimidos ({pointsRedeemed})</span>
                                    <span>- {formatCurrency(pointsValue)}</span>
                                </div>
                            )}

                            {tipAmount > 0 && (
                                <div className="flex justify-between font-bold text-pink-500">
                                    <span>Propina</span>
                                    <span>+ {formatCurrency(tipAmount)}</span>
                                </div>
                            )}

                            <div className="border-t-2 border-dashed border-gray-100 pt-2 flex justify-between font-black text-gray-800 text-base">
                                <span>A Pagar</span>
                                <span className={usePoints ? 'text-pp-brown' : ''}>{formatCurrency(cashNeeded)}</span>
                            </div>
                        </div>

                    </div>

                    {/* Right Panel: Payment Inputs */}
                    <div className="flex-1 bg-white p-4 flex flex-col gap-4">

                        {/* Dynamic Input Display */}
                        <div
                            onClick={() => setActiveField('received')}
                            className={`relative rounded-3xl border-2 transition-all p-6 text-right cursor-pointer flex flex-col justify-center h-32 ${activeField === 'received' ? 'bg-white border-pp-brown shadow-xl ring-4 ring-pp-brown/5' :
                                activeField === 'customTip' ? 'bg-pink-50 border-pink-400 shadow-xl ring-4 ring-pink-100' :
                                    activeField === 'customDiscount' ? 'bg-blue-50 border-blue-400 shadow-xl ring-4 ring-blue-100' :
                                        'bg-gray-50 border-gray-200'
                                }`}
                        >
                            <span className={`text-sm font-bold uppercase tracking-widest mb-2 ${activeField === 'received' ? 'text-gray-400' :
                                activeField === 'customTip' ? 'text-pink-500' :
                                    activeField === 'customDiscount' ? 'text-blue-500' : 'text-gray-400'
                                }`}>
                                {activeField === 'received' ? 'Dinero Recibido' :
                                    activeField === 'customTip' ? (customTipMode === 'percent' ? 'Ingresa Propina (%)' : 'Ingresa la Propina') :
                                        activeField === 'customDiscount' ? 'Ingresa % Descuento' : ''}
                            </span>

                            <div className={`text-6xl font-black font-mono tracking-tighter flex justify-end items-center gap-2 ${activeField === 'received' ? 'text-gray-800' :
                                activeField === 'customTip' ? 'text-pink-600' :
                                    activeField === 'customDiscount' ? 'text-blue-600' : 'text-gray-800'
                                }`}>
                                <span className="text-gray-300 text-4xl">
                                    {(
                                        (activeField === 'customDiscount' && customDiscountMode === 'percent') ||
                                        (activeField === 'customTip' && customTipMode === 'percent')
                                    ) ? '' : '$'}
                                </span>
                                {
                                    activeField === 'received' ? (receivedStr ? parseInt(receivedStr).toLocaleString('es-CO') : '0') :
                                        activeField === 'customTip' ? (customTipStr ? parseInt(customTipStr).toLocaleString('es-CO') : '0') :
                                            activeField === 'customDiscount' ? (customDiscountStr ? parseInt(customDiscountStr).toLocaleString('es-CO') : '0') : '0'
                                }
                                {(
                                    (activeField === 'customDiscount' && customDiscountMode === 'percent') ||
                                    (activeField === 'customTip' && customTipMode === 'percent')
                                ) && <span className="text-4xl text-blue-300 text-current">%</span>}
                                <span className={`w-1.5 h-12 animate-pulse ml-1 rounded-full ${activeField === 'received' ? 'bg-pp-brown' :
                                    activeField === 'customTip' ? 'bg-pink-500' :
                                        activeField === 'customDiscount' ? 'bg-blue-500' : 'bg-gray-400'
                                    }`} />
                            </div>
                        </div>

                        {/* Error Alert */}
                        {alertMessage && (
                            <div className="bg-red-50 text-red-600 px-4 py-3 rounded-xl text-sm font-bold flex items-center gap-3 animate-slide-in">
                                <div className="w-2 h-2 bg-red-500 rounded-full" />
                                {alertMessage}
                            </div>
                        )}

                        <div className="flex-1 grid grid-cols-12 gap-4 min-h-0">

                            {/* Keypad */}
                            <div className="col-span-8 bg-gray-50 rounded-3xl p-5 grid grid-cols-3 gap-3 h-full content-stretch shadow-inner">
                                {['1', '2', '3', '4', '5', '6', '7', '8', '9', '00', '0'].map(num => (
                                    <button
                                        key={num}
                                        onClick={() => handleNumberClick(num)}
                                        className="bg-white hover:bg-gray-50 text-gray-800 text-3xl font-black rounded-2xl shadow-[0_4px_0_rgba(0,0,0,0.05)] active:shadow-none active:translate-y-[4px] border border-gray-200 transition-all flex items-center justify-center"
                                    >
                                        {num}
                                    </button>
                                ))}
                                <button
                                    onClick={handleBackspace}
                                    className="bg-gray-200 text-gray-500 hover:bg-gray-300 rounded-2xl shadow-[0_4px_0_rgba(0,0,0,0.05)] active:shadow-none active:translate-y-[4px] transition-all flex items-center justify-center hover:text-red-500"
                                >
                                    <Delete size={32} />
                                </button>
                            </div>

                            {/* Denominations Column */}
                            <div className="col-span-4 flex flex-col gap-3 h-full">

                                {/* Change Calculator Card */}
                                <div className={`p-6 rounded-3xl border-4 transition-colors flex-none shadow-sm flex flex-col gap-4 ${change >= 0 ? 'bg-green-50 border-green-100' : 'bg-red-50 border-red-100'}`}>
                                    <div>
                                        <p className={`text-xs font-black uppercase tracking-widest opacity-60 mb-1 ${change >= 0 ? 'text-green-800' : 'text-red-800'}`}>
                                            {change >= 0 ? 'SU CAMBIO' : 'FALTANTE'}
                                        </p>
                                        <p className={`text-5xl font-black font-mono tracking-tighter leading-none text-right ${change >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                                            {formatCurrency(Math.abs(change))}
                                        </p>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3 mt-2">
                                        <button
                                            onClick={handleExact}
                                            className="h-14 bg-pp-gold text-white rounded-2xl font-black text-xs uppercase shadow-sm hover:brightness-110 active:scale-95 transition-all flex items-center justify-center tracking-wide border-2 border-pp-gold"
                                        >
                                            Exacto
                                        </button>
                                        <button
                                            onClick={handleClear}
                                            className="h-14 bg-white/50 text-gray-500 hover:bg-red-100 hover:text-red-600 rounded-2xl font-bold text-xs uppercase transition-colors flex items-center justify-center border-2 border-transparent hover:border-red-200"
                                        >
                                            Limpiar
                                        </button>
                                    </div>
                                </div>


                                {(activeField === 'received' || activeField === 'customTip' || activeField === 'customDiscount') ? (
                                    <div className="flex-1 overflow-y-auto pr-1 space-y-3 custom-scrollbar min-h-0">
                                        <div>
                                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Billetes</p>
                                            <div className="grid grid-cols-1 gap-2">
                                                {denominations.filter(d => d.type === 'billete').map(d => (
                                                    <button
                                                        key={d.value}
                                                        onClick={() => handleDenomination(d.value)}
                                                        className="bg-white border border-gray-200 hover:border-pp-brown/50 hover:bg-pp-brown/5 text-gray-700 font-bold py-3 rounded-xl text-base shadow-sm active:scale-95 active:shadow-inner transition-all text-center"
                                                    >
                                                        {d.label}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        <div>
                                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Monedas</p>
                                            <div className="grid grid-cols-1 gap-2">
                                                {denominations.filter(d => d.type === 'moneda').map(d => (
                                                    <button
                                                        key={d.value}
                                                        onClick={() => handleDenomination(d.value)}
                                                        className="bg-white border border-gray-200 hover:border-yellow-500/50 hover:bg-yellow-50 text-gray-700 font-bold py-3 rounded-xl text-base shadow-sm active:scale-95 active:shadow-inner transition-all w-full text-center"
                                                    >
                                                        {d.label}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex-1 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200 flex items-center justify-center p-4 text-center">
                                        <p className="text-gray-400 text-xs font-medium">Selecciona un campo para usar billetes</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Confirm Button */}
                        <Button
                            onClick={handleCheckout}
                            disabled={receivedAmount < cashNeeded}
                            className={`w-full h-20 font-bold text-2xl rounded-2xl shadow-xl transition-all ${receivedAmount >= cashNeeded
                                ? 'bg-pp-brown hover:bg-pp-brown/90 text-white hover:scale-[1.01] active:scale-95'
                                : 'bg-gray-100 text-gray-300 shadow-none cursor-not-allowed'
                                }`}
                        >
                            {usePoints ? 'PAGAR RESTANTE Y CONFIRMAR' : 'CONFIRMAR PAGO'}
                        </Button>
                    </div>

                </div>
            </div>
        </div>
    )
}
