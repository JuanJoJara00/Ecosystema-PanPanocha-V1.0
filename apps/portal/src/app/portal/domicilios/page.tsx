'use client'

import { useRouter } from 'next/navigation'
import { Truck, ShoppingBag } from 'lucide-react'
import Image from 'next/image'

export default function DomiciliosLandingPage() {
    const router = useRouter()

    return (
        <div className="min-h-[80vh] flex flex-col items-center justify-center p-8">
            <div className="bg-white/85 backdrop-blur-sm p-8 rounded-[2.5rem] border border-white/60 shadow-sm mb-12 text-center max-w-xl">
                <h1 className="text-3xl font-bold text-gray-800 mb-2 font-display uppercase tracking-wide">
                    Gestión de Domicilios
                </h1>
                <p className="text-gray-500 font-medium">
                    Selecciona la plataforma de domicilios que deseas gestionar
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-4xl">
                {/* Internal / PanPanocha Card */}
                <div
                    onClick={() => router.push('/portal/domicilios/panpanocha')}
                    className="cursor-pointer group relative overflow-hidden bg-white/80 backdrop-blur-xl border border-white/20 rounded-3xl p-10 flex flex-col items-center justify-center gap-6 shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98] h-[400px]"
                >
                    <div className="absolute inset-0 bg-gradient-to-br from-amber-50 to-orange-50 opacity-50 group-hover:opacity-100 transition-opacity" />

                    <div className="relative z-10 w-32 h-32 bg-white rounded-full shadow-lg flex items-center justify-center p-4">
                        <div className="relative w-full h-full">
                            <Image
                                src="/images/logo_v2.png"
                                alt="Logo PanPanocha"
                                fill
                                className="object-contain"
                            />
                        </div>
                    </div>

                    <div className="relative z-10 text-center">
                        <h2 className="text-2xl font-bold text-gray-800 font-display uppercase mb-2">
                            Domicilio PanPanocha
                        </h2>
                        <p className="text-sm text-gray-500 font-medium px-8">
                            Gestión interna de pedidos y despachos directos
                        </p>
                    </div>

                    <div className="relative z-10 mt-auto">
                        <span className="inline-flex items-center gap-2 text-pp-brown font-bold uppercase text-xs tracking-wider border-b-2 border-pp-brown/20 pb-1 group-hover:border-pp-brown transition-colors">
                            Ingresar al Módulo <Truck className="h-4 w-4" />
                        </span>
                    </div>
                </div>

                {/* Rappi Card */}
                <div
                    onClick={() => router.push('/portal/domicilios/rappi')}
                    className="cursor-pointer group relative overflow-hidden bg-white/80 backdrop-blur-xl border border-white/20 rounded-3xl p-10 flex flex-col items-center justify-center gap-6 shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98] h-[400px]"
                >
                    <div className="absolute inset-0 bg-gradient-to-br from-rose-50 to-pink-50 opacity-50 group-hover:opacity-100 transition-opacity" />

                    <div className="relative z-10 w-32 h-32 bg-[#FF441F] rounded-full shadow-lg flex items-center justify-center p-4 overflow-hidden">
                        <Image
                            src="/assets/rappi_logo.png"
                            alt="Rappi Logo"
                            width={100}
                            height={100}
                            className="object-contain"
                        />
                    </div>

                    <div className="relative z-10 text-center">
                        <h2 className="text-2xl font-bold text-gray-800 font-display uppercase mb-2">
                            Domicilios Rappi
                        </h2>
                        <p className="text-sm text-gray-500 font-medium px-8">
                            Integración y control de pedidos externos
                        </p>
                    </div>

                    <div className="relative z-10 mt-auto">
                        <span className="inline-flex items-center gap-2 text-[#FF441F] font-bold uppercase text-xs tracking-wider border-b-2 border-[#FF441F]/20 pb-1 group-hover:border-[#FF441F] transition-colors">
                            Ingresar al Módulo <ShoppingBag className="h-4 w-4" />
                        </span>
                    </div>
                </div>
            </div>
        </div>
    )
}
