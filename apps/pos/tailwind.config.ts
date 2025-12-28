import type { Config } from 'tailwindcss';
import { tailwindConfig as sharedConfig } from '@panpanocha/config';

const config: Config = {
    ...sharedConfig,
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
                    primary: '#F6B323',
                    secondary: '#4A3728',
                    accent: '#F9F1E0',
                }
            }
        },
    },
    plugins: [],
};

export default config;
