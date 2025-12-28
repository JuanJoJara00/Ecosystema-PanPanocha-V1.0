import { useState } from 'react';
import { Users, Armchair } from 'lucide-react';
import { Button, Input, Card } from '@panpanocha/ui';

interface Props {
    tableName: string;
    onConfirm: (diners: number) => void;
    onCancel: () => void;
}

export function OpenTableModal({ tableName, onConfirm, onCancel }: Props) {
    const [diners, setDiners] = useState('1');
    const [error, setError] = useState('');

    const handleSubmit = () => {
        const count = parseInt(diners);
        if (isNaN(count) || count < 1) {
            setError('Ingresa un número válido de comensales');
            return;
        }
        onConfirm(count);
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
            <Card className="bg-white w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden p-0 border-none">
                <div className="bg-pp-brown p-6 text-center">
                    <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-3 text-pp-gold">
                        <Armchair size={32} />
                    </div>
                    <h2 className="text-xl font-bold text-white">Abrir {tableName}</h2>
                    <p className="text-pp-cream/70 text-sm">Gestionar ocupación</p>
                </div>

                <div className="p-6 space-y-6">
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wide flex items-center gap-2">
                            <Users size={14} /> Número de Comensales
                        </label>
                        <Input
                            type="number"
                            value={diners}
                            onChange={(e) => {
                                setDiners(e.target.value);
                                setError('');
                            }}
                            className="text-center text-3xl font-bold h-16 border-2 focus:border-pp-gold"
                            autoFocus
                            min={1}
                            onKeyPress={(e) => e.key === 'Enter' && handleSubmit()}
                        />
                        {error && <p className="text-red-500 text-xs font-medium text-center">{error}</p>}
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <Button
                            variant="secondary"
                            onClick={onCancel}
                            className="font-bold h-12"
                        >
                            Cancelar
                        </Button>
                        <Button
                            onClick={handleSubmit}
                            className="bg-pp-gold text-pp-brown hover:bg-pp-gold/90 font-bold h-12"
                        >
                            Abrir Mesa
                        </Button>
                    </div>
                </div>
            </Card>
        </div>
    );
}
