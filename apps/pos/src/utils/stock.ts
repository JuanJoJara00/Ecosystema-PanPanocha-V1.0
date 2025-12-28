import type { Product } from '../types';

/**
 * Updates product stock in database and returns updater function for local state
 */
export const updateProductStock = async (productId: string, delta: number) => {
    await window.electron.updateProductStock(productId, delta).catch(console.error);
    return (products: Product[]) =>
        products.map(p => p.id === productId ? { ...p, stock: (p.stock || 0) + delta } : p);
};

/**
 * Calculates total stock adjustment needed for multiple items
 */
export const calculateStockAdjustments = (items: Array<{ product: { id: string }, quantity: number }>) => {
    const adjustments: Record<string, number> = {};
    items.forEach(item => {
        adjustments[item.product.id] = (adjustments[item.product.id] || 0) + item.quantity;
    });
    return adjustments;
};

/**
 * Applies multiple stock adjustments in batch
 */
export const applyStockAdjustments = async (adjustments: Record<string, number>) => {
    const promises = Object.entries(adjustments).map(([productId, delta]) =>
        window.electron.updateProductStock(productId, delta).catch(console.error)
    );
    await Promise.all(promises);

    return (products: Product[]) =>
        products.map(p => adjustments[p.id] ? { ...p, stock: (p.stock || 0) + adjustments[p.id] } : p);
};
