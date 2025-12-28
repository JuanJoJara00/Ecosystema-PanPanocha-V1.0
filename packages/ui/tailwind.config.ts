import type { Config } from 'tailwindcss';
import sharedConfig from '@panpanocha/config/tailwind';

const config: Config = {
    content: ["./src/**/*.{ts,tsx}"],
    presets: [sharedConfig],
    theme: {
        extend: {},
    },
    plugins: [],
};

export default config;
