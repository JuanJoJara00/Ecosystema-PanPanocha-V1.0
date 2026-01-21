
import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { X, Truck, AlertTriangle } from 'lucide-react'
import Input from '@/components/ui/Input'
import NumericInput from '@/components/ui/NumericInput'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'

interface ReceiveStockModalProps {
    isOpen: boolean
    onClose: () => void
    item: any // Typed as any to allow flexibility, but ideally InventoryItem
    branchId: string // Required for stock assignment
    onSuccess: () => void
}

export default function ReceiveStockModal({ isOpen, onClose, item, branchId, onSuccess }: ReceiveStockModalProps) {
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const [formData, setFormData] = useState({
        quantity: 0,
        price: 0
    })

    if (!item) return null

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError(null)

        try {
            // Call ACID RPC
            const { data, error } = await supabase.rpc('handle_new_stock_entry', {
                p_item_id: item.id,
                p_quantity_bought: formData.quantity,
                p_unit_price: formData.price,
                p_branch_id: branchId,
                p_user_id: null // Supabase Auth handles this if using RLS, but for RPC we might pass it if needed by logic
            })

            if (error) throw error

            console.log('Stock Received:', data)
            onSuccess()
            onClose()
            setFormData({ quantity: 0, price: 0 })
        } catch (err: any) {
            console.error('Reception Error:', err)
            setError(err.message || 'Error al recibir producto')
        } finally {
            setLoading(false)
        }
    }

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Recepción de Mercancia: ${item.name}`}>
            <form onSubmit={handleSubmit} className="space-y-4">

                {/* Info Card */}
                <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 flex gap-4 text-sm">
                    <div className="flex-1">
                        <span className="block text-gray-500 text-xs uppercase font-bold">Unidad de Compra</span>
                        <span className="font-mono text-blue-700 font-bold">{item.buying_unit || 'Unidad'}</span>
                    </div>
                    <div className="flex-1">
                        <span className="block text-gray-500 text-xs uppercase font-bold">Unidad de Uso</span>
                        <span className="font-mono text-blue-700 font-bold">{item.usage_unit || 'Unidad'}</span>
                    </div>
                    <div className="flex-1">
                        <span className="block text-gray-500 text-xs uppercase font-bold">Factor</span>
                        <span className="font-mono text-blue-700 font-bold">x {item.conversion_factor || 1}</span>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <NumericInput
                        label={`Cantidad Recibida (${item.buying_unit || 'Unid.'})`}
                        required
                        value={formData.quantity}
                        onChange={val => setFormData({ ...formData, quantity: val })}
                        autoFocus
                    />
                    <NumericInput
                        label={`Precio Total Compra ($)`}
                        helperText={`Costo por ${item.buying_unit || 'Unidad'}`}
                        required
                        value={formData.price}
                        onChange={val => setFormData({ ...formData, price: val })}
                    />
                </div>

                {/* Simulation Preview (Optional enhancement) */}
                <div className="text-xs text-gray-500 italic">
                    * El costo promedio se recalculará automáticamente basado en el stock actual.
                </div>

                {error && (
                    <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4" />
                        {error}
                    </div>
                )}

                <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                    <Button type="button" variant="ghost" onClick={onClose} disabled={loading}>
                        Cancelar
                    </Button>
                    <Button type="submit" isLoading={loading} disabled={loading} className="bg-blue-600 hover:bg-blue-700 text-white">
                        <Truck className="w-4 h-4 mr-2" />
                        Confirmar Entrada
                    </Button>
                </div>
            </form>
        </Modal>
    )
}
