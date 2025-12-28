import { Trash2, User, Banknote, Star, Printer, Minus, Plus, Pencil, StickyNote, ArrowRightLeft, ChevronDown, TruckIcon, Package, Wallet } from 'lucide-react';
import { useState } from 'react';
import { Button, Badge } from '@panpanocha/ui';
import { cn } from '@panpanocha/ui/lib/utils';
import type { Product, CartItem, Sale, SaleItem, Client } from '../../types';
import CheckoutScreen from './CheckoutScreen';
import { ClientSearchModal } from './ClientSearchModal';
import { usePosStore } from '../../store';
import { NoteModal } from './NoteModal';

interface CartPanelProps {
    cart: CartItem[];
    onRemove: (id: string) => void;
    onClear: () => void;
    onCheckout: (data: { total: number; received: number; change: number; client?: Client | null; tipAmount?: number; discountAmount?: number }) => void;
    total: number;
    activeTableName?: string;
    onTransfer?: () => void;
    onClearTable?: () => void;
    onOpenRappiModal?: () => void;
    onOpenDeliveryModal?: () => void;
    onOpenExpenseModal?: () => void;
}

type OrderType = 'general' | 'register' | 'rappi' | 'domicilio';

export function CartPanel({ cart, onRemove, onClear, onCheckout, total, activeTableName, onTransfer, onClearTable, onOpenRappiModal, onOpenDeliveryModal, onOpenExpenseModal }: CartPanelProps) {
    const [showCheckout, setShowCheckout] = useState(false);
    const [showClientModal, setShowClientModal] = useState(false);
    const [showNoteModal, setShowNoteModal] = useState(false);
    const [selectedClient, setSelectedClient] = useState<Client | null>(null);
    const [editingNoteItemId, setEditingNoteItemId] = useState<string | null>(null);
    const [orderType, setOrderType] = useState<OrderType>('general');
    const [showOrderTypeDropdown, setShowOrderTypeDropdown] = useState(false);

    // Get actions directly from store for detailed operations
    const updateCartItemQuantity = usePosStore(state => state.updateCartItemQuantity);
    const updateCartItemNote = usePosStore(state => state.updateCartItemNote);

    const handlePaymentComplete = (data: { total: number; received: number; change: number; tipAmount?: number; discountAmount?: number }) => {
        // Pass client data to checkout
        onCheckout({ ...data, client: selectedClient });
        setShowCheckout(false);
        setSelectedClient(null); // Reset client after sale
    };

    const handleClientSelect = (client: Client) => {
        setSelectedClient(client);
        setShowClientModal(false);
        setShowCheckout(true); // Show checkout after client selection
    };

    const handleSkipClient = () => {
        setSelectedClient(null); // Continue as "Cliente General"
        setShowClientModal(false);
        setShowCheckout(true); // Show checkout modal
    };

    const handleEditNote = (itemId: string) => {
        setEditingNoteItemId(itemId);
        setShowNoteModal(true);
    };

    const handleSaveNote = (note: string) => {
        if (editingNoteItemId) {
            updateCartItemNote(editingNoteItemId, note);
        }
        setShowNoteModal(false);
        setEditingNoteItemId(null);
    };

    return (
        <>
            <div className="w-[400px] bg-white border-l border-brand-secondary/10 flex flex-col h-full shadow-2xl shrink-0 z-20 relative">
                {/* 1. Order Type Dropdown */}
                <div className="h-16 border-b border-brand-secondary/10 px-6 bg-brand-primary/5 relative">
                    <button
                        onClick={() => setShowOrderTypeDropdown(!showOrderTypeDropdown)}
                        className="w-full h-full flex items-center justify-between text-brand-secondary hover:text-brand-primary transition-colors font-bold group relative"
                    >
                        <div className="flex items-center gap-3">
                            <div className={cn(
                                "w-8 h-8 rounded-full flex items-center justify-center transition-colors shadow-sm",
                                orderType === 'rappi' ? "bg-orange-500 text-white" :
                                    orderType === 'domicilio' ? "bg-blue-500 text-white" :
                                        selectedClient ? "bg-pp-gold text-white" : "bg-brand-secondary/10 group-hover:bg-brand-primary group-hover:text-white"
                            )}>
                                {orderType === 'rappi' ? <TruckIcon size={16} /> :
                                    orderType === 'domicilio' ? <Package size={16} /> :
                                        <User size={16} />}
                            </div>
                            <div className="flex flex-col items-start leading-none">
                                <span className="text-sm">
                                    {orderType === 'general' ? (selectedClient ? selectedClient.full_name : 'Cliente General') :
                                        orderType === 'register' ? 'Registrar Cliente' :
                                            orderType === 'rappi' ? '🛵 Orden Rappi' :
                                                '📦 Domicilio PanPanocha'}
                                </span>
                                {selectedClient && orderType === 'general' && (
                                    <span className="text-[10px] text-pp-brown flex items-center gap-1 font-bold">
                                        <Star size={8} className="fill-pp-gold text-pp-gold" />
                                        {selectedClient.points} pts
                                    </span>
                                )}
                            </div>
                        </div>
                        <ChevronDown size={18} className={cn("transition-transform", showOrderTypeDropdown && "rotate-180")} />
                    </button>

                    {/* Dropdown Menu */}
                    {showOrderTypeDropdown && (
                        <div className="absolute top-full left-0 w-full bg-white border border-gray-200 rounded-b-xl shadow-2xl z-50 overflow-hidden">
                            <button
                                onClick={() => {
                                    setOrderType('general');
                                    setShowOrderTypeDropdown(false);
                                }}
                                className="w-full px-6 py-3 flex items-center gap-3 hover:bg-gray-50 transition-colors text-left border-b border-gray-100"
                            >
                                <User size={16} className="text-gray-600" />
                                <span className="text-sm font-medium">Cliente General</span>
                            </button>
                            <button
                                onClick={() => {
                                    setOrderType('register');
                                    setShowOrderTypeDropdown(false);
                                    setShowClientModal(true);
                                }}
                                className="w-full px-6 py-3 flex items-center gap-3 hover:bg-gray-50 transition-colors text-left border-b border-gray-100"
                            >
                                <User size={16} className="text-pp-gold" />
                                <span className="text-sm font-medium">Registrar Cliente</span>
                            </button>
                            <button
                                onClick={() => {
                                    setOrderType('rappi');
                                    setShowOrderTypeDropdown(false);
                                }}
                                className="w-full px-6 py-3 flex items-center gap-3 hover:bg-orange-50 transition-colors text-left border-b border-gray-100"
                            >
                                <TruckIcon size={16} className="text-orange-500" />
                                <span className="text-sm font-medium">🛵 Orden Rappi</span>
                            </button>
                            <button
                                onClick={() => {
                                    setOrderType('domicilio');
                                    setShowOrderTypeDropdown(false);
                                }}
                                className="w-full px-6 py-3 flex items-center gap-3 hover:bg-blue-50 transition-colors text-left"
                            >
                                <Package size={16} className="text-blue-500" />
                                <span className="text-sm font-medium">📦 Domicilio PanPanocha</span>
                            </button>
                        </div>
                    )}
                </div>

                {/* Transfer Button Row (Only if table active) */}
                {activeTableName && onTransfer && (
                    <div className="px-6 py-2 bg-yellow-50/50 border-b border-yellow-100 flex justify-between items-center gap-2">
                        <span className="text-xs font-bold text-yellow-800 uppercase tracking-wider">
                            Mesa: {activeTableName}
                        </span>
                        <div className="flex gap-2">
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={onTransfer}
                                className="h-6 text-[10px] bg-white border border-yellow-200 text-yellow-700 hover:bg-yellow-100 hover:text-yellow-800 uppercase font-bold px-2 py-0"
                            >
                                <ArrowRightLeft size={10} className="mr-1" /> Transferir
                            </Button>
                            {onClearTable && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={onClearTable}
                                    className="h-6 text-[10px] bg-white border border-red-300 text-red-700 hover:bg-red-100 hover:text-red-800 uppercase font-bold px-2 py-0"
                                >
                                    <Trash2 size={10} className="mr-1" /> Borrar
                                </Button>
                            )}
                        </div>
                    </div>
                )}

                {/* 2. Cart Items (The Ticket) */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#FDFDFD]">
                    {cart.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-brand-secondary/20">
                            <div className="w-20 h-20 rounded-full bg-brand-secondary/5 flex items-center justify-center mb-4">
                                <Trash2 size={40} />
                            </div>
                            <p className="font-display font-bold text-lg">Orden Vacía</p>
                            <p className="text-sm">Agrega productos para comenzar</p>
                        </div>
                    ) : (
                        cart.map((item) => (
                            <div key={item.id} className="group bg-white p-3 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all flex items-stretch gap-3 relative overflow-visible">

                                {/* 1. Quantity Controls (Vertical Pill) */}
                                <div className="flex flex-col items-center justify-between bg-[#FFF8F0] rounded-xl border border-[#FFE4C4] w-9 shrink-0 py-1">
                                    <button
                                        className="h-7 w-full flex items-center justify-center text-pp-brown/60 hover:text-pp-brown hover:bg-[#FFE4C4]/20 transition-colors rounded-t-lg active:scale-90"
                                        onClick={() => updateCartItemQuantity(item.id, 1)}
                                    >
                                        <Plus size={14} strokeWidth={3} />
                                    </button>

                                    <div className="flex-1 flex items-center justify-center text-sm font-bold text-pp-brown">
                                        {item.quantity}
                                    </div>

                                    <button
                                        className="h-7 w-full flex items-center justify-center text-pp-brown/60 hover:text-red-500 hover:bg-red-50 transition-colors rounded-b-lg active:scale-90"
                                        onClick={() => updateCartItemQuantity(item.id, -1)}
                                    >
                                        <Minus size={14} strokeWidth={3} />
                                    </button>
                                </div>

                                {/* 2. Content */}
                                <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
                                    <div>
                                        <div className="flex justify-between items-start pr-7">
                                            <h4 className="font-bold text-gray-800 text-[15px] leading-tight line-clamp-2">
                                                {item.product.name}
                                            </h4>
                                            <span className="font-bold text-gray-900 shrink-0">
                                                ${(item.product.price * item.quantity).toLocaleString('es-CO')}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-3 mt-0.5">
                                            <div className="text-[11px] text-gray-400 font-medium">
                                                ${item.product.price.toLocaleString('es-CO')} un.
                                            </div>
                                            <div className={cn(
                                                "text-[10px] font-bold px-1.5 py-0.5 rounded-md flex items-center gap-1",
                                                (item.product.stock || 0) < 10 ? "bg-red-50 text-red-600" : "bg-green-50 text-green-600"
                                            )}>
                                                <Package size={10} />
                                                Stock: {item.product.stock || 0}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Note Button */}
                                    <button
                                        onClick={() => handleEditNote(item.id)}
                                        className={cn(
                                            "mt-2 text-[11px] px-2 py-1.5 rounded-lg flex items-center gap-1.5 transition-all w-fit max-w-full",
                                            item.note
                                                ? "bg-amber-50 text-amber-700 border border-amber-200"
                                                : "bg-gray-50 text-gray-400 border border-transparent hover:bg-brand-primary/5 hover:text-brand-primary"
                                        )}
                                    >
                                        <StickyNote size={12} className={item.note ? "fill-amber-700/20" : ""} />
                                        <span className="truncate font-medium">
                                            {item.note || "Agregar nota..."}
                                        </span>
                                        {!item.note && <Pencil size={10} className="opacity-50" />}
                                    </button>
                                </div>

                                {/* 3. Delete Button (Top Right Absolute) */}
                                <button
                                    onClick={() => onRemove(item.id)}
                                    className="absolute -top-2 -right-2 w-7 h-7 bg-white rounded-full shadow border border-gray-100 flex items-center justify-center text-gray-300 hover:text-red-500 hover:border-red-100 hover:bg-red-50 transition-all z-10 opacity-0 group-hover:opacity-100 scale-90 group-hover:scale-100"
                                >
                                    <Trash2 size={14} />
                                </button>
                            </div>
                        ))
                    )}
                </div>

                {/* 3. Payment Area (Bottom Fixed) */}
                <div className="bg-white border-t border-brand-secondary/10 p-6 shadow-[0_-10px_40px_rgba(0,0,0,0.05)] z-20">
                    {/* Visual Totals */}
                    <div className="flex flex-col gap-2 mb-6">
                        <div className="flex justify-between items-center text-brand-secondary/60 text-sm">
                            <span>Subtotal</span>
                            <span>${total.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between items-center text-brand-secondary/60 text-sm">
                            <span className="flex items-center gap-1">
                                Impuestos <Badge className="bg-blue-50 text-blue-600 border-blue-100 text-[9px] h-4 px-1">8%</Badge>
                            </span>
                            <span>${(total * 0.08).toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between items-end mt-2 pt-4 border-t border-dashed border-brand-secondary/20">
                            <span className="text-brand-secondary font-bold text-lg">Total a Pagar</span>
                            <span className="text-4xl font-black text-brand-secondary tracking-tight">
                                ${total.toLocaleString()}
                            </span>
                        </div>
                    </div>

                    {/* Checkout Buttons */}
                    <div className="grid grid-cols-5 gap-2 h-16">
                        <Button
                            onClick={onClear}
                            className="col-span-1 bg-red-50 hover:bg-red-100 text-red-500 border-none h-full rounded-xl"
                            title="Cancelar Orden"
                        >
                            <Trash2 size={22} />
                        </Button>

                        {/* Register Expense Button */}
                        <Button
                            onClick={onOpenExpenseModal}
                            className="col-span-1 bg-amber-50 hover:bg-amber-100 text-amber-600 border-none h-full rounded-xl flex flex-col items-center justify-center gap-0.5"
                            title="Registrar Gasto"
                        >
                            <Wallet size={18} />
                            <span className="text-[8px] font-bold uppercase">Gasto</span>
                        </Button>

                        {/* Pre-Check Button */}
                        <Button
                            onClick={() => {
                                const mockSale: Sale = {
                                    id: 'PRE-CUENTA',
                                    branch_id: '',
                                    created_by: '',
                                    total_amount: total,
                                    payment_method: 'cash', // Default for pre-check
                                    status: 'completed',
                                    created_at: new Date().toISOString(),
                                    synced: false
                                };
                                const mockItems: SaleItem[] = cart.map(c => ({
                                    id: crypto.randomUUID(),
                                    sale_id: 'PRE-CUENTA',
                                    product_id: c.product.id,
                                    quantity: c.quantity,
                                    unit_price: c.product.price,
                                    total_price: c.product.price * c.quantity,
                                    product_name: c.product.name
                                }));

                                window.electron.printTicket({
                                    sale: mockSale,
                                    items: mockItems
                                });
                            }}
                            disabled={cart.length === 0}
                            className="col-span-1 bg-blue-50 hover:bg-blue-100 text-blue-600 border-none h-full rounded-xl flex flex-col items-center justify-center gap-1"
                            title="Imprimir Pre-cuenta"
                        >
                            <Printer size={20} />
                            <span className="text-[10px] uppercase font-bold">Pre-cuenta</span>
                        </Button>

                        {/* Big COBRAR/REGISTRAR Button */}
                        <Button
                            onClick={() => {
                                if (orderType === 'general' || orderType === 'register') {
                                    setShowClientModal(true);
                                } else if (orderType === 'rappi' && onOpenRappiModal) {
                                    onOpenRappiModal();
                                } else if (orderType === 'domicilio' && onOpenDeliveryModal) {
                                    onOpenDeliveryModal();
                                }
                            }}
                            disabled={cart.length === 0}
                            className={cn(
                                "col-span-2 rounded-xl h-full flex items-center justify-center gap-3 text-white hover:scale-[1.02] active:scale-95 transition-all shadow-lg border-none",
                                orderType === 'rappi' ? "bg-orange-500 hover:bg-orange-600 shadow-orange-500/20" :
                                    orderType === 'domicilio' ? "bg-blue-500 hover:bg-blue-600 shadow-blue-500/20" :
                                        "bg-[#48C774] disabled:opacity-50 disabled:grayscale hover:bg-[#3db066] shadow-green-500/20",
                                cart.length === 0 && "cursor-not-allowed opacity-50"
                            )}
                        >
                            <div className="flex flex-col items-start leading-none">
                                <span className="text-[10px] font-bold opacity-80 uppercase tracking-widest">
                                    {orderType === 'rappi' || orderType === 'domicilio' ? 'Registrar' : 'Cobrar'}
                                </span>
                                <span className="text-xl font-black">
                                    {orderType === 'rappi' ? 'RAPPI' :
                                        orderType === 'domicilio' ? 'DOMICILIO' :
                                            'EFECTIVO'}
                                </span>
                            </div>
                            {orderType === 'rappi' ? <TruckIcon size={24} /> :
                                orderType === 'domicilio' ? <Package size={24} /> :
                                    <Banknote size={24} />}
                        </Button>
                    </div>
                </div>
            </div>

            {/* Checkout Modal */}
            {showCheckout && (
                <CheckoutScreen
                    items={cart}
                    total={total}
                    onComplete={handlePaymentComplete}
                    onCancel={() => setShowCheckout(false)}
                    tableName={selectedClient?.full_name || 'Venta'}
                    client={selectedClient}
                />
            )}

            {/* Client Search Modal */}
            {showClientModal && (
                <ClientSearchModal
                    onClose={() => setShowClientModal(false)}
                    onSelectClient={handleClientSelect}
                    onSkip={handleSkipClient}
                />
            )}

            {/* Note Modal */}
            {showNoteModal && (
                <NoteModal
                    currentNote={cart.find(c => c.id === editingNoteItemId)?.note}
                    onSave={handleSaveNote}
                    onClose={() => {
                        setShowNoteModal(false);
                        setEditingNoteItemId(null);
                    }}
                />
            )}
        </>
    );
}
