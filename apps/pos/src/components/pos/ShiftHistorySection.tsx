import { useState, useEffect, useMemo } from 'react';
import { usePosStore } from '../../store';
import { Card } from '@panpanocha/ui';
import { Calendar, Clock, User, TrendingUp, TrendingDown, Hash } from 'lucide-react';
import { ShiftDetailModal } from './ShiftDetailModal';

interface Shift {
    id: string;
    branch_id: string;
    user_id: string;
    start_time: string;
    end_time: string | null;
    initial_cash: number;
    final_cash: number | null;
    expected_cash: number | null;
    status: 'open' | 'closed';
    turn_type: string | null;
    user_name?: string;
    branch_name?: string;
}

interface ShiftsByDate {
    date: string;
    dateFormatted: string;
    shifts: (Shift & { turnNumber: number })[];
}

export default function ShiftHistorySection() {
    const { currentShift, sidebarDateFilter, refreshHistoryTrigger } = usePosStore();
    const [shifts, setShifts] = useState<Shift[]>([]);
    const [loading, setLoading] = useState(false);
    const [selectedShift, setSelectedShift] = useState<(Shift & { turnNumber: number }) | null>(null);

    useEffect(() => {
        loadShifts();
    }, [refreshHistoryTrigger]);

    const loadShifts = async () => {
        try {
            if (shifts.length === 0) setLoading(true);
            // @ts-ignore
            const allShifts = await window.electron.getAllShifts(100);
            setShifts(allShifts || []);
        } catch (error) {
            console.error('[ShiftHistory] Error loading shifts:', error);
        } finally {
            setLoading(false);
        }
    };

    const filteredShifts = useMemo(() => {
        if (!shifts.length) return [];

        const now = new Date();
        now.setHours(0, 0, 0, 0);
        const startOfDay = now.getTime();

        const startOfSevenDaysAgo = new Date(now);
        startOfSevenDaysAgo.setDate(now.getDate() - 7);
        const startOfSevenDaysAgoTime = startOfSevenDaysAgo.getTime();

        const startOfFifteenDaysAgo = new Date(now);
        startOfFifteenDaysAgo.setDate(now.getDate() - 15);
        const startOfFifteenDaysAgoTime = startOfFifteenDaysAgo.getTime();

        return shifts.filter(shift => {
            const shiftDate = new Date(shift.start_time);
            const shiftTime = shiftDate.getTime();

            switch (sidebarDateFilter) {
                case 'shift':
                    return currentShift ? shift.id === currentShift.id : true;
                case 'today':
                    return shiftTime >= startOfDay;
                case '7d':
                    return shiftTime >= startOfSevenDaysAgoTime;
                case '15d':
                default:
                    return shiftTime >= startOfFifteenDaysAgoTime;
            }
        });
    }, [shifts, sidebarDateFilter, currentShift]);

    // Group shifts by date and number them (resets at midnight)
    const shiftsByDate = useMemo((): ShiftsByDate[] => {
        if (!filteredShifts.length) return [];

        const grouped: { [key: string]: Shift[] } = {};

        // Group by date string (YYYY-MM-DD)
        filteredShifts.forEach(shift => {
            const date = new Date(shift.start_time);
            const dateKey = date.toISOString().split('T')[0];
            if (!grouped[dateKey]) {
                grouped[dateKey] = [];
            }
            grouped[dateKey].push(shift);
        });

        // Convert to array and sort by date (newest first)
        const result: ShiftsByDate[] = Object.entries(grouped)
            .sort(([a], [b]) => b.localeCompare(a))
            .map(([dateKey, dateShifts]) => {
                // Sort shifts by start_time ascending for numbering (oldest first within the day)
                const sortedShifts = [...dateShifts].sort((a, b) =>
                    new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
                );

                // Number them 1, 2, 3...
                const numberedShifts = sortedShifts.map((shift, idx) => ({
                    ...shift,
                    turnNumber: idx + 1
                }));

                // Reverse back for display (newest first)
                numberedShifts.reverse();

                return {
                    date: dateKey,
                    dateFormatted: new Date(dateKey + 'T12:00:00').toLocaleDateString('es-CO', {
                        weekday: 'long',
                        day: '2-digit',
                        month: 'long',
                        year: 'numeric'
                    }),
                    shifts: numberedShifts
                };
            });

        return result;
    }, [filteredShifts]);

    const formatTime = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: true });
    };

    const formatCurrency = (amount: number) => {
        return `$${(amount || 0).toLocaleString('es-CO')}`;
    };

    // Calculate totals
    const totalShifts = filteredShifts.length;
    const closedShifts = filteredShifts.filter(s => s.status === 'closed');
    const totalSales = closedShifts.reduce((sum, s) => sum + ((s.expected_cash || 0) - (s.initial_cash || 0)), 0);

    if (loading && shifts.length === 0) {
        return (
            <div className="p-6 flex items-center justify-center h-full">
                <div className="animate-pulse text-gray-400">Cargando historial...</div>
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6 overflow-y-auto h-full">
            {/* Header */}
            <div className="flex flex-row justify-between items-center bg-transparent">
                <h2 className="text-2xl font-bold text-gray-900 uppercase tracking-tight flex items-center gap-2">
                    <span>📋</span> HISTORIAL DE CIERRES
                </h2>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 gap-3">
                <Card className="bg-yellow-50 border-yellow-200">
                    <div className="flex flex-col items-center justify-center text-center py-2">
                        <p className="text-xs uppercase font-bold text-yellow-700 tracking-wider mb-1">Total de Turnos</p>
                        <p className="text-3xl font-black text-yellow-900 font-mono tracking-tight">{totalShifts}</p>
                    </div>
                </Card>
                <Card className="bg-green-50 border-green-200">
                    <div className="flex flex-col items-center justify-center text-center py-2">
                        <p className="text-xs uppercase font-bold text-green-700 tracking-wider mb-1">Ventas Totales</p>
                        <p className="text-2xl font-black text-green-700 font-mono tracking-tight whitespace-nowrap">{formatCurrency(totalSales)}</p>
                    </div>
                </Card>
            </div>

            {/* List Header */}
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                <Calendar size={12} />
                {sidebarDateFilter === 'shift' ? 'Turno Actual' :
                    sidebarDateFilter === 'today' ? 'Turnos de Hoy' :
                        sidebarDateFilter === '7d' ? 'Últimos 7 Días' :
                            'Últimos 15 Días'}
            </h3>

            {/* Shift List Grouped by Date */}
            {shiftsByDate.length === 0 ? (
                <div className="flex items-center justify-center h-64">
                    <div className="text-center text-gray-500">
                        <p className="text-xl mb-2">📭</p>
                        <p>No hay cierres registrados</p>
                    </div>
                </div>
            ) : (
                <div className="space-y-4">
                    {shiftsByDate.map((dateGroup) => (
                        <div key={dateGroup.date} className="border border-gray-200 rounded-xl overflow-hidden bg-gray-50/50">
                            {/* Date Header */}
                            <div className="bg-gray-100 px-4 py-2 border-b border-gray-200">
                                <p className="text-xs font-bold text-gray-600 uppercase tracking-wider flex items-center gap-2">
                                    <Calendar size={12} />
                                    {dateGroup.dateFormatted}
                                    <span className="text-gray-400">({dateGroup.shifts.length} turno{dateGroup.shifts.length > 1 ? 's' : ''})</span>
                                </p>
                            </div>

                            {/* Shifts for this date */}
                            <div className="p-2 space-y-2">
                                {dateGroup.shifts.map((shift) => {
                                    const difference = (shift.final_cash || 0) - (shift.expected_cash || 0);
                                    const isClosed = shift.status === 'closed';
                                    const isPositive = difference >= 0;

                                    // Border color based on status
                                    let borderColor = isClosed ? '#10b981' : '#f59e0b';

                                    return (
                                        <Card
                                            key={shift.id}
                                            onClick={() => setSelectedShift(shift)}
                                            style={{ borderLeftColor: borderColor }}
                                            className={`
                                                bg-white hover:border-[#D4AF37]/50 shadow-sm transition-all cursor-pointer relative group active:scale-[0.99]
                                                border-l-4
                                            `}
                                        >
                                            {/* Top Row: Turn Number, User, Status */}
                                            <div className="flex justify-between items-start mb-2">
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        {/* Turn Number Badge */}
                                                        <div className="flex items-center gap-1 bg-[#D4AF37]/10 text-[#D4AF37] px-2 py-0.5 rounded-full">
                                                            <Hash size={12} />
                                                            <span className="text-sm font-black">Turno {shift.turnNumber}</span>
                                                        </div>
                                                        <span className="text-[10px] text-gray-400 font-mono">
                                                            #{shift.id.slice(0, 8)}
                                                        </span>
                                                    </div>
                                                    {/* User */}
                                                    <div className="flex items-center gap-1 mt-1 text-gray-600 text-sm">
                                                        <User size={12} className="text-gray-400" />
                                                        <span className="truncate">{shift.user_name || 'Usuario'}</span>
                                                    </div>
                                                </div>

                                                <div className="text-right flex flex-col items-end gap-1">
                                                    {/* Status Badge */}
                                                    <div className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${isClosed
                                                        ? 'bg-green-100 text-green-700'
                                                        : 'bg-orange-100 text-orange-700'
                                                        }`}>
                                                        {isClosed ? '● CERRADO' : '○ ABIERTO'}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Time Range */}
                                            <div className="flex items-center gap-2 text-xs text-gray-500 mb-3">
                                                <Clock size={12} />
                                                <span>{formatTime(shift.start_time)}</span>
                                                <span>→</span>
                                                <span>{shift.end_time ? formatTime(shift.end_time) : 'En curso'}</span>
                                            </div>

                                            {/* Bottom Row: Financial Summary */}
                                            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-gray-100">
                                                <div className="text-center">
                                                    <p className="text-[10px] text-gray-400 uppercase font-bold">Base</p>
                                                    <p className="text-sm font-bold text-gray-700">{formatCurrency(shift.initial_cash)}</p>
                                                </div>
                                                <div className="text-center">
                                                    <p className="text-[10px] text-gray-400 uppercase font-bold">Esperado</p>
                                                    <p className="text-sm font-bold text-green-600">{formatCurrency(shift.expected_cash || 0)}</p>
                                                </div>
                                                <div className="text-center">
                                                    <p className="text-[10px] text-gray-400 uppercase font-bold">Diferencia</p>
                                                    <p className={`text-sm font-bold flex items-center justify-center gap-0.5 ${isPositive ? 'text-green-600' : 'text-red-600'
                                                        }`}>
                                                        {isPositive ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                                                        {formatCurrency(Math.abs(difference))}
                                                    </p>
                                                </div>
                                            </div>
                                        </Card>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Detail Modal */}
            {selectedShift && (
                <ShiftDetailModal
                    shift={selectedShift}
                    onClose={() => setSelectedShift(null)}
                />
            )}
        </div>
    );
}
