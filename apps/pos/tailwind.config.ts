import type { Config } from 'tailwindcss';
import { tailwindConfig as sharedConfig } from '@panpanocha/config';

const config: Config = {
    ...(sharedConfig as Config),
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
                    primary: 'var(--brand-primary)',
                    secondary: 'var(--brand-secondary)',
                    accent: 'var(--brand-accent)',
                },
                primary: {
                    foreground: 'var(--brand-primary-foreground)'
                }
            }
        },
    },
    plugins: [],
};

export default config;
