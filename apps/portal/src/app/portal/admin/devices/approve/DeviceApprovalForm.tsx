'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@/lib/supabase';
import { Loader2, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { ProvisioningSession } from '@panpanocha/types';

interface Props {
    session: ProvisioningSession;
    branches: { id: string; name: string }[];
}

export function DeviceApprovalForm({ session, branches }: Props) {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [deviceName, setDeviceName] = useState(session.device_name || '');
    const [selectedBranch, setSelectedBranch] = useState(branches[0]?.id || '');
    const [error, setError] = useState<string | null>(null);
    const [status, setStatus] = useState<'pending' | 'success' | 'rejected'>(session.status === 'waiting' ? 'pending' : session.status as any);

    if (status !== 'pending' && status !== 'waiting') {
        const isApproved = status === 'approved' || status === 'success';
        return (
            <div className="text-center py-12">
                {isApproved ? (
                    <div className="flex flex-col items-center">
                        <CheckCircle className="h-16 w-16 text-green-500 mb-4" />
                        <h2 className="text-2xl font-bold text-gray-800">Dispositivo Aprobado</h2>
                        <p className="text-gray-600 mt-2">El POS ha sido vinculado exitosamente.</p>
                    </div>
                ) : (
                    <div className="flex flex-col items-center">
                        <XCircle className="h-16 w-16 text-red-500 mb-4" />
                        <h2 className="text-2xl font-bold text-gray-800">Solicitud Rechazada</h2>
                        <p className="text-gray-600 mt-2">Esta sesión ha sido cancelada.</p>
                    </div>
                )}
                <button
                    onClick={() => router.push('/portal/admin/devices')}
                    className="mt-8 px-6 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium"
                >
                    Volver al listado
                </button>
            </div>
        );
    }

    const handleApprove = async () => {
        if (!selectedBranch) return setError("Debes seleccionar una sede.");
        setIsLoading(true);
        setError(null);

        try {
            const res = await fetch('/api/provision/approve', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    session_id: session.id,
                    branch_id: selectedBranch,
                    device_name: deviceName
                })
            });

            const data = await res.json();

            if (!res.ok) throw new Error(data.error || 'Failed to approve');

            setStatus('success');
            setTimeout(() => {
                router.refresh();
            }, 1000);

        } catch (e: any) {
            console.error(e);
            setError(e.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleReject = async () => {
        if (!confirm("¿Estás seguro de rechazar esta solicitud?")) return;
        setIsLoading(true);

        try {
            const supabase = createBrowserClient();
            const { error } = await supabase
                .from('provisioning_sessions')
                .update({ status: 'rejected' })
                .eq('id', session.id);

            if (error) throw error;
            setStatus('rejected');

        } catch (e: any) {
            console.error(e);
            setError("Error rechazando sesión: " + e.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="max-w-xl mx-auto bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100">
            {/* Header */}
            <div className="bg-gradient-to-r from-brand-primary to-brand-primary/80 p-6 text-white text-center">
                <AlertTriangle className="h-10 w-10 mx-auto mb-3 opacity-90" />
                <h1 className="text-xl font-bold uppercase tracking-widest">Nueva Solicitud de POS</h1>
                <p className="text-sm opacity-80 mt-1">Un dispositivo está intentando conectarse.</p>
            </div>

            <div className="p-8">
                {/* Device Info */}
                <div className="bg-gray-50 rounded-xl p-6 mb-8 border border-gray-200/60">
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Información del Dispositivo</h3>

                    <div className="space-y-4">
                        <div>
                            <label className="text-xs text-gray-500 font-semibold">Fingerprint ID</label>
                            <p className="font-mono text-sm bg-white border border-gray-200 px-3 py-2 rounded-lg text-gray-600 break-all">
                                {session.fingerprint}
                            </p>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-xs text-gray-500 font-semibold">IP Address</label>
                                <p className="text-sm font-medium text-gray-800">{session.ip_address || 'Descocido'}</p>
                            </div>
                            <div>
                                <label className="text-xs text-gray-500 font-semibold">Creado</label>
                                <p className="text-sm font-medium text-gray-800">Hace unos momentos</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Form */}
                <div className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Nombre del POS</label>
                        <input
                            type="text"
                            value={deviceName}
                            onChange={(e) => setDeviceName(e.target.value)}
                            className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-brand-primary focus:ring-1 focus:ring-brand-primary outline-none transition-all"
                            placeholder="Ej. Caja Principal"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Asignar a Sede</label>
                        <select
                            value={selectedBranch}
                            onChange={(e) => setSelectedBranch(e.target.value)}
                            className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-brand-primary focus:ring-1 focus:ring-brand-primary outline-none transition-all bg-white"
                        >
                            {branches.map(b => (
                                <option key={b.id} value={b.id}>{b.name}</option>
                            ))}
                        </select>
                    </div>

                    {error && (
                        <div className="bg-red-50 text-red-600 p-4 rounded-xl text-sm border border-red-100">
                            {error}
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-4 pt-4">
                        <button
                            onClick={handleReject}
                            disabled={isLoading}
                            className="px-6 py-4 rounded-xl border border-gray-200 font-bold text-gray-600 hover:bg-red-50 hover:text-red-600 hover:border-red-100 transition-all uppercase tracking-wider text-sm"
                        >
                            Rechazar
                        </button>
                        <button
                            onClick={handleApprove}
                            disabled={isLoading}
                            className="px-6 py-4 rounded-xl bg-brand-primary text-white font-bold hover:bg-brand-secondary transition-all uppercase tracking-wider text-sm shadow-lg shadow-brand-primary/20 flex items-center justify-center"
                        >
                            {isLoading ? <Loader2 className="animate-spin h-5 w-5" /> : 'Aprobar'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
