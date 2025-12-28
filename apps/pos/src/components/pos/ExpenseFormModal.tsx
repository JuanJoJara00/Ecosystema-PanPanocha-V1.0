import { useState } from 'react';
import { usePosStore } from '../../store';
import { Button, Input } from '@panpanocha/ui';
import { Wallet, Package, Zap, Users, Home, MoreHorizontal, FileText, X, Truck, Coins } from 'lucide-react';

interface ExpenseFormModalProps {
    onClose: () => void;
}

export function ExpenseFormModal({ onClose }: ExpenseFormModalProps) {
    const { currentShift, createExpense, loadExpenses, currentUser, currentBranchId } = usePosStore();
    const [amount, setAmount] = useState('');
    const [description, setDescription] = useState('');
    const [category, setCategory] = useState('Suministros');
    const [voucherNumber, setVoucherNumber] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const categories = [
        { name: 'Suministros', icon: Package, bgSelected: 'bg-cyan-50', borderSelected: 'border-cyan-400', textSelected: 'text-cyan-600' },
        { name: 'Servicios', icon: Zap, bgSelected: 'bg-amber-50', borderSelected: 'border-amber-400', textSelected: 'text-amber-600' },
        { name: 'Nómina', icon: Users, bgSelected: 'bg-fuchsia-50', borderSelected: 'border-fuchsia-400', textSelected: 'text-fuchsia-600' },
        { name: 'Arriendo', icon: Home, bgSelected: 'bg-indigo-50', borderSelected: 'border-indigo-400', textSelected: 'text-indigo-600' },
        { name: 'Domicilios', icon: Truck, bgSelected: 'bg-blue-50', borderSelected: 'border-blue-400', textSelected: 'text-blue-600' },
        { name: 'Propinas', icon: Coins, bgSelected: 'bg-emerald-50', borderSelected: 'border-emerald-400', textSelected: 'text-emerald-600' },
        { name: 'Otros', icon: MoreHorizontal, bgSelected: 'bg-gray-100', borderSelected: 'border-gray-400', textSelected: 'text-gray-600' },
    ];

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!amount || !description || !currentShift) return;

        setIsSubmitting(true);
        try {
            await createExpense({
                amount: parseFloat(amount),
                description: description,
                voucher_number: voucherNumber || null,
                shift_id: currentShift.id,
                branch_id: currentBranchId || currentShift.branch_id,
                user_id: currentUser?.id || currentShift.user_id,
                category: category.toLowerCase()
            });
            if (currentShift?.id) loadExpenses(currentShift.id);
            onClose();
        } catch (error) {
            console.error('Failed to create expense:', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!currentShift) {
        return (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4" onClick={onClose}>
                <div className="bg-white rounded-3xl p-8 max-w-md text-center" onClick={e => e.stopPropagation()}>
                    <Wallet size={48} className="mx-auto mb-4 text-gray-300" />
                    <h3 className="text-lg font-bold text-gray-800">Caja Cerrada</h3>
                    <p className="text-sm text-gray-500 mt-2">Debes abrir un turno para registrar gastos.</p>
                    <Button onClick={onClose} className="mt-4">Cerrar</Button>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4" onClick={onClose}>
            <div
                className="bg-white rounded-[30px] shadow-2xl max-w-xl w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200 border-t-4 border-[#D4AF37]"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="pt-8 px-8 pb-4 flex justify-between items-start">
                    <div>
                        <h2 className="text-2xl font-black text-gray-900 uppercase tracking-tight leading-none flex items-center gap-2">
                            <Wallet className="text-[#D4AF37]" /> Registrar Gasto
                        </h2>
                        <p className="text-sm text-gray-500 mt-1">Salida de efectivo de caja</p>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-900 transition-colors">
                        <X size={24} />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="px-8 pb-8 space-y-5">
                    {/* Description & Voucher */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2 md:col-span-1">
                            <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wider">Concepto</label>
                            <Input
                                placeholder="Ej: Pago a proveedor"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                className="bg-gray-50 border-gray-200"
                                required
                            />
                        </div>
                        <div className="col-span-2 md:col-span-1">
                            <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wider flex items-center gap-1">
                                <FileText size={12} /> N° Factura
                            </label>
                            <Input
                                placeholder="Opcional"
                                value={voucherNumber}
                                onChange={(e) => setVoucherNumber(e.target.value)}
                                className="bg-gray-50 border-gray-200"
                            />
                        </div>
                    </div>

                    {/* Category Selector */}
                    <div>
                        <label className="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-wider">Categoría</label>
                        <div className="grid grid-cols-6 gap-3">
                            {categories.map((cat) => (
                                <button
                                    key={cat.name}
                                    type="button"
                                    onClick={() => setCategory(cat.name)}
                                    className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all ${category === cat.name
                                        ? `${cat.borderSelected} ${cat.bgSelected} shadow-md`
                                        : 'border-gray-100 bg-white hover:border-gray-300 hover:bg-gray-50'
                                        }`}
                                >
                                    <cat.icon size={22} className={category === cat.name ? cat.textSelected : 'text-gray-400'} />
                                    <span className={`text-[9px] mt-1.5 font-bold uppercase ${category === cat.name ? cat.textSelected : 'text-gray-400'}`}>
                                        {cat.name}
                                    </span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Amount */}
                    <div>
                        <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wider">Monto (Efectivo)</label>
                        <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-xl">$</span>
                            <Input
                                type="number"
                                placeholder="0"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                className="pl-10 bg-gray-50 border-gray-200 font-mono text-2xl font-black text-red-600 h-14"
                                required
                                min="0"
                            />
                        </div>
                    </div>

                    {/* Submit */}
                    <Button
                        type="submit"
                        disabled={isSubmitting || !amount || !description}
                        className="w-full bg-[#D4AF37] hover:bg-[#C19B2D] text-white font-bold h-14 rounded-xl shadow-lg shadow-amber-200/50 text-base uppercase tracking-wider"
                    >
                        {isSubmitting ? '⏳ Registrando...' : '💸 Registrar Gasto'}
                    </Button>
                </form>
            </div>
        </div>
    );
}
