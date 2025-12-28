import { useState, useEffect } from 'react';
import { usePosStore } from '../../store';
import { Eye, EyeOff, Lock, Mail, ArrowRight, User } from 'lucide-react';
import { brandConfig } from '@panpanocha/config';
import { BrandBackground } from '../pos/BrandBackground';
import { LoadingOverlay } from '../Loading';

export function LoginScreen() {
    const { login, isLoading } = usePosStore();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [recentEmails, setRecentEmails] = useState<string[]>([]);

    // Load recent emails from localStorage
    useEffect(() => {
        const saved = localStorage.getItem('pos-recent-emails');
        if (saved) {
            try {
                setRecentEmails(JSON.parse(saved));
            } catch { }
        }
    }, []);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        try {
            await login(email, password);

            // Save email to recent list
            const updated = [email, ...recentEmails.filter(e => e !== email)].slice(0, 3);
            localStorage.setItem('pos-recent-emails', JSON.stringify(updated));
        } catch (err: any) {
            console.error(err);
            setError(err.message === 'Invalid login credentials' ? 'Credenciales incorrectas.' : err.message);
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
                    <div className="mb-8">
                        <h2 className="text-xl font-bold text-gray-800 mb-1">Bienvenido</h2>
                        <p className="text-sm text-gray-500">Inicia sesión para sincronizar y operar.</p>
                    </div>

                    <form onSubmit={handleLogin} className="space-y-6">
                        <div className="space-y-4">
                            {/* Recent Emails (Quick Select) */}
                            {recentEmails.length > 0 && (
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-wider ml-1">
                                        Usuarios Recientes
                                    </label>
                                    <div className="flex flex-wrap gap-2">
                                        {recentEmails.map((e) => (
                                            <button
                                                key={e}
                                                type="button"
                                                onClick={() => setEmail(e)}
                                                className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${email === e
                                                    ? 'bg-brand-primary text-white shadow-md'
                                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                                    } flex items-center gap-2`}
                                            >
                                                <User size={14} />
                                                {e.split('@')[0].toUpperCase()}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Email Input */}
                            <div className="group">
                                <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wider ml-1">
                                    Correo Electrónico
                                </label>
                                <div className="relative transition-all duration-300 focus-within:scale-[1.02]">
                                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-brand-primary transition-colors h-5 w-5" />
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="ejemplo@panpanocha.com"
                                        className="w-full pl-12 pr-4 py-3 rounded-xl border border-gray-300 focus:border-brand-primary focus:ring-1 focus:ring-brand-primary outline-none text-gray-800 text-sm shadow-sm"
                                    />
                                </div>
                            </div>

                            {/* Password Input */}
                            <div className="group">
                                <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wider ml-1">
                                    Contraseña
                                </label>
                                <div className="relative transition-all duration-300 focus-within:scale-[1.02]">
                                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-brand-primary transition-colors h-5 w-5" />
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder="••••••••"
                                        className="w-full pl-12 pr-12 py-3 rounded-xl border border-gray-300 focus:border-brand-primary focus:ring-1 focus:ring-brand-primary outline-none text-gray-800 text-sm shadow-sm"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                                    >
                                        {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Error Message */}
                        {error && (
                            <div className="bg-red-50 text-red-600 p-4 rounded-xl text-sm flex items-start gap-3 border border-red-100">
                                <span className="text-lg">⚠️</span>
                                <p className="font-medium">{error}</p>
                            </div>
                        )}

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={isLoading}
                            className={`
                                w-full bg-brand-primary hover:bg-brand-secondary text-white
                                font-bold py-4 px-4 rounded-xl transition-all flex items-center justify-center
                                shadow-lg shadow-brand-primary/30 hover:shadow-xl hover:shadow-brand-primary/40
                                hover:-translate-y-0.5 active:translate-y-0 uppercase font-display tracking-widest
                                ${isLoading ? 'opacity-80 cursor-wait' : ''}
                            `}
                        >
                            {isLoading ? (
                                <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            ) : (
                                <>
                                    Iniciar Sesión <ArrowRight className="ml-2 h-5 w-5" />
                                </>
                            )}
                        </button>
                    </form>

                    <div className="mt-8 text-center text-xs text-gray-400">
                        Nota: Login con Google no disponible en versión de escritorio.
                    </div>

                    {/* Footer */}
                    <p className="text-center text-brand-secondary/40 text-xs font-semibold mt-8 uppercase tracking-widest">
                        &copy; 2025 PanPanocha Ecosystem
                    </p>
                </div>
            </div>
            <LoadingOverlay message="Iniciando sesión..." show={isLoading} />
        </div>
    );
}
