import { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { brandConfig } from '@panpanocha/config';
import { usePosStore } from '../../store';
import { BrandBackground } from '../pos/BrandBackground';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export function ProvisioningScreen() {
    const { initialize } = usePosStore();
    const [status, setStatus] = useState<'init' | 'polling' | 'approved' | 'error'>('init');
    const [qrUrl, setQrUrl] = useState<string | null>(null);
    const [sessionId, setSessionId] = useState<string | null>(null);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [machineId, setMachineId] = useState<string>('unknown');

    // 1. Get Hardware ID on mount
    useEffect(() => {
        window.electron.getMachineId()
            .then((id: string) => {
                setMachineId(id);
                // Auto-start session
                startProvisioning(id);
            })
            .catch((err: any) => {
                console.error("Failed to get machine ID", err);
                setErrorMsg("Error identificando equipo: " + err.message);
                setStatus('error');
            });
    }, []);

    const startProvisioning = async (fingerprint: string) => {
        try {
            console.log("Starting provisioning for:", fingerprint);
            const res = await fetch(`${API_BASE_URL}/api/provision/session`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    fingerprint,
                    device_name: `POS-${fingerprint.substring(0, 4).toUpperCase()}`,
                    device_type: 'pos'
                })
            });

            if (!res.ok) {
                const txt = await res.text();
                throw new Error(txt || 'Failed to init session');
            }

            const data = await res.json();
            console.log('PROVISIONING_SESSION_ID:', data.session_id);
            setSessionId(data.session_id);
            setQrUrl(data.qr_url);
            setStatus('polling');

        } catch (e: any) {
            console.error(e);
            setErrorMsg("Error conectando con servidor: " + e.message);
            setStatus('error');
        }
    };

    // 2. Poll for Status
    useEffect(() => {
        if (status !== 'polling' || !sessionId) return;

        const interval = setInterval(async () => {
            try {
                const res = await fetch(`${API_BASE_URL}/api/provision/poll?session_id=${sessionId}`);
                if (!res.ok) return; // Keep retrying?

                const data = await res.json();

                if (data.status === 'approved' && data.auth_token) {
                    clearInterval(interval);
                    // data.organization_id comes from the poll response (we added it)
                    await handleApproval(data.auth_token, data.organization_id);
                } else if (data.status === 'rejected') {
                    clearInterval(interval);
                    setErrorMsg("Solicitud rechazada por administrador.");
                    setStatus('error');
                }
            } catch (e) {
                console.warn("Poll failed", e);
            }
        }, 3000);

        return () => clearInterval(interval);
    }, [status, sessionId]);

    const handleApproval = async (token: string, orgId?: string) => {
        try {
            setStatus('approved');
            console.log("Device Approved! Encrypting token...");

            // Helper to decode JWT (Base64Url)
            const parseJwt = (token: string) => {
                try {
                    return JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
                } catch (e) { return {}; }
            };

            const claims = parseJwt(token);
            const deviceId = claims.sub;
            const finalOrgId = claims.organization_id || orgId;

            // Encrypt token via Main Process (IPC)
            const encryptedToken = await window.electron.encrypt(token);

            // Store encrypted token in LocalStorage (persists across reloads)
            localStorage.setItem('panpanocha_device_token', encryptedToken);
            if (finalOrgId) localStorage.setItem('panpanocha_org_id', finalOrgId);
            if (deviceId) localStorage.setItem('panpanocha_device_id', deviceId);

            // Reload app to trigger State Init with isProvisioned=true
            setTimeout(() => {
                window.location.reload();
            }, 2000);

        } catch (e: any) {
            console.error("Failed to secure token", e);
            setErrorMsg("Error guardando credenciales seguras.");
            setStatus('error');
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 relative overflow-hidden font-sans">
            <BrandBackground opacity={0.15} />

            <div className="w-full max-w-lg mx-4 relative z-10">
                <div className="bg-white/90 backdrop-blur-md rounded-3xl shadow-2xl p-10 border border-gray-100 text-center">

                    {/* Header */}
                    <div className="mb-8">
                        <img
                            src={brandConfig.company.logoUrl}
                            alt="Logo"
                            className="h-16 w-16 mx-auto mb-4 object-contain opacity-80"
                        />
                        <h1 className="text-2xl font-bold text-gray-800 uppercase tracking-widest font-display">
                            Vincular Dispositivo
                        </h1>
                        <p className="text-gray-500 mt-2 text-sm">
                            Escanea este código con tu celular (Gestor) para autorizar este POS.
                        </p>
                    </div>

                    {/* Content */}
                    <div className="flex flex-col items-center justify-center min-h-[300px]">
                        {status === 'init' && (
                            <div className="animate-pulse text-gray-400">Generando sesión...</div>
                        )}

                        {status === 'polling' && qrUrl && (
                            <>
                                <div className="bg-white p-4 rounded-xl shadow-inner border border-gray-200 mb-6">
                                    <QRCodeSVG value={qrUrl} size={256} />
                                </div>
                                <div className="text-xs text-brand-primary font-mono bg-brand-primary/10 px-4 py-2 rounded-full animate-pulse">
                                    ID: {machineId.substring(0, 8)}...
                                </div>
                            </>
                        )}

                        {status === 'approved' && (
                            <div className="text-green-600 animate-bounce">
                                <div className="text-5xl mb-4">✅</div>
                                <h2 className="text-xl font-bold">¡Vinculado Exitosamente!</h2>
                                <p className="text-sm mt-2">Reiniciando sistema...</p>
                            </div>
                        )}

                        {status === 'error' && (
                            <div className="text-red-500">
                                <div className="text-5xl mb-4">⚠️</div>
                                <p className="font-bold">{errorMsg}</p>
                                <button
                                    onClick={() => window.location.reload()}
                                    className="mt-6 px-6 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg transition-colors text-sm font-bold"
                                >
                                    Reintentar
                                </button>
                            </div>
                        )}
                    </div>

                    <div className="mt-8 pt-6 border-t border-gray-100">
                        <p className="text-xs text-gray-400 font-mono">
                            Fingerprint: {machineId}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
