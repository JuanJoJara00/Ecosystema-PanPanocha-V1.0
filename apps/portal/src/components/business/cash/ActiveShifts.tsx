import React, { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Shift, User } from '@panpanocha/types'
import { Clock, User as UserIcon, DollarSign, Power, Monitor, ShoppingBag, ShieldAlert } from 'lucide-react'
import Button from '@/components/ui/Button'
import RemoteCloseModal from './RemoteCloseModal'

// Types extended with join data
type ActiveShift = Shift & {
    user: { full_name: string } | null;
    branch: { name: string } | null;
    live_sales?: number;
    sales_count?: number;
    last_seen_at?: string | null;
}

const formatCurrency = (val: number) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(val)
const formatTime = (dateStr: string) => new Date(dateStr).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })

export default function ActiveShifts() {
    const [shifts, setShifts] = useState<ActiveShift[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedShift, setSelectedShift] = useState<Shift | null>(null);

    const fetchActiveShifts = async () => {
        try {
            const { data, error } = await supabase
                .from('shifts')
                .select(`
                    *,
                    user:user_id ( full_name ),
                    branch:branch_id ( name )
                `)
                .eq('status', 'open')
                .order('start_time', { ascending: false });

            if (error) throw error;

            // Fetch live metrics for each shift parallel
            const shiftsWithMetrics = await Promise.all((data as any[]).map(async (shift) => {
                const { data: sales } = await supabase
                    .from('sales')
                    .select('total_amount')
                    .eq('shift_id', shift.id);

                const total = sales?.reduce((acc, s) => acc + (s.total_amount || 0), 0) || 0;
                const count = sales?.length || 0;

                return { ...shift, live_sales: total, sales_count: count };
            }));

            setShifts(shiftsWithMetrics);
        } catch (error) {
            console.error('Error fetching active shifts:', error);
        } finally {
            setLoading(false);
        }
    };

    // Realtime Subs
    useEffect(() => {
        fetchActiveShifts();

        // Listen for changes in shifts (new opens, closes, heartbeats)
        const channel = supabase
            .channel('active-shifts')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'shifts' }, () => {
                fetchActiveShifts();
            })
            // Listen for sales to update totals? Might be too noisy. 
            // Better to just refresh periodically or on specific triggers if critical.
            .subscribe();

        // Polling Heartbeat Visualization every 30s to update "Last seen X min ago" UI
        const interval = setInterval(() => {
            setShifts(prev => [...prev]); // Trigger re-render for time calculation
        }, 30000);

        return () => {
            supabase.removeChannel(channel);
            clearInterval(interval);
        }
    }, []);

    const isOnline = (lastSeen?: string | null) => {
        if (!lastSeen) return false;
        const diff = new Date().getTime() - new Date(lastSeen).getTime();
        return diff < 120000; // 2 minutes tolerance
    };

    const getLastSeenText = (lastSeen?: string | null) => {
        if (!lastSeen) return 'N/A';
        const diff = new Date().getTime() - new Date(lastSeen).getTime();
        const mins = Math.floor(diff / 60000);
        if (mins < 1) return 'Ahora';
        return `hace ${mins} min`;
    };

    if (loading) return <div className="p-4 text-center text-gray-400">Cargando turnos activos...</div>;

    // if (shifts.length === 0) return null; // REMOVED: Always show section

    return (
        <div className="">
            <h3 className="font-bold text-gray-800 dark:text-gray-200 mb-3 flex items-center gap-2 text-sm">
                <Monitor className="w-4 h-4 text-green-500" />
                Monitoreo en Vivo ({shifts.length})
            </h3>

            {shifts.length === 0 ? (
                <div className="bg-gray-50 dark:bg-slate-800 rounded-lg border border-dashed border-gray-200 dark:border-white/10 p-4 text-center">
                    <div className="flex items-center justify-center gap-3">
                        <div className="bg-gray-100 dark:bg-slate-700 w-8 h-8 rounded-full flex items-center justify-center">
                            <Monitor className="w-4 h-4 text-gray-400" />
                        </div>
                        <div className="text-left">
                            <h4 className="font-bold text-gray-600 dark:text-gray-300 text-sm">No hay turnos activos</h4>
                            <p className="text-xs text-gray-400">Los turnos abiertos aparecerán aquí en tiempo real.</p>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {shifts.map(shift => {
                        const online = isOnline(shift.last_seen_at);

                        return (
                            <div key={shift.id} className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-white/5 shadow-sm hover:shadow-md transition-shadow p-5 relative overflow-hidden group">
                                {/* Status Stripe */}
                                <div className={`absolute top-0 left-0 w-1 h-full ${online ? 'bg-green-500' : 'bg-gray-400'}`} />

                                <div className="flex justify-between items-start mb-4 pl-2">
                                    <div>
                                        <h4 className="font-bold text-gray-800 dark:text-gray-100 text-lg">{shift.branch?.name || 'Sede'}</h4>
                                        <div className="flex items-center gap-1 text-xs text-gray-500">
                                            <UserIcon className="w-3 h-3" /> {shift.user?.full_name || 'Operador'}
                                        </div>
                                    </div>
                                    <div className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-bold ${online ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                                        <div className={`w-2 h-2 rounded-full ${online ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
                                        {online ? 'Online' : 'Offline'}
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4 pl-2 mb-4">
                                    <div className="bg-gray-50 dark:bg-slate-700/50 p-3 rounded-lg">
                                        <p className="text-[10px] uppercase text-gray-400 font-bold mb-1">Ventas</p>
                                        <p className="text-lg font-black text-gray-800 dark:text-white flex items-center gap-1">
                                            <DollarSign className="w-4 h-4 text-gray-400" />
                                            {formatCurrency(shift.live_sales || 0)}
                                        </p>
                                    </div>
                                    <div className="bg-gray-50 dark:bg-slate-700/50 p-3 rounded-lg">
                                        <p className="text-[10px] uppercase text-gray-400 font-bold mb-1">Transacciones</p>
                                        <p className="text-lg font-black text-gray-800 dark:text-white flex items-center gap-1">
                                            <ShoppingBag className="w-4 h-4 text-gray-400" />
                                            {shift.sales_count || 0}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex justify-between items-center pl-2 pt-2 border-t dark:border-white/5">
                                    <span className="text-xs text-gray-400 flex items-center gap-1">
                                        <Clock className="w-3 h-3" /> Inicio: {formatTime(shift.start_time)}
                                    </span>
                                    <span className="text-xs text-gray-400">
                                        {!online && `Visto: ${getLastSeenText(shift.last_seen_at)}`}
                                    </span>
                                </div>

                                <div className="mt-4 pt-3 border-t border-dashed dark:border-white/10 flex gap-2 pl-2">
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => setSelectedShift(shift)}
                                        className="w-full border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 dark:border-white/10 dark:hover:bg-red-900/20"
                                    >
                                        <Power className="w-4 h-4 mr-2" /> Cierre Remoto
                                    </Button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {selectedShift && (
                <RemoteCloseModal
                    isOpen={!!selectedShift}
                    onClose={() => setSelectedShift(null)}
                    shift={selectedShift}
                    onSuccess={() => {
                        fetchActiveShifts();
                        setSelectedShift(null);
                    }}
                />
            )}
        </div>
    )
}
