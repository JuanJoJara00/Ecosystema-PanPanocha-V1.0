import { History, Truck, DoorClosed, Wallet } from 'lucide-react';
import type { SidebarSection } from './Sidebar';
import { usePosStore } from '../../store';

interface SidebarNavigationProps {
    activeSection: SidebarSection;
}

const sections = [
    { id: 'deliveries' as SidebarSection, label: 'Domicilios', icon: Truck },
    { id: 'history' as SidebarSection, label: 'Ventas', icon: History },
    { id: 'expenses' as SidebarSection, label: 'Gastos', icon: Wallet },
    { id: 'close-shift' as SidebarSection, label: 'Cerrar Turno', icon: DoorClosed },
];

export default function SidebarNavigation({ activeSection }: SidebarNavigationProps) {
    const setSidebarSection = usePosStore(state => state.openSidebar);
    return (
        <div className="border-b border-gray-200 bg-gray-50">
            <nav className="flex overflow-x-auto">
                {sections.map((section) => {
                    const Icon = section.icon;
                    const isActive = activeSection === section.id;

                    return (
                        <button
                            key={section.id}
                            onClick={() => setSidebarSection(section.id)}
                            className={`
                                flex items-center gap-2 px-4 py-3 whitespace-nowrap
                                border-b-2 transition-all flex-1 justify-center
                                ${isActive
                                    ? 'border-[#D4AF37] text-[#D4AF37] bg-white font-semibold'
                                    : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                                }
                            `}
                        >
                            <Icon className="h-4 w-4" />
                            <span className="text-sm hidden sm:inline">{section.label}</span>
                        </button>
                    );
                })}
            </nav>
        </div>
    );
}
