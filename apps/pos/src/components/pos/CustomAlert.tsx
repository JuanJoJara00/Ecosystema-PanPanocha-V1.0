import { Button } from '@panpanocha/ui';
import { CheckCircle, XCircle, AlertTriangle, Info } from 'lucide-react';

export type AlertType = 'success' | 'error' | 'warning' | 'info';

interface CustomAlertProps {
    open: boolean;
    type: AlertType;
    title: string;
    message: string;
    onClose: () => void;
}

export default function CustomAlert({ open, type, title, message, onClose }: CustomAlertProps) {
    if (!open) return null;

    const getIcon = () => {
        switch (type) {
            case 'success': return <CheckCircle className="w-10 h-10 text-green-500" strokeWidth={2.5} />;
            case 'error': return <XCircle className="w-10 h-10 text-red-500" strokeWidth={2.5} />;
            case 'warning': return <AlertTriangle className="w-10 h-10 text-amber-500" strokeWidth={2.5} />;
            case 'info': return <Info className="w-10 h-10 text-blue-500" strokeWidth={2.5} />;
        }
    };

    const getColors = () => {
        switch (type) {
            case 'success': return { bg: 'bg-green-100', text: 'text-green-700', border: 'hover:bg-green-500' };
            case 'error': return { bg: 'bg-red-100', text: 'text-red-700', border: 'hover:bg-red-500' };
            case 'warning': return { bg: 'bg-amber-100', text: 'text-amber-700', border: 'hover:bg-amber-500' };
            case 'info': return { bg: 'bg-blue-100', text: 'text-blue-700', border: 'hover:bg-blue-500' };
        }
    };

    const color = getColors();

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-[2px] flex items-center justify-center z-[100] p-4 animate-fadeIn">
            <div className="relative bg-white rounded-2xl max-w-sm w-full shadow-2xl overflow-hidden animate-scaleIn border border-gray-100">
                {/* Close Button */}
                <Button
                    variant="ghost"
                    onClick={onClose}
                    className={`absolute right-3 top-3 w-8 h-8 p-0 flex items-center justify-center border-2 border-transparent hover:border-white/50 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all text-xl z-20`}
                >
                    ×
                </Button>

                <div className="p-8 text-center bg-white relative">
                    {/* Icon Circle */}
                    <div className={`w-20 h-20 mx-auto -mt-2 mb-6 rounded-full flex items-center justify-center ${color.bg} animate-pulse relative z-10`}>
                        {getIcon()}
                    </div>

                    {/* Content */}
                    <h2 className={`text-2xl font-black mb-3 ${color.text} uppercase tracking-tight`}>
                        {title}
                    </h2>
                    <p className="text-gray-600 font-medium leading-relaxed mb-8">
                        {message}
                    </p>

                    {/* Action */}
                    <Button
                        onClick={onClose}
                        className={`w-full py-6 text-white font-bold text-lg rounded-xl shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all uppercase tracking-wide flex items-center justify-center gap-2
                            ${type === 'error' ? 'bg-red-500 hover:bg-red-600 shadow-red-200' :
                                type === 'success' ? 'bg-gradient-to-r from-[#D4AF37] to-[#C19B2D] shadow-amber-200' :
                                    type === 'warning' ? 'bg-amber-500 hover:bg-amber-600 shadow-amber-200' :
                                        'bg-blue-500 hover:bg-blue-600 shadow-blue-200'
                            }`}
                    >
                        Entendido
                    </Button>
                </div>
            </div>

            <style dangerouslySetInnerHTML={{
                __html: `
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }

                @keyframes scaleIn {
                    from { transform: scale(0.95); opacity: 0; }
                    to { transform: scale(1); opacity: 1; }
                }

                .animate-fadeIn { animation: fadeIn 0.2s ease-out forwards; }
                .animate-scaleIn { animation: scaleIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
            `}} />
        </div>
    );
}
