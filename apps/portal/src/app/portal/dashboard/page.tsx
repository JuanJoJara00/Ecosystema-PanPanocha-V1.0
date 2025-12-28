
import Link from 'next/link'
import {
    ClipboardList,
    DollarSign,
    Package,
    Truck,
    Users,
    BarChart3,
    ChefHat,
    Wallet,
    ShoppingBag,
    MapPin,
    Bike
} from 'lucide-react'

const modules = [
    {
        title: 'Cierre de Caja',
        icon: DollarSign,
        href: '/portal/cierre-caja',
        description: 'Registrar ventas y cierre del día.',
    },
    {
        title: 'Inventario',
        icon: Package,
        href: '/portal/inventario',
        description: 'Gestionar stock e insumos.',
    },
    {
        title: 'Pedidos Proveedores',
        icon: Truck,
        href: '/portal/pedidos',
        description: 'Generar órdenes de compra.',
    },
    {
        title: 'Proveedores',
        icon: Users,
        href: '/portal/proveedores',
        description: 'Gestión de proveedores y contactos.',
    },
    {
        title: 'Productos & Recetas',
        icon: ChefHat,
        href: '/portal/products',
        description: 'Catálogo de productos y recetas.',
    },
    {
        title: 'Nómina',
        icon: Wallet,
        href: '/portal/nomina',
        description: 'Gestión de empleados y pagos.',
    },
    {
        title: 'Domicilios',
        icon: Bike,
        href: '/portal/domicilios',
        description: 'Gestión de despachos.',
    },
    {
        title: 'Sedes',
        icon: MapPin,
        href: '/portal/sedes',
        description: 'Administración de puntos de venta.',
    },
    {
        title: 'Dashboard Rappi',
        icon: ShoppingBag,
        href: '/portal/rappi',
        description: 'Ventas y gastos de Rappi.',
    },
    {
        title: 'Manuales y Procesos',
        icon: ClipboardList,
        href: '/portal/manuales',
        description: 'Guías operativas y checklists.',
    },
    {
        title: 'Admin Dashboard',
        icon: BarChart3,
        href: '/portal/admin',
        description: 'Reportes y métricas gestión.',
    },
]

export default function DashboardPage() {
    return (
        <div className="space-y-6">
            <div className="flex flex-col items-center justify-center text-center gap-4 py-8 animate-fade-in-up">
                <div className="relative h-24 w-24 shrink-0 transition-transform hover:scale-105 duration-300">
                    <img
                        src="/images/logo_v2.png"
                        alt="Portal PanPanocha"
                        className="object-contain drop-shadow-sm w-full h-full"
                    />
                </div>
                <div className="bg-white/85 dark:bg-slate-900/85 backdrop-blur-sm p-6 rounded-[2.5rem] border border-white/60 dark:border-white/10 shadow-sm">
                    <h1 className="block text-3xl font-extrabold text-pp-brown dark:text-white font-display uppercase tracking-widest leading-tight">
                        PORTAL <br /><span className="text-pp-gold text-4xl">PANPANOCHA</span>
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 font-medium mt-2">
                        {`Bienvenido, ${new Date().getHours() < 12 ? 'Buenos días' : 'Buenas tardes'}`}
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {modules.map((module) => {
                    const Icon = module.icon
                    return (
                        <Link
                            key={module.title}
                            href={module.href}
                            className="block p-6 bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-gray-100 dark:border-white/5 hover:shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:border-[--pp-gold]/30 transition-all group"
                        >
                            <div className="w-12 h-12 rounded-xl bg-pp-gold/10 dark:bg-pp-gold/20 text-pp-brown dark:text-amber-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                                <Icon className="h-6 w-6" />
                            </div>
                            <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-2 font-display uppercase tracking-wide group-hover:text-pp-brown dark:group-hover:text-amber-400 transition-colors">{module.title}</h2>
                            <p className="text-gray-500 dark:text-gray-400 text-sm font-sans">{module.description}</p>
                        </Link>
                    )
                })}
            </div>
        </div>
    )
}
