/**
 * PanPanocha Brand Theme
 * Single source of truth for brand colors across all applications
 */

export const brandColors = {
    // Primary brand color - Pan Panocha Gold
    primary: '#F6B323',

    // Secondary brand color - Warm Brown
    secondary: '#4A3728',

    // Accent color - Cream/Light
    accent: '#F9F1E0',
} as const;

export const semanticColors = {
    success: '#10b981',
    warning: '#f59e0b',
    error: '#ef4444',
    info: '#3b82f6',
} as const;

// Export for backward compatibility
export const ppGold = brandColors.primary;
export const ppBrown = brandColors.secondary;
export const ppCream = brandColors.accent;
