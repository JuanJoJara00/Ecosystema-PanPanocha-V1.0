import React, { useState, useEffect } from 'react';
import { Search, UserPlus, X, Phone, Star, User } from 'lucide-react';
import { Button, Input, Card } from '@panpanocha/ui';
import type { Client } from '../../types';
import { usePosStore } from '../../store';
import { v4 as uuidv4 } from 'uuid';

interface Props {
    onClose: () => void;
    onSelectClient: (client: Client) => void;
    onSkip?: () => void; // Optional skip handler
}

export function ClientSearchModal({ onClose, onSelectClient, onSkip }: Props) {
    const [searchTerm, setSearchTerm] = useState('');
    const [isCreating, setIsCreating] = useState(false);
    const [clients, setClients] = useState<Client[]>([]);

    // New Client Form State
    const [newClientName, setNewClientName] = useState('');
    const [newClientPhone, setNewClientPhone] = useState('');
    const [newClientEmail, setNewClientEmail] = useState('');
    const [newClientDocId, setNewClientDocId] = useState('');

    useEffect(() => {
        if (searchTerm.length > 2) {
            handleSearch();
        } else {
            setClients([]);
        }
    }, [searchTerm]);

    const handleSearch = async () => {
        try {
            const results = await window.electron.searchClients(searchTerm);
            setClients(results);
        } catch (error) {
            console.error("Error searching clients:", error);
        }
    };

    const handleCreateClient = async (e: React.FormEvent) => {
        e.preventDefault();
        const orgId = usePosStore.getState().organizationId;
        if (!orgId) {
            usePosStore.getState().showAlert('error', 'Error de Configuración', 'No se ha detectado la organización. Por favor, reinicie la sesión.');
            return;
        }

        const newClient: Client = {
            id: uuidv4(),
            full_name: newClientName,
            document_id: newClientDocId,
            phone: newClientPhone,
            email: newClientEmail,
            points: 0,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            synced: false,
            organization_id: orgId // Tenant Context
        };

        try {
            await window.electron.createClient(newClient);
            // Optimistic Sync
            // Optimistic Sync handled by PowerSync
            console.log("Client created locally.");
            onSelectClient(newClient);
        } catch (error) {
            console.error("Error creating client:", error);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] border border-white/20">
                {/* Header */}
                <div className="bg-pp-brown text-white p-5 flex justify-between items-center shrink-0">
                    <div>
                        <h2 className="text-xl font-bold font-display flex items-center gap-2">
                            <Star className="text-pp-gold fill-pp-gold" size={20} />
                            Puntos Panpanocha
                        </h2>
                        <p className="text-white/70 text-xs">Fidelización de Clientes</p>
                    </div>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={onClose}
                        className="text-white/60 hover:text-white hover:bg-white/10 rounded-full h-8 w-8"
                    >
                        <X size={20} />
                    </Button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-5 bg-gray-50">

                    {!isCreating ? (
                        <div className="space-y-4">
                            {/* Search Bar */}
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                <Input
                                    className="pl-10 h-12 bg-white border-gray-200 focus:border-pp-brown focus:ring-pp-brown rounded-xl text-lg"
                                    placeholder="Buscar por cédula, nombre o teléfono..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    autoFocus
                                />
                            </div>

                            {/* Create Button */}
                            <div className="grid grid-cols-2 gap-3">
                                <Button
                                    variant="outline"
                                    className="border-dashed border-pp-brown/30 text-pp-brown hover:bg-pp-brown/5 h-12 rounded-xl flex items-center justify-center gap-2 group"
                                    onClick={() => setIsCreating(true)}
                                >
                                    <UserPlus size={18} className="group-hover:scale-110 transition-transform" />
                                    <span>Registrar</span>
                                </Button>
                                {onSkip && (
                                    <Button
                                        variant="outline"
                                        className="border-gray-300 text-gray-600 hover:bg-gray-50 h-12 rounded-xl flex items-center justify-center gap-2"
                                        onClick={onSkip}
                                    >
                                        <User size={18} />
                                        <span>Cliente General</span>
                                    </Button>
                                )}
                            </div>

                            {/* Results List */}
                            <div className="space-y-2 mt-4">
                                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Resultados</h3>
                                {clients.length > 0 ? (
                                    clients.map(client => (
                                        <button
                                            key={client.id}
                                            onClick={() => onSelectClient(client)}
                                            className="w-full bg-white p-3 rounded-xl border border-gray-100 hover:border-pp-brown/30 hover:shadow-md transition-all flex items-center justify-between group text-left"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-pp-brown/10 text-pp-brown flex items-center justify-center font-bold">
                                                    {client.full_name.charAt(0)}
                                                </div>
                                                <div>
                                                    <p className="font-bold text-gray-800 group-hover:text-pp-brown transition-colors">{client.full_name}</p>
                                                    <div className="text-xs text-gray-500 flex flex-col gap-0.5">
                                                        {client.document_id && <span className="font-bold text-gray-700">C.C. {client.document_id}</span>}
                                                        <span className="flex items-center gap-1"><Phone size={10} /> {client.phone}</span>
                                                        {client.email && <span className="flex items-center gap-1 opacity-70">@ {client.email}</span>}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Points Badge */}
                                            <div className="px-3 py-1 bg-pp-gold/10 text-pp-brown rounded-full text-xs font-bold border border-pp-gold/20 flex items-center gap-1">
                                                <Star size={10} className="fill-pp-gold text-pp-gold" />
                                                {client.points || 0} pts
                                            </div>
                                        </button>
                                    ))
                                ) : (
                                    <div className="text-center py-8 text-gray-400">
                                        <p>{searchTerm.length > 2 ? 'No se encontraron clientes.' : 'Escribe al menos 3 caracteres para buscar.'}</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4 animate-in slide-in-from-right-4 duration-200">
                            <div className="flex items-center gap-2 text-sm text-gray-500 mb-2 hover:text-gray-800 cursor-pointer w-fit" onClick={() => setIsCreating(false)}>
                                ← Volver a buscar
                            </div>

                            <form onSubmit={handleCreateClient} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">Cédula / Documento de Identidad <span className="text-red-500">*</span></label>
                                    <Input
                                        required
                                        className="h-12 bg-white rounded-xl font-mono"
                                        placeholder="Ej: 100200300"
                                        value={newClientDocId}
                                        onChange={(e) => setNewClientDocId(e.target.value)}
                                        autoFocus
                                    />
                                    <p className="text-xs text-brand-secondary/50 mt-1">Este número será el identificador único para los puntos.</p>
                                </div>

                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">Nombre Completo <span className="text-red-500">*</span></label>
                                    <Input
                                        required
                                        className="h-12 bg-white rounded-xl"
                                        placeholder="Ej: Juan Pérez"
                                        value={newClientName}
                                        onChange={(e) => setNewClientName(e.target.value)}
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-1">Teléfono <span className="text-red-500">*</span></label>
                                        <Input
                                            required
                                            type="tel"
                                            className="h-12 bg-white rounded-xl"
                                            placeholder="3001234567"
                                            value={newClientPhone}
                                            onChange={(e) => setNewClientPhone(e.target.value)}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-1">Email <span className="font-normal text-gray-400">(Opcional)</span></label>
                                        <Input
                                            type="email"
                                            className="h-12 bg-white rounded-xl"
                                            placeholder="juan@email.com"
                                            value={newClientEmail}
                                            onChange={(e) => setNewClientEmail(e.target.value)}
                                        />
                                    </div>
                                </div>

                                <Card className="p-4 bg-pp-gold/10 border-pp-gold/20 text-pp-brown text-sm">
                                    <p className="flex items-center gap-2 font-bold mb-1">
                                        <Star size={14} className="fill-pp-gold" /> Nuevo Miembro
                                    </p>
                                    Este cliente será sincronizado con la base de datos central y podrá acumular puntos en cualquier sede.
                                </Card>

                                <Button
                                    type="submit"
                                    className="w-full bg-pp-brown hover:bg-pp-brown/90 text-white font-bold h-12 rounded-xl shadow-lg mt-4"
                                    disabled={!newClientName || !newClientPhone || !newClientDocId}
                                >
                                    Crear Cliente
                                </Button>
                            </form>
                        </div>
                    )}

                </div>
            </div>
        </div>
    );
}
