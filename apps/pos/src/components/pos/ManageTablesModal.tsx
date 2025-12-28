import { useState } from 'react';
import { X, Plus, Edit2, Trash2, Save } from 'lucide-react';
import { usePosStore } from '../../store';
import { Button, Input } from '@panpanocha/ui';
import { v4 as uuidv4 } from 'uuid';

interface Props {
    onClose: () => void;
}

export function ManageTablesModal({ onClose }: Props) {
    const { tables, currentBranchId, loadTables } = usePosStore();
    const [newTableName, setNewTableName] = useState('');
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editName, setEditName] = useState('');
    const [isCreating, setIsCreating] = useState(false);

    const handleCreate = async () => {
        if (!newTableName.trim() || !currentBranchId) return;

        setIsCreating(true);
        try {
            const table = {
                id: uuidv4(),
                branch_id: currentBranchId,
                name: newTableName,
                status: 'available'
            };

            await window.electron.createTable(table);
            await loadTables();
            setNewTableName('');
        } catch (err) {
            usePosStore.getState().showAlert('error', 'Error', 'Error al crear mesa');
            console.error(err);
        } finally {
            setIsCreating(false);
        }
    };

    const handleUpdate = async (id: string) => {
        if (!editName.trim()) return;

        try {
            await window.electron.updateTable(id, { name: editName });
            await loadTables();
            setEditingId(null);
        } catch (err) {
            alert('Error al actualizar mesa');
            console.error(err);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('¿Eliminar esta mesa?')) return;

        try {
            await window.electron.deleteTable(id);
            await loadTables();
        } catch (err) {
            alert('Error al eliminar mesa');
            console.error(err);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="p-6 border-b border-gray-200 flex justify-between items-center bg-pp-brown text-white">
                    <h2 className="text-2xl font-bold">Gestión de Mesas</h2>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={onClose}
                        className="hover:bg-white/10 text-white hover:text-white"
                    >
                        <X size={24} />
                    </Button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto flex-1">
                    {/* Create New Table */}
                    <div className="mb-6 bg-gray-50 p-4 rounded-xl">
                        <h3 className="font-bold text-gray-700 mb-3 flex items-center gap-2">
                            <Plus size={20} className="text-pp-gold" />
                            Crear Nueva Mesa
                        </h3>
                        <div className="flex gap-2 items-end">
                            <Input
                                placeholder="Ej: Mesa 1, Barra, Terraza A..."
                                value={newTableName}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewTableName(e.target.value)}
                                onKeyPress={(e: React.KeyboardEvent<HTMLInputElement>) => e.key === 'Enter' && handleCreate()}
                                className="flex-1"
                            />
                            <Button
                                onClick={handleCreate}
                                disabled={!newTableName.trim() || isCreating}
                                className="bg-pp-gold text-pp-brown hover:bg-pp-gold/90 font-bold"
                            >
                                {isCreating ? 'Creando...' : 'Crear'}
                            </Button>
                        </div>
                    </div>

                    {/* Table List */}
                    <div>
                        <h3 className="font-bold text-gray-700 mb-3">Mesas Actuales</h3>
                        {tables.length === 0 ? (
                            <p className="text-gray-400 text-center py-8">No hay mesas creadas aún</p>
                        ) : (
                            <div className="space-y-2">
                                {tables.map((table) => (
                                    <div
                                        key={table.id}
                                        className="flex items-center gap-3 p-3 bg-white border border-gray-200 rounded-lg hover:border-pp-gold/50 transition-colors"
                                    >
                                        {editingId === table.id ? (
                                            <>
                                                <>
                                                    <Input
                                                        value={editName}
                                                        onChange={(e) => setEditName(e.target.value)}
                                                        className="flex-1 border-pp-gold"
                                                        autoFocus
                                                    />
                                                    <Button
                                                        size="icon"
                                                        onClick={() => handleUpdate(table.id)}
                                                        className="bg-green-500 hover:bg-green-600 text-white"
                                                    >
                                                        <Save size={18} />
                                                    </Button>
                                                    <Button
                                                        variant="secondary"
                                                        size="icon"
                                                        onClick={() => setEditingId(null)}
                                                    >
                                                        <X size={18} />
                                                    </Button>
                                                </>
                                            </>
                                        ) : (
                                            <>
                                                <div className="flex-1 font-medium text-gray-800">{table.name}</div>
                                                <span className={`text-xs px-2 py-1 rounded-full ${table.status === 'available' ? 'bg-green-100 text-green-700' :
                                                    table.status === 'reserved' ? 'bg-yellow-100 text-yellow-700' :
                                                        'bg-red-100 text-red-700'
                                                    }`}>
                                                    {table.status === 'available' ? 'Libre' :
                                                        table.status === 'reserved' ? 'Reservada' : 'Ocupada'}
                                                </span>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => {
                                                        setEditingId(table.id);
                                                        setEditName(table.name);
                                                    }}
                                                    className="text-blue-600 hover:bg-blue-50 hover:text-blue-700"
                                                >
                                                    <Edit2 size={18} />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => handleDelete(table.id)}
                                                    className="text-red-600 hover:bg-red-50 hover:text-red-700"
                                                >
                                                    <Trash2 size={18} />
                                                </Button>
                                            </>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-gray-200 bg-gray-50">
                    <Button
                        variant="secondary"
                        onClick={onClose}
                        className="w-full font-bold"
                    >
                        Cerrar
                    </Button>
                </div>
            </div>
        </div>
    );
}
