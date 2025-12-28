'use client'

import { useRouter } from 'next/navigation'
import { Truck, Users } from 'lucide-react'

export default function PedidosHubPage() {
    const router = useRouter()

    return (
        <div className="min-h-[80vh] flex flex-col items-center justify-center p-8">
            <div className="bg-white/85 backdrop-blur-sm p-8 rounded-[2.5rem] border border-white/60 shadow-sm mb-12 text-center max-w-xl">
                <h1 className="text-3xl font-bold text-gray-800 mb-2 font-display uppercase tracking-wide">
                    Gestión de Compras
                </h1>
                <p className="text-gray-500 font-medium">
                    Administración de pedidos a proveedores y directorio
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-4xl">
                {/* Pedidos */}
                <div
                    onClick={() => router.push('/portal/pedidos')}
                    className="cursor-pointer group relative overflow-hidden bg-white/80 backdrop-blur-xl border border-white/20 rounded-3xl p-10 flex flex-col items-center justify-center gap-6 shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98] h-[400px]"
                >
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-sky-50 opacity-50 group-hover:opacity-100 transition-opacity" />

                    <div className="relative z-10 w-32 h-32 bg-white rounded-full shadow-lg flex items-center justify-center p-4">
                        <Truck className="h-16 w-16 text-blue-600" />
                    </div>

                    <div className="relative z-10 text-center">
                        <h2 className="text-2xl font-bold text-gray-800 font-display uppercase mb-2">
                            Pedidos
                        </h2>
                        <p className="text-sm text-gray-500 font-medium px-8">
                            Control de órdenes de compra y recepción
                        </p>
                    </div>

                    <div className="relative z-10 mt-auto">
                        <span className="inline-flex items-center gap-2 text-blue-700 font-bold uppercase text-xs tracking-wider border-b-2 border-blue-700/20 pb-1 group-hover:border-blue-700 transition-colors">
                            Ver Pedidos <Truck className="h-4 w-4" />
                        </span>
                    </div>
                </div>

                {/* Proveedores */}
                <div
                    onClick={() => router.push('/portal/proveedores')}
                    className="cursor-pointer group relative overflow-hidden bg-white/80 backdrop-blur-xl border border-white/20 rounded-3xl p-10 flex flex-col items-center justify-center gap-6 shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98] h-[400px]"
                >
                    <div className="absolute inset-0 bg-gradient-to-br from-indigo-50 to-violet-50 opacity-50 group-hover:opacity-100 transition-opacity" />

                    <div className="relative z-10 w-32 h-32 bg-white rounded-full shadow-lg flex items-center justify-center p-4">
                        <Users className="h-16 w-16 text-indigo-600" />
                    </div>

                    <div className="relative z-10 text-center">
                        <h2 className="text-2xl font-bold text-gray-800 font-display uppercase mb-2">
                            Proveedores
                        </h2>
                        <p className="text-sm text-gray-500 font-medium px-8">
                            Directorio y gestión de proveedores
                        </p>
                    </div>

                    <div className="relative z-10 mt-auto">
                        <span className="inline-flex items-center gap-2 text-indigo-700 font-bold uppercase text-xs tracking-wider border-b-2 border-indigo-700/20 pb-1 group-hover:border-indigo-700 transition-colors">
                            Ver Directorio <Users className="h-4 w-4" />
                        </span>
                    </div>
                </div>
            </div>
        </div>
    )
}
