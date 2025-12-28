'use client'

import Sidebar from '@/components/ui/Sidebar'
import { usePathname } from 'next/navigation'

import { brandConfig } from '@panpanocha/config'
import { BrandBackground } from '@/components/ui/BrandBackground'

import { SidebarProvider } from '@/context/SidebarContext'

export default function PortalLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const pathname = usePathname()
    const isLoginPage = pathname === '/portal/login'

    return (
        <SidebarProvider>
            <div className="min-h-screen bg-[#F9F1E0] dark:bg-[#15151F] flex font-sans relative overflow-hidden transition-colors duration-300">
                {/* Background Brand Mosaic */}
                <BrandBackground opacity={0.20} className="fixed" />

                {/* Sidebar (Fixed Drawer) */}
                {!isLoginPage && <Sidebar />}

                {/* Content */}
                <main className={`flex-grow ${!isLoginPage ? 'p-4 md:p-8' : ''} overflow-x-hidden relative z-10 h-screen overflow-y-auto`}>
                    <div className={`${!isLoginPage ? 'max-w-7xl mx-auto' : 'w-full'} text-gray-800`}>
                        {children}
                    </div>
                </main>
            </div>
        </SidebarProvider>
    )
}
