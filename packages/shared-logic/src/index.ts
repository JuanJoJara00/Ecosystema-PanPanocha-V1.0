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
    }
};
