'use client'

import React, { useState, useEffect } from 'react'
import { X, DollarSign, TrendingUp, TrendingDown, Info, AlertCircle } from 'lucide-react'
import Modal from '@/components/ui/Modal'
import Button from '@/components/ui/Button'
import NumericInput from '@/components/ui/NumericInput'
import Badge from '@/components/ui/Badge'
import { Calculator } from '../../../../../../packages/shared-logic/src'

interface PriceOverrideModalProps {
    isOpen: boolean;
    onClose: () => void;
    product: {
        id: string;
        name: string;
        base_price: number;
        current_price: number;
    } | null;
    channelName: string;
    onSave: (newPrice: number) => void;
}

export default function PriceOverrideModal({
    isOpen,
    onClose,
    product,
    channelName,
    onSave
}: PriceOverrideModalProps) {
    const [price, setPrice] = useState<number>(0)

    useEffect(() => {
        if (product) {
            setPrice(product.current_price)
        }
    }, [product])

    if (!product) return null

    const diff = price - product.base_price
    const diffPercent = product.base_price > 0 ? (diff / product.base_price) * 100 : 0
    const isIncrease = diff > 0
    const isDecrease = diff < 0

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Ajustar Precio de Canal"
            maxWidth="max-w-xl"
        >
            <div className="space-y-6">
                {/* Product Info Banner */}
                <div className="bg-pp-gold/5 border border-pp-gold/20 rounded-[2rem] p-6 flex items-center gap-5">
                    <div className="w-16 h-16 bg-white rounded-2xl shadow-sm flex items-center justify-center border border-pp-gold/10">
                        <TrendingUp className="text-pp-gold h-8 w-8" />
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-pp-gold uppercase tracking-widest mb-1">
                            Ajustando para {channelName}
                        </p>
                        <h3 className="text-xl font-black text-gray-900 tracking-tight">
                            {product.name}
                        </h3>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Base Price Read-only */}
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">
                            Precio Base (Global)
                        </label>
                        <div className="bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/5 rounded-2xl p-4">
                            <span className="text-2xl font-mono font-black text-gray-400">
                                {Calculator.formatCurrency(product.base_price)}
                            </span>
                        </div>
                    </div>

                    {/* New Price Input */}
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-900 dark:text-white uppercase tracking-widest px-1">
                            Precio Nuevo para Canal
                        </label>
                        <NumericInput
                            value={price}
                            onChange={v => setPrice(v)}
                            placeholder="0"
                            className="text-2xl font-mono font-black text-pp-gold bg-white dark:bg-slate-800 border-pp-gold/30 focus:border-pp-gold rounded-2xl"
                        />
                    </div>
                </div>

                {/* Analysis Card */}
                <div className={`p-6 rounded-[2rem] border transition-all duration-500 ${isIncrease ? 'bg-orange-50/50 border-orange-100' :
                    isDecrease ? 'bg-emerald-50/50 border-emerald-100' :
                        'bg-gray-50/50 border-gray-100'
                    }`}>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-xl ${isIncrease ? 'bg-orange-100 text-orange-600' :
                                isDecrease ? 'bg-emerald-100 text-emerald-600' :
                                    'bg-gray-100 text-gray-600'
                                }`}>
                                {isIncrease ? <TrendingUp size={20} /> :
                                    isDecrease ? <TrendingDown size={20} /> :
                                        <X size={20} />}
                            </div>
                            <div>
                                <h4 className="font-black text-gray-900 uppercase text-xs tracking-tight">
                                    Diferencia vs. Base
                                </h4>
                                <p className={`text-sm font-bold ${isIncrease ? 'text-orange-600' :
                                    isDecrease ? 'text-emerald-600' :
                                        'text-gray-500'
                                    }`}>
                                    {isIncrease ? 'Margen Superior' : isDecrease ? 'Precio Promocional' : 'Sin Cambios'}
                                </p>
                            </div>
                        </div>
                        <div className="text-right">
                            <p className={`text-2xl font-mono font-black ${isIncrease ? 'text-orange-600' :
                                isDecrease ? 'text-emerald-600' :
                                    'text-gray-500'
                                }`}>
                                {isIncrease ? '+' : ''}{Calculator.formatCurrency(diff)}
                            </p>
                            <Badge variant={isIncrease ? 'warning' : isDecrease ? 'success' : 'neutral'} className="font-black uppercase tracking-widest text-[10px]">
                                {diffPercent > 0 ? '+' : ''}{Math.round(diffPercent)}% de variación
                            </Badge>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2 p-4 bg-blue-50/50 border border-blue-100 rounded-2xl text-blue-700">
                    <Info size={18} className="shrink-0" />
                    <p className="text-xs font-medium leading-relaxed">
                        Este precio solo se aplicará en <strong>{channelName}</strong>. El precio global y otras sedes no se verán afectados.
                    </p>
                </div>

                <div className="flex gap-4 pt-4">
                    <Button
                        variant="outline"
                        onClick={onClose}
                        className="flex-1 rounded-2xl font-black uppercase tracking-widest text-xs h-12"
                    >
                        Cancelar
                    </Button>
                    <Button
                        onClick={() => onSave(price)}
                        className="flex-[2] rounded-2xl font-black uppercase tracking-widest text-xs h-12 shadow-lg shadow-pp-gold/20"
                    >
                        Guardar Precio
                    </Button>
                </div>
            </div>
        </Modal>
    )
}
