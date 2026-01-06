import { useRef, useState, useEffect } from 'react';
import { X, User, LogOut, Clock, DollarSign, AlertTriangle, Coins } from 'lucide-react';
import { Button, Card } from '@panpanocha/ui';
import { formatCurrency } from '@panpanocha/shared';
import { usePosStore } from '../../store';
import { BrandBackground } from './BrandBackground';
import { PinCodeModal } from './PinCodeModal';

interface Props {
    isOpen: boolean;
    onClose: () => void;
}

export function UserProfileModal({ isOpen, onClose }: Props) {
    const { currentUser, currentShift } = usePosStore();
    const [stats, setStats] = useState({
        shiftSales: 0,
        shiftCount: 0,
        monthlySales: 0,
        monthlyCount: 0
    });
    const [loading, setLoading] = useState(true);
    const [showAuthModal, setShowAuthModal] = useState(false);

    // Tips State
    const [tipsTotal, setTipsTotal] = useState(0);
    const [tipsHistory, setTipsHistory] = useState<any[]>([]);

    // Close on click outside
    const modalRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
                onClose();
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen, onClose]);

    useEffect(() => {
        if (isOpen) {
            loadStats();
        }
    }, [isOpen, currentShift]);

    const loadStats = async () => {
        try {
            setLoading(true);
            if (!window.electron) return;

            // 1. Get Sales History
            const allSales = await window.electron.getAllSales();

            // Calculate shift sales
            const shiftSales = currentShift
                ? allSales.filter((s: any) => s.shift_id === currentShift.id)
                : [];
            const shiftTotal = shiftSales.reduce((sum: number, sale: any) => sum + sale.total_amount, 0);

            // Calculate monthly sales
            const now = new Date();
            const currentMonth = now.getMonth();
            const currentYear = now.getFullYear();
            const monthlySales = allSales.filter((s: any) => {
                const saleDate = new Date(s.created_at);
                return saleDate.getMonth() === currentMonth && saleDate.getFullYear() === currentYear;
            });
            const monthlyTotal = monthlySales.reduce((sum: number, sale: any) => sum + sale.total_amount, 0);

            setStats({
                shiftSales: shiftTotal,
                shiftCount: shiftSales.length,
                monthlySales: monthlyTotal,
                monthlyCount: monthlySales.length
            });

            // 2. Get Tips History (if user is logged in)
            if (currentUser) {
                const total = await window.electron.getEmployeeTipsTotal(currentUser.id);
                setTipsTotal(total);

                const history = await window.electron.getTipDistributionsByEmployee(currentUser.id);
                setTipsHistory(history);
            }

        } catch (error) {
            console.error('[UserDetails] Error loading stats:', error);
        } finally {
            setLoading(false);
        }
    };

    const getShiftDuration = () => {
        if (!currentShift?.start_time) return 'N/A';
        const start = new Date(currentShift.start_time);
        const now = new Date();
        const diff = now.getTime() - start.getTime();
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        return `${hours}h ${minutes}m`;
    };

    const handleLogout = async () => {
        if (confirm('¿Seguro que deseas cerrar sesión?')) {
            try {
                // Use the store's logout function which signs out from Supabase
                await usePosStore.getState().logout();
                // Clear Persisted State
                localStorage.removeItem('pos-storage');
                // Close Modal then Reload
                onClose();
                window.location.reload();
            } catch (error) {
                console.error('[Logout] Error:', error);
                alert('Error al cerrar sesión');
            }
        }
    };

    const handleResetData = async () => {
        try {
            await window.electron.resetSalesData();
            alert('Datos restablecidos correctamente. El sistema se reiniciará.');
            window.location.reload();
        } catch (error) {
            console.error('Reset failed', error);
            alert('Error al restablecer datos');
        }
    };

    const getRoleDisplay = (role?: string) => {
        const roleMap: Record<string, string> = {
            'admin': 'Administrador',
            'cajero': 'Cajero',
            'developer': 'Desarrollador',
            'mesero': 'Mesero',
            'cocinero': 'Cocinero'
        };
        return roleMap[role?.toLowerCase() || ''] || role || 'Staff';
    };

    if (!isOpen) return null;

    // Placeholders for Dev/Owner if data is missing
    const displayName = currentUser?.full_name || 'Administración P.P';
    const displayRole = currentUser?.role ? getRoleDisplay(currentUser.role) : 'DEV / OWNER';
    const displayEmail = currentUser?.email || 'admin@panpanocha.com';

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200 p-4">
            <div ref={modalRef} className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden border border-gray-100 flex flex-col max-h-[90vh]">

                {/* Header Profile - Premium Gold Gradient */}
                <div className="bg-gradient-to-br from-[#D4AF37] via-[#C5A028] to-[#B38F1D] p-8 text-white relative flex-shrink-0 shadow-lg">
                    <BrandBackground opacity={0.15} size="w-40 h-40" className="mix-blend-overlay opacity-30" />

                    <button
                        onClick={onClose}
                        aria-label="Cerrar modal"
                        className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors z-20 backdrop-blur-sm"
                    >
                        <X size={20} />
                    </button>

                    <div className="flex flex-col items-center text-center relative z-10">
                        <div className="w-24 h-24 bg-white/10 rounded-full flex items-center justify-center border-4 border-white/20 backdrop-blur-md mb-4 shadow-2xl ring-4 ring-white/10">
                            <User className="h-10 w-10 text-white drop-shadow-md" />
                        </div>
                        <h2 className="text-2xl font-bold tracking-tight text-white mb-1 drop-shadow-sm font-display">
                            {displayName}
                        </h2>

                        <div className="flex flex-col items-center gap-1">
                            <span className="px-3 py-1 bg-black/20 rounded-full text-[10px] font-bold uppercase tracking-widest backdrop-blur-md border border-white/10 shadow-sm text-pp-gold-light">
                                {displayRole}
                            </span>
                            <span className="text-xs text-white/60 font-medium tracking-wide">{displayEmail}</span>
                        </div>
                    </div>
                </div>

                {/* Content - Scrollable */}
                <div className="flex-1 overflow-y-auto p-6 space-y-5 bg-gray-50/50">

                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-10 space-y-3">
                            <div className="w-8 h-8 border-4 border-gray-200 border-t-[#D4AF37] rounded-full animate-spin" />
                            <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Cargando...</p>
                        </div>
                    ) : (
                        <>
                            {/* Shift Card */}
                            {currentShift ? (
                                <Card className="border-gray-100 shadow-sm bg-white p-5 rounded-xl">
                                    <div className="flex items-center gap-2 mb-4 pb-3 border-b border-dashed border-gray-100">
                                        <Clock className="h-5 w-5 text-[#D4AF37]" />
                                        <h3 className="font-bold text-sm text-gray-700 uppercase tracking-widest">Turno Actual</h3>
                                    </div>
                                    <div className="grid grid-cols-2 gap-6 text-sm">
                                        <div>
                                            <p className="text-[10px] uppercase font-bold text-gray-400 mb-1 tracking-wider">Duración</p>
                                            <p className="text-xl font-bold text-gray-900 font-mono tracking-tight">{getShiftDuration()}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-[10px] uppercase font-bold text-gray-400 mb-1 tracking-wider">Base Inicial</p>
                                            <p className="text-xl font-bold text-gray-900 font-mono tracking-tight">{formatCurrency(currentShift.initial_cash || 0)}</p>
                                        </div>
                                    </div>

                                    <div className="mt-4 bg-blue-50/50 p-2.5 rounded-lg flex justify-between items-center border border-blue-100/50 group">
                                        <span className="text-xs text-blue-600 font-bold uppercase tracking-wide px-2">{currentShift.turn_type || 'Regular'}</span>
                                        <div className="flex items-center gap-2 px-2">
                                            <span className="text-[10px] text-green-600 font-bold uppercase">En Curso</span>
                                            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.5)]" />
                                        </div>
                                    </div>
                                </Card>
                            ) : (
                                <Card className="border-dashed border-2 border-gray-200 shadow-none bg-gray-50 p-6 flex flex-col items-center justify-center text-center py-8">
                                    <Clock className="h-8 w-8 text-gray-300 mb-2" />
                                    <p className="text-gray-400 font-medium text-sm">No hay turno activo</p>
                                </Card>
                            )}

                            {/* Stats Grid */}
                            <div className="grid grid-cols-2 gap-3">
                                <Card className="p-4 bg-white border-gray-100 shadow-sm hover:border-[#D4AF37]/30 transition-all group cursor-default">
                                    <div className="flex items-center gap-2 mb-3">
                                        <div className="p-2 bg-green-50 rounded-lg text-green-600 group-hover:scale-110 transition-transform">
                                            <DollarSign size={16} />
                                        </div>
                                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Ventas Turno</span>
                                    </div>
                                    <p className="text-xl font-bold text-gray-900 font-mono tracking-tight group-hover:text-green-700 transition-colors">
                                        {formatCurrency(stats.shiftSales)}
                                    </p>
                                    <p className="text-[10px] font-medium text-gray-400 mt-1">{stats.shiftCount} transacciones</p>
                                </Card>

                                <Card className="p-4 bg-white border-gray-100 shadow-sm hover:border-[#D4AF37]/30 transition-all group cursor-default">
                                    <div className="flex items-center gap-2 mb-3">
                                        <div className="p-2 bg-amber-50 rounded-lg text-amber-600 group-hover:scale-110 transition-transform">
                                            <Coins size={16} />
                                        </div>
                                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Propinas</span>
                                    </div>
                                    <p className="text-xl font-bold text-gray-900 font-mono tracking-tight group-hover:text-amber-700 transition-colors">
                                        {formatCurrency(tipsTotal)}
                                    </p>
                                    <p className="text-[10px] font-medium text-gray-400 mt-1">{tipsHistory.length} recibidas</p>
                                </Card>
                            </div>

                            {/* Tips History List */}
                            {tipsHistory.length > 0 && (
                                <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                                    <div className="bg-gray-50/50 px-4 py-3 border-b border-gray-100 flex justify-between items-center">
                                        <h3 className="font-bold text-xs uppercase tracking-wider text-gray-500 flex items-center gap-2">
                                            <Clock size={12} /> Historial de Propinas
                                        </h3>
                                    </div>
                                    <div className="max-h-40 overflow-y-auto">
                                        {tipsHistory.map((tip, idx) => (
                                            <div key={tip.id || idx} className="px-4 py-3 border-b border-gray-50 last:border-0 hover:bg-amber-50/10 transition-colors flex justify-between items-center group">
                                                <div>
                                                    <p className="text-sm font-bold text-gray-700 font-mono">{formatCurrency(tip.amount)}</p>
                                                    <p className="text-[10px] text-gray-400 flex items-center gap-1">
                                                        {new Date(tip.created_at).toLocaleDateString()}
                                                        <span className="w-1 h-1 rounded-full bg-gray-300"></span>
                                                        {new Date(tip.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </p>
                                                </div>
                                                <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-bold uppercase">Recibido</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Danger Zone - Reset */}
                            <Card className="bg-red-50/30 border border-red-100 p-1 relative overflow-hidden group hover:bg-red-50/50 transition-colors">
                                <div className="p-4 relative z-10">
                                    <h3 className="font-bold text-red-900 text-xs uppercase tracking-wider mb-2 flex items-center gap-2">
                                        <AlertTriangle size={14} className="text-red-500" /> Zona de Peligro
                                    </h3>
                                    <p className="text-[10px] text-red-700/60 mb-3 leading-tight font-medium">
                                        Restablecer base de datos local. Solo uso administrativo.
                                    </p>
                                    <Button
                                        onClick={() => setShowAuthModal(true)}
                                        className="w-full bg-white border border-red-200 text-red-600 hover:bg-red-600 hover:text-white h-9 text-xs font-bold shadow-sm transition-all uppercase tracking-wide"
                                    >
                                        Restablecer Datos de Ventas
                                    </Button>
                                </div>
                            </Card>

                            {/* Logout Button */}
                            <Button
                                onClick={handleLogout}
                                className="w-full bg-gray-900 text-white hover:bg-black font-bold h-12 rounded-xl shadow-lg hover:shadow-xl flex items-center justify-center gap-3 mt-4 transition-all hover:scale-[1.02]"
                            >
                                <LogOut size={18} />
                                CERRAR SESIÓN
                            </Button>

                        </>
                    )}

                </div>

                {/* Footer */}
                <div className="bg-gray-50 p-3 text-center border-t border-gray-100 flex-shrink-0">
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                        PanPanocha POS v1.0 • {new Date().getFullYear()}
                    </p>
                </div>
            </div>

            {/* Auth Modal for Dangerous Actions */}
            {showAuthModal && (
                <PinCodeModal
                    onClose={() => setShowAuthModal(false)}
                    onSubmit={handleResetData}
                    title="Autorización Requerida"
                    subtitle="Ingresa el PIN de administrador para restablecer los datos"
                />
            )}
        </div>
    );
}
