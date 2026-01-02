import { useEffect, useState } from 'react';
import { Calendar, ChevronDown, X } from 'lucide-react';
import { Button } from '@panpanocha/ui';
import { usePosStore } from '../../store';

export type SidebarSection = 'history' | 'deliveries' | 'user' | 'expenses' | 'close-shift';

interface SidebarProps {
    isOpen: boolean;
    activeSection: SidebarSection;
    onClose: () => void;
    onSectionChange: (section: SidebarSection) => void;
    children: React.ReactNode;
}

import { BrandBackground } from './BrandBackground';

import { useTheme } from '../../providers/ThemeContext';

export default function Sidebar({ isOpen, onClose, children }: SidebarProps) {
    const { sidebarDateFilter, setSidebarDateFilter } = usePosStore();
    const { meta } = useTheme();
    const [showFilterMenu, setShowFilterMenu] = useState(false);

    // Close on ESC key
    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isOpen) {
                onClose();
            }
        };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return (
        <>
            {/* Overlay */}
            <div
                className="fixed inset-0 bg-black/50 z-40 transition-opacity duration-300"
                onClick={onClose}
            />

            {/* Sidebar Panel */}
            <div
                className={`
                    fixed top-0 right-0 h-full w-full sm:w-[480px] lg:w-[600px]
                    bg-white shadow-2xl z-50
                    transform transition-transform duration-300 ease-out
                    ${isOpen ? 'translate-x-0' : 'translate-x-full'}
                    flex flex-col
                `}
            >
                {/* Header */}
                <div className="bg-brand-primary p-4 flex items-center justify-between relative z-40 shadow-md">
                    <div className="flex items-center gap-6">
                        <div className="flex items-center gap-3">
                            <div className="bg-white/10 p-1.5 rounded-full backdrop-blur-sm border border-white/20">
                                <img src={meta.logoUrl} alt={meta.companyName} className="w-8 h-8 object-contain" />
                            </div>
                            <h2 className="text-xl font-bold text-white uppercase tracking-wider drop-shadow-sm">
                                Menú
                            </h2>
                        </div>

                        {/* Date Filter (Dash-style) */}
                        <div className="relative">
                            <button
                                onClick={() => setShowFilterMenu(!showFilterMenu)}
                                className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded-xl transition-all font-medium border border-white/10 text-xs"
                            >
                                <Calendar size={14} />
                                <span>{sidebarDateFilter === 'shift' ? 'Turno Activo' : (sidebarDateFilter === 'today' ? 'Hoy' : sidebarDateFilter === '7d' ? '7 Días' : '15 Días')}</span>
                                <ChevronDown size={14} />
                            </button>

                            {showFilterMenu && (
                                <>
                                    <div className="fixed inset-0 z-40 shadow-none pointer-events-auto" onClick={() => setShowFilterMenu(false)} />
                                    <div className="absolute top-full left-0 mt-2 w-48 bg-white rounded-xl shadow-2xl overflow-hidden py-1 z-50 animate-in fade-in zoom-in-95 duration-200">
                                        <button onClick={() => { setSidebarDateFilter('shift'); setShowFilterMenu(false); }} className="w-full text-left px-4 py-2 hover:bg-gray-100 text-sm font-medium text-gray-700">Turno Activo</button>
                                        <button onClick={() => { setSidebarDateFilter('today'); setShowFilterMenu(false); }} className="w-full text-left px-4 py-2 hover:bg-gray-100 text-sm font-medium text-gray-700">Hoy</button>
                                        <button onClick={() => { setSidebarDateFilter('7d'); setShowFilterMenu(false); }} className="w-full text-left px-4 py-2 hover:bg-gray-100 text-sm font-medium text-gray-700">Últimos 7 Días</button>
                                        <button onClick={() => { setSidebarDateFilter('15d'); setShowFilterMenu(false); }} className="w-full text-left px-4 py-2 hover:bg-gray-100 text-sm font-medium text-gray-700">Últimos 15 Días</button>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>

                    <Button
                        variant="ghost"
                        onClick={onClose}
                        className="text-white hover:bg-white/20 hover:text-white p-2 h-auto w-auto rounded-full transition-colors"
                    >
                        <X className="h-6 w-6" />
                    </Button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-hidden flex flex-col bg-[#FAF9F6] relative">
                    {/* Brand Pattern Background */}
                    <BrandBackground
                        opacity={0.10}
                        className="mix-blend-multiply"
                        size="w-80 h-80 md:w-96 md:h-96"
                    />

                    {/* Scrollable Content */}
                    <div className="relative z-10 flex-1 overflow-y-auto">
                        {children}
                    </div>
                </div>
            </div>
        </>
    );
}
