import type { Config } from "tailwindcss";
import { tailwindConfig as sharedConfig } from "@panpanocha/config";

const config: Config = {
    ...sharedConfig,
    content: [
        "./src/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    theme: {
        extend: {
            ...sharedConfig.theme?.extend,
            colors: {
                ...(sharedConfig.theme?.extend?.colors as any),
                brand: {
                    primary: 'var(--color-primary)',
                    secondary: 'var(--color-secondary)',
                    accent: 'var(--color-accent)',
                }
            }
        },
    },
    darkMode: 'class',
    plugins: [],
};

export default config;
