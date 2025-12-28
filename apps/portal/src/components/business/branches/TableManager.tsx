'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Plus, Edit2, Trash2, Save, X } from 'lucide-react'
import Button from '@/components/ui/Button'

interface TableManagerProps {
    branchId: string
}

export default function TableManager({ branchId }: TableManagerProps) {
    const [tables, setTables] = useState<any[]>([])
    const [loading, setLoading] = useState(false)
    const [newTableName, setNewTableName] = useState('')
    const [editingId, setEditingId] = useState<string | null>(null)
    const [editName, setEditName] = useState('')

    useEffect(() => {
        if (branchId) {
            loadTables()
        }
    }, [branchId])

    const loadTables = async () => {
        try {
            const { data, error } = await supabase
                .from('tables')
                .select('*')
                .eq('branch_id', branchId)
                .order('name')

            if (error) throw error
            setTables(data || [])
        } catch (err) {
            console.error('Error loading tables:', err)
        }
    }

    const handleCreate = async () => {
        if (!newTableName.trim()) return

        setLoading(true)
        try {
            const { error } = await supabase
                .from('tables')
                .insert([{
                    branch_id: branchId,
                    name: newTableName,
                    status: 'available'
                }])

            if (error) throw error

            setNewTableName('')
            await loadTables()
        } catch (err: any) {
            alert('Error al crear mesa: ' + err.message)
        } finally {
            setLoading(false)
        }
    }

    const handleUpdate = async (id: string) => {
        if (!editName.trim()) return

        try {
            const { error } = await supabase
                .from('tables')
                .update({ name: editName })
                .eq('id', id)

            if (error) throw error

            setEditingId(null)
            await loadTables()
        } catch (err: any) {
            alert('Error al actualizar mesa: ' + err.message)
        }
    }

    const handleDelete = async (id: string) => {
        if (!confirm('¿Eliminar esta mesa?')) return

        try {
            const { error } = await supabase
                .from('tables')
                .delete()
                .eq('id', id)

            if (error) throw error

            await loadTables()
        } catch (err: any) {
            alert('Error al eliminar mesa: ' + err.message)
        }
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h4 className="font-display font-bold text-gray-700 uppercase tracking-wide text-sm">
                    Mesas de la Sede
                </h4>
                <span className="text-xs text-gray-500">{tables.length} mesa{tables.length !== 1 ? 's' : ''}</span>
            </div>

            {/* Create New Table */}
            <div className="flex gap-2">
                <input
                    type="text"
                    placeholder="Nombre de nueva mesa (ej: Mesa 1, Barra, Terraza A)"
                    value={newTableName}
                    onChange={(e) => setNewTableName(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleCreate()}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pp-gold focus:border-pp-gold outline-none transition-all text-sm"
                />
                <Button
                    type="button"
                    onClick={handleCreate}
                    disabled={!newTableName.trim() || loading}
                    size="sm"
                    startIcon={<Plus className="h-4 w-4" />}
                >
                    Crear
                </Button>
            </div>

            {/* Table List */}
            <div className="space-y-2 max-h-60 overflow-y-auto">
                {tables.length === 0 ? (
                    <p className="text-gray-400 text-sm text-center py-4 bg-gray-50 rounded-lg">
                        No hay mesas creadas para esta sede
                    </p>
                ) : (
                    tables.map((table) => (
                        <div
                            key={table.id}
                            className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors border border-gray-200"
                        >
                            {editingId === table.id ? (
                                <>
                                    <input
                                        type="text"
                                        value={editName}
                                        onChange={(e) => setEditName(e.target.value)}
                                        className="flex-1 px-2 py-1 border border-pp-gold rounded text-sm"
                                        autoFocus
                                    />
                                    <button
                                        type="button"
                                        onClick={() => handleUpdate(table.id)}
                                        className="p-1.5 bg-green-500 text-white rounded hover:bg-green-600"
                                    >
                                        <Save size={16} />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setEditingId(null)}
                                        className="p-1.5 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
                                    >
                                        <X size={16} />
                                    </button>
                                </>
                            ) : (
                                <>
                                    <div className="flex-1 font-medium text-gray-800 text-sm">{table.name}</div>
                                    <span
                                        className={`text-xs px-2 py-0.5 rounded-full ${table.status === 'available'
                                                ? 'bg-green-100 text-green-700'
                                                : table.status === 'reserved'
                                                    ? 'bg-yellow-100 text-yellow-700'
                                                    : 'bg-red-100 text-red-700'
                                            }`}
                                    >
                                        {table.status === 'available'
                                            ? 'Libre'
                                            : table.status === 'reserved'
                                                ? 'Reservada'
                                                : 'Ocupada'}
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setEditingId(table.id)
                                            setEditName(table.name)
                                        }}
                                        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"
                                    >
                                        <Edit2 size={16} />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => handleDelete(table.id)}
                                        className="p-1.5 text-red-600 hover:bg-red-50 rounded"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </>
                            )}
                        </div>
                    ))
                )}
            </div>

            <p className="text-xs text-gray-500 italic">
                💡 Las mesas se sincronizarán automáticamente con el POS
            </p>
        </div>
    )
}
