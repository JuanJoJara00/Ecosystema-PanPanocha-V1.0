'use client'

import Sidebar from '@/components/ui/Sidebar'
import { usePathname } from 'next/navigation'

import { brandConfig } from '@panpanocha/config'
import { BrandBackground } from '@/components/ui/BrandBackground'

import { SidebarProvider, useSidebar } from '@/context/SidebarContext'

function MainContent({ children, isLoginPage }: { children: React.ReactNode, isLoginPage: boolean }) {
    const { isCollapsed } = useSidebar()

    return (
        <main className={`flex-grow ${!isLoginPage ? 'p-2 md:p-3' : ''} overflow-x-hidden relative z-10 h-screen overflow-y-auto transition-all duration-300 ${!isLoginPage ? (isCollapsed ? 'md:ml-20' : 'md:ml-72') : ''}`}>
            <div className={`${!isLoginPage ? 'w-full' : 'w-full'} text-gray-800`}>
                {children}
            </div>
        </main>
    )
}

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

                {/* Content Wrapper */}
                <MainContent isLoginPage={isLoginPage}>
                    {children}
                </MainContent>
            </div>
        </SidebarProvider>
    )
}
