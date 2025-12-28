import { useState } from 'react';
import { ArrowRightLeft, Check } from 'lucide-react';
import { Button, Card } from '@panpanocha/ui';
import { usePosStore } from '../../store';
import { cn } from '@panpanocha/ui/lib/utils';

interface Props {
    fromTableId: string;
    fromTableName: string;
    onClose: () => void;
}

export function TransferTableModal({ fromTableId, fromTableName, onClose }: Props) {
    const { tables, transferTable } = usePosStore();
    const [selectedTableId, setSelectedTableId] = useState<string | null>(null);

    // Filter only available tables (except current)
    // Actually, available tables are implicitly filters status='available'
    // But we check just in case.
    const availableTables = tables.filter(t =>
        t.status === 'available' && t.id !== fromTableId
    );

    const handleTransfer = async () => {
        if (!selectedTableId) return;
        await transferTable(fromTableId, selectedTableId);
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
            <Card className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden p-0 border-none flex flex-col max-h-[90vh]">
                <div className="bg-pp-brown p-6 flex justify-between items-center shrink-0">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center text-pp-gold">
                            <ArrowRightLeft size={24} />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-white">Transferir Mesa</h2>
                            <p className="text-pp-cream/70 text-sm">Mover {fromTableName} a otra mesa libre</p>
                        </div>
                    </div>
                </div>

                <div className="p-6 overflow-y-auto bg-gray-50 flex-1">
                    {availableTables.length === 0 ? (
                        <div className="text-center py-12 text-gray-500">
                            <p className="text-lg font-medium">No hay mesas disponibles</p>
                            <p className="text-sm">Todas las demás mesas están ocupadas.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                            {availableTables.map((table) => (
                                <button
                                    key={table.id}
                                    onClick={() => setSelectedTableId(table.id)}
                                    className={cn(
                                        "bg-white p-4 rounded-xl border-2 transition-all duration-200 relative group flex flex-col items-center gap-2 h-32 justify-center",
                                        selectedTableId === table.id
                                            ? "border-pp-gold bg-pp-gold/5 shadow-md scale-[1.02]"
                                            : "border-gray-200 hover:border-pp-gold/50 hover:shadow-sm"
                                    )}
                                >
                                    <span className="text-lg font-bold text-gray-800 group-hover:text-pp-brown transition-colors">
                                        {table.name}
                                    </span>
                                    <span className="text-xs font-semibold px-2 py-1 rounded-full bg-green-100 text-green-700">
                                        Disponible
                                    </span>

                                    {selectedTableId === table.id && (
                                        <div className="absolute top-2 right-2 w-6 h-6 bg-pp-gold rounded-full flex items-center justify-center text-pp-brown animate-in zoom-in duration-200">
                                            <Check size={14} strokeWidth={3} />
                                        </div>
                                    )}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                <div className="p-6 bg-white border-t flex justify-end gap-3 shrink-0">
                    <Button
                        variant="secondary"
                        onClick={onClose}
                        className="font-bold h-12 px-6"
                    >
                        Cancelar
                    </Button>
                    <Button
                        onClick={handleTransfer}
                        disabled={!selectedTableId}
                        className="bg-pp-gold text-pp-brown hover:bg-pp-gold/90 font-bold h-12 px-8 disabled:opacity-50"
                    >
                        Confirmar Transferencia
                    </Button>
                </div>
            </Card>
        </div>
    );
}
