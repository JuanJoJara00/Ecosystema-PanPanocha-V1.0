import { Calculator, LayoutGrid } from 'lucide-react';
import { Button } from '@panpanocha/ui';
import type { Table } from '../../types';

interface Props {
    tables: Table[];
    activeTableId: string | null;
    onSelectTable: (tableId: string | null) => void;
    onManageTables: () => void;
}

export function TableSelector({ tables, activeTableId, onSelectTable, onManageTables }: Props) {
    const getTableColor = (status: string) => {
        switch (status) {
            case 'occupied': return 'bg-yellow-400 text-yellow-950 hover:bg-yellow-500 border-yellow-500';
            case 'reserved': return 'bg-[#D2B48C] text-amber-950 hover:bg-[#C19A6B] border-[#C19A6B]';
            default: return 'bg-white text-gray-700 hover:bg-gray-50 border-gray-200';
        }
    };

    return (
        <div className="flex items-start gap-3 w-full">
            {/* Left: General Client (Cash Register) */}
            <div className="shrink-0">
                <Button
                    onClick={() => onSelectTable(null)}
                    className={`h-12 w-12 rounded-full p-0 flex items-center justify-center transition-all shadow-sm border ${activeTableId === null
                        ? 'bg-pp-brown text-white border-pp-brown shadow-md scale-105'
                        : 'bg-white text-gray-500 border-gray-200 hover:border-pp-brown hover:text-pp-brown hover:bg-gray-50'
                        }`}
                    title="Cliente General"
                >
                    <Calculator size={20} />
                </Button>
            </div>

            {/* Middle: Tables Grid */}
            <div className="flex-1 flex flex-wrap gap-2 items-center content-start">
                {tables.map((table) => (
                    <Button
                        key={table.id}
                        onClick={() => onSelectTable(table.id)}
                        className={`h-10 px-4 min-w-[60px] rounded-full font-bold transition-all shadow-sm border flex items-center justify-center ${activeTableId === table.id
                            ? 'ring-2 ring-offset-1 ring-pp-gold scale-105 z-10'
                            : ''
                            } ${getTableColor(table.status)}`}
                    >
                        <span className="text-sm">{table.name.replace('Mesa ', '')}</span>
                    </Button>
                ))}
            </div>

            {/* Right: Manage Tables (Table Icon) */}
            <div className="shrink-0">
                <Button
                    onClick={onManageTables}
                    variant="outline"
                    className="h-12 w-12 rounded-full p-0 flex items-center justify-center bg-white text-gray-400 hover:text-pp-brown border-dashed border-gray-300 hover:border-pp-brown hover:bg-pp-brown/5 transition-all"
                    title="Gestionar Mesas"
                >
                    <LayoutGrid size={20} />
                </Button>
            </div>
        </div>
    );
}
