import type { Config } from 'tailwindcss';
import { tailwindConfig as sharedConfig } from '@panpanocha/config';

const config: Config = {
    ...(sharedConfig as any),
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            ...sharedConfig.theme?.extend,
            colors: {
                ...sharedConfig.theme?.extend?.colors,
                brand: {
                    primary: 'var(--color-primary)',
                    secondary: 'var(--color-secondary)',
                    accent: 'var(--color-accent)',
                },
                primary: {
                    foreground: 'var(--primary-foreground)'
                }
            }
        },
    },
    plugins: [],
};

export default config;
