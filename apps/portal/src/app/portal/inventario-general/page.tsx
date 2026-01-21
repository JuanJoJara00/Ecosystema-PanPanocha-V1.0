'use client'

import { useRouter } from 'next/navigation'
import { Package, ChefHat, Globe } from 'lucide-react'

export default function InventarioHubPage() {
    const router = useRouter()

    return (
        <div className="min-h-[80vh] flex flex-col items-center justify-center p-8">
            <div className="bg-white/85 backdrop-blur-sm p-8 rounded-[2.5rem] border border-white/60 shadow-sm mb-12 text-center max-w-xl">
                <h1 className="text-3xl font-bold text-gray-800 mb-2 font-display uppercase tracking-wide">
                    Gestión de Inventario
                </h1>
                <p className="text-gray-500 font-medium">
                    Control de materia prima, recetas y catálogo de productos
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 w-full max-w-6xl transition-all duration-500">
                {/* Inventario (Materia Prima) */}
                <div
                    onClick={() => router.push('/portal/inventario')}
                    className="cursor-pointer group relative overflow-hidden bg-white/80 backdrop-blur-xl border border-white/20 rounded-3xl p-10 flex flex-col items-center justify-center gap-6 shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98] h-[400px]"
                >
                    <div className="absolute inset-0 bg-gradient-to-br from-emerald-50 to-green-50 opacity-50 group-hover:opacity-100 transition-opacity" />

                    <div className="relative z-10 w-32 h-32 bg-white rounded-full shadow-lg flex items-center justify-center p-4">
                        <Package className="h-16 w-16 text-emerald-600" />
                    </div>

                    <div className="relative z-10 text-center">
                        <h2 className="text-2xl font-bold text-gray-800 font-display uppercase mb-2">
                            Materia prima & Insumos
                        </h2>
                        <p className="text-sm text-gray-500 font-medium px-8">
                            Gestión de insumos, stock y materia prima
                        </p>
                    </div>

                    <div className="relative z-10 mt-auto">
                        <span className="inline-flex items-center gap-2 text-emerald-700 font-bold uppercase text-xs tracking-wider border-b-2 border-emerald-700/20 pb-1 group-hover:border-emerald-700 transition-colors">
                            Ver Insumos <Package className="h-4 w-4" />
                        </span>
                    </div>
                </div>

                {/* Productos (Recetas) */}
                <div
                    onClick={() => router.push('/portal/products')}
                    className="cursor-pointer group relative overflow-hidden bg-white/80 backdrop-blur-xl border border-white/20 rounded-3xl p-10 flex flex-col items-center justify-center gap-6 shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98] h-[400px]"
                >
                    <div className="absolute inset-0 bg-gradient-to-br from-[#FDF8F3] to-[#F7EFE5] opacity-50 group-hover:opacity-100 transition-opacity" />

                    <div className="relative z-10 w-32 h-32 bg-white rounded-full shadow-lg flex items-center justify-center p-4">
                        <ChefHat className="h-16 w-16 text-pp-brown" />
                    </div>

                    <div className="relative z-10 text-center">
                        <h2 className="text-2xl font-bold text-gray-800 font-display uppercase mb-2">
                            Productos y Recetas
                        </h2>
                        <p className="text-sm text-gray-500 font-medium px-8">
                            Catálogo de venta y configuración de recetas
                        </p>
                    </div>

                    <div className="relative z-10 mt-auto">
                        <span className="inline-flex items-center gap-2 text-pp-brown font-bold uppercase text-xs tracking-wider border-b-2 border-pp-brown/20 pb-1 group-hover:border-pp-brown transition-colors">
                            Ver Productos <ChefHat className="h-4 w-4" />
                        </span>
                    </div>
                </div>

                {/* Catálogos y Canales */}
                <div
                    onClick={() => router.push('/portal/catalogos')}
                    className="cursor-pointer group relative overflow-hidden bg-white/80 backdrop-blur-xl border border-white/20 rounded-3xl p-10 flex flex-col items-center justify-center gap-6 shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98] h-[400px]"
                >
                    <div className="absolute inset-0 bg-gradient-to-br from-[#FFFBEB] to-[#FEF3C7]/20 opacity-50 group-hover:opacity-100 transition-opacity" />

                    <div className="relative z-10 w-32 h-32 bg-white rounded-full shadow-lg flex items-center justify-center p-4">
                        <Globe className="h-16 w-16 text-pp-gold" />
                    </div>

                    <div className="relative z-10 text-center">
                        <h2 className="text-2xl font-bold text-gray-800 font-display uppercase mb-2">
                            Catálogos y Canales
                        </h2>
                        <p className="text-sm text-gray-500 font-medium px-8">
                            Diferentes precios por sede o canal
                        </p>
                    </div>

                    <div className="relative z-10 mt-auto">
                        <span className="inline-flex items-center gap-2 text-pp-gold font-bold uppercase text-xs tracking-wider border-b-2 border-pp-gold/20 pb-1 group-hover:border-pp-gold transition-colors">
                            Gestionar Canales <Globe className="h-4 w-4" />
                        </span>
                    </div>
                </div>
            </div>
        </div>
    )
}
