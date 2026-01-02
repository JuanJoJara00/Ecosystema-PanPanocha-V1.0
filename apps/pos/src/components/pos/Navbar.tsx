import { Search, RefreshCw, User, Menu } from 'lucide-react';
import { usePosStore } from '../../store';
import { Button, Input } from '@panpanocha/ui';
import { useTheme } from '../../providers/ThemeContext';
import { LoadingOverlay } from '../Loading';
import { SyncStatus } from './SyncStatus';


interface NavbarProps {
    searchTerm: string;
    setSearchTerm: (term: string) => void;
    onOpenSidebar: (section: 'history' | 'deliveries' | 'user' | 'close-shift' | 'expenses') => void;
    onOpenDashboard: () => void;
    onOpenUserModal: () => void;
}

export function Navbar({ searchTerm, setSearchTerm, onOpenSidebar, onOpenDashboard, onOpenUserModal }: NavbarProps) {
    const { currentUser, currentShift, branches, isLoading, sync } = usePosStore();
    const { meta } = useTheme();

    // Get current branch name
    const currentBranchName = branches.find(b => b.id === currentShift?.branch_id)?.name || 'Sin Sede';

    return (
        <div className="h-16 bg-brand-secondary text-white flex items-center px-4 justify-between shrink-0 shadow-md z-20">
            {/* Logo / Brand - Dashboard Trigger */}
            <div
                className="flex items-center gap-3 w-64 cursor-pointer group select-none hover:bg-white/5 rounded-xl p-2 transition-all active:scale-95"
                onClick={onOpenDashboard}
                title="Abrir Dashboard"
            >
                <div className="w-12 h-12 flex items-center justify-center overflow-hidden transition-transform group-hover:scale-110 duration-300">
                    {meta.logoUrl && (
                        <img
                            src={meta.logoUrl}
                            alt={meta.companyName}
                            className="w-full h-full object-contain filter drop-shadow-md"
                        />
                    )}
                </div>
                <div className="flex flex-col leading-none">
                    <span className="font-bold text-xl tracking-wide font-display text-brand-primary group-hover:text-white transition-colors">{meta.companyName}</span>
                    <span className="text-[10px] text-brand-accent/90 tracking-wider font-semibold">{currentBranchName.toUpperCase()}</span>
                </div>
            </div>

            {/* Middle: Search */}
            <div className="flex-1 max-w-xl mx-4 flex items-center gap-3">
                <div className="relative group flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-secondary/50 group-focus-within:text-brand-primary transition-colors z-10" size={20} />
                    <Input
                        placeholder="Buscar productos (SKU, Nombre)..."
                        className="w-full bg-white text-brand-secondary placeholder:text-brand-secondary/40 pl-10 pr-4 py-2.5 rounded-xl border-2 border-transparent focus:border-brand-primary focus:bg-white outline-none transition-all shadow-inner font-medium h-auto"
                        value={searchTerm}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
                    />
                </div>

                {/* Sync Status - Moved Here */}
                <SyncStatus />

                <Button
                    variant="ghost"
                    onClick={() => sync()}
                    className={`flex items-center gap-2 px-3 py-2.5 rounded-xl bg-brand-primary hover:bg-brand-primary/80 text-white transition-all h-auto border-none shadow-sm ${isLoading ? 'opacity-70' : ''}`}
                    disabled={isLoading}
                    title="Sincronizar Datos"
                >
                    <RefreshCw size={18} className={isLoading ? "animate-spin" : ""} />
                    <span className="text-sm font-bold hidden xl:inline">{isLoading ? 'Syncing...' : 'Sync'}</span>
                </Button>
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-4">
                {/* Menu Button */}
                <Button
                    variant="ghost"
                    onClick={() => onOpenSidebar('history')}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-white/10 transition-colors h-auto border-none"
                >
                    <Menu size={18} className="text-brand-accent" />
                    <span className="text-sm font-medium text-brand-accent">Menú</span>
                </Button>

                <div className="h-8 w-[1px] bg-white/10"></div>

                {/* User Profile */}
                <div
                    className="flex items-center gap-3 cursor-pointer hover:bg-white/10 p-2 rounded-xl transition-colors select-none"
                    onClick={() => {
                        console.log('Navbar: User Profile Clicked');
                        onOpenUserModal();
                    }}
                >
                    <div className="flex flex-col text-right text-xs">
                        <span className="font-bold text-brand-primary">{currentUser?.full_name || 'Cajero'}</span>
                        <span className="text-brand-accent/70 capitalize">{currentUser?.role || 'Staff'}</span>
                    </div>
                    <div className="w-9 h-9 bg-white/10 rounded-full flex items-center justify-center border border-white/20">
                        <User size={18} className="text-brand-accent" />
                    </div>
                </div>
            </div>
            <LoadingOverlay message="Sincronizando..." show={isLoading} />
        </div>
    );
}
