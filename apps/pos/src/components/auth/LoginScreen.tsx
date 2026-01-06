import { useState } from 'react';
import { usePosStore } from '../../store';
import { ArrowRight, Delete } from 'lucide-react';
import { brandConfig } from '@panpanocha/config';
import { BrandBackground } from '../pos/BrandBackground';
import { LoadingOverlay } from '../Loading';

export function LoginScreen() {
    // isLoading removed as unused
    const [pin, setPin] = useState('');
    const [isPinLoading, setIsPinLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleDigit = (digit: string) => {
        if (pin.length < 4) {
            setPin(prev => prev + digit);
        }
    };

    const handleBackspace = () => {
        setPin(prev => prev.slice(0, -1));
    };

    const handlePinLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setIsPinLoading(true);

        try {
            // 1. Call PIN Login API
            const response = await fetch(`${import.meta.env.VITE_PORTAL_URL || 'http://localhost:3000'}/api/auth/pin-login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ pin })
            });

            const data = await response.json();

            if (!response.ok) {
                // Show specific DB error if available for debugging
                let msg = data.details?.message
                    ? `Error: ${data.details.message}`
                    : (data.error || 'Error de autenticación');

                if (data.debug_key_prefix) {
                    msg += ` (Key: ${data.debug_key_prefix})`;
                }
                throw new Error(msg);
            }

            // 2. Encrypt Token for Local Storage
            const encryptedToken = await window.electron.encrypt(data.auth_token);

            // 3. Store Data
            localStorage.setItem('panpanocha_device_token', encryptedToken);
            localStorage.setItem('panpanocha_org_id', data.user.organization_id);

            // Store Branch ID if assigned (Staff), or clear it (Owner/Dev) to force selection
            if (data.user.branch_id) {
                localStorage.setItem('panpanocha_branch_id', data.user.branch_id);
            } else {
                localStorage.removeItem('panpanocha_branch_id');
            }

            // 4. Force Re-initialization to update State (isProvisioned, currentUser, etc.)
            await usePosStore.getState().initialize();

            // Note: App.tsx will auto-detect the changes and switch views

        } catch (err: any) {
            console.error(err);
            setError(err.message);
            setPin(''); // Reset PIN on error
        } finally {
            setIsPinLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 relative overflow-hidden font-sans">
            <BrandBackground opacity={0.15} />

            <div className="w-full max-w-md mx-4 relative z-10">
                {/* Brand Header */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center h-32 w-32 rounded-full bg-white shadow-lg shadow-brand-primary/20 mb-6 p-5 ring-1 ring-brand-primary/10">
                        <img
                            src={brandConfig.company.logoUrl}
                            alt="PanPanocha Logo"
                            className="w-full h-full object-contain"
                        />
                    </div>
                    <h1 className="text-4xl font-bold text-brand-primary font-display uppercase tracking-widest mb-2">
                        {brandConfig.company.name}
                    </h1>
                    <p className="text-brand-secondary/70 font-medium">Punto de Venta (POS)</p>
                </div>

                {/* Login Card */}
                <div className="bg-white/80 backdrop-blur-md rounded-3xl shadow-2xl p-8">
                    {/* Welcome Text */}
                    <div className="mb-6 text-center">
                        <h2 className="text-xl font-bold text-gray-800 mb-1">ACCESO CON PIN</h2>
                        <p className="text-sm text-gray-500">Ingresa tu código de 4 dígitos para operar.</p>
                    </div>

                    <form onSubmit={handlePinLogin} className="space-y-6">
                        {/* PIN Display (Dots) */}
                        <div className="flex justify-center gap-4 mb-4">
                            {[0, 1, 2, 3].map((i) => (
                                <div
                                    key={i}
                                    className={`w-4 h-4 rounded-full transition-all duration-300 ${i < pin.length
                                        ? 'bg-brand-primary scale-125 shadow-sm ring-2 ring-brand-primary/30'
                                        : 'bg-gray-200 border border-gray-300'
                                        }`}
                                />
                            ))}
                        </div>

                        {/* Error Message */}
                        {error && (
                            <div className="bg-red-50 text-red-600 p-3 rounded-xl text-xs flex items-center justify-center gap-2 border border-red-100 mb-4 animate-shake">
                                <span className="text-base">⚠️</span>
                                <p className="font-bold">{error}</p>
                            </div>
                        )}

                        {/* Touch Keypad */}
                        <div className="grid grid-cols-3 gap-3 max-w-[280px] mx-auto mb-6 select-none">
                            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                                <button
                                    key={num}
                                    type="button"
                                    onClick={() => handleDigit(num.toString())}
                                    className="h-16 rounded-2xl bg-white border-b-4 border-gray-200 active:border-b-0 active:translate-y-1 text-2xl font-bold text-gray-700 active:bg-brand-primary active:text-white transition-all shadow-sm hover:shadow-md touch-manipulation"
                                >
                                    {num}
                                </button>
                            ))}
                            {/* Row 4: 00, 0, Backspace */}
                            <button
                                type="button"
                                onClick={() => {
                                    if (pin.length <= 2) setPin(prev => prev + '00');
                                    else if (pin.length === 3) setPin(prev => prev + '0');
                                }}
                                className="h-16 rounded-2xl bg-white border-b-4 border-gray-200 active:border-b-0 active:translate-y-1 text-xl font-bold text-gray-700 active:bg-brand-primary active:text-white transition-all shadow-sm hover:shadow-md touch-manipulation"
                            >
                                00
                            </button>
                            <button
                                type="button"
                                onClick={() => handleDigit('0')}
                                className="h-16 rounded-2xl bg-white border-b-4 border-gray-200 active:border-b-0 active:translate-y-1 text-2xl font-bold text-gray-700 active:bg-brand-primary active:text-white transition-all shadow-sm hover:shadow-md touch-manipulation"
                            >
                                0
                            </button>
                            <button
                                type="button"
                                onClick={handleBackspace}
                                aria-label="Borrar último dígito"
                                className="h-16 rounded-2xl bg-red-50 border-b-4 border-red-100 active:border-b-0 active:translate-y-1 text-red-500 active:bg-red-500 active:text-white transition-all shadow-sm flex items-center justify-center hover:bg-red-100 touch-manipulation"
                            >
                                <Delete size={24} />
                            </button>
                        </div>

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={isPinLoading || pin.length !== 4}
                            className={`
                                w-full bg-brand-primary hover:bg-brand-secondary text-white
                                font-bold py-4 px-4 rounded-xl transition-all flex items-center justify-center
                                shadow-lg shadow-brand-primary/30 hover:shadow-xl hover:shadow-brand-primary/40
                                hover:-translate-y-0.5 active:translate-y-0 uppercase font-display tracking-widest
                                ${(isPinLoading || pin.length !== 4) ? 'opacity-50 cursor-not-allowed' : ''}
                            `}
                        >
                            {isPinLoading ? (
                                <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            ) : (
                                <>
                                    INGRESAR <ArrowRight className="ml-2 h-5 w-5" />
                                </>
                            )}
                        </button>
                    </form>

                    {/* Reset/Unlink Button */}
                    <div className="mt-8 pt-6 border-t border-gray-100">
                        <button
                            type="button"
                            onClick={() => {
                                if (window.confirm('¿Desea desvincular este dispositivo y escanear un nuevo código QR?')) {
                                    localStorage.removeItem('panpanocha_device_token');
                                    localStorage.removeItem('panpanocha_org_id');
                                    localStorage.removeItem('panpanocha_branch_id');
                                    window.location.reload();
                                }
                            }}
                            className="w-full bg-white border-2 border-dashed border-gray-300 hover:border-brand-primary text-gray-500 hover:text-brand-primary font-bold py-3 px-4 rounded-xl transition-all flex items-center justify-center text-xs uppercase tracking-wider"
                        >
                            <div className="p-1 border border-current rounded mr-2 opacity-50">
                                <div className="flex gap-0.5">
                                    <div className="w-1 h-1 bg-current rounded-sm"></div>
                                    <div className="w-1 h-1 bg-current rounded-sm"></div>
                                </div>
                                <div className="flex gap-0.5 mt-0.5">
                                    <div className="w-1 h-1 bg-current rounded-sm"></div>
                                    <div className="w-1 h-1 bg-current rounded-sm"></div>
                                </div>
                            </div>
                            Vincular (QR)
                        </button>
                    </div>

                    {/* Footer */}
                    <p className="text-center text-brand-secondary/40 text-xs font-semibold mt-8 uppercase tracking-widest">
                        &copy; 2026 PanPanocha Ecosystem
                    </p>
                </div>
            </div>
            <LoadingOverlay message="Verificando PIN..." show={isPinLoading} />
        </div>
    );
}
