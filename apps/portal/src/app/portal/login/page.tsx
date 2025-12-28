'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff, Lock, Mail, ArrowRight } from 'lucide-react'
import Image from 'next/image'
import { Alert, AlertDescription, AlertTitle } from '@panpanocha/ui';

export default function LoginPage() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [showPassword, setShowPassword] = useState(false)
    const router = useRouter()

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError(null)

        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password,
            })

            if (error) throw error

            // Successful login
            router.push('/portal/dashboard')
            router.refresh()
        } catch (err: any) {
            console.error(err)
            setError(err.message === 'Invalid login credentials' ? 'Credenciales incorrectas. Verifique su correo y contraseña.' : err.message)
        } finally {
            setLoading(false)
        }
    }

    const handleGoogleLogin = async () => {
        try {
            const { error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: `${window.location.origin}/auth/callback`,
                    queryParams: {
                        access_type: 'offline',
                        prompt: 'consent',
                    },
                },
            })
            if (error) throw error
        } catch (error: any) {
            console.error('Error logging in with Google:', error.message)
            setError(error.message)
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center relative overflow-hidden">


            <div className="w-full max-w-md mx-4 relative z-10">
                {/* Brand Header */}
                {/* Brand Header */}
                <div className="bg-white/85 backdrop-blur-sm p-8 rounded-[2.5rem] border border-white/60 shadow-lg text-center mb-6 animate-fade-in-up">
                    <div className="inline-flex items-center justify-center h-24 w-24 rounded-full bg-white shadow-lg shadow-pp-gold/20 mb-6 p-4 ring-1 ring-pp-gold/10">
                        <Image
                            src="/images/logo_v2.png"
                            alt="PanPanocha Logo"
                            width={100}
                            height={100}
                            className="w-full h-full object-contain"
                            priority
                        />
                    </div>
                    <h1 className="text-3xl font-bold text-pp-brown font-display uppercase tracking-widest mb-2">
                        PanPanocha
                    </h1>
                    <p className="text-pp-brown/70 font-medium">Portal de Gestión Operativa</p>
                </div>

                {/* Login Card */}
                <div className="bg-white/80 backdrop-blur-md rounded-3xl shadow-2xl p-8 border border-white/50 animate-fade-in-up-delay">
                    {/* Welcome Text */}
                    <div className="mb-8">
                        <h2 className="text-xl font-bold text-gray-800 mb-1">Bienvenido de nuevo</h2>
                        <p className="text-sm text-gray-500">Ingresa tus credenciales para acceder al sistema.</p>
                    </div>

                    <form onSubmit={handleLogin} className="space-y-6">
                        <div className="space-y-4">
                            {/* Email Input */}
                            <div className="group">
                                <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wider ml-1">
                                    Correo Electrónico
                                </label>
                                <div className="relative transition-all duration-300 focus-within:scale-[1.02]">
                                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-pp-gold transition-colors h-5 w-5" />
                                    <input
                                        type="email"
                                        required
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="w-full pl-12 pr-4 py-3.5 bg-white border border-gray-200 rounded-xl focus:ring-4 focus:ring-pp-gold/10 focus:border-pp-gold transition-all outline-none font-medium text-gray-700 placeholder:text-gray-300 shadow-sm"
                                        placeholder="usuario@panpanocha.com"
                                    />
                                </div>
                            </div>

                            {/* Password Input */}
                            <div className="group">
                                <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wider ml-1">
                                    Contraseña
                                </label>
                                <div className="relative transition-all duration-300 focus-within:scale-[1.02]">
                                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-pp-gold transition-colors h-5 w-5" />
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        required
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="w-full pl-12 pr-12 py-3.5 bg-white border border-gray-200 rounded-xl focus:ring-4 focus:ring-pp-gold/10 focus:border-pp-gold transition-all outline-none font-medium text-gray-700 placeholder:text-gray-300 shadow-sm"
                                        placeholder="••••••••"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
                                    >
                                        {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Error Message */}
                        {error && (
                            <Alert variant="destructive" className="animate-in slide-in-from-top-2">
                                <AlertTitle>Error</AlertTitle>
                                <AlertDescription>{error}</AlertDescription>
                            </Alert>
                        )}

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={loading}
                            className={`
                                w-full bg-gradient-to-r from-pp-gold to-[#e5a00d] hover:to-pp-gold text-pp-brown 
                                font-bold py-4 px-4 rounded-xl transition-all flex items-center justify-center 
                                shadow-lg shadow-pp-gold/30 hover:shadow-xl hover:shadow-pp-gold/40 
                                hover:-translate-y-0.5 active:translate-y-0 uppercase font-display tracking-widest
                                ${loading ? 'opacity-80 cursor-wait' : ''}
                            `}
                        >
                            {loading ? (
                                <div className="h-5 w-5 border-2 border-pp-brown border-t-transparent rounded-full animate-spin" />
                            ) : (
                                <>
                                    Iniciar Sesión <ArrowRight className="ml-2 h-5 w-5" />
                                </>
                            )}
                        </button>
                    </form>

                    <div className="relative my-6">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-gray-200"></div>
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                            <span className="bg-white px-2 text-gray-500 font-bold tracking-widest">O continuar con</span>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={handleGoogleLogin}
                        className="w-full flex items-center justify-center gap-3 bg-white text-gray-700 font-bold py-3.5 px-4 rounded-xl border border-gray-200 hover:bg-gray-50 transition-all shadow-sm hover:shadow-md"
                    >
                        <svg className="h-5 w-5" viewBox="0 0 24 24">
                            <path
                                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                                fill="#4285F4"
                            />
                            <path
                                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                                fill="#34A853"
                            />
                            <path
                                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.26.81-.58z"
                                fill="#FBBC05"
                            />
                            <path
                                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                                fill="#EA4335"
                            />
                        </svg>
                        Iniciar sesión con Google
                    </button>
                </div>

                {/* Footer */}
                <p className="text-center text-pp-brown/40 text-xs font-semibold mt-8 uppercase tracking-widest">
                    &copy; 2025 PanPanocha Ecosystem
                </p>
            </div>
        </div>
    )
}
