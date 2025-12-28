import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';
import { useToast, type Toast as ToastType } from '../hooks/useToast';

export function ToastContainer() {
    const { toasts, removeToast } = useToast();

    if (toasts.length === 0) return null;

    return (
        <div className="fixed top-4 right-4 z-50 space-y-2 max-w-md">
            {toasts.map((toast) => (
                <Toast key={toast.id} toast={toast} onClose={() => removeToast(toast.id)} />
            ))}
        </div>
    );
}

interface ToastProps {
    toast: ToastType;
    onClose: () => void;
}

function Toast({ toast, onClose }: ToastProps) {
    const icons = {
        success: <CheckCircle className="h-5 w-5 text-green-600" />,
        error: <AlertCircle className="h-5 w-5 text-red-600" />,
        warning: <AlertTriangle className="h-5 w-5 text-yellow-600" />,
        info: <Info className="h-5 w-5 text-blue-600" />,
    };

    const bgColors = {
        success: 'bg-green-50 border-green-200',
        error: 'bg-red-50 border-red-200',
        warning: 'bg-yellow-50 border-yellow-200',
        info: 'bg-blue-50 border-blue-200',
    };

    return (
        <div
            className={`flex items-start gap-3 p-4 rounded-lg border-2 shadow-lg animate-in slide-in-from-right ${bgColors[toast.type]}`}
        >
            {icons[toast.type]}
            <p className="flex-1 text-sm font-medium text-gray-900">{toast.message}</p>
            <button
                onClick={onClose}
                className="p-1 hover:bg-white/50 rounded transition-colors"
            >
                <X className="h-4 w-4 text-gray-600" />
            </button>
        </div>
    );
}
