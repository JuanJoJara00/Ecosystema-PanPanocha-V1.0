import { useState } from 'react';
import Button from '@/components/ui/Button';
import { X } from 'lucide-react';
import { NumberPad } from './NumberPad';

interface PinCodeModalProps {
    onClose: () => void;
    onSubmit: (pin: string) => void;
    title?: string;
    subtitle?: string;
}

export function PinCodeModal({ onClose, onSubmit, title = "Código Maestro", subtitle = "Ingresa el código de 4 dígitos" }: PinCodeModalProps) {
    const [pin, setPin] = useState('');
    const [error, setError] = useState('');

    const handleNumberClick = (num: string) => {
        if (pin.length < 4) {
            const newPin = pin + num;
            setPin(newPin);

            if (newPin.length === 4) {
                setTimeout(() => onSubmit(newPin), 100);
            }
        }
    };

    const handleClear = () => {
        setPin('');
        setError('');
    };

    const handleBackspace = () => {
        setPin(pin.slice(0, -1));
        setError('');
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="bg-gradient-to-r from-amber-500 to-amber-600 text-white p-6 relative">
                    <button
                        onClick={onClose}
                        aria-label="Cerrar"
                        className="absolute top-4 right-4 text-white/80 hover:text-white transition-colors"
                    >
                        <X size={24} />
                    </button>
                    <h2 className="text-2xl font-bold">{title}</h2>
                    <p className="text-amber-100 text-sm mt-1">{subtitle}</p>
                </div>

                {/* PIN Display */}
                <div className="p-8">
                    <div className="flex justify-center gap-3 mb-8">
                        {[0, 1, 2, 3].map((i) => (
                            <div
                                key={i}
                                className={`w-14 h-14 rounded-xl border-2 flex items-center justify-center text-2xl font-bold transition-all ${pin.length > i
                                    ? 'border-amber-500 bg-amber-50 text-amber-600'
                                    : error
                                        ? 'border-red-300 bg-red-50'
                                        : 'border-gray-200 bg-gray-50'
                                    }`}
                            >
                                {pin.length > i ? '●' : ''}
                            </div>
                        ))}
                    </div>

                    {error && (
                        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm text-center">
                            {error}
                        </div>
                    )}

                    <NumberPad
                        onNumberClick={handleNumberClick}
                        onClear={handleClear}
                        onBackspace={handleBackspace}
                        variant="compact"
                    />

                    <div className="mt-6">
                        <Button variant="outline" className="w-full" onClick={onClose}>
                            Cancelar
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
