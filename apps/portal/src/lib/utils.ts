import { cn } from "@panpanocha/ui";

export { cn };

export const formatNumber = (value: number | string, options: Intl.NumberFormatOptions = {}) => {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(num)) return '';
    return new Intl.NumberFormat('es-CO', options).format(num);
};

export const parseNumber = (value: string): number => {
    // Remove thousand separators (dots) and replace decimal comma with dot for parsing
    const cleanValue = value.replace(/\./g, '').replace(/,/g, '.');
    return parseFloat(cleanValue) || 0;
};

export const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(amount)
};
