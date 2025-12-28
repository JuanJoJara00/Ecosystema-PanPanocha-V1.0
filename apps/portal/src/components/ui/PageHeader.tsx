'use client'

import Image from 'next/image'
import Link from 'next/link'
import { ArrowLeft, Menu } from 'lucide-react'
import { useSidebar } from '@/context/SidebarContext'

interface PageHeaderProps {
    title: string
    subtitle?: string
    backUrl?: string
    onBack?: () => void
    actions?: React.ReactNode
    className?: string
}

export default function PageHeader({ title, subtitle, backUrl, onBack, actions, className = '' }: PageHeaderProps) {
    const { toggleSidebar } = useSidebar()

    const handleBack = () => {
        if (onBack) {
            onBack()
        } else {
            toggleSidebar()
        }
    }

    return (
        <div className={`flex flex-col md:flex-row items-center justify-between gap-4 mb-6 bg-white/85 dark:bg-slate-900/85 backdrop-blur-sm p-3 pr-4 rounded-[2rem] border border-white/60 dark:border-white/10 shadow-sm transition-all hover:bg-white/95 dark:hover:bg-slate-900/95 hover:shadow-md group ${className}`}>
            <div
                className="inline-flex items-center gap-4 cursor-pointer"
                onClick={handleBack}
            >
                {(backUrl || onBack) ? (
                    backUrl ? (
                        <Link href={backUrl} onClick={(e) => e.stopPropagation()} className="p-2 -ml-2 text-gray-400 dark:text-gray-400 hover:text-pp-brown dark:hover:text-amber-400 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-full transition-colors group" title="Volver">
                            <ArrowLeft className="h-6 w-6 group-hover:-translate-x-1 transition-transform" />
                        </Link>
                    ) : (
                        <button type="button" className="p-2 -ml-2 text-gray-400 dark:text-gray-400 group-hover:text-pp-brown dark:group-hover:text-amber-400 group-hover:bg-gray-100 dark:group-hover:bg-slate-800 rounded-full transition-colors" title="Volver">
                            <ArrowLeft className="h-6 w-6 group-hover:-translate-x-1 transition-transform" />
                        </button>
                    )
                ) : (
                    <button type="button" className="p-2 -ml-2 text-gray-400 dark:text-gray-400 group-hover:text-pp-brown dark:group-hover:text-amber-400 group-hover:bg-gray-100 dark:group-hover:bg-slate-800 rounded-full transition-colors" title="Menú">
                        <Menu className="h-6 w-6" />
                    </button>
                )}

                <div className="relative h-12 w-12 shrink-0">
                    <Image
                        src="/images/logo_v2.png"
                        alt="Logo PanPanocha"
                        fill
                        className="object-contain"
                    />
                </div>
                <div>
                    <h1 className={`text-2xl font-bold text-pp-brown dark:text-white font-display uppercase tracking-tight ${onBack ? 'group-hover:text-orange-800 dark:group-hover:text-amber-400 transition-colors' : ''}`}>
                        {title}
                    </h1>
                    {subtitle && (
                        <p className="text-sm text-gray-500 font-medium">
                            {subtitle}
                        </p>
                    )}
                </div>
            </div>

            {/* Right Side Actions */}
            {actions && (
                <div onClick={(e) => e.stopPropagation()}>
                    {actions}
                </div>
            )}
        </div>
    )
}
