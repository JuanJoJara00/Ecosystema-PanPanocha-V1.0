import { brandColors, semanticColors } from './theme';
import type { Config } from 'tailwindcss';

/**
 * Shared Tailwind configuration for PanPanocha applications
 * Extends this config in your app's tailwind.config.ts
 */
export const tailwindConfig: Partial<Config> = {
    theme: {
        extend: {
            colors: {
                // Brand colors
                'pp-gold': brandColors.primary,
                'pp-brown': brandColors.secondary,
                'pp-cream': brandColors.accent,

                // Semantic colors
                success: semanticColors.success,
                warning: semanticColors.warning,
                error: semanticColors.error,
                info: semanticColors.info,

                // Aliases for consistency
                primary: brandColors.primary,
                secondary: brandColors.secondary,
                accent: brandColors.accent,
            },
        },
    },
};

export default tailwindConfig;
