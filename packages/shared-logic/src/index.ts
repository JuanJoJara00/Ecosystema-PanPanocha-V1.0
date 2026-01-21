// Shared Business Logic
// This package handles calculations that must be identical in POS and Portal

import { z } from 'zod';

export const Calculator = {
    /**
     * Calculates the tax amount for a given price and tax percentage.
     * Rounds to 2 decimal places.
     */
    calculateTax: (price: number, taxRate: number): number => {
        const tax = price * (taxRate / 100);
        return Math.round(tax * 100) / 100;
    },

    /**
     * Standard currency formatter for Pan Panocha
     */
    formatCurrency: (amount: number): string => {
        return new Intl.NumberFormat('es-CO', {
            style: 'currency',
            currency: 'COP',
            minimumFractionDigits: 0
        }).format(amount);
    },

    /**
     * Resolves the correct price for a product based on branch and channel context.
     * Specificity order:
     * 1. Match Branch AND Channel
     * 2. Match Channel (regardless of branch)
     * 3. Match Branch (regardless of channel)
     * 4. Base Product Price
     */
    resolveProductPrice: (
        product: { price: number },
        overrides: Array<{ price: number, branch_id?: string | null, channel_id?: string | null }>,
        context: { branchId: string | null, channelId: string | null }
    ): number => {
        const { branchId, channelId } = context;

        // 1. Specific Branch AND Specific Channel
        if (branchId && channelId) {
            const match = overrides.find(o => o.branch_id === branchId && o.channel_id === channelId);
            if (match) return match.price;
        }

        // 2. Specific Channel (any/all branches)
        if (channelId) {
            const match = overrides.find(o => !o.branch_id && o.channel_id === channelId);
            if (match) return match.price;
        }

        // 3. Specific Branch (any/all channels)
        if (branchId) {
            const match = overrides.find(o => o.branch_id === branchId && !o.channel_id);
            if (match) return match.price;
        }

        // 4. Default Base Price
        return product.price;
    },

    /**
     * Calculates the theoretical stock of a product based on its recipe and available ingredient stock.
     */
    calculateTheoreticalStock: (
        recipes: { ingredientId: string, quantityRequired: number }[] | undefined,
        ingredientStock: Record<string, number>
    ): number => {
        if (!recipes || recipes.length === 0) return 0;

        let possibleStock = Infinity;

        for (const item of recipes) {
            const available = ingredientStock[item.ingredientId] || 0;
            const possible = Math.floor(available / item.quantityRequired);
            if (possible < possibleStock) {
                possibleStock = possible;
            }
        }

        return possibleStock === Infinity ? 0 : possibleStock;
    }
};
