import { useState, useEffect } from 'react';
import type { Product } from '../../types';
import { ShoppingBag, XCircle, WifiOff, Box } from 'lucide-react';

interface ProductGridProps {
    products: Product[];
    onProductClick: (product: Product) => void;
}

function useOnlineStatus() {
    const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
    useEffect(() => {
        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);
        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);
        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);
    return isOnline;
}

export function ProductGrid({ products, onProductClick }: ProductGridProps) {
    const isOnline = useOnlineStatus();

    return (
        <div className="flex-1 overflow-y-auto p-6 bg-gray-50/50">
            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6 pb-20">
                {products.map(product => {
                    const stock = product.stock || 0;
                    const hasStock = stock > 0;

                    // Disable ONLY if online AND out of stock.
                    // If offline, allow adding (assume cashier has physical item).
                    const isDisabled = isOnline && !hasStock;

                    return (
                        <div
                            key={product.id}
                            onClick={() => !isDisabled && onProductClick(product)}
                            className={`group relative flex flex-col h-[280px] rounded-[24px] bg-white ring-1 ring-black/5 shadow-sm transition-all duration-300 ${isDisabled
                                ? 'opacity-70 cursor-not-allowed contrast-75 grayscale-[0.5]'
                                : 'hover:shadow-2xl hover:ring-brand-primary/50 hover:-translate-y-2 cursor-pointer'
                                }`}
                        >
                            {/* Image Container */}
                            <div className="h-44 w-full relative overflow-hidden rounded-t-[24px]">
                                {product.image_url ? (
                                    <img
                                        src={product.image_url}
                                        alt={product.name}
                                        className={`w-full h-full object-cover transform transition-transform duration-700 ease-out ${isDisabled ? '' : 'group-hover:scale-110'}`}
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center bg-gray-50 group-hover:bg-gray-100 transition-colors">
                                        <span className="text-6xl select-none filter grayscale opacity-50">
                                            {product.category === 'bebida' ? '🥤' : '🥐'}
                                        </span>
                                    </div>
                                )}

                                {/* Gradient Overlay for text protection */}
                                <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-60" />

                                {/* Top Badges */}
                                <div className="absolute top-3 inset-x-3 flex justify-between items-start z-10">
                                    {/* Stock Badge - ALWAYS VISIBLE */}
                                    <div className={`px-2.5 py-1.5 rounded-xl backdrop-blur-md shadow-sm border border-white/20 flex items-center gap-1.5 ${!hasStock
                                            ? 'bg-red-500/90 text-white'
                                            : stock < 5
                                                ? 'bg-amber-500/90 text-white'
                                                : 'bg-white/90 text-gray-700'
                                        }`}>
                                        {!hasStock ? (
                                            <>
                                                <XCircle className="w-3.5 h-3.5" />
                                                <span className="text-[10px] font-black uppercase tracking-wider">Agotado</span>
                                            </>
                                        ) : (
                                            <>
                                                <Box className={`w-3.5 h-3.5 ${stock < 5 ? 'text-white' : 'text-gray-400'}`} />
                                                <span className="text-[11px] font-bold">{stock} uds</span>
                                            </>
                                        )}
                                    </div>

                                    {/* Price Tag */}
                                    <div className="bg-white/95 backdrop-blur text-gray-900 font-bold px-3 py-1.5 rounded-xl shadow-lg text-sm tracking-tight flex items-center ring-1 ring-black/5">
                                        <span className="text-xs font-normal text-gray-400 mr-0.5">$</span>
                                        {product.price.toLocaleString('es-CO')}
                                    </div>
                                </div>

                                {/* Offline Indicator */}
                                {!isOnline && (
                                    <div className="absolute bottom-2 left-3">
                                        <span className="bg-blue-600/90 backdrop-blur text-white px-2 py-1 rounded-lg text-[10px] font-bold shadow-sm flex items-center gap-1">
                                            <WifiOff className="w-3 h-3" /> Offline
                                        </span>
                                    </div>
                                )}
                            </div>

                            {/* Info Container */}
                            <div className="flex-1 p-4 flex flex-col relative bg-white rounded-b-[24px]">
                                <div className="flex-1">
                                    <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1 group-hover:text-brand-primary/70 transition-colors">
                                        {product.category || 'General'}
                                    </div>
                                    <h3
                                        className="font-bold text-gray-800 text-[15px] leading-tight line-clamp-2 group-hover:text-brand-secondary transition-colors font-display"
                                        title={product.name}
                                    >
                                        {product.name}
                                    </h3>
                                </div>

                                <div className="mt-auto pt-3 flex items-center justify-between border-t border-gray-50">
                                    <span className="text-[10px] font-mono text-gray-300 font-medium select-none">
                                        {product.id.slice(0, 4).toUpperCase()}
                                    </span>

                                    <button
                                        className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 shadow-sm transform ${isDisabled
                                                ? 'bg-gray-100 text-gray-300 cursor-not-allowed'
                                                : 'bg-brand-accent text-brand-secondary group-hover:bg-brand-primary group-hover:text-white group-hover:scale-110 group-active:scale-95'
                                            }`}
                                        disabled={isDisabled}
                                    >
                                        <ShoppingBag className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
