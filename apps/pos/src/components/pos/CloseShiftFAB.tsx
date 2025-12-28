import { useState } from 'react';
import { DollarSign } from 'lucide-react';

interface CloseShiftFABProps {
    onClick: () => void;
}

export function CloseShiftFAB({ onClick }: CloseShiftFABProps) {
    const [isHovered, setIsHovered] = useState(false);

    return (
        <button
            onClick={onClick}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            className={`
                fixed bottom-6 left-6 z-50
                w-14 h-14 rounded-full
                bg-gradient-to-br from-[#D4AF37] to-[#B8960C]
                shadow-lg shadow-[#D4AF37]/30
                flex items-center justify-center
                transition-all duration-300 ease-out
                hover:scale-110 hover:shadow-xl hover:shadow-[#D4AF37]/40
                active:scale-95
                group
            `}
            title="Cerrar Turno"
        >
            <DollarSign
                size={24}
                className={`text-white transition-transform duration-300 ${isHovered ? 'scale-110' : ''}`}
            />

            {/* Tooltip */}
            <span className={`
                absolute left-full ml-3
                bg-gray-900 text-white text-xs font-bold
                px-3 py-1.5 rounded-lg
                whitespace-nowrap
                transition-all duration-200
                ${isHovered ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-2 pointer-events-none'}
            `}>
                Cerrar Turno
            </span>

            {/* Pulse animation ring */}
            <span className="absolute inset-0 rounded-full bg-[#D4AF37] animate-ping opacity-20" />
        </button>
    );
}
