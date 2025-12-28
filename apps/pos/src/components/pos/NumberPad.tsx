import { Delete } from 'lucide-react';

interface NumberPadProps {
    onNumberClick: (num: string) => void;
    onClear: () => void;
    onBackspace: () => void;
    variant?: 'default' | 'compact';
}

export function NumberPad({ onNumberClick, onClear, onBackspace, variant = 'default' }: NumberPadProps) {
    const numbers = variant === 'compact'
        ? ['1', '2', '3', '4', '5', '6', '7', '8', '9']
        : ['1', '2', '3', '4', '5', '6', '7', '8', '9', '00', '0'];

    return (
        <div className="bg-gray-50 rounded-3xl p-5 grid grid-cols-3 gap-3 shadow-inner">
            {numbers.map((num) => (
                <button
                    key={num}
                    onClick={() => onNumberClick(num)}
                    className="bg-white hover:bg-gray-50 text-gray-800 text-3xl font-black rounded-2xl shadow-[0_4px_0_rgba(0,0,0,0.05)] active:shadow-none active:translate-y-[4px] border border-gray-200 transition-all flex items-center justify-center h-16"
                >
                    {num}
                </button>
            ))}

            {variant === 'compact' ? (
                <>
                    <button
                        onClick={onClear}
                        className="bg-white hover:bg-red-50 text-red-600 text-sm font-bold rounded-2xl shadow-[0_4px_0_rgba(0,0,0,0.05)] active:shadow-none active:translate-y-[4px] border border-gray-200 transition-all flex items-center justify-center h-16"
                    >
                        BORRAR
                    </button>
                    <button
                        onClick={() => onNumberClick('0')}
                        className="bg-white hover:bg-gray-50 text-gray-800 text-3xl font-black rounded-2xl shadow-[0_4px_0_rgba(0,0,0,0.05)] active:shadow-none active:translate-y-[4px] border border-gray-200 transition-all flex items-center justify-center h-16"
                    >
                        0
                    </button>
                    <button
                        onClick={onBackspace}
                        className="bg-white hover:bg-amber-50 text-gray-600 text-sm font-bold rounded-2xl shadow-[0_4px_0_rgba(0,0,0,0.05)] active:shadow-none active:translate-y-[4px] border border-gray-200 transition-all flex items-center justify-center h-16"
                    >
                        ←
                    </button>
                </>
            ) : (
                <button
                    onClick={onBackspace}
                    className="bg-white hover:bg-red-50 text-red-600 rounded-2xl shadow-[0_4px_0_rgba(0,0,0,0.05)] active:shadow-none active:translate-y-[4px] border border-gray-200 transition-all flex items-center justify-center"
                >
                    <Delete size={24} />
                </button>
            )}
        </div>
    );
}
