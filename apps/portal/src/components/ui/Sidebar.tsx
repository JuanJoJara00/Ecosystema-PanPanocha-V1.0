'use client'


import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { appConfig } from '@/config/app-config'
import { useSidebar } from '@/context/SidebarContext' // Import Context
import { useTheme } from 'next-themes' // Import Theme Hook
import {
    LayoutDashboard,
    Package,
    Truck,
    ChefHat,
    Wallet,
    DollarSign,
    ShoppingBag,
    ClipboardList,
    BarChart3,
    ChevronLeft,
    ChevronRight,
    LogOut,
    Users,
    MapPin,
    Bike,
    Plus,
    Sun,
    Moon,
    Globe,
    Calendar,
    Smile,
    Receipt,
    LucideIcon
} from 'lucide-react'
import { twMerge } from 'tailwind-merge'
import Image from 'next/image'
import Modal from '@/components/ui/Modal'

// Submodule type
interface Submodule {
    name: string
    href: string
    icon: LucideIcon
    color: string
}

interface NavItem {
    name: string
    href: string
    icon: LucideIcon
    submodules?: Submodule[]
}

export default function Sidebar() {
    const pathname = usePathname()
    const router = useRouter()
    const { isOpen, closeSidebar, isCollapsed, toggleCollapse } = useSidebar() // Use Context with Collapse
    const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false)
    const [isAccountModalOpen, setIsAccountModalOpen] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const { theme, setTheme, resolvedTheme } = useTheme()
    const [mounted, setMounted] = useState(false)
    const [hoveredItem, setHoveredItem] = useState<string | null>(null)

    // Fix hydration mismatch properly
    // This effect only runs on the client, so we know we can safely show the UI
    useEffect(() => {
        setMounted(true)
    }, [])


    const handleLogout = async () => {
        setIsLoading(true)
        try {
            await supabase.auth.signOut()
        } catch (error) {
            console.error('Error signing out:', error)
        } finally {
            setIsLogoutModalOpen(false)
            router.push('/portal/login')
            setIsLoading(false)
        }
    }

    // Hide sidebar on the main dashboard page
    // The path could be /portal or /portal/dashboard depending on config, checking both to be safe
    if (pathname === '/portal/dashboard' || pathname === '/portal') {
        return null
    }

    // Navigation with submodules
    const navigation: NavItem[] = [
        { name: 'Menú Principal', href: '/portal/dashboard', icon: LayoutDashboard },

        {
            name: 'Inventario',
            href: '/portal/inventario-general',
            icon: Package,
            submodules: [
                { name: 'Materia Prima', href: '/portal/inventario', icon: Package, color: 'emerald' },
                { name: 'Productos', href: '/portal/products', icon: ChefHat, color: 'slate' },
                { name: 'Catálogos', href: '/portal/catalogos', icon: Globe, color: 'amber' }
            ]
        },
        {
            name: 'Pedidos',
            href: '/portal/compras',
            icon: Truck,
            submodules: [
                { name: 'Pedidos', href: '/portal/pedidos', icon: Truck, color: 'blue' },
                { name: 'Proveedores', href: '/portal/proveedores', icon: Users, color: 'indigo' }
            ]
        },
        {
            name: 'Finanzas',
            href: '/portal/finanzas',
            icon: DollarSign,
            submodules: [
                { name: 'Ventas', href: '/portal/ventas', icon: ShoppingBag, color: 'blue' },
                { name: 'Gastos', href: '/portal/gastos', icon: Wallet, color: 'rose' },
                { name: 'Cierre de Caja', href: '/portal/cierre-caja', icon: Receipt, color: 'emerald' }
            ]
        },
        {
            name: 'Gestión',
            href: '/portal/gestion',
            icon: BarChart3,
            submodules: [
                { name: 'Sedes', href: '/portal/sedes', icon: MapPin, color: 'rose' },
                { name: 'Nómina', href: '/portal/nomina', icon: Wallet, color: 'teal' }
            ]
        },
        {
            name: 'Domicilios',
            href: '/portal/domicilios',
            icon: Bike,
            submodules: [
                { name: 'PanPanocha', href: '/portal/domicilios', icon: Bike, color: 'amber' },
                { name: 'Rappi', href: '/portal/rappi', icon: Smile, color: 'orange' }
            ]
        },
        { name: 'Manuales', href: '/portal/manuales', icon: ClipboardList },
        { name: 'Admin', href: '/portal/admin', icon: Users },
    ]

    // Color map for submodule icons
    const colorMap: Record<string, string> = {
        emerald: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400',
        slate: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300',
        amber: 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400',
        blue: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
        indigo: 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400',
        rose: 'bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400',
        teal: 'bg-teal-100 text-teal-600 dark:bg-teal-900/30 dark:text-teal-400',
        gray: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300',
        orange: 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400'
    }

    return (
        <>
            {/* Overlay / Backdrop */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 transition-opacity"
                    onClick={closeSidebar}
                />
            )}

            {/* Sidebar Drawer */}
            <aside
                className={twMerge(
                    "fixed inset-y-0 left-0 bg-white dark:bg-slate-900 border-r border-gray-100 dark:border-white/5 flex flex-col h-screen z-50 shadow-2xl transition-all duration-300 ease-in-out transform",
                    isOpen ? "translate-x-0" : "-translate-x-full", // Mobile: Drawer behavior
                    "md:translate-x-0", // Desktop: Always visible
                    isCollapsed ? "w-20 overflow-visible" : "w-72" // Width logic + overflow for flyout
                )}
            >
                <div className={twMerge(
                    "p-6 flex flex-col items-center justify-center text-center gap-4 border-b border-gray-50/50 dark:border-white/5 transition-all",
                    isCollapsed ? "p-4 gap-2" : "p-6"
                )}>
                    <div className={twMerge(
                        "relative shrink-0 transition-transform hover:scale-105 duration-300",
                        isCollapsed ? "h-10 w-10" : "h-24 w-24"
                    )}>
                        <Image
                            src={appConfig.company.logoUrl}
                            alt={`Portal ${appConfig.company.name}`}
                            fill
                            className="object-contain drop-shadow-sm"
                            priority
                        />
                    </div>
                    {!isCollapsed && (
                        <div className="animate-in fade-in duration-300">
                            <Link href={appConfig.routes.home} className="block text-lg font-extrabold text-pp-brown dark:text-white font-display uppercase tracking-widest leading-tight hover:opacity-80 transition-opacity">
                                PORTAL <br /><span className="text-pp-gold dark:text-amber-400 text-xl">{appConfig.company.name}</span>
                            </Link>
                        </div>
                    )}
                </div>

                <nav className={twMerge(
                    "flex-1 px-3 space-y-1 mt-4",
                    isCollapsed ? "overflow-visible" : "overflow-y-auto"
                )}>
                    {navigation.map((item) => {
                        const isActive = pathname.startsWith(item.href) && item.href !== '/portal/dashboard' || pathname === item.href
                        const hasSubmodules = item.submodules && item.submodules.length > 0
                        const isExpanded = hoveredItem === item.name

                        return (
                            <div
                                key={item.name}
                                className="relative"
                                onMouseEnter={() => hasSubmodules && setHoveredItem(item.name)}
                                onMouseLeave={() => hasSubmodules && setHoveredItem(null)}
                            >
                                {/* Main Nav Item - hover to show dropdown */}
                                {hasSubmodules ? (
                                    <Link
                                        href={item.href}
                                        className={twMerge(
                                            'w-full relative flex items-center gap-3 px-3 py-3 text-sm font-bold rounded-2xl transition-all duration-200 group font-display uppercase tracking-wide whitespace-nowrap',
                                            isActive
                                                ? 'bg-pp-gold/15 dark:bg-amber-500/10 text-pp-brown dark:text-amber-400 shadow-sm ring-1 ring-pp-gold/50 dark:ring-amber-500/20'
                                                : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-800 hover:text-pp-brown dark:hover:text-amber-400',
                                            isCollapsed ? 'justify-center' : ''
                                        )}
                                        title={isCollapsed ? item.name : undefined}
                                    >
                                        {isActive && !isCollapsed && (
                                            <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-pp-gold rounded-l-full" />
                                        )}
                                        <item.icon className={twMerge(
                                            "transition-colors z-10 shrink-0",
                                            isCollapsed ? "w-6 h-6" : "h-5 w-5",
                                            isActive ? "text-pp-brown dark:text-amber-400" : "text-gray-400 dark:text-gray-500 group-hover:text-pp-gold dark:group-hover:text-amber-400"
                                        )} />
                                        {!isCollapsed && (
                                            <>
                                                <span className="z-10 text-left flex-1">{item.name}</span>
                                                <ChevronRight className={twMerge(
                                                    "h-4 w-4 text-gray-300 transition-transform duration-200",
                                                    isExpanded ? "rotate-90" : ""
                                                )} />
                                            </>
                                        )}
                                    </Link>
                                ) : (
                                    <Link
                                        href={item.href}
                                        className={twMerge(
                                            'relative flex items-center gap-3 px-3 py-3 text-sm font-bold rounded-2xl transition-all duration-200 group font-display uppercase tracking-wide whitespace-nowrap',
                                            isActive
                                                ? 'bg-pp-gold/15 dark:bg-amber-500/10 text-pp-brown dark:text-amber-400 shadow-sm ring-1 ring-pp-gold/50 dark:ring-amber-500/20'
                                                : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-800 hover:text-pp-brown dark:hover:text-amber-400',
                                            isCollapsed ? 'justify-center' : ''
                                        )}
                                        title={isCollapsed ? item.name : undefined}
                                    >
                                        {isActive && !isCollapsed && (
                                            <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-pp-gold rounded-l-full" />
                                        )}
                                        <item.icon className={twMerge(
                                            "transition-colors z-10 shrink-0",
                                            isCollapsed ? "w-6 h-6" : "h-5 w-5",
                                            isActive ? "text-pp-brown dark:text-amber-400" : "text-gray-400 dark:text-gray-500 group-hover:text-pp-gold dark:group-hover:text-amber-400"
                                        )} />
                                        {!isCollapsed && (
                                            <span className="z-10">{item.name}</span>
                                        )}
                                    </Link>
                                )}

                                {/* Dropdown Submodules - expands DOWN */}
                                {hasSubmodules && isExpanded && !isCollapsed && (
                                    <div className="mt-1 ml-4 pl-4 border-l-2 border-gray-100 dark:border-white/10 space-y-1 animate-in slide-in-from-top-2 duration-200">
                                        {item.submodules!.map((sub) => {
                                            const isSubActive = pathname === sub.href
                                            return (
                                                <Link
                                                    key={sub.href}
                                                    href={sub.href}
                                                    className={twMerge(
                                                        "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors",
                                                        isSubActive
                                                            ? "bg-gray-100 dark:bg-slate-700"
                                                            : "hover:bg-gray-50 dark:hover:bg-slate-800"
                                                    )}
                                                >
                                                    <div className={twMerge(
                                                        "p-1.5 rounded-lg",
                                                        colorMap[sub.color]
                                                    )}>
                                                        <sub.icon className="h-3.5 w-3.5" />
                                                    </div>
                                                    <span className={twMerge(
                                                        "text-xs font-bold uppercase tracking-wide",
                                                        isSubActive ? "text-gray-900 dark:text-white" : "text-gray-600 dark:text-gray-300"
                                                    )}>{sub.name}</span>
                                                </Link>
                                            )
                                        })}
                                    </div>
                                )}

                                {/* Collapsed mode: show tooltip with submodules on hover */}
                                {hasSubmodules && isCollapsed && isExpanded && (
                                    <>
                                        {/* Invisible bridge to prevent hover gap */}
                                        <div className="absolute left-full top-0 w-4 h-full" />
                                        <div className="absolute left-full top-0 ml-2 z-[100] bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-gray-100 dark:border-white/10 py-2 w-48 animate-in fade-in slide-in-from-left-2 duration-200">
                                            <div className="px-3 py-1.5 border-b border-gray-100 dark:border-white/10">
                                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{item.name}</span>
                                            </div>
                                            {item.submodules!.map((sub) => (
                                                <Link
                                                    key={sub.href}
                                                    href={sub.href}
                                                    className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
                                                    onClick={() => setHoveredItem(null)}
                                                >
                                                    <div className={twMerge("p-1 rounded-lg", colorMap[sub.color])}>
                                                        <sub.icon className="h-3 w-3" />
                                                    </div>
                                                    <span className="text-xs font-bold text-gray-700 dark:text-gray-200">{sub.name}</span>
                                                </Link>
                                            ))}
                                        </div>
                                    </>
                                )}
                            </div>
                        )
                    })}
                </nav>

                {/* Footer Actions */}
                <div className="p-3 border-t border-gray-100 dark:border-white/5 space-y-2 bg-gray-50/50 dark:bg-slate-900/50">

                    {/* Access & User (Only visible if expanded) */}
                    {!isCollapsed && (
                        <>
                            <button
                                onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
                                className="flex items-center gap-3 px-4 py-3 w-full text-sm font-bold text-gray-600 dark:text-gray-300 bg-white dark:bg-slate-800 border border-gray-200 dark:border-white/10 rounded-full hover:bg-gray-50 dark:hover:bg-slate-700 hover:text-pp-brown dark:hover:text-amber-400 transition-all font-display uppercase tracking-wide shadow-sm group"
                            >
                                <div className="p-1 bg-gray-100 dark:bg-slate-700 rounded-full group-hover:bg-pp-gold/10 dark:group-hover:bg-amber-500/20 transition-colors">
                                    {mounted && resolvedTheme === 'dark' ? <Moon className="h-4 w-4 text-purple-400" /> : <Sun className="h-4 w-4 text-orange-400" />}
                                </div>
                                {mounted && resolvedTheme === 'dark' ? 'Modo Oscuro' : 'Modo Claro'}
                            </button>
                            <button
                                onClick={() => setIsAccountModalOpen(true)}
                                className="flex items-center gap-3 px-4 py-3 w-full text-sm font-bold text-gray-600 dark:text-gray-300 bg-white dark:bg-slate-800 border border-gray-200 dark:border-white/10 rounded-full hover:bg-gray-50 dark:hover:bg-slate-700 hover:text-pp-brown dark:hover:text-amber-400 transition-all font-display uppercase tracking-wide shadow-sm group"
                            >
                                <div className="p-1 bg-gray-100 dark:bg-slate-700 rounded-full group-hover:bg-pp-gold/10 dark:group-hover:bg-amber-500/20 transition-colors">
                                    <Users className="h-4 w-4" />
                                </div>
                                Gestionar Cuentas
                            </button>
                        </>
                    )}

                    {/* Collapse Button (Desktop Only) */}
                    <button
                        onClick={toggleCollapse}
                        className="hidden md:flex items-center justify-center w-full py-2 hover:bg-gray-200/50 dark:hover:bg-slate-700 rounded-xl transition-colors text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                    >
                        {isCollapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
                    </button>

                    <button
                        onClick={() => setIsLogoutModalOpen(true)}
                        className={twMerge(
                            "flex items-center gap-3 px-4 py-3 w-full text-sm font-bold text-white bg-red-500 rounded-full hover:bg-red-600 transition-colors font-display uppercase tracking-wide shadow-sm",
                            isCollapsed ? "justify-center px-0 w-10 h-10 mx-auto rounded-xl" : ""
                        )}
                        title="Cerrar Sesión"
                    >
                        {isCollapsed ? (
                            <LogOut className="h-4 w-4" />
                        ) : (
                            <>
                                <div className="p-1 bg-white/20 rounded-full">
                                    <LogOut className="h-4 w-4" />
                                </div>
                                Cerrar Sesión
                            </>
                        )}
                    </button>
                </div>

                {/* Logout Confirmation Modal */}
                <Modal
                    isOpen={isLogoutModalOpen}
                    onClose={() => setIsLogoutModalOpen(false)}
                    title="¿Cerrar Sesión?"
                >
                    <div className="space-y-4">
                        <p className="text-gray-600">
                            ¿Estás seguro de que deseas salir del sistema?
                        </p>
                        <div className="flex justify-end gap-3 pt-4">
                            <button
                                onClick={() => setIsLogoutModalOpen(false)}
                                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg font-medium transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleLogout}
                                disabled={isLoading}
                                className="px-4 py-2 bg-red-600 text-white rounded-lg font-bold hover:bg-red-700 transition-colors shadow-sm flex items-center gap-2"
                            >
                                {isLoading ? 'Saliendo...' : 'Sí, Cerrar Sesión'}
                            </button>
                        </div>
                    </div>
                </Modal>

                {/* Account Switcher Modal */}
                <Modal
                    isOpen={isAccountModalOpen}
                    onClose={() => setIsAccountModalOpen(false)}
                    title="Gestionar Cuentas"
                >
                    <div className="space-y-4">
                        <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 flex items-center gap-4">
                            <div className="h-10 w-10 bg-pp-gold text-pp-brown rounded-full flex items-center justify-center font-bold text-lg">
                                PP
                            </div>
                            <div className="flex-1">
                                <p className="font-bold text-gray-900">PanPanocha Admin</p>
                                <p className="text-sm text-gray-500">admin@panpanocha.com</p>
                            </div>
                            <div className="px-2 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-md">
                                ACTUAL
                            </div>
                        </div>

                        <div className="border-t border-gray-100 my-4"></div>

                        <p className="text-sm text-gray-500 font-medium px-1">Otras cuentas guardadas</p>

                        <button className="w-full flex items-center gap-4 p-4 rounded-xl hover:bg-gray-50 border border-transparent hover:border-gray-100 transition-all text-left">
                            <div className="h-10 w-10 bg-gray-200 text-gray-500 rounded-full flex items-center justify-center">
                                <Plus className="h-5 w-5" />
                            </div>
                            <div>
                                <p className="font-bold text-gray-700">Agregar otra cuenta</p>
                                <p className="text-sm text-gray-400">Iniciar sesión con otro usuario</p>
                            </div>
                        </button>
                    </div>
                </Modal>
            </aside>
        </>
    )
}
