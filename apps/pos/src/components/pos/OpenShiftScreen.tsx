import React, { useState, useEffect } from 'react';
import { usePosStore } from '../../store';
import { ArrowRight, Building2, Wallet } from 'lucide-react';
import { Button, Input, Card, Select } from '@panpanocha/ui';
import { formatCurrency } from '@panpanocha/shared';
import { BrandBackground } from './BrandBackground';

import { brandConfig } from '@panpanocha/config';

export const OpenShiftScreen: React.FC = () => {
    const { branches, openShift, currentUser } = usePosStore();
    const [selectedBranch, setSelectedBranch] = useState('');
    const [cashAmount, setCashAmount] = useState('');
    const [error, setError] = useState('');
    const [turnType, setTurnType] = useState('');

    useEffect(() => {
        // Auto-calculate turn type for display
        const hour = new Date().getHours();
        if (hour < 14) setTurnType('Mañana (6:00 AM - 3:00 PM)');
        else if (hour >= 14) setTurnType('Tarde (2:00 PM - 12:00 PM)');
        else setTurnType('Único');
    }, []);

    const handleOpen = async () => {
        if (!selectedBranch) {
            setError('Debes seleccionar una sede.');
            return;
        }
        const numValue = parseInt(cashAmount.replace(/\D/g, '') || '0');
        if (numValue <= 0) {
            setError('Ingresa un monto base válido.');
            return;
        }

        try {
            await openShift(selectedBranch, numValue);
        } catch (err) {
            console.error(err);
            setError('Error al abrir el turno. Intenta nuevamente.');
        }
    };

    const inputRef = React.useRef<HTMLInputElement>(null);

    return (
        <div className="fixed inset-0 bg-pp-cream flex items-center justify-center p-4 z-50 overflow-hidden">
            <BrandBackground opacity={0.15} />

            <Card
                noPadding
                className="relative z-10 bg-white max-w-md w-full rounded-2xl shadow-2xl overflow-hidden border border-pp-brown/10"
            >
                {/* Header */}
                <div className="bg-pp-brown p-8 text-center relative overflow-hidden">
                    <div className="relative z-10">
                        <div className="mx-auto w-24 h-24 bg-white/10 backdrop-blur-sm rounded-full flex items-center justify-center mb-4 shadow-inner ring-4 ring-white/20">
                            {/* Logo */}
                            <img src={brandConfig.company.logoUrl} alt="PanPanocha" className="w-16 h-16 object-contain" />
                        </div>
                        <h2 className="text-2xl font-display font-bold text-white mb-1 tracking-wide">APERTURA DE CAJA</h2>
                        <p className="text-pp-cream/80 text-sm font-medium">Hola, {currentUser?.full_name}</p>
                    </div>
                </div>

                <div className="p-8 space-y-6">
                    {/* Turn Info */}
                    <div className="bg-blue-50/50 p-4 rounded-xl flex flex-col items-center gap-1 text-sm text-blue-900 border border-blue-100/50 shadow-sm">
                        <span className="font-bold uppercase text-xs tracking-wider text-blue-400">Turno Detectado</span>
                        <span className="font-bold text-lg">{turnType}</span>
                    </div>

                    <div className="space-y-5">
                        {/* Branch Selector */}
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wide flex items-center gap-2">
                                <Building2 size={14} /> Sede
                            </label>
                            <Select
                                className="h-12 w-full border-gray-300 focus:border-pp-gold focus:ring-pp-gold rounded-xl"
                                value={selectedBranch}
                                onChange={(e) => {
                                    setSelectedBranch(e.target.value);
                                    // Focus Base Input after selection
                                    setTimeout(() => inputRef.current?.focus(), 100);
                                }}
                            >
                                <option value="">Selecciona tu sede...</option>
                                {branches.map((b) => (
                                    <option key={b.id} value={b.id}>
                                        {b.name}
                                    </option>
                                ))}
                            </Select>
                        </div>

                        {/* Initial Cash - Real-time Format */}
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wide flex items-center gap-2">
                                <Wallet size={14} /> Base en Efectivo
                            </label>
                            <div className="relative group z-20">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-xl group-focus-within:text-pp-gold transition-colors">$</span>
                                <Input
                                    ref={inputRef}
                                    type="text"
                                    inputMode="numeric"
                                    className="w-full h-14 pl-10 pr-4 rounded-xl border-2 border-gray-200 focus:border-pp-gold focus:ring-4 focus:ring-pp-gold/10 outline-none font-bold text-2xl text-gray-800 placeholder-gray-300 transition-all font-display bg-white focus:bg-white cursor-text"
                                    placeholder="0"
                                    value={cashAmount}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                                        const digits = e.target.value.replace(/\D/g, '');
                                        const formatted = digits ? new Intl.NumberFormat('es-CO').format(Number(digits)) : '';
                                        setCashAmount(formatted);
                                    }}
                                    autoFocus // Ensure it grabs focus if possible
                                />
                            </div>
                            {cashAmount && (
                                <p className="text-right text-sm text-pp-brown font-bold flex justify-end items-center gap-1">
                                    {formatCurrency(parseInt(cashAmount.replace(/\D/g, '')))}
                                </p>
                            )}
                        </div>
                    </div>

                    {error && (
                        <div className="bg-red-50 text-red-600 p-4 rounded-xl text-sm text-center font-bold border border-red-100 animate-shake">
                            {error}
                        </div>
                    )}

                    <Button
                        onClick={handleOpen}
                        disabled={!selectedBranch || !cashAmount}
                        className="w-full h-14 bg-gradient-to-r from-pp-brown to-[#5A3E2B] hover:from-[#5A3E2B] hover:to-pp-brown disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-xl shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2 active:scale-95 border-none text-lg tracking-wide uppercase"
                    >
                        Abrir Turno <ArrowRight size={20} />
                    </Button>

                    <div className="text-center pt-2">
                        <button onClick={() => window.location.reload()} className="text-xs text-gray-400 hover:text-gray-600 underline font-medium">
                            ¿No aparecen las sedes? Recargar
                        </button>
                    </div>
                </div>
            </Card>
        </div>
    );
};
