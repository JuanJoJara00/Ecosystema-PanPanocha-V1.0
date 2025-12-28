import { useState, useEffect } from 'react';
import { Button } from '@panpanocha/ui';
import { X, Users, DollarSign, ArrowRight, Check, RefreshCw } from 'lucide-react';
import { usePosStore } from '../../store';
import { formatCurrency } from '@panpanocha/shared';
import { LoadingOverlay } from '../Loading';

interface TipsDistributionModalProps {
    onClose: () => void;
    onComplete: (deliveredAmount: number, transferredAmount: number) => void;
    shiftTips: number; // Tips from current shift
    pendingTips: number; // Tips transferred from previous shifts
}

interface EmployeeDistribution {
    id: string;
    name: string;
    amount: number; // Their share of tips
    action: 'deliver' | 'transfer'; // Individual choice
}

interface User {
    id: string;
    full_name: string;
    role: string;
}

export function TipsDistributionModal({ onClose, onComplete, shiftTips, pendingTips }: TipsDistributionModalProps) {
    const { currentShift, currentUser } = usePosStore();

    const [employees, setEmployees] = useState<EmployeeDistribution[]>([]);
    const [saving, setSaving] = useState(false);
    const [loading, setLoading] = useState(true);

    const totalTips = shiftTips + pendingTips;

    // Fetch employees and calculate distribution on mount
    useEffect(() => {
        const loadEmployees = async () => {
            try {
                const users: User[] = await window.electron.getUsers();
                const eligibleUsers = users.filter(
                    (u: User) => u.role === 'cajero' || u.role === 'mesero' || u.role === 'encargado'
                );

                const count = eligibleUsers.length;
                const amountPerPerson = count > 0 ? Math.floor(totalTips / count) : 0;
                const remainder = count > 0 ? totalTips - (amountPerPerson * count) : 0;

                const distributedEmployees = eligibleUsers.map((u: User, idx: number) => ({
                    id: u.id,
                    name: u.full_name,
                    amount: amountPerPerson + (idx === 0 ? remainder : 0), // First person gets remainder
                    action: 'deliver' as const // Default to deliver
                }));

                setEmployees(distributedEmployees);
            } catch (error) {
                console.error('[TipsDistribution] Error loading employees:', error);
            } finally {
                setLoading(false);
            }
        };
        loadEmployees();
    }, [totalTips]);

    // Toggle individual employee action
    const toggleEmployeeAction = (id: string) => {
        setEmployees(prev =>
            prev.map(e => e.id === id
                ? { ...e, action: e.action === 'deliver' ? 'transfer' : 'deliver' }
                : e
            )
        );
    };

    // Set all to deliver
    const deliverAll = () => {
        setEmployees(prev => prev.map(e => ({ ...e, action: 'deliver' })));
    };

    // Set all to transfer
    const transferAll = () => {
        setEmployees(prev => prev.map(e => ({ ...e, action: 'transfer' })));
    };

    // Calculate totals
    const deliveredAmount = employees.filter(e => e.action === 'deliver').reduce((sum, e) => sum + e.amount, 0);
    const transferredAmount = employees.filter(e => e.action === 'transfer').reduce((sum, e) => sum + e.amount, 0);

    const handleConfirm = async () => {
        if (!currentShift) return;

        setSaving(true);
        try {
            // Create distributions for delivered tips
            const deliveredEmployees = employees.filter(e => e.action === 'deliver');
            if (deliveredEmployees.length > 0) {
                const distributions = deliveredEmployees.map(e => ({
                    id: crypto.randomUUID(),
                    shift_id: currentShift.id,
                    employee_id: e.id,
                    employee_name: e.name,
                    amount: e.amount
                }));

                await window.electron.createTipDistributions(distributions);

                // Create expense for delivered tips (this is cash out of the drawer)
                await window.electron.createExpense({
                    id: crypto.randomUUID(),
                    branch_id: currentShift.branch_id,
                    shift_id: currentShift.id,
                    user_id: currentUser?.id || 'unknown',
                    description: `Propinas entregadas (${deliveredEmployees.length} empleados):\n${deliveredEmployees.map(e => `- ${e.name}: ${formatCurrency(e.amount)}`).join('\n')}`,
                    amount: deliveredAmount,
                    category: 'propinas',
                    created_at: new Date().toISOString()
                });
            }

            // Complete with both amounts - the parent will handle pending_tips update
            onComplete(deliveredAmount, transferredAmount);
        } catch (error) {
            console.error('[TipsDistribution] Error:', error);
            alert('Error al procesar propinas');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return <LoadingOverlay message="Cargando empleados..." show={true} />;
    }

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
            <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95">
                {/* Header */}
                <div className="bg-gradient-to-r from-amber-500 to-yellow-500 p-5 text-white">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                                <DollarSign size={24} />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold">Distribución de Propinas</h2>
                                <p className="text-white/80 text-sm">Paso 1 de 3</p>
                            </div>
                        </div>
                        <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-full transition-colors">
                            <X size={24} />
                        </button>
                    </div>
                </div>

                <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
                    {/* Tips Summary */}
                    <div className="bg-amber-50 rounded-xl p-4 border border-amber-200">
                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                                <span className="text-gray-600">Propinas del turno:</span>
                                <span className="font-bold text-amber-700">{formatCurrency(shiftTips)}</span>
                            </div>
                            {pendingTips > 0 && (
                                <div className="flex justify-between">
                                    <span className="text-gray-600">Propinas acumuladas:</span>
                                    <span className="font-bold text-amber-700">{formatCurrency(pendingTips)}</span>
                                </div>
                            )}
                            <div className="border-t border-amber-200 pt-2 flex justify-between">
                                <span className="font-bold text-gray-800">TOTAL A DISTRIBUIR:</span>
                                <span className="font-bold text-amber-800 text-lg">{formatCurrency(totalTips)}</span>
                            </div>
                        </div>
                    </div>

                    {/* Quick Actions */}
                    <div className="flex gap-2">
                        <button
                            onClick={deliverAll}
                            className="flex-1 py-2 px-3 rounded-lg border border-green-300 bg-green-50 text-green-700 text-sm font-medium hover:bg-green-100 transition-colors flex items-center justify-center gap-1"
                        >
                            <Check size={14} />
                            Entregar todos
                        </button>
                        <button
                            onClick={transferAll}
                            className="flex-1 py-2 px-3 rounded-lg border border-blue-300 bg-blue-50 text-blue-700 text-sm font-medium hover:bg-blue-100 transition-colors flex items-center justify-center gap-1"
                        >
                            <RefreshCw size={14} />
                            Transferir todos
                        </button>
                    </div>

                    {/* Employee List with Individual Actions */}
                    <div className="space-y-3">
                        <h3 className="font-bold text-gray-800 flex items-center gap-2">
                            <Users size={18} />
                            Empleados ({employees.length})
                        </h3>

                        <div className="space-y-2 max-h-48 overflow-y-auto">
                            {employees.length === 0 ? (
                                <div className="flex flex-col items-center gap-3 py-4">
                                    <p className="text-gray-500 text-sm text-center">
                                        No hay empleados registrados
                                    </p>
                                    <button
                                        onClick={async () => {
                                            if (confirm('¿Generar empleados de prueba? Utilizaremos datos locales si el servidor no responde.')) {
                                                setLoading(true);

                                                // Attempt backend generation (fire and forget/catch)
                                                try {
                                                    // @ts-ignore
                                                    await window.electron.devGenerateEmployees().catch(e => console.warn('Backend gen error:', e));
                                                } catch (e) {
                                                    console.warn('Backend gen fail', e);
                                                }

                                                // FALLBACK: Generate local mock data for UI testing immediately
                                                const mockUsers = [
                                                    { id: 'mock-1', full_name: 'Juan Pérez (Dev)', role: 'mesero' },
                                                    { id: 'mock-2', full_name: 'Ana Gómez (Dev)', role: 'cajero' },
                                                    { id: 'mock-3', full_name: 'Carlos Ruiz (Dev)', role: 'mesero' },
                                                    { id: 'mock-4', full_name: 'Maria Lopez (Dev)', role: 'kitchen' }
                                                ];

                                                const count = mockUsers.length;
                                                const amountPerPerson = count > 0 ? Math.floor(totalTips / count) : 0;
                                                const remainder = count > 0 ? totalTips - (amountPerPerson * count) : 0;

                                                const distributedEmployees = mockUsers.map((u, idx) => ({
                                                    id: u.id,
                                                    name: u.full_name,
                                                    amount: amountPerPerson + (idx === 0 ? remainder : 0),
                                                    action: 'deliver' as const
                                                }));

                                                setEmployees(distributedEmployees);
                                                setLoading(false);
                                            }
                                        }}
                                        className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-600 px-3 py-1.5 rounded-lg border border-gray-300 font-medium"
                                    >
                                        🛠️ Generar Mock (Dev)
                                    </button>
                                </div>
                            ) : (
                                employees.map(emp => (
                                    <div
                                        key={emp.id}
                                        className={`flex items-center justify-between p-3 rounded-xl border-2 transition-all ${emp.action === 'deliver'
                                            ? 'border-green-300 bg-green-50'
                                            : 'border-blue-300 bg-blue-50'
                                            }`}
                                    >
                                        <div className="flex-1">
                                            <span className="font-medium text-gray-800">{emp.name}</span>
                                            <p className="text-sm font-bold text-gray-600">
                                                {formatCurrency(emp.amount)}
                                            </p>
                                        </div>

                                        {/* Individual Toggle */}
                                        <button
                                            onClick={() => toggleEmployeeAction(emp.id)}
                                            className={`py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${emp.action === 'deliver'
                                                ? 'bg-green-500 text-white hover:bg-green-600'
                                                : 'bg-blue-500 text-white hover:bg-blue-600'
                                                }`}
                                        >
                                            {emp.action === 'deliver' ? (
                                                <>
                                                    <Check size={12} />
                                                    Entregar
                                                </>
                                            ) : (
                                                <>
                                                    <RefreshCw size={12} />
                                                    Transferir
                                                </>
                                            )}
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Summary */}
                    <div className="space-y-2">
                        {deliveredAmount > 0 && (
                            <div className="bg-green-50 rounded-xl p-3 border border-green-200 flex justify-between items-center">
                                <span className="text-green-700 text-sm font-medium flex items-center gap-2">
                                    <Check size={16} />
                                    A entregar ahora (gasto de caja):
                                </span>
                                <span className="font-bold text-green-800">{formatCurrency(deliveredAmount)}</span>
                            </div>
                        )}
                        {transferredAmount > 0 && (
                            <div className="bg-blue-50 rounded-xl p-3 border border-blue-200 flex justify-between items-center">
                                <span className="text-blue-700 text-sm font-medium flex items-center gap-2">
                                    <RefreshCw size={16} />
                                    Transferir al siguiente turno:
                                </span>
                                <span className="font-bold text-blue-800">{formatCurrency(transferredAmount)}</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="border-t p-4 flex gap-3">
                    <Button
                        onClick={onClose}
                        className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700"
                    >
                        Cancelar
                    </Button>
                    <Button
                        onClick={handleConfirm}
                        disabled={saving || employees.length === 0}
                        className="flex-1 bg-amber-500 hover:bg-amber-600 text-white flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                        {saving ? 'Procesando...' : (
                            <>
                                Confirmar
                                <ArrowRight size={18} />
                            </>
                        )}
                    </Button>
                </div>
            </div>
        </div>
    );
}
