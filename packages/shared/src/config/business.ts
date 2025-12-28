/**
 * Business configuration constants
 * Single source of truth for all business rules
 */

export const BUSINESS_CONFIG = {
    /** Default delivery fee in COP */
    DELIVERY_FEE_DEFAULT: 3000,

    /** Turn/Shift types configuration */
    TURN_TYPES: {
        MORNING: {
            label: 'Mañana',
            maxHour: 14,
        },
        AFTERNOON: {
            label: 'Tarde',
            minHour: 14,
        },
        UNIQUE: {
            label: 'Unico',
        },
    },

    /** Currency and locale settings */
    CURRENCY: 'COP' as const,
    LOCALE: 'es-CO' as const,

    /** Validation constraints */
    MAX_PRODUCT_NAME_LENGTH: 50,
    MAX_ADDRESS_LENGTH: 200,
    MIN_PHONE_LENGTH: 10,
    MAX_PHONE_LENGTH: 10,
    MIN_CEDULA_LENGTH: 6,
    MAX_CEDULA_LENGTH: 10,

    /** UI Configuration */
    ITEMS_PER_PAGE: 20,
    MAX_CART_ITEMS: 50,
    AUTO_REFRESH_INTERVAL: 60000, // 1 minute

    /** Payment methods */
    PAYMENT_METHODS: ['cash', 'card', 'transfer'] as const,

    /** Delivery statuses */
    DELIVERY_STATUSES: ['pending', 'dispatched', 'delivered', 'cancelled'] as const,

    /** Sale statuses */
    SALE_STATUSES: ['completed', 'voided'] as const,

    /** Order statuses */
    ORDER_STATUSES: ['pending', 'received', 'cancelled'] as const,
} as const;

/** Type exports for better TypeScript support */
export type PaymentMethod = typeof BUSINESS_CONFIG.PAYMENT_METHODS[number];
export type DeliveryStatus = typeof BUSINESS_CONFIG.DELIVERY_STATUSES[number];
export type SaleStatus = typeof BUSINESS_CONFIG.SALE_STATUSES[number];
export type OrderStatus = typeof BUSINESS_CONFIG.ORDER_STATUSES[number];

/**
 * Get turn type based on current hour
 */
export const getTurnType = (hour: number = new Date().getHours()): string => {
    if (hour < BUSINESS_CONFIG.TURN_TYPES.MORNING.maxHour) {
        return BUSINESS_CONFIG.TURN_TYPES.MORNING.label;
    }
    return BUSINESS_CONFIG.TURN_TYPES.AFTERNOON.label;
};
