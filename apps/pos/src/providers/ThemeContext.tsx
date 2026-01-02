import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';

export interface ThemeColors {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    text: string;
}

export interface BrandingMeta {
    logoUrl: string;
    companyName: string;
}

interface ThemeContextType {
    colors: ThemeColors;
    meta: BrandingMeta;
    setTheme: (colors: ThemeColors, meta?: BrandingMeta) => void;
    resetTheme: () => void;
}

const defaultColors: ThemeColors = {
    primary: '#F6B323',
    secondary: '#4A3728',
    accent: '#F9F1E0',
    background: '#ffffff',
    text: '#1f2937'
};

const defaultMeta: BrandingMeta = {
    logoUrl: '/images/logo_v2.png',
    companyName: 'PANPANOCHA'
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
    const [colors, setColors] = useState<ThemeColors>(defaultColors);
    const [meta, setMeta] = useState<BrandingMeta>(defaultMeta);

    useEffect(() => {
        const root = document.documentElement;
        // Inject variables into :root
        root.style.setProperty('--color-primary', colors.primary);
        root.style.setProperty('--color-secondary', colors.secondary);
        root.style.setProperty('--color-accent', colors.accent);
        root.style.setProperty('--color-background', colors.background);
        root.style.setProperty('--color-text', colors.text);
    }, [colors]);

    const setTheme = (newColors: ThemeColors, newMeta?: BrandingMeta) => {
        setColors(newColors);
        if (newMeta) setMeta(newMeta);
    };

    const resetTheme = () => {
        setColors(defaultColors);
        setMeta(defaultMeta);
    };

    return (
        <ThemeContext.Provider value={{ colors, meta, setTheme, resetTheme }}>
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme() {
    const context = useContext(ThemeContext);
    if (context === undefined) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
}
