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
        },
    },
    darkMode: 'class',
    plugins: [],
};

export default config;
