'use client'

import { useRouter } from 'next/navigation'
import { MapPin, Wallet, CalendarRange } from 'lucide-react'

export default function GestionHubPage() {
    const router = useRouter()

    return (
        <div className="min-h-[80vh] flex flex-col items-center justify-center p-8">
            <div className="bg-white/85 backdrop-blur-sm p-8 rounded-[2.5rem] border border-white/60 shadow-sm mb-12 text-center max-w-xl">
                <h1 className="text-3xl font-bold text-gray-800 mb-2 font-display uppercase tracking-wide">
                    Gestión Operativa
                </h1>
                <p className="text-gray-500 font-medium">
                    Administración de sedes, personal y recursos
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-6xl">
                {/* Sedes */}
                <div
                    onClick={() => router.push('/portal/sedes')}
                    className="cursor-pointer group relative overflow-hidden bg-white/80 backdrop-blur-xl border border-white/20 rounded-3xl p-8 flex flex-col items-center justify-center gap-6 shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98] h-[380px]"
                >
                    <div className="absolute inset-0 bg-gradient-to-br from-red-50 to-rose-50 opacity-50 group-hover:opacity-100 transition-opacity" />

                    <div className="relative z-10 w-28 h-28 bg-white rounded-full shadow-lg flex items-center justify-center p-4">
                        <MapPin className="h-14 w-14 text-red-600" />
                    </div>

                    <div className="relative z-10 text-center">
                        <h2 className="text-xl font-bold text-gray-800 font-display uppercase mb-2">
                            Sedes
                        </h2>
                        <p className="text-xs text-gray-500 font-medium px-4">
                            Configuración de puntos de venta
                        </p>
                    </div>

                    <div className="relative z-10 mt-auto">
                        <span className="inline-flex items-center gap-2 text-red-700 font-bold uppercase text-xs tracking-wider border-b-2 border-red-700/20 pb-1 group-hover:border-red-700 transition-colors">
                            Gestionar Sedes <MapPin className="h-4 w-4" />
                        </span>
                    </div>
                </div>

                {/* Nómina */}
                <div
                    onClick={() => router.push('/portal/nomina')}
                    className="cursor-pointer group relative overflow-hidden bg-white/80 backdrop-blur-xl border border-white/20 rounded-3xl p-8 flex flex-col items-center justify-center gap-6 shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98] h-[380px]"
                >
                    <div className="absolute inset-0 bg-gradient-to-br from-slate-50 to-gray-50 opacity-50 group-hover:opacity-100 transition-opacity" />

                    <div className="relative z-10 w-28 h-28 bg-white rounded-full shadow-lg flex items-center justify-center p-4">
                        <Wallet className="h-14 w-14 text-slate-600" />
                    </div>

                    <div className="relative z-10 text-center">
                        <h2 className="text-xl font-bold text-gray-800 font-display uppercase mb-2">
                            Nómina
                        </h2>
                        <p className="text-xs text-gray-500 font-medium px-4">
                            Pagos y gestión de personal
                        </p>
                    </div>

                    <div className="relative z-10 mt-auto">
                        <span className="inline-flex items-center gap-2 text-slate-700 font-bold uppercase text-xs tracking-wider border-b-2 border-slate-700/20 pb-1 group-hover:border-slate-700 transition-colors">
                            Ver Nómina <Wallet className="h-4 w-4" />
                        </span>
                    </div>
                </div>

                {/* Horarios (Coming Soon) */}
                <div
                    className="group relative overflow-hidden bg-gray-50/50 backdrop-blur-xl border border-gray-100/50 rounded-3xl p-8 flex flex-col items-center justify-center gap-6 h-[380px] opacity-70"
                >
                    <div className="absolute top-4 right-4 bg-gray-200 text-gray-500 text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider">
                        Próximamente
                    </div>

                    <div className="relative z-10 w-28 h-28 bg-white/50 rounded-full shadow-sm flex items-center justify-center p-4 grayscale">
                        <CalendarRange className="h-14 w-14 text-gray-400" />
                    </div>

                    <div className="relative z-10 text-center grayscale">
                        <h2 className="text-xl font-bold text-gray-400 font-display uppercase mb-2">
                            Horarios
                        </h2>
                        <p className="text-xs text-gray-400 font-medium px-4">
                            Turnos y programación
                        </p>
                    </div>
                </div>
            </div>
        </div>
    )
}
