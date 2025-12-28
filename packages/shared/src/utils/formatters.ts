/**
 * Format number as Colombian Pesos currency
 */
export const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(amount);
};

/**
 * Format date to Colombian locale
 */
export const formatDate = (date: string | Date): string => {
    return new Date(date).toLocaleDateString('es-CO');
};

/**
 * Format date and time to Colombian locale
 */
export const formatDateTime = (date: string | Date): string => {
    return new Date(date).toLocaleString('es-CO');
};

/**
 * Parse number from formatted currency string
 */
export const parseCurrency = (value: string): number => {
    return parseInt(value.replace(/\D/g, '')) || 0;
};

/**
 * Validate Colombian phone number
 */
export const isValidPhone = (phone: string): boolean => {
    const cleaned = phone.replace(/\D/g, '');
    return cleaned.length === 10 && cleaned.startsWith('3');
};

/**
 * Format Colombian phone number
 */
export const formatPhone = (phone: string): string => {
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length !== 10) return phone;
    return `${cleaned.slice(0, 3)} ${cleaned.slice(3, 6)} ${cleaned.slice(6)}`;
};

/**
 * Validate Colombian ID (Cédula)
 */
export const isValidCedula = (cedula: string): boolean => {
    const cleaned = cedula.replace(/\D/g, '');
    return cleaned.length >= 6 && cleaned.length <= 10;
};
